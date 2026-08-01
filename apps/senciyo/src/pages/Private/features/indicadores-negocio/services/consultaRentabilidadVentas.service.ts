// indicadores-negocio/services/consultaRentabilidadVentas.service.ts
//
// Servicio ÚNICO de proyección de Rentabilidad de Ventas — puro, de solo lectura. Combina dos
// fuentes ya existentes y aprobadas, sin recalcular ninguna de las dos:
//   - Venta neta por línea: `InstantaneaDocumentoComercial.detalle.desgloseFinancieroLineas`
//     (`comprobantes-electronicos/shared/core/desgloseFinancieroVenta.ts`).
//   - Costo de venta por línea: `ConsumoCapaCostoInventario` (vía `lineaComercialId`), y costo
//     recuperado por devolución física vía `CapaCostoInventario` (`procedencia:'devolucion_cliente'`).
//
// Nunca recalcula FIFO, nunca usa `Product.precioCompra` ni el precio de venta como costo, nunca
// usa el tipo de cambio vigente para una venta histórica, nunca convierte una ausencia de costo en
// cero. No escribe nada — el llamador (la página) ya leyó las colecciones necesarias UNA sola vez
// (comprobantes desde el contexto en memoria, movimientos/consumos/capas desde sus repositorios) y
// las pasa aquí como parámetros.

import type { Comprobante } from '../../comprobantes-electronicos/lista-comprobantes/contexts/ComprobantesListContext';
import type { CartItem } from '../../comprobantes-electronicos/models/comprobante.types';
import type { MovimientoStock } from '../../gestion-inventario/models/inventory.types';
import type { ConsumoCapaCostoInventario } from '../../gestion-inventario/models/consumoCapaCostoInventario.types';
import type { CapaCostoInventario } from '../../gestion-inventario/models/capaCostoInventario.types';
import type { OrigenCostoMovimiento } from '../../gestion-inventario/services/consultaKardexValorizado.service';
import type { IndicadoresGastosOperativos } from '../../gastos/servicios/consultaGastosOperativos.service';
import { convertMoney } from '@/shared/currency';

export type EstadoCostoRentabilidad =
  | 'con_costo'
  | 'sin_costo_registrado'
  | 'no_aplica_inventario'
  | 'tipo_cambio_no_disponible';

export type TipoOperacionRentabilidad = 'venta' | 'nota_credito_financiera' | 'nota_credito_fisica';

export type AgrupacionRentabilidad = 'sin_agrupar' | 'producto' | 'vendedor' | 'cliente' | 'establecimiento' | 'periodo';

// --- Configuración de columnas de la tabla/Excel (§14) --------------------------------------
// Vive aquí (y no en `TablaRentabilidadVentas.tsx`) porque son constantes/funciones en tiempo de
// ejecución compartidas por la tabla, la página y la exportación — un componente `.tsx` solo puede
// exportar componentes (`react-refresh/only-export-components`), así que la única forma de
// compartir esta configuración sin duplicarla ni crear un quinto archivo productivo es colocarla
// junto a la proyección, que ya es el módulo central de este feature.

/** Columnas fijas por modo — nunca configurables, siempre presentes en ese orden. */
export type ColumnaFijaRentabilidad = 'documento' | 'producto' | 'ver';

/** Columnas configurables por línea (solo válidas en modo "sin_agrupar"). */
export type ColumnaOpcionalLineaRentabilidad =
  | 'cliente'
  | 'vendedor'
  | 'establecimiento'
  | 'almacen'
  | 'monedaOriginal'
  | 'tipoCambio'
  | 'ventaNetaOriginal'
  | 'precioUnitarioHistorico'
  | 'importeBruto'
  | 'descuentoLinea'
  | 'descuentoGlobalAsignado'
  | 'impuesto'
  | 'totalVendido'
  | 'estadoComprobante'
  | 'estadoCosto'
  | 'tipoDocumento'
  | 'canal'
  | 'notaCreditoRelacionada'
  | 'cantidadDevuelta'
  | 'costoRecuperado';

/** Columnas configurables comunes a TODOS los modos (visibles por defecto). */
export type ColumnaComunRentabilidad = 'fecha' | 'cantidad' | 'ventaNeta' | 'costoVenta' | 'utilidadBruta' | 'margenBruto';

export type ColumnaRentabilidadId = ColumnaFijaRentabilidad | ColumnaComunRentabilidad | ColumnaOpcionalLineaRentabilidad;

export const ETIQUETA_COLUMNA_RENTABILIDAD: Record<ColumnaRentabilidadId, string> = {
  documento: 'Documento',
  producto: 'Producto',
  ver: 'Ver',
  fecha: 'Fecha',
  cantidad: 'Cantidad',
  ventaNeta: 'Venta neta',
  costoVenta: 'Costo de venta',
  utilidadBruta: 'Utilidad bruta',
  margenBruto: 'Margen bruto',
  cliente: 'Cliente',
  vendedor: 'Vendedor',
  establecimiento: 'Establecimiento',
  almacen: 'Almacén',
  monedaOriginal: 'Moneda original',
  tipoCambio: 'Tipo de cambio',
  ventaNetaOriginal: 'Venta neta original',
  precioUnitarioHistorico: 'Precio unitario histórico',
  importeBruto: 'Importe bruto',
  descuentoLinea: 'Descuento de línea',
  descuentoGlobalAsignado: 'Descuento global asignado',
  impuesto: 'Impuesto',
  totalVendido: 'Total vendido',
  estadoComprobante: 'Estado del comprobante',
  estadoCosto: 'Estado del costo',
  tipoDocumento: 'Tipo de documento',
  canal: 'Canal',
  notaCreditoRelacionada: 'Nota de Crédito relacionada',
  cantidadDevuelta: 'Cantidad devuelta',
  costoRecuperado: 'Costo recuperado',
};

