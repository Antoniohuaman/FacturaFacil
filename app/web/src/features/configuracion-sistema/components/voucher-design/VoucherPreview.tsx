// ===================================================================
// VOUCHER PREVIEW - Vista previa COMPLETA y FUNCIONAL
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

  // Datos de ejemplo para la vista previa
  const sampleData = {
    company: {
      name: 'MI EMPRESA S.A.C.',
      ruc: '20123456789',
      address: 'Jr. Los Ejemplos 123, Lima, Lima',
      phone: '+51 987 654 321',
      email: 'ventas@miempresa.com'
    },
    client: {
      name: 'Juan Pérez García',
      document: '12345678',
      address: 'Av. Principal 456, Lima'
    },
    document: {
      type: 'FACTURA ELECTRÓNICA',
      series: 'F001',
      number: '00000123',
      date: '25/10/2025',
      time: '14:30'
    },
    items: [
      { id: 1, name: 'Producto Ejemplo 1', code: 'PROD001', quantity: 2, price: 50.00, brand: 'Marca A', barcode: '7501234567890', alias: 'Prod1', model: 'MOD-001', factoryCode: 'FAB-001', discount: 5, type: 'Bien', sunatCode: '12345678', weight: '1.5kg', category: 'Categoría A', existenceType: 'Mercadería' },
      { id: 2, name: 'Producto Ejemplo 2', code: 'PROD002', quantity: 1, price: 100.00, brand: 'Marca B', barcode: '7501234567891', alias: 'Prod2', model: 'MOD-002', factoryCode: 'FAB-002', discount: 10, type: 'Servicio', sunatCode: '87654321', weight: '2.0kg', category: 'Categoría B', existenceType: 'Servicios' }
    ]
  };

  // Obtener columnas visibles
  const visibleProductFields = Object.entries(productFields).filter(([_, value]) => value.visible);

  if (designType === 'TICKET') {
    return <TicketPreview config={config} sampleData={sampleData} />;
  }

  // Preview A4
  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 shadow-lg overflow-hidden">
      {/* Header del preview */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-600" />
          <h4 className="font-semibold text-gray-900 text-sm">
            Vista Previa - Formato A4
          </h4>
        </div>
        <span className="text-xs text-gray-500">Actualización en tiempo real</span>
      </div>

      {/* Área de preview con scroll */}
      <div className="p-4 bg-gray-50 max-h-[calc(100vh-200px)] overflow-y-auto">
        <div className="bg-white shadow-md relative aspect-[210/297]">
          {/* Marca de agua */}
          {watermark.enabled && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
              {watermark.type === 'text' && watermark.text && (
                <div
                  className="text-6xl font-bold select-none"
                  style={{
                    opacity: watermark.opacity,
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
                    opacity: watermark.opacity,
                    transform: `rotate(${watermark.rotation}deg)`,
                    maxWidth: watermark.size === 'small' ? '150px' : watermark.size === 'large' ? '350px' : '250px'
                  }}
                />
              )}
            </div>
          )}

          {/* Contenido del comprobante */}
          <div className="relative p-6" style={{ zIndex: 1 }}>
            {/* HEADER: EMPRESA | LOGO | RUC/DOC */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {/* Columna 1: Datos de la empresa */}
              <div className="flex flex-col justify-center">
                <h1 className="font-bold text-base text-gray-900">{sampleData.company.name}</h1>
                <p className="text-xs text-gray-700 mt-1">{sampleData.company.address}</p>
                <p className="text-xs text-gray-700">Tel: {sampleData.company.phone}</p>
                <p className="text-xs text-gray-700">Email: {sampleData.company.email}</p>
              </div>

              {/* Columna 2: Logo (centrado) */}
              <div className="flex items-center justify-center">
                {logo.enabled && (
                  logo.url ? (
                    <img
                      src={logo.url}
                      alt="Logo"
                      style={{
                        width: `${logo.width}px`,
                        height: `${logo.height}px`,
                        objectFit: 'contain'
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: `${logo.width}px`,
                        height: `${logo.height}px`
                      }}
                      className="bg-gray-200 border border-gray-300 flex items-center justify-center rounded"
                    >
                      <span className="text-xs font-semibold text-gray-600">LOGO</span>
                    </div>
                  )
                )}
              </div>

              {/* Columna 3: RUC y tipo de documento */}
              <div className="border-2 border-gray-800 p-3 text-center flex flex-col justify-center">
                <div className="bg-gray-800 text-white px-2 py-1 mb-2">
                  <span className="font-bold text-xs">R.U.C. {sampleData.company.ruc}</span>
                </div>
                <h2 className="font-bold text-sm text-gray-900">{sampleData.document.type}</h2>
                <p className="font-bold text-base text-gray-900">{sampleData.document.series}-{sampleData.document.number}</p>
              </div>
            </div>

            {/* Información del cliente y documento */}
            <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
              <div>
                <h3 className="font-semibold mb-2 text-gray-900">DATOS DEL CLIENTE:</h3>
                <p><span className="font-medium">Cliente:</span> {sampleData.client.name}</p>
                <p><span className="font-medium">DNI:</span> {sampleData.client.document}</p>
                {documentFields.direccion.visible && (
                  <p><span className="font-medium">{documentFields.direccion.label}:</span> {sampleData.client.address}</p>
                )}
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-gray-900">DATOS DEL COMPROBANTE:</h3>
                <p><span className="font-medium">F. Emisión:</span> {sampleData.document.date}</p>
                {documentFields.fechaVencimiento.visible && (
                  <p><span className="font-medium">{documentFields.fechaVencimiento.label}:</span> 25/11/2025</p>
                )}
                {documentFields.establecimiento.visible && (
                  <p><span className="font-medium">{documentFields.establecimiento.label}:</span> Principal</p>
                )}
                {documentFields.ordenCompra.visible && (
                  <p><span className="font-medium">{documentFields.ordenCompra.label}:</span> OC-2025-001</p>
                )}
                {documentFields.guiaRemision.visible && (
                  <p><span className="font-medium">{documentFields.guiaRemision.label}:</span> GR-001-00123</p>
                )}
                {documentFields.correoElectronico.visible && (
                  <p><span className="font-medium">{documentFields.correoElectronico.label}:</span> cliente@email.com</p>
                )}
                {documentFields.centroCosto.visible && (
                  <p><span className="font-medium">{documentFields.centroCosto.label}:</span> CC-001</p>
                )}
                {documentFields.direccionEnvio.visible && (
                  <p><span className="font-medium">{documentFields.direccionEnvio.label}:</span> Av. Delivery 789</p>
                )}
                {documentFields.vendedor.visible && (
                  <p><span className="font-medium">{documentFields.vendedor.label}:</span> Carlos Ventas</p>
                )}
              </div>
            </div>

            {/* Tabla de productos */}
            <div className="border border-gray-400 mb-4">
              {/* Header de la tabla */}
              <div className="bg-gray-800 text-white px-2 py-2 text-[10px] font-medium flex gap-1">
                {visibleProductFields.map(([key, field]) => (
                  <div key={key} style={{ width: `${field.width}px`, flexShrink: 0 }} className="text-center">
                    {field.label}
                  </div>
                ))}
              </div>

              {/* Productos */}
              {sampleData.items.map((item, index) => (
                <div
                  key={item.id}
                  className={`px-2 py-2 text-[10px] border-b border-gray-300 flex gap-1 ${
                    index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                  }`}
                >
                  {visibleProductFields.map(([key, field]) => {
                    let content = '';
                    switch (key) {
                      case 'imagen': content = '🖼️'; break;
                      case 'descripcion': content = item.name; break;
                      case 'cantidad': content = item.quantity.toString(); break;
                      case 'precioUnitario': content = `S/ ${item.price.toFixed(2)}`; break;
                      case 'total': content = `S/ ${(item.price * item.quantity).toFixed(2)}`; break;
                      case 'marca': content = item.brand; break;
                      case 'codigoBarras': content = item.barcode; break;
                      case 'alias': content = item.alias; break;
                      case 'modelo': content = item.model; break;
                      case 'codigoFabrica': content = item.factoryCode; break;
                      case 'descuento': content = `${item.discount}%`; break;
                      case 'tipo': content = item.type; break;
                      case 'codigoSunat': content = item.sunatCode; break;
                      case 'peso': content = item.weight; break;
                      case 'categoria': content = item.category; break;
                      case 'tipoExistencia': content = item.existenceType; break;
                      default: content = item.code;
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
              <div className="bg-gray-100 px-2 py-2 flex justify-end">
                <div className="text-right">
                  <p className="text-xs font-semibold">Subtotal: S/ 200.00</p>
                  <p className="text-xs font-semibold">IGV (18%): S/ 36.00</p>
                  <p className="text-sm font-bold">TOTAL: S/ 236.00</p>
                </div>
              </div>
            </div>

            {/* Observaciones - SIEMPRE DESPUÉS DE LA TABLA */}
            {documentFields.observaciones.visible && (
              <div className="mb-4 text-xs">
                <h4 className="font-semibold mb-1">{documentFields.observaciones.label}:</h4>
                <p className="text-gray-700">Entrega inmediata. Producto de alta calidad.</p>
              </div>
            )}

            {/* QR Code */}
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center">
                <QrCode className="w-16 h-16 text-gray-400" />
              </div>
            </div>

            {/* Footer personalizado */}
            {footer.enabled && footer.showCustomText && footer.customText && (
              <div
                className="pt-3 border-t border-gray-300"
                style={{
                  textAlign: footer.textAlignment,
                  backgroundColor: footer.backgroundColor,
                  padding: `${footer.padding}px 8px`
                }}
              >
                <p
                  style={{
                    fontSize: footer.fontSize === 'small' ? '10px' : footer.fontSize === 'large' ? '14px' : '12px',
                    fontWeight: footer.fontWeight,
                    color: footer.textColor || '#374151'
                  }}
                >
                  {footer.customText}
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

// Componente para vista previa de Ticket
const TicketPreview: React.FC<{ config: VoucherDesignConfigurationExtended; sampleData: any }> = ({ config, sampleData }) => {
  const { logo, watermark, footer, documentFields } = config;

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-600" />
          <h4 className="font-semibold text-gray-900 text-sm">Vista Previa - Formato Ticket (80mm)</h4>
        </div>
        <span className="text-xs text-gray-500">Tiempo real</span>
      </div>

      {/* Área de preview */}
      <div className="p-4 bg-gray-50 flex justify-center">
        <div className="w-[302px] bg-white shadow-md font-mono text-[10px] leading-tight relative">
          {/* Marca de agua */}
          {watermark.enabled && watermark.type === 'text' && watermark.text && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 0 }}>
              <div
                className="text-2xl font-bold select-none"
                style={{
                  opacity: watermark.opacity,
                  color: watermark.color || '#e5e7eb',
                  transform: `rotate(${watermark.rotation}deg)`
                }}
              >
                {watermark.text}
              </div>
            </div>
          )}

          {/* Contenido */}
          <div className="relative p-3" style={{ zIndex: 1 }}>
            {/* Logo centrado */}
            {logo.enabled && (
              <div className="text-center mb-3">
                {logo.url ? (
                  <img
                    src={logo.url}
                    alt="Logo"
                    className="mx-auto"
                    style={{ width: `${logo.width}px`, height: `${logo.height}px`, objectFit: 'contain' }}
                  />
                ) : (
                  <div
                    className="bg-gray-200 border border-gray-300 flex items-center justify-center mx-auto"
                    style={{ width: `${logo.width}px`, height: `${logo.height}px` }}
                  >
                    <span className="text-[8px]">LOGO</span>
                  </div>
                )}
              </div>
            )}

            <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
              <h1 className="font-bold text-xs">{sampleData.company.name}</h1>
              <p className="text-[9px]">RUC: {sampleData.company.ruc}</p>
              <p className="text-[9px]">{sampleData.company.address}</p>
            </div>

            <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
              <div className="border border-black p-2 mb-2">
                <p className="font-bold text-xs">{sampleData.document.type}</p>
                <p className="font-bold text-sm">{sampleData.document.series}-{sampleData.document.number}</p>
              </div>
              <p className="text-[9px]">Fecha: {sampleData.document.date} {sampleData.document.time}</p>
              <p className="text-[9px]">Cliente: {sampleData.client.name}</p>
              <p className="text-[9px]">DNI: {sampleData.client.document}</p>
              {documentFields.vendedor.visible && (
                <p className="text-[9px]">{documentFields.vendedor.label}: Carlos Ventas</p>
              )}
            </div>

            {/* Productos */}
            <div className="border-b border-dashed border-gray-400 pb-3 mb-3">
              <div className="grid grid-cols-3 gap-1 font-bold mb-2 text-[9px]">
                <span>CANT</span>
                <span>DESC</span>
                <span className="text-right">PRECIO</span>
              </div>
              {sampleData.items.map((item: any) => (
                <div key={item.id} className="mb-2">
                  <div className="grid grid-cols-3 gap-1 text-[9px]">
                    <span>{item.quantity}</span>
                    <span className="truncate">{item.name.substring(0, 15)}</span>
                    <span className="text-right">S/ {item.price.toFixed(2)}</span>
                  </div>
                  <div className="text-right text-[9px]">
                    Subtotal: S/ {(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* Observaciones */}
            {documentFields.observaciones.visible && (
              <div className="border-b border-dashed border-gray-400 pb-3 mb-3 text-[9px]">
                <p className="font-bold">{documentFields.observaciones.label}:</p>
                <p>Entrega inmediata</p>
              </div>
            )}

            {/* Totales */}
            <div className="mb-3 text-[10px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>S/ 200.00</span>
              </div>
              <div className="flex justify-between">
                <span>IGV (18%):</span>
                <span>S/ 36.00</span>
              </div>
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-gray-400">
                <span>TOTAL:</span>
                <span>S/ 236.00</span>
              </div>
            </div>

            {/* QR */}
            <div className="flex justify-center mb-3">
              <div className="w-16 h-16 bg-gray-200 flex items-center justify-center">
                <QrCode className="w-12 h-12 text-gray-400" />
              </div>
            </div>

            {/* Footer */}
            {footer.enabled && footer.showCustomText && footer.customText && (
              <div className="text-center border-t border-dashed border-gray-400 pt-2 text-[9px]">
                <p style={{ fontWeight: footer.fontWeight }}>{footer.customText}</p>
              </div>
            )}

            <div className="text-center text-[8px] text-gray-600">
              <p>¡Gracias por su compra!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
