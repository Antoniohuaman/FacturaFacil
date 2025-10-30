/* eslint-disable @typescript-eslint/no-unused-vars -- variables temporales; limpieza diferida */
// ===================================================================
// HOOK: useVoucherDesignConfig
// Hook centralizado para gestionar la configuración de diseño de comprobantes
// ===================================================================

import { useState, useEffect, useCallback } from 'react';
import type {
  VoucherDesignConfigurationExtended,
  LogoConfiguration,
  WatermarkConfiguration,
  FooterConfiguration,
  DocumentFieldsConfiguration,
  ProductFieldsConfiguration
} from '../models/VoucherDesignExtended';
import {
  DEFAULT_LOGO_CONFIG,
  DEFAULT_WATERMARK_CONFIG,
  DEFAULT_FOOTER_CONFIG,
  DEFAULT_DOCUMENT_FIELDS_CONFIG,
  DEFAULT_PRODUCT_FIELDS_CONFIG
} from '../models/VoucherDesignExtended';

type DesignType = 'A4' | 'TICKET';

const STORAGE_KEY_PREFIX = 'voucher_design_extended_';

/**
 * Hook para gestionar la configuración de diseño de comprobantes
 * Maneja persistencia en localStorage y sincronización en tiempo real
 */
export const useVoucherDesignConfig = (designType: DesignType) => {
  const storageKey = `${STORAGE_KEY_PREFIX}${designType.toLowerCase()}`;

  // Estado de configuración
  const [config, setConfig] = useState<VoucherDesignConfigurationExtended>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading voucher design config:', e);
      }
    }
    return {
      logo: DEFAULT_LOGO_CONFIG,
      watermark: DEFAULT_WATERMARK_CONFIG,
      footer: DEFAULT_FOOTER_CONFIG,
      documentFields: DEFAULT_DOCUMENT_FIELDS_CONFIG,
      productFields: DEFAULT_PRODUCT_FIELDS_CONFIG
    };
  });

  // Guardar en localStorage cuando cambia la configuración
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(config));
      // Disparar evento personalizado para sincronización entre componentes
      window.dispatchEvent(new CustomEvent('voucherDesignConfigChanged', {
        detail: { designType, config }
      }));
    } catch (e) {
      console.error('Error saving voucher design config:', e);
    }
  }, [config, storageKey, designType]);

  // Actualizar configuración de logo
  const updateLogo = useCallback((logo: LogoConfiguration) => {
    setConfig(prev => ({ ...prev, logo }));
  }, []);

  // Actualizar configuración de marca de agua
  const updateWatermark = useCallback((watermark: WatermarkConfiguration) => {
    setConfig(prev => ({ ...prev, watermark }));
  }, []);

  // Actualizar configuración de pie de página
  const updateFooter = useCallback((footer: FooterConfiguration) => {
    setConfig(prev => ({ ...prev, footer }));
  }, []);

  // Actualizar configuración de campos de documento
  const updateDocumentFields = useCallback((documentFields: DocumentFieldsConfiguration) => {
    setConfig(prev => ({ ...prev, documentFields }));
  }, []);

  // Actualizar configuración de campos de productos
  const updateProductFields = useCallback((productFields: ProductFieldsConfiguration) => {
    setConfig(prev => ({ ...prev, productFields }));
  }, []);

  // Restaurar valores por defecto
  const resetToDefault = useCallback(() => {
    const defaultConfig: VoucherDesignConfigurationExtended = {
      logo: DEFAULT_LOGO_CONFIG,
      watermark: DEFAULT_WATERMARK_CONFIG,
      footer: DEFAULT_FOOTER_CONFIG,
      documentFields: DEFAULT_DOCUMENT_FIELDS_CONFIG,
      productFields: DEFAULT_PRODUCT_FIELDS_CONFIG
    };
    setConfig(defaultConfig);
  }, []);

  // Exportar configuración
  const exportConfig = useCallback(() => {
    const dataStr = JSON.stringify({ designType, config }, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `voucher-design-${designType.toLowerCase()}-${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);
  }, [config, designType]);

  // Importar configuración
  const importConfig = useCallback((file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const result = e.target?.result as string;
          const imported = JSON.parse(result);

          if (imported.designType === designType) {
            setConfig(imported.config);
            resolve();
          } else {
            reject(new Error('El archivo no corresponde al tipo de diseño seleccionado'));
          }
        } catch (error) {
          reject(new Error('Error al importar el archivo. Verifica que sea un archivo válido.'));
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsText(file);
    });
  }, [designType]);

  return {
    config,
    updateLogo,
    updateWatermark,
    updateFooter,
    updateDocumentFields,
    updateProductFields,
    resetToDefault,
    exportConfig,
    importConfig
  };
};

/**
 * Hook para obtener la configuración de diseño (solo lectura)
 * Útil para componentes que solo necesitan leer la configuración
 */
export const useVoucherDesignConfigReader = (designType: DesignType) => {
  const storageKey = `${STORAGE_KEY_PREFIX}${designType.toLowerCase()}`;

  const [config, setConfig] = useState<VoucherDesignConfigurationExtended>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading voucher design config:', e);
      }
    }
    return {
      logo: DEFAULT_LOGO_CONFIG,
      watermark: DEFAULT_WATERMARK_CONFIG,
      footer: DEFAULT_FOOTER_CONFIG,
      documentFields: DEFAULT_DOCUMENT_FIELDS_CONFIG,
      productFields: DEFAULT_PRODUCT_FIELDS_CONFIG
    };
  });

  // Escuchar cambios en la configuración
  useEffect(() => {
    const handleConfigChange = (event: CustomEvent) => {
      if (event.detail.designType === designType) {
        setConfig(event.detail.config);
      }
    };

    window.addEventListener('voucherDesignConfigChanged', handleConfigChange as EventListener);

    return () => {
      window.removeEventListener('voucherDesignConfigChanged', handleConfigChange as EventListener);
    };
  }, [designType]);

  return config;
};
