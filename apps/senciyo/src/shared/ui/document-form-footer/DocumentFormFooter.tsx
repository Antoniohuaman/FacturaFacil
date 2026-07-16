import { Save } from 'lucide-react';
import type { ReactNode } from 'react';

interface DocumentFormFooterProps {
  infoIzquierda?: ReactNode;
  onCancelar: () => void;
  textoBotonPrimario: string;
  textoBotonPrimarioCargando?: string;
  onSubmit: () => void;
  deshabilitado?: boolean;
  cargando?: boolean;
  /** Explica por qué el botón primario está deshabilitado (tooltip nativo), cuando `deshabilitado` es true por una razón real que el usuario debe conocer. */
  tituloBotonPrimario?: string;
}

/** Barra fija inferior con acciones (Cancelar / acción primaria) de un formulario de documento. */
export default function DocumentFormFooter({
  infoIzquierda,
  onCancelar,
  textoBotonPrimario,
  textoBotonPrimarioCargando = 'Guardando...',
  onSubmit,
  deshabilitado = false,
  cargando = false,
  tituloBotonPrimario,
}: DocumentFormFooterProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 z-20">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        <div className="text-xs text-gray-500">{infoIzquierda}</div>
        <div className="flex gap-3">
          <button
            onClick={onCancelar}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onSubmit}
            disabled={deshabilitado || cargando}
            title={deshabilitado ? tituloBotonPrimario : undefined}
            className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {cargando ? textoBotonPrimarioCargando : textoBotonPrimario}
          </button>
        </div>
      </div>
    </div>
  );
}
