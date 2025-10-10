import type { Product, FilterOptions } from '../models/types';
// src/features/catalogo-articulos/components/ProductTable.tsx
import React, { useState, useEffect } from 'react';
import { useConfigurationContext } from '../../configuracion-sistema/context/ConfigurationContext';
import StockDetailModal from './StockDetailModal';

// Definir las columnas disponibles
type ColumnKey = 
  | 'unidad' 
  | 'categoria'
  | 'establecimientos' 
  | 'alias' 
  | 'precioCompra' 
  | 'porcentajeGanancia' 
  | 'codigoBarras' 
  | 'codigoFabrica' 
  | 'codigoSunat' 
  | 'descuentoProducto' 
  | 'marca' 
  | 'modelo' 
  | 'peso' 
  | 'tipoExistencia';

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  defaultVisible: boolean;
  group: 'basicas' | 'codigos' | 'financieras' | 'caracteristicas' | 'asignacion';
}

const AVAILABLE_COLUMNS: ColumnConfig[] = [
  // Columnas básicas
  { key: 'unidad', label: 'Unidad', defaultVisible: true, group: 'basicas' },
  { key: 'categoria', label: 'Categoría', defaultVisible: true, group: 'basicas' },
  
  // Asignación de ubicaciones
  { key: 'establecimientos', label: 'Establecimientos', defaultVisible: true, group: 'asignacion' },
  
  // Información adicional
  { key: 'alias', label: 'Alias', defaultVisible: false, group: 'basicas' },
  
  // Códigos
  { key: 'codigoBarras', label: 'Código Barras', defaultVisible: false, group: 'codigos' },
  { key: 'codigoFabrica', label: 'Código Fábrica', defaultVisible: false, group: 'codigos' },
  { key: 'codigoSunat', label: 'Código SUNAT', defaultVisible: false, group: 'codigos' },
  
  // Información financiera
  { key: 'precioCompra', label: 'Precio Compra', defaultVisible: false, group: 'financieras' },
  { key: 'porcentajeGanancia', label: '% Ganancia', defaultVisible: false, group: 'financieras' },
  { key: 'descuentoProducto', label: '% Descuento', defaultVisible: false, group: 'financieras' },
  
  // Características del producto
  { key: 'marca', label: 'Marca', defaultVisible: false, group: 'caracteristicas' },
  { key: 'modelo', label: 'Modelo', defaultVisible: false, group: 'caracteristicas' },
  { key: 'peso', label: 'Peso (kg)', defaultVisible: false, group: 'caracteristicas' },
  { key: 'tipoExistencia', label: 'Tipo Existencia', defaultVisible: false, group: 'caracteristicas' },
];

interface ProductTableProps {
  products: Product[];
  filters: FilterOptions;
  onFiltersChange: (filters: Partial<FilterOptions>) => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  loading?: boolean;
  selectedProducts: Set<string>; // NUEVA
  onSelectedProductsChange: (selected: Set<string>) => void; // NUEVA
}