/** Etiqueta de la columna fija "documento" según el modo de agrupación — nunca "Documento" cuando se agrupa. */
export function etiquetaColumnaAgrupacion(modo: AgrupacionRentabilidad): string {
  switch (modo) {
    case 'producto': return 'Producto';
    case 'vendedor': return 'Vendedor';
    case 'cliente': return 'Cliente';
    case 'establecimiento': return 'Establecimiento';
    case 'periodo': return 'Periodo';
    default: return 'Documento';
  }
}

export const COLUMNAS_COMUNES_RENTABILIDAD: ColumnaComunRentabilidad[] = [
  'fecha', 'cantidad', 'ventaNeta', 'costoVenta', 'utilidadBruta', 'margenBruto',
];

export const COLUMNAS_OPCIONALES_LINEA_RENTABILIDAD: ColumnaOpcionalLineaRentabilidad[] = [
  'cliente', 'vendedor', 'establecimiento', 'almacen', 'monedaOriginal', 'tipoCambio',
  'ventaNetaOriginal', 'precioUnitarioHistorico', 'importeBruto', 'descuentoLinea',
  'descuentoGlobalAsignado', 'impuesto', 'totalVendido', 'estadoComprobante', 'estadoCosto',
  'tipoDocumento', 'canal', 'notaCreditoRelacionada', 'cantidadDevuelta', 'costoRecuperado',
];

/**
 * Columnas CONFIGURABLES disponibles para un modo dado — nunca las mismas en "sin agrupar" que en
 * un modo agrupado: los datos por línea (cliente, moneda, impuesto, NC relacionada, etc.) no
 * existen a nivel agregado, así que una columna inválida de "sin agrupar" nunca puede aparecer en
 * "Producto" (§14).
 */
export function obtenerColumnasConfigurables(modo: AgrupacionRentabilidad): ColumnaRentabilidadId[] {
  if (modo === 'sin_agrupar') {
    return [...COLUMNAS_COMUNES_RENTABILIDAD, ...COLUMNAS_OPCIONALES_LINEA_RENTABILIDAD];
  }
  // "fecha" tampoco aplica a un grupo agregado (que abarca varias fechas) salvo en "periodo",
  // donde la propia columna fija ya muestra el bucket de periodo — se omite para no duplicar.
  return COLUMNAS_COMUNES_RENTABILIDAD.filter((c) => c !== 'fecha');
}

/** Códigos SUNAT de Nota de Crédito que implican devolución física — mismo criterio ya usado en `useComprobanteActions.tsx`, nunca reinventado. */
const CODIGOS_NC_DEVOLUCION_FISICA = new Set(['06', '07']);

/** Una fila = una línea de venta o un ajuste comercial (NC) — nunca ambos combinados en una sola fila. */
export interface FilaRentabilidadVenta {
  id: string;
  empresaId: string;
  documentoId: string;
  lineaComercialId?: string;
  fecha: string;
  tipoDocumento: string;
  numeroDocumento: string;
  tipoOperacion: TipoOperacionRentabilidad;
  productoId: string;
  productoNombre: string;
  productoCodigo?: string;
  cantidad: number;
  cliente?: string;
  vendedor?: string;
  establecimiento?: string;
  almacen?: string;
  canal?: string;
  monedaOriginal: string;
  tipoCambioHistorico?: number;
  /** Snapshot inmutable de la línea (`DesgloseFinancieroLinea`) — nunca recalculado desde el precio/config actual. */
  precioUnitarioHistorico: number;
  importeBruto: number;
  descuentoLinea: number;
  descuentoGlobalAsignado: number;
  impuesto: number;
  totalVendido: number;
  ventaNetaOriginal: number;
  ventaNetaBase: number | null;
  costoVentaBase: number | null;
  utilidadBrutaBase: number | null;
  margenBruto: number | null;
  estadoCosto: EstadoCostoRentabilidad;
  cantidadDevuelta: number;
  ventaDevueltaBase: number;
  costoRecuperadoBase: number;
  documentoOrigenRelacionado?: string;
  estadoDocumento: string;
}

export interface IndicadoresRentabilidadVentas {
  ventaNetaTotal: number;
  /** Venta neta de las líneas con costo cubierto — base del margen bruto Y del margen operativo estimado de Indicadores → Rentabilidad (nunca recalculada aparte). */
  ventaNetaCubierta: number;
  costoVentaCubierto: number;
  utilidadBrutaCubierta: number;
  margenBrutoCubierto: number | null;
  coberturaPorcentaje: number | null;
  lineasSinCosto: number;
  lineasNoInventariables: number;
  lineasTipoCambioNoDisponible: number;
  totalLineas: number;
}

export interface GrupoRentabilidadVenta {
  clave: string;
  etiqueta: string;
  cantidadNeta: number;
  ventaNetaBase: number;
  costoVentaBase: number | null;
  utilidadBrutaBase: number | null;
  margenBruto: number | null;
  cantidadFilas: number;
  lineasSinCosto: number;
  lineasNoInventariables: number;
}

export interface ParametrosProyeccionRentabilidad {
  empresaId: string;
  monedaBase: string;
  comprobantes: readonly Comprobante[];
  movimientos: readonly MovimientoStock[];
  consumos: readonly ConsumoCapaCostoInventario[];
  capas: readonly CapaCostoInventario[];
  /** ISO 8601 (YYYY-MM-DD), inclusive. */
  periodo: { desde: string; hasta: string };
  establecimientoId?: string;
  /** `false`/ausente (por defecto): los comprobantes anulados nunca se proyectan — ni en indicadores ni en la tabla. Solo cuando la página pide explícitamente verlos (filtro "Estado del comprobante" = Anulado) se activa en `true`. */
  incluirAnulados?: boolean;
}

function redondear(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function esNumeroValido(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor);
}

