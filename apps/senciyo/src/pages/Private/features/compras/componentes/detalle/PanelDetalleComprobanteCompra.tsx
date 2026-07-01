import { X, Receipt, Package, Clock } from 'lucide-react';
import type { ComprobanteCompra } from '../../modelos/ComprobanteCompra';
import {
  ESTADO_DOCUMENTO_CC_LABELS,
  ESTADO_PAGO_CC_LABELS,
  ESTADO_INVENTARIO_CC_LABELS,
  MODALIDAD_INVENTARIO_CC_LABELS,
} from '../../modelos/ComprobanteCompra';
import {
  BADGE_ESTADO_DOCUMENTO_CC,
  BADGE_ESTADO_PAGO_CC,
  BADGE_ESTADO_INVENTARIO_CC,
} from '../../constantes/estadosCompras';

interface PanelDetalleComprobanteCompraProps {
  cc: ComprobanteCompra | null;
  onCerrar: () => void;
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

export default function PanelDetalleComprobanteCompra({
  cc,
  onCerrar,
}: PanelDetalleComprobanteCompraProps) {
  if (!cc) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onCerrar} />
      <div className="relative z-10 w-full max-w-xl bg-white shadow-2xl flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <Receipt size={20} className="text-indigo-600" />
            <div>
              <h2 className="font-semibold text-gray-900 font-mono">
                {cc.serieProveedor}-{cc.numeroProveedor}
              </h2>
              <p className="text-xs text-gray-500">
                {cc.tipoComprobanteProveedor} · Registrado {cc.fechaRegistro.slice(0, 10)}
              </p>
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
              estado={cc.estadoDocumento}
              labels={ESTADO_DOCUMENTO_CC_LABELS}
              clases={BADGE_ESTADO_DOCUMENTO_CC}
            />
            <Badge
              estado={cc.estadoPago}
              labels={ESTADO_PAGO_CC_LABELS}
              clases={BADGE_ESTADO_PAGO_CC}
            />
            <Badge
              estado={cc.estadoInventario}
              labels={ESTADO_INVENTARIO_CC_LABELS}
              clases={BADGE_ESTADO_INVENTARIO_CC}
            />
          </div>

          {/* Proveedor */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
              Proveedor
            </h3>
            <div className="bg-gray-50 rounded-lg px-4 py-2">
              <InfoRow label="Nombre" value={cc.proveedorNombre} />
              <InfoRow
                label="Documento"
                value={`${cc.proveedorTipoDocumento} ${cc.proveedorNumeroDocumento}`}
              />
            </div>
          </section>

          {/* Datos del comprobante */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
              Datos del comprobante
            </h3>
            <div className="bg-gray-50 rounded-lg px-4 py-2">
              <InfoRow label="Tipo" value={cc.tipoComprobanteProveedor} />
              <InfoRow
                label="Número"
                value={`${cc.serieProveedor}-${cc.numeroProveedor}`}
              />
              <InfoRow label="F. emisión proveedor" value={cc.fechaEmisionProveedor} />
              <InfoRow label="F. registro" value={cc.fechaRegistro.slice(0, 10)} />
              {cc.fechaVencimiento && (
                <InfoRow label="F. vencimiento" value={cc.fechaVencimiento} />
              )}
              <InfoRow label="Moneda" value={cc.moneda} />
              <InfoRow
                label="Forma de pago"
                value={cc.formaPago === 'contado' ? 'Contado' : 'Crédito'}
              />
              <InfoRow
                label="Modalidad inventario"
                value={MODALIDAD_INVENTARIO_CC_LABELS[cc.modalidadInventario]}
              />
            </div>
          </section>

          {/* Líneas */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
              <span className="flex items-center gap-2">
                <Package size={14} />
                Líneas ({cc.lineas.length})
              </span>
            </h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Descripción</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">Cant.</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">Costo</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cc.lineas.map((linea) => (
                    <tr key={linea.id}>
                      <td className="px-3 py-2">
                        <div className="font-medium">{linea.nombreProducto}</div>
                        <div className="text-xs text-gray-500">{linea.unidadMedida}</div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {linea.cantidadSolicitada}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {linea.costoUnitario.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-medium">
                        {linea.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Totales */}
          <section>
            <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal gravado:</span>
                <span className="font-mono">
                  {cc.totales.subtotal.toFixed(2)} {cc.moneda}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>IGV:</span>
                <span className="font-mono">
                  {cc.totales.igv.toFixed(2)} {cc.moneda}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200">
                <span>Total:</span>
                <span className="font-mono">
                  {cc.totales.total.toFixed(2)} {cc.moneda}
                </span>
              </div>
            </div>
          </section>

          {/* Historial */}
          {cc.historial.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                <span className="flex items-center gap-2">
                  <Clock size={14} />
                  Historial
                </span>
              </h3>
              <div className="space-y-2">
                {[...cc.historial].reverse().map((evt, i) => (
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
      </div>
    </div>
  );
}
