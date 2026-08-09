// guias-remision/logica/inventarioGRE.ts
//
// Adaptador GRE → motor central de Inventario (GRE-P1-008). Ninguna lógica de stock vive aquí:
// este archivo solo traduce una `GuiaRemision` al contrato genérico que ya consumen Nota de
// Salida/Factura-Boleta (`DatosOperacionSalidaCuantitativa`/`DatosAnulacionDocumentoInventario`,
// `gestion-inventario/models/`) y delega toda la ejecución real —reserva idempotente, FIFO,
// consumo de capas, reversos— a `ServicioKardexValorizado`. No implementa FIFO, no calcula costo,
// no escribe `localStorage` directamente y no crea ningún mecanismo de idempotencia propio: la
// única garantía de "una sola vez" es `claveIdempotenciaGRE`, la misma clave estable que ya usa el
// motor central vía `reservarOperacionIdempotente` (empresaId, clave).
//
// Ningún archivo existente era responsable de "cómo habla GRE con Kardex" (a diferencia de
// `notaSalida.service.ts`, que cumple ese rol para NS) — de ahí la necesidad de este archivo nuevo,
// con una única responsabilidad: adaptar, nunca ejecutar.

import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { Product } from '../../catalogo-articulos/models/types';
import type { MovimientoStock, MovimientoMotivo } from '../../gestion-inventario/models/inventory.types';
import type {
  DatosOperacionSalidaCuantitativa,
  DatosLineaOperacionCuantitativa,
} from '../../gestion-inventario/models/operacionEntradaInventario.types';
import type { DatosAnulacionDocumentoInventario } from '../../gestion-inventario/models/operacionReversoInventario.types';
import type { EstadoActivacionValorizacion } from '../../gestion-inventario/models/estadoActivacionValorizacion.types';
import { resolverModoOperacion } from '../../gestion-inventario/utils/estadoActivacionValorizacionInventario';
import { parsearColeccion } from '../../gestion-inventario/utils/operacionCuantitativaInventarioComun';
import { redondearAPrecision, PRECISION_CANTIDAD_UNIDAD_MINIMA } from '../../gestion-inventario/utils/precisionInventario';
import { esProductoInventariable } from '@/shared/inventory/clasificacionInventario';
import { allocateSaleAcrossalmacenes } from '@/shared/inventory/stockGateway';
import type { StockDescuentoDocumento } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import type { GuiaRemision } from '../modelos/GuiaRemision';

/**
 * Decide si emitir esta GRE debe disparar la salida automática de stock — GRE-P1-008. Regla pura,
 * sin React: el switch maestro de Inventario manda sobre cualquier regla de documento (mismo
 * criterio que `resolverModoInventario`), y solo la regla `'automatico'` dispara el motor central;
 * `'nota_salida'` (y cualquier otro valor) nunca descuenta desde GRE — el despacho físico queda en
 * el flujo normal de Nota de Salida, fuera de este módulo.
 */
export function debeDescontarStockAutomaticamenteGRE(
  controlStockActivo: boolean | undefined,
  stockDescuentoGuiaRemision: StockDescuentoDocumento | undefined,
): boolean {
  return Boolean(controlStockActivo) && stockDescuentoGuiaRemision === 'automatico';
}

/** Clave de idempotencia ÚNICA para la salida automática de una GRE — estable mientras `guia.id` lo sea (siempre, no cambia entre borrador y emitida). Reutilizada tanto para emitir como para localizar movimientos al anular. */
export function claveIdempotenciaGRE(guiaId: string): string {
  return `guia_remision:${guiaId}`;
}

/**
 * Traduce el motivo de traslado SUNAT (catálogo `MOTIVOS_TRASLADO`) al `MovimientoMotivo` del
 * Kardex — reutiliza EXCLUSIVAMENTE valores ya existentes del enum (nunca agrega uno nuevo), mismo
 * criterio defensivo que `TIPO_SALIDA_A_MOTIVO` en `notaSalida.service.ts`: un motivo sin mapeo
 * explícito cae en `'OTRO'`, nunca se asume una categoría.
 */
