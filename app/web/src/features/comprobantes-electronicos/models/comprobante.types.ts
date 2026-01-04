import type {
  CreditInstallment,
  CreditInstallmentStatus,
  PaymentTermsPayload,
} from '../../../shared/payments/paymentTerms';
import type { CurrencyCode } from '@/shared/currency';

export type { CreditInstallmentStatus };

// ===================================================================
// TIPOS DE DATOS PARA EL SISTEMA DE COMPROBANTES ELECTRÓNICOS
// ===================================================================

// Tipos básicos del sistema
export type TipoComprobante = 'boleta' | 'factura';
export type ViewMode = 'form' | 'pos';
export type DraftAction = 'borradores' | 'continuar' | 'terminar';
export type IgvType = 'igv18' | 'igv10' | 'exonerado' | 'inafecto';
export type PreviewFormat = 'a4' | 'ticket';

// Nuevos tipos para monedas
export type Currency = CurrencyCode;

export interface CurrencyInfo {
  code: Currency;
  symbol: string;
  name: string;
  rate?: number; // Tipo de cambio opcional
}

// ===================================================================
// INTERFACES DE PRODUCTOS Y CARRITO
// ===================================================================

export interface UnidadMedida {
  value: string;
  label: string;
  fullLabel: string;
}

// Tipos para búsqueda de productos
export interface ProductSearchFilters {
  query?: string;
  category?: string;
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
}

export interface ProductSearchResult {
  products: Product[];
  total: number;
  page: number;
  hasMore: boolean;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  price: number;
  category?: string;
  description?: string;
  stock: number; // ✅ Obligatorio para control de stock
  requiresStockControl?: boolean; // ✅ Si requiere validación de stock
  image?: string;
  barcode?: string;
  unit?: string;
  unidadMedida?: string;
  impuesto?: string;
  priceColumnId?: string;
  priceColumnLabel?: string;
  basePrice?: number;
  minAllowedPrice?: number;
  isManualPrice?: boolean;
  isFavorite?: boolean;
  // Datos adicionales del catálogo (opcional)
  catalogData?: {
    impuesto?: string;
    precioCompra?: number;
    descuento?: number;
    marca?: string;
    modelo?: string;
  };
}

export interface CartItem {
  id: string;
  code: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  subtotal?: number;
  total?: number;
  igv?: number;
  igvType?: IgvType;
  unidadMedida?: string;
  currency?: Currency;
  priceColumnId?: string;
  priceColumnLabel?: string;
  minAllowedPrice?: number;
  isManualPrice?: boolean;
  basePrice?: number;
  stock: number; // ✅ Stock disponible
  requiresStockControl?: boolean; // ✅ Si requiere validación de stock

  // ✅ Campos adicionales del producto del catálogo
  descripcion?: string;
  alias?: string;
  marca?: string;
  modelo?: string;
  codigoBarras?: string;
  codigoFabrica?: string;
  precioCompra?: number;
  descuentoProducto?: number;
  peso?: number;
  tipoExistencia?: string; // Tipo de existencia SUNAT (MERCADERIAS, SERVICIOS, etc)
  tipoProducto?: 'BIEN' | 'SERVICIO'; // ✅ Tipo de producto (BIEN o SERVICIO)
  impuesto?: string;
  imagen?: string;
  codigoSunat?: string;
  unidad?: string; // ✅ Nombre de la unidad del producto (ej: "UNIDAD", "KILOGRAMO")
  unit?: string; // ✅ Alias usado por el POS para mostrar la unidad
}

// ===================================================================
// INTERFACES DE PAGOS
// ===================================================================

export type DiscountMode = 'amount' | 'percent';

export interface DiscountInput {
  mode: DiscountMode;
  value: number;
  /**
   * Moneda asociada al valor cuando el modo es monto.
   * Si se omite, se asume la moneda del documento actual.
   */
  currency?: Currency;
}

export interface DiscountDetails {
  mode: DiscountMode;
  /** Valor porcentual aplicado cuando el modo es "%" */
  percent?: number;
  /** Monto descontado expresado en la moneda actual */
  amount: number;
}

export interface PaymentTotals {
  subtotal: number;
  igv: number;
  total: number;
  currency?: Currency; // Nueva propiedad
  discount?: DiscountDetails;
  breakdown?: {
    subtotalBeforeDiscount: number;
    igvBeforeDiscount: number;
    totalBeforeDiscount: number;
  };
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'efectivo' | 'tarjeta' | 'transferencia' | 'yape' | 'plin' | 'deposito';
  amount: number;
}

export type PaymentCollectionMode = 'contado' | 'credito';

export interface PaymentLineInput {
  id: string;
  method: string;
  amount: number;
  reference?: string;
  bank?: string;
  operationNumber?: string;
}

export interface CreditInstallmentAllocation {
  installmentNumber: number;
  amount: number;
  remaining?: number;
  status?: CreditInstallmentStatus;
}

export interface CollectionDocumentPayload {
  seriesId: string;
  seriesCode: string;
  correlative: number;
  fullNumber: string;
  issuedAt?: string;
}

export interface PaymentAttachmentMetadata {
  name: string;
  size: number;
  type?: string;
}

export interface PaymentCollectionPayload {
  mode: PaymentCollectionMode;
  lines: PaymentLineInput[];
  notes?: string;
  cajaDestino?: string;
  fechaCobranza?: string;
  collectionDocument?: CollectionDocumentPayload;
  allocations?: CreditInstallmentAllocation[];
  attachments?: PaymentAttachmentMetadata[];
  collectionCurrency?: Currency;
  collectionExchangeRate?: number;
}

export type ComprobantePaymentTerms = PaymentTermsPayload;
export type ComprobanteCreditInstallment = CreditInstallment;

