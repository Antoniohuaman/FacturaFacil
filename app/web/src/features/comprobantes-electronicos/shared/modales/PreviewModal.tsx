import React from 'react';
import { X, Download, Printer, FileText, Receipt, Eye } from 'lucide-react';
import { PreviewDocument } from '../ui/PreviewDocument';
import { PreviewTicket } from '../ui/PreviewTicket';
import { usePreview } from '../../hooks/usePreview';
import type { CartItem, TipoComprobante, PaymentTotals, Currency } from '../../models/comprobante.types';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  documentType: TipoComprobante;
  series: string;
  totals: PaymentTotals;
  paymentMethod?: string;
  currency?: Currency;
  observations?: string;
  internalNotes?: string;
  onCreateDocument?: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  documentType,
  series,
  totals,
  paymentMethod = "CONTADO",
  currency = "PEN",
  observations,
  internalNotes,
  onCreateDocument
}) => {
  const {
    format,
    toggleFormat,
    generatePreviewData,
    generateQRUrl
  } = usePreview();

  if (!isOpen) return null;

  const previewData = generatePreviewData(
    cartItems,
    documentType,
    series,
    totals,
    paymentMethod,
    currency,
    observations,
    internalNotes
  );

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // En producción, aquí generarías el PDF
    console.log('Descargar comprobante:', previewData);
  };

  const handleCreateDocument = () => {
    if (onCreateDocument) {
      onCreateDocument();
    }
    onClose();
  };

  const formatLabels = {
    a4: 'Formato A4',
    ticket: 'Formato Ticket'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Vista Previa del Comprobante</h2>
                <p className="text-sm text-gray-600">
                  {documentType === 'boleta' ? 'Boleta' : 'Factura'} {series}-
                </p>
              </div>
            </div>

            {/* Format Toggle */}
            <div className="flex items-center gap-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => format === 'ticket' && toggleFormat()}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    format === 'a4'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  A4
                </button>
                <button
                  onClick={() => format === 'a4' && toggleFormat()}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    format === 'ticket'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Receipt className="h-4 w-4" />
                  Ticket
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden bg-gray-50">
            <div className="h-full overflow-y-auto">
              <div className="min-h-full flex items-center justify-center p-6">
                <div className={`
                  bg-white rounded-lg shadow-lg transition-all duration-300
                  ${format === 'a4' ? 'w-[21cm] min-h-[29.7cm]' : 'w-80'}
                `}>
                  {format === 'a4' ? (
                    <PreviewDocument 
                      data={previewData}
                      qrUrl={generateQRUrl(previewData)}
                    />
                  ) : (
                    <PreviewTicket 
                      data={previewData}
                      qrUrl={generateQRUrl(previewData)}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{formatLabels[format]}</span> • 
                <span className="ml-1">{cartItems.length} producto{cartItems.length !== 1 ? 's' : ''}</span> • 
                <span className="ml-1">Total: S/ {totals.total.toFixed(2)}</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors duration-200"
                >
                  <Download className="h-4 w-4" />
                  Descargar
                </button>

                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors duration-200"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir
                </button>

                <button
                  onClick={handleCreateDocument}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 shadow-lg hover:shadow-xl"
                >
                  <FileText className="h-4 w-4" />
                  Crear Comprobante
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};