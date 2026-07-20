// src/features/gestion-inventario/services/notaIngreso.service.ts

import type { Product } from '../../catalogo-articulos/models/types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { MovimientoStock } from '../models';
import { InventoryService } from './inventory.service';
import { ServicioKardexValorizado } from './servicioKardexValorizado';
import { CORRELATIVO_DIGITOS_NI } from '../models/notaIngreso.constants';
import type { NotaIngreso, TipoIngreso, LineaNotaIngreso } from '../models/notaIngreso.types';
import type { MovimientoMotivo } from '../models/inventory.types';
import type { DatosLineaOperacionCuantitativa, DatosOperacionEntradaCuantitativa } from '../models/operacionEntradaInventario.types';
import { parsearEtiquetaImpuesto } from '@/shared/catalogos-sunat/resolucionTributaria';
import { esProductoInventariable } from '@/shared/inventory/clasificacionInventario';
import { buscarOperacionIdempotentePorClave } from '../repositories/operacionIdempotenteInventario.repository';
import { STORAGE_KEY_MOVEMENTS } from '../repositories/stock.repository';
import { lsKey } from '../../../../../shared/tenant';

const TIPO_INGRESO_A_MOTIVO: Record<TipoIngreso, MovimientoMotivo> = {
  '02': 'COMPRA',
  '03': 'OTRO',
  '05': 'DEVOLUCION_PROVEEDOR',
  '16': 'AJUSTE_INVENTARIO',
  '18': 'COMPRA',
  '19': 'PRODUCCION',
  '20': 'PRODUCCION',
  '21': 'TRANSFERENCIA_ALMACEN',
  '22': 'AJUSTE_INVENTARIO',
  '24': 'DEVOLUCION_CLIENTE',
  '26': 'PRODUCCION',
  '28': 'AJUSTE_INVENTARIO',
  '29': 'OTRO',
  '31': 'OTRO',
};

export const mapTipoIngresoAMotivo = (tipo: TipoIngreso): MovimientoMotivo =>
  TIPO_INGRESO_A_MOTIVO[tipo];

export const generarCorrelativoNI = (
  notasExistentes: NotaIngreso[],
  serie: string,
): string => {
  const usados = notasExistentes
    .filter(n => n.serie === serie && n.correlativo)
    .map(n => parseInt(n.correlativo ?? '0', 10))
    .filter(Number.isFinite);

  const siguiente = usados.length > 0 ? Math.max(...usados) + 1 : 1;
  return String(siguiente).padStart(CORRELATIVO_DIGITOS_NI, '0');
};

export interface ResultadoGenerarNI {
  notaActualizada: NotaIngreso;
  productosActualizados: Product[];
  movimientos: MovimientoStock[];
}

/** Generadores inyectables del motor de Etapa 1C — nunca `Math.random`/`Date.now`/`new Date()` directos. */
export interface DependenciasEntradaCuantitativaNI {
  generarId: () => string;
  fechaActual: () => string;
}

/**
 * Fuente única de clasificación inventariable (§3 de la corrección final): no basta con excluir
 * `tipoBienServicio === 'servicio'` — un producto cuyo `tipoExistencia` no está controlado por
 * stock (SERVICIOS, OTROS, o cualquier valor no reconocido) tampoco genera movimientos, aunque la
 * línea no esté marcada como servicio. Un producto referenciado que no existe en `productsMap`
 * NUNCA se descarta aquí — se conserva como "inventariable" para que `calcularMutacionesEntrada`
 * rechace el documento completo por referenciar un producto inexistente, en vez de omitirlo en
 * silencio.
 */
function esLineaInventariable(linea: LineaNotaIngreso, productsMap: Map<string, Product>): boolean {
  if (linea.tipoBienServicio === 'servicio') return false;
  const producto = productsMap.get(linea.productoId);
  if (!producto) return true;
  return esProductoInventariable(producto);
}

