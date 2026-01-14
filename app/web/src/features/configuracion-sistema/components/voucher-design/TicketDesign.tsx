import { useState, useEffect } from 'react';
import { Eye, Settings } from 'lucide-react';

interface TicketDesignProps {
  onDesignChange: (design: TicketVoucherDesign) => void;
  initialDesign?: TicketVoucherDesign;
}

export interface TicketVoucherDesign {
  id: string;
  name: string;
  
  // Paper settings
  paperSettings: {
    width: 58 | 80; // mm
    marginLeft: number;
    marginRight: number;
    marginTop: number;
    marginBottom: number;
    lineSpacing: number;
    characterWidth: number;
  };
  
  // Header section
  header: {
    enabled: boolean;
    
    // Company logo
    logo: {
      enabled: boolean;
      alignment: 'left' | 'center' | 'right';
      width: number;
      height: number;
    };
    
    // Company info
    companyInfo: {
      enabled: boolean;
      alignment: 'left' | 'center' | 'right';
      fontSize: 'small' | 'medium' | 'large';
      fontWeight: 'normal' | 'bold';
      showBusinessName: boolean;
      showTradeName: boolean;
      showRuc: boolean;
      showAddress: boolean;
      showPhone: boolean;
      showEmail: boolean;
      lineSpacing: number;
    };
    
    // Document info
    documentInfo: {
      enabled: boolean;
      alignment: 'left' | 'center' | 'right';
      fontSize: 'small' | 'medium' | 'large';
      fontWeight: 'normal' | 'bold';
      showDocumentType: boolean;
      showSeries: boolean;
      showNumber: boolean;
      showDate: boolean;
      showTime: boolean;
      lineSpacing: number;
    };
    
    separatorLine: {
      enabled: boolean;
      character: string;
      repeat: number;
    };
  };
  
  // Customer section
  customer: {
    enabled: boolean;
    title: string;
    titleAlignment: 'left' | 'center' | 'right';
    titleFontWeight: 'normal' | 'bold';
    fontSize: 'small' | 'medium' | 'large';
    alignment: 'left' | 'center' | 'right';
    showDocumentType: boolean;
    showDocumentNumber: boolean;
    showName: boolean;
    showAddress: boolean;
    lineSpacing: number;
    separatorAfter: boolean;
  };
  
  // Items section
  items: {
    enabled: boolean;
    
    // Header
    showHeader: boolean;
    headerAlignment: 'left' | 'center' | 'right';
    headerFontWeight: 'normal' | 'bold';
    
    // Columns
    layout: 'simple' | 'detailed';
    showQuantity: boolean;
    showUnitPrice: boolean;
    showTotal: boolean;
    showCode: boolean;
    
    // Formatting
    fontSize: 'small' | 'medium' | 'large';
    lineSpacing: number;
    separateItems: boolean;
    maxDescriptionLength: number;
    
    separatorAfter: boolean;
  };
  
  // Totals section
  totals: {
    enabled: boolean;
    alignment: 'left' | 'center' | 'right';
    fontSize: 'small' | 'medium' | 'large';
    fontWeight: 'normal' | 'bold';
    
    showSubtotal: boolean;
    showDiscount: boolean;
    showTax: boolean;
    showTotal: boolean;
    
    totalFontSize: 'small' | 'medium' | 'large';
    totalFontWeight: 'normal' | 'bold';
    lineSpacing: number;
    separatorBefore: boolean;
    separatorAfter: boolean;
  };
  
  // Payment section
  payment: {
    enabled: boolean;
    title: string;
    titleAlignment: 'left' | 'center' | 'right';
    fontSize: 'small' | 'medium' | 'large';
    alignment: 'left' | 'center' | 'right';
    showPaymentMethod: boolean;
    showAmount: boolean;
    showChange: boolean;
    showReference: boolean;
    lineSpacing: number;
    separatorAfter: boolean;
  };
  
