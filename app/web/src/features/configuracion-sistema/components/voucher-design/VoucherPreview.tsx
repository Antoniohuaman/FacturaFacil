// ===================================================================
// VOUCHER PREVIEW - Vista previa en tiempo real del comprobante
// ===================================================================

import React from 'react';
import { Eye, QrCode } from 'lucide-react';
import type { VoucherDesignConfigurationExtended } from '../../models/VoucherDesignExtended';

interface VoucherPreviewProps {
  config: VoucherDesignConfigurationExtended;
  designType: 'A4' | 'TICKET';
}

export const VoucherPreview: React.FC<VoucherPreviewProps> = ({ config, designType }) => {
  const { logo, watermark, footer, documentFields, productFields } = config;

  // Calcular dimensiones del logo
  const getLogoDimensions = () => {
    if (logo.customWidth && logo.customHeight) {
      return { width: logo.customWidth, height: logo.customHeight };
    }

    const baseSizes = { small: 60, medium: 100, large: 150 };
    const baseSize = baseSizes[logo.size];

    const ratios = {
      square: { width: 1, height: 1 },
      vertical: { width: 2, height: 3 },
      horizontal: { width: 3, height: 2 }
    };

    const ratio = ratios[logo.orientation];
    return {
      width: baseSize * ratio.width / ratio.height,
      height: baseSize
    };
  };

  const logoDimensions = getLogoDimensions();

  // Calcular opacidad de la marca de agua
  const watermarkOpacity = watermark.opacity;

  // Obtener tamaño de fuente del footer
  const footerFontSizes = { small: '11px', medium: '13px', large: '15px' };
  const footerFontSize = footerFontSizes[footer.fontSize];

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 shadow-lg overflow-hidden">
      {/* Header con botón de vista completa */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-600" />
          <h4 className="font-semibold text-gray-900 text-sm">
            Vista Previa - {designType === 'A4' ? 'Formato A4' : 'Formato Ticket'}
          </h4>
        </div>
        <span className="text-xs text-gray-500">Actualización en tiempo real</span>
      </div>

      {/* Área de preview */}
      <div className="p-4 bg-gray-50">
        <div
          className={`bg-white shadow-md overflow-hidden relative ${
            designType === 'A4' ? 'aspect-[210/297]' : 'w-full'
          }`}
          style={{ maxHeight: designType === 'TICKET' ? '600px' : 'auto' }}
        >
          {/* Marca de agua */}
          {watermark.enabled && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
              style={{ zIndex: 1 }}
            >
              {watermark.type === 'text' && watermark.text && (
                <div
                  className="text-6xl font-bold select-none"
                  style={{
                    opacity: watermarkOpacity,
                    color: watermark.color || '#e5e7eb',
                    transform: `rotate(${watermark.rotation}deg)`,
                    fontSize: watermark.size === 'small' ? '3rem' : watermark.size === 'large' ? '5rem' : '4rem'
                  }}
                >
                  {watermark.text}
                </div>
              )}
              {watermark.type === 'image' && watermark.imageUrl && (
                <img
                  src={watermark.imageUrl}
                  alt="Watermark"
                  className="select-none"
                  style={{
                    opacity: watermarkOpacity,
                    transform: `rotate(${watermark.rotation}deg)`,
                    maxWidth: watermark.size === 'small' ? '150px' : watermark.size === 'large' ? '350px' : '250px',
                    maxHeight: watermark.size === 'small' ? '150px' : watermark.size === 'large' ? '350px' : '250px'
                  }}
                />
              )}
            </div>
          )}

          {/* Contenido del comprobante */}
          <div className="relative" style={{ zIndex: 2 }}>
            {/* Header del comprobante */}
            <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-start justify-between gap-4">
                {/* Logo */}
                {logo.enabled && (
                  <div
                    className={`flex-shrink-0 ${
                      logo.position === 'center' ? 'mx-auto' : logo.position === 'right' ? 'ml-auto' : ''
                    }`}
                  >
                    {logo.url ? (
                      <img
                        src={logo.url}
                        alt="Logo"
                        style={{
                          width: `${logoDimensions.width}px`,
                          height: `${logoDimensions.height}px`,
                          objectFit: 'contain'
                        }}
                        className="bg-white bg-opacity-20 rounded-lg p-2"
                      />
                    ) : (
                      <div
                        style={{
                          width: `${logoDimensions.width}px`,
                          height: `${logoDimensions.height}px`
                        }}
                        className="bg-white bg-opacity-20 rounded-lg flex items-center justify-center"
                      >
                        <span className="text-xs text-white opacity-75">LOGO</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Info del comprobante */}
                <div className="flex-1 text-right">
                  <h2 className="text-lg font-bold">
                    {designType === 'A4' ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA'}
                  </h2>
                  <p className="text-sm opacity-90 mt-1">RUC: 20123456789</p>
                  <p className="text-sm opacity-90">F001-00000123</p>
                </div>
              </div>
            </div>

            {/* Información de la empresa */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <p className="font-semibold text-sm text-gray-900">MI EMPRESA S.A.C.</p>
              <p className="text-xs text-gray-600 mt-1">Jr. Los Ejemplos 123, Lima, Lima</p>
              <p className="text-xs text-gray-600">Teléfono: +51 987 654 321</p>
            </div>

            {/* Datos del cliente y comprobante */}
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-semibold text-gray-700">Cliente:</p>
                  <p className="text-gray-900">Juan Pérez García</p>
                  <p className="text-gray-600">DNI: 12345678</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-600">Fecha: 25/10/2025</p>
                  <p className="text-gray-600">Hora: 14:30</p>
                </div>
              </div>

              {/* Campos adicionales del documento */}
              {(documentFields.direccion.visible || documentFields.observaciones.visible) && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
                  {documentFields.direccion.visible && (
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">{documentFields.direccion.label}:</span> Av. Example 456, Lima
                    </p>
                  )}
                  {documentFields.observaciones.visible && (
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">{documentFields.observaciones.label}:</span> Entrega inmediata
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Tabla de productos */}
            <div className="px-4 py-3">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Header de la tabla */}
                <div className="bg-gray-100 border-b border-gray-200">
                  <div className="grid gap-2 px-3 py-2 text-xs font-semibold text-gray-700" style={{
                    gridTemplateColumns: `${productFields.descripcion.visible ? 'minmax(150px, 1fr)' : ''} ${
                      productFields.cantidad.visible ? '60px' : ''
                    } ${productFields.precioUnitario.visible ? '80px' : ''} ${
                      productFields.total.visible ? '80px' : ''
                    }`
                  }}>
                    {productFields.descripcion.visible && <span>{productFields.descripcion.label}</span>}
                    {productFields.cantidad.visible && <span className="text-center">{productFields.cantidad.label}</span>}
                    {productFields.precioUnitario.visible && <span className="text-right">{productFields.precioUnitario.label}</span>}
                    {productFields.total.visible && <span className="text-right">{productFields.total.label}</span>}
                  </div>
                </div>

                {/* Productos */}
                <div className="divide-y divide-gray-200">
                  <div className="grid gap-2 px-3 py-2 text-xs" style={{
                    gridTemplateColumns: `${productFields.descripcion.visible ? 'minmax(150px, 1fr)' : ''} ${
                      productFields.cantidad.visible ? '60px' : ''
                    } ${productFields.precioUnitario.visible ? '80px' : ''} ${
                      productFields.total.visible ? '80px' : ''
                    }`
                  }}>
                    {productFields.descripcion.visible && <span className="text-gray-900">Producto Ejemplo</span>}
                    {productFields.cantidad.visible && <span className="text-center text-gray-900">2</span>}
                    {productFields.precioUnitario.visible && <span className="text-right text-gray-900">S/ 50.00</span>}
                    {productFields.total.visible && <span className="text-right text-gray-900 font-medium">S/ 100.00</span>}
                  </div>
                </div>

                {/* Totales */}
                <div className="bg-gray-50 border-t-2 border-gray-300 px-3 py-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-700">TOTAL:</span>
                    <span className="text-sm font-bold text-gray-900">S/ 100.00</span>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="mt-3 flex justify-center">
                <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center">
                  <QrCode className="w-16 h-16 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Footer */}
            {footer.enabled && (
              <div
                className="px-4 py-3 border-t border-gray-200"
                style={{
                  backgroundColor: footer.backgroundColor || '#f9fafb',
                  textAlign: footer.textAlignment,
                  padding: `${footer.padding}px 16px`
                }}
              >
                {footer.showCustomText && footer.customText && (
                  <p
                    className="text-gray-700"
                    style={{
                      fontSize: footerFontSize,
                      fontWeight: footer.fontWeight,
                      color: footer.textColor || '#374151'
                    }}
                  >
                    {footer.customText}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Representación impresa de comprobante electrónico
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  © 2025 FacturaFácil
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info adicional */}
      <div className="px-4 py-2 bg-blue-50 border-t border-blue-100">
        <p className="text-xs text-blue-700 flex items-center gap-2">
          <Eye className="w-3 h-3" />
          Los cambios se reflejan automáticamente en la vista previa
        </p>
      </div>
    </div>
  );
};
