// src/features/catalogo-articulos/components/StockMovementsTable.tsx

import React, { useState } from 'react';
import type { MovimientoStock } from '../models/types';

interface StockMovementsTableProps {
  movimientos: MovimientoStock[];
}

const StockMovementsTable: React.FC<StockMovementsTableProps> = ({ movimientos }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const getTipoBadge = (tipo: MovimientoStock['tipo']) => {
    const styles = {
      ENTRADA: 'bg-green-100 text-green-800',
      SALIDA: 'bg-red-100 text-red-800',
      AJUSTE_POSITIVO: 'bg-blue-100 text-blue-800',
      AJUSTE_NEGATIVO: 'bg-orange-100 text-orange-800',
      DEVOLUCION: 'bg-purple-100 text-purple-800',
      MERMA: 'bg-gray-100 text-gray-800',
      TRANSFERENCIA: 'bg-indigo-100 text-indigo-800'
    };

    const labels = {
      ENTRADA: 'Entrada',
      SALIDA: 'Salida',
      AJUSTE_POSITIVO: 'Ajuste +',
      AJUSTE_NEGATIVO: 'Ajuste -',
      DEVOLUCION: 'Devolución',
      MERMA: 'Merma',
      TRANSFERENCIA: 'Transferencia'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[tipo]}`}>
        {labels[tipo]}
      </span>
    );
  };

  const getMotivoBadge = (motivo: MovimientoStock['motivo']) => {
    const labels = {
      COMPRA: 'Compra',
      VENTA: 'Venta',
      AJUSTE_INVENTARIO: 'Ajuste Inventario',
      DEVOLUCION_CLIENTE: 'Devolución Cliente',
      DEVOLUCION_PROVEEDOR: 'Devolución Proveedor',
      PRODUCTO_DAÑADO: 'Producto Dañado',
      PRODUCTO_VENCIDO: 'Producto Vencido',
      ROBO_PERDIDA: 'Robo/Pérdida',
      TRANSFERENCIA_ALMACEN: 'Transferencia Almacén',
      PRODUCCION: 'Producción',
      MERMA: 'Merma',
      OTRO: 'Otro'
    };

    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
        {labels[motivo]}
      </span>
    );
  };

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) {
        return 'Fecha inválida';
      }
      return new Intl.DateTimeFormat('es-PE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(dateObj);
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  const filteredMovimientos = movimientos.filter(mov => {
    const matchesSearch =
      mov.productoNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mov.productoCodigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mov.usuario.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTipo = filterTipo === 'todos' || mov.tipo === filterTipo;

    return matchesSearch && matchesTipo;
  });

  // Cálculos de paginación
  const totalItems = filteredMovimientos.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMovimientos = filteredMovimientos.slice(startIndex, endIndex);

  // Resetear a página 1 cuando cambian los filtros
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterTipo]);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Filters */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Buscar por producto, código o usuario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="todos">Todos los movimientos</option>
            <option value="ENTRADA">Entradas</option>
            <option value="SALIDA">Salidas</option>
            <option value="AJUSTE_POSITIVO">Ajustes +</option>
            <option value="AJUSTE_NEGATIVO">Ajustes -</option>
            <option value="DEVOLUCION">Devoluciones</option>
            <option value="MERMA">Mermas</option>
            <option value="TRANSFERENCIA">Transferencias</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha y Hora
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Producto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Motivo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Establecimiento
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cantidad
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock Anterior → Nuevo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuario
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Detalles
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedMovimientos.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-600 font-medium">No se encontraron movimientos</p>
                    <p className="text-gray-500 text-sm mt-1">Ajusta los filtros o realiza un nuevo movimiento de stock</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedMovimientos.map((movimiento) => (
                <tr key={movimiento.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(movimiento.fecha)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{movimiento.productoNombre}</div>
                    <div className="text-sm text-gray-500 font-mono">{movimiento.productoCodigo}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getTipoBadge(movimiento.tipo)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getMotivoBadge(movimiento.motivo)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {movimiento.establecimientoCodigo ? (
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-purple-100 text-purple-800 font-mono">
                          {movimiento.establecimientoCodigo}
                        </span>
                        {movimiento.establecimientoNombre && (
                          <span className="text-xs text-gray-500" title={movimiento.establecimientoNombre}>
                            {movimiento.establecimientoNombre}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No especificado</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-semibold ${
                      movimiento.tipo === 'ENTRADA' || movimiento.tipo === 'AJUSTE_POSITIVO' || movimiento.tipo === 'DEVOLUCION'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {movimiento.tipo === 'ENTRADA' || movimiento.tipo === 'AJUSTE_POSITIVO' || movimiento.tipo === 'DEVOLUCION' ? '+' : '-'}
                      {movimiento.cantidad}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <span className="font-medium">{movimiento.cantidadAnterior}</span>
                      <span className="mx-2 text-gray-400">→</span>
                      <span className="font-medium text-blue-600">{movimiento.cantidadNueva}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600">
                          {movimiento.usuario.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </span>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{movimiento.usuario}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {movimiento.observaciones && (
                        <p className="text-gray-700 mb-1">{movimiento.observaciones}</p>
                      )}
                      {movimiento.documentoReferencia && (
                        <p className="text-xs text-gray-500">Doc: {movimiento.documentoReferencia}</p>
                      )}
                      {movimiento.ubicacion && (
                        <p className="text-xs text-gray-500">📍 {movimiento.ubicacion}</p>
                      )}
                    </div>
                  </td>
                </tr>
              ))
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
                <span className="font-medium">{totalItems}</span> movimientos
              </div>

              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value={5}>5 por página</option>
                <option value={10}>10 por página</option>
                <option value={25}>25 por página</option>
                <option value={50}>50 por página</option>
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

export default StockMovementsTable;
