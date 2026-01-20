/* eslint-disable react-refresh/only-export-components -- archivo mezcla context y utilidades; split diferido */
import { createContext, useContext, useReducer, useEffect, useRef, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Company } from '../modelos/Company';
import type { Establecimiento } from '../modelos/Establecimiento';
import type { User } from '../modelos/User';
import type { Series } from '../modelos/Series';
import type { PaymentMethod } from '../modelos/PaymentMethod';
import type { Currency } from '../modelos/Currency';
import type { Unit } from '../modelos/Unit';
import type { Tax } from '../modelos/Tax';
import { PERU_TAX_TYPES, normalizeTaxes } from '../modelos/Tax';
import { SUNAT_UNITS } from '../modelos/Unit';
import type { Almacen } from '../modelos/Almacen';
import type { Caja } from '../modelos/Caja';
import { lsKey } from '../../../../../shared/tenant';
import { useTenant } from '../../../../../shared/tenant/TenantContext';
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
  Establecimientos: Establecimiento[];
  almacenes: Almacen[];
  users: User[];
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

const LLAVE_ALMACENAMIENTO_SERIES = 'config_series_v1';
const LLAVE_ALMACENAMIENTO_CONFIGURACION = 'facturaFacilConfig';

type StorageKey = string | null;

const reviveDate = (value?: string | Date) => (value ? new Date(value) : undefined);

type PersistedCaja = Caja | (Partial<Caja> & Record<string, unknown>);

type RawTenantConfig = {
  version: 1;
  company: Company | null;
  Establecimientos: Establecimiento[];
  almacenes: Almacen[];
  cajas: PersistedCaja[];
  salesPreferences: SalesPreferences;
};

