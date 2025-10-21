import React, { useState, useEffect, useMemo } from 'react';
import type { CartItem, DraftAction, TipoComprobante } from '../../../models/comprobante.types';
import { UNIDADES_MEDIDA } from '../../../models/constants';
import ProductSelector from '../../../lista-comprobantes/pages/ProductSelector';
import { Settings, CheckSquare, Square } from 'lucide-react';

interface ProductsSectionProps {
  cartItems: CartItem[];
  addProductsFromSelector: (products: { product: any; quantity: number }[]) => void;
  updateCartItem: (id: string, updates: Partial<CartItem>) => void;
  removeFromCart: (id: string) => void;
  totals: {
    subtotal: number;
    igv: number;
    total: number;
  };
  showDraftModal: boolean;
  setShowDraftModal: (value: boolean) => void;
  showDraftToast: boolean;
  setShowDraftToast: (value: boolean) => void;
  draftExpiryDate: string;
  setDraftExpiryDate: (value: string) => void;
  draftAction: DraftAction;
  setDraftAction: (value: DraftAction) => void;
  handleDraftModalSave: (params: {
    tipoComprobante: TipoComprobante;
    serieSeleccionada: string;
    cartItems: CartItem[];
    onClearCart?: () => void;
  }) => void;
  tipoComprobante: TipoComprobante;
  serieSeleccionada: string;
  clearCart: () => void;
  refreshKey?: number;
  selectedEstablishmentId?: string;
}

// ===================================================================
// DEFINICIÓN DE COLUMNAS DISPONIBLES
// ===================================================================

export interface ColumnConfig {
  id: string;
  label: string;
  isFixed: boolean; // No se puede ocultar
  isFixedPosition?: 'end'; // Posición fija al final
  isVisible: boolean;
  width?: string;
  minWidth?: string;
  align?: 'left' | 'center' | 'right';
  order: number; // ✅ Orden de las columnas
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  // Columnas fijas del inicio
  { id: 'producto', label: 'Producto', isFixed: true, isVisible: true, align: 'left', minWidth: '200px', order: 1 },
  { id: 'codigo', label: 'Código', isFixed: true, isVisible: true, align: 'left', width: '120px', order: 2 },
  { id: 'cantidad', label: 'Cantidad', isFixed: true, isVisible: true, align: 'center', width: '140px', order: 3 },
  { id: 'unidad', label: 'Unidad', isFixed: true, isVisible: true, align: 'center', minWidth: '140px', order: 4 },

  // Columnas opcionales (configurables)
  { id: 'imagen', label: 'Imagen', isFixed: false, isVisible: false, align: 'center', width: '80px', order: 10 },
  { id: 'alias', label: 'Alias', isFixed: false, isVisible: false, align: 'left', minWidth: '140px', order: 11 },
  { id: 'descripcion', label: 'Descripción', isFixed: false, isVisible: false, align: 'left', minWidth: '200px', order: 12 },
  { id: 'categoria', label: 'Categoría', isFixed: false, isVisible: false, align: 'left', width: '130px', order: 13 },
  { id: 'marca', label: 'Marca', isFixed: false, isVisible: false, align: 'left', width: '120px', order: 14 },
  { id: 'modelo', label: 'Modelo', isFixed: false, isVisible: false, align: 'left', width: '120px', order: 15 },
  { id: 'tipoProducto', label: 'Tipo', isFixed: false, isVisible: false, align: 'center', width: '100px', order: 16 },
  { id: 'tipoExistencia', label: 'Tipo Existencia', isFixed: false, isVisible: false, align: 'left', minWidth: '140px', order: 17 },
  { id: 'codigoBarras', label: 'Cód. Barras', isFixed: false, isVisible: false, align: 'left', width: '130px', order: 18 },
  { id: 'codigoFabrica', label: 'Cód. Fábrica', isFixed: false, isVisible: false, align: 'left', width: '130px', order: 19 },
  { id: 'codigoSunat', label: 'Cód. SUNAT', isFixed: false, isVisible: false, align: 'left', width: '130px', order: 20 },
  { id: 'stock', label: 'Stock', isFixed: false, isVisible: false, align: 'center', width: '90px', order: 21 },
  { id: 'precioCompra', label: 'P. Compra', isFixed: false, isVisible: false, align: 'right', width: '110px', order: 22 },
  { id: 'descuento', label: 'Descuento %', isFixed: false, isVisible: false, align: 'right', width: '120px', order: 23 },
  { id: 'peso', label: 'Peso (kg)', isFixed: false, isVisible: false, align: 'right', width: '100px', order: 24 },
  { id: 'impuesto', label: 'Impuesto', isFixed: false, isVisible: false, align: 'center', minWidth: '140px', order: 25 },

