// app/web/src/features/catalogo-articulos/components/PreviewProducto.tsx

import { Package, Tag, Calendar, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import type { Producto } from '../models/types';
import { formatearMoneda, formatearFecha, obtenerColorStock, obtenerEstadoStock } from '../utils/formatters';

interface PreviewProductoProps {
  producto: Producto | null;
}

export const PreviewProducto: React.FC<PreviewProductoProps> = ({ producto }) => {
  if (!producto) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 h-full flex items-center justify-center">
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">Selecciona un producto</h3>
          <p className="text-gray-300">Haz clic en cualquier producto de la lista para ver sus detalles</p>
        </div>
      </div>
    );
  }

  const colorStock = obtenerColorStock(producto.stock, producto.stockMinimo);
  const estadoStock = obtenerEstadoStock(producto.stock, producto.stockMinimo);
  const IconoEstado = producto.stock <= 0 ? AlertTriangle : producto.stock <= producto.stockMinimo ? Info : CheckCircle;

  return (
    <div className="bg-white rounded-lg border border-gray-200 h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Detalles del Producto</h2>
            <p className="text-sm text-gray-500">Información completa del artículo seleccionado</p>
          </div>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colorStock}`}>
            <IconoEstado className="h-4 w-4 mr-1" />
            {estadoStock}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-6 space-y-6">
        {/* Información básica */}
        <div>
          <div className="flex items-center mb-3">
            <Package className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-sm font-medium text-gray-700">Información General</h3>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Código SKU</span>
              <p className="text-lg font-mono font-semibold text-gray-900">{producto.codigo}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre del Producto</span>
              <p className="text-lg font-semibold text-gray-900">{producto.nombre}</p>
            </div>
            {producto.descripcion && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</span>
                <p className="text-sm text-gray-700">{producto.descripcion}</p>
              </div>
            )}
          </div>
        </div>

        {/* Categoría y Unidad */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center mb-2">
              <Tag className="h-4 w-4 text-gray-400 mr-1" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</span>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {producto.categoria}
            </span>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-2">Unidad de Medida</span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
              {producto.unidad}
            </span>
          </div>
        </div>

        {/* Precios */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Información de Precios</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-lg p-4">
              <span className="text-xs font-medium text-green-600 uppercase tracking-wider block mb-1">Precio sin IGV</span>
              <p className="text-xl font-bold text-green-700">{formatearMoneda(producto.precio)}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <span className="text-xs font-medium text-blue-600 uppercase tracking-wider block mb-1">Precio con IGV ({producto.igv}%)</span>
              <p className="text-xl font-bold text-blue-700">{formatearMoneda(producto.precioConIgv)}</p>
            </div>
          </div>
        </div>

        {/* Stock */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Control de Stock</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className={`rounded-lg p-4 ${colorStock.replace('text-', 'bg-').replace('-600', '-50').replace('-50', '-50')}`}>
              <span className={`text-xs font-medium uppercase tracking-wider block mb-1 ${colorStock.split(' ')[0]}`}>
                Stock Actual
              </span>
              <p className={`text-2xl font-bold ${colorStock.split(' ')[0]}`}>
                {producto.stock}
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <span className="text-xs font-medium text-orange-600 uppercase tracking-wider block mb-1">Stock Mínimo</span>
              <p className="text-2xl font-bold text-orange-700">{producto.stockMinimo}</p>
            </div>
          </div>
        </div>

        {/* Variantes (si las tiene) */}
        {producto.variantes && producto.variantes.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Variantes del Producto</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Variante</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Precio</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {producto.variantes.map(variante => (
                    <tr key={variante.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{variante.nombre}</td>
                      <td className="px-4 py-2 text-sm text-gray-500 font-mono">{variante.sku}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">{formatearMoneda(variante.precio)}</td>
                      <td className="px-4 py-2 text-sm text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          obtenerColorStock(variante.stock, 1)
                        }`}>
                          {variante.stock}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Fechas */}
        <div>
          <div className="flex items-center mb-3">
            <Calendar className="h-4 w-4 text-gray-400 mr-1" />
            <h3 className="text-sm font-medium text-gray-700">Historial</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">Fecha de Creación</span>
              <p className="text-gray-900">{formatearFecha(producto.fechaCreacion)}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">Última Actualización</span>
              <p className="text-gray-900">{formatearFecha(producto.fechaActualizacion)}</p>
            </div>
          </div>
        </div>

        {/* Estado del producto */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Estado del Producto</span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              producto.activo 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {producto.activo ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};