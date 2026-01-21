/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
// src/features/configuration/pages/CompanyConfiguration.tsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Phone,
  Mail,
  CheckCircle2,
  Loader2,
  X,
  Shield,
  ArrowLeft
} from 'lucide-react';
import { Button, Select, Input, RadioButton, PageHeader } from '@/contasis';
import { useConfigurationContext } from '../contexto/ContextoConfiguracion';
import { ConfigurationCard } from '../components/comunes/TarjetaConfiguracion';
import { StatusIndicator } from '../components/comunes/IndicadorEstado';
import { ConfirmationModal } from '../components/comunes/ModalConfirmacion';
import { RucValidator } from '../components/empresa/ValidadorRuc';
import { parseUbigeoCode } from '../datos/ubigeo';
import { useTenant } from '../../../../../shared/tenant/TenantContext';
import { generateWorkspaceId } from '../../../../../shared/tenant';
import { useUserSession } from '../../../../../contexts/UserSessionContext';
import type { Company } from '../modelos/Company';
import type { Establecimiento } from '../modelos/Establecimiento';
import type { Almacen } from '../modelos/Almacen';
import type { Series } from '../modelos/Series';
import type { Currency } from '../modelos/Currency';
import type { Tax } from '../modelos/Tax';
import { PERU_TAX_TYPES } from '../modelos/Tax';
import type { Caja, CreateCajaInput } from '../modelos/Caja';
import { CAJA_CONSTRAINTS, MEDIOS_PAGO_DISPONIBLES } from '../modelos/Caja';
import { cajasDataSource } from '../api/fuenteDatosCajas';
import { useTenantStore } from '../../autenticacion/store/TenantStore';
import { EmpresaStatus, RegimenTributario, type WorkspaceContext } from '../../autenticacion/types/auth.types';
import { buildMissingDefaultSeries } from '../utilidades/seriesPredeterminadas';


interface CompanyFormData {
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  direccionFiscal: string;
  ubigeo: string;
  monedaBase: 'PEN' | 'USD';
  entornoSunat: 'TEST' | 'PRODUCTION';
  telefonos: string[];
  correosElectronicos: string[];
  actividadEconomica: string;
}

type WorkspaceNavigationState = {
  workspaceMode?: 'create_workspace' | 'edit_workspace';
  workspaceId?: string;
} | null;

type EnsureDefaultOperationalSetupParams = {
  company: Company | null;
  Establecimiento: Establecimiento | null;
  userId: string | null;
  configState: {
    cajas: Caja[];
    currencies: Currency[];
  };
  dispatch: (action: { type: 'ADD_CAJA' | 'UPDATE_CAJA'; payload: Caja }) => void;
};

async function ensureDefaultOperationalSetup({
  company,
  Establecimiento,
  userId,
  configState,
  dispatch,
}: EnsureDefaultOperationalSetupParams): Promise<void> {
  if (!company?.id || !Establecimiento?.id) {
    return;
  }

  const empresaId = company.id;
  const establecimientoId = Establecimiento.id;

  const deriveBaseCurrencyId = (): string => {
    const preferredCode = company.monedaBase || 'PEN';

    const byId = configState.currencies.find((currency) => currency.id === preferredCode);
    if (byId) return byId.id;

    const byCode = configState.currencies.find((currency) => currency.code === preferredCode);
    if (byCode) return byCode.id;

    const penCurrency = configState.currencies.find(
      (currency) => currency.id === 'PEN' || currency.code === 'PEN',
    );
    if (penCurrency) return penCurrency.id;

    return preferredCode;
  };

  const monedaId = deriveBaseCurrencyId();

  let existingDefaultCaja: Caja | undefined;

  try {
    const storedCajas = await cajasDataSource.list(empresaId, establecimientoId);
    existingDefaultCaja = storedCajas.find((caja) => {
      if (caja.empresaId !== empresaId || caja.establecimientoIdCaja !== establecimientoId) {
        return false;
      }
      return caja.nombreCaja.trim().toLowerCase() === 'caja 1';
    });
  } catch {
    existingDefaultCaja = undefined;
  }

  if (!existingDefaultCaja) {
    existingDefaultCaja = configState.cajas.find((caja) => {
      if (caja.empresaId !== empresaId || caja.establecimientoIdCaja !== establecimientoId) {
        return false;
      }
      return caja.nombreCaja.trim().toLowerCase() === 'caja 1';
    });
  }

  if (existingDefaultCaja) {
    if (!userId) {
      return;
    }

    if (existingDefaultCaja.usuariosAutorizadosCaja.includes(userId)) {
      return;
    }

    const updated = await cajasDataSource.update(empresaId, establecimientoId, existingDefaultCaja.id, {
      usuariosAutorizadosCaja: [...existingDefaultCaja.usuariosAutorizadosCaja, userId],
    });

    dispatch({ type: 'UPDATE_CAJA', payload: updated });
    return;
  }

  const mediosPagoPermitidos = [...MEDIOS_PAGO_DISPONIBLES];

  const createInput: CreateCajaInput = {
    establecimientoIdCaja: establecimientoId,
    nombreCaja: 'Caja 1',
    monedaIdCaja: monedaId,
    mediosPagoPermitidos,
    limiteMaximoCaja: CAJA_CONSTRAINTS.LIMITE_MIN,
    margenDescuadreCaja: CAJA_CONSTRAINTS.MARGEN_MIN,
    habilitadaCaja: true,
    usuariosAutorizadosCaja: userId ? [userId] : [],
  };

  const nuevaCaja = await cajasDataSource.create(empresaId, establecimientoId, createInput);
  dispatch({ type: 'ADD_CAJA', payload: nuevaCaja });
}

