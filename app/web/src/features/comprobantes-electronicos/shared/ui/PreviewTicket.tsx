import React, { useMemo } from 'react';
import type { PreviewData } from '../../models/comprobante.types';
import { useVoucherDesignConfigReader } from '../../../configuracion-sistema/hooks/useVoucherDesignConfig';
import type { VoucherDesignTicketConfig } from '../../../configuracion-sistema/models/VoucherDesignUnified';

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
    totals,
    observations,
    creditTerms,
  } = data;

  const documentTitle = documentType === 'boleta' ? 'BOLETA DE VENTA ELECTRÓNICA' : 'FACTURA ELECTRÓNICA';
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

  const productFields = config.productFields as VoucherDesignTicketConfig['productFields'];

  const descriptionMaxLength = productFields.descripcion?.maxLength ?? 30;

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? `${text.substring(0, maxLength - 3)}...` : text;
  };

  const amountInWords = useMemo(() => {
    // TODO: reutilizar utilidad genérica de importe en letras si existe
    try {
      // Búsqueda dinámica opcional de función global (mantener sin dependencia fuerte)
      const anyWindow = window as unknown as { formatAmountInWords?: (amount: number, currency: string) => string };
      if (typeof anyWindow.formatAmountInWords === 'function') {
        return anyWindow.formatAmountInWords(totals.total, currency);
      }
    } catch {
      // ignore
    }

    const integerPart = Math.floor(totals.total);
    const cents = Math.round((totals.total - integerPart) * 100);
    const centsStr = cents.toString().padStart(2, '0');
    const currencyLabel = currency === 'USD' ? 'DÓLARES' : 'SOLES';

    return `Son: ${integerPart.toFixed(0)} CON ${centsStr}/100 ${currencyLabel}`;
  }, [totals.total, currency]);

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
        <div className="mb-4 border-b border-dashed border-gray-400 pb-4 text-left">
          <div className="border border-black p-2 mb-2 text-center">
            <p className="font-bold text-sm">{documentTitle}</p>
            <p className="font-bold text-lg">{series}-</p>
          </div>

          <div className="space-y-0.5 text-xs">
            <p><span className="font-semibold">Cliente:</span> {truncateText(clientData.nombre, 32)}</p>
            <p><span className="font-semibold">{clientData.tipoDocumento.toUpperCase()}:</span> {clientData.documento}</p>
            <p><span className="font-semibold">Forma de pago:</span> {paymentMethod}</p>
            {config.documentFields.establecimiento.visible && (
              <p><span className="font-semibold">{config.documentFields.establecimiento.label}:</span> Principal</p>
            )}
            {config.documentFields.direccion.visible && (
              <p><span className="font-semibold">{config.documentFields.direccion.label}:</span> {clientData.direccion || 'No especificada'}</p>
            )}
            {config.documentFields.direccionEnvio.visible && (
              <p><span className="font-semibold">{config.documentFields.direccionEnvio.label}:</span> {clientData.direccion || 'No especificada'}</p>
            )}
            {config.documentFields.correoElectronico.visible && (
              <p><span className="font-semibold">{config.documentFields.correoElectronico.label}:</span> {clientData.email || '-'}</p>
            )}
            {config.documentFields.ordenCompra.visible && (
              <p><span className="font-semibold">{config.documentFields.ordenCompra.label}:</span> -</p>
            )}
            {config.documentFields.guiaRemision.visible && (
              <p><span className="font-semibold">{config.documentFields.guiaRemision.label}:</span> -</p>
            )}
            {config.documentFields.centroCosto.visible && (
              <p><span className="font-semibold">{config.documentFields.centroCosto.label}:</span> -</p>
            )}
            {config.documentFields.fechaVencimiento.visible && (
              <p><span className="font-semibold">{config.documentFields.fechaVencimiento.label}:</span> {currentDateTime.split(' ')[0]}</p>
            )}
            {config.documentFields.vendedor.visible && (
              <p><span className="font-semibold">{config.documentFields.vendedor.label}:</span> -</p>
            )}
          </div>
        </div>

        {/* Products */}
        <div className="mb-4 border-b border-dashed border-gray-400 pb-4">
          <div className="grid grid-cols-[auto_auto_auto_auto_auto_auto_auto] gap-x-1 text-xs font-bold mb-2">
            {productFields.numero.visible && <span className="text-left">N°</span>}
            {productFields.codigo.visible && <span className="text-left">CÓD.</span>}
            {productFields.descripcion.visible && <span className="flex-1 text-left">DESC.</span>}
            {productFields.cantidad.visible && <span className="text-right">CANT</span>}
            {productFields.precioUnitario.visible && <span className="text-right">P.UNIT</span>}
            {productFields.descuento.visible && <span className="text-right">DSCTO.</span>}
            {productFields.total.visible && <span className="text-right">TOTAL</span>}
          </div>

          {cartItems.map((item, index) => {
            const lineTotal = item.price * item.quantity;
            const discountValue = 0; // TODO: mapear al modelo real de descuento por ítem

            return (
              <div key={item.id} className="mb-2 text-xs">
                <div className="grid grid-cols-[auto_auto_auto_auto_auto_auto_auto] gap-x-1 items-start">
                  {productFields.numero.visible && (
                    <span className="text-left">{index + 1}</span>
                  )}
                  {productFields.codigo.visible && (
                    <span className="text-left truncate max-w-[48px]">{item.code || '-'}</span>
                  )}
                  {productFields.descripcion.visible && (
                    <span className="flex-1 break-words">
                      {truncateText(item.name, descriptionMaxLength)}
                    </span>
                  )}
                  {productFields.cantidad.visible && (
                    <span className="text-right whitespace-nowrap">{item.quantity}</span>
                  )}
                  {productFields.precioUnitario.visible && (
                    <span className="text-right whitespace-nowrap">{currencySymbol} {item.price.toFixed(2)}</span>
                  )}
                  {productFields.descuento.visible && (
                    <span className="text-right whitespace-nowrap">{currencySymbol} {discountValue.toFixed(2)}</span>
                  )}
                  {productFields.total.visible && (
                    <span className="text-right whitespace-nowrap">{currencySymbol} {lineTotal.toFixed(2)}</span>
                  )}
                </div>

                {(productFields.marca.visible || productFields.codigoBarras.visible) && (
                  <div className="mt-0.5 text-[10px] text-gray-600">
                    {productFields.marca.visible && item.marca && (
                      <span>Marca: {truncateText(item.marca, 16)} </span>
                    )}
                    {productFields.codigoBarras.visible && item.codigoBarras && (
                      <span>
                        {productFields.marca.visible && item.marca ? ' / ' : ''}
                        C.Barras: {truncateText(item.codigoBarras, 16)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Observaciones - después de productos */}
        {config.documentFields.observaciones.visible && observations && (
          <div className="mb-4 pb-4 border-b border-dashed border-gray-400">
            <p className="font-bold text-xs mb-1">{config.documentFields.observaciones.label}:</p>
            <p className="text-xs">{truncateText(observations, 50)}</p>
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

        {creditTerms && creditTerms.schedule.length > 0 && (
          <div className="mb-4 border-b border-dashed border-gray-400 pb-4">
            <p className="font-bold text-xs mb-2">Cronograma de cuotas</p>
            <div className="space-y-1">
              {creditTerms.schedule.slice(0, 4).map((cuota) => (
                <div key={cuota.numeroCuota} className="flex items-center justify-between text-xs">
                  <span># {cuota.numeroCuota} • {cuota.fechaVencimiento}</span>
                  <span>{cuota.porcentaje}% / {currencySymbol} {cuota.importe.toFixed(2)}</span>
                </div>
              ))}
            </div>
            {creditTerms.schedule.length > 4 && (
              <p className="mt-1 text-[10px] text-gray-500">+{creditTerms.schedule.length - 4} cuota(s) adicionales</p>
            )}
            <p className="mt-2 text-[11px] text-gray-600">Vence: {creditTerms.fechaVencimientoGlobal}</p>
          </div>
        )}

        {/* Importe en letras */}
        <div className="mb-3 text-xs">
          <p className="font-semibold break-words">{amountInWords}</p>
        </div>

        {/* QR Code y bloque legal */}
        <div className="text-center mb-4">
          <img src={qrUrl} alt="QR Code" className="w-24 h-24 mx-auto border border-gray-300 mb-2" />
          <div className="text-xs text-gray-600 leading-tight">
            <p>Representación impresa de la {documentTitle.toLowerCase()}</p>
            <p>Consulta tu comprobante en nuestra web</p>
            <p>{(config as unknown as VoucherDesignTicketConfig).metadata?.consultationUrl ?? 'https://comprobantes.facturafacil.com/'}</p>
            <p>Fecha de impresión: {currentDateTime}</p>
          </div>
        </div>

        {/* Final message configurable */}
        <div className="text-center text-xs leading-tight">
          <p>{(config as unknown as VoucherDesignTicketConfig).metadata?.thankYouMessage ?? '¡Gracias por su compra!'}</p>
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