function fechaDentroDelPeriodo(fechaIso: string, desde: string, hasta: string): boolean {
  const fecha = fechaIso.slice(0, 10);
  return fecha >= desde && fecha <= hasta;
}

/**
 * Determina si esta línea del carrito afectó inventario en el momento de la venta — mismo criterio
 * exacto que `useComprobanteActions.tsx` usa para decidir si descuenta stock, nunca reinventado ni
 * re-derivado desde `Product.tipoExistencia` actual (que podría haber cambiado desde entonces).
 */
function esLineaInventariable(item: Pick<CartItem, 'tipoDetalle' | 'requiresStockControl'>): boolean {
  return item.tipoDetalle !== 'libre' && Boolean(item.requiresStockControl);
}

/** Índice de movimientos por id — construido UNA sola vez por el llamador de la función principal. */
type IndiceMovimientosPorId = Map<string, MovimientoStock>;

/** Índice de consumos CONFIRMADOS agrupados por `${documentoOrigenId}::${lineaComercialId}` — nunca incluye consumos revertidos (la venta que los originó ya fue anulada/revertida). */
type IndiceConsumosPorLinea = Map<string, ConsumoCapaCostoInventario[]>;
/** Índice de consumos CONFIRMADOS agrupados por `${documentoOrigenId}::${productoId}` — fallback legacy únicamente para líneas sin `lineaComercialId`. */
type IndiceConsumosPorProducto = Map<string, ConsumoCapaCostoInventario[]>;
/** Índice de capas de devolución física (`procedencia:'devolucion_cliente'`) agrupadas por el `documentoOrigenId` de la propia Nota de Crédito. */
type IndiceCapasDevolucionPorDocumentoNC = Map<string, CapaCostoInventario[]>;

interface IndicesInventario {
  movimientosPorId: IndiceMovimientosPorId;
  consumosPorLinea: IndiceConsumosPorLinea;
  consumosPorProducto: IndiceConsumosPorProducto;
  capasDevolucionPorDocumentoNC: IndiceCapasDevolucionPorDocumentoNC;
}

/** Construye todos los índices en UNA sola pasada por cada colección — nunca un `find`/`filter` repetido por fila (§20). */
function construirIndicesInventario(
  movimientos: readonly MovimientoStock[],
  consumos: readonly ConsumoCapaCostoInventario[],
  capas: readonly CapaCostoInventario[],
): IndicesInventario {
  const movimientosPorId: IndiceMovimientosPorId = new Map();
  for (const movimiento of movimientos) {
    movimientosPorId.set(movimiento.id, movimiento);
  }

  const consumosPorLinea: IndiceConsumosPorLinea = new Map();
  const consumosPorProducto: IndiceConsumosPorProducto = new Map();
  for (const consumo of consumos) {
    if (consumo.estado !== 'confirmado') continue;
    const movimiento = movimientosPorId.get(consumo.movimientoSalidaId);
    if (!movimiento?.documentoOrigenId) continue;

    if (consumo.lineaComercialId) {
      const clave = `${movimiento.documentoOrigenId}::${consumo.lineaComercialId}`;
      const existentes = consumosPorLinea.get(clave);
      if (existentes) existentes.push(consumo);
      else consumosPorLinea.set(clave, [consumo]);
    }

    const claveProducto = `${movimiento.documentoOrigenId}::${movimiento.productoId}`;
    const existentesProducto = consumosPorProducto.get(claveProducto);
    if (existentesProducto) existentesProducto.push(consumo);
    else consumosPorProducto.set(claveProducto, [consumo]);
  }

  const capasDevolucionPorDocumentoNC: IndiceCapasDevolucionPorDocumentoNC = new Map();
  for (const capa of capas) {
    if (capa.procedencia !== 'devolucion_cliente' || capa.estado === 'revertida') continue;
    const existentes = capasDevolucionPorDocumentoNC.get(capa.documentoOrigenId);
    if (existentes) existentes.push(capa);
    else capasDevolucionPorDocumentoNC.set(capa.documentoOrigenId, [capa]);
  }

  return { movimientosPorId, consumosPorLinea, consumosPorProducto, capasDevolucionPorDocumentoNC };
}

interface ResolucionCosto {
  costoVentaBase: number | null;
  estadoCosto: 'con_costo' | 'sin_costo_registrado';
  consumosUsados: ConsumoCapaCostoInventario[];
}

/** Resuelve el costo de una línea de venta contra los índices ya construidos — nunca lee un repositorio aquí, nunca recalcula FIFO. */
function resolverCostoLinea(
  documentoOrigenId: string,
  productoId: string,
  lineaComercialId: string | undefined,
  indices: IndicesInventario,
): ResolucionCosto {
  let consumos: ConsumoCapaCostoInventario[] | undefined;
  if (lineaComercialId) {
    consumos = indices.consumosPorLinea.get(`${documentoOrigenId}::${lineaComercialId}`);
  }
  if (!consumos || consumos.length === 0) {
    // Fallback legacy (documento nuevo sin lineaComercialId, o venta anterior a esta capacidad):
    // solo por documentoOrigenId+productoId — nunca inventa una coincidencia ambigua entre líneas
    // distintas del mismo producto (aceptado como limitación conocida, ver informe final).
    consumos = indices.consumosPorProducto.get(`${documentoOrigenId}::${productoId}`);
  }
  if (!consumos || consumos.length === 0) {
    return { costoVentaBase: null, estadoCosto: 'sin_costo_registrado', consumosUsados: [] };
  }
  const costoVentaBase = redondear(consumos.reduce((suma, consumo) => suma + consumo.valorConsumidoMonedaBase, 0));
  return { costoVentaBase, estadoCosto: 'con_costo', consumosUsados: consumos };
}

