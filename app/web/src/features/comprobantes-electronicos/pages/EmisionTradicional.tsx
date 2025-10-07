// ===================================================================
// EMISIÓN TRADICIONAL - PÁGINA INDEPENDIENTE
// Preserva toda la funcionalidad original con mejor UX
// ===================================================================

// Importar hooks customizados (SIN CAMBIOS)
import { useCart } from '../hooks/useCart';
import { usePayment } from '../hooks/usePayment';
import { useCurrency } from '../hooks/useCurrency';
import { useDrafts } from '../hooks/useDrafts';
import { useDocumentType } from '../hooks/useDocumentType';
import { usePreview } from '../hooks/usePreview';
import { useComprobanteState } from '../hooks/useComprobanteState';
import { useComprobanteActions } from '../hooks/useComprobanteActions';

// Importar componentes (TODOS preservados)
import ProductsSection from '../components/ProductsSection';
import DocumentInfoCard from '../components/DocumentInfoCard';
import NotesSection from '../components/NotesSection';
import ActionButtonsSection from '../components/ActionButtonsSection';
import PaymentMethodsSection from '../components/PaymentMethodsSection';
import { Toast } from '../components/Toast';
import { ToastContainer } from '../components/ToastContainer';
import { DraftModal } from '../components/DraftModal';
import { PaymentModal } from '../components/PaymentModal';
import { PreviewModal } from '../components/PreviewModal';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { SuccessModal } from '../components/SuccessModal';

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, LayoutList } from 'lucide-react';
import { useState } from 'react';
import { useConfigurationContext } from '../../configuracion-sistema/context/ConfigurationContext';
import { PaymentMethodFormModal } from '../../configuracion-sistema/components/business/PaymentMethodFormModal';

const EmisionTradicional = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useConfigurationContext();

  // Use custom hooks (SIN CAMBIOS - exactamente igual)
  const { cartItems, removeFromCart, updateCartItem, addProductsFromSelector, clearCart } = useCart();
  const { calculateTotals, showPaymentModal, setShowPaymentModal } = usePayment();
  const { currentCurrency, changeCurrency } = useCurrency();
  const { showDraftModal, setShowDraftModal, showDraftToast, setShowDraftToast, handleDraftModalSave, draftAction, setDraftAction, draftExpiryDate, setDraftExpiryDate } = useDrafts();
  const { tipoComprobante, setTipoComprobante, serieSeleccionada, setSerieSeleccionada, seriesFiltradas } = useDocumentType();
  const { openPreview, showPreview, closePreview } = usePreview();

  // Estado consolidado (SIN CAMBIOS)
  const {
    showOptionalFields, setShowOptionalFields,
    observaciones, setObservaciones,
    notaInterna, setNotaInterna,
    receivedAmount, setReceivedAmount,
    formaPago, setFormaPago,
    setIsProcessing,
    canProcess, cajaStatus,
    getPaymentMethodLabel,
    resetForm,
    goToComprobantes
  } = useComprobanteState();

  // Acciones del comprobante (SIN CAMBIOS)
  const {
    createComprobante,
    toasts,
    removeToast,
    error
  } = useComprobanteActions();

  // Estado para el modal de éxito
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastComprobante, setLastComprobante] = useState<any>(null);
  
  // Estado para el modal de nueva forma de pago
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);

  // Calculate totals (SIN CAMBIOS)
  const totals = calculateTotals(cartItems);

  // Handler para abrir modal de nueva forma de pago
  const handleNuevaFormaPago = () => {
    setShowPaymentMethodModal(true);
  };

  // Handler para actualizar payment methods
  const handleUpdatePaymentMethods = async (updatedMethods: any[]) => {
    dispatch({ type: 'SET_PAYMENT_METHODS', payload: updatedMethods });
  };

  // Handlers (SIN CAMBIOS - exactamente igual que antes)
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
        // Guardar datos del comprobante para el modal
        const received = parseFloat(receivedAmount) || 0;
        setLastComprobante({
          tipo: tipoComprobante === 'factura' ? 'Factura' : tipoComprobante === 'boleta' ? 'Boleta' : 'Nota de Venta',
          serie: serieSeleccionada,
          numero: '001-00001', // TODO: Obtener el número real del backend
          total: totals.total,
          cliente: 'Cliente General', // TODO: Obtener del formulario
          vuelto: received > totals.total ? received - totals.total : 0
        });
        
        // Mostrar modal de éxito
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-50 flex flex-col">

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
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      Emisión Tradicional
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        Completo
                      </span>
                    </h1>
                    <p className="text-sm text-gray-500">
                      Comprobante detallado con todas las opciones
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
                  <LayoutList className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {cartItems.length} productos
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Layout EXACTAMENTE igual que antes */}
        <div className="flex-1 flex overflow-hidden">
          {/* Form View - PRESERVADO COMPLETAMENTE */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">

            {/* Document Info Card - Sin cambios */}
            <DocumentInfoCard
              serieSeleccionada={serieSeleccionada}
              setSerieSeleccionada={setSerieSeleccionada}
              seriesFiltradas={seriesFiltradas}
              showOptionalFields={showOptionalFields}
              setShowOptionalFields={setShowOptionalFields}
            />

            {/* Products Section - PRESERVADO COMPLETAMENTE */}
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

            {/* Notes Section - Sin cambios */}
            <NotesSection
              observaciones={observaciones}
              setObservaciones={setObservaciones}
              notaInterna={notaInterna}
              setNotaInterna={setNotaInterna}
            />

            {/* Action Buttons Section - Sin cambios */}
            <ActionButtonsSection
              onVistaPrevia={handleVistaPrevia}
              onCancelar={goToComprobantes}
              onGuardarBorrador={() => setShowDraftModal(true)}
              onCrearComprobante={() => setShowPaymentModal(true)}
              isCartEmpty={cartItems.length === 0}
            />
          </div>

          {/* Payment Methods Section - PRESERVADO COMPLETAMENTE */}
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
        </div>

        {/* Toast Container - Sin cambios */}
        <ToastContainer
          toasts={toasts}
          onRemove={removeToast}
        />

        {/* Toast legacy - Sin cambios */}
        <Toast
          show={showDraftToast}
          message="Borrador guardado exitosamente"
          onClose={() => setShowDraftToast(false)}
        />

        {/* Modals - TODOS preservados */}
        <DraftModal
          show={showDraftModal}
          onClose={() => setShowDraftModal(false)}
          onSave={() => {
            handleDraftModalSave({
              tipoComprobante,
              serieSeleccionada,
              cartItems,
              onClearCart: clearCart
            });
          }}
          draftExpiryDate={draftExpiryDate}
          onDraftExpiryDateChange={setDraftExpiryDate}
          draftAction={draftAction}
          onDraftActionChange={setDraftAction}
        />

        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          cartItems={cartItems}
          totals={totals}
          tipoComprobante={tipoComprobante}
          setTipoComprobante={setTipoComprobante}
          onPaymentComplete={handleCrearComprobante}
          onViewFullForm={goToComprobantes}
          currency={currentCurrency}
        />

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

export default EmisionTradicional;