  // Footer section
  footer: {
    enabled: boolean;
    
    // QR Code
    qrCode: {
      enabled: boolean;
      alignment: 'left' | 'center' | 'right';
      size: 'small' | 'medium' | 'large';
      marginTop: number;
      marginBottom: number;
    };
    
    // Additional info
    additionalInfo: {
      enabled: boolean;
      alignment: 'left' | 'center' | 'right';
      fontSize: 'small' | 'medium' | 'large';
      showUser: boolean;
      showEstablishment: boolean;
      showTerminal: boolean;
      lineSpacing: number;
    };
    
    // Thank you message
    thankYouMessage: {
      enabled: boolean;
      text: string;
      alignment: 'left' | 'center' | 'right';
      fontSize: 'small' | 'medium' | 'large';
      fontWeight: 'normal' | 'bold';
      marginTop: number;
    };
    
    // Cut line
    cutLine: {
      enabled: boolean;
      character: string;
      repeat: number;
      marginTop: number;
    };
  };
}

const DEFAULT_TICKET_DESIGN: TicketVoucherDesign = {
  id: 'default-ticket',
  name: 'Diseño Ticket Estándar',
  
  paperSettings: {
    width: 80,
    marginLeft: 2,
    marginRight: 2,
    marginTop: 5,
    marginBottom: 10,
    lineSpacing: 1,
    characterWidth: 42,
  },
  
  header: {
    enabled: true,
    
    logo: {
      enabled: false,
      alignment: 'center',
      width: 60,
      height: 60,
    },
    
    companyInfo: {
      enabled: true,
      alignment: 'center',
      fontSize: 'medium',
      fontWeight: 'bold',
      showBusinessName: true,
      showTradeName: false,
      showRuc: true,
      showAddress: true,
      showPhone: true,
      showEmail: false,
      lineSpacing: 1,
    },
    
    documentInfo: {
      enabled: true,
      alignment: 'center',
      fontSize: 'medium',
      fontWeight: 'bold',
      showDocumentType: true,
      showSeries: true,
      showNumber: true,
      showDate: true,
      showTime: true,
      lineSpacing: 1,
    },
    
    separatorLine: {
      enabled: true,
      character: '=',
      repeat: 42,
    },
  },
  
  customer: {
    enabled: true,
    title: 'CLIENTE',
    titleAlignment: 'left',
    titleFontWeight: 'bold',
    fontSize: 'small',
    alignment: 'left',
    showDocumentType: true,
    showDocumentNumber: true,
    showName: true,
    showAddress: false,
    lineSpacing: 1,
    separatorAfter: true,
  },
  
  items: {
    enabled: true,
    
    showHeader: true,
    headerAlignment: 'left',
    headerFontWeight: 'bold',
    
    layout: 'simple',
    showQuantity: true,
    showUnitPrice: true,
    showTotal: true,
    showCode: false,
    
    fontSize: 'small',
    lineSpacing: 1,
    separateItems: false,
    maxDescriptionLength: 25,
    
    separatorAfter: true,
  },
  
  totals: {
    enabled: true,
    alignment: 'right',
    fontSize: 'small',
    fontWeight: 'normal',
    
    showSubtotal: true,
    showDiscount: false,
    showTax: true,
    showTotal: true,
    
    totalFontSize: 'medium',
    totalFontWeight: 'bold',
    lineSpacing: 1,
    separatorBefore: true,
    separatorAfter: false,
  },
  
  payment: {
    enabled: true,
    title: 'PAGO',
    titleAlignment: 'left',
    fontSize: 'small',
    alignment: 'left',
    showPaymentMethod: true,
    showAmount: true,
    showChange: true,
    showReference: false,
    lineSpacing: 1,
    separatorAfter: false,
  },
  
  footer: {
    enabled: true,
    
    qrCode: {
      enabled: true,
      alignment: 'center',
      size: 'medium',
      marginTop: 2,
      marginBottom: 2,
    },
    
    additionalInfo: {
      enabled: false,
      alignment: 'center',
      fontSize: 'small',
      showUser: true,
      showEstablishment: true,
      showTerminal: false,
      lineSpacing: 1,
    },
    
    thankYouMessage: {
      enabled: true,
      text: 'Gracias por su compra',
      alignment: 'center',
      fontSize: 'small',
      fontWeight: 'normal',
      marginTop: 2,
    },
    
    cutLine: {
      enabled: true,
      character: '-',
      repeat: 42,
      marginTop: 2,
    },
  },
};

