import { lsKey } from '@/shared/tenant';
import type { ColumnConfig } from '../types/columnConfig';

export const resolveTenantColumnsKey = (baseKey: string): string | null => {
  try {
    const key = lsKey(baseKey);
    return typeof key === 'string' && key.trim() ? key : null;
  } catch {
    return null;
  }
};

export const parseColumnsConfig = (raw: string | null): ColumnConfig[] | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const loadColumnsConfig = ({
  tenantKey,
  legacyKey,
  fallback
}: {
  tenantKey: string | null;
  legacyKey?: string | null;
  fallback: ColumnConfig[];
}): ColumnConfig[] => {
  if (tenantKey) {
    try {
      const tenantConfig = parseColumnsConfig(localStorage.getItem(tenantKey));
      if (tenantConfig) {
        return tenantConfig;
      }
    } catch {
      // noop: fallback handles corrupted entries
    }
  }

  if (legacyKey) {
    try {
      const legacyRaw = localStorage.getItem(legacyKey);
      const legacyConfig = parseColumnsConfig(legacyRaw);
      if (legacyConfig) {
        if (tenantKey && legacyRaw) {
          try {
            localStorage.setItem(tenantKey, legacyRaw);
            localStorage.removeItem(legacyKey);
          } catch {
            // noop: persistence is best-effort
          }
        }
        return legacyConfig;
      }
    } catch {
      // noop: fallback handles corrupted entries
    }
  }

  return fallback.map((column) => ({ ...column }));
};

export const persistColumnsConfig = ({
  tenantKey,
  legacyKey,
  columns
}: {
  tenantKey: string | null;
  legacyKey?: string | null;
  columns: ColumnConfig[];
}) => {
  if (!tenantKey) {
    return;
  }

  try {
    localStorage.setItem(tenantKey, JSON.stringify(columns));
    if (legacyKey) {
      localStorage.removeItem(legacyKey);
    }
  } catch {
    // noop: persistence should not block UI updates
  }
};
