import { useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import { Tooltip } from '../../ui';
import { useRetroalimentacion } from '../hooks/useRetroalimentacion';
import { PanelRetroalimentacion } from './PanelRetroalimentacion';

export function AccesoRetroalimentacionHeader() {
  const { abrirPanel } = useRetroalimentacion();
  const botonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <Tooltip contenido="Retroalimentación">
        <button
          ref={botonRef}
          type="button"
          className="relative w-10 h-10 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-full transition-colors flex items-center justify-center group"
          onClick={() => abrirPanel('estado_animo', 'header')}
          aria-label="Abrir retroalimentación"
        >
          <MessageSquare className="w-5 h-5 text-slate-600 dark:text-gray-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
        </button>
      </Tooltip>
      <PanelRetroalimentacion devolverFocoARef={botonRef} />
    </>
  );
}