/** Almacén de salida real de la línea — derivado del `MovimientoStock` del primer consumo usado (mismo movimiento ya resuelto por `resolverCostoLinea`, nunca una lectura adicional de repositorio ni un almacén inventado). */
function resolverAlmacenDeConsumos(consumosUsados: readonly ConsumoCapaCostoInventario[], indices: IndicesInventario): string | undefined {
  const primero = consumosUsados[0];
  if (!primero) return undefined;
  return indices.movimientosPorId.get(primero.movimientoSalidaId)?.almacenNombre || undefined;
}

interface ResolucionConversion {
  ventaNetaBase: number | null;
  tipoCambioHistorico: number | undefined;
  sinTipoCambio: boolean;
}

/** Convierte un importe en moneda del documento a la moneda base — SIEMPRE con el tipo de cambio HISTÓRICO del propio documento, nunca el vigente, nunca asumido en 1. */
function convertirVentaNetaABase(
  importeOriginal: number,
  monedaOriginal: string,
  monedaBase: string,
  tipoCambioHistorico: number | null | undefined,
): ResolucionConversion {
  if (monedaOriginal === monedaBase) {
    return { ventaNetaBase: redondear(importeOriginal), tipoCambioHistorico: undefined, sinTipoCambio: false };
  }
  if (!esNumeroValido(tipoCambioHistorico) || (tipoCambioHistorico as number) <= 0) {
    return { ventaNetaBase: null, tipoCambioHistorico: undefined, sinTipoCambio: true };
  }
  const convertido = convertMoney(importeOriginal, monedaOriginal, monedaBase, tipoCambioHistorico as number);
  return { ventaNetaBase: redondear(convertido), tipoCambioHistorico: tipoCambioHistorico as number, sinTipoCambio: false };
}

function calcularUtilidadYMargen(
  ventaNetaBase: number | null,
  costoVentaBase: number | null,
): { utilidadBrutaBase: number | null; margenBruto: number | null } {
  if (ventaNetaBase === null || costoVentaBase === null) {
    return { utilidadBrutaBase: null, margenBruto: null };
  }
  const utilidadBrutaBase = redondear(ventaNetaBase - costoVentaBase);
  if (ventaNetaBase === 0) {
    return { utilidadBrutaBase, margenBruto: null };
  }
  return { utilidadBrutaBase, margenBruto: utilidadBrutaBase / ventaNetaBase };
}

function esComprobanteAnulado(comprobante: Comprobante): boolean {
  return comprobante.status === 'Anulado';
}

function esNotaCredito(comprobante: Comprobante): boolean {
  const tipo = comprobante.instantaneaDocumentoComercial?.identidad.tipoDocumento;
  return tipo === 'nota_credito' || comprobante.type?.toLowerCase().includes('credito') === true;
}

function esNotaCreditoFisica(comprobante: Comprobante): boolean {
  const codigo = comprobante.noteCreditData?.codigo ?? '';
  return CODIGOS_NC_DEVOLUCION_FISICA.has(codigo);
}

/** Construye las filas de VENTA (no-NC) de un comprobante — una fila por línea inventariable o no. */
function construirFilasDeVenta(
  comprobante: Comprobante,
  indices: IndicesInventario,
  monedaBase: string,
): FilaRentabilidadVenta[] {
  const instantanea = comprobante.instantaneaDocumentoComercial;
  const desglose = instantanea?.detalle.desgloseFinancieroLineas;
  if (!instantanea || !desglose || desglose.length === 0) return [];

  const documentoOrigenId = comprobante.inventarioDocumentoId;
  const filas: FilaRentabilidadVenta[] = [];

  instantanea.detalle.items.forEach((item, indice) => {
    const lineaDesglose = desglose.find((d) => d.lineaId === item.lineaId) ?? desglose[indice];
    if (!lineaDesglose) return;

    const inventariable = esLineaInventariable(item);
    const monedaOriginal = lineaDesglose.moneda || monedaBase;
    const conversion = convertirVentaNetaABase(
      lineaDesglose.ventaNetaSinImpuesto,
      monedaOriginal,
      monedaBase,
      instantanea.identidad.tipoCambio,
    );

    let estadoCosto: EstadoCostoRentabilidad;
    let costoVentaBase: number | null = null;
    let almacen: string | undefined;

    if (conversion.sinTipoCambio) {
      estadoCosto = 'tipo_cambio_no_disponible';
    } else if (!inventariable) {
      estadoCosto = 'no_aplica_inventario';
    } else if (!documentoOrigenId) {
      estadoCosto = 'sin_costo_registrado';
    } else {
      const resolucion = resolverCostoLinea(documentoOrigenId, item.id, item.lineaId, indices);
      estadoCosto = resolucion.estadoCosto;
      costoVentaBase = resolucion.costoVentaBase;
      almacen = resolverAlmacenDeConsumos(resolucion.consumosUsados, indices);
    }

    const { utilidadBrutaBase, margenBruto } = calcularUtilidadYMargen(conversion.ventaNetaBase, costoVentaBase);

    filas.push({
      id: `${comprobante.id}-${item.lineaId ?? indice}`,
      empresaId: instantanea.empresa.idEmpresa ?? '',
      documentoId: comprobante.id,
      lineaComercialId: item.lineaId,
      fecha: instantanea.identidad.fechaEmision ?? comprobante.date,
      tipoDocumento: instantanea.identidad.tipoDocumento,
      numeroDocumento: instantanea.identidad.numeroCompleto ?? comprobante.id,
      tipoOperacion: 'venta',
      productoId: item.id,
      productoNombre: item.name,
      productoCodigo: item.code,
      cantidad: lineaDesglose.cantidad,
      cliente: instantanea.cliente.nombre || undefined,
      vendedor: instantanea.vendedor.nombreUsuario || undefined,
      establecimiento: instantanea.establecimiento.nombreEstablecimiento || undefined,
      almacen,
      canal: instantanea.identidad.origen,
      monedaOriginal,
      tipoCambioHistorico: conversion.tipoCambioHistorico,
      precioUnitarioHistorico: lineaDesglose.precioUnitarioHistorico,
      importeBruto: lineaDesglose.importeBruto,
      descuentoLinea: lineaDesglose.descuentoLinea,
      descuentoGlobalAsignado: lineaDesglose.descuentoGlobalAsignado,
      impuesto: lineaDesglose.impuesto,
      totalVendido: lineaDesglose.total,
      ventaNetaOriginal: redondear(lineaDesglose.ventaNetaSinImpuesto),
      ventaNetaBase: conversion.ventaNetaBase,
      costoVentaBase,
      utilidadBrutaBase,
      margenBruto,
      estadoCosto,
      cantidadDevuelta: 0,
      ventaDevueltaBase: 0,
      costoRecuperadoBase: 0,
      estadoDocumento: comprobante.status,
    });
  });

  return filas;
}

