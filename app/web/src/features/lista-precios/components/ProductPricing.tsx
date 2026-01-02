import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Column, Product, CatalogProduct, PriceForm } from '../models/PriceTypes';
import type { EffectivePriceMatrix, EffectivePriceResult } from '../utils/priceHelpers';
import { isGlobalColumn } from '../utils/priceHelpers';
import { VolumeMatrixModal } from './modals/VolumeMatrixModal';
import { PriceModal } from './modals/PriceModal';
import { useConfigurationContext } from '../../configuracion-sistema/context/ConfigurationContext';
import { ProductPricingTable } from './product-pricing/ProductPricingTable';
import type { CellStatus, InlineCellState } from './product-pricing/types';
import { FALLBACK_UNIT_CODE, cellKey, getDefaultValidityRange } from './product-pricing/utils';

interface ProductPricingProps {
  columns: Column[];
  products: Product[];
  filteredProducts: Product[];
  searchSKU: string;
  onSavePrice: (priceData: PriceForm) => Promise<boolean> | boolean;
  onUnitChange: (sku: string, unitCode: string) => void;
  catalogProducts?: CatalogProduct[];
  effectivePrices: EffectivePriceMatrix;
  registerAssignHandler?: (handler: (() => void) | null) => void;
}

interface SwitchToVolumePayload {
  columnId: string;
  unitCode?: string;
  sku?: string;
  productName?: string;
}

