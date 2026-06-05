// src/features/gestion-inventario/components/notas-ingreso/DetalleNotaIngreso.tsx

import React, { useState } from 'react';
import { X, Package } from 'lucide-react';
import type { NotaIngreso } from '../../models/notaIngreso.types';
import { TIPO_INGRESO_LABEL, ESTADO_NI_BADGE } from '../../models/notaIngreso.constants';
import { useNotasIngreso } from '../../hooks/useNotasIngreso';

interface Props {
  nota: NotaIngreso;
  onClose: () => void;
  onRefresh: () => void;
}

const DetalleNotaIngreso: React.FC<Props> = ({ nota, onClose, onRefresh }) => {
  const { anularNI } = useNotasIngreso();
  const [mostrarConfAnulacion, setMostrarConfAnulacion] = useState(false);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [anulando, setAnulando] = useState(false);

  const badge = ESTADO_NI_BADGE[nota.estado] ?? ESTADO_NI_BADGE['Borrador'];

  const handleAnular = () => {
    if (!motivoAnulacion.trim()) return;
    setAnulando(true);
    const ok = anularNI(nota.id, motivoAnulacion);
    setAnulando(false);
    if (ok) {
      onRefresh();
      onClose();
    }
  };

  const formatFecha = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('es-PE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-[#6F36FF]" />
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {nota.numero ?? `Borrador — ${nota.serie}`}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {TIPO_INGRESO_LABEL[nota.tipoIngreso] ?? nota.tipoIngreso}
              </p>
            </div>
            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Datos generales */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Fecha documento:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">{formatFecha(nota.fechaDocumento)}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Fecha ingreso almacén:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">{formatFecha(nota.fechaIngresoAlmacen)}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Almacén destino:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">{nota.almacenDestinoNombre}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Moneda:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">{nota.moneda}</span>
            </div>
            {nota.proveedorNombre && (
              <>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Proveedor:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">{nota.proveedorNombre}</span>
                </div>
                {nota.numeroDocumentoProveedor && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{nota.tipoDocumentoProveedor ?? 'RUC'}:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">{nota.numeroDocumentoProveedor}</span>
                  </div>
                )}
              </>
            )}
            {nota.documentoOrigen && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Doc. referencia:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{nota.documentoOrigen} {nota.numeroDocumentoOrigen}</span>
              </div>
            )}
            {nota.guiaRemision && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Guía de remisión:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{nota.guiaRemision}</span>
              </div>
            )}
            {nota.observaciones && (
              <div className="col-span-2">
                <span className="text-gray-500 dark:text-gray-400">Observaciones:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">{nota.observaciones}</span>
              </div>
            )}
          </div>

          {/* Líneas */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Productos</h3>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Código</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Descripción</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Cant.</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Unidad</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Costo unit.</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {nota.lineas.map(l => (
                    <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400 font-mono text-xs">{l.productoCodigo}</td>
                      <td className="px-3 py-2 text-gray-900 dark:text-white">{l.productoNombre}</td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{l.cantidad}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{l.unidad}</td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{l.costoUnitario.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">{l.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totales */}
          <div className="flex justify-end">
            <div className="space-y-1 text-sm min-w-[220px]">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Base imponible</span>
                <span className="text-gray-900 dark:text-white">{nota.baseImponible.toFixed(2)}</span>
              </div>
              {nota.descuentos > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Descuentos</span>
                  <span className="text-red-600">-{nota.descuentos.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">IGV (18%)</span>
                <span className="text-gray-900 dark:text-white">{nota.impuesto.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-gray-200 dark:border-gray-600 pt-1">
                <span className="text-gray-900 dark:text-white">Total {nota.moneda}</span>
                <span className="text-[#6F36FF] dark:text-[#8B5CF6]">{nota.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Historial */}
          {nota.historial.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Historial</h3>
              <div className="space-y-1">
                {nota.historial.map((ev, i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="text-gray-400 whitespace-nowrap">{formatFecha(ev.fecha)}</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{ev.accion}</span>
                    {ev.detalle && <span className="text-gray-500 dark:text-gray-400">{ev.detalle}</span>}
                    {ev.usuario && <span className="text-gray-400 ml-auto">{ev.usuario}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confirmación anulación */}
          {mostrarConfAnulacion && (
            <div className="border border-red-200 dark:border-red-700 rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
              <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">Confirmar anulación</p>
              <input
                type="text"
                value={motivoAnulacion}
                onChange={e => setMotivoAnulacion(e.target.value)}
                placeholder="Motivo de anulación (obligatorio)"
                className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleAnular}
                  disabled={!motivoAnulacion.trim() || anulando}
                  className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Confirmar anulación
                </button>
                <button
                  onClick={() => { setMostrarConfAnulacion(false); setMotivoAnulacion(''); }}
                  className="px-4 py-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            {nota.estado === 'Generada' && !mostrarConfAnulacion && (
              <button
                onClick={() => setMostrarConfAnulacion(true)}
                className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Anular NI
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetalleNotaIngreso;
