import { useState } from 'react';
import { CreditCard, Clock, Link2 } from 'lucide-react';
import { Drawer } from '@/shared/ui/drawer/Drawer';
import { CreditInstallmentsTable } from '@/shared/payments/CreditInstallmentsTable';
import { formatMoney } from '@/shared/currency';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import type { CuentaPorPagar } from '../../modelos/CuentaPorPagar';
import {
  ESTADO_PAGO_CXP_LABELS,
  ESTADO_VENCIMIENTO_CXP_LABELS,
} from '../../modelos/CuentaPorPagar';
import type { PagoCompra } from '../../modelos/PagoCompra';
import { ESTADO_DOCUMENTO_PAGO_LABELS } from '../../modelos/PagoCompra';
import type { ComprobanteCompra } from '../../modelos/ComprobanteCompra';
import {
  BADGE_ESTADO_PAGO_CXP,
  BADGE_ESTADO_VENCIMIENTO_CXP,
  BADGE_ESTADO_DOCUMENTO_PAGO,
} from '../../constantes/estadosCompras';
import { puedeRegistrarPago, resolverNombreFormaPago } from '../../logica/reglasCompras';
import { getNombreTipoDocumentoProveedor } from '../../constantes/tiposDocumentoProveedor';
import { formatearFechaCompra } from '../../utilidades/formatearCompras';

interface PanelDetalleCuentaPorPagarProps {
  cxp: CuentaPorPagar | null;
  pagos: PagoCompra[];
  comprobantes: ComprobanteCompra[];
  onCerrar: () => void;
  onRegistrarPago: (cxp: CuentaPorPagar) => void;
  onVerComprobante?: (cc: ComprobanteCompra) => void;
  onVerPago?: (pago: PagoCompra) => void;
}

type TabCxP = 'general' | 'relacionados' | 'historial';

function BadgeEstado({
  estado,
  labels,
  clases,
}: {
  estado: string;
  labels: Record<string, string>;
  clases: Record<string, string>;
}) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${clases[estado] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {labels[estado] ?? estado}
    </span>
  );
}

function Campo({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 shrink-0 w-40">{label}</span>
      <span className="text-sm text-gray-900 text-right">{valor ?? '—'}</span>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">{titulo}</h3>
      <div className="bg-gray-50 rounded-lg px-4 py-1">{children}</div>
    </div>
  );
}

/** Acción principal visible del header (icono + texto corto). Mismo patrón que PanelDetalleComprobanteCompra/PanelDetalleOrdenCompra. */
function BotonEncabezado({
  icon: Icon,
  texto,
  label,
  onClick,
}: {
  icon: typeof CreditCard;
  texto: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
    >
      <Icon size={14} /> {texto}
    </button>
  );
}

