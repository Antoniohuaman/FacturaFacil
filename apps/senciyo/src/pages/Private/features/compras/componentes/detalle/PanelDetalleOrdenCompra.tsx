import { useState } from 'react';
import { FileText, Clock, Link2 } from 'lucide-react';
import { Drawer } from '@/shared/ui/drawer/Drawer';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import { CreditInstallmentsTable } from '@/shared/payments/CreditInstallmentsTable';
import AdjuntosCompra from '../adjuntos/AdjuntosCompra';
import { CLASIFICACION_LINEA_LABELS } from '../../modelos/LineaCompra';
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
import type { ComprobanteCompra } from '../../modelos/ComprobanteCompra';

interface PanelDetalleOrdenCompraProps {
  oc: OrdenCompra | null;
  comprobantes: ComprobanteCompra[];
  onCerrar: () => void;
  onVerComprobante?: (cc: ComprobanteCompra) => void;
}

type TabOC = 'general' | 'historial' | 'relacionados';

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

export default function PanelDetalleOrdenCompra({
  oc,
  comprobantes,
  onCerrar,
  onVerComprobante,
}: PanelDetalleOrdenCompraProps) {
  const { state: config } = useConfigurationContext();
  const [tabActivo, setTabActivo] = useState<TabOC>('general');

  const igvDefault = config.taxes.find((t) => t.isDefault && t.isActive);
  const igvLabel = igvDefault ? `IGV (${igvDefault.rate}%):` : 'IGV:';

  const TABS: { id: TabOC; label: string; icon: typeof FileText }[] = [
    { id: 'general', label: 'General', icon: FileText },
    { id: 'relacionados', label: 'Documentos relacionados', icon: Link2 },
    { id: 'historial', label: 'Historial', icon: Clock },
  ];

  const comprobantesGenerados = oc ? comprobantes.filter((c) => c.ordenCompraOrigenId === oc.id) : [];

  const titulo = oc ? (
    <div className="flex items-center gap-2">
      <FileText size={18} className="text-blue-600 shrink-0" />
      <span className="font-mono font-semibold text-gray-900">{oc.numero}</span>
    </div>
  ) : null;

  const subtitulo = oc ? (
    <div className="flex flex-wrap gap-1 mt-1">
      <BadgeEstado estado={oc.estadoDocumento} labels={ESTADO_DOCUMENTO_OC_LABELS} clases={BADGE_ESTADO_DOCUMENTO_OC} />
      {oc.requiereAprobacion && (
        <BadgeEstado estado={oc.estadoAprobacion} labels={ESTADO_APROBACION_OC_LABELS} clases={BADGE_ESTADO_APROBACION_OC} />
      )}
      <BadgeEstado estado={oc.estadoRecepcion} labels={ESTADO_RECEPCION_OC_LABELS} clases={BADGE_ESTADO_RECEPCION_OC} />
      <BadgeEstado estado={oc.estadoFacturacion} labels={ESTADO_FACTURACION_OC_LABELS} clases={BADGE_ESTADO_FACTURACION_OC} />
      <BadgeEstado estado={oc.estadoInventario} labels={ESTADO_INVENTARIO_OC_LABELS} clases={BADGE_ESTADO_INVENTARIO_OC} />
    </div>
  ) : null;

  return (
    <Drawer
      abierto={oc !== null}
      alCerrar={onCerrar}
      titulo={titulo}
      subtitulo={subtitulo}
      tamano="lg"
    >
      {oc && (
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
                <Seccion titulo="Proveedor">
                  <Campo label="Nombre" valor={oc.proveedorNombre} />
                  <Campo
                    label="Documento"
                    valor={`${oc.proveedorTipoDocumento === '6' ? 'RUC' : 'DOC'} ${oc.proveedorNumeroDocumento}`}
                  />
                  {oc.proveedorDireccionFacturacion && (
                    <Campo label="Dirección facturación" valor={oc.proveedorDireccionFacturacion} />
                  )}
                  {oc.proveedorDireccionEntrega && (
                    <Campo label="Dirección entrega" valor={oc.proveedorDireccionEntrega} />
                  )}
                </Seccion>

                <Seccion titulo="Datos y condiciones de la orden">
                  <Campo label="Comprador" valor={oc.compradorNombre} />
                  <Campo label="Fecha emisión" valor={oc.fechaEmision} />
                  {oc.fechaVencimiento && <Campo label="Vencimiento" valor={oc.fechaVencimiento} />}
                  <Campo label="Moneda" valor={oc.moneda} />
                  {oc.tipoCambio && <Campo label="Tipo de cambio" valor={oc.tipoCambio.toFixed(3)} />}
                  {oc.condicionesPago && (
                    <Campo label="Condiciones" valor={oc.condicionesPago} />
                  )}
                  {oc.centroCosto && <Campo label="Centro de costo" valor={oc.centroCosto} />}
                  {oc.presupuesto && <Campo label="Presupuesto" valor={oc.presupuesto} />}
                </Seccion>

                <Seccion titulo="Forma de pago">
                  <Campo
                    label="Forma de pago"
                    valor={oc.formaPago === 'contado' ? 'Contado' : 'Crédito'}
                  />
                </Seccion>

                {oc.formaPago === 'credito' && oc.creditTerms && oc.creditTerms.schedule.length > 0 && (
                  <Seccion titulo="Cronograma de crédito">
                    <div className="py-2">
                      <CreditInstallmentsTable
                        installments={oc.creditTerms.schedule}
                        currency={oc.moneda}
                        mode="readonly"
                        compact
                      />
                    </div>
                  </Seccion>
                )}

                {oc.fechaEntregaEsperada && (
                  <Seccion titulo="Datos de entrega">
                    <Campo label="Entrega esperada" valor={oc.fechaEntregaEsperada} />
                  </Seccion>
                )}

                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    Ítems ({oc.lineas.length})
                  </h3>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 text-xs">Descripción</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 text-xs">Clasificación</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 text-xs">Almacén</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 text-xs">Cant.</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 text-xs">Costo</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 text-xs">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {oc.lineas.map((linea) => (
                          <tr key={linea.id}>
                            <td className="px-3 py-2">
                              <div className="font-medium text-gray-900">{linea.nombreProducto}</div>
                              <div className="text-xs text-gray-400">
                                {linea.unidadMedida}
                                {linea.codigoProducto && ` · ${linea.codigoProducto}`}
                                {(linea.descuentoUnitario ?? 0) > 0 && ` · desc. ${linea.descuentoUnitario!.toFixed(2)}`}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-600">
                              {CLASIFICACION_LINEA_LABELS[linea.clasificacion]}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-600">
                              {linea.afectaInventario ? (linea.almacenDestinoNombre ?? '—') : 'No aplica'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-gray-700">
                              {linea.cantidadSolicitada}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-gray-700">
                              {linea.costoUnitario.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-medium text-gray-900">
                              {linea.total.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <Seccion titulo="Totales">
                  <Campo
                    label="Subtotal gravado"
                    valor={`${oc.totales.subtotal.toFixed(2)} ${oc.moneda}`}
                  />
                  {oc.totales.subtotalExonerado > 0 && (
                    <Campo
                      label="Subtotal exonerado"
                      valor={`${oc.totales.subtotalExonerado.toFixed(2)} ${oc.moneda}`}
                    />
                  )}
                  {oc.totales.subtotalInafecto > 0 && (
                    <Campo
                      label="Subtotal inafecto"
                      valor={`${oc.totales.subtotalInafecto.toFixed(2)} ${oc.moneda}`}
                    />
                  )}
                  {oc.totales.descuentoTotal > 0 && (
                    <Campo
                      label="Descuentos"
                      valor={`-${oc.totales.descuentoTotal.toFixed(2)} ${oc.moneda}`}
                    />
                  )}
                  <Campo label={igvLabel} valor={`${oc.totales.igv.toFixed(2)} ${oc.moneda}`} />
                  <Campo
                    label="Total"
                    valor={
                      <span className="font-semibold text-gray-900 font-mono">
                        {oc.totales.total.toFixed(2)} {oc.moneda}
                      </span>
                    }
                  />
                </Seccion>

                {oc.observaciones && (
                  <Seccion titulo="Observaciones">
                    <p className="text-sm text-gray-700 py-2">{oc.observaciones}</p>
                  </Seccion>
                )}

                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    Adjuntos ({oc.adjuntos?.length ?? 0})
                  </h3>
                  <AdjuntosCompra adjuntos={oc.adjuntos ?? []} tiposPermitidos={[]} />
                </div>

                <Seccion titulo="Estados operativos">
                  <Campo label="Documento" valor={ESTADO_DOCUMENTO_OC_LABELS[oc.estadoDocumento]} />
                  {oc.requiereAprobacion && (
                    <Campo label="Aprobación" valor={ESTADO_APROBACION_OC_LABELS[oc.estadoAprobacion]} />
                  )}
                  {oc.aprobadoPor && <Campo label="Aprobado por" valor={oc.aprobadoPor} />}
                  {oc.rechazadoPor && <Campo label="Rechazado por" valor={oc.rechazadoPor} />}
                  {oc.motivoRechazo && <Campo label="Motivo de rechazo" valor={oc.motivoRechazo} />}
                  <Campo label="Recepción" valor={ESTADO_RECEPCION_OC_LABELS[oc.estadoRecepcion]} />
                  <Campo label="Facturación" valor={ESTADO_FACTURACION_OC_LABELS[oc.estadoFacturacion]} />
                  <Campo label="Inventario" valor={ESTADO_INVENTARIO_OC_LABELS[oc.estadoInventario]} />
                </Seccion>

                {oc.estadoDocumento === 'anulado' && oc.motivoAnulacion && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                    <strong>Motivo de anulación:</strong> {oc.motivoAnulacion}
                  </div>
                )}
              </>
            )}

            {tabActivo === 'relacionados' && (
              <>
                <Seccion titulo="Comprobantes de compra generados">
                  {comprobantesGenerados.length === 0 ? (
                    <p className="text-sm text-gray-400 py-2">Aún no se generó ningún comprobante desde esta orden.</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {comprobantesGenerados.map((cc) => (
                        <button
                          key={cc.id}
                          type="button"
                          onClick={() => onVerComprobante?.(cc)}
                          disabled={!onVerComprobante}
                          className="w-full flex justify-between items-center py-2 text-left disabled:cursor-default"
                        >
                          <span className="text-sm text-gray-900 font-mono">
                            {cc.serieProveedor}-{cc.numeroProveedor}
                          </span>
                          <span className="text-sm text-gray-500">
                            {cc.totales.total.toFixed(2)} {cc.moneda}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </Seccion>

                {oc.notasIngresoRelacionadas && oc.notasIngresoRelacionadas.length > 0 && (
                  <Seccion titulo="Notas de ingreso">
                    <Campo label="Notas de ingreso vinculadas" valor={oc.notasIngresoRelacionadas.length} />
                  </Seccion>
                )}
              </>
            )}

            {tabActivo === 'historial' && (
              <>
                {oc.historial.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Sin eventos registrados.</p>
                ) : (
                  <div className="relative pl-5 space-y-4">
                    <div className="absolute left-1.5 top-0 bottom-0 w-0.5 bg-gray-200" />
                    {[...oc.historial].reverse().map((evt, i) => (
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
