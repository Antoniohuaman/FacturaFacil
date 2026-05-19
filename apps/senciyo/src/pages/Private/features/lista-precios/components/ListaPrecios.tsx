import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { PageHeader } from '@/contasis';
import { getBusinessTodayISODate } from '@/shared/time/businessTime';
import type { NewColumnForm } from '../models/PriceTypes';
import { usePriceList } from '../hooks/usePriceList';
import { SummaryBar } from './SummaryBar';
import { ColumnManagement } from './ColumnManagement';
import { ProductPricing } from './ProductPricing';
import { PriceColumnsManagerButton } from './product-pricing/PriceColumnsManagerButton';
import { BotonFiltros } from './product-pricing/BotonFiltros';
import { PackagesTab } from './PackagesTab';
import { ImportPricesTab, type ExportPricesResult } from './ImportPricesTab';
import { ColumnModal } from './modals/ColumnModal';
import { PriceModal } from './modals/PriceModal';
import { hayFiltrosActivos } from '../models/filtrosPrecios';
import { useFocusFromQuery } from '../../../../../hooks/useFocusFromQuery';
import { useAutoExportRequest } from '@/shared/export/useAutoExportRequest';
import { REPORTS_HUB_PATH } from '@/shared/export/autoExportParams';
import {
  EXPORT_TITLE,
  buildTableColumnConfigs,
  buildExpectedHeaders,
  buildWorksheetColConfig,
  formatDateLabel
} from '../utils/importProcessing';

type TabType = 'columns' | 'products' | 'packages' | 'import';

