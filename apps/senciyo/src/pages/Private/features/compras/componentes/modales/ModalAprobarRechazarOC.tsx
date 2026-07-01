import { useState } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';
import type { OrdenCompra } from '../../modelos/OrdenCompra';

interface ModalAprobarRechazarOCProps {
  oc: OrdenCompra | null;
  abierto: boolean;
  onAprobar: (id: string) => Promise<void>;
  onRechazar: (id: string, motivo: string) => Promise<void>;
  onCerrar: () => void;
}

export default function ModalAprobarRechazarOC({
  oc,
  abierto,
  onAprobar,
  onRechazar,
  onCerrar,
}: ModalAprobarRechazarOCProps) {
  const [accion, setAccion] = useState<'aprobar' | 'rechazar' | null>(null);
  const [motivo, setMotivo] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');

  if (!abierto || !oc) return null;

  function handleCerrar() {
    if (procesando) return;
    setAccion(null);
    setMotivo('');
    setError('');
    onCerrar();
  }

  async function handleConfirmar() {
    if (!accion) return;
    if (accion === 'rechazar' && !motivo.trim()) {
      setError('El motivo de rechazo es obligatorio.');
      return;
    }

    setError('');
    setProcesando(true);
    try {
      if (accion === 'aprobar') {
        await onAprobar(oc!.id);
      } else {
        await onRechazar(oc!.id, motivo.trim());
      }
      handleCerrar();
    } catch {
      setError('Ocurrió un error. Inténtalo nuevamente.');
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleCerrar} />
      <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Aprobación de orden de compra</h2>
          <button onClick={handleCerrar} disabled={procesando} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="text-sm text-gray-600">
            <p>
              <span className="font-medium">Orden:</span> {oc.numero}
            </p>
            <p>
              <span className="font-medium">Proveedor:</span> {oc.proveedorNombre}
            </p>
            <p>
              <span className="font-medium">Total:</span>{' '}
              {oc.totales.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}{' '}
              {oc.moneda}
            </p>
          </div>

          {!accion && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setAccion('aprobar')}
                className="flex items-center justify-center gap-2 py-3 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-colors font-medium text-sm"
              >
                <CheckCircle size={18} />
                Aprobar
              </button>
              <button
                onClick={() => setAccion('rechazar')}
                className="flex items-center justify-center gap-2 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm"
              >
                <XCircle size={18} />
                Rechazar
              </button>
            </div>
          )}

          {accion === 'aprobar' && (
            <div className="p-4 bg-green-50 rounded-lg text-sm text-green-700">
              Se aprobará la orden <strong>{oc.numero}</strong>. Esta acción no se puede deshacer.
            </div>
          )}

          {accion === 'rechazar' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Motivo del rechazo <span className="text-red-500">*</span>
              </label>
              <textarea
                value={motivo}
                onChange={(e) => {
                  setMotivo(e.target.value);
                  setError('');
                }}
                rows={3}
                placeholder="Describe el motivo del rechazo..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                disabled={procesando}
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          {accion && (
            <button
              onClick={() => {
                setAccion(null);
                setMotivo('');
                setError('');
              }}
              disabled={procesando}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Atrás
            </button>
          )}
          <button
            onClick={handleCerrar}
            disabled={procesando}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cerrar
          </button>
          {accion && (
            <button
              onClick={handleConfirmar}
              disabled={procesando}
              className={`px-4 py-2 text-sm rounded-lg text-white font-medium transition-colors disabled:opacity-50 ${
                accion === 'aprobar'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {procesando
                ? 'Procesando...'
                : accion === 'aprobar'
                  ? 'Confirmar aprobación'
                  : 'Confirmar rechazo'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
