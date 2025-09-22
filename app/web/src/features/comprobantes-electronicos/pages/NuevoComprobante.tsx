import { useState } from 'react';
import { useCaja } from '../../control-caja/store/CajaContext';
import { useNavigate } from 'react-router-dom';

// Importar hooks customizados
import { useCart } from '../hooks/useCart';
import { usePayment } from '../hooks/usePayment';
import { useDrafts } from '../hooks/useDrafts';
import { useDocumentType } from '../hooks/useDocumentType';

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

const NuevoComprobante = () => {
  // Use custom hooks
  const { cartItems, addToCart, removeFromCart, updateCartQuantity, updateCartItem, addProductsFromSelector, clearCart } = useCart();
  const { calculateTotals, showPaymentModal, setShowPaymentModal } = usePayment();
  const { showDraftModal, setShowDraftModal, showDraftToast, setShowDraftToast, handleSaveDraft, handleDraftModalSave, draftAction, setDraftAction, draftExpiryDate, setDraftExpiryDate } = useDrafts();
  const { tipoComprobante, setTipoComprobante, serieSeleccionada, setSerieSeleccionada, seriesFiltradas } = useDocumentType();

  // UI state
  const [viewMode, setViewMode] = useState<'form' | 'pos'>('form');
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [observaciones, setObservaciones] = useState('');
  const [notaInterna, setNotaInterna] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  
  // Navigation
  const navigate = useNavigate();
  const { status: cajaStatus } = useCaja();

  // Available products (mock data - should come from API)
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

  // Calculate totals
  const totals = calculateTotals(cartItems);

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
              onRemoveFromCart={removeFromCart}
              onUpdateQuantity={updateCartQuantity}
              onConfirmSale={handleConfirmSale}
              onClearCart={clearCart}
              onGoToForm={() => setViewMode('form')}
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
              navigate={navigate}
            />
              {/* Notes Section Component */}
              <NotesSection 
                observaciones={observaciones}
                setObservaciones={setObservaciones}
                notaInterna={notaInterna}
                setNotaInterna={setNotaInterna}
              />
            </div>

            {/* Payment Methods Section Component */}
            <PaymentMethodsSection 
              tipoComprobante={tipoComprobante}
              setTipoComprobante={setTipoComprobante}
              totals={totals}
              receivedAmount={receivedAmount}
              setReceivedAmount={setReceivedAmount}
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
        show={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        cartItems={cartItems}
        totals={totals}
        tipoComprobante={tipoComprobante}
        onTipoComprobanteChange={setTipoComprobante}
        onPaymentComplete={(data) => {
          console.log('Payment completed:', data);
          setShowPaymentModal(false);
          navigate('/comprobantes');
        }}
        onGoToForm={() => {
          setShowPaymentModal(false);
          setViewMode('form');
        }}
      />
    </div>
  );
};

export default NuevoComprobante;