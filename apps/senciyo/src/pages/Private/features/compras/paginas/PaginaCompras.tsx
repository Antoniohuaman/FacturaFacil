import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, FileText, ClipboardList, Receipt, CreditCard, Wallet } from 'lucide-react';
import { useCompras } from '../contexto/ContextoCompras';
import { useUserSession } from '@/contexts/UserSessionContext';
import { useTenant } from '@/shared/tenant/TenantContext';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useFeedback } from '@/shared/feedback';
import { resolverNombreFormaPago, calcularEstadoPrincipalOC } from '../logica/reglasCompras';
import { formatearNumeroCompra, formatearNumeroComprobanteCompra } from '../utilidades/formatearCompras';
import {
  imprimirOrdenCompra,
  compartirOrdenCompraPorWhatsApp,
  prepararDuplicadoOC,
  type EmpresaOC,
} from '../servicios/servicioOrdenCompra';
import { imprimirComprobanteCompra, prepararDuplicadoCC } from '../servicios/servicioComprobanteCompra';
import { imprimirPagoCompra } from '../servicios/servicioPagoCompra';
import { extraerDatosRCParaOC } from '../mapeadores/mapeadorRCaOC';
import { extraerDatosRCParaCC } from '../mapeadores/mapeadorRCaCC';
import TablaRequerimientosCompra from '../componentes/listados/TablaRequerimientosCompra';
import TablaOrdenesCompra from '../componentes/listados/TablaOrdenesCompra';
import TablaComprobantesCompra from '../componentes/listados/TablaComprobantesCompra';
import TablaCuentasPorPagar from '../componentes/listados/TablaCuentasPorPagar';
import TablaPagosCompra from '../componentes/listados/TablaPagosCompra';
import FormularioRequerimientoCompra from '../componentes/formularios/FormularioRequerimientoCompra';
import FormularioOrdenCompra from '../componentes/formularios/FormularioOrdenCompra';
import FormularioComprobanteCompra from '../componentes/formularios/FormularioComprobanteCompra';
import PanelDetalleRequerimientoCompra from '../componentes/detalle/PanelDetalleRequerimientoCompra';
import PanelDetalleOrdenCompra from '../componentes/detalle/PanelDetalleOrdenCompra';
import PanelDetalleComprobanteCompra from '../componentes/detalle/PanelDetalleComprobanteCompra';
import PanelDetalleCuentaPorPagar from '../componentes/detalle/PanelDetalleCuentaPorPagar';
import PanelDetallePagoCompra from '../componentes/detalle/PanelDetallePagoCompra';
import ModalAprobarRechazarOC from '../componentes/modales/ModalAprobarRechazarOC';
import ModalAnularCompra from '../componentes/modales/ModalAnularCompra';
import type { RequerimientoCompra } from '../modelos/RequerimientoCompra';
import type { OrdenCompra } from '../modelos/OrdenCompra';
import type { ComprobanteCompra } from '../modelos/ComprobanteCompra';
import type { PagoCompra } from '../modelos/PagoCompra';
import {
  MOTIVOS_ANULACION_RC,
  MOTIVOS_ANULACION_OC,
  MOTIVOS_ANULACION_CC,
  MOTIVOS_ANULACION_PAGO,
} from '../constantes/motivosAnulacionCompras';
import { CLAVES_COMPRAS } from '../constantes/clavesAlmacenamientoCompras';

type TabActivo = 'requerimientos' | 'ordenes' | 'comprobantes' | 'cuentas_por_pagar' | 'pagos';

