/* eslint-disable react-hooks/exhaustive-deps -- dependencias extensas; ajuste diferido */
import { useState, useEffect, useCallback } from 'react';
import { useConfigurationContext } from '../contexto/ContextoConfiguracion';
import type { 
  Establecimiento, 
  CreateEstablecimientoRequest, 
  UpdateEstablecimientoRequest, 
  EstablecimientoSummary 
} from '../modelos/Establecimiento';

interface UseEstablecimientosReturn {
  Establecimientos: Establecimiento[];
  loading: boolean;
  error: string | null;
  
  // Actions
  loadEstablecimientos: () => Promise<void>;
  createEstablecimiento: (data: CreateEstablecimientoRequest) => Promise<Establecimiento>;
  updateEstablecimiento: (id: string, data: UpdateEstablecimientoRequest) => Promise<Establecimiento>;
  deleteEstablecimiento: (id: string) => Promise<void>;
  setMainEstablecimiento: (id: string) => Promise<void>;
  
  // Getters
  getEstablecimiento: (id: string) => Establecimiento | undefined;
  getMainEstablecimiento: () => Establecimiento | undefined;
  getActiveEstablecimientos: () => Establecimiento[];
  getEstablecimientoSummaries: () => EstablecimientoSummary[];
  
  // Validation
  validateEstablecimientoCode: (codigoEstablecimiento: string, excludeId?: string) => Promise<boolean>;
  validateEstablecimientoData: (data: CreateEstablecimientoRequest | UpdateEstablecimientoRequest) => Promise<string[]>;
  
  // Statistics
  getEstablecimientoStats: () => {
    total: number;
    active: number;
    inactive: number;
  };
}

// Mock Establecimientos data
const MOCK_EstablecimientoS: Establecimiento[] = [
  {
    id: 'est-1',
    codigoEstablecimiento: '0000',
    nombreEstablecimiento: 'Establecimiento Principal',
    direccionEstablecimiento: 'AV. PRINCIPAL 123',
    distritoEstablecimiento: 'LIMA',
    provinciaEstablecimiento: 'LIMA',
    departamentoEstablecimiento: 'LIMA',
    codigoPostalEstablecimiento: '15001',
    phone: '(01) 123-4567',
  email: 'principal@empresademo.com',
    isMainEstablecimiento: true,
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
      isalmacen: true,
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
    estadoEstablecimiento: 'ACTIVE',
    creadoElEstablecimiento: new Date('2025-01-01'),
    actualizadoElEstablecimiento: new Date(),
    estaActivoEstablecimiento: true,
  },
  {
    id: 'est-2',
    codigoEstablecimiento: '0001',
    nombreEstablecimiento: 'Sucursal San Isidro',
    direccionEstablecimiento: 'AV. JAVIER PRADO 456',
    distritoEstablecimiento: 'SAN ISIDRO',
    provinciaEstablecimiento: 'LIMA',
    departamentoEstablecimiento: 'LIMA',
    codigoPostalEstablecimiento: '15036',
    phone: '(01) 234-5678',
  email: 'sanisidro@empresademo.com',
    isMainEstablecimiento: false,
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
      isalmacen: false,
      allowNegativeStock: false,
      autoTransferStock: true,
      parentalmacenId: 'est-1',
    },
    financialConfiguration: {
      handlesCash: true,
      defaultCurrencyId: 'PEN',
      acceptedCurrencies: ['PEN', 'USD'],
      defaultTaxId: 'IGV',
      bankAccounts: [],
    },
    estadoEstablecimiento: 'ACTIVE',
    creadoElEstablecimiento: new Date('2025-01-15'),
    actualizadoElEstablecimiento: new Date(),
    estaActivoEstablecimiento: true,
  },
  {
    id: 'est-3',
    codigoEstablecimiento: '0002',
    nombreEstablecimiento: 'Almacén Central',
    direccionEstablecimiento: 'AV. INDUSTRIAL 789',
    distritoEstablecimiento: 'ATE',
    provinciaEstablecimiento: 'LIMA',
    departamentoEstablecimiento: 'LIMA',
  codigoPostalEstablecimiento: '15012',
    isMainEstablecimiento: false,
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
      isalmacen: true,
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
    estadoEstablecimiento: 'ACTIVE',
    creadoElEstablecimiento: new Date('2025-01-20'),
    actualizadoElEstablecimiento: new Date(),
    estaActivoEstablecimiento: true,
  },
];

