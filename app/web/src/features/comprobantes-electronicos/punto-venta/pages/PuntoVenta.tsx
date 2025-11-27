/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
/* eslint-disable @typescript-eslint/no-unused-vars -- variables temporales; limpieza diferida */
// ===================================================================
// PUNTO DE VENTA - PÁGINA INDEPENDIENTE
// Preserva toda la funcionalidad original con mejor UX
// ===================================================================

// Importar hooks customizados
import { useCart } from '../hooks/useCart';
import { usePayment } from '../../shared/form-core/hooks/usePayment';
import { useCurrency } from '../../shared/form-core/hooks/useCurrency';
import { useDocumentType } from '../../shared/form-core/hooks/useDocumentType';
import { useComprobanteState } from '../../hooks/useComprobanteState';
import { useComprobanteActions } from '../../hooks/useComprobanteActions';
import { useAvailableProducts } from '../../hooks/useAvailableProducts';
import { useCurrentEstablishmentId, useCurrentCompanyId } from '../../../../contexts/UserSessionContext';

// Importar componentes POS
import { ProductGrid } from '../components/ProductGrid';
import { CartCheckoutPanel } from '../components/CartCheckoutPanel';

// Importar componentes compartidos
import { ToastContainer } from '../../shared/ui/Toast/ToastContainer';
import { PaymentMethodModal } from '../../shared/modales/PaymentMethodModal';
import { ErrorBoundary } from '../../shared/ui/ErrorBoundary';
import { SuccessModal } from '../../shared/modales/SuccessModal';
import { validateComprobanteNormativa } from '../../shared/core/comprobanteValidation';

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { useState } from 'react';

const PuntoVenta = () => {
  const navigate = useNavigate();

  // Obtener establecimiento y empresa del usuario actual
  const currentEstablishmentId = useCurrentEstablishmentId();
  const currentCompanyId = useCurrentCompanyId();

  // Use custom hooks (SIN CAMBIOS - exactamente igual)
  const { cartItems, addToCart, removeFromCart, updateCartQuantity, updateCartItemPrice, clearCart } = useCart();
  const { calculateTotals, showPaymentModal, setShowPaymentModal } = usePayment();
  const { currentCurrency, currencyInfo } = useCurrency();
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

  // Estado para el modal de éxito
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastComprobante, setLastComprobante] = useState<any>(null);

  // Estado para cliente seleccionado (nuevo flujo)
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null);

  // Obtener productos disponibles del catálogo (filtrados por establecimiento)
  const availableProducts = useAvailableProducts({
    establecimientoId: currentEstablishmentId,
    soloConStock: false // Cambiar a true si solo se quieren mostrar productos con stock
  });

  // Calculate totals (SIN CAMBIOS)
  const totals = calculateTotals(cartItems);

  // Handlers (SIN CAMBIOS - exactamente igual que antes)
  const handleConfirmSale = () => {
    if (!isCajaOpen) {
      error('Caja cerrada', 'No se puede procesar ventas con la caja cerrada. Abra la caja e inténtelo nuevamente.');
      return;
    }

    const validation = validateComprobanteNormativa({
      tipoComprobante,
      serieSeleccionada,
      cliente: clienteSeleccionado,
      formaPago,
      fechaEmision: undefined,
      moneda: currentCurrency,
      cartItems,
      totals,
    });

    if (!validation.isValid) {
      validation.errors.forEach((e) => {
        warning('Faltan datos para procesar la venta', e.message);
      });
      return;
    }

    setShowPaymentModal(true);
  };

  const handleCrearComprobante = async () => {
    if (!canProcess) {
      error('No se puede procesar', 'Verifique que la caja esté abierta y no haya operaciones en curso');
      return;
    }

    const validation = validateComprobanteNormativa({
      tipoComprobante,
      serieSeleccionada,
      cliente: clienteSeleccionado,
      formaPago,
      fechaEmision: undefined,
      moneda: currentCurrency,
      cartItems,
      totals,
    });

    if (!validation.isValid) {
      validation.errors.forEach((e) => {
        error('No se puede procesar', e.message);
      });
      return;
    }

    setIsProcessing(true);

    try {
      const success = await createComprobante({
        tipoComprobante,
        serieSeleccionada,
        cartItems,
        totals,
        formaPago,
        establishmentId: currentEstablishmentId,
        companyId: currentCompanyId,
        currency: currentCurrency,
        exchangeRate: currencyInfo?.rate,
        source: 'pos'
      });

      if (success) {
        // Guardar datos del comprobante para el modal
        setLastComprobante({
          tipo: tipoComprobante === 'factura' ? 'Factura' : tipoComprobante === 'boleta' ? 'Boleta' : 'Nota de Venta',
          serie: serieSeleccionada,
          numero: '001-00001', // TODO: Obtener el número real del backend
          total: totals.total,
          cliente: 'Cliente General', // TODO: Obtener del formulario si existe
          vuelto: 0 // En POS el vuelto se calcula en PaymentModal
        });
        
        // Cerrar modal de pago y mostrar modal de éxito
        setShowPaymentModal(false);
        setShowSuccessModal(true);
        
        // NO limpiar el carrito todavía - se hará cuando el usuario haga clic en "Nueva venta"
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    console.log('Imprimiendo comprobante...', lastComprobante);
    // TODO: Implementar lógica de impresión
    window.print();
  };

  const handleNewSale = () => {
    clearCart();
    resetForm();
    setShowSuccessModal(false);
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
                  onClick={() => navigate('/punto-venta')}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Volver al punto de venta"
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
                        POS
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
                {/* Status of cash box is now shown in the global Header; keep an accessible live region */}
                <span className="sr-only" aria-live="polite">Caja {cajaStatus === 'abierta' ? 'abierta' : 'cerrada'}</span>
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

          {/* Cart Checkout Panel - NUEVO COMPONENTE UNIFICADO */}
          <CartCheckoutPanel
            cartItems={cartItems}
            totals={totals}
            onRemoveItem={removeFromCart}
            onUpdateQuantity={updateCartQuantity}
            onUpdatePrice={updateCartItemPrice}
            onConfirmSale={handleConfirmSale}
            onClearCart={clearCart}
            onViewFullForm={() => navigate('/comprobantes/emision')}
            onAddProduct={addToCart}
            currency={currentCurrency}
            tipoComprobante={tipoComprobante}
            setTipoComprobante={setTipoComprobante}
            onCurrencyChange={(_newCurrency) => {
              // Currency change is handled by useCurrency hook
            }}
            clienteSeleccionado={clienteSeleccionado}
            setClienteSeleccionado={setClienteSeleccionado}
            cashBoxStatus={cajaStatus === 'abierta' ? 'open' : cajaStatus === 'cerrada' ? 'closed' : 'unknown'}
            isProcessing={isProcessing}
          />
        </div>

        {/* Toast Container - Sin cambios */}
        <ToastContainer
          toasts={toasts}
          onRemove={removeToast}
        />

        {/* Payment Method Modal - NUEVO MODAL SIMPLIFICADO (SOLO PAGO) */}
        <PaymentMethodModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          total={totals.total}
          currency={currentCurrency}
          tipoComprobante={tipoComprobante}
          clienteNombre={clienteSeleccionado?.nombre}
          onPaymentComplete={handleCrearComprobante}
          isProcessing={isProcessing}
        />

        {/* Modal de éxito con acciones de compartir */}
        {lastComprobante && (
          <SuccessModal
            isOpen={showSuccessModal}
            onClose={() => setShowSuccessModal(false)}
            comprobante={lastComprobante}
            onPrint={handlePrint}
            onNewSale={handleNewSale}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default PuntoVenta;