/** Construye las filas de AJUSTE (Nota de Crédito, financiera o física) — nunca reescribe la fila de venta original. */
function construirFilasDeNotaCredito(
  comprobante: Comprobante,
  indices: IndicesInventario,
  monedaBase: string,
): FilaRentabilidadVenta[] {
  const instantanea = comprobante.instantaneaDocumentoComercial;
  const desglose = instantanea?.detalle.desgloseFinancieroLineas;
  if (!instantanea || !desglose || desglose.length === 0) return [];

  const esFisica = esNotaCreditoFisica(comprobante);
  const docAfectado = comprobante.noteCreditData?.documentoRelacionado?.numeroCompleto;
  const filas: FilaRentabilidadVenta[] = [];

  instantanea.detalle.items.forEach((item, indice) => {
    const lineaDesglose = desglose.find((d) => d.lineaId === item.lineaId) ?? desglose[indice];
    if (!lineaDesglose) return;

    const monedaOriginal = lineaDesglose.moneda || monedaBase;
    const conversion = convertirVentaNetaABase(
      lineaDesglose.ventaNetaSinImpuesto,
      monedaOriginal,
      monedaBase,
      instantanea.identidad.tipoCambio,
    );

    // El ajuste SIEMPRE reduce la venta neta — nunca la aumenta.
    const ventaNetaBaseAjuste = conversion.ventaNetaBase === null ? null : -Math.abs(conversion.ventaNetaBase);

    let costoRecuperadoBase = 0;
    let cantidadDevuelta = 0;
    let estadoCosto: EstadoCostoRentabilidad = 'no_aplica_inventario';
    let costoVentaBaseAjuste: number | null = null;

    if (esFisica && conversion.sinTipoCambio) {
      estadoCosto = 'tipo_cambio_no_disponible';
    } else if (esFisica) {
      const capasDevolucion = comprobante.inventarioDocumentoId
        ? indices.capasDevolucionPorDocumentoNC.get(comprobante.inventarioDocumentoId) ?? []
        : [];
      const capasDeEstaLinea = item.lineaId
        ? capasDevolucion.filter((capa) => {
            const consumoOriginal = capa.consumoOrigenId
              ? findConsumoPorId(indices, capa.consumoOrigenId)
              : undefined;
            return consumoOriginal?.lineaComercialId === item.lineaId;
          })
        : capasDevolucion;

      if (capasDeEstaLinea.length > 0) {
        cantidadDevuelta = capasDeEstaLinea.reduce((suma, capa) => suma + capa.cantidadInicial, 0);
        costoRecuperadoBase = redondear(capasDeEstaLinea.reduce((suma, capa) => suma + capa.valorValorizableMonedaBase, 0));
        costoVentaBaseAjuste = -costoRecuperadoBase;
        estadoCosto = 'con_costo';
      } else {
        estadoCosto = 'sin_costo_registrado';
      }
    }

    const { utilidadBrutaBase, margenBruto } = calcularUtilidadYMargen(ventaNetaBaseAjuste, costoVentaBaseAjuste);

    filas.push({
      id: `${comprobante.id}-${item.lineaId ?? indice}`,
      empresaId: instantanea.empresa.idEmpresa ?? '',
      documentoId: comprobante.id,
      lineaComercialId: item.lineaId,
      fecha: instantanea.identidad.fechaEmision ?? comprobante.date,
      tipoDocumento: instantanea.identidad.tipoDocumento,
      numeroDocumento: instantanea.identidad.numeroCompleto ?? comprobante.id,
      tipoOperacion: esFisica ? 'nota_credito_fisica' : 'nota_credito_financiera',
      productoId: item.id,
      productoNombre: item.name,
      productoCodigo: item.code,
      cantidad: -Math.abs(lineaDesglose.cantidad),
      cliente: instantanea.cliente.nombre || undefined,
      vendedor: instantanea.vendedor.nombreUsuario || undefined,
      establecimiento: instantanea.establecimiento.nombreEstablecimiento || undefined,
      almacen: undefined,
      canal: instantanea.identidad.origen,
      monedaOriginal,
      tipoCambioHistorico: conversion.tipoCambioHistorico,
      precioUnitarioHistorico: lineaDesglose.precioUnitarioHistorico,
      importeBruto: -Math.abs(lineaDesglose.importeBruto),
      descuentoLinea: lineaDesglose.descuentoLinea,
      descuentoGlobalAsignado: lineaDesglose.descuentoGlobalAsignado,
      impuesto: -Math.abs(lineaDesglose.impuesto),
      totalVendido: -Math.abs(lineaDesglose.total),
      ventaNetaOriginal: -Math.abs(redondear(lineaDesglose.ventaNetaSinImpuesto)),
      ventaNetaBase: ventaNetaBaseAjuste,
      costoVentaBase: costoVentaBaseAjuste,
      utilidadBrutaBase,
      margenBruto,
      estadoCosto,
      cantidadDevuelta,
      ventaDevueltaBase: ventaNetaBaseAjuste === null ? 0 : Math.abs(ventaNetaBaseAjuste),
      costoRecuperadoBase,
      documentoOrigenRelacionado: docAfectado,
      estadoDocumento: comprobante.status,
    });
  });

  return filas;
}

