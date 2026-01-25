// ===================================================================
// HOOK: useVoucherDesignConfig
// Hook centralizado para gestionar la configuración de diseño de comprobantes
// ===================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  VoucherDesignConfigurationExtended,
  LogoConfiguration,
  WatermarkConfiguration,
  FooterConfiguration,
  DocumentFieldsConfiguration,
  DesignType,
  VoucherDesignConfig,
  VoucherDesignA4Config,
  VoucherDesignTicketConfig,
} from '../modelos/VoucherDesignUnified';
import {
  CONFIGURACION_LOGO_PREDETERMINADA,
  CONFIGURACION_MARCA_AGUA_PREDETERMINADA,
  CONFIGURACION_PIE_PAGINA_PREDETERMINADA,
  CONFIGURACION_TICKET_PREDETERMINADA,
  CAMPOS_DOCUMENTO_A4_PREDETERMINADOS,
  CAMPOS_DOCUMENTO_TICKET_PREDETERMINADOS,
  CAMPOS_PRODUCTO_A4_PREDETERMINADOS,
  CAMPOS_PRODUCTO_TICKET_PREDETERMINADOS,
} from '../modelos/VoucherDesignUnified';
import { FabricaAlmacenamientoDisenoComprobante } from '../servicios/AlmacenamientoDisenoComprobante';

/**
 * Hook para gestionar la configuración de diseño de comprobantes
 * Maneja persistencia y sincronización en tiempo real
 */
