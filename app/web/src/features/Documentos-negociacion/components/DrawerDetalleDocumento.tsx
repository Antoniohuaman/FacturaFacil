/**
 * Drawer de Detalle de Documento
 * Panel lateral para mostrar información completa de cotizaciones y notas de venta
 * Solo lectura con acciones: Editar y Generar Comprobante
 */

import { X, FileText, User, Calendar, DollarSign, Package, Link as LinkIcon, AlertCircle, CheckCircle2, Edit2, FileCheck } from 'lucide-react';
import type { Documento } from '../models/documento.types';
import { formatDateShortSpanish } from '../utils/dateUtils';

interface DrawerDetalleDocumentoProps {
  isOpen: boolean;
  onClose: () => void;
  documento: Documento | null;
  onEdit?: (documento: Documento) => void;
  onGenerateComprobante?: (documento: Documento) => void;
}

export const DrawerDetalleDocumento = ({
  isOpen,
  onClose,
  documento,
  onEdit,
  onGenerateComprobante
}: DrawerDetalleDocumentoProps) => {
  if (!isOpen || !documento) return null;

  // Validar si puede generar comprobante
  const canGenerateComprobante = !documento.relatedDocumentId && documento.status !== 'Anulado';

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pendiente': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'Aprobada': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'Convertido': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'Anulado': return <X className="w-4 h-4 text-red-500" />;
      case 'Borrador': return <FileText className="w-4 h-4 text-gray-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {documento.type} {documento.id}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Detalle del documento
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Estado y Referencias */}
          <div className="space-y-4">
            {/* Estado */}
            <div className="flex items-center gap-2">
              {getStatusIcon(documento.status)}
              <span className={`text-sm font-medium ${
                documento.status === 'Aprobada' || documento.status === 'Convertido' ? 'text-green-600 dark:text-green-400' :
                documento.status === 'Pendiente' ? 'text-orange-600 dark:text-orange-400' :
                documento.status === 'Anulado' ? 'text-red-600 dark:text-red-400' :
                'text-gray-600 dark:text-gray-400'
              }`}>
                {documento.status}
              </span>
              {documento.isDraft && (
                <span className="ml-2 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                  Borrador
                </span>
              )}
            </div>

            {/* Referencias / Correlación */}
            {documento.relatedDocumentId && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <LinkIcon className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">
                      Referencias
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-green-700 dark:text-green-300">
                        Convertido a:
                      </span>
                      <button className="inline-flex items-center gap-1 px-3 py-1 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 rounded-md hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors">
                        <FileCheck className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-green-700 dark:text-green-300">
                          {documento.relatedDocumentType} {documento.relatedDocumentId}
                        </span>
                      </button>
                    </div>
                    {documento.convertedDate && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                        Convertido el {formatDateShortSpanish(documento.convertedDate)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Información del Cliente */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium mb-3">
              <User className="w-4 h-4" />
              <span>Información del Cliente</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Cliente</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                  {documento.client}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">N° Documento</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                  {documento.clientDoc}
                </p>
              </div>
              {documento.email && (
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Email</label>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                    {documento.email}
                  </p>
                </div>
              )}
              {documento.address && (
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400">Dirección</label>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                    {documento.address}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Información del Documento */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium mb-3">
              <Calendar className="w-4 h-4" />
              <span>Información del Documento</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Fecha de Emisión</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                  {documento.date}
                </p>
              </div>
              {documento.validUntil && (
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Válido Hasta</label>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                    {documento.validUntil}
                  </p>
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Vendedor</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                  {documento.vendor}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Forma de Pago</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                  {documento.paymentMethod}
                </p>
              </div>
            </div>
          </div>

          {/* Items/Productos */}
          {documento.items && documento.items.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium mb-4">
                <Package className="w-4 h-4" />
                <span>Productos</span>
              </div>
              
              <div className="space-y-2">
                {documento.items.map((item: any, index: number) => (
                  <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.name || item.descripcion}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Cantidad: {item.quantity || item.cantidad} × S/ {(item.price || item.precioUnitario).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        S/ {((item.quantity || item.cantidad) * (item.price || item.precioUnitario)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Totales */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-medium mb-3">
              <DollarSign className="w-4 h-4" />
              <span>Totales</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Moneda:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {documento.currency || 'PEN'}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-blue-200 dark:border-blue-800">
                <span className="font-semibold text-gray-900 dark:text-white">Total:</span>
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  S/ {documento.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Observaciones */}
          {(documento.observations || documento.internalNote) && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
              {documento.observations && (
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Observaciones</label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {documento.observations}
                  </p>
                </div>
              )}
              {documento.internalNote && (
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Nota Interna</label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {documento.internalNote}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer con Acciones */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex gap-3">
            {/* Botón Editar */}
            {onEdit && documento.status !== 'Anulado' && (
              <button
                onClick={() => onEdit(documento)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                <Edit2 className="w-4 h-4" />
                Editar
              </button>
            )}
            
            {/* Botón Generar Comprobante */}
            {onGenerateComprobante && (
              <button
                onClick={() => canGenerateComprobante && onGenerateComprobante(documento)}
                disabled={!canGenerateComprobante}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                  canGenerateComprobante
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
                title={!canGenerateComprobante ? 
                  documento.relatedDocumentId 
                    ? 'Ya convertido a comprobante' 
                    : 'Documento anulado' 
                  : undefined}
              >
                <FileCheck className="w-4 h-4" />
                {documento.relatedDocumentId ? 'Ya Convertido' : 'Generar Comprobante'}
              </button>
            )}
          </div>
          
          {!canGenerateComprobante && documento.relatedDocumentId && (
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
              Este documento ya fue convertido a {documento.relatedDocumentType}
            </p>
          )}
          {!canGenerateComprobante && documento.status === 'Anulado' && (
            <p className="text-xs text-center text-red-500 dark:text-red-400 mt-2">
              No se puede generar comprobante de un documento anulado
            </p>
          )}
        </div>
      </div>
    </>
  );
};