function findConsumoPorId(indices: IndicesInventario, consumoId: string): ConsumoCapaCostoInventario | undefined {
  for (const grupo of indices.consumosPorLinea.values()) {
    const encontrado = grupo.find((c) => c.id === consumoId);
    if (encontrado) return encontrado;
  }
  for (const grupo of indices.consumosPorProducto.values()) {
    const encontrado = grupo.find((c) => c.id === consumoId);
    if (encontrado) return encontrado;
  }
  return undefined;
}

/**
 * Resuelve, bajo demanda, los orígenes de costo (documento de ingreso, fecha, cantidad utilizada,
 * costo unitario, valor utilizado) que financiaron una línea de venta — únicamente para el modal
 * de detalle (§18), nunca poblado en cada fila de la proyección masiva (evitaría datos redundantes,
 * §20). Reutiliza el mismo tipo `OrigenCostoMovimiento` ya aprobado para el Kardex valorizado —
 * nunca redefine una forma paralela ni expone `capaId`/`consumoId` como dato mostrable.
 */
export function resolverOrigenesCostoLinea(
  documentoOrigenId: string,
  productoId: string,
  lineaComercialId: string | undefined,
  movimientos: readonly MovimientoStock[],
  consumos: readonly ConsumoCapaCostoInventario[],
  capas: readonly CapaCostoInventario[],
): OrigenCostoMovimiento[] {
  const indices = construirIndicesInventario(movimientos, consumos, capas);
  const { consumosUsados } = resolverCostoLinea(documentoOrigenId, productoId, lineaComercialId, indices);
  if (consumosUsados.length === 0) return [];

  const capasPorId = new Map<string, CapaCostoInventario>();
  for (const capa of capas) {
    capasPorId.set(capa.id, capa);
  }

  return consumosUsados.map((consumo) => {
    const capa = capasPorId.get(consumo.capaId);
    return {
      documentoOrigenId: capa?.documentoOrigenId ?? consumo.capaId,
      tipoDocumentoOrigen: capa?.tipoDocumentoOrigen ?? 'ajuste',
      fecha: capa?.fechaEntrada ?? consumo.fecha,
      cantidad: consumo.cantidadConsumida,
      costoUnitario: consumo.costoUnitarioBaseMonedaBase,
      valor: consumo.valorConsumidoMonedaBase,
    };
  });
}

/**
 * Proyección principal — única función pública que combina venta y costo. Filtra por empresa,
 * periodo y establecimiento ANTES de proyectar (§20); excluye comprobantes anulados; nunca
 * convierte ausencia de costo en cero; nunca usa `Product.precioCompra`; nunca recalcula FIFO.
 */
export function proyectarFilasRentabilidadVentas(params: ParametrosProyeccionRentabilidad): FilaRentabilidadVenta[] {
  const { comprobantes, movimientos, consumos, capas, monedaBase, periodo, establecimientoId, incluirAnulados } = params;
  const indices = construirIndicesInventario(movimientos, consumos, capas);

  const comprobantesElegibles = comprobantes.filter((comprobante) => {
    if (!incluirAnulados && esComprobanteAnulado(comprobante)) return false;
    const fecha = comprobante.instantaneaDocumentoComercial?.identidad.fechaEmision ?? comprobante.date;
    if (!fecha || !fechaDentroDelPeriodo(fecha, periodo.desde, periodo.hasta)) return false;
    if (establecimientoId && establecimientoId !== 'Todos') {
      const estId = comprobante.instantaneaDocumentoComercial?.establecimiento.idEstablecimiento;
      if (estId && estId !== establecimientoId) return false;
    }
    return true;
  });

  const filas: FilaRentabilidadVenta[] = [];
  for (const comprobante of comprobantesElegibles) {
    if (esNotaCredito(comprobante)) {
      filas.push(...construirFilasDeNotaCredito(comprobante, indices, monedaBase));
    } else {
      filas.push(...construirFilasDeVenta(comprobante, indices, monedaBase));
    }
  }
  return filas;
}

export interface FiltrosAvanzadosRentabilidad {
  busqueda?: string;
  almacen?: string;
  tipoDocumento?: string;
  canal?: string;
  estadoComprobante?: string;
  estadoCosto?: EstadoCostoRentabilidad;
  conDevolucion?: boolean;
}

/** Filtra filas ya proyectadas — nunca vuelve a leer repositorios ni a recalcular costo/venta. */
export function filtrarFilasRentabilidad(
  filas: readonly FilaRentabilidadVenta[],
  filtros: FiltrosAvanzadosRentabilidad,
): FilaRentabilidadVenta[] {
  const busquedaNormalizada = filtros.busqueda?.trim().toLowerCase();

  return filas.filter((fila) => {
    if (busquedaNormalizada) {
      const haystack = [fila.numeroDocumento, fila.productoNombre, fila.productoCodigo, fila.cliente, fila.vendedor]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(busquedaNormalizada)) return false;
    }
    if (filtros.almacen && fila.almacen !== filtros.almacen) return false;
    if (filtros.tipoDocumento && fila.tipoDocumento !== filtros.tipoDocumento) return false;
    if (filtros.canal && fila.canal !== filtros.canal) return false;
    if (filtros.estadoComprobante && fila.estadoDocumento !== filtros.estadoComprobante) return false;
    if (filtros.estadoCosto && fila.estadoCosto !== filtros.estadoCosto) return false;
    if (filtros.conDevolucion !== undefined) {
      const tieneDevolucion = fila.cantidadDevuelta > 0 || fila.tipoOperacion === 'nota_credito_fisica';
      if (filtros.conDevolucion !== tieneDevolucion) return false;
    }
    return true;
  });
}

