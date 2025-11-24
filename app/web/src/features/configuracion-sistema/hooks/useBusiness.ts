import { useState, useCallback } from 'react';
import { useConfigurationContext } from '../context/ConfigurationContext';
import type { PaymentMethod, CreatePaymentMethodRequest } from '../models/PaymentMethod';
import { SUNAT_PAYMENT_METHODS } from '../models/PaymentMethod';
import type { Currency, CreateCurrencyRequest, ExchangeRate } from '../models/Currency';
import type { Unit } from '../models/Unit';
import type { Tax } from '../models/Tax';

interface UseBusinessReturn {
  // Payment Methods
  paymentMethods: PaymentMethod[];
  createPaymentMethod: (data: CreatePaymentMethodRequest) => Promise<PaymentMethod>;
  updatePaymentMethod: (id: string, data: Partial<PaymentMethod>) => Promise<PaymentMethod>;
  deletePaymentMethod: (id: string) => Promise<void>;
  setDefaultPaymentMethod: (id: string) => Promise<void>;
  
  // Currencies
  currencies: Currency[];
  createCurrency: (data: CreateCurrencyRequest) => Promise<Currency>;
  updateCurrency: (id: string, data: Partial<Currency>) => Promise<Currency>;
  deleteCurrency: (id: string) => Promise<void>;
  setBaseCurrency: (id: string) => Promise<void>;
  updateExchangeRate: (currencyId: string, rate: number) => Promise<void>;
  getExchangeRateHistory: (currencyId: string) => Promise<ExchangeRate[]>;
  
  // Units
  units: Unit[];
  createUnit: (data: Partial<Unit>) => Promise<Unit>;
  updateUnit: (id: string, data: Partial<Unit>) => Promise<Unit>;
  deleteUnit: (id: string) => Promise<void>;
  
  // Taxes
  taxes: Tax[];
  createTax: (data: Partial<Tax>) => Promise<Tax>;
  updateTax: (id: string, data: Partial<Tax>) => Promise<Tax>;
  deleteTax: (id: string) => Promise<void>;
  setDefaultTax: (id: string) => Promise<void>;
  
  // Loading and error states
  loading: boolean;
  error: string | null;
  
  // Utilities
  initializeDefaults: () => Promise<void>;
  getBusinessConfigurationStatus: () => {
    hasPaymentMethods: boolean;
    hasCurrencies: boolean;
    hasUnits: boolean;
    hasTaxes: boolean;
    isComplete: boolean;
  };
}

