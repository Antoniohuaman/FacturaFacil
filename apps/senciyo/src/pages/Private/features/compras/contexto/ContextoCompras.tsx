import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { tryLsKey } from '@/shared/tenant';
import { formatMoney } from '@/shared/currency';
import { useUserSession } from '@/contexts/UserSessionContext';
import { getConfiguredPaymentMeans } from '@/shared/payments/paymentMeans';
import type { OrdenCompra } from '../modelos/OrdenCompra';
import type { ComprobanteCompra } from '../modelos/ComprobanteCompra';
import type { CuentaPorPagar } from '../modelos/CuentaPorPagar';
import type { PagoCompra, MedioPagoCompra } from '../modelos/PagoCompra';
import type { RequerimientoCompra } from '../modelos/RequerimientoCompra';
import type { Cliente } from '../../gestion-clientes/models/cliente.types';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useCaja } from '../../control-caja/context/CajaContext';
import { siguienteNumeroPago } from '../utilidades/formatearCompras';
import {
  cargarRequerimientosCompra,
  agregarOActualizarRC,
  eliminarRCDelStorage,
} from '../repositorios/repositorioRequerimientosCompra';
import {
  cargarOrdenesCompra,
  agregarOActualizarOC,
} from '../repositorios/repositorioOrdenesCompra';
import {
  cargarComprobantesCompra,
  agregarOActualizarCC,
  eliminarCCDelStorage,
} from '../repositorios/repositorioComprobantesCompra';
import {
  cargarCuentasPorPagar,
  agregarOActualizarCxP,
} from '../repositorios/repositorioCuentasPorPagar';
import {
  cargarPagosCompra,
  agregarOActualizarPago,
} from '../repositorios/repositorioPagosCompra';
import {
  generarCuentaPorPagar,
  resincronizarCuentaPorPagar,
  aplicarPagoACuentaPorPagar,
  revertirPagoDeCuentaPorPagar,
  anularCuentaPorPagarPorComprobante,
} from '../servicios/servicioCuentaPorPagar';
import { validarOrdenCompraBasica } from '../servicios/servicioOrdenCompra';
import {
  validarComprobanteCompraBasico,
  validarComprobanteCompraDuplicado,
} from '../servicios/servicioComprobanteCompra';
import {
  validarPagoCompraBasico,
  validarPagoNoExcedeSaldo,
  validarMediosPagoCompra,
  tieneMedioDeCaja,
  esMedioDeCaja,
} from '../servicios/servicioPagoCompra';
import {
  motivoBloqueoAnulacionOC,
  motivoBloqueoAnulacionCC,
  motivoBloqueoAnulacionPago,
  motivoBloqueoAnulacionRC,
  puedeGenerarCCDesdeOC,
  puedeEditarOC,
  puedeEliminarBorradorOC,
  puedeEditarRC,
  puedeEliminarBorradorRC,
  puedeEditarCC,
  puedeEditarCamposFinancierosCC,
  puedeEliminarBorradorCC,
  recalcularEstadoPagoComprobante,
  validarTipoCambioRequerido,
  validarCantidadesFacturablesDesdeOC,
  recalcularSeguimientoFacturacionOC,
  calcularEstadoPrincipalOC,
  tieneCCPagosActivos,
  tieneOCPagosActivosRelacionados,
  calcularLineaCompra,
  calcularTotalesLineas,
  calcularMontoRetencion,
  round2,
} from '../logica/reglasCompras';
import type { LineaCompra } from '../modelos/LineaCompra';
import { calcularEstadoFacturacion, calcularEstadoInventarioCC, calcularEstadoInventarioOC } from '../utilidades/calcularEstadosCompra';
import { eliminarOCDelStorage } from '../repositorios/repositorioOrdenesCompra';
import { extraerDatosOCParaCC } from '../mapeadores/mapeadorOCaCC';
import { validarRequerimientoCompraBasico } from '../servicios/servicioRequerimientoCompra';
import type { ErrorValidacion } from '../servicios/tiposServiciosCompras';

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------

interface EstadoCompras {
  requerimientos: RequerimientoCompra[];
  ordenes: OrdenCompra[];
  comprobantes: ComprobanteCompra[];
  cuentasPorPagar: CuentaPorPagar[];
  pagos: PagoCompra[];
  proveedores: Cliente[];
  cargando: boolean;
  errorCarga: string | null;
}

const estadoInicial: EstadoCompras = {
  requerimientos: [],
  ordenes: [],
  comprobantes: [],
  cuentasPorPagar: [],
  pagos: [],
  proveedores: [],
  cargando: false,
  errorCarga: null,
};

// ---------------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------------

