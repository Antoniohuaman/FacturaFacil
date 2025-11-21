import type { Column, ColumnKind } from '../../models/PriceTypes';
import type { GlobalRuleType } from '../../models/PriceTypes';

export const BASE_COLUMN_ID = 'P1';
export const MIN_ALLOWED_COLUMN_ID = 'P2';
export const WHOLESALE_COLUMN_ID = 'P3';
export const DISTRIBUTOR_COLUMN_ID = 'P4';
export const CORPORATE_COLUMN_ID = 'P5';
export const PREFERRED_COLUMN_ID = 'P6';
export const PROMOTIONAL_COLUMN_ID = 'P7';
export const GLOBAL_DISCOUNT_COLUMN_ID = 'P8';
export const GLOBAL_INCREASE_COLUMN_ID = 'P9';
export const MANUAL_COLUMN_LIMIT = 10;

const MANUAL_COLUMN_ID_PATTERN = /^P(\d+)$/i;

type FixedColumnDefinition = {
  id: string;
  legacyIds?: string[];
  order: number;
  defaultName: string;
  kind: ColumnKind;
  isBase: boolean;
  defaultVisible?: boolean;
  defaultVisibleInTable?: boolean;
  defaultMode?: Column['mode'];
  helpText?: string;
};

const FIXED_COLUMN_DEFINITIONS: FixedColumnDefinition[] = [
  {
    id: BASE_COLUMN_ID,
    order: 1,
    defaultName: 'PRECIO BASE',
    kind: 'base',
    isBase: true,
    defaultVisible: true,
    defaultVisibleInTable: true,
    defaultMode: 'fixed',
    helpText: 'Precio de referencia principal definido manualmente.'
  },
  {
    id: MIN_ALLOWED_COLUMN_ID,
    legacyIds: ['PPM'],
    order: 2,
    defaultName: 'PRECIO MÍNIMO',
    kind: 'min-allowed',
    isBase: false,
    defaultVisible: true,
    defaultVisibleInTable: true,
    defaultMode: 'fixed',
    helpText: 'Valor mínimo permitido para aplicar descuentos.'
  },
  {
    id: WHOLESALE_COLUMN_ID,
    legacyIds: ['PPD'],
    order: 3,
    defaultName: 'PRECIO MAYORISTA',
    kind: 'manual',
    isBase: false,
    defaultVisible: true,
    defaultVisibleInTable: true,
    defaultMode: 'fixed',
    helpText: 'Precio manual para ventas al por mayor.'
  },
  {
    id: DISTRIBUTOR_COLUMN_ID,
    order: 4,
    defaultName: 'PRECIO DISTRIBUIDOR',
    kind: 'manual',
    isBase: false,
    defaultVisible: true,
    defaultVisibleInTable: true,
    defaultMode: 'fixed',
    helpText: 'Lista especial para socios distribuidores.'
  },
  {
    id: CORPORATE_COLUMN_ID,
    order: 5,
    defaultName: 'PRECIO CORPORATIVO',
    kind: 'manual',
    isBase: false,
    defaultVisible: true,
    defaultVisibleInTable: true,
    defaultMode: 'fixed',
    helpText: 'Tarifa fija para cuentas corporativas.'
  },
  {
    id: PREFERRED_COLUMN_ID,
    legacyIds: ['P5'],
    order: 6,
    defaultName: 'PRECIO PREFERENCIAL',
    kind: 'manual',
    isBase: false,
    defaultVisible: true,
    defaultVisibleInTable: true,
    defaultMode: 'fixed',
    helpText: 'Precio exclusivo para clientes frecuentes.'
  },
  {
    id: PROMOTIONAL_COLUMN_ID,
    legacyIds: ['P6'],
    order: 7,
    defaultName: 'PRECIO PROMOCIONAL',
    kind: 'manual',
    isBase: false,
    defaultVisible: true,
    defaultVisibleInTable: true,
    defaultMode: 'fixed',
    helpText: 'Precio especial para campañas y ofertas.'
  },
  {
    id: GLOBAL_DISCOUNT_COLUMN_ID,
    legacyIds: ['P7', 'PGD'],
    order: 8,
    defaultName: 'DESCUENTO GLOBAL',
    kind: 'global-discount',
    isBase: false,
    defaultVisible: true,
    defaultVisibleInTable: true,
    defaultMode: 'fixed',
    helpText: 'Aplicación automática de un descuento sobre el precio base.'
  },
  {
    id: GLOBAL_INCREASE_COLUMN_ID,
    legacyIds: ['P8', 'PGA'],
    order: 9,
    defaultName: 'AUMENTO GLOBAL',
    kind: 'global-increase',
    isBase: false,
    defaultVisible: true,
    defaultVisibleInTable: true,
    defaultMode: 'fixed',
    helpText: 'Aplicación automática de un recargo sobre el precio base.'
  }
];