// TODO: reemplazar por API real de configuración de métodos de pago (no agregar más datos mock)
const MOCK_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'pm-1',
    code: 'EFECTIVO',
    name: 'Efectivo',
    type: 'CASH',
    sunatCode: '008',
    sunatDescription: 'Efectivo',
    configuration: {
      requiresReference: false,
      allowsPartialPayments: true,
      requiresValidation: false,
      hasCommission: false,
      requiresCustomerData: false,
      allowsCashBack: true,
      requiresSignature: false,
    },
    financial: {
      affectsCashFlow: true,
      settlementPeriod: 'IMMEDIATE',
    },
    display: {
      icon: 'Banknote',
      color: '#10b981',
      displayOrder: 1,
      isVisible: true,
      showInPos: true,
      showInInvoicing: true,
    },
    validation: {
      documentTypes: ['01', '03', '07', '08'],
      customerTypes: ['INDIVIDUAL', 'BUSINESS'],
      allowedCurrencies: ['PEN', 'USD'],
    },
    isDefault: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'pm-2',
    code: 'TARJETA_DEBITO',
    name: 'Tarjeta de Débito',
    type: 'CARD',
    sunatCode: '005',
    sunatDescription: 'Tarjeta de débito',
    configuration: {
      requiresReference: true,
      allowsPartialPayments: false,
      requiresValidation: true,
      hasCommission: true,
      commissionType: 'PERCENTAGE',
      commissionAmount: 2.5,
      requiresCustomerData: false,
      allowsCashBack: false,
      requiresSignature: false,
    },
    financial: {
      affectsCashFlow: false,
      settlementPeriod: 'DAILY',
      bankId: 'bank-visa',
    },
    display: {
      icon: 'CreditCard',
      color: '#3b82f6',
      displayOrder: 2,
      isVisible: true,
      showInPos: true,
      showInInvoicing: true,
    },
    validation: {
      documentTypes: ['01', '03'],
      customerTypes: ['INDIVIDUAL', 'BUSINESS'],
      minTransactionAmount: 5.00,
      allowedCurrencies: ['PEN', 'USD'],
    },
    isDefault: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const MOCK_CURRENCIES: Currency[] = [
  {
    id: 'cur-1',
    code: 'PEN',
    name: 'Sol Peruano',
    symbol: 'S/',
    symbolPosition: 'BEFORE',
    decimalPlaces: 2,
    exchangeRate: 1.0,
    isBaseCurrency: true,
    isActive: true,
    lastUpdated: new Date(),
    autoUpdate: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'cur-2',
    code: 'USD',
    name: 'Dólar Estadounidense',
    symbol: '$',
    symbolPosition: 'BEFORE',
    decimalPlaces: 2,
    exchangeRate: 3.75,
    isBaseCurrency: false,
    isActive: true,
    lastUpdated: new Date(),
    autoUpdate: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const MOCK_UNITS: Unit[] = [
  {
    id: 'unit-1',
    code: 'UND',
    name: 'Unidad',
    symbol: 'Unid.',
    description: 'Unidad de medida básica',
    category: 'QUANTITY',
    baseUnit: undefined,
    conversionFactor: 1,
    decimalPlaces: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'unit-2',
    code: 'KG',
    name: 'Kilogramo',
    symbol: 'kg',
    description: 'Kilogramo',
    category: 'WEIGHT',
    baseUnit: undefined,
    conversionFactor: 1,
    decimalPlaces: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'unit-3',
    code: 'LT',
    name: 'Litro',
    symbol: 'L',
    description: 'Litro',
    category: 'VOLUME',
    baseUnit: undefined,
    conversionFactor: 1,
    decimalPlaces: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const MOCK_TAXES: Tax[] = [
  {
    id: 'tax-1',
    code: 'IGV',
    name: 'Impuesto General a las Ventas',
    shortName: 'IGV',
    type: 'PERCENTAGE',
    rate: 18.0,
    sunatCode: '1000',
    sunatName: 'IGV - Impuesto General a las Ventas',
    sunatType: 'VAT',
    category: 'SALES',
    includeInPrice: false,
    isCompound: false,
    applicableTo: {
      products: true,
      services: true,
      both: true
    },
    rules: {
      roundingMethod: 'ROUND',
      roundingPrecision: 2
    },
    jurisdiction: {
      country: 'PE'
    },
    isDefault: true,
    isActive: true,
    validFrom: new Date('2025-01-01'),
    validTo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'tax-2',
    code: 'EXONERADO',
    name: 'Exonerado',
    shortName: 'EXO',
    type: 'PERCENTAGE',
    rate: 0.0,
    sunatCode: '9997',
    sunatName: 'EXO - Exonerado',
    sunatType: 'OTHER',
    category: 'EXEMPTION',
    includeInPrice: false,
    isCompound: false,
    applicableTo: {
      products: true,
      services: true,
      both: true
    },
    rules: {
      roundingMethod: 'ROUND',
      roundingPrecision: 2
    },
    jurisdiction: {
      country: 'PE'
    },
    isDefault: false,
    isActive: true,
    validFrom: new Date('2025-01-01'),
    validTo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export function useBusiness(): UseBusinessReturn {
  const { state, dispatch } = useConfigurationContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paymentMethods = state.paymentMethods;
  const currencies = state.currencies;
  const units = state.units;
  const taxes = state.taxes;

  // Initialize default business data
  const initializeDefaults = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Set default data if not already present
      if (paymentMethods.length === 0) {
        dispatch({ type: 'SET_PAYMENT_METHODS', payload: MOCK_PAYMENT_METHODS });
      }
      
      if (currencies.length === 0) {
        dispatch({ type: 'SET_CURRENCIES', payload: MOCK_CURRENCIES });
      }
      
      if (units.length === 0) {
        dispatch({ type: 'SET_UNITS', payload: MOCK_UNITS });
      }
      
      if (taxes.length === 0) {
        dispatch({ type: 'SET_TAXES', payload: MOCK_TAXES });
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error initializing business configuration');
    } finally {
      setLoading(false);
    }
  }, [paymentMethods, currencies, units, taxes, dispatch]);

  // Payment Methods
  const createPaymentMethod = useCallback(async (data: CreatePaymentMethodRequest): Promise<PaymentMethod> => {
    setLoading(true);
    setError(null);
    
    try {
      // Validate code uniqueness
      const exists = paymentMethods.some(pm => pm.code === data.code);
      if (exists) {
        throw new Error('Ya existe un método de pago con este código');
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const newPaymentMethod: PaymentMethod = {
        id: `pm-${Date.now()}`,
        ...data,
        sunatDescription: SUNAT_PAYMENT_METHODS.find(spm => spm.code === data.sunatCode)?.description || data.name,
        isDefault: paymentMethods.length === 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      dispatch({ type: 'SET_PAYMENT_METHODS', payload: [...paymentMethods, newPaymentMethod] });
      
      return newPaymentMethod;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating payment method');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [paymentMethods, dispatch]);

  const updatePaymentMethod = useCallback(async (id: string, data: Partial<PaymentMethod>): Promise<PaymentMethod> => {
    const existing = paymentMethods.find(pm => pm.id === id);
    if (!existing) {
      throw new Error('Payment method not found');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updated: PaymentMethod = {
        ...existing,
        ...data,
        id,
        updatedAt: new Date(),
      };
      
      const updatedList = paymentMethods.map(pm => pm.id === id ? updated : pm);
      dispatch({ type: 'SET_PAYMENT_METHODS', payload: updatedList });
      
      return updated;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating payment method');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [paymentMethods, dispatch]);

  const deletePaymentMethod = useCallback(async (id: string) => {
    const method = paymentMethods.find(pm => pm.id === id);
    if (!method) {
      throw new Error('Payment method not found');
    }
    
    if (method.isDefault) {
      throw new Error('No se puede eliminar el método de pago por defecto');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const updatedList = paymentMethods.filter(pm => pm.id !== id);
      dispatch({ type: 'SET_PAYMENT_METHODS', payload: updatedList });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting payment method');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [paymentMethods, dispatch]);

  const setDefaultPaymentMethod = useCallback(async (id: string) => {
    const method = paymentMethods.find(pm => pm.id === id);
    if (!method) {
      throw new Error('Payment method not found');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update all payment methods to set new default
      const updatedMethods = paymentMethods.map(pm => ({
        ...pm,
        isDefault: pm.id === id
      }));
      
      dispatch({ type: 'SET_PAYMENT_METHODS', payload: updatedMethods });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error setting default payment method');
    } finally {
      setLoading(false);
    }
  }, [paymentMethods, dispatch]);

  // Business configuration status
  const getBusinessConfigurationStatus = useCallback(() => {
    return {
      hasPaymentMethods: paymentMethods.length > 0,
      hasCurrencies: currencies.length > 0,
      hasUnits: units.length > 0,
      hasTaxes: taxes.length > 0,
      isComplete: paymentMethods.length > 0 && currencies.length > 0 && units.length > 0 && taxes.length > 0
    };
  }, [paymentMethods, currencies, units, taxes]);

  return {
    // Payment Methods
    paymentMethods,
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    setDefaultPaymentMethod,
    
    // Currencies (placeholder functions)
    currencies,
    createCurrency: async () => { throw new Error('Not implemented'); },
    updateCurrency: async () => { throw new Error('Not implemented'); },
    deleteCurrency: async () => { throw new Error('Not implemented'); },
    setBaseCurrency: async () => { throw new Error('Not implemented'); },
    updateExchangeRate: async () => { throw new Error('Not implemented'); },
    getExchangeRateHistory: async () => { throw new Error('Not implemented'); },
    
    // Units (placeholder functions)
    units,
    createUnit: async () => { throw new Error('Not implemented'); },
    updateUnit: async () => { throw new Error('Not implemented'); },
    deleteUnit: async () => { throw new Error('Not implemented'); },
    
    // Taxes (placeholder functions)
    taxes,
    createTax: async () => { throw new Error('Not implemented'); },
    updateTax: async () => { throw new Error('Not implemented'); },
    deleteTax: async () => { throw new Error('Not implemented'); },
    setDefaultTax: async () => { throw new Error('Not implemented'); },
    
    // Loading and error states
    loading,
    error,
    
    // Utilities
    initializeDefaults,
    getBusinessConfigurationStatus
  };
}