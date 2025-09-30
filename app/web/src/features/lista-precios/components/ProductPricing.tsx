import React, { useState } from 'react';
import { Plus, Search, Edit2, X, Settings } from 'lucide-react';
import type { Column, Product } from '../models/PriceTypes';
import { filterVisibleColumns, formatPrice, formatDate, getVolumePreview, getVolumeTooltip, getPriceRange } from '../utils/priceHelpers';
import { VolumeMatrixModal } from './modals/VolumeMatrixModal';
import { PriceModal } from './modals/PriceModal';

interface ProductPricingProps {
  columns: Column[];
  products: Product[];
  filteredProducts: Product[];
  searchSKU: string;
  onSearchChange: (value: string) => void;
}

export const ProductPricing: React.FC<ProductPricingProps> = ({
  columns,
  products,
  filteredProducts,
  searchSKU,
  onSearchChange
}) => {
  const visibleColumns = filterVisibleColumns(columns);
  
  // Estados para modales
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [volumeModalOpen, setVolumeModalOpen] = useState(false);
  
  // Estados para datos seleccionados
  const [selectedPriceColumn, setSelectedPriceColumn] = useState<Column | null>(null);
  const [selectedProductForPriceModal, setSelectedProductForPriceModal] = useState<Product | null>(null);
  const [selectedVolumePrice, setSelectedVolumePrice] = useState<{
    product: Product;
    column: Column;
  } | null>(null);

  // Manejador para asignar precio - detecta el tipo según la columna
  const handleAssignPrice = (column?: Column) => {
    // Si no se especifica columna, usar la primera visible
    const targetColumn = column || visibleColumns[0];
    
    if (!targetColumn) return;
    
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
    // Buscar la primera columna visible que tenga precio
    const columnWithPrice = visibleColumns.find(column => 
      product.prices[column.id] !== undefined
    );
    
    if (!columnWithPrice) {
      // Si no hay precios, abrir modal según el tipo de la primera columna visible
      handleAssignPrice();
      return;
    }
    
    const existingPrice = product.prices[columnWithPrice.id];
    
    if (columnWithPrice.mode === 'fixed' || existingPrice.type === 'fixed') {
      // Abrir modal de precio fijo
      setSelectedPriceColumn(columnWithPrice);
      setSelectedProductForPriceModal(product);
      setPriceModalOpen(true);
    } else if (columnWithPrice.mode === 'volume' || existingPrice.type === 'volume') {
      // Abrir modal de precio por cantidad
      setSelectedVolumePrice({ product, column: columnWithPrice });
      setVolumeModalOpen(true);
    }
  };

  // Manejadores para configurar precios existentes
  const handleConfigureVolumePrice = (product: Product, column: Column) => {
    setSelectedVolumePrice({ product, column });
    setVolumeModalOpen(true);
  };

  // Manejador para cambiar de PriceModal a VolumeModal cuando se selecciona columna de volumen
  const handleSwitchToVolumeModal = (columnId: string) => {
    const column = columns.find(col => col.id === columnId);
    if (column && selectedProductForPriceModal) {
      // Cerrar modal de precio fijo
      setPriceModalOpen(false);
      // Configurar producto y columna para modal de volumen con datos pre-cargados
      setSelectedVolumePrice({ product: selectedProductForPriceModal, column });
      setSelectedPriceColumn(null);
      // Abrir modal de volumen
      setVolumeModalOpen(true);
    }
  };

  // Manejadores de guardado
  const handleSavePriceModal = (priceData: any) => {
    // Esta función debería integrarse con el sistema de guardado real
    console.log('Guardando precio fijo:', priceData);
    setPriceModalOpen(false);
    setSelectedPriceColumn(null);
    return true; // Simular éxito
  };

  const handleSaveVolumeMatrix = (volumeData: any) => {
    // Esta función debería integrarse con el sistema de guardado real
    console.log('Guardando matriz de volumen:', volumeData);
    setVolumeModalOpen(false);
    setSelectedVolumePrice(null);
    setSelectedPriceColumn(null);
    return true; // Simular éxito
  };

  const renderPriceCell = (product: Product, column: Column) => {
    const price = product.prices[column.id];
    
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

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Precios por producto (SKU)</h3>
              <p className="text-sm text-gray-600">
                En cada columna puedes definir un <strong>Precio Fijo</strong> con vigencia o un <strong>Precio por Cantidad</strong> (exclusivos).
              </p>
            </div>
            <button
              onClick={() => handleAssignPrice()}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              {searchSKU && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
                  {filteredProducts.map((product) => (
                    <tr key={product.sku} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-900">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {product.sku}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {product.name}
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
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
        }}
        onSave={handleSavePriceModal}
        columns={columns}
        selectedProduct={selectedProductForPriceModal}
        selectedColumn={selectedPriceColumn}
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
          }}
          onSave={handleSaveVolumeMatrix}
          selectedProduct={selectedVolumePrice?.product || null}
          column={selectedVolumePrice?.column || selectedPriceColumn || columns[0]}
        />
      )}
    </div>
  );
};