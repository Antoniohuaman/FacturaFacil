import { useState, useCallback } from 'react';
import { useConfigurationContext } from '../contexto/ContextoConfiguracion';
import type { PaymentMethod, CreatePaymentMethodRequest } from '../modelos/PaymentMethod';
import { SUNAT_PAYMENT_METHODS } from '../modelos/PaymentMethod';
import type { Currency } from '../modelos/Currency';
import type { Unit } from '../modelos';
import type { Tax } from '../modelos/Tax';
import { PERU_TAX_TYPES } from '../modelos/Tax';

interface UseBusinessReturn {
  paymentMethods: PaymentMethod[];
  createPaymentMethod: (data: CreatePaymentMethodRequest) => Promise<PaymentMethod>;
  updatePaymentMethod: (id: string, data: Partial<PaymentMethod>) => Promise<PaymentMethod>;
  deletePaymentMethod: (id: string) => Promise<void>;
  setDefaultPaymentMethod: (id: string) => Promise<void>;
  currencies: Currency[];
  units: Unit[];
  taxes: Tax[];
  loading: boolean;
  error: string | null;
  initializeDefaults: () => Promise<void>;
  getBusinessConfigurationStatus: () => {
    hasPaymentMethods: boolean;
    hasCurrencies: boolean;
    hasUnits: boolean;
    hasTaxes: boolean;
    isComplete: boolean;
  };
}

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

const MOCK_TAXES: Tax[] = PERU_TAX_TYPES
  .filter(tax => ['IGV18', 'IGV10', 'EXO', 'INA', 'IGV_EXP'].includes(tax.code))
  .map<Tax>((tax, index) => {
    const now = new Date();
    return {
      ...tax,
      id: `tax-${index + 1}`,
      isDefault: tax.code === 'IGV18',
      includeInPrice: true,
      createdAt: now,
      updatedAt: now,
    };
  });

export function useBusiness(): UseBusinessReturn {
  const { state, dispatch } = useConfigurationContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paymentMethods = state.paymentMethods;
  const currencies = state.currencies;
  const units = state.units;
  const taxes = state.taxes;

  const initializeDefaults = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (paymentMethods.length === 0) {
        dispatch({ type: 'SET_PAYMENT_METHODS', payload: MOCK_PAYMENT_METHODS });
      }
      
      if (currencies.length === 0) {
        dispatch({ type: 'SET_CURRENCIES', payload: MOCK_CURRENCIES });
      }
      
      if (taxes.length === 0) {
        dispatch({ type: 'SET_TAXES', payload: MOCK_TAXES });
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error initializing business configuration');
    } finally {
      setLoading(false);
    }
  }, [paymentMethods, currencies, taxes, dispatch]);

  const createPaymentMethod = useCallback(async (data: CreatePaymentMethodRequest): Promise<PaymentMethod> => {
    setLoading(true);
    setError(null);
    
    try {
      const exists = paymentMethods.some(pm => pm.code === data.code);
      if (exists) {
        throw new Error('Ya existe un método de pago con este código');
      }
      
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
      await new Promise(resolve => setTimeout(resolve, 500));
      
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
    paymentMethods,
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    setDefaultPaymentMethod,
    currencies,
    units,
    taxes,
    loading,
    error,
    initializeDefaults,
    getBusinessConfigurationStatus
  };
}