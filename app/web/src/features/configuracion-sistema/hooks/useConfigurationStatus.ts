/* eslint-disable no-case-declarations -- switch con declaraciones; refactor diferido */
import { useState, useEffect, useCallback } from 'react';
import { useConfigurationContext } from '../context/ConfigurationContext';
import type { ConfigurationStep } from '../models/Configuration';

interface ConfigurationStatus {
  overallProgress: number;
  isComplete: boolean;
  completedModules: number;
  totalModules: number;
  criticalIssues: string[];
  warnings: string[];
  recommendations: string[];
}

interface ModuleStatus {
  id: string;
  name: string;
  isConfigured: boolean;
  progress: number;
  status: 'PENDING' | 'CONFIGURED' | 'ERROR' | 'WARNING';
  requiredSteps: ConfigurationStep[];
  completedSteps: ConfigurationStep[];
  pendingSteps: ConfigurationStep[];
  criticalIssues: string[];
  warnings: string[];
  lastUpdated?: Date;
}

interface UseConfigurationStatusReturn {
  status: ConfigurationStatus;
  modules: ModuleStatus[];
  loading: boolean;
  error: string | null;
  
  // Actions
  refreshStatus: () => Promise<void>;
  checkModuleStatus: (moduleId: string) => Promise<ModuleStatus>;
  validateModule: (moduleId: string) => Promise<{ isValid: boolean; issues: string[] }>;
  
  // Getters
  getModuleStatus: (moduleId: string) => ModuleStatus | undefined;
  getCriticalModules: () => ModuleStatus[];
  getCompletedModules: () => ModuleStatus[];
  getPendingModules: () => ModuleStatus[];
  getNextRequiredModule: () => ModuleStatus | undefined;
  
  // Utilities
  canCompleteConfiguration: () => boolean;
  getCompletionRoadmap: () => {
    module: string;
    steps: string[];
    estimatedTime: number;
  }[];
}

// Mock configuration steps
const CONFIGURATION_STEPS: Record<string, ConfigurationStep[]> = {
  company: [
    {
      id: 'company-basic',
      moduleId: 'company',
      title: 'Información Básica',
      description: 'Configurar RUC, razón social y datos principales',
      isCompleted: false,
      isRequired: true,
      order: 1,
      validationRules: ['ruc_valid', 'business_name_required'],
    },
    {
      id: 'company-address',
      moduleId: 'company',
      title: 'Dirección Fiscal',
      description: 'Configurar dirección fiscal y ubicación',
      isCompleted: false,
      isRequired: true,
      order: 2,
      validationRules: ['address_required', 'district_required'],
    },
    {
      id: 'company-representative',
      moduleId: 'company',
      title: 'Representante Legal',
      description: 'Datos del representante legal',
      isCompleted: false,
      isRequired: true,
      order: 3,
      validationRules: ['representative_name_required', 'representative_document_valid'],
    },
    {
      id: 'company-sunat',
      moduleId: 'company',
      title: 'Configuración SUNAT',
      description: 'Integración con SUNAT para facturación electrónica',
      isCompleted: false,
      isRequired: false,
      order: 4,
    },
  ],
  establishments: [
    {
      id: 'establishments-main',
      moduleId: 'establishments',
      title: 'Establecimiento Principal',
      description: 'Configurar el establecimiento principal',
      isCompleted: false,
      isRequired: true,
      order: 1,
      validationRules: ['main_establishment_required'],
    },
    {
      id: 'establishments-branches',
      moduleId: 'establishments',
      title: 'Sucursales',
      description: 'Configurar sucursales adicionales si las hay',
      isCompleted: false,
      isRequired: false,
      order: 2,
    },
    {
      id: 'establishments-pos',
      moduleId: 'establishments',
      title: 'Punto de Venta',
      description: 'Configurar equipos de punto de venta',
      isCompleted: false,
      isRequired: false,
      order: 3,
    },
  ],
  business: [
    {
      id: 'business-currencies',
      moduleId: 'business',
      title: 'Monedas',
      description: 'Configurar monedas y tipos de cambio',
      isCompleted: false,
      isRequired: true,
      order: 1,
      validationRules: ['base_currency_required'],
    },
    {
      id: 'business-taxes',
      moduleId: 'business',
      title: 'Impuestos',
      description: 'Configurar tipos de impuestos (IGV, etc.)',
      isCompleted: false,
      isRequired: true,
      order: 2,
      validationRules: ['default_tax_required'],
    },
    {
      id: 'business-payment-methods',
      moduleId: 'business',
      title: 'Métodos de Pago',
      description: 'Configurar métodos de pago aceptados',
      isCompleted: false,
      isRequired: true,
      order: 3,
      validationRules: ['payment_method_required'],
    },
    {
      id: 'business-units',
      moduleId: 'business',
      title: 'Unidades de Medida',
      description: 'Configurar unidades de medida para productos',
      isCompleted: false,
      isRequired: true,
      order: 4,
      validationRules: ['default_unit_required'],
    },
  ],
  series: [
    {
      id: 'series-invoice',
      moduleId: 'series',
      title: 'Series de Facturas',
      description: 'Configurar numeración para facturas',
      isCompleted: false,
      isRequired: true,
      order: 1,
      validationRules: ['invoice_series_required'],
    },
    {
      id: 'series-receipt',
      moduleId: 'series',
      title: 'Series de Boletas',
      description: 'Configurar numeración para boletas',
      isCompleted: false,
      isRequired: true,
      order: 2,
      validationRules: ['receipt_series_required'],
    },
    {
      id: 'series-credit-note',
      moduleId: 'series',
      title: 'Series de Notas de Crédito',
      description: 'Configurar numeración para notas de crédito',
      isCompleted: false,
      isRequired: false,
      order: 3,
    },
  ],
  users: [
    {
      id: 'users-admin',
      moduleId: 'users',
      title: 'Usuario Administrador',
      description: 'Configurar usuario administrador principal',
      isCompleted: false,
      isRequired: true,
      order: 1,
      validationRules: ['admin_user_required'],
    },
    {
      id: 'users-roles',
      moduleId: 'users',
      title: 'Roles y Permisos',
      description: 'Configurar roles de usuario',
      isCompleted: false,
      isRequired: true,
      order: 2,
    },
    {
      id: 'users-staff',
      moduleId: 'users',
      title: 'Personal de Ventas',
      description: 'Agregar usuarios del área de ventas',
      isCompleted: false,
      isRequired: false,
      order: 3,
    },
  ],
  'voucher-design': [
    {
      id: 'voucher-a4',
      moduleId: 'voucher-design',
      title: 'Diseño A4',
      description: 'Configurar diseño de comprobantes A4',
      isCompleted: false,
      isRequired: false,
      order: 1,
    },
    {
      id: 'voucher-ticket',
      moduleId: 'voucher-design',
      title: 'Diseño Ticket',
      description: 'Configurar diseño de tickets',
      isCompleted: false,
      isRequired: false,
      order: 2,
    },
  ],
};

