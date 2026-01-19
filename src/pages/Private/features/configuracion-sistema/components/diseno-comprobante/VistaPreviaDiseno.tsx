import { useState } from 'react';
import type { A4VoucherDesign } from './DisenoA4';
import type { TicketVoucherDesign } from './DisenoTicket';
import { Download, Printer, Maximize2, Minimize2, RotateCcw, Settings } from 'lucide-react';

interface DesignPreviewProps {
  designType: 'A4' | 'TICKET';
  design: A4VoucherDesign | TicketVoucherDesign;
  sampleData?: VoucherSampleData;
  onEdit?: () => void;
  onPrint?: () => void;
  onDownload?: (format: 'PDF' | 'PNG') => void;
}

interface VoucherSampleData {
  company: {
    businessName: string;
    tradeName?: string;
    ruc: string;
    address: string;
    phone?: string;
    email?: string;
    logo?: string;
  };
  document: {
    type: string;
    series: string;
    number: string;
    date: Date;
    time: string;
  };
  customer: {
    documentType: string;
    documentNumber: string;
    name: string;
    address?: string;
  };
  items: Array<{
    code?: string;
    description: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    discount?: number;
    total: number;
  }>;
  totals: {
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    totalInWords: string;
  };
  payment: {
    method: string;
    amount: number;
    change?: number;
    reference?: string;
  };
  additional: {
    user?: string;
    establishment?: string;
    terminal?: string;
    notes?: string;
    qrCode?: string;
  };
}

const DEFAULT_SAMPLE_DATA: VoucherSampleData = {
  company: {
    businessName: 'EMPRESA DEMO S.A.C.',
    tradeName: 'TIENDA DEMO',
    ruc: '20123456789',
    address: 'AV. DEMO 123, LIMA, PERÚ',
    phone: '(01) 123-4567',
    email: 'info@empresademo.com',
  },
  document: {
    type: 'BOLETA DE VENTA ELECTRÓNICA',
    series: 'B001',
    number: '00000123',
    date: new Date(),
    time: '14:30:45',
  },
  customer: {
    documentType: 'DNI',
    documentNumber: '12345678',
    name: 'CLIENTE DEMO EJEMPLO',
    address: 'AV. CLIENTE 456, LIMA',
  },
  items: [
    {
      code: 'PROD001',
      description: 'PRODUCTO DEMO EJEMPLO 1',
      quantity: 1,
      unit: 'UND',
      unitPrice: 10.00,
      total: 10.00,
    },
    {
      code: 'PROD002',
      description: 'PRODUCTO DEMO EJEMPLO 2 CON NOMBRE LARGO',
      quantity: 2,
      unit: 'UND',
      unitPrice: 15.50,
      total: 31.00,
    },
    {
      code: 'PROD003',
      description: 'PRODUCTO DEMO EJEMPLO 3',
      quantity: 1,
      unit: 'UND',
      unitPrice: 25.00,
      discount: 2.50,
      total: 22.50,
    },
  ],
  totals: {
    subtotal: 56.44,
    discount: 2.50,
    tax: 10.16,
    total: 63.50,
    totalInWords: 'SESENTA Y TRES CON 50/100 SOLES',
  },
  payment: {
    method: 'EFECTIVO',
    amount: 70.00,
    change: 6.50,
  },
  additional: {
    user: 'JUAN PÉREZ VENDEDOR',
    establishment: 'SUCURSAL PRINCIPAL',
    terminal: 'TERMINAL 001',
    notes: 'Gracias por su compra. Vuelva pronto.',
    qrCode: 'https://efact.sunat.gob.pe/qr?ruc=20123456789&tipo=03&serie=B001&numero=123',
  },
};

