// ===================================================================
// TIPOS DE DATOS PARA EL SISTEMA DE DOCUMENTOS DE NEGOCIACIÓN
// ===================================================================

// Tipos básicos del sistema
export type TipoDocumento = 'cotizacion' | 'nota-venta';
export type EstadoDocumento = 'Borrador' | 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Convertido' | 'Vencido';

// ===================================================================
// INTERFACES DE DOCUMENTOS
// ===================================================================

export interface Documento {
  id: string;
  type: string; // 'Cotización' | 'Nota de Venta'
  clientDoc: string;
  client: string;
  date: string;
  vendor: string;
  total: number;
  status: string;
  statusColor: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'gray';
  isDraft?: boolean; // Para identificar borradores
  // Campos opcionales
  currency?: string;
  exchangeRate?: number;
  paymentMethod?: string;
  email?: string;
  dueDate?: string;
  address?: string;
  shippingAddress?: string;
  purchaseOrder?: string;
  costCenter?: string;
  waybill?: string;
  observations?: string;
  internalNote?: string;
  validUntil?: string; // Para cotizaciones
  items?: any[]; // Productos del documento
  convertedToInvoice?: boolean; // Si ya se convirtió a factura
  convertedDate?: string;
  relatedDocumentId?: string; // ID del documento relacionado (comprobante generado)
  relatedDocumentType?: string; // Tipo de documento relacionado
}

export interface DocumentoListItem extends Documento {
  // Campos adicionales para vista de lista
}

// ===================================================================
// FILTROS Y CONFIGURACIÓN
// ===================================================================

export interface DocumentoFilters {
  estados: string[];
  vendedores: string[];
  formasPago: string[];
  tipos: string[];
  totalMin: string;
  totalMax: string;
}

// ===================================================================
// EXPORTACIÓN DE CONSTANTES
// ===================================================================

export const ESTADOS_COTIZACION = [
  'Borrador',
  'Pendiente',
  'Aprobado',
  'Rechazado',
  'Convertido',
  'Vencido'
] as const;

export const ESTADOS_NOTA_VENTA = [
  'Borrador',
  'Pendiente',
  'Aprobado',
  'Facturado',
  'Anulado'
] as const;
