import { useEffect, useRef } from 'react';
import { useTenant } from './TenantContext';
import { useProductStore } from '../../pages/Private/features/catalogo-articulos/hooks/useProductStore';
import { usePreferenciasDisponibilidad } from '../../pages/Private/features/gestion-inventario/stores/usePreferenciasDisponibilidad';
import { useIndicadoresFiltersStore } from '../../pages/Private/features/indicadores-negocio/store/indicadoresFiltersStore';
import { createCurrentMonthRange } from '../../pages/Private/features/indicadores-negocio/models/dateRange';
import { devLocalIndicadoresStore } from '../../pages/Private/features/indicadores-negocio/integration/devLocalStore';

export function TenantDataResetEffect() {
  const { tenantId } = useTenant();
  const lastTenantIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastTenantIdRef.current === tenantId) {
      return;
    }
    lastTenantIdRef.current = tenantId ?? null;

    const productStore = useProductStore.getState();
    productStore.rehydrateFromStorage();

    const inventoryStore = usePreferenciasDisponibilidad as typeof usePreferenciasDisponibilidad & {
      persist?: { rehydrate?: () => Promise<void> | void };
    };
    inventoryStore.persist?.rehydrate?.();

    devLocalIndicadoresStore.rehydrateFromStorage?.();

    useIndicadoresFiltersStore.setState({
      dateRange: createCurrentMonthRange(),
      EstablecimientoId: 'Todos',
    });
  }, [tenantId]);

  return null;
}
