import React from 'react';
import type { Telefono } from '../models';

interface TelefonosInputProps {
  telefonos: Telefono[];
  onChange: (telefonos: Telefono[]) => void;
  maxTelefonos?: number;
}

const TelefonosInput: React.FC<TelefonosInputProps> = ({ telefonos, onChange, maxTelefonos = 3 }) => {
  const handleAdd = () => {
    if (telefonos.length < maxTelefonos) {
      onChange([...telefonos, { numero: '', tipo: 'Móvil' }]);
    }
  };

  const handleRemove = (index: number) => {
    onChange(telefonos.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof Telefono, value: string) => {
    const updated = [...telefonos];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {telefonos.map((tel, index) => (
        <div key={index} className="flex gap-2">
          <input
            type="text"
            value={tel.numero}
            onChange={(e) => handleChange(index, 'numero', e.target.value)}
            placeholder="Número"
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
          <select
            value={tel.tipo}
            onChange={(e) => handleChange(index, 'tipo', e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="Móvil">Móvil</option>
            <option value="Fijo">Fijo</option>
            <option value="Trabajo">Trabajo</option>
          </select>
          <button
            type="button"
            onClick={() => handleRemove(index)}
            className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>
      ))}
      {telefonos.length < maxTelefonos && (
        <button
          type="button"
          onClick={handleAdd}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          + Agregar teléfono
        </button>
      )}
    </div>
  );
};

export default TelefonosInput;
