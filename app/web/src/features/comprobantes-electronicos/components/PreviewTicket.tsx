import React from 'react';
import type { PreviewData } from '../models/comprobante.types';
import { useVoucherDesignConfigReader } from '../../configuracion-sistema/hooks/useVoucherDesignConfig';

interface PreviewTicketProps {
  data: PreviewData;
  qrUrl: string;
}

export const PreviewTicket: React.FC<PreviewTicketProps> = ({ data, qrUrl }) => {
  const config = useVoucherDesignConfigReader('TICKET');
  const {
    companyData,
    clientData,
    documentType,
    series,
    currency,
    paymentMethod,
    cartItems,
    totals
  } = data;

  const documentTitle = documentType === 'boleta' ? 'BOLETA DE VENTA ELECTRONICA' : 'FACTURA ELECTRONICA';
  const currencySymbol = currency === 'USD' ? '$' : 'S/';
  const currentDateTime = new Date().toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const subtotalGravado = cartItems.filter(item => item.igvType === 'igv18').reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const subtotalExonerado = cartItems.filter(item => item.igvType === 'exonerado').reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
  };

  return (
    <div className="w-full max-w-xs mx-auto bg-white p-4 font-mono text-xs leading-tight relative" style={{ fontFamily: 'Courier, monospace' }}>
      {/* Marca de agua */}
      {config.watermark.enabled && config.watermark.type === 'text' && config.watermark.text && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          <div
            className="text-4xl font-bold select-none"
            style={{
              opacity: config.watermark.opacity,
              color: config.watermark.color || '#e5e7eb',
              transform: `rotate(${config.watermark.rotation}deg)`,
              fontSize: config.watermark.size === 'small' ? '1.5rem' : config.watermark.size === 'large' ? '2.5rem' : '2rem'
            }}
          >
            {config.watermark.text}
          </div>
        </div>
      )}

      {/* Contenido */}
      <div className="relative" style={{ zIndex: 1 }}>
        {/* Header */}
        <div className="text-center mb-4 border-b border-dashed border-gray-400 pb-4">
          {/* Logo */}
          {config.logo.enabled && (
            <div className="mb-3 flex justify-center">
              {config.logo.url ? (
                <img
                  src={config.logo.url}
                  alt="Logo"
                  style={{
                    width: `${config.logo.width}px`,
                    height: `${config.logo.height}px`,
                    objectFit: 'contain'
                  }}
                />
              ) : (
                <div
                  style={{
                    width: `${config.logo.width}px`,
                    height: `${config.logo.height}px`
                  }}
                  className="bg-gray-200 border border-gray-300 flex items-center justify-center"
                >
                  <span className="text-xs font-semibold text-gray-600">LOGO</span>
                </div>
              )}
            </div>
          )}

          <h1 className="font-bold text-sm mb-1">{companyData.name}</h1>
          <p className="text-xs mb-1">RUC: {companyData.ruc}</p>
          <p className="text-xs leading-tight mb-2">{truncateText(companyData.address, 35)}</p>
          <p className="text-xs mb-2">Telf: {companyData.phone}</p>
          <p className="text-xs">E-mail: {companyData.email}</p>
        </div>

        {/* Document info */}
        <div className="text-center mb-4 border-b border-dashed border-gray-400 pb-4">
          <div className="border border-black p-2 mb-2">
            <p className="font-bold text-sm">{documentTitle}</p>
            <p className="font-bold text-lg">{series}-</p>
          </div>
          <p className="text-xs">Fecha: {currentDateTime}</p>
          <p className="text-xs">Cliente: {truncateText(clientData.nombre, 25)}</p>
          <p className="text-xs">{clientData.tipoDocumento.toUpperCase()}: {clientData.documento}</p>
          {config.documentFields.direccion.visible && (
            <p className="text-xs">{config.documentFields.direccion.label}: {clientData.direccion || 'No especificada'}</p>
          )}
          <p className="text-xs">Forma de pago: {paymentMethod}</p>
          {config.documentFields.vendedor.visible && (
            <p className="text-xs">{config.documentFields.vendedor.label}: -</p>
          )}
        </div>

        {/* Products */}
        <div className="mb-4 border-b border-dashed border-gray-400 pb-4">
          <div className="grid grid-cols-3 gap-1 text-xs font-bold mb-2">
            <span>CANT</span>
            <span>DESCRIPCION</span>
            <span className="text-right">PRECIO</span>
          </div>

          {cartItems.map((item) => (
            <div key={item.id} className="mb-2">
              <div className="grid grid-cols-3 gap-1 text-xs">
                <span>{item.quantity}</span>
                <span>{truncateText(item.name, 15)}</span>
                <span className="text-right">{currencySymbol} {item.price.toFixed(2)}</span>
              </div>
              {item.code && (
                <div className="text-xs text-gray-600">
                  <span>Código: {item.code}</span>
                </div>
              )}
              <div className="text-xs text-right">
                <span>Subtotal: {currencySymbol} {(item.price * item.quantity).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Observaciones - después de productos */}
        {config.documentFields.observaciones.visible && data.observations && (
          <div className="mb-4 pb-4 border-b border-dashed border-gray-400">
            <p className="font-bold text-xs mb-1">{config.documentFields.observaciones.label}:</p>
            <p className="text-xs">{truncateText(data.observations, 50)}</p>
          </div>
        )}

        {/* Totals */}
        <div className="mb-4 border-b border-dashed border-gray-400 pb-4">
          <div className="space-y-1 text-xs">
            {subtotalGravado > 0 && (
              <>
                <div className="flex justify-between">
                  <span>Op. Gravadas:</span>
                  <span>{currencySymbol} {(subtotalGravado / 1.18).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IGV (18%):</span>
                  <span>{currencySymbol} {(subtotalGravado - subtotalGravado / 1.18).toFixed(2)}</span>
                </div>
              </>
            )}
            {subtotalExonerado > 0 && (
              <div className="flex justify-between">
                <span>Op. Exoneradas:</span>
                <span>{currencySymbol} {subtotalExonerado.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm pt-2 border-t border-gray-400">
              <span>TOTAL:</span>
              <span>{currencySymbol} {totals.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* QR Code */}
        <div className="text-center mb-4">
          <img src={qrUrl} alt="QR Code" className="w-24 h-24 mx-auto border border-gray-300 mb-2" />
          <p className="text-xs text-gray-600 leading-tight">
            Consulta tu comprobante en<br />
            https://comprobantes.facturafacil.com/
          </p>
        </div>

        {/* Final message */}
        <div className="text-center text-xs leading-tight">
          <p>¡Gracias por su compra!</p>
          <p>Conserve este comprobante</p>
        </div>

        {/* Footer personalizado */}
        {config.footer.enabled && config.footer.showCustomText && config.footer.customText && (
          <div
            className="mt-4 pt-3 border-t border-dashed border-gray-400"
            style={{
              textAlign: config.footer.textAlignment,
              backgroundColor: config.footer.backgroundColor,
              padding: `${config.footer.padding}px 8px`
            }}
          >
            <p
              style={{
                fontSize: config.footer.fontSize === 'small' ? '10px' : config.footer.fontSize === 'large' ? '13px' : '11px',
                fontWeight: config.footer.fontWeight,
                color: config.footer.textColor || '#374151'
              }}
            >
              {config.footer.customText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
