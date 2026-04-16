import type { RefObject } from 'react';
import { Drawer } from '../../ui';
import { useRetroalimentacion } from '../hooks/useRetroalimentacion';
import type { FlujoRetroalimentacion } from '../tipos';
import { BuzonIdeas } from './BuzonIdeas';
import { EncuestaNps } from './EncuestaNps';
import { EstadoAnimoDiario } from './EstadoAnimoDiario';

interface PanelRetroalimentacionProps {
  devolverFocoARef?: RefObject<HTMLElement | null>;
}

const OPCIONES_FLUJO: Array<{ id: FlujoRetroalimentacion; etiqueta: string }> = [
  { id: 'estado_animo', etiqueta: 'Estado de ánimo' },
  { id: 'buzon_ideas', etiqueta: 'Buzón de ideas' },
  { id: 'nps', etiqueta: 'NPS' },
];

function renderizarContenido(flujoActivo: FlujoRetroalimentacion) {
  switch (flujoActivo) {
    case 'buzon_ideas':
      return <BuzonIdeas />;
    case 'nps':
      return <EncuestaNps />;
    case 'estado_animo':
    default:
      return <EstadoAnimoDiario />;
  }
}

export function PanelRetroalimentacion({ devolverFocoARef }: PanelRetroalimentacionProps) {
  const { panelAbierto, flujoActivo, cerrarPanel, cambiarFlujo } = useRetroalimentacion();

  return (
    <Drawer
      abierto={panelAbierto}
      alCerrar={cerrarPanel}
      titulo="Retroalimentación"
      subtitulo="Una forma rápida y no invasiva de compartir cómo va tu experiencia en SenciYo."
      tamano="md"
      devolverFocoARef={devolverFocoARef}
    >
      <div className="border-b border-slate-200 px-4 py-3 dark:border-gray-700">
        <div className="flex flex-wrap gap-2">
          {OPCIONES_FLUJO.map((opcion) => {
            const activa = opcion.id === flujoActivo;

            return (
              <button
                key={opcion.id}
                type="button"
                onClick={() => cambiarFlujo(opcion.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${activa
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-gray-800 dark:text-slate-300 dark:hover:bg-gray-700'
                  }`}
                aria-pressed={activa}
              >
                {opcion.etiqueta}
              </button>
            );
          })}
        </div>
      </div>

      {renderizarContenido(flujoActivo)}
    </Drawer>
  );
}