export const ListaPrecios: React.FC = () => {
  useFocusFromQuery();
  // Estado local solo para el tab de Paquetes (que no está en el hook)
  const [packagesTabActive, setPackagesTabActive] = useState(false);

  const {
    // State
    columns,
    products,
    filteredProducts,
    loading,
    activeTab,
    showColumnModal,
    showProductPriceModal,
    editingColumn,
    selectedProduct,
    searchSKU,
    filtrosPrecios,
    catalogProducts,
    effectivePrices,

    // Actions
    setActiveTab,
    setSearchSKU,
    setFiltrosPrecios,
    configCanales,
    setPredeterminadoPOS,
    setPredeterminadoComprobantes,
    toggleColumnVisible,
    toggleColumnTableVisibility,
    toggleUsarEnPOS,
    toggleUsarEnComprobantes,
    reorderColumns,
    resetTableColumns,
    selectAllTableColumns,
    updateColumn,
    addOrUpdateProductPrice,
    applyImportedFixedPrices,
    setProductActiveUnit,
    openColumnModal,
    closeColumnModal,
    closePriceModal
  } = usePriceList();

  const assignPriceHandlerRef = useRef<(() => void) | null>(null);
  const { request: autoExportRequest, finish: finishAutoExport } = useAutoExportRequest('precios-listas');
  const autoExportHandledRef = useRef(false);
  const [exportingPrices, setExportingPrices] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const registerAssignPriceHandler = useCallback((handler: (() => void) | null) => {
    assignPriceHandlerRef.current = handler;
  }, []);

  const handleAssignPriceFromSummary = useCallback(() => {
    assignPriceHandlerRef.current?.();
  }, []);

  // Determinar tab activo (preferencia al tab del hook para columns/products)
  const currentTab: TabType = packagesTabActive ? 'packages' : activeTab;
  const tableColumnConfigs = useMemo(() => buildTableColumnConfigs(columns), [columns]);
  const visibleTableColumnsCount = tableColumnConfigs.length;

  const handleTabChange = (tab: TabType) => {
    if (tab === 'packages') {
      setPackagesTabActive(true);
    } else {
      setPackagesTabActive(false);
      setActiveTab(tab);
    }
  };

  useEffect(() => {
    if (currentTab !== 'products' && exportError) {
      setExportError(null);
    }
  }, [currentTab, exportError]);

  const handleSaveColumn = useCallback((data: NewColumnForm): boolean => {
    if (!editingColumn || !data.name.trim()) return false;
    updateColumn(editingColumn.id, { name: data.name.trim() });
    return true;
  }, [editingColumn, updateColumn]);

  const exportVisiblePrices = useCallback((filterSkus?: Set<string>): ExportPricesResult => {
    if (tableColumnConfigs.length === 0) {
      return { success: false, error: 'Activa al menos una columna visible en la tabla para exportar.' };
    }

    const exportHeaders = buildExpectedHeaders(tableColumnConfigs);
    const productPricesMap = new Map(products.map(p => [p.sku.toUpperCase(), p] as const));

    // Backward-compat price lookup: compound code → SUNAT fallback for prices stored before migration
    const getPrice = (product: ReturnType<typeof productPricesMap.get>, columnId: string, priceKey: string) => {
      if (!product) return undefined;
      const colPrices = product.prices[columnId];
      if (!colPrices) return undefined;
      const direct = colPrices[priceKey];
      if (direct && direct.type === 'fixed') return direct;
      if (priceKey.includes('__')) {
        const sunat = priceKey.split('__')[0].toUpperCase();
        const fallback = colPrices[sunat];
        if (fallback && fallback.type === 'fixed') return fallback;
      }
      return undefined;
    };

    const aoa: (string | number)[][] = [exportHeaders];

    catalogProducts.forEach(catalogProduct => {
      const sku = catalogProduct.codigo;
      if (filterSkus && !filterSkus.has(sku.toUpperCase())) return;

      const existingProduct = productPricesMap.get(sku.toUpperCase());
      const productName = catalogProduct.nombre;

      // Row for base unit
      const baseUnitCode = catalogProduct.unidad;
      if (baseUnitCode) {
        const priceKey = baseUnitCode.toUpperCase();
        const presentationLabel = catalogProduct.unitName || baseUnitCode;
        let validityIso: string | null = null;
        const priceCells: (string | number)[] = tableColumnConfigs.map(({ columnId }) => {
          const price = getPrice(existingProduct, columnId, priceKey);
          if (price) {
            if (!validityIso && price.validUntil) validityIso = price.validUntil;
            return price.value;
          }
          return '';
        });
        aoa.push([sku, productName, presentationLabel, ...priceCells, validityIso ? formatDateLabel(validityIso) : '', priceKey]);
      }

      // Rows for each presentation
      catalogProduct.unidadesMedidaAdicionales?.forEach(unit => {
        if (!unit.id || !unit.unidadCodigo) return;
        const priceKey = `${unit.unidadCodigo.toUpperCase()}__${unit.id}`;
        const presentationLabel = unit.nombre || unit.unidadCodigo;
        let validityIso: string | null = null;
        const priceCells: (string | number)[] = tableColumnConfigs.map(({ columnId }) => {
          const price = getPrice(existingProduct, columnId, priceKey);
          if (price) {
            if (!validityIso && price.validUntil) validityIso = price.validUntil;
            return price.value;
          }
          return '';
        });
        aoa.push([sku, productName, presentationLabel, ...priceCells, validityIso ? formatDateLabel(validityIso) : '', priceKey]);
      });
    });

    if (aoa.length <= 1) {
      return { success: false, error: 'No hay productos en el catálogo para exportar.' };
    }

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    worksheet['!cols'] = buildWorksheetColConfig(exportHeaders);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, EXPORT_TITLE);
    const today = getBusinessTodayISODate();
    XLSX.writeFile(workbook, `Exportacion_Precios_${today}.xlsx`);

    return { success: true };
  }, [catalogProducts, products, tableColumnConfigs]);

  const handleExportVisibleFromMain = useCallback(() => {
    if (exportingPrices) {
      return;
    }

    setExportError(null);

    if (visibleTableColumnsCount === 0) {
      setExportError('Activa al menos una columna visible en la tabla para exportar.');
      return;
    }

    setExportingPrices(true);
    try {
      const result = exportVisiblePrices(new Set(filteredProducts.map(p => p.sku.toUpperCase())));
      if (!result.success && result.error) {
        setExportError(result.error);
      }
    } catch (error) {
      console.error('[ListaPrecios] Error al exportar precios', error);
      setExportError('No se pudo exportar los precios. Inténtalo nuevamente.');
    } finally {
      setExportingPrices(false);
    }
  }, [exportVisiblePrices, exportingPrices, filteredProducts, visibleTableColumnsCount]);

  useEffect(() => {
    if (!autoExportRequest || autoExportHandledRef.current) {
      return;
    }

    if (currentTab !== 'products') {
      setPackagesTabActive(false);
      setActiveTab('products');
      return;
    }

    if (loading || visibleTableColumnsCount === 0) {
      return;
    }

    autoExportHandledRef.current = true;
    const runAutoExport = async () => {
      try {
        await handleExportVisibleFromMain();
      } finally {
        finishAutoExport(REPORTS_HUB_PATH);
      }
    };

    void runAutoExport();
  }, [autoExportRequest, currentTab, finishAutoExport, handleExportVisibleFromMain, loading, setActiveTab, setPackagesTabActive, visibleTableColumnsCount]);

  const handleExportAllFromImport = useCallback(() => {
    return exportVisiblePrices();
  }, [exportVisiblePrices]);

  const exportDisabled = visibleTableColumnsCount === 0 || exportingPrices;
  const exportDisabledReason = visibleTableColumnsCount === 0
    ? 'Activa al menos una columna visible en la tabla para exportar.'
    : undefined;

  const columnsManagerTrigger = (
    <PriceColumnsManagerButton
      columns={columns}
      onToggleColumnVisibility={toggleColumnTableVisibility}
      onReorderColumns={reorderColumns}
      onResetColumns={resetTableColumns}
      onSelectAllColumns={selectAllTableColumns}
    />
  );

  const claveFiltro = useMemo(
    () => hayFiltrosActivos(filtrosPrecios)
      ? `${filtrosPrecios.vigencia}:${filtrosPrecios.columnaId}:${filtrosPrecios.estado}`
      : '',
    [filtrosPrecios],
  );

  const disparadorFiltros = (
    <BotonFiltros
      filtros={filtrosPrecios}
      alCambiar={setFiltrosPrecios}
      columnas={columns}
    />
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <PageHeader 
        title="Lista de Precios"
      />

      {/* Tabs Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6" role="tablist">
        <div className="flex space-x-8">
          <button
            onClick={() => handleTabChange('products')}
            role="tab"
            aria-selected={currentTab === 'products'}
            aria-controls="products-panel"
            className={`py-4 border-b-2 font-medium text-sm transition-colors ${
              currentTab === 'products'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Precios por producto
          </button>
          <button
            onClick={() => handleTabChange('packages')}
            role="tab"
            aria-selected={currentTab === 'packages'}
            aria-controls="packages-panel"
            className={`py-4 border-b-2 font-medium text-sm transition-colors ${
              currentTab === 'packages'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Paquetes
          </button>
          <button
            onClick={() => handleTabChange('columns')}
            role="tab"
            aria-selected={currentTab === 'columns'}
            aria-controls="columns-panel"
            className={`py-4 border-b-2 font-medium text-sm transition-colors ${
              currentTab === 'columns'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Tipos de precio
          </button>
          <button
            onClick={() => handleTabChange('import')}
            role="tab"
            aria-selected={currentTab === 'import'}
            aria-controls="import-panel"
            className={`py-4 border-b-2 font-medium text-sm transition-colors ${
              currentTab === 'import'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Importar precios
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      {currentTab === 'products' && (
        <SummaryBar
          onAssignPrice={handleAssignPriceFromSummary}
          searchSKU={searchSKU}
          onSearchChange={setSearchSKU}
          filteredProductsCount={filteredProducts.length}
          onExportPrices={handleExportVisibleFromMain}
          exportDisabled={exportDisabled}
          exportBusy={exportingPrices}
          exportErrorMessage={exportError || undefined}
          exportDisabledReason={exportDisabledReason}
          disparadorFiltros={disparadorFiltros}
          columnsManagerTrigger={columnsManagerTrigger}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
            </div>
          </div>
        ) : currentTab === 'columns' ? (
          <ColumnManagement
            columns={columns}
            configCanales={configCanales}
            onEditColumn={(column) => openColumnModal(column)}
            onToggleEstado={toggleColumnVisible}
            onToggleUsarEnPOS={toggleUsarEnPOS}
            onToggleUsarEnComprobantes={toggleUsarEnComprobantes}
            onSetPredeterminadoPOS={setPredeterminadoPOS}
            onSetPredeterminadoComprobantes={setPredeterminadoComprobantes}
          />
        ) : currentTab === 'products' ? (
          <ProductPricing
            columns={columns}
            products={products}
            filteredProducts={filteredProducts}
            searchSKU={searchSKU}
            onSavePrice={addOrUpdateProductPrice}
            onUnitChange={setProductActiveUnit}
            catalogProducts={catalogProducts}
            effectivePrices={effectivePrices}
            registerAssignHandler={registerAssignPriceHandler}
            claveFiltro={claveFiltro}
          />
        ) : currentTab === 'import' ? (
          <ImportPricesTab
            columns={columns}
            products={products}
            catalogProducts={catalogProducts}
            loading={loading}
            onApplyImport={applyImportedFixedPrices}
            onExportPrices={handleExportAllFromImport}
          />
        ) : (
          <PackagesTab />
        )}
      </div>

      {/* Modals */}
      <ColumnModal
        isOpen={showColumnModal}
        onClose={closeColumnModal}
        onSave={handleSaveColumn}
        editingColumn={editingColumn}
      />

      <PriceModal
        isOpen={showProductPriceModal}
        onClose={closePriceModal}
        onSave={addOrUpdateProductPrice}
        columns={columns}
        selectedProduct={selectedProduct}
        selectedColumn={null}
        catalogProducts={catalogProducts}
        initialUnitCode={selectedProduct?.activeUnitCode}
        onSwitchToVolumeModal={({ columnId }) => {
          // Cerrar modal actual y mostrar mensaje informativo por ahora
          closePriceModal();
          const column = columns.find(col => col.id === columnId);
          if (column) {
            alert(`Esta columna (${column.name}) está configurada para precios por cantidad. Use el botón ⚙️ en la tabla para configurar los rangos.`);
          }
        }}
      />
    </div>
  );
};
