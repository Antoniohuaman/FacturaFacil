import React from 'react';
import type { ActividadEconomica } from '../models';

interface ActividadesEconomicasInputProps {
  actividades: ActividadEconomica[];
  onChange: (actividades: ActividadEconomica[]) => void;
  readonly?: boolean;
}

const ActividadesEconomicasInput: React.FC<ActividadesEconomicasInputProps> = ({ actividades, onChange, readonly = false }) => {
  const handleAdd = () => {
    if (readonly) return;
    onChange([...actividades, { codigo: '', descripcion: '', esPrincipal: false }]);
  };

  const handleRemove = (index: number) => {
    if (readonly) return;
    onChange(actividades.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof ActividadEconomica, value: string | boolean) => {
    if (readonly) return;
    const updated = [...actividades];
    updated[index] = { ...updated[index], [field]: value };
    
    // Si se marca como principal, desmarcar las demás
    if (field === 'esPrincipal' && value === true) {
      updated.forEach((act, i) => {
        if (i !== index) {
          act.esPrincipal = false;
        }
      });
    }
    
    onChange(updated);
  };

  // Modo readonly: mostrar solo como lista
  if (readonly) {
    return (
      <div className="space-y-1.5">
        {actividades.length === 0 ? (
          <div className="text-xs text-gray-500 dark:text-gray-400 italic">Sin actividades registradas</div>
        ) : (
          actividades.map((actividad, index) => (
            <div key={index} className="flex gap-2 items-center text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-1.5">
              <span className="font-mono text-blue-600 dark:text-blue-400 font-medium">{actividad.codigo}</span>
              <span className="flex-1 text-gray-700 dark:text-gray-300">{actividad.descripcion}</span>
              {actividad.esPrincipal && (
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-[10px] font-medium rounded">PRINCIPAL</span>
              )}
            </div>
          ))
        )}
      </div>
    );
  }

  // Modo editable (original)
  return (
    <div className="space-y-2">
      {actividades.map((actividad, index) => (
        <div key={index} className="flex gap-2 items-start">
          <input
            type="text"
            value={actividad.codigo}
            onChange={(e) => handleChange(index, 'codigo', e.target.value)}
            placeholder="Código"
            className="w-24 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
          <input
            type="text"
            value={actividad.descripcion}
            onChange={(e) => handleChange(index, 'descripcion', e.target.value)}
            placeholder="Descripción"
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
          <label className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
            <input
              type="checkbox"
              checked={actividad.esPrincipal}
              onChange={(e) => handleChange(index, 'esPrincipal', e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            Principal
          </label>
          <button
            type="button"
            onClick={() => handleRemove(index)}
            className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={handleAdd}
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
      >
        + Agregar actividad económica
      </button>
    </div>
  );
};

export default ActividadesEconomicasInput;
