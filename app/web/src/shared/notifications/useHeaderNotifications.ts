import { useCallback, useEffect, useMemo, useState } from 'react';
import { useComprobanteContext } from '@/features/comprobantes-electronicos/lista-comprobantes/contexts/ComprobantesListContext';
import { useUserSession } from '@/contexts/UserSessionContext';
import { useProductStore } from '@/features/catalogo-articulos/hooks/useProductStore';
import { useConfigurationContext } from '@/features/configuracion-sistema/context/ConfigurationContext';
import { useCaja } from '@/features/control-caja/context/CajaContext';
import { InventoryService } from '@/features/gestion-inventario/services/inventory.service';
import type { Product } from '@/features/catalogo-articulos/models/types';
import type { Warehouse } from '@/features/configuracion-sistema/models/Warehouse';
import type { HeaderNotification, UseHeaderNotificationsResult } from './types';

const mapSunatNotifications = (comprobantes: readonly { id: string; type: string; client: string; status: string; date: string }[]): HeaderNotification[] => {
  return comprobantes
    .filter((inv) => {
      const status = (inv.status ?? '').toLowerCase();
      return status.includes('rechaz') || status.includes('observ') || status.includes('correg') || status.includes('fix');
    })
    .slice(0, 5)
    .map((inv) => {
      const status = inv.status ?? '';
      const statusLower = status.toLowerCase();
      let severity: HeaderNotification['severity'] = 'info';

      if (statusLower.includes('rechaz')) {
        severity = 'error';
      } else if (statusLower.includes('observ') || statusLower.includes('correg') || statusLower.includes('fix')) {
        severity = 'warning';
      }

      return {
        id: `sunat-${inv.id}`,
        title: `${inv.type} ${status}`.trim(),
        message: `${inv.id} · ${inv.client}`,
        createdAt: inv.date,
        severity,
        source: 'sunat',
        link: '/comprobantes',
        entityId: inv.id,
      };
    });
};

const mapStockNotifications = (
  products: readonly Product[],
  warehouses: readonly Warehouse[],
  currentEstablishmentId?: string,
): HeaderNotification[] => {
  if (!warehouses.length || !products.length) {
    return [];
  }

  const activeWarehouses = warehouses.filter((wh) => wh.isActive);

  if (!activeWarehouses.length) {
    return [];
  }

  const alerts = InventoryService.generateAlerts(Array.from(products), Array.from(activeWarehouses));

  const filteredAlerts = currentEstablishmentId
    ? alerts.filter((alert) => alert.establishmentId === currentEstablishmentId)
    : alerts;

  if (!filteredAlerts.length) {
    return [];
  }

  return filteredAlerts.slice(0, 5).map((alert) => {
    const isCritical = alert.estado === 'CRITICO';
    const severity: HeaderNotification['severity'] = isCritical ? 'error' : 'warning';

    const faltante = typeof alert.faltante === 'number' ? alert.faltante : undefined;

    const baseMessageParts = [`Stock actual: ${alert.cantidadActual}`];
    if (faltante !== undefined) {
      baseMessageParts.push(`Faltan ${faltante} para mínimo`);
    }

    return {
      id: `stock-${alert.productoId}-${alert.warehouseId}`,
      title: `${isCritical ? 'Stock crítico' : 'Stock bajo'} · ${alert.productoNombre}`,
      message: baseMessageParts.join(' · '),
      createdAt: Date.now(),
      severity,
      source: 'stock',
      link: '/inventario?view=alertas',
      entityId: alert.productoId,
    };
  });
};

const mapCajaNotifications = (status: string): HeaderNotification[] => {
  if (status !== 'cerrada') {
    return [];
  }

  return [
    {
      id: 'caja-cerrada',
      title: 'Caja cerrada',
      message: 'Abre la caja para registrar ventas y cobros.',
      createdAt: Date.now(),
      severity: 'warning',
      source: 'caja',
      link: '/control-caja?tab=apertura',
    },
  ];
};

export const useHeaderNotifications = (): UseHeaderNotificationsResult => {
  const { state: comprobanteState } = useComprobanteContext();
  const { session } = useUserSession();
  const { allProducts } = useProductStore();
  const { state: configState } = useConfigurationContext();
  const { status } = useCaja();

  const scopeKey = useMemo(() => {
    const companyId = session?.currentCompanyId || 'no-company';
    const establishmentId = session?.currentEstablishmentId || 'no-establishment';
    const userId = session?.userId || 'anon';
    return `${companyId}::${establishmentId}::${userId}`;
  }, [session?.currentCompanyId, session?.currentEstablishmentId, session?.userId]);

  const storageKey = useMemo(
    () => `ff_headerNotifications_readIds:${scopeKey}`,
    [scopeKey],
  );

  const [readIdsByScope, setReadIdsByScope] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!scopeKey) {
      return;
    }

    setReadIdsByScope((prev) => {
      if (prev[scopeKey]) {
        return prev;
      }

      try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) {
          return { ...prev, [scopeKey]: [] };
        }

        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed) && parsed.every((id) => typeof id === 'string')) {
          return { ...prev, [scopeKey]: parsed };
        }
      } catch {
        // Ignorar errores de lectura/formato y empezar limpio para este scope
      }

      return { ...prev, [scopeKey]: [] };
    });
  }, [scopeKey, storageKey]);

  const readIds = useMemo(
    () => readIdsByScope[scopeKey] ?? [],
    [readIdsByScope, scopeKey],
  );

  const sunatNotifications = useMemo(
    () => mapSunatNotifications(comprobanteState.comprobantes),
    [comprobanteState.comprobantes],
  );

  const stockNotifications = useMemo(
    () =>
      mapStockNotifications(
        allProducts,
        configState.warehouses,
        session?.currentEstablishmentId,
      ),
    [allProducts, configState.warehouses, session?.currentEstablishmentId],
  );

  const cajaNotifications = useMemo(
    () => mapCajaNotifications(status),
    [status],
  );

  const notifications = useMemo<HeaderNotification[]>(() => {
    const merged = [...sunatNotifications, ...stockNotifications, ...cajaNotifications];
    const limited = merged.slice(0, 10);

    return limited.map((notification) => ({
      ...notification,
      read: readIds.includes(notification.id),
    }));
  }, [sunatNotifications, stockNotifications, cajaNotifications, readIds]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  const markAsRead = useCallback((id: string) => {
    setReadIdsByScope((prev) => {
      const current = prev[scopeKey] ?? [];
      if (current.includes(id)) {
        return prev;
      }
      const next = [...current, id];
      const nextByScope = { ...prev, [scopeKey]: next };

      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // Si falla el guardado, no rompemos la UX
        }
      }

      return nextByScope;
    });
  }, [scopeKey, storageKey]);

  const markAllAsRead = useCallback(() => {
    if (!notifications.length) {
      return;
    }

    setReadIdsByScope((prev) => {
      const current = prev[scopeKey] ?? [];
      const allIds = notifications.map((notification) => notification.id);
      const unique = Array.from(new Set([...current, ...allIds]));
      const nextByScope = { ...prev, [scopeKey]: unique };

      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(unique));
        } catch {
          // Si falla el guardado, no rompemos la UX
        }
      }

      return nextByScope;
    });
  }, [notifications, scopeKey, storageKey]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
};
