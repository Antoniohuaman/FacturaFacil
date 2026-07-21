// src/features/gestion-inventario/components/notas-salida/DetalleNotaSalida.tsx

import React, { useState } from 'react';
import {
  X,
  Printer,
  Copy,
  Ban,
  PackageCheck,
  Clock,
  ChevronRight,
  MapPin,
  User,
  Calendar,
  Package,
  DollarSign,
  FileText,
  Truck,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import type { NotaSalida } from '../../models/notaSalida.types';
import { TIPO_SALIDA_LABEL, ESTADO_NS_BADGE } from '../../models/notaSalida.constants';
import { useNotasSalida } from '../../hooks/useNotasSalida';
import { imprimirNotaSalida } from '../../services/notaSalida.print';
import { prepararDuplicadoNS } from '../../services/notaSalida.service';
import { useFeedback } from '../../../../../../shared/feedback';

type Tab = 'general' | 'historial';

interface Props {
  nota: NotaSalida;
  iniciarAnulacion?: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  onEditar?: (nota: NotaSalida) => void;
  onDuplicar?: (copia: NotaSalida) => void;
}

const fmtFecha = (iso?: string): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
};

const fmtDateTime = (iso?: string): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

const MonedaSymbol = ({ m }: { m: string }) => <span>{m === 'USD' ? '$' : 'S/'}</span>;

const DataRow: React.FC<{ label: string; value?: string | React.ReactNode; icon?: React.ReactNode }> = ({
  label,
  value,
  icon,
}) => (
  <div className="flex justify-between items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
    <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 min-w-[120px]">
      {icon}
      {label}
    </span>
    <span className="text-xs font-medium text-gray-800 dark:text-gray-200 text-right break-all">
      {value ?? '—'}
    </span>
  </div>
);

