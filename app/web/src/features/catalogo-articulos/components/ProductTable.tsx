import type { Product, FilterOptions } from '../models/types';
import type { Establishment } from '../../configuracion-sistema/models/Establishment';
// src/features/catalogo-articulos/components/ProductTable.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useConfigurationContext } from '../../configuracion-sistema/context/ConfigurationContext';

// Tenant helpers compartidos (namespacing por empresa)
import { ensureEmpresaId } from '../../../shared/tenant';
const lsKey = (base: string) => `${ensureEmpresaId()}:${base}`;

// One-shot migration de llaves legacy -> namespaced por empresa (para columnas de tabla y otros)
function migrateLegacyToNamespaced() {
  try {
    const empresaId = ensureEmpresaId();
    const markerKey = `${empresaId}:catalog_migrated`;
    const migrated = localStorage.getItem(markerKey);
    if (migrated === 'v1') return;

    const legacyKeys = [
      'catalog_products',
      'catalog_categories',
      'catalog_packages',
      // 'catalog_movimientos' removido: este módulo no gestiona stock
      'productTableColumns',
      'productTableColumnsVersion',
      'productFieldsConfig'
    ];

    for (const key of legacyKeys) {
      const namespaced = `${empresaId}:${key}`;
      const hasNamespaced = localStorage.getItem(namespaced) !== null;
      const legacyValue = localStorage.getItem(key);
      if (!hasNamespaced && legacyValue !== null) {
        localStorage.setItem(namespaced, legacyValue);
        localStorage.removeItem(key);
      }
    }

    localStorage.setItem(markerKey, 'v1');
  } catch (err) {
    console.warn('Migración legacy->namespaced (ProductTable) omitida por empresaId inválido o error:', err);
  }
}

// ✅ Extended Product Row: (Product, Establecimiento) pair
interface ProductEstablishmentRow extends Product {
  _establishmentId: string;
  _establishmentCode: string;
  _establishmentName: string;
}

// Definir las columnas disponibles
type ColumnKey =
  | 'codigo'
  | 'nombre'
  | 'precio'
  | 'establecimiento'
  | 'categoria'
  | 'imagen'
  | 'unidad'
  | 'descripcion'
  | 'alias'
  | 'impuesto'
  | 'precioCompra'
  | 'porcentajeGanancia'
  | 'codigoBarras'
  | 'codigoFabrica'
  | 'codigoSunat'
  | 'descuentoProducto'
  | 'marca'
  | 'modelo'
  | 'peso'
  | 'tipoExistencia'
  | 'disponibleEnTodos'
  | 'fechaCreacion'
  | 'fechaActualizacion';

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  defaultVisible: boolean;
  filterable: boolean;
  group: 'basicas' | 'codigos' | 'financieras' | 'caracteristicas' | 'visuales' | 'sistema';
}

