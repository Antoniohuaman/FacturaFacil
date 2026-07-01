import { X, CreditCard, Clock } from 'lucide-react';
import type { CuentaPorPagar } from '../../modelos/CuentaPorPagar';
import {
  ESTADO_PAGO_CXP_LABELS,
  ESTADO_VENCIMIENTO_CXP_LABELS,
} from '../../modelos/CuentaPorPagar';
import {
  BADGE_ESTADO_PAGO_CXP,
  BADGE_ESTADO_VENCIMIENTO_CXP,
} from '../../constantes/estadosCompras';
import { puedeRegistrarPago } from '../../logica/reglasCompras';

interface PanelDetalleCuentaPorPagarProps {
  cxp: CuentaPorPagar | null;
  onCerrar: () => void;
  onRegistrarPago: (cxp: CuentaPorPagar) => void;
}

function Badge({
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

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 shrink-0 w-40">{label}</span>
      <span className="text-sm text-gray-900 text-right">{value ?? '—'}</span>
    </div>
  );
}

export default function PanelDetalleCuentaPorPagar({
  cxp,
  onCerrar,
  onRegistrarPago,
}: PanelDetalleCuentaPorPagarProps) {
  if (!cxp) return null;

  const porcentajePagado = cxp.total > 0 ? (cxp.totalPagado / cxp.total) * 100 : 0;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onCerrar} />
      <div className="relative z-10 w-full max-w-lg bg-white shadow-2xl flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <CreditCard size={20} className="text-orange-600" />
            <div>
              <h2 className="font-semibold text-gray-900">Cuenta por Pagar</h2>
              <p className="text-xs text-gray-500 font-mono">{cxp.comprobanteCompraNumero}</p>
            </div>
          </div>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Estados */}
          <div className="flex flex-wrap gap-2">
            <Badge
              estado={cxp.estadoPago}
              labels={ESTADO_PAGO_CXP_LABELS}
              clases={BADGE_ESTADO_PAGO_CXP}
            />
            {cxp.fechaVencimiento && (
              <Badge
                estado={cxp.estadoVencimiento}
                labels={ESTADO_VENCIMIENTO_CXP_LABELS}
                clases={BADGE_ESTADO_VENCIMIENTO_CXP}
              />
            )}
          </div>

          {/* Barra de progreso */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Progreso de pago</span>
              <span>{porcentajePagado.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, porcentajePagado)}%` }}
              />
            </div>
          </div>

          {/* Proveedor */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
              Proveedor
            </h3>
            <div className="bg-gray-50 rounded-lg px-4 py-2">
              <InfoRow label="Nombre" value={cxp.proveedorNombre} />
              <InfoRow label="RUC / Doc." value={cxp.proveedorNumeroDocumento} />
            </div>
          </section>

          {/* Financiero */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
              Saldos
            </h3>
            <div className="bg-gray-50 rounded-lg px-4 py-2">
              <InfoRow
                label="Total"
                value={
                  <span className="font-mono font-medium">
                    {cxp.total.toFixed(2)} {cxp.moneda}
                  </span>
                }
              />
              <InfoRow
                label="Pagado"
                value={
                  <span className="font-mono text-green-700">
                    {cxp.totalPagado.toFixed(2)} {cxp.moneda}
                  </span>
                }
              />
              <InfoRow
                label="Saldo pendiente"
                value={
                  <span className="font-mono font-semibold text-orange-700">
                    {cxp.saldoPendiente.toFixed(2)} {cxp.moneda}
                  </span>
                }
              />
              <InfoRow label="Forma de pago" value={cxp.formaPago === 'contado' ? 'Contado' : 'Crédito'} />
              <InfoRow label="Fecha emisión" value={cxp.fechaEmision.slice(0, 10)} />
              {cxp.fechaVencimiento && (
                <InfoRow label="Fecha vencimiento" value={cxp.fechaVencimiento} />
              )}
            </div>
          </section>

          {/* Historial */}
          {cxp.historial.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                <span className="flex items-center gap-2">
                  <Clock size={14} />
                  Historial
                </span>
              </h3>
              <div className="space-y-2">
                {[...cxp.historial].reverse().map((evt, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <div className="text-gray-400 text-xs pt-0.5 shrink-0 w-32">
                      {evt.fecha.slice(0, 10)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">{evt.accion}</div>
                      {evt.detalle && <div className="text-gray-500">{evt.detalle}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        {puedeRegistrarPago(cxp) && (
          <div className="px-6 py-4 border-t border-gray-200 shrink-0">
            <button
              onClick={() => onRegistrarPago(cxp)}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <CreditCard size={16} />
              Registrar pago
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
