import { useCallback, useState } from 'react';

export interface ConfigAutoCobranza {
  activa: boolean;
  medioPagoCode: string | null;
  medioPagoLabel: string | null;
}

const DEFAULT_CONFIG: ConfigAutoCobranza = {
  activa: false,
  medioPagoCode: null,
  medioPagoLabel: null,
};

const buildKey = (companyId: string | null): string =>
  `pos_auto_cobranza_v1${companyId ? `_c${companyId}` : ''}`;

const loadConfig = (key: string): ConfigAutoCobranza => {
  try {
    if (typeof window === 'undefined') return DEFAULT_CONFIG;
    const raw = window.localStorage.getItem(key);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<ConfigAutoCobranza>) };
  } catch {
    return DEFAULT_CONFIG;
  }
};

const persistConfig = (key: string, config: ConfigAutoCobranza): void => {
  try {
    window.localStorage.setItem(key, JSON.stringify(config));
  } catch {
    // no-op: storage unavailable
  }
};

export const useConfiguracionPos = (companyId: string | null) => {
  const key = buildKey(companyId);

  const [config, setConfigState] = useState<ConfigAutoCobranza>(() => loadConfig(key));

  const setConfig = useCallback(
    (update: Partial<ConfigAutoCobranza>) => {
      setConfigState((prev) => {
        const next = { ...prev, ...update };
        persistConfig(key, next);
        return next;
      });
    },
    [key],
  );

  return { config, setConfig };
};
