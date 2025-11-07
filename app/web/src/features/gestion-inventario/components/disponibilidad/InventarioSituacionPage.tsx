// src/features/gestion-inventario/components/disponibilidad/InventarioSituacionPage.tsx

import React, { useState, useCallback } from 'react';
import { useInventarioDisponibilidad } from '../../hooks/useInventarioDisponibilidad';
import { usePreferenciasDisponibilidad } from '../../stores/usePreferenciasDisponibilidad';
import DisponibilidadToolbar from './DisponibilidadToolbar';
import DisponibilidadTable from './DisponibilidadTable';
import DisponibilidadPagination from './DisponibilidadPagination';
import DisponibilidadSettings from './DisponibilidadSettings';
import type { DisponibilidadItem } from '../../models/disponibilidad.types';

/**
 * Vista principal de Situación Actual del inventario
 * Diseño moderno estilo Jira con filtros compactos y personalización avanzada
 */
const InventarioSituacionPage: React.FC = () => {
  // Datos y lógica de disponibilidad
  const {
    datos,
    resumen,
    almacenesDisponibles,
    filtros,
    ordenamiento,
    infoPaginacion,
    actualizarFiltros,
    cambiarOrdenamiento,
    irAPagina,
    cambiarItemsPorPagina
  } = useInventarioDisponibilidad();

  // Preferencias de UI
  const { densidad, columnasVisibles, itemsPorPagina } = usePreferenciasDisponibilidad();

  // Estado local para panel de configuración
  const [mostrandoSettings, setMostrandoSettings] = useState(false);

  // Handler para ajustar stock (abre modal de ajuste)
  const handleAjustarStock = useCallback((item: DisponibilidadItem) => {
    // TODO: Integrar con modal de ajuste existente
    alert(`Ajustar stock de ${item.nombre} (SKU: ${item.sku})\nDisponible: ${item.disponible}`);
  }, []);

  // Sincronizar items por página del store con el hook
  React.useEffect(() => {
    cambiarItemsPorPagina(itemsPorPagina);
  }, [itemsPorPagina, cambiarItemsPorPagina]);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header con título y acciones */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Situación Actual
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Visualiza el stock real, reservado y disponible por almacén
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Resumen compacto */}
            {filtros.almacenId && (
              <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {resumen.totalProductos}
                  </p>
                </div>
                <div className="h-8 w-px bg-gray-300 dark:bg-gray-600" />
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Disponible</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {resumen.totalDisponible.toLocaleString()}
                  </p>
                </div>
                <div className="h-8 w-px bg-gray-300 dark:bg-gray-600" />
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Sin stock</p>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">
                    {resumen.sinStock}
                  </p>
                </div>
                <div className="h-8 w-px bg-gray-300 dark:bg-gray-600" />
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Valor</p>
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    S/ {resumen.valorTotal.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            )}

            {/* Botón de configuración */}
            <button
              onClick={() => setMostrandoSettings(true)}
              className="p-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              title="Personalizar vista"
            >
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar con filtros */}
      <DisponibilidadToolbar
        filtros={filtros}
        onFiltrosChange={actualizarFiltros}
        almacenesDisponibles={almacenesDisponibles}
        totalItems={infoPaginacion.totalItems}
        itemsMostrados={datos.length}
      />

      {/* Tabla principal */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <DisponibilidadTable
          datos={datos}
          densidad={densidad}
          columnasVisibles={columnasVisibles}
          ordenamiento={ordenamiento}
          onOrdenamientoChange={cambiarOrdenamiento}
          onAjustarStock={handleAjustarStock}
        />
      </div>

      {/* Paginación */}
      {infoPaginacion.totalItems > 0 && (
        <DisponibilidadPagination
          info={infoPaginacion}
          onPaginaChange={irAPagina}
          onItemsPorPaginaChange={(items) => {
            usePreferenciasDisponibilidad.getState().cambiarItemsPorPagina(items);
            cambiarItemsPorPagina(items);
          }}
        />
      )}

      {/* Panel de configuración */}
      <DisponibilidadSettings
        isOpen={mostrandoSettings}
        onClose={() => setMostrandoSettings(false)}
        filtrosActuales={filtros}
      />
    </div>
  );
};

export default InventarioSituacionPage;
