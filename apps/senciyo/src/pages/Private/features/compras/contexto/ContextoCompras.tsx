import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { tryLsKey } from '@/shared/tenant';
import { useUserSession } from '@/contexts/UserSessionContext';
import { getConfiguredPaymentMeans } from '@/shared/payments/paymentMeans';
import type { OrdenCompra } from '../modelos/OrdenCompra';
import type { ComprobanteCompra } from '../modelos/ComprobanteCompra';
import type { CuentaPorPagar } from '../modelos/CuentaPorPagar';
import type { PagoCompra, MedioPagoCompra } from '../modelos/PagoCompra';
import type { Cliente } from '../../gestion-clientes/models/cliente.types';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useCaja } from '../../control-caja/context/CajaContext';
import { siguienteNumeroPago } from '../utilidades/formatearCompras';
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
  aplicarPagoACuentaPorPagar,
  revertirPagoDeCuentaPorPagar,
  anularCuentaPorPagarPorComprobante,
  calcularEstadoVencimiento,
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
  puedeGenerarCCDesdeOC,
  puedeEditarOC,
  puedeEliminarBorradorOC,
  puedeEditarCC,
  puedeEliminarBorradorCC,
  recalcularEstadoPagoComprobante,
  validarTipoCambioRequerido,
  validarCantidadesFacturablesDesdeOC,
  aplicarFacturacionALineasOC,
} from '../logica/reglasCompras';
import { calcularEstadoFacturacion } from '../utilidades/calcularEstadosCompra';
import { eliminarOCDelStorage } from '../repositorios/repositorioOrdenesCompra';
import type { ErrorValidacion } from '../servicios/tiposServiciosCompras';

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------

interface EstadoCompras {
  ordenes: OrdenCompra[];
  comprobantes: ComprobanteCompra[];
  cuentasPorPagar: CuentaPorPagar[];
  pagos: PagoCompra[];
  proveedores: Cliente[];
  cargando: boolean;
  errorCarga: string | null;
}

const estadoInicial: EstadoCompras = {
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
    estadoInventario:
      datos.modalidadInventario === 'ingreso_automatico'
        ? 'automatico'
        : datos.modalidadInventario === 'no_afecta_inventario'
          ? 'no_aplica'
          : 'pendiente',
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
      const lineasActualizadas = aplicarFacturacionALineasOC(ocOrigen.lineas, comprobante.lineas);
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
        estadoInventario: 'pendiente',
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

      const motivoBloqueo = motivoBloqueoAnulacionOC(oc);
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
    [state.ordenes],
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
        estadoInventario: 'pendiente',
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
      if (!puedeEditarOC(oc) || oc.estadoDocumento !== 'borrador') {
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
    [state.ordenes],
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
      if (!puedeEliminarBorradorOC(oc)) {
        throw new Error('Solo se puede eliminar una orden de compra en Borrador.');
      }

      eliminarOCDelStorage(id);
      dispatch({ type: 'ELIMINAR_ORDEN', payload: id });
    },
    [state.ordenes],
  );

  const actualizarOrdenCompra = useCallback(
    async (
      id: string,
      datos: Partial<OrdenCompra>,
      usuarioNombre?: string,
    ): Promise<OrdenCompra> => {
      const existente = state.ordenes.find((o) => o.id === id);
      if (!existente) throw new Error(`Orden de compra ${id} no encontrada.`);
      if (existente.estadoDocumento === 'borrador' || !puedeEditarOC(existente)) {
        throw new Error('Esta orden de compra no se puede editar en su estado actual.');
      }

      const oc: OrdenCompra = {
        ...existente,
        ...datos,
        id: existente.id,
        correlativo: existente.correlativo,
        numero: existente.numero,
        fechaCreacion: existente.fechaCreacion,
      };

      lanzarSiHayErrores(validarOrdenCompraBasica(oc));
      lanzarSiHayErrores(validarTipoCambioRequerido(oc.moneda, monedaBase, oc.tipoCambio));

      const ts = ahora();
      // Editar y volver a registrar: se recalcula estadoAprobacion igual que
      // en el alta (una OC "No Aprobada" vuelve a la cola de aprobación si
      // requiereAprobacion sigue activo; se limpia el ciclo de aprobación
      // anterior porque es una resubmisión nueva).
      const actualizada: OrdenCompra = {
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

      agregarOActualizarOC(actualizada);
      dispatch({ type: 'ACTUALIZAR_ORDEN', payload: actualizada });
      return actualizada;
    },
    [state.ordenes, monedaBase],
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
      const comprobante = armarRegistroCC(datos, id, ts, ts, [], usuarioId);
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
        estadoInventario: 'pendiente',
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
      const cc: ComprobanteCompra = { ...existente, ...datosActualizados, id: existente.id };

      lanzarSiHayErrores(validarComprobanteCompraBasico(cc));
      lanzarSiHayErrores(validarTipoCambioRequerido(cc.moneda, monedaBase, cc.tipoCambio));

      const otrosComprobantes = state.comprobantes.filter((c) => c.id !== id);
      if (validarComprobanteCompraDuplicado(otrosComprobantes, cc)) {
        throw new Error(
          'Ya existe un comprobante de compra registrado para este proveedor con el mismo tipo, serie y número.',
        );
      }

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
    },
    [state.comprobantes, state.cuentasPorPagar],
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
            detalle: `${numeroPago} — Total: ${datos.montoTotalPagado.toFixed(2)} ${datos.moneda}`,
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
          );
          const cxpConVencimiento: CuentaPorPagar = {
            ...cxpRevertida,
            estadoVencimiento: calcularEstadoVencimiento(cxpRevertida.fechaVencimiento),
          };
          agregarOActualizarCxP(cxpConVencimiento);
          dispatch({ type: 'ACTUALIZAR_CXP', payload: cxpConVencimiento });

          // Revertir en CC
          const cc = state.comprobantes.find((c) => c.cuentaPorPagarId === cxpId);
          if (cc) {
            const ccActualizado: ComprobanteCompra = {
              ...cc,
              estadoPago: recalcularEstadoPagoComprobante(cxpConVencimiento.estadoPago),
              pagosRelacionados: (cc.pagosRelacionados ?? []).filter((pid) => pid !== pago.id),
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
