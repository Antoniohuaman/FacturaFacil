import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ALWAYS_REQUIRED_FIELD_IDS,
  ALWAYS_VISIBLE_FIELD_IDS,
  CLIENTE_FIELD_CONFIGS,
  DEFAULT_REQUIRED_FIELD_IDS,
  DEFAULT_VISIBLE_FIELD_IDS,
  type ClienteFieldConfig,
  type ClienteFieldId,
} from '../components/clienteFormConfig';

const STORAGE_KEY = 'ff_gestionClientes_formFields';

type PersistedFormConfig = {
  visible: ClienteFieldId[];
  required: ClienteFieldId[];
};

const fieldMap = new Map<ClienteFieldId, ClienteFieldConfig>(CLIENTE_FIELD_CONFIGS.map((field) => [field.id, field]));

const getTenantEmpresaId = (): string => 'DEFAULT_EMPRESA'; // TODO: Reemplazar cuando exista hook real

const ensureEmpresaId = (): string => {
  const empresaId = getTenantEmpresaId();
  if (!empresaId || typeof empresaId !== 'string' || !empresaId.trim()) {
    throw new Error('empresaId inválido para la configuración del formulario de clientes');
  }
  return empresaId;
};

const lsKey = (): string => `${ensureEmpresaId()}:${STORAGE_KEY}`;

const sanitizeVisible = (ids?: ClienteFieldId[]): ClienteFieldId[] => {
  const known = new Set(fieldMap.keys());
  const initial = Array.isArray(ids) ? ids.filter((id): id is ClienteFieldId => known.has(id)) : [];
  const merged = Array.from(new Set<ClienteFieldId>([...ALWAYS_VISIBLE_FIELD_IDS, ...initial]));
  return merged;
};

const sanitizeRequired = (ids: ClienteFieldId[] | undefined, visible: ClienteFieldId[]): ClienteFieldId[] => {
  const visibleSet = new Set(visible);
  const allowed = Array.isArray(ids)
    ? ids.filter((id): id is ClienteFieldId => fieldMap.has(id))
    : [];
  const merged = Array.from(new Set<ClienteFieldId>([...ALWAYS_REQUIRED_FIELD_IDS, ...allowed]));
  return merged.filter((id) => visibleSet.has(id));
};

const readPersistedConfig = (): PersistedFormConfig | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(lsKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedFormConfig;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
};

const persistConfig = (config: PersistedFormConfig) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(lsKey(), JSON.stringify(config));
  } catch {
    // noop
  }
};

export const useClienteFormConfig = () => {
  const [visibleFieldIds, setVisibleFieldIds] = useState<ClienteFieldId[]>(() => [...DEFAULT_VISIBLE_FIELD_IDS]);
  const [requiredFieldIds, setRequiredFieldIds] = useState<ClienteFieldId[]>(() => [...DEFAULT_REQUIRED_FIELD_IDS]);

  useEffect(() => {
    try {
      const persisted = readPersistedConfig();
      if (!persisted) return;
      const nextVisible = sanitizeVisible(persisted.visible);
      const nextRequired = sanitizeRequired(persisted.required, nextVisible);
      setVisibleFieldIds(nextVisible);
      setRequiredFieldIds(nextRequired);
    } catch (error) {
      console.warn('No se pudo cargar la configuración personalizada del formulario de clientes', error);
    }
  }, []);

  useEffect(() => {
    persistConfig({ visible: visibleFieldIds, required: requiredFieldIds });
  }, [visibleFieldIds, requiredFieldIds]);

  const visibleSet = useMemo(() => new Set<ClienteFieldId>(visibleFieldIds), [visibleFieldIds]);
  const requiredSet = useMemo(() => new Set<ClienteFieldId>(requiredFieldIds), [requiredFieldIds]);

  const toggleVisible = useCallback((fieldId: ClienteFieldId) => {
    const config = fieldMap.get(fieldId);
    if (!config || config.alwaysVisible) {
      return;
    }

    setVisibleFieldIds((prevVisible) => {
      const isVisible = prevVisible.includes(fieldId);
      if (isVisible) {
        const nextVisible = prevVisible.filter((id) => id !== fieldId);
        setRequiredFieldIds((prevRequired) => prevRequired.filter((id) => id !== fieldId));
        return nextVisible;
      }
      return [...prevVisible, fieldId];
    });
  }, []);

  const toggleRequired = useCallback((fieldId: ClienteFieldId) => {
    const config = fieldMap.get(fieldId);
    if (!config || config.alwaysRequired || config.allowRequiredToggle === false) {
      return;
    }

    setRequiredFieldIds((prevRequired) => {
      const isRequired = prevRequired.includes(fieldId);
      if (isRequired) {
        return prevRequired.filter((id) => id !== fieldId);
      }

      setVisibleFieldIds((prevVisible) => (prevVisible.includes(fieldId) ? prevVisible : [...prevVisible, fieldId]));
      return [...prevRequired, fieldId];
    });
  }, []);

  const resetDefaults = useCallback(() => {
    setVisibleFieldIds([...DEFAULT_VISIBLE_FIELD_IDS]);
    setRequiredFieldIds([...DEFAULT_REQUIRED_FIELD_IDS]);
  }, []);

  const selectAllFields = useCallback(() => {
    const allIds = CLIENTE_FIELD_CONFIGS.map((field) => field.id);
    setVisibleFieldIds(allIds);
    setRequiredFieldIds(ALWAYS_REQUIRED_FIELD_IDS);
  }, []);

  const isFieldVisible = useCallback((fieldId: ClienteFieldId) => visibleSet.has(fieldId), [visibleSet]);
  const isFieldRequired = useCallback((fieldId: ClienteFieldId) => requiredSet.has(fieldId), [requiredSet]);

  return {
    fieldConfigs: CLIENTE_FIELD_CONFIGS,
    visibleFieldIds,
    requiredFieldIds,
    isFieldVisible,
    isFieldRequired,
    toggleFieldVisible: toggleVisible,
    toggleFieldRequired: toggleRequired,
    resetDefaults,
    selectAllFields,
  };
};