const fixedColumnMap = new Map(FIXED_COLUMN_DEFINITIONS.map(def => [def.id, def] as const));
const legacyColumnIdMap = new Map<string, string>(
  FIXED_COLUMN_DEFINITIONS.flatMap(def => (def.legacyIds ?? []).map(legacyId => [legacyId, def.id] as const))
);

const getCanonicalFixedColumnId = (columnId?: string): string | undefined => {
  if (!columnId) return undefined;
  if (fixedColumnMap.has(columnId)) {
    return columnId;
  }
  return legacyColumnIdMap.get(columnId);
};

const normalizeGlobalRuleValue = (value?: number | null): number | null => {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    return null;
  }
  return value;
};

const buildFixedColumn = (definition: FixedColumnDefinition, existing?: Column): Column => {
  const column: Column = {
    id: definition.id,
    name: definition.defaultName,
    mode: definition.defaultMode ?? 'fixed',
    visible: typeof existing?.visible === 'boolean' ? existing.visible : definition.defaultVisible !== false,
    isVisibleInTable: typeof existing?.isVisibleInTable === 'boolean'
      ? existing.isVisibleInTable
      : definition.defaultVisibleInTable !== false,
    isBase: definition.isBase,
    order: definition.order,
    kind: definition.kind
  };

  if (definition.kind === 'global-discount' || definition.kind === 'global-increase') {
    column.globalRuleType = existing?.globalRuleType ?? 'percent';
    column.globalRuleValue = normalizeGlobalRuleValue(existing?.globalRuleValue);
  }

  return column;
};

const normalizeColumnOrder = (column: Column, index: number): Column => ({
  ...column,
  order: typeof column.order === 'number' ? column.order : index + 1
});

const sanitizeColumn = (column: Column, index: number): Column => {
  const requiresReindex = column.id === GLOBAL_INCREASE_COLUMN_ID && column.kind !== 'global-increase';
  const workingColumn = requiresReindex ? { ...column, id: undefined } : column;

  const canonicalId = getCanonicalFixedColumnId(workingColumn.id);
  if (canonicalId) {
    const definition = fixedColumnMap.get(canonicalId)!;
    return buildFixedColumn(definition, { ...workingColumn, id: canonicalId });
  }

  const derivedKind: ColumnKind = workingColumn.kind && workingColumn.kind !== 'base'
    ? workingColumn.kind
    : 'manual';

  const normalized: Column = {
    ...workingColumn,
    id: workingColumn.id || `P${index + FIXED_COLUMN_DEFINITIONS.length + 1}`,
    order: typeof workingColumn.order === 'number' && Number.isFinite(workingColumn.order) ? workingColumn.order : index + 1,
    kind: derivedKind,
    isBase: false,
    mode: derivedKind === 'manual' && workingColumn.mode === 'volume' ? 'volume' : 'fixed',
    visible: workingColumn.visible !== false,
    isVisibleInTable: workingColumn.isVisibleInTable !== false
  };

  if (derivedKind === 'global-discount' || derivedKind === 'global-increase') {
    normalized.globalRuleType = workingColumn.globalRuleType ?? 'percent';
    normalized.globalRuleValue = normalizeGlobalRuleValue(workingColumn.globalRuleValue);
  } else {
    delete normalized.globalRuleType;
    delete normalized.globalRuleValue;
  }

  return normalized;
};

export const generateColumnId = (columns: Column[]): string => {
  const numericSuffixes = columns
    .map(column => {
      const match = MANUAL_COLUMN_ID_PATTERN.exec(column.id || '');
      return match ? Number(match[1]) : null;
    })
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  const nextValue = numericSuffixes.length > 0
    ? Math.max(...numericSuffixes) + 1
    : 1;

  return `P${nextValue}`;
};

