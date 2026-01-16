// ===================================================================
// SIDE PREVIEW PANE - COMPONENTE
// Panel lateral para previsualización en tiempo real
// ===================================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, GripVertical, CheckCircle, Save, AlertCircle, FileText, Receipt } from 'lucide-react';
import type { SidePreviewPaneProps } from './types';
import { PreviewDocument } from '../ui/PreviewDocument';
import { PreviewTicket } from '../ui/PreviewTicket';
import { usePreview } from '../../hooks/usePreview';
import type { PreviewData, PreviewFormat } from '../../models/comprobante.types';

export const SidePreviewPane: React.FC<SidePreviewPaneProps> = ({
  isOpen,
  onClose,
  width,
  onWidthChange,
  viewModel,
  hasMinimumData,
  validationErrors = [],
  onConfirm,
  onSaveDraft,
  isProcessing = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [debouncedViewModel, setDebouncedViewModel] = useState(viewModel);
  const [format, setFormat] = useState<PreviewFormat>('a4'); // Estado para A4 o Ticket
  const paneRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  
  // ✅ Usar el hook de preview para generar datos con la MISMA lógica que el modal
  const { generatePreviewData, generateQRUrl } = usePreview();

  // Toggle entre A4 y Ticket
  const toggleFormat = () => {
    setFormat(prev => prev === 'a4' ? 'ticket' : 'a4');
  };
  
  // Debounce del view model (150ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedViewModel(viewModel);
    }, 150);
    
    return () => clearTimeout(timer);
  }, [viewModel]);

  // Manejo del splitter
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      onWidthChange(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onWidthChange]);

  // Manejo de teclado (Alt + flechas, Esc, Enter)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc: cerrar panel
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Alt + flechas: ajustar ancho
      if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        const step = 40;
        const newWidth = e.key === 'ArrowLeft' ? width - step : width + step;
        onWidthChange(newWidth);
        return;
      }

      // Enter: confirmar (solo si foco en footer)
      if (e.key === 'Enter' && document.activeElement?.closest('[data-preview-footer]')) {
        e.preventDefault();
        if (!isProcessing && hasMinimumData && validationErrors.length === 0) {
          onConfirm();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, width, onWidthChange, onClose, onConfirm, isProcessing, hasMinimumData, validationErrors]);

  // Focus management al abrir/cerrar
  useEffect(() => {
    if (isOpen && headerRef.current) {
      headerRef.current.focus();
    }
  }, [isOpen]);

  // ✅ Generar PreviewData usando la MISMA lógica que el modal de vista previa
  // SIEMPRE genera datos para mostrar la estructura, incluso sin información del usuario
  const previewData: PreviewData | null = useMemo(() => {
    if (!debouncedViewModel) return null;

    // Construir clientData desde el viewModel (o valores por defecto)
    const clientData = debouncedViewModel.client ? {
      nombre: debouncedViewModel.client,
      documento: debouncedViewModel.clientDoc || '00000000',
      tipoDocumento: 'dni' as const,
      direccion: debouncedViewModel.optionalFields?.direccion || 'Dirección no especificada',
      email: debouncedViewModel.optionalFields?.correo
    } : undefined;

    return generatePreviewData(
      debouncedViewModel.cartItems || [], // Array vacío si no hay items
      debouncedViewModel.tipoComprobante as 'boleta' | 'factura',
      debouncedViewModel.serieSeleccionada || '', // Vacío si no hay serie
      debouncedViewModel.totals || { subtotal: 0, igv: 0, total: 0, descuentos: 0, recargos: 0 },
      debouncedViewModel.formaPago || 'CONTADO',
      debouncedViewModel.currency as 'PEN' | 'USD',
      debouncedViewModel.observaciones,
      debouncedViewModel.notaInterna,
      clientData,
      debouncedViewModel.creditTerms
    );
  }, [debouncedViewModel, generatePreviewData]);

  const documentTitle = debouncedViewModel.tipoComprobante === 'factura' 
    ? 'Factura' 
    : 'Boleta';

  if (!isOpen) return null;

  return (
    <>
      {/* Splitter - Barra de redimensionamiento estilo Darwin */}
      <div
        className="w-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-blue-400 dark:hover:bg-blue-500 cursor-col-resize transition-colors flex-shrink-0 relative group"
        onMouseDown={handleMouseDown}
        role="separator"
        aria-label="Ajustar ancho del panel"
        title="Arrastra para ajustar el ancho"
      >
        {/* Indicador visual del splitter */}
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 bg-gray-300 dark:bg-gray-600 group-hover:bg-blue-500 dark:group-hover:bg-blue-400 transition-colors" />
        
        {/* Icono grip visible en hover */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-blue-500 dark:bg-blue-400 rounded px-0.5 py-1 shadow-lg">
            <GripVertical className="w-3 h-3 text-white" />
          </div>
        </div>
      </div>

      {/* Panel - Sin position fixed, relativo al flex container */}
      <div
        ref={paneRef}
        className="bg-white dark:bg-gray-800 flex flex-col border-r border-gray-200 dark:border-gray-700 h-full overflow-hidden"
        style={{ 
          width: `${width}px`,
          minWidth: '360px',
          maxWidth: '720px',
          flexShrink: 0
        }}
      >
        {/* Header - Fijo en la parte superior del panel */}
        <div
          ref={headerRef}
          className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 border-b border-blue-700 flex items-center justify-between"
          tabIndex={-1}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{documentTitle}</h3>
              <p className="text-xs text-blue-100">{debouncedViewModel.serieSeleccionada || 'Sin serie'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Toggle A4/Ticket */}
            <button
              onClick={toggleFormat}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-xs font-medium text-white"
              title={format === 'a4' ? 'Cambiar a Ticket' : 'Cambiar a A4'}
            >
              {format === 'a4' ? (
                <>
                  <FileText className="w-4 h-4" />
                  A4
                </>
              ) : (
                <>
                  <Receipt className="w-4 h-4" />
                  Ticket
                </>
              )}
            </button>
            
            {/* Botón cerrar */}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Cerrar vista previa"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Body Scrollable - IMPORTANTE: flex-1 hace que tome todo el espacio disponible */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900" style={{ minHeight: 0 }}>
          <div className="p-6">
          {/* Errores de validación */}
          {validationErrors.length > 0 && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2">
                    Errores de validación ({validationErrors.length})
                  </h4>
                  <ul className="text-xs text-red-800 dark:text-red-200 space-y-1">
                    {validationErrors.map((error, idx) => (
                      <li key={idx}>
                        <strong>{error.field}:</strong> {error.message}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Preview - SIEMPRE visible, muestra estructura del comprobante */}
          {previewData && (
            <div className="w-full">
              {format === 'a4' ? (
                <div 
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden mx-auto"
                  style={{ maxWidth: '100%' }}
                >
                  <PreviewDocument
                    data={previewData}
                    qrUrl={generateQRUrl(previewData)}
                  />
                </div>
              ) : (
                <div 
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden mx-auto"
                  style={{ maxWidth: '302px' }}
                >
                  <PreviewTicket
                    data={previewData}
                    qrUrl={generateQRUrl(previewData)}
                  />
                </div>
              )}
            </div>
          )}
          </div>
        </div>

        {/* Footer - Fijo en la parte inferior del panel */}
        <div
          className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4"
          data-preview-footer
        >
          <div className="flex items-center gap-3">
            <button
              onClick={onSaveDraft}
              disabled={isProcessing || !hasMinimumData}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Guardar borrador
            </button>
            <button
              onClick={onConfirm}
              disabled={isProcessing || !hasMinimumData || validationErrors.length > 0}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {isProcessing ? 'Procesando...' : 'Confirmar / Emitir'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
