import { useMemo } from 'react';
import { useCart } from '../hooks/useCart';
import { usePayment } from '../../shared/form-core/hooks/usePayment';

export const usePosCartAndTotals = () => {
  const {
    cartItems,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    updateCartItemPrice,
    clearCart,
  } = useCart();

  const { calculateTotals } = usePayment();

  const totals = useMemo(() => calculateTotals(cartItems), [cartItems, calculateTotals]);

  const cartActions = useMemo(
    () => ({ addToCart, removeFromCart, updateCartQuantity, updateCartItemPrice, clearCart }),
    [addToCart, removeFromCart, updateCartQuantity, updateCartItemPrice, clearCart],
  );

  return {
    cartItems,
    totals,
    ...cartActions,
  };
};
