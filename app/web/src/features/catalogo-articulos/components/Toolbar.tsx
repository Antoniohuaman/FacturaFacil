import { Search, ChevronRight, Filter } from 'lucide-react';
import type { FiltrosProducto, PaginacionState } from '../models/types';
import { obtenerCategorias } from '../store/mock';

interface ToolbarProps {
  filtros: FiltrosProducto;
  paginacion: PaginacionState;
  onFiltrosChange: (filtros: Partial<FiltrosProducto>) => void;
  onLimpiarFiltros: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  filtros,
  paginacion,
  onFiltrosChange,
  onLimpiarFiltros
}) => {
  const categorias = obtenerCategorias();

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      {/* Breadcrumbs */}
      <div className="flex items-center text-sm text-gray-500 mb-4">
        <span>Catálogo</span>
        <ChevronRight className="h-4 w-4 mx-2" />
        <span className="text-gray-900 font-medium">Panel de Artículos</span>
      </div>

      {/* Controles */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Lado izquierdo - Buscadores */}
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Buscador principal */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código, nombre o categoría..."
              value={filtros.busqueda}
              onChange={(e) => onFiltrosChange({ busqueda: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>

          {/* Filtro por categoría */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={filtros.categoria}
              onChange={(e) => onFiltrosChange({ categoria: e.target.value })}
              className="pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors appearance-none bg-white min-w-[160px]"
            >
              {categorias.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'TODAS' ? 'Todas las categorías' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Botón limpiar filtros */}
          {(filtros.busqueda || filtros.categoria !== 'TODAS') && (
            <button
              onClick={onLimpiarFiltros}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Lado derecho - Información */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="bg-gray-100 px-3 py-1.5 rounded-full">
            {paginacion.totalItems} productos encontrados
          </span>
          <span className="text-gray-400">|</span>
          <span>
            Página {paginacion.pagina} de {paginacion.totalPaginas}
          </span>
        </div>
      </div>
    </div>
  );
};