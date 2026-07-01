import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { tryLsKey } from '@/shared/tenant';
import type { OrdenCompra } from '../modelos/OrdenCompra';
import type { ComprobanteCompra } from '../modelos/ComprobanteCompra';
import type { CuentaPorPagar } from '../modelos/CuentaPorPagar';
import type { PagoCompra } from '../modelos/PagoCompra';
import type { Cliente } from '../../gestion-clientes/models/cliente.types';
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
  calcularEstadoVencimiento,
} from '../servicios/servicioCuentaPorPagar';

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

function siguienteNumeroPago(pagos: PagoCompra[]): string {
  const max = pagos
    .map((p) => {
      const parts = p.numeroPago.split('-');
      return parseInt(parts[parts.length - 1], 10);
    })
    .filter((n) => !isNaN(n));
  const siguiente = max.length > 0 ? Math.max(...max) + 1 : 1;
  return `PAG-${String(siguiente).padStart(8, '0')}`;
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
      | 'adjuntos'
      | 'historial'
      | 'fechaCreacion'
      | 'fechaActualizacion'
    >,
    usuarioId?: string,
  ): Promise<{ comprobante: ComprobanteCompra; cuentaPorPagar: CuentaPorPagar | null }>;

  anularComprobanteCompra(id: string, motivo: string, anuladoPor?: string): Promise<void>;

  registrarPagoCompra(
    datos: Omit<PagoCompra, 'id' | 'numeroPago' | 'estadoDocumento' | 'historial' | 'fechaCreacion'>,
    usuarioId?: string,
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
    [state.ordenes],
  );

  const anularOrdenCompra = useCallback(
    async (id: string, motivo: string, anuladoPor?: string): Promise<void> => {
      const oc = state.ordenes.find((o) => o.id === id);
      if (!oc) throw new Error(`Orden de compra ${id} no encontrada.`);

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
        | 'adjuntos'
        | 'historial'
        | 'fechaCreacion'
        | 'fechaActualizacion'
      >,
      usuarioId?: string,
    ): Promise<{ comprobante: ComprobanteCompra; cuentaPorPagar: CuentaPorPagar | null }> => {
      const id = generarId();
      const ts = ahora();

      const esContado = datos.formaPago === 'contado';

      const comprobante: ComprobanteCompra = {
        ...datos,
        id,
        tipoRegistro: 'comprobante_compra',
        estadoDocumento: 'registrado',
        estadoPago: esContado ? 'pagado' : 'pendiente',
        estadoInventario:
          datos.modalidadInventario === 'ingreso_automatico'
            ? 'automatico'
            : datos.modalidadInventario === 'no_afecta_inventario'
              ? 'no_aplica'
              : 'pendiente',
        adjuntos: [],
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

      agregarOActualizarCC(comprobante);
      dispatch({ type: 'AGREGAR_COMPROBANTE', payload: comprobante });

      // Si la OC origen existe, marcar estadoFacturacion
      if (datos.ordenCompraOrigenId) {
        const ocOrigen = state.ordenes.find((o) => o.id === datos.ordenCompraOrigenId);
        if (ocOrigen) {
          const ocActualizada: OrdenCompra = {
            ...ocOrigen,
            estadoFacturacion: 'completa',
            comprobantesCompraRelacionados: [
              ...(ocOrigen.comprobantesCompraRelacionados ?? []),
              comprobante.id,
            ],
            historial: [
              ...ocOrigen.historial,
              {
                fecha: ts,
                accion: 'Comprobante de compra registrado',
                detalle: `${comprobante.serieProveedor}-${comprobante.numeroProveedor}`,
              },
            ],
            fechaActualizacion: ts,
          };
          agregarOActualizarOC(ocActualizada);
          dispatch({ type: 'ACTUALIZAR_ORDEN', payload: ocActualizada });
        }
      }

      // Generar CxP si es a crédito
      let cuentaPorPagar: CuentaPorPagar | null = null;
      if (!esContado) {
        const cxpId = generarId();
        cuentaPorPagar = generarCuentaPorPagar(comprobante, cxpId);

        const ccConCxP: ComprobanteCompra = { ...comprobante, cuentaPorPagarId: cxpId };
        agregarOActualizarCC(ccConCxP);
        dispatch({ type: 'ACTUALIZAR_COMPROBANTE', payload: ccConCxP });

        agregarOActualizarCxP(cuentaPorPagar);
        dispatch({ type: 'AGREGAR_CXP', payload: cuentaPorPagar });
      }

      return { comprobante, cuentaPorPagar };
    },
    [state.ordenes],
  );

  const anularComprobanteCompra = useCallback(
    async (id: string, motivo: string, anuladoPor?: string): Promise<void> => {
      const cc = state.comprobantes.find((c) => c.id === id);
      if (!cc) throw new Error(`Comprobante ${id} no encontrado.`);

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
          const cxpAnulada: CuentaPorPagar = {
            ...cxp,
            estadoPago: 'anulada',
            historial: [
              ...cxp.historial,
              {
                fecha: ts,
                accion: 'CxP anulada por comprobante anulado',
                detalle: motivo,
              },
            ],
            fechaActualizacion: ts,
          };
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

  const registrarPagoCompra = useCallback(
    async (
      datos: Omit<
        PagoCompra,
        'id' | 'numeroPago' | 'estadoDocumento' | 'historial' | 'fechaCreacion'
      >,
      usuarioId?: string,
    ): Promise<PagoCompra> => {
      const id = generarId();
      const ts = ahora();
      const numeroPago = siguienteNumeroPago(state.pagos);

      const pago: PagoCompra = {
        ...datos,
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
            const nuevoPago: ComprobanteCompra['estadoPago'] =
              cxpActualizada.estadoPago === 'pagada'
                ? 'pagado'
                : cxpActualizada.estadoPago === 'parcial'
                  ? 'parcial'
                  : 'pendiente';
            const ccActualizado: ComprobanteCompra = {
              ...cc,
              estadoPago: nuevoPago,
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
    [state.pagos, state.cuentasPorPagar, state.comprobantes],
  );

  const anularPagoCompra = useCallback(
    async (id: string, motivo: string, anuladoPor?: string): Promise<void> => {
      const pago = state.pagos.find((p) => p.id === id);
      if (!pago) throw new Error(`Pago ${id} no encontrado.`);

      const ts = ahora();
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
            const nuevoPago: ComprobanteCompra['estadoPago'] =
              cxpConVencimiento.estadoPago === 'pagada'
                ? 'pagado'
                : cxpConVencimiento.estadoPago === 'parcial'
                  ? 'parcial'
                  : 'pendiente';
            const ccActualizado: ComprobanteCompra = {
              ...cc,
              estadoPago: nuevoPago,
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
    [state.pagos, state.cuentasPorPagar, state.comprobantes],
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
