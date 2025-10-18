import React from 'react';
import type { PreviewData } from '../models/comprobante.types';
import { useVoucherDesignConfigReader } from '../../configuracion-sistema/hooks/useVoucherDesignConfig';

interface PreviewDocumentProps {
  data: PreviewData;
  qrUrl: string;
}

export const PreviewDocument: React.FC<PreviewDocumentProps> = ({ data, qrUrl }) => {
  // Cargar configuración de diseño
  const config = useVoucherDesignConfigReader('A4');
  const {
    companyData,
    clientData,
    documentType,
    series,
    issueDate,
    currency,
    paymentMethod,
    cartItems,
    totals,
    observations
  } = data;

  const documentTitle = documentType === 'boleta' ? 'BOLETA DE VENTA ELECTRÓNICA' : 'FACTURA ELECTRÓNICA';
  const currencySymbol = currency === 'USD' ? '$' : 'S/';

  // Calcular subtotales por tipo de IGV
  const subtotalGravado = cartItems
    .filter(item => item.igvType === 'igv18')
    .reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const subtotalExonerado = cartItems
    .filter(item => item.igvType === 'exonerado')
    .reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const subtotalInafecto = cartItems
    .filter(item => item.igvType === 'inafecto')
    .reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Calcular dimensiones del logo
  const getLogoDimensions = () => {
    if (!config.logo.enabled) return null;

    if (config.logo.customWidth && config.logo.customHeight) {
      return { width: config.logo.customWidth, height: config.logo.customHeight };
    }

    const baseSizes = { small: 60, medium: 100, large: 150 };
    const baseSize = baseSizes[config.logo.size];

    const ratios = {
      square: { width: 1, height: 1 },
      vertical: { width: 2, height: 3 },
      horizontal: { width: 3, height: 2 }
    };

    const ratio = ratios[config.logo.orientation];
    return {
      width: baseSize * ratio.width / ratio.height,
      height: baseSize
    };
  };

  const logoDimensions = getLogoDimensions();

  return (
    <div className="w-full p-8 bg-white text-sm leading-relaxed print:p-4 relative">
      {/* Marca de agua */}
      {config.watermark.enabled && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
          style={{ zIndex: 0 }}
        >
          {config.watermark.type === 'text' && config.watermark.text && (
            <div
              className="text-6xl font-bold select-none"
              style={{
                opacity: config.watermark.opacity,
                color: config.watermark.color || '#e5e7eb',
                transform: `rotate(${config.watermark.rotation}deg)`,
                fontSize: config.watermark.size === 'small' ? '3rem' : config.watermark.size === 'large' ? '5rem' : '4rem'
              }}
            >
              {config.watermark.text}
            </div>
          )}
          {config.watermark.type === 'image' && config.watermark.imageUrl && (
            <img
              src={config.watermark.imageUrl}
              alt="Watermark"
              className="select-none"
              style={{
                opacity: config.watermark.opacity,
                transform: `rotate(${config.watermark.rotation}deg)`,
                maxWidth: config.watermark.size === 'small' ? '150px' : config.watermark.size === 'large' ? '350px' : '250px'
              }}
            />
          )}
        </div>
      )}

      {/* Contenido del documento */}
      <div className="relative" style={{ zIndex: 1 }}>
        {/* Header Section */}
        <div className="flex justify-between items-start mb-8">
          {/* Company Info */}
          <div className="flex-1">
            {logoDimensions && (
              <div
                className={`mb-4 ${
                  config.logo.position === 'center' ? 'mx-auto' : config.logo.position === 'right' ? 'ml-auto' : ''
                }`}
                style={{ width: 'fit-content' }}
              >
                {config.logo.url ? (
                  <img
                    src={config.logo.url}
                    alt="Logo"
                    style={{
                      width: `${logoDimensions.width}px`,
                      height: `${logoDimensions.height}px`,
                      objectFit: 'contain'
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: `${logoDimensions.width}px`,
                      height: `${logoDimensions.height}px`
                    }}
                    className="bg-gray-200 border border-gray-300 flex items-center justify-center"
                  >
                    <span className="text-xs font-semibold text-gray-600">LOGO</span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1">
              <h1 className="font-bold text-lg text-gray-900">{companyData.name}</h1>
              <p className="text-xs text-gray-700 max-w-xs leading-tight">
                {companyData.address}
              </p>
              <p className="text-xs text-gray-700">
                Telf: {companyData.phone} | E-mail: {companyData.email}
              </p>
            </div>
          </div>

        {/* Document Info Box */}
        <div className="border-2 border-gray-800 p-4 text-center min-w-[280px]">
          <div className="bg-gray-800 text-white px-3 py-1 mb-3">
            <span className="font-bold text-sm">R.U.C. {companyData.ruc}</span>
          </div>
          <h2 className="font-bold text-base mb-2 text-gray-900">{documentTitle}</h2>
          <p className="font-bold text-lg text-gray-900">{series}-</p>
        </div>
      </div>

      {/* Client and Document Details */}
      <div className="grid grid-cols-2 gap-8 mb-6">
        {/* Client Info */}
        <div>
          <h3 className="font-semibold mb-3 text-gray-900">DATOS DEL CLIENTE:</h3>
          <div className="space-y-1 text-xs">
            <p><span className="font-medium">Cliente:</span> {clientData.nombre}</p>
            <p><span className="font-medium">{clientData.tipoDocumento.toUpperCase()}:</span> {clientData.documento}</p>
            {clientData.direccion && (
              <p><span className="font-medium">Dirección:</span> {clientData.direccion}</p>
            )}
          </div>
        </div>

        {/* Document Details */}
        <div>
          <h3 className="font-semibold mb-3 text-gray-900">DATOS DEL COMPROBANTE:</h3>
          <div className="space-y-1 text-xs">
            <p><span className="font-medium">F. Emisión:</span> {issueDate}</p>
            <p><span className="font-medium">Moneda:</span> {currency === 'USD' ? 'Dólares Americanos' : 'Soles'}</p>
            <p><span className="font-medium">Forma de Pago:</span> {paymentMethod}</p>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="border border-gray-400 mb-6">
        {/* Table Header */}
        <div className="bg-gray-800 text-white grid grid-cols-12 gap-2 p-2 text-xs font-medium">
          <div className="col-span-1 text-center">CANT.</div>
          <div className="col-span-1 text-center">UND</div>
          <div className="col-span-4">DESCRIPCIÓN</div>
          <div className="col-span-2 text-center">PRECIO UNIT.</div>
          <div className="col-span-2 text-center">VALOR VENTA</div>
          <div className="col-span-2 text-center">IMPORTE</div>
        </div>

        {/* Table Body */}
        {cartItems.map((item, index) => (
          <div key={item.id} className={`grid grid-cols-12 gap-2 p-2 text-xs border-b border-gray-300 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
            <div className="col-span-1 text-center">{item.quantity}</div>
            <div className="col-span-1 text-center">{item.unidadMedida || 'UND'}</div>
            <div className="col-span-4">
              <div className="font-medium">{item.name}</div>
              {item.code && <div className="text-gray-600">Código: {item.code}</div>}
            </div>
            <div className="col-span-2 text-center">{currencySymbol} {item.price.toFixed(2)}</div>
            <div className="col-span-2 text-center">{currencySymbol} {(item.price * item.quantity / 1.18).toFixed(2)}</div>
            <div className="col-span-2 text-center font-medium">{currencySymbol} {(item.price * item.quantity).toFixed(2)}</div>
          </div>
        ))}

        {/* Empty rows for spacing */}
        {Array.from({ length: Math.max(0, 3 - cartItems.length) }).map((_, index) => (
          <div key={`empty-${index}`} className="grid grid-cols-12 gap-2 p-2 text-xs border-b border-gray-300 bg-white">
            <div className="col-span-12 h-6"></div>
          </div>
        ))}
      </div>

      {/* Totals Section */}
      <div className="flex justify-between items-start mb-8">
        {/* Left side - Additional info */}
        <div className="flex-1 pr-8">
          {observations && (
            <div className="mb-4">
              <h4 className="font-semibold text-xs mb-2">OBSERVACIONES:</h4>
              <p className="text-xs text-gray-700 leading-relaxed">{observations}</p>
            </div>
          )}
        </div>

        {/* Right side - Totals */}
        <div className="min-w-[300px]">
          <div className="border border-gray-400">
            <div className="bg-gray-100 p-2">
              <h4 className="font-semibold text-xs text-center">RESUMEN</h4>
            </div>
            
            <div className="p-3 space-y-2">
              {subtotalGravado > 0 && (
                <div className="flex justify-between text-xs">
                  <span>Op. Gravadas:</span>
                  <span className="font-medium">{currencySymbol} {subtotalGravado.toFixed(2)}</span>
                </div>
              )}
              
              {subtotalExonerado > 0 && (
                <div className="flex justify-between text-xs">
                  <span>Op. Exoneradas:</span>
                  <span className="font-medium">{currencySymbol} {subtotalExonerado.toFixed(2)}</span>
                </div>
              )}
              
              {subtotalInafecto > 0 && (
                <div className="flex justify-between text-xs">
                  <span>Op. Inafectas:</span>
                  <span className="font-medium">{currencySymbol} {subtotalInafecto.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-xs">
                <span>Descuentos:</span>
                <span className="font-medium">{currencySymbol} 0.00</span>
              </div>
              
              <div className="flex justify-between text-xs">
                <span>I.G.V. (18%):</span>
                <span className="font-medium">{currencySymbol} {totals.igv.toFixed(2)}</span>
              </div>
              
              <div className="border-t border-gray-300 pt-2">
                <div className="flex justify-between text-sm font-bold">
                  <span>IMPORTE TOTAL:</span>
                  <span>{currencySymbol} {totals.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Footer */}
        <div className="flex justify-between items-end">
          {/* QR Code */}
          <div className="text-center">
            <img
              src={qrUrl}
              alt="QR Code"
              className="w-24 h-24 border border-gray-300 mb-2"
            />
            <p className="text-xs text-gray-600 max-w-[200px] leading-tight">
              Consulta tu comprobante en<br />
              https://comprobantes.facturafacil.com/
            </p>
          </div>

          {/* Legal Text */}
          <div className="flex-1 px-8">
            <p className="text-xs text-gray-600 text-center leading-relaxed">
              Representación impresa de la {documentTitle.toLowerCase()}<br />
              Autorizado mediante Resolución de Intendencia<br />
              N° 034-005-0004615/SUNAT<br />
              Para consultar el comprobante ingresar a www.sunat.gob.pe
            </p>
          </div>

          {/* Hash */}
          <div className="text-right">
            <p className="text-xs text-gray-600">
              Resumen: {btoa(Math.random().toString()).substring(0, 8)}
            </p>
          </div>
        </div>

        {/* Footer personalizado */}
        {config.footer.enabled && config.footer.showCustomText && config.footer.customText && (
          <div
            className="mt-6 pt-4 border-t border-gray-300"
            style={{
              textAlign: config.footer.textAlignment,
              backgroundColor: config.footer.backgroundColor,
              padding: `${config.footer.padding}px 16px`
            }}
          >
            <p
              style={{
                fontSize: config.footer.fontSize === 'small' ? '11px' : config.footer.fontSize === 'large' ? '15px' : '13px',
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