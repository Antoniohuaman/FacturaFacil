import type { Column, FixedPrice } from './PriceTypes';

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

export type ImportRowStatus = 'ready' | 'error' | 'applied';

export interface PriceImportPreviewRow {
  id: string;
  rowNumber: number;
  sku: string;
  unitCode: string;
  prices: Record<string, number | null>;
  validFrom: string;
  validUntil: string;
  errors: string[];
  warnings: string[];
  status: ImportRowStatus;
}

export interface ImportTableColumnConfig {
  columnId: string;
  header: string;
  column: Column;
}