type Vista =
  | { tipo: 'lista' }
  | { tipo: 'nuevo_requerimiento'; rcBase?: Partial<RequerimientoCompra> }
  | { tipo: 'editar_requerimiento'; rcId: string }
  | { tipo: 'detalle_requerimiento'; rcId: string }
  | { tipo: 'nueva_oc'; ocBase?: Partial<OrdenCompra> }
  | {
      tipo: 'editar_oc';
      ocId: string;
      /** Datos propios del CC ya ingresados en una conversión OC→CC todavía no registrada — se preserva para volver a 'nuevo_cc' con la OC ya actualizada, sin perderlos ni crear ningún documento en el tránsito. */
      retornarANuevoCC?: Partial<ComprobanteCompra>;
    }
  | { tipo: 'nuevo_cc'; ocOrigen?: OrdenCompra; ccBase?: Partial<ComprobanteCompra> }
  | { tipo: 'editar_cc'; ccId: string }
  | { tipo: 'detalle_oc'; ocId: string }
  | { tipo: 'detalle_cc'; ccId: string }
  | { tipo: 'detalle_cxp'; cxpId: string }
  | { tipo: 'detalle_pago'; pagoId: string };

const TABS: { id: TabActivo; label: string; icon: typeof FileText }[] = [
  { id: 'requerimientos', label: 'Requerimientos', icon: ClipboardList },
  { id: 'ordenes', label: 'Órdenes de Compra', icon: FileText },
  { id: 'comprobantes', label: 'Comprobantes', icon: Receipt },
  { id: 'cuentas_por_pagar', label: 'Cuentas por Pagar', icon: CreditCard },
  { id: 'pagos', label: 'Pagos', icon: Wallet },
];

/** Tab que se abre cuando no hay navegación explícita ni un último tab válido guardado en la sesión (flujo más frecuente: registrar un comprobante directo). */
const TAB_ACTIVO_POR_DEFECTO: TabActivo = 'comprobantes';

function esTabActivoValido(valor: string | null): valor is TabActivo {
  return TABS.some((tab) => tab.id === valor);
}

/** Último tab utilizado durante la sesión del navegador (se pierde al cerrar la pestaña, a diferencia de las preferencias de columnas que sí persisten en localStorage). */
function obtenerTabActivoGuardado(): TabActivo | null {
  if (typeof window === 'undefined') return null;
  const valor = window.sessionStorage.getItem(CLAVES_COMPRAS.TAB_ACTIVO);
  return esTabActivoValido(valor) ? valor : null;
}

function guardarTabActivoCompras(tab: TabActivo): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(CLAVES_COMPRAS.TAB_ACTIVO, tab);
  } catch {
    // ignorar cuota de almacenamiento
  }
}

