import React from 'react';
import { Plus, Search, Edit2, X } from 'lucide-react';
import type { Column, Product } from '../models/PriceTypes';
import { filterVisibleColumns, formatPrice, formatDate } from '../utils/priceHelpers';

interface ProductPricingProps {
  columns: Column[];
  products: Product[];
  filteredProducts: Product[];
  searchSKU: string;
  onSearchChange: (value: string) => void;
  onAddPrice: () => void;
  onEditProduct: (product: Product) => void;
}

export const ProductPricing: React.FC<ProductPricingProps> = ({
  columns,
  products,
  filteredProducts,
  searchSKU,
  onSearchChange,
  onAddPrice,
  onEditProduct
}) => {
  const visibleColumns = filterVisibleColumns(columns);

  const renderPriceCell = (product: Product, column: Column) => {
    const price = product.prices[column.id];
    
    if (!price) {
      return (
        <div className="text-center">
          <span className="text-gray-400 text-sm">Sin precio</span>
        </div>
      );
    }

    return (
      <div className="text-center">
        <div className="font-semibold text-green-600">
          {formatPrice(price.value)}
        </div>
        <div className="text-xs text-gray-500">
          Vigente hasta {formatDate(price.validUntil)}
        </div>
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
                En cada columna puedes definir un <strong>Precio Fijo</strong> con vigencia o una <strong>Matriz por Volumen</strong> (exclusivos).
              </p>
            </div>
            <button
              onClick={onAddPrice}
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
                            onClick={() => onEditProduct(product)}
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
                  onClick={onAddPrice}
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
    </div>
  );
};