type PersistedTenantConfig = {
  version: 1;
  company: Company | null;
  Establecimientos: Establecimiento[];
  almacenes: Almacen[];
  cajas: Caja[];
  salesPreferences: SalesPreferences;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const reviveCompany = (company: Company): Company => {
  const certificadoDigital = company.certificadoDigital
    ? {
        ...company.certificadoDigital,
        fechaVencimientoCertificado: reviveDate(company.certificadoDigital.fechaVencimientoCertificado),
      }
    : company.certificadoDigital;

  const configuracionSunatEmpresa = company.configuracionSunatEmpresa
    ? {
        ...company.configuracionSunatEmpresa,
        fechaUltimaSincronizacionSunat: reviveDate(
          company.configuracionSunatEmpresa.fechaUltimaSincronizacionSunat,
        ),
      }
    : company.configuracionSunatEmpresa;

  return {
    ...company,
    creadoEl: reviveDate(company.creadoEl) ?? new Date(),
    actualizadoEl: reviveDate(company.actualizadoEl) ?? new Date(),
    certificadoDigital,
    configuracionSunatEmpresa,
  };
};

const reviveEstablecimiento = (est: Establecimiento): Establecimiento => ({
  ...est,
  createdAt: reviveDate(est.createdAt) ?? new Date(),
  updatedAt: reviveDate(est.updatedAt) ?? new Date(),
  sunatConfiguration: est.sunatConfiguration
    ? {
        ...est.sunatConfiguration,
        registrationDate: reviveDate(est.sunatConfiguration.registrationDate),
      }
    : est.sunatConfiguration,
});

const reviveAlmacen = (raw: Almacen | (Partial<Almacen> & Record<string, unknown>)): Almacen => {
  const legacy = raw as Record<string, unknown>;
  const legacyInventory = legacy.inventorySettings as Record<string, unknown> | undefined;
  const canonicalInventory = (raw as Almacen).configuracionInventarioAlmacen;

  const resolvedConfig = canonicalInventory ?? {
    permiteStockNegativoAlmacen: Boolean(legacy.permiteStockNegativoAlmacen ?? legacyInventory?.allowNegativeStock ?? false),
    controlEstrictoStock: Boolean(legacy.controlEstrictoStock ?? legacyInventory?.strictStockControl ?? false),
    requiereAprobacionMovimientos: Boolean(legacy.requiereAprobacionMovimientos ?? legacyInventory?.requireApproval ?? false),
    capacidadMaxima: (legacy.capacidadMaxima as number | undefined) ?? (legacyInventory?.maxCapacity as number | undefined),
    unidadCapacidad: (legacy.unidadCapacidad as 'units' | 'm3' | 'm2' | undefined)
      ?? (legacyInventory?.capacityUnit as 'units' | 'm3' | 'm2' | undefined),
  };

  return {
    id: (raw as Almacen).id ?? (legacy.id as string) ?? '',
    codigoAlmacen: (raw as Almacen).codigoAlmacen
      ?? (legacy.codigoAlmacen as string)
      ?? (legacy.code as string)
      ?? '',
    nombreAlmacen: (raw as Almacen).nombreAlmacen
      ?? (legacy.nombreAlmacen as string)
      ?? (legacy.name as string)
      ?? '',
    establecimientoId: (raw as Almacen).establecimientoId
      ?? (legacy.establecimientoId as string)
      ?? (legacy.EstablecimientoId as string)
      ?? (legacy.establishmentId as string)
      ?? '',
    nombreEstablecimientoDesnormalizado:
      (raw as Almacen).nombreEstablecimientoDesnormalizado
      ?? (legacy.nombreEstablecimientoDesnormalizado as string | undefined)
      ?? (legacy.EstablecimientoName as string | undefined)
      ?? (legacy.establishmentName as string | undefined),
    codigoEstablecimientoDesnormalizado:
      (raw as Almacen).codigoEstablecimientoDesnormalizado
      ?? (legacy.codigoEstablecimientoDesnormalizado as string | undefined)
      ?? (legacy.EstablecimientoCode as string | undefined)
      ?? (legacy.establishmentCode as string | undefined),
    descripcionAlmacen:
      (raw as Almacen).descripcionAlmacen
      ?? (legacy.descripcionAlmacen as string | undefined)
      ?? (legacy.description as string | undefined),
    ubicacionAlmacen:
      (raw as Almacen).ubicacionAlmacen
      ?? (legacy.ubicacionAlmacen as string | undefined)
      ?? (legacy.location as string | undefined),
    estaActivoAlmacen:
      (raw as Almacen).estaActivoAlmacen
      ?? (legacy.estaActivoAlmacen as boolean | undefined)
      ?? (legacy.isActive as boolean | undefined)
      ?? true,
    esAlmacenPrincipal:
      (raw as Almacen).esAlmacenPrincipal
      ?? (legacy.esAlmacenPrincipal as boolean | undefined)
      ?? (legacy.isMainalmacen as boolean | undefined)
      ?? (legacy.isMainWarehouse as boolean | undefined)
      ?? false,
    configuracionInventarioAlmacen: {
      permiteStockNegativoAlmacen:
        canonicalInventory?.permiteStockNegativoAlmacen
          ?? resolvedConfig.permiteStockNegativoAlmacen,
      controlEstrictoStock:
        canonicalInventory?.controlEstrictoStock
          ?? resolvedConfig.controlEstrictoStock,
      requiereAprobacionMovimientos:
        canonicalInventory?.requiereAprobacionMovimientos
          ?? resolvedConfig.requiereAprobacionMovimientos,
      capacidadMaxima:
        canonicalInventory?.capacidadMaxima
          ?? resolvedConfig.capacidadMaxima,
      unidadCapacidad:
        canonicalInventory?.unidadCapacidad
          ?? resolvedConfig.unidadCapacidad,
    },
    creadoElAlmacen:
      reviveDate((raw as Almacen).creadoElAlmacen ?? (legacy.createdAt as Date | string | undefined))
        ?? new Date(),
    actualizadoElAlmacen:
      reviveDate((raw as Almacen).actualizadoElAlmacen ?? (legacy.updatedAt as Date | string | undefined))
        ?? new Date(),
    creadoPor: (raw as Almacen).creadoPor ?? (legacy.creadoPor as string | undefined) ?? (legacy.createdBy as string | undefined),
    actualizadoPor:
      (raw as Almacen).actualizadoPor
        ?? (legacy.actualizadoPor as string | undefined)
        ?? (legacy.updatedBy as string | undefined),
    tieneMovimientosInventario:
      (raw as Almacen).tieneMovimientosInventario
      ?? (legacy.tieneMovimientosInventario as boolean | undefined)
      ?? (legacy.hasMovements as boolean | undefined)
      ?? false,
  };
};

const reviveCaja = (caja: PersistedCaja): Caja => {
  const legacy = caja as Partial<Caja> & Record<string, unknown>;
  return {
    ...caja,
    establecimientoIdCaja: (caja.establecimientoIdCaja as string) ?? (legacy.establecimientoId as string) ?? '',
    nombreCaja: (caja.nombreCaja as string) ?? (legacy.nombre as string) ?? '',
    monedaIdCaja: (caja.monedaIdCaja as string) ?? (legacy.monedaId as string) ?? '',
    limiteMaximoCaja: (caja.limiteMaximoCaja as number) ?? (legacy.limiteMaximo as number) ?? 0,
    margenDescuadreCaja: (caja.margenDescuadreCaja as number) ?? (legacy.margenDescuadre as number) ?? 0,
    habilitadaCaja:
      typeof caja.habilitadaCaja === 'boolean'
        ? caja.habilitadaCaja
        : typeof legacy.habilitada === 'boolean'
          ? (legacy.habilitada as boolean)
          : false,
    usuariosAutorizadosCaja:
      (caja.usuariosAutorizadosCaja as string[] | undefined)
        ?? (legacy.usuariosAutorizados as string[] | undefined)
        ?? [],
    dispositivosCaja:
      (caja.dispositivosCaja as Caja['dispositivosCaja'])
        ?? (legacy.dispositivos as Caja['dispositivosCaja']),
    observacionesCaja: (caja.observacionesCaja as string | undefined) ?? (legacy.observaciones as string | undefined),
    tieneHistorialMovimientos:
      typeof caja.tieneHistorialMovimientos === 'boolean'
        ? caja.tieneHistorialMovimientos
        : typeof legacy.tieneHistorial === 'boolean'
          ? (legacy.tieneHistorial as boolean)
          : false,
    creadoElCaja:
      reviveDate((caja.creadoElCaja as Date | string | undefined) ?? (legacy.createdAt as Date | string | undefined))
        ?? new Date(),
    actualizadoElCaja:
      reviveDate((caja.actualizadoElCaja as Date | string | undefined) ?? (legacy.updatedAt as Date | string | undefined))
        ?? new Date(),
  } as Caja;
};

const reviveTenantConfig = (config: RawTenantConfig): PersistedTenantConfig => ({
  ...config,
  company: config.company ? reviveCompany(config.company) : null,
  Establecimientos: config.Establecimientos.map(reviveEstablecimiento),
  almacenes: config.almacenes.map(reviveAlmacen),
  cajas: config.cajas.map(reviveCaja),
});

const isRawTenantConfig = (value: unknown): value is RawTenantConfig => {
  if (!isRecord(value)) return false;
  if (value.version !== 1) return false;

  const hasArrays =
    Array.isArray(value.Establecimientos) &&
    Array.isArray(value.almacenes) &&
    Array.isArray(value.cajas);

  const prefs = value.salesPreferences;
  const hasPrefs =
    isRecord(prefs) &&
    typeof prefs.allowNegativeStock === 'boolean' &&
    typeof prefs.pricesIncludeTax === 'boolean';

  const company = value.company;
  const hasCompany = company === null || isRecord(company);

  return hasArrays && hasPrefs && hasCompany;
};

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

const loadStoredSeries = (storageKey: StorageKey): Series[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  if (!storageKey) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Series[];
    return parsed.map(reviveSeries);
  } catch (error) {
    console.warn('[Configuration] No se pudieron cargar las series guardadas:', error);
    return [];
  }
};