const MOTIVO_TRASLADO_A_MOTIVO_KARDEX: Readonly<Record<string, MovimientoMotivo>> = {
  '01': 'VENTA', // Venta
  '03': 'VENTA', // Venta con entrega a terceros
  '04': 'TRANSFERENCIA_ALMACEN', // Traslado entre establecimientos de la misma empresa
  '06': 'DEVOLUCION_CLIENTE', // Devolución
  '14': 'VENTA', // Venta sujeta a confirmación del comprador
  '18': 'VENTA', // Traslado emisor itinerante CP
};

export function motivoTrasladoAMotivoKardex(motivoTraslado: string): MovimientoMotivo {
  return MOTIVO_TRASLADO_A_MOTIVO_KARDEX[motivoTraslado] ?? 'OTRO';
}

/** Un bien de GRE es inventariable cuando referencia un producto real del catálogo Y ese producto está controlado por stock (misma fuente central que Ventas/NI/NS/Transferencias — nunca una clasificación propia de GRE). */
export function esBienGREInventariable(
  bien: GuiaRemision['bienes'][number],
  productsMap: ReadonlyMap<string, Product>,
): boolean {
  if (bien.productoId === undefined || bien.productoId === null) return false;
  const producto = productsMap.get(String(bien.productoId));
  return Boolean(producto) && esProductoInventariable(producto as Product);
}

export interface ResultadoLineasSalidaGRE {
  lineas: DatosLineaOperacionCuantitativa[];
  /** Bienes de la GRE que no generan movimiento (sin producto de catálogo, o producto no controlado por stock) — informativo, nunca un error. */
  bienesOmitidosNoInventariables: number;
}

/**
 * Cálculo puro de las líneas de salida de una GRE: filtra bienes inventariables (fuente central,
 * nunca una regla propia) y distribuye cada cantidad FIFO entre los almacenes activos del
 * establecimiento (`resolvealmacenesForSaleFIFO`/`allocateSaleAcrossalmacenes`, las mismas
 * funciones que ya usan Factura/Boleta y Nota de Salida — nunca "el primer almacén" ni un id
 * fijo). Fail-closed (mismo criterio que Factura/Boleta y NS): si el disponible no cubre
 * exactamente la cantidad de un bien inventariable, se rechaza la operación completa, nunca una
 * asignación parcial silenciosa.
 */
export function construirLineasSalidaGRE(
  guia: GuiaRemision,
  productsMap: ReadonlyMap<string, Product>,
  almacenesOrdenados: Almacen[],
): ResultadoLineasSalidaGRE {
  const lineas: DatosLineaOperacionCuantitativa[] = [];
  let bienesOmitidosNoInventariables = 0;

  for (const bien of guia.bienes) {
    if (!esBienGREInventariable(bien, productsMap)) {
      bienesOmitidosNoInventariables += 1;
      continue;
    }
    const producto = productsMap.get(String(bien.productoId)) as Product;
    const cantidadRequerida = redondearAPrecision(bien.cantidad, PRECISION_CANTIDAD_UNIDAD_MINIMA);

    const allocations = allocateSaleAcrossalmacenes({
      product: producto,
      almacenesOrdered: almacenesOrdenados,
      qtyUnidadMinima: cantidadRequerida,
      respectReservations: true,
    });

    const totalAsignado = allocations.reduce((suma, alloc) => suma + alloc.qtyUnidadMinima, 0);
    if (totalAsignado !== cantidadRequerida) {
      throw new Error(
        `No hay stock disponible suficiente para trasladar "${bien.descripcion}" (se necesitan ${cantidadRequerida}, disponible ${totalAsignado} en los almacenes activos del establecimiento).`,
      );
    }

    allocations.forEach((alloc) => {
      if (alloc.qtyUnidadMinima <= 0) return;
      lineas.push({
        lineaId: `${bien.id}-${alloc.almacenId}`,
        lineaComercialId: bien.id,
        productoId: String(bien.productoId),
        almacenId: alloc.almacenId,
        cantidadUnidadMinima: alloc.qtyUnidadMinima,
      });
    });
  }

  return { lineas, bienesOmitidosNoInventariables };
}

export interface ParametrosConstruirDatosOperacionSalidaGRE {
  guia: GuiaRemision;
  lineas: DatosLineaOperacionCuantitativa[];
  empresaId: string;
  usuario: string;
  fecha: string;
  estadoValorizacion: EstadoActivacionValorizacion;
}

