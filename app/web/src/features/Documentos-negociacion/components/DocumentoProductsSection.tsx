/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
// ===================================================================
// WRAPPER SIMPLIFICADO DE ProductsSection PARA DOCUMENTOS DE NEGOCIACIÓN
// Proporciona props por defecto para reutilizar el componente visual
// ===================================================================

import ProductsSection from '../../comprobantes-electronicos/shared/form-core/components/ProductsSection';
import type { CartItem } from '../../comprobantes-electronicos/models/comprobante.types';

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
  return <ProductsSection {...props} />;
};
