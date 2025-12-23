import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { getBusinessTodayISODate } from '@/shared/time/businessTime';
import type { Column, NewColumnForm, Product } from '../models/PriceTypes';
import { usePriceList } from '../hooks/usePriceList';
import { SummaryBar } from './SummaryBar';
import { ColumnManagement } from './ColumnManagement';
import { ProductPricing } from './ProductPricing';
import { PackagesTab } from './PackagesTab';
import { ImportPricesTab, type ExportPricesResult } from './ImportPricesTab';
import { ColumnModal } from './modals/ColumnModal';
import { PriceModal } from './modals/PriceModal';
import { isFixedColumn } from '../utils/priceHelpers';
import { useFocusFromQuery } from '../../../hooks/useFocusFromQuery';
import {
  EXPORT_TITLE,
  SKU_HEADER,
  UNIT_HEADER,
  VALIDITY_HEADER,
  buildTableColumnConfigs,
  buildExpectedHeaders,
  collectUnitsWithPrices,
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
    error,
    activeTab,
    showColumnModal,
    showProductPriceModal,
    editingColumn,
    selectedProduct,
    searchSKU,
    catalogProducts,
    effectivePrices,

    // Actions
    setActiveTab,
    setSearchSKU,
    addColumn,
    deleteColumn,
    toggleColumnVisibility,
    toggleColumnTableVisibility,
    updateColumn,
    addOrUpdateProductPrice,
    applyImportedFixedPrices,
    setProductActiveUnit,
    openColumnModal,
    closeColumnModal,
    closePriceModal
  } = usePriceList();

  const assignPriceHandlerRef = useRef<(() => void) | null>(null);
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

  const handleSaveColumn = useCallback((data: NewColumnForm) => {
    const trimmedName = data.name.trim();
    if (!trimmedName && !editingColumn) {
      return false;
    }

    const nextVisible = typeof data.visible === 'boolean' ? data.visible : true;
    const nextTableVisibility = data.isVisibleInTable !== false;

    if (editingColumn) {
      const isFixed = isFixedColumn(editingColumn);
      const updates: Partial<Column> = {
        visible: nextVisible,
        isVisibleInTable: nextTableVisibility
      };

      if (!isFixed) {
        updates.name = trimmedName;
      }

      if (!isFixed && editingColumn.kind === 'manual') {
        updates.mode = data.mode;
      }

      if (editingColumn.kind === 'global-discount' || editingColumn.kind === 'global-increase') {
        updates.globalRuleType = data.globalRuleType;
        updates.globalRuleValue = typeof data.globalRuleValue === 'number'
          ? Math.max(data.globalRuleValue, 0)
          : null;
      }

      updateColumn(editingColumn.id, updates);
      return true;
    }

    return addColumn({
      name: trimmedName,
      mode: data.mode,
      visible: nextVisible,
      isVisibleInTable: nextTableVisibility,
      kind: 'manual'
    });
  }, [addColumn, editingColumn, updateColumn]);

  const exportVisiblePrices = useCallback((productsToExport?: Product[]): ExportPricesResult => {
    if (tableColumnConfigs.length === 0) {
      return { success: false, error: 'Activa al menos una columna visible en la tabla para exportar.' };
    }

    const expectedHeaders = buildExpectedHeaders(tableColumnConfigs);
    const allowedColumnIds = new Set(tableColumnConfigs.map(column => column.columnId));
    const catalogLookup = new Map(catalogProducts.map(product => [product.codigo.toUpperCase(), product] as const));
    const sourceProducts = productsToExport ?? products;

    const aoa: (string | number)[][] = [expectedHeaders];
    let exportedRows = 0;

    sourceProducts.forEach(product => {
      const unitCodes = collectUnitsWithPrices(product, allowedColumnIds);
      if (unitCodes.length === 0) {
        return;
      }

      const catalogUnit = catalogLookup.get(product.sku)?.unidad;
      const orderedUnits = [...unitCodes].sort((a, b) => {
        if (catalogUnit) {
          if (a === catalogUnit && b !== catalogUnit) return -1;
          if (b === catalogUnit && a !== catalogUnit) return 1;
        }
        if (product.activeUnitCode) {
          if (a === product.activeUnitCode && b !== product.activeUnitCode) return -1;
          if (b === product.activeUnitCode && a !== product.activeUnitCode) return 1;
        }
        return a.localeCompare(b);
      });

      orderedUnits.forEach(unitCode => {
        const row: Record<string, string | number> = {
          [SKU_HEADER]: product.sku,
          [UNIT_HEADER]: unitCode
        };

        let validityIso: string | null = null;

        tableColumnConfigs.forEach(({ columnId, header }) => {
          const price = product.prices[columnId]?.[unitCode];
          if (price && price.type === 'fixed') {
            row[header] = price.value;
            if (!validityIso && price.validUntil) {
              validityIso = price.validUntil;
            }
          } else {
            row[header] = '';
          }
        });

        row[VALIDITY_HEADER] = validityIso ? formatDateLabel(validityIso) : '';
        const orderedRow = expectedHeaders.map(header => row[header] ?? '');
        aoa.push(orderedRow);
        exportedRows += 1;
      });
    });

    if (exportedRows === 0) {
      return { success: false, error: 'No hay precios registrados para las columnas visibles.' };
    }

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
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
      const result = exportVisiblePrices(filteredProducts);
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

  const handleExportAllFromImport = useCallback(() => {
    return exportVisiblePrices(products);
  }, [exportVisiblePrices, products]);

  const exportDisabled = visibleTableColumnsCount === 0 || exportingPrices;
  const exportDisabledReason = visibleTableColumnsCount === 0
    ? 'Activa al menos una columna visible en la tabla para exportar.'
    : undefined;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lista de Precios</h1>
          </div>
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              ⚠️ {error}
            </div>
          )}
        </div>
      </div>

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
            Plantilla de columnas
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
      <SummaryBar
        columns={columns}
        onAssignPrice={handleAssignPriceFromSummary}
        viewMode={currentTab}
        searchSKU={currentTab === 'products' ? searchSKU : undefined}
        onSearchChange={currentTab === 'products' ? setSearchSKU : undefined}
        filteredProductsCount={currentTab === 'products' ? filteredProducts.length : undefined}
        onExportPrices={currentTab === 'products' ? handleExportVisibleFromMain : undefined}
        exportDisabled={currentTab === 'products' ? exportDisabled : undefined}
        exportBusy={currentTab === 'products' ? exportingPrices : undefined}
        exportErrorMessage={currentTab === 'products' ? exportError || undefined : undefined}
        exportDisabledReason={currentTab === 'products' ? exportDisabledReason : undefined}
      />

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
            onAddColumn={() => openColumnModal()}
            onEditColumn={(column) => openColumnModal(column)}
            onDeleteColumn={deleteColumn}
            onToggleVisibility={toggleColumnVisibility}
            onToggleTableVisibility={toggleColumnTableVisibility}
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
