// src/features/gestion-inventario/components/disponibilidad/InventarioSituacionPage.tsx

import React, { useState, useCallback } from 'react';
import { useInventarioDisponibilidad } from '../../hooks/useInventarioDisponibilidad';
import { usePreferenciasDisponibilidad } from '../../stores/usePreferenciasDisponibilidad';
import DisponibilidadToolbarEnhanced from './DisponibilidadToolbarEnhanced';
import DisponibilidadTable from './DisponibilidadTable';
import DisponibilidadPagination from './DisponibilidadPagination';
import DisponibilidadSettings from './DisponibilidadSettings';
import type { DisponibilidadItem } from '../../models/disponibilidad.types';

type ThresholdField = 'stockMinimo' | 'stockMaximo';

interface ThresholdChangePayload {
  productoId: string;
  field: ThresholdField;
  value: number | null;
}

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
    almacenesDisponibles,
    filtros,
    ordenamiento,
    infoPaginacion,
    actualizarFiltros,
    cambiarOrdenamiento,
    irAPagina,
    cambiarItemsPorPagina,
    canEditThresholds,
    thresholdsTooltip,
    selectedWarehouse,
    updateStockThreshold
  } = useInventarioDisponibilidad();

  // Preferencias de UI
  const { densidad, columnasVisibles, itemsPorPagina } = usePreferenciasDisponibilidad();

  // Estado local para panel de configuración
  const [mostrandoSettings, setMostrandoSettings] = useState(false);

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

  // Sincronizar items por página del store con el hook
  React.useEffect(() => {
    cambiarItemsPorPagina(itemsPorPagina);
  }, [itemsPorPagina, cambiarItemsPorPagina]);

  const selectedWarehouseId = selectedWarehouse?.id;

  const handleThresholdChange = useCallback(async ({
    productoId,
    field,
    value
  }: ThresholdChangePayload) => {
    if (!selectedWarehouseId) {
      throw new Error('Selecciona un establecimiento y un almacén para editar los valores.');
    }

    await updateStockThreshold({
      productoId,
      warehouseId: selectedWarehouseId,
      field,
      value
    });
  }, [selectedWarehouseId, updateStockThreshold]);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Toolbar mejorado con filtros y acciones */}
      <DisponibilidadToolbarEnhanced
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

      {/* Tabla principal */}
      <div className="flex-1 overflow-auto px-4 py-3">
        <DisponibilidadTable
          datos={datos}
          densidad={densidad}
          columnasVisibles={columnasVisibles}
          ordenamiento={ordenamiento}
          onOrdenamientoChange={cambiarOrdenamiento}
          onAjustarStock={handleAjustarStock}
          canEditThresholds={canEditThresholds}
          editThresholdMessage={thresholdsTooltip}
          onUpdateThreshold={handleThresholdChange}
          selectedWarehouseName={selectedWarehouse?.name}
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