const AVAILABLE_COLUMNS: ColumnConfig[] = [
  // Columnas básicas principales (visibles por defecto pero personalizables)
  { key: 'codigo' as ColumnKey, label: 'Código', defaultVisible: true, filterable: false, group: 'basicas' },
  { key: 'nombre' as ColumnKey, label: 'Nombre', defaultVisible: true, filterable: false, group: 'basicas' },
  { key: 'precio' as ColumnKey, label: 'Precio', defaultVisible: true, filterable: false, group: 'basicas' },
  { key: 'establecimiento' as ColumnKey, label: 'Establecimiento', defaultVisible: true, filterable: false, group: 'basicas' },
  { key: 'categoria', label: 'Categoría', defaultVisible: true, filterable: true, group: 'basicas' },
  { key: 'unidad', label: 'Unidad', defaultVisible: true, filterable: true, group: 'basicas' },

  // Otras columnas básicas
  { key: 'descripcion', label: 'Descripción', defaultVisible: false, filterable: false, group: 'basicas' },
  { key: 'alias', label: 'Alias', defaultVisible: false, filterable: true, group: 'basicas' },
  { key: 'impuesto', label: 'Impuesto', defaultVisible: false, filterable: true, group: 'basicas' },

  // Visuales
  { key: 'imagen', label: 'Imagen', defaultVisible: false, filterable: false, group: 'visuales' },

  // Códigos
  { key: 'codigoBarras', label: 'Código Barras', defaultVisible: false, filterable: true, group: 'codigos' },
  { key: 'codigoFabrica', label: 'Código Fábrica', defaultVisible: false, filterable: true, group: 'codigos' },
  { key: 'codigoSunat', label: 'Código SUNAT', defaultVisible: false, filterable: true, group: 'codigos' },

  // Información financiera
  { key: 'precioCompra', label: 'Precio Compra', defaultVisible: false, filterable: false, group: 'financieras' },
  { key: 'porcentajeGanancia', label: '% Ganancia', defaultVisible: false, filterable: false, group: 'financieras' },
  { key: 'descuentoProducto', label: '% Descuento', defaultVisible: false, filterable: false, group: 'financieras' },

  // Características del producto
  { key: 'marca', label: 'Marca', defaultVisible: false, filterable: true, group: 'caracteristicas' },
  { key: 'modelo', label: 'Modelo', defaultVisible: false, filterable: true, group: 'caracteristicas' },
  { key: 'peso', label: 'Peso (kg)', defaultVisible: false, filterable: false, group: 'caracteristicas' },
  { key: 'tipoExistencia', label: 'Tipo de Existencia', defaultVisible: false, filterable: true, group: 'caracteristicas' },

  // Sistema
  { key: 'disponibleEnTodos', label: 'Disp. en Todos', defaultVisible: false, filterable: false, group: 'sistema' },
  { key: 'fechaCreacion', label: 'Fecha Creación', defaultVisible: false, filterable: false, group: 'sistema' },
  { key: 'fechaActualizacion', label: 'Última Actualización', defaultVisible: false, filterable: false, group: 'sistema' },
];

interface ProductTableProps {
  products: Product[];
  filters: FilterOptions;
  onFiltersChange: (filters: Partial<FilterOptions>) => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  loading?: boolean;
  selectedProducts: Set<string>;
  onSelectedProductsChange: (selected: Set<string>) => void;
  // ✅ Nuevas props para filtro de establecimiento
  establishmentScope?: string;
  establishments?: Establishment[];
}

