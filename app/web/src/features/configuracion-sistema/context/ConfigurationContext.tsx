/* eslint-disable react-refresh/only-export-components -- archivo mezcla context y utilidades; split diferido */
import { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Company } from '../models/Company';
import type { Establishment } from '../models/Establishment';
import type { User } from '../models/User';
import type { Series } from '../models/Series';
import type { PaymentMethod } from '../models/PaymentMethod';
import type { Currency } from '../models/Currency';
import type { Unit } from '../models/Unit';
import type { Tax } from '../models/Tax';
import { PERU_TAX_TYPES, normalizeTaxes } from '../models/Tax';
import { SUNAT_UNITS } from '../models/Unit';
import type { Warehouse } from '../models/Warehouse';
import type { Caja } from '../models/Caja';
import { lsKey } from '../../../shared/tenant';
import { currencyManager } from '@/shared/currency';
import type { CurrencyCode } from '@/shared/currency';

// Category interface - moved from catalogo-articulos
export interface Category {
  id: string;
  nombre: string;
  descripcion?: string;
  color?: string;
  productCount: number;
  fechaCreacion: Date;
}

export type SalesPreferences = {
  allowNegativeStock: boolean;
  /**
   * Preferencia global: si los precios de lista incluyen IGV.
   * No depende del impuesto por defecto ni de su tasa (puede ser 0%).
   */
  pricesIncludeTax: boolean;
};

interface ConfigurationState {
  company: Company | null;
  establishments: Establishment[];
  warehouses: Warehouse[];
  employees: User[];
  series: Series[];
  paymentMethods: PaymentMethod[];
  currencies: Currency[];
  units: Unit[];
  taxes: Tax[];
  categories: Category[];
  cajas: Caja[];
  salesPreferences: SalesPreferences;
  isLoading: boolean;
  error: string | null;
}

const SERIES_STORAGE_KEY = 'config_series_v1';
const CONFIG_STORAGE_KEY = 'facturaFacilConfig';

const getSeriesStorageKey = () => {
  try {
    return lsKey(SERIES_STORAGE_KEY);
  } catch {
    return SERIES_STORAGE_KEY;
  }
};

const reviveDate = (value?: string | Date) => (value ? new Date(value) : undefined);

const reviveSeries = (series: Series): Series => ({
  ...series,
  createdAt: series.createdAt ? new Date(series.createdAt) : new Date(),
  updatedAt: series.updatedAt ? new Date(series.updatedAt) : new Date(),
  sunatConfiguration: series.sunatConfiguration
    ? {
        ...series.sunatConfiguration,
        authorizationDate: reviveDate(series.sunatConfiguration.authorizationDate),
        expiryDate: reviveDate(series.sunatConfiguration.expiryDate),
      }
    : series.sunatConfiguration,
  statistics: series.statistics
    ? {
        ...series.statistics,
        lastUsedDate: reviveDate(series.statistics.lastUsedDate),
        estimatedExhaustionDate: reviveDate(series.statistics.estimatedExhaustionDate),
      }
    : series.statistics,
});

const loadStoredSeries = (): Series[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getSeriesStorageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Series[];
    return parsed.map(reviveSeries);
  } catch (error) {
    console.warn('[Configuration] No se pudieron cargar las series guardadas:', error);
    return [];
  }
};

const persistSeries = (series: Series[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(getSeriesStorageKey(), JSON.stringify(series));
  } catch (error) {
    console.warn('[Configuration] No se pudieron guardar las series:', error);
  }
};

type PersistedConfigurationSnapshot = {
  sales?: {
    allowNegativeStock?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

const DEFAULT_SALES_PREFERENCES: SalesPreferences = {
  allowNegativeStock: true,
  pricesIncludeTax: true,
};

const getConfigurationStorageKeys = (): string[] => {
  const baseKey = CONFIG_STORAGE_KEY;
  let namespacedKey: string | null = null;

  try {
    namespacedKey = lsKey(CONFIG_STORAGE_KEY);
  } catch {
    namespacedKey = null;
  }

  if (!namespacedKey || namespacedKey === baseKey) {
    return [baseKey];
  }

  return [namespacedKey, baseKey];
};

const readPersistedConfiguration = (): PersistedConfigurationSnapshot | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const storageKeys = getConfigurationStorageKeys();
  for (const key of storageKeys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        return JSON.parse(raw) as PersistedConfigurationSnapshot;
      }
    } catch (error) {
      console.warn(`[Configuration] No se pudo leer el estado de ${key}:`, error);
    }
  }

  return null;
};

