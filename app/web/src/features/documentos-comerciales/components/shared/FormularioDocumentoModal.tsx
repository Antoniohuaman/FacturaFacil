// ===================================================================
// FORMULARIO DOCUMENTO MODAL
// Reutiliza el formulario completo de EmisionTradicional para documentos
// ===================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import type { TipoComprobante } from '../../../comprobantes-electronicos/models/comprobante.types';
import { useCurrentEstablishmentId, useCurrentCompanyId } from '../../../../contexts/UserSessionContext';
import { useConfigurationContext } from '../../../configuracion-sistema/context/ConfigurationContext';

// Importar hooks del módulo de comprobantes
import { useCart } from '../../../comprobantes-electronicos/hooks/useCart';
import { usePayment } from '../../../comprobantes-electronicos/hooks/usePayment';
import { useCurrency } from '../../../comprobantes-electronicos/hooks/useCurrency';
import { useComprobanteState } from '../../../comprobantes-electronicos/hooks/useComprobanteState';
import { useFieldsConfiguration } from '../../../comprobantes-electronicos/hooks/useFieldsConfiguration';
import { usePreview } from '../../../comprobantes-electronicos/hooks/usePreview';

// Importar componentes del módulo de comprobantes
import ProductsSection from '../../../comprobantes-electronicos/components/ProductsSection';
import DocumentInfoCard from '../../../comprobantes-electronicos/components/DocumentInfoCard';
import ClienteSection from '../../../comprobantes-electronicos/components/ClienteSection';
import NotesSection from '../../../comprobantes-electronicos/components/NotesSection';
import ActionButtonsSection from '../../../comprobantes-electronicos/components/ActionButtonsSection';
import { PreviewModal } from '../../../comprobantes-electronicos/components/PreviewModal';
import FieldsConfigModal from '../../../comprobantes-electronicos/components/FieldsConfigModal';
import { ErrorBoundary } from '../../../comprobantes-electronicos/components/ErrorBoundary';

interface FormularioDocumentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  tipo: 'COTIZACION' | 'NOTA_VENTA';
  documentoEditar?: any; // Documento existente para editar
  onSave: (data: any) => Promise<void>;
}

