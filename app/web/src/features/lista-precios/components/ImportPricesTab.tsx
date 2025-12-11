import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { formatBusinessDateTimeIso, getBusinessTodayISODate } from '@/shared/time/businessTime';
import type { Column, Product, CatalogProduct } from '../models/PriceTypes';
import type {
  BulkPriceImportEntry,
  BulkPriceImportResult,
  ImportTableColumnConfig,
  PriceImportPreviewRow
} from '../models/PriceImportTypes';
import {
  TEMPLATE_TITLE,
  EXPORT_TITLE,
  SKU_HEADER,
  UNIT_HEADER,
  VALIDITY_HEADER,
  buildTableColumnConfigs,
  buildExpectedHeaders,
  collectUnitsWithPrices,
  formatDateLabel,
  parsePriceImportFile
} from '../utils/importProcessing';
import { ImportActionControls } from './import-prices/ImportActionControls';
import { ImportStatusMessages } from './import-prices/ImportStatusMessages';
import { ImportPreviewTable } from './import-prices/ImportPreviewTable';
import { readTenantJson, writeTenantJson } from '../utils/storage';

interface ImportPricesTabProps {
  columns: Column[];
  products: Product[];
  catalogProducts: CatalogProduct[];
  loading: boolean;
  onApplyImport: (entries: BulkPriceImportEntry[]) => Promise<BulkPriceImportResult>;
}
interface StoredImportState {
  rows: PriceImportPreviewRow[];
  selectedFileName: string | null;
  lastResult?: {
    summary: BulkPriceImportResult;
    completedAt: string;
  };
}

const IMPORT_STORAGE_KEY = 'price_list_import_state';

const getStoredImportState = (): StoredImportState => {
  if (typeof window === 'undefined') {
    return { rows: [], selectedFileName: null };
  }
  return readTenantJson<StoredImportState>(IMPORT_STORAGE_KEY, {
    rows: [],
    selectedFileName: null
  });
};

