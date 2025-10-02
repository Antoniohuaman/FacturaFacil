// ===================================================================
// PUNTO DE VENTA - PÁGINA INDEPENDIENTE
// Preserva toda la funcionalidad original con mejor UX
// ===================================================================

import { AVAILABLE_PRODUCTS } from '../models/constants';

// Importar hooks customizados (SIN CAMBIOS)
import { useCart } from '../hooks/useCart';
import { usePayment } from '../hooks/usePayment';
import { useCurrency } from '../hooks/useCurrency';
import { useDocumentType } from '../hooks/useDocumentType';
import { useComprobanteState } from '../hooks/useComprobanteState';
import { useComprobanteActions } from '../hooks/useComprobanteActions';

// Importar componentes POS (TODOS preservados)
import { ProductGrid } from '../components/ProductGrid';
import { CartSidebar } from '../components/CartSidebar';

// Importar componentes compartidos (preservados)
import { ToastContainer } from '../components/ToastContainer';
import { PaymentModal } from '../components/PaymentModal';
import { ErrorBoundary } from '../components/ErrorBoundary';

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, LayoutGrid } from 'lucide-react';

const PuntoVenta = () => {
  const navigate = useNavigate();

  // Use custom hooks (SIN CAMBIOS - exactamente igual)
  const { cartItems, addToCart, removeFromCart, updateCartQuantity, clearCart } = useCart();
  const { calculateTotals, showPaymentModal, setShowPaymentModal } = usePayment();
  const { currentCurrency } = useCurrency();
  const { tipoComprobante, setTipoComprobante, serieSeleccionada } = useDocumentType();

  // Estado consolidado (SIN CAMBIOS)
  const {
    formaPago,
    isProcessing, setIsProcessing,
    isCajaOpen, canProcess, cajaStatus,
    resetForm
  } = useComprobanteState();

  // Acciones del comprobante (SIN CAMBIOS)
  const {
    createComprobante,
    toasts,
    removeToast,
    error,
    warning
  } = useComprobanteActions();

  // Available products (SIN CAMBIOS)
  const availableProducts = AVAILABLE_PRODUCTS;

  // Calculate totals (SIN CAMBIOS)
  const totals = calculateTotals(cartItems);

  // Handlers (SIN CAMBIOS - exactamente igual que antes)
  const handleConfirmSale = () => {
    if (!isCajaOpen) {
      error('Caja cerrada', 'No se puede procesar ventas con la caja cerrada. Abra la caja e inténtelo nuevamente.');
      return;
    }

    if (cartItems.length === 0) {
      warning('Carrito vacío', 'Agregue productos antes de procesar la venta');
      return;
    }

    setShowPaymentModal(true);
  };

  const handleCrearComprobante = async () => {
    if (!canProcess) {
      error('No se puede procesar', 'Verifique que la caja esté abierta y no haya operaciones en curso');
      return;
    }

    setIsProcessing(true);

    try {
      const success = await createComprobante({
        tipoComprobante,
        serieSeleccionada,
        cartItems,
        totals,
        formaPago
      });

      if (success) {
        clearCart();
        resetForm();
        setShowPaymentModal(false);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/20 to-gray-50 flex flex-col">

        {/* Header Mejorado con mejor diseño */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left side */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/comprobantes/nuevo')}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Volver al selector de modo"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                    <ShoppingCart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      Punto de Venta
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        Rápido
                      </span>
                    </h1>
                    <p className="text-sm text-gray-500">
                      Ventas ágiles y eficientes
                    </p>
                  </div>
                </div>
              </div>

              {/* Right side - Estado de caja mejorado */}
              <div className="flex items-center space-x-3">
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium border-2 ${
                  cajaStatus === 'abierta'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    cajaStatus === 'abierta' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                  }`} />
                  <span className="font-semibold">
                    {cajaStatus === 'abierta' ? 'Caja Abierta' : 'Caja Cerrada'}
                  </span>
                </div>

                {/* Mini stats */}
                <div className="hidden lg:flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                  <LayoutGrid className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {availableProducts.length} productos
                  </span>
                </div>

                <div className="hidden lg:flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
                  <ShoppingCart className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-700 font-medium">
                    {cartItems.length} en carrito
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Layout EXACTAMENTE igual que antes */}
        <div className="flex-1 flex overflow-hidden">

          {/* POS View - PRESERVADO COMPLETAMENTE */}
          <div className="flex-1 overflow-hidden">
            {/* Products Grid - SIN CAMBIOS */}
            <ProductGrid
              products={availableProducts}
              cartItems={cartItems}
              onAddToCart={addToCart}
            />
          </div>

          {/* Cart Sidebar - PRESERVADO COMPLETAMENTE */}
          <CartSidebar
            cartItems={cartItems}
            totals={totals}
            onRemoveItem={removeFromCart}
            onUpdateQuantity={updateCartQuantity}
            onConfirmSale={handleConfirmSale}
            onClearCart={clearCart}
            onViewFullForm={() => navigate('/comprobantes/emision')}
            onAddProduct={addToCart}
            currency={currentCurrency}
            cashBoxStatus={cajaStatus === 'abierta' ? 'open' : cajaStatus === 'cerrada' ? 'closed' : 'unknown'}
            isProcessing={isProcessing}
          />
        </div>

        {/* Toast Container - Sin cambios */}
        <ToastContainer
          toasts={toasts}
          onRemove={removeToast}
        />

        {/* Payment Modal - PRESERVADO */}
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          cartItems={cartItems}
          totals={totals}
          tipoComprobante={tipoComprobante}
          setTipoComprobante={setTipoComprobante}
          onPaymentComplete={handleCrearComprobante}
          onViewFullForm={() => navigate('/comprobantes/emision')}
          currency={currentCurrency}
        />
      </div>
    </ErrorBoundary>
  );
};

export default PuntoVenta;
