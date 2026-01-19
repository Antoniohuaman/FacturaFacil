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
import type { Almacen } from '../../../configuracion-sistema/modelos/Almacen';
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
    selectedalmacen,
    selectedEstablecimiento,
    almacenescope,
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

  const selectedalmacenId = selectedalmacen?.id;

  const handleThresholdChange = useCallback(async ({
    productoId,
    field,
    value
  }: ThresholdChangePayload) => {
    if (!selectedalmacenId) {
      throw new Error('Selecciona un establecimiento y un almacén para editar los valores.');
    }

    await updateStockThreshold({
      productoId,
      almacenId: selectedalmacenId,
      field,
      value
    });
  }, [selectedalmacenId, updateStockThreshold]);

  const almacenMap = useMemo(() => {
    return new Map(configState.almacenes.map((almacen) => [almacen.id, almacen]));
  }, [configState.almacenes]);

  const establishmentMap = useMemo(() => {
    return new Map(configState.establishments.map((est) => [est.id, est]));
  }, [configState.establishments]);

  const handleExportStockActual = useCallback(() => {
    const scopealmacenes = almacenescope
      .map(id => almacenMap.get(id))
      .filter((almacen): almacen is Almacen => Boolean(almacen));

    const formatalmacenLabel = (almacen?: Almacen) => {
      if (!almacen) return '';
      const code = almacen.code || almacen.id;
      if (code && almacen.name) return `${code} - ${almacen.name}`;
      return almacen.name || code || almacen.id;
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
    scopealmacenes.forEach(almacen => {
      if (!almacen.establishmentId) {
        return;
      }
      derivedEstablishments.set(almacen.establishmentId, {
        id: almacen.establishmentId,
        code: almacen.establishmentCode,
        name: almacen.establishmentName
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

    const almacenLabel = (() => {
      if (selectedalmacen) {
        return formatalmacenLabel(selectedalmacen);
      }
      if (scopealmacenes.length === 1) {
        return formatalmacenLabel(scopealmacenes[0]);
      }
      if (scopealmacenes.length > 1) {
        return 'Todos los almacenes (consolidado)';
      }
      if (filtros.almacenId) {
        return filtros.almacenId;
      }
      return 'Sin almacenes disponibles';
    })();

    const includedCodes = scopealmacenes
      .map(almacen => almacen.code || almacen.id)
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
      'Almacén (alcance)': almacenLabel,
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
    selectedalmacen,
    almacenMap,
    almacenescope,
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
          selectednombreAlmacen={selectedalmacen?.name}
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
