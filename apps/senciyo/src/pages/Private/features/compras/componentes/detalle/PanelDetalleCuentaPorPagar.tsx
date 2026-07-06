import { useState } from 'react';
import { CreditCard, Clock } from 'lucide-react';
import { Drawer } from '@/shared/ui/drawer/Drawer';
import type { CuentaPorPagar } from '../../modelos/CuentaPorPagar';
import {
  ESTADO_PAGO_CXP_LABELS,
  ESTADO_VENCIMIENTO_CXP_LABELS,
} from '../../modelos/CuentaPorPagar';
import type { PagoCompra } from '../../modelos/PagoCompra';
import { ESTADO_DOCUMENTO_PAGO_LABELS } from '../../modelos/PagoCompra';
import {
  BADGE_ESTADO_PAGO_CXP,
  BADGE_ESTADO_VENCIMIENTO_CXP,
  BADGE_ESTADO_DOCUMENTO_PAGO,
} from '../../constantes/estadosCompras';
import { puedeRegistrarPago } from '../../logica/reglasCompras';

interface PanelDetalleCuentaPorPagarProps {
  cxp: CuentaPorPagar | null;
  pagos: PagoCompra[];
  onCerrar: () => void;
  onRegistrarPago: (cxp: CuentaPorPagar) => void;
}

type TabCxP = 'general' | 'historial';

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

export default function PanelDetalleCuentaPorPagar({
  cxp,
  pagos,
  onCerrar,
  onRegistrarPago,
}: PanelDetalleCuentaPorPagarProps) {
  const [tabActivo, setTabActivo] = useState<TabCxP>('general');

  const porcentajePagado = cxp && cxp.total > 0 ? (cxp.totalPagado / cxp.total) * 100 : 0;
  const puedeRegistrar = cxp ? puedeRegistrarPago(cxp) : false;
  const pagosAplicados = cxp
    ? pagos.filter((p) => cxp.pagosRelacionados.includes(p.id))
    : [];

  const TABS: { id: TabCxP; label: string; icon: typeof CreditCard }[] = [
    { id: 'general', label: 'General', icon: CreditCard },
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

  const pie = puedeRegistrar && cxp ? (
    <button
      onClick={() => onRegistrarPago(cxp)}
      className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
    >
      <CreditCard size={16} />
      Registrar pago
    </button>
  ) : undefined;

  return (
    <Drawer
      abierto={cxp !== null}
      alCerrar={onCerrar}
      titulo={titulo}
      subtitulo={subtitulo}
      pie={pie}
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
                      Pagado: {cxp.totalPagado.toFixed(2)} {cxp.moneda}
                    </span>
                    <span className="text-orange-700 font-mono font-semibold">
                      Pendiente: {cxp.saldoPendiente.toFixed(2)} {cxp.moneda}
                    </span>
                  </div>
                </div>

                <Seccion titulo="Proveedor">
                  <Campo label="Nombre" valor={cxp.proveedorNombre} />
                  <Campo label="RUC / Doc." valor={cxp.proveedorNumeroDocumento} />
                  <Campo label="Tipo comprobante origen" valor={cxp.tipoComprobanteOrigen} />
                  <Campo label="Comprobante origen" valor={cxp.comprobanteCompraNumero} />
                </Seccion>

                <Seccion titulo="Saldos">
                  <Campo
                    label="Total"
                    valor={
                      <span className="font-mono font-semibold">
                        {cxp.total.toFixed(2)} {cxp.moneda}
                      </span>
                    }
                  />
                  <Campo
                    label="Total pagado"
                    valor={
                      <span className="font-mono text-green-700">
                        {cxp.totalPagado.toFixed(2)} {cxp.moneda}
                      </span>
                    }
                  />
                  <Campo
                    label="Saldo pendiente"
                    valor={
                      <span className="font-mono font-semibold text-orange-700">
                        {cxp.saldoPendiente.toFixed(2)} {cxp.moneda}
                      </span>
                    }
                  />
                  <Campo
                    label="Forma de pago"
                    valor={cxp.formaPago === 'contado' ? 'Contado' : 'Crédito'}
                  />
                  <Campo label="Fecha emisión" valor={cxp.fechaEmision.slice(0, 10)} />
                  {cxp.fechaVencimiento && (
                    <Campo label="Fecha vencimiento" valor={cxp.fechaVencimiento} />
                  )}
                </Seccion>

                {cxp.cuotas && cxp.cuotas.length > 0 && (
                  <Seccion titulo={`Cuotas (${cxp.cuotas.length})`}>
                    <div className="divide-y divide-gray-100">
                      {cxp.cuotas.map((cuota) => (
                        <div key={cuota.id} className="py-2 flex justify-between items-center">
                          <div>
                            <p className="text-sm text-gray-700">Cuota {cuota.numeroCuota}</p>
                            <p className="text-xs text-gray-400">{cuota.fechaVencimiento}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-mono font-medium text-gray-900">
                              {cuota.montoCuota.toFixed(2)}
                            </p>
                            {cuota.saldoPendiente > 0 && (
                              <p className="text-xs font-mono text-orange-600">
                                Pendiente: {cuota.saldoPendiente.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Seccion>
                )}

                <Seccion titulo={`Pagos relacionados (${pagosAplicados.length})`}>
                  {pagosAplicados.length === 0 ? (
                    <p className="text-sm text-gray-400 py-2">Sin pagos registrados todavía.</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {pagosAplicados.map((pago) => (
                        <div key={pago.id} className="py-2 flex justify-between items-center">
                          <div>
                            <p className="text-sm font-mono text-gray-700">{pago.numeroPago}</p>
                            <p className="text-xs text-gray-400">{pago.fechaPago}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-mono font-medium text-gray-900">
                              {pago.montoTotalPagado.toFixed(2)} {pago.moneda}
                            </p>
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium ${BADGE_ESTADO_DOCUMENTO_PAGO[pago.estadoDocumento]}`}
                            >
                              {ESTADO_DOCUMENTO_PAGO_LABELS[pago.estadoDocumento]}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Seccion>

                {cxp.observaciones && (
                  <Seccion titulo="Observaciones">
                    <p className="text-sm text-gray-700 py-2">{cxp.observaciones}</p>
                  </Seccion>
                )}
              </>
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
                          <p className="text-xs text-gray-400">{evt.fecha.slice(0, 16).replace('T', ' ')}</p>
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
