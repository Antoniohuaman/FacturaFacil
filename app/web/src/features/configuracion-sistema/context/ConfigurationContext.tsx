import { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Company } from '../models/Company';
import type { Establishment } from '../models/Establishment';
import type { Employee } from '../models/Employee';
import type { Series } from '../models/Series';
import type { PaymentMethod } from '../models/PaymentMethod';
import type { Currency } from '../models/Currency';
import type { Unit } from '../models/Unit';
import type { Tax } from '../models/Tax';
import type { VoucherDesign } from '../models/VoucherDesign';
import { DEFAULT_A4_DESIGN, DEFAULT_TICKET_DESIGN } from '../models/VoucherDesign';
import { SUNAT_UNITS } from '../models/Unit';

// Temporary interface for tax affectations until officially added to Tax model
export interface TaxAffectations {
  igv: {
    isActive: boolean;
    isDefault: boolean;
  };
  exempt: {
    isActive: boolean;
    isDefault: boolean;
  };
  unaffected: {
    isActive: boolean;
    isDefault: boolean;
  };
}

interface ConfigurationState {
  company: Company | null;
  establishments: Establishment[];
  employees: Employee[];
  series: Series[];
  paymentMethods: PaymentMethod[];
  currencies: Currency[];
  units: Unit[];
  taxes: Tax[];
  taxAffectations: TaxAffectations;
  voucherDesigns: VoucherDesign[];
  isLoading: boolean;
  error: string | null;
}

type ConfigurationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_COMPANY'; payload: Company }
  | { type: 'SET_ESTABLISHMENTS'; payload: Establishment[] }
  | { type: 'ADD_ESTABLISHMENT'; payload: Establishment }
  | { type: 'UPDATE_ESTABLISHMENT'; payload: Establishment }
  | { type: 'DELETE_ESTABLISHMENT'; payload: string }
  | { type: 'SET_EMPLOYEES'; payload: Employee[] }
  | { type: 'ADD_EMPLOYEE'; payload: Employee }
  | { type: 'UPDATE_EMPLOYEE'; payload: Employee }
  | { type: 'DELETE_EMPLOYEE'; payload: string }
  | { type: 'SET_SERIES'; payload: Series[] }
  | { type: 'ADD_SERIES'; payload: Series }
  | { type: 'UPDATE_SERIES'; payload: Series }
  | { type: 'DELETE_SERIES'; payload: string }
  | { type: 'SET_PAYMENT_METHODS'; payload: PaymentMethod[] }
  | { type: 'SET_CURRENCIES'; payload: Currency[] }
  | { type: 'SET_UNITS'; payload: Unit[] }
  | { type: 'SET_TAXES'; payload: Tax[] }
  | { type: 'SET_TAX_AFFECTATIONS'; payload: TaxAffectations }
  | { type: 'SET_VOUCHER_DESIGNS'; payload: VoucherDesign[] }
  | { type: 'UPDATE_VOUCHER_DESIGN'; payload: VoucherDesign };

const initialState: ConfigurationState = {
  company: null,
  establishments: [],
  employees: [],
  series: [],
  paymentMethods: [],
  currencies: [],
  units: [],
  taxes: [],
  voucherDesigns: [],
  taxAffectations: {
    igv: {
      isActive: true,
      isDefault: true
    },
    exempt: {
      isActive: true,
      isDefault: false
    },
    unaffected: {
      isActive: true,
      isDefault: false
    }
  },
  isLoading: false,
  error: null,
};

