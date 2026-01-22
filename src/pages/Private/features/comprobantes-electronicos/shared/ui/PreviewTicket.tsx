import React, { useMemo } from 'react';
import type { PreviewData } from '../../models/comprobante.types';
import { useVoucherDesignConfigReader } from '../../../configuracion-sistema/hooks/useConfiguracionDisenoComprobante';
import type { VoucherDesignTicketConfig } from '../../../configuracion-sistema/modelos/VoucherDesignUnified';
import { formatMoney } from '@/shared/currency';
import { useCurrentEstablecimiento } from '@/contexts/UserSessionContext';
import { TaxBreakdownSummary } from './TaxBreakdownSummary';

interface PreviewTicketProps {
  data: PreviewData;
  qrUrl: string;
}

export const PreviewTicket: React.FC<PreviewTicketProps> = ({ data, qrUrl }) => {
  const config = useVoucherDesignConfigReader('TICKET');
  const currentEstablecimiento = useCurrentEstablecimiento();

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
  const formatCurrencyValue = (value: number) => formatMoney(value ?? 0, currency);
  const currentDateTime = new Date().toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const taxBreakdown = totals.taxBreakdown ?? [];

  const productFields = config.productFields as VoucherDesignTicketConfig['productFields'];
  const descriptionMaxLength = productFields.descripcion?.maxLength ?? 30;

  const EstablecimientoNameFromData = (data as unknown as { EstablecimientoName?: string }).EstablecimientoName;
  const rawEstablecimientoName =
    EstablecimientoNameFromData || currentEstablecimiento?.nombreEstablecimiento || '';
  const EstablecimientoName = rawEstablecimientoName.trim();
  const shouldShowEstablecimiento = Boolean(config.documentFields.establecimiento.visible && EstablecimientoName);

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? `${text.substring(0, maxLength - 3)}...` : text;
  };

  const amountInWords = useMemo(() => {
    // Conversión básica de número a letras en castellano
    const integerPart = Math.floor(totals.total);
    const cents = Math.round((totals.total - integerPart) * 100);
    const centsStr = cents.toString().padStart(2, '0');
    const currencyLabel = currency === 'USD' ? 'DÓLARES' : 'SOLES';

    return `Son: ${integerPart.toFixed(0)} CON ${centsStr}/100 ${currencyLabel}`;
  }, [totals.total, currency]);

  return (
    <div className="w-full max-w-xs mx-auto bg-white p-4 font-mono text-xs leading-tight relative" style={{ fontFamily: 'Courier, monospace' }}>
      {/* Marca de agua - soporte para texto e imagen */}
      {config.watermark.enabled && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          {config.watermark.type === 'text' && config.watermark.text && (
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
          )}
          {config.watermark.type === 'image' && config.watermark.imageUrl && (
            <img
              src={config.watermark.imageUrl}
              alt="Watermark"
              className="select-none"
              style={{
                opacity: config.watermark.opacity,
                transform: `rotate(${config.watermark.rotation}deg)`,
                maxWidth: config.watermark.size === 'small' ? '80px' : config.watermark.size === 'large' ? '160px' : '120px',
                maxHeight: config.watermark.size === 'small' ? '80px' : config.watermark.size === 'large' ? '160px' : '120px'
              }}
            />
          )}
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
            {/* Serie sin correlativo - solo muestra la serie */}
            <p className="font-bold text-lg">{series}-</p>
          </div>

          <div className="space-y-0.5 text-xs">
            <p><span className="font-semibold">Cliente:</span> {truncateText(clientData.nombre, 32)}</p>
            <p><span className="font-semibold">{clientData.tipoDocumento.toUpperCase()}:</span> {clientData.documento}</p>
            <p><span className="font-semibold">Forma de pago:</span> {paymentMethod}</p>
            {shouldShowEstablecimiento && (
              <p><span className="font-semibold">{config.documentFields.establecimiento.label}:</span> {truncateText(EstablecimientoName, 35)}</p>
            )}
            {config.documentFields.direccion.visible && clientData.direccion && (
              <p><span className="font-semibold">{config.documentFields.direccion.label}:</span> {truncateText(clientData.direccion, 35)}</p>
            )}
            {config.documentFields.direccionEnvio.visible && clientData.direccion && (
              <p><span className="font-semibold">{config.documentFields.direccionEnvio.label}:</span> {truncateText(clientData.direccion, 35)}</p>
            )}
            {config.documentFields.correoElectronico.visible && clientData.email && (
              <p><span className="font-semibold">{config.documentFields.correoElectronico.label}:</span> {clientData.email}</p>
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

        {/* Products - tabla con columnas configurables */}
        <div className="mb-4 border-b border-dashed border-gray-400 pb-4">
          {/* Header de tabla */}
          <div className="flex gap-1 text-[9px] font-bold mb-2">
            {productFields.numero.visible && <span className="w-8">N°</span>}
            {productFields.codigo.visible && <span className="w-16">CÓD.</span>}
            {productFields.descripcion.visible && <span className="flex-1">DESC.</span>}
            {productFields.cantidad.visible && <span className="w-10 text-right">CANT</span>}
            {productFields.precioUnitario.visible && <span className="w-16 text-right">P.UNIT</span>}
            {productFields.descuento.visible && <span className="w-12 text-right">DSCTO.</span>}
            {productFields.total.visible && <span className="w-16 text-right">TOTAL</span>}
          </div>

          {cartItems.map((item, index) => {
            const lineTotal = item.price * item.quantity;

            return (
              <div key={item.id} className="mb-2">
                {/* Línea principal de producto */}
                <div className="flex gap-1 text-[9px]">
                  {productFields.numero.visible && (
                    <span className="w-8">{index + 1}</span>
                  )}
                  {productFields.codigo.visible && (
                    <span className="w-16 truncate">{item.code || '-'}</span>
                  )}
                  {productFields.descripcion.visible && (
                    <span className="flex-1 break-words">
                      {truncateText(item.name, descriptionMaxLength)}
                    </span>
                  )}
                  {productFields.cantidad.visible && (
                    <span className="w-10 text-right">{item.quantity}</span>
                  )}
                  {productFields.precioUnitario.visible && (
                    <span className="w-16 text-right">{formatCurrencyValue(item.price)}</span>
                  )}
                  {productFields.descuento.visible && (
                    <span className="w-12 text-right">{item.descuentoProducto || 0}%</span>
                  )}
                  {productFields.total.visible && (
                    <span className="w-16 text-right">{formatCurrencyValue(lineTotal)}</span>
                  )}
                </div>

                {/* Línea secundaria para marca y código de barras */}
                {(productFields.marca.visible || productFields.codigoBarras.visible) && (item.marca || item.codigoBarras) && (
                  <div className="mt-0.5 text-[8px] text-gray-600 flex gap-2">
                    {productFields.marca.visible && item.marca && (
                      <span>Marca: {truncateText(item.marca, 16)}</span>
                    )}
                    {productFields.codigoBarras.visible && item.codigoBarras && (
                      <span>C.Barras: {truncateText(item.codigoBarras, 16)}</span>
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
            <p className="text-xs">{truncateText(observations, 80)}</p>
          </div>
        )}

        {/* Totals */}
        <div className="mb-4 border-b border-dashed border-gray-400 pb-4">
          <div className="space-y-1 text-xs">
            <TaxBreakdownSummary
              taxBreakdown={taxBreakdown}
              currency={currency}
              variant="compact"
              subtotalFallback={cartItems.length > 0 ? totals.subtotal : undefined}
              igvFallback={totals.igv}
              discountAmount={totals.discount?.amount}
            />
            <div className="flex justify-between font-bold text-sm pt-2 border-t border-gray-400">
              <span>TOTAL:</span>
              <span>{formatCurrencyValue(totals.total)}</span>
            </div>
          </div>
        </div>

        {/* Cronograma de cuotas si es crédito */}
        {creditTerms && creditTerms.schedule.length > 0 && (
          <div className="mb-4 border-b border-dashed border-gray-400 pb-4">
            <p className="font-bold text-xs mb-2">Cronograma de cuotas</p>
            <div className="space-y-1">
              {creditTerms.schedule.slice(0, 4).map((cuota) => (
                <div key={cuota.numeroCuota} className="flex items-center justify-between text-xs">
                  <span># {cuota.numeroCuota} • {cuota.fechaVencimiento}</span>
                  <span>{cuota.porcentaje}% / {formatCurrencyValue(cuota.importe)}</span>
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

        {/* QR Code */}
        <div className="text-center mb-4">
          <img src={qrUrl} alt="QR Code" className="w-24 h-24 mx-auto border border-gray-300 mb-2" />
        </div>

        {/* Bloque legal configurable */}
        <div className="text-center text-[10px] text-gray-600 leading-tight mb-4">
          <p>Representación impresa de la {documentTitle.toLowerCase()}</p>
          <p className="mt-1">Consulta tu comprobante en nuestra web</p>
          <p className="mt-0.5">https://comprobantes.facturafacil.com/</p>
          <p className="mt-1">Fecha de impresión: {currentDateTime}</p>
        </div>

        {/* Mensaje final configurable */}
        <div className="text-center text-xs leading-tight mb-3">
          <p className="font-semibold">¡Gracias por su compra!</p>
          <p className="text-[10px] text-gray-600">Conserve este comprobante</p>
        </div>

        {/* Footer personalizado si está configurado */}
        {config.footer.enabled && config.footer.showCustomText && config.footer.customText && (
          <div
            className="mt-4 pt-3 border-t border-dashed border-gray-400 text-center"
            style={{
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