const persistConfigurationSnapshot = (snapshot: PersistedConfigurationSnapshot) => {
  if (typeof window === 'undefined') {
    return;
  }

  const storageKeys = getConfigurationStorageKeys();
  storageKeys.forEach((key) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(snapshot));
    } catch (error) {
      console.warn(`[Configuration] No se pudo guardar el estado en ${key}:`, error);
    }
  });
};

const loadSalesPreferencesFromStorage = (): SalesPreferences => {
  const persisted = readPersistedConfiguration();
  const allowNegativeStock =
    typeof persisted?.sales?.allowNegativeStock === 'boolean'
      ? persisted.sales.allowNegativeStock
      : DEFAULT_SALES_PREFERENCES.allowNegativeStock;

  const pricesIncludeTax =
    typeof (persisted?.sales as { pricesIncludeTax?: boolean } | undefined)?.pricesIncludeTax ===
    'boolean'
      ? (persisted!.sales as { pricesIncludeTax?: boolean }).pricesIncludeTax!
      : DEFAULT_SALES_PREFERENCES.pricesIncludeTax;

  return { allowNegativeStock, pricesIncludeTax };
};

const persistSalesPreferences = (preferences: SalesPreferences) => {
  if (typeof window === 'undefined') {
    return;
  }

  const currentSnapshot = readPersistedConfiguration() ?? {};
  const nextSnapshot: PersistedConfigurationSnapshot = {
    ...currentSnapshot,
    sales: {
      ...currentSnapshot.sales,
      allowNegativeStock: preferences.allowNegativeStock,
      pricesIncludeTax: preferences.pricesIncludeTax,
    },
  };

  persistConfigurationSnapshot(nextSnapshot);
};

type ConfigurationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_COMPANY'; payload: Company }
  | { type: 'SET_ESTABLISHMENTS'; payload: Establishment[] }
  | { type: 'ADD_ESTABLISHMENT'; payload: Establishment }
  | { type: 'UPDATE_ESTABLISHMENT'; payload: Establishment }
  | { type: 'DELETE_ESTABLISHMENT'; payload: string }
  | { type: 'SET_WAREHOUSES'; payload: Warehouse[] }
  | { type: 'ADD_WAREHOUSE'; payload: Warehouse }
  | { type: 'UPDATE_WAREHOUSE'; payload: Warehouse }
  | { type: 'DELETE_WAREHOUSE'; payload: string }
  | { type: 'SET_EMPLOYEES'; payload: User[] }
  | { type: 'ADD_EMPLOYEE'; payload: User }
  | { type: 'UPDATE_EMPLOYEE'; payload: User }
  | { type: 'DELETE_EMPLOYEE'; payload: string }
  | { type: 'SET_SERIES'; payload: Series[] }
  | { type: 'ADD_SERIES'; payload: Series }
  | { type: 'UPDATE_SERIES'; payload: Series }
  | { type: 'DELETE_SERIES'; payload: string }
  | { type: 'SET_PAYMENT_METHODS'; payload: PaymentMethod[] }
  | { type: 'SET_CURRENCIES'; payload: Currency[] }
  | { type: 'SET_UNITS'; payload: Unit[] }
  | { type: 'SET_TAXES'; payload: Tax[] }
  | { type: 'SET_CATEGORIES'; payload: Category[] }
  | { type: 'SET_CAJAS'; payload: Caja[] }
  | { type: 'ADD_CAJA'; payload: Caja }
  | { type: 'UPDATE_CAJA'; payload: Caja }
  | { type: 'DELETE_CAJA'; payload: string }
  | { type: 'SET_SALES_PREFERENCES'; payload: SalesPreferences };