function construirLineasOperacion(
  lineas: LineaNotaIngreso[],
  productsMap: Map<string, Product>,
  almacenesMap: Map<string, Almacen>,
  almacenDestinoIdNota: string,
): DatosLineaOperacionCuantitativa[] {
  return lineas
    .filter((linea) => esLineaInventariable(linea, productsMap))
    .map((linea) => {
      const almacen = almacenesMap.get(linea.almacenId ?? almacenDestinoIdNota);
      if (!almacen) {
        throw new Error(`No se puede generar la Nota de Ingreso: no se encontró el almacén de la línea "${linea.productoNombre}".`);
      }
      if (!almacen.estaActivoAlmacen) {
        throw new Error(
          `No se puede generar la Nota de Ingreso: el almacén "${almacen.nombreAlmacen}" está inactivo. Actívalo desde Configuración → Almacenes antes de registrar entradas.`
        );
      }
      return {
        lineaId: linea.id,
        productoId: linea.productoId,
        almacenId: almacen.id,
        cantidadUnidadMinima: linea.cantidad,
      };
    });
}

interface MovimientoOriginalNI {
  id: string;
  productoId: string;
  almacenId: string;
  cantidad: number;
  lineaOrigenId?: string;
  tipo?: string;
  documentoReferencia?: string;
}

function esMovimientoOriginalValido(valor: unknown): valor is MovimientoOriginalNI {
  if (typeof valor !== 'object' || valor === null) return false;
  const candidato = valor as Record<string, unknown>;
  return (
    typeof candidato.id === 'string' &&
    typeof candidato.productoId === 'string' &&
    typeof candidato.almacenId === 'string' &&
    typeof candidato.cantidad === 'number' && Number.isFinite(candidato.cantidad) && candidato.cantidad > 0 &&
    (candidato.lineaOrigenId === undefined || typeof candidato.lineaOrigenId === 'string') &&
    (candidato.tipo === undefined || typeof candidato.tipo === 'string') &&
    (candidato.documentoReferencia === undefined || typeof candidato.documentoReferencia === 'string')
  );
}

function leerMovimientosCrudos(empresaId: string): unknown[] {
  const clave = lsKey(STORAGE_KEY_MOVEMENTS, empresaId);
  const raw = localStorage.getItem(clave);
  if (raw === null) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`No se puede anular la Nota de Ingreso: la colección de movimientos ("${clave}") no es un arreglo.`);
  }
  return parsed;
}

/**
 * Encuentra los movimientos REALES que la generación de esta NI confirmó — nunca vuelve a decidir
 * qué líneas eran inventariables según la clasificación vigente (§1 de la corrección final: la
 * anulación revierte exactamente lo que realmente ingresó, no lo que la clasificación actual diría
 * que debió ingresar).
 *
 * Fuente primaria: la operación idempotente de generación (`resultadoIds`) — el vínculo directo y
 * auténtico del ledger de Etapa 1B. Fallback EXCLUSIVO para NI anteriores a Etapa 1C (sin
 * operación idempotente porque el ledger no existía todavía): se identifican por
 * `documentoReferencia === nota.numero` y `tipo === 'ENTRADA'`, igual que escribía la generación
 * legado.
 *
 * Si la operación de generación existe pero no está confirmada, o si algún `resultadoId` no
 * resuelve a exactamente un movimiento real y válido, rechaza toda la anulación — nunca adivina,
 * nunca revierte parcialmente.
 */