export function useEstablecimientos(): UseEstablecimientosReturn {
  const { state, dispatch } = useConfigurationContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const Establecimientos = state.Establecimientos;

  // Load Establecimientos
  const loadEstablecimientos = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      dispatch({ type: 'SET_EstablecimientoS', payload: MOCK_EstablecimientoS });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading Establecimientos');
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  // Create Establecimiento
  const createEstablecimiento = useCallback(async (data: CreateEstablecimientoRequest): Promise<Establecimiento> => {
    setLoading(true);
    setError(null);
    
    try {
      // Validate data
      const validationErrors = await validateEstablecimientoData(data);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }
      
      // Check code uniqueness
      const isCodeUnique = await validateEstablecimientoCode(data.codigoEstablecimiento);
      if (!isCodeUnique) {
        throw new Error('El código del establecimiento ya existe');
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newEstablecimiento: Establecimiento = {
        id: `est-${Date.now()}`,
        ...data,
        businessHours: data.businessHours || {},
        sunatConfiguration: {
          isRegistered: false,
          ...data.sunatConfiguration
        },
        inventoryConfiguration: {
          managesInventory: false,
          isalmacen: false,
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
        isMainEstablecimiento: Establecimientos.length === 0,
        estadoEstablecimiento: 'ACTIVE',
        creadoElEstablecimiento: new Date(),
        actualizadoElEstablecimiento: new Date(),
        estaActivoEstablecimiento: true,
      };
      
      dispatch({ type: 'ADD_Establecimiento', payload: newEstablecimiento });
      
      return newEstablecimiento;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating Establecimiento');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [Establecimientos, dispatch]);

  // Update Establecimiento
  const updateEstablecimiento = useCallback(async (id: string, data: UpdateEstablecimientoRequest): Promise<Establecimiento> => {
    const existingEstablecimiento = getEstablecimiento(id);
    if (!existingEstablecimiento) {
      throw new Error('Establecimiento not found');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Validate data
      const validationErrors = await validateEstablecimientoData(data);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }
      
      // Check code uniqueness if changed
      if (data.codigoEstablecimiento && data.codigoEstablecimiento !== existingEstablecimiento.codigoEstablecimiento) {
        const isCodeUnique = await validateEstablecimientoCode(data.codigoEstablecimiento, id);
        if (!isCodeUnique) {
          throw new Error('El código del establecimiento ya existe');
        }
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const updatedEstablecimiento: Establecimiento = {
        ...existingEstablecimiento,
        ...data,
        id,
        sunatConfiguration: {
          ...existingEstablecimiento.sunatConfiguration,
          ...data.sunatConfiguration
        },
        inventoryConfiguration: {
          ...existingEstablecimiento.inventoryConfiguration,
          ...data.inventoryConfiguration
        },
        financialConfiguration: {
          ...existingEstablecimiento.financialConfiguration,
          ...data.financialConfiguration
        },
        actualizadoElEstablecimiento: new Date(),
      };
      
      dispatch({ type: 'UPDATE_Establecimiento', payload: updatedEstablecimiento });
      
      return updatedEstablecimiento;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating Establecimiento');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  // Delete Establecimiento
  const deleteEstablecimiento = useCallback(async (id: string) => {
    const Establecimiento = getEstablecimiento(id);
    if (!Establecimiento) {
      throw new Error('Establecimiento not found');
    }
    
    if (Establecimiento.isMainEstablecimiento) {
      throw new Error('No se puede eliminar el establecimiento principal');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 600));
      
      dispatch({ type: 'DELETE_Establecimiento', payload: id });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting Establecimiento');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  // Set main Establecimiento
  const setMainEstablecimiento = useCallback(async (id: string) => {
    const Establecimiento = getEstablecimiento(id);
    if (!Establecimiento) {
      throw new Error('Establecimiento not found');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update all Establecimientos - remove main flag from all, add to selected
      const updatedEstablecimientos = Establecimientos.map(est => ({
        ...est,
        isMainEstablecimiento: est.id === id,
        actualizadoElEstablecimiento: new Date(),
      }));
      
      dispatch({ type: 'SET_EstablecimientoS', payload: updatedEstablecimientos });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error setting main Establecimiento');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [Establecimientos, dispatch]);

  // Get Establecimiento by ID
  const getEstablecimiento = useCallback((id: string): Establecimiento | undefined => {
    return Establecimientos.find(est => est.id === id);
  }, [Establecimientos]);

  // Get main Establecimiento
  const getMainEstablecimiento = useCallback((): Establecimiento | undefined => {
    // Preferir el marcado como principal
    const main = Establecimientos.find(est => est.isMainEstablecimiento);
    if (main) return main;
    // Si no existe, devolver el primero activo (heurística)
    return Establecimientos.find(est => est.estaActivoEstablecimiento) || Establecimientos[0];
  }, [Establecimientos]);

  // Get active Establecimientos
  const getActiveEstablecimientos = useCallback((): Establecimiento[] => {
    return Establecimientos.filter(est => est.estadoEstablecimiento === 'ACTIVE' && est.estaActivoEstablecimiento);
  }, [Establecimientos]);

  // Get Establecimiento summaries
  const getEstablecimientoSummaries = useCallback((): EstablecimientoSummary[] => {
    return Establecimientos.map(est => ({
      id: est.id,
      codigoEstablecimiento: est.codigoEstablecimiento,
      nombreEstablecimiento: est.nombreEstablecimiento,
      direccionEstablecimiento: est.direccionEstablecimiento,
      distritoEstablecimiento: est.distritoEstablecimiento,
      estadoEstablecimiento: est.estadoEstablecimiento,
      isMainEstablecimiento: est.isMainEstablecimiento,
      hasPos: est.posConfiguration?.hasPos || false,
    }));
  }, [Establecimientos]);

  // Validate Establecimiento code
  const validateEstablecimientoCode = useCallback(async (codigoEstablecimiento: string, excludeId?: string): Promise<boolean> => {
    // Simulate API validation
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const exists = Establecimientos.some(est => 
      est.codigoEstablecimiento === codigoEstablecimiento && est.id !== excludeId && est.estaActivoEstablecimiento
    );
    
    return !exists;
  }, [Establecimientos]);

  // Validate Establecimiento data
  const validateEstablecimientoData = useCallback(async (data: CreateEstablecimientoRequest | UpdateEstablecimientoRequest): Promise<string[]> => {
    const errors: string[] = [];
    
    // Basic validations
    if (!data.codigoEstablecimiento?.trim()) {
      errors.push('El código es requerido');
    } else if (!/^\d{4}$/.test(data.codigoEstablecimiento)) {
      errors.push('El código debe tener 4 dígitos');
    }
    
    if (!data.nombreEstablecimiento?.trim()) {
      errors.push('El nombre es requerido');
    } else if (data.nombreEstablecimiento.length < 3) {
      errors.push('El nombre debe tener al menos 3 caracteres');
    }
    
    if (!data.direccionEstablecimiento?.trim()) {
      errors.push('La dirección es requerida');
    }
    
    if (!data.distritoEstablecimiento?.trim()) {
      errors.push('El distrito es requerido');
    }
    
    if (!data.provinciaEstablecimiento?.trim()) {
      errors.push('La provincia es requerida');
    }
    
    if (!data.departamentoEstablecimiento?.trim()) {
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

  // Get Establecimiento statistics
  const getEstablecimientoStats = useCallback(() => {
    const stats = {
      total: Establecimientos.length,
      active: 0,
      inactive: 0,
    };
    
    Establecimientos.forEach(est => {
      if (est.estadoEstablecimiento === 'ACTIVE' && est.estaActivoEstablecimiento) {
        stats.active++;
      } else {
        stats.inactive++;
      }
    });
    
    return stats;
  }, [Establecimientos]);

  // Load Establecimientos on mount
  useEffect(() => {
    loadEstablecimientos();
  }, [loadEstablecimientos]);

  return {
    Establecimientos,
    loading,
    error,
    
    // Actions
    loadEstablecimientos,
    createEstablecimiento,
    updateEstablecimiento,
    deleteEstablecimiento,
    setMainEstablecimiento,
    
    // Getters
    getEstablecimiento,
    getMainEstablecimiento,
    getActiveEstablecimientos,
    getEstablecimientoSummaries,
    
    // Validation
    validateEstablecimientoCode,
    validateEstablecimientoData,
    
    // Statistics
    getEstablecimientoStats,
  };
}