export function useConfigurationStatus(): UseConfigurationStatusReturn {
  const { state } = useConfigurationContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modules, setModules] = useState<ModuleStatus[]>([]);

  // Calculate module status based on context state
  const calculateModuleStatus = useCallback((moduleId: string): ModuleStatus => {
    const steps = CONFIGURATION_STEPS[moduleId] || [];
    let completedSteps: ConfigurationStep[] = [];
    let progress = 0;
    let isConfigured = false;
    let status: ModuleStatus['status'] = 'PENDING';
    const criticalIssues: string[] = [];
    const warnings: string[] = [];

    switch (moduleId) {
      case 'company':
        if (state.company) {
          completedSteps = steps.filter(step => {
            switch (step.id) {
              case 'company-basic':
                return state.company?.ruc && state.company?.businessName;
              case 'company-address':
                return state.company?.address && state.company?.district;
              case 'company-representative':
                return state.company?.legalRepresentative?.name;
              case 'company-sunat':
                return state.company?.sunatConfiguration?.isConfigured;
              default:
                return false;
            }
          });
          
          progress = (completedSteps.length / steps.length) * 100;
          isConfigured = completedSteps.length >= 3; // First 3 required steps
          status = isConfigured ? 'CONFIGURED' : 'PENDING';
          
          if (!state.company.sunatConfiguration?.isConfigured) {
            warnings.push('Configuración de SUNAT pendiente para facturación electrónica');
          }
        }
        break;
        
      case 'establishments':
        if (state.establishments.length > 0) {
          const mainEstablishment = state.establishments.find(est => est.isMainEstablishment);
          
          completedSteps = steps.filter(step => {
            switch (step.id) {
              case 'establishments-main':
                return mainEstablishment !== undefined;
              case 'establishments-branches':
                return state.establishments.length > 1;
              case 'establishments-pos':
                return state.establishments.some(est => est.posConfiguration?.hasPos);
              default:
                return false;
            }
          });
          
          progress = (completedSteps.length / steps.length) * 100;
          isConfigured = mainEstablishment !== undefined;
          status = isConfigured ? 'CONFIGURED' : 'PENDING';
          
          if (!state.establishments.some(est => est.posConfiguration?.hasPos)) {
            warnings.push('No se ha configurado ningún punto de venta');
          }
        }
        break;
        
      case 'business':
        completedSteps = steps.filter(step => {
          switch (step.id) {
            case 'business-currencies':
              return state.currencies.length > 0 && state.currencies.some(cur => cur.isBaseCurrency);
            case 'business-taxes':
              return state.taxes.length > 0 && state.taxes.some(tax => tax.isDefault);
            case 'business-payment-methods':
              return state.paymentMethods.length > 0;
            case 'business-units':
              return state.units.length > 0;
            default:
              return false;
          }
        });
        
        progress = (completedSteps.length / steps.length) * 100;
        isConfigured = completedSteps.length === steps.length;
        status = isConfigured ? 'CONFIGURED' : 'PENDING';
        
        if (state.currencies.length === 0) {
          criticalIssues.push('No se han configurado monedas');
        }
        if (state.taxes.length === 0) {
          criticalIssues.push('No se han configurado impuestos');
        }
        break;
        
      case 'series':
        completedSteps = steps.filter(step => {
          switch (step.id) {
            case 'series-invoice':
              return state.series.some(s => s.documentType.code === '01');
            case 'series-receipt':
              return state.series.some(s => s.documentType.code === '03');
            case 'series-credit-note':
              return state.series.some(s => s.documentType.code === '07');
            default:
              return false;
          }
        });
        
        progress = (completedSteps.length / steps.length) * 100;
        isConfigured = completedSteps.length >= 2; // Invoice and receipt required
        status = isConfigured ? 'CONFIGURED' : 'PENDING';
        
        if (!state.series.some(s => s.documentType.code === '01')) {
          criticalIssues.push('No se ha configurado serie para facturas');
        }
        if (!state.series.some(s => s.documentType.code === '03')) {
          criticalIssues.push('No se ha configurado serie para boletas');
        }
        break;
        
      case 'users':
        const adminUsers = state.users.filter(user => 
          user.systemAccess.roles.some(role => role.level === 'ADMIN')
        );
        
        completedSteps = steps.filter(step => {
          switch (step.id) {
            case 'users-admin':
              return adminUsers.length > 0;
            case 'users-roles':
              return state.users.some(user => user.systemAccess.roles.length > 0);
            case 'users-staff':
              return state.users.length > 1;
            default:
              return false;
          }
        });
        
        progress = (completedSteps.length / steps.length) * 100;
        isConfigured = adminUsers.length > 0;
        status = isConfigured ? 'CONFIGURED' : 'PENDING';
        
        if (adminUsers.length === 0) {
          criticalIssues.push('No se ha configurado usuario administrador');
        }
        break;
        
      case 'voucher-design':
        // This would depend on voucher design configuration
        progress = 50; // Mock progress
        isConfigured = false;
        status = 'PENDING';
        warnings.push('Diseño de comprobantes no configurado');
        break;
        
      default:
        progress = 0;
        isConfigured = false;
        status = 'PENDING';
    }

    const pendingSteps = steps.filter(step => 
      !completedSteps.some(completed => completed.id === step.id)
    );

    return {
      id: moduleId,
      name: getModuleName(moduleId),
      isConfigured,
      progress,
      status,
      requiredSteps: steps,
      completedSteps,
      pendingSteps,
      criticalIssues,
      warnings,
      lastUpdated: isConfigured ? new Date() : undefined,
    };
  }, [state]);

  // Get module name
  const getModuleName = (moduleId: string): string => {
    const moduleNames: Record<string, string> = {
      company: 'Información de la Empresa',
      establishments: 'Establecimientos',
      business: 'Configuración Comercial',
      series: 'Series de Comprobantes',
      users: 'Usuarios y Roles',
      'voucher-design': 'Diseño de Comprobantes',
    };
    return moduleNames[moduleId] || moduleId;
  };

  // Calculate overall status
  const calculateOverallStatus = useCallback((): ConfigurationStatus => {
    const totalModules = modules.length;
    const completedModules = modules.filter(m => m.isConfigured).length;
    const overallProgress = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;
    
    const criticalIssues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    
    modules.forEach(module => {
      criticalIssues.push(...module.criticalIssues);
      warnings.push(...module.warnings);
    });
    
    // Add general recommendations
    if (completedModules < totalModules) {
      recommendations.push('Complete la configuración de todos los módulos para aprovechar todas las funcionalidades');
    }
    
    if (modules.some(m => m.id === 'company' && !m.isConfigured)) {
      recommendations.push('Configure primero la información de la empresa');
    }
    
    if (modules.some(m => m.id === 'establishments' && !m.isConfigured)) {
      recommendations.push('Configure al menos un establecimiento principal');
    }

    return {
      overallProgress,
      isComplete: completedModules === totalModules && criticalIssues.length === 0,
      completedModules,
      totalModules,
      criticalIssues: [...new Set(criticalIssues)], // Remove duplicates
      warnings: [...new Set(warnings)],
      recommendations,
    };
  }, [modules]);

  // Refresh status
  const refreshStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const moduleIds = ['company', 'establishments', 'business', 'series', 'users', 'voucher-design'];
      const updatedModules = moduleIds.map(calculateModuleStatus);
      
      setModules(updatedModules);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error refreshing status');
    } finally {
      setLoading(false);
    }
  }, [calculateModuleStatus]);

  // Check specific module status
  const checkModuleStatus = useCallback(async (moduleId: string): Promise<ModuleStatus> => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const moduleStatus = calculateModuleStatus(moduleId);
      
      // Update modules array
      setModules(prev => prev.map(m => m.id === moduleId ? moduleStatus : m));
      
      return moduleStatus;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error checking module status');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [calculateModuleStatus]);

  // Validate module
  const validateModule = useCallback(async (moduleId: string): Promise<{ isValid: boolean; issues: string[] }> => {
    const moduleStatus = calculateModuleStatus(moduleId);
    
    const issues = [
      ...moduleStatus.criticalIssues,
      ...moduleStatus.warnings,
    ];
    
    const requiredStepsCompleted = moduleStatus.requiredSteps.filter(step => step.isRequired)
      .every(step => moduleStatus.completedSteps.some(completed => completed.id === step.id));
    
    return {
      isValid: requiredStepsCompleted && moduleStatus.criticalIssues.length === 0,
      issues,
    };
  }, [calculateModuleStatus]);

  // Get module status by ID
  const getModuleStatus = useCallback((moduleId: string): ModuleStatus | undefined => {
    return modules.find(m => m.id === moduleId);
  }, [modules]);

  // Get critical modules
  const getCriticalModules = useCallback((): ModuleStatus[] => {
    return modules.filter(m => m.criticalIssues.length > 0);
  }, [modules]);

  // Get completed modules
  const getCompletedModules = useCallback((): ModuleStatus[] => {
    return modules.filter(m => m.isConfigured);
  }, [modules]);

  // Get pending modules
  const getPendingModules = useCallback((): ModuleStatus[] => {
    return modules.filter(m => !m.isConfigured);
  }, [modules]);

  // Get next required module
  const getNextRequiredModule = useCallback((): ModuleStatus | undefined => {
    const moduleOrder = ['company', 'establishments', 'business', 'series', 'users', 'voucher-design'];
    
    for (const moduleId of moduleOrder) {
      const module = modules.find(m => m.id === moduleId);
      if (module && !module.isConfigured) {
        return module;
      }
    }
    
    return undefined;
  }, [modules]);

  // Check if configuration can be completed
  const canCompleteConfiguration = useCallback((): boolean => {
    const criticalModules = getCriticalModules();
    const requiredModules = ['company', 'establishments', 'business', 'series', 'users'];
    
    return requiredModules.every(moduleId => {
      const module = modules.find(m => m.id === moduleId);
      return module && module.isConfigured;
    }) && criticalModules.length === 0;
  }, [modules, getCriticalModules]);

  // Get completion roadmap
  const getCompletionRoadmap = useCallback(() => {
    const roadmap: { module: string; steps: string[]; estimatedTime: number; }[] = [];
    
    const pendingModules = getPendingModules();
    
    pendingModules.forEach(module => {
      const pendingSteps = module.pendingSteps.filter(step => step.isRequired);
      
      if (pendingSteps.length > 0) {
        roadmap.push({
          module: module.name,
          steps: pendingSteps.map(step => step.title),
          estimatedTime: pendingSteps.length * 5, // 5 minutes per step estimate
        });
      }
    });
    
    return roadmap;
  }, [getPendingModules]);

  // Calculate status
  const status = calculateOverallStatus();

  // Refresh status when state changes
  useEffect(() => {
    refreshStatus();
  }, [state, refreshStatus]);

  return {
    status,
    modules,
    loading,
    error,
    
    // Actions
    refreshStatus,
    checkModuleStatus,
    validateModule,
    
    // Getters
    getModuleStatus,
    getCriticalModules,
    getCompletedModules,
    getPendingModules,
    getNextRequiredModule,
    
    // Utilities
    canCompleteConfiguration,
    getCompletionRoadmap,
  };
}