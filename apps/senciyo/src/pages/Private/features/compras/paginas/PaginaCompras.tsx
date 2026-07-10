import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, FileText, Receipt, CreditCard, Wallet } from 'lucide-react';
import { useCompras } from '../contexto/ContextoCompras';
import { useUserSession } from '@/contexts/UserSessionContext';
import { useTenant } from '@/shared/tenant/TenantContext';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useFeedback } from '@/shared/feedback';
import { resolverNombreFormaPagoOC, calcularEstadoPrincipalOC } from '../logica/reglasCompras';
import { formatearNumeroCompra } from '../utilidades/formatearCompras';
import {
  imprimirOrdenCompra,
  compartirOrdenCompraPorWhatsApp,
  prepararDuplicadoOC,
  type EmpresaOC,
} from '../servicios/servicioOrdenCompra';
import TablaOrdenesCompra from '../componentes/listados/TablaOrdenesCompra';
import TablaComprobantesCompra from '../componentes/listados/TablaComprobantesCompra';
import TablaCuentasPorPagar from '../componentes/listados/TablaCuentasPorPagar';
import TablaPagosCompra from '../componentes/listados/TablaPagosCompra';
import FormularioOrdenCompra from '../componentes/formularios/FormularioOrdenCompra';
import FormularioComprobanteCompra from '../componentes/formularios/FormularioComprobanteCompra';
import PanelDetalleOrdenCompra from '../componentes/detalle/PanelDetalleOrdenCompra';
import PanelDetalleComprobanteCompra from '../componentes/detalle/PanelDetalleComprobanteCompra';
import PanelDetalleCuentaPorPagar from '../componentes/detalle/PanelDetalleCuentaPorPagar';
import PanelDetallePagoCompra from '../componentes/detalle/PanelDetallePagoCompra';
import ModalAprobarRechazarOC from '../componentes/modales/ModalAprobarRechazarOC';
import ModalAnularCompra from '../componentes/modales/ModalAnularCompra';
import type { OrdenCompra } from '../modelos/OrdenCompra';
import type { ComprobanteCompra } from '../modelos/ComprobanteCompra';
import type { PagoCompra } from '../modelos/PagoCompra';
import {
  MOTIVOS_ANULACION_OC,
  MOTIVOS_ANULACION_CC,
  MOTIVOS_ANULACION_PAGO,
} from '../constantes/motivosAnulacionCompras';

type TabActivo = 'ordenes' | 'comprobantes' | 'cuentas_por_pagar' | 'pagos';

type Vista =
  | { tipo: 'lista' }
  | { tipo: 'nueva_oc'; ocBase?: Partial<OrdenCompra> }
  | { tipo: 'editar_oc'; ocId: string }
  | { tipo: 'nuevo_cc'; ocOrigen?: OrdenCompra }
  | { tipo: 'detalle_oc'; ocId: string }
  | { tipo: 'detalle_cc'; ccId: string }
  | { tipo: 'detalle_cxp'; cxpId: string }
  | { tipo: 'detalle_pago'; pagoId: string };

const TABS: { id: TabActivo; label: string; icon: typeof FileText }[] = [
  { id: 'ordenes', label: 'Órdenes de Compra', icon: FileText },
  { id: 'comprobantes', label: 'Comprobantes', icon: Receipt },
  { id: 'cuentas_por_pagar', label: 'Cuentas por Pagar', icon: CreditCard },
  { id: 'pagos', label: 'Pagos', icon: Wallet },
];

