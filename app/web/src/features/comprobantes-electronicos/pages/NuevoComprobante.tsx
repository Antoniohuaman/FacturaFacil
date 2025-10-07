import { AVAILABLE_PRODUCTS } from '../models/constants';
import { useState } from 'react';
import { useConfigurationContext } from '../../configuracion-sistema/context/ConfigurationContext';
import { PaymentMethodFormModal } from '../../configuracion-sistema/components/business/PaymentMethodFormModal';

// Importar hooks customizados optimizados
import { useCart } from '../hooks/useCart';
import { usePayment } from '../hooks/usePayment';
import { useCurrency } from '../hooks/useCurrency';
import { useDrafts } from '../hooks/useDrafts';
import { useDocumentType } from '../hooks/useDocumentType';
import { usePreview } from '../hooks/usePreview';
import { useComprobanteState } from '../hooks/useComprobanteState';
import { useComprobanteActions } from '../hooks/useComprobanteActions';

// Importar componentes
import { ComprobantHeader } from '../components/ComprobantHeader';
import { ProductGrid } from '../components/ProductGrid';
import { CartSidebar } from '../components/CartSidebar';
import ProductsSection from '../components/ProductsSection';
import DocumentInfoCard from '../components/DocumentInfoCard';
import NotesSection from '../components/NotesSection';
import ClientSidebar from '../components/ClientSidebar';
import PaymentMethodsSection from '../components/PaymentMethodsSection';
import { Toast } from '../components/Toast';
import { ToastContainer } from '../components/ToastContainer';
import { DraftModal } from '../components/DraftModal';
import { PaymentModal } from '../components/PaymentModal';
import { PreviewModal } from '../components/PreviewModal';
import { ErrorBoundary } from '../components/ErrorBoundary';
import ActionButtonsSection from '../components/ActionButtonsSection';