function configurationReducer(
  state: ConfigurationState,
  action: ConfigurationAction
): ConfigurationState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'SET_COMPANY':
      return { ...state, company: action.payload };
    
    case 'SET_ESTABLISHMENTS':
      return { ...state, establishments: action.payload };
    
    case 'ADD_ESTABLISHMENT':
      return {
        ...state,
        establishments: [...state.establishments, action.payload],
      };
    
    case 'UPDATE_ESTABLISHMENT':
      return {
        ...state,
        establishments: state.establishments.map(est =>
          est.id === action.payload.id ? action.payload : est
        ),
      };
    
    case 'DELETE_ESTABLISHMENT':
      return {
        ...state,
        establishments: state.establishments.filter(est => est.id !== action.payload),
      };
    
    case 'SET_EMPLOYEES':
      return { ...state, employees: action.payload };
    
    case 'ADD_EMPLOYEE':
      return {
        ...state,
        employees: [...state.employees, action.payload],
      };
    
    case 'UPDATE_EMPLOYEE':
      return {
        ...state,
        employees: state.employees.map(emp =>
          emp.id === action.payload.id ? action.payload : emp
        ),
      };
    
    case 'DELETE_EMPLOYEE':
      return {
        ...state,
        employees: state.employees.filter(emp => emp.id !== action.payload),
      };
    
    case 'SET_SERIES':
      return { ...state, series: action.payload };
    
    case 'ADD_SERIES':
      return {
        ...state,
        series: [...state.series, action.payload],
      };
    
    case 'UPDATE_SERIES':
      return {
        ...state,
        series: state.series.map(ser =>
          ser.id === action.payload.id ? action.payload : ser
        ),
      };
    
    case 'DELETE_SERIES':
      return {
        ...state,
        series: state.series.filter(ser => ser.id !== action.payload),
      };
    
    case 'SET_PAYMENT_METHODS':
      return { ...state, paymentMethods: action.payload };
    
    case 'SET_CURRENCIES':
      return { ...state, currencies: action.payload };
    
    case 'SET_UNITS':
      return { ...state, units: action.payload };
    
    case 'SET_TAXES':
      return { ...state, taxes: action.payload };

    case 'SET_TAX_AFFECTATIONS':
      return { ...state, taxAffectations: action.payload };

    case 'SET_VOUCHER_DESIGNS':
      return { ...state, voucherDesigns: action.payload };

    case 'UPDATE_VOUCHER_DESIGN':
      return {
        ...state,
        voucherDesigns: state.voucherDesigns.map(design =>
          design.id === action.payload.id ? action.payload : design
        )
      };

    default:
      return state;
  }
}

interface ConfigurationContextType {
  state: ConfigurationState;
  dispatch: React.Dispatch<ConfigurationAction>;
}

const ConfigurationContext = createContext<ConfigurationContextType | undefined>(
  undefined
);

interface ConfigurationProviderProps {
  children: ReactNode;
}