export default function TicketDesign({ onDesignChange, initialDesign }: TicketDesignProps) {
  const [design] = useState<TicketVoucherDesign>(initialDesign || DEFAULT_TICKET_DESIGN);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    onDesignChange(design);
  }, [design, onDesignChange]);

  const getFontSizeClass = (size: 'small' | 'medium' | 'large') => {
    switch (size) {
      case 'small': return 'text-xs';
      case 'medium': return 'text-sm';
      case 'large': return 'text-base';
      default: return 'text-sm';
    }
  };

  const renderTicketPreview = () => {
    const ticketWidth = `${design.paperSettings.width}mm`;
    const charCount = design.paperSettings.characterWidth;

    return (
      <div className="bg-white shadow-lg mx-auto font-mono text-black" style={{ width: ticketWidth }}>
        <div
          className="p-2"
          style={{
            marginLeft: `${design.paperSettings.marginLeft}mm`,
            marginRight: `${design.paperSettings.marginRight}mm`,
            marginTop: `${design.paperSettings.marginTop}mm`,
            marginBottom: `${design.paperSettings.marginBottom}mm`,
            lineHeight: design.paperSettings.lineSpacing
          }}
        >
          {/* Header */}
          {design.header.enabled && (
            <div className="mb-2">
              {/* Company Info */}
              {design.header.companyInfo.enabled && (
                <div className={`text-${design.header.companyInfo.alignment} ${getFontSizeClass(design.header.companyInfo.fontSize)} ${design.header.companyInfo.fontWeight === 'bold' ? 'font-bold' : ''}`}>
                  {design.header.companyInfo.showBusinessName && <div>EMPRESA DEMO S.A.C.</div>}
                  {design.header.companyInfo.showTradeName && <div>TIENDA DEMO</div>}
                  {design.header.companyInfo.showRuc && <div>RUC: 20123456789</div>}
                  {design.header.companyInfo.showAddress && <div>AV. DEMO 123, LIMA</div>}
                  {design.header.companyInfo.showPhone && <div>TEL: (01) 123-4567</div>}
                  {design.header.companyInfo.showEmail && <div>demo@empresa.com</div>}
                </div>
              )}
              
              {/* Document Info */}
              {design.header.documentInfo.enabled && (
                <div className={`text-${design.header.documentInfo.alignment} ${getFontSizeClass(design.header.documentInfo.fontSize)} ${design.header.documentInfo.fontWeight === 'bold' ? 'font-bold' : ''} mt-1`}>
                  {design.header.documentInfo.showDocumentType && <div>BOLETA DE VENTA</div>}
                  {design.header.documentInfo.showSeries && design.header.documentInfo.showNumber && <div>B001-00000123</div>}
                  {design.header.documentInfo.showDate && <div>26/09/2025</div>}
                  {design.header.documentInfo.showTime && <div>14:30:45</div>}
                </div>
              )}
              
              {/* Separator */}
              {design.header.separatorLine.enabled && (
                <div className="text-center">
                  {design.header.separatorLine.character.repeat(Math.min(design.header.separatorLine.repeat, charCount))}
                </div>
              )}
            </div>
          )}

          {/* Customer */}
          {design.customer.enabled && (
            <div className="mb-2">
              <div className={`text-${design.customer.titleAlignment} ${design.customer.titleFontWeight === 'bold' ? 'font-bold' : ''}`}>
                {design.customer.title}
              </div>
              <div className={`text-${design.customer.alignment} ${getFontSizeClass(design.customer.fontSize)}`}>
                {design.customer.showDocumentType && design.customer.showDocumentNumber && <div>DNI: 12345678</div>}
                {design.customer.showName && <div>CLIENTE DEMO</div>}
                {design.customer.showAddress && <div>AV. CLIENTE 456</div>}
              </div>
              {design.customer.separatorAfter && (
                <div className="text-center">
                  {'='.repeat(Math.min(42, charCount))}
                </div>
              )}
            </div>
          )}

          {/* Items - tabla alineada */}
          {design.items.enabled && (
            <div className="mb-2">
              {design.items.showHeader && (
                <div className={`mb-1 text-${design.items.headerAlignment} ${design.items.headerFontWeight === 'bold' ? 'font-bold' : ''}`}>
                  <div className="grid grid-cols-[auto_auto_auto_auto_auto] gap-x-1 text-xs">
                    <span className="text-left">N°</span>
                    <span className="text-left">CÓD.</span>
                    <span className="text-left">DESC.</span>
                    <span className="text-right">CANT</span>
                    <span className="text-right">P.UNIT / TOTAL</span>
                  </div>
                </div>
              )}

              <div className={`${getFontSizeClass(design.items.fontSize)} leading-relaxed`}>
                {[1, 2].map((itemIndex) => (
                  <div key={itemIndex} className="mb-1">
                    <div className="grid grid-cols-[auto_auto_auto_auto_auto] gap-x-1 items-start">
                      <span className="text-left">{itemIndex}</span>
                      <span className="text-left">PRD-000{itemIndex}</span>
                      <span className="text-left break-words">Producto ejemplo {itemIndex}</span>
                      <span className="text-right whitespace-nowrap">1</span>
                      <span className="text-right whitespace-nowrap">50.00 / 50.00</span>
                    </div>
                  </div>
                ))}
              </div>

              {design.items.separatorAfter && (
                <div className="text-center">
                  {'-'.repeat(Math.min(42, charCount))}
                </div>
              )}
            </div>
          )}

          {/* Totals */}
          {design.totals.enabled && (
            <div className="mb-2">
              <div className={`text-${design.totals.alignment} ${getFontSizeClass(design.totals.fontSize)} ${design.totals.fontWeight === 'bold' ? 'font-bold' : ''}`}>
                {design.totals.showSubtotal && <div>SUBTOTAL: S/ 37.29</div>}
                {design.totals.showTax && <div>IGV (18%): S/ 6.71</div>}
                {design.totals.showTotal && <div className={`${getFontSizeClass(design.totals.totalFontSize)} ${design.totals.totalFontWeight === 'bold' ? 'font-bold' : ''}`}>TOTAL: S/ 44.00</div>}
              </div>
            </div>
          )}

          {/* Payment */}
          {design.payment.enabled && (
            <div className="mb-2">
              <div className={`text-${design.payment.titleAlignment} font-bold`}>
                {design.payment.title}
              </div>
              <div className={`text-${design.payment.alignment} ${getFontSizeClass(design.payment.fontSize)}`}>
                {design.payment.showPaymentMethod && <div>EFECTIVO</div>}
                {design.payment.showAmount && <div>RECIBIDO: S/ 50.00</div>}
                {design.payment.showChange && <div>VUELTO: S/ 6.00</div>}
              </div>
            </div>
          )}

          {/* Footer */}
          {design.footer.enabled && (
            <div>
              {design.footer.qrCode.enabled && (
                <div className={`text-${design.footer.qrCode.alignment} my-2`}>
                  <div className="inline-block bg-gray-200 p-2">
                    [QR CODE]
                  </div>
                </div>
              )}
              
              {design.footer.thankYouMessage.enabled && (
                <div className={`text-${design.footer.thankYouMessage.alignment} ${getFontSizeClass(design.footer.thankYouMessage.fontSize)} ${design.footer.thankYouMessage.fontWeight === 'bold' ? 'font-bold' : ''}`} style={{ marginTop: `${design.footer.thankYouMessage.marginTop}mm` }}>
                  {design.footer.thankYouMessage.text}
                </div>
              )}
              
              {design.footer.cutLine.enabled && (
                <div className="text-center" style={{ marginTop: `${design.footer.cutLine.marginTop}mm` }}>
                  {design.footer.cutLine.character.repeat(Math.min(design.footer.cutLine.repeat, charCount))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full">
      {/* Sidebar - Configuration Panel */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Diseño Ticket</h2>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <Eye className="h-4 w-4" />
              {showPreview ? 'Ocultar' : 'Vista Previa'}
            </button>
          </div>

          <div className="text-center text-gray-500">
            <Settings className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Panel de configuración en desarrollo</p>
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 bg-gray-100 p-6 flex items-center justify-center">
        {showPreview ? (
          renderTicketPreview()
        ) : (
          <div className="text-center text-gray-500">
            <Eye className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Haga clic en "Vista Previa" para ver el diseño</p>
          </div>
        )}
      </div>
    </div>
  );
}