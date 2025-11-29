/* eslint-disable @typescript-eslint/no-unused-vars -- variables temporales; limpieza diferida */
import React from 'react';
import type { PreviewData } from '../../models/comprobante.types';
import { useVoucherDesignConfigReader } from '../../../configuracion-sistema/hooks/useVoucherDesignConfig';

interface PreviewDocumentProps {
  data: PreviewData;
  qrUrl: string;
}

export const PreviewDocument: React.FC<PreviewDocumentProps> = ({ data, qrUrl }) => {
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
    observations,
    creditTerms,
  } = data;

  const documentTitle = documentType === 'boleta' ? 'BOLETA DE VENTA ELECTRÓNICA' : 'FACTURA ELECTRÓNICA';
  const currencySymbol = currency === 'USD' ? '$' : 'S/';

  // Calcular subtotales
  const subtotalGravado = cartItems.filter(item => item.igvType === 'igv18').reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const subtotalExonerado = cartItems.filter(item => item.igvType === 'exonerado').reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const subtotalInafecto = cartItems.filter(item => item.igvType === 'inafecto').reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Obtener columnas visibles
  const visibleColumns = Object.entries(config.productFields).filter(([_, value]) => value.visible);

  return (
    <div className="w-full p-8 bg-white text-sm leading-relaxed print:p-4 relative">
      {/* Marca de agua */}
      {config.watermark.enabled && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
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

      {/* Contenido */}
      <div className="relative" style={{ zIndex: 1 }}>
        {/* HEADER: EMPRESA | LOGO | RUC/DOC */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* Columna 1: Datos de la empresa */}
          <div className="flex flex-col justify-center">
            <h1 className="font-bold text-lg text-gray-900">{companyData.name}</h1>
            <p className="text-xs text-gray-700 max-w-xs leading-tight mt-1">{companyData.address}</p>
            <p className="text-xs text-gray-700">Telf: {companyData.phone}</p>
            <p className="text-xs text-gray-700">E-mail: {companyData.email}</p>
          </div>

          {/* Columna 2: Logo (centrado) */}
          <div className="flex items-center justify-center">
            {config.logo.enabled && (
              config.logo.url ? (
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
              )
            )}
          </div>

          {/* Columna 3: RUC y tipo de documento */}
          <div className="border-2 border-gray-800 p-4 text-center flex flex-col justify-center min-w-[280px]">
            <div className="bg-gray-800 text-white px-3 py-1 mb-3">
              <span className="font-bold text-sm">R.U.C. {companyData.ruc}</span>
            </div>
            <h2 className="font-bold text-base mb-2 text-gray-900">{documentTitle}</h2>
            <p className="font-bold text-lg text-gray-900">{series}-</p>
          </div>
        </div>

        {/* Información del cliente y documento */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <h3 className="font-semibold mb-3 text-gray-900">DATOS DEL CLIENTE:</h3>
            <div className="space-y-1 text-xs">
              <p><span className="font-medium">Cliente:</span> {clientData.nombre}</p>
              <p><span className="font-medium">{clientData.tipoDocumento.toUpperCase()}:</span> {clientData.documento}</p>
              {config.documentFields.direccion.visible && clientData.direccion && (
                <p><span className="font-medium">{config.documentFields.direccion.label}:</span> {clientData.direccion}</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-gray-900">DATOS DEL COMPROBANTE:</h3>
            <div className="space-y-1 text-xs">
              <p><span className="font-medium">F. Emisión:</span> {issueDate}</p>
              <p><span className="font-medium">Moneda:</span> {currency === 'USD' ? 'Dólares Americanos' : 'Soles'}</p>
              <p><span className="font-medium">Forma de Pago:</span> {paymentMethod}</p>
              {config.documentFields.fechaVencimiento.visible && (
                <p><span className="font-medium">{config.documentFields.fechaVencimiento.label}:</span> {issueDate}</p>
              )}
              {config.documentFields.establecimiento.visible && (
                <p><span className="font-medium">{config.documentFields.establecimiento.label}:</span> Principal</p>
              )}
              {config.documentFields.ordenCompra.visible && (
                <p><span className="font-medium">{config.documentFields.ordenCompra.label}:</span> -</p>
              )}
              {config.documentFields.guiaRemision.visible && (
                <p><span className="font-medium">{config.documentFields.guiaRemision.label}:</span> -</p>
              )}
              {config.documentFields.correoElectronico.visible && (
                <p><span className="font-medium">{config.documentFields.correoElectronico.label}:</span> {clientData.email || '-'}</p>
              )}
              {config.documentFields.centroCosto.visible && (
                <p><span className="font-medium">{config.documentFields.centroCosto.label}:</span> -</p>
              )}
              {config.documentFields.direccionEnvio.visible && (
                <p><span className="font-medium">{config.documentFields.direccionEnvio.label}:</span> {clientData.direccion || '-'}</p>
              )}
              {config.documentFields.vendedor.visible && (
                <p><span className="font-medium">{config.documentFields.vendedor.label}:</span> -</p>
              )}
            </div>
          </div>
        </div>

        {/* Tabla de productos */}
        <div className="border border-gray-400 mb-6">
          {/* Header */}
          <div className="bg-gray-800 text-white px-2 py-2 text-xs font-medium flex gap-1">
            {visibleColumns.map(([key, field]) => (
              <div key={key} style={{ width: `${field.width}px`, flexShrink: 0 }} className="text-center">
                {field.label}
              </div>
            ))}
          </div>

          {/* Body */}
          {cartItems.map((item, index) => (
            <div
              key={item.id}
              className={`px-2 py-2 text-xs border-b border-gray-300 flex gap-1 ${
                index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
              }`}
            >
              {visibleColumns.map(([key, field]) => {
                let content = '';
                switch (key) {
                  case 'imagen': content = '🖼️'; break;
                  case 'descripcion': content = item.name; break;
                  case 'cantidad': content = item.quantity.toString(); break;
                  case 'precioUnitario': content = `${currencySymbol} ${item.price.toFixed(2)}`; break;
                  case 'total': content = `${currencySymbol} ${(item.price * item.quantity).toFixed(2)}`; break;
                  case 'marca': content = item.marca || '-'; break;
                  case 'codigoBarras': content = item.codigoBarras || '-'; break;
                  case 'alias': content = item.alias || '-'; break;
                  case 'modelo': content = item.modelo || '-'; break;
                  case 'codigoFabrica': content = item.codigoFabrica || '-'; break;
                  case 'descuento': content = item.descuentoProducto ? `${item.descuentoProducto}%` : '-'; break;
                  case 'tipo': content = item.tipoProducto || '-'; break;
                  case 'codigoSunat': content = item.codigoSunat || '-'; break;
                  case 'peso': content = item.peso ? `${item.peso}kg` : '-'; break;
                  case 'categoria': content = item.category || '-'; break;
                  case 'tipoExistencia': content = item.tipoExistencia || '-'; break;
                  default: content = item.code || '-';
                }
                return (
                  <div key={key} style={{ width: `${field.width}px`, flexShrink: 0 }} className="truncate text-center">
                    {content}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Totales */}
          <div className="bg-gray-50 border-t-2 border-gray-300 px-3 py-2">
            <div className="flex justify-end">
              <div className="min-w-[300px]">
                <div className="space-y-2">
                  {subtotalGravado > 0 && (
                    <>
                      <div className="flex justify-between text-xs">
                        <span>Op. Gravadas:</span>
                        <span>{currencySymbol} {(subtotalGravado / 1.18).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>IGV (18%):</span>
                        <span>{currencySymbol} {(subtotalGravado - subtotalGravado / 1.18).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  {subtotalExonerado > 0 && (
                    <div className="flex justify-between text-xs">
                      <span>Op. Exoneradas:</span>
                      <span>{currencySymbol} {subtotalExonerado.toFixed(2)}</span>
                    </div>
                  )}
                  {subtotalInafecto > 0 && (
                    <div className="flex justify-between text-xs">
                      <span>Op. Inafectas:</span>
                      <span>{currencySymbol} {subtotalInafecto.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                    <span className="text-sm font-bold">TOTAL:</span>
                    <span className="text-base font-bold">{currencySymbol} {totals.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {creditTerms && creditTerms.schedule.length > 0 && (
          <div className="mb-6">
            <h4 className="font-semibold text-xs mb-2">Cronograma de cuotas</h4>
            <div className="overflow-hidden rounded-lg border border-emerald-200">
              <table className="w-full text-xs text-gray-700">
                <thead className="bg-emerald-50 text-emerald-700">
                  <tr>
                    <th className="px-2 py-1 text-left">#</th>
                    <th className="px-2 py-1 text-left">Vencimiento</th>
                    <th className="px-2 py-1 text-left">% del total</th>
                    <th className="px-2 py-1 text-right">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {creditTerms.schedule.map((cuota) => (
                    <tr key={cuota.numeroCuota} className="border-t border-emerald-100">
                      <td className="px-2 py-1 font-semibold">{cuota.numeroCuota}</td>
                      <td className="px-2 py-1">{cuota.fechaVencimiento}</td>
                      <td className="px-2 py-1">{cuota.porcentaje}%</td>
                      <td className="px-2 py-1 text-right">{currencySymbol} {cuota.importe.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between border-t border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] text-emerald-800">
                <span>Total cuotas: {creditTerms.schedule.length}</span>
                <span>Vencimiento global: {creditTerms.fechaVencimientoGlobal}</span>
              </div>
            </div>
          </div>
        )}

        {/* Observaciones - SIEMPRE DESPUÉS DE LA TABLA */}
        {config.documentFields.observaciones.visible && observations && (
          <div className="mb-6">
            <h4 className="font-semibold text-xs mb-2">{config.documentFields.observaciones.label}:</h4>
            <p className="text-xs text-gray-700 leading-relaxed">{observations}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-end">
          {/* QR Code */}
          <div className="text-center">
            <img src={qrUrl} alt="QR Code" className="w-24 h-24 border border-gray-300 mb-2" />
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