type AccionCompras =
  | { type: 'ESTABLECER_REQUERIMIENTOS'; payload: RequerimientoCompra[] }
  | { type: 'AGREGAR_REQUERIMIENTO'; payload: RequerimientoCompra }
  | { type: 'ACTUALIZAR_REQUERIMIENTO'; payload: RequerimientoCompra }
  | { type: 'ELIMINAR_REQUERIMIENTO'; payload: string }
  | { type: 'ESTABLECER_ORDENES'; payload: OrdenCompra[] }
  | { type: 'AGREGAR_ORDEN'; payload: OrdenCompra }
  | { type: 'ACTUALIZAR_ORDEN'; payload: OrdenCompra }
  | { type: 'ELIMINAR_ORDEN'; payload: string }
  | { type: 'ESTABLECER_COMPROBANTES'; payload: ComprobanteCompra[] }
  | { type: 'AGREGAR_COMPROBANTE'; payload: ComprobanteCompra }
  | { type: 'ACTUALIZAR_COMPROBANTE'; payload: ComprobanteCompra }
  | { type: 'ELIMINAR_COMPROBANTE'; payload: string }
  | { type: 'ESTABLECER_CUENTAS_POR_PAGAR'; payload: CuentaPorPagar[] }
  | { type: 'AGREGAR_CXP'; payload: CuentaPorPagar }
  | { type: 'ACTUALIZAR_CXP'; payload: CuentaPorPagar }
  | { type: 'ESTABLECER_PAGOS'; payload: PagoCompra[] }
  | { type: 'AGREGAR_PAGO'; payload: PagoCompra }
  | { type: 'ACTUALIZAR_PAGO'; payload: PagoCompra }
  | { type: 'ESTABLECER_PROVEEDORES'; payload: Cliente[] }
  | { type: 'SET_CARGANDO'; payload: boolean }
  | { type: 'SET_ERROR_CARGA'; payload: string | null };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function reducerCompras(estado: EstadoCompras, accion: AccionCompras): EstadoCompras {
  switch (accion.type) {
    case 'ESTABLECER_REQUERIMIENTOS':
      return { ...estado, requerimientos: accion.payload };
    case 'AGREGAR_REQUERIMIENTO':
      return { ...estado, requerimientos: [accion.payload, ...estado.requerimientos] };
    case 'ACTUALIZAR_REQUERIMIENTO':
      return {
        ...estado,
        requerimientos: estado.requerimientos.map((r) => (r.id === accion.payload.id ? accion.payload : r)),
      };
    case 'ELIMINAR_REQUERIMIENTO':
      return { ...estado, requerimientos: estado.requerimientos.filter((r) => r.id !== accion.payload) };
    case 'ESTABLECER_ORDENES':
      return { ...estado, ordenes: accion.payload };
    case 'AGREGAR_ORDEN':
      return { ...estado, ordenes: [accion.payload, ...estado.ordenes] };
    case 'ACTUALIZAR_ORDEN':
      return {
        ...estado,
        ordenes: estado.ordenes.map((o) => (o.id === accion.payload.id ? accion.payload : o)),
      };
    case 'ELIMINAR_ORDEN':
      return { ...estado, ordenes: estado.ordenes.filter((o) => o.id !== accion.payload) };
    case 'ESTABLECER_COMPROBANTES':
      return { ...estado, comprobantes: accion.payload };
    case 'AGREGAR_COMPROBANTE':
      return { ...estado, comprobantes: [accion.payload, ...estado.comprobantes] };
    case 'ACTUALIZAR_COMPROBANTE':
      return {
        ...estado,
        comprobantes: estado.comprobantes.map((c) =>
          c.id === accion.payload.id ? accion.payload : c,
        ),
      };
    case 'ELIMINAR_COMPROBANTE':
      return { ...estado, comprobantes: estado.comprobantes.filter((c) => c.id !== accion.payload) };
    case 'ESTABLECER_CUENTAS_POR_PAGAR':
      return { ...estado, cuentasPorPagar: accion.payload };
    case 'AGREGAR_CXP':
      return { ...estado, cuentasPorPagar: [accion.payload, ...estado.cuentasPorPagar] };
    case 'ACTUALIZAR_CXP':
      return {
        ...estado,
        cuentasPorPagar: estado.cuentasPorPagar.map((c) =>
          c.id === accion.payload.id ? accion.payload : c,
        ),
      };
    case 'ESTABLECER_PAGOS':
      return { ...estado, pagos: accion.payload };
    case 'AGREGAR_PAGO':
      return { ...estado, pagos: [accion.payload, ...estado.pagos] };
    case 'ACTUALIZAR_PAGO':
      return {
        ...estado,
        pagos: estado.pagos.map((p) => (p.id === accion.payload.id ? accion.payload : p)),
      };
    case 'ESTABLECER_PROVEEDORES':
      return { ...estado, proveedores: accion.payload };
    case 'SET_CARGANDO':
      return { ...estado, cargando: accion.payload };
    case 'SET_ERROR_CARGA':
      return { ...estado, errorCarga: accion.payload };
    default:
      return estado;
  }
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function generarId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function ahora(): string {
  return new Date().toISOString();
}

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

function siguienteCorrelativoRC(requerimientos: RequerimientoCompra[], serie: string): string {
  const existentes = requerimientos
    .filter((r) => r.serie === serie)
    .map((r) => parseInt(r.correlativo, 10))
    .filter((n) => !isNaN(n));
  const max = existentes.length > 0 ? Math.max(...existentes) : 0;
  return String(max + 1).padStart(8, '0');
}

function siguienteCorrelativoOC(ordenes: OrdenCompra[], serie: string): string {
  const existentes = ordenes
    .filter((o) => o.serie === serie)
    .map((o) => parseInt(o.correlativo, 10))
    .filter((n) => !isNaN(n));
  const max = existentes.length > 0 ? Math.max(...existentes) : 0;
  return String(max + 1).padStart(8, '0');
}


function lanzarSiHayErrores(errores: ErrorValidacion[]): void {
  if (errores.length > 0) {
    throw new Error(errores.map((e) => e.mensaje).join(' '));
  }
}

/**
 * Arma el CC ya en estadoDocumento 'registrado' (estadoInventario derivado de
 * la modalidad, historial de registro, fechaRegistro actualizada). Única
 * lógica de "pasar a Registrado" — reutilizada por registrarComprobanteCompra
 * (alta directa) y registrarComprobanteCompraDesdeBorrador (promoción), para
 * no duplicarla.
 */
function armarRegistroCC(
  datos: Omit<
    ComprobanteCompra,
    'id' | 'tipoRegistro' | 'estadoDocumento' | 'estadoPago' | 'estadoInventario' | 'historial' | 'fechaCreacion' | 'fechaActualizacion'
  >,
  id: string,
  ts: string,
  fechaCreacion: string,
  historialPrevio: ComprobanteCompra['historial'],
  usuarioId: string | undefined,
): ComprobanteCompra {
  return {
    ...datos,
    id,
    tipoRegistro: 'comprobante_compra',
    estadoDocumento: 'registrado',
    estadoPago: 'pendiente',
    estadoInventario: calcularEstadoInventarioCC(datos.lineas, datos.modalidadInventario),
    fechaRegistro: ts,
    historial: [
      ...historialPrevio,
      {
        fecha: ts,
        usuario: usuarioId,
        accion: 'Comprobante registrado',
        detalle: `${datos.serieProveedor ?? ''}-${datos.numeroProveedor ?? ''}`,
      },
    ],
    creadoPor: datos.creadoPor ?? usuarioId,
    fechaCreacion,
    fechaActualizacion: ts,
  };
}

/**
 * Genera la CxP del CC ya registrado y, si viene de una OC, aplica la
 * facturación a sus líneas y la enlaza. Única lógica de "generar CxP +
 * enlazar OC" — reutilizada por las dos vías de registro de CC.
 */
function generarCxPYEnlaceCC(
  comprobante: ComprobanteCompra,
  ordenes: OrdenCompra[],
  ts: string,
): { comprobanteConCxP: ComprobanteCompra; cuentaPorPagar: CuentaPorPagar; ocActualizada?: OrdenCompra } {
  const cxpId = generarId();
  const cuentaPorPagar = generarCuentaPorPagar(comprobante, cxpId);
  const comprobanteConCxP: ComprobanteCompra = { ...comprobante, cuentaPorPagarId: cxpId };

  let ocActualizada: OrdenCompra | undefined;
  if (comprobante.ordenCompraOrigenId) {
    const ocOrigen = ordenes.find((o) => o.id === comprobante.ordenCompraOrigenId);
    if (ocOrigen) {
      const lineasActualizadas = recalcularSeguimientoFacturacionOC(ocOrigen.lineas, comprobante.lineas);
      ocActualizada = {
        ...ocOrigen,
        lineas: lineasActualizadas,
        estadoFacturacion: calcularEstadoFacturacion(lineasActualizadas),
        comprobantesCompraRelacionados: [...(ocOrigen.comprobantesCompraRelacionados ?? []), comprobanteConCxP.id],
        historial: [
          ...ocOrigen.historial,
          {
            fecha: ts,
            accion: 'Comprobante de compra registrado',
            detalle: `${comprobanteConCxP.serieProveedor ?? ''}-${comprobanteConCxP.numeroProveedor ?? ''}`,
          },
        ],
        fechaActualizacion: ts,
      };
    }
  }

  return { comprobanteConCxP, cuentaPorPagar, ocActualizada };
}

/**
 * Actualiza una línea del CC con los atributos que realmente hereda de su
 * línea equivalente de la OC (mismo id: toda línea de un CC generado por
 * conversión conserva el id de su línea de OC origen — ver
 * extraerDatosOCParaCC). Se parte de la línea de la OC (producto/costo/
 * unidad/impuesto/descuento/**cantidad**, todos heredados y bloqueados en el
 * formulario del CC — ver SeccionProductosCompra) y se le reimponen encima
 * únicamente los campos operativos exclusivos del CC (almacén de destino,
 * centro de costo/presupuesto propios, datos de activo fijo, observación de
 * línea, y `cantidadIngresadaInventario`, el único contador que de verdad
 * avanza después de creado el CC — vía Nota de Ingreso). Esta etapa no
 * soporta facturación parcial (ver `validarCantidadesFacturablesDesdeOC`):
 * un CC siempre factura la cantidad completa de cada línea, así que
 * `cantidadRecibida`/`cantidadFacturada` del CC siempre son la misma
 * cantidad heredada, nunca un valor propio distinto. subtotal/igv/total se
 * recalculan con `calcularLineaCompra`, la única fuente de cálculo por línea
 * del módulo.
 */
function propagarLineaHeredada(lineaOC: LineaCompra, lineaCC: LineaCompra): LineaCompra {
  const cantidad = lineaOC.cantidadSolicitada;
  const heredada: LineaCompra = {
    ...lineaOC,
    id: lineaCC.id,
    cantidadSolicitada: cantidad,
    cantidadRecibida: cantidad,
    cantidadFacturada: cantidad,
    cantidadIngresadaInventario: lineaCC.cantidadIngresadaInventario,
    cantidadPendienteRecepcion: 0,
    cantidadPendienteFacturacion: 0,
    cantidadPendienteInventario: lineaCC.afectaInventario
      ? Math.max(0, round2(cantidad - lineaCC.cantidadIngresadaInventario))
      : 0,
    afectaInventario: lineaCC.afectaInventario,
    almacenDestinoId: lineaCC.almacenDestinoId,
    almacenDestinoNombre: lineaCC.almacenDestinoNombre,
    centroCosto: lineaCC.centroCosto,
    presupuesto: lineaCC.presupuesto,
    descripcionActivo: lineaCC.descripcionActivo,
    responsableActivo: lineaCC.responsableActivo,
    ubicacionActivo: lineaCC.ubicacionActivo,
    observacion: lineaCC.observacion,
  };
  const { baseImponible, igv, total } = calcularLineaCompra(heredada);
  return { ...heredada, subtotal: baseImponible, igv, total };
}

/**
 * Reescribe en un CC los campos que realmente hereda de su OC (cabecera:
 * proveedor, direcciones, moneda/TC, forma de pago/cronograma/vencimiento,
 * centro de costo/presupuesto; líneas: producto/costo/unidad/impuesto vía
 * `propagarLineaHeredada`) a partir del estado ACTUAL de esa OC — nunca solo
 * la cabecera, dejando líneas/totales desactualizados. Totales y monto de
 * retención (si el CC la tiene aplicada) se recalculan siempre con las
 * utilidades centrales (`calcularTotalesLineas`/`calcularMontoRetencion`),
 * nunca a mano. No toca id/estadoDocumento/historial/fechas/observaciones/
 * adjuntos/tipo/serie/número propios del CC — el llamador decide qué de eso
 * agregar. Única fuente reutilizada tanto para (a) propagar una actualización
 * de una OC ya convertida hacia sus CC registrados, como para (b) reafirmar
 * los datos heredados de un CC justo antes de registrarlo desde un borrador
 * (evita registrar con datos heredados obsoletos si el borrador quedó
 * abierto mientras la OC se editó por otro camino).
 */
function aplicarDatosHeredadosCC(cc: ComprobanteCompra, oc: OrdenCompra): ComprobanteCompra {
  const datosHeredados = extraerDatosOCParaCC(oc);

  const nuevasLineas = cc.lineas.map((lineaCC) => {
    const lineaOC = oc.lineas.find((l) => l.id === lineaCC.id);
    return lineaOC ? propagarLineaHeredada(lineaOC, lineaCC) : lineaCC;
  });
  const totalesRecalculados = calcularTotalesLineas(nuevasLineas);
  const montoRetencion = cc.retencion
    ? calcularMontoRetencion(totalesRecalculados.total, cc.retencion.tasaRetencion)
    : undefined;
  const totalNetoCC = montoRetencion !== undefined
    ? round2(totalesRecalculados.total - montoRetencion)
    : totalesRecalculados.total;

  return {
    ...cc,
    proveedorId: datosHeredados.proveedorId,
    proveedorTipoDocumento: datosHeredados.proveedorTipoDocumento,
    proveedorNumeroDocumento: datosHeredados.proveedorNumeroDocumento,
    proveedorNombre: datosHeredados.proveedorNombre,
    proveedorDireccionFacturacion: datosHeredados.proveedorDireccionFacturacion,
    proveedorDireccionEntrega: datosHeredados.proveedorDireccionEntrega,
    moneda: datosHeredados.moneda,
    tipoCambio: datosHeredados.tipoCambio,
    formaPago: datosHeredados.formaPago,
    formaPagoMetodoId: datosHeredados.formaPagoMetodoId,
    creditTerms: datosHeredados.creditTerms,
    condicionesPago: datosHeredados.condicionesPago,
    // La fecha de vencimiento NO es un campo compartido con la OC: en crédito
    // sigue derivándose del cronograma (ya propagado arriba); en contado es
    // propia del CC y la edición de la OC nunca la sobrescribe.
    fechaVencimiento:
      datosHeredados.formaPago === 'credito' && datosHeredados.creditTerms
        ? datosHeredados.creditTerms.fechaVencimientoGlobal
        : cc.fechaVencimiento,
    centroCosto: datosHeredados.centroCosto,
    presupuesto: datosHeredados.presupuesto,
    lineas: nuevasLineas,
    totales: {
      subtotal: totalesRecalculados.subtotal,
      subtotalExonerado: totalesRecalculados.subtotalExonerado,
      subtotalInafecto: totalesRecalculados.subtotalInafecto,
      descuentoTotal: totalesRecalculados.descuentoTotal,
      igv: totalesRecalculados.igv,
      retencion: montoRetencion,
      total: totalesRecalculados.total,
      moneda: datosHeredados.moneda,
    },
    retencion: cc.retencion && montoRetencion !== undefined
      ? { ...cc.retencion, montoRetencion, netoAPagar: totalNetoCC }
      : cc.retencion,
  };
}

/**
 * Propaga a los Comprobantes de Compra generados por una OC los campos que
 * realmente hereda de ella (`Boolean(cc.ordenCompraOrigenId)`, misma fuente
 * reutilizada por el bloqueo de campos del formulario de CC) cuando esa OC ya
 * convertida se actualiza, vía `aplicarDatosHeredadosCC` (cabecera + líneas +
 * totales, nunca solo cabecera). A través de `resincronizarCuentaPorPagar`,
 * las cuotas/saldo de la CxP también quedan al día. No toca observaciones/
 * adjuntos/tipo/serie/número propios del CC. El llamador
 * (`actualizarOrdenCompra`) ya verificó con `tieneOCPagosActivosRelacionados`
 * que ningún CC relacionado tiene pagos activos antes de invocar esta
 * función; el chequeo por CC con `tieneCCPagosActivos` que sigue aquí es una
 * segunda capa de defensa (nunca el único punto de control) para no
 * desincronizar su trazabilidad si algún día se invoca desde otro lugar.
 *
 * Esta etapa no soporta facturación parcial (una conversión siempre reclama
 * la cantidad completa de todas las líneas de la OC — ver
 * `validarCantidadesFacturablesDesdeOC`), así que en el flujo real nunca
 * coexiste más de un CC "registrado" activo por OC: el primero deja la OC en
 * `estadoFacturacion: 'completa'`, bloqueando una segunda conversión hasta
 * que el primero se anule. Si de todas formas se encontrara más de uno
 * (dato corrupto o una vía de registro futura que no pase por esa
 * validación), no hay una forma segura de repartir la cantidad actualizada
 * entre varios CC sin inventar una distribución — se bloquea la
 * actualización completa en vez de propagar la misma cantidad íntegra a
 * cada uno en silencio.
 */
function propagarActualizacionOCaCC(
  ocActualizada: OrdenCompra,
  comprobantes: ComprobanteCompra[],
  cuentasPorPagar: CuentaPorPagar[],
  pagos: PagoCompra[],
  ts: string,
): { comprobantesActualizados: ComprobanteCompra[]; cuentasPorPagarActualizadas: CuentaPorPagar[] } {
  const comprobantesActualizados: ComprobanteCompra[] = [];
  const cuentasPorPagarActualizadas: CuentaPorPagar[] = [];

  const relacionados = comprobantes.filter(
    (cc) => cc.ordenCompraOrigenId === ocActualizada.id && cc.estadoDocumento === 'registrado',
  );

  if (relacionados.length > 1) {
    throw new Error(
      'No se puede actualizar: esta orden de compra tiene más de un comprobante de compra activo relacionado y no puede reconciliarse una distribución de cantidades entre varios. Anula los comprobantes adicionales o actualiza cada uno manualmente.',
    );
  }

  for (const cc of relacionados) {
    if (tieneCCPagosActivos(cc, cuentasPorPagar, pagos)) continue;

    const ccActualizado: ComprobanteCompra = {
      ...aplicarDatosHeredadosCC(cc, ocActualizada),
      historial: [
        ...cc.historial,
        {
          fecha: ts,
          accion: 'Comprobante de compra actualizado',
          detalle: 'Por actualización de la Orden de Compra origen',
        },
      ],
      fechaActualizacion: ts,
    };
    comprobantesActualizados.push(ccActualizado);

    if (ccActualizado.cuentaPorPagarId) {
      const cxpExistente = cuentasPorPagar.find((c) => c.id === ccActualizado.cuentaPorPagarId);
      if (cxpExistente) {
        cuentasPorPagarActualizadas.push(resincronizarCuentaPorPagar(cxpExistente, ccActualizado, ts));
      }
    }
  }

  return { comprobantesActualizados, cuentasPorPagarActualizadas };
}

function cargarProveedores(): Cliente[] {
  try {
    const key = tryLsKey('dev_clientes') ?? 'dev_clientes';
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const todos = JSON.parse(raw) as Cliente[];
    return todos.filter(
      (c) => c.enabled !== false && (c.type === 'Proveedor' || c.type === 'Cliente-Proveedor'),
    );
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Tipos del contexto
// ---------------------------------------------------------------------------

interface ContextoComprasTipo {
  state: EstadoCompras;

  registrarRequerimientoCompra(
    datos: Omit<
      RequerimientoCompra,
      'id' | 'tipoDocumento' | 'correlativo' | 'numero' | 'estadoDocumento' | 'historial' | 'fechaCreacion' | 'fechaActualizacion'
    > & { serie: string },
    usuarioId?: string,
    usuarioNombre?: string,
  ): Promise<RequerimientoCompra>;

  /** Guarda un Requerimiento nuevo como Borrador: solo exige el mínimo técnico (moneda), no consume correlativo/número definitivo. */
  guardarBorradorRC(
    datos: Omit<
      RequerimientoCompra,
      'id' | 'tipoDocumento' | 'correlativo' | 'numero' | 'estadoDocumento' | 'historial' | 'fechaCreacion' | 'fechaActualizacion'
    > & { serie: string },
    usuarioId?: string,
    usuarioNombre?: string,
  ): Promise<RequerimientoCompra>;

  /** Sobreescribe un Requerimiento que sigue en estadoDocumento==='borrador'. */
  actualizarRequerimientoCompraBorrador(
    id: string,
    datos: Partial<RequerimientoCompra>,
    usuarioNombre?: string,
  ): Promise<RequerimientoCompra>;

  /** Promueve un borrador existente a Pendiente: fusiona los últimos datos editados y asigna correlativo/número real, todo en un solo paso atómico. */
  registrarRequerimientoCompraDesdeBorrador(
    id: string,
    datosActualizados?: Partial<RequerimientoCompra>,
    usuarioNombre?: string,
  ): Promise<RequerimientoCompra>;

  eliminarRequerimientoCompraBorrador(id: string): Promise<void>;

  /** Actualiza un Requerimiento que ya no está en Borrador (Pendiente), en el mismo id, sin tocar serie/correlativo/número. */
  actualizarRequerimientoCompra(
    id: string,
    datos: Partial<RequerimientoCompra>,
    usuarioNombre?: string,
  ): Promise<RequerimientoCompra>;

  anularRequerimientoCompra(id: string, motivo: string, anuladoPor?: string): Promise<void>;

  registrarOrdenCompra(
    datos: Omit<
      OrdenCompra,
      | 'id'
      | 'tipoDocumento'
      | 'correlativo'
      | 'numero'
      | 'estadoDocumento'
      | 'estadoAprobacion'
      | 'estadoRecepcion'
      | 'estadoFacturacion'
      | 'estadoInventario'
      | 'historial'
      | 'fechaCreacion'
      | 'fechaActualizacion'
    > & { serie: string },
    usuarioId?: string,
    usuarioNombre?: string,
  ): Promise<OrdenCompra>;

  anularOrdenCompra(id: string, motivo: string, anuladoPor?: string): Promise<void>;
  aprobarOrdenCompra(id: string, aprobadoPor: string, motivo?: string): Promise<void>;
  rechazarOrdenCompra(id: string, motivo: string, rechazadoPor: string): Promise<void>;

  /**
   * Guarda una OC nueva como Borrador: solo exige los mínimos técnicos
   * (proveedor + moneda), no consume correlativo/número definitivo, no
   * dispara aprobación ni derivados.
   */
  guardarBorradorOC(
    datos: Omit<
      OrdenCompra,
      | 'id'
      | 'tipoDocumento'
      | 'correlativo'
      | 'numero'
      | 'estadoDocumento'
      | 'estadoAprobacion'
      | 'estadoRecepcion'
      | 'estadoFacturacion'
      | 'estadoInventario'
      | 'historial'
      | 'fechaCreacion'
      | 'fechaActualizacion'
    > & { serie: string },
    usuarioId?: string,
    usuarioNombre?: string,
  ): Promise<OrdenCompra>;

  /** Sobreescribe una OC que sigue en estadoDocumento==='borrador'. */
  actualizarOrdenCompraBorrador(
    id: string,
    datos: Partial<OrdenCompra>,
    usuarioNombre?: string,
  ): Promise<OrdenCompra>;

  /** Promueve un borrador existente a Registrada: fusiona los últimos datos editados y asigna correlativo/número real, todo en un solo paso atómico. */
  registrarOrdenCompraDesdeBorrador(
    id: string,
    datosActualizados?: Partial<OrdenCompra>,
    usuarioNombre?: string,
  ): Promise<OrdenCompra>;

  eliminarOrdenCompraBorrador(id: string): Promise<void>;

  /**
   * Actualiza una OC que ya NO está en Borrador (Registrada o No Aprobada),
   * en el mismo id, sin tocar serie/correlativo/número/fecha de registro.
   * Recalcula estadoAprobacion como en el alta (permite "editar y volver a
   * registrar" una No Aprobada, que reingresa a la cola de aprobación).
   */
  actualizarOrdenCompra(
    id: string,
    datos: Partial<OrdenCompra>,
    usuarioNombre?: string,
  ): Promise<OrdenCompra>;

  /**
   * Añade una entrada de auditoría al historial sin tocar ningún campo de
   * estado — por eso funciona desde cualquier estado (incluida Anulada o
   * Convertida), a diferencia de actualizarOrdenCompra que sí exige guardas
   * de transición. Se usa para dejar constancia de "Orden duplicada" en el
   * documento original.
   */
  agregarEventoHistorialOC(
    id: string,
    accion: string,
    detalle?: string,
    usuario?: string,
  ): Promise<void>;

  registrarComprobanteCompra(
    datos: Omit<
      ComprobanteCompra,
      | 'id'
      | 'tipoRegistro'
      | 'estadoDocumento'
      | 'estadoPago'
      | 'estadoInventario'
      | 'historial'
      | 'fechaCreacion'
      | 'fechaActualizacion'
    >,
    usuarioId?: string,
  ): Promise<{ comprobante: ComprobanteCompra; cuentaPorPagar: CuentaPorPagar }>;

  /**
   * Guarda un CC nuevo como Borrador: solo exige los mínimos técnicos
   * (proveedor + moneda), no exige tipo/serie/número del proveedor todavía,
   * no genera CxP ni movimiento de inventario.
   */
  guardarBorradorCC(
    datos: Omit<
      ComprobanteCompra,
      | 'id'
      | 'tipoRegistro'
      | 'estadoDocumento'
      | 'estadoPago'
      | 'estadoInventario'
      | 'historial'
      | 'fechaCreacion'
      | 'fechaActualizacion'
    >,
    usuarioId?: string,
    usuarioNombre?: string,
  ): Promise<ComprobanteCompra>;

  /** Sobreescribe un CC que sigue en estadoDocumento==='borrador'. */
  actualizarComprobanteCompraBorrador(
    id: string,
    datos: Partial<ComprobanteCompra>,
    usuarioNombre?: string,
  ): Promise<ComprobanteCompra>;

  /** Promueve un borrador existente a Registrado: fusiona los últimos datos editados, genera su CxP y enlaza la OC de origen si corresponde, todo en un solo paso atómico. */
  registrarComprobanteCompraDesdeBorrador(
    id: string,
    datosActualizados?: Partial<ComprobanteCompra>,
    usuarioNombre?: string,
  ): Promise<{ comprobante: ComprobanteCompra; cuentaPorPagar: CuentaPorPagar }>;

  eliminarComprobanteCompraBorrador(id: string): Promise<void>;

  /** Actualiza un CC ya Registrado en el mismo documento (nunca genera un segundo CC ni una segunda CxP); bloquea campos financieros si ya tiene pagos o proviene de una OC. */
  actualizarComprobanteCompra(
    id: string,
    datos: Partial<ComprobanteCompra>,
    usuarioNombre?: string,
  ): Promise<{ comprobante: ComprobanteCompra; cuentaPorPagar?: CuentaPorPagar }>;

  /** Añade una entrada de auditoría al historial del CC sin tocar ningún campo de estado (mismo patrón que agregarEventoHistorialOC). */
  agregarEventoHistorialCC(
    id: string,
    accion: string,
    detalle?: string,
    usuario?: string,
  ): Promise<void>;

  anularComprobanteCompra(id: string, motivo: string, anuladoPor?: string): Promise<void>;

  registrarPagoCompra(
    datos: Omit<PagoCompra, 'id' | 'numeroPago' | 'estadoDocumento' | 'historial' | 'fechaCreacion'>,
    usuarioId?: string,
    seriePago?: string,
  ): Promise<PagoCompra>;

  anularPagoCompra(id: string, motivo: string, anuladoPor?: string): Promise<void>;

  refrescarProveedores(): void;

  recargarDatos(): void;
}

// ---------------------------------------------------------------------------
// Contexto
// ---------------------------------------------------------------------------

const ContextoCompras = createContext<ContextoComprasTipo | null>(null);

export function ComprasProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducerCompras, estadoInicial);
  const { state: config } = useConfigurationContext();
  const { status: estadoCaja, agregarMovimiento, activeCajaId } = useCaja();
  const { session } = useUserSession();
  const monedaBase = config.currencies.find((c) => c.isBaseCurrency)?.code ?? 'PEN';

  const recargarDatos = useCallback(() => {
    dispatch({ type: 'SET_CARGANDO', payload: true });
    try {
      dispatch({ type: 'ESTABLECER_REQUERIMIENTOS', payload: cargarRequerimientosCompra() });
      dispatch({ type: 'ESTABLECER_ORDENES', payload: cargarOrdenesCompra() });
      dispatch({ type: 'ESTABLECER_COMPROBANTES', payload: cargarComprobantesCompra() });
      dispatch({ type: 'ESTABLECER_CUENTAS_POR_PAGAR', payload: cargarCuentasPorPagar() });
      dispatch({ type: 'ESTABLECER_PAGOS', payload: cargarPagosCompra() });
      dispatch({ type: 'ESTABLECER_PROVEEDORES', payload: cargarProveedores() });
      dispatch({ type: 'SET_ERROR_CARGA', payload: null });
    } catch (e) {
      dispatch({
        type: 'SET_ERROR_CARGA',
        payload: e instanceof Error ? e.message : 'No se pudo cargar la información de Compras.',
      });
    } finally {
      dispatch({ type: 'SET_CARGANDO', payload: false });
    }
  }, []);

  useEffect(() => {
    recargarDatos();
  }, [recargarDatos]);

  const refrescarProveedores = useCallback(() => {
    dispatch({ type: 'ESTABLECER_PROVEEDORES', payload: cargarProveedores() });
  }, []);

  // -------------------------------------------------------------------------
  // Requerimientos de Compra
  // -------------------------------------------------------------------------

  const registrarRequerimientoCompra = useCallback(
    async (
      datos: Omit<
        RequerimientoCompra,
        'id' | 'tipoDocumento' | 'correlativo' | 'numero' | 'estadoDocumento' | 'historial' | 'fechaCreacion' | 'fechaActualizacion'
      > & { serie: string },
      usuarioId?: string,
      usuarioNombre?: string,
    ): Promise<RequerimientoCompra> => {
      lanzarSiHayErrores(validarRequerimientoCompraBasico(datos));

      const id = generarId();
      const ts = ahora();
      const correlativo = siguienteCorrelativoRC(state.requerimientos, datos.serie);
      const numero = `${datos.serie}-${correlativo}`;

      const rc: RequerimientoCompra = {
        ...datos,
        id,
        tipoDocumento: 'requerimiento_compra',
        correlativo,
        numero,
        estadoDocumento: 'registrado',
        historial: [
          {
            fecha: ts,
            usuario: usuarioNombre,
            accion: 'Requerimiento de compra registrado',
            detalle: `Número: ${numero}`,
          },
        ],
        creadoPor: usuarioId,
        fechaCreacion: ts,
        fechaActualizacion: ts,
      };

      agregarOActualizarRC(rc);
      dispatch({ type: 'AGREGAR_REQUERIMIENTO', payload: rc });
      return rc;
    },
    [state.requerimientos],
  );

  const guardarBorradorRC = useCallback(
    async (
      datos: Omit<
        RequerimientoCompra,
        'id' | 'tipoDocumento' | 'correlativo' | 'numero' | 'estadoDocumento' | 'historial' | 'fechaCreacion' | 'fechaActualizacion'
      > & { serie: string },
      usuarioId?: string,
      usuarioNombre?: string,
    ): Promise<RequerimientoCompra> => {
      if (!datos.moneda) throw new Error('Selecciona una moneda para guardar el borrador.');

      const id = generarId();
      const ts = ahora();

      const rc: RequerimientoCompra = {
        ...datos,
        id,
        tipoDocumento: 'requerimiento_compra',
        correlativo: '',
        numero: '',
        estadoDocumento: 'borrador',
        historial: [{ fecha: ts, usuario: usuarioNombre, accion: 'Borrador guardado', detalle: '' }],
        creadoPor: usuarioId,
        fechaCreacion: ts,
        fechaActualizacion: ts,
      };

      agregarOActualizarRC(rc);
      dispatch({ type: 'AGREGAR_REQUERIMIENTO', payload: rc });
      return rc;
    },
    [],
  );

  const actualizarRequerimientoCompraBorrador = useCallback(
    async (
      id: string,
      datos: Partial<RequerimientoCompra>,
      usuarioNombre?: string,
    ): Promise<RequerimientoCompra> => {
      const rc = state.requerimientos.find((r) => r.id === id);
      if (!rc) throw new Error(`Requerimiento de compra ${id} no encontrado.`);
      if (rc.estadoDocumento !== 'borrador') {
        throw new Error('Solo se puede actualizar un requerimiento de compra que sigue en Borrador.');
      }

      const ts = ahora();
      const actualizado: RequerimientoCompra = {
        ...rc,
        ...datos,
        id: rc.id,
        estadoDocumento: 'borrador',
        historial: [
          ...rc.historial,
          { fecha: ts, usuario: usuarioNombre, accion: 'Borrador actualizado', detalle: '' },
        ],
        fechaActualizacion: ts,
      };

      agregarOActualizarRC(actualizado);
      dispatch({ type: 'ACTUALIZAR_REQUERIMIENTO', payload: actualizado });
      return actualizado;
    },
    [state.requerimientos],
  );

  const registrarRequerimientoCompraDesdeBorrador = useCallback(
    async (
      id: string,
      datosActualizados?: Partial<RequerimientoCompra>,
      usuarioNombre?: string,
    ): Promise<RequerimientoCompra> => {
      const existente = state.requerimientos.find((r) => r.id === id);
      if (!existente) throw new Error(`Requerimiento de compra ${id} no encontrado.`);
      if (existente.estadoDocumento !== 'borrador') {
        throw new Error('Este requerimiento de compra ya fue registrado.');
      }

      const rc: RequerimientoCompra = { ...existente, ...datosActualizados, id: existente.id };
      lanzarSiHayErrores(validarRequerimientoCompraBasico(rc));

      const ts = ahora();
      const correlativo = siguienteCorrelativoRC(state.requerimientos, rc.serie);
      const numero = `${rc.serie}-${correlativo}`;

      const actualizado: RequerimientoCompra = {
        ...rc,
        correlativo,
        numero,
        estadoDocumento: 'registrado',
        historial: [
          ...rc.historial,
          { fecha: ts, usuario: usuarioNombre, accion: 'Requerimiento de compra registrado', detalle: `Número: ${numero}` },
        ],
        fechaActualizacion: ts,
      };

      agregarOActualizarRC(actualizado);
      dispatch({ type: 'ACTUALIZAR_REQUERIMIENTO', payload: actualizado });
      return actualizado;
    },
    [state.requerimientos],
  );

  const eliminarRequerimientoCompraBorrador = useCallback(
    async (id: string): Promise<void> => {
      const rc = state.requerimientos.find((r) => r.id === id);
      if (!rc) throw new Error(`Requerimiento de compra ${id} no encontrado.`);
      if (!puedeEliminarBorradorRC(rc, state.ordenes, state.comprobantes)) {
        throw new Error('Solo se puede eliminar un requerimiento de compra en Borrador.');
      }

      eliminarRCDelStorage(id);
      dispatch({ type: 'ELIMINAR_REQUERIMIENTO', payload: id });
    },
    [state.requerimientos, state.ordenes, state.comprobantes],
  );

  const actualizarRequerimientoCompra = useCallback(
    async (
      id: string,
      datos: Partial<RequerimientoCompra>,
      usuarioNombre?: string,
    ): Promise<RequerimientoCompra> => {
      const existente = state.requerimientos.find((r) => r.id === id);
      if (!existente) throw new Error(`Requerimiento de compra ${id} no encontrado.`);
      if (existente.estadoDocumento === 'borrador' || !puedeEditarRC(existente, state.ordenes, state.comprobantes)) {
        throw new Error('Este requerimiento de compra no se puede editar en su estado actual.');
      }

      const rc: RequerimientoCompra = {
        ...existente,
        ...datos,
        id: existente.id,
        correlativo: existente.correlativo,
        numero: existente.numero,
        fechaCreacion: existente.fechaCreacion,
      };

      lanzarSiHayErrores(validarRequerimientoCompraBasico(rc));

      const ts = ahora();
      const actualizado: RequerimientoCompra = {
        ...rc,
        historial: [
          ...rc.historial,
          { fecha: ts, usuario: usuarioNombre, accion: 'Requerimiento de compra actualizado', detalle: '' },
        ],
        fechaActualizacion: ts,
      };

      agregarOActualizarRC(actualizado);
      dispatch({ type: 'ACTUALIZAR_REQUERIMIENTO', payload: actualizado });
      return actualizado;
    },
    [state.requerimientos, state.ordenes, state.comprobantes],
  );

  const anularRequerimientoCompra = useCallback(
    async (id: string, motivo: string, anuladoPor?: string): Promise<void> => {
      const rc = state.requerimientos.find((r) => r.id === id);
      if (!rc) throw new Error(`Requerimiento de compra ${id} no encontrado.`);

      const motivoBloqueo = motivoBloqueoAnulacionRC(rc, state.ordenes, state.comprobantes);
      if (motivoBloqueo) throw new Error(motivoBloqueo);

      const ts = ahora();
      const actualizado: RequerimientoCompra = {
        ...rc,
        estadoDocumento: 'anulado',
        motivoAnulacion: motivo,
        fechaAnulacion: ts,
        anuladoPor,
        historial: [
          ...rc.historial,
          { fecha: ts, usuario: anuladoPor, accion: 'Requerimiento anulado', detalle: motivo },
        ],
        fechaActualizacion: ts,
      };

      agregarOActualizarRC(actualizado);
      dispatch({ type: 'ACTUALIZAR_REQUERIMIENTO', payload: actualizado });
    },
    [state.requerimientos, state.ordenes, state.comprobantes],
  );

  // -------------------------------------------------------------------------
  // Órdenes de Compra
  // -------------------------------------------------------------------------

  const registrarOrdenCompra = useCallback(
    async (
      datos: Omit<
        OrdenCompra,
        | 'id'
        | 'tipoDocumento'
        | 'correlativo'
        | 'numero'
        | 'estadoDocumento'
        | 'estadoAprobacion'
        | 'estadoRecepcion'
        | 'estadoFacturacion'
        | 'estadoInventario'
        | 'historial'
        | 'fechaCreacion'
        | 'fechaActualizacion'
      > & { serie: string },
      usuarioId?: string,
      usuarioNombre?: string,
    ): Promise<OrdenCompra> => {
      lanzarSiHayErrores(validarOrdenCompraBasica(datos));
      lanzarSiHayErrores(validarTipoCambioRequerido(datos.moneda, monedaBase, datos.tipoCambio));

      const id = generarId();
      const ts = ahora();
      const correlativo = siguienteCorrelativoOC(state.ordenes, datos.serie);
      const numero = `${datos.serie}-${correlativo}`;

      const oc: OrdenCompra = {
        ...datos,
        id,
        tipoDocumento: 'orden_compra',
        correlativo,
        numero,
        estadoDocumento: 'registrado',
        estadoAprobacion: datos.requiereAprobacion ? 'pendiente' : 'no_requiere',
        estadoRecepcion: 'pendiente',
        estadoFacturacion: 'pendiente',
        estadoInventario: calcularEstadoInventarioOC(datos.lineas),
        historial: [
          {
            fecha: ts,
            usuario: usuarioNombre,
            accion: 'Orden de compra registrada',
            detalle: `Número: ${numero}`,
          },
        ],
        creadoPor: usuarioId,
        fechaCreacion: ts,
        fechaActualizacion: ts,
      };

      agregarOActualizarOC(oc);
      dispatch({ type: 'AGREGAR_ORDEN', payload: oc });
      return oc;
    },
    [state.ordenes, monedaBase],
  );

  const anularOrdenCompra = useCallback(
    async (id: string, motivo: string, anuladoPor?: string): Promise<void> => {
      const oc = state.ordenes.find((o) => o.id === id);
      if (!oc) throw new Error(`Orden de compra ${id} no encontrada.`);

      const motivoBloqueo = motivoBloqueoAnulacionOC(oc, state.comprobantes);
      if (motivoBloqueo) throw new Error(motivoBloqueo);

      const ts = ahora();
      const actualizada: OrdenCompra = {
        ...oc,
        estadoDocumento: 'anulado',
        motivoAnulacion: motivo,
        fechaAnulacion: ts,
        anuladoPor,
        historial: [
          ...oc.historial,
          { fecha: ts, usuario: anuladoPor, accion: 'Orden anulada', detalle: motivo },
        ],
        fechaActualizacion: ts,
      };

      agregarOActualizarOC(actualizada);
      dispatch({ type: 'ACTUALIZAR_ORDEN', payload: actualizada });
    },
    [state.ordenes, state.comprobantes],
  );

  const aprobarOrdenCompra = useCallback(
    async (id: string, aprobadoPor: string, motivo?: string): Promise<void> => {
      const oc = state.ordenes.find((o) => o.id === id);
      if (!oc) throw new Error(`Orden de compra ${id} no encontrada.`);

      const ts = ahora();
      const actualizada: OrdenCompra = {
        ...oc,
        estadoAprobacion: 'aprobada',
        aprobadoPor,
        fechaAprobacion: ts,
        historial: [
          ...oc.historial,
          { fecha: ts, usuario: aprobadoPor, accion: 'Orden aprobada', detalle: motivo || '' },
        ],
        fechaActualizacion: ts,
      };

      agregarOActualizarOC(actualizada);
      dispatch({ type: 'ACTUALIZAR_ORDEN', payload: actualizada });
    },
    [state.ordenes],
  );

  const rechazarOrdenCompra = useCallback(
    async (id: string, motivo: string, rechazadoPor: string): Promise<void> => {
      const oc = state.ordenes.find((o) => o.id === id);
      if (!oc) throw new Error(`Orden de compra ${id} no encontrada.`);

      const ts = ahora();
      const actualizada: OrdenCompra = {
        ...oc,
        estadoAprobacion: 'no_aprobada',
        rechazadoPor,
        fechaRechazo: ts,
        motivoRechazo: motivo,
        historial: [
          ...oc.historial,
          { fecha: ts, usuario: rechazadoPor, accion: 'Orden no aprobada', detalle: motivo },
        ],
        fechaActualizacion: ts,
      };

      agregarOActualizarOC(actualizada);
      dispatch({ type: 'ACTUALIZAR_ORDEN', payload: actualizada });
    },
    [state.ordenes],
  );

  const guardarBorradorOC = useCallback(
    async (
      datos: Omit<
        OrdenCompra,
        | 'id'
        | 'tipoDocumento'
        | 'correlativo'
        | 'numero'
        | 'estadoDocumento'
        | 'estadoAprobacion'
        | 'estadoRecepcion'
        | 'estadoFacturacion'
        | 'estadoInventario'
        | 'historial'
        | 'fechaCreacion'
        | 'fechaActualizacion'
      > & { serie: string },
      usuarioId?: string,
      usuarioNombre?: string,
    ): Promise<OrdenCompra> => {
      if (!datos.proveedorId) throw new Error('Selecciona un proveedor para guardar el borrador.');
      if (!datos.moneda) throw new Error('Selecciona una moneda para guardar el borrador.');

      const id = generarId();
      const ts = ahora();

      const oc: OrdenCompra = {
        ...datos,
        id,
        tipoDocumento: 'orden_compra',
        correlativo: '',
        numero: '',
        estadoDocumento: 'borrador',
        estadoAprobacion: datos.requiereAprobacion ? 'pendiente' : 'no_requiere',
        estadoRecepcion: 'pendiente',
        estadoFacturacion: 'pendiente',
        estadoInventario: calcularEstadoInventarioOC(datos.lineas),
        historial: [
          { fecha: ts, usuario: usuarioNombre, accion: 'Borrador guardado', detalle: '' },
        ],
        creadoPor: usuarioId,
        fechaCreacion: ts,
        fechaActualizacion: ts,
      };

      agregarOActualizarOC(oc);
      dispatch({ type: 'AGREGAR_ORDEN', payload: oc });
      return oc;
    },
    [],
  );

  const actualizarOrdenCompraBorrador = useCallback(
    async (
      id: string,
      datos: Partial<OrdenCompra>,
      usuarioNombre?: string,
    ): Promise<OrdenCompra> => {
      const oc = state.ordenes.find((o) => o.id === id);
      if (!oc) throw new Error(`Orden de compra ${id} no encontrada.`);
      if (!puedeEditarOC(oc, state.comprobantes) || oc.estadoDocumento !== 'borrador') {
        throw new Error('Solo se puede actualizar una orden de compra que sigue en Borrador.');
      }

      const ts = ahora();
      const actualizada: OrdenCompra = {
        ...oc,
        ...datos,
        id: oc.id,
        estadoDocumento: 'borrador',
        historial: [
          ...oc.historial,
          { fecha: ts, usuario: usuarioNombre, accion: 'Borrador actualizado', detalle: '' },
        ],
        fechaActualizacion: ts,
      };

      agregarOActualizarOC(actualizada);
      dispatch({ type: 'ACTUALIZAR_ORDEN', payload: actualizada });
      return actualizada;
    },
    [state.ordenes, state.comprobantes],
  );

  const registrarOrdenCompraDesdeBorrador = useCallback(
    async (
      id: string,
      datosActualizados?: Partial<OrdenCompra>,
      usuarioNombre?: string,
    ): Promise<OrdenCompra> => {
      const existente = state.ordenes.find((o) => o.id === id);
      if (!existente) throw new Error(`Orden de compra ${id} no encontrada.`);
      if (existente.estadoDocumento !== 'borrador') {
        throw new Error('Esta orden de compra ya fue registrada.');
      }

      // Se fusiona en un solo paso (sin encadenar con actualizarOrdenCompraBorrador)
      // para no depender de que el state ya refleje una actualización previa.
      const oc: OrdenCompra = { ...existente, ...datosActualizados, id: existente.id };

      lanzarSiHayErrores(validarOrdenCompraBasica(oc));
      lanzarSiHayErrores(validarTipoCambioRequerido(oc.moneda, monedaBase, oc.tipoCambio));

      const ts = ahora();
      const correlativo = siguienteCorrelativoOC(state.ordenes, oc.serie);
      const numero = `${oc.serie}-${correlativo}`;

      const actualizada: OrdenCompra = {
        ...oc,
        correlativo,
        numero,
        estadoDocumento: 'registrado',
        historial: [
          ...oc.historial,
          { fecha: ts, usuario: usuarioNombre, accion: 'Orden de compra registrada', detalle: `Número: ${numero}` },
        ],
        fechaActualizacion: ts,
      };

      agregarOActualizarOC(actualizada);
      dispatch({ type: 'ACTUALIZAR_ORDEN', payload: actualizada });
      return actualizada;
    },
    [state.ordenes, monedaBase],
  );

  const eliminarOrdenCompraBorrador = useCallback(
    async (id: string): Promise<void> => {
      const oc = state.ordenes.find((o) => o.id === id);
      if (!oc) throw new Error(`Orden de compra ${id} no encontrada.`);
      if (!puedeEliminarBorradorOC(oc, state.comprobantes)) {
        throw new Error('Solo se puede eliminar una orden de compra en Borrador.');
      }

      eliminarOCDelStorage(id);
      dispatch({ type: 'ELIMINAR_ORDEN', payload: id });
    },
    [state.ordenes, state.comprobantes],
  );

  const actualizarOrdenCompra = useCallback(
    async (
      id: string,
      datos: Partial<OrdenCompra>,
      usuarioNombre?: string,
    ): Promise<OrdenCompra> => {
      const existente = state.ordenes.find((o) => o.id === id);
      if (!existente) throw new Error(`Orden de compra ${id} no encontrada.`);
      if (existente.estadoDocumento === 'borrador' || !puedeEditarOC(existente, state.comprobantes)) {
        throw new Error('Esta orden de compra no se puede editar en su estado actual.');
      }

      const yaConvertida = calcularEstadoPrincipalOC(existente, state.comprobantes) === 'Convertida';
      // Regla central: mientras cualquier CC relacionado tenga pagos activos
      // (cruzando OC → CC → CxP → Pagos, no un estado derivado), la OC
      // convertida no puede modificar ningún dato heredable. La validación
      // ocurre ANTES de construir/escribir nada — ni la OC ni sus documentos
      // relacionados quedan tocados parcialmente.
      if (yaConvertida && tieneOCPagosActivosRelacionados(existente, state.comprobantes, state.cuentasPorPagar, state.pagos)) {
        throw new Error(
          'No se puede actualizar esta orden de compra: el comprobante de compra relacionado ya tiene pagos aplicados. Anula los pagos relacionados antes de editarla.',
        );
      }

      const oc: OrdenCompra = {
        ...existente,
        ...datos,
        id: existente.id,
        correlativo: existente.correlativo,
        numero: existente.numero,
        fechaCreacion: existente.fechaCreacion,
        comprobantesCompraRelacionados: existente.comprobantesCompraRelacionados,
      };

      lanzarSiHayErrores(validarOrdenCompraBasica(oc));
      lanzarSiHayErrores(validarTipoCambioRequerido(oc.moneda, monedaBase, oc.tipoCambio));

      const ts = ahora();
      // Editar y volver a registrar: se recalcula estadoAprobacion igual que
      // en el alta (una OC "No Aprobada" vuelve a la cola de aprobación si
      // requiereAprobacion sigue activo; se limpia el ciclo de aprobación
      // anterior porque es una resubmisión nueva). Una OC ya Convertida NO
      // vuelve a pasar por este reinicio: esa dimensión ya quedó resuelta al
      // generarse el comprobante, y reiniciarla dejaría estadoAprobacion en
      // 'pendiente' sobre un documento ya cerrado (puedeAprobarOC/
      // puedeRechazarOC no distinguen el estado principal, solo
      // estadoAprobacion, así que expondrían Aprobar/Rechazar indebidamente).
      const actualizada: OrdenCompra = yaConvertida
        ? {
            ...oc,
            historial: [
              ...oc.historial,
              { fecha: ts, usuario: usuarioNombre, accion: 'Orden de compra actualizada', detalle: '' },
            ],
            fechaActualizacion: ts,
          }
        : {
            ...oc,
            estadoAprobacion: oc.requiereAprobacion ? 'pendiente' : 'no_requiere',
            aprobadoPor: undefined,
            fechaAprobacion: undefined,
            rechazadoPor: undefined,
            fechaRechazo: undefined,
            motivoRechazo: undefined,
            historial: [
              ...oc.historial,
              { fecha: ts, usuario: usuarioNombre, accion: 'Orden de compra actualizada', detalle: '' },
            ],
            fechaActualizacion: ts,
          };

      // Se calcula todo (puro, puede lanzar) antes de escribir nada: si algo
      // falla aquí, ni la OC ni sus CC/CxP relacionados quedan persistidos a
      // medias.
      const { comprobantesActualizados, cuentasPorPagarActualizadas } = yaConvertida
        ? propagarActualizacionOCaCC(actualizada, state.comprobantes, state.cuentasPorPagar, state.pagos, ts)
        : { comprobantesActualizados: [], cuentasPorPagarActualizadas: [] };

      // El seguimiento interno de facturación de la OC (cantidadFacturada/
      // cantidadPendienteFacturacion por línea, y estadoFacturacion) se
      // deriva siempre desde cero a partir de los CC que quedan realmente
      // activos tras esta actualización — nunca se conserva el snapshot
      // anterior. Si la OC no está convertida, `comprobantesActualizados`
      // viene vacío y el resultado es el mismo "sin facturar" que ya tenía.
      const lineasConSeguimiento = recalcularSeguimientoFacturacionOC(
        actualizada.lineas,
        comprobantesActualizados.flatMap((cc) => cc.lineas),
      );
      const actualizadaFinal: OrdenCompra = {
        ...actualizada,
        lineas: lineasConSeguimiento,
        estadoFacturacion: calcularEstadoFacturacion(lineasConSeguimiento),
      };

      agregarOActualizarOC(actualizadaFinal);
      dispatch({ type: 'ACTUALIZAR_ORDEN', payload: actualizadaFinal });
      comprobantesActualizados.forEach((cc) => {
        agregarOActualizarCC(cc);
        dispatch({ type: 'ACTUALIZAR_COMPROBANTE', payload: cc });
      });
      cuentasPorPagarActualizadas.forEach((cxp) => {
        agregarOActualizarCxP(cxp);
        dispatch({ type: 'ACTUALIZAR_CXP', payload: cxp });
      });

      return actualizadaFinal;
    },
    [state.ordenes, state.comprobantes, state.cuentasPorPagar, state.pagos, monedaBase],
  );

  const agregarEventoHistorialOC = useCallback(
    async (id: string, accion: string, detalle?: string, usuario?: string): Promise<void> => {
      const existente = state.ordenes.find((o) => o.id === id);
      if (!existente) throw new Error(`Orden de compra ${id} no encontrada.`);

      const ts = ahora();
      const actualizada: OrdenCompra = {
        ...existente,
        historial: [...existente.historial, { fecha: ts, usuario, accion, detalle: detalle ?? '' }],
        fechaActualizacion: ts,
      };

      agregarOActualizarOC(actualizada);
      dispatch({ type: 'ACTUALIZAR_ORDEN', payload: actualizada });
    },
    [state.ordenes],
  );

  // -------------------------------------------------------------------------
  // Comprobantes de Compra
  // -------------------------------------------------------------------------

  const registrarComprobanteCompra = useCallback(
    async (
      datos: Omit<
        ComprobanteCompra,
        | 'id'
        | 'tipoRegistro'
        | 'estadoDocumento'
        | 'estadoPago'
        | 'estadoInventario'
        | 'historial'
        | 'fechaCreacion'
        | 'fechaActualizacion'
      >,
      usuarioId?: string,
    ): Promise<{ comprobante: ComprobanteCompra; cuentaPorPagar: CuentaPorPagar }> => {
      lanzarSiHayErrores(validarComprobanteCompraBasico(datos));
      lanzarSiHayErrores(validarTipoCambioRequerido(datos.moneda, monedaBase, datos.tipoCambio));

      if (validarComprobanteCompraDuplicado(state.comprobantes, datos)) {
        throw new Error(
          'Ya existe un comprobante de compra registrado para este proveedor con el mismo tipo, serie y número.',
        );
      }

      // Si el CC proviene de una OC, esta debe estar aprobada, no debe estar
      // ya facturada por completo, y las cantidades facturadas no pueden
      // superar lo pendiente por línea. Se valida antes de crear nada: si
      // bloquea, no se crea ni el CC ni la CxP, y la OC queda intacta.
      let ocOrigen: OrdenCompra | undefined;
      if (datos.ordenCompraOrigenId) {
        ocOrigen = state.ordenes.find((o) => o.id === datos.ordenCompraOrigenId);
        if (!ocOrigen) {
          throw new Error('La orden de compra de origen no fue encontrada.');
        }
        if (!puedeGenerarCCDesdeOC(ocOrigen)) {
          throw new Error(
            'No se puede registrar el comprobante porque la orden de compra aún no está aprobada.',
          );
        }
        if (ocOrigen.estadoFacturacion === 'completa') {
          throw new Error(
            'La orden de compra ya fue facturada por completo; no se puede generar un nuevo comprobante desde ella.',
          );
        }
        lanzarSiHayErrores(validarCantidadesFacturablesDesdeOC(ocOrigen.lineas, datos.lineas));
      }

      const id = generarId();
      const ts = ahora();

      // Todo comprobante registrado genera Cuenta por Pagar, sea contado o
      // crédito: contado NO implica pagado automáticamente. El usuario
      // registra el pago manualmente desde Cuentas por Pagar; ni el pago ni
      // el movimiento de caja se generan aquí.
      let comprobante = armarRegistroCC(datos, id, ts, ts, [], usuarioId);
      if (ocOrigen) {
        // Reafirma los datos heredados desde el estado ACTUAL de la OC justo
        // antes de persistir (defensa adicional que no confía solo en que el
        // formulario haya bloqueado esos campos en la UI).
        comprobante = aplicarDatosHeredadosCC(comprobante, ocOrigen);
      }
      const { comprobanteConCxP, cuentaPorPagar, ocActualizada } = generarCxPYEnlaceCC(
        comprobante,
        state.ordenes,
        ts,
      );

      agregarOActualizarCC(comprobanteConCxP);
      dispatch({ type: 'AGREGAR_COMPROBANTE', payload: comprobanteConCxP });

      agregarOActualizarCxP(cuentaPorPagar);
      dispatch({ type: 'AGREGAR_CXP', payload: cuentaPorPagar });

      if (ocActualizada) {
        agregarOActualizarOC(ocActualizada);
        dispatch({ type: 'ACTUALIZAR_ORDEN', payload: ocActualizada });
      }

      return { comprobante: comprobanteConCxP, cuentaPorPagar };
    },
    [state.ordenes, state.comprobantes, monedaBase],
  );

  const guardarBorradorCC = useCallback(
    async (
      datos: Omit<
        ComprobanteCompra,
        | 'id'
        | 'tipoRegistro'
        | 'estadoDocumento'
        | 'estadoPago'
        | 'estadoInventario'
        | 'historial'
        | 'fechaCreacion'
        | 'fechaActualizacion'
      >,
      usuarioId?: string,
      usuarioNombre?: string,
    ): Promise<ComprobanteCompra> => {
      if (!datos.proveedorId) throw new Error('Selecciona un proveedor para guardar el borrador.');
      if (!datos.moneda) throw new Error('Selecciona una moneda para guardar el borrador.');

      const id = generarId();
      const ts = ahora();

      const cc: ComprobanteCompra = {
        ...datos,
        id,
        tipoRegistro: 'comprobante_compra',
        estadoDocumento: 'borrador',
        estadoPago: 'pendiente',
        estadoInventario: calcularEstadoInventarioCC(datos.lineas, datos.modalidadInventario),
        fechaRegistro: ts,
        historial: [{ fecha: ts, usuario: usuarioNombre, accion: 'Borrador guardado', detalle: '' }],
        creadoPor: usuarioId,
        fechaCreacion: ts,
        fechaActualizacion: ts,
      };

      agregarOActualizarCC(cc);
      dispatch({ type: 'AGREGAR_COMPROBANTE', payload: cc });
      return cc;
    },
    [],
  );

  const actualizarComprobanteCompraBorrador = useCallback(
    async (
      id: string,
      datos: Partial<ComprobanteCompra>,
      usuarioNombre?: string,
    ): Promise<ComprobanteCompra> => {
      const cc = state.comprobantes.find((c) => c.id === id);
      if (!cc) throw new Error(`Comprobante de compra ${id} no encontrado.`);
      if (!puedeEditarCC(cc) || cc.estadoDocumento !== 'borrador') {
        throw new Error('Solo se puede actualizar un comprobante de compra que sigue en Borrador.');
      }

      const ts = ahora();
      const actualizado: ComprobanteCompra = {
        ...cc,
        ...datos,
        id: cc.id,
        estadoDocumento: 'borrador',
        historial: [
          ...cc.historial,
          { fecha: ts, usuario: usuarioNombre, accion: 'Borrador actualizado', detalle: '' },
        ],
        fechaActualizacion: ts,
      };

      agregarOActualizarCC(actualizado);
      dispatch({ type: 'ACTUALIZAR_COMPROBANTE', payload: actualizado });
      return actualizado;
    },
    [state.comprobantes],
  );

  const registrarComprobanteCompraDesdeBorrador = useCallback(
    async (
      id: string,
      datosActualizados?: Partial<ComprobanteCompra>,
      usuarioNombre?: string,
    ): Promise<{ comprobante: ComprobanteCompra; cuentaPorPagar: CuentaPorPagar }> => {
      const existente = state.comprobantes.find((c) => c.id === id);
      if (!existente) throw new Error(`Comprobante de compra ${id} no encontrado.`);
      if (existente.estadoDocumento !== 'borrador') {
        throw new Error('Este comprobante de compra ya fue registrado.');
      }

      // Se fusiona en un solo paso (sin encadenar con actualizarComprobanteCompraBorrador)
      // para no depender de que el state ya refleje una actualización previa.
      let cc: ComprobanteCompra = { ...existente, ...datosActualizados, id: existente.id };

      let ocOrigen: OrdenCompra | undefined;
      if (cc.ordenCompraOrigenId) {
        ocOrigen = state.ordenes.find((o) => o.id === cc.ordenCompraOrigenId);
        if (!ocOrigen) {
          throw new Error('La orden de compra de origen no fue encontrada.');
        }
        if (!puedeGenerarCCDesdeOC(ocOrigen)) {
          throw new Error('No se puede registrar el comprobante porque la orden de compra aún no está aprobada.');
        }
        if (ocOrigen.estadoFacturacion === 'completa') {
          throw new Error(
            'La orden de compra ya fue facturada por completo; no se puede generar un nuevo comprobante desde ella.',
          );
        }
        lanzarSiHayErrores(validarCantidadesFacturablesDesdeOC(ocOrigen.lineas, cc.lineas));
        // Reafirma los datos heredados desde el estado ACTUAL de la OC antes
        // de registrar: si el borrador quedó abierto mientras la OC se editó
        // por otro camino (p. ej. "Editar Orden de Compra"), nunca se
        // registra con datos heredados obsoletos.
        cc = aplicarDatosHeredadosCC(cc, ocOrigen);
      }

      lanzarSiHayErrores(validarComprobanteCompraBasico(cc));
      lanzarSiHayErrores(validarTipoCambioRequerido(cc.moneda, monedaBase, cc.tipoCambio));

      const otrosComprobantes = state.comprobantes.filter((c) => c.id !== id);
      if (validarComprobanteCompraDuplicado(otrosComprobantes, cc)) {
        throw new Error(
          'Ya existe un comprobante de compra registrado para este proveedor con el mismo tipo, serie y número.',
        );
      }

      const ts = ahora();
      const comprobante = armarRegistroCC(cc, existente.id, ts, existente.fechaCreacion, existente.historial, usuarioNombre);
      const { comprobanteConCxP, cuentaPorPagar, ocActualizada } = generarCxPYEnlaceCC(
        comprobante,
        state.ordenes,
        ts,
      );

      agregarOActualizarCC(comprobanteConCxP);
      dispatch({ type: 'ACTUALIZAR_COMPROBANTE', payload: comprobanteConCxP });

      agregarOActualizarCxP(cuentaPorPagar);
      dispatch({ type: 'AGREGAR_CXP', payload: cuentaPorPagar });

      if (ocActualizada) {
        agregarOActualizarOC(ocActualizada);
        dispatch({ type: 'ACTUALIZAR_ORDEN', payload: ocActualizada });
      }

      return { comprobante: comprobanteConCxP, cuentaPorPagar };
    },
    [state.ordenes, state.comprobantes, monedaBase],
  );

  /**
   * Actualiza un CC ya REGISTRADO en el mismo documento (mismo id, misma
   * fecha de registro, misma CxP) — nunca genera un segundo CC ni una
   * segunda CxP. Si el CC ya tiene pagos aplicados o proviene de una OC
   * (`puedeEditarCamposFinancierosCC` en falso), es una defensa de servicio
   * que ignora cualquier campo financiero recibido y solo aplica
   * observaciones/adjuntos, sin confiar únicamente en que el formulario los
   * haya deshabilitado.
   */
  const actualizarComprobanteCompra = useCallback(
    async (
      id: string,
      datos: Partial<ComprobanteCompra>,
      usuarioNombre?: string,
    ): Promise<{ comprobante: ComprobanteCompra; cuentaPorPagar?: CuentaPorPagar }> => {
      const existente = state.comprobantes.find((c) => c.id === id);
      if (!existente) throw new Error(`Comprobante de compra ${id} no encontrado.`);
      if (existente.estadoDocumento !== 'registrado') {
        throw new Error('Este comprobante de compra no se puede editar en su estado actual.');
      }

      const puedeFinancieros = puedeEditarCamposFinancierosCC(existente);
      const datosPermitidos: Partial<ComprobanteCompra> = puedeFinancieros
        ? datos
        : { observaciones: datos.observaciones, adjuntos: datos.adjuntos };

      const cc: ComprobanteCompra = {
        ...existente,
        ...datosPermitidos,
        id: existente.id,
        estadoDocumento: 'registrado',
        estadoPago: existente.estadoPago,
        estadoInventario: puedeFinancieros
          ? calcularEstadoInventarioCC(
              datosPermitidos.lineas ?? existente.lineas,
              datosPermitidos.modalidadInventario ?? existente.modalidadInventario,
            )
          : existente.estadoInventario,
        fechaRegistro: existente.fechaRegistro,
        cuentaPorPagarId: existente.cuentaPorPagarId,
        pagosRelacionados: existente.pagosRelacionados,
        notasIngresoRelacionadas: existente.notasIngresoRelacionadas,
        ordenCompraOrigenId: existente.ordenCompraOrigenId,
        fechaCreacion: existente.fechaCreacion,
      };

      lanzarSiHayErrores(validarComprobanteCompraBasico(cc));
      lanzarSiHayErrores(validarTipoCambioRequerido(cc.moneda, monedaBase, cc.tipoCambio));

      const otrosComprobantes = state.comprobantes.filter((c) => c.id !== id);
      if (validarComprobanteCompraDuplicado(otrosComprobantes, cc)) {
        throw new Error(
          'Ya existe un comprobante de compra registrado para este proveedor con el mismo tipo, serie y número.',
        );
      }

      const ts = ahora();
      const actualizado: ComprobanteCompra = {
        ...cc,
        historial: [
          ...existente.historial,
          { fecha: ts, usuario: usuarioNombre, accion: 'Comprobante de compra actualizado', detalle: '' },
        ],
        fechaActualizacion: ts,
      };

      agregarOActualizarCC(actualizado);
      dispatch({ type: 'ACTUALIZAR_COMPROBANTE', payload: actualizado });

      let cuentaPorPagar: CuentaPorPagar | undefined;
      if (puedeFinancieros && existente.cuentaPorPagarId) {
        const cxpExistente = state.cuentasPorPagar.find((c) => c.id === existente.cuentaPorPagarId);
        if (cxpExistente) {
          cuentaPorPagar = resincronizarCuentaPorPagar(cxpExistente, actualizado, ts);
          agregarOActualizarCxP(cuentaPorPagar);
          dispatch({ type: 'ACTUALIZAR_CXP', payload: cuentaPorPagar });
        }
      }

      return { comprobante: actualizado, cuentaPorPagar };
    },
    [state.comprobantes, state.cuentasPorPagar, monedaBase],
  );

  const eliminarComprobanteCompraBorrador = useCallback(
    async (id: string): Promise<void> => {
      const cc = state.comprobantes.find((c) => c.id === id);
      if (!cc) throw new Error(`Comprobante de compra ${id} no encontrado.`);
      if (!puedeEliminarBorradorCC(cc)) {
        throw new Error('Solo se puede eliminar un comprobante de compra en Borrador.');
      }

      eliminarCCDelStorage(id);
      dispatch({ type: 'ELIMINAR_COMPROBANTE', payload: id });
    },
    [state.comprobantes],
  );

  const agregarEventoHistorialCC = useCallback(
    async (id: string, accion: string, detalle?: string, usuario?: string): Promise<void> => {
      const existente = state.comprobantes.find((c) => c.id === id);
      if (!existente) throw new Error(`Comprobante de compra ${id} no encontrado.`);

      const ts = ahora();
      const actualizado: ComprobanteCompra = {
        ...existente,
        historial: [...existente.historial, { fecha: ts, usuario, accion, detalle: detalle ?? '' }],
        fechaActualizacion: ts,
      };

      agregarOActualizarCC(actualizado);
      dispatch({ type: 'ACTUALIZAR_COMPROBANTE', payload: actualizado });
    },
    [state.comprobantes],
  );

  const anularComprobanteCompra = useCallback(
    async (id: string, motivo: string, anuladoPor?: string): Promise<void> => {
      const cc = state.comprobantes.find((c) => c.id === id);
      if (!cc) throw new Error(`Comprobante ${id} no encontrado.`);

      const motivoBloqueo = motivoBloqueoAnulacionCC(cc);
      if (motivoBloqueo) throw new Error(motivoBloqueo);

      const ts = ahora();
      const actualizado: ComprobanteCompra = {
        ...cc,
        estadoDocumento: 'anulado',
        motivoAnulacion: motivo,
        fechaAnulacion: ts,
        anuladoPor,
        historial: [
          ...cc.historial,
          { fecha: ts, usuario: anuladoPor, accion: 'Comprobante anulado', detalle: motivo },
        ],
        fechaActualizacion: ts,
      };

      agregarOActualizarCC(actualizado);
      dispatch({ type: 'ACTUALIZAR_COMPROBANTE', payload: actualizado });

      // Anular CxP asociada
      if (cc.cuentaPorPagarId) {
        const cxp = state.cuentasPorPagar.find((c) => c.id === cc.cuentaPorPagarId);
        if (cxp) {
          const cxpAnulada = anularCuentaPorPagarPorComprobante(cxp, motivo, ts);
          agregarOActualizarCxP(cxpAnulada);
          dispatch({ type: 'ACTUALIZAR_CXP', payload: cxpAnulada });
        }
      }

      // Recalcula el seguimiento interno de facturación de la OC origen (si
      // la hay) desde los CC que sigan realmente activos tras esta anulación
      // — nunca se toca comprobantesCompraRelacionados (se preserva íntegro
      // para trazabilidad histórica; calcularEstadoPrincipalOC ya ignora los
      // CC anulados de ese array por su cuenta). Con la regla vigente (máximo
      // un CC activo por OC) lo normal es que no quede ninguno, y la OC
      // vuelva íntegramente a cantidadFacturada 0 / estadoFacturacion acorde.
      if (cc.ordenCompraOrigenId) {
        const ocOrigen = state.ordenes.find((o) => o.id === cc.ordenCompraOrigenId);
        if (ocOrigen) {
          const otrosActivos = state.comprobantes.filter(
            (c) => c.ordenCompraOrigenId === ocOrigen.id && c.estadoDocumento === 'registrado' && c.id !== cc.id,
          );
          const lineasRevertidas = recalcularSeguimientoFacturacionOC(
            ocOrigen.lineas,
            otrosActivos.flatMap((c) => c.lineas),
          );
          const ocActualizada: OrdenCompra = {
            ...ocOrigen,
            lineas: lineasRevertidas,
            estadoFacturacion: calcularEstadoFacturacion(lineasRevertidas),
            historial: [
              ...ocOrigen.historial,
              {
                fecha: ts,
                usuario: anuladoPor,
                accion: 'Comprobante de compra relacionado anulado',
                detalle: `${cc.serieProveedor ?? ''}-${cc.numeroProveedor ?? ''}`,
              },
            ],
            fechaActualizacion: ts,
          };
          agregarOActualizarOC(ocActualizada);
          dispatch({ type: 'ACTUALIZAR_ORDEN', payload: ocActualizada });
        }
      }
    },
    [state.comprobantes, state.cuentasPorPagar, state.ordenes],
  );

  // -------------------------------------------------------------------------
  // Pagos
  // -------------------------------------------------------------------------

  /**
   * Registra en Caja el efecto de un pago de compra (Egreso al pagar,
   * Ingreso compensatorio al anular) para cada medio de pago que impacte
   * caja según la configuración de medios de pago. Si la caja está cerrada,
   * no se genera movimiento (mismo comportamiento que el resto del sistema,
   * ver anularCobranza en gestion-cobranzas).
   */
  const registrarMovimientosCajaPorMedios = useCallback(
    async (
      medios: MedioPagoCompra[],
      tipo: 'Ingreso' | 'Egreso',
      concepto: string,
      referencia: string,
    ): Promise<void> => {
      if (estadoCaja !== 'abierta') return;

      for (const medio of medios) {
        if (medio.monto <= 0) continue;
        if (!esMedioDeCaja(medio.medioPagoCodigo)) continue;

        await agregarMovimiento({
          tipo,
          concepto,
          medioPago: 'Efectivo',
          paymentMeanCode: medio.medioPagoCodigo,
          paymentMeanLabel: medio.medioPagoNombre,
          monto: medio.monto,
          referencia,
          usuarioId: session?.userId ?? '',
          usuarioNombre: session?.userName ?? '',
        });
      }
    },
    [estadoCaja, agregarMovimiento, session],
  );

  const registrarPagoCompra = useCallback(
    async (
      datos: Omit<
        PagoCompra,
        'id' | 'numeroPago' | 'estadoDocumento' | 'historial' | 'fechaCreacion'
      >,
      usuarioId?: string,
      seriePago?: string,
    ): Promise<PagoCompra> => {
      const mediosDisponibles = getConfiguredPaymentMeans();
      lanzarSiHayErrores(validarPagoCompraBasico(datos));
      lanzarSiHayErrores(validarMediosPagoCompra(datos.mediosPago, mediosDisponibles));
      lanzarSiHayErrores(validarTipoCambioRequerido(datos.moneda, monedaBase, datos.tipoCambio));

      // Defensa de servicio: el formulario ya bloquea pago > saldo en UI, pero
      // el contexto no debe confiar solo en eso (ni capar el saldo a 0 en silencio).
      const cxpsAplicadas = datos.cuentasPorPagarAplicadas
        .map((cxpId) => state.cuentasPorPagar.find((c) => c.id === cxpId))
        .filter((cxp): cxp is CuentaPorPagar => Boolean(cxp));
      lanzarSiHayErrores(validarPagoNoExcedeSaldo(datos.montoTotalPagado, cxpsAplicadas));

      if (tieneMedioDeCaja(datos.mediosPago) && estadoCaja !== 'abierta') {
        throw new Error('Abre una caja para registrar el pago en efectivo.');
      }
      if (!seriePago) {
        throw new Error(
          'No hay una serie de pago (PG) configurada. Ve a Configuración → Series y crea una serie activa de tipo "Pago de Compra".',
        );
      }

      const id = generarId();
      const ts = ahora();
      const numeroPago = siguienteNumeroPago(state.pagos, seriePago);

      // El movimiento de caja se intenta antes de comprometer el pago/CxP:
      // si falla, no queda un pago "fantasma" sin su contraparte en caja.
      await registrarMovimientosCajaPorMedios(
        datos.mediosPago,
        'Egreso',
        datos.concepto || `Pago a ${datos.proveedorNombre}`,
        numeroPago,
      );

      // Deja trazabilidad de qué caja quedó afectada por este pago, para el
      // detalle (Caja o cuenta utilizada). Solo aplica si hay un medio de caja.
      const mediosConCaja = datos.mediosPago.map((medio) =>
        esMedioDeCaja(medio.medioPagoCodigo) && activeCajaId ? { ...medio, cajaId: activeCajaId } : medio,
      );

      const pago: PagoCompra = {
        ...datos,
        mediosPago: mediosConCaja,
        cajaId: tieneMedioDeCaja(datos.mediosPago) ? (activeCajaId ?? undefined) : undefined,
        id,
        numeroPago,
        estadoDocumento: 'registrado',
        historial: [
          {
            fecha: ts,
            usuario: usuarioId,
            accion: 'Pago registrado',
            detalle: `${numeroPago} — Total: ${formatMoney(datos.montoTotalPagado, datos.moneda)}`,
          },
        ],
        creadoPor: usuarioId,
        fechaCreacion: ts,
      };

      agregarOActualizarPago(pago);
      dispatch({ type: 'AGREGAR_PAGO', payload: pago });

      // Aplicar a cada CxP
      for (const cxpId of datos.cuentasPorPagarAplicadas) {
        const cxp = state.cuentasPorPagar.find((c) => c.id === cxpId);
        if (cxp) {
          const cxpActualizada = aplicarPagoACuentaPorPagar(
            cxp,
            datos.montoTotalPagado,
            pago.id,
            hoy(),
            usuarioId,
            datos.asignacionesCuotas,
          );
          agregarOActualizarCxP(cxpActualizada);
          dispatch({ type: 'ACTUALIZAR_CXP', payload: cxpActualizada });

          // Actualizar estadoPago del CC asociado
          const cc = state.comprobantes.find((c) => c.cuentaPorPagarId === cxpId);
          if (cc) {
            const ccActualizado: ComprobanteCompra = {
              ...cc,
              estadoPago: recalcularEstadoPagoComprobante(cxpActualizada.estadoPago),
              pagosRelacionados: [...(cc.pagosRelacionados ?? []), pago.id],
              historial: [
                ...cc.historial,
                { fecha: ts, accion: 'Pago aplicado', detalle: `Pago ${numeroPago}` },
              ],
              fechaActualizacion: ts,
            };
            agregarOActualizarCC(ccActualizado);
            dispatch({ type: 'ACTUALIZAR_COMPROBANTE', payload: ccActualizado });
          }
        }
      }

      return pago;
    },
    [
      state.pagos,
      state.cuentasPorPagar,
      state.comprobantes,
      monedaBase,
      estadoCaja,
      activeCajaId,
      registrarMovimientosCajaPorMedios,
    ],
  );

  const anularPagoCompra = useCallback(
    async (id: string, motivo: string, anuladoPor?: string): Promise<void> => {
      const pago = state.pagos.find((p) => p.id === id);
      if (!pago) throw new Error(`Pago ${id} no encontrado.`);

      const motivoBloqueo = motivoBloqueoAnulacionPago(pago);
      if (motivoBloqueo) throw new Error(motivoBloqueo);

      // Si el pago impactó caja, la anulación exige poder registrar el
      // ingreso compensatorio ahora. Si la caja está cerrada, no se omite en
      // silencio: se bloquea la anulación completa (no se toca el pago ni la
      // CxP) para no dejar la caja descuadrada.
      if (tieneMedioDeCaja(pago.mediosPago) && estadoCaja !== 'abierta') {
        throw new Error(
          'No se puede anular el pago porque la caja relacionada está cerrada y no se puede registrar la compensación.',
        );
      }

      const ts = ahora();

      // El reverso en caja se intenta antes de comprometer la anulación:
      // si falla, el pago sigue vigente en vez de quedar anulado sin su
      // contraparte de caja revertida.
      await registrarMovimientosCajaPorMedios(
        pago.mediosPago,
        'Ingreso',
        `Reversión por anulación de pago ${pago.numeroPago}`,
        pago.numeroPago,
      );

      const pagoAnulado: PagoCompra = {
        ...pago,
        estadoDocumento: 'anulado',
        motivoAnulacion: motivo,
        fechaAnulacion: ts,
        anuladoPor,
        historial: [
          ...pago.historial,
          { fecha: ts, usuario: anuladoPor, accion: 'Pago anulado', detalle: motivo },
        ],
      };

      agregarOActualizarPago(pagoAnulado);
      dispatch({ type: 'ACTUALIZAR_PAGO', payload: pagoAnulado });

      // Revertir en CxP
      for (const cxpId of pago.cuentasPorPagarAplicadas) {
        const cxp = state.cuentasPorPagar.find((c) => c.id === cxpId);
        if (cxp) {
          const cxpRevertida = revertirPagoDeCuentaPorPagar(
            cxp,
            pago.montoTotalPagado,
            pago.id,
            ts,
            anuladoPor,
            pago.asignacionesCuotas,
          );
          agregarOActualizarCxP(cxpRevertida);
          dispatch({ type: 'ACTUALIZAR_CXP', payload: cxpRevertida });

          // Revertir en CC
          const cc = state.comprobantes.find((c) => c.cuentaPorPagarId === cxpId);
          if (cc) {
            const ccActualizado: ComprobanteCompra = {
              ...cc,
              estadoPago: recalcularEstadoPagoComprobante(cxpRevertida.estadoPago),
              // El pago anulado se conserva en pagosRelacionados: sigue siendo
              // parte del historial/documentos relacionados del CC, solo deja
              // de ser un pago activo (lo determina p.estadoDocumento, no su
              // presencia en este arreglo).
              historial: [
                ...cc.historial,
                { fecha: ts, accion: 'Pago anulado y revertido', detalle: pago.numeroPago },
              ],
              fechaActualizacion: ts,
            };
            agregarOActualizarCC(ccActualizado);
            dispatch({ type: 'ACTUALIZAR_COMPROBANTE', payload: ccActualizado });
          }
        }
      }
    },
    [
      state.pagos,
      state.cuentasPorPagar,
      state.comprobantes,
      estadoCaja,
      registrarMovimientosCajaPorMedios,
    ],
  );

  return (
    <ContextoCompras.Provider
      value={{
        state,
        registrarRequerimientoCompra,
        guardarBorradorRC,
        actualizarRequerimientoCompraBorrador,
        registrarRequerimientoCompraDesdeBorrador,
        eliminarRequerimientoCompraBorrador,
        actualizarRequerimientoCompra,
        anularRequerimientoCompra,
        registrarOrdenCompra,
        anularOrdenCompra,
        aprobarOrdenCompra,
        rechazarOrdenCompra,
        guardarBorradorOC,
        actualizarOrdenCompraBorrador,
        registrarOrdenCompraDesdeBorrador,
        eliminarOrdenCompraBorrador,
        actualizarOrdenCompra,
        agregarEventoHistorialOC,
        registrarComprobanteCompra,
        guardarBorradorCC,
        actualizarComprobanteCompraBorrador,
        registrarComprobanteCompraDesdeBorrador,
        eliminarComprobanteCompraBorrador,
        actualizarComprobanteCompra,
        agregarEventoHistorialCC,
        anularComprobanteCompra,
        registrarPagoCompra,
        anularPagoCompra,
        refrescarProveedores,
        recargarDatos,
      }}
    >
      {children}
    </ContextoCompras.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCompras(): ContextoComprasTipo {
  const ctx = useContext(ContextoCompras);
  if (!ctx) throw new Error('useCompras debe usarse dentro de ComprasProvider');
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useComprasOpcional(): ContextoComprasTipo | null {
  return useContext(ContextoCompras);
}
