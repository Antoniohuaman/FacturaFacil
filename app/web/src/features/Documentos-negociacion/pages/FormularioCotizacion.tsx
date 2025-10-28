// ===================================================================
// FORMULARIO DE COTIZACIÓN - INDEPENDIENTE
// Series dinámicas desde configuración + Guardar borrador + Toasts
// ===================================================================

import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, FileText, Check, Settings, Save } from 'lucide-react';

// Hooks reutilizables del sistema de comprobantes (solo para UI, no lógica)
import { useCart } from '../../comprobantes-electronicos/punto-venta/hooks/useCart';
import { usePayment } from '../../comprobantes-electronicos/shared/form-core/hooks/usePayment';
import { useCurrency } from '../../comprobantes-electronicos/shared/form-core/hooks/useCurrency';
import { useFieldsConfiguration } from '../../comprobantes-electronicos/shared/form-core/contexts/FieldsConfigurationContext';

// Componentes UI reutilizables
import CompactDocumentForm from '../../comprobantes-electronicos/shared/form-core/components/CompactDocumentForm';
import NotesSection from '../../comprobantes-electronicos/shared/form-core/components/NotesSection';
import FieldsConfigModal from '../../comprobantes-electronicos/shared/form-core/components/FieldsConfigModal';
import { ErrorBoundary } from '../../comprobantes-electronicos/shared/ui/ErrorBoundary';
import { DocumentoProductsSection } from '../components/DocumentoProductsSection';
import { Toast } from '../../comprobantes-electronicos/shared/ui/Toast/Toast';

// Contextos
import { useDocumentoContext } from '../contexts/DocumentosContext';
import { useConfigurationContext } from '../../configuracion-sistema/context/ConfigurationContext';
import { useCurrentEstablishmentId } from '../../../contexts/UserSessionContext';

