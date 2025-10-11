// src/features/catalogo-articulos/components/StockInventoryTable.tsx

import React, { useState } from 'react';
import type { Product } from '../models/types';

interface StockInventoryTableProps {
  products: Product[];
  onUpdateStockLimits?: (productId: string, stockMinimo?: number, stockMaximo?: number) => void;
  selectedEstablishmentId?: string;
}

const StockInventoryTable: React.FC<StockInventoryTableProps> = ({
  products,
  onUpdateStockLimits,
  selectedEstablishmentId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<string>('todas');
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ stockMinimo?: number; stockMaximo?: number }>({});

  // Obtener categorías únicas
  const categorias = Array.from(new Set(products.map(p => p.categoria))).sort();

  // Función para determinar el estado del stock
  const getStockEstado = (product: Product): 'CRITICO' | 'BAJO' | 'NORMAL' | 'EXCESO' => {
    const stockMinimo = product.stockMinimo ?? 10;
    const stockMaximo = product.stockMaximo;

    // Calcular stock según establecimiento seleccionado
    let stockActual = product.cantidad;
    if (selectedEstablishmentId && selectedEstablishmentId !== 'TODOS') {
      stockActual = product.stockPorEstablecimiento?.[selectedEstablishmentId] ?? 0;
    }

    if (stockActual === 0 || stockActual <= stockMinimo * 0.5) return 'CRITICO';
    if (stockActual <= stockMinimo) return 'BAJO';
    if (stockMaximo && stockActual >= stockMaximo) return 'EXCESO';
    return 'NORMAL';
  };

  // Obtener badge según estado
  const getEstadoBadge = (estado: 'CRITICO' | 'BAJO' | 'NORMAL' | 'EXCESO') => {
    const styles = {
      CRITICO: 'bg-red-100 text-red-800 border-red-200',
      BAJO: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      NORMAL: 'bg-green-100 text-green-800 border-green-200',
      EXCESO: 'bg-purple-100 text-purple-800 border-purple-200'
    };

    const icons = {
      CRITICO: '🔴',
      BAJO: '🟡',
      NORMAL: '🟢',
      EXCESO: '🟣'
    };

    const labels = {
      CRITICO: 'Crítico',
      BAJO: 'Bajo',
      NORMAL: 'Normal',
      EXCESO: 'Exceso'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[estado]}`}>
        <span className="mr-1">{icons[estado]}</span>
        {labels[estado]}
      </span>
    );
  };

  // Filtrar productos
  const filteredProducts = products.filter(product => {
    const matchesSearch =
      product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.codigo.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategoria = filterCategoria === 'todas' || product.categoria === filterCategoria;

    const estado = getStockEstado(product);
    const matchesEstado =
      filterEstado === 'todos' ||
      (filterEstado === 'alertas' && (estado === 'CRITICO' || estado === 'BAJO')) ||
      filterEstado === estado;

    return matchesSearch && matchesCategoria && matchesEstado;
  });

  // Cálculos de paginación
  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Resetear a página 1 cuando cambian los filtros
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategoria, filterEstado]);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Manejar inicio de edición
  const handleStartEdit = (product: Product) => {
    setEditingProduct(product.id);
    setEditValues({
      stockMinimo: product.stockMinimo ?? 10,
      stockMaximo: product.stockMaximo
    });
  };

  // Manejar guardado de edición
  const handleSaveEdit = (productId: string) => {
    if (onUpdateStockLimits) {
      onUpdateStockLimits(productId, editValues.stockMinimo, editValues.stockMaximo);
    }
    setEditingProduct(null);
    setEditValues({});
  };

  // Manejar cancelación de edición
  const handleCancelEdit = () => {
    setEditingProduct(null);
    setEditValues({});
  };

  // Calcular stock según establecimiento
  const getStockDisplay = (product: Product): { stock: number; label: string } => {
    if (!selectedEstablishmentId || selectedEstablishmentId === 'TODOS') {
      return { stock: product.cantidad, label: 'Stock Total' };
    }

    const stockEst = product.stockPorEstablecimiento?.[selectedEstablishmentId] ?? 0;
    return { stock: stockEst, label: 'Stock en Est.' };
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Filters */}
      <div className="p-4 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="md:col-span-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Buscar producto o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={filterCategoria}
              onChange={(e) => setFilterCategoria(e.target.value)}
              className="px-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="todas">Todas las categorías</option>
              {categorias.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Estado Filter */}
          <div>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="px-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="todos">Todos los estados</option>
              <option value="alertas">⚠️ Con alertas (Crítico o Bajo)</option>
              <option value="CRITICO">🔴 Crítico</option>
              <option value="BAJO">🟡 Bajo</option>
              <option value="NORMAL">🟢 Normal</option>
              <option value="EXCESO">🟣 Exceso</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Producto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Categoría
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock Actual
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center justify-center space-x-1">
                  <span>Stock Mínimo</span>
                  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock Máximo
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedProducts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-gray-600 font-medium">No se encontraron productos</p>
                    <p className="text-gray-500 text-sm mt-1">Ajusta los filtros o crea nuevos productos</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedProducts.map((product) => {
                const estado = getStockEstado(product);
                const { stock, label } = getStockDisplay(product);
                const isEditing = editingProduct === product.id;

                return (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    {/* Producto */}
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {product.imagen && (
                          <img
                            src={product.imagen}
                            alt={product.nombre}
                            className="w-10 h-10 rounded object-cover mr-3"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{product.nombre}</div>
                          <div className="text-sm text-gray-500 font-mono">{product.codigo}</div>
                        </div>
                      </div>
                    </td>

                    {/* Categoría */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                        {product.categoria}
                      </span>
                    </td>

                    {/* Stock Actual */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-center">
                        <div className={`text-lg font-bold ${
                          stock === 0 ? 'text-red-600' :
                          stock <= (product.stockMinimo ?? 10) ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {stock}
                        </div>
                        <div className="text-xs text-gray-500">{label}</div>
                      </div>
                    </td>

                    {/* Stock Mínimo */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editValues.stockMinimo ?? 10}
                          onChange={(e) => setEditValues(prev => ({
                            ...prev,
                            stockMinimo: parseInt(e.target.value) || undefined
                          }))}
                          className="w-20 px-2 py-1 text-center text-sm border-2 border-amber-400 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                          min="0"
                        />
                      ) : (
                        <div className="text-center">
                          <div className="text-sm font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded-md inline-block border border-amber-200">
                            {product.stockMinimo ?? 10}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Stock Máximo */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editValues.stockMaximo || ''}
                          onChange={(e) => setEditValues(prev => ({
                            ...prev,
                            stockMaximo: parseInt(e.target.value) || undefined
                          }))}
                          placeholder="Sin límite"
                          className="w-20 px-2 py-1 text-center text-sm border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                          min="0"
                        />
                      ) : (
                        <div className="text-center">
                          {product.stockMaximo ? (
                            <div className="text-sm font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-md inline-block border border-gray-300">
                              {product.stockMaximo}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Sin límite</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Estado */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getEstadoBadge(estado)}
                    </td>

                    {/* Acciones */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleSaveEdit(product.id)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                            title="Guardar cambios"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Cancelar"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(product)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Editar umbrales de stock"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalItems > 0 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                Mostrando <span className="font-medium">{startIndex + 1}</span> a{' '}
                <span className="font-medium">{Math.min(endIndex, totalItems)}</span> de{' '}
                <span className="font-medium">{totalItems}</span> productos
              </div>

              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value={10}>10 por página</option>
                <option value={25}>25 por página</option>
                <option value={50}>50 por página</option>
                <option value={100}>100 por página</option>
              </select>
            </div>

            <nav className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>

              {/* Números de página */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1 text-sm border rounded-md transition-colors ${
                        currentPage === pageNum
                          ? 'bg-red-50 border-red-500 text-red-600 font-medium'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockInventoryTable;
