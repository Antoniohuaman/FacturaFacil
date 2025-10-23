// ===================================================================
// EMISIÓN TRADICIONAL - PÁGINA INDEPENDIENTE
// Preserva toda la funcionalidad original con mejor UX
// ===================================================================

// Importar hooks del form-core y hooks específicos
import { useCart } from '../punto-venta/hooks/useCart';
import { usePayment } from '../shared/form-core/hooks/usePayment';
import { useCurrency } from '../shared/form-core/hooks/useCurrency';
import { useDrafts } from '../hooks/useDrafts';
import { useDocumentType } from '../shared/form-core/hooks/useDocumentType';
import { usePreview } from '../hooks/usePreview';
import { useComprobanteState } from '../hooks/useComprobanteState';
import { useComprobanteActions } from '../hooks/useComprobanteActions';
import { useFieldsConfiguration } from '../shared/form-core/contexts/FieldsConfigurationContext';

// Importar componentes del form-core
import ProductsSection from '../shared/form-core/components/ProductsSection';
import CompactDocumentForm from '../shared/form-core/components/CompactDocumentForm';
import NotesSection from '../shared/form-core/components/NotesSection';
import ActionButtonsSection from '../shared/form-core/components/ActionButtonsSection';
import FieldsConfigModal from '../shared/form-core/components/FieldsConfigModal';
import { Toast } from '../shared/ui/Toast/Toast';
import { ToastContainer } from '../shared/ui/Toast/ToastContainer';
import { DraftModal } from '../shared/modales/DraftModal';
import { PaymentModal } from '../shared/modales/PaymentModal';
import { PreviewModal } from '../shared/modales/PreviewModal';
import { ErrorBoundary } from '../shared/ui/ErrorBoundary';
import { SuccessModal } from '../shared/modales/SuccessModal';

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { useState } from 'react';
import { useConfigurationContext } from '../../configuracion-sistema/context/ConfigurationContext';
import { PaymentMethodFormModal } from '../../configuracion-sistema/components/business/PaymentMethodFormModal';

