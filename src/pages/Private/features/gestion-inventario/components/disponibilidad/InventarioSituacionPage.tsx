// src/features/gestion-inventario/components/disponibilidad/InventarioSituacionPage.tsx

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useInventarioDisponibilidad } from '../../hooks/useInventarioDisponibilidad';
import { usePreferenciasDisponibilidad } from '../../stores/usePreferenciasDisponibilidad';
import DisponibilidadToolbarEnhanced from './DisponibilidadToolbarEnhanced';
import DisponibilidadTable from './DisponibilidadTable';
import DisponibilidadPagination from './DisponibilidadPagination';
import DisponibilidadSettings from './DisponibilidadSettings';
import type { DisponibilidadItem } from '../../models/disponibilidad.types';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import type { Warehouse } from '../../../configuracion-sistema/modelos/Warehouse';
import * as XLSX from 'xlsx';
import { getBusinessTodayISODate } from '@/shared/time/businessTime';
import type { AutoExportRequest } from '@/shared/export/autoExportParams';
import { REPORTS_HUB_PATH } from '@/shared/export/autoExportParams';

type ThresholdField = 'stockMinimo' | 'stockMaximo';

interface ThresholdChangePayload {
  productoId: string;
  field: ThresholdField;
  value: number | null;
}

interface InventarioSituacionPageProps {
  onActualizacionMasiva?: () => void;
  onTransferir?: () => void;
  onAjustar?: () => void;
  onAjustarProducto?: (productId: string, suggestedQty: number) => void;
  autoExportRequest?: AutoExportRequest | null;
  onAutoExportFinished?: (fallbackPath?: string) => void;
}

/**
 * Vista principal de Situación Actual del inventario
 * Diseño moderno estilo Jira con filtros compactos y personalización avanzada
 */
const InventarioSituacionPage: React.FC<InventarioSituacionPageProps> = ({
  onActualizacionMasiva,
  onTransferir,
  onAjustar,
  onAjustarProducto,
  autoExportRequest,
  onAutoExportFinished
}) => {
  // Datos y lógica de disponibilidad
  const {
    datos,
    almacenesDisponibles,
    datosExportacion,
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
    selectedEstablecimiento,
    warehouseScope,
    updateStockThreshold
  } = useInventarioDisponibilidad();
  const { state: configState } = useConfigurationContext();

  // Preferencias de UI
  const { densidad, columnasVisibles, itemsPorPagina } = usePreferenciasDisponibilidad();

  // Estado local para panel de configuración
  const [mostrandoSettings, setMostrandoSettings] = useState(false);
  const autoExportHandledRef = useRef(false);

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

  const warehouseMap = useMemo(() => {
    return new Map(configState.warehouses.map((warehouse) => [warehouse.id, warehouse]));
  }, [configState.warehouses]);

  const establishmentMap = useMemo(() => {
    return new Map(configState.establishments.map((est) => [est.id, est]));
  }, [configState.establishments]);

  const handleExportStockActual = useCallback(() => {
    const scopeWarehouses = warehouseScope
      .map(id => warehouseMap.get(id))
      .filter((warehouse): warehouse is Warehouse => Boolean(warehouse));

    const formatWarehouseLabel = (warehouse?: Warehouse) => {
      if (!warehouse) return '';
      const code = warehouse.code || warehouse.id;
      if (code && warehouse.name) return `${code} - ${warehouse.name}`;
      return warehouse.name || code || warehouse.id;
    };

    const formatEstablishmentLabel = (establishment?: { id?: string; code?: string; name?: string }) => {
      if (!establishment) return '';
      const fromMap = establishment.id ? establishmentMap.get(establishment.id) : undefined;
      const code = fromMap?.code ?? establishment.code ?? establishment.id;
      const name = fromMap?.name ?? establishment.name;
      if (code && name) return `${code} - ${name}`;
      return name || code || establishment.id || '';
    };

    const derivedEstablishments = new Map<string, { id?: string; code?: string; name?: string }>();
    scopeWarehouses.forEach(warehouse => {
      if (!warehouse.establishmentId) {
        return;
      }
      derivedEstablishments.set(warehouse.establishmentId, {
        id: warehouse.establishmentId,
        code: warehouse.establishmentCode,
        name: warehouse.establishmentName
      });
    });

    const establishmentLabel = (() => {
      if (selectedEstablecimiento) {
        return formatEstablishmentLabel(selectedEstablecimiento);
      }
      if (derivedEstablishments.size === 1) {
        const single = derivedEstablishments.values().next().value;
        return formatEstablishmentLabel(single);
      }
      if (derivedEstablishments.size > 1) {
        return 'Todos los establecimientos (consolidado)';
      }
      if (filtros.establecimientoId) {
        return formatEstablishmentLabel({ id: filtros.establecimientoId });
      }
      return 'No definido';
    })();

    const warehouseLabel = (() => {
      if (selectedWarehouse) {
        return formatWarehouseLabel(selectedWarehouse);
      }
      if (scopeWarehouses.length === 1) {
        return formatWarehouseLabel(scopeWarehouses[0]);
      }
      if (scopeWarehouses.length > 1) {
        return 'Todos los almacenes (consolidado)';
      }
      if (filtros.almacenId) {
        return filtros.almacenId;
      }
      return 'Sin almacenes disponibles';
    })();

    const includedCodes = scopeWarehouses
      .map(warehouse => warehouse.code || warehouse.id)
      .filter(Boolean)
      .join(', ');

    const headers = [
      'Establecimiento',
      'Almacén (alcance)',
      'Almacenes incluidos (códigos)',
      'Código (SKU)',
      'Producto',
      'Unidad mínima',
      'Real',
      'Reservado',
      'Disponible',
      'Stock mínimo',
      'Stock máximo',
      'Estado'
    ];

    const exportRows = datosExportacion.map(item => ({
      'Establecimiento': establishmentLabel,
      'Almacén (alcance)': warehouseLabel,
      'Almacenes incluidos (códigos)': includedCodes || '—',
      'Código (SKU)': item.sku ?? '',
      'Producto': item.nombre,
      'Unidad mínima': item.unidadMinima,
      'Real': item.real,
      'Reservado': item.reservado,
      'Disponible': item.disponible,
      'Stock mínimo': item.stockMinimo ?? '',
      'Stock máximo': item.stockMaximo ?? '',
      'Estado': item.situacion
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows, { header: headers });
    worksheet['!cols'] = [
      { wch: 28 },
      { wch: 28 },
      { wch: 32 },
      { wch: 15 },
      { wch: 30 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Actual');
    const fileName = `stock_actual_${getBusinessTodayISODate()}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }, [
    datosExportacion,
    filtros.almacenId,
    filtros.establecimientoId,
    selectedEstablecimiento,
    selectedWarehouse,
    warehouseMap,
    warehouseScope,
    establishmentMap
  ]);

  useEffect(() => {
    if (!autoExportRequest || autoExportHandledRef.current) {
      return;
    }

    autoExportHandledRef.current = true;
    const runAutoExport = async () => {
      try {
        await handleExportStockActual();
      } finally {
        onAutoExportFinished?.(REPORTS_HUB_PATH);
      }
    };

    void runAutoExport();
  }, [autoExportRequest, handleExportStockActual, onAutoExportFinished]);

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
        onExportar={handleExportStockActual}
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
