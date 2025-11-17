// src/features/lista-precios/hooks/useCatalogSync.ts
import { useState, useEffect } from 'react';
import type { CatalogProduct } from '../models/PriceTypes';
import { lsKey } from '../utils/tenantHelpers';

/**
 * Utilidad para cargar desde localStorage
 */
const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    return JSON.parse(stored);
  } catch (error) {
    console.error(`[useCatalogSync] Error loading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

/**
 * Hook para sincronización con catálogo de productos
 */
export const useCatalogSync = () => {
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>(() => {
    try {
      return loadFromLocalStorage<CatalogProduct[]>(lsKey('catalog_products'), []);
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
