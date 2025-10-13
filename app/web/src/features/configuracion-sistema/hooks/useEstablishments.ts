import { useState, useEffect, useCallback } from 'react';
import { useConfigurationContext } from '../context/ConfigurationContext';
import type { 
  Establishment, 
  CreateEstablishmentRequest, 
  UpdateEstablishmentRequest, 
  EstablishmentSummary 
} from '../models/Establishment';

interface UseEstablishmentsReturn {
  establishments: Establishment[];
  loading: boolean;
  error: string | null;
  
  // Actions
  loadEstablishments: () => Promise<void>;
  createEstablishment: (data: CreateEstablishmentRequest) => Promise<Establishment>;
  updateEstablishment: (id: string, data: UpdateEstablishmentRequest) => Promise<Establishment>;
  deleteEstablishment: (id: string) => Promise<void>;
  setMainEstablishment: (id: string) => Promise<void>;
  
  // Getters
  getEstablishment: (id: string) => Establishment | undefined;
  getMainEstablishment: () => Establishment | undefined;
  getActiveEstablishments: () => Establishment[];
  getEstablishmentSummaries: () => EstablishmentSummary[];
  
  // Validation
  validateEstablishmentCode: (code: string, excludeId?: string) => Promise<boolean>;
  validateEstablishmentData: (data: CreateEstablishmentRequest | UpdateEstablishmentRequest) => Promise<string[]>;
  
  // Statistics
  getEstablishmentStats: () => {
    total: number;
    active: number;
    inactive: number;
  };
}