const persistSeries = (storageKey: StorageKey, series: Series[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!storageKey) {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(series));
  } catch (error) {
    console.warn('[Configuration] No se pudieron guardar las series:', error);
  }
};

const PREFERENCIAS_VENTAS_PREDETERMINADAS: SalesPreferences = {
  allowNegativeStock: true,
  pricesIncludeTax: true,
};

const loadTenantConfigFromStorage = (storageKey: StorageKey): PersistedTenantConfig | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!storageKey) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isRawTenantConfig(parsed)) {
      return null;
    }

    return reviveTenantConfig(parsed);
  } catch (error) {
    console.warn(`[Configuration] No se pudo leer el snapshot de tenant en ${storageKey}:`, error);
    return null;
  }
};

const loadSalesPreferencesFromStorage = (storageKey: StorageKey): SalesPreferences => {
  const tenantConfig = loadTenantConfigFromStorage(storageKey);
  if (tenantConfig) {
    return tenantConfig.salesPreferences;
  }

  // Legacy (baseKey global): solo lectura por migración.
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(LLAVE_ALMACENAMIENTO_CONFIGURACION);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (isRecord(parsed) && isRecord(parsed.sales)) {
          const sales = parsed.sales as Record<string, unknown>;
          const allowNegativeStock =
            typeof sales.allowNegativeStock === 'boolean'
              ? sales.allowNegativeStock
              : PREFERENCIAS_VENTAS_PREDETERMINADAS.allowNegativeStock;
          const pricesIncludeTax =
            typeof sales.pricesIncludeTax === 'boolean'
              ? sales.pricesIncludeTax
              : PREFERENCIAS_VENTAS_PREDETERMINADAS.pricesIncludeTax;
          return { allowNegativeStock, pricesIncludeTax };
        }
      }
    } catch {
      // ignore
    }
  }

  return PREFERENCIAS_VENTAS_PREDETERMINADAS;
};

