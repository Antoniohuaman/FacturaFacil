import React from 'react';
import type { ActividadEconomica } from '../models';

interface ActividadesEconomicasInputProps {
  actividades: ActividadEconomica[];
  onChange: (actividades: ActividadEconomica[]) => void;
}

const ActividadesEconomicasInput: React.FC<ActividadesEconomicasInputProps> = ({ actividades, onChange }) => {
  const handleAdd = () => {
    onChange([...actividades, { codigo: '', descripcion: '', esPrincipal: false }]);
  };

  const handleRemove = (index: number) => {
    onChange(actividades.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof ActividadEconomica, value: string | boolean) => {
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
