// src/features/gestion-inventario/components/disponibilidad/DisponibilidadSettings.tsx

import React, { useState } from 'react';
import { Button } from '@/contasis';
import { usePreferenciasDisponibilidad } from '../../stores/usePreferenciasDisponibilidad';
import { useFeedback } from '@/shared/feedback/useFeedback';
import type { DensidadTabla, ColumnaDisponibilidad } from '../../models/disponibilidad.types';

interface DisponibilidadSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const COLUMNAS_INFO: Record<ColumnaDisponibilidad, string> = {
  codigo: 'Código (SKU)',
  producto: 'Producto',
  unidadMinima: 'Unidad mínima',
  real: 'Stock Real',
  reservado: 'Stock Reservado',
  disponible: 'Stock Disponible',
  stockMinimo: 'Stock mínimo',
  stockMaximo: 'Stock máximo',
  situacion: 'Estado',
  acciones: 'Acciones',
};

const LABEL_DENSIDAD: Record<DensidadTabla, string> = {
  compacta: 'Compacta',
  comoda: 'Cómoda',
  espaciosa: 'Espaciosa',
};

const DisponibilidadSettings: React.FC<DisponibilidadSettingsProps> = ({ isOpen, onClose }) => {
  const {
    densidad,
    columnasVisibles,
    mostrarColumnasPorAlmacen,
    cambiarDensidad,
    toggleColumna,
    toggleColumnasPorAlmacen,
    mostrarTodasColumnas,
    ocultarTodasColumnasOpcionales,
    resetearPreferencias,
  } = usePreferenciasDisponibilidad();

  const feedback = useFeedback();
  const [confirmarReset, setConfirmarReset] = useState(false);

  if (!isOpen) return null;

  const handleReset = () => {
    resetearPreferencias();
    setConfirmarReset(false);
    feedback.success('Preferencias restauradas a los valores por defecto.');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Personalización de Vista
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

          {/* Densidad */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Densidad de tabla
            </h3>
            <div className="flex gap-2">
              {(Object.keys(LABEL_DENSIDAD) as DensidadTabla[]).map((d) => (
                <button
                  key={d}
                  onClick={() => cambiarDensidad(d)}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg border-2 transition-colors ${
                    densidad === d
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  {LABEL_DENSIDAD[d]}
                </button>
              ))}
            </div>
          </div>

          {/* Columnas visibles */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Columnas visibles
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={mostrarTodasColumnas}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  Mostrar todas
                </button>
                <span className="text-gray-400">|</span>
                <button
                  onClick={ocultarTodasColumnasOpcionales}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  Solo esenciales
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(COLUMNAS_INFO) as ColumnaDisponibilidad[]).map((columna) => (
                <label
                  key={columna}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={columnasVisibles.includes(columna)}
                    onChange={() => toggleColumna(columna)}
                    disabled={columnasVisibles.length === 1 && columnasVisibles.includes(columna)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {COLUMNAS_INFO[columna]}
                  </span>
                </label>
              ))}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Al menos una columna debe estar visible
            </p>

            {/* Columnas individuales por almacén */}
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mostrarColumnasPorAlmacen}
                  onChange={toggleColumnasPorAlmacen}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Stock por almacén individual
                </span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 ml-8">
                Aplica solo en vista "Todos los almacenes"
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          {confirmarReset ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">¿Restaurar defaults?</span>
              <button
                onClick={handleReset}
                className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                Confirmar
              </button>
              <button
                onClick={() => setConfirmarReset(false)}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmarReset(true)}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Resetear preferencias
            </button>
          )}
          <Button variant="primary" size="md" onClick={onClose}>
            Cerrar
          </Button>
        </div>

      </div>
    </div>
  );
};

export default DisponibilidadSettings;