const EmisionTradicional = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useConfigurationContext();

  // ✅ Estado para forzar refresh del ProductSelector
  const [productSelectorKey, setProductSelectorKey] = useState(0);

  // ✅ Estado para modal de configuración de campos
  const [showFieldsConfigModal, setShowFieldsConfigModal] = useState(false);

  // Use custom hooks (SIN CAMBIOS - exactamente igual)
  const { cartItems, removeFromCart, updateCartItem, addProductsFromSelector, clearCart } = useCart();
  const { calculateTotals, showPaymentModal, setShowPaymentModal } = usePayment();
  const { currentCurrency, changeCurrency } = useCurrency();
  const { showDraftModal, setShowDraftModal, showDraftToast, setShowDraftToast, handleDraftModalSave, draftAction, setDraftAction, draftExpiryDate, setDraftExpiryDate } = useDrafts();
  const { tipoComprobante, setTipoComprobante, serieSeleccionada, setSerieSeleccionada, seriesFiltradas } = useDocumentType();
  const { openPreview, showPreview, closePreview } = usePreview();

  // ✅ Hook para configuración de visibilidad de campos
  const {
    config: fieldsConfig,
    toggleNotesSection,
    toggleActionButton,
    toggleOptionalField,
    toggleOptionalFieldRequired,
    resetToDefaults: resetFieldsConfig,
  } = useFieldsConfiguration();

  // Estado consolidado (SIN CAMBIOS)
  const {
    observaciones, setObservaciones,
    notaInterna, setNotaInterna,
    receivedAmount, // setReceivedAmount ya no se usa (eliminamos bloque "Efectivo rápido")
    formaPago, setFormaPago,
    setIsProcessing,
    canProcess,
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

  // ----- Lifted data from CompactDocumentForm (cliente y campos opcionales) -----
  const [clienteSeleccionadoGlobal, setClienteSeleccionadoGlobal] = useState<{ nombre: string; dni: string; direccion: string; email?: string } | null>(null);
  const [fechaEmision, setFechaEmision] = useState<string>(new Date().toISOString().split('T')[0]);
  const [optionalFields, setOptionalFields] = useState<Record<string, any>>({});

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
        formaPago,
        currency: currentCurrency,
        client: clienteSeleccionadoGlobal?.nombre,
        clientDoc: clienteSeleccionadoGlobal?.dni,
        fechaEmision: fechaEmision,
        fechaVencimiento: optionalFields.fechaVencimiento,
        email: optionalFields.correo || clienteSeleccionadoGlobal?.email,
        address: optionalFields.direccion || clienteSeleccionadoGlobal?.direccion,
        shippingAddress: optionalFields.direccionEnvio,
        purchaseOrder: optionalFields.ordenCompra,
        costCenter: optionalFields.centroCosto,
        waybill: optionalFields.guiaRemision
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
    setProductSelectorKey(prev => prev + 1); // ✅ Incrementar para remontar ProductSelector
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
                  onClick={() => navigate('/comprobantes')}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Volver a comprobantes"
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
                        Formulario
                      </span>
                    </h1>
                    <p className="text-sm text-gray-500">
                      Comprobante detallado con todas las opciones
                    </p>
                  </div>
                </div>
              </div>

              {/* Right side - Tipo de Comprobante */}
              <div className="flex items-center space-x-3">
                {/* ✅ Selector de Tipo de Comprobante - Botones Premium */}
                <div className="flex items-center space-x-2">
                  <button
                    className={`relative group px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      tipoComprobante === 'boleta'
                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/50 border-2 border-blue-500'
                        : 'text-gray-700 border-2 border-gray-300 hover:border-blue-300 hover:bg-blue-50/50 bg-white'
                    }`}
                    onClick={() => setTipoComprobante('boleta')}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        tipoComprobante === 'boleta' ? 'bg-white/20' : 'bg-blue-100'
                      }`}>
                        <span className={`text-xs font-bold ${
                          tipoComprobante === 'boleta' ? 'text-white' : 'text-blue-600'
                        }`}>B</span>
                      </div>
                      <span>Boleta</span>
                    </div>
                    {tipoComprobante === 'boleta' && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                  <button
                    className={`relative group px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      tipoComprobante === 'factura'
                        ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/50 border-2 border-indigo-500'
                        : 'text-gray-700 border-2 border-gray-300 hover:border-indigo-300 hover:bg-indigo-50/50 bg-white'
                    }`}
                    onClick={() => setTipoComprobante('factura')}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        tipoComprobante === 'factura' ? 'bg-white/20' : 'bg-indigo-100'
                      }`}>
                        <span className={`text-xs font-bold ${
                          tipoComprobante === 'factura' ? 'text-white' : 'text-indigo-600'
                        }`}>F</span>
                      </div>
                      <span>Factura</span>
                    </div>
                    {tipoComprobante === 'factura' && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ Main Content - Layout de columna única (full-width) */}
        <div className="flex-1 overflow-hidden">
          {/* Form View - Layout mejorado con ClienteSection */}
          <div className="max-w-7xl mx-auto p-6 space-y-6 overflow-y-auto h-full">

            {/* ✅ Formulario Compacto - Todos los campos organizados */}
            <CompactDocumentForm
              serieSeleccionada={serieSeleccionada}
              setSerieSeleccionada={setSerieSeleccionada}
              seriesFiltradas={seriesFiltradas}
              moneda={currentCurrency}
              setMoneda={(value: string) => changeCurrency(value as any)}
              formaPago={formaPago}
              setFormaPago={setFormaPago}
              onNuevaFormaPago={handleNuevaFormaPago}
              onOpenFieldsConfig={() => setShowFieldsConfigModal(true)}
              onClienteChange={setClienteSeleccionadoGlobal}
              fechaEmision={fechaEmision}
              onFechaEmisionChange={setFechaEmision}
              onOptionalFieldsChange={(fields: Record<string, any>) => setOptionalFields(prev => ({ ...prev, ...fields }))}
            />

            {/* Products Section - Sin cambios */}
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
              refreshKey={productSelectorKey}
            />

            {/* Notes Section - ✅ Renderizado condicional según configuración */}
            {fieldsConfig.notesSection && (
              <NotesSection
                observaciones={observaciones}
                setObservaciones={setObservaciones}
                notaInterna={notaInterna}
                setNotaInterna={setNotaInterna}
              />
            )}

            {/* Action Buttons Section - Sin cambios */}
            <ActionButtonsSection
              onVistaPrevia={fieldsConfig.actionButtons.vistaPrevia ? handleVistaPrevia : undefined}
              onCancelar={goToComprobantes}
              onGuardarBorrador={fieldsConfig.actionButtons.guardarBorrador ? () => setShowDraftModal(true) : undefined}
              onCrearComprobante={fieldsConfig.actionButtons.crearComprobante ? () => setShowPaymentModal(true) : undefined}
              isCartEmpty={cartItems.length === 0}
              productsCount={cartItems.length}
            />
          </div>
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

        {/* ✅ Modal de configuración de campos */}
        <FieldsConfigModal
          isOpen={showFieldsConfigModal}
          onClose={() => setShowFieldsConfigModal(false)}
          config={fieldsConfig}
          onToggleNotesSection={toggleNotesSection}
          onToggleActionButton={toggleActionButton}
          onToggleOptionalField={toggleOptionalField}
          onToggleOptionalFieldRequired={toggleOptionalFieldRequired}
          onResetToDefaults={resetFieldsConfig}
        />
      </div>
    </ErrorBoundary>
  );
};

export default EmisionTradicional;