function buscarMovimientosOriginalesGeneracion(empresaId: string, nota: NotaIngreso): MovimientoOriginalNI[] {
  const claveGeneracion = `nota_ingreso:generar:${nota.id}`;
  const operacion = buscarOperacionIdempotentePorClave(empresaId, claveGeneracion);
  const movimientosCrudos = leerMovimientosCrudos(empresaId);

  if (operacion) {
    if (operacion.estado !== 'confirmada') {
      throw new Error(
        `No se puede anular la Nota de Ingreso: su operación de generación está en estado "${operacion.estado}" (se esperaba "confirmada") — el historial es inconsistente.`
      );
    }
    if (new Set(operacion.resultadoIds).size !== operacion.resultadoIds.length) {
      throw new Error('No se puede anular la Nota de Ingreso: la operación de generación tiene resultadoIds duplicados — el historial es inconsistente.');
    }
    const porId = new Map<string, unknown>();
    movimientosCrudos.forEach((elemento) => {
      if (esMovimientoOriginalValido(elemento)) porId.set(elemento.id, elemento);
    });
    return operacion.resultadoIds.map((resultadoId) => {
      const movimiento = porId.get(resultadoId);
      if (!movimiento || !esMovimientoOriginalValido(movimiento)) {
        throw new Error(
          `No se puede anular la Nota de Ingreso: el movimiento original "${resultadoId}" no existe o es inválido — los movimientos originales están incompletos.`
        );
      }
      return movimiento;
    });
  }

  // Legado (anterior a Etapa 1C, sin operación idempotente): identificación por documentoReferencia.
  if (!nota.numero) return [];
  return movimientosCrudos.filter(
    (elemento): elemento is MovimientoOriginalNI =>
      esMovimientoOriginalValido(elemento) && elemento.documentoReferencia === nota.numero && elemento.tipo === 'ENTRADA'
  );
}

export const generarNIEnInventario = async (
  nota: NotaIngreso,
  notasExistentes: NotaIngreso[],
  productsMap: Map<string, Product>,
  almacenesMap: Map<string, Almacen>,
  usuario: string,
  empresaId: string,
  dependencias: DependenciasEntradaCuantitativaNI,
): Promise<ResultadoGenerarNI> => {
  if (nota.estado === 'Generada') {
    throw new Error('Esta Nota de Ingreso ya fue generada.');
  }
  if (nota.estado === 'Anulada') {
    throw new Error('No se puede generar una Nota de Ingreso anulada.');
  }
  if (nota.lineas.length === 0) {
    throw new Error('La Nota de Ingreso debe tener al menos una línea de producto.');
  }

  const correlativo = generarCorrelativoNI(notasExistentes, nota.serie);
  const numero = `${nota.serie}-${correlativo}`;
  const motivo = mapTipoIngresoAMotivo(nota.tipoIngreso);
  const ahora = dependencias.fechaActual();

  const lineasOperacion = construirLineasOperacion(nota.lineas, productsMap, almacenesMap, nota.almacenDestinoId);

  let productosActualizados: Product[] = [];
  let movimientos: MovimientoStock[] = [];

  if (lineasOperacion.length > 0) {
    const datos: DatosOperacionEntradaCuantitativa = {
      modoOperacion: 'cuantitativo',
      empresaId,
      documentoId: nota.id,
      tipoDocumento: 'nota_ingreso',
      tipoOperacion: 'ni_automatica',
      claveIdempotencia: `nota_ingreso:generar:${nota.id}`,
      usuario,
      fecha: ahora,
      motivo,
      observaciones: `NI ${numero} - ${nota.observaciones ?? ''}`.trim(),
      documentoReferencia: numero,
      lineas: lineasOperacion,
    };

    const resultado = await ServicioKardexValorizado.registrarEntradaValorizada(datos, {
      almacenes: almacenesMap,
      generarId: dependencias.generarId,
      fechaActual: dependencias.fechaActual,
    });

    movimientos = resultado.movimientos;
    productosActualizados = resultado.productosActualizados;
    for (const producto of productosActualizados) {
      productsMap.set(producto.id, producto);
    }
  }

  const notaActualizada: NotaIngreso = {
    ...nota,
    estado: 'Generada',
    esBorrador: false,
    correlativo,
    numero,
    fechaActualizacion: ahora,
    historial: [
      ...nota.historial,
      {
        fecha: ahora,
        usuario,
        accion: 'Generada',
        detalle: `Número asignado: ${numero}. ${movimientos.length} línea(s) procesadas.`,
      },
    ],
  };

  return { notaActualizada, productosActualizados, movimientos };
};

