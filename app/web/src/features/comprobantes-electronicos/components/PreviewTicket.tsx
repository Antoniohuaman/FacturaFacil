import React from 'react';
import type { PreviewData } from '../models/comprobante.types';

interface PreviewTicketProps {
  data: PreviewData;
  qrUrl: string;
}

export const PreviewTicket: React.FC<PreviewTicketProps> = ({ data, qrUrl }) => {
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

  // Calcular subtotales por tipo de IGV
  const subtotalGravado = cartItems
    .filter(item => item.igvType === 'igv18')
    .reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const subtotalExonerado = cartItems
    .filter(item => item.igvType === 'exonerado')
    .reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Función para truncar texto en tickets
  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
  };

  return (
    <div className="w-full max-w-xs mx-auto bg-white p-4 font-mono text-xs leading-tight" style={{ fontFamily: 'Courier, monospace' }}>
      {/* Header */}
      <div className="text-center mb-4 border-b border-dashed border-gray-400 pb-4">
        {/* Logo placeholder */}
        <div className="w-16 h-16 bg-gray-200 border border-gray-300 flex items-center justify-center mx-auto mb-3">
          <span className="text-xs font-semibold text-gray-600">LOGO</span>
        </div>
        
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
        <p className="text-xs">Dirección: {clientData.direccion || 'No especificada'}</p>
        <p className="text-xs">Forma de pago: {paymentMethod}</p>
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

      {/* Totals */}
      <div className="mb-4 border-b border-dashed border-gray-400 pb-4">
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Op. Exonerada: {currencySymbol}</span>
            <span>{subtotalExonerado.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Op. Gravada: {currencySymbol}</span>
            <span>{subtotalGravado.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>IGV: {currencySymbol}</span>
            <span>{totals.igv.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold border-t border-gray-400 pt-1">
            <span>Total: {currencySymbol}</span>
            <span>{totals.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Total en letras */}
      <div className="text-center mb-4 border-b border-dashed border-gray-400 pb-4">
        <p className="text-xs font-bold">
          SON: {totals.total.toFixed(2).replace('.', ' Y ')}/100 {currency === 'USD' ? 'DÓLARES' : 'SOLES'}
        </p>
      </div>

      {/* Footer info */}
      <div className="text-center mb-4 border-b border-dashed border-gray-400 pb-4">
        <p className="text-xs leading-tight mb-2">
          Representación impresa de la {documentTitle.toLowerCase()}
        </p>
      </div>

      {/* QR Code */}
      <div className="text-center mb-4">
        <img 
          src={qrUrl} 
          alt="QR Code" 
          className="w-20 h-20 mx-auto border border-gray-300 mb-2"
        />
        <p className="text-xs leading-tight">
          Consulta tu comprobante en<br />
          https://comprobantes.facturafacil.com/
        </p>
      </div>

      {/* Final message */}
      <div className="text-center text-xs leading-tight">
        <p>¡Gracias por su compra!</p>
        <p>Conserve este comprobante</p>
      </div>
    </div>
  );
};