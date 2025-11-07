// src/features/gestion-inventario/components/disponibilidad/DisponibilidadPagination.tsx

import React from 'react';

interface PaginacionInfo {
  totalItems: number;
  totalPaginas: number;
  paginaActual: number;
  itemsPorPagina: number;
  inicio: number;
  fin: number;
  hayAnterior: boolean;
  haySiguiente: boolean;
}

interface DisponibilidadPaginationProps {
  info: PaginacionInfo;
  onPaginaChange: (pagina: number) => void;
  onItemsPorPaginaChange: (items: number) => void;
}

const DisponibilidadPagination: React.FC<DisponibilidadPaginationProps> = ({
  info,
  onPaginaChange,
  onItemsPorPaginaChange
}) => {
  // Generar array de páginas a mostrar
  const generarPaginas = (): (number | string)[] => {
    const { totalPaginas, paginaActual } = info;
    const paginas: (number | string)[] = [];

    if (totalPaginas <= 7) {
      // Mostrar todas las páginas
      for (let i = 1; i <= totalPaginas; i++) {
        paginas.push(i);
      }
    } else {
      // Mostrar con ellipsis
      paginas.push(1);

      if (paginaActual > 3) {
        paginas.push('...');
      }

      for (let i = Math.max(2, paginaActual - 1); i <= Math.min(totalPaginas - 1, paginaActual + 1); i++) {
        paginas.push(i);
      }

      if (paginaActual < totalPaginas - 2) {
        paginas.push('...');
      }

      paginas.push(totalPaginas);
    }

    return paginas;
  };

  const paginas = generarPaginas();

  return (
    <div className="bg-white dark:bg-gray-800 border-t border-[#E5E7EB] dark:border-gray-700 px-4 py-2.5">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Info de registros */}
        <div className="flex items-center gap-4">
          <p className="text-sm text-[#4B5563] dark:text-gray-300 tabular-nums">
            <span className="font-medium text-[#111827] dark:text-gray-100">{info.inicio}–{info.fin}</span>
            {' '}de{' '}
            <span className="font-medium text-[#111827] dark:text-gray-100">{info.totalItems}</span>
          </p>

          {/* Items por página */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="items-por-pagina"
              className="text-sm text-[#4B5563] dark:text-gray-300 whitespace-nowrap"
            >
              Por página:
            </label>
            <select
              id="items-por-pagina"
              value={info.itemsPorPagina}
              onChange={(e) => onItemsPorPaginaChange(Number(e.target.value))}
              className="h-9 px-2 py-1 text-sm border border-[#E5E7EB] dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-[#111827] dark:text-gray-100 focus:ring-2 focus:ring-[#6F36FF]/35 focus:border-[#6F36FF] transition-all duration-150"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Controles de paginación */}
        <div className="flex items-center gap-2">
          {/* Botón Primera */}
          {info.totalPaginas > 1 && (
            <button
              onClick={() => onPaginaChange(1)}
              disabled={!info.hayAnterior}
              className="p-2 text-[#4B5563] dark:text-gray-300 hover:text-[#6F36FF] hover:bg-[#6F36FF]/8 dark:hover:bg-[#6F36FF]/15 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
              title="Primera página"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            </button>
          )}

          {/* Botón Anterior */}
          {info.totalPaginas > 1 && (
            <button
              onClick={() => onPaginaChange(info.paginaActual - 1)}
              disabled={!info.hayAnterior}
              className="p-2 text-[#4B5563] dark:text-gray-300 hover:text-[#6F36FF] hover:bg-[#6F36FF]/8 dark:hover:bg-[#6F36FF]/15 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
              title="Página anterior"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Números de página */}
          {info.totalPaginas > 1 && (
            <div className="flex items-center gap-1">
              {paginas.map((pagina, index) => (
                <React.Fragment key={`pagina-${index}`}>
                  {pagina === '...' ? (
                    <span className="px-3 py-2 text-sm text-[#4B5563] dark:text-gray-400">...</span>
                  ) : (
                    <button
                      onClick={() => onPaginaChange(pagina as number)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                        pagina === info.paginaActual
                          ? 'bg-[#6F36FF] text-white hover:bg-[#5b2ee0]'
                          : 'text-[#4B5563] dark:text-gray-300 hover:text-[#6F36FF] hover:bg-[#6F36FF]/8 dark:hover:bg-[#6F36FF]/15'
                      }`}
                    >
                      {pagina}
                    </button>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Botón Siguiente */}
          {info.totalPaginas > 1 && (
            <button
              onClick={() => onPaginaChange(info.paginaActual + 1)}
              disabled={!info.haySiguiente}
              className="p-2 text-[#4B5563] dark:text-gray-300 hover:text-[#6F36FF] hover:bg-[#6F36FF]/8 dark:hover:bg-[#6F36FF]/15 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
              title="Página siguiente"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Botón Última */}
          {info.totalPaginas > 1 && (
            <button
              onClick={() => onPaginaChange(info.totalPaginas)}
              disabled={!info.haySiguiente}
              className="p-2 text-[#4B5563] dark:text-gray-300 hover:text-[#6F36FF] hover:bg-[#6F36FF]/8 dark:hover:bg-[#6F36FF]/15 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
              title="Última página"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DisponibilidadPagination;