const DetalleNotaSalida: React.FC<Props> = ({ nota, iniciarAnulacion = false, onClose, onRefresh, onEditar, onDuplicar }) => {
  const { anularNS, marcarComoEntregada } = useNotasSalida();
  const feedback = useFeedback();

  const [tab, setTab] = useState<Tab>('general');
  const [mostrandoAnulacion, setMostrandoAnulacion] = useState(iniciarAnulacion);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [anulandoNS, setAnulandoNS] = useState(false);

  const badge = ESTADO_NS_BADGE[nota.estado];
  const tipoLabel = TIPO_SALIDA_LABEL[nota.tipoSalida] ?? nota.tipoSalida;

  const handleImprimir = () => imprimirNotaSalida(nota);

  const handleDuplicar = () => {
    const copia = prepararDuplicadoNS(nota);
    if (onDuplicar) {
      onDuplicar(copia);
    }
  };

  const handleMarcarEntregada = () => {
    feedback.openConfirm({
      title: 'Marcar como entregada',
      message: `¿Confirma que la mercancía de ${nota.numero ?? nota.serie} fue entregada correctamente? Esta acción no puede revertirse (el stock no se verá afectado).`,
      confirmText: 'Sí, marcar como entregada',
    }).then(confirmed => {
      if (confirmed) {
        const ok = marcarComoEntregada(nota.id);
        if (ok) { onRefresh?.(); onClose(); }
      }
    });
  };

  const handleAnular = async () => {
    if (!motivoAnulacion.trim()) {
      feedback.error('Debe especificar el motivo de anulación.');
      return;
    }
    setAnulandoNS(true);
    const ok = await anularNS(nota.id, motivoAnulacion.trim());
    setAnulandoNS(false);
    if (ok) { onRefresh?.(); onClose(); }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-[560px] bg-white dark:bg-gray-900 shadow-2xl flex flex-col h-full overflow-hidden">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-2.5 min-w-0">
            <Package size={16} className="text-orange-500 dark:text-orange-400 flex-shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-gray-900 dark:text-white truncate">
                  {nota.numero ?? `Borrador — ${nota.serie}`}
                </span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                {nota.serie} · {tipoLabel}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-5">
          {(['general', 'historial'] as Tab[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors capitalize ${
                tab === t
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t === 'general' ? 'General' : 'Historial'}
            </button>
          ))}
        </div>

        {/* ── Scrollable content ───────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'general' && (
            <div className="p-5 space-y-5">
              {/* ── Datos del documento ─────────────────────────────── */}
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                  Datos del documento
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-1">
                  <DataRow
                    label="Tipo de salida"
                    value={`${nota.tipoSalida} — ${tipoLabel}`}
                    icon={<Truck size={10} />}
                  />
                  <DataRow
                    label="Fecha documento"
                    value={fmtFecha(nota.fechaDocumento)}
                    icon={<Calendar size={10} />}
                  />
                  {nota.fechaEntregaPrevista && (
                    <DataRow
                      label="Entrega prevista"
                      value={fmtFecha(nota.fechaEntregaPrevista)}
                      icon={<Calendar size={10} />}
                    />
                  )}
                  <DataRow
                    label="Almacén origen"
                    value={nota.almacenOrigenNombre || nota.almacenOrigenId}
                    icon={<MapPin size={10} />}
                  />
                  {nota.metodoEnvio && (
                    <DataRow
                      label="Método de envío"
                      value={nota.metodoEnvio}
                      icon={<Truck size={10} />}
                    />
                  )}
                  <DataRow
                    label="Moneda"
                    value={nota.moneda}
                    icon={<DollarSign size={10} />}
                  />
                  {nota.formaPago && (
                    <DataRow label="Forma de pago" value={nota.formaPago} />
                  )}
                  {nota.encargadoAlmacen && (
                    <DataRow
                      label="Encargado"
                      value={nota.encargadoAlmacen}
                      icon={<User size={10} />}
                    />
                  )}
                  {nota.numeroDocumentoOrigen && (
                    <DataRow
                      label="Doc. origen"
                      value={nota.numeroDocumentoOrigen}
                      icon={<FileText size={10} />}
                    />
                  )}
                  {nota.origen && (
                    <DataRow label="Origen" value={nota.origen} />
                  )}
                </div>
              </section>

              {/* ── Cliente ─────────────────────────────────────────── */}
              {nota.clienteNombre && (
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                    Cliente
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-1">
                    <DataRow
                      label="Razón social"
                      value={nota.clienteNombre}
                      icon={<Building2 size={10} />}
                    />
                    {nota.tipoDocumentoCliente && nota.numeroDocumentoCliente && (
                      <DataRow
                        label={nota.tipoDocumentoCliente}
                        value={nota.numeroDocumentoCliente}
                        icon={<FileText size={10} />}
                      />
                    )}
                    {nota.direccionFacturacion && (
                      <DataRow
                        label="Dir. facturación"
                        value={nota.direccionFacturacion}
                        icon={<MapPin size={10} />}
                      />
                    )}
                    {nota.direccionEnvio && (
                      <DataRow
                        label="Dir. de envío"
                        value={nota.direccionEnvio}
                        icon={<MapPin size={10} />}
                      />
                    )}
                    {nota.contacto && (
                      <DataRow
                        label="Contacto"
                        value={nota.contacto}
                        icon={<User size={10} />}
                      />
                    )}
                  </div>
                </section>
              )}

              {/* ── Productos ───────────────────────────────────────── */}
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                  Productos ({nota.lineas.length})
                </h3>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="min-w-full text-[12px]">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50">
                        <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Producto
                        </th>
                        <th className="text-right px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 w-14">
                          Cant.
                        </th>
                        <th className="text-right px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 w-20">
                          P.V. Unit.
                        </th>
                        <th className="text-right px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 w-20">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {nota.lineas.map(l => (
                        <tr key={l.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-800 dark:text-gray-100 truncate max-w-[160px]" title={l.productoNombre}>
                              {l.productoNombre}
                            </div>
                            {l.productoCodigo && (
                              <div className="text-[10px] text-gray-500 font-mono">{l.productoCodigo}</div>
                            )}
                            {l.almacenNombre && (
                              <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[160px]" title={l.almacenNombre}>
                                {l.almacenNombre}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                            {l.cantidad} {l.unidad}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                            <MonedaSymbol m={nota.moneda} /> {l.pvUnitario.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-white">
                            <MonedaSymbol m={nota.moneda} /> {l.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Totales */}
                  <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 space-y-1">
                    {nota.baseImponible > 0 && (
                      <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
                        <span>Base imponible</span>
                        <span>{nota.moneda} {nota.baseImponible.toFixed(2)}</span>
                      </div>
                    )}
                    {nota.impuesto > 0 && (
                      <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
                        <span>IGV</span>
                        <span>{nota.moneda} {nota.impuesto.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[13px] font-bold text-gray-900 dark:text-white pt-0.5 border-t border-gray-200 dark:border-gray-700">
                      <span>Total</span>
                      <span className="text-orange-600 dark:text-orange-400">
                        {nota.moneda} {nota.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* ── Observaciones ───────────────────────────────────── */}
              {nota.observaciones && (
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                    Observaciones
                  </h3>
                  <p className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2 leading-relaxed">
                    {nota.observaciones}
                  </p>
                </section>
              )}

              {/* ── Motivo de anulación ─────────────────────────────── */}
              {nota.estado === 'Anulada' && nota.motivoAnulacion && (
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-red-400 mb-2">
                    Motivo de anulación
                  </h3>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg px-3 py-2 text-xs text-red-700 dark:text-red-300">
                    <div>{nota.motivoAnulacion}</div>
                    {nota.fechaAnulacion && (
                      <div className="mt-1 text-[10px] text-red-400">
                        {fmtDateTime(nota.fechaAnulacion)} · {nota.usuarioAnulacion ?? nota.usuario}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* ── Aviso Entregada → no se puede anular ─────────────── */}
              {nota.estado === 'Entregada' && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                  <AlertTriangle size={13} className="text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Esta nota ya fue marcada como entregada y no puede anularse. Para gestionar
                    una devolución, contacte a soporte.
                  </p>
                </div>
              )}

              {/* ── Formulario de anulación ──────────────────────────── */}
              {nota.estado === 'Generada' && mostrandoAnulacion && (
                <section className="border border-red-200 dark:border-red-700 rounded-lg p-3 bg-red-50/60 dark:bg-red-900/10 space-y-2">
                  <h3 className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                    <Ban size={12} />
                    Anular nota de salida
                  </h3>
                  <p className="text-[11px] text-red-600 dark:text-red-400">
                    Se repondrá el stock en el almacén de origen de cada línea procesada.
                  </p>
                  <textarea
                    rows={2}
                    maxLength={300}
                    placeholder="Motivo de anulación (obligatorio)..."
                    value={motivoAnulacion}
                    onChange={e => setMotivoAnulacion(e.target.value)}
                    className="w-full text-xs border border-red-200 dark:border-red-600 rounded-lg px-2.5 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-red-400 focus:border-red-400 outline-none resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => { setMostrandoAnulacion(false); setMotivoAnulacion(''); }}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleAnular}
                      disabled={!motivoAnulacion.trim() || anulandoNS}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Ban size={11} />
                      Confirmar anulación
                    </button>
                  </div>
                </section>
              )}
            </div>
          )}

          {tab === 'historial' && (
            <div className="p-5">
              {nota.historial.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                  Sin eventos registrados
                </div>
              ) : (
                <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-3 space-y-0">
                  {[...nota.historial].reverse().map((ev, idx) => (
                    <li key={idx} className="mb-5 ml-4">
                      <span className="absolute -left-[7px] flex items-center justify-center w-3.5 h-3.5 rounded-full bg-orange-100 dark:bg-orange-900/30 ring-4 ring-white dark:ring-gray-900">
                        <Clock size={7} className="text-orange-500 dark:text-orange-400" />
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                          {ev.accion}
                        </span>
                        <ChevronRight size={10} className="text-gray-400" />
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">
                          {fmtDateTime(ev.fecha)}
                        </span>
                      </div>
                      {ev.usuario && (
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                          Por: {ev.usuario}
                        </div>
                      )}
                      {ev.detalle && (
                        <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 rounded px-2 py-1 leading-relaxed">
                          {ev.detalle}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-5 py-3">
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Imprimir — available for all except pure borrador-no-numero */}
            {(nota.estado === 'Generada' || nota.estado === 'Entregada' || nota.estado === 'Anulada') && (
              <button
                type="button"
                onClick={handleImprimir}
                title="Imprimir nota de salida"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Printer size={12} />
                Imprimir
              </button>
            )}

            {/* Duplicar — always available */}
            <button
              type="button"
              onClick={handleDuplicar}
              title="Duplicar como borrador"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Copy size={12} />
              Duplicar
            </button>

            {/* Editar — Borrador only */}
            {nota.estado === 'Borrador' && onEditar && (
              <button
                type="button"
                onClick={() => onEditar(nota)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-700 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
              >
                Editar
              </button>
            )}

            {/* Marcar como entregada — Generada only */}
            {nota.estado === 'Generada' && !mostrandoAnulacion && (
              <button
                type="button"
                onClick={handleMarcarEntregada}
                title="Marcar la mercancía como entregada"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <PackageCheck size={12} />
                Marcar entregada
              </button>
            )}

            {/* Anular — Generada only */}
            {nota.estado === 'Generada' && !mostrandoAnulacion && (
              <button
                type="button"
                onClick={() => setMostrandoAnulacion(true)}
                title="Anular esta nota de salida"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 dark:text-red-400 border border-red-200 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Ban size={12} />
                Anular
              </button>
            )}

            {/* Cerrar */}
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetalleNotaSalida;
