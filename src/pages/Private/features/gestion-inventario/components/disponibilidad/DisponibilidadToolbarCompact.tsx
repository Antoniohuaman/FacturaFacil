// src/features/gestion-inventario/components/disponibilidad/DisponibilidadToolbarCompact.tsx

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import type { Almacen } from '../../../configuracion-sistema/modelos/Almacen';
import type { DisponibilidadFilters } from '../../models/disponibilidad.types';

interface DisponibilidadToolbarCompactProps {
  filtros: DisponibilidadFilters;
  onFiltrosChange: (filtros: Partial<DisponibilidadFilters>) => void;
  almacenesDisponibles: Almacen[];
  totalItems: number;
  itemsMostrados: number;
  onOpenSettings: () => void;
  onExportar?: () => void;
  onActualizacionMasiva?: () => void;
  onTransferir?: () => void;
  onAjustar?: () => void;
}

const DisponibilidadToolbarCompact: React.FC<DisponibilidadToolbarCompactProps> = ({
  filtros,
  onFiltrosChange,
  almacenesDisponibles,
  totalItems,
  itemsMostrados,
  onOpenSettings,
  onExportar,
  onActualizacionMasiva,
  onTransferir,
  onAjustar
}) => {
  const { state: configState } = useConfigurationContext();
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

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

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setIsActionsOpen(false);
      }
    };

    if (isActionsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isActionsOpen]);

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="px-4 py-2.5">
        {/* Fila principal: Filtros + Búsqueda + Acciones */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtros principales - COMPACTOS */}
          <div className="flex items-center gap-2">
            <select
              id="establecimiento-filter"
              value={filtros.establecimientoId}
              onChange={(e) => handleEstablecimientoChange(e.target.value)}
              className="h-8 px-2.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 focus:border-transparent min-w-[160px]"
              aria-label="Filtrar por establecimiento"
            >
              <option value="">Todos los establecimientos</option>
              {establecimientos.map((est) => (
                <option key={est.id} value={est.id}>
                  {est.code} - {est.name}
                </option>
              ))}
            </select>

            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>

            <select
              id="almacen-filter"
              value={filtros.almacenId}
              onChange={(e) => onFiltrosChange({ almacenId: e.target.value })}
              disabled={almacenesDisponibles.length === 0}
              className="h-8 px-2.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px]"
              aria-label="Filtrar por almacén"
            >
              <option value="">Todos los almacenes</option>
              {almacenesDisponibles.map((alm) => (
                <option key={alm.id} value={alm.id}>
                  {alm.codigoAlmacen} - {alm.nombreAlmacen}
                </option>
              ))}
            </select>
          </div>

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

          {/* Búsqueda - COMPACTA */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <svg
              className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500"
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
              placeholder="Buscar SKU o nombre..."
              value={filtros.filtroSku || ''}
              onChange={(e) => onFiltrosChange({ filtroSku: e.target.value })}
              className="w-full h-8 pl-8 pr-8 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-gray-400 focus:border-transparent"
              aria-label="Buscar producto por SKU o nombre"
            />
            {filtros.filtroSku && (
              <button
                onClick={() => onFiltrosChange({ filtroSku: '' })}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="Limpiar búsqueda"
                aria-label="Limpiar búsqueda"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Toggle: Solo con disponible - COMPACTO */}
          <label className="inline-flex items-center cursor-pointer gap-1.5">
            <input
              type="checkbox"
              checked={filtros.soloConDisponible}
              onChange={(e) => onFiltrosChange({ soloConDisponible: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gray-400 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-gray-700 dark:peer-checked:bg-gray-500"></div>
            <span className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
              Solo disponible
            </span>
          </label>

          <div className="ml-auto flex items-center gap-2">
            {/* Contador - COMPACTO */}
            <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
              {itemsMostrados === totalItems
                ? `${totalItems}`
                : `${itemsMostrados}/${totalItems}`}
            </span>

            {/* Botón Acciones - DROPDOWN */}
            <div className="relative" ref={actionsRef}>
              <button
                onClick={() => setIsActionsOpen(!isActionsOpen)}
                className="inline-flex items-center gap-1 h-8 px-3 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                aria-label="Menú de acciones"
                aria-expanded={isActionsOpen}
              >
                <span>Acciones</span>
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${isActionsOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isActionsOpen && (
                <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                  <div className="py-1">
                    {onExportar && (
                      <button
                        onClick={() => {
                          onExportar();
                          setIsActionsOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Exportar a Excel</span>
                      </button>
                    )}
                    {onActualizacionMasiva && (
                      <button
                        onClick={() => {
                          onActualizacionMasiva();
                          setIsActionsOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span>Actualización masiva</span>
                      </button>
                    )}
                    {onTransferir && (
                      <button
                        onClick={() => {
                          onTransferir();
                          setIsActionsOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <span>Transferir stock</span>
                      </button>
                    )}
                    {onAjustar && (
                      <button
                        onClick={() => {
                          onAjustar();
                          setIsActionsOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Ajustar stock</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Botón Settings */}
            <button
              onClick={onOpenSettings}
              className="h-8 w-8 inline-flex items-center justify-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              title="Personalizar vista"
              aria-label="Configuración de visualización"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DisponibilidadToolbarCompact;
