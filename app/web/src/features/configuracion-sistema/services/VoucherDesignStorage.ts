// ===================================================================
// CAPA DE ABSTRACCIÓN DE STORAGE (v2)
// Persistencia de configuraciones de diseño usando solo el formato unificado
// ===================================================================

import type { VoucherDesignConfig, DesignType } from '../models/VoucherDesignUnified';
import { DEFAULT_A4_DESIGN, DEFAULT_TICKET_DESIGN } from '../models/VoucherDesignUnified';

export class StorageError extends Error {
  originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = 'StorageError';
    this.originalError = originalError;
  }
}

export interface IVoucherDesignStorage {
  load(type: DesignType): Promise<VoucherDesignConfig>;
  save(type: DesignType, config: VoucherDesignConfig): Promise<void>;
  clear(type: DesignType): Promise<void>;
  exportToBlob(type: DesignType): Promise<Blob>;
  importFromFile(file: File): Promise<VoucherDesignConfig>;
}

const STORAGE_KEY = (type: DesignType): string => `voucher_design_v2_${type}`;

export class LocalStorageVoucherDesignStorage implements IVoucherDesignStorage {
  async load(type: DesignType): Promise<VoucherDesignConfig> {
    const key = STORAGE_KEY(type);

    try {
      const data = localStorage.getItem(key);

      if (!data) {
        return this.getDefaultConfig(type);
      }

      const parsed = JSON.parse(data) as VoucherDesignConfig;

      if (parsed.createdAt) parsed.createdAt = new Date(parsed.createdAt);
      if (parsed.updatedAt) parsed.updatedAt = new Date(parsed.updatedAt);

      return parsed;
    } catch (error) {
      console.error('[VoucherDesignStorage] Error loading config, using defaults:', error);
      return this.getDefaultConfig(type);
    }
  }

  async save(type: DesignType, config: VoucherDesignConfig): Promise<void> {
    try {
      const key = STORAGE_KEY(type);
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
      const key = STORAGE_KEY(type);
      localStorage.removeItem(key);

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

  private getDefaultConfig(type: DesignType): VoucherDesignConfig {
    return type === 'A4' ? DEFAULT_A4_DESIGN : DEFAULT_TICKET_DESIGN;
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