const FormularioCotizacion = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addDocumento, updateDocumento } = useDocumentoContext();
  const { state: configState } = useConfigurationContext();
  const currentEstablishmentId = useCurrentEstablishmentId();

  // Detectar modo edición
  const documentoToEdit = location.state?.documento;
  const isEditMode = !!documentoToEdit;

  // UI State
  const [showFieldsConfigModal, setShowFieldsConfigModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');

  // Hooks del sistema de comprobantes (solo para UI)
  const { cartItems, removeFromCart, updateCartItem, addProductsFromSelector, clearCart } = useCart();
  const { calculateTotals } = usePayment();
  const { currentCurrency, changeCurrency } = useCurrency();
  const {
    config: fieldsConfig,
    toggleNotesSection,
    toggleOptionalField,
    toggleOptionalFieldRequired,
    resetToDefaults: resetFieldsConfig,
  } = useFieldsConfiguration();

  // Estados del formulario
  const [clienteSeleccionado, setClienteSeleccionado] = useState<{
    nombre: string;
    dni: string;
    direccion: string;
    email?: string;
  } | null>(null);
  
  const [fechaEmision, setFechaEmision] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [fechaVencimiento, setFechaVencimiento] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [notaInterna, setNotaInterna] = useState<string>('');
  const [formaPago, setFormaPago] = useState<string>('Efectivo');
  const [optionalFields, setOptionalFields] = useState<Record<string, any>>({});

  // ===================================================================
  // SERIES DINÁMICAS DESDE CONFIGURACIÓN
  // ===================================================================

  /**
   * Obtener series de cotización desde configuración
   * Filtradas por establecimiento actual
   */
  const seriesCotizacion = useMemo(() => {
    if (!configState.series || configState.series.length === 0) {
      return [];
    }

    return configState.series
      .filter(s => {
        const isActive = s.isActive && s.status === 'ACTIVE';
        // Filtrar por tipo de documento: Cotización (code: 'COT' o category: 'QUOTATION')
        const isCotizacion = 
          s.documentType.code === 'COT' || 
          s.documentType.category === 'QUOTATION' ||
          s.documentType.name.toLowerCase().includes('cotización');
        // Filtrar por establecimiento actual
        const belongsToEstablishment = !currentEstablishmentId || s.establishmentId === currentEstablishmentId;
        
        return isActive && isCotizacion && belongsToEstablishment;
      })
      .map(s => s.series);
  }, [configState.series, currentEstablishmentId]);

  const [serieSeleccionada, setSerieSeleccionada] = useState<string>(
    seriesCotizacion[0] || ''
  );

  // Actualizar serie seleccionada cuando cambien las series disponibles
  useMemo(() => {
    if (seriesCotizacion.length > 0 && !serieSeleccionada) {
      setSerieSeleccionada(seriesCotizacion[0]);
    }
  }, [seriesCotizacion, serieSeleccionada]);

  // Calcular totales
  const totals = calculateTotals(cartItems);

  // Validación para crear cotización
  const canProcess =
    clienteSeleccionado !== null &&
    serieSeleccionada !== '' &&
    cartItems.length > 0;

  // ===================================================================
  // FUNCIÓN PARA GENERAR CORRELATIVO
  // ===================================================================
  
  const generarCorrelativo = (serie: string): string => {
    // Buscar la configuración de serie para obtener el correlativo actual
    const serieConfig = configState.series.find(s => s.series === serie);
    
    if (serieConfig) {
      const nextNumber = serieConfig.correlativeNumber + 1;
      const minDigits = serieConfig.configuration.minimumDigits || 4;
      return String(nextNumber).padStart(minDigits, '0');
    }
    
    // Fallback: generar número aleatorio
    return String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  };

  // ===================================================================
  // CARGAR DATOS EN MODO EDICIÓN
  // ===================================================================

  useEffect(() => {
    if (isEditMode && documentoToEdit) {
      // Cargar cliente
      if (documentoToEdit.client && documentoToEdit.clientDoc) {
        setClienteSeleccionado({
          nombre: documentoToEdit.client,
          dni: documentoToEdit.clientDoc,
          direccion: documentoToEdit.address || '',
          email: documentoToEdit.email || ''
        });
      }

      // Cargar items al carrito
      if (documentoToEdit.items && documentoToEdit.items.length > 0) {
        // Limpiar carrito primero
        clearCart();
        // Cargar productos
        const products = documentoToEdit.items.map((item: any) => ({
          product: {
            id: item.id || item.codigo || `PROD-${Date.now()}`,
            name: item.name || item.descripcion,
            description: item.descripcion || '',
            price: item.price || item.precioUnitario,
            unit: item.unit || item.unidad || 'UND',
            stock: 9999,
            category: '',
            taxType: item.taxType || item.tipoImpuesto || 'IGV'
          },
          quantity: item.quantity || item.cantidad || 1
        }));
        
        products.forEach((p: any) => addProductsFromSelector([p]));
      }

      // Cargar otros campos
      setFechaVencimiento(documentoToEdit.validUntil || '');
      setObservaciones(documentoToEdit.observations || '');
      setNotaInterna(documentoToEdit.internalNote || '');
      setFormaPago(documentoToEdit.paymentMethod || 'Efectivo');
      
      if (documentoToEdit.currency) {
        changeCurrency(documentoToEdit.currency);
      }

      // Campos opcionales
      if (documentoToEdit.ordenCompra || documentoToEdit.guiaRemision || documentoToEdit.centroCosto || documentoToEdit.direccionEnvio) {
        setOptionalFields({
          ordenCompra: documentoToEdit.ordenCompra || '',
          guiaRemision: documentoToEdit.guiaRemision || '',
          centroCosto: documentoToEdit.centroCosto || '',
          direccionEnvio: documentoToEdit.direccionEnvio || ''
        });
      }
    }
  }, [isEditMode, documentoToEdit]);

  // ===================================================================
  // GUARDAR BORRADOR
  // ===================================================================

  const handleGuardarBorrador = () => {
    if (!clienteSeleccionado || cartItems.length === 0) {
      setToastMessage('Debe seleccionar un cliente y agregar al menos un producto');
      setToastType('warning');
      setShowToast(true);
      return;
    }

    try {
      let numeroDocumento: string;
      
      if (isEditMode && documentoToEdit) {
        // Modo edición: mantener el mismo ID
        numeroDocumento = documentoToEdit.id;
      } else {
        // Modo creación: generar nuevo número
        const numeroCorrelativo = generarCorrelativo(serieSeleccionada);
        numeroDocumento = `${serieSeleccionada}-${numeroCorrelativo}`;
      }

      const documentoData = {
        id: numeroDocumento,
        type: 'Cotización' as const,
        clientDoc: clienteSeleccionado.dni,
        client: clienteSeleccionado.nombre,
        date: new Date().toLocaleDateString('es-PE', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }),
        vendor: 'Javier Masías Loza', // TODO: Usuario actual
        total: totals.total,
        status: 'Borrador' as const,
        statusColor: 'gray' as const,
        currency: currentCurrency,
        paymentMethod: formaPago,
        email: clienteSeleccionado?.email,
        validUntil: fechaVencimiento,
        address: clienteSeleccionado?.direccion,
        observations: observaciones,
        internalNote: notaInterna,
        items: cartItems,
        isDraft: true,
        ...optionalFields,
        // Auditoría
        editedDate: isEditMode ? new Date().toISOString() : undefined,
        editedBy: isEditMode ? 'Javier Masías Loza' : undefined, // TODO: Usuario actual
        createdDate: isEditMode && documentoToEdit.createdDate ? documentoToEdit.createdDate : new Date().toISOString(),
        createdBy: isEditMode && documentoToEdit.createdBy ? documentoToEdit.createdBy : 'Javier Masías Loza',
        // Mantener correlación si existe
        relatedDocumentId: isEditMode && documentoToEdit.relatedDocumentId ? documentoToEdit.relatedDocumentId : undefined,
        relatedDocumentType: isEditMode && documentoToEdit.relatedDocumentType ? documentoToEdit.relatedDocumentType : undefined,
      };

      // Guardar o actualizar en contexto
      if (isEditMode) {
        updateDocumento(documentoData);
        setToastMessage(`Cotización ${numeroDocumento} actualizada exitosamente`);
      } else {
        addDocumento(documentoData);
        setToastMessage(`Borrador ${numeroDocumento} guardado exitosamente`);
      }
      
      setToastType('success');
      setShowToast(true);

      // Volver al listado después de 1.5 segundos
      setTimeout(() => {
        navigate('/documentos-negociacion');
      }, 1500);
    } catch (error) {
      console.error('Error al guardar borrador:', error);
      setToastMessage('Error al guardar el borrador');
      setToastType('error');
      setShowToast(true);
    }
  };

  // ===================================================================
  // CREAR COTIZACIÓN
  // ===================================================================

  const handleCrearCotizacion = async () => {
    if (!canProcess) {
      setToastMessage('Complete todos los campos requeridos');
      setToastType('warning');
      setShowToast(true);
      return;
    }

    setIsProcessing(true);

    try {
      let numeroDocumento: string;
      
      if (isEditMode && documentoToEdit) {
        // Modo edición: mantener el mismo ID
        numeroDocumento = documentoToEdit.id;
      } else {
        // Modo creación: generar nuevo número
        const numeroCorrelativo = generarCorrelativo(serieSeleccionada);
        numeroDocumento = `${serieSeleccionada}-${numeroCorrelativo}`;
      }

      const cotizacionData = {
        id: numeroDocumento,
        type: 'Cotización' as const,
        clientDoc: clienteSeleccionado!.dni,
        client: clienteSeleccionado!.nombre,
        date: new Date().toLocaleDateString('es-PE', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }),
        vendor: 'Javier Masías Loza', // TODO: Usuario actual
        total: totals.total,
        status: (isEditMode && documentoToEdit.status === 'Convertido') ? 'Convertido' as const : 'Pendiente' as const,
        statusColor: (isEditMode && documentoToEdit.status === 'Convertido') ? 'green' as const : 'orange' as const,
        currency: currentCurrency,
        paymentMethod: formaPago,
        email: clienteSeleccionado?.email,
        validUntil: fechaVencimiento,
        address: clienteSeleccionado?.direccion,
        observations: observaciones,
        internalNote: notaInterna,
        items: cartItems,
        isDraft: false,
        ...optionalFields,
        // Auditoría
        editedDate: isEditMode ? new Date().toISOString() : undefined,
        editedBy: isEditMode ? 'Javier Masías Loza' : undefined, // TODO: Usuario actual
        createdDate: isEditMode && documentoToEdit.createdDate ? documentoToEdit.createdDate : new Date().toISOString(),
        createdBy: isEditMode && documentoToEdit.createdBy ? documentoToEdit.createdBy : 'Javier Masías Loza',
        // Mantener correlación si existe
        relatedDocumentId: isEditMode && documentoToEdit.relatedDocumentId ? documentoToEdit.relatedDocumentId : undefined,
        relatedDocumentType: isEditMode && documentoToEdit.relatedDocumentType ? documentoToEdit.relatedDocumentType : undefined,
        convertedToInvoice: isEditMode && documentoToEdit.convertedToInvoice ? documentoToEdit.convertedToInvoice : undefined,
        convertedDate: isEditMode && documentoToEdit.convertedDate ? documentoToEdit.convertedDate : undefined,
      };

      // Guardar o actualizar en contexto
      if (isEditMode) {
        updateDocumento(cotizacionData);
        setToastMessage(`Cotización ${numeroDocumento} actualizada exitosamente`);
      } else {
        addDocumento(cotizacionData);
        setToastMessage(`Cotización ${numeroDocumento} creada exitosamente`);
      }
      
      setToastType('success');
      setShowToast(true);

      // Volver al listado después de 1.5 segundos
      setTimeout(() => {
        navigate('/documentos-negociacion');
      }, 1500);
    } catch (error) {
      console.error('Error al crear cotización:', error);
      setToastMessage('Error al crear la cotización');
      setToastType('error');
      setShowToast(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const goBack = () => {
    navigate('/documentos-negociacion');
  };

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
        {/* Header Simplificado */}
        <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={goBack}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Volver a lista"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    {isEditMode ? 'Editar Cotización' : 'Nueva Cotización'}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Complete los datos del documento
                  </p>
                </div>
              </div>
            </div>

            {/* Solo el icono de configuración */}
            <button
              onClick={() => setShowFieldsConfigModal(true)}
              className="p-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Configurar campos"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido Principal con Scroll */}
        <div className="flex-1 overflow-y-auto pb-24">
          <div className="max-w-7xl mx-auto p-6 space-y-6">
            {/* Formulario de Información del Documento */}
            <CompactDocumentForm
              clienteSeleccionado={clienteSeleccionado || undefined}
              onClienteChange={setClienteSeleccionado}
              serieSeleccionada={serieSeleccionada}
              setSerieSeleccionada={setSerieSeleccionada}
              seriesFiltradas={seriesCotizacion}
              moneda={currentCurrency}
              setMoneda={(currency) => changeCurrency(currency as 'PEN' | 'USD')}
              formaPago={formaPago}
              setFormaPago={setFormaPago}
              fechaEmision={fechaEmision}
              onFechaEmisionChange={setFechaEmision}
              onOptionalFieldsChange={setOptionalFields}
              onNuevaFormaPago={() => {}}
            />

            {/* Sección de Productos */}
            <DocumentoProductsSection
              cartItems={cartItems}
              removeFromCart={removeFromCart}
              updateCartItem={updateCartItem}
              addProductsFromSelector={addProductsFromSelector}
              totals={totals}
            />

            {/* Sección de Notas (Observaciones) */}
            <NotesSection
              observaciones={observaciones}
              setObservaciones={setObservaciones}
              notaInterna={notaInterna}
              setNotaInterna={setNotaInterna}
            />
          </div>
        </div>

        {/* Modal de Configuración de Campos */}
        {showFieldsConfigModal && (
          <FieldsConfigModal
            isOpen={showFieldsConfigModal}
            config={fieldsConfig}
            onClose={() => setShowFieldsConfigModal(false)}
            onToggleNotesSection={toggleNotesSection}
            onToggleActionButton={() => {}}
            onToggleOptionalField={toggleOptionalField}
            onToggleOptionalFieldRequired={toggleOptionalFieldRequired}
            onResetToDefaults={resetFieldsConfig}
          />
        )}

        {/* Footer con Botones de Acción */}
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 z-10">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {cartItems.length > 0 && (
                <span>
                  <span className="font-medium text-gray-900 dark:text-white">{cartItems.length}</span> producto(s) • Total: <span className="font-semibold text-gray-900 dark:text-white">S/ {totals.total.toFixed(2)}</span>
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleGuardarBorrador}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-300 dark:border-gray-600"
              >
                <Save className="w-4 h-4" />
                Guardar Borrador
              </button>

              <button
                onClick={handleCrearCotizacion}
                disabled={!canProcess || isProcessing}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-sm"
              >
                <Check className="w-4 h-4" />
                {isProcessing ? (isEditMode ? 'Actualizando...' : 'Creando...') : (isEditMode ? 'Actualizar Cotización' : 'Crear Cotización')}
              </button>
            </div>
          </div>
        </div>

        {/* Toast de Notificaciones */}
        <Toast
          show={showToast}
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
          position="bottom-right"
        />
      </div>
    </ErrorBoundary>
  );
};

export default FormularioCotizacion;