export function ConfigurationProvider({ children }: ConfigurationProviderProps) {
  const [state, dispatch] = useReducer(configurationReducer, initialState);

  // Initialize with mock data for development
  useEffect(() => {
    // Mock currencies
    dispatch({
      type: 'SET_CURRENCIES',
      payload: [
        {
          id: '1',
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
          updatedAt: new Date()
        },
        {
          id: '2',
          code: 'USD',
          name: 'Dólar Americano',
          symbol: '$',
          symbolPosition: 'BEFORE',
          decimalPlaces: 2,
          exchangeRate: 3.75,
          isBaseCurrency: false,
          isActive: true,
          lastUpdated: new Date(),
          autoUpdate: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
    });

    // 8 FORMAS DE PAGO PREDETERMINADAS DEL SISTEMA
    // Estas son MAESTRAS y existen independientemente de la empresa
    dispatch({
      type: 'SET_PAYMENT_METHODS',
      payload: [
        // CONTADO - Efectivo
        {
          id: 'pm-efectivo',
          code: 'CONTADO',
          name: 'Efectivo',
          type: 'CASH',
          sunatCode: '001',
          sunatDescription: 'Pago al contado - Efectivo',
          configuration: {
            requiresReference: false,
            allowsPartialPayments: false,
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
            color: '#10B981',
            displayOrder: 1,
            isVisible: true,
            showInPos: true,
            showInInvoicing: true,
          },
          validation: {
            documentTypes: [],
            customerTypes: ['INDIVIDUAL', 'BUSINESS'],
            allowedCurrencies: ['PEN', 'USD'],
          },
          isDefault: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        // CONTADO - Yape
        {
          id: 'pm-yape',
          code: 'CONTADO',
          name: 'Yape',
          type: 'DIGITAL_WALLET',
          sunatCode: '001',
          sunatDescription: 'Pago al contado - Yape',
          configuration: {
            requiresReference: true,
            allowsPartialPayments: false,
            requiresValidation: false,
            hasCommission: false,
            requiresCustomerData: false,
            allowsCashBack: false,
            requiresSignature: false,
          },
          financial: {
            affectsCashFlow: true,
            settlementPeriod: 'IMMEDIATE',
          },
          display: {
            icon: 'Smartphone',
            color: '#722F8E',
            displayOrder: 2,
            isVisible: true,
            showInPos: true,
            showInInvoicing: true,
          },
          validation: {
            documentTypes: [],
            customerTypes: ['INDIVIDUAL', 'BUSINESS'],
            allowedCurrencies: ['PEN'],
          },
          isDefault: false,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        // CONTADO - Plin
        {
          id: 'pm-plin',
          code: 'CONTADO',
          name: 'Plin',
          type: 'DIGITAL_WALLET',
          sunatCode: '001',
          sunatDescription: 'Pago al contado - Plin',
          configuration: {
            requiresReference: true,
            allowsPartialPayments: false,
            requiresValidation: false,
            hasCommission: false,
            requiresCustomerData: false,
            allowsCashBack: false,
            requiresSignature: false,
          },
          financial: {
            affectsCashFlow: true,
            settlementPeriod: 'IMMEDIATE',
          },
          display: {
            icon: 'Smartphone',
            color: '#00D4AA',
            displayOrder: 3,
            isVisible: true,
            showInPos: true,
            showInInvoicing: true,
          },
          validation: {
            documentTypes: [],
            customerTypes: ['INDIVIDUAL', 'BUSINESS'],
            allowedCurrencies: ['PEN'],
          },
          isDefault: false,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        // CONTADO - Transferencia Bancaria
        {
          id: 'pm-transferencia',
          code: 'CONTADO',
          name: 'Transferencia',
          type: 'TRANSFER',
          sunatCode: '001',
          sunatDescription: 'Pago al contado - Transferencia bancaria',
          configuration: {
            requiresReference: true,
            allowsPartialPayments: false,
            requiresValidation: true,
            hasCommission: false,
            requiresCustomerData: false,
            allowsCashBack: false,
            requiresSignature: false,
          },
          financial: {
            affectsCashFlow: true,
            settlementPeriod: 'DAILY',
          },
          display: {
            icon: 'ArrowRightLeft',
            color: '#3B82F6',
            displayOrder: 4,
            isVisible: true,
            showInPos: true,
            showInInvoicing: true,
          },
          validation: {
            documentTypes: [],
            customerTypes: ['INDIVIDUAL', 'BUSINESS'],
            allowedCurrencies: ['PEN', 'USD'],
          },
          isDefault: false,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        // CONTADO - Tarjeta de Débito
        {
          id: 'pm-tarjeta-debito',
          code: 'CONTADO',
          name: 'Tarjeta de Débito',
          type: 'CARD',
          sunatCode: '001',
          sunatDescription: 'Pago al contado - Tarjeta de débito',
          configuration: {
            requiresReference: true,
            allowsPartialPayments: false,
            requiresValidation: true,
            hasCommission: true,
            requiresCustomerData: false,
            allowsCashBack: false,
            requiresSignature: true,
          },
          financial: {
            affectsCashFlow: true,
            settlementPeriod: 'DAILY',
          },
          display: {
            icon: 'CreditCard',
            color: '#6366F1',
            displayOrder: 5,
            isVisible: true,
            showInPos: true,
            showInInvoicing: true,
          },
          validation: {
            documentTypes: [],
            customerTypes: ['INDIVIDUAL', 'BUSINESS'],
            allowedCurrencies: ['PEN', 'USD'],
          },
          isDefault: false,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        // CONTADO - Tarjeta de Crédito
        {
          id: 'pm-tarjeta-credito',
          code: 'CONTADO',
          name: 'Tarjeta de Crédito',
          type: 'CARD',
          sunatCode: '001',
          sunatDescription: 'Pago al contado - Tarjeta de crédito',
          configuration: {
            requiresReference: true,
            allowsPartialPayments: false,
            requiresValidation: true,
            hasCommission: true,
            requiresCustomerData: false,
            allowsCashBack: false,
            requiresSignature: true,
          },
          financial: {
            affectsCashFlow: true,
            settlementPeriod: 'WEEKLY',
          },
          display: {
            icon: 'CreditCard',
            color: '#8B5CF6',
            displayOrder: 6,
            isVisible: true,
            showInPos: true,
            showInInvoicing: true,
          },
          validation: {
            documentTypes: [],
            customerTypes: ['INDIVIDUAL', 'BUSINESS'],
            allowedCurrencies: ['PEN', 'USD'],
          },
          isDefault: false,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        // CONTADO - Depósito Bancario
        {
          id: 'pm-deposito',
          code: 'CONTADO',
          name: 'Depósito Bancario',
          type: 'TRANSFER',
          sunatCode: '001',
          sunatDescription: 'Pago al contado - Depósito bancario',
          configuration: {
            requiresReference: true,
            allowsPartialPayments: false,
            requiresValidation: true,
            hasCommission: false,
            requiresCustomerData: false,
            allowsCashBack: false,
            requiresSignature: false,
          },
          financial: {
            affectsCashFlow: true,
            settlementPeriod: 'DAILY',
          },
          display: {
            icon: 'Building2',
            color: '#059669',
            displayOrder: 7,
            isVisible: true,
            showInPos: true,
            showInInvoicing: true,
          },
          validation: {
            documentTypes: [],
            customerTypes: ['INDIVIDUAL', 'BUSINESS'],
            allowedCurrencies: ['PEN', 'USD'],
          },
          isDefault: false,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        // CRÉDITO
        {
          id: 'pm-credito',
          code: 'CREDITO',
          name: 'Crédito',
          type: 'CREDIT',
          sunatCode: '002',
          sunatDescription: 'Pago al crédito',
          configuration: {
            requiresReference: true,
            allowsPartialPayments: true,
            requiresValidation: true,
            hasCommission: false,
            requiresCustomerData: true,
            allowsCashBack: false,
            requiresSignature: true,
          },
          financial: {
            affectsCashFlow: false,
            settlementPeriod: 'MONTHLY',
          },
          display: {
            icon: 'Calendar',
            color: '#F59E0B',
            displayOrder: 8,
            isVisible: true,
            showInPos: true,
            showInInvoicing: true,
          },
          validation: {
            documentTypes: ['01'],
            customerTypes: ['BUSINESS'],
            allowedCurrencies: ['PEN', 'USD'],
          },
          isDefault: false,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
    });

    // Initialize SUNAT units - Carga todas las unidades de medida del catálogo SUNAT
    const sunatUnitsWithDefaults: Unit[] = SUNAT_UNITS.map((sunatUnit, index) => ({
      id: `sunat-${sunatUnit.code}`,
      ...sunatUnit,
      isActive: true,
      isSystem: true,
      isFavorite: ['NIU', 'KGM', 'LTR', 'MTR', 'ZZ'].includes(sunatUnit.code), // Unidades favoritas por defecto
      isVisible: true,
      displayOrder: index,
      usageCount: ['NIU', 'KGM', 'LTR', 'MTR', 'ZZ'].includes(sunatUnit.code) ? 10 : 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    dispatch({
      type: 'SET_UNITS',
      payload: sunatUnitsWithDefaults
    });

    // Mock taxes - Using a basic structure that can be adapted
    // Note: The TaxesSection component uses a different interface (TaxConfiguration)
    // So we'll provide a minimal Tax object that matches the system model
    dispatch({
      type: 'SET_TAXES',
      payload: [
        {
          id: '1',
          code: 'IGV',
          name: 'Impuesto General a las Ventas',
          shortName: 'IGV',
          type: 'PERCENTAGE',
          rate: 18.0,
          sunatCode: '1000',
          sunatName: 'IGV - Impuesto General a las Ventas',
          sunatType: 'VAT',
          category: 'SALES',
          includeInPrice: true,
          isCompound: false,
          applicableTo: {
            products: true,
            services: true,
            both: true,
          },
          rules: {
            roundingMethod: 'ROUND',
            roundingPrecision: 2,
          },
          jurisdiction: {
            country: 'PE',
          },
          isDefault: true,
          isActive: true,
          validFrom: new Date('2011-03-01'),
          validTo: null,
          description: 'Impuesto General a las Ventas del 18%',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
    });

    // Mock employees with roles
    dispatch({
      type: 'SET_EMPLOYEES',
      payload: []  // Start empty - users can create their own employees
    });

    // Default voucher designs
    dispatch({
      type: 'SET_VOUCHER_DESIGNS',
      payload: [DEFAULT_A4_DESIGN, DEFAULT_TICKET_DESIGN]
    });
  }, []);

  return (
    <ConfigurationContext.Provider value={{ state, dispatch }}>
      {children}
    </ConfigurationContext.Provider>
  );
}

export function useConfigurationContext() {
  const context = useContext(ConfigurationContext);
  if (context === undefined) {
    throw new Error(
      'useConfigurationContext must be used within a ConfigurationProvider'
    );
  }
  return context;
}