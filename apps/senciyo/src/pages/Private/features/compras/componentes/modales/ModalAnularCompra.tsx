import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ModalAnularCompraProps {
  abierto: boolean;
  titulo: string;
  descripcion: string;
  motivos: string[];
  onConfirmar: (motivo: string) => Promise<void>;
  onCerrar: () => void;
}

export default function ModalAnularCompra({
  abierto,
  titulo,
  descripcion,
  motivos,
  onConfirmar,
  onCerrar,
}: ModalAnularCompraProps) {
  const [motivoSeleccionado, setMotivoSeleccionado] = useState('');
  const [motivoPersonalizado, setMotivoPersonalizado] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');

  if (!abierto) return null;

  const motivoFinal =
    motivoSeleccionado === '__otro__' ? motivoPersonalizado.trim() : motivoSeleccionado;

  const puedeConfirmar = motivoFinal.length > 0;

  async function handleConfirmar() {
    if (!puedeConfirmar) {
      setError('Selecciona o ingresa un motivo de anulación.');
      return;
    }
    setError('');
    setProcesando(true);
    try {
      await onConfirmar(motivoFinal);
      setMotivoSeleccionado('');
      setMotivoPersonalizado('');
    } catch {
      setError('Ocurrió un error al anular. Inténtalo nuevamente.');
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCerrar} />
      <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-red-50">
          <AlertTriangle className="text-red-600 shrink-0" size={20} />
          <h2 className="font-semibold text-gray-900 flex-1">{titulo}</h2>
          <button
            onClick={onCerrar}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={procesando}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600">{descripcion}</p>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Motivo de anulación</label>
            <select
              value={motivoSeleccionado}
              onChange={(e) => {
                setMotivoSeleccionado(e.target.value);
                setError('');
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              disabled={procesando}
            >
              <option value="">Selecciona un motivo...</option>
              {motivos.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              <option value="__otro__">Otro motivo...</option>
            </select>
          </div>

          {motivoSeleccionado === '__otro__' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Descripción del motivo</label>
              <textarea
                value={motivoPersonalizado}
                onChange={(e) => setMotivoPersonalizado(e.target.value)}
                rows={3}
                placeholder="Describe el motivo de anulación..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                disabled={procesando}
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onCerrar}
            disabled={procesando}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={procesando || !puedeConfirmar}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {procesando ? 'Anulando...' : 'Confirmar anulación'}
          </button>
        </div>
      </div>
    </div>
  );
}
