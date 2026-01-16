// src/features/lista-precios/components/PackagesTab.tsx

import React, { useCallback, useState } from 'react';
import { useCurrencyManager } from '@/shared/currency';
import type { Package } from '../../catalogo-articulos/models/types';
import { useProductStore } from '../../catalogo-articulos/hooks/useProductStore';

export const PackagesTab: React.FC = () => {
  const { allProducts, packages, addPackage, updatePackage, deletePackage } = useProductStore();
  const { baseCurrency, formatMoney } = useCurrencyManager();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const formatCurrency = useCallback((amount: number) => formatMoney(amount, baseCurrency.code), [formatMoney, baseCurrency.code]);

  const filteredPackages = packages.filter(pkg =>
    pkg.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pkg.descripcion?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const handleCreatePackage = () => {
    setEditingPackage(null);
    setShowCreateModal(true);
  };

  const handleEditPackage = (pkg: Package) => {
    setEditingPackage(pkg);
    setShowCreateModal(true);
  };

  const handleDeletePackage = (pkg: Package) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar el paquete "${pkg.nombre}"?`)) {
      deletePackage(pkg.id);
    }
  };
  const PackageModal: React.FC<{ pkg?: Package; onClose: () => void }> = ({ pkg, onClose }) => {
    const [formData, setFormData] = useState({
      nombre: pkg?.nombre || '',
      descripcion: pkg?.descripcion || '',
      productos: pkg?.productos.map(p => ({ productId: p.productId, cantidad: p.cantidad })) || [],
      descuento: pkg?.descuento || 0
    });

    const addProductToPackage = () => {
      setFormData(prev => ({
        ...prev,
        productos: [...prev.productos, { productId: '', cantidad: 1 }]
      }));
    };

    const removeProductFromPackage = (index: number) => {
      setFormData(prev => ({
        ...prev,
        productos: prev.productos.filter((_, i) => i !== index)
      }));
    };

    const updateProductInPackage = (index: number, field: 'productId' | 'cantidad', value: string | number) => {
      setFormData(prev => ({
        ...prev,
        productos: prev.productos.map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        )
      }));
    };

    const calculatePackagePrice = () => {
      const subtotal = formData.productos.reduce((total, item) => {
        const product = allProducts.find(p => p.id === item.productId);
        return total + (product ? product.precio * item.cantidad : 0);
      }, 0);
      const discount = (subtotal * formData.descuento) / 100;
      return subtotal - discount;
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.nombre.trim() || formData.productos.length === 0) return;
      const validProducts = formData.productos.filter(item => item.productId && item.cantidad > 0);
      if (validProducts.length === 0) return;
      const packageProducts = validProducts.map(item => {
        const product = allProducts.find(p => p.id === item.productId)!;
        return {
          productId: item.productId,
          cantidad: item.cantidad,
          precioUnitario: product.precio
        };
      });
      if (pkg) {
        // Actualizar paquete existente
        updatePackage(pkg.id, {
          nombre: formData.nombre,
          descripcion: formData.descripcion || undefined,
          productos: packageProducts,
          precio: calculatePackagePrice(),
          descuento: formData.descuento || undefined
        });
      } else {
        // Crear nuevo paquete
        addPackage({
          nombre: formData.nombre,
          descripcion: formData.descripcion || undefined,
          productos: packageProducts,
          precio: calculatePackagePrice(),
          descuento: formData.descuento || undefined
        });
      }
      onClose();
    };

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={onClose}
          />
          <div className="relative inline-block w-full max-w-3xl my-8 overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left align-middle shadow-xl transition-all transform">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {pkg ? 'Editar paquete' : 'Nuevo paquete'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre del paquete <span className="text-blue-600 dark:text-blue-400 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Nombre del paquete"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descuento (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.descuento}
                    onChange={(e) => setFormData(prev => ({ ...prev, descuento: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Descripción opcional del paquete"
                />
              </div>
              {/* Productos */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Productos incluidos <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={addProductToPackage}
                    className="inline-flex items-center px-3 py-1 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar producto
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.productos.map((item, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <select
                        value={item.productId}
                        onChange={(e) => updateProductInPackage(index, 'productId', e.target.value)}
                        className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                        required
                      >
                        <option value="">Seleccionar producto</option>
                        {allProducts.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.nombre} - {formatCurrency(product.precio)}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={item.cantidad}
                        onChange={(e) => updateProductInPackage(index, 'cantidad', parseInt(e.target.value) || 1)}
                        className="w-20 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="Cant."
                        required
                      />
                      <button
                        type="button"
                        onClick={() => removeProductFromPackage(index)}
                        className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {formData.productos.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4-8-4m16 0v10l-8 4-8-4V7" />
                      </svg>
                      <p className="text-sm">No hay productos agregados</p>
                      <p className="text-xs">Haz clic en "Agregar producto" para comenzar</p>
                    </div>
                  )}
                </div>
              </div>
              {/* Resumen de precios */}
              {formData.productos.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Resumen del paquete</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                      <span className="text-gray-900 dark:text-white">{formatCurrency(formData.productos.reduce((total, item) => {
                        const product = allProducts.find(p => p.id === item.productId);
                        return total + (product ? product.precio * item.cantidad : 0);
                      }, 0))}</span>
                    </div>
                    {formData.descuento > 0 && (
                      <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span>Descuento ({formData.descuento}%):</span>
                        <span>-{formatCurrency((formData.productos.reduce((total, item) => {
                          const product = allProducts.find(p => p.id === item.productId);
                          return total + (product ? product.precio * item.cantidad : 0);
                        }, 0) * formData.descuento) / 100)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium text-lg border-t border-gray-200 dark:border-gray-700 pt-2">
                      <span className="text-gray-900 dark:text-white">Total:</span>
                      <span className="text-gray-900 dark:text-white">{formatCurrency(calculatePackagePrice())}</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors"
                >
                  {pkg ? 'Actualizar' : 'Crear'} paquete
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Paquetes</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Crea paquetes de productos con descuentos especiales
          </p>
        </div>

        <button
          onClick={handleCreatePackage}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo paquete
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Buscar paquetes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent placeholder-gray-500 dark:placeholder-gray-400"
        />
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPackages.map((pkg) => (
          <div
            key={pkg.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md dark:hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                  {pkg.nombre}
                </h3>
                {pkg.descripcion && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    {pkg.descripcion}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleEditPackage(pkg)}
                  className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="Editar paquete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeletePackage(pkg)}
                  className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  title="Eliminar paquete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Productos del paquete */}
            <div className="space-y-2 mb-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Productos incluidos:</h4>
              <div className="space-y-1">
                {pkg.productos.map((item, index) => {
                  const product = allProducts.find(p => p.id === item.productId);
                  return (
                    <div key={index} className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span>{product?.nombre || 'Producto eliminado'}</span>
                      <span>x{item.cantidad}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Precio */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                {pkg.descuento && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                    -{pkg.descuento}% desc.
                  </span>
                )}
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {formatCurrency(pkg.precio)}
              </div>
            </div>

            <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Creado {pkg.fechaCreacion.toLocaleDateString('es-PE', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
            </div>
          </div>
        ))}
      </div>

      {filteredPackages.length === 0 && (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4-8-4m16 0v10l-8 4-8-4V7"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            {searchTerm ? 'No se encontraron paquetes' : 'No hay paquetes'}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm
              ? 'Intenta con otros términos de búsqueda'
              : 'Comienza creando tu primer paquete de productos.'
            }
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <button
                onClick={handleCreatePackage}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nuevo paquete
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showCreateModal && (
        <PackageModal
          pkg={editingPackage ?? undefined}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPackage(null);
          }}
        />
      )}
    </div>
  );
};
