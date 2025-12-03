// ===================================================================
// CAPA DE ABSTRACCIÓN DE STORAGE
// Abstrae la persistencia de configuraciones de diseño
// ===================================================================

import type { VoucherDesignConfig, DesignType } from '../models/VoucherDesignUnified';
import { configMigrator } from '../utils/configMigrator';

export class StorageError extends Error {
  originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = 'StorageError';
    this.originalError = originalError;
  }
}

export interface IVoucherDesignStorage {
  load(type: DesignType): Promise<VoucherDesignConfig | null>;
  save(type: DesignType, config: VoucherDesignConfig): Promise<void>;
  clear(type: DesignType): Promise<void>;
  exportToBlob(type: DesignType): Promise<Blob>;
  importFromFile(file: File): Promise<VoucherDesignConfig>;
}

export class LocalStorageVoucherDesignStorage implements IVoucherDesignStorage {
  private readonly KEY_PREFIX = 'voucher_design_v2_';
  private readonly LEGACY_KEY_PREFIX = 'voucher_design_extended_';

  private getKey(type: DesignType): string {
    return `${this.KEY_PREFIX}${type.toLowerCase()}`;
  }

  private getLegacyKey(type: DesignType): string {
    return `${this.LEGACY_KEY_PREFIX}${type.toLowerCase()}`;
  }

  async load(type: DesignType): Promise<VoucherDesignConfig | null> {
    try {
      const key = this.getKey(type);
      const data = localStorage.getItem(key);

      // Si no existe en formato nuevo, intentar cargar del formato antiguo
      if (!data) {
        const legacyKey = this.getLegacyKey(type);
        const legacyData = localStorage.getItem(legacyKey);

        if (legacyData) {
          const parsed = JSON.parse(legacyData);
          const migrated = configMigrator.autoMigrate(parsed);

          if (migrated) {
            // Guardar en nuevo formato
            await this.save(type, migrated);
            return migrated;
          }
        }

        return null;
      }

      const parsed = JSON.parse(data);

      // Revivir fechas
      if (parsed.createdAt) parsed.createdAt = new Date(parsed.createdAt);
      if (parsed.updatedAt) parsed.updatedAt = new Date(parsed.updatedAt);

      return parsed as VoucherDesignConfig;
    } catch (error) {
      console.error('[VoucherDesignStorage] Error loading config:', error);
      throw new StorageError('Failed to load design configuration', error);
    }
  }

  async save(type: DesignType, config: VoucherDesignConfig): Promise<void> {
    try {
      const key = this.getKey(type);
      const toSave = {
        ...config,
        updatedAt: new Date(),
      };

      localStorage.setItem(key, JSON.stringify(toSave));

      // Disparar evento personalizado para sincronización
      this.dispatchChangeEvent(type, toSave);
    } catch (error) {
      console.error('[VoucherDesignStorage] Error saving config:', error);
      throw new StorageError('Failed to save design configuration', error);
    }
  }

  async clear(type: DesignType): Promise<void> {
    try {
      const key = this.getKey(type);
      localStorage.removeItem(key);

      // También limpiar versión legacy si existe
      const legacyKey = this.getLegacyKey(type);
      localStorage.removeItem(legacyKey);

      this.dispatchChangeEvent(type, null);
    } catch (error) {
      console.error('[VoucherDesignStorage] Error clearing config:', error);
      throw new StorageError('Failed to clear design configuration', error);
    }
  }

  async exportToBlob(type: DesignType): Promise<Blob> {
    try {
      const config = await this.load(type);
      if (!config) {
        throw new Error('No configuration found to export');
      }

      const exportData = {
        version: '2.0',
        designType: type,
        exportDate: new Date().toISOString(),
        config,
      };

      const json = JSON.stringify(exportData, null, 2);
      return new Blob([json], { type: 'application/json' });
    } catch (error) {
      console.error('[VoucherDesignStorage] Error exporting config:', error);
      throw new StorageError('Failed to export design configuration', error);
    }
  }

  async importFromFile(file: File): Promise<VoucherDesignConfig> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result;
          if (typeof content !== 'string') {
            throw new Error('Invalid file content');
          }

          const parsed = JSON.parse(content);

          // Validar estructura básica
          if (!parsed.config || !parsed.designType) {
            throw new Error('Invalid import file structure');
          }

          // Revivir fechas
          if (parsed.config.createdAt) {
            parsed.config.createdAt = new Date(parsed.config.createdAt);
          }
          if (parsed.config.updatedAt) {
            parsed.config.updatedAt = new Date(parsed.config.updatedAt);
          }

          resolve(parsed.config as VoucherDesignConfig);
        } catch (error) {
          reject(new StorageError('Failed to parse import file', error));
        }
      };

      reader.onerror = () => {
        reject(new StorageError('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }

  private dispatchChangeEvent(type: DesignType, config: VoucherDesignConfig | null): void {
    window.dispatchEvent(
      new CustomEvent('voucherDesignConfigChanged', {
        detail: { designType: type, config },
      })
    );
  }
}

// Factory para facilitar testing y cambio de implementación
export class VoucherDesignStorageFactory {
  private static instance: IVoucherDesignStorage | null = null;

  static create(): IVoucherDesignStorage {
    if (!this.instance) {
      this.instance = new LocalStorageVoucherDesignStorage();
    }
    return this.instance;
  }

  static reset(): void {
    this.instance = null;
  }
}
