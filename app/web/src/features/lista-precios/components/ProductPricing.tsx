import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Search, X, Settings, ChevronDown, ChevronRight, Check, MoreHorizontal, Loader2, Pencil } from 'lucide-react';
import type { Column, Product, CatalogProduct, PriceForm, Price } from '../models/PriceTypes';
import { filterVisibleColumns, formatPrice, formatDate, getVolumePreview, getVolumeTooltip, getPriceRange } from '../utils/priceHelpers';
import { VolumeMatrixModal } from './modals/VolumeMatrixModal';
import { PriceModal } from './modals/PriceModal';
import { useConfigurationContext } from '../../configuracion-sistema/context/ConfigurationContext';

interface ProductPricingProps {
  columns: Column[];
  products: Product[];
  filteredProducts: Product[];
  searchSKU: string;
  onSearchChange: (value: string) => void;
  onSavePrice: (priceData: PriceForm) => Promise<boolean> | boolean;
  onUnitChange: (sku: string, unitCode: string) => void;
  catalogProducts?: CatalogProduct[];
  registerAssignHandler?: (handler: (() => void) | null) => void;
}

interface SwitchToVolumePayload {
  columnId: string;
  unitCode?: string;
  sku?: string;
  productName?: string;
}

interface InlineCellState {
  sku: string;
  columnId: string;
  unitCode: string;
  value: string;
}

interface CellStatus {
  error?: string;
}

const FALLBACK_UNIT_CODE = 'NIU';

const getDefaultValidityRange = () => {
  const today = new Date();
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  return {
    validFrom: today.toISOString().split('T')[0],
    validUntil: nextYear.toISOString().split('T')[0]
  };
};

const cellKey = (sku: string, columnId: string, unitCode: string) => `${sku}::${columnId}::${unitCode}`;

