// app/web/src/features/catalogo-articulos/components/ListaProductos.tsx

import { ChevronLeft, ChevronRight, Package, AlertCircle } from 'lucide-react';
import type { Producto, PaginacionState } from '../models/types';
import { formatearMoneda, obtenerColorStock, obtenerEstadoStock } from '../utils/formatters';

interface ListaProductosProps {
  productos: Producto[];
  productoSeleccionado: Producto | null;
  paginacion: PaginacionState;
  onSeleccionar: (producto: Producto) => void;
  onCambiarPagina: (pagina: number) => void;
}

export const ListaProductos: React.FC<ListaProductosProps> = ({
  productos,
  productoSeleccionado,
  paginacion,
  onSeleccionar,
  onCambiarPagina
}) => {
  console.log('ListaProductos productos:', productos);
  const paginasArray = Array.from({ length: paginacion.totalPaginas }, (_, i) => i + 1);

  if (productos.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 h-full flex items-center justify-center">
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron productos</h3>
          <p className="text-gray-500">Intenta ajustar los filtros de búsqueda</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
      {/* Header superior personalizado */}
      <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b-2 border-green-500">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-gray-900">Productos</h2>
        </div>
        <div className="flex items-center gap-2">
          <button className="bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg px-6 py-2 transition-colors">
            Nuevo producto / servicio
          </button>
          <button className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold rounded-lg px-6 py-2 transition-colors">
            Importar productos
          </button>
          <button className="bg-white border border-gray-300 rounded-lg p-2 hover:bg-gray-100 transition-colors" title="Descargar">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" /></svg>
          </button>
          {/* Avatar de usuario de ejemplo */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center text-white font-bold shadow">
            JD
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-hidden">
        <div className="overflow-x-auto h-full">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unidad
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {productos.map((producto) => {
                const isSelected = productoSeleccionado?.id === producto.id;
                const colorStock = obtenerColorStock(producto.stock, producto.stockMinimo);
                const estadoStock = obtenerEstadoStock(producto.stock, producto.stockMinimo);
                
                return (
                  <tr
                    key={producto.id}
                    onClick={() => onSeleccionar(producto)}
                    className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                      isSelected ? 'bg-blue-50 ring-2 ring-blue-500 ring-inset' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {producto.codigo}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                        {producto.nombre}
                      </div>
                      {producto.descripcion && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {producto.descripcion}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                        {producto.unidad}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatearMoneda(producto.precioConIgv)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Sin IGV: {formatearMoneda(producto.precio)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorStock}`}>
                        {producto.stock <= 0 && (
                          <AlertCircle className="h-3 w-3 mr-1" />
                        )}
                        {producto.stock}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {estadoStock}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {producto.categoria}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {paginacion.totalPaginas > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Mostrando {(paginacion.pagina - 1) * paginacion.itemsPorPagina + 1} - {Math.min(paginacion.pagina * paginacion.itemsPorPagina, paginacion.totalItems)} de {paginacion.totalItems} productos
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onCambiarPagina(paginacion.pagina - 1)}
                disabled={paginacion.pagina === 1}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md hover:bg-gray-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <div className="flex space-x-1">
                {paginasArray.map(pagina => {
                  // Mostrar solo algunas páginas para evitar overflow
                  if (paginasArray.length > 7) {
                    if (pagina === 1 || 
                        pagina === paginasArray.length || 
                        (pagina >= paginacion.pagina - 1 && pagina <= paginacion.pagina + 1)) {
                      return (
                        <button
                          key={pagina}
                          onClick={() => onCambiarPagina(pagina)}
                          className={`px-3 py-1 text-sm rounded transition-colors ${
                            pagina === paginacion.pagina
                              ? 'bg-blue-500 text-white'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {pagina}
                        </button>
                      );
                    } else if (pagina === paginacion.pagina - 2 || pagina === paginacion.pagina + 2) {
                      return <span key={pagina} className="px-2 py-1 text-gray-400">...</span>;
                    }
                    return null;
                  } else {
                    return (
                      <button
                        key={pagina}
                        onClick={() => onCambiarPagina(pagina)}
                        className={`px-3 py-1 text-sm rounded transition-colors ${
                          pagina === paginacion.pagina
                            ? 'bg-blue-500 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {pagina}
                      </button>
                    );
                  }
                })}
              </div>
              
              <button
                onClick={() => onCambiarPagina(paginacion.pagina + 1)}
                disabled={paginacion.pagina === paginacion.totalPaginas}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md hover:bg-gray-100"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};