export default function DesignPreview({
  designType,
  design,
  sampleData = DEFAULT_SAMPLE_DATA,
  onEdit,
  onPrint,
  onDownload,
}: DesignPreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(false);
  const [showMargins, setShowMargins] = useState(false);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleResetZoom = () => setZoom(100);

  const renderA4Preview = () => {
    const a4Design = design as A4VoucherDesign;
    
    return (
      <div 
        className="bg-white shadow-lg mx-auto relative"
        style={{ 
          width: '210mm', 
          minHeight: '297mm',
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top center'
        }}
      >
        {/* Grid overlay */}
        {showGrid && (
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)',
              backgroundSize: '10mm 10mm'
            }}
          />
        )}

        {/* Margin guides */}
        {showMargins && (
          <div className="absolute inset-0 pointer-events-none">
            <div 
              className="absolute border border-dashed border-red-400"
              style={{
                top: `${a4Design.pageSettings.marginTop}mm`,
                left: `${a4Design.pageSettings.marginLeft}mm`,
                right: `${a4Design.pageSettings.marginRight}mm`,
                bottom: `${a4Design.pageSettings.marginBottom}mm`,
              }}
            />
          </div>
        )}

        <div 
          className="p-4 relative z-10"
          style={{ 
            margin: `${a4Design.pageSettings.marginTop}mm ${a4Design.pageSettings.marginRight}mm ${a4Design.pageSettings.marginBottom}mm ${a4Design.pageSettings.marginLeft}mm`,
            backgroundColor: a4Design.pageSettings.backgroundColor 
          }}
        >
          {/* Watermark */}
          {a4Design.pageSettings.watermark?.enabled && (
            <div 
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{
                transform: `rotate(${a4Design.pageSettings.watermark.rotation}deg)`,
                opacity: a4Design.pageSettings.watermark.opacity,
                color: a4Design.pageSettings.watermark.color,
                fontSize: `${a4Design.pageSettings.watermark.fontSize}px`,
                fontWeight: 'bold',
                zIndex: 1,
              }}
            >
              {a4Design.pageSettings.watermark.text}
            </div>
          )}

          {/* Header */}
          {a4Design.header.enabled && (
            <div 
              className="mb-6 flex items-start justify-between relative z-10"
              style={{ 
                height: `${a4Design.header.height}px`,
                backgroundColor: a4Design.header.backgroundColor 
              }}
            >
              {/* Logo */}
              {a4Design.header.logo.enabled && (
                <div className={`flex ${a4Design.header.logo.position === 'center' ? 'justify-center' : a4Design.header.logo.position === 'right' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className="bg-gray-200 border-2 border-dashed border-gray-400 flex items-center justify-center"
                    style={{ 
                      width: `${a4Design.header.logo.width}px`,
                      height: `${a4Design.header.logo.height}px` 
                    }}
                  >
                    {sampleData.company.logo ? (
                      <img 
                        src={sampleData.company.logo} 
                        alt="Logo"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-gray-400 text-xs">LOGO</span>
                    )}
                  </div>
                </div>
              )}

              {/* Company Info */}
              {a4Design.header.companyInfo.enabled && (
                <div className={`text-${a4Design.header.companyInfo.alignment} flex-1 mx-4`}>
                  <div 
                    style={{ 
                      fontSize: `${a4Design.header.companyInfo.fontSize}px`,
                      fontWeight: a4Design.header.companyInfo.fontWeight,
                      color: a4Design.header.companyInfo.color 
                    }}
                  >
                    {a4Design.header.companyInfo.showBusinessName && <div className="font-bold">{sampleData.company.businessName}</div>}
                    {a4Design.header.companyInfo.showRuc && <div>RUC: {sampleData.company.ruc}</div>}
                    {a4Design.header.companyInfo.showAddress && <div>{sampleData.company.address}</div>}
                    {a4Design.header.companyInfo.showPhone && sampleData.company.phone && <div>Tel: {sampleData.company.phone}</div>}
                    {a4Design.header.companyInfo.showEmail && sampleData.company.email && <div>{sampleData.company.email}</div>}
                  </div>
                </div>
              )}

              {/* Document Info */}
              {a4Design.header.documentInfo.enabled && (
                <div 
                  className="border text-center"
                  style={{ 
                    fontSize: `${a4Design.header.documentInfo.fontSize}px`,
                    fontWeight: a4Design.header.documentInfo.fontWeight,
                    color: a4Design.header.documentInfo.color,
                    backgroundColor: a4Design.header.documentInfo.backgroundColor,
                    borderColor: a4Design.header.documentInfo.borderColor,
                    borderWidth: `${a4Design.header.documentInfo.borderWidth}px`,
                    padding: `${a4Design.header.documentInfo.padding}px` 
                  }}
                >
                  <div>{sampleData.document.type}</div>
                  <div className="font-bold text-lg">{sampleData.document.series}-{sampleData.document.number}</div>
                </div>
              )}
            </div>
          )}

          {/* Customer Section */}
          {a4Design.customer?.enabled && (
            <div 
              className="mb-4 border"
              style={{
                fontSize: `${a4Design.customer.fontSize}px`,
                color: a4Design.customer.color,
                backgroundColor: a4Design.customer.backgroundColor,
                borderColor: a4Design.customer.borderColor,
                borderWidth: `${a4Design.customer.borderWidth}px`,
                padding: `${a4Design.customer.padding}px`
              }}
            >
              <div className="font-bold mb-2">{a4Design.customer.title}</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  {a4Design.customer.showDocumentType && a4Design.customer.showDocumentNumber && (
                    <div><strong>{sampleData.customer.documentType}:</strong> {sampleData.customer.documentNumber}</div>
                  )}
                  {a4Design.customer.showName && (
                    <div><strong>Cliente:</strong> {sampleData.customer.name}</div>
                  )}
                </div>
                <div>
                  {a4Design.customer.showAddress && sampleData.customer.address && (
                    <div><strong>Dirección:</strong> {sampleData.customer.address}</div>
                  )}
                  <div><strong>Fecha:</strong> {sampleData.document.date.toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          )}

          {/* Items Table */}
          {a4Design.itemsTable?.enabled && (
            <div className="mb-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr 
                    style={{
                      backgroundColor: a4Design.itemsTable.headerBackgroundColor,
                      color: a4Design.itemsTable.headerTextColor,
                      fontSize: `${a4Design.itemsTable.headerFontSize}px`,
                      fontWeight: a4Design.itemsTable.headerFontWeight,
                    }}
                  >
                    {a4Design.itemsTable.columns.code.enabled && (
                      <th className="border p-2 text-left" style={{ width: `${a4Design.itemsTable.columns.code.width}%` }}>
                        {a4Design.itemsTable.columns.code.title}
                      </th>
                    )}
                    {a4Design.itemsTable.columns.item.enabled && (
                      <th className="border p-2 text-left" style={{ width: `${a4Design.itemsTable.columns.item.width}%` }}>
                        {a4Design.itemsTable.columns.item.title}
                      </th>
                    )}
                    {a4Design.itemsTable.columns.unit.enabled && (
                      <th className="border p-2 text-center" style={{ width: `${a4Design.itemsTable.columns.unit.width}%` }}>
                        {a4Design.itemsTable.columns.unit.title}
                      </th>
                    )}
                    {a4Design.itemsTable.columns.quantity.enabled && (
                      <th className="border p-2 text-center" style={{ width: `${a4Design.itemsTable.columns.quantity.width}%` }}>
                        {a4Design.itemsTable.columns.quantity.title}
                      </th>
                    )}
                    {a4Design.itemsTable.columns.unitPrice.enabled && (
                      <th className="border p-2 text-right" style={{ width: `${a4Design.itemsTable.columns.unitPrice.width}%` }}>
                        {a4Design.itemsTable.columns.unitPrice.title}
                      </th>
                    )}
                    {a4Design.itemsTable.columns.discount.enabled && (
                      <th className="border p-2 text-right" style={{ width: `${a4Design.itemsTable.columns.discount.width}%` }}>
                        {a4Design.itemsTable.columns.discount.title}
                      </th>
                    )}
                    {a4Design.itemsTable.columns.total.enabled && (
                      <th className="border p-2 text-right" style={{ width: `${a4Design.itemsTable.columns.total.width}%` }}>
                        {a4Design.itemsTable.columns.total.title}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {sampleData.items.map((item, index) => (
                    <tr 
                      key={index}
                      style={{
                        backgroundColor: index % 2 === 0 ? a4Design.itemsTable.rowBackgroundColor : a4Design.itemsTable.rowAlternateBackgroundColor,
                        color: a4Design.itemsTable.rowTextColor,
                        fontSize: `${a4Design.itemsTable.rowFontSize}px`,
                      }}
                    >
                      {a4Design.itemsTable.columns.code.enabled && (
                        <td className="border p-2">{item.code}</td>
                      )}
                      {a4Design.itemsTable.columns.item.enabled && (
                        <td className="border p-2">{item.description}</td>
                      )}
                      {a4Design.itemsTable.columns.unit.enabled && (
                        <td className="border p-2 text-center">{item.unit}</td>
                      )}
                      {a4Design.itemsTable.columns.quantity.enabled && (
                        <td className="border p-2 text-center">{item.quantity.toFixed(2)}</td>
                      )}
                      {a4Design.itemsTable.columns.unitPrice.enabled && (
                        <td className="border p-2 text-right">S/ {item.unitPrice.toFixed(2)}</td>
                      )}
                      {a4Design.itemsTable.columns.discount.enabled && (
                        <td className="border p-2 text-right">S/ {(item.discount || 0).toFixed(2)}</td>
                      )}
                      {a4Design.itemsTable.columns.total.enabled && (
                        <td className="border p-2 text-right">S/ {item.total.toFixed(2)}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          {a4Design.totals?.enabled && (
            <div className="flex justify-end mb-4">
              <div 
                className="border"
                style={{
                  width: `${a4Design.totals.width}px`,
                  fontSize: `${a4Design.totals.fontSize}px`,
                  fontWeight: a4Design.totals.fontWeight,
                  color: a4Design.totals.color,
                  backgroundColor: a4Design.totals.backgroundColor,
                  borderColor: a4Design.totals.borderColor,
                  borderWidth: `${a4Design.totals.borderWidth}px`,
                  padding: `${a4Design.totals.padding}px`
                }}
              >
                {a4Design.totals.showSubtotal && (
                  <div className="flex justify-between mb-1">
                    <span>Subtotal:</span>
                    <span>S/ {sampleData.totals.subtotal.toFixed(2)}</span>
                  </div>
                )}
                {a4Design.totals.showDiscount && sampleData.totals.discount > 0 && (
                  <div className="flex justify-between mb-1">
                    <span>Descuento:</span>
                    <span>-S/ {sampleData.totals.discount.toFixed(2)}</span>
                  </div>
                )}
                {a4Design.totals.showTax && (
                  <div className="flex justify-between mb-1">
                    <span>IGV (18%):</span>
                    <span>S/ {sampleData.totals.tax.toFixed(2)}</span>
                  </div>
                )}
                {a4Design.totals.showTotal && (
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>TOTAL:</span>
                    <span>S/ {sampleData.totals.total.toFixed(2)}</span>
                  </div>
                )}
                {a4Design.totals.showTotalInWords && (
                  <div className="mt-2 text-sm">
                    <strong>Son:</strong> {sampleData.totals.totalInWords}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          {a4Design.footer?.enabled && (
            <div 
              className="mt-6"
              style={{ 
                height: `${a4Design.footer.height}px`,
                backgroundColor: a4Design.footer.backgroundColor 
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
                {/* Payment Info */}
                {a4Design.footer.paymentInfo?.enabled && (
                  <div>
                    <h4 
                      className="font-bold mb-2"
                      style={{ 
                        fontSize: `${a4Design.footer.paymentInfo.fontSize}px`,
                        color: a4Design.footer.paymentInfo.color 
                      }}
                    >
                      {a4Design.footer.paymentInfo.title}
                    </h4>
                    <div 
                      style={{ 
                        fontSize: `${a4Design.footer.paymentInfo.fontSize}px`,
                        color: a4Design.footer.paymentInfo.color 
                      }}
                    >
                      {a4Design.footer.paymentInfo.showPaymentMethod && (
                        <div><strong>Método:</strong> {sampleData.payment.method}</div>
                      )}
                      {a4Design.footer.paymentInfo.showAmount && (
                        <div><strong>Recibido:</strong> S/ {sampleData.payment.amount.toFixed(2)}</div>
                      )}
                      {sampleData.payment.change && sampleData.payment.change > 0 && (
                        <div><strong>Vuelto:</strong> S/ {sampleData.payment.change.toFixed(2)}</div>
                      )}
                      {a4Design.footer.paymentInfo.showReference && sampleData.payment.reference && (
                        <div><strong>Ref:</strong> {sampleData.payment.reference}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {a4Design.footer.notes?.enabled && (
                  <div>
                    <h4 
                      className="font-bold mb-2"
                      style={{ 
                        fontSize: `${a4Design.footer.notes.fontSize}px`,
                        color: a4Design.footer.notes.color 
                      }}
                    >
                      {a4Design.footer.notes.title}
                    </h4>
                    <div 
                      style={{ 
                        fontSize: `${a4Design.footer.notes.fontSize}px`,
                        color: a4Design.footer.notes.color 
                      }}
                    >
                      {sampleData.additional.notes || a4Design.footer.notes.defaultText}
                    </div>
                  </div>
                )}

                {/* QR Code */}
                {a4Design.footer.qrCode?.enabled && (
                  <div className={`flex justify-${a4Design.footer.qrCode.position}`}>
                    <div 
                      className="border-2 border-dashed border-gray-400 flex items-center justify-center bg-gray-100"
                      style={{ 
                        width: `${a4Design.footer.qrCode.size}px`,
                        height: `${a4Design.footer.qrCode.size}px` 
                      }}
                    >
                      <span className="text-gray-500 text-xs">QR CODE</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Signatures */}
              {a4Design.footer.signatures?.enabled && (
                <div className="flex justify-between mt-8">
                  {a4Design.footer.signatures.showCustomerSignature && (
                    <div className="text-center">
                      <div className="border-t border-gray-400 w-48 mb-2"></div>
                      <div 
                        style={{ 
                          fontSize: `${a4Design.footer.signatures.fontSize}px`,
                          color: a4Design.footer.signatures.color 
                        }}
                      >
                        Firma del Cliente
                      </div>
                    </div>
                  )}
                  {a4Design.footer.signatures.showCompanySignature && (
                    <div className="text-center">
                      <div className="border-t border-gray-400 w-48 mb-2"></div>
                      <div 
                        style={{ 
                          fontSize: `${a4Design.footer.signatures.fontSize}px`,
                          color: a4Design.footer.signatures.color 
                        }}
                      >
                        Firma Autorizada
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTicketPreview = () => {
    const ticketDesign = design as TicketVoucherDesign;
    const ticketWidth = ticketDesign.paperSettings.width === 58 ? '58mm' : '80mm';
    
    return (
      <div 
        className="bg-white shadow-lg mx-auto font-mono text-black relative"
        style={{ 
          width: ticketWidth,
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top center'
        }}
      >
        {/* Grid overlay */}
        {showGrid && (
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px)',
              backgroundSize: '2mm 2mm'
            }}
          />
        )}

        <div 
          className="p-2"
          style={{ 
            marginLeft: `${ticketDesign.paperSettings.marginLeft}mm`,
            marginRight: `${ticketDesign.paperSettings.marginRight}mm`,
            marginTop: `${ticketDesign.paperSettings.marginTop}mm`,
            marginBottom: `${ticketDesign.paperSettings.marginBottom}mm`,
            lineHeight: ticketDesign.paperSettings.lineSpacing
          }}
        >
          {/* Render ticket content similar to TicketDesign preview but with actual data */}
          {ticketDesign.header.enabled && (
            <div className="mb-2">
              {ticketDesign.header.companyInfo.enabled && (
                <div className={`text-${ticketDesign.header.companyInfo.alignment} text-${ticketDesign.header.companyInfo.fontSize} ${ticketDesign.header.companyInfo.fontWeight === 'bold' ? 'font-bold' : ''}`}>
                  {ticketDesign.header.companyInfo.showBusinessName && <div>{sampleData.company.businessName}</div>}
                  {ticketDesign.header.companyInfo.showTradeName && sampleData.company.tradeName && <div>{sampleData.company.tradeName}</div>}
                  {ticketDesign.header.companyInfo.showRuc && <div>RUC: {sampleData.company.ruc}</div>}
                  {ticketDesign.header.companyInfo.showAddress && <div>{sampleData.company.address}</div>}
                  {ticketDesign.header.companyInfo.showPhone && sampleData.company.phone && <div>TEL: {sampleData.company.phone}</div>}
                  {ticketDesign.header.companyInfo.showEmail && sampleData.company.email && <div>{sampleData.company.email}</div>}
                </div>
              )}
              
              {ticketDesign.header.documentInfo.enabled && (
                <div className={`text-${ticketDesign.header.documentInfo.alignment} text-${ticketDesign.header.documentInfo.fontSize} ${ticketDesign.header.documentInfo.fontWeight === 'bold' ? 'font-bold' : ''} mt-1`}>
                  {ticketDesign.header.documentInfo.showDocumentType && <div>{sampleData.document.type}</div>}
                  {ticketDesign.header.documentInfo.showSeries && ticketDesign.header.documentInfo.showNumber && <div>{sampleData.document.series}-{sampleData.document.number}</div>}
                  {ticketDesign.header.documentInfo.showDate && <div>{sampleData.document.date.toLocaleDateString()}</div>}
                  {ticketDesign.header.documentInfo.showTime && <div>{sampleData.document.time}</div>}
                </div>
              )}
              
              {ticketDesign.header.separatorLine.enabled && (
                <div className="text-center">
                  {ticketDesign.header.separatorLine.character.repeat(Math.min(ticketDesign.header.separatorLine.repeat, ticketDesign.paperSettings.characterWidth))}
                </div>
              )}
            </div>
          )}

          {/* Customer section with real data */}
          {ticketDesign.customer.enabled && (
            <div className="mb-2">
              <div className={`text-${ticketDesign.customer.titleAlignment} ${ticketDesign.customer.titleFontWeight === 'bold' ? 'font-bold' : ''} text-${ticketDesign.customer.fontSize}`}>
                {ticketDesign.customer.title}
              </div>
              <div className={`text-${ticketDesign.customer.alignment} text-${ticketDesign.customer.fontSize}`}>
                {ticketDesign.customer.showDocumentType && ticketDesign.customer.showDocumentNumber && <div>{sampleData.customer.documentType}: {sampleData.customer.documentNumber}</div>}
                {ticketDesign.customer.showName && <div>{sampleData.customer.name}</div>}
                {ticketDesign.customer.showAddress && sampleData.customer.address && <div>{sampleData.customer.address}</div>}
              </div>
              {ticketDesign.customer.separatorAfter && (
                <div className="text-center">
                  {'-'.repeat(Math.min(ticketDesign.paperSettings.characterWidth, 42))}
                </div>
              )}
            </div>
          )}

          {/* Items with real data */}
          {ticketDesign.items.enabled && (
            <div className="mb-2">
              {ticketDesign.items.showHeader && (
                <div className={`text-${ticketDesign.items.headerAlignment} ${ticketDesign.items.headerFontWeight === 'bold' ? 'font-bold' : ''} text-${ticketDesign.items.fontSize}`}>
                  {ticketDesign.items.layout === 'detailed' ? (
                    <div>CANT  DESCRIPCION        P.U.   TOTAL</div>
                  ) : (
                    <div>PRODUCTOS:</div>
                  )}
                </div>
              )}
              
              <div className={`text-${ticketDesign.items.fontSize}`}>
                {sampleData.items.map((item, index) => (
                  <div key={index}>
                    {ticketDesign.items.layout === 'detailed' ? (
                      <>
                        <div>{item.quantity.toFixed(2).padEnd(6)} {item.description.substring(0, ticketDesign.items.maxDescriptionLength).padEnd(15)} {item.unitPrice.toFixed(2).padStart(6)} {item.total.toFixed(2).padStart(7)}</div>
                      </>
                    ) : (
                      <div>{item.quantity}x {item.description.substring(0, ticketDesign.items.maxDescriptionLength)} {''.padEnd(Math.max(0, 35 - item.description.length), '.')} {item.total.toFixed(2)}</div>
                    )}
                  </div>
                ))}
              </div>
              
              {ticketDesign.items.separatorAfter && (
                <div className="text-center">
                  {'-'.repeat(Math.min(ticketDesign.paperSettings.characterWidth, 42))}
                </div>
              )}
            </div>
          )}

          {/* Continue with totals, payment, and footer sections using real data... */}
          
        </div>
      </div>
    );
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'h-full'}`}>
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-medium text-gray-900">
            Vista Previa - {designType === 'A4' ? 'Formato A4' : 'Formato Ticket'}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Zoom: {zoom}%</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 mr-4">
            <button
              onClick={handleZoomOut}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              disabled={zoom <= 50}
            >
              <Minimize2 className="h-4 w-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              disabled={zoom >= 200}
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>

          {/* View Options */}
          <div className="flex items-center gap-2 mr-4">
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Grid
            </label>
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={showMargins}
                onChange={(e) => setShowMargins(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Márgenes
            </label>
          </div>

          {/* Action Buttons */}
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-3 py-1 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              <Settings className="h-4 w-4" />
              Editar
            </button>
          )}

          {onPrint && (
            <button
              onClick={onPrint}
              className="flex items-center gap-2 px-3 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
          )}

          {onDownload && (
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-1 text-sm text-white rounded transition-colors" style={{ backgroundColor: '#1478D4' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1068C4'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1478D4'}>
                <Download className="h-4 w-4" />
                Descargar
              </button>
              <div className="absolute right-0 top-8 w-32 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <button
                  onClick={() => onDownload('PDF')}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 rounded-t-lg"
                >
                  PDF
                </button>
                <button
                  onClick={() => onDownload('PNG')}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 rounded-b-lg"
                >
                  PNG
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 bg-gray-100 p-6 overflow-auto">
        <div className="flex justify-center">
          {designType === 'A4' ? renderA4Preview() : renderTicketPreview()}
        </div>
      </div>

      {/* Fullscreen overlay */}
      {isFullscreen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsFullscreen(false)}
        />
      )}
    </div>
  );
}