// src/features/gestion-inventario/components/notas-ingreso/DetalleNotaIngreso.tsx

import React, { useState } from 'react';
import { X, Printer, Copy, AlertTriangle, Clock, Package } from 'lucide-react';
import type { NotaIngreso } from '../../models/notaIngreso.types';
import { TIPO_INGRESO_LABEL, ESTADO_NI_BADGE } from '../../models/notaIngreso.constants';
import { useNotasIngreso } from '../../hooks/useNotasIngreso';
import { imprimirNotaIngreso } from '../../services/notaIngreso.print';

type Tab = 'general' | 'historial';

interface Props {
  nota: NotaIngreso;
  onClose: () => void;
  onRefresh: () => void;
  onDuplicar?: (nota: NotaIngreso) => void;
}

const fmtFecha = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return iso;
  }
};

const fmtFechaHora = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

const DOC_ORIGEN_LABEL: Record<string, string> = {
  '01': 'Factura', '03': 'Boleta', '52': 'Liq. compra', '91': 'Comp. operaciones',
};

const DetalleNotaIngreso: React.FC<Props> = ({ nota, onClose, onRefresh, onDuplicar }) => {
  const { anularNI, duplicarNI } = useNotasIngreso();
  const [tab, setTab] = useState<Tab>('general');
  const [mostrarAnulacion, setMostrarAnulacion] = useState(false);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [anulando, setAnulando] = useState(false);

  const badge = ESTADO_NI_BADGE[nota.estado] ?? ESTADO_NI_BADGE['Borrador'];

  const handleAnular = () => {
    if (!motivoAnulacion.trim()) return;
    setAnulando(true);
    const ok = anularNI(nota.id, motivoAnulacion);
    setAnulando(false);
    if (ok) { onRefresh(); onClose(); }
  };

  const handleDuplicar = () => {
    const nueva = duplicarNI(nota.id);
    if (nueva && onDuplicar) onDuplicar(nueva);
  };

  const puedeImprimir = nota.estado === 'Generada' || nota.estado === 'Anulada';
  const puedeAnular = nota.estado === 'Generada';

  // Totals helper — recompute from lines when available
  const baseImponible = nota.baseImponible;
  const igv = nota.impuesto;
  const noGravados = nota.noGravados;

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="relative z-10 flex h-full w-full max-w-[560px] flex-col bg-white dark:bg-gray-900 border-l border-slate-200 dark:border-slate-700 shadow-2xl">

        {/* Header */}
        <div className="flex-shrink-0 flex items-start justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Package size={16} className="text-teal-600 dark:text-teal-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                  Nota de Ingreso
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight mt-0.5">
                {nota.numero ?? `Borrador — ${nota.serie}`}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                {TIPO_INGRESO_LABEL[nota.tipoIngreso] ?? nota.tipoIngreso}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 flex border-b border-slate-200 dark:border-slate-700 px-5 gap-1">
          {(['general', 'historial'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2.5 text-[13px] font-medium capitalize border-b-2 transition-colors ${
                tab === t
                  ? 'border-violet-600 text-violet-600 dark:text-violet-400 dark:border-violet-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t === 'general' ? 'General' : 'Historial'}
              {t === 'historial' && nota.historial.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                  {nota.historial.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'general' ? (
            <div className="px-5 py-4 space-y-5">
              {/* Datos del documento */}
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3">
                  Datos del documento
                </h3>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400 text-xs">Fecha documento</dt>
                    <dd className="font-medium text-gray-900 dark:text-white mt-0.5">{fmtFecha(nota.fechaDocumento)}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400 text-xs">Fecha ingreso almacén</dt>
                    <dd className="font-medium text-gray-900 dark:text-white mt-0.5">{fmtFecha(nota.fechaIngresoAlmacen)}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400 text-xs">Almacén destino</dt>
                    <dd className="font-medium text-gray-900 dark:text-white mt-0.5">{nota.almacenDestinoNombre || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400 text-xs">Moneda</dt>
                    <dd className="font-medium text-gray-900 dark:text-white mt-0.5">{nota.moneda}</dd>
                  </div>
                </dl>
              </section>

              {/* Proveedor */}
              {nota.proveedorNombre && (
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3">
                    Proveedor
                  </h3>
                  <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 rounded-lg px-3 py-2.5">
                    <div className="font-semibold text-sm text-gray-900 dark:text-white">
                      {nota.proveedorNombre}
                    </div>
                    {nota.numeroDocumentoProveedor && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {nota.tipoDocumentoProveedor ?? 'RUC'}: {nota.numeroDocumentoProveedor}
                      </div>
                    )}
                    {nota.direccionProveedor && (
                      <div className="text-xs text-gray-400 mt-0.5 truncate">{nota.direccionProveedor}</div>
                    )}
                  </div>
                </section>
              )}

              {/* Referencias */}
              {(nota.documentoOrigen || nota.guiaRemision || nota.observaciones) && (
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3">
                    Referencias
                  </h3>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    {nota.documentoOrigen && (
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400 text-xs">Doc. referencia</dt>
                        <dd className="font-medium text-gray-900 dark:text-white mt-0.5">
                          {DOC_ORIGEN_LABEL[nota.documentoOrigen] ?? nota.documentoOrigen}
                          {nota.numeroDocumentoOrigen ? `: ${nota.numeroDocumentoOrigen}` : ''}
                        </dd>
                      </div>
                    )}
                    {nota.guiaRemision && (
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400 text-xs">Guía de remisión</dt>
                        <dd className="font-medium text-gray-900 dark:text-white mt-0.5">{nota.guiaRemision}</dd>
                      </div>
                    )}
                    {nota.observaciones && (
                      <div className="col-span-2">
                        <dt className="text-gray-500 dark:text-gray-400 text-xs">Observaciones</dt>
                        <dd className="text-gray-700 dark:text-gray-300 mt-0.5">{nota.observaciones}</dd>
                      </div>
                    )}
                  </dl>
                </section>
              )}

              {/* Productos */}
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3">
                  Productos ({nota.lineas.length})
                </h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                  <table className="min-w-full text-[12px]">
                    <thead className="bg-slate-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Producto</th>
                        <th className="text-right px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Cant.</th>
                        <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Unid.</th>
                        <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Imp.</th>
                        <th className="text-right px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Costo</th>
                        <th className="text-right px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {nota.lineas.map(l => (
                        <tr key={l.id} className="hover:bg-slate-50/70 dark:hover:bg-gray-700/30">
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-900 dark:text-white truncate max-w-[160px]">{l.productoNombre}</div>
                            {l.productoCodigo && <div className="text-[10px] text-gray-500 font-mono">{l.productoCodigo}</div>}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{l.cantidad}</td>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{l.unidad}</td>
                          <td className="px-3 py-2">
                            {l.impuesto ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                                {l.impuesto}
                              </span>
                            ) : <span className="text-[10px] text-gray-400">—</span>}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{l.costoUnitario.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-white">{l.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totales */}
                <div className="flex justify-end mt-3">
                  <div className="space-y-1 min-w-[220px] text-[12px]">
                    {baseImponible > 0 && (
                      <div className="flex justify-between gap-6 text-gray-500 dark:text-gray-400">
                        <span>Op. gravadas</span>
                        <span>{nota.moneda} {baseImponible.toFixed(2)}</span>
                      </div>
                    )}
                    {igv > 0 && (
                      <div className="flex justify-between gap-6 text-gray-500 dark:text-gray-400">
                        <span>IGV</span>
                        <span>{nota.moneda} {igv.toFixed(2)}</span>
                      </div>
                    )}
                    {noGravados > 0 && (
                      <div className="flex justify-between gap-6 text-gray-500 dark:text-gray-400">
                        <span>Op. exoneradas / inafectas</span>
                        <span>{nota.moneda} {noGravados.toFixed(2)}</span>
                      </div>
                    )}
                    {nota.descuentos > 0 && (
                      <div className="flex justify-between gap-6 text-red-500">
                        <span>Descuentos</span>
                        <span>-{nota.descuentos.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-6 font-bold border-t border-slate-200 dark:border-slate-600 pt-1.5">
                      <span className="text-gray-900 dark:text-white">Total {nota.moneda}</span>
                      <span className="text-violet-600 dark:text-violet-400">{nota.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Anulación inline form */}
              {mostrarAnulacion && (
                <section>
                  <div className="border border-red-200 dark:border-red-700 rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle size={15} className="text-red-600 dark:text-red-400" />
                      <span className="text-sm font-semibold text-red-700 dark:text-red-400">Confirmar anulación</span>
                    </div>
                    <p className="text-xs text-red-600 dark:text-red-400 mb-3">
                      Esta acción revertirá el stock de {nota.lineas.length} producto(s) en el almacén destino.
                    </p>
                    <input
                      type="text"
                      value={motivoAnulacion}
                      onChange={e => setMotivoAnulacion(e.target.value)}
                      placeholder="Motivo de anulación (obligatorio)"
                      autoFocus
                      className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400 mb-3"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleAnular}
                        disabled={!motivoAnulacion.trim() || anulando}
                        className="px-4 py-1.5 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                      >
                        {anulando ? 'Anulando...' : 'Confirmar anulación'}
                      </button>
                      <button
                        onClick={() => { setMostrarAnulacion(false); setMotivoAnulacion(''); }}
                        className="px-4 py-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* Motivo anulación (display when anulada) */}
              {nota.estado === 'Anulada' && nota.motivoAnulacion && (
                <section>
                  <div className="border border-red-200 dark:border-red-700 rounded-lg px-3 py-2.5 bg-red-50/50 dark:bg-red-900/10">
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400">Motivo anulación: </span>
                    <span className="text-xs text-red-700 dark:text-red-300">{nota.motivoAnulacion}</span>
                    {nota.fechaAnulacion && (
                      <div className="text-[10px] text-gray-400 mt-0.5">{fmtFechaHora(nota.fechaAnulacion)}</div>
                    )}
                  </div>
                </section>
              )}
            </div>
          ) : (
            // Historial tab
            <div className="px-5 py-4">
              {nota.historial.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-600">
                  <Clock size={28} className="mb-2 opacity-40" />
                  <p className="text-sm">Sin eventos de historial</p>
                </div>
              ) : (
                <ol className="relative border-l border-slate-200 dark:border-slate-700 ml-2 space-y-4">
                  {[...nota.historial].reverse().map((ev, i) => (
                    <li key={i} className="ml-4">
                      <div className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 bg-slate-400 dark:bg-slate-500" />
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{ev.accion}</span>
                          {ev.detalle && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ev.detalle}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          {ev.usuario && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">{ev.usuario}</div>
                          )}
                          <div className="text-[11px] text-gray-400">{fmtFechaHora(ev.fecha)}</div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-between gap-3 px-5 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900">
          {/* Left: state-specific actions */}
          <div className="flex items-center gap-2">
            {puedeImprimir && (
              <button
                onClick={() => imprimirNotaIngreso(nota)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Printer size={12} />
                Imprimir
              </button>
            )}
            <button
              onClick={handleDuplicar}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Copy size={12} />
              Duplicar
            </button>
            {puedeAnular && !mostrarAnulacion && (
              <button
                onClick={() => setMostrarAnulacion(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <AlertTriangle size={12} />
                Anular NI
              </button>
            )}
          </div>

          {/* Right: close */}
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetalleNotaIngreso;
