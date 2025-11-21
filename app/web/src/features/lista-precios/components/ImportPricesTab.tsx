import React, { useCallback, useMemo, useState } from 'react';
import { Upload, Download, Info, AlertTriangle, CheckCircle2, FileSpreadsheet, RefreshCcw } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Column, Product, CatalogProduct } from '../models/PriceTypes';
import type { BulkPriceImportEntry, BulkPriceImportResult } from '../models/PriceImportTypes';
import {
  BASE_COLUMN_ID,
  MIN_ALLOWED_COLUMN_ID,
  WHOLESALE_COLUMN_ID,
  DISTRIBUTOR_COLUMN_ID,
  CORPORATE_COLUMN_ID,
  PREFERRED_COLUMN_ID,
  PROMOTIONAL_COLUMN_ID,
  DEFAULT_UNIT_CODE,
  getColumnDisplayName
} from '../utils/priceHelpers';

const TEMPLATE_HEADERS = [
  'SKU',
  'UNIDAD',
  'PRECIO BASE',
  'PRECIO MÍNIMO',
  'PRECIO MAYORISTA',
  'PRECIO DISTRIBUIDOR',
  'PRECIO CORPORATIVO',
  'PRECIO PREFERENCIAL',
  'PRECIO PROMOCIONAL',
  'VIGENCIA'
] as const;

const TEMPLATE_PRICE_COLUMNS: Array<{ header: (typeof TEMPLATE_HEADERS)[number]; columnId: string }> = [
  { header: 'PRECIO BASE', columnId: BASE_COLUMN_ID },
  { header: 'PRECIO MÍNIMO', columnId: MIN_ALLOWED_COLUMN_ID },
  { header: 'PRECIO MAYORISTA', columnId: WHOLESALE_COLUMN_ID },
  { header: 'PRECIO DISTRIBUIDOR', columnId: DISTRIBUTOR_COLUMN_ID },
  { header: 'PRECIO CORPORATIVO', columnId: CORPORATE_COLUMN_ID },
  { header: 'PRECIO PREFERENCIAL', columnId: PREFERRED_COLUMN_ID },
  { header: 'PRECIO PROMOCIONAL', columnId: PROMOTIONAL_COLUMN_ID }
];

const TEMPLATE_PATH = '/plantillas/Plantilla_ImportacionPrecios.xlsx';

type ImportRowStatus = 'ready' | 'error' | 'applied';

type ParsedImportRow = {
  id: string;
  rowNumber: number;
  sku: string;
  unitCode: string;
  prices: Record<string, number>;
  validFrom: string;
  validUntil: string;
  errors: string[];
  warnings: string[];
  status: ImportRowStatus;
};

interface ImportPricesTabProps {
  columns: Column[];
  products: Product[];
  catalogProducts: CatalogProduct[];
  loading: boolean;
  onApplyImport: (entries: BulkPriceImportEntry[]) => Promise<BulkPriceImportResult>;
}

const normalizeHeader = (value: string): string => value
  .trim()
  .replace(/\s+/g, ' ')
  .toUpperCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const headersMatchTemplate = (headerRow: unknown[]): boolean => {
  return TEMPLATE_HEADERS.every((header, index) => {
    const expected = normalizeHeader(header);
    const current = normalizeHeader(String(headerRow[index] ?? ''));
    return expected === current;
  });
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

const parseDateCell = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }
    return value.toISOString().split('T')[0];
  }

  if (typeof value === 'number') {
    if (typeof XLSX.SSF?.parse_date_code === 'function') {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (parsed) {
        const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
        return date.toISOString().split('T')[0];
      }
    }

    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString().split('T')[0];
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }

  const slashMatch = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]) - 1;
    let year = Number(slashMatch[3]);
    if (year < 100) {
      year += 2000;
    }
    const date = new Date(Date.UTC(year, month, day));
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString().split('T')[0];
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().split('T')[0];
};

const formatDateLabel = (value: string): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

const getDefaultValidity = () => {
  const today = new Date();
  const until = new Date();
  until.setFullYear(until.getFullYear() + 1);
  return {
    validFrom: today.toISOString().split('T')[0],
    validUntil: until.toISOString().split('T')[0]
  };
};

const buildHeaderIndexMap = (): Record<typeof TEMPLATE_HEADERS[number], number> => {
  const map: Partial<Record<typeof TEMPLATE_HEADERS[number], number>> = {};
  TEMPLATE_HEADERS.forEach((header, index) => {
    map[header] = index;
  });
  return map as Record<typeof TEMPLATE_HEADERS[number], number>;
};

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