export interface ResultadoAnularNI {
  notaActualizada: NotaIngreso;
  productosActualizados: Product[];
  movimientos: MovimientoStock[];
}

export const anularNIEnInventario = async (
  nota: NotaIngreso,
  productsMap: Map<string, Product>,
  almacenesMap: Map<string, Almacen>,
  motivo: string,
  usuario: string,
  empresaId: string,
  dependencias: DependenciasEntradaCuantitativaNI,
): Promise<ResultadoAnularNI> => {
  if (nota.estado !== 'Generada') {
    throw new Error('Solo se pueden anular Notas de Ingreso en estado Generada.');
  }

  // Fuente de verdad: los movimientos REALES que la generación confirmó — nunca se vuelve a
  // decidir la afectación según la clasificación (tipoExistencia) vigente hoy (§1 de la
  // corrección final). Si faltan, están duplicados o son inconsistentes, rechaza toda la
  // anulación antes de tocar cualquier producto.
  const movimientosOriginales = buscarMovimientosOriginalesGeneracion(empresaId, nota);

  // Validación temprana de UX (mensaje con nombres legibles) sobre los datos ORIGINALES — el
  // motor (§15) igualmente rechaza la operación completa si alguna línea no puede revertirse sin
  // dejar stock negativo.
  for (const movimientoOriginal of movimientosOriginales) {
    const producto = productsMap.get(movimientoOriginal.productoId);
    if (!producto) continue;
    const almacen = almacenesMap.get(movimientoOriginal.almacenId);
    if (!almacen) continue;
    const stockActual = InventoryService.getStock(producto, almacen.id);
    if (stockActual < movimientoOriginal.cantidad) {
      throw new Error(
        `No se puede anular: el producto "${producto.nombre}" tiene stock actual (${stockActual}) en "${almacen.nombreAlmacen}", menor a la cantidad ingresada originalmente (${movimientoOriginal.cantidad}).`,
      );
    }
  }

  const ahora = dependencias.fechaActual();
  const motivoMovimiento = mapTipoIngresoAMotivo(nota.tipoIngreso);

  const lineasOperacion: DatosLineaOperacionCuantitativa[] = movimientosOriginales.map((movimientoOriginal) => ({
    lineaId: movimientoOriginal.lineaOrigenId ?? `legado:${movimientoOriginal.id}`,
    productoId: movimientoOriginal.productoId,
    almacenId: movimientoOriginal.almacenId,
    cantidadUnidadMinima: movimientoOriginal.cantidad,
  }));

  let productosActualizados: Product[] = [];
  let movimientos: MovimientoStock[] = [];

  if (lineasOperacion.length > 0) {
    const datos: DatosOperacionEntradaCuantitativa = {
      modoOperacion: 'cuantitativo',
      empresaId,
      documentoId: nota.id,
      tipoDocumento: 'nota_ingreso',
      tipoOperacion: 'anulacion',
      claveIdempotencia: `nota_ingreso:anular:${nota.id}`,
      usuario,
      fecha: ahora,
      motivo: motivoMovimiento,
      observaciones: `Anulación NI ${nota.numero ?? ''} - ${motivo}`.trim(),
      documentoReferencia: nota.numero ?? nota.id,
      lineas: lineasOperacion,
    };

    const resultado = await ServicioKardexValorizado.registrarEntradaValorizada(datos, {
      almacenes: almacenesMap,
      generarId: dependencias.generarId,
      fechaActual: dependencias.fechaActual,
    });

    movimientos = resultado.movimientos;
    productosActualizados = resultado.productosActualizados;
    for (const producto of productosActualizados) {
      productsMap.set(producto.id, producto);
    }
  }

  const notaActualizada: NotaIngreso = {
    ...nota,
    estado: 'Anulada',
    motivoAnulacion: motivo,
    fechaAnulacion: ahora,
    usuarioAnulacion: usuario,
    fechaActualizacion: ahora,
    historial: [
      ...nota.historial,
      {
        fecha: ahora,
        usuario,
        accion: 'Anulada',
        detalle: `Motivo: ${motivo}. Stock revertido en ${movimientos.length} línea(s).`,
      },
    ],
  };

  return { notaActualizada, productosActualizados, movimientos };
};

