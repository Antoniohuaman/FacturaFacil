/* eslint-disable react-refresh/only-export-components -- archivo mezcla context y utilidades; split diferido */
import { createContext, useContext, useReducer, useEffect, useRef, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Company } from '../modelos/Company';
import type { Establecimiento } from '../modelos/Establecimiento';
import type { User } from '../modelos/User';
import type { Series } from '../modelos/Series';
import type { PaymentMethod } from '../modelos/PaymentMethod';
import type { Currency } from '../modelos/Currency';
import type { Unit } from '../modelos';
import type { Tax } from '../modelos/Tax';
import { PERU_TAX_TYPES, normalizeTaxes } from '../modelos/Tax';
import { normalizeUnitsWithCatalog } from '../modelos';
import type { Almacen } from '../modelos/Almacen';
import type { Caja, CreateCajaInput } from '../modelos/Caja';
import { CAJA_CONSTRAINTS, MEDIOS_PAGO_DISPONIBLES } from '../modelos/Caja';
import { ID_ROL_ADMINISTRADOR, ROLES_DEL_SISTEMA } from '../roles/rolesDelSistema';
import { cajasDataSource } from '../api/fuenteDatosCajas';
import { buildMissingDefaultSeries } from '../utilidades/seriesPredeterminadas';
import { parseUbigeoCode } from '../datos/ubigeo';
import {
  construirNombreCompleto,
  construirRolesSistema,
  mapearSesionAUsuarioConfiguracion,
  normalizarCorreo,
  normalizarUsuario,
  obtenerAsignacionEmpresa,
  obtenerAsignacionesActualizadas,
  obtenerAsignacionesUsuario,
  obtenerEstadoUsuarioPorAsignaciones,
  obtenerEstablecimientosIdsAsignacion,
  obtenerEstablecimientosUnicos,
  obtenerIdsRolesUnicos,
  obtenerRolesPorEstablecimientoAsignacion,
  unirIdsUnicos,
} from '../utilidades/usuariosAsignaciones';
import { generateWorkspaceId, lsKey } from '../../../../../shared/tenant';
import { useTenant } from '../../../../../shared/tenant/TenantContext';
import { currencyManager } from '@/shared/currency';
import type { CurrencyCode } from '@/shared/currency';
import { useUserSession } from '@/contexts/UserSessionContext';
import { useTenantStore } from '../../autenticacion/store/TenantStore';
import { EmpresaStatus, RegimenTributario, type Empresa as EmpresaTenant, type WorkspaceContext } from '../../autenticacion/types/auth.types';

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

type DatosConfiguracionInicialEmpresa = {
  direccionFiscal: string;
  ubigeo: string;
  entornoSunat: 'TEST' | 'PRODUCTION';
  telefonos: string[];
  correosElectronicos: string[];
  actividadEconomica: string;
};

type ResultadoConfiguracionInicialEmpresa = {
  establecimiento: Establecimiento;
  almacen: Almacen;
  series: Series[];
  monedas: Currency[];
  impuestos: Tax[];
};

type ParametrosConfiguracionInicialEmpresa = {
  empresa: Company;
  datos: DatosConfiguracionInicialEmpresa;
  seriesExistentes: Series[];
  monedasExistentes: Currency[];
  impuestosExistentes: Tax[];
};

