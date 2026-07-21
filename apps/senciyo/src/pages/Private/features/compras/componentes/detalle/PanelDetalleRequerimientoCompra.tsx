import { useState, useEffect, useRef } from 'react';
import { FileText, Clock, Link2, Pencil, XCircle, Trash2, MoreHorizontal, ShoppingCart, Receipt } from 'lucide-react';
import { Drawer } from '@/shared/ui/drawer/Drawer';
import { formatMoney } from '@/shared/currency';
import AdjuntosCompra from '../adjuntos/AdjuntosCompra';
import { CLASIFICACION_LINEA_LABELS } from '../../modelos/LineaCompra';
import {
  calcularEstadoPrincipalRC,
  obtenerDocumentosGeneradosRC,
  puedeEditarRC,
  puedeAnularRC,
  puedeEliminarBorradorRC,
  puedeConvertirRCaOC,
  puedeConvertirRCaCC,
  calcularTotalesLineas,
  formatearEtiquetaImpuesto,
  construirFilasResumenTributarioCompra,
} from '../../logica/reglasCompras';
import { formatearFechaCompra, formatearNumeroCompra, formatearNumeroComprobanteCompra } from '../../utilidades/formatearCompras';
import type { RequerimientoCompra, EstadoPrincipalRC } from '../../modelos/RequerimientoCompra';
import { ESTADO_DOCUMENTO_RC_LABELS } from '../../modelos/RequerimientoCompra';
import { BADGE_ESTADO_PRINCIPAL_RC, ETIQUETA_ESTADO_PRINCIPAL_RC } from '../../constantes/estadosCompras';
import type { OrdenCompra } from '../../modelos/OrdenCompra';
import type { ComprobanteCompra } from '../../modelos/ComprobanteCompra';

interface PanelDetalleRequerimientoCompraProps {
  rc: RequerimientoCompra | null;
  ordenes: OrdenCompra[];
  comprobantes: ComprobanteCompra[];
  onCerrar: () => void;
  onVerOrdenCompra?: (oc: OrdenCompra) => void;
  onVerComprobante?: (cc: ComprobanteCompra) => void;
  onEditar?: (rc: RequerimientoCompra) => void;
  onAnular?: (rc: RequerimientoCompra) => void;
  onGenerarOC?: (rc: RequerimientoCompra) => void;
  onGenerarCC?: (rc: RequerimientoCompra) => void;
  onEliminarBorrador?: (rc: RequerimientoCompra) => void;
}

type TabRC = 'general' | 'historial' | 'relacionados';

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