// ─── Pure helpers — no side effects, no storage access ──────────────────────

/**
 * Adaptador delgado sobre `parsearEtiquetaImpuesto` (shared/catalogos-sunat/resolucionTributaria.ts)
 * — ya no reimplementa su propia expresión regular ni su propia lista de palabras clave.
 *
 * Corrección obligatoria: se elimina el fallback silencioso a 18% ante una etiqueta ambigua o
 * ausente — devolvía una tasa inventada sin que el documento supiera que el impuesto nunca se
 * resolvió. Ahora devuelve `0`, igual que `resolverImpuestoProducto` (Compras) ya hacía para
 * `'sin_configurar'` — coherente entre los cuatro adaptadores, nunca una tasa asumida. Un IGV en
 * 0 por impuesto no resuelto es una discrepancia visible en el documento (invita a corregir el
 * dato real del producto); un 18% inventado no lo era.
 */
export const resolveIgvRate = (impuesto?: string): number => {
  const { categoria, tasa } = parsearEtiquetaImpuesto(impuesto);
  return categoria === 'gravado' ? tasa : 0;
};

export interface GrupoImpuesto {
  key: string;
  labelBase: string;
  labelIgv?: string;
  rate: number;
  base: number;
  igv: number;
}

export const calcularDesgloseTributario = (lineas: LineaNotaIngreso[]): GrupoImpuesto[] => {
  const grupos = new Map<string, GrupoImpuesto>();
  for (const l of lineas) {
    const rate = resolveIgvRate(l.impuesto);
    let key: string;
    let labelBase: string;
    let labelIgv: string | undefined;
    if (rate > 0) {
      const pct = Math.round(rate * 100);
      key = `igv_${rate}`;
      labelBase = 'Op. gravadas';
      labelIgv = `IGV ${pct}%`;
    } else {
      const lower = (l.impuesto ?? '').toLowerCase();
      if (lower.includes('exonerado')) { key = 'exonerado'; labelBase = 'Op. exoneradas'; }
      else if (lower.includes('inafecto')) { key = 'inafecto'; labelBase = 'Op. inafectas'; }
      else if (lower.includes('gratuita')) { key = 'gratuita'; labelBase = 'Op. gratuitas'; }
      else { key = 'no_gravado'; labelBase = 'Op. no gravadas'; }
    }
    const existing = grupos.get(key) ?? { key, labelBase, labelIgv, rate, base: 0, igv: 0 };
    existing.base = parseFloat((existing.base + l.subtotal).toFixed(2));
    existing.igv = parseFloat((existing.igv + l.igv).toFixed(2));
    grupos.set(key, existing);
  }
  return Array.from(grupos.values()).sort((a, b) => b.rate - a.rate);
};

export const prepararDuplicado = (original: NotaIngreso): NotaIngreso => {
  const ahora = new Date().toISOString();
  const hoy = ahora.split('T')[0];
  return {
    ...original,
    id: `NI-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    estado: 'Borrador',
    esBorrador: true,
    correlativo: undefined,
    numero: undefined,
    fechaDocumento: hoy,
    fechaIngresoAlmacen: hoy,
    fechaCreacion: ahora,
    fechaActualizacion: ahora,
    motivoAnulacion: undefined,
    fechaAnulacion: undefined,
    usuarioAnulacion: undefined,
    historial: [],
    lineas: original.lineas.map((l, i) => ({
      ...l,
      id: `linea-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
    })),
  };
};
