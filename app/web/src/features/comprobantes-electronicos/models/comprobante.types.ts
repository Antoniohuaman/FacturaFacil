// ===================================================================
// TIPOS DE DATOS PARA EL SISTEMA DE COMPROBANTES ELECTRÓNICOS
// ===================================================================

// Tipos básicos del sistema
export type TipoComprobante = 'boleta' | 'factura';
export type ViewMode = 'form' | 'pos';
export type DraftAction = 'borradores' | 'continuar' | 'terminar';
export type IgvType = 'igv18' | 'igv10' | 'exonerado' | 'inafecto';
export type PreviewFormat = 'a4' | 'ticket';

// ===================================================================
// INTERFACES DE PRODUCTOS Y CARRITO
// ===================================================================

export interface UnidadMedida {
  value: string;
  label: string;
  fullLabel: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  price: number;
  category: string;
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
}

// ===================================================================
// INTERFACES DE PAGOS
// ===================================================================

export interface PaymentTotals {
  subtotal: number;
  igv: number;
  total: number;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'efectivo' | 'tarjeta' | 'transferencia' | 'yape' | 'plin' | 'deposito';
  amount: number;
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
  createdAt: string;
}

// ===================================================================
// INTERFACES DE CLIENTE
// ===================================================================

export interface ClientData {
  id?: string;
  nombre: string;
  documento: string;
  tipoDocumento: 'dni' | 'ruc' | 'passport';
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
  show: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  totals: PaymentTotals;
  tipoComprobante: TipoComprobante;
  setTipoComprobante: (tipo: TipoComprobante) => void;
  onConfirmSale: () => void;
}

export interface ComprobantHeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onNavigateBack: () => void;
}

export interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  cartItems: CartItem[];
}

export interface CartSidebarProps {
  cartItems: CartItem[];
  onRemoveFromCart: (id: string) => void;
  onUpdateQuantity: (id: string, change: number) => void;
  onClearCart: () => void;
  totals: PaymentTotals;
  onConfirmSale: () => void;
  cajaStatus: 'abierta' | 'cerrada';
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
  number: string;
  issueDate: string;
  dueDate?: string;
  currency: string;
  paymentMethod: string;
  cartItems: CartItem[];
  totals: PaymentTotals;
  observations?: string;
  internalNotes?: string;
}

export interface DetailedTotals extends PaymentTotals {
  subtotalGravado: number;
  subtotalExonerado: number;
  subtotalInafecto: number;
  descuentos: number;
  recargos: number;
}