export const construirConfiguracionInicialEmpresa = ({
  empresa,
  datos,
  seriesExistentes,
  monedasExistentes,
  impuestosExistentes,
}: ParametrosConfiguracionInicialEmpresa): ResultadoConfiguracionInicialEmpresa => {
  const ubicacion = parseUbigeoCode(datos.ubigeo);
  const telefonosLimpios = datos.telefonos.filter((telefono) => telefono.trim() !== '');
  const correosLimpios = datos.correosElectronicos.filter((correo) => correo.trim() !== '');
  const ahora = new Date();

  const establecimiento: Establecimiento = {
    id: 'est-main',
    codigoEstablecimiento: '0001',
    nombreEstablecimiento: 'Establecimiento',
    direccionEstablecimiento: datos.direccionFiscal,
    distritoEstablecimiento: ubicacion?.district || 'Lima',
    provinciaEstablecimiento: ubicacion?.province || 'Lima',
    departamentoEstablecimiento: ubicacion?.department || 'Lima',
    codigoPostalEstablecimiento: datos.ubigeo,
    phone: telefonosLimpios[0],
    email: correosLimpios[0],
    isMainEstablecimiento: true,
    businessHours: {
      monday: { isOpen: true, openTime: '09:00', closeTime: '18:00', is24Hours: false },
      tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00', is24Hours: false },
      wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00', is24Hours: false },
      thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00', is24Hours: false },
      friday: { isOpen: true, openTime: '09:00', closeTime: '18:00', is24Hours: false },
      saturday: { isOpen: true, openTime: '09:00', closeTime: '13:00', is24Hours: false },
      sunday: { isOpen: false, openTime: '00:00', closeTime: '00:00', is24Hours: false },
    },
    sunatConfiguration: {
      isRegistered: true,
      registrationDate: ahora,
      annexCode: '0000',
      economicActivity: empresa.actividadEconomica || 'Comercio',
    },
    posConfiguration: {
      hasPos: true,
      terminalCount: 1,
      printerConfiguration: {
        hasPrinter: false,
        printerType: 'THERMAL',
        paperSize: 'TICKET_80MM',
        isNetworkPrinter: false,
      },
      cashDrawerConfiguration: {
        hasCashDrawer: false,
        openMethod: 'MANUAL',
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
      autoTransferStock: false,
    },
    financialConfiguration: {
      handlesCash: true,
      defaultCurrencyId: 'PEN',
      acceptedCurrencies: ['PEN', 'USD'],
      defaultTaxId: 'IGV',
      bankAccounts: [],
    },
    estadoEstablecimiento: 'ACTIVE',
    creadoElEstablecimiento: ahora,
    actualizadoElEstablecimiento: ahora,
    estaActivoEstablecimiento: true,
  };

  const almacen: Almacen = {
    id: 'alm-main',
    codigoAlmacen: '0001',
    nombreAlmacen: 'Almacén',
    establecimientoId: establecimiento.id,
    nombreEstablecimientoDesnormalizado: establecimiento.nombreEstablecimiento,
    codigoEstablecimientoDesnormalizado: establecimiento.codigoEstablecimiento,
    descripcionAlmacen: 'Almacén principal de la empresa',
    ubicacionAlmacen: establecimiento.direccionEstablecimiento || undefined,
    estaActivoAlmacen: true,
    esAlmacenPrincipal: true,
    configuracionInventarioAlmacen: {
      permiteStockNegativoAlmacen: false,
      controlEstrictoStock: false,
      requiereAprobacionMovimientos: false,
    },
    creadoElAlmacen: ahora,
    actualizadoElAlmacen: ahora,
    tieneMovimientosInventario: false,
  };

  const tipoEntornoSunat = datos.entornoSunat === 'TEST' ? 'TESTING' : 'PRODUCTION';
  const series = buildMissingDefaultSeries({
    EstablecimientoId: establecimiento.id,
    environmentType: tipoEntornoSunat,
    existingSeries: seriesExistentes,
  });

  const monedas: Currency[] = monedasExistentes.length
    ? []
    : [
        {
          id: 'PEN',
          code: 'PEN',
          name: 'Sol Peruano',
          symbol: 'S/',
          symbolPosition: 'BEFORE',
          decimalPlaces: 2,
          isBaseCurrency: true,
          exchangeRate: 1.0,
          isActive: true,
          lastUpdated: ahora,
          autoUpdate: false,
          createdAt: ahora,
          updatedAt: ahora,
        },
        {
          id: 'USD',
          code: 'USD',
          name: 'Dólar Americano',
          symbol: '$',
          symbolPosition: 'BEFORE',
          decimalPlaces: 2,
          isBaseCurrency: false,
          exchangeRate: 3.70,
          isActive: true,
          lastUpdated: ahora,
          autoUpdate: true,
          createdAt: ahora,
          updatedAt: ahora,
        },
      ];

  const impuestos: Tax[] = impuestosExistentes.length
    ? []
    : PERU_TAX_TYPES
        .filter((tax) => ['IGV18', 'IGV10', 'EXO', 'INA', 'IGV_EXP'].includes(tax.code))
        .map((tax) => ({
          ...tax,
          id: tax.code,
          includeInPrice: true,
          isDefault: tax.code === 'IGV18',
          createdAt: ahora,
          updatedAt: ahora,
        }));

  return {
    establecimiento,
    almacen,
    series,
    monedas,
    impuestos,
  };
};

type ParametrosConfiguracionOperativaPredeterminada = {
  empresa: Company | null;
  Establecimiento: Establecimiento | null;
  userId: string | null;
  estadoConfiguracion: {
    cajas: Caja[];
    currencies: Currency[];
  };
  dispatch: (action: { type: 'ADD_CAJA' | 'UPDATE_CAJA'; payload: Caja }) => void;
};

export async function asegurarConfiguracionOperativaPredeterminada({
  empresa,
  Establecimiento,
  userId,
  estadoConfiguracion,
  dispatch,
}: ParametrosConfiguracionOperativaPredeterminada): Promise<void> {
  if (!empresa?.id || !Establecimiento?.id) {
    return;
  }

  const empresaId = empresa.id;
  const establecimientoId = Establecimiento.id;

  const derivarIdMonedaBase = (): string => {
    const codigoPreferido = empresa.monedaBase || 'PEN';

    const porId = estadoConfiguracion.currencies.find((currency) => currency.id === codigoPreferido);
    if (porId) return porId.id;

    const porCodigo = estadoConfiguracion.currencies.find((currency) => currency.code === codigoPreferido);
    if (porCodigo) return porCodigo.id;

    const monedaPen = estadoConfiguracion.currencies.find(
      (currency) => currency.id === 'PEN' || currency.code === 'PEN',
    );
    if (monedaPen) return monedaPen.id;

    return codigoPreferido;
  };

  const monedaId = derivarIdMonedaBase();

  let cajaPorDefecto: Caja | undefined;

  try {
    const cajasAlmacenadas = await cajasDataSource.list(empresaId, establecimientoId);
    cajaPorDefecto = cajasAlmacenadas.find((caja) => {
      if (caja.empresaId !== empresaId || caja.establecimientoIdCaja !== establecimientoId) {
        return false;
      }
      return caja.nombreCaja.trim().toLowerCase() === 'caja 1';
    });
  } catch {
    cajaPorDefecto = undefined;
  }

  if (!cajaPorDefecto) {
    cajaPorDefecto = estadoConfiguracion.cajas.find((caja) => {
      if (caja.empresaId !== empresaId || caja.establecimientoIdCaja !== establecimientoId) {
        return false;
      }
      return caja.nombreCaja.trim().toLowerCase() === 'caja 1';
    });
  }

  if (cajaPorDefecto) {
    if (!userId) {
      return;
    }

    if (cajaPorDefecto.usuariosAutorizadosCaja.includes(userId)) {
      return;
    }

    const actualizada = await cajasDataSource.update(empresaId, establecimientoId, cajaPorDefecto.id, {
      usuariosAutorizadosCaja: [...cajaPorDefecto.usuariosAutorizadosCaja, userId],
    });

    dispatch({ type: 'UPDATE_CAJA', payload: actualizada });
    return;
  }

  const mediosPagoPermitidos = [...MEDIOS_PAGO_DISPONIBLES];

  const entradaCreacion: CreateCajaInput = {
    establecimientoIdCaja: establecimientoId,
    nombreCaja: 'Caja 1',
    monedaIdCaja: monedaId,
    mediosPagoPermitidos,
    limiteMaximoCaja: CAJA_CONSTRAINTS.LIMITE_MIN,
    margenDescuadreCaja: CAJA_CONSTRAINTS.MARGEN_MIN,
    habilitadaCaja: true,
    usuariosAutorizadosCaja: userId ? [userId] : [],
  };

  const nuevaCaja = await cajasDataSource.create(empresaId, establecimientoId, entradaCreacion);
  dispatch({ type: 'ADD_CAJA', payload: nuevaCaja });
}

type PersistedCaja = Caja | (Partial<Caja> & Record<string, unknown>);

type RawTenantConfig = {
  version: 1;
  company: Company | null;
  Establecimientos: Establecimiento[];
  almacenes: Almacen[];
  cajas: PersistedCaja[];
  units?: Unit[];
  salesPreferences: SalesPreferences;
};

type PersistedTenantConfig = {
  version: 1;
  company: Company | null;
  Establecimientos: Establecimiento[];
  almacenes: Almacen[];
  cajas: Caja[];
  units: Unit[];
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
  creadoElEstablecimiento: reviveDate(est.creadoElEstablecimiento) ?? new Date(),
  actualizadoElEstablecimiento: reviveDate(est.actualizadoElEstablecimiento) ?? new Date(),
  sunatConfiguration: est.sunatConfiguration
    ? {
        ...est.sunatConfiguration,
        registrationDate: reviveDate(est.sunatConfiguration.registrationDate),
      }
    : est.sunatConfiguration,
});

