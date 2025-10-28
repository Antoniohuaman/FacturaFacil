// ===================================================================
// FORMULARIO DE NOTA DE VENTA - INDEPENDIENTE
// Mismo diseño visual que EmisionTradicional, lógica propia
// ===================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Check, Settings } from 'lucide-react';

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

// Contextos
import { useDocumentoContext } from '../contexts/DocumentosContext';

const FormularioNotaVenta = () => {
  const navigate = useNavigate();
  const { addDocumento } = useDocumentoContext();

  // UI State
  const [showFieldsConfigModal, setShowFieldsConfigModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastNotaVenta, setLastNotaVenta] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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

  // Serie de nota de venta - obtener de configuración
  const seriesNotaVenta = [
    { serie: 'NV-001', descripcion: 'Serie Principal Notas de Venta' },
    { serie: 'NV-002', descripcion: 'Serie Secundaria' }
  ];
  const [serieSeleccionada, setSerieSeleccionada] = useState<string>(
    seriesNotaVenta[0]?.serie || ''
  );

  // Calcular totales
  const totals = calculateTotals(cartItems);

  // Validación para crear nota de venta
  const canProcess =
    clienteSeleccionado !== null &&
    serieSeleccionada !== '' &&
    cartItems.length > 0;

  // Handler para crear nota de venta
  const handleCrearNotaVenta = async () => {
    if (!canProcess) return;

    setIsProcessing(true);

    try {
      // Generar número correlativo
      const numeroCorrelativo = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
      const numeroNotaVenta = `${serieSeleccionada}-${numeroCorrelativo}`;

      const nuevaNotaVenta = {
        id: numeroNotaVenta,
        type: 'Nota de Venta',
        clientDoc: clienteSeleccionado!.dni,
        client: clienteSeleccionado!.nombre,
        date: new Date().toLocaleDateString('es-PE', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }),
        vendor: 'Javier Masías Loza', // TODO: Usuario actual
        total: totals.total,
        status: 'Pendiente',
        statusColor: 'orange' as const,
        currency: currentCurrency,
        paymentMethod: formaPago,
        email: clienteSeleccionado?.email,
        validUntil: fechaVencimiento,
        address: clienteSeleccionado?.direccion,
        observations: observaciones,
        internalNote: notaInterna,
        items: cartItems,
        ...optionalFields,
      };

      // Guardar en contexto
      addDocumento(nuevaNotaVenta);

      setLastNotaVenta(nuevaNotaVenta);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error al crear nota de venta:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setClienteSeleccionado(null);
    setFechaEmision(new Date().toISOString().split('T')[0]);
    setFechaVencimiento('');
    setObservaciones('');
    setNotaInterna('');
    setFormaPago('Efectivo');
    setOptionalFields({});
    clearCart();
  };

  const goBack = () => {
    navigate('/documentos-negociacion');
  };

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
        {/* Header */}
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
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    Nueva Nota de Venta
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Complete los datos del documento
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFieldsConfigModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-300 dark:border-gray-600"
              >
                <Settings className="w-4 h-4" />
                Configuración Campos
              </button>

              <button
                onClick={handleCrearNotaVenta}
                disabled={!canProcess || isProcessing}
                className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-sm hover:shadow-md"
              >
                <Check className="w-5 h-5" />
                {isProcessing ? 'Creando...' : 'Crear Nota de Venta'}
              </button>
            </div>
          </div>
        </div>

        {/* Contenido Principal con Scroll */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6 space-y-6">
            {/* Formulario de Información del Documento */}
            <CompactDocumentForm
              clienteSeleccionado={clienteSeleccionado || undefined}
              onClienteChange={setClienteSeleccionado}
              serieSeleccionada={serieSeleccionada}
              setSerieSeleccionada={setSerieSeleccionada}
              seriesFiltradas={seriesNotaVenta.map(s => s.serie)}
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

        {/* Modal de Éxito */}
        {showSuccessModal && lastNotaVenta && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
              {/* Icono de éxito */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  ¡Nota de Venta Creada!
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Nota de Venta{' '}
                  <span className="font-semibold text-purple-600 dark:text-purple-400">
                    {lastNotaVenta.id}
                  </span>{' '}
                  creada exitosamente
                </p>
              </div>

              {/* Acciones rápidas */}
              <div className="space-y-3 mb-6">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors">
                  <span>📧</span>
                  Enviar por Correo
                </button>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors">
                  <span>🖨️</span>
                  Imprimir
                </button>
              </div>

              {/* Botones de navegación */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Nueva Nota de Venta
                </button>
                <button
                  onClick={goBack}
                  className="flex-1 px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
                >
                  Ver Lista
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default FormularioNotaVenta;
