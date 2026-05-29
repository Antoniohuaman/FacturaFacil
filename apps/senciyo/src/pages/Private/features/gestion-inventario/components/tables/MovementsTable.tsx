// src/features/inventario/components/tables/MovementsTable.tsx

import React, { useState } from 'react';
import { Eye } from 'lucide-react';
import type { MovimientoStock } from '../../models';
import { formatBusinessDateTimeForTicket } from '@/shared/time/businessTime';
import MovimientoDetalleModal from '../modals/MovimientoDetalleModal';

interface MovementsTableProps {
  movimientos: MovimientoStock[];
  almacenFiltro?: string;
  /** Notifica al padre los movimientos actualmente visibles (para exportación). */
  onFilteredDataChange?: (movs: MovimientoStock[]) => void;
}

const TIPO_BADGE: Record<MovimientoStock['tipo'], { cls: string; label: string }> = {
  ENTRADA:        { cls: 'bg-[#10B981]/10 text-[#10B981] dark:bg-[#10B981]/15 dark:text-[#34D399] border border-[#10B981]/30', label: 'Entrada' },
  SALIDA:         { cls: 'bg-[#EF4444]/10 text-[#EF4444] dark:bg-[#EF4444]/15 dark:text-[#F87171] border border-[#EF4444]/30', label: 'Salida' },
  AJUSTE_POSITIVO:{ cls: 'bg-[#3B82F6]/10 text-[#3B82F6] dark:bg-[#3B82F6]/15 dark:text-[#60A5FA] border border-[#3B82F6]/30', label: 'Ajuste +' },
  AJUSTE_NEGATIVO:{ cls: 'bg-[#D97706]/10 text-[#D97706] dark:bg-[#D97706]/15 dark:text-[#F59E0B] border border-[#D97706]/30', label: 'Ajuste -' },
  DEVOLUCION:     { cls: 'bg-[#6F36FF]/10 text-[#6F36FF] dark:bg-[#6F36FF]/15 dark:text-[#8B5CF6] border border-[#6F36FF]/30', label: 'Devolución' },
  MERMA:          { cls: 'bg-gray-100 text-[#4B5563] dark:bg-gray-700 dark:text-gray-300 border border-[#E5E7EB] dark:border-gray-600', label: 'Merma' },
  TRANSFERENCIA:  { cls: 'bg-[#6F36FF]/10 text-[#6F36FF] dark:bg-[#6F36FF]/15 dark:text-[#8B5CF6] border border-[#6F36FF]/30', label: 'Transferencia' },
};

const MOTIVO_LABEL: Record<MovimientoStock['motivo'], string> = {
  COMPRA:              'Compra',
  VENTA:               'Venta',
  AJUSTE_INVENTARIO:   'Ajuste inventario',
  DEVOLUCION_CLIENTE:  'Dev. cliente',
  DEVOLUCION_PROVEEDOR:'Dev. proveedor',
  PRODUCTO_DAÑADO:     'Prod. dañado',
  PRODUCTO_VENCIDO:    'Prod. vencido',
  ROBO_PERDIDA:        'Robo/Pérdida',
  TRANSFERENCIA_ALMACEN:'Transferencia',
  PRODUCCION:          'Producción',
  MERMA:               'Merma',
  OTRO:                'Otro',
};

/** Retorna la referencia más significativa del movimiento para mostrar en tabla. */
const resolverRefTabla = (mov: MovimientoStock): string | null => {
  if (mov.documentoReferencia) return mov.documentoReferencia;
  if (mov.transferenciaId) return mov.transferenciaId;
  return null;
};

