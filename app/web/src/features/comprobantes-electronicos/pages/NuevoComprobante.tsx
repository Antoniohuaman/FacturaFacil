import { useState, useEffect } from 'react';
import { useCaja } from '../../control-caja/store/CajaContext';
import { useNavigate, useLocation } from 'react-router-dom';
import ProductSelector from './ProductSelector';
import { ArrowLeft, ShoppingCart, Trash2, Minus, Plus, List, Grid3X3, X } from 'lucide-react';

const SalesInvoiceSystem = () => {
  // Estado para mostrar toast de confirmación
  const [showDraftToast, setShowDraftToast] = useState(false);
  // Estado para opción de navegación tras guardar borrador
  const [draftAction, setDraftAction] = useState<'borradores' | 'continuar' | 'terminar'>('terminar');
  // Simulación de guardado de borrador
  const handleSaveDraft = () => {
  setShowDraftToast(true);
    // Recopilar datos relevantes del formulario
    const draftData = {
      tipo: tipoComprobante,
      serie: serieSeleccionada,
      productos: cartItems,
      fechaEmision: new Date().toISOString().slice(0, 10),
      fechaVencimiento: draftExpiryDate,
      // Aquí se pueden agregar más campos según necesidad
    };
    // Simular guardado en localStorage (o API)
    const drafts = JSON.parse(localStorage.getItem('borradores') || '[]');
    drafts.push({ ...draftData, id: `DRAFT-${serieSeleccionada}-${Math.floor(Math.random()*100000).toString().padStart(8, '0')}` });
    localStorage.setItem('borradores', JSON.stringify(drafts));
    // No navegar aquí, la navegación se controla en el modal según la opción elegida
  };
  const [cashBills, setCashBills] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'form' | 'pos'>('form');
  const navigate = useNavigate();
  const location = useLocation();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  // Estado para modal de guardar borrador
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftExpiryDate, setDraftExpiryDate] = useState<string>('');
  // Series disponibles
  const series = ["B001", "B002", "F001"];
  const [tipoComprobante, setTipoComprobante] = useState<'boleta' | 'factura'>(() => {
    // Detectar tipo desde la URL
    const params = new URLSearchParams(window.location.search);
    const tipo = params.get('tipo');
    if (tipo === 'factura') return 'factura';
    if (tipo === 'boleta') return 'boleta';
    return 'boleta';
  });
  const [serieSeleccionada, setSerieSeleccionada] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tipo = params.get('tipo');
    if (tipo === 'factura') return series.find(s => s.startsWith('F')) || series[0];
    if (tipo === 'boleta') return series.find(s => s.startsWith('B')) || series[0];
    return series[0];
  });

  // Si el usuario navega manualmente y cambia el tipo en la URL, actualiza el estado
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tipo = params.get('tipo');
    if (tipo === 'factura' && tipoComprobante !== 'factura') {
      setTipoComprobante('factura');
      setSerieSeleccionada(series.find(s => s.startsWith('F')) || series[0]);
    }
    if (tipo === 'boleta' && tipoComprobante !== 'boleta') {
      setTipoComprobante('boleta');
      setSerieSeleccionada(series.find(s => s.startsWith('B')) || series[0]);
    }
  }, [location.search]);

  // Filtrar series según tipo
  const seriesFiltradas = tipoComprobante === 'boleta'
    ? series.filter(s => s.startsWith('B'))
    : series.filter(s => s.startsWith('F'));

  // POS product list (mock)
  const availableProducts = [
  { id: '1', code: '00156389', name: 'Hojas Bond A4 ATLAS', price: 60.00, category: 'Útiles' },
  { id: '2', code: '00168822', name: 'Sketch ARTESCO', price: 18.00, category: 'Útiles' },
  { id: '3', code: '00170001', name: 'Resma Bond A3', price: 120.00, category: 'Útiles' },
  { id: '4', code: '00180001', name: 'Lapicero BIC', price: 2.50, category: 'Útiles' },
  { id: '5', code: '00190001', name: 'Cuaderno Loro', price: 8.00, category: 'Útiles' },
  { id: '6', code: '00145678', name: 'Martillo de acero', price: 45.50, category: 'Herramientas' },
  { id: '7', code: '00187654', name: 'Destornillador Phillips', price: 12.00, category: 'Herramientas' },
  { id: '8', code: '00198765', name: 'Taladro eléctrico', price: 250.00, category: 'Herramientas' }
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
  const { status: cajaStatus } = useCaja();
  const handleConfirmSale = () => {
    if (cajaStatus === 'cerrada') {
      alert('No se puede vender: la caja está cerrada.');
      return;
    }
    setShowPaymentModal(true);
  };
  const calculateTotals = () => {
    // Calcula usando el IGV actual de cada producto
    const subtotal = cartItems.reduce((sum, item) => {
      const igvPercent = item.igv !== undefined ? item.igv : 18;
      return sum + (item.price * item.quantity) / (1 + igvPercent / 100);
    }, 0);
    const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const igv = total - subtotal;
    return { subtotal, igv, total };
  };
  const totals = calculateTotals();
  const quickPaymentAmounts = [totals.total, 20.00, 50.00, 100.00, 200.00];
  const calculateChange = () => {
    const received =
      cashBills.reduce((sum, bill) => sum + bill, 0) ||
      parseFloat(receivedAmount || customAmount) || 0;
    const change = received - totals.total;
    return change;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center space-x-4">
          <button className="text-gray-500 hover:text-gray-700" onClick={() => navigate('/comprobantes')}>
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
                      className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${cajaStatus === 'cerrada' ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                      disabled={cajaStatus === 'cerrada'}
                    >
                      {cajaStatus === 'cerrada' ? 'Caja cerrada' : 'Confirmar Venta'}
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
              {/* Document Info principal + campos opcionales */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">N°</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      value={serieSeleccionada}
                      onChange={e => setSerieSeleccionada(e.target.value)}
                    >
                      {seriesFiltradas.map(serie => (
                        <option key={serie} value={serie}>{serie}</option>
                      ))}
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
                {/* Botón para mostrar/ocultar campos opcionales */}
                <div className="mt-4">
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                    onClick={() => setShowOptionalFields(v => !v)}
                  >
                    {showOptionalFields ? 'Ocultar campos' : 'Más campos'}
                  </button>
                </div>
                {/* Campos opcionales */}
                {showOptionalFields && (
                  <div className="mt-6 bg-blue-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Dirección</label>
                        <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Ingrese dirección" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de vencimiento</label>
                        <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value="2025-10-09" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Dirección de envío</label>
                        <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Ingrese centro de costo" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Orden de compra</label>
                        <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Ejem OC01-0000236" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">N° de guía</label>
                        <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Ingresa Serie y  N°. Ejem T001-00000256" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Correo</label>
                        <input type="email" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Ingresa correo electrónico" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Centro de costo</label>
                        <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Ingrese centro de costos" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Products Section */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">

                {/* Add Product Form - flujo ágil */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">

                  {/* Buscador y selección de productos */}
                  <ProductSelector
                    onAddProducts={(products: { product: any; quantity: number }[]) => {
                      if (products.length > 0) {
                        setCartItems(prev => {
                          let updated = [...prev];
                          products.forEach(({ product, quantity }) => {
                            const idx = updated.findIndex(item => item.id === product.id);
                            if (idx !== -1) {
                              // Si ya existe, incrementar cantidad
                              updated[idx] = {
                                ...updated[idx],
                                quantity: updated[idx].quantity + quantity
                              };
                            } else {
                              // Si no existe, agregar nuevo
                              updated.push({
                                ...product,
                                quantity,
                                subtotal: product.price / 1.18,
                                total: product.price
                              });
                            }
                          });
                          return updated;
                        });
                      }
                    }}
                    existingProducts={cartItems.map(item => String(item.id))}
                  />

                  {/* Campos editables para producto individual */}
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
                      {cartItems.map(item => (
                        <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <div>
                              <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                              <div className="text-xs text-gray-500">{item.code}</div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center space-x-2">
                              <button className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 text-lg font-bold"
                                onClick={() => setCartItems(prev => prev.map(ci => ci.id === item.id ? {
                                  ...ci,
                                  quantity: Math.max(0.01, parseFloat((ci.quantity - 1).toFixed(2)))
                                } : ci))}
                                disabled={item.quantity <= 0.01}
                              >−</button>
                              <input
                                type="number"
                                min={0.01}
                                step={0.01}
                                value={item.quantity}
                                className="w-14 h-8 px-2 py-0 border border-gray-400 rounded text-center font-semibold text-sm align-middle focus:border-blue-500 focus:outline-none transition-all"
                                style={{ verticalAlign: 'middle' }}
                                onChange={e => {
                                  const newQty = parseFloat(e.target.value) || 0.01;
                                  setCartItems(prev => prev.map(ci => ci.id === item.id ? {
                                    ...ci,
                                    quantity: newQty
                                  } : ci));
                                }}
                              />
                              <button className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 text-lg font-bold"
                                onClick={() => setCartItems(prev => prev.map(ci => ci.id === item.id ? {
                                  ...ci,
                                  quantity: parseFloat((ci.quantity + 1).toFixed(2))
                                } : ci))}
                              >+</button>
                            </div>
                            <div className="text-center text-xs text-gray-500 mt-1">NIU</div>
                          </td>
                          <td className="px-4 py-4 text-right text-sm">
                            <input
                              type="number"
                              value={item.price}
                              min={0}
                              step={0.01}
                              className="w-24 px-2 py-1 border rounded text-right"
                              onChange={e => {
                                const newPrice = parseFloat(e.target.value) || 0;
                                setCartItems(prev => prev.map(ci => ci.id === item.id ? {
                                  ...ci,
                                  price: newPrice
                                } : ci));
                              }}
                            />
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
                                setCartItems(prev => prev.map(ci => ci.id === item.id ? {
                                  ...ci,
                                  igv: selected.igv,
                                  igvType: e.target.value
                                } : ci));
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
                              onClick={() => setCartItems(prev => prev.filter(ci => ci.id !== item.id))}
                            >
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
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
                        <span className="text-gray-900">S/ {totals.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">I.G.V.</span>
                        <span className="text-gray-900">S/ {totals.igv.toFixed(2)}</span>
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
                        <span className="text-gray-900">S/ {totals.total.toFixed(2)}</span>
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
                    <button className="px-6 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm" onClick={() => navigate('/comprobantes')}>Cancelar</button>
                    <button className="px-6 py-2 text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors text-sm" onClick={() => setShowDraftModal(true)}>Guardar borrador</button>
                    <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm">Crear comprobante</button>
      {/* Modal para guardar borrador */}
      {/* Toast de confirmación de borrador guardado */}
      {showDraftToast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-green-600 text-white px-6 py-3 rounded shadow-lg flex items-center space-x-2 animate-fade-in">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
            <span>Borrador guardado exitosamente</span>
            <button className="ml-4 text-white/80 hover:text-white" onClick={() => setShowDraftToast(false)}>&times;</button>
          </div>
        </div>
      )}
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
                <label className="flex items-center">
                  <input type="radio" name="draftAction" value="borradores" checked={draftAction === 'borradores'} onChange={() => setDraftAction('borradores')} className="mr-2" />
                  Ir a lista de borradores
                </label>
                <label className="flex items-center">
                  <input type="radio" name="draftAction" value="continuar" checked={draftAction === 'continuar'} onChange={() => setDraftAction('continuar')} className="mr-2" />
                  Continuar emitiendo (formulario vacío)
                </label>
                <label className="flex items-center">
                  <input type="radio" name="draftAction" value="terminar" checked={draftAction === 'terminar'} onChange={() => setDraftAction('terminar')} className="mr-2" />
                  Terminar (ir a lista de comprobantes)
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
                onClick={() => setShowDraftModal(false)}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                onClick={() => {
                  setShowDraftModal(false);
                  handleSaveDraft();
                  setTimeout(() => setShowDraftToast(false), 2500);
                  if (draftAction === 'continuar') {
                    setCartItems([]);
                  } else if (draftAction === 'borradores') {
                    navigate('/comprobantes');
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('showBorradoresTab'));
                    }, 100);
                  } else {
                    navigate('/comprobantes');
                  }
                }}
              >
                Guardar borrador
              </button>
            </div>
          </div>
        </div>
      )}
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
                  <button
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium ${tipoComprobante === 'boleta' ? 'bg-blue-600 text-white' : 'text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
                    onClick={() => { setTipoComprobante('boleta'); setSerieSeleccionada(series.filter(s => s.startsWith('B'))[0]); }}
                  >
                    Boleta
                  </button>
                  <button
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium ${tipoComprobante === 'factura' ? 'bg-blue-600 text-white' : 'text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
                    onClick={() => { setTipoComprobante('factura'); setSerieSeleccionada(series.filter(s => s.startsWith('F'))[0]); }}
                  >
                    Factura
                  </button>
                </div>
              </div>

              {/* Currency and Payment Method */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Moneda</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                    <option value="PEN">Soles (PEN)</option>
                    <option value="USD">Dólares (USD)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Forma de Pago</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                    <option value="contado">Contado</option>
                    <option value="deposito">Depósito en cuenta</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="plin">Plin</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="yape">Yape</option>
                  </select>
                  <button
                    type="button"
                    className="mt-2 text-blue-600 hover:underline text-sm"
                    onClick={() => alert('Funcionalidad para crear nueva forma de pago')}
                  >
                    Nueva Forma de Pago
                  </button>
                </div>
              </div>

              {/* Quick Payment Buttons */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Efectivo rápido</h3>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="col-span-2 flex justify-end mt-2">
                    <button
                      className="text-blue-600 hover:text-blue-800 text-sm underline px-2 py-1"
                      type="button"
                      onClick={() => setReceivedAmount('0')}
                    >
                      Limpiar
                    </button>
                  </div>
                  <button
                    className="px-3 py-2 text-sm border-2 rounded-md transition-colors border-green-500 bg-green-100 text-green-700 font-semibold"
                    onClick={() => setReceivedAmount(totals.total.toFixed(2))}
                  >
                    S/ {totals.total.toFixed(2)}
                  </button>
                  <button
                    className="px-3 py-2 text-sm border rounded-md transition-colors border-gray-300 hover:bg-gray-50"
                    onClick={() => setReceivedAmount(prev => ((parseFloat(prev) || 0) + 20).toFixed(2))}
                  >
                    S/ 20.00
                  </button>
                  <button
                    className="px-3 py-2 text-sm border rounded-md transition-colors border-gray-300 hover:bg-gray-50"
                    onClick={() => setReceivedAmount(prev => ((parseFloat(prev) || 0) + 50).toFixed(2))}
                  >
                    S/ 50.00
                  </button>
                  <button
                    className="px-3 py-2 text-sm border rounded-md transition-colors border-gray-300 hover:bg-gray-50"
                    onClick={() => setReceivedAmount(prev => ((parseFloat(prev) || 0) + 100).toFixed(2))}
                  >
                    S/ 100.00
                  </button>
                  <button
                    className="px-3 py-2 text-sm border rounded-md transition-colors border-gray-300 hover:bg-gray-50"
                    onClick={() => setReceivedAmount(prev => ((parseFloat(prev) || 0) + 200).toFixed(2))}
                  >
                    S/ 200.00
                  </button>
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Monto recibido</label>
                  <input
                    type="number"
                    value={receivedAmount}
                    onChange={e => setReceivedAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Ingrese monto personalizado"
                  />
                  <div className="bg-gray-50 rounded-lg p-4 mt-3">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Monto a pagar:</span>
                      <span className="font-bold text-gray-900">S/ {totals.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Monto recibido:</span>
                      <span className="font-bold text-gray-900">S/ {(parseFloat(receivedAmount) || 0).toFixed(2)}</span>
                    </div>
                    <hr className="my-2" />
                    {parseFloat(receivedAmount) >= totals.total ? (
                      <div className="flex justify-between text-base font-bold">
                        <span className="text-green-600">Vuelto:</span>
                        <span className="text-green-600">S/ {(parseFloat(receivedAmount) - totals.total).toFixed(2)}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-base font-bold">
                        <span className="text-red-600">Falta:</span>
                        <span className="text-red-600">S/ {(totals.total - (parseFloat(receivedAmount) || 0)).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="space-y-3">
                  {/* Métodos de pago 'Efectivo' y 'Sí.' eliminados según solicitud del usuario */}
                </div>
              </div>

              {/* Client Selection */}
              <div>
                <div className="relative mb-4">
                  <input type="text" placeholder="Seleccionar cliente" className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm mb-4">
                  <span className="inline-flex items-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user mr-1"><path d="M20 21v-2a4 4 0 0 0-3-3.87"/><path d="M4 21v-2a4 4 0 0 1 3-3.87"/><circle cx="12" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                  </span>
                  <span>Nuevo cliente</span>
                </button>
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
                  Procesar Pago
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
                {/* Selector de tipo de comprobante */}
                <div className="mt-6 mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de comprobante</label>
                  <div className="flex space-x-2">
                    <button
                      className={`flex-1 px-4 py-2 rounded-md text-sm font-medium border ${tipoComprobante === 'boleta' ? 'bg-blue-600 text-white' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                      onClick={() => setTipoComprobante('boleta')}
                    >
                      Boleta
                    </button>
                    <button
                      className={`flex-1 px-4 py-2 rounded-md text-sm font-medium border ${tipoComprobante === 'factura' ? 'bg-blue-600 text-white' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                      onClick={() => setTipoComprobante('factura')}
                    >
                      Factura
                    </button>
                  </div>
                </div>
                {/* Campos de cliente según tipo */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Datos del cliente</h4>
                  <div className="mb-2">
                    <input type="text" placeholder="Seleccionar cliente" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-2" />
                    <button className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm mb-2">
                      <span className="inline-flex items-center">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user mr-1"><path d="M20 21v-2a4 4 0 0 0-3-3.87"/><path d="M4 21v-2a4 4 0 0 1 3-3.87"/><circle cx="12" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                      </span>
                      <span>Nuevo cliente</span>
                    </button>
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium text-gray-900 text-sm">Nombre</div>
                    <div className="text-sm font-medium text-gray-900">FLORES CANALES CARMEN ROSA</div>
                    <div className="text-xs font-medium text-gray-700 mt-2">Dni</div>
                    <div className="text-sm text-gray-700">09661829</div>
                    <div className="text-xs font-medium text-gray-700 mt-2">Dirección</div>
                    <div className="text-sm text-gray-700">Dirección no definida</div>
                    <button className="text-blue-600 hover:text-blue-700 text-sm mt-2">Editar cliente</button>
                  </div>
                </div>
              </div>

              {/* Right Side - Payment Methods */}
              <div className="w-96 p-6 overflow-y-auto">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Método de Pago</h3>
                {/* Quick Payment Buttons */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Efectivo rápido</h4>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {/* Primer botón: total de la venta */}
                    <button
                      className={`px-3 py-2 text-sm border rounded-md transition-colors border-gray-300 ${cashBills.includes(totals.total) ? 'bg-green-100 border-green-500 text-green-700' : 'hover:bg-gray-50'}`}
                      onClick={() => setCashBills([totals.total])}
                    >
                      S/ {totals.total.toFixed(2)}
                    </button>
                    {/* Billetes comunes */}
                    {quickPaymentAmounts.slice(1).map((amount) => (
                      <button
                        key={amount}
                        className={`px-3 py-2 text-sm border rounded-md transition-colors border-gray-300 ${cashBills.includes(amount) ? 'bg-blue-100 border-blue-500 text-blue-700' : 'hover:bg-gray-50'}`}
                        onClick={() => setCashBills(prev => [...prev, amount])}
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
                      onChange={e => {
                        setCustomAmount(e.target.value);
                        setCashBills([]);
                      }}
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
                      <span className="font-medium">S/ {(cashBills.reduce((sum, bill) => sum + bill, 0) || parseFloat(receivedAmount || customAmount) || 0).toFixed(2)}</span>
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
                        // Validar campos obligatorios según tipo
                        // ...validación aquí si lo deseas...
                        alert(`¡Venta procesada exitosamente!\nTipo: ${tipoComprobante}\nTotal: S/ ${totals.total.toFixed(2)}\nVuelto: S/ ${calculateChange().toFixed(2)}`);
                        setShowPaymentModal(false);
                        setCartItems([]);
                        setReceivedAmount('');
                        setCustomAmount('');
                        setCashBills([]);
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