// src/features/lista-precios/hooks/useCatalogSync.ts
import { useState, useEffect } from 'react';
import type { CatalogProduct } from '../models/PriceTypes';
import { lsKey } from '../utils/tenantHelpers';
import { ensureTenantStorageMigration, readTenantJson } from '../utils/storage';

/**
 * Hook para sincronización con catálogo de productos
 */
export const useCatalogSync = () => {
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>(() => {
    ensureTenantStorageMigration('catalog_products');
    try {
      return readTenantJson<CatalogProduct[]>('catalog_products', []);
    } catch (error) {
      console.error('[useCatalogSync] Error loading catalog products:', error);
      return [];
    }
  });

  // Sincronizar con localStorage del catálogo cuando cambie
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      try {
        if (e.key === lsKey('catalog_products') && e.newValue) {
          const newProducts = JSON.parse(e.newValue);
          setCatalogProducts(newProducts);
        }
      } catch (error) {
        console.error('[useCatalogSync] Error parsing catalog products from storage event:', error);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    catalogProducts
  };
};