const ProductTable: React.FC<ProductTableProps> = ({
  products,
  filters,
  onFiltersChange,
  onEditProduct,
  onDeleteProduct,
  loading = false,
  selectedProducts,
  onSelectedProductsChange,
  establishmentScope = 'ALL',
  establishments: establishmentsProp
}) => {
  // Acceder a los establecimientos y unidades desde el contexto de configuración
  const { state: configState } = useConfigurationContext();
  const establishmentsFromContext = configState.establishments;
  const establishments = establishmentsProp || establishmentsFromContext;
  const units = configState.units;

  // ✅ TRANSFORMACIÓN: Expandir productos a filas por establecimiento
  const expandedRows: ProductEstablishmentRow[] = useMemo(() => {
    const rows: ProductEstablishmentRow[] = [];

    products.forEach(product => {
      // Determinar a qué establecimientos pertenece el producto
      let targetEstablishments: Establishment[] = [];

      if (product.disponibleEnTodos) {
        // Disponible en todos: usar todos los establecimientos activos
        targetEstablishments = establishments.filter(e => e.isActive);
      } else if (product.establecimientoIds && product.establecimientoIds.length > 0) {
        // Asignado a establecimientos específicos
        targetEstablishments = establishments.filter(
          e => product.establecimientoIds!.includes(e.id) && e.isActive
        );
      } else {
        // Sin asignación: crear una fila especial "Sin asignar"
        rows.push({
          ...product,
          _establishmentId: 'UNASSIGNED',
          _establishmentCode: '—',
          _establishmentName: 'Sin asignar'
        });
        return;
      }

      // Crear una fila por cada establecimiento
      targetEstablishments.forEach(est => {
        rows.push({
          ...product,
          _establishmentId: est.id,
          _establishmentCode: est.code,
          _establishmentName: est.name
        });
      });
    });

    // Filtrar por establecimiento si no es "ALL"
    if (establishmentScope !== 'ALL') {
      return rows.filter(row => row._establishmentId === establishmentScope);
    }

    return rows;
  }, [products, establishments, establishmentScope]);
  
  // Versión de la configuración de columnas (incrementar cuando cambien los defaults)
  const COLUMN_CONFIG_VERSION = '2.1';

  // Estado para columnas visibles
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(() => {
    // Intentar cargar desde localStorage
    try {
      migrateLegacyToNamespaced();
    } catch (e) {
      console.warn('ProductTable: persist columns failed', e);
    }
    let saved: string | null = null;
    let savedVersion: string | null = null;
    try {
      saved = localStorage.getItem(lsKey('productTableColumns'));
      savedVersion = localStorage.getItem(lsKey('productTableColumnsVersion'));
    } catch {
      // Si falla empresaId inválido, usar defaults
      const defaults = new Set(AVAILABLE_COLUMNS.filter(col => col.defaultVisible).map(col => col.key));
      return defaults;
    }

    // Si la versión no coincide, resetear a defaults
    if (savedVersion !== COLUMN_CONFIG_VERSION) {
      const defaults = new Set(AVAILABLE_COLUMNS.filter(col => col.defaultVisible).map(col => col.key));
      try {
        localStorage.setItem(lsKey('productTableColumnsVersion'), COLUMN_CONFIG_VERSION);
        localStorage.setItem(lsKey('productTableColumns'), JSON.stringify([...defaults]));
      } catch {
        // ignore si empresaId inválido
      }
      return defaults;
    }

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

  // Guardar preferencias en localStorage cuando cambien
  useEffect(() => {
    try {
      localStorage.setItem(lsKey('productTableColumns'), JSON.stringify([...visibleColumns]));
      localStorage.setItem(lsKey('productTableColumnsVersion'), COLUMN_CONFIG_VERSION);
    } catch (e) {
      console.warn('No se pudo persistir preferencias de columnas (empresaId inválido?):', e);
    }
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
    visuales: 'Elementos Visuales',
    basicas: 'Información Básica',
    codigos: 'Códigos',
    financieras: 'Información Financiera',
    caracteristicas: 'Características del Producto',
    sistema: 'Información del Sistema'
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
                        className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1.5 rounded transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={visibleColumns.has(column.key)}
                          onChange={() => toggleColumn(column.key)}
                          className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 dark:border-gray-600 rounded"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{column.label}</span>
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
                    Personaliza las columnas según tus necesidades. Por defecto se muestran: Código, Nombre, Precio, Establecimiento, Categoría y Unidad.
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
                {visibleColumns.size + 1} columnas visibles
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

              {visibleColumns.has('codigo') && (
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
              )}

              {visibleColumns.has('nombre') && (
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
              )}

              {visibleColumns.has('precio') && (
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
              )}

              {visibleColumns.has('establecimiento') && (
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider bg-purple-50 dark:bg-purple-900/20"
                >
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span>Establecimiento</span>
                  </div>
                </th>
              )}

              {visibleColumns.has('imagen') && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Imagen
                </th>
              )}

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
                  Tipo de Existencia
                </th>
              )}

              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
            {expandedRows.map((row, idx) => (
              <tr 
                key={`${row.id}-${row._establishmentId}-${idx}`}
                className={`
                  hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                  ${selectedProducts.has(row.id) ? 'bg-red-50 dark:bg-red-900/20' : ''}
                `}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded"
                    checked={selectedProducts.has(row.id)}
                    onChange={(e) => handleSelectProduct(row.id, e.target.checked)}
                  />
                </td>

                {visibleColumns.has('codigo') && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-mono font-medium text-gray-900 dark:text-white">
                      {row.codigo}
                    </div>
                  </td>
                )}

                {visibleColumns.has('nombre') && (
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white max-w-xs truncate">
                      {row.nombre}
                    </div>
                    {row.descripcion && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                        {row.descripcion}
                      </div>
                    )}
                  </td>
                )}

                {visibleColumns.has('precio') && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(row.precio)}
                    </div>
                    {row.impuesto && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {row.impuesto}
                      </div>
                    )}
                  </td>
                )}

                {visibleColumns.has('establecimiento') && (
                  <td className="px-6 py-4 whitespace-nowrap bg-purple-50/50 dark:bg-purple-900/10">
                    {row._establishmentId === 'UNASSIGNED' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600 italic">
                        Sin asignar
                      </span>
                    ) : (
                      <div>
                        <div className="text-sm font-semibold text-purple-900 dark:text-purple-300">
                          {row._establishmentCode}
                        </div>
                        <div className="text-xs text-purple-600 dark:text-purple-400 truncate max-w-[150px]">
                          {row._establishmentName}
                        </div>
                      </div>
                    )}
                  </td>
                )}

                {/* Columna Imagen */}
                {visibleColumns.has('imagen') && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {row.imagen ? (
                      <img
                        src={row.imagen}
                        alt={row.nombre}
                        className="h-12 w-12 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                        onError={(e) => {
                          // Fallback si la imagen no carga
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"%3E%3Crect width="24" height="24" fill="%23f3f4f6"/%3E%3Cpath stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/%3E%3C/svg%3E';
                        }}
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </td>
                )}

                {visibleColumns.has('unidad') && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      // Buscar la unidad en el catálogo para obtener el nombre completo
                      const unit = units.find(u => u.code === row.unidad);
                      const displayText = unit
                        ? `${unit.code} - ${unit.name}`
                        : row.unidad; // Fallback al código si no se encuentra

                      return (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {displayText}
                        </span>
                      );
                    })()}
                  </td>
                )}
                
                {visibleColumns.has('categoria') && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {row.categoria}
                    </span>
                  </td>
                )}

                {visibleColumns.has('alias') && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {row.alias ? (
                      <div className="text-sm text-gray-900">{row.alias}</div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                )}

                {visibleColumns.has('precioCompra') && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {row.precioCompra ? (
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(row.precioCompra)}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                )}

                {visibleColumns.has('porcentajeGanancia') && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {row.porcentajeGanancia !== undefined ? (
                      <div className="text-sm text-gray-900">{row.porcentajeGanancia}%</div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                )}

                {visibleColumns.has('codigoBarras') && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {row.codigoBarras ? (
                      <div className="text-sm font-mono text-gray-900">{row.codigoBarras}</div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                )}

                {visibleColumns.has('codigoFabrica') && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {row.codigoFabrica ? (
                      <div className="text-sm font-mono text-gray-900">{row.codigoFabrica}</div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                )}

                {visibleColumns.has('codigoSunat') && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {row.codigoSunat ? (
                      <div className="text-sm font-mono text-gray-900">{row.codigoSunat}</div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                )}

                {visibleColumns.has('descuentoProducto') && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {row.descuentoProducto !== undefined ? (
                      <div className="text-sm text-gray-900">{row.descuentoProducto}%</div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                )}

                {visibleColumns.has('marca') && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {row.marca ? (
                      <div className="text-sm text-gray-900">{row.marca}</div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                )}

                {visibleColumns.has('modelo') && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {row.modelo ? (
                      <div className="text-sm text-gray-900">{row.modelo}</div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                )}

                {visibleColumns.has('peso') && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {row.peso ? (
                      <div className="text-sm text-gray-900">{row.peso} kg</div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                )}

                {visibleColumns.has('tipoExistencia') && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {row.tipoExistencia ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {row.tipoExistencia.replace(/_/g, ' ')}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                )}

                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onEditProduct(row)}
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
                          onDeleteProduct(row.id);
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
      
      {expandedRows.length === 0 && (
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
            {establishmentScope !== 'ALL' 
              ? 'No hay productos asignados al establecimiento seleccionado. Intenta cambiar el filtro o crea nuevos productos.'
              : 'Comienza creando un nuevo producto o ajusta los filtros de búsqueda.'
            }
          </p>
        </div>
      )}
    </div>
    </>
  );
};

export default ProductTable;