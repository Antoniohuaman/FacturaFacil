import { useState } from 'react';
import { ArrowLeft, ShoppingCart, Trash2, Minus, Plus, List, Grid3X3, X } from 'lucide-react';

const SalesInvoiceSystem = () => {
  const [viewMode, setViewMode] = useState<'form' | 'pos'>('form');
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDocumentType] = useState('boleta');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [multiSelect, setMultiSelect] = useState(false);
  // POS product list (mock)
  const availableProducts = [
    { id: 1, code: '00156389', name: 'Hojas Bond A4 ATLAS', price: 60.00 },
    { id: 2, code: '00168822', name: 'Sketch ARTESCO', price: 18.00 },
    { id: 3, code: '00170001', name: 'Resma Bond A3', price: 120.00 },
    { id: 4, code: '00180001', name: 'Lapicero BIC', price: 2.50 },
    { id: 5, code: '00190001', name: 'Cuaderno Loro', price: 8.00 }
  ];
  // POS cart logic
  const addToCart = (product: any) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1, subtotal: product.price / 1.18, total: product.price }];
    });
  };
  const removeFromCart = (id: number) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };
  const updateCartQuantity = (id: number, change: number) => {
    setCartItems(prev => prev.map(item => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + change) } : item));
  };
  const handleConfirmSale = () => {
    setShowPaymentModal(true);
  };
  const handleQuickPayment = (amount: number) => {
    setReceivedAmount(amount.toString());
  };
  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.subtotal || item.price * item.quantity / 1.18), 0);
    const igv = cartItems.reduce((sum, item) => sum + ((item.total || item.price * item.quantity) - (item.subtotal || item.price * item.quantity / 1.18)), 0);
    const total = cartItems.reduce((sum, item) => sum + (item.total || item.price * item.quantity), 0);
    return { subtotal, igv, total };
  };
  const totals = calculateTotals();
  const quickPaymentAmounts = [totals.total, 60.00, 70.00, 100.00];
  const calculateChange = () => {
    const received = parseFloat(receivedAmount || customAmount) || 0;
    const change = received - totals.total;
    return change;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Nuevo comprobante</h1>
            {/* View Toggle */}
            <div className="flex items-center space-x-2 ml-8">
              <button
                onClick={() => setViewMode('form')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'form' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('pos')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'pos' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600 ml-2">
                {viewMode === 'pos' ? 'Punto de Venta' : 'Formulario'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {viewMode === 'pos' ? (
          // POS View
          <>
            <div className="flex-1 p-6 space-y-6">
              {/* Products Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {availableProducts.map((product) => (
                  <div 
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer hover:scale-105 relative"
                  >
                    <div className="aspect-square bg-blue-100 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                      <div className="w-12 h-12 bg-blue-300 rounded-full flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-white rounded-full"></div>
                      </div>
                      {/* Notification badge if item is in cart */}
                      {cartItems.find(item => item.id === product.id) && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {cartItems.find(item => item.id === product.id)?.quantity}
                        </div>
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900 text-sm mb-1">{product.name}</h3>
                    <p className="text-lg font-bold text-blue-600">S/ {product.price.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{product.code}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Cart Sidebar */}
            <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
              {/* Cart Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Carrito ({cartItems.reduce((sum, item) => sum + item.quantity, 0)})
                  </h2>
                  {cartItems.length > 0 && (
                    <button 
                      onClick={() => setCartItems([])}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Vaciar
                    </button>
                  )}
                </div>
              </div>

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto">
                {cartItems.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No hay productos en el carrito</p>
                    <p className="text-sm">Haz clic en los productos para agregar</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {cartItems.map((item) => (
                      <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm text-gray-900">{item.name}</h4>
                            <p className="text-xs text-gray-500">{item.code}</p>
                          </div>
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-500 hover:text-red-700 ml-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => updateCartQuantity(item.id, -1)}
                              className="w-7 h-7 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <button 
                              onClick={() => updateCartQuantity(item.id, 1)}
                              className="w-7 h-7 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">S/ {(item.price * item.quantity).toFixed(2)}</p>
                            <p className="text-xs text-gray-500">S/ {item.price.toFixed(2)} c/u</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart Footer */}
              {cartItems.length > 0 && (
                <div className="border-t border-gray-200 p-4 space-y-4">
                  {/* Totals */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="text-gray-900">S/ {totals.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">IGV (18%)</span>
                      <span className="text-gray-900">S/ {totals.igv.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                      <span className="text-gray-900">Total</span>
                      <span className="text-gray-900">S/ {totals.total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <button 
                      onClick={handleConfirmSale}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Confirmar Venta
                    </button>
                    <button 
                      onClick={() => setViewMode('form')}
                      className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      Ver Formulario Completo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          // Formulario tradicional
          <>
            {/* Formulario principal */}
            <div className="flex-1 p-6 space-y-6">
              {/* Document Info */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">N°</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                      <option>B001</option>
                      <option>B002</option>
                      <option>F001</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tienda</label>
                    <input 
                      type="text" 
                      value="Gamarra 2" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Emisión</label>
                    <input 
                      type="date" 
                      value="2025-09-10" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Products Section */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-end mb-4">
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm flex items-center space-x-2"
                  >
                    Más campos
                  </button>
                </div>

                {/* Add Product Form */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <div className="grid grid-cols-6 gap-3 items-end">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Producto / Servicio</label>
                      <input 
                        type="text" 
                        placeholder="BO" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-10"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Cantidad</label>
                      <input 
                        type="number" 
                        placeholder="0" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-10"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Precio</label>
                      <input 
                        type="number" 
                        placeholder="0" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-10"
                      />
                    </div>
                    <div className="col-span-1 flex items-center">
                      <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm h-10 flex items-center justify-center">
                        Agregar
                      </button>
                    </div>
                    <div className="col-span-1 flex items-center">
                      <label htmlFor="multiSelect" className="flex items-center cursor-pointer select-none w-full h-10 justify-center">
                        <div className="relative flex items-center" style={{ minWidth: 44 }}>
                          <input
                            type="checkbox"
                            id="multiSelect"
                            checked={multiSelect}
                            onChange={() => setMultiSelect(v => !v)}
                            className="sr-only"
                          />
                          <div className={`w-9 h-5 rounded-full shadow-inner transition-colors duration-200 ${multiSelect ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                          <div className={`absolute top-1 w-3.5 h-3.5 bg-white rounded-full shadow transition-transform duration-200 ${multiSelect ? 'translate-x-4' : 'left-1'}`}></div>
                        </div>
                        <span className={`text-sm font-medium whitespace-nowrap ml-2 ${multiSelect ? 'text-blue-600' : 'text-gray-700'}`}>Selección múltiple</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Products Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-700 uppercase">Producto</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-gray-700 uppercase">Cantidad</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-700 uppercase">Precio U.</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-gray-700 uppercase">Impuesto</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-700 uppercase">Subtotal</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-700 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div>
                            <div className="font-medium text-gray-900 text-sm">Hojas Bond A4 ATLAS</div>
                            <div className="text-xs text-gray-500">00156389</div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center space-x-2">
                            <button className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 text-lg font-bold">−</button>
                            <span className="w-8 text-center text-sm">1</span>
                            <button className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 text-lg font-bold">+</button>
                          </div>
                          <div className="text-center text-xs text-gray-500 mt-1">NIU</div>
                        </td>
                        <td className="px-4 py-4 text-right text-sm">S/ 60.00 ⌄</td>
                        <td className="px-4 py-4 text-center text-sm">IGV 18%</td>
                        <td className="px-4 py-4 text-right text-sm">S/ 50.85</td>
                        <td className="px-4 py-4 text-right font-medium text-sm">S/ 60.00</td>
                      </tr>
                      <tr className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div>
                            <div className="font-medium text-gray-900 text-sm">Sketch ARTESCO</div>
                            <div className="text-xs text-gray-500">00168822</div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center space-x-2">
                            <button className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 text-lg font-bold">−</button>
                            <span className="w-8 text-center text-sm">1</span>
                            <button className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 text-lg font-bold">+</button>
                          </div>
                          <div className="text-center text-xs text-gray-500 mt-1">NIU</div>
                        </td>
                        <td className="px-4 py-4 text-right text-sm">S/ 18.00 ⌄</td>
                        <td className="px-4 py-4 text-center text-sm">IGV 18%</td>
                        <td className="px-4 py-4 text-right text-sm">S/ 15.25</td>
                        <td className="px-4 py-4 text-right font-medium text-sm">S/ 18.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Totals Section */}
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <div className="flex justify-end">
                    <div className="w-96 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Descuentos</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-900">S/</span>
                          <input type="number" value="0" className="w-16 px-2 py-1 text-right text-sm border border-gray-300 rounded" readOnly />
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="text-gray-900">S/ 66.10</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">I.G.V.</span>
                        <span className="text-gray-900">S/ 11.90</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Redondeo</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-900">S/</span>
                          <input type="number" value="0" className="w-16 px-2 py-1 text-right text-sm border border-gray-300 rounded" readOnly />
                        </div>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-3">
                        <span className="text-gray-900">Total</span>
                        <span className="text-gray-900">S/ 78.00</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-4 mt-6">
                  <button className="flex items-center space-x-2 px-4 py-2 text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors text-sm">
                    Vista previa
                  </button>
                  <div className="flex space-x-3">
                    <button className="px-6 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm">Cancelar</button>
                    <button className="px-6 py-2 text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors text-sm">Guardar borrador</button>
                    <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm">Crear comprobante</button>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones (Visible en la impresión del comprobante)</label>
                    <textarea rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Observaciones (Visible en la impresión del comprobante."></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nota interna (No visible en la impresión del comprobante)</label>
                    <textarea rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Nota interna (No visible en la impresión del comprobante."></textarea>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar derecha */}
            <div className="w-80 border-l border-gray-200 bg-white p-6 space-y-6">
              {/* Document Type */}
              <div>
                <div className="flex space-x-2 mb-4">
                  <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium">Boleta</button>
                  <button className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-md text-sm hover:bg-gray-50">Factura</button>
                </div>
              </div>

              {/* Currency and Payment Method */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Moneda</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                    <option value="PLUMA">PLUMA</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Forma de Pago</label>
                  <input type="text" value="contado" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" readOnly />
                </div>
              </div>

              {/* Quick Payment Buttons */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Efectivo rápido</h3>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button className="px-3 py-2 text-sm border rounded-md transition-colors border-gray-300 hover:bg-gray-50">S/ 78.00</button>
                  <button className="px-3 py-2 text-sm border rounded-md transition-colors border-gray-300 hover:bg-gray-50">S/ 60.00</button>
                  <button className="px-3 py-2 text-sm border rounded-md transition-colors border-gray-300 hover:bg-gray-50">S/ 70.00</button>
                  <button className="px-3 py-2 text-sm border rounded-md transition-colors border-gray-300 hover:bg-gray-50">S/ 100.00</button>
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Monto recibido</label>
                  <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Ingrese monto personalizado" />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ingresa el monto</span>
                    <div className="text-right">
                      <div className="font-medium">S/ 78.00</div>
                      <div className="text-xs text-gray-500">S/ 0.00</div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">S/ 78.00</span>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">S/ 0.00</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">Efectivo</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">S/ 20.00</div>
                      <button className="text-xs text-gray-500 hover:text-gray-700">×</button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="text-sm font-medium">Sí.</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">S/ 36.50</div>
                      <button className="text-xs text-gray-500 hover:text-gray-700">×</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Client Selection */}
              <div>
                <div className="relative mb-4">
                  <input type="text" placeholder="Seleccionar cliente" className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm mb-4">Nuevo cliente</button>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-medium text-gray-700">Nombre</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">FLORES CANALES CARMEN ROSA</p>
                      <div className="flex items-center space-x-2 mt-2 mb-1">
                        <span className="text-xs font-medium text-gray-700">Dni</span>
                      </div>
                      <p className="text-sm text-gray-700">09661829</p>
                      <div className="flex items-center space-x-2 mt-2 mb-1">
                        <span className="text-xs font-medium text-gray-700">Dirección</span>
                      </div>
                      <p className="text-sm text-gray-700">Dirección no definida</p>
                    </div>
                  </div>
                  <button className="text-blue-600 hover:text-blue-700 text-sm">Editar cliente</button>
                </div>
              </div>

              {/* Vendor Info */}
              <div className="border-t border-gray-200 pt-4">
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Vendedor: </span>
                  <span className="text-gray-900">Javier Masías Loza - 001</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Payment Modal (POS) */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Procesar Pago - {selectedDocumentType.toUpperCase()}
                </h2>
                <button 
                  onClick={() => setShowPaymentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex max-h-[calc(90vh-80px)]">
              {/* Left Side - Order Summary */}
              <div className="flex-1 p-6 border-r border-gray-200 overflow-y-auto">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen de la Orden</h3>
                {/* Products List */}
                <div className="space-y-3 mb-6">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-gray-900">{item.name}</h4>
                        <p className="text-xs text-gray-500">{item.code}</p>
                      </div>
                      <div className="text-center mx-4">
                        <span className="text-sm font-medium">{item.quantity}</span>
                        <p className="text-xs text-gray-500">cant.</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">S/ {(item.price * item.quantity).toFixed(2)}</p>
                        <p className="text-xs text-gray-500">S/ {item.price.toFixed(2)} c/u</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Totals */}
                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900">S/ {totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">IGV (18%)</span>
                    <span className="text-gray-900">S/ {totals.igv.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">S/ {totals.total.toFixed(2)}</span>
                  </div>
                </div>
                {/* Client Info */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Cliente</h4>
                  <p className="text-sm text-gray-700">FLORES CANALES CARMEN ROSA</p>
                  <p className="text-xs text-gray-500">DNI: 09661829</p>
                </div>
              </div>

              {/* Right Side - Payment Methods */}
              <div className="w-96 p-6 overflow-y-auto">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Método de Pago</h3>
                {/* Quick Payment Buttons */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Efectivo rápido</h4>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {quickPaymentAmounts.map((amount, index) => (
                      <button 
                        key={index}
                        onClick={() => handleQuickPayment(amount)}
                        className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                          parseFloat(receivedAmount) === amount 
                            ? 'bg-green-100 border-green-500 text-green-700' 
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        S/ {amount.toFixed(2)}
                      </button>
                    ))}
                  </div>
                  {/* Custom amount input */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Monto recibido</label>
                    <input 
                      type="number" 
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Ingrese monto personalizado"
                    />
                  </div>
                  {/* Payment Summary */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Monto a pagar:</span>
                      <span className="font-medium">S/ {totals.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Monto recibido:</span>
                      <span className="font-medium">S/ {(parseFloat(receivedAmount || customAmount) || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold border-t border-gray-300 pt-2">
                      <span className={calculateChange() >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {calculateChange() >= 0 ? 'Vuelto:' : 'Falta:'}
                      </span>
                      <span className={calculateChange() >= 0 ? 'text-green-600' : 'text-red-600'}>
                        S/ {Math.abs(calculateChange()).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Payment Methods */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Métodos de pago activos</h4>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium">Efectivo</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">S/ {(parseFloat(receivedAmount || customAmount) || 0).toFixed(2)}</div>
                          <button className="text-xs text-gray-500 hover:text-gray-700">×</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Action Buttons */}
                <div className="space-y-3">
                  <button 
                    onClick={() => {
                      if (calculateChange() >= 0) {
                        alert(`¡Venta procesada exitosamente!\nTipo: ${selectedDocumentType}\nTotal: S/ ${totals.total.toFixed(2)}\nVuelto: S/ ${calculateChange().toFixed(2)}`);
                        setShowPaymentModal(false);
                        setCartItems([]);
                        setReceivedAmount('');
                        setCustomAmount('');
                      } else {
                        alert('El monto recibido es insuficiente');
                      }
                    }}
                    disabled={calculateChange() < 0}
                    className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                      calculateChange() >= 0
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {calculateChange() >= 0 ? 'Completar Venta' : 'Monto Insuficiente'}
                  </button>
                  <button 
                    onClick={() => setShowPaymentModal(false)}
                    className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      setShowPaymentModal(false);
                      setViewMode('form');
                    }}
                    className="w-full px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                  >
                    Ir a Formulario Completo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesInvoiceSystem;