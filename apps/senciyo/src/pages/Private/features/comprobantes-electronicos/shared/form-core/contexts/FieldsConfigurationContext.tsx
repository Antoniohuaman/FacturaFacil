/* eslint-disable react-refresh/only-export-components -- archivo mezcla context y utilidades; split diferido */
// ===================================================================
// CONTEXTO PARA CONFIGURACIÓN DE VISIBILIDAD DE CAMPOS
// Permite que los cambios en la configuración se propaguen inmediatamente
// ===================================================================

import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface ComponentVisibility {
  // Componentes completos
  notesSection: boolean;
  actionButtons: {
    vistaPrevia: boolean;
    cancelar: boolean;
    guardarBorrador: boolean;
    crearComprobante: boolean;
  };

  // Campos opcionales de DocumentInfoCard
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

const DEFAULT_VISIBILITY: ComponentVisibility = {
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

const STORAGE_KEY = 'comprobantes_fields_visibility_config';

interface FieldsConfigurationContextValue {
  config: ComponentVisibility;
  toggleNotesSection: () => void;
  toggleActionButton: (button: keyof ComponentVisibility['actionButtons']) => void;
  toggleOptionalField: (field: keyof ComponentVisibility['optionalFields']) => void;
  toggleOptionalFieldRequired: (field: keyof ComponentVisibility['optionalFields']) => void;
  resetToDefaults: () => void;
}

const FieldsConfigurationContext = createContext<FieldsConfigurationContextValue | undefined>(undefined);

export function FieldsConfigurationProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ComponentVisibility>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return DEFAULT_VISIBILITY;
        }

        const partial = parsed as Partial<ComponentVisibility>;

        return {
          notesSection:
            typeof partial.notesSection === 'boolean'
              ? partial.notesSection
              : DEFAULT_VISIBILITY.notesSection,
          actionButtons: {
            ...DEFAULT_VISIBILITY.actionButtons,
            ...(partial.actionButtons ?? {}),
          },
          optionalFields: {
            ...DEFAULT_VISIBILITY.optionalFields,
            ...(partial.optionalFields ?? {}),
          },
        };
      }
    } catch (error) {
      console.error('Error loading fields configuration:', error);
    }
    return DEFAULT_VISIBILITY;
  });

  // Guardar en localStorage cuando cambie la configuración
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Error saving fields configuration:', error);
    }
  }, [config]);

  const toggleNotesSection = () => {
    setConfig(prev => ({
      ...prev,
      notesSection: !prev.notesSection,
    }));
  };

  const toggleActionButton = (button: keyof ComponentVisibility['actionButtons']) => {
    setConfig(prev => ({
      ...prev,
      actionButtons: {
        ...prev.actionButtons,
        [button]: !prev.actionButtons[button],
      },
    }));
  };

  const toggleOptionalField = (field: keyof ComponentVisibility['optionalFields']) => {
    setConfig(prev => ({
      ...prev,
      optionalFields: {
        ...prev.optionalFields,
        [field]: {
          ...prev.optionalFields[field],
          visible: !prev.optionalFields[field].visible,
        },
      },
    }));
  };

  const toggleOptionalFieldRequired = (field: keyof ComponentVisibility['optionalFields']) => {
    setConfig(prev => ({
      ...prev,
      optionalFields: {
        ...prev.optionalFields,
        [field]: {
          ...prev.optionalFields[field],
          required: !prev.optionalFields[field].required,
        },
      },
    }));
  };

  const resetToDefaults = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing fields configuration:', error);
    }
    setConfig(DEFAULT_VISIBILITY);
  };

  return (
    <FieldsConfigurationContext.Provider
      value={{
        config,
        toggleNotesSection,
        toggleActionButton,
        toggleOptionalField,
        toggleOptionalFieldRequired,
        resetToDefaults,
      }}
    >
      {children}
    </FieldsConfigurationContext.Provider>
  );
}

export function useFieldsConfiguration() {
  const context = useContext(FieldsConfigurationContext);
  if (context === undefined) {
    throw new Error('useFieldsConfiguration must be used within a FieldsConfigurationProvider');
  }
  return context;
}
