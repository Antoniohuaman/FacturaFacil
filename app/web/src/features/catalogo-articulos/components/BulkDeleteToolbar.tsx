// src/features/catalogo-articulos/components/BulkDeleteToolbar.tsx

import React, { useState } from 'react';
import type { Product } from '../models/types';

interface BulkDeleteAction {
  type: 'selected' | 'current-page' | 'all';
  label: string;
  count: number;
  products: Product[];
}

interface BulkDeleteToolbarProps {
  selectedProducts: Set<string>;
  currentPageProducts: Product[];
  totalProductsCount: number;
  onDeleteProducts: (productIds: string[]) => void;
  onDeleteAllProducts: () => void;
  onClearSelection: () => void;
}

const BulkDeleteToolbar: React.FC<BulkDeleteToolbarProps> = ({
  selectedProducts,
  currentPageProducts,
  totalProductsCount,
  onDeleteProducts,
  onDeleteAllProducts,
  onClearSelection
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteAction, setDeleteAction] = useState<BulkDeleteAction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleBulkDelete = (type: 'selected' | 'current-page' | 'all') => {
    let productsToDelete: Product[] = [];
    let count = 0;
    let label = '';

    switch (type) {
      case 'selected':
        productsToDelete = currentPageProducts.filter(p => selectedProducts.has(p.id));
        count = selectedProducts.size;
        label = `${count} producto${count !== 1 ? 's' : ''} seleccionado${count !== 1 ? 's' : ''}`;
        break;
      case 'current-page':
        productsToDelete = currentPageProducts;
        count = currentPageProducts.length;
        label = `${count} producto${count !== 1 ? 's' : ''} de la página actual`;
        break;
      case 'all':
        productsToDelete = [];
        count = totalProductsCount;
        label = `todos los ${count} productos`;
        break;
    }

    setDeleteAction({ type, label, count, products: productsToDelete });
    setShowDeleteModal(true);
  };

  const confirmBulkDelete = async () => {
    if (!deleteAction) return;
    
    setIsDeleting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      switch (deleteAction.type) {
        case 'selected':
          const selectedIds = Array.from(selectedProducts);
          onDeleteProducts(selectedIds);
          break;
        case 'current-page':
          const pageIds = deleteAction.products.map(p => p.id);
          onDeleteProducts(pageIds);
          break;
        case 'all':
          onDeleteAllProducts();
          break;
      }
      
      onClearSelection();
      setShowDeleteModal(false);
      setDeleteAction(null);
    } catch (error) {
      console.error('Error deleting products:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const BulkDeleteModal = () => {
    if (!showDeleteModal || !deleteAction) return null;

    const getModalIcon = () => {
      const iconClass = deleteAction.type === 'all' ? 'text-red-600 bg-red-100' : 
                       deleteAction.type === 'current-page' ? 'text-blue-600 bg-blue-100' : 
                       'text-orange-600 bg-orange-100';
      
      return (
        <div className={`w-12 h-12 ${iconClass.split(' ')[1]} rounded-full flex items-center justify-center`}>
          <svg className={`w-6 h-6 ${iconClass.split(' ')[0]}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d={deleteAction.type === 'all' ? "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" : 
                 "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"} 
            />
          </svg>
        </div>
      );
    };

    const getModalTitle = () => {
      switch (deleteAction.type) {
        case 'selected': return 'Eliminar productos seleccionados';
        case 'current-page': return 'Eliminar productos de la página';
        case 'all': return 'Eliminar todos los productos';
      }
    };

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center px-4 text-center">
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm transition-opacity" />
          
          <div className="relative inline-block w-full max-w-md overflow-hidden rounded-xl bg-white text-left align-middle shadow-2xl transition-all transform scale-100">
            <div className="px-6 py-6">
              <div className="flex items-start space-x-4">
                {getModalIcon()}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {getModalTitle()}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    ¿Estás seguro de que quieres eliminar {deleteAction.label}? 
                    {deleteAction.type === 'all' ? ' Esta acción eliminará permanentemente todo tu inventario.' : ''}
                    {' '}Esta acción no se puede deshacer.
                  </p>
                  
                  {deleteAction.type !== 'all' && deleteAction.products.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        Productos que se eliminarán:
                      </h4>
                      <div className="max-h-28 overflow-y-auto space-y-1">
                        {deleteAction.products.slice(0, 4).map((product) => (
                          <div key={product.id} className="flex justify-between text-xs text-gray-600">
                            <span className="truncate mr-2 font-medium">{product.nombre}</span>
                            <span className="font-mono text-gray-500">{product.codigo}</span>
                          </div>
                        ))}
                        {deleteAction.products.length > 4 && (
                          <div className="text-xs text-gray-500 italic pt-1 border-t border-gray-200">
                            ... y {deleteAction.products.length - 4} productos más
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {deleteAction.type === 'all' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                      <div className="flex">
                        <svg className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div className="text-sm">
                          <p className="font-medium text-red-800">¡Advertencia crítica!</p>
                          <p className="mt-1 text-red-700">Se eliminarán todos los productos, sus asociaciones con categorías y paquetes. Considera hacer una copia de seguridad.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmBulkDelete}
                disabled={isDeleting}
                className={`w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  deleteAction.type === 'all' 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-red-600 hover:bg-red-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {deleteAction.type === 'all' ? 'Sí, eliminar todo' : 'Eliminar'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (selectedProducts.size === 0) return null;

  return (
    <>
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm animate-in slide-in-from-top-2 duration-200">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full mr-3 animate-pulse"></div>
                <span className="text-sm font-medium text-gray-900">
                  {selectedProducts.size} producto{selectedProducts.size !== 1 ? 's' : ''} seleccionado{selectedProducts.size !== 1 ? 's' : ''}
                </span>
              </div>
              
              <div className="h-5 w-px bg-gray-300"></div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleBulkDelete('selected')}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100 hover:shadow-sm transition-all duration-150"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Eliminar seleccionados
                </button>

                <button
                  onClick={() => handleBulkDelete('current-page')}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:shadow-sm transition-all duration-150"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Eliminar página ({currentPageProducts.length})
                </button>

                <button
                  onClick={() => handleBulkDelete('all')}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 hover:shadow-sm transition-all duration-150"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Eliminar todos ({totalProductsCount})
                </button>
              </div>
            </div>

            <button
              onClick={onClearSelection}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-md transition-colors"
              title="Cancelar selección"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <BulkDeleteModal />
    </>
  );
};

export default BulkDeleteToolbar;