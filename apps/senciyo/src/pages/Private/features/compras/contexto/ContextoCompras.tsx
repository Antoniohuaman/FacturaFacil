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
  recalcularEstadoPagoComprobante,
  validarTipoCambioRequerido,
  validarCantidadesFacturablesDesdeOC,
  aplicarFacturacionALineasOC,
} from '../logica/reglasCompras';
import { calcularEstadoFacturacion } from '../utilidades/calcularEstadosCompra';
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
}

const estadoInicial: EstadoCompras = {
  ordenes: [],
  comprobantes: [],
  cuentasPorPagar: [],
  pagos: [],
  proveedores: [],
  cargando: false,
};

// ---------------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------------

type AccionCompras =
  | { type: 'ESTABLECER_ORDENES'; payload: OrdenCompra[] }
  | { type: 'AGREGAR_ORDEN'; payload: OrdenCompra }
  | { type: 'ACTUALIZAR_ORDEN'; payload: OrdenCompra }
  | { type: 'ESTABLECER_COMPROBANTES'; payload: ComprobanteCompra[] }
  | { type: 'AGREGAR_COMPROBANTE'; payload: ComprobanteCompra }
  | { type: 'ACTUALIZAR_COMPROBANTE'; payload: ComprobanteCompra }
  | { type: 'ESTABLECER_CUENTAS_POR_PAGAR'; payload: CuentaPorPagar[] }
  | { type: 'AGREGAR_CXP'; payload: CuentaPorPagar }
  | { type: 'ACTUALIZAR_CXP'; payload: CuentaPorPagar }
  | { type: 'ESTABLECER_PAGOS'; payload: PagoCompra[] }
  | { type: 'AGREGAR_PAGO'; payload: PagoCompra }
  | { type: 'ACTUALIZAR_PAGO'; payload: PagoCompra }
  | { type: 'ESTABLECER_PROVEEDORES'; payload: Cliente[] }
  | { type: 'SET_CARGANDO'; payload: boolean };

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
  aprobarOrdenCompra(id: string, aprobadoPor: string): Promise<void>;
  rechazarOrdenCompra(id: string, motivo: string, rechazadoPor: string): Promise<void>;

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

  anularComprobanteCompra(id: string, motivo: string, anuladoPor?: string): Promise<void>;

  registrarPagoCompra(
    datos: Omit<PagoCompra, 'id' | 'numeroPago' | 'estadoDocumento' | 'historial' | 'fechaCreacion'>,
    usuarioId?: string,
    seriePago?: string,
  ): Promise<PagoCompra>;

  anularPagoCompra(id: string, motivo: string, anuladoPor?: string): Promise<void>;

  refrescarProveedores(): void;
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

  useEffect(() => {
    dispatch({ type: 'SET_CARGANDO', payload: true });
    dispatch({ type: 'ESTABLECER_ORDENES', payload: cargarOrdenesCompra() });
    dispatch({ type: 'ESTABLECER_COMPROBANTES', payload: cargarComprobantesCompra() });
    dispatch({ type: 'ESTABLECER_CUENTAS_POR_PAGAR', payload: cargarCuentasPorPagar() });
    dispatch({ type: 'ESTABLECER_PAGOS', payload: cargarPagosCompra() });
    dispatch({ type: 'ESTABLECER_PROVEEDORES', payload: cargarProveedores() });
    dispatch({ type: 'SET_CARGANDO', payload: false });
  }, []);

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
    async (id: string, aprobadoPor: string): Promise<void> => {
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
          { fecha: ts, usuario: aprobadoPor, accion: 'Orden aprobada', detalle: '' },
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
        estadoAprobacion: 'rechazada',
        rechazadoPor,
        fechaRechazo: ts,
        motivoRechazo: motivo,
        historial: [
          ...oc.historial,
          { fecha: ts, usuario: rechazadoPor, accion: 'Orden rechazada', detalle: motivo },
        ],
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
      const comprobante: ComprobanteCompra = {
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
        historial: [
          {
            fecha: ts,
            usuario: usuarioId,
            accion: 'Comprobante registrado',
            detalle: `${datos.serieProveedor}-${datos.numeroProveedor}`,
          },
        ],
        creadoPor: usuarioId,
        fechaCreacion: ts,
        fechaActualizacion: ts,
      };

      const cxpId = generarId();
      const cuentaPorPagar = generarCuentaPorPagar(comprobante, cxpId);
      const comprobanteConCxP: ComprobanteCompra = { ...comprobante, cuentaPorPagarId: cxpId };

      agregarOActualizarCC(comprobanteConCxP);
      dispatch({ type: 'AGREGAR_COMPROBANTE', payload: comprobanteConCxP });

      agregarOActualizarCxP(cuentaPorPagar);
      dispatch({ type: 'AGREGAR_CXP', payload: cuentaPorPagar });

      // Si la OC origen existe: aplicar la cantidad facturada a sus líneas y
      // recalcular su estadoFacturacion real (pendiente/parcial/completa),
      // en vez de fijarlo siempre en 'completa'.
      if (ocOrigen) {
        const lineasActualizadas = aplicarFacturacionALineasOC(ocOrigen.lineas, datos.lineas);
        const ocActualizada: OrdenCompra = {
          ...ocOrigen,
          lineas: lineasActualizadas,
          estadoFacturacion: calcularEstadoFacturacion(lineasActualizadas),
          comprobantesCompraRelacionados: [
            ...(ocOrigen.comprobantesCompraRelacionados ?? []),
            comprobanteConCxP.id,
          ],
          historial: [
            ...ocOrigen.historial,
            {
              fecha: ts,
              accion: 'Comprobante de compra registrado',
              detalle: `${comprobanteConCxP.serieProveedor}-${comprobanteConCxP.numeroProveedor}`,
            },
          ],
          fechaActualizacion: ts,
        };
        agregarOActualizarOC(ocActualizada);
        dispatch({ type: 'ACTUALIZAR_ORDEN', payload: ocActualizada });
      }

      return { comprobante: comprobanteConCxP, cuentaPorPagar };
    },
    [state.ordenes, state.comprobantes, monedaBase],
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
        registrarComprobanteCompra,
        anularComprobanteCompra,
        registrarPagoCompra,
        anularPagoCompra,
        refrescarProveedores,
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