export const ImportPricesTab: React.FC<ImportPricesTabProps> = ({
  columns,
  products,
  catalogProducts,
  loading,
  onApplyImport
}) => {
  const persistedState = useMemo(() => getStoredImportState(), []);
  const [rows, setRows] = useState<PriceImportPreviewRow[]>(persistedState.rows ?? []);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(persistedState.selectedFileName ?? null);
  const [lastResult, setLastResult] = useState<{ summary: BulkPriceImportResult; completedAt: string } | null>(
    persistedState.lastResult ?? null
  );

  const tableColumns: ImportTableColumnConfig[] = useMemo(() => buildTableColumnConfigs(columns), [columns]);
  const expectedHeaders = useMemo(() => buildExpectedHeaders(tableColumns), [tableColumns]);
  const tableColumnSignature = useMemo(() => tableColumns.map(column => `${column.columnId}:${column.header}`).join('|'), [tableColumns]);

  useEffect(() => {
    setRows([]);
    setParseError(null);
    setSelectedFileName(null);
    setLastResult(null);
  }, [tableColumnSignature]);

  const productLookup = useMemo(() => new Map(products.map(product => [product.sku.toUpperCase(), product] as const)), [products]);
  const catalogLookup = useMemo(() => new Map(catalogProducts.map(product => [product.codigo.toUpperCase(), product] as const)), [catalogProducts]);

  useEffect(() => {
    const payload: StoredImportState = {
      rows,
      selectedFileName,
      lastResult: lastResult ?? undefined
    };
    writeTenantJson(IMPORT_STORAGE_KEY, payload);
  }, [rows, selectedFileName, lastResult]);

  const resetState = () => {
    setRows([]);
    setParseError(null);
    setSelectedFileName(null);
    setLastResult(null);
  };

  const handleDownloadTemplate = () => {
    if (tableColumns.length === 0) {
      setParseError('Activa al menos una columna visible en la tabla para generar una plantilla.');
      return;
    }

    const worksheet = XLSX.utils.aoa_to_sheet([expectedHeaders]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, TEMPLATE_TITLE);
    const timestamp = getBusinessTodayISODate();
    XLSX.writeFile(workbook, `Plantilla_ImportacionPrecios_${timestamp}.xlsx`);
  };

  const handleExportPrices = () => {
    if (tableColumns.length === 0) {
      setParseError('Activa al menos una columna visible en la tabla para exportar.');
      return;
    }

    setParseError(null);
    const allowedColumnIds = new Set(tableColumns.map(column => column.columnId));
    const aoa: (string | number)[][] = [expectedHeaders];
    let exportedRows = 0;

    products.forEach(product => {
      const unitCodes = collectUnitsWithPrices(product, allowedColumnIds);
      if (unitCodes.length === 0) {
        return;
      }

      const catalogUnit = catalogLookup.get(product.sku)?.unidad;
      const orderedUnits = [...unitCodes].sort((a, b) => {
        if (catalogUnit) {
          if (a === catalogUnit && b !== catalogUnit) return -1;
          if (b === catalogUnit && a !== catalogUnit) return 1;
        }
        if (product.activeUnitCode) {
          if (a === product.activeUnitCode && b !== product.activeUnitCode) return -1;
          if (b === product.activeUnitCode && a !== product.activeUnitCode) return 1;
        }
        return a.localeCompare(b);
      });

      orderedUnits.forEach(unitCode => {
        const row: Record<string, string | number> = {
          [SKU_HEADER]: product.sku,
          [UNIT_HEADER]: unitCode
        };

        let validityIso: string | null = null;

        tableColumns.forEach(({ columnId, header }) => {
          const price = product.prices[columnId]?.[unitCode];
          if (price && price.type === 'fixed') {
            row[header] = price.value;
            if (!validityIso && price.validUntil) {
              validityIso = price.validUntil;
            }
          } else {
            row[header] = '';
          }
        });

        row[VALIDITY_HEADER] = validityIso ? formatDateLabel(validityIso) : '';
        const orderedRow = expectedHeaders.map(header => row[header] ?? '');
        aoa.push(orderedRow);
        exportedRows += 1;
      });
    });

    if (exportedRows === 0) {
      setParseError('No hay precios registrados para las columnas visibles.');
      return;
    }

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, EXPORT_TITLE);
    const today = getBusinessTodayISODate();
    XLSX.writeFile(workbook, `Exportacion_Precios_${today}.xlsx`);
  };

  const handleFileSelected = useCallback(async (file: File) => {
    if (tableColumns.length === 0) {
      setParseError('Activa al menos una columna visible antes de importar.');
      setRows([]);
      setSelectedFileName(null);
      return;
    }

    setIsParsing(true);
    setParseError(null);
    setLastResult(null);

    try {
      const parsedRows = await parsePriceImportFile(file, {
        tableColumns,
        expectedHeaders,
        productLookup,
        catalogLookup
      });
      setRows(parsedRows);
      setSelectedFileName(file.name);
    } catch (error) {
      console.error('[ImportPricesTab] Error parsing file:', error);
      setParseError(error instanceof Error ? error.message : 'No se pudo leer el archivo seleccionado.');
      setRows([]);
      setSelectedFileName(null);
    } finally {
      setIsParsing(false);
    }
  }, [catalogLookup, expectedHeaders, productLookup, tableColumns]);

  const readyRows = rows.filter(row => row.status === 'ready');
  const errorRows = rows.filter(row => row.status === 'error');
  const appliedRows = rows.filter(row => row.status === 'applied');

  const handleApplyImport = async () => {
    if (readyRows.length === 0) {
      setParseError('No hay filas válidas para importar.');
      return;
    }

    setIsApplying(true);
    setParseError(null);

    try {
      const payload: BulkPriceImportEntry[] = readyRows.map(row => ({
        sku: row.sku,
        unitCode: row.unitCode,
        validFrom: row.validFrom,
        validUntil: row.validUntil,
        prices: Object.entries(row.prices).map(([columnId, value]) => ({ columnId, value }))
      }));

      const summary = await onApplyImport(payload);
      setRows(prev => prev.map(row => (row.status === 'ready' ? { ...row, status: 'applied' } : row)));
      setLastResult({ summary, completedAt: formatBusinessDateTimeIso() });
    } catch (error) {
      console.error('[ImportPricesTab] Error applying import:', error);
      setParseError(error instanceof Error ? error.message : 'Ocurrió un error al aplicar los precios.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <ImportActionControls
        tableColumnsCount={tableColumns.length}
        selectedFileName={selectedFileName}
        hasRows={rows.length > 0}
        isParsing={isParsing}
        onDownloadTemplate={handleDownloadTemplate}
        onExportPrices={handleExportPrices}
        onResetSelection={resetState}
        onFileSelected={handleFileSelected}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div className="text-sm text-gray-500">Filas válidas</div>
          <div className="text-2xl font-semibold text-green-600">{readyRows.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div className="text-sm text-gray-500">Con errores</div>
          <div className="text-2xl font-semibold text-red-500">{errorRows.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div className="text-sm text-gray-500">Aplicadas</div>
          <div className="text-2xl font-semibold text-blue-600">{appliedRows.length}</div>
        </div>
      </div>

      <ImportStatusMessages parseError={parseError} isParsing={isParsing} lastResult={lastResult} />

      <ImportPreviewTable
        rows={rows}
        tableColumns={tableColumns}
        readyCount={readyRows.length}
        isParsing={isParsing}
        isApplying={isApplying}
        loading={loading}
        onApplyPrices={handleApplyImport}
      />
    </div>
  );
};

