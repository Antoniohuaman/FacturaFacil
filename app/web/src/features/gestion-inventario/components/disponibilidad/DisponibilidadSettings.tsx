// src/features/gestion-inventario/components/disponibilidad/DisponibilidadSettings.tsx

import React, { useState } from 'react';
import { usePreferenciasDisponibilidad } from '../../stores/usePreferenciasDisponibilidad';
import type {
  DensidadTabla,
  ColumnaDisponibilidad,
  DisponibilidadFilters
} from '../../models/disponibilidad.types';

interface DisponibilidadSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  filtrosActuales: DisponibilidadFilters;
}

const COLUMNAS_INFO: Record<ColumnaDisponibilidad, string> = {
  codigo: 'Código (SKU)',
  producto: 'Producto',
  real: 'Stock Real',
  reservado: 'Stock Reservado',
  disponible: 'Stock Disponible',
  situacion: 'Situación',
  acciones: 'Acciones'
};

const DisponibilidadSettings: React.FC<DisponibilidadSettingsProps> = ({
  isOpen,
  onClose,
  filtrosActuales
}) => {
  const {
    densidad,
    columnasVisibles,
    vistasGuardadas,
    vistaActivaId,
    cambiarDensidad,
    toggleColumna,
    mostrarTodasColumnas,
    ocultarTodasColumnasOpcionales,
    guardarVista,
    eliminarVista,
    activarVista,
    desactivarVista,
    resetearPreferencias
  } = usePreferenciasDisponibilidad();

  const [nombreNuevaVista, setNombreNuevaVista] = useState('');
  const [mostrandoGuardarVista, setMostrandoGuardarVista] = useState(false);

  if (!isOpen) return null;

  // Handler para guardar vista
  const handleGuardarVista = () => {
    if (!nombreNuevaVista.trim()) {
      alert('Por favor ingresa un nombre para la vista');
      return;
    }

    guardarVista({
      nombre: nombreNuevaVista.trim(),
      filtros: filtrosActuales,
      columnasVisibles,
      densidad
    });

    setNombreNuevaVista('');
    setMostrandoGuardarVista(false);
    alert('✅ Vista guardada exitosamente');
  };

  // Handler para eliminar vista
  const handleEliminarVista = (vistaId: string) => {
    if (confirm('¿Estás seguro de eliminar esta vista?')) {
      eliminarVista(vistaId);
    }
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
              {(['compacta', 'comoda', 'espaciosa'] as DensidadTabla[]).map((d) => (
                <button
                  key={d}
                  onClick={() => cambiarDensidad(d)}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg border-2 transition-colors ${
                    densidad === d
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  {d.charAt(0).toUpperCase() + d.slice(1)}
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
          </div>

          {/* Vistas guardadas */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Vistas guardadas
              </h3>
              <button
                onClick={() => setMostrandoGuardarVista(!mostrandoGuardarVista)}
                className="text-xs px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                + Nueva vista
              </button>
            </div>

            {/* Formulario para guardar vista */}
            {mostrandoGuardarVista && (
              <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre de la vista:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nombreNuevaVista}
                    onChange={(e) => setNombreNuevaVista(e.target.value)}
                    placeholder="Ej: Vista compacta con stock"
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyDown={(e) => e.key === 'Enter' && handleGuardarVista()}
                  />
                  <button
                    onClick={handleGuardarVista}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => {
                      setMostrandoGuardarVista(false);
                      setNombreNuevaVista('');
                    }}
                    className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  Se guardarán los filtros actuales, columnas visibles y densidad
                </p>
              </div>
            )}

            {/* Lista de vistas */}
            {vistasGuardadas.length > 0 ? (
              <div className="space-y-2">
                {vistasGuardadas.map((vista) => (
                  <div
                    key={vista.id}
                    className={`p-3 border-2 rounded-lg ${
                      vistaActivaId === vista.id
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {vista.nombre}
                          </h4>
                          {vistaActivaId === vista.id && (
                            <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                              Activa
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {vista.columnasVisibles.length} columnas • {vista.densidad} •{' '}
                          {new Date(vista.fechaCreacion).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {vistaActivaId === vista.id ? (
                          <button
                            onClick={desactivarVista}
                            className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                            title="Desactivar vista"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={() => activarVista(vista.id)}
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded transition-colors"
                            title="Activar vista"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleEliminarVista(vista.id)}
                          className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Eliminar vista"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No hay vistas guardadas aún
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={() => {
              if (confirm('¿Resetear todas las preferencias a los valores por defecto?')) {
                resetearPreferencias();
              }
            }}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Resetear preferencias
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DisponibilidadSettings;