/** Indicadores agregados — SIEMPRE sobre el conjunto de filas ya filtrado, independiente de la agrupación de la tabla. */
export function calcularIndicadoresRentabilidad(filas: readonly FilaRentabilidadVenta[]): IndicadoresRentabilidadVentas {
  let ventaNetaTotal = 0;
  let ventaNetaCubierta = 0;
  let ventaNetaElegible = 0;
  let costoVentaCubierto = 0;
  let lineasSinCosto = 0;
  let lineasNoInventariables = 0;
  let lineasTipoCambioNoDisponible = 0;

  for (const fila of filas) {
    if (fila.ventaNetaBase !== null) {
      ventaNetaTotal += fila.ventaNetaBase;
    }

    switch (fila.estadoCosto) {
      case 'con_costo':
        if (fila.ventaNetaBase !== null && fila.costoVentaBase !== null) {
          ventaNetaCubierta += fila.ventaNetaBase;
          ventaNetaElegible += fila.ventaNetaBase;
          costoVentaCubierto += fila.costoVentaBase;
        }
        break;
      case 'sin_costo_registrado':
        lineasSinCosto += 1;
        if (fila.ventaNetaBase !== null) ventaNetaElegible += fila.ventaNetaBase;
        break;
      case 'no_aplica_inventario':
        lineasNoInventariables += 1;
        break;
      case 'tipo_cambio_no_disponible':
        lineasTipoCambioNoDisponible += 1;
        break;
    }
  }

  const utilidadBrutaCubierta = redondear(ventaNetaCubierta - costoVentaCubierto);
  const margenBrutoCubierto = ventaNetaCubierta !== 0 ? utilidadBrutaCubierta / ventaNetaCubierta : null;
  const coberturaPorcentaje = ventaNetaElegible !== 0
    ? Math.min(100, Math.max(0, redondear((ventaNetaCubierta / ventaNetaElegible) * 100)))
    : null;

  return {
    ventaNetaTotal: redondear(ventaNetaTotal),
    ventaNetaCubierta: redondear(ventaNetaCubierta),
    costoVentaCubierto: redondear(costoVentaCubierto),
    utilidadBrutaCubierta,
    margenBrutoCubierto,
    coberturaPorcentaje,
    lineasSinCosto,
    lineasNoInventariables,
    lineasTipoCambioNoDisponible,
    totalLineas: filas.length,
  };
}

export interface ResultadoOperativoEstimado {
  gastosOperativosReconocidos: number;
  utilidadOperativaEstimada: number;
  margenOperativoEstimado: number | null;
  /** `true` solo cuando la cobertura de costo de venta es 100% Y no hay líneas de gasto sin tipo de cambio — únicamente entonces se omite la palabra "estimada" (§14, nunca "Utilidad neta"). */
  esCompleto: boolean;
}

/** Combina Rentabilidad de Ventas con Gastos operativos — única fórmula de Utilidad/Margen operativo, nunca recalculada en la página ni duplicada entre Indicadores y Reportes (§13/§14). */
export function calcularResultadoOperativo(
  indicadoresRentabilidad: IndicadoresRentabilidadVentas,
  indicadoresGastos: IndicadoresGastosOperativos,
): ResultadoOperativoEstimado {
  const utilidadOperativaEstimada = redondear(indicadoresRentabilidad.utilidadBrutaCubierta - indicadoresGastos.gastosOperativosReconocidos);
  const margenOperativoEstimado = indicadoresRentabilidad.ventaNetaCubierta !== 0
    ? utilidadOperativaEstimada / indicadoresRentabilidad.ventaNetaCubierta
    : null;
  const esCompleto = indicadoresRentabilidad.coberturaPorcentaje === 100 && indicadoresGastos.lineasSinTipoCambio === 0;

  return {
    gastosOperativosReconocidos: indicadoresGastos.gastosOperativosReconocidos,
    utilidadOperativaEstimada,
    margenOperativoEstimado,
    esCompleto,
  };
}

/** Amplitud del periodo en días — determina la unidad de agrupación por "Periodo" (§14: regla determinística, nunca hardcodeada en varios lugares). */
export function calcularAmplitudPeriodoEnDias(desde: string, hasta: string): number {
  const inicio = new Date(`${desde}T00:00:00.000Z`).getTime();
  const fin = new Date(`${hasta}T00:00:00.000Z`).getTime();
  return Math.max(1, Math.round((fin - inicio) / (24 * 60 * 60 * 1000)) + 1);
}

/** Clave y etiqueta de bucket de periodo para una fecha dada — única fuente de esta regla (día ≤31, semana ≤180, mes en otro caso). */
export function determinarClavePeriodo(fechaIso: string, amplitudDias: number): { clave: string; etiqueta: string } {
  const fecha = fechaIso.slice(0, 10);
  if (amplitudDias <= 31) {
    return { clave: fecha, etiqueta: fecha };
  }
  if (amplitudDias <= 180) {
    const dia = new Date(`${fecha}T00:00:00.000Z`);
    const diaSemanaISO = (dia.getUTCDay() + 6) % 7;
    const inicioSemana = new Date(dia);
    inicioSemana.setUTCDate(dia.getUTCDate() - diaSemanaISO);
    const claveSemana = inicioSemana.toISOString().slice(0, 10);
    return { clave: claveSemana, etiqueta: `Semana del ${claveSemana}` };
  }
  const mes = fecha.slice(0, 7);
  return { clave: mes, etiqueta: mes };
}

