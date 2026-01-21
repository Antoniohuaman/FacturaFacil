import type { Company } from '../modelos/Company';
import type { Establecimiento } from '../modelos/Establecimiento';
import type { Almacen } from '../modelos/Almacen';
import { parseUbigeoCode } from '../datos/ubigeo';
import { CAJA_CONSTRAINTS, MEDIOS_PAGO_DISPONIBLES } from '../modelos/Caja';
import type { Caja } from '../modelos/Caja';

export interface OnboardingData {
  establecimiento: Establecimiento;
  almacen: Almacen;
}

export const createDefaultEstablecimiento = (
  company: Company,
  formData: { direccionFiscal: string; ubigeo: string; telefonos: string[]; correosElectronicos: string[] }
): Establecimiento => {
  const location = parseUbigeoCode(formData.ubigeo);

  return {
    id: 'est-main',
    codigoEstablecimiento: '0001',
    nombreEstablecimiento: 'Establecimiento',
    direccionEstablecimiento: formData.direccionFiscal,
    distritoEstablecimiento: location?.district || 'Lima',
    provinciaEstablecimiento: location?.province || 'Lima',
    departamentoEstablecimiento: location?.department || 'Lima',
    codigoPostalEstablecimiento: formData.ubigeo,
    phone: formData.telefonos[0] || '',
    email: formData.correosElectronicos[0] || '',
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
      registrationDate: new Date(),
      annexCode: '0000',
      economicActivity: company.actividadEconomica || 'Comercio',
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
    creadoElEstablecimiento: new Date(),
    actualizadoElEstablecimiento: new Date(),
    estaActivoEstablecimiento: true,
  };
};

export const createDefaultAlmacen = (establecimiento: Establecimiento): Almacen => {
  return {
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
    creadoElAlmacen: new Date(),
    actualizadoElAlmacen: new Date(),
    tieneMovimientosInventario: false,
  };
};

export const createDefaultCaja = (
  empresaId: string,
  establecimientoId: string,
  currencyId: string,
  userId?: string
): Caja => {
  // Nota: Esto simula la creación, pero idealmente se usa cajasDataSource
  return {
    id: 'cj-default-1',
    empresaId,
    establecimientoIdCaja: establecimientoId,
    nombreCaja: 'Caja 1',
    monedaIdCaja: currencyId,
    habilitadaCaja: true,
    usuariosAutorizadosCaja: userId ? [userId] : [],
    mediosPagoPermitidos: [...MEDIOS_PAGO_DISPONIBLES],
    limiteMaximoCaja: CAJA_CONSTRAINTS.LIMITE_MIN,
    margenDescuadreCaja: CAJA_CONSTRAINTS.MARGEN_MIN,
    dispositivosCaja: {
      impresoraPorDefecto: undefined,
      posDispositivo: undefined
    },
    observacionesCaja: 'Caja creada automáticamente',
    tieneHistorialMovimientos: false,
    tieneSesionAbierta: false,
    creadoElCaja: new Date(),
    actualizadoElCaja: new Date(),
  };
};