export const ProductPricing: React.FC<ProductPricingProps> = ({
  columns,
  products,
  filteredProducts,
  searchSKU,
  onSavePrice,
  onUnitChange,
  catalogProducts = [],
  effectivePrices,
  registerAssignHandler
}) => {
  const tableColumns = useMemo(() => (
    columns
      .filter((column) => column.isVisibleInTable !== false || column.isBase)
      .sort((a, b) => a.order - b.order)
  ), [columns]);
  const orderedColumns = useMemo(() => {
    const base = tableColumns.find(column => column.isBase);
    if (!base) return tableColumns;
    const rest = tableColumns.filter(column => column.id !== base.id);
    return [base, ...rest];
  }, [tableColumns]);
  const firstEditableColumn = useMemo(() => orderedColumns.find(column => !isGlobalColumn(column)), [orderedColumns]);
  const baseColumnId = orderedColumns.find(column => column.isBase)?.id;
  const firstVolumeColumn = useMemo(() => orderedColumns.find(column => column.mode === 'volume' && !isGlobalColumn(column)), [orderedColumns]);

  const { state: configState } = useConfigurationContext();
  const measurementUnits = configState.units;

  const unitsByCode = useMemo(() => {
    return new Map(measurementUnits.map(unit => [unit.code, unit] as const));
  }, [measurementUnits]);

  const resolveEffectivePrice = useCallback((sku: string, columnId: string, unitCode: string): EffectivePriceResult | undefined => {
    return effectivePrices[sku]?.[columnId]?.[unitCode];
  }, [effectivePrices]);

  // Estados para modales
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [volumeModalOpen, setVolumeModalOpen] = useState(false);
  const [unitMenuOpenSku, setUnitMenuOpenSku] = useState<string | null>(null);
  const [rowMenuOpenSku, setRowMenuOpenSku] = useState<string | null>(null);
  const [selectedUnitForModal, setSelectedUnitForModal] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<InlineCellState | null>(null);
  const [cellStatuses, setCellStatuses] = useState<Record<string, CellStatus>>({});
  const [cellSavingState, setCellSavingState] = useState<Record<string, boolean>>({});
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Estados para datos seleccionados
  const [selectedPriceColumn, setSelectedPriceColumn] = useState<Column | null>(null);
  const [selectedProductForPriceModal, setSelectedProductForPriceModal] = useState<Product | null>(null);
  const [selectedVolumePrice, setSelectedVolumePrice] = useState<{
    product: Product;
    column: Column;
  } | null>(null);

  const getBaseUnitForSKU = useCallback((sku: string): string => {
    const catalogProduct = catalogProducts.find(product => product.codigo === sku);
    return catalogProduct?.unidad || FALLBACK_UNIT_CODE;
  }, [catalogProducts]);

  const resolveActiveUnit = useCallback((product: Product): string => {
    return product.activeUnitCode || getBaseUnitForSKU(product.sku);
  }, [getBaseUnitForSKU]);

  const getUnitDisplay = useCallback((code: string): string => {
    const unit = unitsByCode.get(code);
    if (!unit) return code;
    const symbol = unit.symbol || unit.code;
    const name = unit.name || '';
    return `${symbol} ${name}`.trim();
  }, [unitsByCode]);

  const getUnitOptions = useCallback((product: Product) => {
    const catalogProduct = catalogProducts.find(p => p.codigo === product.sku);
    const seen = new Set<string>();
    const list: Array<{ code: string; label: string; isBase: boolean; factor?: number }> = [];

    const addOption = (code?: string, isBase = false, factor?: number) => {
      if (!code || seen.has(code)) return;
      seen.add(code);
      list.push({
        code,
        label: getUnitDisplay(code),
        isBase,
        factor
      });
    };

    if (catalogProduct) {
      addOption(catalogProduct.unidad, true);
      catalogProduct.unidadesMedidaAdicionales?.forEach(unit => addOption(unit.unidadCodigo, false, unit.factorConversion));
    }

    Object.values(product.prices).forEach(unitPrices => {
      Object.keys(unitPrices).forEach(code => addOption(code));
    });

    if (list.length === 0) {
      addOption(resolveActiveUnit(product), true);
    }

    return list;
  }, [catalogProducts, getUnitDisplay, resolveActiveUnit]);

  const getPriceForColumnUnit = useCallback((product: Product, columnId: string, unitOverride?: string) => {
    const unitCode = unitOverride || resolveActiveUnit(product);
    const unitPrices = product.prices[columnId];
    if (!unitPrices) return undefined;
    return unitPrices[unitCode];
  }, [resolveActiveUnit]);

  const handleUnitSelect = useCallback((product: Product, unitCode: string) => {
    if (resolveActiveUnit(product) === unitCode) {
      setUnitMenuOpenSku(null);
      return;
    }
    onUnitChange(product.sku, unitCode);
    setUnitMenuOpenSku(null);
  }, [onUnitChange, resolveActiveUnit]);

  const toggleUnitMenu = useCallback((sku: string) => {
    setUnitMenuOpenSku(prev => (prev === sku ? null : sku));
    setRowMenuOpenSku(null);
  }, []);

  const toggleRowMenu = useCallback((sku: string) => {
    setRowMenuOpenSku(prev => (prev === sku ? null : sku));
    setUnitMenuOpenSku(null);
  }, []);

  const toggleRowExpansion = useCallback((sku: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [sku]: !prev[sku]
    }));
  }, []);

  useEffect(() => {
    if (!unitMenuOpenSku && !rowMenuOpenSku) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-unit-selector="true"]') || target.closest('[data-row-menu="true"]')) {
        return;
      }
      setUnitMenuOpenSku(null);
      setRowMenuOpenSku(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [unitMenuOpenSku, rowMenuOpenSku]);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Calcular productos paginados
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, currentPage]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  // Resetear página cuando cambia el filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [searchSKU]);

  // Manejador para asignar precio - detecta el tipo según la columna
  const handleAssignPrice = useCallback((column?: Column) => {
    const preferredColumn = column && !isGlobalColumn(column) ? column : null;
    const targetColumn = preferredColumn || firstEditableColumn;
    if (!targetColumn) return;

    setSelectedProductForPriceModal(null);
    setSelectedUnitForModal(null);
    setUnitMenuOpenSku(null);
    
    if (targetColumn.mode === 'fixed') {
      setSelectedPriceColumn(targetColumn);
      setPriceModalOpen(true);
    } else if (targetColumn.mode === 'volume') {
      setSelectedPriceColumn(targetColumn);
      setSelectedVolumePrice(null); // Para productos nuevos
      setVolumeModalOpen(true);
    }
  }, [firstEditableColumn, setSelectedPriceColumn, setPriceModalOpen, setSelectedProductForPriceModal, setSelectedUnitForModal, setUnitMenuOpenSku, setSelectedVolumePrice, setVolumeModalOpen]);

  useEffect(() => {
    if (!registerAssignHandler) return;
    registerAssignHandler(handleAssignPrice);
    return () => registerAssignHandler(null);
  }, [registerAssignHandler, handleAssignPrice]);

  // Manejador para editar producto existente - detecta el tipo de precio a editar
  const handleEditProduct = (product: Product) => {
    setUnitMenuOpenSku(null);
    setRowMenuOpenSku(null);
    const activeUnit = resolveActiveUnit(product);
    setSelectedUnitForModal(activeUnit);
    setSelectedProductForPriceModal(product);

    const columnWithPrice = orderedColumns.find(column => !isGlobalColumn(column) && getPriceForColumnUnit(product, column.id));
    const targetColumn = columnWithPrice || firstEditableColumn;
    if (!targetColumn) return;

    const existingPrice = getPriceForColumnUnit(product, targetColumn.id);

    if (targetColumn.mode === 'fixed' || existingPrice?.type === 'fixed') {
      setSelectedPriceColumn(targetColumn);
      setPriceModalOpen(true);
    } else {
      setSelectedVolumePrice({ product, column: targetColumn });
      setVolumeModalOpen(true);
    }
  };

  // Manejadores para configurar precios existentes
  const handleConfigureVolumePrice = (product: Product, column: Column, unitOverride?: string) => {
    const resolvedUnit = unitOverride || resolveActiveUnit(product);
    setSelectedUnitForModal(resolvedUnit);
    setUnitMenuOpenSku(null);
    setRowMenuOpenSku(null);
    setSelectedVolumePrice({ product, column });
    setVolumeModalOpen(true);
  };

  // Manejador para cambiar de PriceModal a VolumeModal cuando se selecciona columna de volumen
  const handleSwitchToVolumeModal = ({ columnId, unitCode, sku, productName }: SwitchToVolumePayload) => {
    const column = columns.find(col => col.id === columnId);
    if (!column) return;

    const normalizedSku = sku?.trim() || selectedProductForPriceModal?.sku;
    const existingProduct = selectedProductForPriceModal || (normalizedSku ? products.find(product => product.sku === normalizedSku) : undefined);

    const resolvedProduct: Product | null = existingProduct || (normalizedSku ? {
      sku: normalizedSku,
      name: productName || normalizedSku,
      prices: {},
      activeUnitCode: unitCode
    } : null);

    if (!resolvedProduct) return;

    const nextUnit = unitCode || selectedUnitForModal || resolveActiveUnit(resolvedProduct);
    setSelectedProductForPriceModal(resolvedProduct);
    setSelectedUnitForModal(nextUnit);
    setUnitMenuOpenSku(null);
    setPriceModalOpen(false);
    setSelectedVolumePrice({ product: resolvedProduct, column });
    setSelectedPriceColumn(null);
    setVolumeModalOpen(true);
  };

  // Manejadores de guardado
  const handleSavePriceModal = async (priceData: PriceForm): Promise<boolean> => {
    const success = await Promise.resolve(onSavePrice(priceData));
    if (success) {
      setPriceModalOpen(false);
      setSelectedPriceColumn(null);
      setSelectedProductForPriceModal(null);
      setSelectedUnitForModal(null);
      setUnitMenuOpenSku(null);
      setRowMenuOpenSku(null);
    }
    return success;
  };

  const handleSaveVolumeMatrix = async (volumeData: PriceForm): Promise<boolean> => {
    const success = await Promise.resolve(onSavePrice(volumeData));
    if (success) {
      setVolumeModalOpen(false);
      setSelectedVolumePrice(null);
      setSelectedPriceColumn(null);
      setSelectedUnitForModal(null);
      setUnitMenuOpenSku(null);
      setRowMenuOpenSku(null);
    }
    return success;
  };

  const isEditingCell = useCallback((sku: string, columnId: string, unitCode: string) => {
    return editingCell?.sku === sku && editingCell?.columnId === columnId && editingCell?.unitCode === unitCode;
  }, [editingCell]);

  const beginInlineEdit = useCallback((product: Product, column: Column, providedUnitCode?: string) => {
    const unitCode = providedUnitCode || resolveActiveUnit(product);
    const price = getPriceForColumnUnit(product, column.id, unitCode);
    const meta = resolveEffectivePrice(product.sku, column.id, unitCode);
    const resolvedValue = price?.type === 'fixed'
      ? price.value
      : (typeof meta?.value === 'number' ? meta.value : undefined);
    const nextValue = typeof resolvedValue === 'number' ? resolvedValue.toString() : '';
    setEditingCell({ sku: product.sku, columnId: column.id, unitCode, value: nextValue });
    setCellStatuses(prev => ({ ...prev, [cellKey(product.sku, column.id, unitCode)]: {} }));
  }, [getPriceForColumnUnit, resolveActiveUnit, resolveEffectivePrice]);

  const cancelInlineEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  const handleInlineValueChange = useCallback((value: string) => {
    setEditingCell(prev => (prev ? { ...prev, value } : prev));
  }, []);

  const commitInlineSave = useCallback(async () => {
    if (!editingCell) return;

    const { sku, columnId, value, unitCode } = editingCell;
    const key = cellKey(sku, columnId, unitCode);
    const trimmedValue = value.trim();

    const product = products.find(p => p.sku === sku);
    const column = columns.find(col => col.id === columnId);

    if (!product || !column) {
      setCellStatuses(prev => ({ ...prev, [key]: { error: 'Producto o columna no disponible' } }));
      return;
    }

    if (trimmedValue) {
      const numericValue = parseFloat(trimmedValue);
      if (Number.isNaN(numericValue) || numericValue <= 0) {
        setCellStatuses(prev => ({ ...prev, [key]: { error: 'Ingresa un valor mayor a 0' } }));
        return;
      }
    }

    const existingPrice = getPriceForColumnUnit(product, columnId, unitCode);
    const { validFrom, validUntil } = existingPrice?.type === 'fixed'
      ? { validFrom: existingPrice.validFrom, validUntil: existingPrice.validUntil }
      : getDefaultValidityRange();

    setCellSavingState(prev => ({ ...prev, [key]: true }));
    setCellStatuses(prev => ({ ...prev, [key]: {} }));

    const payload: PriceForm = {
      type: 'fixed',
      sku,
      columnId,
      unitCode,
      value: trimmedValue,
      validFrom,
      validUntil
    };

    const success = await Promise.resolve(onSavePrice(payload));

    if (!success) {
      setCellStatuses(prev => ({ ...prev, [key]: { error: 'Error al guardar precio' } }));
    } else {
      setEditingCell(null);
    }

    setCellSavingState(prev => ({ ...prev, [key]: false }));
  }, [editingCell, products, columns, getPriceForColumnUnit, onSavePrice]);

  const priceModalUnitOptions = selectedProductForPriceModal
    ? getUnitOptions(selectedProductForPriceModal)
    : undefined;
  const inferredUnitForPriceModal = selectedProductForPriceModal
    ? (selectedUnitForModal || resolveActiveUnit(selectedProductForPriceModal))
    : selectedUnitForModal || undefined;

  const volumeModalProduct = selectedVolumePrice?.product;
  const volumeUnitOptions = volumeModalProduct ? getUnitOptions(volumeModalProduct) : undefined;
  const inferredUnitForVolume = volumeModalProduct
    ? (selectedUnitForModal || resolveActiveUnit(volumeModalProduct))
    : selectedUnitForModal || undefined;

  const shouldShowEmptyState = orderedColumns.length > 0 && filteredProducts.length === 0;
  const showNoCatalogProducts = shouldShowEmptyState && products.length === 0;

  return (
    <div className="p-5">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-5">
          <ProductPricingTable
            orderedColumns={orderedColumns}
            baseColumnId={baseColumnId}
            paginatedProducts={paginatedProducts}
            expandedRows={expandedRows}
            unitMenuOpenSku={unitMenuOpenSku}
            rowMenuOpenSku={rowMenuOpenSku}
            onToggleUnitMenu={toggleUnitMenu}
            onToggleRowMenu={toggleRowMenu}
            onToggleRowExpansion={toggleRowExpansion}
            onUnitSelect={handleUnitSelect}
            getUnitOptions={getUnitOptions}
            resolveActiveUnit={resolveActiveUnit}
            getUnitDisplay={getUnitDisplay}
            getBaseUnitForSKU={getBaseUnitForSKU}
            firstVolumeColumn={firstVolumeColumn}
            onEditProduct={handleEditProduct}
            onConfigureVolumePrice={handleConfigureVolumePrice}
            getPriceForColumnUnit={getPriceForColumnUnit}
            resolveEffectivePrice={resolveEffectivePrice}
            isEditingCell={isEditingCell}
            beginInlineEdit={beginInlineEdit}
            handleInlineValueChange={handleInlineValueChange}
            commitInlineSave={commitInlineSave}
            cancelInlineEdit={cancelInlineEdit}
            cellStatuses={cellStatuses}
            cellSavingState={cellSavingState}
            editingCell={editingCell}
          />

          {/* Empty States */}
          {shouldShowEmptyState && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🔍</div>
              {showNoCatalogProducts ? (
                <>
                  <p className="font-medium">No hay productos, crea tus productos en el módulo Productos</p>
                  <p className="text-sm mt-1">Registra tus SKU en el módulo Productos para comenzar a asignar precios.</p>
                </>
              ) : (
                <>
                  <p className="font-medium">No se encontraron productos</p>
                  <p className="text-sm mt-1">No hay productos que coincidan con "{searchSKU}"</p>
                </>
              )}
            </div>
          )}

          {/* Stats Footer */}
          {products.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div>
                  <span className="font-medium">{products.length}</span> producto{products.length !== 1 ? 's' : ''}
                  {searchSKU && (
                    <span> · <span className="font-medium">{filteredProducts.length}</span> mostrado{filteredProducts.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
                <div>
                  <span className="font-medium">{tableColumns.length}</span> columna{tableColumns.length !== 1 ? 's' : ''} visible{tableColumns.length !== 1 ? 's' : ''} en tabla
                </div>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredProducts.length)} de {filteredProducts.length}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Primera
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <span className="px-4 py-1 text-sm">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Última
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de precio fijo */}
      <PriceModal
        isOpen={priceModalOpen}
        onClose={() => {
          setPriceModalOpen(false);
          setSelectedPriceColumn(null);
          setSelectedProductForPriceModal(null);
          setSelectedUnitForModal(null);
          setUnitMenuOpenSku(null);
          setRowMenuOpenSku(null);
        }}
        onSave={handleSavePriceModal}
        columns={columns}
        selectedProduct={selectedProductForPriceModal}
        selectedColumn={selectedPriceColumn}
        catalogProducts={catalogProducts}
        initialUnitCode={inferredUnitForPriceModal}
        unitOptions={priceModalUnitOptions}
        onSwitchToVolumeModal={handleSwitchToVolumeModal}
      />

      {/* Modal de matriz de volumen */}
      {(selectedVolumePrice || (volumeModalOpen && selectedPriceColumn)) && (
        <VolumeMatrixModal
          isOpen={volumeModalOpen}
          onClose={() => {
            setVolumeModalOpen(false);
            setSelectedVolumePrice(null);
            setSelectedPriceColumn(null);
            setSelectedUnitForModal(null);
            setUnitMenuOpenSku(null);
            setRowMenuOpenSku(null);
          }}
          onSave={handleSaveVolumeMatrix}
          selectedProduct={selectedVolumePrice?.product || null}
          column={selectedVolumePrice?.column || selectedPriceColumn || columns[0]}
          catalogProducts={catalogProducts}
          initialUnitCode={inferredUnitForVolume}
          unitOptions={volumeUnitOptions}
        />
      )}
    </div>
  );
};