export const ImportPricesTab: React.FC<ImportPricesTabProps> = ({
  columns,
  products,
  catalogProducts,
  loading,
  onApplyImport
}) => {
  const [rows, setRows] = useState<ParsedImportRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ summary: BulkPriceImportResult; completedAt: Date } | null>(null);

  const priceColumns = useMemo(() => {
    return TEMPLATE_PRICE_COLUMNS.map(config => {
      const column = columns.find(col => col.id === config.columnId);
      return {
        ...config,
        label: column ? getColumnDisplayName(column) : config.header
      };
    });
  }, [columns]);

  const productLookup = useMemo(() => new Map(products.map(product => [product.sku, product] as const)), [products]);
  const catalogLookup = useMemo(() => new Map(catalogProducts.map(product => [product.codigo, product] as const)), [catalogProducts]);

  const resetState = () => {
    setRows([]);
    setParseError(null);
    setSelectedFileName(null);
    setLastResult(null);
  };

  const handleDownloadTemplate = () => {
    window.open(TEMPLATE_PATH, '_blank');
  };

  const handleExportPrices = () => {
    if (products.length === 0) {
      setParseError('No hay precios registrados para exportar.');
      return;
    }

    const aoa: (string | number)[][] = [TEMPLATE_HEADERS.slice() as string[]];

    products.forEach(product => {
      const unitCode = product.activeUnitCode || catalogLookup.get(product.sku)?.unidad || DEFAULT_UNIT_CODE;
      const row: Record<string, string | number> = {
        SKU: product.sku,
        UNIDAD: unitCode
      };

      let validity = '';

      priceColumns.forEach(({ columnId, header }) => {
        const price = product.prices[columnId]?.[unitCode];
        if (price && price.type === 'fixed') {
          row[header] = price.value;
          if (!validity && price.validUntil) {
            validity = formatDateLabel(price.validUntil);
          }
        } else {
          row[header] = '';
        }
      });

      row.VIGENCIA = validity;

      const orderedRow = TEMPLATE_HEADERS.map(header => row[header] ?? '');
      aoa.push(orderedRow);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Precios');
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Exportacion_Precios_${today}.xlsx`);
  };

  const parseFile = useCallback(async (file: File) => {
    setIsParsing(true);
    setParseError(null);
    setLastResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];

      if (rawRows.length < 2) {
        throw new Error('La plantilla no contiene filas con datos.');
      }

      const headerRow = rawRows[0];
      if (!headersMatchTemplate(headerRow)) {
        throw new Error('La estructura del archivo no coincide con la plantilla oficial. Descarga una nueva copia y vuelve a intentar.');
      }

      const headerIndex = buildHeaderIndexMap();
      const nextRows: ParsedImportRow[] = [];

      rawRows.slice(1).forEach((rawRow, index) => {
        const rowNumber = index + 2;
        const normalizedValues = rawRow.map(cell => (typeof cell === 'string' ? cell.trim() : cell));
        const isEmptyRow = normalizedValues.every(value => value === '' || value === null || value === undefined);
        if (isEmptyRow) {
          return;
        }

        const errors: string[] = [];
        const warnings: string[] = [];
        const sku = String(normalizedValues[headerIndex.SKU] ?? '').trim().toUpperCase();

        if (!sku) {
          errors.push('El SKU es obligatorio.');
        }

        const catalogProduct = catalogLookup.get(sku);
        const existingProduct = productLookup.get(sku);

        if (!catalogProduct && !existingProduct) {
          errors.push('El SKU no existe en el catálogo ni tiene precios registrados.');
        }

        const unitCell = String(normalizedValues[headerIndex.UNIDAD] ?? '').trim().toUpperCase();
        const allowedUnits = collectAllowedUnits(catalogProduct, existingProduct);
        const fallbackUnit = unitCell || catalogProduct?.unidad?.toUpperCase() || existingProduct?.activeUnitCode?.toUpperCase() || DEFAULT_UNIT_CODE;
        const unitCode = fallbackUnit;

        if (allowedUnits.size > 0 && !allowedUnits.has(unitCode)) {
          errors.push(`La unidad ${unitCode} no es válida para este SKU.`);
        }

        if (!unitCell && allowedUnits.size > 1) {
          warnings.push(`Se usó la unidad ${unitCode} por defecto.`);
        }

        const priceValues: Record<string, number> = {};
        TEMPLATE_PRICE_COLUMNS.forEach(({ header, columnId }) => {
          const value = parseNumberCell(normalizedValues[headerIndex[header]]);
          if (value !== null) {
            priceValues[columnId] = value;
          }
        });

        if (priceValues[BASE_COLUMN_ID] === undefined) {
          errors.push('Debes completar el PRECIO BASE.');
        }

        if (
          priceValues[BASE_COLUMN_ID] !== undefined &&
          priceValues[MIN_ALLOWED_COLUMN_ID] !== undefined &&
          priceValues[MIN_ALLOWED_COLUMN_ID] > priceValues[BASE_COLUMN_ID]
        ) {
          errors.push('El PRECIO MÍNIMO no puede ser mayor que el PRECIO BASE.');
        }

        if (Object.keys(priceValues).length === 0) {
          errors.push('Agrega al menos un precio para importar.');
        }

        const { validFrom, validUntil: defaultValidUntil } = getDefaultValidity();
        const parsedValidity = parseDateCell(normalizedValues[headerIndex.VIGENCIA]);
        const validUntil = parsedValidity ?? defaultValidUntil;

        if (new Date(validUntil) <= new Date(validFrom)) {
          errors.push('La fecha de vigencia debe ser posterior a la fecha actual.');
        }

        const status: ImportRowStatus = errors.length > 0 ? 'error' : 'ready';

        nextRows.push({
          id: `${sku}-${rowNumber}`,
          rowNumber,
          sku,
          unitCode,
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

      setRows(nextRows);
      setSelectedFileName(file.name);
    } catch (error) {
      console.error('[ImportPricesTab] Error parsing file:', error);
      setParseError(error instanceof Error ? error.message : 'No se pudo leer el archivo seleccionado.');
      setRows([]);
      setSelectedFileName(null);
    } finally {
      setIsParsing(false);
    }
  }, [catalogLookup, productLookup]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    parseFile(file);
    event.target.value = '';
  };

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
      setLastResult({ summary, completedAt: new Date() });
    } catch (error) {
      console.error('[ImportPricesTab] Error applying import:', error);
      setParseError(error instanceof Error ? error.message : 'Ocurrió un error al aplicar los precios.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-10 h-10 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Importar precios desde Excel</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Descarga la plantilla oficial, completa los precios y súbela nuevamente para actualizar la lista.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Descargar plantilla
            </button>
            <button
              type="button"
              onClick={handleExportPrices}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Exportar precios actuales
            </button>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p className="font-semibold mb-1">Recomendaciones:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>No reordenes ni agregues columnas a la plantilla.</li>
              <li>Usa una fila por cada SKU y unidad de medida.</li>
              <li>La columna VIGENCIA acepta formatos dd/mm/aaaa o números de Excel.</li>
              <li>El PRECIO MÍNIMO debe ser menor o igual al PRECIO BASE.</li>
            </ul>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Estado del archivo</div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-white">
            {selectedFileName ? selectedFileName : 'Ningún archivo seleccionado'}
          </div>
          <label className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 transition-colors">
            <Upload className="w-4 h-4 mr-2" />
            Seleccionar archivo
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
          {rows.length > 0 && (
            <button
              type="button"
              onClick={resetState}
              className="inline-flex items-center px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Limpiar selección
            </button>
          )}
        </div>
      </div>

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

      {(parseError || isParsing) && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${parseError ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300' : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200'}`}>
          {isParsing ? 'Procesando archivo...' : parseError}
        </div>
      )}

      {lastResult && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-sm text-green-800 dark:text-green-300 space-y-1">
          <div className="font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Importación aplicada el {lastResult.completedAt.toLocaleString('es-PE')}.
          </div>
          <div>
            {lastResult.summary.appliedPrices} precios actualizados en {lastResult.summary.appliedProducts} productos. Filas omitidas: {lastResult.summary.skippedRows}.
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Vista previa de la importación</h3>
            <p className="text-sm text-gray-500">Solo se mostrarán las filas que contienen datos.</p>
          </div>
          <button
            type="button"
            onClick={handleApplyImport}
            disabled={loading || isParsing || isApplying || readyRows.length === 0}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${readyRows.length === 0 || loading || isParsing || isApplying
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'}`}
          >
            Aplicar precios
          </button>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/30">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Fila</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">SKU</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Unidad</th>
                {priceColumns.map(column => (
                  <th key={column.columnId} className="px-3 py-2 text-left font-medium text-gray-500">
                    {column.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-left font-medium text-gray-500">Vigencia</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={priceColumns.length + 5} className="px-3 py-6 text-center text-gray-500">
                    Carga un archivo XLSX para comenzar.
                  </td>
                </tr>
              )}
              {rows.map(row => (
                <tr key={row.id} className="bg-white dark:bg-gray-900/20">
                  <td className="px-3 py-2 text-gray-500">{row.rowNumber}</td>
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{row.sku}</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{row.unitCode}</td>
                  {priceColumns.map(column => (
                    <td key={`${row.id}-${column.columnId}`} className="px-3 py-2 text-gray-700 dark:text-gray-200">
                      {row.prices[column.columnId] !== undefined ? row.prices[column.columnId].toFixed(2) : ''}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{formatDateLabel(row.validUntil)}</td>
                  <td className="px-3 py-2">
                    {row.status === 'ready' && (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Lista
                      </span>
                    )}
                    {row.status === 'applied' && (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                        <Info className="w-3 h-3 mr-1" /> Aplicada
                      </span>
                    )}
                    {row.status === 'error' && (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-600">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Revisar
                      </span>
                    )}
                    {row.errors.length > 0 && (
                      <ul className="mt-2 text-xs text-red-600 space-y-1">
                        {row.errors.map((message, index) => (
                          <li key={`${row.id}-err-${index}`}>{message}</li>
                        ))}
                      </ul>
                    )}
                    {row.warnings.length > 0 && row.errors.length === 0 && (
                      <ul className="mt-2 text-xs text-amber-600 space-y-1">
                        {row.warnings.map((message, index) => (
                          <li key={`${row.id}-warn-${index}`}>{message}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
