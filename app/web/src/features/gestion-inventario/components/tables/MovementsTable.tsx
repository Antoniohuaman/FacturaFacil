/* eslint-disable @typescript-eslint/no-unused-vars -- variables temporales; limpieza diferida */
// src/features/inventario/components/tables/MovementsTable.tsx

import React, { useState } from 'react';
import type { MovimientoStock } from '../../models';

interface MovementsTableProps {
  movimientos: MovimientoStock[];
  warehouseFiltro?: string; // Filtro externo por almacén
}

const MovementsTable: React.FC<MovementsTableProps> = ({
  movimientos,
  warehouseFiltro
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const getTipoBadge = (tipo: MovimientoStock['tipo']) => {
    const styles = {
      ENTRADA: 'bg-[#10B981]/10 text-[#10B981] dark:bg-[#10B981]/15 dark:text-[#34D399] border border-[#10B981]/30',
      SALIDA: 'bg-[#EF4444]/10 text-[#EF4444] dark:bg-[#EF4444]/15 dark:text-[#F87171] border border-[#EF4444]/30',
      AJUSTE_POSITIVO: 'bg-[#3B82F6]/10 text-[#3B82F6] dark:bg-[#3B82F6]/15 dark:text-[#60A5FA] border border-[#3B82F6]/30',
      AJUSTE_NEGATIVO: 'bg-[#D97706]/10 text-[#D97706] dark:bg-[#D97706]/15 dark:text-[#F59E0B] border border-[#D97706]/30',
      DEVOLUCION: 'bg-[#6F36FF]/10 text-[#6F36FF] dark:bg-[#6F36FF]/15 dark:text-[#8B5CF6] border border-[#6F36FF]/30',
      MERMA: 'bg-gray-100 text-[#4B5563] dark:bg-gray-700 dark:text-gray-300 border border-[#E5E7EB] dark:border-gray-600',
      TRANSFERENCIA: 'bg-[#6F36FF]/10 text-[#6F36FF] dark:bg-[#6F36FF]/15 dark:text-[#8B5CF6] border border-[#6F36FF]/30'
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
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
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

    // Filtro por almacén
    const matchesWarehouse =
      !warehouseFiltro ||
      warehouseFiltro === 'todos' ||
      mov.warehouseId === warehouseFiltro;

    return matchesSearch && matchesTipo && matchesWarehouse;
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-[#E5E7EB] dark:border-gray-700">
      {/* Filters */}
      <div className="p-4 border-b border-[#E5E7EB] dark:border-gray-700">
        <div className="flex items-center gap-2.5">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Buscar por producto, código o usuario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-10 pr-4 py-2 w-full text-sm border border-[#E5E7EB] dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35 focus:border-[#6F36FF] dark:bg-gray-700 dark:text-white transition-all duration-150"
              />
            </div>
          </div>

          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="h-9 px-3 py-2 text-sm border border-[#E5E7EB] dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35 focus:border-[#6F36FF] dark:bg-gray-700 dark:text-white transition-all duration-150"
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
        <table className="min-w-full divide-y divide-[#E5E7EB] dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#111827] dark:text-gray-300 uppercase tracking-wider">
                Fecha y Hora
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#111827] dark:text-gray-300 uppercase tracking-wider">
                Producto
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#111827] dark:text-gray-300 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#111827] dark:text-gray-300 uppercase tracking-wider">
                Motivo
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#111827] dark:text-gray-300 uppercase tracking-wider">
                Almacén
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-[#111827] dark:text-gray-300 uppercase tracking-wider">
                Cantidad
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-[#111827] dark:text-gray-300 uppercase tracking-wider">
                Stock Ant → Nuevo
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#111827] dark:text-gray-300 uppercase tracking-wider">
                Usuario
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#111827] dark:text-gray-300 uppercase tracking-wider">
                Detalles
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-[#E5E7EB] dark:divide-gray-700">
            {paginatedMovimientos.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-600 dark:text-gray-400 font-medium">No se encontraron movimientos</p>
                    <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">Ajusta los filtros o realiza un nuevo movimiento de stock</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedMovimientos.map((movimiento) => (
                <tr key={movimiento.id} className="hover:bg-[#6F36FF]/5 dark:hover:bg-[#6F36FF]/8 transition-colors duration-150">
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="text-sm text-[#4B5563] dark:text-gray-400">{formatDate(movimiento.fecha)}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="text-sm font-medium text-[#111827] dark:text-gray-100">{movimiento.productoNombre}</div>
                    <div className="text-xs text-[#4B5563] dark:text-gray-400 font-mono">{movimiento.productoCodigo}</div>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {getTipoBadge(movimiento.tipo)}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {getMotivoBadge(movimiento.motivo)}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {movimiento.warehouseCodigo ? (
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#6F36FF]/10 text-[#6F36FF] dark:bg-[#6F36FF]/15 dark:text-[#8B5CF6] border border-[#6F36FF]/30 font-mono">
                            {movimiento.warehouseCodigo}
                          </span>
                          {movimiento.warehouseNombre && (
                            <span className="text-xs font-medium text-[#4B5563] dark:text-gray-400" title={movimiento.warehouseNombre}>
                              {movimiento.warehouseNombre}
                            </span>
                          )}
                        </div>
                        {movimiento.establishmentNombre && (
                          <span className="text-xs text-[#4B5563] dark:text-gray-400">
                            Est: {movimiento.establishmentNombre}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No especificado</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-right">
                    <div className={`text-sm font-semibold tabular-nums ${
                      movimiento.tipo === 'ENTRADA' || movimiento.tipo === 'AJUSTE_POSITIVO' || movimiento.tipo === 'DEVOLUCION'
                        ? 'text-[#10B981] dark:text-[#34D399]'
                        : 'text-[#EF4444] dark:text-[#F87171]'
                    }`}>
                      {movimiento.tipo === 'ENTRADA' || movimiento.tipo === 'AJUSTE_POSITIVO' || movimiento.tipo === 'DEVOLUCION' ? '+' : '-'}
                      {movimiento.cantidad}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-right">
                    <div className="text-sm text-[#4B5563] dark:text-gray-400 tabular-nums">
                      <span className="font-medium">{movimiento.cantidadAnterior}</span>
                      <span className="mx-1.5 text-gray-400">→</span>
                      <span className="font-medium text-[#3B82F6] dark:text-[#60A5FA]">{movimiento.cantidadNueva}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-7 w-7 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-[#4B5563] dark:text-gray-300">
                          {movimiento.usuario.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </span>
                      </div>
                      <div className="ml-2">
                        <div className="text-sm font-medium text-[#111827] dark:text-gray-100">{movimiento.usuario}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="text-sm text-[#4B5563] dark:text-gray-400">
                      {/* Transferencia */}
                      {movimiento.esTransferencia && (
                        <div className="mb-2 p-2 bg-[#6F36FF]/10 dark:bg-[#6F36FF]/15 border border-[#6F36FF]/30 dark:border-[#6F36FF]/40 rounded-md">
                          <div className="flex items-center space-x-2 text-xs">
                            <svg className="w-4 h-4 text-[#6F36FF] dark:text-[#8B5CF6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            <span className="font-medium text-[#6F36FF] dark:text-[#8B5CF6]">
                              {movimiento.tipo === 'SALIDA' ? 'Hacia almacén:' : 'Desde almacén:'}{' '}
                              {movimiento.tipo === 'SALIDA'
                                ? movimiento.warehouseDestinoNombre
                                : movimiento.warehouseOrigenNombre
                              }
                            </span>
                          </div>
                          <div className="text-xs text-[#6F36FF] dark:text-[#8B5CF6] mt-1">
                            ID Transferencia: {movimiento.transferenciaId}
                          </div>
                        </div>
                      )}

                      {/* Observaciones */}
                      {movimiento.observaciones && (
                        <p className="text-[#111827] dark:text-gray-300 mb-1">{movimiento.observaciones}</p>
                      )}

                      {/* Documento de referencia */}
                      {movimiento.documentoReferencia && (
                        <p className="text-xs text-[#4B5563] dark:text-gray-400">Doc: {movimiento.documentoReferencia}</p>
                      )}

                      {/* Ubicación (legacy) */}
                      {movimiento.ubicacion && (
                        <p className="text-xs text-[#4B5563] dark:text-gray-400">📍 {movimiento.ubicacion}</p>
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
        <div className="px-4 py-2.5 border-t border-[#E5E7EB] dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <p className="text-sm text-[#4B5563] dark:text-gray-300 tabular-nums">
                <span className="font-medium text-[#111827] dark:text-gray-100">{startIndex + 1}–{Math.min(endIndex, totalItems)}</span>
                {' '}de{' '}
                <span className="font-medium text-[#111827] dark:text-gray-100">{totalItems}</span>
              </p>

              <div className="flex items-center gap-2">
                <label className="text-sm text-[#4B5563] dark:text-gray-300 whitespace-nowrap">
                  Por página:
                </label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-9 px-2 py-1 text-sm border border-[#E5E7EB] dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-[#111827] dark:text-gray-100 focus:ring-2 focus:ring-[#6F36FF]/35 focus:border-[#6F36FF] transition-all duration-150"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <nav className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 text-[#4B5563] dark:text-gray-300 hover:text-[#6F36FF] hover:bg-[#6F36FF]/8 dark:hover:bg-[#6F36FF]/15 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
                title="Página anterior"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Números de página */}
              <div className="flex items-center gap-1">
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
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                        currentPage === pageNum
                          ? 'bg-[#6F36FF] text-white hover:bg-[#5b2ee0]'
                          : 'text-[#4B5563] dark:text-gray-300 hover:text-[#6F36FF] hover:bg-[#6F36FF]/8 dark:hover:bg-[#6F36FF]/15'
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
                className="p-2 text-[#4B5563] dark:text-gray-300 hover:text-[#6F36FF] hover:bg-[#6F36FF]/8 dark:hover:bg-[#6F36FF]/15 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
                title="Página siguiente"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovementsTable;
