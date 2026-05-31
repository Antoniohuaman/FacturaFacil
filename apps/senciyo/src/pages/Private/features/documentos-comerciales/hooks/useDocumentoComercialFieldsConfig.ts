import { useState, useCallback, useEffect } from 'react';
import { tryLsKey } from '@/shared/tenant';
import { STORAGE_KEYS } from '../models/documentoComercial.constants';
import type { TipoDocumentoComercial } from '../models/documentoComercial.types';

export interface ConfiguracionCamposDocumentoComercial {
  notesSection: boolean;
  actionButtons: {
    vistaPrevia: boolean;
    cancelar: boolean;
    guardarBorrador: boolean;
    crearComprobante: boolean;
  };
  optionalFields: {
    direccion: { visible: boolean; required: boolean };
    fechaVencimiento: { visible: boolean; required: boolean };
    direccionEnvio: { visible: boolean; required: boolean };
    ordenCompra: { visible: boolean; required: boolean };
    guiaRemision: { visible: boolean; required: boolean };
    correo: { visible: boolean; required: boolean };
    centroCosto: { visible: boolean; required: boolean };
    vendedor: { visible: boolean; required: boolean };
  };
}

const DEFAULTS: ConfiguracionCamposDocumentoComercial = {
  notesSection: true,
  actionButtons: {
    vistaPrevia: true,
    cancelar: true,
    guardarBorrador: true,
    crearComprobante: true,
  },
  optionalFields: {
    direccion: { visible: false, required: false },
    fechaVencimiento: { visible: false, required: false },
    direccionEnvio: { visible: false, required: false },
    ordenCompra: { visible: false, required: false },
    guiaRemision: { visible: false, required: false },
    correo: { visible: false, required: false },
    centroCosto: { visible: false, required: false },
    vendedor: { visible: false, required: false },
  },
};

const obtenerClave = (tipo: TipoDocumentoComercial): string => {
  const base = `${STORAGE_KEYS.CAMPOS_PREFIJO}${tipo}`;
  return tryLsKey(base) ?? base;
};

const leerConfig = (tipo: TipoDocumentoComercial): ConfiguracionCamposDocumentoComercial => {
  try {
    const raw = window.localStorage.getItem(obtenerClave(tipo));
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<ConfiguracionCamposDocumentoComercial>;
    return {
      notesSection: parsed.notesSection ?? DEFAULTS.notesSection,
      actionButtons: { ...DEFAULTS.actionButtons, ...(parsed.actionButtons ?? {}) },
      optionalFields: {
        ...DEFAULTS.optionalFields,
        ...(parsed.optionalFields ?? {}),
      },
    };
  } catch {
    return DEFAULTS;
  }
};

export interface UseDocumentoComercialFieldsConfigReturn {
  config: ConfiguracionCamposDocumentoComercial;
  toggleNotesSection: () => void;
  toggleActionButton: (button: keyof ConfiguracionCamposDocumentoComercial['actionButtons']) => void;
  toggleOptionalField: (field: keyof ConfiguracionCamposDocumentoComercial['optionalFields']) => void;
  toggleOptionalFieldRequired: (field: keyof ConfiguracionCamposDocumentoComercial['optionalFields']) => void;
  resetToDefaults: () => void;
}

export function useDocumentoComercialFieldsConfig(
  tipo: TipoDocumentoComercial,
): UseDocumentoComercialFieldsConfigReturn {
  const [config, setConfig] = useState<ConfiguracionCamposDocumentoComercial>(() =>
    leerConfig(tipo),
  );

  useEffect(() => {
    setConfig(leerConfig(tipo));
  }, [tipo]);

  const persistir = useCallback(
    (nuevaConfig: ConfiguracionCamposDocumentoComercial) => {
      try {
        window.localStorage.setItem(obtenerClave(tipo), JSON.stringify(nuevaConfig));
      } catch {
        // silencioso
      }
      setConfig(nuevaConfig);
    },
    [tipo],
  );

  const toggleNotesSection = useCallback(() => {
    persistir({ ...config, notesSection: !config.notesSection });
  }, [config, persistir]);

  const toggleActionButton = useCallback(
    (button: keyof ConfiguracionCamposDocumentoComercial['actionButtons']) => {
      persistir({
        ...config,
        actionButtons: {
          ...config.actionButtons,
          [button]: !config.actionButtons[button],
        },
      });
    },
    [config, persistir],
  );

  const toggleOptionalField = useCallback(
    (field: keyof ConfiguracionCamposDocumentoComercial['optionalFields']) => {
      persistir({
        ...config,
        optionalFields: {
          ...config.optionalFields,
          [field]: {
            ...config.optionalFields[field],
            visible: !config.optionalFields[field].visible,
          },
        },
      });
    },
    [config, persistir],
  );

  const toggleOptionalFieldRequired = useCallback(
    (field: keyof ConfiguracionCamposDocumentoComercial['optionalFields']) => {
      persistir({
        ...config,
        optionalFields: {
          ...config.optionalFields,
          [field]: {
            ...config.optionalFields[field],
            required: !config.optionalFields[field].required,
          },
        },
      });
    },
    [config, persistir],
  );

  const resetToDefaults = useCallback(() => {
    persistir(DEFAULTS);
  }, [persistir]);

  return {
    config,
    toggleNotesSection,
    toggleActionButton,
    toggleOptionalField,
    toggleOptionalFieldRequired,
    resetToDefaults,
  };
}