function BotonEncabezado({
  icon: Icon,
  texto,
  label,
  onClick,
  danger,
}: {
  icon: typeof FileText;
  texto: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
      }`}
    >
      <Icon size={14} /> {texto}
    </button>
  );
}

function ItemMenuAccion({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof FileText;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

export default function PanelDetalleRequerimientoCompra({
  rc,
  ordenes,
  comprobantes,
  onCerrar,
  onVerOrdenCompra,
  onVerComprobante,
  onEditar,
  onAnular,
  onGenerarOC,
  onGenerarCC,
  onEliminarBorrador,
}: PanelDetalleRequerimientoCompraProps) {
  const [tabActivo, setTabActivo] = useState<TabRC>('general');
  const [menuAccionesAbierto, setMenuAccionesAbierto] = useState(false);
  const menuAccionesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickFuera(e: MouseEvent) {
      if (menuAccionesRef.current && !menuAccionesRef.current.contains(e.target as Node)) {
        setMenuAccionesAbierto(false);
      }
    }
    if (menuAccionesAbierto) {
      document.addEventListener('mousedown', handleClickFuera);
      return () => document.removeEventListener('mousedown', handleClickFuera);
    }
  }, [menuAccionesAbierto]);

  const TABS: { id: TabRC; label: string; icon: typeof FileText }[] = [
    { id: 'general', label: 'General', icon: FileText },
    { id: 'relacionados', label: 'Documentos relacionados', icon: Link2 },
    { id: 'historial', label: 'Historial', icon: Clock },
  ];

  const documentosGenerados = rc ? obtenerDocumentosGeneradosRC(rc, ordenes, comprobantes) : [];
  const totalesDocumento = rc ? calcularTotalesLineas(rc.lineas) : null;

  const titulo = rc ? (
    <div className="flex min-w-0 items-center gap-2">
      <FileText size={18} className="text-blue-600 shrink-0" />
      {rc.correlativo ? (
        <span className="min-w-0 truncate font-mono font-semibold text-gray-900">
          {formatearNumeroCompra(rc.serie, rc.correlativo)}
        </span>
      ) : (
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="shrink-0 font-mono font-semibold text-gray-900">{rc.serie}</span>
          <span className="min-w-0 truncate text-xs text-gray-400">sin correlativo</span>
        </span>
      )}
    </div>
  ) : null;

  const subtitulo = rc ? (
    <div className="flex flex-wrap gap-1 mt-1">
      <BadgeEstado
        estado={calcularEstadoPrincipalRC(rc, ordenes, comprobantes)}
        labels={ETIQUETA_ESTADO_PRINCIPAL_RC as unknown as Record<string, string>}
        clases={BADGE_ESTADO_PRINCIPAL_RC as unknown as Record<string, string>}
      />
    </div>
  ) : null;

  const estadoRC = rc ? calcularEstadoPrincipalRC(rc, ordenes, comprobantes) : null;

  function construirAccionesHeaderRC(
    rcActual: RequerimientoCompra,
    estado: EstadoPrincipalRC,
  ): { visibles: React.ReactNode[]; menu: React.ReactNode[] } {
    const visibles: React.ReactNode[] = [];
    const menu: React.ReactNode[] = [];

    const agregarEditarVisible = () => {
      if (onEditar && puedeEditarRC(rcActual, ordenes, comprobantes)) {
        visibles.push(
          <BotonEncabezado key="editar" icon={Pencil} texto="Editar" label="Editar requerimiento de compra" onClick={() => { onCerrar(); onEditar(rcActual); }} />,
        );
      }
    };
    const agregarAnularMenu = () => {
      if (onAnular && puedeAnularRC(rcActual, ordenes, comprobantes)) {
        menu.push(<ItemMenuAccion key="anular" icon={XCircle} label="Anular requerimiento de compra" onClick={() => onAnular(rcActual)} danger />);
      }
    };

    switch (estado) {
      case 'Borrador':
        agregarEditarVisible();
        if (onEliminarBorrador && puedeEliminarBorradorRC(rcActual, ordenes, comprobantes)) {
          menu.push(<ItemMenuAccion key="eliminar" icon={Trash2} label="Eliminar borrador" onClick={() => onEliminarBorrador(rcActual)} danger />);
        }
        break;
      case 'Pendiente':
        agregarEditarVisible();
        if (onGenerarOC && puedeConvertirRCaOC(rcActual, ordenes, comprobantes)) {
          visibles.push(
            <BotonEncabezado key="generar-oc" icon={ShoppingCart} texto="Generar OC" label="Generar orden de compra" onClick={() => onGenerarOC(rcActual)} />,
          );
        }
        if (onGenerarCC && puedeConvertirRCaCC(rcActual, ordenes, comprobantes)) {
          menu.push(<ItemMenuAccion key="generar-cc" icon={Receipt} label="Generar comprobante de compra" onClick={() => onGenerarCC(rcActual)} />);
        }
        agregarAnularMenu();
        break;
      default:
        break;
    }

    return { visibles, menu };
  }

  const { visibles: accionesVisibles, menu: accionesMenu } =
    rc && estadoRC ? construirAccionesHeaderRC(rc, estadoRC) : { visibles: [], menu: [] };

  const accionesEncabezado = rc ? (
    <div className="flex shrink-0 items-center gap-1">
      {accionesVisibles}
      {accionesMenu.length > 0 && (
        <div className="relative" ref={menuAccionesRef}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuAccionesAbierto((v) => !v); }}
            title="Más acciones"
            aria-label="Más acciones"
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <MoreHorizontal size={16} />
          </button>
          {menuAccionesAbierto && (
            <div
              className="absolute right-0 z-10 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
              onClick={(e) => { e.stopPropagation(); setMenuAccionesAbierto(false); }}
            >
              {accionesMenu}
            </div>
          )}
        </div>
      )}
    </div>
  ) : null;

  return (
    <Drawer
      abierto={rc !== null}
      alCerrar={onCerrar}
      titulo={titulo}
      subtitulo={subtitulo}
      accionesEncabezado={accionesEncabezado}
      tamano="lg"
    >
      {rc && (
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
                <Seccion titulo="Solicitante">
                  <Campo label="Solicitante" valor={rc.solicitanteNombre} />
                  <Campo label="Fecha de solicitud" valor={formatearFechaCompra(rc.fechaSolicitud)} />
                  {rc.fechaRequerida && <Campo label="Fecha requerida" valor={formatearFechaCompra(rc.fechaRequerida)} />}
                </Seccion>

                <Seccion titulo="Proveedor">
                  {rc.proveedorNombre ? (
                    <>
                      <Campo label="Nombre" valor={rc.proveedorNombre} />
                      {rc.proveedorNumeroDocumento && (
                        <Campo
                          label="Documento"
                          valor={`${rc.proveedorTipoDocumento === '6' ? 'RUC' : 'DOC'} ${rc.proveedorNumeroDocumento}`}
                        />
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 py-2">Sin proveedor asignado todavía.</p>
                  )}
                </Seccion>

                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    Ítems ({rc.lineas.length})
                  </h3>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 text-xs">Descripción</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 text-xs">Clasificación</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 text-xs">Cant.</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 text-xs">Precio ref.</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 text-xs">Impuesto</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 text-xs">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {rc.lineas.map((linea) => (
                          <tr key={linea.id}>
                            <td className="px-3 py-2">
                              <div className="font-medium text-gray-900">{linea.nombreProducto}</div>
                              <div className="text-xs text-gray-400">
                                {linea.unidadMedida}
                                {linea.codigoProducto && ` · ${linea.codigoProducto}`}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-600">
                              {CLASIFICACION_LINEA_LABELS[linea.clasificacion]}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-gray-700">
                              {linea.cantidadSolicitada}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-gray-700">
                              {formatMoney(linea.costoUnitario, rc.moneda)}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-600">
                              {formatearEtiquetaImpuesto(linea.tipoAfectacion, linea.tasaIgv ?? 0)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-medium text-gray-900">
                              {formatMoney(linea.total, rc.moneda)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <Seccion titulo="Totales referenciales">
                  {construirFilasResumenTributarioCompra(totalesDocumento!).map((fila) => (
                    <Campo key={fila.clave} label={fila.etiqueta} valor={formatMoney(fila.monto, rc.moneda)} />
                  ))}
                  {totalesDocumento!.descuentoTotal > 0 && (
                    <Campo label="Descuentos" valor={`-${formatMoney(totalesDocumento!.descuentoTotal, rc.moneda)}`} />
                  )}
                  <Campo
                    label="Total referencial"
                    valor={
                      <span className="font-semibold text-gray-900 font-mono">
                        {formatMoney(totalesDocumento!.total, rc.moneda)}
                      </span>
                    }
                  />
                </Seccion>

                {rc.observaciones && (
                  <Seccion titulo="Observaciones">
                    <p className="text-sm text-gray-700 py-2">{rc.observaciones}</p>
                  </Seccion>
                )}

                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    Adjuntos ({rc.adjuntos?.length ?? 0})
                  </h3>
                  <AdjuntosCompra adjuntos={rc.adjuntos ?? []} tiposPermitidos={[]} />
                </div>

                <Seccion titulo="Estado del documento">
                  <Campo label="Documento" valor={ESTADO_DOCUMENTO_RC_LABELS[rc.estadoDocumento]} />
                </Seccion>

                {rc.estadoDocumento === 'anulado' && rc.motivoAnulacion && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                    <strong>Motivo de anulación:</strong> {rc.motivoAnulacion}
                  </div>
                )}
              </>
            )}

            {tabActivo === 'relacionados' && (
              <Seccion titulo="Documentos generados">
                {documentosGenerados.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">Aún no se generó ningún documento desde este requerimiento.</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {documentosGenerados.map((rel) => (
                      <button
                        key={rel.documento.id}
                        type="button"
                        onClick={() =>
                          rel.tipo === 'orden_compra' ? onVerOrdenCompra?.(rel.documento) : onVerComprobante?.(rel.documento)
                        }
                        disabled={rel.tipo === 'orden_compra' ? !onVerOrdenCompra : !onVerComprobante}
                        className="w-full flex justify-between items-center py-2 text-left disabled:cursor-default"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                            {rel.tipo === 'orden_compra' ? 'OC' : 'CC'}
                          </span>
                          <span className="text-sm text-gray-900 font-mono">
                            {rel.tipo === 'orden_compra'
                              ? formatearNumeroCompra(rel.documento.serie, rel.documento.correlativo || undefined)
                              : formatearNumeroComprobanteCompra(rel.documento)}
                          </span>
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatMoney(rel.documento.totales.total, rel.documento.moneda)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </Seccion>
            )}

            {tabActivo === 'historial' && (
              <>
                {rc.historial.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Sin eventos registrados.</p>
                ) : (
                  <div className="relative pl-5 space-y-4">
                    <div className="absolute left-1.5 top-0 bottom-0 w-0.5 bg-gray-200" />
                    {[...rc.historial].reverse().map((evt, i) => (
                      <div key={i} className="relative flex gap-3">
                        <div className="absolute -left-3.5 w-3 h-3 rounded-full bg-white border-2 border-blue-400 mt-1" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-gray-700">{evt.accion}</span>
                            {evt.usuario && <span className="text-xs text-gray-500">por {evt.usuario}</span>}
                          </div>
                          <p className="text-xs text-gray-400">
                            {formatearFechaCompra(evt.fecha)} {evt.fecha.split('T')[1]?.slice(0, 5) ?? ''}
                          </p>
                          {evt.detalle && <p className="text-xs text-gray-600 mt-0.5">{evt.detalle}</p>}
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
