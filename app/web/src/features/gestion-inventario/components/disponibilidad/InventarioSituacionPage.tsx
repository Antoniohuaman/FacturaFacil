// src/features/gestion-inventario/components/disponibilidad/InventarioSituacionPage.tsx

import React, { useState, useCallback } from 'react';
import { useInventarioDisponibilidad } from '../../hooks/useInventarioDisponibilidad';
import { usePreferenciasDisponibilidad } from '../../stores/usePreferenciasDisponibilidad';
import DisponibilidadToolbarCompact from './DisponibilidadToolbarCompact';
import DisponibilidadKPIs from './DisponibilidadKPIs';
import DisponibilidadTable from './DisponibilidadTable';
import DisponibilidadPagination from './DisponibilidadPagination';
import DisponibilidadSettings from './DisponibilidadSettings';
import type { DisponibilidadItem } from '../../models/disponibilidad.types';

interface InventarioSituacionPageProps {
  onExportar?: () => void;
  onActualizacionMasiva?: () => void;
  onTransferir?: () => void;
  onAjustar?: () => void;
  onAjustarProducto?: (productId: string, suggestedQty: number) => void;
}

/**
 * Vista principal de Situación Actual del inventario
 * Diseño moderno estilo Jira con filtros compactos y personalización avanzada
 */
const InventarioSituacionPage: React.FC<InventarioSituacionPageProps> = ({
  onExportar,
  onActualizacionMasiva,
  onTransferir,
  onAjustar,
  onAjustarProducto
}) => {
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

  // Estado local para panel de configuración y KPIs
  const [mostrandoSettings, setMostrandoSettings] = useState(false);
  const [kpisCollapsed, setKpisCollapsed] = useState(true); // Plegados por defecto

  // Handler para ajustar stock (abre modal de ajuste)
  const handleAjustarStock = useCallback((item: DisponibilidadItem) => {
    if (onAjustarProducto) {
      // Integra con modal existente
      onAjustarProducto(item.productoId, item.disponible);
    } else {
      // Fallback si no hay handler
      alert(`Ajustar stock de ${item.nombre} (SKU: ${item.sku})\nDisponible: ${item.disponible}`);
    }
  }, [onAjustarProducto]);

  // Handlers para filtros accionables desde KPIs
  const handleFilterSinStock = useCallback(() => {
    actualizarFiltros({ soloConDisponible: false });
    // TODO: Aplicar filtro específico para productos con disponible === 0
  }, [actualizarFiltros]);

  const handleFilterBajo = useCallback(() => {
    // TODO: Aplicar filtro para productos con situación "Bajo"
  }, []);

  const handleFilterCritico = useCallback(() => {
    // TODO: Aplicar filtro para productos con situación "Crítico"
  }, []);

  // Sincronizar items por página del store con el hook
  React.useEffect(() => {
    cambiarItemsPorPagina(itemsPorPagina);
  }, [itemsPorPagina, cambiarItemsPorPagina]);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Toolbar compacto con filtros y acciones */}
      <DisponibilidadToolbarCompact
        filtros={filtros}
        onFiltrosChange={actualizarFiltros}
        almacenesDisponibles={almacenesDisponibles}
        totalItems={infoPaginacion.totalItems}
        itemsMostrados={datos.length}
        onOpenSettings={() => setMostrandoSettings(true)}
        onExportar={onExportar}
        onActualizacionMasiva={onActualizacionMasiva}
        onTransferir={onTransferir}
        onAjustar={onAjustar}
      />

      {/* KPIs compactos y plegables */}
      {filtros.almacenId && (
        <DisponibilidadKPIs
          data={resumen}
          isCollapsed={kpisCollapsed}
          onToggleCollapse={() => setKpisCollapsed(!kpisCollapsed)}
          onFilterSinStock={handleFilterSinStock}
          onFilterBajo={handleFilterBajo}
          onFilterCritico={handleFilterCritico}
        />
      )}

      {/* Tabla principal */}
      <div className="flex-1 overflow-auto px-4 py-3">
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
