/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
// ===================================================================
// WRAPPER SIMPLIFICADO DE ProductsSection PARA DOCUMENTOS DE NEGOCIACIÓN
// Proporciona props por defecto para reutilizar el componente visual
// ===================================================================

import ProductsSection from '../../comprobantes-electronicos/shared/form-core/components/ProductsSection';
import type { CartItem, DraftAction, TipoComprobante } from '../../comprobantes-electronicos/models/comprobante.types';

interface DocumentoProductsSectionProps {
  cartItems: CartItem[];
  removeFromCart: (id: string) => void;
  updateCartItem: (id: string, updates: Partial<CartItem>) => void;
  addProductsFromSelector: (products: { product: any; quantity: number }[]) => void;
  totals: {
    subtotal: number;
    igv: number;
    total: number;
  };
}

export const DocumentoProductsSection: React.FC<DocumentoProductsSectionProps> = (props) => {
  // Props por defecto para funcionalidades que no usamos en documentos
  const defaultProps = {
    showDraftModal: false,
    setShowDraftModal: () => {},
    showDraftToast: false,
    setShowDraftToast: () => {},
    draftExpiryDate: '',
    setDraftExpiryDate: () => {},
    draftAction: 'save' as DraftAction,
    setDraftAction: () => {},
    handleDraftModalSave: () => {},
    tipoComprobante: 'boleta' as TipoComprobante,
    serieSeleccionada: '',
    clearCart: () => {},
  };

  return <ProductsSection {...props} {...defaultProps} />;
};