/**
 * Construye el contrato genérico de salida para el motor central — mismo criterio que
 * `construirDatosOperacionSalidaNS`: `modoOperacion` se deriva de `estadoValorizacion` (nunca se
 * fuerza desde la UI), y toda ejecución real (reserva idempotente, FIFO, consumo de capas) ocurre
 * dentro de `ServicioKardexValorizado.registrarSalidaValorizada`, nunca aquí.
 */
export function construirDatosOperacionSalidaGRE(
  params: ParametrosConstruirDatosOperacionSalidaGRE,
): DatosOperacionSalidaCuantitativa {
  const { guia, lineas, empresaId, usuario, fecha, estadoValorizacion } = params;
  const esValorizado = resolverModoOperacion(estadoValorizacion) === 'valorizado_exclusivo';
  const numero = guia.serie && guia.correlativo ? `${guia.serie}-${guia.correlativo}` : guia.id;

  return {
    modoOperacion: esValorizado ? 'valorizado' : 'cuantitativo',
    empresaId,
    documentoId: guia.id,
    tipoDocumento: 'guia_remision',
    tipoOperacion: 'guia_remision_salida',
    claveIdempotencia: claveIdempotenciaGRE(guia.id),
    usuario,
    fecha,
    motivo: motivoTrasladoAMotivoKardex(guia.motivoTraslado),
    observaciones: `Guía de Remisión ${numero}`,
    documentoReferencia: numero,
    lineas,
  };
}

function esMovimientoAlmacenable(valor: unknown): valor is MovimientoStock {
  return typeof valor === 'object' && valor !== null && typeof (valor as { id?: unknown }).id === 'string';
}

export interface ResultadoPrepararAnulacionGRE {
  /** `null` cuando la GRE legítimamente no generó movimiento (inventario inactivo, modalidad "Mediante Nota de Salida", o solo bienes no inventariables) — no hay nada que revertir. */
  datosAnulacion: DatosAnulacionDocumentoInventario | null;
}

/**
 * Localiza los movimientos ORIGINALES confirmados de una GRE (única fuente de verdad — nunca se
 * recalcula desde `guia.bienes` actuales, que pudieron cambiar desde que se emitió) y arma el
 * contrato de `ServicioKardexValorizado.anularDocumentoValorizado`. Función PURA: no toca
 * `localStorage` ni invoca al motor — eso le corresponde al llamador, que solo debe marcar la GRE
 * 'Anulada' DESPUÉS de que Inventario confirme o repita (mismo patrón que `prepararAnulacionNS`).
 */
export function prepararAnulacionGRE(
  guia: GuiaRemision,
  empresaId: string,
  movimientosRaw: string | null,
  motivo: string,
  usuario: string,
  fecha: string,
): ResultadoPrepararAnulacionGRE {
  const claveOriginal = claveIdempotenciaGRE(guia.id);
  const movimientosCrudos = parsearColeccion(movimientosRaw, 'la colección de movimientos');
  const movimientos: MovimientoStock[] = [];
  movimientosCrudos.forEach((elemento, indice) => {
    if (!esMovimientoAlmacenable(elemento)) {
      throw new Error(`inventarioGRE: el elemento en el índice ${indice} de la colección de movimientos no tiene la forma esperada.`);
    }
    movimientos.push(elemento);
  });

  const movimientosDeLaGRE = movimientos.filter(
    (m) => m.documentoOrigenId === guia.id && m.tipoDocumentoOrigen === 'guia_remision' && m.claveIdempotencia === claveOriginal,
  );

  if (movimientosDeLaGRE.length === 0) {
    return { datosAnulacion: null };
  }

  const numero = guia.serie && guia.correlativo ? `${guia.serie}-${guia.correlativo}` : guia.id;

  return {
    datosAnulacion: {
      empresaId,
      tipoOperacion: 'anulacion',
      documentoId: guia.id,
      tipoDocumentoOrigen: 'guia_remision',
      movimientoIds: movimientosDeLaGRE.map((m) => m.id),
      claveIdempotencia: `ANULACION-guia_remision-${guia.id}`,
      usuario,
      fecha,
      motivoUsuario: motivo,
      documentoReferencia: numero,
    },
  };
}