export const FormularioDocumentoModal: React.FC<FormularioDocumentoModalProps> = ({
  isOpen,
  onClose,
  tipo,
  documentoEditar,
  onSave
}) => {
  const [productSelectorKey] = useState(0);
  const [showFieldsConfigModal, setShowFieldsConfigModal] = useState(false);

  // Obtener establecimiento y empresa del usuario actual
  const currentEstablishmentId = useCurrentEstablishmentId();
  const currentCompanyId = useCurrentCompanyId();
  const { state: configState } = useConfigurationContext();

  // Usar los mismos hooks que EmisionTradicional
  const { cartItems, removeFromCart, updateCartItem, addProductsFromSelector, clearCart } = useCart();
  const { calculateTotals } = usePayment();
  const { currentCurrency, changeCurrency } = useCurrency();
  const { openPreview, showPreview, closePreview } = usePreview();

  // Estado para el tipo de documento (cotización o nota de venta)
  const [tipoDocumento] = useState<'cotizacion' | 'nota-venta'>(
    tipo === 'COTIZACION' ? 'cotizacion' : 'nota-venta'
  );

  // Obtener series disponibles para el establecimiento actual
  // Filtrar SOLO las series que corresponden al tipo de documento
  const seriesFiltradas = useMemo(() => {
    if (!configState.company || !configState.company.ruc) {
      return [];
    }

    // Determinar qué categoría de documento buscar según el tipo
    const targetCategory = tipo === 'COTIZACION' ? 'QUOTATION' : 'SALES_NOTE';

    return configState.series
      .filter(s => {
        const isActive = s.isActive && s.status === 'ACTIVE';
        const belongsToEstablishment = !currentEstablishmentId || s.establishmentId === currentEstablishmentId;

        // Detectar si es el tipo correcto de serie (por categoría, código o nombre)
        const matchesCategory = s.documentType.category === targetCategory;
        const matchesByCode = tipo === 'COTIZACION'
          ? (s.documentType.code === 'COT' || s.series.startsWith('COT'))
          : (s.documentType.code === 'NV' || s.series.startsWith('NV'));
        const matchesByName = tipo === 'COTIZACION'
          ? s.documentType.name.toLowerCase().includes('cotiz')
          : s.documentType.name.toLowerCase().includes('nota de venta');

        const isCorrectType = matchesCategory || matchesByCode || matchesByName;

        return isActive && belongsToEstablishment && isCorrectType;
      })
      .map(s => s.series);
  }, [configState.series, configState.company, currentEstablishmentId, tipo]);

  // Serie seleccionada - usar la primera disponible
  const [serieSeleccionada, setSerieSeleccionada] = useState(() => {
    return seriesFiltradas.length > 0 ? seriesFiltradas[0] : '';
  });

  // Actualizar serie seleccionada cuando cambien las series filtradas
  useEffect(() => {
    if (seriesFiltradas.length > 0 && !seriesFiltradas.includes(serieSeleccionada)) {
      setSerieSeleccionada(seriesFiltradas[0]);
    }
  }, [seriesFiltradas, serieSeleccionada]);

  const {
    observaciones, setObservaciones,
    notaInterna, setNotaInterna,
    formaPago, setFormaPago,
    getPaymentMethodLabel
  } = useComprobanteState();

  const {
    config: fieldsConfig,
    toggleNotesSection,
    toggleActionButton,
    toggleOptionalField,
    toggleOptionalFieldRequired,
    resetToDefaults: resetFieldsConfig
  } = useFieldsConfiguration();

  const totals = calculateTotals(cartItems);

  // Cargar datos si es edición
  useEffect(() => {
    if (documentoEditar && isOpen) {
      // TODO: Cargar los items del documento al carrito
      // clearCart();
      // documentoEditar.items.forEach(item => addProductsFromSelector(...));
      setObservaciones(documentoEditar.observaciones || '');
      setNotaInterna(documentoEditar.notaInterna || '');
    }
  }, [documentoEditar, isOpen]);

  // Resetear al cerrar
  const handleClose = () => {
    clearCart();
    setObservaciones('');
    setNotaInterna('');
    onClose();
  };

  // Handler para vista previa
  const handleVistaPrevia = () => {
    if (cartItems.length === 0) {
      alert('Debe agregar al menos un producto para ver la vista previa');
      return;
    }
    openPreview();
  };

  const handleGuardar = async () => {
    try {
      const data = {
        tipo: tipoDocumento,
        serie: serieSeleccionada,
        items: cartItems,
        totals,
        observaciones,
        notaInterna,
        formaPago,
        moneda: currentCurrency,
        // Incluir IDs de establecimiento y empresa
        establishmentId: currentEstablishmentId,
        companyId: currentCompanyId
      };

      await onSave(data);
      handleClose();
    } catch (error) {
      console.error('Error al guardar documento:', error);
    }
  };

  if (!isOpen) return null;

  const tituloModal = tipo === 'COTIZACION'
    ? (documentoEditar ? 'Editar Cotización' : 'Nueva Cotización')
    : (documentoEditar ? 'Editar Nota de Venta' : 'Nueva Nota de Venta');

  return (
    <ErrorBoundary>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-hidden">
        {/* Modal */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-7xl my-8">
              {/* Header del Modal */}
              <div className="sticky top-0 z-10 bg-white border-b border-gray-200 rounded-t-xl px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{tituloModal}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Complete la información del {tipo === 'COTIZACION' ? 'cotización' : 'nota de venta'}
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Contenido del formulario - Igual que EmisionTradicional */}
              <div className="p-6 space-y-6 max-h-[calc(100vh-250px)] overflow-y-auto">
                {/* Document Info Card */}
                <DocumentInfoCard
                  serieSeleccionada={serieSeleccionada}
                  setSerieSeleccionada={setSerieSeleccionada}
                  seriesFiltradas={seriesFiltradas}
                  showOptionalFields={false}
                  setShowOptionalFields={() => {}}
                  moneda={currentCurrency}
                  setMoneda={(value: string) => changeCurrency(value as any)}
                  formaPago={formaPago}
                  setFormaPago={setFormaPago}
                  onNuevaFormaPago={() => {}}
                  onOpenFieldsConfig={() => setShowFieldsConfigModal(true)}
                />

                {/* Cliente Section */}
                <ClienteSection />

                {/* Products Section */}
                <ProductsSection
                  cartItems={cartItems}
                  addProductsFromSelector={addProductsFromSelector}
                  updateCartItem={updateCartItem}
                  removeFromCart={removeFromCart}
                  totals={totals}
                  showDraftModal={false}
                  setShowDraftModal={() => {}}
                  showDraftToast={false}
                  setShowDraftToast={() => {}}
                  draftExpiryDate=""
                  setDraftExpiryDate={() => {}}
                  draftAction="borradores"
                  setDraftAction={() => {}}
                  handleDraftModalSave={() => {}}
                  tipoComprobante={tipoDocumento as TipoComprobante}
                  serieSeleccionada={serieSeleccionada}
                  clearCart={clearCart}
                  refreshKey={productSelectorKey}
                />

                {/* Notes Section */}
                {fieldsConfig.notesSection && (
                  <NotesSection
                    observaciones={observaciones}
                    setObservaciones={setObservaciones}
                    notaInterna={notaInterna}
                    setNotaInterna={setNotaInterna}
                  />
                )}

                {/* Action Buttons Section - Igual que EmisionTradicional */}
                <ActionButtonsSection
                  onVistaPrevia={fieldsConfig.actionButtons.vistaPrevia ? handleVistaPrevia : undefined}
                  onCancelar={handleClose}
                  onGuardarBorrador={undefined} // No guardar borradores en documentos
                  onCrearComprobante={fieldsConfig.actionButtons.crearComprobante ? handleGuardar : undefined}
                  isCartEmpty={cartItems.length === 0}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Vista Previa */}
        <PreviewModal
          isOpen={showPreview}
          onClose={closePreview}
          cartItems={cartItems}
          documentType={tipoDocumento as TipoComprobante}
          series={serieSeleccionada}
          totals={totals}
          paymentMethod={getPaymentMethodLabel(formaPago)}
          currency={currentCurrency}
          observations={observaciones}
          internalNotes={notaInterna}
        />

        {/* Modal de configuración de campos */}
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