const MovementsTable: React.FC<MovementsTableProps> = ({
  movimientos,
  almacenFiltro,
  onFilteredDataChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [movimientoDetalle, setMovimientoDetalle] = useState<MovimientoStock | null>(null);

  const filteredMovimientos = movimientos.filter(mov => {
    const termLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      mov.productoNombre.toLowerCase().includes(termLower) ||
      mov.productoCodigo.toLowerCase().includes(termLower) ||
      mov.usuario.toLowerCase().includes(termLower) ||
      (mov.documentoReferencia?.toLowerCase().includes(termLower) ?? false) ||
      (mov.transferenciaId?.toLowerCase().includes(termLower) ?? false) ||
      (mov.almacenNombre?.toLowerCase().includes(termLower) ?? false) ||
      (mov.almacenCodigo?.toLowerCase().includes(termLower) ?? false) ||
      (mov.EstablecimientoNombre?.toLowerCase().includes(termLower) ?? false) ||
      (mov.observaciones?.toLowerCase().includes(termLower) ?? false) ||
      mov.motivo.toLowerCase().includes(termLower) ||
      mov.tipo.toLowerCase().includes(termLower);

    const matchesTipo =
      filterTipo === 'todos' ||
      (filterTipo === 'TRANSFERENCIA'
        ? mov.esTransferencia === true || mov.motivo === 'TRANSFERENCIA_ALMACEN'
        : mov.tipo === filterTipo);

    const matchesalmacen =
      !almacenFiltro ||
      almacenFiltro === 'todos' ||
      mov.almacenId === almacenFiltro ||
      mov.almacenOrigenId === almacenFiltro ||
      mov.almacenDestinoId === almacenFiltro;

    return matchesSearch && matchesTipo && matchesalmacen;
  });

  // Notifica al padre los movimientos visibles para que el exportador use exactamente esta lista
  React.useEffect(() => {
    onFilteredDataChange?.(filteredMovimientos);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredMovimientos]);

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
    <>
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
                  placeholder="Buscar por producto, código, documento, almacén, usuario..."
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
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-[#111827] dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">Fecha</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-[#111827] dark:text-gray-300 uppercase tracking-wider">Producto</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-[#111827] dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">Tipo</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-[#111827] dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">Motivo</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-[#111827] dark:text-gray-300 uppercase tracking-wider">Almacén</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-[#111827] dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">Cant.</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-[#111827] dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">Stock</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-[#111827] dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">Doc / Ref.</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-[#111827] dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">Usuario</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-[#111827] dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">Ver</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-[#E5E7EB] dark:divide-gray-700">
              {paginatedMovimientos.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-600 dark:text-gray-400 font-medium text-sm">No se encontraron movimientos</p>
                      <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">Ajusta los filtros o realiza un nuevo movimiento de stock</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedMovimientos.map((mov) => {
                  const tipoBadge = TIPO_BADGE[mov.tipo];
                  const esEntrada = mov.tipo === 'ENTRADA' || mov.tipo === 'AJUSTE_POSITIVO' || mov.tipo === 'DEVOLUCION';
                  const ref = resolverRefTabla(mov);

                  return (
                    <tr
                      key={mov.id}
                      data-focus={`inventario:movimiento:${mov.id}`}
                      className="hover:bg-[#6F36FF]/5 dark:hover:bg-[#6F36FF]/8 transition-colors duration-150"
                    >
                      {/* Fecha */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="text-xs text-[#4B5563] dark:text-gray-400">
                          {formatBusinessDateTimeForTicket(mov.fecha)}
                        </span>
                      </td>

                      {/* Producto */}
                      <td className="px-3 py-2 max-w-[180px]">
                        <p className="text-xs font-medium text-[#111827] dark:text-gray-100 truncate" title={mov.productoNombre}>
                          {mov.productoNombre}
                        </p>
                        <p className="text-[10px] text-[#4B5563] dark:text-gray-400 font-mono">{mov.productoCodigo}</p>
                      </td>

                      {/* Tipo */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${tipoBadge.cls}`}>
                          {tipoBadge.label}
                        </span>
                      </td>

                      {/* Motivo */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          {MOTIVO_LABEL[mov.motivo] ?? mov.motivo}
                        </span>
                      </td>

                      {/* Almacén */}
                      <td className="px-3 py-2 max-w-[150px]">
                        {mov.almacenCodigo ? (
                          <>
                            <p className="text-xs font-medium text-[#111827] dark:text-gray-100 truncate" title={`${mov.almacenCodigo} - ${mov.almacenNombre}`}>
                              <span className="font-mono text-[#6F36FF] dark:text-[#8B5CF6] mr-1">{mov.almacenCodigo}</span>
                              {mov.almacenNombre}
                            </p>
                            {mov.EstablecimientoNombre && (
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate" title={mov.EstablecimientoNombre}>
                                {mov.EstablecimientoNombre}
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-400 italic">—</span>
                        )}
                      </td>

                      {/* Cantidad */}
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        <span className={`text-xs font-semibold tabular-nums ${esEntrada ? 'text-[#10B981] dark:text-[#34D399]' : 'text-[#EF4444] dark:text-[#F87171]'}`}>
                          {esEntrada ? '+' : '-'}{mov.cantidad}
                        </span>
                      </td>

                      {/* Stock */}
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        <span className="text-xs text-[#4B5563] dark:text-gray-400 tabular-nums">
                          <span className="font-medium">{mov.cantidadAnterior}</span>
                          <span className="mx-1 text-gray-400">→</span>
                          <span className="font-medium text-[#3B82F6] dark:text-[#60A5FA]">{mov.cantidadNueva}</span>
                        </span>
                      </td>

                      {/* Documento / Referencia */}
                      <td className="px-3 py-2 max-w-[140px]">
                        {ref ? (
                          <span
                            className="text-[10px] font-mono text-[#4B5563] dark:text-gray-400 truncate block"
                            title={ref}
                          >
                            {ref}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>

                      {/* Usuario */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-shrink-0 h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                            <span className="text-[10px] font-medium text-[#4B5563] dark:text-gray-300">
                              {mov.usuario.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-xs text-[#111827] dark:text-gray-100 truncate max-w-[80px]" title={mov.usuario}>
                            {mov.usuario}
                          </span>
                        </div>
                      </td>

                      {/* Ver detalle */}
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => setMovimientoDetalle(mov)}
                          title="Ver detalle"
                          className="p-1.5 text-gray-400 hover:text-[#6F36FF] dark:hover:text-[#8B5CF6] hover:bg-[#6F36FF]/8 dark:hover:bg-[#6F36FF]/15 rounded-md transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
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
                  <label className="text-sm text-[#4B5563] dark:text-gray-300 whitespace-nowrap">Por página:</label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
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

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
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

      {/* Modal de detalle */}
      {movimientoDetalle && (
        <MovimientoDetalleModal
          movimiento={movimientoDetalle}
          onCerrar={() => setMovimientoDetalle(null)}
        />
      )}
    </>
  );
};

export default MovementsTable;
