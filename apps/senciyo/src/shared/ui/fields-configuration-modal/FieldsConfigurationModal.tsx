import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { CampoConfigurableDocumento } from './tiposCamposConfigurables';

interface FieldsConfigurationModalProps {
  abierto: boolean;
  titulo?: string;
  campos: CampoConfigurableDocumento[];
  valoresPorDefecto: CampoConfigurableDocumento[];
  onGuardar: (campos: CampoConfigurableDocumento[]) => void;
  onCerrar: () => void;
}

/**
 * Modal neutral y reutilizable para activar/desactivar campos opcionales de
 * un formulario de documento de forma individual (no todos juntos). Cada
 * formulario define su propia lista de CampoConfigurableDocumento; este
 * componente no conoce nada del dominio del documento.
 */
export default function FieldsConfigurationModal({
  abierto,
  titulo = 'Configuración de campos',
  campos,
  valoresPorDefecto,
  onGuardar,
  onCerrar,
}: FieldsConfigurationModalProps) {
  const [borrador, setBorrador] = useState<CampoConfigurableDocumento[]>(campos);

  useEffect(() => {
    if (abierto) setBorrador(campos);
  }, [abierto, campos]);

  if (!abierto) return null;

  function alternar(id: string) {
    setBorrador((prev) =>
      prev.map((c) =>
        c.id === id && (!c.obligatorio || c.configurableComoObligatorio) ? { ...c, visible: !c.visible } : c,
      ),
    );
  }

  const grupos = Array.from(new Set(borrador.map((c) => c.grupo ?? '')));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCerrar} />
      <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-[15px] font-semibold text-slate-700">{titulo}</h2>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          {grupos.map((grupo) => (
            <div key={grupo || '_sin_grupo'} className="space-y-1.5">
              {grupo && (
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{grupo}</p>
              )}
              <div className="grid grid-cols-2 gap-1.5">
                {borrador
                  .filter((c) => (c.grupo ?? '') === grupo)
                  .map((campo) => {
                    const bloqueado = Boolean(campo.obligatorio) && !campo.configurableComoObligatorio;
                    return (
                      <label
                        key={campo.id}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-[12px] transition-all ${
                          bloqueado
                            ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-70'
                            : campo.visible
                            ? 'bg-violet-100 border-violet-300 cursor-pointer hover:bg-violet-200'
                            : 'bg-white border-gray-200 cursor-pointer hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={campo.visible}
                          disabled={bloqueado}
                          onChange={() => alternar(campo.id)}
                          className="w-3.5 h-3.5 text-violet-600 rounded focus:ring-2 focus:ring-violet-500 disabled:opacity-50 cursor-pointer"
                        />
                        <span className={bloqueado ? 'text-gray-500 font-medium' : 'text-gray-700'}>
                          {campo.label}
                          {bloqueado && <span className="ml-0.5 text-[10px] text-gray-400">(fijo)</span>}
                        </span>
                      </label>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-gray-200 bg-gray-50 shrink-0">
          <button
            type="button"
            onClick={() => setBorrador(valoresPorDefecto)}
            className="text-xs text-gray-600 hover:text-gray-800 font-medium"
          >
            Restaurar valores
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCerrar}
              className="px-3.5 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onGuardar(borrador)}
              className="px-3.5 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Guardar y cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
