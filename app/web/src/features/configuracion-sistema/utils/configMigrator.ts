// ===================================================================
// MIGRADOR DE CONFIGURACIONES
// Migra configuraciones antiguas al nuevo formato unificado
// ===================================================================

import type { VoucherDesign } from '../models/VoucherDesign';
import type {
  VoucherDesignConfig,
  VoucherDesignA4Config,
  VoucherDesignTicketConfig,
  LogoConfiguration,
  WatermarkConfiguration,
  FooterConfiguration,
} from '../models/VoucherDesignUnified';
import {
  DEFAULT_LOGO_CONFIG,
  DEFAULT_WATERMARK_CONFIG,
  DEFAULT_FOOTER_CONFIG,
  DEFAULT_DOCUMENT_FIELDS,
  DEFAULT_PRODUCT_FIELDS_A4,
  DEFAULT_PRODUCT_FIELDS_TICKET,
} from '../models/VoucherDesignUnified';

export class VoucherDesignMigrator {
  /**
   * Migra un diseño antiguo al nuevo formato unificado
   */
  migrateOldToNew(oldDesign: VoucherDesign): VoucherDesignConfig {
    const baseConfig: VoucherDesignConfig = {
      id: oldDesign.id,
      name: oldDesign.name,
      type: oldDesign.type,
      version: '2.0',
      isDefault: oldDesign.isDefault,
      isActive: oldDesign.isActive,
      createdAt: oldDesign.createdAt,
      updatedAt: new Date(),
    };

    if (oldDesign.type === 'A4') {
      baseConfig.a4Config = this.migrateA4Settings(oldDesign);
    } else {
      baseConfig.ticketConfig = this.migrateTicketSettings(oldDesign);
    }

    return baseConfig;
  }

  private migrateA4Settings(oldDesign: VoucherDesign): VoucherDesignA4Config {
    const settings = oldDesign.settings;

    const logo: LogoConfiguration = {
      ...DEFAULT_LOGO_CONFIG,
      enabled: settings.showLogo,
    };

    const watermark: WatermarkConfiguration = {
      ...DEFAULT_WATERMARK_CONFIG,
      enabled: settings.showWatermark,
      text: settings.watermarkText || DEFAULT_WATERMARK_CONFIG.text,
      opacity: settings.watermarkOpacity,
    };

    const footer: FooterConfiguration = {
      ...DEFAULT_FOOTER_CONFIG,
      enabled: settings.showFooter,
      showCustomText: settings.showFooter,
      customText: settings.footerText || DEFAULT_FOOTER_CONFIG.customText,
    };

    return {
      logo,
      watermark,
      footer,
      documentFields: DEFAULT_DOCUMENT_FIELDS,
      productFields: DEFAULT_PRODUCT_FIELDS_A4,
    };
  }

  private migrateTicketSettings(oldDesign: VoucherDesign): VoucherDesignTicketConfig {
    const settings = oldDesign.settings;

    return {
      logo: {
        enabled: settings.showLogo,
        width: 60,
        height: 60,
        position: 'center',
      },
      footer: {
        enabled: settings.showFooter,
        showCustomText: settings.showFooter,
        customText: settings.footerText || 'Gracias por su compra',
        textAlignment: 'center',
        fontSize: 'small',
        fontWeight: 'normal',
        padding: 5,
      },
      documentFields: DEFAULT_DOCUMENT_FIELDS,
      productFields: DEFAULT_PRODUCT_FIELDS_TICKET,
      general: {
        paperWidth: 80,
        lineSpacing: 1.2,
        characterWidth: 42,
        margins: { left: 2, right: 2, top: 5, bottom: 10 },
      },
      typography: {
        fontSize: { header: 'medium', body: 'small', footer: 'small' },
        fontWeight: { header: 'bold', totals: 'bold' },
      },
      qrCode: { enabled: true, size: 'medium' },
      separators: { useSeparators: true, character: '=' },
    };
  }

  /**
   * Detecta si una configuración necesita migración
   */
  needsMigration(config: unknown): boolean {
    if (!config || typeof config !== 'object') return false;

    const maybeOld = config as Partial<VoucherDesign>;
    const maybeNew = config as Partial<VoucherDesignConfig>;

    // Si tiene 'settings' es formato antiguo
    if ('settings' in maybeOld && maybeOld.settings) return true;

    // Si tiene 'version' 2.0 es formato nuevo
    if ('version' in maybeNew && maybeNew.version === '2.0') return false;

    // Por defecto, asumir que necesita migración si no tiene version
    return !('version' in maybeNew);
  }

  /**
   * Intenta migrar automáticamente cualquier configuración
   */
  autoMigrate(config: unknown): VoucherDesignConfig | null {
    if (!this.needsMigration(config)) {
      return config as VoucherDesignConfig;
    }

    try {
      return this.migrateOldToNew(config as VoucherDesign);
    } catch (error) {
      console.error('[ConfigMigrator] Error during auto-migration:', error);
      return null;
    }
  }

  /**
   * Migra el localStorage completo
   */
  migrateLocalStorage(): void {
    const keysToMigrate = [
      'voucher_design_extended_a4',
      'voucher_design_extended_ticket',
    ];

    keysToMigrate.forEach((key) => {
      try {
        const stored = localStorage.getItem(key);
        if (!stored) return;

        const parsed = JSON.parse(stored);

        if (this.needsMigration(parsed)) {
          const migrated = this.autoMigrate(parsed);
          if (migrated) {
            // Guardar en nueva clave
            const newKey = key.replace('_extended_', '_v2_');
            localStorage.setItem(newKey, JSON.stringify(migrated));
            console.log(`[ConfigMigrator] Migrated ${key} to ${newKey}`);
          }
        }
      } catch (error) {
        console.error(`[ConfigMigrator] Error migrating ${key}:`, error);
      }
    });
  }
}

// Instancia singleton
export const configMigrator = new VoucherDesignMigrator();
