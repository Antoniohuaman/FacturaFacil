import { createContext, useContext } from 'react';
import type { TenantContextValue } from './types';

export const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