const NuevoComprobante = () => {
  const { state, dispatch } = useConfigurationContext();
  
  // Use custom hooks optimizados
  const { cartItems, addToCart, removeFromCart, updateCartQuantity, updateCartItem, addProductsFromSelector, clearCart } = useCart();
  const { calculateTotals, showPaymentModal, setShowPaymentModal } = usePayment();
  const { currentCurrency, changeCurrency } = useCurrency();
  const { showDraftModal, setShowDraftModal, showDraftToast, setShowDraftToast, handleDraftModalSave, draftAction, setDraftAction, draftExpiryDate, setDraftExpiryDate } = useDrafts();
  const { tipoComprobante, setTipoComprobante, serieSeleccionada, setSerieSeleccionada, seriesFiltradas } = useDocumentType();
  const { openPreview, showPreview, closePreview } = usePreview();

  // Estado consolidado del comprobante
  const {
    viewMode, setViewMode,
    showOptionalFields, setShowOptionalFields,
    observaciones, setObservaciones,
    notaInterna, setNotaInterna,
    receivedAmount, setReceivedAmount,
    formaPago, setFormaPago,
    isProcessing, setIsProcessing,
    isCajaOpen, canProcess, cajaStatus,
    getPaymentMethodLabel,
    resetForm,
    goToComprobantes
  } = useComprobanteState();

  // Acciones del comprobante con manejo de errores
  const {
    createComprobante,
    toasts,
    removeToast,
    error,
    warning
  } = useComprobanteActions();

  // Available products (now using centralized constants)
  const availableProducts = AVAILABLE_PRODUCTS;

  // Calculate totals
  const totals = calculateTotals(cartItems);
  
  // Estado para el modal de nueva forma de pago
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);

  // Handler para abrir modal de nueva forma de pago
  const handleNuevaFormaPago = () => {
    setShowPaymentMethodModal(true);
  };

  // Handler para actualizar payment methods
  const handleUpdatePaymentMethods = async (updatedMethods: any[]) => {
    dispatch({ type: 'SET_PAYMENT_METHODS', payload: updatedMethods });
  };

  // Handlers mejorados con validación y feedback
  const handleVistaPrevia = () => {
    if (cartItems.length === 0) {
      error('Productos requeridos', 'Debe agregar al menos un producto para ver la vista previa');
      return;
    }
    openPreview();
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
        observaciones,
        notaInterna,
        formaPago
      });

      if (success) {
        // Limpiar formulario y regresar
        clearCart();
        resetForm();
        setTimeout(() => goToComprobantes(), 1000);
      }
    } finally {
      setIsProcessing(false);
    }
  };

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



  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header Component */}
      <ComprobantHeader 
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Main Content */}
      <div className="flex-1 flex">
        {viewMode === 'pos' ? (
          // POS View
          <>
            <div className="flex-1 p-6 space-y-6">
              {/* Products Grid Component */}
              <ProductGrid 
                products={availableProducts}
                cartItems={cartItems}
                onAddToCart={addToCart}
              />
            </div>
            
            {/* Cart Sidebar Component */}
            <CartSidebar 
              cartItems={cartItems}
              totals={totals}
              onRemoveItem={removeFromCart}
              onUpdateQuantity={updateCartQuantity}
              onConfirmSale={handleConfirmSale}
              onClearCart={clearCart}
              onViewFullForm={() => setViewMode('form')}
              onAddProduct={addToCart}
              currency={currentCurrency}
              cashBoxStatus={cajaStatus === 'abierta' ? 'open' : cajaStatus === 'cerrada' ? 'closed' : 'unknown'}
              isProcessing={isProcessing}
            />

            {/* Client Sidebar Component */}
            <ClientSidebar 
              tipoComprobante={tipoComprobante}
              setTipoComprobante={setTipoComprobante}
            />
          </>
        ) : (
          // Form View
          <>
            <div className="flex-1 p-6 space-y-6">
              {/* Document Info Card Component */}
              <DocumentInfoCard 
                serieSeleccionada={serieSeleccionada}
                setSerieSeleccionada={setSerieSeleccionada}
                seriesFiltradas={seriesFiltradas}
                showOptionalFields={showOptionalFields}
                setShowOptionalFields={setShowOptionalFields}
              />

              {/* Products Section Component */}
            <ProductsSection
              cartItems={cartItems}
              addProductsFromSelector={addProductsFromSelector}
              updateCartItem={updateCartItem}
              removeFromCart={removeFromCart}
              totals={totals}
              showDraftModal={showDraftModal}
              setShowDraftModal={setShowDraftModal}
              showDraftToast={showDraftToast}
              setShowDraftToast={setShowDraftToast}
              draftExpiryDate={draftExpiryDate}
              setDraftExpiryDate={setDraftExpiryDate}
              draftAction={draftAction}
              setDraftAction={setDraftAction}
              handleDraftModalSave={handleDraftModalSave}
              tipoComprobante={tipoComprobante}
              serieSeleccionada={serieSeleccionada}
              clearCart={clearCart}
            />
              {/* Notes Section Component */}
              <NotesSection 
                observaciones={observaciones}
                setObservaciones={setObservaciones}
                notaInterna={notaInterna}
                setNotaInterna={setNotaInterna}
              />

              {/* Action Buttons Section */}
              <ActionButtonsSection
                onVistaPrevia={handleVistaPrevia}
                onCancelar={goToComprobantes}
                onGuardarBorrador={() => setShowDraftModal(true)}
                onCrearComprobante={() => setShowPaymentModal(true)}
                isCartEmpty={cartItems.length === 0}
              />
            </div>

            {/* Payment Methods Section Component */}
            <PaymentMethodsSection 
              tipoComprobante={tipoComprobante}
              setTipoComprobante={setTipoComprobante}
              totals={totals}
              receivedAmount={receivedAmount}
              setReceivedAmount={setReceivedAmount}
              moneda={currentCurrency}
              setMoneda={(value: string) => changeCurrency(value as any)}
              formaPago={formaPago}
              setFormaPago={setFormaPago}
              onNuevaFormaPago={handleNuevaFormaPago}
            />
          </>
        )}
      </div>

      {/* Toast Container mejorado */}
      <ToastContainer
        toasts={toasts}
        onRemove={removeToast}
      />

      {/* Toast legacy (mantener por compatibilidad) */}
      <Toast
        show={showDraftToast}
        message="Borrador guardado exitosamente"
        onClose={() => setShowDraftToast(false)}
      />

      {/* Draft Modal Component */}
      <DraftModal
        show={showDraftModal}
        onClose={() => setShowDraftModal(false)}
        onSave={() => handleDraftModalSave({
          tipoComprobante,
          serieSeleccionada,
          cartItems
        })}
        draftExpiryDate={draftExpiryDate}
        onDraftExpiryDateChange={setDraftExpiryDate}
        draftAction={draftAction}
        onDraftActionChange={setDraftAction}
      />

      {/* Payment Modal Component */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        cartItems={cartItems}
        totals={totals}
        tipoComprobante={tipoComprobante}
        setTipoComprobante={setTipoComprobante}
        onPaymentComplete={() => {
          setShowPaymentModal(false);
          clearCart();
          resetForm();
          goToComprobantes();
        }}
        onViewFullForm={() => {
          setShowPaymentModal(false);
          setViewMode('form');
        }}
        currency={currentCurrency}
        onCurrencyChange={changeCurrency}
      />

      {/* Preview Modal Component */}
      <PreviewModal
        isOpen={showPreview}
        onClose={closePreview}
        cartItems={cartItems}
        documentType={tipoComprobante}
        series={serieSeleccionada}
        totals={totals}
        paymentMethod={getPaymentMethodLabel(formaPago)}
        currency={currentCurrency}
        observations={observaciones}
        internalNotes={notaInterna}
        onCreateDocument={handleCrearComprobante}
      />

      {/* Modal para crear nueva forma de pago */}
      <PaymentMethodFormModal
        isOpen={showPaymentMethodModal}
        onClose={() => setShowPaymentMethodModal(false)}
        paymentMethods={state.paymentMethods}
        onUpdate={handleUpdatePaymentMethods}
      />
      </div>
    </ErrorBoundary>
  );
};

export default NuevoComprobante;