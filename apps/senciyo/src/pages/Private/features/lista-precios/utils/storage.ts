import { lsKey } from './tenantHelpers';

const migratedKeys = new Set<string>();

type JsonValue = unknown;

const LEGACY_STORAGE_KEYS: Record<string, string[]> = {
  price_list_columns: ['price_list_columns', 'lista_precios_columns'],
  price_list_products: ['price_list_products', 'lista_precios_products'],
  price_list_import_state: ['price_list_import_state', 'lista_precios_import'],
  catalog_products: ['catalog_products', 'catalogo_productos']
};

const resolveLegacyKeys = (baseKey: string, customKeys?: string[]): string[] => {
  const merged = new Set<string>([baseKey]);
  const candidates = customKeys && customKeys.length > 0
    ? customKeys
    : LEGACY_STORAGE_KEYS[baseKey] ?? [baseKey];
  candidates.forEach(key => {
    if (key) {
      merged.add(key);
    }
  });
  return Array.from(merged);
};

export const ensureTenantStorageMigration = (baseKey: string, legacyKeysOverride?: string[]): void => {
  if (typeof window === 'undefined') {
    return;
  }

  if (migratedKeys.has(baseKey)) {
    return;
  }

  const legacyKeys = resolveLegacyKeys(baseKey, legacyKeysOverride);
  const tenantKey = lsKey(baseKey);
  if (localStorage.getItem(tenantKey)) {
    cleanupLegacyKeys(legacyKeys, tenantKey);
    migratedKeys.add(baseKey);
    return;
  }

  for (const legacyKey of legacyKeys) {
    const legacyValue = localStorage.getItem(legacyKey);
    if (legacyValue) {
      localStorage.setItem(tenantKey, legacyValue);
      cleanupLegacyKeys(legacyKeys, tenantKey);
      migratedKeys.add(baseKey);
      return;
    }
  }

  cleanupLegacyKeys(legacyKeys, tenantKey);
  migratedKeys.add(baseKey);
};

const cleanupLegacyKeys = (legacyKeys: string[], tenantKey: string) => {
  legacyKeys.forEach(key => {
    if (key !== tenantKey) {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn('[storage] No se pudo limpiar clave legacy', key, error);
      }
    }
  });
};

export const readTenantJson = <T>(baseKey: string, defaultValue: T, legacyKeys?: string[]): T => {
  ensureTenantStorageMigration(baseKey, legacyKeys);
  const key = lsKey(baseKey);
  try {
    const stored = localStorage.getItem(key);
    if (!stored) {
      return defaultValue;
    }
    return JSON.parse(stored) as T;
  } catch (error) {
    console.error(`[storage] Error leyendo ${key}:`, error);
    return defaultValue;
  }
};

export const writeTenantJson = (baseKey: string, data: JsonValue): void => {
  ensureTenantStorageMigration(baseKey);
  const key = lsKey(baseKey);
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`[storage] Error escribiendo ${key}:`, error);
  }
};