export const getNextOrder = (columns: Column[]): number => {
  if (columns.length === 0) return 1;
  return Math.max(...columns.map(c => c.order)) + 1;
};

export const getFixedColumnDefinition = (columnId?: string): FixedColumnDefinition | undefined => {
  const canonicalId = getCanonicalFixedColumnId(columnId);
  if (!canonicalId) return undefined;
  return fixedColumnMap.get(canonicalId);
};

export const isFixedColumnId = (columnId?: string): boolean => Boolean(getFixedColumnDefinition(columnId));
export const isFixedColumn = (column: Column): boolean => isFixedColumnId(column.id);

export const getCanonicalColumnId = (columnId: string): string => {
  return getCanonicalFixedColumnId(columnId) ?? columnId;
};

export const getFixedColumnHelpText = (columnId: string): string | undefined => {
  return getFixedColumnDefinition(columnId)?.helpText;
};

export const getColumnDisplayName = (column: Column): string => {
  return getFixedColumnDefinition(column.id)?.defaultName ?? column.name;
};

export const ensureRequiredColumns = (columns: Column[]): Column[] => {
  const normalized = columns
    .filter(Boolean)
    .map((column, index) => sanitizeColumn(normalizeColumnOrder(column, index), index));

  const fixedColumns = FIXED_COLUMN_DEFINITIONS.map(definition => {
    const existing = normalized.find(column => column.id === definition.id);
    return buildFixedColumn(definition, existing);
  });

  const manualColumns: Column[] = normalized
    .filter(column => !isFixedColumn(column))
    .sort((a, b) => a.order - b.order)
    .map(column => ({
      ...column,
      kind: 'manual',
      isBase: false,
      visible: column.visible !== false,
      isVisibleInTable: column.isVisibleInTable !== false,
      mode: column.mode === 'volume' ? 'volume' : 'fixed'
    }));

  return [...fixedColumns, ...manualColumns].map((column, index) => ({
    ...column,
    order: index + 1
  }));
};

export const filterVisibleColumns = (columns: Column[]): Column[] => {
  return columns.filter(col => col.visible).sort((a, b) => a.order - b.order);
};

export const findBaseColumn = (columns: Column[]): Column | undefined => {
  return columns.find(col => col.kind === 'base');
};

export const isGlobalColumn = (column: Column): boolean => {
  return column.kind === 'global-discount' || column.kind === 'global-increase';
};

export const isProductDiscountColumn = (column: Column): boolean => column.kind === 'product-discount';
export const isMinAllowedColumn = (column: Column): boolean => column.kind === 'min-allowed';
export const isManualInputColumn = (column: Column): boolean =>
  column.kind === 'manual' || isProductDiscountColumn(column) || isMinAllowedColumn(column);

export const countColumnsByMode = (columns: Column[], mode: 'fixed' | 'volume'): number => {
  return columns.filter(c => c.mode === mode).length;
};

export const countManualColumns = (columns: Column[]): number => {
  return columns.filter(column => column.kind === 'manual' && !isFixedColumn(column)).length;
};

export const validateColumnConfiguration = (columns: Column[]): {
  hasBase: boolean;
  hasVisible: boolean;
  isValid: boolean;
} => {
  const hasBase = columns.some(c => c.kind === 'base');
  const hasVisible = columns.some(c => c.visible);
  const hasVisibleEditable = columns.some(c => c.visible && (c.kind === 'base' || c.kind === 'manual' || c.kind === 'product-discount' || c.kind === 'min-allowed'));
  const isValid = hasBase && hasVisible && hasVisibleEditable;

  return { hasBase, hasVisible, isValid };
};

export const applyGlobalRule = (column: Column, baseValue: number): number | null => {
  if (!isGlobalColumn(column)) {
    return null;
  }

  const ruleValue = typeof column.globalRuleValue === 'number' ? column.globalRuleValue : null;
  if (ruleValue === null) {
    return null;
  }

  const ruleType: GlobalRuleType = column.globalRuleType ?? 'percent';
  if (ruleType === 'percent') {
    const modifier = ruleValue / 100;
    const computed = column.kind === 'global-discount'
      ? baseValue * (1 - modifier)
      : baseValue * (1 + modifier);
    return Math.max(computed, 0);
  }

  return Math.max(column.kind === 'global-discount' ? baseValue - ruleValue : baseValue + ruleValue, 0);
};