const persistTenantSnapshot = (storageKey: StorageKey, snapshot: PersistedTenantConfig) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!storageKey) {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
  } catch (error) {
    console.warn(`[Configuration] No se pudo guardar el snapshot de tenant en ${storageKey}:`, error);
  }
};

type ConfigurationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_COMPANY'; payload: Company }
  | { type: 'SET_EstablecimientoS'; payload: Establecimiento[] }
  | { type: 'ADD_Establecimiento'; payload: Establecimiento }
  | { type: 'UPDATE_Establecimiento'; payload: Establecimiento }
  | { type: 'DELETE_Establecimiento'; payload: string }
  | { type: 'SET_ALMACENES'; payload: Almacen[] }
  | { type: 'ADD_ALMACEN'; payload: Almacen }
  | { type: 'UPDATE_ALMACEN'; payload: Almacen }
  | { type: 'DELETE_ALMACEN'; payload: string }
  | { type: 'SET_USERS'; payload: User[] }
  | { type: 'ADD_USER'; payload: User }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'DELETE_USER'; payload: string }
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
  Establecimientos: [],
  almacenes: [],
  users: [],
  series: [],
  paymentMethods: [],
  currencies: [],
  units: [],
  taxes: [],
  categories: [],
  cajas: [],
  salesPreferences: PREFERENCIAS_VENTAS_PREDETERMINADAS,
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
    
    case 'SET_EstablecimientoS':
      return { ...state, Establecimientos: action.payload };
    
    case 'ADD_Establecimiento':
      return {
        ...state,
        Establecimientos: [...state.Establecimientos, action.payload],
      };
    
    case 'UPDATE_Establecimiento':
      return {
        ...state,
        Establecimientos: state.Establecimientos.map(est =>
          est.id === action.payload.id ? action.payload : est
        ),
      };
    
    case 'DELETE_Establecimiento':
      return {
        ...state,
        Establecimientos: state.Establecimientos.filter(est => est.id !== action.payload),
      };

    case 'SET_ALMACENES':
      return { ...state, almacenes: action.payload };

    case 'ADD_ALMACEN':
      return {
        ...state,
        almacenes: [...state.almacenes, action.payload],
      };

    case 'UPDATE_ALMACEN':
      return {
        ...state,
        almacenes: state.almacenes.map(wh =>
          wh.id === action.payload.id ? action.payload : wh
        ),
      };

    case 'DELETE_ALMACEN':
      return {
        ...state,
        almacenes: state.almacenes.filter(wh => wh.id !== action.payload),
      };

    case 'SET_USERS':
      return { ...state, users: action.payload };
    
    case 'ADD_USER':
      return {
        ...state,
        users: [...state.users, action.payload],
      };
    
    case 'UPDATE_USER':
      return {
        ...state,
        users: state.users.map(user =>
          user.id === action.payload.id ? action.payload : user
        ),
      };
    
    case 'DELETE_USER':
      return {
        ...state,
        users: state.users.filter(user => user.id !== action.payload),
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

type ConfigurationContextState = ConfigurationState & { almacenes: Almacen[] };

interface ConfigurationContextType {
  state: ConfigurationContextState;
  dispatch: React.Dispatch<ConfigurationAction>;
}

const ConfigurationContext = createContext<ConfigurationContextType | undefined>(
  undefined
);

interface ConfigurationProviderProps {
  children: ReactNode;
  tenantIdOverride?: string | null;
}

export function ConfigurationProvider({ children, tenantIdOverride }: ConfigurationProviderProps) {
  const { tenantId: activeTenantId } = useTenant();
  const tenantId = tenantIdOverride ?? activeTenantId;
  const seriesStorageKey = useMemo<StorageKey>(() => {
    if (!tenantId) return null;
    return lsKey(LLAVE_ALMACENAMIENTO_SERIES, tenantId);
  }, [tenantId]);

  const tenantConfigKey = useMemo<StorageKey>(() => {
    if (!tenantId) return null;
    return lsKey(LLAVE_ALMACENAMIENTO_CONFIGURACION, tenantId);
  }, [tenantId]);

  const initialSalesPreferences = useMemo(
    () => loadSalesPreferencesFromStorage(tenantConfigKey),
    [tenantConfigKey]
  );

  const [state, rawDispatch] = useReducer(
    configurationReducer,
    initialState,
    (baseState) => ({
      ...baseState,
      currencies: currencyManager.getSnapshot().currencies,
      salesPreferences: initialSalesPreferences,
    }),
  );

  const tenantHydratedRef = useRef(false);

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
    if (!tenantId) {
      tenantHydratedRef.current = true;
      return;
    }

    const persisted = loadTenantConfigFromStorage(tenantConfigKey);
    if (persisted) {
      if (persisted.company) {
        dispatch({ type: 'SET_COMPANY', payload: persisted.company });
      }
      dispatch({ type: 'SET_EstablecimientoS', payload: persisted.Establecimientos });
      dispatch({ type: 'SET_ALMACENES', payload: persisted.almacenes });
      dispatch({ type: 'SET_CAJAS', payload: persisted.cajas });
      dispatch({ type: 'SET_SALES_PREFERENCES', payload: persisted.salesPreferences });
    }

    tenantHydratedRef.current = true;
  }, [dispatch, tenantConfigKey, tenantId]);

  useEffect(() => {
    const companyBaseCurrency = state.company?.monedaBase;
    if (!companyBaseCurrency) {
      return;
    }
    currencyManager.setBaseCurrency(companyBaseCurrency as CurrencyCode);
  }, [state.company?.monedaBase]);

  useEffect(() => {
    if (!tenantId) {
      seriesHydratedRef.current = true;
      return;
    }

    const storedSeries = loadStoredSeries(seriesStorageKey);
    if (storedSeries.length) {
      dispatch({ type: 'SET_SERIES', payload: storedSeries });
    }
    seriesHydratedRef.current = true;
  }, [dispatch, seriesStorageKey, tenantId]);

  useEffect(() => {
    if (!seriesHydratedRef.current) return;
    if (!tenantId) return;
    persistSeries(seriesStorageKey, state.series);
  }, [seriesStorageKey, state.series, tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    if (!tenantHydratedRef.current) return;

    const hasMeaningfulConfig =
      Boolean(state.company) ||
      state.Establecimientos.length > 0 ||
      state.almacenes.length > 0 ||
      state.cajas.length > 0 ||
      state.salesPreferences.allowNegativeStock !== PREFERENCIAS_VENTAS_PREDETERMINADAS.allowNegativeStock ||
      state.salesPreferences.pricesIncludeTax !== PREFERENCIAS_VENTAS_PREDETERMINADAS.pricesIncludeTax;

    if (!hasMeaningfulConfig) {
      return;
    }

    const snapshot: PersistedTenantConfig = {
      version: 1,
      company: state.company,
      Establecimientos: state.Establecimientos,
      almacenes: state.almacenes,
      cajas: state.cajas,
      salesPreferences: state.salesPreferences,
    };

    persistTenantSnapshot(tenantConfigKey, snapshot);
  }, [
    state.cajas,
    state.company,
    state.Establecimientos,
    state.salesPreferences,
    state.almacenes,
    tenantConfigKey,
    tenantId,
  ]);

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

    // Mock users with roles
    dispatch({
      type: 'SET_USERS',
      payload: []  // Start empty - users can create their own users
    });

    // No se inicializan almacenes por defecto
    // Se crearán automáticamente cuando se cree el establecimiento por defecto
  }, [dispatch]);

  const stateWithLegacy = useMemo<ConfigurationContextState>(
    () => ({
      ...state,
      almacenes: state.almacenes,
    }),
    [state]
  );

  return (
    <ConfigurationContext.Provider value={{ state: stateWithLegacy, dispatch }}>
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

