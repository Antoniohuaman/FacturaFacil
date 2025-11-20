import type { Product as CatalogProduct } from '../../catalogo-articulos/models/types';
import type { LucideIcon } from 'lucide-react';

// Re-exportar Product del catálogo para uso en otros módulos
export type { CatalogProduct };

export type ColumnKind = 'base' | 'global-discount' | 'global-increase' | 'product-discount' | 'min-allowed' | 'manual';
export type GlobalRuleType = 'percent' | 'amount';

export interface Column {
  id: string;
  name: string;
  mode: 'fixed' | 'volume';
  visible: boolean;
  isBase: boolean;
  order: number;
  kind: ColumnKind;
  globalRuleType?: GlobalRuleType;
  globalRuleValue?: number | null;
}

// Para precios fijos
export interface FixedPrice {
  type: 'fixed';
  value: number;
  validFrom: string;
  validUntil: string;
}

// Para matriz por volumen - cada rango de cantidad
export interface VolumeRange {
  id: string;
  minQuantity: number;
  maxQuantity: number | null; // null = "en adelante"
  price: number;
}

// Para precios con matriz por volumen
export interface VolumePrice {
  type: 'volume';
  ranges: VolumeRange[];
  validFrom: string;
  validUntil: string;
}

// Union type para cualquier tipo de precio
export type Price = FixedPrice | VolumePrice;

export type ProductUnitPrices = Record<string, Price>;

export interface ProductUnitOption {
  code: string;
  label: string;
  isBase: boolean;
  factor?: number;
}

export interface Product {
  sku: string;
  name: string;
  prices: Record<string, ProductUnitPrices>;
  activeUnitCode?: string;
}

export interface NewColumnForm {
  name: string;
  mode: 'fixed' | 'volume';
  visible: boolean;
  isBase?: boolean;
  kind?: ColumnKind;
  globalRuleType?: GlobalRuleType;
  globalRuleValue?: number | null;
}

// Para el formulario de precio fijo
export interface FixedPriceForm {
  type: 'fixed';
  sku: string;
  columnId: string;
  unitCode: string;
  value: string;
  validFrom: string;
  validUntil: string;
}

// Para el formulario de matriz por volumen
export interface VolumePriceForm {
  type: 'volume';
  sku: string;
  columnId: string;
  unitCode: string;
  ranges: {
    minQuantity: string;
    maxQuantity: string;
    price: string;
  }[];
  validFrom: string;
  validUntil: string;
}

export type PriceForm = FixedPriceForm | VolumePriceForm;

export interface Company {
  name: string;
  ruc: string;
}

export interface Module {
  name: string;
  icon: LucideIcon;
}

export interface UserMenuOption {
  name: string;
  icon: LucideIcon;
}

// Helper para calcular precio según cantidad
export interface PriceCalculation {
  unitPrice: number;
  totalPrice: number;
  appliedRange?: VolumeRange;
}
