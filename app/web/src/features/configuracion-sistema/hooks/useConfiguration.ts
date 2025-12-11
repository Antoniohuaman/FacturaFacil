import { useState, useEffect, useCallback } from 'react';
import { useConfigurationContext } from '../context/ConfigurationContext';
import { formatBusinessDateTimeIso } from '@/shared/time/businessTime';
import type { Configuration, ConfigurationModule } from '../models/Configuration';
import { CONFIGURATION_MODULES } from '../models/Configuration';

interface UseConfigurationReturn {
  configuration: Configuration | null;
  modules: ConfigurationModule[];
  loading: boolean;
  error: string | null;
  progress: number;
  
  // Actions
  loadConfiguration: () => Promise<void>;
  updateConfiguration: (updates: Partial<Configuration>) => Promise<void>;
  resetConfiguration: () => Promise<void>;
  exportConfiguration: () => Promise<string>;
  importConfiguration: (configData: string) => Promise<void>;
  
  // Module management
  getModuleProgress: (moduleId: string) => number;
  isModuleConfigured: (moduleId: string) => boolean;
  getCompletedModules: () => ConfigurationModule[];
  getPendingModules: () => ConfigurationModule[];
}

// Mock configuration data
const MOCK_CONFIGURATION: Configuration = {
  id: 'config-1',
  companyId: 'company-1',
  
  general: {
    timezone: 'America/Lima',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    language: 'es',
  },
  
  sales: {
    allowNegativeStock: false,
    autoCalculateTax: true,
    defaultTaxId: 'tax-igv',
    requireCustomerSelection: true,
    allowPartialPayments: true,
    autoGenerateCorrelativeNumber: true,
    showProductImages: true,
    enableDiscounts: true,
    maxDiscountPercentage: 20,
    requireDiscountReason: true,
    enablePromotions: false,
    printReceiptAfterSale: true,
    openCashDrawerAfterPrint: true,
  },
  
  billing: {
    defaultEstablishmentId: 'est-1',
    defaultSeriesId: 'series-1',
    autoSendToSunat: true,
    autoGeneratePdf: true,
    emailCopyToCompany: false,
    includeQrCode: true,
    includeDetraccionInfo: false,
    voucherDesign: 'A4',
    showProductCodes: true,
    showUnitPrices: true,
    showTotalTaxes: true,
  },
  
  inventory: {
    trackStock: true,
    allowNegativeStock: false,
    autoUpdateCosts: true,
    costMethod: 'AVERAGE',
    enableBarcodes: false,
    enableSerialNumbers: false,
    enableBatches: false,
    enableExpirationDates: false,
    lowStockThreshold: 10,
    enableStockAlerts: true,
    enableStockReservation: false,
  },
  
  employees: {
    enableTimeTracking: false,
    enableCommissions: true,
    enableMultipleRoles: true,
    requirePinForActions: true,
    enablePermissionsByModule: true,
    sessionTimeoutMinutes: 60,
    maxConcurrentSessions: 1,
  },
  
  reports: {
    defaultPeriod: 'MONTHLY',
    autoGenerateReports: false,
    emailReportsSchedule: null,
    includeGraphics: true,
    exportFormat: 'PDF',
    retentionDays: 365,
  },
  
  notifications: {
    email: {
      enabled: false,
      smtp: {
        server: '',
        port: 587,
        username: '',
        password: '',
        useTLS: true,
      },
    },
    sms: {
      enabled: false,
      provider: '',
      apiKey: '',
    },
    push: {
      enabled: true,
    },
  },
  
  integrations: {
    sunat: {
      enabled: false,
      environment: 'TESTING',
      username: '',
      password: '',
    },
    accounting: {
      enabled: false,
      system: '',
      syncFrequency: 'DAILY',
    },
    ecommerce: {
      enabled: false,
      platforms: [],
      syncInventory: false,
      syncPrices: false,
    },
  },
  
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true,
};

