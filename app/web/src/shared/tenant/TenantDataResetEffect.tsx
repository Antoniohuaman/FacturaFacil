import { useEffect, useRef } from 'react';
import { useTenant } from './TenantContext';
import { useProductStore } from '../../features/catalogo-articulos/hooks/useProductStore';
import { usePreferenciasDisponibilidad } from '../../features/gestion-inventario/stores/usePreferenciasDisponibilidad';
import { useIndicadoresFiltersStore } from '../../features/indicadores-negocio/store/indicadoresFiltersStore';
import { createCurrentMonthRange } from '../../features/indicadores-negocio/models/dateRange';
import { devLocalIndicadoresStore } from '../../features/indicadores-negocio/integration/devLocalStore';

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
      establishmentId: 'Todos',
    });
  }, [tenantId]);

  return null;
}