export const ProductPricing: React.FC<ProductPricingProps> = ({
  columns,
  products,
  filteredProducts,
  searchSKU,
  onSearchChange,
  onSavePrice,
  onUnitChange,
  catalogProducts = [],
  registerAssignHandler
}) => {
  const visibleColumns = filterVisibleColumns(columns);
  const orderedColumns = useMemo(() => {
    const base = visibleColumns.find(column => column.isBase);
    if (!base) return visibleColumns;
    const rest = visibleColumns.filter(column => column.id !== base.id);
    return [base, ...rest];
  }, [visibleColumns]);
  const baseColumnId = orderedColumns.find(column => column.isBase)?.id;
  const totalColumns = orderedColumns.length + 5; // toggle + SKU + nombre + unidad + acciones

  const { state: configState } = useConfigurationContext();
  const measurementUnits = configState.units;

  const unitsByCode = useMemo(() => {
    return new Map(measurementUnits.map(unit => [unit.code, unit] as const));
  }, [measurementUnits]);

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
    // Si no se especifica columna, usar la primera visible
    const targetColumn = column || orderedColumns[0];
    
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
  }, [orderedColumns, setSelectedPriceColumn, setPriceModalOpen, setSelectedProductForPriceModal, setSelectedUnitForModal, setUnitMenuOpenSku, setSelectedVolumePrice, setVolumeModalOpen]);

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

    const columnWithPrice = orderedColumns.find(column => getPriceForColumnUnit(product, column.id));
    const targetColumn = columnWithPrice || orderedColumns[0];
    if (!targetColumn) return;

    const existingPrice = columnWithPrice ? getPriceForColumnUnit(product, columnWithPrice.id) : null;

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
    const nextValue = price?.type === 'fixed' ? price.value.toString() : '';
    setEditingCell({ sku: product.sku, columnId: column.id, unitCode, value: nextValue });
    setCellStatuses(prev => ({ ...prev, [cellKey(product.sku, column.id, unitCode)]: {} }));
  }, [getPriceForColumnUnit, resolveActiveUnit]);

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

    if (!trimmedValue) {
      setCellStatuses(prev => ({ ...prev, [key]: { error: 'Ingresa un precio' } }));
      return;
    }

    const product = products.find(p => p.sku === sku);
    const column = columns.find(col => col.id === columnId);

    if (!product || !column) {
      setCellStatuses(prev => ({ ...prev, [key]: { error: 'Producto o columna no disponible' } }));
      return;
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

  const renderUnitSelector = (product: Product) => {
    const options = getUnitOptions(product);
    const activeUnit = resolveActiveUnit(product);
    const activeLabel = getUnitDisplay(activeUnit);
    const baseUnitCode = getBaseUnitForSKU(product.sku);
    const baseUnitLabel = getUnitDisplay(baseUnitCode);

    return (
      <div className="relative inline-block" data-unit-selector="true">
        <button
          type="button"
          onClick={() => setUnitMenuOpenSku(prev => (prev === product.sku ? null : product.sku))}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-gray-200 bg-white text-[11px] font-semibold text-gray-700 shadow-sm hover:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200"
        >
          <span className="text-[11px] font-bold text-gray-900">{activeUnit}</span>
          <span className="text-[11px] text-gray-600 truncate max-w-[90px]">{activeLabel}</span>
          <ChevronDown size={12} className="text-gray-400" />
        </button>

        {unitMenuOpenSku === product.sku && (
          <div className="absolute z-20 mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg p-1">
            {options.map(option => (
              <button
                key={`${product.sku}-${option.code}`}
                type="button"
                onClick={() => handleUnitSelect(product, option.code)}
                className={`w-full text-left px-3 py-2 rounded-md text-xs flex items-start justify-between gap-2 hover:bg-blue-50 ${option.code === activeUnit ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
              >
                <div>
                  <div className="font-semibold flex items-center gap-1">
                    <span>{option.code}</span>
                    <span className="text-[11px] font-normal text-gray-500">{option.label}</span>
                  </div>
                  {option.factor && (
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      1 {option.code} = {option.factor} {baseUnitLabel}
                    </div>
                  )}
                </div>
                {option.code === activeUnit && <Check size={12} className="text-blue-600 mt-1" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderPriceCell = (product: Product, column: Column) => {
    const activeUnit = resolveActiveUnit(product);
    const price = getPriceForColumnUnit(product, column.id, activeUnit);
    const key = cellKey(product.sku, column.id, activeUnit);
    const status = cellStatuses[key];
    const isSaving = !!cellSavingState[key];
    const currentlyEditing = isEditingCell(product.sku, column.id, activeUnit);

    if (column.mode === 'fixed') {
      return (
        <FixedPriceCell
          column={column}
          price={price}
          isEditing={currentlyEditing}
          draftValue={currentlyEditing ? editingCell?.value || '' : ''}
          onStartEdit={() => beginInlineEdit(product, column, activeUnit)}
          onChangeValue={handleInlineValueChange}
          onCommit={commitInlineSave}
          onCancel={cancelInlineEdit}
          status={status}
          isSaving={isSaving}
          unitCode={activeUnit}
          isBase={column.id === baseColumnId}
          variant="compact"
          showUnitMeta={false}
          showValidityLabel={false}
          showEmptyHint={false}
        />
      );
    }

    if (column.mode === 'volume') {
      const isValidPriceType = price?.type === 'volume';
      if (!price) {
        return (
          <VolumePriceCell
            state="empty"
            onConfigure={() => handleConfigureVolumePrice(product, column, activeUnit)}
          />
        );
      }

      if (!isValidPriceType) {
        return <span className="text-[12px] text-red-500">Tipo inválido</span>;
      }

      return (
        <VolumePriceCell
          state="filled"
          price={price}
          onConfigure={() => handleConfigureVolumePrice(product, column, activeUnit)}
        />
      );
    }

    return <span className="text-xs text-gray-400">Sin configuración</span>;
  };

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

  const firstVolumeColumn = useMemo(() => orderedColumns.find(column => column.mode === 'volume'), [orderedColumns]);
  const shouldShowEmptyState = orderedColumns.length > 0 && filteredProducts.length === 0;
  const showNoCatalogProducts = shouldShowEmptyState && products.length === 0;

  return (
    <div className="p-5">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-5">
          <div className="mb-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Precios por producto (SKU)</h3>
              <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={searchSKU}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full h-9 pl-10 pr-8 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {searchSKU && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title="Limpiar búsqueda"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            {searchSKU && (
              <div>
                {filteredProducts.length > 0 ? (
                  <div className="text-xs text-green-600">
                    ✓ {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''} para "{searchSKU}"
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">
                    No se encontraron productos que coincidan con "{searchSKU}". Intenta con términos más generales.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Products Table */}
          {orderedColumns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="w-8 text-center py-1.5 px-2" aria-label="Toggle"></th>
                    <th className="text-left py-1.5 px-3 text-[11px] font-semibold tracking-wide text-gray-600 min-w-[90px] uppercase">
                      SKU
                    </th>
                    <th className="text-left py-1.5 px-3 text-[11px] font-semibold tracking-wide text-gray-600 min-w-[220px] uppercase">
                      Producto
                    </th>
                    <th className="text-left py-1.5 px-3 text-[11px] font-semibold tracking-wide text-gray-600 min-w-[140px] uppercase">
                      Unidad
                    </th>
                    {orderedColumns.map(column => (
                      <th key={column.id} className="text-left py-1.5 px-3 text-[11px] font-semibold tracking-wide text-gray-600 min-w-[130px] uppercase">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] uppercase font-bold ${
                            column.isBase ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200'
                          }`}>{column.id}</span>
                          <span className="text-[11px] text-gray-600 normal-case" title={column.name}>
                            {column.isBase ? 'Precio base' : column.name}
                          </span>
                          {column.isBase && (
                            <span className="px-1.5 py-0.5 rounded-full border border-blue-200 text-blue-700 text-[9px] font-semibold">Base</span>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="text-right py-1.5 px-3 text-[11px] font-semibold tracking-wide text-gray-600 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.map((product) => (
                    <React.Fragment key={product.sku}>
                      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-1.5 px-2 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => toggleRowExpansion(product.sku)}
                            className="inline-flex items-center justify-center w-6 h-6 rounded text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                            aria-label={expandedRows[product.sku] ? 'Contraer producto' : 'Expandir producto'}
                          >
                            {expandedRows[product.sku] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        </td>
                        <td className="py-1.5 px-3 font-semibold text-gray-900 text-sm align-middle">
                          {product.sku}
                        </td>
                        <td className="py-1.5 px-3 text-gray-700 align-middle">
                          {product.name}
                        </td>
                        <td className="py-1.5 px-3 text-gray-700 align-middle">
                          {renderUnitSelector(product)}
                        </td>
                        {orderedColumns.map(column => (
                          <td key={column.id} className="py-1 px-2 align-middle">
                            {renderPriceCell(product, column)}
                          </td>
                        ))}
                        <td className="py-1.5 px-3 text-right relative" data-row-menu="true">
                          <button
                            onClick={() => setRowMenuOpenSku(prev => (prev === product.sku ? null : product.sku))}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                            title="Más acciones"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          {rowMenuOpenSku === product.sku && (
                            <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg text-sm py-1 z-10">
                              <button
                                className="w-full text-left px-4 py-2 hover:bg-gray-50"
                                onClick={() => handleEditProduct(product)}
                              >
                                Gestionar precios
                              </button>
                              {firstVolumeColumn && (
                                <button
                                  className="w-full text-left px-4 py-2 hover:bg-gray-50"
                                  onClick={() => handleConfigureVolumePrice(product, firstVolumeColumn, resolveActiveUnit(product))}
                                >
                                  Configurar matriz
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                      {expandedRows[product.sku] && (
                        <tr className="border-b border-gray-100 bg-gray-50/70">
                          <td colSpan={totalColumns} className="px-6 py-4">
                            <UnitPricesPanel
                              product={product}
                              columns={orderedColumns}
                              baseColumnId={baseColumnId}
                              getUnitOptions={getUnitOptions}
                              getPriceForColumnUnit={getPriceForColumnUnit}
                              isEditingCell={isEditingCell}
                              beginInlineEdit={beginInlineEdit}
                              handleInlineValueChange={handleInlineValueChange}
                              commitInlineSave={commitInlineSave}
                              cancelInlineEdit={cancelInlineEdit}
                              cellStatuses={cellStatuses}
                              cellSavingState={cellSavingState}
                              handleConfigureVolumePrice={handleConfigureVolumePrice}
                              editingCell={editingCell}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">👁️</div>
              <p>No hay columnas visibles</p>
              <p className="text-sm">Ve a "Plantilla de columnas" para hacer visible al menos una columna</p>
            </div>
          )}

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
                  <span className="font-medium">{visibleColumns.length}</span> columna{visibleColumns.length !== 1 ? 's' : ''} visible{visibleColumns.length !== 1 ? 's' : ''}
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

interface FixedPriceCellProps {
  column: Column;
  price?: Price;
  isEditing: boolean;
  draftValue: string;
  onStartEdit: () => void;
  onChangeValue: (value: string) => void;
  onCommit: () => Promise<void> | void;
  onCancel: () => void;
  status?: CellStatus;
  isSaving: boolean;
  unitCode?: string;
  isBase?: boolean;
  variant?: 'default' | 'compact';
  showUnitMeta?: boolean;
  showValidityLabel?: boolean;
  showEmptyHint?: boolean;
}

const FixedPriceCell: React.FC<FixedPriceCellProps> = ({
  column,
  price,
  isEditing,
  draftValue,
  onStartEdit,
  onChangeValue,
  onCommit,
  onCancel,
  status,
  isSaving,
  unitCode,
  isBase,
  variant = 'default',
  showUnitMeta = true,
  showValidityLabel = true,
  showEmptyHint = true
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const normalizedUnit = unitCode || '—';
  const isCompact = variant === 'compact';
  const buttonSpacing = isCompact ? 'min-h-[44px] py-2' : 'min-h-[72px] py-3';
  const inputPaddingY = isCompact ? 'py-1' : 'py-1.5';

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing, status?.error]);

  const validityLabel = price?.type === 'fixed' && price.validUntil
    ? `Vence ${formatDate(price.validUntil)}`
    : null;

  const displayValue = price && price.type === 'fixed' ? formatPrice(price.value) : '—';

  if (!isEditing) {
    return (
      <button
        className={`group relative w-full text-left px-3 ${buttonSpacing} rounded-md border border-transparent hover:border-gray-200 hover:bg-gray-50 focus:outline-none`}
        onClick={onStartEdit}
      >
        {showUnitMeta && (
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="font-semibold uppercase text-gray-500">{normalizedUnit}</span>
            {isBase && (
              <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[9px] font-semibold">
                Base
              </span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm font-semibold ${price && price.type === 'fixed' ? 'text-gray-900' : 'text-gray-400'}`}>
            {displayValue}
          </span>
          {showEmptyHint && !price && (
            <span className="text-[11px] text-gray-400">Editar</span>
          )}
        </div>
        {showValidityLabel && validityLabel && (
          <span className="text-[11px] text-gray-500 block mt-1">{validityLabel}</span>
        )}
        <Pencil
          size={14}
          className={`absolute opacity-0 group-hover:opacity-80 text-gray-400 ${showUnitMeta ? 'top-2 right-2' : 'top-1.5 right-1.5'} transition-opacity`}
        />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {showUnitMeta && (
        <div className="flex items-center justify-between text-[10px] text-gray-500 font-semibold uppercase">
          <span>{normalizedUnit}</span>
          {isBase && <span className="text-blue-600">Base</span>}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="number"
          step="0.01"
          min="0"
          value={draftValue}
          onChange={(e) => onChangeValue(e.target.value)}
          onBlur={() => void onCommit()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void onCommit();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              onCancel();
            }
          }}
          className={`w-full px-2 ${inputPaddingY} rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400`}
        />
        {isSaving && <Loader2 size={16} className="animate-spin text-gray-400" />}
      </div>
      {status?.error && <span className="text-[11px] text-red-500">{status.error}</span>}
      {!status?.error && showValidityLabel && validityLabel && (
        <span className="text-[11px] text-gray-400">{validityLabel}</span>
      )}
      {!price && !status?.error && showEmptyHint && (
        <span className="text-[11px] text-gray-400">{column.isBase ? 'Define el precio base' : 'Agregar precio'}</span>
      )}
    </div>
  );
};

type VolumePriceCellProps =
  | { state: 'empty'; price?: undefined; onConfigure: () => void }
  | { state: 'filled'; price: Extract<Price, { type: 'volume' }>; onConfigure: () => void };

const VolumePriceCell: React.FC<VolumePriceCellProps> = (props) => {
  if (props.state === 'empty') {
    return (
      <button
        className="w-full min-h-[48px] text-left px-3 py-2 rounded-md border border-dashed border-gray-200 text-sm text-gray-400 hover:border-blue-200 hover:text-blue-600"
        onClick={props.onConfigure}
      >
        Configurar rangos
      </button>
    );
  }

  const { price, onConfigure } = props;
  return (
    <button
      className="w-full min-h-[48px] text-left px-3 py-2 rounded-md border border-transparent hover:border-blue-200 hover:bg-blue-50/40"
      onClick={onConfigure}
      title={getVolumeTooltip(price.ranges)}
    >
      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
        <span className="font-semibold text-gray-800">{getPriceRange(price.ranges)}</span>
        <Settings size={14} className="text-gray-400" />
      </div>
      <div className="text-[11px] text-gray-500 leading-snug">
        {getVolumePreview(price.ranges, 3)}
      </div>
      <div className="text-[11px] text-gray-400 mt-1">Vence {formatDate(price.validUntil)}</div>
    </button>
  );
};

interface UnitPricesPanelProps {
  product: Product;
  columns: Column[];
  baseColumnId?: string;
  getUnitOptions: (product: Product) => Array<{ code: string; label: string; isBase: boolean; factor?: number }>;
  getPriceForColumnUnit: (product: Product, columnId: string, unitOverride?: string) => Price | undefined;
  isEditingCell: (sku: string, columnId: string, unitCode: string) => boolean;
  beginInlineEdit: (product: Product, column: Column, unitCode?: string) => void;
  handleInlineValueChange: (value: string) => void;
  commitInlineSave: () => Promise<void> | void;
  cancelInlineEdit: () => void;
  cellStatuses: Record<string, CellStatus>;
  cellSavingState: Record<string, boolean>;
  handleConfigureVolumePrice: (product: Product, column: Column, unitOverride?: string) => void;
  editingCell: InlineCellState | null;
}

const UnitPricesPanel: React.FC<UnitPricesPanelProps> = ({
  product,
  columns,
  baseColumnId,
  getUnitOptions,
  getPriceForColumnUnit,
  isEditingCell,
  beginInlineEdit,
  handleInlineValueChange,
  commitInlineSave,
  cancelInlineEdit,
  cellStatuses,
  cellSavingState,
  handleConfigureVolumePrice,
  editingCell
}) => {
  const unitOptions = getUnitOptions(product);
  if (unitOptions.length === 0) {
    return (
      <div className="text-xs text-gray-500">
        No se encontraron unidades asociadas a este producto.
      </div>
    );
  }

  const baseUnit = unitOptions.find(option => option.isBase) || unitOptions[0];
  const baseUnitCode = baseUnit.code;
  const activeUnitCode = product.activeUnitCode || baseUnitCode;

  const renderUnitPriceCell = (column: Column, unitCode: string) => {
    const price = getPriceForColumnUnit(product, column.id, unitCode);
    const key = cellKey(product.sku, column.id, unitCode);
    const status = cellStatuses[key];
    const isSaving = !!cellSavingState[key];
    const editing = isEditingCell(product.sku, column.id, unitCode);
    const draftValue = editing ? editingCell?.value || '' : '';

    if (column.mode === 'fixed') {
      return (
        <FixedPriceCell
          column={column}
          price={price}
          isEditing={editing}
          draftValue={draftValue}
          onStartEdit={() => beginInlineEdit(product, column, unitCode)}
          onChangeValue={handleInlineValueChange}
          onCommit={commitInlineSave}
          onCancel={cancelInlineEdit}
          status={status}
          isSaving={isSaving}
          unitCode={unitCode}
          isBase={column.id === baseColumnId}
          variant="compact"
          showUnitMeta={false}
          showValidityLabel
          showEmptyHint={false}
        />
      );
    }

    if (column.mode === 'volume') {
      const isValidPriceType = price?.type === 'volume';
      const cellContent = !price ? (
        <VolumePriceCell
          state="empty"
          onConfigure={() => handleConfigureVolumePrice(product, column, unitCode)}
        />
      ) : isValidPriceType ? (
        <VolumePriceCell
          state="filled"
          price={price}
          onConfigure={() => handleConfigureVolumePrice(product, column, unitCode)}
        />
      ) : (
        <div className="text-[11px] text-red-500">Tipo inválido</div>
      );

      return (
        <div className="space-y-1">
          {cellContent}
          {status?.error && <p className="text-[10px] text-red-500">{status.error}</p>}
        </div>
      );
    }

    return <span className="text-[11px] text-gray-400">Sin configuración</span>;
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-inner">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Unidades y columnas detalladas</p>
          <p className="text-[11px] text-gray-500">Gestiona cada unidad sin salir de la tabla</p>
        </div>
        <span className="text-[11px] text-gray-500">
          {unitOptions.length} unidad{unitOptions.length !== 1 ? 'es' : ''}
        </span>
      </div>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs border-separate border-spacing-y-1">
          <thead>
            <tr>
              <th className="text-left px-2 py-1 text-[11px] uppercase tracking-wide text-gray-500">Unidad</th>
              {columns.map(column => (
                <th key={`unit-panel-${column.id}`} className="text-left px-2 py-1 text-[11px] uppercase tracking-wide text-gray-500 min-w-[120px]">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${column.isBase ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200'}`}>
                      {column.id}
                    </span>
                    <span className="text-[10px] text-gray-500 normal-case" title={column.name}>
                      {column.name}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {unitOptions.map(option => (
              <tr key={`${product.sku}-${option.code}`} className="align-top">
                <td className="align-top px-2 py-2">
                  <div className="flex items-center gap-2 text-[12px] text-gray-900 font-semibold">
                    <span>{option.code}</span>
                    {option.isBase && (
                      <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[10px]">Base</span>
                    )}
                    {option.code === activeUnitCode && (
                      <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200 text-[10px]">Actual</span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-500">{option.label}</div>
                  {option.factor && (
                    <div className="text-[10px] text-gray-400 mt-1">
                      1 {option.code} = {option.factor} {baseUnitCode}
                    </div>
                  )}
                </td>
                {columns.map(column => (
                  <td key={`${product.sku}-${option.code}-${column.id}`} className="align-top px-2 py-1">
                    {renderUnitPriceCell(column, option.code)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};