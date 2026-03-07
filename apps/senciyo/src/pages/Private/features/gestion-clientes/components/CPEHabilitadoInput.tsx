import React from 'react';
import { Plus, X } from 'lucide-react';
import type { CPEHabilitado } from '../models';

type CPEHabilitadoInputProps = {
  cpeHabilitados: CPEHabilitado[];
  onChange: (cpeHabilitados: CPEHabilitado[]) => void;
};

const tiposCPE = [
  { value: '01', label: 'Factura Electrónica' },
  { value: '03', label: 'Boleta de Venta Electrónica' },
  { value: '07', label: 'Nota de Crédito Electrónica' },
  { value: '08', label: 'Nota de Débito Electrónica' },
  { value: '09', label: 'Guía de Remisión Electrónica' },
  { value: '20', label: 'Retención Electrónica' },
  { value: '40', label: 'Percepción Electrónica' },
];

const CPEHabilitadoInput: React.FC<CPEHabilitadoInputProps> = ({ cpeHabilitados, onChange }) => {
  const handleAdd = () => {
    onChange([...cpeHabilitados, { tipoCPE: '', fechaInicio: '' }]);
  };

  const handleRemove = (index: number) => {
    onChange(cpeHabilitados.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof CPEHabilitado, value: string) => {
    const updated = cpeHabilitados.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    );
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {cpeHabilitados.map((cpe, index) => (
        <div key={index} className="flex gap-2">
          <select
            value={cpe.tipoCPE}
            onChange={(e) => handleChange(index, 'tipoCPE', e.target.value)}
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 h-9 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Seleccionar tipo</option>
            {tiposCPE.map((tipo) => (
              <option key={tipo.value} value={tipo.value}>
                {tipo.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={cpe.fechaInicio}
            onChange={(e) => handleChange(index, 'fechaInicio', e.target.value)}
            className="w-36 border border-gray-300 dark:border-gray-600 rounded-lg px-3 h-9 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <button
            type="button"
            onClick={() => handleRemove(index)}
            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      
      {cpeHabilitados.length < 10 && (
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agregar CPE
        </button>
      )}
    </div>
  );
};

export default CPEHabilitadoInput;