function agregarGrupo(
  grupos: Map<string, GrupoRentabilidadVenta>,
  ventaNetaCubiertaPorClave: Map<string, number>,
  clave: string,
  etiqueta: string,
  fila: FilaRentabilidadVenta,
): void {
  const existente = grupos.get(clave);
  const cantidad = fila.cantidad + (fila.tipoOperacion !== 'venta' ? -fila.cantidadDevuelta : 0);
  const ventaNeta = fila.ventaNetaBase ?? 0;
  const costoSumable = fila.costoVentaBase;
  const utilidadSumable = fila.utilidadBrutaBase;
  const esSinCosto = fila.estadoCosto === 'sin_costo_registrado';
  const esNoInventariable = fila.estadoCosto === 'no_aplica_inventario';
  // Venta neta "cubierta" (denominador correcto del margen agregado, §11/§23): solo la porción de
  // venta neta cuyo costo SÍ se sumó — nunca la venta neta total del grupo, que diluiría el margen
  // con ingresos sin costo comparable.
  if (costoSumable !== null && fila.ventaNetaBase !== null) {
    ventaNetaCubiertaPorClave.set(clave, (ventaNetaCubiertaPorClave.get(clave) ?? 0) + fila.ventaNetaBase);
  }

  if (!existente) {
    grupos.set(clave, {
      clave,
      etiqueta,
      cantidadNeta: cantidad,
      ventaNetaBase: ventaNeta,
      costoVentaBase: costoSumable,
      utilidadBrutaBase: utilidadSumable,
      margenBruto: null,
      cantidadFilas: 1,
      lineasSinCosto: esSinCosto ? 1 : 0,
      lineasNoInventariables: esNoInventariable ? 1 : 0,
    });
    return;
  }

  existente.cantidadNeta += cantidad;
  existente.ventaNetaBase = redondear(existente.ventaNetaBase + ventaNeta);
  if (costoSumable !== null) {
    existente.costoVentaBase = redondear((existente.costoVentaBase ?? 0) + costoSumable);
  }
  if (utilidadSumable !== null) {
    existente.utilidadBrutaBase = redondear((existente.utilidadBrutaBase ?? 0) + utilidadSumable);
  }
  existente.cantidadFilas += 1;
  if (esSinCosto) existente.lineasSinCosto += 1;
  if (esNoInventariable) existente.lineasNoInventariables += 1;
}

/**
 * Agrupa filas ya filtradas — cambia la granularidad real (nunca es solo un filtro visual). El
 * margen de cada grupo se calcula SIEMPRE desde los totales acumulados del grupo (utilidad total ÷
 * venta cubierta total), nunca como promedio simple de los márgenes individuales de cada fila.
 */
export function agruparFilasRentabilidad(
  filas: readonly FilaRentabilidadVenta[],
  modo: AgrupacionRentabilidad,
  amplitudPeriodoDias = 31,
): GrupoRentabilidadVenta[] {
  if (modo === 'sin_agrupar') {
    return filas.map((fila) => ({
      clave: fila.id,
      etiqueta: fila.numeroDocumento,
      cantidadNeta: fila.cantidad,
      ventaNetaBase: fila.ventaNetaBase ?? 0,
      costoVentaBase: fila.costoVentaBase,
      utilidadBrutaBase: fila.utilidadBrutaBase,
      margenBruto: fila.margenBruto,
      cantidadFilas: 1,
      lineasSinCosto: fila.estadoCosto === 'sin_costo_registrado' ? 1 : 0,
      lineasNoInventariables: fila.estadoCosto === 'no_aplica_inventario' ? 1 : 0,
    }));
  }

  const grupos = new Map<string, GrupoRentabilidadVenta>();
  const ventaNetaCubiertaPorClave = new Map<string, number>();
  for (const fila of filas) {
    let clave: string;
    let etiqueta: string;
    switch (modo) {
      case 'producto':
        clave = fila.productoId;
        etiqueta = fila.productoNombre;
        break;
      case 'vendedor':
        clave = fila.vendedor ?? '__sin_vendedor__';
        etiqueta = fila.vendedor ?? 'Sin vendedor';
        break;
      case 'cliente':
        clave = fila.cliente ?? '__sin_cliente__';
        etiqueta = fila.cliente ?? 'Sin cliente';
        break;
      case 'establecimiento':
        clave = fila.establecimiento ?? '__sin_establecimiento__';
        etiqueta = fila.establecimiento ?? 'Sin establecimiento';
        break;
      case 'periodo': {
        const bucket = determinarClavePeriodo(fila.fecha, amplitudPeriodoDias);
        clave = bucket.clave;
        etiqueta = bucket.etiqueta;
        break;
      }
      default:
        clave = fila.id;
        etiqueta = fila.numeroDocumento;
    }
    agregarGrupo(grupos, ventaNetaCubiertaPorClave, clave, etiqueta, fila);
  }

  // Margen agregado del grupo = utilidad total del grupo ÷ VENTA NETA CUBIERTA del grupo (nunca la
  // venta neta total, que diluiría el margen con ingresos sin costo comparable) — nunca un
  // promedio simple de los márgenes individuales de cada fila (§14/§23).
  const resultado = Array.from(grupos.values());
  for (const grupo of resultado) {
    const ventaNetaCubierta = ventaNetaCubiertaPorClave.get(grupo.clave) ?? 0;
    // Ratio 0..1 — misma convención de `FilaRentabilidadVenta.margenBruto` y
    // `IndicadoresRentabilidadVentas.margenBrutoCubierto`; el formato a "%" es responsabilidad de
    // la UI, nunca del servicio.
    grupo.margenBruto = ventaNetaCubierta !== 0 && grupo.utilidadBrutaBase !== null
      ? grupo.utilidadBrutaBase / ventaNetaCubierta
      : null;
  }
  resultado.sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));
  return resultado;
}
