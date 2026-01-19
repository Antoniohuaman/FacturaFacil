/* eslint-disable @typescript-eslint/no-unused-vars -- variables temporales; limpieza diferida */
/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
// ===================================================================
// VOUCHER PREVIEW - Vista previa COMPLETA y FUNCIONAL
// ===================================================================

import React, { useMemo } from 'react';
import { Eye, QrCode } from 'lucide-react';
import type { VoucherDesignConfigurationExtended } from '../../modelos/VoucherDesignUnified';
import { useConfigurationContext } from '../../contexto/ContextoConfiguracion';

interface VoucherPreviewProps {
  config: VoucherDesignConfigurationExtended;
  designType: 'A4' | 'TICKET';
}

export const VoucherPreview: React.FC<VoucherPreviewProps> = ({ config, designType }) => {
  const { logo, watermark, footer, documentFields, productFields } = config;
  const { state } = useConfigurationContext();

  // Datos de ejemplo para la vista previa - usa datos reales de la empresa si están disponibles
  const sampleData = useMemo(() => {
    const company = state.company;

    return {
      company: {
        razonSocial: company?.razonSocial || 'MI EMPRESA S.A.C. [Datos de Ejemplo]',
        nombreComercial: company?.nombreComercial,
        ruc: company?.ruc || '20123456789',
        direccionFiscal: company?.direccionFiscal || 'Jr. Los Ejemplos 123, Lima, Lima',
        telefonos: company?.telefonos?.length ? company.telefonos : ['+51 987 654 321'],
        correosElectronicos: company?.correosElectronicos?.length ? company.correosElectronicos : ['ventas@miempresa.com']
      },
      client: {
        name: 'Juan Pérez García [Ejemplo]',
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
  }, [state.company]);

  const a4VisibleProductFields = useMemo(
    () => Object.entries(productFields).filter(([_, value]) => value.visible),
    [productFields]
  );

  if (designType === 'TICKET') {
    return <TicketPreview config={config} sampleData={sampleData} />;
  }

  return (
    <A4Preview
      logo={logo}
      watermark={watermark}
      footer={footer}
      documentFields={documentFields}
      productFields={productFields}
      visibleProductFields={a4VisibleProductFields}
      sampleData={sampleData}
    />
  );
};

interface A4PreviewProps {
  logo: VoucherDesignConfigurationExtended['logo'];
  watermark: VoucherDesignConfigurationExtended['watermark'];
  footer: VoucherDesignConfigurationExtended['footer'];
  documentFields: VoucherDesignConfigurationExtended['documentFields'];
  productFields: VoucherDesignConfigurationExtended['productFields'];
  visibleProductFields: Array<[string, any]>;
  sampleData: any;
}

const A4Preview: React.FC<A4PreviewProps> = ({
  logo,
  watermark,
  footer,
  documentFields,
  productFields,
  visibleProductFields,
  sampleData,
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">
      <div className="px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-600" />
          <h4 className="font-semibold text-gray-900 text-sm">
            Vista Previa - Formato A4
          </h4>
        </div>
        <span className="text-xs text-gray-500">Actualización en tiempo real</span>
      </div>

      <div className="p-3 bg-gray-50 max-h-[calc(100vh-220px)] overflow-y-auto">
        <div className="bg-white shadow-sm relative aspect-[210/297] mx-auto rounded-lg border border-gray-100">
          <div className="relative px-5 pt-4 pb-3" style={{ zIndex: 1 }}>
            <A4Header logo={logo} sampleData={sampleData} />
            <A4Body
              documentFields={documentFields}
              productFields={productFields}
              visibleProductFields={visibleProductFields}
              sampleData={sampleData}
            />
            <A4Footer
              documentFields={documentFields}
              footer={footer}
            />
          </div>

          <A4WatermarkOverlay watermark={watermark} />
        </div>
      </div>

      <div className="px-4 py-2 bg-blue-50 border-t border-blue-100">
        <p className="text-xs text-blue-700 flex items-center gap-2">
          <Eye className="w-3 h-3" />
          Los cambios se reflejan automáticamente en la vista previa
        </p>
      </div>
    </div>
  );
};

interface A4HeaderProps {
  logo: VoucherDesignConfigurationExtended['logo'];
  sampleData: any;
}

const A4Header: React.FC<A4HeaderProps> = ({ logo, sampleData }) => {
  const currentLayout = logo.layout || 'horizontal';

  const logoVisual = logo.enabled && logo.url ? (
    <img
      src={logo.url}
      alt="Logo"
      style={{
        width: `${logo.width}px`,
        height: `${logo.height}px`,
        objectFit: 'contain',
      }}
    />
  ) : logo.enabled ? (
    <div
      style={{
        width: `${logo.width}px`,
        height: `${logo.height}px`,
      }}
      className="bg-gray-200 border border-gray-300 flex items-center justify-center rounded"
    >
      <span className="text-xs font-semibold text-gray-600">LOGO</span>
    </div>
  ) : null;

  const documentSection = (
    <div className="border-2 border-gray-800 px-3 py-2 text-center flex flex-col justify-center h-full">
      <div className="bg-gray-800 text-white px-2 py-1 mb-1">
        <span className="font-bold text-xs">R.U.C. {sampleData.company.ruc}</span>
      </div>
      <h2 className="font-bold text-sm text-gray-900 leading-snug">{sampleData.document.type}</h2>
      <p className="font-bold text-base text-gray-900 mt-1">
        {sampleData.document.series}-{sampleData.document.number}
      </p>
    </div>
  );

  if (currentLayout === 'vertical-logo-top' || currentLayout === 'vertical-logo-bottom') {
    const verticalBlock = (
      <div className="flex flex-col justify-center gap-2 px-3 py-1">
        {currentLayout === 'vertical-logo-top' ? (
          <>
            {logoVisual && (
              <div className="flex items-center justify-center mb-1">{logoVisual}</div>
            )}
            <div className="flex flex-col items-center text-center w-full">
              <h1 className="font-bold text-base text-gray-900 leading-tight">
                {sampleData.company.razonSocial}
              </h1>
              <p className="text-xs text-gray-700 mt-0.5">{sampleData.company.direccionFiscal}</p>
              <p className="text-xs text-gray-700">Tel: {sampleData.company.telefonos?.[0]}</p>
              <p className="text-xs text-gray-700">Email: {sampleData.company.correosElectronicos?.[0]}</p>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center text-center w-full mb-1">
              <h1 className="font-bold text-base text-gray-900 leading-tight">
                {sampleData.company.razonSocial}
              </h1>
              <p className="text-xs text-gray-700 mt-0.5">{sampleData.company.direccionFiscal}</p>
              <p className="text-xs text-gray-700">Tel: {sampleData.company.telefonos?.[0]}</p>
              <p className="text-xs text-gray-700">Email: {sampleData.company.correosElectronicos?.[0]}</p>
            </div>
            {logoVisual && (
              <div className="flex items-center justify-center mt-1">{logoVisual}</div>
            )}
          </>
        )}
      </div>
    );

    return (
      <div className="grid grid-cols-[2fr_1.1fr] gap-4 mb-4 items-stretch">
        {logo.position === 'right' ? (
          <>
            {documentSection}
            {verticalBlock}
          </>
        ) : (
          <>
            {verticalBlock}
            {documentSection}
          </>
        )}
      </div>
    );
  }

  const companyInfoSection = (
    <div className="flex flex-col justify-between h-full py-1">
      <div>
        <h1 className="font-bold text-base text-gray-900 leading-tight">
          {sampleData.company.razonSocial}
        </h1>
        <p className="text-xs text-gray-700 mt-0.5 truncate">{sampleData.company.direccionFiscal}</p>
      </div>
      <div className="mt-1 text-xs text-gray-700 space-y-0.5">
        <p>Tel: {sampleData.company.telefonos?.[0]}</p>
        <p>Email: {sampleData.company.correosElectronicos?.[0]}</p>
      </div>
    </div>
  );

  const logoSection = (
    <div className="flex items-center justify-center h-full">
      {logoVisual || <div />}
    </div>
  );

  return (
    <div className="grid grid-cols-[1.1fr_1.6fr_1.1fr] gap-3 mb-3 items-stretch">
      {logo.position === 'left' && (
        <>
          {logoSection}
          {companyInfoSection}
          {documentSection}
        </>
      )}
      {logo.position === 'right' && (
        <>
          {companyInfoSection}
          {documentSection}
          {logoSection}
        </>
      )}
      {logo.position === 'center' && (
        <>
          {companyInfoSection}
          {logoSection}
          {documentSection}
        </>
      )}
    </div>
  );
};

interface A4BodyProps {
  documentFields: VoucherDesignConfigurationExtended['documentFields'];
  productFields: VoucherDesignConfigurationExtended['productFields'];
  visibleProductFields: Array<[string, any]>;
  sampleData: any;
}

const A4Body: React.FC<A4BodyProps> = ({
  documentFields,
  visibleProductFields,
  sampleData,
}) => {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-3 text-[11px] leading-snug">
        <div>
          <h3 className="font-semibold mb-1.5 text-gray-900">DATOS DEL CLIENTE:</h3>
          <p>
            <span className="font-medium">Cliente:</span> {sampleData.client.name}
          </p>
          <p>
            <span className="font-medium">DNI:</span> {sampleData.client.document}
          </p>
          {documentFields.direccion.visible && (
            <p>
              <span className="font-medium">{documentFields.direccion.label}:</span>{' '}
              {sampleData.client.address}
            </p>
          )}
        </div>
        <div>
          <h3 className="font-semibold mb-1.5 text-gray-900">DATOS DEL COMPROBANTE:</h3>
          <p>
            <span className="font-medium">F. Emisión:</span> {sampleData.document.date}
          </p>
          {documentFields.fechaVencimiento.visible && (
            <p>
              <span className="font-medium">{documentFields.fechaVencimiento.label}:</span>{' '}
              25/11/2025
            </p>
          )}
          {documentFields.establecimiento.visible && (
            <p>
              <span className="font-medium">{documentFields.establecimiento.label}:</span> Principal
            </p>
          )}
          {documentFields.ordenCompra.visible && (
            <p>
              <span className="font-medium">{documentFields.ordenCompra.label}:</span> OC-2025-001
            </p>
          )}
          {documentFields.guiaRemision.visible && (
            <p>
              <span className="font-medium">{documentFields.guiaRemision.label}:</span> GR-001-00123
            </p>
          )}
          {documentFields.correoElectronico.visible && (
            <p>
              <span className="font-medium">{documentFields.correoElectronico.label}:</span>{' '}
              cliente@email.com
            </p>
          )}
          {documentFields.centroCosto.visible && (
            <p>
              <span className="font-medium">{documentFields.centroCosto.label}:</span> CC-001
            </p>
          )}
          {documentFields.direccionEnvio.visible && (
            <p>
              <span className="font-medium">{documentFields.direccionEnvio.label}:</span>{' '}
              Av. Delivery 789
            </p>
          )}
          {documentFields.vendedor.visible && (
            <p>
              <span className="font-medium">{documentFields.vendedor.label}:</span> Carlos Ventas
            </p>
          )}
        </div>
      </div>

      <div className="border border-gray-300 mb-3 overflow-x-auto rounded-md">
        <div style={{ minWidth: 'fit-content' }}>
          <div className="bg-gray-800 text-white px-1 py-1.5 text-[10px] font-medium flex gap-0.5 rounded-t-md">
            {visibleProductFields.map(([key, field]) => (
              <div
                key={key}
                style={{ width: `${field.width}px`, flexShrink: 0 }}
                className="text-center px-1"
              >
                {field.label}
              </div>
            ))}
          </div>

          {sampleData.items.map((item: any, index: number) => (
            <div
              key={item.id}
              className={`px-1 py-1.5 text-[10px] border-b border-gray-200 flex gap-0.5 ${
                index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
              }`}
            >
              {visibleProductFields.map(([key, field]) => {
                let content = '';
                switch (key) {
                  case 'numero': content = (index + 1).toString(); break;
                  case 'imagen': content = '🖼️'; break;
                  case 'descripcion': content = item.name; break;
                  case 'cantidad': content = item.quantity.toString(); break;
                  case 'unidadMedida': content = 'UND'; break;
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
                  <div
                    key={key}
                    style={{ width: `${field.width}px`, flexShrink: 0 }}
                    className="truncate text-center px-1"
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          ))}

          <div className="bg-gray-50 px-2.5 py-2 flex justify-end rounded-b-md border-t border-gray-200">
            <div className="text-right">
              <p className="text-xs font-semibold">Subtotal: S/ 200.00</p>
              <p className="text-xs font-semibold">IGV (18%): S/ 36.00</p>
              <p className="text-sm font-bold">TOTAL: S/ 236.00</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

interface A4FooterProps {
  documentFields: VoucherDesignConfigurationExtended['documentFields'];
  footer: VoucherDesignConfigurationExtended['footer'];
}

const A4Footer: React.FC<A4FooterProps> = ({ documentFields, footer }) => {
  return (
    <>
      {documentFields.observaciones.visible && (
        <div className="mb-2.5 text-[11px] leading-snug">
          <h4 className="font-semibold mb-1">{documentFields.observaciones.label}:</h4>
          <p className="text-gray-700">Entrega inmediata. Producto de alta calidad.</p>
        </div>
      )}

      <div className="flex justify-center mb-2.5">
        <div className="w-18 h-18 bg-gray-100 rounded-md flex items-center justify-center border border-dashed border-gray-300">
          <QrCode className="w-12 h-12 text-gray-400" />
        </div>
      </div>

      {footer.enabled && footer.showCustomText && footer.customText && (
        <div
          className="pt-3 border-t border-gray-300"
          style={{
            textAlign: footer.textAlignment,
            backgroundColor: footer.backgroundColor,
            padding: `${footer.padding}px 8px`,
          }}
        >
          <p
            style={{
              fontSize:
                footer.fontSize === 'small'
                  ? '10px'
                  : footer.fontSize === 'large'
                  ? '14px'
                  : '12px',
              fontWeight: footer.fontWeight,
              color: footer.textColor || '#374151',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxWidth: '100%',
              margin: 0,
            }}
          >
            {footer.customText}
          </p>
        </div>
      )}
    </>
  );
};

interface A4WatermarkOverlayProps {
  watermark: VoucherDesignConfigurationExtended['watermark'];
}

const A4WatermarkOverlay: React.FC<A4WatermarkOverlayProps> = ({ watermark }) => {
  if (!watermark.enabled) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden flex"
      style={{
        zIndex: 10,
        alignItems:
          watermark.position === 'center' || watermark.position === 'diagonal'
            ? 'center'
            : 'flex-start',
        justifyContent:
          watermark.position === 'center' || watermark.position === 'diagonal'
            ? 'center'
            : 'flex-start',
      }}
    >
      {watermark.type === 'text' && watermark.text && (
        <>
          {watermark.position === 'repeat' ? (
            <div className="w-full h-full grid grid-cols-3 grid-rows-4 gap-4 p-8">
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={index} className="flex items-center justify-center">
                  <div
                    className="font-bold select-none"
                    style={{
                      opacity: watermark.opacity,
                      color: watermark.color || '#e5e7eb',
                      transform: `rotate(${watermark.rotation}deg)`,
                      fontSize:
                        watermark.size === 'small'
                          ? '1.5rem'
                          : watermark.size === 'large'
                          ? '2.5rem'
                          : '2rem',
                    }}
                  >
                    {watermark.text}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="font-bold select-none"
              style={{
                opacity: watermark.opacity,
                color: watermark.color || '#e5e7eb',
                transform: `rotate(${watermark.rotation}deg)`,
                fontSize:
                  watermark.size === 'small'
                    ? '3rem'
                    : watermark.size === 'large'
                    ? '6rem'
                    : '4.5rem',
              }}
            >
              {watermark.text}
            </div>
          )}
        </>
      )}
      {watermark.type === 'image' && watermark.imageUrl && (
        <>
          {watermark.position === 'repeat' ? (
            <div className="w-full h-full grid grid-cols-3 grid-rows-4 gap-4 p-8">
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={index} className="flex items-center justify-center">
                  <img
                    src={watermark.imageUrl}
                    alt="Watermark"
                    className="select-none"
                    style={{
                      opacity: watermark.opacity,
                      transform: `rotate(${watermark.rotation}deg)`,
                      maxWidth:
                        watermark.size === 'small'
                          ? '60px'
                          : watermark.size === 'large'
                          ? '120px'
                          : '90px',
                      maxHeight:
                        watermark.size === 'small'
                          ? '60px'
                          : watermark.size === 'large'
                          ? '120px'
                          : '90px',
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <img
              src={watermark.imageUrl}
              alt="Watermark"
              className="select-none"
              style={{
                opacity: watermark.opacity,
                transform: `rotate(${watermark.rotation}deg)`,
                maxWidth:
                  watermark.size === 'small'
                    ? '150px'
                    : watermark.size === 'large'
                    ? '350px'
                    : '250px',
              }}
            />
          )}
        </>
      )}
    </div>
  );
};

// Componente para vista previa de Ticket
const TicketPreview: React.FC<{ config: VoucherDesignConfigurationExtended; sampleData: any }> = ({ config, sampleData }) => {
  const { logo, watermark, footer, documentFields, productFields } = config;

  const ticketProductFields =
    (productFields as import('../../modelos/VoucherDesignUnified').VoucherDesignTicketConfig['productFields']);

  const visibleColumns = Object.entries(ticketProductFields).filter(([, value]) => value.visible);

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
              <h1 className="font-bold text-xs">{sampleData.company.razonSocial}</h1>
              <p className="text-[9px]">RUC: {sampleData.company.ruc}</p>
              <p className="text-[9px]">{sampleData.company.direccionFiscal}</p>
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
                {visibleColumns.map(([key]) => {
                  if (key === 'cantidad') return <span key={key}>CANT</span>;
                  if (key === 'descripcion') return <span key={key}>DESC</span>;
                  if (key === 'precioUnitario') return <span key={key} className="text-right">PRECIO</span>;
                  if (key === 'descuento') return <span key={key} className="text-right">DESC</span>;
                  if (key === 'total') return <span key={key} className="text-right">TOTAL</span>;
                  if (key === 'codigoBarras') return <span key={key}>C.BARRAS</span>;
                  if (key === 'marca') return <span key={key}>MARCA</span>;
                  return <span key={key}>{key}</span>;
                })}
              </div>
              {sampleData.items.map((item: any) => (
                <div key={item.id} className="mb-2">
                  <div className="grid grid-cols-3 gap-1 text-[9px]">
                    {visibleColumns.map(([key, field]) => {
                      if (key === 'cantidad') return <span key={key}>{item.quantity}</span>;
                      if (key === 'descripcion') {
                        const max =
                          'maxLength' in field && typeof field.maxLength === 'number'
                            ? field.maxLength
                            : 30;
                        return (
                          <span key={key} className="truncate">
                            {item.name.substring(0, max)}
                          </span>
                        );
                      }
                      if (key === 'precioUnitario') {
                        return (
                          <span key={key} className="text-right">
                            S/ {item.price.toFixed(2)}
                          </span>
                        );
                      }
                      if (key === 'descuento') {
                        return (
                          <span key={key} className="text-right">
                            0%
                          </span>
                        );
                      }
                      if (key === 'total') {
                        return (
                          <span key={key} className="text-right">
                            S/ {(item.price * item.quantity).toFixed(2)}
                          </span>
                        );
                      }
                      if (key === 'codigoBarras') {
                        return <span key={key}>{item.barcode}</span>;
                      }
                      if (key === 'marca') {
                        return <span key={key}>{item.brand}</span>;
                      }
                      return <span key={key} />;
                    })}
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
