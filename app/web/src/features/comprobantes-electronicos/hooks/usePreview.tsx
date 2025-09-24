import { useState } from 'react';
import type { 
  CartItem, 
  TipoComprobante, 
  PaymentTotals, 
  PreviewFormat,
  CompanyData,
  ClientData,
  PreviewData,
  Currency
} from '../models/comprobante.types';

export const usePreview = () => {
  const [showPreview, setShowPreview] = useState(false);
  const [format, setFormat] = useState<PreviewFormat>('a4');

  // Mock company data - en producción vendría de tu configuración
  const mockCompanyData: CompanyData = {
    name: "EMPRENDEDOR FACIL S.A.C.",
    businessName: "EMPRENDEDOR FACIL S.A.C.",
    ruc: "20522022186",
    address: "CAL. MARIO JOSE DE LA MIZO 129 INT. 1302 COM. SAN MIGUEL DE MIRAFLORES LIMA LIMA MIRAFLORES",
    phone: "987654321",
    email: "test@cartier.com"
  };

  // Mock client data - en producción vendría del formulario
  const mockClientData: ClientData = {
    nombre: "FLORES CANALES CARMEN ROSA",
    documento: "09661829",
    tipoDocumento: "dni",
    direccion: "Dirección no definida"
  };

  // Función para generar datos mock de vista previa
  const generatePreviewData = (
    cartItems: CartItem[],
    documentType: TipoComprobante,
    series: string,
    totals: PaymentTotals,
    paymentMethod: string = "CONTADO",
    currency: Currency = "PEN",
    observations?: string,
    internalNotes?: string
  ): PreviewData => {
    // En vista previa no asignamos correlativo, solo mostramos la serie
    const mockNumber = null; // No correlativo en preview
    
    // Fecha actual
    const now = new Date();
    const issueDate = now.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });

    return {
      companyData: mockCompanyData,
      clientData: mockClientData,
      documentType,
      series,
      number: mockNumber,
      issueDate,
      currency,
      paymentMethod,
      cartItems,
      totals,
      observations,
      internalNotes
    };
  };

  // Función para calcular totales detallados
  const calculateDetailedTotals = (cartItems: CartItem[]) => {
    const subtotalGravado = cartItems
      .filter(item => item.igvType === 'igv18')
      .reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const subtotalExonerado = cartItems
      .filter(item => item.igvType === 'exonerado')
      .reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const subtotalInafecto = cartItems
      .filter(item => item.igvType === 'inafecto')
      .reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const igv = subtotalGravado * 0.18;
    const total = subtotalGravado + subtotalExonerado + subtotalInafecto + igv;

    return {
      subtotalGravado,
      subtotalExonerado, 
      subtotalInafecto,
      igv,
      total,
      descuentos: 0,
      recargos: 0
    };
  };

  // Función para convertir número a texto (para el formato ticket)
  const numberToText = (amount: number): string => {
    // Implementación básica - en producción usarías una librería
    const unidades = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const decenas = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
    
    const integerPart = Math.floor(amount);
    const decimalPart = Math.round((amount - integerPart) * 100);
    
    if (integerPart === 0) return 'CERO';
    if (integerPart < 10) return unidades[integerPart];
    if (integerPart < 20) return especiales[integerPart - 10];
    if (integerPart < 100) {
      const dec = Math.floor(integerPart / 10);
      const uni = integerPart % 10;
      return decenas[dec] + (uni > 0 ? ' Y ' + unidades[uni] : '');
    }
    
    // Simplificado para el ejemplo - incluye decimales
    return `${integerPart} Y ${decimalPart.toString().padStart(2, '0')}/100 SOLES`;
  };

  // Generar URL del QR (mock)
  const generateQRUrl = (previewData: PreviewData): string => {
    // En producción, esto sería la URL real de SUNAT
    const baseUrl = 'https://comprobantes.facturafacil.com/';
    const qrData = `${previewData.companyData.ruc}|${previewData.documentType === 'boleta' ? '03' : '01'}|${previewData.series}|${previewData.number}|${previewData.totals.igv.toFixed(2)}|${previewData.totals.total.toFixed(2)}|${previewData.issueDate}|${previewData.clientData.tipoDocumento.toUpperCase()}|${previewData.clientData.documento}`;
    
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(baseUrl + qrData)}`;
  };

  const openPreview = () => setShowPreview(true);
  const closePreview = () => setShowPreview(false);
  const toggleFormat = () => setFormat(prev => prev === 'a4' ? 'ticket' : 'a4');

  return {
    showPreview,
    format,
    openPreview,
    closePreview,
    toggleFormat,
    setFormat,
    generatePreviewData,
    calculateDetailedTotals,
    numberToText,
    generateQRUrl,
    mockCompanyData,
    mockClientData
  };
};