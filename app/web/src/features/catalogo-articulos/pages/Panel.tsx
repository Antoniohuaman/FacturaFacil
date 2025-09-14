import { useEffect } from 'react';
import { Toolbar } from '../components/Toolbar';
import { ListaProductos } from '../components/ListaProductos';
import { PreviewProducto } from '../components/PreviewProducto';
import { useProductos } from '../hooks/useProductos';

export const Panel: React.FC = () => {
  const {
    productos,
    productoSeleccionado,
    filtros,
    paginacion,
    actualizarFiltros,
    cambiarPagina,
    seleccionarProducto,
    limpiarFiltros
  } = useProductos();

  // Eliminados movimientos, cargandoKardex, resumen, cargandoResumen

  // Auto-seleccionar el primer producto cuando se carga la lista
  useEffect(() => {
    if (productos.length > 0 && !productoSeleccionado) {
      seleccionarProducto(productos[0]);
    }
  }, [productos, productoSeleccionado, seleccionarProducto]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Toolbar superior */}
      <Toolbar
        filtros={filtros}
        paginacion={paginacion}
        onFiltrosChange={actualizarFiltros}
        onLimpiarFiltros={limpiarFiltros}
      />

      {/* Contenido principal */}
      <div className="flex-1 p-6 space-y-6 overflow-hidden">
        {/* Sección superior - Lista y Preview */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-2/3">
          {/* Lista de productos - 2 columnas en xl */}
          <div className="xl:col-span-2">
            <ListaProductos
              productos={productos}
              productoSeleccionado={productoSeleccionado}
              paginacion={paginacion}
              onSeleccionar={seleccionarProducto}
              onCambiarPagina={cambiarPagina}
            />
          </div>

          {/* Preview del producto - 1 columna en xl */}
          <div className="xl:col-span-1">
            <PreviewProducto producto={productoSeleccionado} />
          </div>
        </div>

        {/* Sección inferior - Kardex y Resumen */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-1/3">
          {/* Kardex - 2 columnas en xl */}
          <div className="xl:col-span-2">
          </div>

          {/* Resumen de Stock - 1 columna en xl */}
          <div className="xl:col-span-1">
          </div>
        </div>
      </div>
    </div>
  );
};