export function useConfiguration(): UseConfigurationReturn {
  const { state } = useConfigurationContext();
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [modules, setModules] = useState<ConfigurationModule[]>(CONFIGURATION_MODULES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate overall progress
  const progress = modules.reduce((acc, module) => acc + module.progress, 0) / modules.length;

  // Load configuration data
  const loadConfiguration = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const nextConfiguration = MOCK_CONFIGURATION;
      setConfiguration(nextConfiguration);
      
      // Update modules based on configuration
      setModules(prevModules => prevModules.map(module => {
        let isConfigured = false;
        let progress = 0;
        
        switch (module.id) {
          case 'company':
            // Check if company is configured
            isConfigured = state.company !== null;
            progress = isConfigured ? 100 : 0;
            break;
            
          case 'establishments':
            isConfigured = state.establishments.length > 0;
            progress = isConfigured ? 100 : 0;
            break;
            
          case 'business':
            isConfigured = state.paymentMethods.length > 0 && state.currencies.length > 0;
            progress = isConfigured ? 100 : 50;
            break;
            
          case 'series':
            isConfigured = state.series.length > 0;
            progress = isConfigured ? 100 : 0;
            break;
            
          case 'employees':
            isConfigured = state.employees.length > 0;
            progress = isConfigured ? 100 : 0;
            break;
            
          case 'voucher-design':
            isConfigured = nextConfiguration.billing.voucherDesign !== undefined;
            progress = isConfigured ? 100 : 0;
            break;
            
          default:
            progress = 0;
        }
        
        return {
          ...module,
          isConfigured,
          progress,
          status: isConfigured ? 'CONFIGURED' as const : 'PENDING' as const,
          lastUpdated: isConfigured ? new Date() : undefined,
        };
      }));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading configuration');
    } finally {
      setLoading(false);
    }
  }, [state]);

  // Update configuration
  const updateConfiguration = useCallback(async (updates: Partial<Configuration>) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (configuration) {
        const updatedConfiguration = {
          ...configuration,
          ...updates,
          updatedAt: new Date(),
        };
        
        setConfiguration(updatedConfiguration);
        
        // Show success message
        console.log('Configuration updated successfully');
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating configuration');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [configuration]);

  // Reset configuration to defaults
  const resetConfiguration = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setConfiguration(MOCK_CONFIGURATION);
      
      // Reset all modules
      const resetModules = CONFIGURATION_MODULES.map(module => ({
        ...module,
        isConfigured: false,
        progress: 0,
        status: 'PENDING' as const,
        lastUpdated: undefined,
      }));
      
      setModules(resetModules);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error resetting configuration');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Export configuration as JSON
  const exportConfiguration = useCallback(async (): Promise<string> => {
    if (!configuration) {
      throw new Error('No configuration to export');
    }
    
    const exportData = {
      configuration,
      modules,
      exportedAt: formatBusinessDateTimeIso(),
      version: '1.0.0',
    };
    
    return JSON.stringify(exportData, null, 2);
  }, [configuration, modules]);

  // Import configuration from JSON
  const importConfiguration = useCallback(async (configData: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const parsedData = JSON.parse(configData);
      
      if (!parsedData.configuration) {
        throw new Error('Invalid configuration format');
      }
      
      // Validate configuration structure
      const importedConfig = parsedData.configuration as Configuration;
      
      // Simulate API call to save imported configuration
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setConfiguration(importedConfig);
      
      if (parsedData.modules) {
        setModules(parsedData.modules);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error importing configuration');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get progress for specific module
  const getModuleProgress = useCallback((moduleId: string): number => {
    const module = modules.find(m => m.id === moduleId);
    return module ? module.progress : 0;
  }, [modules]);

  // Check if module is configured
  const isModuleConfigured = useCallback((moduleId: string): boolean => {
    const module = modules.find(m => m.id === moduleId);
    return module ? module.isConfigured : false;
  }, [modules]);

  // Get completed modules
  const getCompletedModules = useCallback((): ConfigurationModule[] => {
    return modules.filter(module => module.isConfigured);
  }, [modules]);

  // Get pending modules
  const getPendingModules = useCallback((): ConfigurationModule[] => {
    return modules.filter(module => !module.isConfigured);
  }, [modules]);

  // Load configuration on mount
  useEffect(() => {
    loadConfiguration();
  }, [loadConfiguration]);

  return {
    configuration,
    modules,
    loading,
    error,
    progress,
    
    // Actions
    loadConfiguration,
    updateConfiguration,
    resetConfiguration,
    exportConfiguration,
    importConfiguration,
    
    // Module management
    getModuleProgress,
    isModuleConfigured,
    getCompletedModules,
    getPendingModules,
  };
}