const reviveUnit = (unit: Unit): Unit => ({
  ...unit,
  createdAt: reviveDate(unit.createdAt) ?? new Date(),
  updatedAt: reviveDate(unit.updatedAt) ?? new Date(),
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
  units: Array.isArray(config.units) ? config.units.map(reviveUnit) : [],
});

const isRawTenantConfig = (value: unknown): value is RawTenantConfig => {
  if (!isRecord(value)) return false;
  if (value.version !== 1) return false;

  const hasArrays =
    Array.isArray(value.Establecimientos) &&
    Array.isArray(value.almacenes) &&
    Array.isArray(value.cajas);

  const hasUnits =
    !('units' in value) || Array.isArray((value as RawTenantConfig).units);

  const prefs = value.salesPreferences;
  const hasPrefs =
    isRecord(prefs) &&
    typeof prefs.allowNegativeStock === 'boolean' &&
    typeof prefs.pricesIncludeTax === 'boolean';

  const company = value.company;
  const hasCompany = company === null || isRecord(company);

  return hasArrays && hasPrefs && hasCompany && hasUnits;
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

type DatosEmpresaBase = {
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  direccionFiscal: string;
  ubigeo: string;
  actividadEconomica: string;
  telefonos: string[];
  correosElectronicos: string[];
  monedaBase: 'PEN' | 'USD';
  entornoSunat: 'TEST' | 'PRODUCTION';
};

const DATOS_EMPRESA_BASE: DatosEmpresaBase = {
  ruc: '20000000000',
  razonSocial: 'SENCIYO S.A.C.',
  nombreComercial: 'SENCIYO',
  direccionFiscal: 'AV. PRINCIPAL 123, LIMA, LIMA, LIMA',
  ubigeo: '150101',
  actividadEconomica: 'COMERCIO AL POR MENOR',
  telefonos: ['949970564'],
  correosElectronicos: ['contacto@senciyo.com'],
  monedaBase: 'PEN',
  entornoSunat: 'TEST',
};

const construirEmpresaBase = (datos: DatosEmpresaBase): Company => {
  const ubicacion = parseUbigeoCode(datos.ubigeo);
  const telefonosLimpios = datos.telefonos.filter((telefono) => telefono.trim() !== '');
  const correosLimpios = datos.correosElectronicos.filter((correo) => correo.trim() !== '');
  const ahora = new Date();

  return {
    id: '1',
    ruc: datos.ruc,
    razonSocial: datos.razonSocial,
    nombreComercial: datos.nombreComercial || undefined,
    direccionFiscal: datos.direccionFiscal,
    distrito: ubicacion?.district || 'Lima',
    provincia: ubicacion?.province || 'Lima',
    departamento: ubicacion?.department || 'Lima',
    codigoPostal: datos.ubigeo,
    telefonos: telefonosLimpios,
    correosElectronicos: correosLimpios,
    sitioWeb: undefined,
    actividadEconomica: datos.actividadEconomica,
    regimenTributario: 'GENERAL',
    monedaBase: datos.monedaBase,
    representanteLegal: {
      nombreRepresentanteLegal: '',
      tipoDocumentoRepresentante: 'DNI',
      numeroDocumentoRepresentante: '',
    },
    certificadoDigital: undefined,
    configuracionSunatEmpresa: {
      estaConfiguradoEnSunat: false,
      usuarioSunat: undefined,
      entornoSunat: datos.entornoSunat === 'TEST' ? 'TESTING' : 'PRODUCTION',
      fechaUltimaSincronizacionSunat: undefined,
    },
    creadoEl: ahora,
    actualizadoEl: ahora,
    estaActiva: true,
  };
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
      return { ...state, units: normalizeUnitsWithCatalog(action.payload) };
    
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
  const { tenantId: activeTenantId, activeWorkspace, createOrUpdateWorkspace } = useTenant();
  const tenantId = tenantIdOverride ?? activeTenantId;
  const { session, setCurrentCompany } = useUserSession();
  const contextoActual = useTenantStore((store) => store.contextoActual);
  const setTenantContextoActual = useTenantStore((store) => store.setContextoActual);
  const setTenantEmpresas = useTenantStore((store) => store.setEmpresas);
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
  const unitsHydratedRef = useRef(false);
  const instalacionBaseRef = useRef(false);
  const sincronizacionWorkspaceRef = useRef(false);

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
      if (persisted.units.length) {
        dispatch({ type: 'SET_UNITS', payload: persisted.units });
        unitsHydratedRef.current = true;
      }
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
    if (tenantId) return;
    if (sincronizacionWorkspaceRef.current) return;

    const workspaceBase = createOrUpdateWorkspace({
      id: generateWorkspaceId(),
      ruc: DATOS_EMPRESA_BASE.ruc,
      razonSocial: DATOS_EMPRESA_BASE.razonSocial,
      nombreComercial: DATOS_EMPRESA_BASE.nombreComercial,
      domicilioFiscal: DATOS_EMPRESA_BASE.direccionFiscal,
    });

    sincronizacionWorkspaceRef.current = Boolean(workspaceBase.id);
  }, [createOrUpdateWorkspace, tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    if (!tenantHydratedRef.current) return;
    if (!seriesHydratedRef.current) return;
    if (instalacionBaseRef.current) return;

    const snapshot = loadTenantConfigFromStorage(tenantConfigKey);
    const seriesAlmacenadas = loadStoredSeries(seriesStorageKey);

    const almacenamientoVacio =
      !snapshot ||
      (!snapshot.company &&
        snapshot.Establecimientos.length === 0 &&
        snapshot.almacenes.length === 0 &&
        snapshot.cajas.length === 0 &&
        snapshot.units.length === 0);

    const estadoTieneDatos =
      Boolean(state.company) ||
      state.Establecimientos.length > 0 ||
      state.almacenes.length > 0 ||
      state.cajas.length > 0 ||
      state.series.length > 0;

    if (!almacenamientoVacio || seriesAlmacenadas.length > 0 || estadoTieneDatos) {
      instalacionBaseRef.current = true;
      return;
    }

    const empresaBase = construirEmpresaBase(DATOS_EMPRESA_BASE);
    dispatch({ type: 'SET_COMPANY', payload: empresaBase });

    const resultadoConfiguracion = construirConfiguracionInicialEmpresa({
      empresa: empresaBase,
      datos: {
        direccionFiscal: DATOS_EMPRESA_BASE.direccionFiscal,
        ubigeo: DATOS_EMPRESA_BASE.ubigeo,
        entornoSunat: DATOS_EMPRESA_BASE.entornoSunat,
        telefonos: DATOS_EMPRESA_BASE.telefonos,
        correosElectronicos: DATOS_EMPRESA_BASE.correosElectronicos,
        actividadEconomica: DATOS_EMPRESA_BASE.actividadEconomica,
      },
      seriesExistentes: state.series,
      monedasExistentes: state.currencies,
      impuestosExistentes: state.taxes,
    });

    dispatch({ type: 'ADD_Establecimiento', payload: resultadoConfiguracion.establecimiento });
    dispatch({ type: 'ADD_ALMACEN', payload: resultadoConfiguracion.almacen });

    resultadoConfiguracion.series.forEach((seriesItem) => {
      dispatch({ type: 'ADD_SERIES', payload: seriesItem });
    });

    if (resultadoConfiguracion.monedas.length) {
      dispatch({ type: 'SET_CURRENCIES', payload: resultadoConfiguracion.monedas });
    }

    if (resultadoConfiguracion.impuestos.length) {
      dispatch({ type: 'SET_TAXES', payload: resultadoConfiguracion.impuestos });
    }

    const monedasParaCaja = resultadoConfiguracion.monedas.length
      ? resultadoConfiguracion.monedas
      : state.currencies;

    void asegurarConfiguracionOperativaPredeterminada({
      empresa: empresaBase,
      Establecimiento: resultadoConfiguracion.establecimiento,
      userId: session?.userId ?? null,
      estadoConfiguracion: {
        cajas: state.cajas,
        currencies: monedasParaCaja,
      },
      dispatch,
    });

    instalacionBaseRef.current = true;
  }, [
    dispatch,
    seriesStorageKey,
    session?.userId,
    state.Establecimientos.length,
    state.almacenes.length,
    state.cajas,
    state.company,
    state.currencies,
    state.series,
    state.taxes,
    tenantConfigKey,
    tenantId,
  ]);

  useEffect(() => {
    if (!state.company) {
      return;
    }

    const idWorkspace = tenantId ?? activeWorkspace?.id ?? generateWorkspaceId();
    const datosWorkspace = {
      id: idWorkspace,
      ruc: state.company.ruc,
      razonSocial: state.company.razonSocial,
      nombreComercial: state.company.nombreComercial,
      domicilioFiscal: state.company.direccionFiscal,
    };

    const requiereActualizarWorkspace =
      !activeWorkspace ||
      activeWorkspace.id !== datosWorkspace.id ||
      activeWorkspace.ruc !== datosWorkspace.ruc ||
      activeWorkspace.razonSocial !== datosWorkspace.razonSocial ||
      activeWorkspace.nombreComercial !== datosWorkspace.nombreComercial ||
      activeWorkspace.domicilioFiscal !== datosWorkspace.domicilioFiscal;

    if (requiereActualizarWorkspace) {
      createOrUpdateWorkspace(datosWorkspace);
    }
  }, [
    activeWorkspace,
    createOrUpdateWorkspace,
    state.company,
    tenantId,
  ]);

  useEffect(() => {
    const empresa = state.company;
    if (!empresa) return;

    const establecimientoPrincipal =
      state.Establecimientos.find((item) => item.isMainEstablecimiento) ??
      state.Establecimientos[0];

    if (!establecimientoPrincipal) return;

    const empresaTenant: EmpresaTenant = {
      id: empresa.id,
      ruc: empresa.ruc,
      razonSocial: empresa.razonSocial,
      nombreComercial: empresa.nombreComercial,
      direccion: empresa.direccionFiscal,
      telefono: empresa.telefonos?.[0],
      email: empresa.correosElectronicos?.[0],
      actividadEconomica: empresa.actividadEconomica,
      regimen: (empresa.regimenTributario as RegimenTributario) ?? RegimenTributario.GENERAL,
      estado: EmpresaStatus.ACTIVA,
      establecimientos: [
        {
          id: establecimientoPrincipal.id,
          codigo: establecimientoPrincipal.codigoEstablecimiento,
          nombre: establecimientoPrincipal.nombreEstablecimiento,
          direccion: establecimientoPrincipal.direccionEstablecimiento,
          esPrincipal: establecimientoPrincipal.isMainEstablecimiento,
          activo: establecimientoPrincipal.estaActivoEstablecimiento,
        },
      ],
      configuracion: {
        emisionElectronica: true,
      },
    };

    const contextoTenant: WorkspaceContext = {
      empresaId: empresa.id,
      establecimientoId: establecimientoPrincipal.id,
      empresa: empresaTenant,
      establecimiento: empresaTenant.establecimientos[0],
      permisos: ['*'],
      configuracion: {},
    };

    const { empresas, contextoActual } = useTenantStore.getState();
    const empresaEnStore = empresas.find((item) => item.id === empresaTenant.id);

    const requiereActualizarEmpresa =
      !empresaEnStore ||
      empresaEnStore.ruc !== empresaTenant.ruc ||
      empresaEnStore.razonSocial !== empresaTenant.razonSocial ||
      empresaEnStore.nombreComercial !== empresaTenant.nombreComercial ||
      empresaEnStore.direccion !== empresaTenant.direccion ||
      empresaEnStore.establecimientos.length !== empresaTenant.establecimientos.length;

    if (requiereActualizarEmpresa) {
      const empresasActualizadas = [...empresas.filter((item) => item.id !== empresaTenant.id), empresaTenant];
      setTenantEmpresas(empresasActualizadas);
    }

    if (
      !contextoActual ||
      contextoActual.empresaId !== contextoTenant.empresaId ||
      contextoActual.establecimientoId !== contextoTenant.establecimientoId
    ) {
      setTenantContextoActual(contextoTenant);
    }

    const requiereActualizarSesion =
      session?.currentCompanyId === empresa.id &&
      (!session.currentCompany ||
        session.currentCompany.ruc !== empresa.ruc ||
        session.currentCompany.razonSocial !== empresa.razonSocial ||
        session.currentCompany.nombreComercial !== empresa.nombreComercial ||
        session.currentCompany.direccionFiscal !== empresa.direccionFiscal);

    if (requiereActualizarSesion) {
      setCurrentCompany(empresa.id, empresa);
    }
  }, [
    session?.currentCompany,
    session?.currentCompany?.direccionFiscal,
    session?.currentCompany?.nombreComercial,
    session?.currentCompany?.razonSocial,
    session?.currentCompany?.ruc,
    session?.currentCompanyId,
    setCurrentCompany,
    setTenantContextoActual,
    setTenantEmpresas,
    state.Establecimientos,
    state.company,
  ]);

  useEffect(() => {
    if (!tenantId) return;
    if (!session?.userId || !session.userName || !session.userEmail) return;

    const empresaActivaId = contextoActual?.empresaId ?? session.currentCompanyId ?? state.company?.id ?? '';
    if (state.company?.id && empresaActivaId && empresaActivaId !== state.company.id) {
      return;
    }

    const establecimientoActivoId =
      contextoActual?.establecimientoId ??
      session.currentEstablecimientoId ??
      session.currentEstablecimiento?.id ??
      '';
    if (!establecimientoActivoId) return;

    const empresaNombreActiva =
      contextoActual?.empresa?.razonSocial ??
      contextoActual?.empresa?.nombreComercial ??
      state.company?.razonSocial ??
      state.company?.nombreComercial;

    const correoNormalizado = normalizarCorreo(session.userEmail);
    const usuarioExistente = state.users.find((usuario) =>
      usuario.id === session.userId ||
      (correoNormalizado && normalizarCorreo(usuario.personalInfo.email) === correoNormalizado)
    );

    const usuarioSesion = mapearSesionAUsuarioConfiguracion(
      session,
      {
        empresaId: empresaActivaId,
        empresaNombre: empresaNombreActiva,
        establecimientoId: establecimientoActivoId,
      },
      ROLES_DEL_SISTEMA,
      ID_ROL_ADMINISTRADOR,
    );

    if (!usuarioExistente) {
      dispatch({ type: 'ADD_USER', payload: usuarioSesion });
      return;
    }

    const usuarioNormalizado = normalizarUsuario(
      usuarioExistente,
      empresaActivaId,
      empresaNombreActiva,
    );
    const asignaciones = obtenerAsignacionesUsuario(
      usuarioNormalizado,
      empresaActivaId,
      empresaNombreActiva,
    );
    const asignacionEmpresa = obtenerAsignacionEmpresa(asignaciones, empresaActivaId);

    const establecimientosActualizados = unirIdsUnicos(
      asignacionEmpresa ? obtenerEstablecimientosIdsAsignacion(asignacionEmpresa) : [],
      establecimientoActivoId ? [establecimientoActivoId] : [],
    );
    const rolesPorEstablecimiento = asignacionEmpresa
      ? obtenerRolesPorEstablecimientoAsignacion(asignacionEmpresa)
      : {};
    const rolesActualizados = {
      ...rolesPorEstablecimiento,
      ...(establecimientoActivoId ? { [establecimientoActivoId]: ID_ROL_ADMINISTRADOR } : {}),
    };
    const establecimientosAsignados = establecimientosActualizados.map((id) => ({
      establecimientoId: id,
      roleId: rolesActualizados[id] ?? '',
    }));
    const asignacionesActualizadas = obtenerAsignacionesActualizadas(
      asignaciones,
      empresaActivaId,
      {
        empresaNombre: empresaNombreActiva ?? asignacionEmpresa?.empresaNombre,
        establecimientos: establecimientosAsignados,
        estado: 'ACTIVE',
      },
    );
    const idsRolesGlobales = obtenerIdsRolesUnicos(asignacionesActualizadas);
    const rolesGlobales = construirRolesSistema(idsRolesGlobales, ROLES_DEL_SISTEMA);
    const establecimientosGlobales = obtenerEstablecimientosUnicos(asignacionesActualizadas);
    const estadoGlobal = obtenerEstadoUsuarioPorAsignaciones(
      asignacionesActualizadas,
      usuarioExistente.status,
    );

    const nombreCompleto = usuarioSesion.personalInfo.fullName || usuarioExistente.personalInfo.fullName;
    const correo = usuarioSesion.personalInfo.email || usuarioExistente.personalInfo.email;
    const nombres = usuarioSesion.personalInfo.firstName || usuarioExistente.personalInfo.firstName;
    const apellidos = usuarioSesion.personalInfo.lastName || usuarioExistente.personalInfo.lastName;
    const nombreSincronizado = construirNombreCompleto(nombres, apellidos) || nombreCompleto;

    const faltaAsignacionEmpresa = !asignacionEmpresa;
    const faltaRolAdministrador = !usuarioExistente.systemAccess.roleIds.includes(ID_ROL_ADMINISTRADOR);
    const faltaEstablecimiento =
      establecimientoActivoId &&
      !usuarioExistente.assignment.EstablecimientoIds.includes(establecimientoActivoId);

    const necesitaActualizacion =
      usuarioExistente.personalInfo.fullName !== nombreSincronizado ||
      usuarioExistente.personalInfo.email !== correo ||
      usuarioExistente.personalInfo.firstName !== nombres ||
      usuarioExistente.personalInfo.lastName !== apellidos ||
      usuarioExistente.status !== estadoGlobal ||
      faltaEstablecimiento ||
      faltaRolAdministrador ||
      faltaAsignacionEmpresa ||
      establecimientosGlobales.length !== usuarioExistente.assignment.EstablecimientoIds.length ||
      idsRolesGlobales.length !== usuarioExistente.systemAccess.roleIds.length ||
      rolesGlobales.length !== usuarioExistente.systemAccess.roles.length;

    if (!necesitaActualizacion) return;

    const usuarioActualizado: User = {
      ...usuarioExistente,
      personalInfo: {
        ...usuarioExistente.personalInfo,
        firstName: nombres,
        lastName: apellidos,
        fullName: nombreSincronizado,
        email: correo,
      },
      assignment: {
        ...usuarioExistente.assignment,
        EstablecimientoId: establecimientoActivoId,
        EstablecimientoIds: establecimientosGlobales,
      },
      systemAccess: {
        ...usuarioExistente.systemAccess,
        roleIds: idsRolesGlobales,
        roles: rolesGlobales,
      },
      asignacionesPorEmpresa: asignacionesActualizadas,
      status: estadoGlobal,
      updatedAt: new Date(),
    };

    dispatch({ type: 'UPDATE_USER', payload: usuarioActualizado });
  }, [
    contextoActual,
    contextoActual?.empresaId,
    contextoActual?.empresa?.nombreComercial,
    contextoActual?.empresa?.razonSocial,
    contextoActual?.establecimientoId,
    dispatch,
    session,
    session?.currentCompanyId,
    session?.currentEstablecimientoId,
    session?.currentEstablecimiento?.id,
    session?.userEmail,
    session?.userId,
    session?.userName,
    state.company?.id,
    state.company?.nombreComercial,
    state.company?.razonSocial,
    state.users,
    tenantId,
  ]);

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
      state.units.length > 0 ||
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
      units: state.units,
      salesPreferences: state.salesPreferences,
    };

    persistTenantSnapshot(tenantConfigKey, snapshot);
  }, [
    state.cajas,
    state.company,
    state.Establecimientos,
    state.salesPreferences,
    state.almacenes,
    state.units,
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
    if (!unitsHydratedRef.current) {
      const sunatUnitsWithDefaults: Unit[] = normalizeUnitsWithCatalog([]);

      dispatch({
        type: 'SET_UNITS',
        payload: sunatUnitsWithDefaults
      });
    }

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

const mapearEmpresaConfigurada = (
  empresa: Company,
  Establecimientos: Establecimiento[],
): EmpresaTenant => ({
  id: empresa.id,
  ruc: empresa.ruc,
  razonSocial: empresa.razonSocial,
  nombreComercial: empresa.nombreComercial,
  direccion: empresa.direccionFiscal,
  telefono: empresa.telefonos?.[0],
  email: empresa.correosElectronicos?.[0],
  actividadEconomica: empresa.actividadEconomica,
  regimen: (empresa.regimenTributario as RegimenTributario) ?? RegimenTributario.GENERAL,
  estado: empresa.estaActiva ? EmpresaStatus.ACTIVA : EmpresaStatus.BAJA,
  establecimientos: Establecimientos.map((establecimiento) => ({
    id: establecimiento.id,
    codigo: establecimiento.codigoEstablecimiento,
    nombre: establecimiento.nombreEstablecimiento,
    direccion: establecimiento.direccionEstablecimiento,
    esPrincipal: establecimiento.isMainEstablecimiento,
    activo: establecimiento.estaActivoEstablecimiento,
  })),
  configuracion: {
    emisionElectronica: true,
  },
});

const obtenerKeysConfiguracion = (): string[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const keys: string[] = [];
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key) continue;
      if (key.endsWith(`:${LLAVE_ALMACENAMIENTO_CONFIGURACION}`)) {
        keys.push(key);
      }
    }
  } catch {
    return [];
  }

  return keys;
};

export function useEmpresasConfiguradas(): EmpresaTenant[] {
  const { state } = useConfigurationContext();

  return useMemo(() => {
    const empresas = new Map<string, EmpresaTenant>();
    const storageKeys = obtenerKeysConfiguracion();

    storageKeys.forEach((storageKey) => {
      const snapshot = loadTenantConfigFromStorage(storageKey);
      if (!snapshot?.company) {
        return;
      }

      empresas.set(
        snapshot.company.id,
        mapearEmpresaConfigurada(snapshot.company, snapshot.Establecimientos),
      );
    });

    if (state.company) {
      empresas.set(
        state.company.id,
        mapearEmpresaConfigurada(state.company, state.Establecimientos),
      );
    }

    return Array.from(empresas.values()).sort((a, b) =>
      (a.razonSocial || a.nombreComercial || '').localeCompare(
        b.razonSocial || b.nombreComercial || '',
      ),
    );
  }, [state.company, state.Establecimientos]);
}