export default function PaginaCompras() {
  const {
    state,
    anularOrdenCompra,
    aprobarOrdenCompra,
    rechazarOrdenCompra,
    eliminarOrdenCompraBorrador,
    registrarOrdenCompraDesdeBorrador,
    anularComprobanteCompra,
    anularPagoCompra,
    agregarEventoHistorialOC,
  } = useCompras();
  const { session } = useUserSession();
  const { activeWorkspace } = useTenant();
  const { state: config } = useConfigurationContext();
  const feedback = useFeedback();
  const navigate = useNavigate();
  const location = useLocation();
  const tabDesdeNavegacion = (location.state as { tab?: TabActivo } | null)?.tab;

  const [tabActivo, setTabActivo] = useState<TabActivo>(tabDesdeNavegacion ?? 'ordenes');
  const [vista, setVista] = useState<Vista>({ tipo: 'lista' });
  const [ocParaAprobar, setOcParaAprobar] = useState<OrdenCompra | null>(null);
  const [ocParaAnular, setOcParaAnular] = useState<OrdenCompra | null>(null);
  const [ccParaAnular, setCcParaAnular] = useState<ComprobanteCompra | null>(null);
  const [pagoParaAnular, setPagoParaAnular] = useState<PagoCompra | null>(null);

  const usuarioNombre = session?.userName ?? '';

  const empresaImpresion: EmpresaOC | undefined = activeWorkspace
    ? { razonSocial: activeWorkspace.razonSocial, ruc: activeWorkspace.ruc, direccion: activeWorkspace.domicilioFiscal }
    : undefined;

  function handleImprimir(oc: OrdenCompra) {
    const nombreFormaPago = resolverNombreFormaPagoOC(oc, config.paymentMethods);
    void imprimirOrdenCompra(oc, empresaImpresion, nombreFormaPago);
  }

  function handleEnviar(oc: OrdenCompra) {
    try {
      compartirOrdenCompraPorWhatsApp(oc);
    } catch (e) {
      feedback.error(e instanceof Error ? e.message : 'No se pudo enviar la orden.');
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
        calcularEstadoPrincipalOC(registrada) === 'Pendiente de aprobación'
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
    return (
      <FormularioOrdenCompra
        ocBase={ocBase}
        onExito={(oc) => {
          setVista({ tipo: 'detalle_oc', ocId: oc.id });
          setTabActivo('ordenes');
        }}
        onCancelar={() => setVista({ tipo: 'lista' })}
      />
    );
  }

  if (vista.tipo === 'nuevo_cc') {
    return (
      <FormularioComprobanteCompra
        ocOrigen={vista.ocOrigen}
        onExito={(cc) => {
          const numeroCC = `${cc.serieProveedor}-${cc.numeroProveedor}`;
          feedback.success(
            vista.ocOrigen
              ? `Comprobante ${numeroCC} generado. Orden de compra convertida.`
              : `Comprobante ${numeroCC} registrado.`,
          );
          setVista({ tipo: 'detalle_cc', ccId: cc.id });
          setTabActivo('comprobantes');
        }}
        onCancelar={() => setVista({ tipo: 'lista' })}
      />
    );
  }

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

  const cxpPendientes = state.cuentasPorPagar.filter(
    (c) => c.estadoPago === 'pendiente' || c.estadoPago === 'parcial',
  );

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
            let contador: number | null = null;
            if (tab.id === 'ordenes') contador = state.ordenes.length || null;
            if (tab.id === 'comprobantes') contador = state.comprobantes.length || null;
            if (tab.id === 'cuentas_por_pagar') contador = cxpPendientes.length || null;

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
                {contador !== null && (
                  <span
                    className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                      tab.id === 'cuentas_por_pagar'
                        ? 'bg-orange-100 text-orange-700 font-medium'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {contador}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenido del tab */}
      <div className="flex-1 overflow-auto px-6 py-6">
        {tabActivo === 'ordenes' && (
          <TablaOrdenesCompra
            ordenes={state.ordenes}
            comprobantes={state.comprobantes}
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
          />
        )}

        {tabActivo === 'comprobantes' && (
          <TablaComprobantesCompra
            comprobantes={state.comprobantes}
            onVer={(cc) => setVista({ tipo: 'detalle_cc', ccId: cc.id })}
            onAnular={(cc) => setCcParaAnular(cc)}
            onNuevo={() => setVista({ tipo: 'nuevo_cc' })}
          />
        )}

        {tabActivo === 'cuentas_por_pagar' && (
          <TablaCuentasPorPagar
            cuentas={state.cuentasPorPagar}
            onVer={(cxp) => setVista({ tipo: 'detalle_cxp', cxpId: cxp.id })}
            onRegistrarPago={(cxp) => navigate(`/compras/pagos/nuevo?cuentaPorPagarId=${cxp.id}`)}
            onNuevoPago={() => navigate('/compras/pagos/nuevo')}
          />
        )}

        {tabActivo === 'pagos' && (
          <TablaPagosCompra
            pagos={state.pagos}
            cuentasPorPagar={state.cuentasPorPagar}
            onVer={(pago) => setVista({ tipo: 'detalle_pago', pagoId: pago.id })}
            onAnular={(pago) => setPagoParaAnular(pago)}
          />
        )}
      </div>

      {/* Paneles de detalle */}
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
        />
      )}

      {cxpDetalle && (
        <PanelDetalleCuentaPorPagar
          cxp={cxpDetalle}
          pagos={state.pagos}
          onCerrar={() => setVista({ tipo: 'lista' })}
          onRegistrarPago={(cxp) => navigate(`/compras/pagos/nuevo?cuentaPorPagarId=${cxp.id}`)}
        />
      )}

      {pagoDetalle && (
        <PanelDetallePagoCompra
          pago={pagoDetalle}
          cuentasPorPagar={state.cuentasPorPagar}
          onCerrar={() => setVista({ tipo: 'lista' })}
        />
      )}

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
        descripcion={`¿Confirmas la anulación del comprobante ${ccParaAnular ? `${ccParaAnular.serieProveedor}-${ccParaAnular.numeroProveedor}` : ''}? Se anulará también la cuenta por pagar asociada.`}
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
            setPagoParaAnular(null);
          }
        }}
        onCerrar={() => setPagoParaAnular(null)}
      />
    </div>
  );
}
