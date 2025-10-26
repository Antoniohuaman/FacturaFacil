// ===================================================================
// SIDE PREVIEW - TYPES
// Tipos mínimos para el panel lateral de previsualización
// ===================================================================

export interface SidePreviewPaneProps {
  isOpen: boolean;
  onClose: () => void;
  width: number;
  onWidthChange: (width: number) => void;
  
  // View model del comprobante (misma fuente de verdad que el formulario)
  viewModel: {
    tipoComprobante: string;
    serieSeleccionada: string;
    cartItems: any[];
    totals: any;
    observaciones: string;
    notaInterna: string;
    formaPago: string;
    currency: string;
    client?: string;
    clientDoc?: string;
    fechaEmision?: string;
    optionalFields?: Record<string, any>;
  };
  
  // Validación y errores
  hasMinimumData: boolean;
  validationErrors?: Array<{ field: string; message: string }>;
  
  // CTAs
  onConfirm: () => void;
  onSaveDraft: () => void;
  
  // Estado
  isProcessing?: boolean;
}

export interface UseSidePreviewPaneResult {
  isOpen: boolean;
  width: number;
  openPane: () => void;
  closePane: () => void;
  togglePane: () => void;
  setWidth: (width: number) => void;
  snapWidth: (direction: 'left' | 'right') => void;
  isResponsiveOverlay: boolean; // true si <1280px (usa overlay en lugar de splitter)
}

export const PREVIEW_WIDTH_CONFIG = {
  MIN: 360,
  DEFAULT: 560,
  MAX: 720,
  SNAPS: [480, 560, 640],
  PERSIST_KEY: 'comprobantes:emision:preview'
} as const;
