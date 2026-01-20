// src/features/gestion-inventario/components/disponibilidad/DisponibilidadToolbar.tsx

import React, { useMemo } from 'react';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import type { DisponibilidadFilters } from '../../models/disponibilidad.types';

interface DisponibilidadToolbarProps {
  filtros: DisponibilidadFilters;
  onFiltrosChange: (filtros: Partial<DisponibilidadFilters>) => void;
  almacenesDisponibles: Array<{
    id: string;
    code: string;
    name: string;
    EstablecimientoId: string;
  }>;
  totalItems: number;
  itemsMostrados: number;
}

const DisponibilidadToolbar: React.FC<DisponibilidadToolbarProps> = ({
  filtros,
  onFiltrosChange,
  almacenesDisponibles,
  totalItems,
  itemsMostrados
}) => {
  const { state: configState } = useConfigurationContext();

  // Establecimientos activos
  const establecimientos = useMemo(
    () => configState.Establecimientos.filter(e => e.isActive),
    [configState.Establecimientos]
  );

  // Handler para cambio de establecimiento (resetea almacén)
  const handleEstablecimientoChange = (establecimientoId: string) => {
    onFiltrosChange({
      establecimientoId,
      almacenId: '' // Reset almacén cuando cambia establecimiento
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="px-4 py-3">
        {/* Fila principal: Filtros + Búsqueda + Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Filtros principales */}
          <div className="flex items-center gap-2">
            {/* Establecimiento */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="establecimiento-filter"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
              >
                Establecimiento:
              </label>
              <select
                id="establecimiento-filter"
                value={filtros.establecimientoId}
                onChange={(e) => handleEstablecimientoChange(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[200px]"
              >
                <option value="">Todos los establecimientos</option>
                {establecimientos.map((est) => (
                  <option key={est.id} value={est.id}>
                    {est.code} - {est.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Almacén (dependiente de establecimiento) */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="almacen-filter"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
              >
                Almacén:
              </label>
              <select
                id="almacen-filter"
                value={filtros.almacenId}
                onChange={(e) => onFiltrosChange({ almacenId: e.target.value })}
                disabled={almacenesDisponibles.length === 0}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
              >
                <option value="">Todos los almacenes</option>
                {almacenesDisponibles.map((alm) => (
                  <option key={alm.id} value={alm.id}>
                    {alm.code} - {alm.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Separador vertical */}
          <div className="h-8 w-px bg-gray-300 dark:bg-gray-600 hidden lg:block" />

          {/* Búsqueda */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Buscar por SKU o nombre..."
                value={filtros.filtroSku || ''}
                onChange={(e) => onFiltrosChange({ filtroSku: e.target.value })}
                className="w-full pl-10 pr-4 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {filtros.filtroSku && (
                <button
                  onClick={() => onFiltrosChange({ filtroSku: '' })}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="Limpiar búsqueda"
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
              )}
            </div>
          </div>

          {/* Toggle: Solo con disponible */}
          <div className="flex items-center gap-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={filtros.soloConDisponible}
                onChange={(e) => onFiltrosChange({ soloConDisponible: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                Solo con disponible
              </span>
            </label>
          </div>

          {/* Contador de resultados */}
          <div className="ml-auto flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">
              {itemsMostrados === totalItems
                ? `${totalItems} producto${totalItems !== 1 ? 's' : ''}`
                : `${itemsMostrados} de ${totalItems} productos`}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DisponibilidadToolbar;