export function CompanyConfiguration() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch } = useConfigurationContext();
  const { company } = state;
  const { session } = useUserSession();
  const { createOrUpdateWorkspace, activeWorkspace } = useTenant();
  const workspaceState = (location.state as WorkspaceNavigationState) ?? null;
  const isCreateWorkspaceMode = workspaceState?.workspaceMode === 'create_workspace';
  const initialWorkspaceId = useMemo(() => {
    if (workspaceState?.workspaceId) {
      return workspaceState.workspaceId;
    }
    if (isCreateWorkspaceMode) {
      return generateWorkspaceId();
    }
    return activeWorkspace?.id;
  }, [activeWorkspace?.id, isCreateWorkspaceMode, workspaceState?.workspaceId]);
  const ensuredWorkspaceIdRef = useRef<string | undefined>(initialWorkspaceId);
  const setTenantContextoActual = useTenantStore((store) => store.setContextoActual);
  const setTenantEmpresas = useTenantStore((store) => store.setEmpresas);
  const workspaceIdForSubmit = isCreateWorkspaceMode
    ? ensuredWorkspaceIdRef.current
    : workspaceState?.workspaceId || activeWorkspace?.id;

  const [datosFormulario, setFormData] = useState<CompanyFormData>({
    ruc: '',
    razonSocial: '',
    nombreComercial: '',
    direccionFiscal: '',
    ubigeo: '',
    monedaBase: 'PEN',
    entornoSunat: 'TEST',
    telefonos: [''],
    correosElectronicos: [''],
    actividadEconomica: ''
  });

  const [rucValidation, setRucValidation] = useState<{
    isValid: boolean;
    message: string;
    data?: any;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showProductionModal, setShowProductionModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState<CompanyFormData | null>(null);

  const setTenantWorkspaceContext = useCallback((empresa: Company, Establecimiento: Establecimiento) => {
    const empresaEntry = {
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
          id: Establecimiento.id,
          codigo: Establecimiento.codigoEstablecimiento,
          nombre: Establecimiento.nombreEstablecimiento,
          direccion: Establecimiento.direccionEstablecimiento,
          esPrincipal: Establecimiento.isMainEstablecimiento,
          activo: Establecimiento.estaActivoEstablecimiento,
        },
      ],
      configuracion: {
        emisionElectronica: true,
      },
    };

    const contexto: WorkspaceContext = {
      empresaId: empresa.id,
      establecimientoId: Establecimiento.id,
      empresa: empresaEntry,
      establecimiento: empresaEntry.establecimientos[0],
      permisos: ['*'],
      configuracion: {},
    };

    const { empresas } = useTenantStore.getState();
    const withoutEmpresa = empresas.filter((item) => item.id !== empresaEntry.id);
    setTenantEmpresas([...withoutEmpresa, empresaEntry]);
    setTenantContextoActual(contexto);
  }, [setTenantContextoActual, setTenantEmpresas]);

  // Load existing company data
  useEffect(() => {
    if (isCreateWorkspaceMode) {
      return;
    }

    if (company) {
      // Empresa ya existe en el contexto, cargar sus datos
      const loadedData = {
        ruc: company.ruc,
        razonSocial: company.razonSocial,
        nombreComercial: company.nombreComercial || '',
        direccionFiscal: company.direccionFiscal,
        ubigeo: company.codigoPostal || '',
        monedaBase: company.monedaBase || 'PEN',
        entornoSunat: (company.configuracionSunatEmpresa.entornoSunat === 'TESTING' ? 'TEST' : 'PRODUCTION') as 'TEST' | 'PRODUCTION',
        telefonos: company.telefonos?.length > 0 ? company.telefonos : [''],
        correosElectronicos: company.correosElectronicos?.length > 0 ? company.correosElectronicos : [''],
        actividadEconomica: company.actividadEconomica || ''
      };
      setFormData(loadedData);
      setOriginalData(loadedData);
      setHasChanges(false);
    } else {
      // No hay empresa en el contexto, intentar cargar desde pending_company_data
      const pendingData = localStorage.getItem('pending_company_data');
      if (pendingData) {
        try {
          const parsedData = JSON.parse(pendingData);

          // Crear objeto Company completo para el contexto
          const newCompany: Company = {
            id: 'company-1',
            ruc: parsedData.ruc || '',
            razonSocial: parsedData.razonSocial || '',
            nombreComercial: parsedData.nombreComercial || parsedData.razonSocial || '',
            direccionFiscal: parsedData.direccion || '',
            distrito: '',
            provincia: '',
            departamento: '',
            codigoPostal: '',
            telefonos: parsedData.telefono ? [parsedData.telefono] : [],
            correosElectronicos: [],
            sitioWeb: undefined,
            logoEmpresa: undefined,
            textoPiePagina: undefined,
            actividadEconomica: parsedData.actividadEconomica || '',
            regimenTributario: 'GENERAL',
            monedaBase: 'PEN',
            representanteLegal: {
              nombreRepresentanteLegal: '',
              tipoDocumentoRepresentante: 'DNI',
              numeroDocumentoRepresentante: ''
            },
            certificadoDigital: undefined,
            configuracionSunatEmpresa: {
              estaConfiguradoEnSunat: false,
              usuarioSunat: undefined,
              entornoSunat: 'TESTING',
              fechaUltimaSincronizacionSunat: undefined
            },
            creadoEl: new Date(),
            actualizadoEl: new Date(),
            estaActiva: true
          };

          // Guardar la empresa en el contexto
          dispatch({ type: 'SET_COMPANY', payload: newCompany });

          // Cargar los datos en el formulario
          setFormData(prev => ({
            ...prev,
            ruc: parsedData.ruc || '',
            razonSocial: parsedData.razonSocial || '',
            nombreComercial: parsedData.nombreComercial || '',
            direccionFiscal: parsedData.direccion || '',
            telefonos: parsedData.telefono ? [parsedData.telefono] : [''],
          }));

          // Limpiar los datos pendientes después de procesarlos
          localStorage.removeItem('pending_company_data');
        } catch (error) {
          console.error('Error al cargar datos pendientes de empresa:', error);
        }
      }
    }
  }, [company, dispatch, isCreateWorkspaceMode]);

  // Detect if form has changes compared to original data
  useEffect(() => {
    if (!originalData) {
      setHasChanges(true); // New company, always has changes
      return;
    }

    // Deep comparison of form data vs original data
    const hasFormChanges =
      datosFormulario.ruc !== originalData.ruc ||
      datosFormulario.razonSocial !== originalData.razonSocial ||
      datosFormulario.nombreComercial !== originalData.nombreComercial ||
      datosFormulario.direccionFiscal !== originalData.direccionFiscal ||
      datosFormulario.ubigeo !== originalData.ubigeo ||
      datosFormulario.monedaBase !== originalData.monedaBase ||
      datosFormulario.entornoSunat !== originalData.entornoSunat ||
      datosFormulario.actividadEconomica !== originalData.actividadEconomica ||
      JSON.stringify(datosFormulario.telefonos) !== JSON.stringify(originalData.telefonos) ||
      JSON.stringify(datosFormulario.correosElectronicos) !== JSON.stringify(originalData.correosElectronicos);

    setHasChanges(hasFormChanges);
  }, [datosFormulario, originalData]);

  // Handle RUC validation callback from RucValidator component
  const handleRucValidation = (result: { isValid: boolean; message: string; data?: any }) => {
    setRucValidation(result);

    if (result.isValid && result.data) {
      setFormData(prev => ({
        ...prev,
        razonSocial: result.data.razonSocial,
        direccionFiscal: result.data.direccionFiscal,
        ubigeo: result.data.ubigeo
      }));
    }
  };

  const handleArrayFieldChange = (
    field: 'telefonos' | 'correosElectronicos',
    index: number,
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayField = (field: 'telefonos' | 'correosElectronicos') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayField = (field: 'telefonos' | 'correosElectronicos', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };


  const handleEnvironmentChange = (entorno: 'TEST' | 'PRODUCTION') => {
    // Block changing back to TEST if already in PRODUCTION
    if (entorno === 'TEST' && company?.configuracionSunatEmpresa?.entornoSunat === 'PRODUCTION') {
      return; // Do nothing - this change is not allowed
    }

    if (entorno === 'PRODUCTION') {
      setShowProductionModal(true);
    } else {
      setFormData(prev => ({ ...prev, entornoSunat: entorno }));
    }
  };

  const confirmProductionChange = () => {
    setFormData(prev => ({ ...prev, entornoSunat: 'PRODUCTION' }));
    setShowProductionModal(false);
  };

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const targetWorkspaceId = workspaceIdForSubmit ?? generateWorkspaceId();
      ensuredWorkspaceIdRef.current = targetWorkspaceId;

      // Filter out empty phones and emails
      const cleanPhones = datosFormulario.telefonos.filter(phone => phone.trim() !== '');
      const cleanEmails = datosFormulario.correosElectronicos.filter(email => email.trim() !== '');

      const updatedCompany: Company = {
        id: company?.id || '1',
        ruc: datosFormulario.ruc,
        razonSocial: datosFormulario.razonSocial,
        nombreComercial: datosFormulario.nombreComercial || undefined,
        direccionFiscal: datosFormulario.direccionFiscal,
        distrito: company?.distrito || '',
        provincia: company?.provincia || '',
        departamento: company?.departamento || '',
        codigoPostal: datosFormulario.ubigeo,
        telefonos: cleanPhones.length > 0 ? cleanPhones : [],
        correosElectronicos: cleanEmails.length > 0 ? cleanEmails : [],
        sitioWeb: company?.sitioWeb,
        actividadEconomica: datosFormulario.actividadEconomica,
        regimenTributario: company?.regimenTributario || 'GENERAL',
        monedaBase: datosFormulario.monedaBase,
        representanteLegal: company?.representanteLegal || {
          nombreRepresentanteLegal: '',
          tipoDocumentoRepresentante: 'DNI',
          numeroDocumentoRepresentante: ''
        },
        certificadoDigital: company?.certificadoDigital,
        configuracionSunatEmpresa: {
          estaConfiguradoEnSunat: company?.configuracionSunatEmpresa?.estaConfiguradoEnSunat || false,
          usuarioSunat: company?.configuracionSunatEmpresa?.usuarioSunat,
          entornoSunat: datosFormulario.entornoSunat === 'TEST' ? 'TESTING' : 'PRODUCTION',
          fechaUltimaSincronizacionSunat: company?.configuracionSunatEmpresa?.fechaUltimaSincronizacionSunat
        },
        creadoEl: company?.creadoEl || new Date(),
        actualizadoEl: new Date(),
        estaActiva: company?.estaActiva ?? true
      };

      dispatch({ type: 'SET_COMPANY', payload: updatedCompany });

      const workspace = createOrUpdateWorkspace({
        id: targetWorkspaceId,
        ruc: datosFormulario.ruc,
        razonSocial: datosFormulario.razonSocial,
        nombreComercial: datosFormulario.nombreComercial,
        domicilioFiscal: datosFormulario.direccionFiscal,
      });
      ensuredWorkspaceIdRef.current = workspace.id;

      // ===================================================================
      // ONBOARDING AUTOMÁTICO: Crear configuración inicial si es nueva empresa
      // ===================================================================
      const isNewCompany = !company?.id;
      let defaultEstablecimiento: Establecimiento | null = null;

      if (isNewCompany && state.Establecimientos.length === 0) {
        // Parsear ubigeo para obtener Departamento, Provincia y Distrito
        const location = parseUbigeoCode(datosFormulario.ubigeo);

        // 1. CREAR ESTABLECIMIENTO POR DEFECTO
        const createdEstablecimiento: Establecimiento = {
          id: 'est-main',
          codigoEstablecimiento: '0001',
          nombreEstablecimiento: 'Establecimiento',
          direccionEstablecimiento: datosFormulario.direccionFiscal,
          distritoEstablecimiento: location?.district || 'Lima',
          provinciaEstablecimiento: location?.province || 'Lima',
          departamentoEstablecimiento: location?.department || 'Lima',
          codigoPostalEstablecimiento: datosFormulario.ubigeo,
          phone: cleanPhones[0],
          email: cleanEmails[0],
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
            economicActivity: company?.actividadEconomica || 'Comercio',
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

        defaultEstablecimiento = createdEstablecimiento;
        dispatch({ type: 'ADD_Establecimiento', payload: createdEstablecimiento });

        // 2. CREAR ALMACÉN POR DEFECTO
        const defaultalmacen: Almacen = {
          id: 'alm-main',
          codigoAlmacen: '0001',
          nombreAlmacen: 'Almacén',
          establecimientoId: createdEstablecimiento.id,
          nombreEstablecimientoDesnormalizado: createdEstablecimiento.nombreEstablecimiento,
          codigoEstablecimientoDesnormalizado: createdEstablecimiento.codigoEstablecimiento,
          descripcionAlmacen: 'Almacén principal de la empresa',
          ubicacionAlmacen: createdEstablecimiento.direccionEstablecimiento || undefined,
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

        dispatch({ type: 'ADD_ALMACEN', payload: defaultalmacen });

        // 3. CREAR SERIES POR DEFECTO (FACTURA, BOLETA y documentos internos serieables)
        const environmentType =
          datosFormulario.entornoSunat === 'TEST' ? 'TESTING' : 'PRODUCTION';

        const defaultSeries: Series[] = buildMissingDefaultSeries({
          EstablecimientoId: createdEstablecimiento.id,
          environmentType,
          existingSeries: state.series,
        });

        defaultSeries.forEach((seriesItem) => {
          dispatch({ type: 'ADD_SERIES', payload: seriesItem });
        });

        // 3. CONFIGURAR MONEDA BASE (PEN - SOLES)
        if (state.currencies.length === 0) {
          const defaultCurrencies: Currency[] = [
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
              lastUpdated: new Date(),
              autoUpdate: false,
              createdAt: new Date(),
              updatedAt: new Date(),
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
              lastUpdated: new Date(),
              autoUpdate: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ];
          dispatch({ type: 'SET_CURRENCIES', payload: defaultCurrencies });
        }

        // 4. CONFIGURAR IMPUESTOS POR DEFECTO (IGV 18%, IGV 10%, Exonerado, Inafecto, Exportación)
        if (state.taxes.length === 0) {
          const now = new Date();
          const defaultTaxes: Tax[] = PERU_TAX_TYPES
            .filter((tax) => ['IGV18', 'IGV10', 'EXO', 'INA', 'IGV_EXP'].includes(tax.code))
            .map<Tax>((tax) => ({
              ...tax,
              id: tax.code,
              includeInPrice: true,
              isDefault: tax.code === 'IGV18',
              createdAt: now,
              updatedAt: now,
            }));

          dispatch({ type: 'SET_TAXES', payload: defaultTaxes });
        }

        // Las formas de pago ya están creadas en ConfigurationContext
        // No es necesario crearlas aquí

        await ensureDefaultOperationalSetup({
          company: updatedCompany,
          Establecimiento: defaultEstablecimiento,
          userId: session?.userId ?? null,
          configState: {
            cajas: state.cajas,
            currencies: state.currencies,
          },
          dispatch,
        });

      }

      const EstablecimientoForContext =
        defaultEstablecimiento ||
        state.Establecimientos.find((est) => est.isMainEstablecimiento) ||
        state.Establecimientos[0] ||
        null;

      if (EstablecimientoForContext) {
        setTenantWorkspaceContext(updatedCompany, EstablecimientoForContext);
      }

      // Show success and redirect
      setTimeout(() => {
        navigate('/configuracion');
      }, 1500);
    } catch (error) {
      console.error('Error saving company:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Form validation logic
  // For new company: require RUC validation + has changes
  // For existing company: allow updates without re-validating RUC but require changes
  const isFormValid = datosFormulario.ruc.length === 11 &&
    datosFormulario.razonSocial.trim() !== '' &&
    datosFormulario.direccionFiscal.trim() !== '' &&
    (company?.id ? true : rucValidation?.isValid === true) &&
    hasChanges; // Only enable if there are changes

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <PageHeader
        title="Configuración de Empresa"
        actions={
          <Button
            variant="secondary"
            icon={<ArrowLeft />}
            onClick={() => navigate('/configuracion')}
          >
            Volver
          </Button>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          <form onSubmit={manejarEnvio} className="space-y-8">
            {/* Company Legal Data */}
            <ConfigurationCard
              title="Datos Legales y Tributarios"
              density="compact"
            >
              <div className="space-y-2">
                {/* RUC Validator Component */}
                <RucValidator
                  value={datosFormulario.ruc}
                  onChange={(ruc) => setFormData(prev => ({ ...prev, ruc }))}
                  onValidation={handleRucValidation}
                />

                {/* Business Name */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Razón Social <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={datosFormulario.razonSocial}
                      onChange={(e) => setFormData(prev => ({ ...prev, razonSocial: e.target.value }))}
                      className={`
                    w-full h-10 px-3 text-sm pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    bg-gray-50 dark:bg-gray-800 transition-all duration-200
                    ${datosFormulario.razonSocial ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600'}
                    text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400
                  `}
                      readOnly
                      placeholder="Se completará automáticamente al validar el RUC"
                    />
                    {datosFormulario.razonSocial && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Trade Name */}
                <div>
                  <Input
                    label="Nombre Comercial"
                    type="text"
                    value={datosFormulario.nombreComercial}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombreComercial: e.target.value }))}
                    placeholder="Nombre con el que se conoce tu empresa"
                  />
                </div>

                {/* Fiscal Address */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Domicilio Fiscal <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <textarea
                      value={datosFormulario.direccionFiscal}
                      onChange={(e) => setFormData(prev => ({ ...prev, direccionFiscal: e.target.value }))}
                      className={`
                    w-full min-h-[72px] px-3 py-2 text-sm pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    bg-gray-50 dark:bg-gray-800 transition-all duration-200
                    ${datosFormulario.direccionFiscal ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600'}
                    text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400
                  `}
                      rows={2}
                      readOnly
                      placeholder="Se completará automáticamente al validar el RUC"
                    />
                    {datosFormulario.direccionFiscal && (
                      <div className="absolute right-3 top-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                    )}
                  </div>
                </div>

                <Input
                  label="Actividad Económica"
                  type="text"
                  value={datosFormulario.actividadEconomica}
                  onChange={(e) => setFormData(prev => ({ ...prev, actividadEconomica: e.target.value }))}
                />
              </div>
            </ConfigurationCard>

            {/* Global Parameters */}
            <ConfigurationCard
              title="Parámetros Globales"
              density="compact"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Base Currency */}
                <Select
                  label="Moneda Base"
                  value={datosFormulario.monedaBase}
                  onChange={(e) => setFormData(prev => ({ ...prev, monedaBase: e.target.value as 'PEN' | 'USD' }))}
                  required
                  helperText="Impacta catálogos de productos, emisión y POS"
                  options={[
                    { value: 'PEN', label: 'PEN - Soles Peruanos' },
                    { value: 'USD', label: 'USD - Dólares Americanos' }
                  ]}
                />

                {/* Environment */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Ambiente
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <RadioButton
                        name="environment"
                        value="TEST"
                        checked={datosFormulario.entornoSunat === 'TEST'}
                        onChange={() => handleEnvironmentChange('TEST')}
                        disabled={company?.configuracionSunatEmpresa?.entornoSunat === 'PRODUCTION'}
                        label="Prueba"
                      />
                      {datosFormulario.entornoSunat === 'TEST' && (
                        <StatusIndicator status="warning" label="Activo" size="sm" />
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <RadioButton
                        name="environment"
                        value="PRODUCTION"
                        checked={datosFormulario.entornoSunat === 'PRODUCTION'}
                        onChange={() => handleEnvironmentChange('PRODUCTION')}
                        label="Producción"
                      />
                      {datosFormulario.entornoSunat === 'PRODUCTION' && (
                        <StatusIndicator status="success" label="Activo" size="sm" />
                      )}
                    </div>
                  </div>

                  {/* Warning: Test Mode */}
                  {datosFormulario.entornoSunat === 'TEST' && company?.configuracionSunatEmpresa?.entornoSunat !== 'PRODUCTION' && (
                    <div className="mt-2 p-1.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                      <div className="flex items-start gap-1.5 text-xs text-yellow-800 dark:text-yellow-200 leading-tight">
                        <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>Los documentos emitidos en prueba no tienen validez legal</span>
                      </div>
                    </div>
                  )}

                  {/* Info: Production Mode Locked */}
                  {company?.configuracionSunatEmpresa?.entornoSunat === 'PRODUCTION' && (
                    <div className="mt-2 p-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                      <div className="flex items-start gap-1.5 text-xs text-blue-800 dark:text-blue-200 leading-tight">
                        <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Ambiente de Producción Activado</p>
                          <p className="text-xs mt-0.5">Por seguridad, no es posible regresar al ambiente de prueba una vez activado producción.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ConfigurationCard>

            {/* Contact Information */}
            <ConfigurationCard
              title="Información de Contacto"
              density="compact"
            >
              <div className="space-y-6">
                {/* Phones */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Teléfonos
                  </label>
                  <div className="space-y-2">
                    {datosFormulario.telefonos.map((phone, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="flex-1">
                          <Input
                            type="tel"
                            value={phone}
                            onChange={(e) => handleArrayFieldChange('telefonos', index, e.target.value)}
                            placeholder="+51 987 654 321"
                            leftIcon={<Phone />}
                          />
                        </div>
                        {datosFormulario.telefonos.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => removeArrayField('telefonos', index)}
                            variant="tertiary"
                            iconOnly
                            size="sm"
                            icon={<X />}
                            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="tertiary"
                    onClick={() => addArrayField('telefonos')}
                  >
                    + Agregar teléfono
                  </Button>
                </div>

                {/* Emails */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Correos Electrónicos
                  </label>
                  <div className="space-y-2">
                    {datosFormulario.correosElectronicos.map((email, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="flex-1">
                          <Input
                            type="email"
                            value={email}
                            onChange={(e) => handleArrayFieldChange('correosElectronicos', index, e.target.value)}
                            placeholder="contacto@miempresa.com"
                            leftIcon={<Mail />}
                          />
                        </div>
                        {datosFormulario.correosElectronicos.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => removeArrayField('correosElectronicos', index)}
                            variant="tertiary"
                            iconOnly
                            size="sm"
                            icon={<X />}
                            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="tertiary"
                    onClick={() => addArrayField('correosElectronicos')}
                  >
                    + Agregar correo
                  </Button>
                </div>
              </div>
            </ConfigurationCard>

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
              {/* Form Status Indicator */}
              <div className="flex items-center gap-3">
                {isFormValid && hasChanges && (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 animate-in slide-in-from-left duration-300">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      {company?.id ? 'Listo para guardar cambios' : 'Formulario completo y listo para guardar'}
                    </span>
                  </div>
                )}
                {company?.id && !hasChanges && (
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">Sin cambios pendientes</span>
                  </div>
                )}
                {!isFormValid && datosFormulario.ruc.length === 11 && !rucValidation?.isValid && !company?.id && (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Shield className="w-5 h-5" />
                    <span className="text-sm font-medium">Valida el RUC para continuar</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={() => navigate('/configuracion')}
                >
                  Cancelar
                </Button>

                <Button
                  variant="primary"
                  type="submit"
                  disabled={!isFormValid || isLoading}
                  icon={isLoading ? <Loader2 className="animate-spin" /> : undefined}
                >
                  {isLoading ? 'Guardando...' : company?.id ? 'Guardar Cambios' : 'Crear Empresa'}
                </Button>
              </div>
            </div>
          </form>

          {/* Production Confirmation Modal */}
          <ConfirmationModal
            isOpen={showProductionModal}
            onClose={() => setShowProductionModal(false)}
            onConfirm={confirmProductionChange}
            title="⚠️ Cambiar a Ambiente de Producción"
            message={`Esta es una acción IRREVERSIBLE. Al activar producción:

• Se eliminarán todos los documentos de prueba
• Necesitarás un Certificado Digital válido
• Los documentos tendrán validez legal ante SUNAT
• NO podrás volver al ambiente de pruebas

¿Estás seguro de continuar?`}
            type="warning"
            confirmText="Sí, Activar Producción"
            cancelText="No, Mantener en Prueba"
          />
        </div>
      </div>
    </div>
  );
};


