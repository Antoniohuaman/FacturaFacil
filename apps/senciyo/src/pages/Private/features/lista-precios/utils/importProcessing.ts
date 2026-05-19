import * as XLSX from 'xlsx';
import {
  assertBusinessDate,
  getBusinessDefaultValidityRange,
  getBusinessTodayISODate,
  toBusinessDate
} from '@/shared/time/businessTime';
import type { CatalogProduct, Column, FixedPrice, Product } from '../models/PriceTypes';
import type { ImportTableColumnConfig, PriceImportPreviewRow } from '../models/PriceImportTypes';
import {
  BASE_COLUMN_ID,
  MIN_ALLOWED_COLUMN_ID,
  filterVisibleColumns,
  getColumnDisplayName,
  isGlobalColumn
} from './priceHelpers';

export const SKU_HEADER = 'SKU';
export const PRODUCT_HEADER = 'PRODUCTO';
export const PRESENTATION_HEADER = 'PRESENTACIÓN';
export const UNIT_HEADER = 'UNIDAD';
export const VALIDITY_HEADER = 'VIGENCIA';
export const PRICE_KEY_HEADER = 'PRICE_KEY';
export const TEMPLATE_TITLE = 'Plantilla';
export const EXPORT_TITLE = 'Precios';

const pad2 = (value: number): string => value.toString().padStart(2, '0');

const buildIsoDate = (year: number, month: number, day: number): string | null => {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) {
    return null;
  }
  return `${year}-${pad2(month)}-${pad2(day)}`;
};

const parseExcelSerialDate = (value: number): string | null => {
  if (!Number.isFinite(value)) {
    return null;
  }
  const excelEpoch = Date.UTC(1899, 11, 30);
  const milliseconds = excelEpoch + value * 86400000;
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
};