export interface ComprobanteCreditTerms {
  schedule: ComprobanteCreditInstallment[];
  fechaVencimientoGlobal: string;
  totalPorcentaje?: number;
  saldoPendiente?: number;
  adelanto?: number;
  cuotasPendientes?: number;
  cuotasCanceladas?: number;
}

// Tipos para configuración de caja temporal
export interface CajaIntegrationConfig {
  requiereCajaParaComprobantes: boolean;
  requiereCajaAbierta: boolean;
  modoPosSoloConcaja: boolean;
  usuarioTieneCajaAsignada: boolean;
  cajaEstaAbierta: boolean;
}

// ===================================================================
// INTERFACES DE BORRADORES
// ===================================================================

export interface DraftData {
  id: string;
  tipo: TipoComprobante;
  serie: string;
  productos: CartItem[];
  fechaEmision: string;
  fechaVencimiento?: string;
  cliente?: ClientData;
  observaciones?: string;
  notaInterna?: string;
  totals?: PaymentTotals;
  currency?: Currency;
  vendedor?: string;
  creditTerms?: ComprobanteCreditTerms;
  createdAt: string;
}

// ===================================================================
// INTERFACES DE CLIENTE
// ===================================================================

export interface ClientData {
  id?: string;
  nombre: string;
  tipoDocumento: 'DNI' | 'RUC' | 'dni' | 'ruc';
  documento: string;
  direccion?: string;
  email?: string;
  telefono?: string;
}

// ===================================================================
// INTERFACES DE DOCUMENTOS
// ===================================================================

export interface DocumentInfo {
  tipo: TipoComprobante;
  serie: string;
  numero?: string;
  fechaEmision: string;
  fechaVencimiento?: string;
  tienda: string;
  direccion?: string;
  ordenCompra?: string;
  numeroGuia?: string;
  centroCosto?: string;
}

// ===================================================================
// INTERFACES DE COMPONENTES
// ===================================================================

export interface ToastProps {
  show: boolean;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
  duration?: number;
}

export interface DraftModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (data: { expiryDate: string; action: DraftAction }) => void;
  draftAction: DraftAction;
  setDraftAction: (action: DraftAction) => void;
  draftExpiryDate: string;
  setDraftExpiryDate: (date: string) => void;
}

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  totals: PaymentTotals;
  tipoComprobante: TipoComprobante;
  setTipoComprobante: (tipo: TipoComprobante) => void;
  onPaymentComplete: () => void;
  onViewFullForm: () => void;
  currency?: Currency; // Nueva propiedad
  onCurrencyChange?: (currency: Currency) => void; // Nueva propiedad
}

export interface ComprobantHeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onNavigateBack: () => void;
}

export interface CartSidebarProps {
  cartItems: CartItem[];
  totals: PaymentTotals;
  onUpdateQuantity: (id: string, change: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onConfirmSale: () => void;
  onViewFullForm: () => void;
  cashBoxStatus?: 'open' | 'closed' | 'unknown';
  isProcessing?: boolean;
}

export interface DocumentInfoCardProps {
  tipoComprobante: TipoComprobante;
  serie: string;
  seriesFiltradas: string[];
  onSerieChange: (serie: string) => void;
  showOptionalFields: boolean;
  onToggleOptionalFields: () => void;
}

export interface ProductsSectionProps {
  cartItems: CartItem[];
  onAddProducts: (products: { product: Product; quantity: number }[]) => void;
  onUpdateCartItem: (id: string, updates: Partial<CartItem>) => void;
  onRemoveFromCart: (id: string) => void;
  existingProducts: string[];
}

export interface TotalsSectionProps {
  totals: PaymentTotals;
}

export interface NotesSectionProps {
  observaciones: string;
  notaInterna: string;
  onObservacionesChange: (value: string) => void;
  onNotaInternaChange: (value: string) => void;
}

export interface ClientSidebarProps {
  tipoComprobante: TipoComprobante;
  setTipoComprobante: (tipo: TipoComprobante) => void;
  receivedAmount: string;
  setReceivedAmount: (amount: string) => void;
  totals: PaymentTotals;
  cliente?: ClientData;
  onClientSelect: (client: ClientData) => void;
}

// ===================================================================
// TIPOS DE EVENTOS Y HANDLERS
// ===================================================================

export type CartUpdateHandler = (id: string, updates: Partial<CartItem>) => void;
export type ProductAddHandler = (products: { product: Product; quantity: number }[]) => void;
export type PaymentHandler = (amount: number) => void;
export type ClientSelectHandler = (client: ClientData) => void;

// ===================================================================
// INTERFACES PARA VISTA PREVIA DE COMPROBANTES
// ===================================================================

export interface CompanyData {
  name: string;
  businessName: string;
  ruc: string;
  address: string;
  phone: string;
  email: string;
}

export interface PreviewData {
  companyData: CompanyData;
  clientData: ClientData;
  documentType: TipoComprobante;
  series: string;
  number: string | null; // Permitir null para previews
  issueDate: string;
  dueDate?: string;
  currency: Currency;
  paymentMethod: string;
  cartItems: CartItem[];
  totals: PaymentTotals;
  observations?: string;
  internalNotes?: string;
  creditTerms?: ComprobanteCreditTerms;
}

export interface DetailedTotals extends PaymentTotals {
  subtotalGravado: number;
  subtotalExonerado: number;
  subtotalInafecto: number;
  descuentos: number;
  recargos: number;
}

// Nuevos tipos para búsqueda
// TIPOS LEGACY POS (ProductGridProps, ProductSearchBarProps, QuickProductModalProps)
// se han eliminado al no tener ya componentes activos asociados.