// Mock establishments data
const MOCK_ESTABLISHMENTS: Establishment[] = [
  {
    id: 'est-1',
    code: '0000',
    name: 'Establecimiento Principal',
    address: 'AV. PRINCIPAL 123',
    district: 'LIMA',
    province: 'LIMA',
    department: 'LIMA',
    postalCode: '15001',
    phone: '(01) 123-4567',
  email: 'principal@empresademo.com',
    isMainEstablishment: true,
    businessHours: {
      monday: { isOpen: true, openTime: '09:00', closeTime: '18:00', is24Hours: false },
      tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00', is24Hours: false },
      wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00', is24Hours: false },
      thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00', is24Hours: false },
      friday: { isOpen: true, openTime: '09:00', closeTime: '18:00', is24Hours: false },
      saturday: { isOpen: true, openTime: '09:00', closeTime: '13:00', is24Hours: false },
    },
    sunatConfiguration: {
      isRegistered: true,
      registrationDate: new Date('2025-01-01'),
      annexCode: '0000',
      economicActivity: 'Venta al por menor',
      tributaryAddress: 'AV. PRINCIPAL 123',
    },
    posConfiguration: {
      hasPos: true,
      terminalCount: 2,
      printerConfiguration: {
        hasPrinter: true,
        printerType: 'THERMAL',
        paperSize: 'TICKET_80MM',
        isNetworkPrinter: false,
      },
      cashDrawerConfiguration: {
        hasCashDrawer: true,
        openMethod: 'PRINTER',
        currency: 'PEN',
      },
      barcodeScanner: {
        hasScanner: true,
        scannerType: 'USB',
      },
    },
    inventoryConfiguration: {
      managesInventory: true,
      isWarehouse: true,
      allowNegativeStock: false,
      autoTransferStock: false,
    },
    financialConfiguration: {
      handlesCash: true,
      defaultCurrencyId: 'PEN',
      acceptedCurrencies: ['PEN', 'USD'],
      defaultTaxId: 'IGV',
      bankAccounts: [
        {
          id: 'bank-1',
          bankName: 'Banco de Crédito del Perú',
          accountType: 'CHECKING',
          accountNumber: '1234567890',
          currency: 'PEN',
          isMain: true,
          isActive: true,
        },
      ],
    },
    status: 'ACTIVE',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date(),
    isActive: true,
  },
  {
    id: 'est-2',
    code: '0001',
    name: 'Sucursal San Isidro',
    address: 'AV. JAVIER PRADO 456',
    district: 'SAN ISIDRO',
    province: 'LIMA',
    department: 'LIMA',
    postalCode: '15036',
    phone: '(01) 234-5678',
  email: 'sanisidro@empresademo.com',
    isMainEstablishment: false,
    businessHours: {
      monday: { isOpen: true, openTime: '10:00', closeTime: '20:00', is24Hours: false },
      tuesday: { isOpen: true, openTime: '10:00', closeTime: '20:00', is24Hours: false },
      wednesday: { isOpen: true, openTime: '10:00', closeTime: '20:00', is24Hours: false },
      thursday: { isOpen: true, openTime: '10:00', closeTime: '20:00', is24Hours: false },
      friday: { isOpen: true, openTime: '10:00', closeTime: '20:00', is24Hours: false },
      saturday: { isOpen: true, openTime: '10:00', closeTime: '18:00', is24Hours: false },
      sunday: { isOpen: true, openTime: '11:00', closeTime: '17:00', is24Hours: false },
    },
    sunatConfiguration: {
      isRegistered: true,
      registrationDate: new Date('2025-01-15'),
      annexCode: '0001',
      economicActivity: 'Venta al por menor',
    },
    posConfiguration: {
      hasPos: true,
      terminalCount: 1,
      printerConfiguration: {
        hasPrinter: true,
        printerType: 'THERMAL',
        paperSize: 'TICKET_80MM',
        isNetworkPrinter: false,
      },
      cashDrawerConfiguration: {
        hasCashDrawer: true,
        openMethod: 'PRINTER',
        currency: 'PEN',
      },
      barcodeScanner: {
        hasScanner: false,
        scannerType: 'USB',
      },
    },
    inventoryConfiguration: {
      managesInventory: true,
      isWarehouse: false,
      allowNegativeStock: false,
      autoTransferStock: true,
      parentWarehouseId: 'est-1',
    },
    financialConfiguration: {
      handlesCash: true,
      defaultCurrencyId: 'PEN',
      acceptedCurrencies: ['PEN', 'USD'],
      defaultTaxId: 'IGV',
      bankAccounts: [],
    },
    status: 'ACTIVE',
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date(),
    isActive: true,
  },
  {
    id: 'est-3',
    code: '0002',
    name: 'Almacén Central',
    address: 'AV. INDUSTRIAL 789',
    district: 'ATE',
    province: 'LIMA',
    department: 'LIMA',
  postalCode: '15012',
    isMainEstablishment: false,
    businessHours: {
      monday: { isOpen: true, openTime: '08:00', closeTime: '17:00', is24Hours: false },
      tuesday: { isOpen: true, openTime: '08:00', closeTime: '17:00', is24Hours: false },
      wednesday: { isOpen: true, openTime: '08:00', closeTime: '17:00', is24Hours: false },
      thursday: { isOpen: true, openTime: '08:00', closeTime: '17:00', is24Hours: false },
      friday: { isOpen: true, openTime: '08:00', closeTime: '17:00', is24Hours: false },
      saturday: { isOpen: true, openTime: '08:00', closeTime: '12:00', is24Hours: false },
    },
    sunatConfiguration: {
      isRegistered: false,
    },
    inventoryConfiguration: {
      managesInventory: true,
      isWarehouse: true,
      allowNegativeStock: false,
      autoTransferStock: false,
    },
    financialConfiguration: {
      handlesCash: false,
      defaultCurrencyId: 'PEN',
      acceptedCurrencies: ['PEN'],
      defaultTaxId: 'IGV',
      bankAccounts: [],
    },
    status: 'ACTIVE',
    createdAt: new Date('2025-01-20'),
    updatedAt: new Date(),
    isActive: true,
  },
];

