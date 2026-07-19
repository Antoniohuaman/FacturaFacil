// src/features/gestion-inventario/services/notaIngreso.service.ts

import type { Product } from '../../catalogo-articulos/models/types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { MovimientoStock, StockAdjustmentData } from '../models';
import { InventoryService } from './inventory.service';
import { CORRELATIVO_DIGITOS_NI } from '../models/notaIngreso.constants';
import type { NotaIngreso, TipoIngreso, LineaNotaIngreso } from '../models/notaIngreso.types';
import type { MovimientoMotivo } from '../models/inventory.types';
import { parsearEtiquetaImpuesto } from '@/shared/catalogos-sunat/resolucionTributaria';

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

export const generarNIEnInventario = (
  nota: NotaIngreso,
  notasExistentes: NotaIngreso[],
  productsMap: Map<string, Product>,
  almacenesMap: Map<string, Almacen>,
  usuario: string,
): ResultadoGenerarNI => {
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
  const ahora = new Date().toISOString();

  const productosActualizados: Product[] = [];
  const movimientos: MovimientoStock[] = [];

  for (const linea of nota.lineas) {
    if (linea.tipoBienServicio === 'servicio') continue;

    const producto = productsMap.get(linea.productoId);
    if (!producto) continue;

    const almacen = almacenesMap.get(linea.almacenId ?? nota.almacenDestinoId);
    if (!almacen) continue;
    if (!almacen.estaActivoAlmacen) {
      throw new Error(
        `No se puede generar la Nota de Ingreso: el almacén "${almacen.nombreAlmacen}" está inactivo. Actívalo desde Configuración → Almacenes antes de registrar entradas.`
      );
    }

    const data: StockAdjustmentData = {
      productoId: linea.productoId,
      almacenId: almacen.id,
      tipo: 'ENTRADA',
      motivo,
      cantidad: linea.cantidad,
      observaciones: `NI ${numero} - ${nota.observaciones ?? ''}`.trim(),
      documentoReferencia: numero,
    };

    const { product: productoActualizado, movement } = InventoryService.registerAdjustment(
      producto,
      almacen,
      data,
      usuario,
    );

    const almacenesArray = Array.from(almacenesMap.values());
    const productoFinal = InventoryService.recalcularTotalesStock(productoActualizado, almacenesArray);
    productsMap.set(linea.productoId, productoFinal);
    productosActualizados.push(productoFinal);
    movimientos.push(movement);
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

export const anularNIEnInventario = (
  nota: NotaIngreso,
  productsMap: Map<string, Product>,
  almacenesMap: Map<string, Almacen>,
  motivo: string,
  usuario: string,
): ResultadoAnularNI => {
  if (nota.estado !== 'Generada') {
    throw new Error('Solo se pueden anular Notas de Ingreso en estado Generada.');
  }

  // Validar que el stock no quede negativo por la reversión (por almacén de cada línea)
  for (const linea of nota.lineas) {
    if (linea.tipoBienServicio === 'servicio') continue;
    const producto = productsMap.get(linea.productoId);
    if (!producto) continue;
    const almacen = almacenesMap.get(linea.almacenId ?? nota.almacenDestinoId);
    if (!almacen) continue;
    const stockActual = InventoryService.getStock(producto, almacen.id);
    if (stockActual < linea.cantidad) {
      throw new Error(
        `No se puede anular: el producto "${linea.productoNombre}" tiene stock actual (${stockActual}) en "${almacen.nombreAlmacen}", menor a la cantidad ingresada (${linea.cantidad}).`,
      );
    }
  }

  const ahora = new Date().toISOString();
  const productosActualizados: Product[] = [];
  const movimientos: MovimientoStock[] = [];
  const motivoMovimiento = mapTipoIngresoAMotivo(nota.tipoIngreso);

  for (const linea of nota.lineas) {
    if (linea.tipoBienServicio === 'servicio') continue;
    const producto = productsMap.get(linea.productoId);
    if (!producto) continue;

    const almacen = almacenesMap.get(linea.almacenId ?? nota.almacenDestinoId);
    if (!almacen) continue;

    const data: StockAdjustmentData = {
      productoId: linea.productoId,
      almacenId: almacen.id,
      tipo: 'AJUSTE_NEGATIVO',
      motivo: motivoMovimiento,
      cantidad: linea.cantidad,
      observaciones: `Anulación NI ${nota.numero ?? ''} - ${motivo}`.trim(),
      documentoReferencia: nota.numero ?? nota.id,
    };

    const { product: productoActualizado, movement } = InventoryService.registerAdjustment(
      producto,
      almacen,
      data,
      usuario,
    );

    const almacenesArray = Array.from(almacenesMap.values());
    const productoFinal = InventoryService.recalcularTotalesStock(productoActualizado, almacenesArray);
    productsMap.set(linea.productoId, productoFinal);
    productosActualizados.push(productoFinal);
    movimientos.push(movement);
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
