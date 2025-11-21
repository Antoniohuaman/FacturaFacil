import type { Column, Product, ProductUnitOption } from '../../models/PriceTypes';

export interface InlineCellState {
  sku: string;
  columnId: string;
  unitCode: string;
  value: string;
}

export interface CellStatus {
  error?: string;
}

export type UnitOption = ProductUnitOption;

export interface ProductRowHandlers {
  onToggleRowExpansion: (sku: string) => void;
  onEditProduct: (product: Product) => void;
  onConfigureVolumePrice: (product: Product, column: Column, unitOverride?: string) => void;
}