const initialState: ConfigurationState = {
  company: null,
  establishments: [],
  warehouses: [],
  employees: [],
  series: [],
  paymentMethods: [],
  currencies: [],
  units: [],
  taxes: [],
  categories: [],
  cajas: [],
  salesPreferences: DEFAULT_SALES_PREFERENCES,
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

    case 'SET_WAREHOUSES':
      return { ...state, warehouses: action.payload };

    case 'ADD_WAREHOUSE':
      return {
        ...state,
        warehouses: [...state.warehouses, action.payload],
      };

    case 'UPDATE_WAREHOUSE':
      return {
        ...state,
        warehouses: state.warehouses.map(wh =>
          wh.id === action.payload.id ? action.payload : wh
        ),
      };

    case 'DELETE_WAREHOUSE':
      return {
        ...state,
        warehouses: state.warehouses.filter(wh => wh.id !== action.payload),
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
      return { ...state, taxes: normalizeTaxes(action.payload) };

    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };

    case 'SET_CAJAS':
      return { ...state, cajas: action.payload };

    case 'ADD_CAJA':
      return {
        ...state,
        cajas: [...state.cajas, action.payload]
      };

    case 'UPDATE_CAJA':
      return {
        ...state,
        cajas: state.cajas.map(caja =>
          caja.id === action.payload.id ? action.payload : caja
        )
      };

    case 'DELETE_CAJA':
      return {
        ...state,
        cajas: state.cajas.filter(caja => caja.id !== action.payload)
      };

    case 'SET_SALES_PREFERENCES':
      return {
        ...state,
        salesPreferences: action.payload,
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
  const [state, rawDispatch] = useReducer(
    configurationReducer,
    initialState,
    (baseState) => ({
      ...baseState,
      currencies: currencyManager.getSnapshot().currencies,
      salesPreferences: loadSalesPreferencesFromStorage(),
    }),
  );
  const seriesHydratedRef = useRef(false);
  const dispatch = useCallback((action: ConfigurationAction) => {
    if (action.type === 'SET_CURRENCIES') {
      currencyManager.setCurrencies(action.payload);
      return;
    }
    rawDispatch(action);
  }, [rawDispatch]);

  useEffect(() => {
    const unsubscribe = currencyManager.subscribe(() => {
      rawDispatch({ type: 'SET_CURRENCIES', payload: currencyManager.getSnapshot().currencies });
    });
    return unsubscribe;
  }, [rawDispatch]);

  useEffect(() => {
    const companyBaseCurrency = state.company?.baseCurrency;
    if (!companyBaseCurrency) {
      return;
    }
    currencyManager.setBaseCurrency(companyBaseCurrency as CurrencyCode);
  }, [state.company?.baseCurrency]);

  useEffect(() => {
    const storedSeries = loadStoredSeries();
    if (storedSeries.length) {
      dispatch({ type: 'SET_SERIES', payload: storedSeries });
    }
    seriesHydratedRef.current = true;
  }, [dispatch]);

  useEffect(() => {
    if (!seriesHydratedRef.current) return;
    persistSeries(state.series);
  }, [state.series]);

  useEffect(() => {
    persistSalesPreferences(state.salesPreferences);
  }, [state.salesPreferences]);

  // Initialize with mock data for development
  useEffect(() => {
    // 8 FORMAS DE PAGO PREDETERMINADAS DEL SISTEMA
    // Estas son MAESTRAS y existen independientemente de la empresa
    dispatch({
      type: 'SET_PAYMENT_METHODS',
      payload: [
        // CONTADO - Efectivo (mantener)
        {
          id: 'pm-efectivo',
          code: 'CONTADO',
          name: 'Contado',
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

    // Mock taxes aligned with canonical PERU_TAX_TYPES definitions
    const now = new Date();
    const defaultCodes = ['IGV18', 'IGV10', 'EXO', 'INA', 'IGV_EXP'];
    const defaultTaxes: Tax[] = PERU_TAX_TYPES
      .filter((tax) => defaultCodes.includes(tax.code))
      .map((tax, index) => ({
        ...tax,
        id: tax.code ?? `tax-${index + 1}`,
        // Semánticamente includeInPrice es una preferencia global; aquí solo se inicializa.
        includeInPrice: true,
        isDefault: tax.code === 'IGV18',
        createdAt: now,
        updatedAt: now,
      }));

    dispatch({
      type: 'SET_TAXES',
      payload: defaultTaxes,
    });

    // Mock employees with roles
    dispatch({
      type: 'SET_EMPLOYEES',
      payload: []  // Start empty - users can create their own employees
    });

    // No se inicializan warehouses por defecto
    // Se crearán automáticamente cuando se cree el establecimiento por defecto
  }, [dispatch]);

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