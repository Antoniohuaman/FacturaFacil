// ===================================================================
// COMPONENTE SIDEBAR DEL CARRITO PARA MODO POS
// ===================================================================

import React, { useState } from 'react';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  AlertTriangle,
  Search,
  Package
} from 'lucide-react';
import type { CartSidebarProps, Product } from '../models/comprobante.types';
import { ProductSearchBar } from './ProductSearchBar';
import { QuickProductModal } from './QuickProductModal';
import { useProductSearch } from '../hooks/useProductSearch';
import { useCurrency } from '../hooks/useCurrency';
import { UI_MESSAGES } from '../models/constants';

interface UpdatedCartSidebarProps extends CartSidebarProps {
  onAddProduct?: (product: Product) => void;
  currency?: 'PEN' | 'USD';
}

export const CartSidebar: React.FC<UpdatedCartSidebarProps> = ({
  cartItems,
  totals,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onConfirmSale,
  onViewFullForm,
  onAddProduct,
  cashBoxStatus = 'unknown',
  isProcessing = false,
  currency = 'PEN'
}) => {
  const { formatPrice } = useCurrency();
  const {
    searchQuery,
    searchResults,
    isSearching,
    hasResults,
    setSearchQuery,
    searchByBarcode
  } = useProductSearch();

  // Estados locales
  const [showSearch, setShowSearch] = useState(false);
  const [showQuickProductModal, setShowQuickProductModal] = useState(false);

  // Estado de la caja
  const isCashBoxClosed = cashBoxStatus === 'closed';
  const canProcessSale = !isProcessing && cartItems.length > 0 && !isCashBoxClosed;

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleScanBarcode = (barcode: string) => {
    searchByBarcode(barcode).then(product => {
      if (product && onAddProduct) {
        onAddProduct(product);
        setShowSearch(false);
      }
    });
  };

  const handleCreateProduct = () => {
    setShowQuickProductModal(true);
  };

  const handleProductCreated = (product: Product) => {
    if (onAddProduct) {
      onAddProduct(product);
    }
    setShowQuickProductModal(false);
    setShowSearch(false);
  };

  const handleProductSelect = (product: Product) => {
    if (onAddProduct) {
      onAddProduct(product);
      setShowSearch(false);
    }
  };

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchQuery('');
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header con búsqueda */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">
              Carrito ({cartItems.length})
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Botón de búsqueda */}
            <button
              onClick={toggleSearch}
              className={`p-2 rounded-lg transition-colors ${
                showSearch 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Buscar productos"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Botón limpiar carrito */}
            {cartItems.length > 0 && (
              <button
                onClick={onClearCart}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
                disabled={isProcessing}
              >
                Vaciar
              </button>
            )}
          </div>
        </div>

        {/* Barra de búsqueda expandible */}
        {showSearch && (
          <div className="mb-4">
            <ProductSearchBar
              onSearch={handleSearch}
              onScanBarcode={handleScanBarcode}
              onCreateProduct={handleCreateProduct}
              isLoading={isSearching}
            />
            
            {/* Resultados de búsqueda */}
            {searchQuery && (
              <div className="mt-3 max-h-48 overflow-y-auto bg-gray-50 rounded-lg">
                {hasResults ? (
                  <div className="p-2">
                    {searchResults.slice(0, 4).map(product => (
                      <button
                        key={product.id}
                        onClick={() => handleProductSelect(product)}
                        className="w-full text-left p-2 hover:bg-white rounded transition-colors"
                      >
                        <div className="font-medium text-sm">{product.name}</div>
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>{product.code}</span>
                          <span>{formatPrice(product.price, currency)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-gray-500">
                    {isSearching ? UI_MESSAGES.SEARCH_LOADING : UI_MESSAGES.NO_PRODUCTS_FOUND}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Warning de caja cerrada */}
      {isCashBoxClosed && (
        <div className="mx-4 mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                Caja cerrada
              </p>
              <p className="text-xs text-yellow-600">
                {UI_MESSAGES.CAJA_CLOSED_WARNING}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lista de productos en carrito */}
      <div className="flex-1 overflow-y-auto">
        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Package className="h-12 w-12 mb-3 text-gray-300" />
            <p className="text-sm font-medium">{UI_MESSAGES.EMPTY_CART}</p>
            <p className="text-xs text-center px-4 mt-1">
              {showSearch ? 'Busca productos arriba' : 'Haz clic en búsqueda para agregar productos'}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {cartItems.map((item) => (
              <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-gray-900 truncate">
                      {item.name}
                    </h4>
                    <p className="text-xs text-gray-500">{item.code}</p>
                  </div>
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="ml-2 text-red-500 hover:text-red-700 transition-colors"
                    disabled={isProcessing}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      className="w-7 h-7 flex items-center justify-center bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      disabled={item.quantity <= 1 || isProcessing}
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    
                    <span className="w-8 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    
                    <button
                      onClick={() => onUpdateQuantity(item.id, 1)}
                      className="w-7 h-7 flex items-center justify-center bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      disabled={isProcessing}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {formatPrice(item.price * item.quantity, currency)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatPrice(item.price, currency)} c/u
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Totales */}
      {cartItems.length > 0 && (
        <div className="border-t border-gray-200 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span>{formatPrice(totals.subtotal, currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">IGV (18%)</span>
            <span>{formatPrice(totals.igv, currency)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
            <span>Total</span>
            <span>{formatPrice(totals.total, currency)}</span>
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="border-t border-gray-200 p-4 space-y-2">
        <button
          onClick={onConfirmSale}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            canProcessSale
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
          disabled={!canProcessSale}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {UI_MESSAGES.CART_LOADING}
            </span>
          ) : (
            'Confirmar Venta'
          )}
        </button>
        
        <button
          onClick={onViewFullForm}
          className="w-full py-2 px-4 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
          disabled={isProcessing}
        >
          Ver Formulario Completo
        </button>
      </div>

      {/* Modal de creación rápida de producto */}
      <QuickProductModal
        isOpen={showQuickProductModal}
        onClose={() => setShowQuickProductModal(false)}
        onProductCreated={handleProductCreated}
        currency={currency}
      />
    </div>
  );
};