const ProductTable: React.FC<ProductTableProps> = ({
  products,
  filters,
  onFiltersChange,
  onEditProduct,
  onDeleteProduct,
  loading = false,
  selectedProducts,
  onSelectedProductsChange
}) => {
  // Acceder a los establecimientos desde el contexto de configuración
  const { state: configState } = useConfigurationContext();
  const establishments = configState.establishments;
  
  // Estado para columnas visibles
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(() => {
    // Intentar cargar desde localStorage
    const saved = localStorage.getItem('productTableColumns');
    if (saved) {
      try {
        return new Set(JSON.parse(saved));
      } catch {
        // Si hay error, usar valores por defecto
        return new Set(AVAILABLE_COLUMNS.filter(col => col.defaultVisible).map(col => col.key));
      }
    }
    return new Set(AVAILABLE_COLUMNS.filter(col => col.defaultVisible).map(col => col.key));
  });

  const [showColumnSelector, setShowColumnSelector] = useState(false);

  // ✅ NUEVO: Estado para modal de detalle de stock
  const [stockDetailModal, setStockDetailModal] = useState<{
    isOpen: boolean;
    product: Product | null;
  }>({ isOpen: false, product: null });

  // Guardar preferencias en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem('productTableColumns', JSON.stringify([...visibleColumns]));
  }, [visibleColumns]);

  const toggleColumn = (columnKey: ColumnKey) => {
    const newVisible = new Set(visibleColumns);
    if (newVisible.has(columnKey)) {
      newVisible.delete(columnKey);
    } else {
      newVisible.add(columnKey);
    }
    setVisibleColumns(newVisible);
  };

  const resetColumns = () => {
    const defaults = new Set(AVAILABLE_COLUMNS.filter(col => col.defaultVisible).map(col => col.key));
    setVisibleColumns(defaults);
  };

  const showAllColumns = () => {
    setVisibleColumns(new Set(AVAILABLE_COLUMNS.map(col => col.key)));
  };

  const hideAllColumns = () => {
    setVisibleColumns(new Set());
  };

  // selectedProducts y onSelectedProductsChange vienen de props

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectedProductsChange(new Set(products.map(p => p.id)));
    } else {
      onSelectedProductsChange(new Set());
    }
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    const newSelected = new Set(selectedProducts);
    if (checked) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
    }
    onSelectedProductsChange(newSelected);
  };

  const handleSort = (field: keyof Product) => {
    const newDirection = 
      filters.ordenarPor === field && filters.direccion === 'asc' ? 'desc' : 'asc';
    
    onFiltersChange({
      ordenarPor: field as FilterOptions['ordenarPor'],
      direccion: newDirection
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  };

  const getSortIcon = (field: string) => {
    if (filters.ordenarPor !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    return filters.direccion === 'asc' ? (
      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const getStockBadge = (cantidad: number) => {
    if (cantidad > 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          En stock ({cantidad})
        </span>
      );
    } else if (cantidad === 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Sin stock
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Negativo ({cantidad})
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="animate-pulse p-6">
          <div className="grid grid-cols-6 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="col-span-6">
                <div className="flex items-center space-x-4">
                  <div className="w-4 h-4 bg-gray-200 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
                {i < 4 && <div className="border-t border-gray-200 mt-4"></div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Agrupar columnas por categoría
  const columnsByGroup = AVAILABLE_COLUMNS.reduce((acc, col) => {
    if (!acc[col.group]) acc[col.group] = [];
    acc[col.group].push(col);
    return acc;
  }, {} as Record<string, ColumnConfig[]>);

  const groupLabels = {
    basicas: 'Información Básica',
    asignacion: 'Asignación y Ubicación',
    codigos: 'Códigos',
    financieras: 'Información Financiera',
    caracteristicas: 'Características del Producto'
  };

  return (
    <>
      {/* Panel selector de columnas */}
      <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Personalizar columnas
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({visibleColumns.size} de {AVAILABLE_COLUMNS.length} columnas visibles)
            </span>
          </div>
          
          <button
            onClick={() => setShowColumnSelector(!showColumnSelector)}
            className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium flex items-center space-x-1"
          >
            <span>{showColumnSelector ? 'Ocultar opciones' : 'Mostrar opciones'}</span>
            <svg 
              className={`w-4 h-4 transition-transform ${showColumnSelector ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {showColumnSelector && (
          <div className="space-y-4 pt-3 border-t border-gray-200 dark:border-gray-600">
            {/* Botones de acción rápida */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={showAllColumns}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                Mostrar todas
              </button>
              <button
                onClick={hideAllColumns}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                Ocultar todas
              </button>
              <button
                onClick={resetColumns}
                className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md transition-colors"
              >
                Restaurar por defecto
              </button>
            </div>

            {/* Columnas agrupadas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(columnsByGroup).map(([groupKey, columns]) => (
                <div key={groupKey} className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    {groupLabels[groupKey as keyof typeof groupLabels]}
                  </h4>
                  <div className="space-y-1.5">
                    {columns.map((column) => (
                      <label
                        key={column.key}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={visibleColumns.has(column.key)}
                          onChange={() => toggleColumn(column.key)}
                          className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{column.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Nota informativa */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
              <div className="flex">
                <svg className="h-5 w-5 text-blue-400 dark:text-blue-300 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Las columnas Código, Nombre, Precio, Stock y Acciones siempre estarán visibles. 
                    Tus preferencias se guardan automáticamente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabla de productos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Indicador de scroll horizontal */}
        {visibleColumns.size > 3 && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-2 border-b border-gray-200">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-gray-600">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
                <span className="font-medium">Desliza horizontalmente para ver más columnas</span>
              </div>
              <span className="px-2 py-1 bg-white rounded-md text-gray-700 font-mono shadow-sm">
                {visibleColumns.size + 5} columnas visibles
              </span>
            </div>
          </div>
        )}
        
        {/* Contenedor con scroll horizontal mejorado */}
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100" style={{ 
          scrollbarWidth: 'thin',
          scrollbarColor: '#9CA3AF #F3F4F6'
        }}>
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="w-12 px-6 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded"
                  checked={selectedProducts.size === products.length && products.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                onClick={() => handleSort('codigo')}
              >
                <div className="flex items-center space-x-1">
                  <span>Código</span>
                  {getSortIcon('codigo')}
                </div>
              </th>
              
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                onClick={() => handleSort('nombre')}
              >
                <div className="flex items-center space-x-1">
                  <span>Nombre</span>
                  {getSortIcon('nombre')}
                </div>
              </th>
              
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                onClick={() => handleSort('precio')}
              >
                <div className="flex items-center space-x-1">
                  <span>Precio</span>
                  {getSortIcon('precio')}
                </div>
              </th>
              
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                onClick={() => handleSort('cantidad')}
              >
                <div className="flex items-center space-x-1">
                  <span>Stock</span>
                  {getSortIcon('cantidad')}
                </div>
              </th>
              
              {visibleColumns.has('unidad') && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Unidad
                </th>
              )}
              
              {visibleColumns.has('categoria') && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Categoría
                </th>
              )}

              {visibleColumns.has('establecimientos') && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Establecimientos
                </th>
              )}

              {visibleColumns.has('alias') && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Alias
                </th>
              )}

              {visibleColumns.has('precioCompra') && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Precio Compra
                </th>
              )}

              {visibleColumns.has('porcentajeGanancia') && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % Ganancia
                </th>
              )}

              {visibleColumns.has('codigoBarras') && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código Barras
                </th>
              )}

              {visibleColumns.has('codigoFabrica') && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código Fábrica
                </th>
              )}

              {visibleColumns.has('codigoSunat') && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código SUNAT
                </th>
              )}

              {visibleColumns.has('descuentoProducto') && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % Descuento
                </th>
              )}

              {visibleColumns.has('marca') && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Marca
                </th>
              )}

              {visibleColumns.has('modelo') && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Modelo
                </th>
              )}

              {visibleColumns.has('peso') && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Peso (kg)
                </th>
              )}

              {visibleColumns.has('tipoExistencia') && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo Existencia
                </th>
              )}
              
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
            {products.map((product) => (
              <tr 
                key={product.id}
                className={`
                  hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                  ${selectedProducts.has(product.id) ? 'bg-red-50 dark:bg-red-900/20' : ''}
                `}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded"
                    checked={selectedProducts.has(product.id)}
                    onChange={(e) => handleSelectProduct(product.id, e.target.checked)}
                  />
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-mono font-medium text-gray-900 dark:text-white">
                    {product.codigo}
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900 dark:text-white max-w-xs truncate">
                    {product.nombre}
                  </div>
                  {product.descripcion && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {product.descripcion}
                    </div>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(product.precio)}
                  </div>
                  {product.impuesto && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {product.impuesto}
                    </div>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {getStockBadge(product.cantidad)}
                    {/* Botón para ver detalle de stock por establecimiento */}
                    {!product.disponibleEnTodos && product.establecimientoIds && product.establecimientoIds.length > 0 && (
                      <button
                        onClick={() => setStockDetailModal({ isOpen: true, product })}
                        className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded transition-colors"
                        title="Ver stock por establecimiento"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
                
                {visibleColumns.has('unidad') && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`
                      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${product.unidad === 'DOCENA' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                      }
                    `}>
                      {product.unidad}
                    </span>
                  </td>
                )}
                
                {visibleColumns.has('categoria') && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {product.categoria}
                    </span>
                  </td>
                )}

                {visibleColumns.has('establecimientos') && (
                  <td className="px-6 py-4">
                    {product.disponibleEnTodos ? (
                      <div className="flex items-center space-x-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Todos ({establishments.filter(e => e.isActive).length})
                        </span>
                      </div>
                    ) : product.establecimientoIds && product.establecimientoIds.length > 0 ? (
                      <div className="space-y-1">
                        {/* Lista de establecimientos con stock */}
                        {product.establecimientoIds.slice(0, 3).map(estId => {
                          const est = establishments.find(e => e.id === estId);
                          const stockEnEst = product.stockPorEstablecimiento?.[estId] ?? 0;
                          const tieneDistribucion = product.stockPorEstablecimiento && Object.keys(product.stockPorEstablecimiento).length > 0;
                          
                          return est ? (
                            <div 
                              key={estId}
                              className="flex items-center justify-between gap-2 px-2 py-1 rounded-md bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors group"
                              title={`${est.name} - ${est.address}`}
                            >
                              <span className="text-xs font-medium text-purple-700 truncate">
                                {est.code}
                              </span>
                              {tieneDistribucion && (
                                <span className={`
                                  text-xs font-bold px-1.5 py-0.5 rounded
                                  ${stockEnEst > 0 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-gray-100 text-gray-500'
                                  }
                                `}>
                                  {stockEnEst}
                                </span>
                              )}
                            </div>
                          ) : null;
                        })}
                        
                        {/* Indicador de más establecimientos */}
                        {product.establecimientoIds.length > 3 && (
                          <span 
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer transition-colors"
                            title={`Ver ${product.establecimientoIds.length - 3} más`}
                          >
                            +{product.establecimientoIds.length - 3} más
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Sin asignar</span>
                    )}
                  </td>
                )}

                {visibleColumns.has('alias') && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {product.alias ? (
                      <div className="text-sm text-gray-900">{product.alias}</div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                )}

                {visibleColumns.has('precioCompra') && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {product.precioCompra ? (
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(product.precioCompra)}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                )}

                {visibleColumns.has('porcentajeGanancia') && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {product.porcentajeGanancia !== undefined ? (
                      <div className="text-sm text-gray-900">{product.porcentajeGanancia}%</div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                )}

                {visibleColumns.has('codigoBarras') && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {product.codigoBarras ? (
                      <div className="text-sm font-mono text-gray-900">{product.codigoBarras}</div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                )}

                {visibleColumns.has('codigoFabrica') && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {product.codigoFabrica ? (
                      <div className="text-sm font-mono text-gray-900">{product.codigoFabrica}</div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                )}

                {visibleColumns.has('codigoSunat') && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {product.codigoSunat ? (
                      <div className="text-sm font-mono text-gray-900">{product.codigoSunat}</div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                )}

                {visibleColumns.has('descuentoProducto') && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {product.descuentoProducto !== undefined ? (
                      <div className="text-sm text-gray-900">{product.descuentoProducto}%</div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                )}

                {visibleColumns.has('marca') && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {product.marca ? (
                      <div className="text-sm text-gray-900">{product.marca}</div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                )}

                {visibleColumns.has('modelo') && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {product.modelo ? (
                      <div className="text-sm text-gray-900">{product.modelo}</div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                )}

                {visibleColumns.has('peso') && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {product.peso ? (
                      <div className="text-sm text-gray-900">{product.peso} kg</div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                )}

                {visibleColumns.has('tipoExistencia') && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {product.tipoExistencia ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {product.tipoExistencia}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                )}
                
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onEditProduct(product)}
                      className="text-red-600 hover:text-red-900 transition-colors p-1 rounded-md hover:bg-red-50"
                      title="Editar producto"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={() => {
                        if (window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
                          onDeleteProduct(product.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-900 transition-colors p-1 rounded-md hover:bg-red-50"
                      title="Eliminar producto"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    
                    <div className="relative">
                      <button
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-50"
                        title="Más opciones"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {products.length === 0 && (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay productos</h3>
          <p className="mt-1 text-sm text-gray-500">
            Comienza creando un nuevo producto o ajusta los filtros de búsqueda.
          </p>
        </div>
      )}
    </div>

    {/* ✅ Modal de detalle de stock por establecimiento */}
    <StockDetailModal
      isOpen={stockDetailModal.isOpen}
      onClose={() => setStockDetailModal({ isOpen: false, product: null })}
      product={stockDetailModal.product}
    />
    </>
  );
};

export default ProductTable;