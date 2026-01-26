import { useCallback, useEffect, useMemo, useState } from 'react';
import { lsKey } from '../../../../../shared/tenant';

export type ClienteColumnId =
  | 'avatar'
  | 'tipoDocumento'
  | 'numeroDocumento'
  | 'nombreRazonSocial'
  | 'direccion'
  | 'tipoCuenta'
  | 'telefono'
  | 'correo'
  | 'tipoPersona'
  | 'nombreComercial'
  | 'paginaWeb'
  | 'pais'
  | 'departamento'
  | 'provincia'
  | 'distrito'
  | 'ubigeo'
  | 'referenciaDireccion'
  | 'formaPago'
  | 'monedaPreferida'
  | 'listaPrecio'
  | 'usuarioAsignado'
  | 'clientePorDefecto'
  | 'tipoContribuyente'
  | 'estadoSunat'
  | 'condicionDomicilio'
  | 'fechaInscripcion'
  | 'sistemaEmision'
  | 'esEmisorElectronico'
  | 'esAgenteRetencion'
  | 'esAgentePercepcion'
  | 'esBuenContribuyente'
  | 'exceptuadaPercepcion'
  | 'actividadesEconomicas'
  | 'observaciones'
  | 'adjuntos'
  | 'imagenes'
  | 'estadoCliente'
  | 'fechaRegistro'
  | 'fechaUltimaModificacion'
  | 'acciones';

export interface ClienteColumnDefinition {
  id: ClienteColumnId;
  label: string;
  fixed?: boolean;
  defaultVisible?: boolean;
}

export interface ClienteColumnConfig {
  id: ClienteColumnId;
  label: string;
  visible: boolean;
  fixed?: boolean;
}

const STORAGE_BASE_KEY = 'clientes_columns_config';
const LEGACY_STORAGE_BASE_KEY = 'clientes_visible_columns';

export const CLIENTE_COLUMN_DEFINITIONS: ClienteColumnDefinition[] = [
  { id: 'avatar', label: 'Avatar', defaultVisible: true },
  { id: 'tipoDocumento', label: 'Tipo doc.', defaultVisible: true },
  { id: 'numeroDocumento', label: 'N° documento', defaultVisible: true },
  { id: 'nombreRazonSocial', label: 'Nombre / Razón social', defaultVisible: true },
  { id: 'direccion', label: 'Dirección', defaultVisible: true },
  { id: 'tipoCuenta', label: 'Tipo cuenta', defaultVisible: true },
  { id: 'telefono', label: 'Teléfono', defaultVisible: true },
  { id: 'correo', label: 'Correo', defaultVisible: true },
  { id: 'acciones', label: 'Acciones', defaultVisible: true },
  { id: 'tipoPersona', label: 'Tipo persona', defaultVisible: false },
  { id: 'nombreComercial', label: 'Nombre comercial', defaultVisible: false },
  { id: 'paginaWeb', label: 'Página web', defaultVisible: false },
  { id: 'pais', label: 'País', defaultVisible: false },
  { id: 'departamento', label: 'Departamento', defaultVisible: false },
  { id: 'provincia', label: 'Provincia', defaultVisible: false },
  { id: 'distrito', label: 'Distrito', defaultVisible: false },
  { id: 'ubigeo', label: 'Ubigeo', defaultVisible: false },
  { id: 'referenciaDireccion', label: 'Referencia', defaultVisible: false },
  { id: 'formaPago', label: 'Forma pago', defaultVisible: false },
  { id: 'monedaPreferida', label: 'Moneda', defaultVisible: false },
  { id: 'listaPrecio', label: 'Perfil de precio', defaultVisible: false },
  { id: 'usuarioAsignado', label: 'Usuario asignado', defaultVisible: false },
  { id: 'clientePorDefecto', label: 'Cliente default', defaultVisible: false },
  { id: 'tipoContribuyente', label: 'Tipo contribuyente', defaultVisible: false },
  { id: 'estadoSunat', label: 'Estado SUNAT', defaultVisible: false },
  { id: 'condicionDomicilio', label: 'Condición dom.', defaultVisible: false },
  { id: 'fechaInscripcion', label: 'Fecha insc.', defaultVisible: false },
  { id: 'sistemaEmision', label: 'Sistema emisión', defaultVisible: false },
  { id: 'esEmisorElectronico', label: 'Emisor electr.', defaultVisible: false },
  { id: 'esAgenteRetencion', label: 'Agente reten.', defaultVisible: false },
  { id: 'esAgentePercepcion', label: 'Agente percep.', defaultVisible: false },
  { id: 'esBuenContribuyente', label: 'Buen contrib.', defaultVisible: false },
  { id: 'exceptuadaPercepcion', label: 'Except. percep.', defaultVisible: false },
  { id: 'actividadesEconomicas', label: 'Actividades econ.', defaultVisible: false },
  { id: 'observaciones', label: 'Observaciones', defaultVisible: false },
  { id: 'adjuntos', label: 'Adjuntos', defaultVisible: false },
  { id: 'imagenes', label: 'Imágenes', defaultVisible: false },
  { id: 'estadoCliente', label: 'Estado cliente', defaultVisible: false },
  { id: 'fechaRegistro', label: 'Fecha registro', defaultVisible: false },
  { id: 'fechaUltimaModificacion', label: 'Últ. modif.', defaultVisible: false }
];