export default function PanelDetalleCuentaPorPagar({
  cxp,
  pagos,
  comprobantes,
  onCerrar,
  onRegistrarPago,
  onVerComprobante,
  onVerPago,
}: PanelDetalleCuentaPorPagarProps) {
  const { state: config } = useConfigurationContext();
  const [tabActivo, setTabActivo] = useState<TabCxP>('general');

  const porcentajePagado = cxp && cxp.total > 0 ? (cxp.totalPagado / cxp.total) * 100 : 0;
  const pagosAplicados = cxp ? pagos.filter((p) => cxp.pagosRelacionados.includes(p.id)) : [];
  const comprobanteOrigen = cxp ? comprobantes.find((c) => c.id === cxp.comprobanteCompraId) : undefined;
  const nombreFormaPago = cxp ? resolverNombreFormaPago(cxp, config.paymentMethods) : '';

  const TABS: { id: TabCxP; label: string; icon: typeof CreditCard }[] = [
    { id: 'general', label: 'General', icon: CreditCard },
    { id: 'relacionados', label: 'Pagos relacionados', icon: Link2 },
    { id: 'historial', label: 'Historial', icon: Clock },
  ];

  const titulo = cxp ? (
    <div className="flex items-center gap-2">
      <CreditCard size={18} className="text-orange-600 shrink-0" />
      <span className="font-mono font-semibold text-gray-900">{cxp.comprobanteCompraNumero}</span>
    </div>
  ) : null;

  const subtitulo = cxp ? (
    <div className="flex flex-wrap gap-1 mt-1">
      <BadgeEstado estado={cxp.estadoPago} labels={ESTADO_PAGO_CXP_LABELS} clases={BADGE_ESTADO_PAGO_CXP} />
      {cxp.fechaVencimiento && (
        <BadgeEstado
          estado={cxp.estadoVencimiento}
          labels={ESTADO_VENCIMIENTO_CXP_LABELS}
          clases={BADGE_ESTADO_VENCIMIENTO_CXP}
        />
      )}
    </div>
  ) : null;

  /**
   * "Registrar pago" es hoy la única acción real del header: "Anular" no es
   * una acción directa de CxP (se anula en cascada desde el CC origen), por
   * lo que no hay un menú "Más acciones" que mostrar sin una segunda acción
   * real que ponerle.
   */
  const accionesEncabezado = cxp && puedeRegistrarPago(cxp) ? (
    <div className="flex shrink-0 items-center gap-1">
      <BotonEncabezado
        icon={CreditCard}
        texto="Registrar pago"
        label="Registrar pago"
        onClick={() => onRegistrarPago(cxp)}
      />
    </div>
  ) : null;

  return (
    <Drawer
      abierto={cxp !== null}
      alCerrar={onCerrar}
      titulo={titulo}
      subtitulo={subtitulo}
      accionesEncabezado={accionesEncabezado}
      tamano="lg"
    >
      {cxp && (
        <div className="flex flex-col h-full">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 px-4 shrink-0">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTabActivo(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
                    tabActivo === tab.id
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon size={13} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Contenido */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {tabActivo === 'general' && (
              <>
                {/* Barra de progreso de pago */}
                <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-2">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Progreso de pago</span>
                    <span className="font-mono font-medium">{porcentajePagado.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, porcentajePagado)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs pt-1">
                    <span className="text-green-700 font-mono">
                      Pagado: {formatMoney(cxp.totalPagado, cxp.moneda)}
                    </span>
                    <span className="text-orange-700 font-mono font-semibold">
                      Pendiente: {formatMoney(cxp.saldoPendiente, cxp.moneda)}
                    </span>
                  </div>
                </div>

                <Seccion titulo="Proveedor">
                  <Campo label="Nombre" valor={cxp.proveedorNombre} />
                  <Campo label="RUC / Doc." valor={cxp.proveedorNumeroDocumento} />
                </Seccion>

                <Seccion titulo="Documento origen">
                  <Campo label="Tipo de comprobante" valor={getNombreTipoDocumentoProveedor(cxp.tipoComprobanteOrigen)} />
                  <Campo
                    label="Comprobante"
                    valor={
                      comprobanteOrigen && onVerComprobante ? (
                        <button
                          type="button"
                          onClick={() => onVerComprobante(comprobanteOrigen)}
                          className="font-mono text-blue-600 hover:underline"
                        >
                          {cxp.comprobanteCompraNumero}
                        </button>
                      ) : (
                        <span className="font-mono">{cxp.comprobanteCompraNumero}</span>
                      )
                    }
                  />
                </Seccion>

                <Seccion titulo="Saldos">
                  <Campo
                    label="Total"
                    valor={<span className="font-mono font-semibold">{formatMoney(cxp.total, cxp.moneda)}</span>}
                  />
                  <Campo
                    label="Total pagado"
                    valor={<span className="font-mono text-green-700">{formatMoney(cxp.totalPagado, cxp.moneda)}</span>}
                  />
                  <Campo
                    label="Saldo pendiente"
                    valor={
                      <span className="font-mono font-semibold text-orange-700">
                        {formatMoney(cxp.saldoPendiente, cxp.moneda)}
                      </span>
                    }
                  />
                  <Campo label="Forma de pago" valor={nombreFormaPago} />
                  <Campo label="Fecha emisión" valor={formatearFechaCompra(cxp.fechaEmision)} />
                  {cxp.fechaVencimiento && (
                    <Campo label="Fecha vencimiento" valor={formatearFechaCompra(cxp.fechaVencimiento)} />
                  )}
                </Seccion>

                {cxp.cuotas && cxp.cuotas.length > 0 && (
                  <Seccion titulo={`Cuotas (${cxp.cuotas.length})`}>
                    <div className="py-2">
                      <CreditInstallmentsTable
                        installments={cxp.cuotas.map((cuota) => ({
                          numeroCuota: cuota.numeroCuota,
                          fechaVencimiento: cuota.fechaVencimiento,
                          importe: cuota.montoCuota,
                          pagado: cuota.montoPagado,
                          saldo: cuota.saldoPendiente,
                          diasCredito: cuota.diasCredito ?? 0,
                          porcentaje: cxp.total > 0 ? Math.round((cuota.montoCuota / cxp.total) * 10000) / 100 : 0,
                          // Etiqueta ya resuelta con la terminología oficial de
                          // Cuentas por Pagar — el componente compartido no
                          // decide ni conoce "Pagada"/"Cancelada".
                          estado: ESTADO_PAGO_CXP_LABELS[cuota.estadoPago],
                        }))}
                        currency={cxp.moneda}
                        mode="readonly"
                        showStatusColumn
                        compact
                      />
                    </div>
                  </Seccion>
                )}

                {cxp.observaciones && (
                  <Seccion titulo="Observaciones">
                    <p className="text-sm text-gray-700 py-2">{cxp.observaciones}</p>
                  </Seccion>
                )}
              </>
            )}

            {tabActivo === 'relacionados' && (
              <Seccion titulo={`Pagos relacionados (${pagosAplicados.length})`}>
                {pagosAplicados.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">Sin pagos registrados todavía.</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {pagosAplicados.map((pago) => (
                      <button
                        key={pago.id}
                        type="button"
                        onClick={() => onVerPago?.(pago)}
                        disabled={!onVerPago}
                        className="w-full flex justify-between items-center py-2 text-left disabled:cursor-default"
                      >
                        <div>
                          <p className="text-sm font-mono text-gray-700">{pago.numeroPago}</p>
                          <p className="text-xs text-gray-400">{formatearFechaCompra(pago.fechaPago)}</p>
                          <p className="text-xs text-gray-500">
                            {pago.mediosPago.map((mp) => mp.medioPagoNombre).join(', ')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono font-medium text-gray-900">
                            {formatMoney(pago.montoTotalPagado, pago.moneda)}
                          </p>
                          <BadgeEstado
                            estado={pago.estadoDocumento}
                            labels={ESTADO_DOCUMENTO_PAGO_LABELS}
                            clases={BADGE_ESTADO_DOCUMENTO_PAGO}
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </Seccion>
            )}

            {tabActivo === 'historial' && (
              <>
                {cxp.historial.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Sin eventos registrados.</p>
                ) : (
                  <div className="relative pl-5 space-y-4">
                    <div className="absolute left-1.5 top-0 bottom-0 w-0.5 bg-gray-200" />
                    {[...cxp.historial].reverse().map((evt, i) => (
                      <div key={i} className="relative flex gap-3">
                        <div className="absolute -left-3.5 w-3 h-3 rounded-full bg-white border-2 border-blue-400 mt-1" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-gray-700">{evt.accion}</span>
                            {evt.usuario && (
                              <span className="text-xs text-gray-500">por {evt.usuario}</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">
                            {formatearFechaCompra(evt.fecha)} {evt.fecha.split('T')[1]?.slice(0, 5) ?? ''}
                          </p>
                          {evt.detalle && (
                            <p className="text-xs text-gray-600 mt-0.5">{evt.detalle}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