const parseDateCell = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }
    return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())}`;
  }

  if (typeof value === 'number') {
    return parseExcelSerialDate(value);
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }

  const isoMatch = normalized.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    return buildIsoDate(year, month, day);
  }

  const slashMatch = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]);
    let year = Number(slashMatch[3]);
    if (year < 100) {
      year += 2000;
    }
    return buildIsoDate(year, month, day);
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return `${parsed.getUTCFullYear()}-${pad2(parsed.getUTCMonth() + 1)}-${pad2(parsed.getUTCDate())}`;
};

const parseNumberCell = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const normalized = String(value)
    .trim()
    .replace(/\s+/g, '')
    .replace(/,/g, '.')
    .replace(/[^0-9.-]/g, '');

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeHeader = (value: string): string => value
  .trim()
  .replace(/\s+/g, ' ')
  .toUpperCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '');

const headersMatchTemplate = (headerRow: unknown[], expectedHeaders: string[]): boolean => {
  const matches = expectedHeaders.every((header, index) => {
    const expected = normalizeHeader(header);
    const current = normalizeHeader(String(headerRow[index] ?? ''));
    return expected === current;
  });

  if (!matches) {
    return false;
  }

  const hasExtraColumns = headerRow
    .slice(expectedHeaders.length)
    .some(cell => String(cell ?? '').trim() !== '');
  return !hasExtraColumns;
};

const buildHeaderIndexMap = (expectedHeaders: string[]): Record<string, number> => (
  expectedHeaders.reduce<Record<string, number>>((map, header, index) => {
    map[header] = index;
    return map;
  }, {})
);

const getDefaultValidity = () => getBusinessDefaultValidityRange();

// Normalizes a price key: uppercases the SUNAT part before '__', preserves the ID part after.
const normalizePriceKey = (key: string): string => {
  if (!key) return '';
  const sep = key.indexOf('__');
  if (sep >= 0) {
    return `${key.slice(0, sep).toUpperCase()}__${key.slice(sep + 2)}`;
  }
  return key.toUpperCase();
};

const buildLegacyExpectedHeaders = (tableColumns: ImportTableColumnConfig[]): string[] => (
  [SKU_HEADER, UNIT_HEADER, ...tableColumns.map(c => c.header), VALIDITY_HEADER]
);

const collectAllowedUnits = (catalogProduct?: CatalogProduct, existingProduct?: Product): Set<string> => {
  const units = new Set<string>();
  if (catalogProduct?.unidad) {
    units.add(catalogProduct.unidad.toUpperCase());
  }
  catalogProduct?.unidadesMedidaAdicionales?.forEach(unit => {
    if (unit.unidadCodigo) {
      units.add(unit.unidadCodigo.toUpperCase());
    }
  });

  if (existingProduct) {
    Object.values(existingProduct.prices).forEach(unitPrices => {
      Object.keys(unitPrices).forEach(code => units.add(code.toUpperCase()));
    });
    if (existingProduct.activeUnitCode) {
      units.add(existingProduct.activeUnitCode.toUpperCase());
    }
  }

  return units;
};

const collectAllowedPriceKeys = (catalogProduct?: CatalogProduct, existingProduct?: Product): Set<string> => {
  const keys = new Set<string>();

  if (catalogProduct?.unidad) {
    keys.add(catalogProduct.unidad.toUpperCase());
  }

  catalogProduct?.unidadesMedidaAdicionales?.forEach(unit => {
    if (unit.unidadCodigo) {
      if (unit.id) {
        keys.add(`${unit.unidadCodigo.toUpperCase()}__${unit.id}`);
      }
      keys.add(unit.unidadCodigo.toUpperCase());
    }
  });

  if (existingProduct) {
    Object.values(existingProduct.prices).forEach(unitPrices => {
      Object.keys(unitPrices).forEach(code => keys.add(normalizePriceKey(code)));
    });
    if (existingProduct.activeUnitCode) {
      keys.add(normalizePriceKey(existingProduct.activeUnitCode));
    }
  }

  return keys;
};

const getExistingFixedPrice = (product: Product | undefined, columnId: string, priceKey: string): FixedPrice | undefined => {
  if (!product || !priceKey) {
    return undefined;
  }
  const columnPrices = product.prices[columnId];
  if (!columnPrices) {
    return undefined;
  }

  const direct = columnPrices[priceKey];
  if (direct && direct.type === 'fixed') {
    return direct;
  }

  const normalized = normalizePriceKey(priceKey);
  if (normalized !== priceKey) {
    const normPrice = columnPrices[normalized];
    if (normPrice && normPrice.type === 'fixed') {
      return normPrice;
    }
  }

  // Backward compat: compound code → try SUNAT part only (prices stored before compound key migration)
  if (normalized.includes('__')) {
    const sunatPart = normalized.split('__')[0];
    const sunatPrice = columnPrices[sunatPart];
    if (sunatPrice && sunatPrice.type === 'fixed') {
      return sunatPrice;
    }
  }

  return undefined;
};

const enforceDuplicateSafety = (rows: PriceImportPreviewRow[]): void => {
  const duplicates = new Map<string, number[]>();
  rows.forEach((row, index) => {
    if (!row.sku || !row.priceKey) {
      return;
    }
    const key = `${row.sku}::${row.priceKey}`;
    const stored = duplicates.get(key) || [];
    stored.push(index);
    duplicates.set(key, stored);
  });

  duplicates.forEach(indexes => {
    if (indexes.length <= 1) {
      return;
    }
    const rowNumbers = indexes.map(idx => rows[idx].rowNumber).join(', ');
    indexes.forEach(idx => {
      rows[idx].errors.push(`Este SKU/presentación está repetido en las filas ${rowNumbers}.`);
      rows[idx].status = 'error';
    });
  });
};

const validateValidityRange = (validFrom: string, validUntil: string, errors: string[]) => {
  const fromDate = toBusinessDate(validFrom, 'start');
  const untilDate = toBusinessDate(validUntil, 'end');
  if (!fromDate || !untilDate) {
    return;
  }

  const today = assertBusinessDate(getBusinessTodayISODate(), 'start');

  if (untilDate <= fromDate) {
    errors.push('La fecha de vigencia debe ser posterior a la fecha actual.');
    return;
  }
  if (untilDate <= today) {
    errors.push('La vigencia debe estar en el futuro.');
  }
};

const parseRawRows = (
  rawRows: unknown[][],
  context: ImportParserContext
): PriceImportPreviewRow[] => {
  if (rawRows.length < 2) {
    throw new Error('La plantilla no contiene filas con datos.');
  }

  const headerRow = rawRows[0];
  const isNewFormat = headersMatchTemplate(headerRow, context.expectedHeaders);

  let legacyHeaders: string[] | null = null;
  if (!isNewFormat) {
    const legacyExpected = buildLegacyExpectedHeaders(context.tableColumns);
    if (headersMatchTemplate(headerRow, legacyExpected)) {
      legacyHeaders = legacyExpected;
    }
  }

  if (!isNewFormat && !legacyHeaders) {
    throw new Error('La estructura del archivo no coincide con las columnas visibles. Descarga una nueva plantilla desde esta pantalla.');
  }

  const headers = isNewFormat ? context.expectedHeaders : legacyHeaders!;
  const headerIndex = buildHeaderIndexMap(headers);
  const nextRows: PriceImportPreviewRow[] = [];

  rawRows.slice(1).forEach((rawRow, index) => {
    const rowNumber = index + 2;
    const normalizedValues = rawRow.map(cell => (typeof cell === 'string' ? cell.trim() : cell));
    const isEmptyRow = normalizedValues.every(value => value === '' || value === null || value === undefined);
    if (isEmptyRow) {
      return;
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const sku = String(normalizedValues[headerIndex[SKU_HEADER]] ?? '').trim().toUpperCase();
    if (!sku) {
      errors.push('El SKU es obligatorio.');
    }

    const catalogProduct = context.catalogLookup.get(sku);
    const existingProduct = context.productLookup.get(sku);
    if (!catalogProduct && !existingProduct) {
      errors.push('El SKU no existe en el catálogo ni tiene precios registrados.');
    }

    let priceKey: string;
    let presentationLabel: string;

    if (isNewFormat) {
      const rawPriceKey = String(normalizedValues[headerIndex[PRICE_KEY_HEADER]] ?? '').trim();
      priceKey = normalizePriceKey(rawPriceKey);
      presentationLabel = String(normalizedValues[headerIndex[PRESENTATION_HEADER]] ?? '').trim() || priceKey;

      if (!priceKey) {
        errors.push('La columna PRICE_KEY es obligatoria.');
        priceKey = normalizePriceKey(catalogProduct?.unidad || existingProduct?.activeUnitCode || '');
      } else {
        const allowedPriceKeys = collectAllowedPriceKeys(catalogProduct, existingProduct);
        if (allowedPriceKeys.size > 0 && !allowedPriceKeys.has(priceKey)) {
          errors.push(`El PRICE_KEY "${priceKey}" no es válido para este SKU.`);
        }
      }
    } else {
      const unitCell = String(normalizedValues[headerIndex[UNIT_HEADER]] ?? '').trim().toUpperCase();
      const allowedUnits = collectAllowedUnits(catalogProduct, existingProduct);
      const fallbackUnit = unitCell || catalogProduct?.unidad?.toUpperCase() || existingProduct?.activeUnitCode?.toUpperCase() || '';
      priceKey = fallbackUnit;
      presentationLabel = fallbackUnit;

      if (allowedUnits.size > 0 && priceKey && !allowedUnits.has(priceKey)) {
        errors.push(`La unidad ${priceKey} no es válida para este SKU.`);
      }

      if (!unitCell && priceKey && allowedUnits.size > 1) {
        warnings.push(`Se usó la unidad ${priceKey} por defecto.`);
      }
    }

    const priceValues: Record<string, number | null> = {};
    context.tableColumns.forEach(({ header, columnId }) => {
      const parsedValue = parseNumberCell(normalizedValues[headerIndex[header]]);
      const existingPrice = getExistingFixedPrice(existingProduct, columnId, priceKey);
      const hasExistingValue = Boolean(existingPrice);

      if (parsedValue === null || parsedValue === undefined) {
        if (hasExistingValue) {
          priceValues[columnId] = null;
        }
        return;
      }

      if (parsedValue < 0) {
        errors.push(`El valor de ${header} debe ser mayor o igual a 0.`);
        return;
      }

      priceValues[columnId] = parsedValue;
    });

    const hasChanges = Object.keys(priceValues).length > 0;
    if (!hasChanges) {
      errors.push('No se detectaron cambios para esta fila.');
    }

    const { validFrom, validUntil: defaultValidUntil } = getDefaultValidity();
    const parsedValidity = parseDateCell(normalizedValues[headerIndex[VALIDITY_HEADER]]);
    const validUntil = parsedValidity ?? defaultValidUntil;
    validateValidityRange(validFrom, validUntil, errors);

    const existingBasePrice = getExistingFixedPrice(existingProduct, BASE_COLUMN_ID, priceKey);
    const existingMinPrice = getExistingFixedPrice(existingProduct, MIN_ALLOWED_COLUMN_ID, priceKey);

    const referenceBaseValue = (() => {
      const nextBaseValue = priceValues[BASE_COLUMN_ID];
      if (typeof nextBaseValue === 'number') {
        return nextBaseValue;
      }
      if (existingBasePrice && existingBasePrice.type === 'fixed') {
        return existingBasePrice.value;
      }
      return null;
    })();

    const effectiveMinValue = (() => {
      const nextMin = priceValues[MIN_ALLOWED_COLUMN_ID];
      if (typeof nextMin === 'number') {
        return nextMin;
      }
      if (nextMin === null) {
        return null;
      }
      return existingMinPrice?.type === 'fixed' ? existingMinPrice.value : null;
    })();

    if (
      referenceBaseValue !== null &&
      typeof effectiveMinValue === 'number' &&
      effectiveMinValue > referenceBaseValue
    ) {
      errors.push('El precio mínimo no puede ser mayor que el precio base.');
    }

    const status = errors.length > 0 ? 'error' : 'ready';
    nextRows.push({
      id: `${sku || 'row'}-${rowNumber}`,
      rowNumber,
      sku,
      priceKey,
      unitCode: priceKey,
      presentationLabel,
      prices: priceValues,
      validFrom,
      validUntil,
      errors,
      warnings,
      status
    });
  });

  if (nextRows.length === 0) {
    throw new Error('No se encontraron filas con datos. Verifica el archivo.');
  }

  enforceDuplicateSafety(nextRows);

  return nextRows;
};

export const buildTableColumnConfigs = (columns: Column[]): ImportTableColumnConfig[] => (
  filterVisibleColumns(columns)
    .filter(column => column.isVisibleInTable !== false && !isGlobalColumn(column))
    .map(column => ({
      columnId: column.id,
      header: getColumnDisplayName(column),
      column
    }))
);

export const buildExpectedHeaders = (tableColumns: ImportTableColumnConfig[]): string[] => (
  [SKU_HEADER, PRODUCT_HEADER, PRESENTATION_HEADER, ...tableColumns.map(column => column.header), VALIDITY_HEADER, PRICE_KEY_HEADER]
);

export interface ImportParserContext {
  tableColumns: ImportTableColumnConfig[];
  expectedHeaders: string[];
  productLookup: Map<string, Product>;
  catalogLookup: Map<string, CatalogProduct>;
}

export const parsePriceImportFile = async (
  file: File,
  context: ImportParserContext
): Promise<PriceImportPreviewRow[]> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
  return parseRawRows(rawRows, context);
};

export const formatDateLabel = (value: string): string => {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) {
    return value;
  }
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
};

/**
 * Builds `!cols` config for a worksheet generated from `buildExpectedHeaders`.
 * PRICE_KEY is always the last header — it gets `hidden: true` so users don't see
 * it in Excel while the import engine can still read it.
 */
export const buildWorksheetColConfig = (headers: string[]): XLSX.ColInfo[] =>
  headers.map(header => {
    if (header === PRICE_KEY_HEADER) return { hidden: true } as XLSX.ColInfo;
    if (header === SKU_HEADER) return { wch: 12 };
    if (header === PRODUCT_HEADER) return { wch: 30 };
    if (header === PRESENTATION_HEADER) return { wch: 25 };
    if (header === VALIDITY_HEADER) return { wch: 14 };
    return { wch: 15 };
  });
