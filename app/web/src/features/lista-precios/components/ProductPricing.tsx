 import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, X, Settings, ChevronDown, Check } from 'lucide-react';
import type { Column, Product, CatalogProduct, PriceForm } from '../models/PriceTypes';
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
  onSearchChange,
  onSavePrice,
  onUnitChange,
  catalogProducts = []
}) => {
  const visibleColumns = filterVisibleColumns(columns);
  const FALLBACK_UNIT_CODE = 'NIU';

  const { state: configState } = useConfigurationContext();
  const measurementUnits = configState.units;

  const unitsByCode = useMemo(() => {
    return new Map(measurementUnits.map(unit => [unit.code, unit] as const));
  }, [measurementUnits]);

  // Estados para modales
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [volumeModalOpen, setVolumeModalOpen] = useState(false);
  const [unitMenuOpenSku, setUnitMenuOpenSku] = useState<string | null>(null);
  const [selectedUnitForModal, setSelectedUnitForModal] = useState<string | null>(null);

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

  const getPriceForColumnUnit = useCallback((product: Product, columnId: string) => {
    const unitCode = resolveActiveUnit(product);
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

  useEffect(() => {
    if (!unitMenuOpenSku) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-unit-selector="true"]')) {
        return;
      }
      setUnitMenuOpenSku(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [unitMenuOpenSku]);

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
  const handleAssignPrice = (column?: Column) => {
    // Si no se especifica columna, usar la primera visible
    const targetColumn = column || visibleColumns[0];
    
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
  };

  // Manejador para editar producto existente - detecta el tipo de precio a editar
  const handleEditProduct = (product: Product) => {
    setUnitMenuOpenSku(null);
    const activeUnit = resolveActiveUnit(product);
    setSelectedUnitForModal(activeUnit);
    setSelectedProductForPriceModal(product);

    const columnWithPrice = visibleColumns.find(column => getPriceForColumnUnit(product, column.id));
    const targetColumn = columnWithPrice || visibleColumns[0];
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
  const handleConfigureVolumePrice = (product: Product, column: Column) => {
    setSelectedUnitForModal(resolveActiveUnit(product));
    setUnitMenuOpenSku(null);
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
    }
    return success;
  };

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
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-700 shadow-sm hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          <span className="text-[11px] font-bold text-gray-900">{activeUnit}</span>
          <span className="text-[11px] text-gray-600 truncate max-w-[90px]">{activeLabel}</span>
          <ChevronDown size={12} className="text-gray-400" />
        </button>

        {unitMenuOpenSku === product.sku && (
          <div className="absolute z-20 mt-2 w-52 rounded-lg border border-gray-200 bg-white shadow-lg p-1">
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
    const price = getPriceForColumnUnit(product, column.id);
    
    if (!price) {
      return (
        <div className="text-center">
          <span className="text-gray-400 text-sm">Sin precio</span>
        </div>
      );
    }

    // Validar que el precio coincida con el modo de la columna
    const isValidPriceType = (column.mode === 'fixed' && price.type === 'fixed') ||
                            (column.mode === 'volume' && price.type === 'volume');

    if (!isValidPriceType) {
      return (
        <div className="text-center">
          <span className="text-red-400 text-sm">Tipo inválido</span>
        </div>
      );
    }

    return (
      <div className="text-center group relative">
        {price.type === 'fixed' ? (
          <>
            <div className="font-semibold text-green-600">
              {formatPrice(price.value)}
            </div>
            <div className="text-xs text-gray-500">
              Vigente hasta {formatDate(price.validUntil)}
            </div>
          </>
        ) : (
          <>
            <div className="text-sm font-semibold text-blue-600 mb-1 flex items-center justify-center gap-1">
              {getPriceRange(price.ranges)}
              <button
                onClick={() => handleConfigureVolumePrice(product, column)}
                className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 transition-opacity p-1 hover:bg-blue-50 rounded"
                title="Configurar rangos de cantidad"
              >
                <Settings size={12} />
              </button>
            </div>
            <div className="text-xs text-gray-700 mt-1 cursor-help font-medium leading-relaxed" 
                 title={getVolumeTooltip(price.ranges)}>
              {getVolumePreview(price.ranges)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Vigente hasta {formatDate(price.validUntil)}
            </div>
          </>
        )}
      </div>
    );
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

  return (
    <div className="p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Precios por producto (SKU)</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                En cada columna puedes definir un <strong>Precio Fijo</strong> con vigencia o un <strong>Precio por Cantidad</strong> (exclusivos).
              </p>
            </div>
            <button
              onClick={() => handleAssignPrice()}
              className="flex items-center px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors"
              style={{ backgroundColor: '#1478D4' }}
            >
              <Plus size={16} className="mr-2" />
              Asignar precio
            </button>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar o ingresar SKU..."
                value={searchSKU}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              {searchSKU && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="Limpiar búsqueda"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {searchSKU && (
              <div className="mt-2">
                {filteredProducts.length > 0 ? (
                  <div className="text-sm text-green-600">
                    ✓ {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''} para "{searchSKU}"
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    No se encontraron productos que coincidan con "{searchSKU}". Intenta con términos más generales.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Products Table */}
          {visibleColumns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 min-w-[100px]">
                      SKU
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 min-w-[200px]">
                      Producto
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 min-w-[140px]">
                      Unidad
                    </th>
                    {visibleColumns.map(column => (
                      <th key={column.id} className="text-center py-3 px-4 text-sm font-medium text-gray-700 min-w-[120px]">
                        <div className="flex flex-col items-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium mb-1 ${
                            column.isBase ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {column.id} {column.isBase && '(Base)'}
                          </span>
                          <span className="text-xs text-gray-600 text-center leading-tight">
                            {column.name}
                          </span>
                        </div>
                      </th>
                    ))}
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.map((product) => (
                    <tr key={product.sku} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-900">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {product.sku}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {product.name}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {renderUnitSelector(product)}
                      </td>
                      {visibleColumns.map(column => (
                        <td key={column.id} className="py-3 px-4">
                          {renderPriceCell(product, column)}
                        </td>
                      ))}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                            title="Editar precios"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
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
          {visibleColumns.length > 0 && filteredProducts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🔍</div>
              <p className="font-medium">
                {searchSKU ? 'No se encontraron productos' : 'No hay productos registrados'}
              </p>
              <p className="text-sm mt-1">
                {searchSKU 
                  ? `No hay productos que coincidan con "${searchSKU}"` 
                  : 'Agrega precios a tus productos para comenzar'
                }
              </p>
              {!searchSKU && (
                <button
                  onClick={() => handleAssignPrice()}
                  className="mt-4 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors"
                  style={{ backgroundColor: '#1478D4' }}
                >
                  Asignar primer precio
                </button>
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