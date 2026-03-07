// src/features/gestion-inventario/components/disponibilidad/DisponibilidadToolbarEnhanced.tsx

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import type { DisponibilidadFilters } from '../../models/disponibilidad.types';
import type { Almacen } from '../../../configuracion-sistema/modelos/Almacen';

interface DisponibilidadToolbarEnhancedProps {
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

const DisponibilidadToolbarEnhanced: React.FC<DisponibilidadToolbarEnhancedProps> = ({
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
    () => configState.Establecimientos.filter(e => e.estaActivoEstablecimiento !== false),
    [configState.Establecimientos]
  );

  // Handler para cambio de establecimiento (resetea almacén)
  const establecimientoSeleccionado = useMemo(
    () => establecimientos.find(e => e.id === filtros.establecimientoId),
    [establecimientos, filtros.establecimientoId]
  );

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

  // Nombres para chips de filtros activos
  const almacenNombre = almacenesDisponibles.find(a => a.id === filtros.almacenId)?.nombreAlmacen;

  // Limpiar todos los filtros
  const limpiarFiltros = () => {
    onFiltrosChange({
      almacenId: '',
      filtroSku: '',
      soloConDisponible: false
    });
  };

  const hayFiltrosActivos = Boolean(
    filtros.almacenId || filtros.filtroSku || filtros.soloConDisponible
  );

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-[#E5E7EB] dark:border-gray-700 shadow-sm sticky top-0 z-30">
      {/* Fila principal */}
      <div className="px-4 py-2">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filtros principales */}
          <div className="flex items-center gap-2">
            <select
              id="establecimiento-filter"
              value={filtros.establecimientoId}
              disabled
              className="h-9 px-3 text-sm border border-[#E5E7EB] dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-[#111827] dark:text-gray-100 transition-all duration-150 min-w-[220px] opacity-90 cursor-not-allowed"
              aria-label="Filtrar por establecimiento"
            >
              {establecimientoSeleccionado ? (
                <option value={establecimientoSeleccionado.id}>
                  {establecimientoSeleccionado.codigoEstablecimiento} - {establecimientoSeleccionado.nombreEstablecimiento}
                </option>
              ) : (
                <option value={filtros.establecimientoId}>Establecimiento</option>
              )}
            </select>

            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>

            <select
              id="almacen-filter"
              value={filtros.almacenId}
              onChange={(e) => onFiltrosChange({ almacenId: e.target.value })}
              disabled={almacenesDisponibles.length === 0}
              className="h-9 px-3 text-sm border border-[#E5E7EB] dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-[#111827] dark:text-gray-100 focus:ring-2 focus:ring-[#6F36FF]/35 focus:border-[#6F36FF] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed min-w-[180px]"
              aria-label="Filtrar por almacén"
            >
              {almacenesDisponibles.length > 1 && (
                <option value="">Todos los almacenes</option>
              )}
              {almacenesDisponibles.map((alm) => (
                <option key={alm.id} value={alm.id}>
                  {alm.codigoAlmacen} - {alm.nombreAlmacen}
                </option>
              ))}
            </select>
          </div>

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

          {/* Búsqueda */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
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
              placeholder="Buscar SKU o nombre..."
              value={filtros.filtroSku || ''}
              onChange={(e) => onFiltrosChange({ filtroSku: e.target.value })}
              className="w-full h-9 pl-10 pr-9 text-sm border border-[#E5E7EB] dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-[#111827] dark:text-gray-100 placeholder-[#4B5563] dark:placeholder-gray-500 focus:ring-2 focus:ring-[#6F36FF]/35 focus:border-[#6F36FF] transition-all duration-150"
              aria-label="Buscar producto por SKU o nombre"
            />
            {filtros.filtroSku && (
              <button
                onClick={() => onFiltrosChange({ filtroSku: '' })}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Limpiar búsqueda"
                aria-label="Limpiar búsqueda"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Toggle */}
          <label className="inline-flex items-center cursor-pointer gap-2 px-3 h-9 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150">
            <input
              type="checkbox"
              checked={filtros.soloConDisponible}
              onChange={(e) => onFiltrosChange({ soloConDisponible: e.target.checked })}
              className="w-4 h-4 text-[#6F36FF] bg-gray-100 border-[#E5E7EB] rounded focus:ring-[#6F36FF]/35 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 transition-all duration-150"
            />
            <span className="text-sm text-[#111827] dark:text-gray-300 whitespace-nowrap">
              Solo disponible
            </span>
          </label>

          <div className="ml-auto flex items-center gap-2">
            {/* Contador */}
            <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums font-medium">
              {itemsMostrados === totalItems
                ? `${totalItems}`
                : `${itemsMostrados}/${totalItems}`}
            </span>

            {/* Botón Acciones */}
            <div className="relative" ref={actionsRef}>
              <button
                onClick={() => setIsActionsOpen(!isActionsOpen)}
                className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium border border-[#E5E7EB] dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-[#111827] dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-[#6F36FF]/35 transition-all duration-150"
                aria-label="Menú de acciones"
                aria-expanded={isActionsOpen}
                title="Acciones (Alt+A)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
                <span>Acciones</span>
                <svg
                  className={`w-4 h-4 transition-transform ${isActionsOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown */}
              {isActionsOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1">
                  {onExportar && (
                    <button
                      onClick={() => {
                        onExportar();
                        setIsActionsOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Ajustar stock</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Botón Pantalla Completa */}
            <button
              onClick={() => {
                if (document.fullscreenElement) {
                  document.exitFullscreen();
                } else {
                  document.documentElement.requestFullscreen();
                }
              }}
              className="h-9 w-9 inline-flex items-center justify-center border border-[#E5E7EB] dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-[#4B5563] dark:text-gray-300 hover:text-[#6F36FF] hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-[#6F36FF]/35 transition-all duration-150"
              title="Pantalla completa (Mayús+Z)"
              aria-label="Activar pantalla completa"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>

            {/* Botón Compartir */}
            <button
              onClick={() => {
                const url = window.location.href;
                navigator.clipboard.writeText(url).then(() => {
                  alert('Enlace copiado al portapapeles');
                });
              }}
              className="h-9 w-9 inline-flex items-center justify-center border border-[#E5E7EB] dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-[#4B5563] dark:text-gray-300 hover:text-[#6F36FF] hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-[#6F36FF]/35 transition-all duration-150"
              title="Compartir enlace"
              aria-label="Copiar enlace para compartir"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>

            {/* Botón Settings */}
            <button
              onClick={onOpenSettings}
              className="h-9 w-9 inline-flex items-center justify-center border border-[#E5E7EB] dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-[#4B5563] dark:text-gray-300 hover:text-[#6F36FF] hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-[#6F36FF]/35 transition-all duration-150"
              title="Configuración (Alt+C)"
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

      {/* Fila de chips de filtros activos - REDISEÑADOS CON PRIMARIO */}
      {hayFiltrosActivos && (
        <div className="px-4 pb-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#4B5563] dark:text-gray-400 font-medium">Filtros:</span>

          {almacenNombre && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-[#6F36FF]/8 dark:bg-[#6F36FF]/15 text-[#6F36FF] dark:text-[#8B5CF6] border border-[#6F36FF]/20 dark:border-[#6F36FF]/30 rounded-md">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              {almacenNombre}
              <button
                onClick={() => onFiltrosChange({ almacenId: '' })}
                className="hover:text-[#5b2ee0] dark:hover:text-[#A78BFA] transition-colors duration-150"
                aria-label="Quitar filtro de almacén"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}

          {filtros.filtroSku && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-[#111827] dark:text-gray-300 border border-[#E5E7EB] dark:border-gray-600 rounded-md">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              "{filtros.filtroSku}"
              <button
                onClick={() => onFiltrosChange({ filtroSku: '' })}
                className="hover:text-[#4B5563] dark:hover:text-gray-100 transition-colors duration-150"
                aria-label="Quitar búsqueda"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}

          {filtros.soloConDisponible && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-[#111827] dark:text-gray-300 border border-[#E5E7EB] dark:border-gray-600 rounded-md">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Solo disponible
              <button
                onClick={() => onFiltrosChange({ soloConDisponible: false })}
                className="hover:text-[#4B5563] dark:hover:text-gray-100 transition-colors duration-150"
                aria-label="Quitar filtro solo disponible"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}

          <button
            onClick={limpiarFiltros}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Limpiar todo
          </button>
        </div>
      )}

    </div>
  );
};

export default DisponibilidadToolbarEnhanced;