export function useEstablishments(): UseEstablishmentsReturn {
  const { state, dispatch } = useConfigurationContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const establishments = state.establishments;

  // Load establishments
  const loadEstablishments = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      dispatch({ type: 'SET_ESTABLISHMENTS', payload: MOCK_ESTABLISHMENTS });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading establishments');
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  // Create establishment
  const createEstablishment = useCallback(async (data: CreateEstablishmentRequest): Promise<Establishment> => {
    setLoading(true);
    setError(null);
    
    try {
      // Validate data
      const validationErrors = await validateEstablishmentData(data);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }
      
      // Check code uniqueness
      const isCodeUnique = await validateEstablishmentCode(data.code);
      if (!isCodeUnique) {
        throw new Error('El código del establecimiento ya existe');
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newEstablishment: Establishment = {
        id: `est-${Date.now()}`,
        ...data,
        businessHours: data.businessHours || {},
        sunatConfiguration: {
          isRegistered: false,
          ...data.sunatConfiguration
        },
        inventoryConfiguration: {
          managesInventory: false,
          isWarehouse: false,
          allowNegativeStock: false,
          autoTransferStock: false,
          ...data.inventoryConfiguration
        },
        financialConfiguration: {
          handlesCash: true,
          defaultCurrencyId: 'currency-1',
          acceptedCurrencies: ['currency-1'],
          defaultTaxId: 'tax-1',
          bankAccounts: [],
          ...data.financialConfiguration
        },
        // Si es el primer establecimiento creado, márcalo como principal por defecto
        isMainEstablishment: establishments.length === 0,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };
      
      dispatch({ type: 'ADD_ESTABLISHMENT', payload: newEstablishment });
      
      return newEstablishment;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating establishment');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [establishments, dispatch]);

  // Update establishment
  const updateEstablishment = useCallback(async (id: string, data: UpdateEstablishmentRequest): Promise<Establishment> => {
    const existingEstablishment = getEstablishment(id);
    if (!existingEstablishment) {
      throw new Error('Establishment not found');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Validate data
      const validationErrors = await validateEstablishmentData(data);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }
      
      // Check code uniqueness if changed
      if (data.code && data.code !== existingEstablishment.code) {
        const isCodeUnique = await validateEstablishmentCode(data.code, id);
        if (!isCodeUnique) {
          throw new Error('El código del establecimiento ya existe');
        }
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const updatedEstablishment: Establishment = {
        ...existingEstablishment,
        ...data,
        id,
        sunatConfiguration: {
          ...existingEstablishment.sunatConfiguration,
          ...data.sunatConfiguration
        },
        inventoryConfiguration: {
          ...existingEstablishment.inventoryConfiguration,
          ...data.inventoryConfiguration
        },
        financialConfiguration: {
          ...existingEstablishment.financialConfiguration,
          ...data.financialConfiguration
        },
        updatedAt: new Date(),
      };
      
      dispatch({ type: 'UPDATE_ESTABLISHMENT', payload: updatedEstablishment });
      
      return updatedEstablishment;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating establishment');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  // Delete establishment
  const deleteEstablishment = useCallback(async (id: string) => {
    const establishment = getEstablishment(id);
    if (!establishment) {
      throw new Error('Establishment not found');
    }
    
    if (establishment.isMainEstablishment) {
      throw new Error('No se puede eliminar el establecimiento principal');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 600));
      
      dispatch({ type: 'DELETE_ESTABLISHMENT', payload: id });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting establishment');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  // Set main establishment
  const setMainEstablishment = useCallback(async (id: string) => {
    const establishment = getEstablishment(id);
    if (!establishment) {
      throw new Error('Establishment not found');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update all establishments - remove main flag from all, add to selected
      const updatedEstablishments = establishments.map(est => ({
        ...est,
        isMainEstablishment: est.id === id,
        updatedAt: new Date(),
      }));
      
      dispatch({ type: 'SET_ESTABLISHMENTS', payload: updatedEstablishments });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error setting main establishment');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [establishments, dispatch]);

  // Get establishment by ID
  const getEstablishment = useCallback((id: string): Establishment | undefined => {
    return establishments.find(est => est.id === id);
  }, [establishments]);

  // Get main establishment
  const getMainEstablishment = useCallback((): Establishment | undefined => {
    // Preferir el marcado como principal
    const main = establishments.find(est => est.isMainEstablishment);
    if (main) return main;
    // Si no existe, devolver el primero activo (heurística)
    return establishments.find(est => est.isActive) || establishments[0];
  }, [establishments]);

  // Get active establishments
  const getActiveEstablishments = useCallback((): Establishment[] => {
    return establishments.filter(est => est.status === 'ACTIVE' && est.isActive);
  }, [establishments]);

  // Get establishment summaries
  const getEstablishmentSummaries = useCallback((): EstablishmentSummary[] => {
    return establishments.map(est => ({
      id: est.id,
      code: est.code,
      name: est.name,
      address: est.address,
      district: est.district,
      status: est.status,
      isMainEstablishment: est.isMainEstablishment,
      hasPos: est.posConfiguration?.hasPos || false,
    }));
  }, [establishments]);

  // Validate establishment code
  const validateEstablishmentCode = useCallback(async (code: string, excludeId?: string): Promise<boolean> => {
    // Simulate API validation
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const exists = establishments.some(est => 
      est.code === code && est.id !== excludeId && est.isActive
    );
    
    return !exists;
  }, [establishments]);

  // Validate establishment data
  const validateEstablishmentData = useCallback(async (data: CreateEstablishmentRequest | UpdateEstablishmentRequest): Promise<string[]> => {
    const errors: string[] = [];
    
    // Basic validations
    if (!data.code?.trim()) {
      errors.push('El código es requerido');
    } else if (!/^\d{4}$/.test(data.code)) {
      errors.push('El código debe tener 4 dígitos');
    }
    
    if (!data.name?.trim()) {
      errors.push('El nombre es requerido');
    } else if (data.name.length < 3) {
      errors.push('El nombre debe tener al menos 3 caracteres');
    }
    
    if (!data.address?.trim()) {
      errors.push('La dirección es requerida');
    }
    
    if (!data.district?.trim()) {
      errors.push('El distrito es requerido');
    }
    
    if (!data.province?.trim()) {
      errors.push('La provincia es requerida');
    }
    
    if (!data.department?.trim()) {
      errors.push('El departamento es requerido');
    }
    
    // Email validation
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('El email no tiene un formato válido');
    }
    
    // Phone validation
    if (data.phone && !/^\(\d{2}\)\s\d{3}-\d{4}$/.test(data.phone)) {
      // Optional: validate phone format
    }
    
    // Coordinates validation
    if (data.coordinates) {
      const { latitude, longitude } = data.coordinates;
      if (latitude < -90 || latitude > 90) {
        errors.push('La latitud debe estar entre -90 y 90');
      }
      if (longitude < -180 || longitude > 180) {
        errors.push('La longitud debe estar entre -180 y 180');
      }
    }
    
    return errors;
  }, []);

  // Get establishment statistics
  const getEstablishmentStats = useCallback(() => {
    const stats = {
      total: establishments.length,
      active: 0,
      inactive: 0,
    };
    
    establishments.forEach(est => {
      if (est.status === 'ACTIVE' && est.isActive) {
        stats.active++;
      } else {
        stats.inactive++;
      }
    });
    
    return stats;
  }, [establishments]);

  // Load establishments on mount
  useEffect(() => {
    loadEstablishments();
  }, [loadEstablishments]);

  return {
    establishments,
    loading,
    error,
    
    // Actions
    loadEstablishments,
    createEstablishment,
    updateEstablishment,
    deleteEstablishment,
    setMainEstablishment,
    
    // Getters
    getEstablishment,
    getMainEstablishment,
    getActiveEstablishments,
    getEstablishmentSummaries,
    
    // Validation
    validateEstablishmentCode,
    validateEstablishmentData,
    
    // Statistics
    getEstablishmentStats,
  };
}