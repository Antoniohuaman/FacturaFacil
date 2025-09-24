import { useState } from 'react';
import { useCaja } from '../../control-caja/store/CajaContext';
import { useNavigate } from 'react-router-dom';
import type { Currency } from '../models/comprobante.types';
import { AVAILABLE_PRODUCTS } from '../models/constants';

// Importar hooks customizados
import { useCart } from '../hooks/useCart';
import { usePayment } from '../hooks/usePayment';
import { useCurrency } from '../hooks/useCurrency';
import { useDrafts } from '../hooks/useDrafts';
import { useDocumentType } from '../hooks/useDocumentType';
import { usePreview } from '../hooks/usePreview';

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
import { DraftModal } from '../components/DraftModal';
import { PaymentModal } from '../components/PaymentModal';
import { PreviewModal } from '../components/PreviewModal';
import ActionButtonsSection from '../components/ActionButtonsSection';

const NuevoComprobante = () => {
  // Use custom hooks
  const { cartItems, addToCart, removeFromCart, updateCartQuantity, updateCartItem, addProductsFromSelector, clearCart } = useCart();
  const { calculateTotals, showPaymentModal, setShowPaymentModal } = usePayment();
  const { currentCurrency, changeCurrency } = useCurrency();
  const { showDraftModal, setShowDraftModal, showDraftToast, setShowDraftToast, handleSaveDraft, handleDraftModalSave, draftAction, setDraftAction, draftExpiryDate, setDraftExpiryDate } = useDrafts();
  const { tipoComprobante, setTipoComprobante, serieSeleccionada, setSerieSeleccionada, seriesFiltradas } = useDocumentType();
  const { openPreview, showPreview, closePreview } = usePreview();

  // UI state
  const [viewMode, setViewMode] = useState<'form' | 'pos'>('form');
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [observaciones, setObservaciones] = useState('');
  const [notaInterna, setNotaInterna] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [moneda, setMoneda] = useState<Currency>('PEN');
  const [formaPago, setFormaPago] = useState('contado');
  
  // Navigation
  const navigate = useNavigate();
  const { status: cajaStatus } = useCaja();

  // Available products (now using centralized constants)
  const availableProducts = AVAILABLE_PRODUCTS;

  // Calculate totals
  const totals = calculateTotals(cartItems);

  // Handlers para vista previa
  const handleVistaPrevia = () => {
    if (cartItems.length === 0) {
      // Mostrar toast de error - aquí podrías agregar tu sistema de toast
      console.log('Debe agregar al menos un producto');
      return;
    }
    openPreview();
  };

  // Convertir forma de pago a formato para mostrar
  const getPaymentMethodLabel = (formaPago: string) => {
    const paymentMethods: { [key: string]: string } = {
      'contado': 'CONTADO',
      'deposito': 'DEPÓSITO EN CUENTA',
      'efectivo': 'EFECTIVO',
      'plin': 'PLIN',
      'tarjeta': 'TARJETA',
      'transferencia': 'TRANSFERENCIA',
      'yape': 'YAPE'
    };
    return paymentMethods[formaPago] || 'CONTADO';
  };

  const handleCrearComprobante = () => {
    // Tu lógica existente para crear comprobante
    console.log('Crear comprobante:', {
      tipo: tipoComprobante,
      serie: serieSeleccionada,
      productos: cartItems,
      totales: totals
    });
    // Aquí normalmente harías la llamada a la API y luego navegarías
    // navigate('/comprobantes');
  };

  const handleConfirmSale = () => {
    if (cajaStatus === 'cerrada') {
      alert('No se puede vender: la caja está cerrada.');
      return;
    }
    setShowPaymentModal(true);
  };

  return (
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
                onCancelar={() => navigate('/comprobantes')}
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
              moneda={moneda}
              setMoneda={(value: string) => setMoneda(value as Currency)}
              formaPago={formaPago}
              setFormaPago={setFormaPago}
            />
          </>
        )}
      </div>

      {/* Toast Component */}
      <Toast 
        show={showDraftToast}
        message="Borrador guardado exitosamente"
        onClose={() => setShowDraftToast(false)}
      />

      {/* Draft Modal Component */}
      <DraftModal 
        show={showDraftModal}
        onClose={() => setShowDraftModal(false)}
        onSave={() => handleSaveDraft({
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
          console.log('Payment completed');
          setShowPaymentModal(false);
          navigate('/comprobantes');
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
        currency={moneda}
        observations={observaciones}
        internalNotes={notaInterna}
        onCreateDocument={handleCrearComprobante}
      />
    </div>
  );
};

export default NuevoComprobante;