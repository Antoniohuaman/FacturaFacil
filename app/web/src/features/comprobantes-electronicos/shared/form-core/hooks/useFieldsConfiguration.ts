// ===================================================================
// HOOK PARA CONFIGURACIÓN DE VISIBILIDAD DE CAMPOS Y COMPONENTES
// Permite personalizar qué elementos se muestran en el formulario
// ===================================================================

import { useState, useEffect } from 'react';

export interface ComponentVisibility {
  // Componentes completos
  notesSection: boolean;
  actionButtons: {
    vistaPrevia: boolean;
    cancelar: boolean;
    guardarBorrador: boolean;
    crearComprobante: boolean;
  };

  // Campos opcionales de DocumentInfoCard (ya manejados por showOptionalFields)
  // Solo agregamos la configuración de "obligatorio" para cada uno
  optionalFields: {
    direccion: { visible: boolean; required: boolean };
    fechaVencimiento: { visible: boolean; required: boolean };
    direccionEnvio: { visible: boolean; required: boolean };
    ordenCompra: { visible: boolean; required: boolean };
    guiaRemision: { visible: boolean; required: boolean };
    correo: { visible: boolean; required: boolean };
    centroCosto: { visible: boolean; required: boolean };
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
    direccion: { visible: true, required: false },
    fechaVencimiento: { visible: true, required: false },
    direccionEnvio: { visible: true, required: false },
    ordenCompra: { visible: true, required: false },
    guiaRemision: { visible: true, required: false },
    correo: { visible: true, required: false },
    centroCosto: { visible: true, required: false },
  },
};

const STORAGE_KEY = 'comprobantes_fields_visibility_config';

export const useFieldsConfiguration = () => {
  const [config, setConfig] = useState<ComponentVisibility>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_VISIBILITY, ...JSON.parse(saved) };
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
    setConfig(DEFAULT_VISIBILITY);
  };

  return {
    config,
    toggleNotesSection,
    toggleActionButton,
    toggleOptionalField,
    toggleOptionalFieldRequired,
    resetToDefaults,
  };
};