  // ✅ Columnas fijas SIEMPRE al final (orden 900+)
  { id: 'precio', label: 'Precio U.', isFixed: true, isFixedPosition: 'end', isVisible: true, align: 'right', minWidth: '180px', order: 996 },
  { id: 'subtotal', label: 'Subtotal', isFixed: true, isFixedPosition: 'end', isVisible: true, align: 'right', width: '110px', order: 997 },
  { id: 'total', label: 'Total', isFixed: true, isFixedPosition: 'end', isVisible: true, align: 'right', width: '110px', order: 998 },
  { id: 'accion', label: 'Acción', isFixed: true, isFixedPosition: 'end', isVisible: true, align: 'center', width: '70px', order: 999 },
];

const STORAGE_KEY = 'comprobantes_table_columns_config';

// ===================================================================
// COMPONENTE PRINCIPAL
// ===================================================================

const ProductsSection: React.FC<ProductsSectionProps> = ({
  cartItems,
  addProductsFromSelector,
  updateCartItem,
  removeFromCart,
  totals,
  showDraftModal,
  setShowDraftModal,
  showDraftToast,
  setShowDraftToast,
  draftExpiryDate,
  setDraftExpiryDate,
  draftAction,
  setDraftAction,
  handleDraftModalSave,
  tipoComprobante,
  serieSeleccionada,
  clearCart,
  refreshKey = 0,
  // selectedEstablishmentId, // TODO: Usar para filtrar stock por establecimiento
}) => {
  // ===================================================================
  // ESTADO DE CONFIGURACIÓN DE COLUMNAS
  // ===================================================================

  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const savedConfig = JSON.parse(saved) as ColumnConfig[];
        // Merge with defaults to handle new columns
        return DEFAULT_COLUMNS.map(defaultCol => {
          const savedCol = savedConfig.find(sc => sc.id === defaultCol.id);
          return savedCol ? { ...defaultCol, isVisible: savedCol.isVisible } : defaultCol;
        });
      }
    } catch (e) {
      console.error('Error loading column configuration:', e);
    }
    return DEFAULT_COLUMNS;
  });

  const [showColumnConfig, setShowColumnConfig] = useState(false);

  // Guardar configuración en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(columnConfig));
    } catch (e) {
      console.error('Error saving column configuration:', e);
    }
  }, [columnConfig]);

  // ✅ Columnas visibles ordenadas correctamente
  const visibleColumns = useMemo(() =>
    columnConfig
      .filter(col => col.isVisible)
      .sort((a, b) => a.order - b.order),
    [columnConfig]
  );

  // ✅ Ancho dinámico de columnas según cantidad visible
  const dynamicColumnWidths = useMemo(() => {
    const optionalCount = visibleColumns.filter(c => !c.isFixed).length;
    // Reducir ancho si hay muchas columnas opcionales
    const scaleFactor = optionalCount > 8 ? 0.85 : optionalCount > 5 ? 0.9 : 1;
    return scaleFactor;
  }, [visibleColumns]);

  // ✅ Toggle columna
  const toggleColumn = (columnId: string) => {
    setColumnConfig(prev => prev.map(col =>
      col.id === columnId ? { ...col, isVisible: !col.isVisible } : col
    ));
  };

  // ✅ Seleccionar todas las columnas opcionales
  const selectAllOptional = () => {
    setColumnConfig(prev => prev.map(col =>
      col.isFixed ? col : { ...col, isVisible: true }
    ));
  };

  // ✅ Limpiar selección (solo opcionales)
  const clearAllOptional = () => {
    setColumnConfig(prev => prev.map(col =>
      col.isFixed ? col : { ...col, isVisible: false }
    ));
  };

  // Función para generar precios múltiples
  const getAvailablePrices = (basePrice: number) => [
    { value: 'base' as const, label: 'Precio Base', price: basePrice },
    { value: 'mayorista' as const, label: 'Precio Mayorista', price: basePrice * 0.85 },
    { value: 'distribuidor' as const, label: 'Precio Distribuidor', price: basePrice * 0.75 },
    { value: 'vip' as const, label: 'Precio VIP', price: basePrice * 0.90 },
    { value: 'campana' as const, label: 'Precio Campaña', price: basePrice * 0.80 }
  ];

  // ===================================================================
  // RENDERIZADO DE CELDAS
  // ===================================================================

  const renderCell = (columnId: string, item: CartItem) => {
    switch (columnId) {
      case 'producto':
        return (
          <td className="px-4 py-4 sticky left-0 bg-white">
            <div>
              <div className="font-medium text-gray-900 text-sm">{item.name}</div>
            </div>
          </td>
        );

      case 'codigo':
        return (
          <td className="px-4 py-4">
            <div className="text-xs text-gray-600 font-mono">{item.code}</div>
          </td>
        );

      case 'imagen':
        return (
          <td className="px-3 py-4 text-center">
            {item.imagen ? (
              <img src={item.imagen} alt={item.name} className="w-12 h-12 object-cover rounded border border-gray-200 mx-auto" />
            ) : (
              <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center mx-auto">
                <span className="text-gray-400 text-xs">Sin img</span>
              </div>
            )}
          </td>
        );

      case 'alias':
        return (
          <td className="px-3 py-4 text-sm text-gray-700">
            <span className="italic text-gray-500">{item.alias || '-'}</span>
          </td>
        );

      case 'descripcion':
        return (
          <td className="px-3 py-4">
            <textarea
              value={item.descripcion || ''}
              onChange={(e) => updateCartItem(item.id, { descripcion: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
              placeholder="Descripción del producto..."
            />
          </td>
        );

      case 'categoria':
        return (
          <td className="px-3 py-4 text-sm text-gray-700">
            {item.category || '-'}
          </td>
        );

      case 'marca':
        return (
          <td className="px-3 py-4 text-sm text-gray-700">
            {item.marca || '-'}
          </td>
        );

      case 'modelo':
        return (
          <td className="px-3 py-4 text-sm text-gray-700">
            {item.modelo || '-'}
          </td>
        );

      case 'tipoProducto':
        return (
          <td className="px-3 py-4 text-center">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              item.tipoProducto === 'SERVICIO'
                ? 'bg-purple-100 text-purple-800'
                : 'bg-blue-100 text-blue-800'
            }`}>
              {item.tipoProducto || 'BIEN'}
            </span>
          </td>
        );

      case 'tipoExistencia':
        return (
          <td className="px-3 py-4 text-sm text-gray-700">
            {item.tipoExistencia || '-'}
          </td>
        );

      case 'codigoBarras':
        return (
          <td className="px-3 py-4 text-xs text-gray-600 font-mono">
            {item.codigoBarras || '-'}
          </td>
        );

      case 'codigoFabrica':
        return (
          <td className="px-3 py-4 text-xs text-gray-600 font-mono">
            {item.codigoFabrica || '-'}
          </td>
        );

      case 'codigoSunat':
        return (
          <td className="px-3 py-4 text-xs text-gray-600 font-mono">
            {item.codigoSunat || '-'}
          </td>
        );

      case 'stock':
        return (
          <td className="px-3 py-4 text-center">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              item.stock > 20 ? 'bg-green-100 text-green-800' :
              item.stock > 5 ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {item.stock}
            </span>
          </td>
        );

      case 'precioCompra':
        return (
          <td className="px-3 py-4 text-right text-sm text-gray-700">
            {item.precioCompra ? `S/ ${item.precioCompra.toFixed(2)}` : '-'}
          </td>
        );

      case 'descuento':
        return (
          <td className="px-3 py-4">
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={item.descuentoProducto || 0}
              onChange={(e) => updateCartItem(item.id, { descuentoProducto: parseFloat(e.target.value) || 0 })}
              className="w-full px-2 py-1 text-right text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </td>
        );

      case 'peso':
        return (
          <td className="px-3 py-4 text-right text-sm text-gray-700">
            {item.peso ? `${item.peso} kg` : '-'}
          </td>
        );

      case 'impuesto':
        return (
          <td className="px-4 py-4 text-center text-sm">
            <div className="inline-flex px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
              {item.impuesto || 'IGV 18%'}
            </div>
          </td>
        );

      case 'cantidad':
        return (
          <td className="px-4 py-4">
            <div className="flex items-center justify-center space-x-2">
              <button
                className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 text-lg font-bold rounded hover:bg-gray-100"
                onClick={() => updateCartItem(item.id, {
                  quantity: Math.max(0.01, parseFloat((item.quantity - 1).toFixed(2)))
                })}
                disabled={item.quantity <= 0.01}
              >
                −
              </button>
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={item.quantity}
                className="w-14 h-8 px-2 py-0 border border-gray-400 rounded text-center font-semibold text-sm focus:border-blue-500 focus:outline-none"
                onChange={e => {
                  const newQty = parseFloat(e.target.value) || 0.01;
                  updateCartItem(item.id, { quantity: newQty });
                }}
              />
              <button
                className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 text-lg font-bold rounded hover:bg-gray-100"
                onClick={() => updateCartItem(item.id, {
                  quantity: parseFloat((item.quantity + 1).toFixed(2))
                })}
              >
                +
              </button>
            </div>
          </td>
        );

      case 'unidad':
        return (
          <td className="px-4 py-4">
            <div className="flex flex-col gap-1">
              {/* ✅ Nombre de la unidad del producto */}
              <div className="text-xs text-center text-gray-500 font-medium">
                {item.unidad || 'UNIDAD'}
              </div>
              {/* ✅ Selector para cambiar unidad */}
              <select
                value={item.unidadMedida || item.unidad || 'UNIDAD'}
                onChange={(e) => updateCartItem(item.id, { unidadMedida: e.target.value })}
                className="w-full text-center text-xs text-gray-700 border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-50"
              >
                {UNIDADES_MEDIDA.map(unidad => (
                  <option key={unidad.value} value={unidad.value}>
                    {unidad.label}
                  </option>
                ))}
              </select>
            </div>
          </td>
        );

      case 'precio':
        return (
          <td className="px-4 py-4 text-right text-sm">
            <div className="flex items-center space-x-1">
              <select
                value={item.priceType || 'base'}
                className="w-32 px-2 py-1 border rounded text-center text-xs"
                onChange={e => {
                  const basePrice = item.basePrice || item.price;
                  const availablePrices = getAvailablePrices(basePrice);
                  const selectedPrice = availablePrices.find(p => p.value === e.target.value);
                  if (selectedPrice) {
                    updateCartItem(item.id, {
                      priceType: e.target.value as any,
                      price: selectedPrice.price
                    });
                  }
                }}
              >
                {getAvailablePrices(item.basePrice || item.price).map(priceOption => (
                  <option key={priceOption.value} value={priceOption.value}>
                    {priceOption.label}
                  </option>
                ))}
              </select>
              {(item.priceType || 'base') === 'base' ? (
                <input
                  key={`price-${item.id}-${item.price}`}
                  type="text"
                  defaultValue={item.price.toFixed(2)}
                  className="w-20 px-2 py-1 border rounded text-right text-xs"
                  placeholder="0.00"
                  onBlur={e => {
                    const value = e.target.value.trim();
                    if (value === '') {
                      const formatted = parseFloat('0').toFixed(2);
                      updateCartItem(item.id, { price: 0, basePrice: 0 });
                      e.target.value = formatted;
                    } else {
                      const cleanValue = value.replace(/[^0-9.]/g, '');
                      const numValue = parseFloat(cleanValue) || 0;
                      const formatted = parseFloat(numValue.toFixed(2));
                      updateCartItem(item.id, { price: formatted, basePrice: formatted });
                      e.target.value = formatted.toFixed(2);
                    }
                  }}
                />
              ) : (
                <div className="w-20 text-right font-medium text-xs">
                  {item.price.toFixed(2)}
                </div>
              )}
            </div>
          </td>
        );

      case 'subtotal':
        return (
          <td className="px-4 py-4 text-right text-sm text-gray-700">
            S/ {((item.price * item.quantity) / (1 + ((item.igv !== undefined ? item.igv : 18) / 100))).toFixed(2)}
          </td>
        );

      case 'total':
        return (
          <td className="px-4 py-4 text-right font-semibold text-sm text-gray-900">
            S/ {(item.price * item.quantity).toFixed(2)}
          </td>
        );

      case 'accion':
        return (
          <td className="px-4 py-4 text-center">
            <button
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Eliminar producto"
              onClick={() => removeFromCart(item.id)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"/>
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            </button>
          </td>
        );

      default:
        return <td className="px-3 py-4 text-sm text-gray-700">-</td>;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      {/* Header */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Productos del Comprobante</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Agregue productos, configure precios e impuestos
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Botón de configuración de columnas */}
            <button
              onClick={() => setShowColumnConfig(!showColumnConfig)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              title="Configurar columnas visibles"
            >
              <Settings className="w-4 h-4" />
              <span>Configurar columnas</span>
            </button>
            {cartItems.length > 0 && (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-blue-700">
                  {cartItems.length} {cartItems.length === 1 ? 'producto' : 'productos'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ✅ Panel de configuración de columnas MEJORADO */}
      {showColumnConfig && (
        <div className="mb-4 p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Personalizar columnas de la tabla</h4>
              <p className="text-xs text-gray-600 mt-1">
                Selecciona las columnas que deseas ver. Tu configuración se guarda automáticamente.
              </p>
            </div>
            <button
              onClick={() => setShowColumnConfig(false)}
              className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ✅ Botones de acción */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={selectAllOptional}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <CheckSquare className="w-4 h-4" />
              Seleccionar todo
            </button>
            <button
              onClick={clearAllOptional}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Square className="w-4 h-4" />
              Limpiar selección
            </button>
            <div className="ml-auto text-xs text-gray-500">
              {columnConfig.filter(c => !c.isFixed && c.isVisible).length} de {columnConfig.filter(c => !c.isFixed).length} opcionales activas
            </div>
          </div>

          {/* Grid de columnas */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {columnConfig.map(col => (
              <label
                key={col.id}
                className={`flex items-center gap-2 px-3 py-2 rounded border transition-all ${
                  col.isFixed
                    ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-70'
                    : col.isVisible
                    ? 'bg-blue-50 border-blue-300 cursor-pointer hover:bg-blue-100'
                    : 'bg-white border-gray-200 cursor-pointer hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={col.isVisible}
                  disabled={col.isFixed}
                  onChange={() => !col.isFixed && toggleColumn(col.id)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
                />
                <span className={`text-sm ${col.isFixed ? 'text-gray-500 font-medium' : col.isVisible ? 'text-blue-900 font-medium' : 'text-gray-700'}`}>
                  {col.label}
                  {col.isFixed && <span className="ml-1 text-xs text-gray-400">(fija)</span>}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Add Product Form */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
        <ProductSelector
          key={`selector-${refreshKey}`}
          onAddProducts={addProductsFromSelector}
          existingProducts={cartItems.map(item => String(item.id))}
        />
      </div>

      {/* ✅ Products Table con anchos dinámicos */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full" style={{ fontSize: `${dynamicColumnWidths * 100}%` }}>
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
            <tr>
              {visibleColumns.map(col => (
                <th
                  key={col.id}
                  className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap ${
                    col.align === 'center' ? 'text-center' :
                    col.align === 'right' ? 'text-right' :
                    'text-left'
                  }`}
                  style={{
                    width: col.width,
                    minWidth: col.minWidth
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cartItems.map(item => (
              <tr key={item.id} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors duration-150">
                {visibleColumns.map(col => (
                  <React.Fragment key={`${item.id}-${col.id}`}>
                    {renderCell(col.id, item)}
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div className="mt-6 border-t-2 border-gray-200 pt-6">
        <div className="flex justify-end">
          <div className="w-96 bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-gray-200 p-5 shadow-sm">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 font-medium">Descuentos</span>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-700">S/</span>
                  <input type="number" value="0.00" className="w-20 px-2 py-1 text-right text-sm border-2 border-gray-200 rounded-lg bg-gray-50" readOnly />
                </div>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600 font-medium">Subtotal</span>
                <span className="text-gray-900 font-semibold">S/ {totals.subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600 font-medium">I.G.V. (18%)</span>
                <span className="text-gray-900 font-semibold">S/ {totals.igv.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600 font-medium">Redondeo</span>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-700">S/</span>
                  <input type="number" value="0.00" className="w-20 px-2 py-1 text-right text-sm border-2 border-gray-200 rounded-lg bg-gray-50" readOnly />
                </div>
              </div>

              <div className="pt-3 mt-3 border-t-2 border-dashed border-gray-300">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-4 shadow-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-100 font-semibold text-base">TOTAL</span>
                    <span className="text-white font-bold text-2xl">S/ {totals.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast de confirmación */}
      {showDraftToast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-green-600 text-white px-6 py-3 rounded shadow-lg flex items-center space-x-2 animate-fade-in">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
            <span>Borrador guardado exitosamente</span>
            <button className="ml-4 text-white/80 hover:text-white" onClick={() => setShowDraftToast(false)}>&times;</button>
          </div>
        </div>
      )}

      {/* Modal para guardar borrador */}
      {showDraftModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Guardar borrador</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de vencimiento (opcional)</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={draftExpiryDate}
                onChange={e => setDraftExpiryDate(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">¿Qué deseas hacer después de guardar?</label>
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="draftAction"
                    value="borradores"
                    checked={draftAction === 'borradores'}
                    onChange={() => setDraftAction('borradores')}
                    className="mr-2 w-4 h-4 text-blue-600"
                  />
                  Ir a lista de borradores
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="draftAction"
                    value="continuar"
                    checked={draftAction === 'continuar'}
                    onChange={() => setDraftAction('continuar')}
                    className="mr-2 w-4 h-4 text-blue-600"
                  />
                  Continuar editando
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="draftAction"
                    value="terminar"
                    checked={draftAction === 'terminar'}
                    onChange={() => setDraftAction('terminar')}
                    className="mr-2 w-4 h-4 text-blue-600"
                  />
                  Terminar y salir
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                onClick={() => setShowDraftModal(false)}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={() => {
                  handleDraftModalSave({
                    tipoComprobante,
                    serieSeleccionada,
                    cartItems,
                    onClearCart: clearCart
                  });
                }}
              >
                Guardar borrador
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsSection;