export const useVoucherDesignConfig = (designType: DesignType) => {
  const storage = useMemo(() => FabricaAlmacenamientoDisenoComprobante.create(), []);

  // Estado de configuración
  const [config, setConfig] = useState<VoucherDesignConfigurationExtended>(() => {
    return getDefaultConfig(designType);
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar configuración al montar
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setIsLoading(true);
        const loaded = await storage.load(designType);

        if (loaded) {
          const extracted =
            designType === 'A4' ? loaded.a4Config : loaded.ticketConfig;

          if (extracted) {
            // Watermark ahora está disponible tanto en A4 como en TICKET
            const watermark = 'watermark' in extracted
              ? extracted.watermark
              : CONFIGURACION_MARCA_AGUA_PREDETERMINADA;

            const ticketPaperWidth =
              designType === 'TICKET'
                ? ((extracted as VoucherDesignTicketConfig).general?.paperWidth === 58 ? 58 : 80)
                : undefined;

            setConfig({
              logo: extracted.logo,
              watermark,
              footer: extracted.footer,
              documentFields: extracted.documentFields,
              productFields: extracted.productFields,
              ticketPaperWidth,
            });
          }
        }
      } catch (err) {
        console.error('[useVoucherDesignConfig] Load error:', err);
        setError('Error al cargar la configuración');
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, [designType, storage]);

  // Guardar cuando cambia la configuración
  useEffect(() => {
    if (isLoading) return; // No guardar durante carga inicial

    const saveConfig = async () => {
      try {
        // Base: usar lo persistido actual para evitar pisar campos que esta UI no edita
        // (especialmente en Ticket: general/typography/qrCode/separators/metadata)
        const basePersistido = await storage.load(designType);

        const fullConfig: VoucherDesignConfig = {
          ...basePersistido,
          // Asegurar metadatos mínimos coherentes
          type: designType,
          version: '2.0',
          isDefault: false,
          isActive: true,
          // Mantener createdAt previo si existía
          createdAt: basePersistido.createdAt || new Date(),
          updatedAt: new Date(),
        };

        if (designType === 'A4') {
          // A4 no tiene campos avanzados fuera de lo que esta UI edita
          fullConfig.a4Config = config as unknown as VoucherDesignA4Config;
          fullConfig.ticketConfig = undefined;
        } else {
          const baseTicket = (basePersistido.ticketConfig || {
            logo: CONFIGURACION_TICKET_PREDETERMINADA.logo,
            watermark: CONFIGURACION_TICKET_PREDETERMINADA.watermark,
            footer: CONFIGURACION_TICKET_PREDETERMINADA.footer,
            documentFields: CONFIGURACION_TICKET_PREDETERMINADA.documentFields,
            productFields: CONFIGURACION_TICKET_PREDETERMINADA.productFields,
            general: CONFIGURACION_TICKET_PREDETERMINADA.general,
            typography: CONFIGURACION_TICKET_PREDETERMINADA.typography,
            qrCode: CONFIGURACION_TICKET_PREDETERMINADA.qrCode,
            separators: CONFIGURACION_TICKET_PREDETERMINADA.separators,
            metadata: CONFIGURACION_TICKET_PREDETERMINADA.metadata,
          }) as VoucherDesignTicketConfig;

          const paperWidth = config.ticketPaperWidth ?? (baseTicket.general?.paperWidth === 58 ? 58 : 80);

          fullConfig.ticketConfig = {
            ...baseTicket,
            // Lo que edita la UI nueva
            logo: config.logo as VoucherDesignTicketConfig['logo'],
            watermark: config.watermark,
            footer: config.footer as VoucherDesignTicketConfig['footer'],
            documentFields: config.documentFields,
            productFields: config.productFields as VoucherDesignTicketConfig['productFields'],
            // Merge seguro de general
            general: {
              ...baseTicket.general,
              paperWidth,
            },
          };

          fullConfig.a4Config = undefined;
        }

        // Completar id/name si faltan (p.ej. primer guardado)
        if (!fullConfig.id) {
          fullConfig.id = `design-${designType.toLowerCase()}-${Date.now()}`;
        }
        if (!fullConfig.name) {
          fullConfig.name = `Diseño ${designType} Personalizado`;
        }

        await storage.save(designType, fullConfig);
        setError(null);
      } catch (err) {
        console.error('[useVoucherDesignConfig] Save error:', err);
        setError('Error al guardar la configuración');
      }
    };

    const timeoutId = setTimeout(saveConfig, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [config, designType, storage, isLoading]);

  // Actualizar configuración de logo
  const updateLogo = useCallback((logo: LogoConfiguration) => {
    setConfig((prev) => ({ ...prev, logo }));
  }, []);

  // Actualizar configuración de marca de agua
  const updateWatermark = useCallback((watermark: WatermarkConfiguration) => {
    setConfig((prev) => ({ ...prev, watermark }));
  }, []);

  // Actualizar configuración de pie de página
  const updateFooter = useCallback((footer: FooterConfiguration) => {
    setConfig((prev) => ({ ...prev, footer }));
  }, []);

  // Actualizar configuración de campos de documento
  const updateDocumentFields = useCallback(
    (documentFields: DocumentFieldsConfiguration) => {
      setConfig((prev) => ({ ...prev, documentFields }));
    },
    []
  );

  // Actualizar configuración de campos de productos
  const updateProductFields = useCallback(
    (
      productFields:
        | VoucherDesignA4Config['productFields']
        | VoucherDesignTicketConfig['productFields'],
    ) => {
      setConfig((prev) => ({ ...prev, productFields }));
    },
    []
  );

  const updateTicketPaperWidth = useCallback((paperWidth: 58 | 80) => {
    setConfig((prev) => ({ ...prev, ticketPaperWidth: paperWidth }));
  }, []);

  // Restaurar valores por defecto
  const resetToDefault = useCallback(() => {
    const defaultConfig = getDefaultConfig(designType);
    setConfig(defaultConfig);
  }, [designType]);

  // Exportar configuración
  const exportConfig = useCallback(async () => {
    try {
      const blob = await storage.exportToBlob(designType);
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `voucher-design-${designType.toLowerCase()}-${Date.now()}.json`;
      link.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[useVoucherDesignConfig] Export error:', err);
      throw new Error('Error al exportar la configuración');
    }
  }, [designType, storage]);

  // Importar configuración
  const importConfig = useCallback(
    async (file: File) => {
      try {
        const imported = await storage.importFromFile(file);

        if (imported.type !== designType) {
          throw new Error(
            `El archivo es para diseño ${imported.type}, pero estás en ${designType}`
          );
        }

        const extracted =
          designType === 'A4' ? imported.a4Config : imported.ticketConfig;

        if (extracted) {
          // Watermark ahora está disponible tanto en A4 como en TICKET
          const watermark = 'watermark' in extracted
            ? extracted.watermark
            : CONFIGURACION_MARCA_AGUA_PREDETERMINADA;

          const ticketPaperWidth =
            designType === 'TICKET'
              ? ((extracted as VoucherDesignTicketConfig).general?.paperWidth === 58 ? 58 : 80)
              : undefined;

          // Guardado seguro: persistir el config completo importado para no perder campos avanzados
          await storage.save(designType, imported);

          setConfig({
            logo: extracted.logo,
            watermark,
            footer: extracted.footer,
            documentFields: extracted.documentFields,
            productFields: extracted.productFields,
            ticketPaperWidth,
          });
        }
      } catch (err) {
        console.error('[useVoucherDesignConfig] Import error:', err);
        throw err;
      }
    },
    [designType, storage]
  );

  return {
    config,
    isLoading,
    error,
    updateLogo,
    updateWatermark,
    updateFooter,
    updateDocumentFields,
    updateProductFields,
    updateTicketPaperWidth,
    resetToDefault,
    exportConfig,
    importConfig,
  };
};

/**
 * Hook para obtener la configuración de diseño (solo lectura)
 * Útil para componentes que solo necesitan leer la configuración
 */
export const useVoucherDesignConfigReader = (designType: DesignType) => {
  const storage = useMemo(() => FabricaAlmacenamientoDisenoComprobante.create(), []);

  const [config, setConfig] = useState<VoucherDesignConfigurationExtended>(() => {
    return getDefaultConfig(designType);
  });

  // Cargar configuración inicial
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const loaded = await storage.load(designType);

        if (loaded) {
          const extracted =
            designType === 'A4' ? loaded.a4Config : loaded.ticketConfig;

          if (extracted) {
            // Watermark ahora está disponible tanto en A4 como en TICKET
            const watermark = 'watermark' in extracted
              ? extracted.watermark
              : CONFIGURACION_MARCA_AGUA_PREDETERMINADA;

            const ticketPaperWidth =
              designType === 'TICKET'
                ? ((extracted as VoucherDesignTicketConfig).general?.paperWidth === 58 ? 58 : 80)
                : undefined;

            setConfig({
              logo: extracted.logo,
              watermark,
              footer: extracted.footer,
              documentFields: extracted.documentFields,
              productFields: extracted.productFields,
              ticketPaperWidth,
            });
          }
        }
      } catch (err) {
        console.error('[useVoucherDesignConfigReader] Load error:', err);
      }
    };

    loadConfig();
  }, [designType, storage]);

  // Escuchar cambios en la configuración
  useEffect(() => {
    const handleConfigChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.designType === designType && customEvent.detail?.config) {
        const loaded = customEvent.detail.config;
        const extracted =
          designType === 'A4' ? loaded.a4Config : loaded.ticketConfig;

        if (extracted) {
          setConfig({
            logo: extracted.logo,
            watermark: extracted.watermark || CONFIGURACION_MARCA_AGUA_PREDETERMINADA,
            footer: extracted.footer,
            documentFields: extracted.documentFields,
            productFields: extracted.productFields,
            ticketPaperWidth:
              designType === 'TICKET'
                ? ((extracted as VoucherDesignTicketConfig).general?.paperWidth === 58 ? 58 : 80)
                : undefined,
          });
        }
      }
    };

    window.addEventListener('voucherDesignConfigChanged', handleConfigChange);

    return () => {
      window.removeEventListener('voucherDesignConfigChanged', handleConfigChange);
    };
  }, [designType]);

  return config;
};

// ===================================================================
// UTILIDADES
// ===================================================================

function getDefaultConfig(designType: DesignType): VoucherDesignConfigurationExtended {
  return {
    logo: CONFIGURACION_LOGO_PREDETERMINADA,
    watermark: CONFIGURACION_MARCA_AGUA_PREDETERMINADA,
    footer: CONFIGURACION_PIE_PAGINA_PREDETERMINADA,
    documentFields:
      designType === 'A4'
        ? CAMPOS_DOCUMENTO_A4_PREDETERMINADOS
        : CAMPOS_DOCUMENTO_TICKET_PREDETERMINADOS,
    productFields:
      designType === 'A4'
        ? CAMPOS_PRODUCTO_A4_PREDETERMINADOS
        : CAMPOS_PRODUCTO_TICKET_PREDETERMINADOS,
    ticketPaperWidth: designType === 'TICKET' ? 80 : undefined,
  };
}
