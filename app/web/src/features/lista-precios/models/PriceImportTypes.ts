import type { FixedPrice } from './PriceTypes';

export interface ImportedFixedPriceValue {
  columnId: string;
  value: number | null;
}

export interface BulkPriceImportEntry {
  sku: string;
  unitCode?: string;
  validFrom: string;
  validUntil: string;
  prices: ImportedFixedPriceValue[];
}

export interface BulkPriceImportResult {
  totalRows: number;
  appliedRows: number;
  appliedProducts: number;
  appliedPrices: number;
  skippedRows: number;
  createdProducts: number;
}

export type ImportedPriceRecord = {
  sku: string;
  unitCode: string;
  templateRow: number;
  values: Partial<Record<string, number | null>>;
  validityLabel: string;
  priceObjects: Record<string, FixedPrice>;
};
