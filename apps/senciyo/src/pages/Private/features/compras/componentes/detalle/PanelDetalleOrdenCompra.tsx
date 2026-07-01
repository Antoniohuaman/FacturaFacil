import { X, FileText, Package, Clock } from 'lucide-react';
import type { OrdenCompra } from '../../modelos/OrdenCompra';
import {
  ESTADO_DOCUMENTO_OC_LABELS,
  ESTADO_APROBACION_OC_LABELS,
  ESTADO_RECEPCION_OC_LABELS,
  ESTADO_FACTURACION_OC_LABELS,
  ESTADO_INVENTARIO_OC_LABELS,
} from '../../modelos/OrdenCompra';
import {
  BADGE_ESTADO_DOCUMENTO_OC,
  BADGE_ESTADO_APROBACION_OC,
  BADGE_ESTADO_RECEPCION_OC,
  BADGE_ESTADO_FACTURACION_OC,
  BADGE_ESTADO_INVENTARIO_OC,
} from '../../constantes/estadosCompras';

interface PanelDetalleOrdenCompraProps {
  oc: OrdenCompra | null;
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

export default function PanelDetalleOrdenCompra({ oc, onCerrar }: PanelDetalleOrdenCompraProps) {
  if (!oc) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onCerrar} />
      <div className="relative z-10 w-full max-w-xl bg-white shadow-2xl flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-blue-600" />
            <div>
              <h2 className="font-semibold text-gray-900 font-mono">{oc.numero}</h2>
              <p className="text-xs text-gray-500">Orden de Compra</p>
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
              estado={oc.estadoDocumento}
              labels={ESTADO_DOCUMENTO_OC_LABELS}
              clases={BADGE_ESTADO_DOCUMENTO_OC}
            />
            {oc.requiereAprobacion && (
              <Badge
                estado={oc.estadoAprobacion}
                labels={ESTADO_APROBACION_OC_LABELS}
                clases={BADGE_ESTADO_APROBACION_OC}
              />
            )}
            <Badge
              estado={oc.estadoRecepcion}
              labels={ESTADO_RECEPCION_OC_LABELS}
              clases={BADGE_ESTADO_RECEPCION_OC}
            />
            <Badge
              estado={oc.estadoFacturacion}
              labels={ESTADO_FACTURACION_OC_LABELS}
              clases={BADGE_ESTADO_FACTURACION_OC}
            />
            <Badge
              estado={oc.estadoInventario}
              labels={ESTADO_INVENTARIO_OC_LABELS}
              clases={BADGE_ESTADO_INVENTARIO_OC}
            />
          </div>

          {/* Proveedor */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
              Proveedor
            </h3>
            <div className="bg-gray-50 rounded-lg px-4 py-2">
              <InfoRow label="Nombre" value={oc.proveedorNombre} />
              <InfoRow
                label="Documento"
                value={`${oc.proveedorTipoDocumento} ${oc.proveedorNumeroDocumento}`}
              />
              {oc.proveedorDireccionFacturacion && (
                <InfoRow label="Dirección" value={oc.proveedorDireccionFacturacion} />
              )}
            </div>
          </section>

          {/* Datos financieros */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
              Condiciones
            </h3>
            <div className="bg-gray-50 rounded-lg px-4 py-2">
              <InfoRow label="Fecha emisión" value={oc.fechaEmision} />
              {oc.fechaVencimiento && (
                <InfoRow label="Fecha vencimiento" value={oc.fechaVencimiento} />
              )}
              {oc.fechaEntregaEsperada && (
                <InfoRow label="Entrega esperada" value={oc.fechaEntregaEsperada} />
              )}
              <InfoRow label="Moneda" value={oc.moneda} />
              <InfoRow
                label="Forma de pago"
                value={oc.formaPago === 'contado' ? 'Contado' : 'Crédito'}
              />
              {oc.condicionesPago && (
                <InfoRow label="Condiciones" value={oc.condicionesPago} />
              )}
            </div>
          </section>

          {/* Líneas */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
              <span className="flex items-center gap-2">
                <Package size={14} />
                Líneas ({oc.lineas.length})
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
                  {oc.lineas.map((linea) => (
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
                  {oc.totales.subtotal.toFixed(2)} {oc.moneda}
                </span>
              </div>
              {oc.totales.subtotalExonerado > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal exonerado:</span>
                  <span className="font-mono">
                    {oc.totales.subtotalExonerado.toFixed(2)} {oc.moneda}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>IGV (18%):</span>
                <span className="font-mono">
                  {oc.totales.igv.toFixed(2)} {oc.moneda}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200">
                <span>Total:</span>
                <span className="font-mono">
                  {oc.totales.total.toFixed(2)} {oc.moneda}
                </span>
              </div>
            </div>
          </section>

          {/* Historial */}
          {oc.historial.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                <span className="flex items-center gap-2">
                  <Clock size={14} />
                  Historial
                </span>
              </h3>
              <div className="space-y-2">
                {[...oc.historial].reverse().map((evt, i) => (
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

          {/* Anulación */}
          {oc.estadoDocumento === 'anulado' && oc.motivoAnulacion && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              <strong>Motivo de anulación:</strong> {oc.motivoAnulacion}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
