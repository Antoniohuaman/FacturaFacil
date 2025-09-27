import type { Column, Product } from '../models/PriceTypes';

export const generateColumnId = (columns: Column[]): string => {
  return `P${columns.length + 1}`;
};

export const getNextOrder = (columns: Column[]): number => {
  return Math.max(...columns.map(c => c.order)) + 1;
};

export const filterVisibleColumns = (columns: Column[]): Column[] => {
  return columns.filter(col => col.visible).sort((a, b) => a.order - b.order);
};

export const findBaseColumn = (columns: Column[]): Column | undefined => {
  return columns.find(col => col.isBase);
};

export const filterProducts = (products: Product[], searchTerm: string): Product[] => {
  if (!searchTerm.trim()) return products;
  
  const term = searchTerm.toLowerCase();
  return products.filter(product => 
    product.sku.toLowerCase().includes(term) ||
    product.name.toLowerCase().includes(term)
  );
};

export const countColumnsByMode = (columns: Column[], mode: 'fixed' | 'volume'): number => {
  return columns.filter(c => c.mode === mode).length;
};

export const validateColumnConfiguration = (columns: Column[]): {
  hasBase: boolean;
  hasVisible: boolean;
  isValid: boolean;
} => {
  const hasBase = columns.some(c => c.isBase);
  const hasVisible = columns.some(c => c.visible);
  const isValid = hasBase && hasVisible;
  
  return { hasBase, hasVisible, isValid };
};

export const formatPrice = (value: number): string => {
  return `S/ ${value.toFixed(2)}`;
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};

export const removeProductPricesForColumn = (products: Product[], columnId: string): Product[] => {
  return products.map(product => ({
    ...product,
    prices: Object.fromEntries(
      Object.entries(product.prices).filter(([key]) => key !== columnId)
    )
  }));
};