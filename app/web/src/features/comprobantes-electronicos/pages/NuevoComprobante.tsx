import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, User, FileText, ArrowLeft, Eye } from 'lucide-react';

const SalesInvoiceSystem = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tipoComprobante = searchParams.get('tipo') === 'boleta' ? 'boleta' : 'factura';
  const [tipo, setTipo] = useState<'factura' | 'boleta'>(tipoComprobante);
  const [selectedClient] = useState('FLORES CANALES CARMEN ROSA');
  const [currency, setCurrency] = useState('PEN');
  const [multipleSelection, setMultipleSelection] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');

  const [products, setProducts] = useState([
    {
      id: 1,
      code: '00156389',
      name: 'Hojas Bond A4 ATLAS',
      quantity: 1,
      unit: 'NIU',
      unitPrice: 60.00,
      tax: 18,
      subtotal: 50.85,
      total: 60.00
    },
    {
      id: 2,
      code: '00168822',
      name: 'Sketch ARTESCO',
      quantity: 1,
      unit: 'NIU',
      unitPrice: 18.00,
      tax: 18,
      subtotal: 15.25,
      total: 18.00
    }
  ]);
  const [showExtraFields, setShowExtraFields] = useState(false);

  const calculateTotals = () => {
    const subtotal = products.reduce((sum, product) => sum + product.subtotal, 0);
    const igv = products.reduce((sum, product) => sum + (product.total - product.subtotal), 0);
    const total = products.reduce((sum, product) => sum + product.total, 0);
    
    return { subtotal, igv, total };
  };

  const totals = calculateTotals();

  const updateProductQuantity = (id: number, change: number) => {
    setProducts(products.map(product => 
      product.id === id 
        ? { 
            ...product, 
            quantity: Math.max(0, product.quantity + change),
            subtotal: (product.quantity + change) * (product.unitPrice / 1.18),
            total: (product.quantity + change) * product.unitPrice
          }
        : product
    ));
  };

  const handleQuickPayment = (amount: number) => {
    setReceivedAmount(amount.toString());
  };

  const calculateChange = () => {
    const received = parseFloat(receivedAmount || customAmount) || 0;
    const change = received - totals.total;
    return change > 0 ? change : 0;
  };

  const quickPaymentAmounts = [totals.total, 60.00, 70.00, 100.00];

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
          </div>
          <div className="flex items-center space-x-2">
            <button
              className={`px-4 py-2 rounded-l-md border border-blue-600 text-sm font-medium focus:outline-none ${tipo === 'boleta' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600'}`}
              onClick={() => setTipo('boleta')}
            >
              Boleta
            </button>
            <button
              className={`px-4 py-2 rounded-r-md border border-blue-600 text-sm font-medium focus:outline-none ${tipo === 'factura' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600'}`}
              onClick={() => setTipo('factura')}
            >
              Factura
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Main Content */}
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
                onClick={() => setShowExtraFields(f => !f)}
              >
                <FileText className="w-4 h-4" />
                <span>{showExtraFields ? 'Ocultar campos' : 'Más campos'}</span>
              </button>
            </div>

            {showExtraFields && (
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                    <input type="text" placeholder="Ingrese dirección" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de vencimiento</label>
                    <input type="date" value="2025-09-10" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección de envío</label>
                    <input type="text" placeholder="Ingrese centro de costo" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Orden de compra</label>
                    <input type="text" placeholder="Ejem OC01-0000236" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">N° de guía</label>
                    <input type="text" placeholder="Ingresa Serie y N°. Ejem T001-00000256" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
                    <input type="email" placeholder="Ingresa correo electrónico" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Centro de costo</label>
                    <input type="text" placeholder="Ingrese centro de costos" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                </div>
              </div>
            )}

            {/* Add Product Form */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-6">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Producto / Servicio</label>
                  <input 
                    type="text" 
                    placeholder="BO" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cantidad</label>
                  <input 
                    type="number" 
                    placeholder="0" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-10"
                    style={{ minWidth: 60, maxWidth: 80 }}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Precio</label>
                  <input 
                    type="number" 
                    placeholder="0" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-10"
                    style={{ minWidth: 60, maxWidth: 80 }}
                  />
                </div>
                <div className="col-span-1">
                  <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm h-10 flex items-center justify-center">
                    Agregar
                  </button>
                </div>
                <div className="col-span-1 flex items-center justify-center">
                  <label htmlFor="multiSelect" className="flex items-center cursor-pointer select-none h-10 space-x-2">
                    <div className="relative flex items-center" style={{ minWidth: 44 }}>
                      <input
                        type="checkbox"
                        id="multiSelect"
                        checked={multipleSelection}
                        onChange={e => setMultipleSelection(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-9 h-5 rounded-full shadow-inner transition-colors duration-200 ${multipleSelection ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                      <div className={`absolute left-1 top-1 w-3.5 h-3.5 bg-white rounded-full shadow transition-transform duration-200 ${multipleSelection ? 'translate-x-4' : ''}`}></div>
                    </div>
                    <span className="text-sm text-gray-700 font-medium whitespace-nowrap">Selección múltiple</span>
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
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{product.name}</div>
                          <div className="text-xs text-gray-500">{product.code}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center space-x-2">
                          <button 
                            onClick={() => updateProductQuantity(product.id, -1)}
                            className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 text-lg font-bold"
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-sm">{product.quantity}</span>
                          <button 
                            onClick={() => updateProductQuantity(product.id, 1)}
                            className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 text-lg font-bold"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-center text-xs text-gray-500 mt-1">{product.unit}</div>
                      </td>
                      <td className="px-4 py-4 text-right text-sm">S/ {product.unitPrice.toFixed(2)} ⌄</td>
                      <td className="px-4 py-4 text-center text-sm">IGV {product.tax}%</td>
                      <td className="px-4 py-4 text-right text-sm">S/ {product.subtotal.toFixed(2)}</td>
                      <td className="px-4 py-4 text-right font-medium text-sm">S/ {product.total.toFixed(2)}</td>
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
                <Eye className="w-4 h-4" />
                <span>Vista previa</span>
              </button>
              <div className="flex space-x-3">
                <button
                  className="px-6 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
                  onClick={() => navigate('/comprobantes')}
                >
                  Cancelar
                </button>
                <button className="px-6 py-2 text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors text-sm">
                  Guardar borrador
                </button>
                <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm">
                  Crear comprobante
                </button>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones (Visible en la impresión del comprobante)
                </label>
                <textarea 
                  rows={4} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Observaciones (Visible en la impresión del comprobante."
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nota interna (No visible en la impresión del comprobante)
                </label>
                <textarea 
                  rows={4} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Nota interna (No visible en la impresión del comprobante."
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 border-l border-gray-200 bg-white p-6 space-y-6">
          {/* Document Type */}
          <div>
            <div className="flex space-x-2 mb-4">
              <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium">
                Boleta
              </button>
              <button className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
                Factura
              </button>
            </div>
            <button className="w-4 h-4 text-gray-400 ml-auto block">
              <FileText className="w-4 h-4" />
            </button>
          </div>

          {/* Currency and Payment Method */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Moneda</label>
              <select 
                value={currency} 
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="PEN">PEN</option>
                <option value="USD">USD</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Forma de Pago</label>
              <input 
                type="text" 
                value="contado" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                readOnly
              />
            </div>
          </div>

          {/* Quick Payment Buttons */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Efectivo rápido</h3>
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

            {/* Payment breakdown */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Ingresa el monto</span>
                <div className="text-right">
                  <div className="font-medium">S/ {totals.total.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">S/ {calculateChange().toFixed(2)}</div>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">S/ {totals.total.toFixed(2)}</span>
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
                  <span className="text-sm font-medium">YAPE</span>
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Seleccionar cliente" 
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm mb-4">
              <User className="w-4 h-4" />
              <span>Nuevo cliente</span>
            </button>

            {/* Selected Client Info */}
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <User className="w-4 h-4 text-gray-400 mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-medium text-gray-700">Nombre</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{selectedClient}</p>
                  
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
              <button className="text-blue-600 hover:text-blue-700 text-sm">
                Editar cliente
              </button>
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
      </div>
    </div>
  );
};

export default SalesInvoiceSystem;