const createDefaultConfig = (): ClienteColumnConfig[] =>
  CLIENTE_COLUMN_DEFINITIONS.map((column) => ({
    id: column.id,
    label: column.label,
    visible: column.fixed ? true : Boolean(column.defaultVisible),
    fixed: column.fixed,
  }));

const resolveTenantStorageKey = (baseKey: string): string | null => {
  try {
    return lsKey(baseKey);
  } catch {
    return null;
  }
};

const parseConfig = (raw: string | null): ClienteColumnConfig[] | null => {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ClienteColumnConfig[]) : null;
  } catch {
    return null;
  }
};

const sanitizeConfig = (stored: ClienteColumnConfig[]): ClienteColumnConfig[] => {
  const defaults = createDefaultConfig();
  const defaultMap = new Map(defaults.map((column) => [column.id, column]));
  const sanitized: ClienteColumnConfig[] = [];

  stored.forEach((column) => {
    const reference = defaultMap.get(column.id);
    if (!reference) {
      return;
    }
    sanitized.push({
      ...reference,
      visible: reference.fixed ? true : Boolean(column.visible),
    });
    defaultMap.delete(column.id);
  });

  defaultMap.forEach((column) => {
    sanitized.push({ ...column });
  });

  return sanitized;
};

const parseLegacyVisibility = (raw: string | null): ClienteColumnId[] | null => {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }
    const validIds = new Set(CLIENTE_COLUMN_DEFINITIONS.map((column) => column.id));
    const filtered = parsed.filter((id): id is ClienteColumnId => validIds.has(id as ClienteColumnId));
    return filtered.length ? filtered : null;
  } catch {
    return null;
  }
};

const migrateLegacyVisibility = (legacyIds: ClienteColumnId[]): ClienteColumnConfig[] => {
  const defaults = createDefaultConfig();
  const legacySet = new Set(legacyIds);
  return defaults.map((column) => ({
    ...column,
    visible: column.fixed ? true : legacySet.has(column.id),
  }));
};

const loadInitialConfig = (): ClienteColumnConfig[] => {
  if (typeof window === 'undefined') {
    return createDefaultConfig();
  }

  const tenantKey = resolveTenantStorageKey(STORAGE_BASE_KEY);
  const legacyKey = resolveTenantStorageKey(LEGACY_STORAGE_BASE_KEY);

  if (tenantKey) {
    const stored = parseConfig(window.localStorage.getItem(tenantKey));
    if (stored) {
      return sanitizeConfig(stored);
    }
  }

  if (legacyKey) {
    const legacyIds = parseLegacyVisibility(window.localStorage.getItem(legacyKey));
    if (legacyIds) {
      const migrated = migrateLegacyVisibility(legacyIds);
      if (tenantKey) {
        try {
          window.localStorage.setItem(tenantKey, JSON.stringify(migrated));
          window.localStorage.removeItem(legacyKey);
        } catch {
          // noop
        }
      }
      return migrated;
    }
  }

  return createDefaultConfig();
};

export const useClientesColumns = () => {
  const [columnsConfig, setColumnsConfig] = useState<ClienteColumnConfig[]>(() => loadInitialConfig());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const tenantKey = resolveTenantStorageKey(STORAGE_BASE_KEY);
    if (!tenantKey) {
      return;
    }
    try {
      window.localStorage.setItem(tenantKey, JSON.stringify(columnsConfig));
      const legacyKey = resolveTenantStorageKey(LEGACY_STORAGE_BASE_KEY);
      if (legacyKey) {
        window.localStorage.removeItem(legacyKey);
      }
    } catch {
      // noop
    }
  }, [columnsConfig]);

  const toggleColumn = useCallback((columnId: ClienteColumnId) => {
    setColumnsConfig((prev) =>
      prev.map((column) => {
        if (column.id !== columnId || column.fixed) {
          return column;
        }
        return { ...column, visible: !column.visible };
      })
    );
  }, []);

  const reorderColumns = useCallback((sourceId: ClienteColumnId, targetId: ClienteColumnId) => {
    if (sourceId === targetId) {
      return;
    }

    setColumnsConfig((prev) => {
      const sourceIndex = prev.findIndex((column) => column.id === sourceId);
      const targetIndex = prev.findIndex((column) => column.id === targetId);

      if (sourceIndex === -1 || targetIndex === -1) {
        return prev;
      }

      if (prev[sourceIndex]?.fixed) {
        return prev;
      }

      const updated = [...prev];
      const [moved] = updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, moved);
      return updated;
    });
  }, []);

  const resetColumns = useCallback(() => {
    setColumnsConfig(createDefaultConfig());
  }, []);

  const selectAllColumns = useCallback(() => {
    setColumnsConfig((prev) => prev.map((column) => ({ ...column, visible: true })));
  }, []);

  const visibleColumns = useMemo(
    () => columnsConfig.filter((column) => column.visible || column.fixed),
    [columnsConfig]
  );

  const visibleColumnIds = useMemo(() => visibleColumns.map((column) => column.id), [visibleColumns]);

  const lockedColumnIds = useMemo(
    () => columnsConfig.filter((column) => column.fixed).map((column) => column.id),
    [columnsConfig]
  );

  return {
    columnDefinitions: CLIENTE_COLUMN_DEFINITIONS,
    columnsConfig,
    visibleColumns,
    visibleColumnIds,
    lockedColumnIds,
    toggleColumn,
    reorderColumns,
    resetColumns,
    selectAllColumns,
  };
};
