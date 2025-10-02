import React from 'react';
import type { CartItem, DraftAction, TipoComprobante } from '../models/comprobante.types';
import { UNIDADES_MEDIDA } from '../models/constants';
import ProductSelector from '../pages/ProductSelector';

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
}

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
}) => {
  // Función temporal para generar precios múltiples (será reemplazado por módulo de precios)
  const getAvailablePrices = (basePrice: number) => [
    { value: 'base' as const, label: 'Precio Base', price: basePrice },
    { value: 'mayorista' as const, label: 'Precio Mayorista', price: basePrice * 0.85 },
    { value: 'distribuidor' as const, label: 'Precio Distribuidor', price: basePrice * 0.75 },
    { value: 'vip' as const, label: 'Precio VIP', price: basePrice * 0.90 },
    { value: 'campana' as const, label: 'Precio Campaña', price: basePrice * 0.80 }
  ];

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

      {/* Add Product Form - flujo ágil */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
        {/* Buscador y selección de productos */}
        <ProductSelector
          onAddProducts={addProductsFromSelector}
          existingProducts={cartItems.map(item => String(item.id))}
        />

        {/* Campos editables para producto individual */}
      </div>

      {/* Products Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Producto</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Cantidad</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Precio U.</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Impuesto</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Subtotal</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody>
            {cartItems.map(item => (
              <tr key={item.id} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors duration-150">
                <td className="px-4 py-4">
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.code}</div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-center space-x-2">
                    <button 
                      className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 text-lg font-bold"
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
                      className="w-14 h-8 px-2 py-0 border border-gray-400 rounded text-center font-semibold text-sm align-middle focus:border-blue-500 focus:outline-none transition-all"
                      style={{ verticalAlign: 'middle' }}
                      onChange={e => {
                        const newQty = parseFloat(e.target.value) || 0.01;
                        updateCartItem(item.id, { quantity: newQty });
                      }}
                    />
                    <button 
                      className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 text-lg font-bold"
                      onClick={() => updateCartItem(item.id, {
                        quantity: parseFloat((item.quantity + 1).toFixed(2))
                      })}
                    >
                      +
                    </button>
                  </div>
                  <div className="flex justify-center mt-1">
                    <select
                      value={item.unidadMedida || 'UNIDAD'}
                      onChange={(e) => {
                        updateCartItem(item.id, { unidadMedida: e.target.value });
                      }}
                      className="text-center text-xs text-gray-700 border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer hover:bg-gray-50 min-w-[50px]"
                      title="Cambiar unidad de medida"
                    >
                      {UNIDADES_MEDIDA.map(unidad => (
                        <option key={unidad.value} value={unidad.value}>
                          {unidad.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
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
                    {/* Input de precio totalmente flexible */}
                    {(item.priceType || 'base') === 'base' ? (
                      <input
                        key={`price-${item.id}-${item.price}`}
                        type="text"
                        defaultValue={item.price.toFixed(2)}
                        className="w-20 px-2 py-1 border rounded text-right text-xs"
                        placeholder="0.00"
                        onBlur={e => {
                          // Solo validar y formatear al salir del campo
                          const value = e.target.value.trim();
                          if (value === '') {
                            // Si está vacío, usar 0
                            const formatted = parseFloat('0').toFixed(2);
                            updateCartItem(item.id, { 
                              price: 0,
                              basePrice: 0
                            });
                            e.target.value = formatted;
                          } else {
                            // Limpiar caracteres no válidos y convertir
                            const cleanValue = value.replace(/[^0-9.]/g, '');
                            const numValue = parseFloat(cleanValue) || 0;
                            const formatted = parseFloat(numValue.toFixed(2));
                            updateCartItem(item.id, { 
                              price: formatted,
                              basePrice: formatted
                            });
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
                <td className="px-4 py-4 text-center text-sm">
                  <select
                    value={item.igvType || 'igv18'}
                    className="w-32 px-2 py-1 border rounded text-center"
                    onChange={e => {
                      const igvOptions: Record<string, { igv: number; label: string }> = {
                        igv18: { igv: 18, label: 'IGV 18%' },
                        igv10: { igv: 10, label: 'IGV 10%' },
                        exonerado: { igv: 0, label: 'Exonerado 0%' },
                        inafecto: { igv: 0, label: 'Inafecto 0%' },
                        gratuita: { igv: 0, label: 'por premio 0% [Gratuita]' }
                      };
                      const selected = igvOptions[e.target.value];
                      updateCartItem(item.id, { 
                        igv: selected.igv,
                        igvType: e.target.value as any
                      });
                    }}
                  >
                    <option value="igv18">IGV 18%</option>
                    <option value="igv10">IGV 10%</option>
                    <option value="exonerado">Exonerado 0%</option>
                    <option value="inafecto">Inafecto 0%</option>
                    <option value="gratuita">por premio 0% [Gratuita]</option>
                  </select>
                </td>
                <td className="px-4 py-4 text-right text-sm">
                  S/ {((item.price * item.quantity) / (1 + ((item.igv !== undefined ? item.igv : 18) / 100))).toFixed(2)}
                </td>
                <td className="px-4 py-4 text-right font-medium text-sm">
                  S/ {(item.price * item.quantity).toFixed(2)}
                </td>
                <td className="px-4 py-4 text-right">
                  <button
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600"
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals Section - Premium */}
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

              {/* Total destacado */}
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

      {/* Toast de confirmación de borrador guardado */}
      {showDraftToast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-green-600 text-white px-6 py-3 rounded shadow-lg flex items-center space-x-2 animate-fade-in">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle">
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
                    className="mr-2 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2" 
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
                    className="mr-2 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2" 
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
                    className="mr-2 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2" 
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