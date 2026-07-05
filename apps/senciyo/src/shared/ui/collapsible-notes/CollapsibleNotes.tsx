import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const MAX_CHARS = 500;

interface CollapsibleNotesProps {
  titulo?: string;
  observaciones: string;
  onCambiarObservaciones: (valor: string) => void;
  notaInterna?: string;
  onCambiarNotaInterna?: (valor: string) => void;
  defaultExpanded?: boolean;
}

/**
 * Bloque colapsable de observaciones de un documento. Si se pasan
 * notaInterna/onCambiarNotaInterna, muestra un segundo textarea en paralelo;
 * si no, muestra solo el textarea de observaciones (no inventa una nota
 * interna que el documento no necesita).
 */
export default function CollapsibleNotes({
  titulo = 'Observaciones',
  observaciones,
  onCambiarObservaciones,
  notaInterna,
  onCambiarNotaInterna,
  defaultExpanded = false,
}: CollapsibleNotesProps) {
  const [expandido, setExpandido] = useState(defaultExpanded);
  const conNotaInterna = notaInterna !== undefined && onCambiarNotaInterna !== undefined;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-[15px] font-semibold text-slate-700 leading-tight">{titulo}</span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${expandido ? 'rotate-180' : ''}`} />
      </button>
      {expandido && (
        <div className="px-4 pb-4 pt-3 border-t border-gray-200">
          <div className={conNotaInterna ? 'grid grid-cols-12 gap-4' : ''}>
            <div className={conNotaInterna ? 'col-span-12 lg:col-span-6' : ''}>
              <textarea
                rows={2}
                maxLength={MAX_CHARS}
                value={observaciones}
                onChange={(e) => onCambiarObservaciones(e.target.value)}
                placeholder="Notas adicionales..."
                className="w-full min-h-16 px-2 py-1.5 border border-gray-300 rounded-md resize-none text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <div className="text-right text-[11px] text-gray-400 mt-0.5">
                {observaciones.length}/{MAX_CHARS}
              </div>
            </div>
            {conNotaInterna && (
              <div className="col-span-12 lg:col-span-6">
                <textarea
                  rows={2}
                  maxLength={MAX_CHARS}
                  value={notaInterna}
                  onChange={(e) => onCambiarNotaInterna!(e.target.value)}
                  placeholder="Nota interna..."
                  className="w-full min-h-16 px-2 py-1.5 border border-gray-300 rounded-md resize-none text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <div className="text-right text-[11px] text-gray-400 mt-0.5">
                  {notaInterna.length}/{MAX_CHARS}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