export default function PaginaCompras() {
  const {
    state,
    eliminarRequerimientoCompraBorrador,
    registrarRequerimientoCompraDesdeBorrador,
    anularRequerimientoCompra,
    anularOrdenCompra,
    aprobarOrdenCompra,
    rechazarOrdenCompra,
    eliminarOrdenCompraBorrador,
    registrarOrdenCompraDesdeBorrador,
    anularComprobanteCompra,
    eliminarComprobanteCompraBorrador,
    registrarComprobanteCompraDesdeBorrador,
    anularPagoCompra,
    agregarEventoHistorialOC,
    agregarEventoHistorialCC,
    recargarDatos,
  } = useCompras();
  const { session } = useUserSession();
  const { activeWorkspace } = useTenant();
  const { state: config } = useConfigurationContext();
  const feedback = useFeedback();
  const navigate = useNavigate();
  const location = useLocation();
  const tabDesdeNavegacion = (location.state as { tab?: TabActivo } | null)?.tab;

  const [tabActivo, setTabActivo] = useState<TabActivo>(
    () => tabDesdeNavegacion ?? obtenerTabActivoGuardado() ?? TAB_ACTIVO_POR_DEFECTO,
  );
  // Recuerda el último tab utilizado durante la sesión (prioridad: navegación
  // explícita al entrar > último tab guardado > TAB_ACTIVO_POR_DEFECTO, ver
  // inicialización arriba). Cualquier cambio de tab —por click del usuario o
  // por una navegación explícita tras una acción (ej. generar OC/CC)— queda
  // registrado aquí sin distinguir el origen, así la próxima vez se recupera
  // el tab donde el usuario terminó.
  useEffect(() => {
    guardarTabActivoCompras(tabActivo);
  }, [tabActivo]);
  const [vista, setVista] = useState<Vista>({ tipo: 'lista' });
  const [rcParaAnular, setRcParaAnular] = useState<RequerimientoCompra | null>(null);
  const [ocParaAprobar, setOcParaAprobar] = useState<OrdenCompra | null>(null);
  const [ocParaAnular, setOcParaAnular] = useState<OrdenCompra | null>(null);
  const [ccParaAnular, setCcParaAnular] = useState<ComprobanteCompra | null>(null);
  const [pagoParaAnular, setPagoParaAnular] = useState<PagoCompra | null>(null);

  const usuarioNombre = session?.userName ?? '';

  const empresaImpresion: EmpresaOC | undefined = activeWorkspace
    ? { razonSocial: activeWorkspace.razonSocial, ruc: activeWorkspace.ruc, direccion: activeWorkspace.domicilioFiscal }
    : undefined;

  function handleImprimir(oc: OrdenCompra) {
    const nombreFormaPago = resolverNombreFormaPago(oc, config.paymentMethods);
    void imprimirOrdenCompra(oc, empresaImpresion, nombreFormaPago, state.comprobantes);
  }

  function handleEnviar(oc: OrdenCompra) {
    try {
      compartirOrdenCompraPorWhatsApp(oc);
    } catch (e) {
      feedback.error(e instanceof Error ? e.message : 'No se pudo enviar la orden.');
    }
  }

  async function handleEliminarBorradorRC(rc: RequerimientoCompra) {
    const numero = formatearNumeroCompra(rc.serie, rc.correlativo || undefined);
    if (!window.confirm(`¿Eliminar el borrador ${numero}? Esta acción no se puede deshacer.`)) return;
    try {
      await eliminarRequerimientoCompraBorrador(rc.id);
      feedback.success('Borrador eliminado.');
    } catch (e) {
      feedback.error(e instanceof Error ? e.message : 'No se pudo eliminar el borrador.');
    }
  }

  async function handleRegistrarBorradorRC(rc: RequerimientoCompra) {
    try {
      await registrarRequerimientoCompraDesdeBorrador(rc.id, undefined, usuarioNombre);
      feedback.success('Requerimiento de compra registrado.');
    } catch (e) {
      feedback.error(e instanceof Error ? e.message : 'No se pudo registrar el requerimiento.');
    }
  }

  async function handleEliminarBorrador(oc: OrdenCompra) {
    const numero = formatearNumeroCompra(oc.serie, oc.correlativo || undefined);
    if (!window.confirm(`¿Eliminar el borrador ${numero}? Esta acción no se puede deshacer.`)) return;
    try {
      await eliminarOrdenCompraBorrador(oc.id);
      feedback.success('Borrador eliminado.');
    } catch (e) {
      feedback.error(e instanceof Error ? e.message : 'No se pudo eliminar el borrador.');
    }
  }

  async function handleRegistrarBorrador(oc: OrdenCompra) {
    try {
      const registrada = await registrarOrdenCompraDesdeBorrador(oc.id, undefined, usuarioNombre);
      feedback.success(
        calcularEstadoPrincipalOC(registrada, state.comprobantes) === 'Pendiente de aprobación'
          ? 'Orden enviada a aprobación.'
          : 'Orden de compra registrada.',
      );
    } catch (e) {
      feedback.error(e instanceof Error ? e.message : 'No se pudo registrar la orden.');
    }
  }

  function handleDuplicar(oc: OrdenCompra) {
    try {
      const datos = prepararDuplicadoOC(oc);
      void agregarEventoHistorialOC(oc.id, 'Orden duplicada', undefined, usuarioNombre);
      feedback.success('Orden duplicada como borrador.');
      setVista({ tipo: 'nueva_oc', ocBase: datos });
    } catch (e) {
      feedback.error(e instanceof Error ? e.message : 'No se pudo duplicar la orden.');
    }
  }

  function handleImprimirCC(cc: ComprobanteCompra) {
    const nombreFormaPago = resolverNombreFormaPago(cc, config.paymentMethods);
    void imprimirComprobanteCompra(cc, empresaImpresion, nombreFormaPago);
  }

  function handleImprimirPago(pago: PagoCompra) {
    void imprimirPagoCompra(pago, empresaImpresion);
  }

  async function handleEliminarBorradorCC(cc: ComprobanteCompra) {
    const numero = formatearNumeroComprobanteCompra(cc);
    if (!window.confirm(`¿Eliminar el borrador ${numero}? Esta acción no se puede deshacer.`)) return;
    try {
      await eliminarComprobanteCompraBorrador(cc.id);
      feedback.success('Borrador eliminado.');
    } catch (e) {
      feedback.error(e instanceof Error ? e.message : 'No se pudo eliminar el borrador.');
    }
  }

  async function handleRegistrarBorradorCC(cc: ComprobanteCompra) {
    try {
      await registrarComprobanteCompraDesdeBorrador(cc.id, undefined, usuarioNombre);
      feedback.success('Comprobante de compra registrado.');
    } catch (e) {
      feedback.error(e instanceof Error ? e.message : 'No se pudo registrar el comprobante.');
    }
  }

  function handleDuplicarCC(cc: ComprobanteCompra) {
    try {
      const datos = prepararDuplicadoCC(cc);
      void agregarEventoHistorialCC(cc.id, 'Comprobante duplicado', undefined, usuarioNombre);
      feedback.success('Comprobante duplicado como borrador.');
      setVista({ tipo: 'nuevo_cc', ccBase: datos });
    } catch (e) {
      feedback.error(e instanceof Error ? e.message : 'No se pudo duplicar el comprobante.');
    }
  }

  if (vista.tipo === 'nuevo_requerimiento') {
    return (
      <FormularioRequerimientoCompra
        rcBase={vista.rcBase}
        onExito={(rc) => {
          setVista({ tipo: 'detalle_requerimiento', rcId: rc.id });
          setTabActivo('requerimientos');
        }}
        onCancelar={() => setVista({ tipo: 'lista' })}
      />
    );
  }

  if (vista.tipo === 'editar_requerimiento') {
    const rcBase = state.requerimientos.find((r) => r.id === vista.rcId);
    return (
      <FormularioRequerimientoCompra
        rcBase={rcBase}
        onExito={(rc) => {
          setVista({ tipo: 'detalle_requerimiento', rcId: rc.id });
          setTabActivo('requerimientos');
        }}
        onCancelar={() => setVista({ tipo: 'lista' })}
      />
    );
  }

  if (vista.tipo === 'nueva_oc') {
    return (
      <FormularioOrdenCompra
        ocBase={vista.ocBase}
        onExito={(oc) => {
          setVista({ tipo: 'detalle_oc', ocId: oc.id });
          setTabActivo('ordenes');
        }}
        onCancelar={() => setVista({ tipo: 'lista' })}
      />
    );
  }

  if (vista.tipo === 'editar_oc') {
    const ocBase = state.ordenes.find((o) => o.id === vista.ocId);
    const { retornarANuevoCC } = vista;
    return (
      <FormularioOrdenCompra
        ocBase={ocBase}
        onExito={(oc) => {
          if (retornarANuevoCC) {
            setVista({ tipo: 'nuevo_cc', ocOrigen: oc, ccBase: retornarANuevoCC });
            return;
          }
          setVista({ tipo: 'detalle_oc', ocId: oc.id });
          setTabActivo('ordenes');
        }}
        onCancelar={() => {
          if (retornarANuevoCC && ocBase) {
            setVista({ tipo: 'nuevo_cc', ocOrigen: ocBase, ccBase: retornarANuevoCC });
            return;
          }
          setVista({ tipo: 'lista' });
        }}
        onVerPagosRelacionados={(cxp) => setVista({ tipo: 'detalle_cxp', cxpId: cxp.id })}
      />
    );
  }

  if (vista.tipo === 'nuevo_cc') {
    return (
      <FormularioComprobanteCompra
        ocOrigen={vista.ocOrigen}
        ccBase={vista.ccBase}
        onExito={(cc) => {
          setVista({ tipo: 'detalle_cc', ccId: cc.id });
          setTabActivo('comprobantes');
        }}
        onCancelar={() => setVista({ tipo: 'lista' })}
        onEditarOrdenCompra={(oc, datosPropiosCC) =>
          setVista({ tipo: 'editar_oc', ocId: oc.id, retornarANuevoCC: datosPropiosCC })
        }
      />
    );
  }

  if (vista.tipo === 'editar_cc') {
    const ccBase = state.comprobantes.find((c) => c.id === vista.ccId);
    return (
      <FormularioComprobanteCompra
        ccBase={ccBase}
        onExito={(cc) => {
          setVista({ tipo: 'detalle_cc', ccId: cc.id });
          setTabActivo('comprobantes');
        }}
        onCancelar={() => setVista({ tipo: 'lista' })}
        onEditarOrdenCompra={(oc) => setVista({ tipo: 'editar_oc', ocId: oc.id })}
        onVerCuentaPorPagar={(cxp) => setVista({ tipo: 'detalle_cxp', cxpId: cxp.id })}
      />
    );
  }

  const rcDetalle =
    vista.tipo === 'detalle_requerimiento'
      ? (state.requerimientos.find((r) => r.id === vista.rcId) ?? null)
      : null;

  const ocDetalle =
    vista.tipo === 'detalle_oc'
      ? (state.ordenes.find((o) => o.id === vista.ocId) ?? null)
      : null;

  const ccDetalle =
    vista.tipo === 'detalle_cc'
      ? (state.comprobantes.find((c) => c.id === vista.ccId) ?? null)
      : null;

  const cxpDetalle =
    vista.tipo === 'detalle_cxp'
      ? (state.cuentasPorPagar.find((c) => c.id === vista.cxpId) ?? null)
      : null;

  const pagoDetalle =
    vista.tipo === 'detalle_pago'
      ? (state.pagos.find((p) => p.id === vista.pagoId) ?? null)
      : null;


  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-0 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center">
            <ShoppingBag size={20} className="text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Compras</h1>
            <p className="text-xs text-gray-500">
              Gestión de órdenes, comprobantes y cuentas por pagar
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const activo = tabActivo === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setTabActivo(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activo
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenido del tab */}
      <div className="flex-1 overflow-auto px-6 py-6">
        {tabActivo === 'requerimientos' && (
          <TablaRequerimientosCompra
            requerimientos={state.requerimientos}
            ordenes={state.ordenes}
            comprobantes={state.comprobantes}
            cargando={state.cargando}
            errorCarga={state.errorCarga}
            onVer={(rc) => setVista({ tipo: 'detalle_requerimiento', rcId: rc.id })}
            onEditar={(rc) => setVista({ tipo: 'editar_requerimiento', rcId: rc.id })}
            onEliminarBorrador={handleEliminarBorradorRC}
            onRegistrarBorrador={handleRegistrarBorradorRC}
            onAnular={(rc) => setRcParaAnular(rc)}
            onGenerarOC={(rc) => setVista({ tipo: 'nueva_oc', ocBase: extraerDatosRCParaOC(rc) })}
            onGenerarCC={(rc) => setVista({ tipo: 'nuevo_cc', ccBase: extraerDatosRCParaCC(rc) })}
            onNuevo={() => setVista({ tipo: 'nuevo_requerimiento' })}
            onActualizar={recargarDatos}
            onVerOrdenCompra={(ocId) => setVista({ tipo: 'detalle_oc', ocId })}
            onVerComprobante={(ccId) => setVista({ tipo: 'detalle_cc', ccId })}
          />
        )}

        {tabActivo === 'ordenes' && (
          <TablaOrdenesCompra
            ordenes={state.ordenes}
            comprobantes={state.comprobantes}
            cargando={state.cargando}
            errorCarga={state.errorCarga}
            onVer={(oc) => setVista({ tipo: 'detalle_oc', ocId: oc.id })}
            onEditar={(oc) => setVista({ tipo: 'editar_oc', ocId: oc.id })}
            onEliminarBorrador={handleEliminarBorrador}
            onRegistrarBorrador={handleRegistrarBorrador}
            onAprobarRechazar={(oc) => setOcParaAprobar(oc)}
            onAnular={(oc) => setOcParaAnular(oc)}
            onGenerarCC={(oc) => setVista({ tipo: 'nuevo_cc', ocOrigen: oc })}
            onImprimir={handleImprimir}
            onEnviar={handleEnviar}
            onNueva={() => setVista({ tipo: 'nueva_oc' })}
            onDuplicar={handleDuplicar}
            onActualizar={recargarDatos}
            onVerComprobante={(id) => setVista({ tipo: 'detalle_cc', ccId: id })}
          />
        )}

        {tabActivo === 'comprobantes' && (
          <TablaComprobantesCompra
            comprobantes={state.comprobantes}
            ordenes={state.ordenes}
            cuentasPorPagar={state.cuentasPorPagar}
            pagos={state.pagos}
            cargando={state.cargando}
            errorCarga={state.errorCarga}
            onVer={(cc) => setVista({ tipo: 'detalle_cc', ccId: cc.id })}
            onEditar={(cc) => setVista({ tipo: 'editar_cc', ccId: cc.id })}
            onEliminarBorrador={handleEliminarBorradorCC}
            onRegistrarBorrador={handleRegistrarBorradorCC}
            onAnular={(cc) => setCcParaAnular(cc)}
            onDuplicar={handleDuplicarCC}
            onImprimir={handleImprimirCC}
            onVerOC={(ocId) => setVista({ tipo: 'detalle_oc', ocId })}
            onNuevo={() => setVista({ tipo: 'nuevo_cc' })}
            onActualizar={recargarDatos}
          />
        )}

        {tabActivo === 'cuentas_por_pagar' && (
          <TablaCuentasPorPagar
            cuentas={state.cuentasPorPagar}
            pagos={state.pagos}
            comprobantes={state.comprobantes}
            cargando={state.cargando}
            errorCarga={state.errorCarga}
            onVer={(cxp) => setVista({ tipo: 'detalle_cxp', cxpId: cxp.id })}
            onRegistrarPago={(cxp) => navigate(`/compras/pagos/nuevo?cuentaPorPagarId=${cxp.id}`)}
            onNuevoPago={() => navigate('/compras/pagos/nuevo')}
            onActualizar={recargarDatos}
            onVerComprobante={(cc) => setVista({ tipo: 'detalle_cc', ccId: cc.id })}
          />
        )}

        {tabActivo === 'pagos' && (
          <TablaPagosCompra
            pagos={state.pagos}
            cuentasPorPagar={state.cuentasPorPagar}
            cargando={state.cargando}
            errorCarga={state.errorCarga}
            onVer={(pago) => setVista({ tipo: 'detalle_pago', pagoId: pago.id })}
            onAnular={(pago) => setPagoParaAnular(pago)}
            onImprimir={handleImprimirPago}
            onActualizar={recargarDatos}
            onVerCuentaPorPagar={(cxp) => setVista({ tipo: 'detalle_cxp', cxpId: cxp.id })}
          />
        )}
      </div>

      {/* Paneles de detalle */}
      {rcDetalle && (
        <PanelDetalleRequerimientoCompra
          rc={rcDetalle}
          ordenes={state.ordenes}
          comprobantes={state.comprobantes}
          onCerrar={() => setVista({ tipo: 'lista' })}
          onVerOrdenCompra={(oc) => setVista({ tipo: 'detalle_oc', ocId: oc.id })}
          onVerComprobante={(cc) => setVista({ tipo: 'detalle_cc', ccId: cc.id })}
          onEditar={(rc) => setVista({ tipo: 'editar_requerimiento', rcId: rc.id })}
          onAnular={(rc) => setRcParaAnular(rc)}
          onGenerarOC={(rc) => setVista({ tipo: 'nueva_oc', ocBase: extraerDatosRCParaOC(rc) })}
          onGenerarCC={(rc) => setVista({ tipo: 'nuevo_cc', ccBase: extraerDatosRCParaCC(rc) })}
          onEliminarBorrador={handleEliminarBorradorRC}
        />
      )}

      {ocDetalle && (
        <PanelDetalleOrdenCompra
          oc={ocDetalle}
          comprobantes={state.comprobantes}
          onCerrar={() => setVista({ tipo: 'lista' })}
          onVerComprobante={(cc) => setVista({ tipo: 'detalle_cc', ccId: cc.id })}
          onImprimir={handleImprimir}
          onEnviar={handleEnviar}
          onEditar={(oc) => setVista({ tipo: 'editar_oc', ocId: oc.id })}
          onDuplicar={handleDuplicar}
          onAprobarRechazar={(oc) => setOcParaAprobar(oc)}
          onAnular={(oc) => setOcParaAnular(oc)}
          onGenerarCC={(oc) => setVista({ tipo: 'nuevo_cc', ocOrigen: oc })}
          onEliminarBorrador={handleEliminarBorrador}
        />
      )}

      {ccDetalle && (
        <PanelDetalleComprobanteCompra
          cc={ccDetalle}
          ordenes={state.ordenes}
          cuentasPorPagar={state.cuentasPorPagar}
          pagos={state.pagos}
          onCerrar={() => setVista({ tipo: 'lista' })}
          onVerOrdenCompra={(oc) => setVista({ tipo: 'detalle_oc', ocId: oc.id })}
          onVerCuentaPorPagar={(cxp) => setVista({ tipo: 'detalle_cxp', cxpId: cxp.id })}
          onVerPago={(pago) => setVista({ tipo: 'detalle_pago', pagoId: pago.id })}
          onEditar={(cc) => setVista({ tipo: 'editar_cc', ccId: cc.id })}
          onDuplicar={handleDuplicarCC}
          onAnular={(cc) => setCcParaAnular(cc)}
          onImprimir={handleImprimirCC}
          onEliminarBorrador={handleEliminarBorradorCC}
        />
      )}

      {cxpDetalle && (
        <PanelDetalleCuentaPorPagar
          cxp={cxpDetalle}
          pagos={state.pagos}
          comprobantes={state.comprobantes}
          onCerrar={() => setVista({ tipo: 'lista' })}
          onRegistrarPago={(cxp) => navigate(`/compras/pagos/nuevo?cuentaPorPagarId=${cxp.id}`)}
          onVerComprobante={(cc) => setVista({ tipo: 'detalle_cc', ccId: cc.id })}
          onVerPago={(pago) => setVista({ tipo: 'detalle_pago', pagoId: pago.id })}
        />
      )}

      {pagoDetalle && (
        <PanelDetallePagoCompra
          pago={pagoDetalle}
          cuentasPorPagar={state.cuentasPorPagar}
          comprobantes={state.comprobantes}
          ordenes={state.ordenes}
          onCerrar={() => setVista({ tipo: 'lista' })}
          onVerCuentaPorPagar={(cxp) => setVista({ tipo: 'detalle_cxp', cxpId: cxp.id })}
          onVerComprobante={(cc) => setVista({ tipo: 'detalle_cc', ccId: cc.id })}
          onVerOrdenCompra={(oc) => setVista({ tipo: 'detalle_oc', ocId: oc.id })}
          onImprimir={handleImprimirPago}
        />
      )}

      {/* Modal: Anular Requerimiento de Compra */}
      <ModalAnularCompra
        abierto={rcParaAnular !== null}
        titulo="Anular Requerimiento de Compra"
        descripcion={`¿Confirmas la anulación del requerimiento ${rcParaAnular ? formatearNumeroCompra(rcParaAnular.serie, rcParaAnular.correlativo || undefined) : ''}? Esta acción no se puede deshacer.`}
        motivos={[...MOTIVOS_ANULACION_RC]}
        onConfirmar={async (motivo) => {
          if (rcParaAnular) {
            await anularRequerimientoCompra(rcParaAnular.id, motivo, usuarioNombre);
            feedback.success('Requerimiento de compra anulado.');
            setRcParaAnular(null);
          }
        }}
        onCerrar={() => setRcParaAnular(null)}
      />

      {/* Modal: Aprobar / Rechazar OC */}
      <ModalAprobarRechazarOC
        oc={ocParaAprobar}
        abierto={ocParaAprobar !== null}
        onAprobar={async (id, motivo) => {
          await aprobarOrdenCompra(id, usuarioNombre, motivo);
          feedback.success('Orden aprobada.');
          setOcParaAprobar(null);
        }}
        onRechazar={async (id, motivo) => {
          await rechazarOrdenCompra(id, motivo, usuarioNombre);
          feedback.success('Orden marcada como No Aprobada.');
          setOcParaAprobar(null);
        }}
        onCerrar={() => setOcParaAprobar(null)}
      />

      {/* Modal: Anular OC */}
      <ModalAnularCompra
        abierto={ocParaAnular !== null}
        titulo="Anular Orden de Compra"
        descripcion={`¿Confirmas la anulación de la orden ${ocParaAnular ? formatearNumeroCompra(ocParaAnular.serie, ocParaAnular.correlativo || undefined) : ''}? Esta acción no se puede deshacer.`}
        motivos={[...MOTIVOS_ANULACION_OC]}
        onConfirmar={async (motivo) => {
          if (ocParaAnular) {
            await anularOrdenCompra(ocParaAnular.id, motivo, usuarioNombre);
            feedback.success('Orden de compra anulada.');
            setOcParaAnular(null);
          }
        }}
        onCerrar={() => setOcParaAnular(null)}
      />

      {/* Modal: Anular CC */}
      <ModalAnularCompra
        abierto={ccParaAnular !== null}
        titulo="Anular Comprobante de Compra"
        descripcion={`¿Confirmas la anulación del comprobante ${ccParaAnular ? formatearNumeroComprobanteCompra(ccParaAnular) : ''}? Se anulará también la cuenta por pagar asociada.`}
        motivos={[...MOTIVOS_ANULACION_CC]}
        onConfirmar={async (motivo) => {
          if (ccParaAnular) {
            await anularComprobanteCompra(ccParaAnular.id, motivo, usuarioNombre);
            setCcParaAnular(null);
          }
        }}
        onCerrar={() => setCcParaAnular(null)}
      />

      {/* Modal: Anular Pago */}
      <ModalAnularCompra
        abierto={pagoParaAnular !== null}
        titulo="Anular Pago"
        descripcion={`¿Confirmas la anulación del pago ${pagoParaAnular?.numeroPago ?? ''}? Se revertirá el saldo de la cuenta por pagar.`}
        motivos={[...MOTIVOS_ANULACION_PAGO]}
        onConfirmar={async (motivo) => {
          if (pagoParaAnular) {
            await anularPagoCompra(pagoParaAnular.id, motivo, usuarioNombre);
            feedback.success(`Pago ${pagoParaAnular.numeroPago} anulado.`);
            setPagoParaAnular(null);
          }
        }}
        onCerrar={() => setPagoParaAnular(null)}
      />
    </div>
  );
}
