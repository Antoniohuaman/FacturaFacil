import { useEffect, useState, useRef } from 'react';
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

  // Estado para colapsar/expandir el panel de detalle
  const [detalleColapsado, setDetalleColapsado] = useState(false);

  // Estado para el ancho de la lista y detalle (en px)
  const [anchoLista, setAnchoLista] = useState(0); // 0 = automático
  const [dragging, setDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Manejar el drag del splitter
  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    e.preventDefault();
  };
  useEffect(() => {
    if (!dragging) return;
    const onMouseMove = (e: MouseEvent) => {
      if (panelRef.current) {
        const bounds = panelRef.current.getBoundingClientRect();
        let x = e.clientX - bounds.left;
        // Limitar el ancho mínimo y máximo
        if (x < 240) x = 240;
        if (x > bounds.width - 320) x = bounds.width - 320;
        setAnchoLista(x);
      }
    };
    const onMouseUp = () => setDragging(false);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragging]);

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

        <div ref={panelRef} className="relative flex h-2/3 gap-6 transition-all duration-300 bg-transparent select-none">
          {/* Lista de productos */}
          <div
            style={detalleColapsado ? { flex: 1 } : anchoLista > 0 ? { width: anchoLista } : { flex: 2 }}
            className="min-w-[240px] max-w-full transition-all duration-300"
          >
            <ListaProductos
              productos={productos}
              productoSeleccionado={productoSeleccionado}
              paginacion={paginacion}
              onSeleccionar={seleccionarProducto}
              onCambiarPagina={cambiarPagina}
            />
          </div>

          {/* Splitter arrastrable */}
          {!detalleColapsado && (
            <div
              className={`hidden xl:flex items-center cursor-col-resize z-20 w-2 bg-slate-200 rounded transition-colors hover:bg-blue-300 ${dragging ? 'bg-blue-400' : ''}`}
              onMouseDown={onMouseDown}
              style={{ userSelect: 'none' }}
            >
              <div className="mx-auto w-1 h-12 bg-slate-400 rounded" />
            </div>
          )}

          {/* Preview del producto - colapsable */}
          {!detalleColapsado && (
            <div
              style={anchoLista > 0 ? { flex: 1, minWidth: 320 } : { flex: 1 }}
              className="relative min-w-[320px] max-w-full transition-all duration-300"
            >
              {/* Botón para colapsar */}
              <button
                className="absolute -left-4 top-4 z-10 bg-white border border-gray-300 rounded-full p-1 shadow hover:bg-gray-100 transition-colors"
                title="Ocultar panel de detalle"
                onClick={() => setDetalleColapsado(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <PreviewProducto producto={productoSeleccionado} />
            </div>
          )}
          {/* Botón para expandir cuando está colapsado */}
          {detalleColapsado && (
            <button
              className="absolute right-0 top-24 z-10 bg-white border border-gray-300 rounded-full p-1 shadow hover:bg-gray-100 transition-colors xl:block hidden"
              title="Mostrar panel de detalle"
              onClick={() => setDetalleColapsado(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
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