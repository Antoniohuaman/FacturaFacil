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
import { useConfigurationContext } from '../context/ConfigurationContext';
import { ConfigurationCard } from '../components/common/ConfigurationCard';
import { StatusIndicator } from '../components/common/StatusIndicator';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { RucValidator } from '../components/company/RucValidator';
import { parseUbigeoCode } from '../data/ubigeo';
import { useTenant } from '../../../shared/tenant/TenantContext';
import { generateWorkspaceId } from '../../../shared/tenant';
import { useUserSession } from '../../../contexts/UserSessionContext';
import type { Company } from '../models/Company';
import type { Establishment } from '../models/Establishment';
import type { Warehouse } from '../models/Warehouse';
import type { Series } from '../models/Series';
import type { Currency } from '../models/Currency';
import type { Tax } from '../models/Tax';
import { PERU_TAX_TYPES } from '../models/Tax';
import type { Caja, CreateCajaInput } from '../models/Caja';
import { CAJA_CONSTRAINTS, MEDIOS_PAGO_DISPONIBLES } from '../models/Caja';
import { cajasDataSource } from '../api/cajasDataSource';
import { useTenantStore } from '../../autenticacion/store/TenantStore';
import { EmpresaStatus, RegimenTributario, type WorkspaceContext } from '../../autenticacion/types/auth.types';

interface CompanyFormData {
  ruc: string;
  businessName: string;
  tradeName: string;
  fiscalAddress: string;
  ubigeo: string;
  baseCurrency: 'PEN' | 'USD';
  environment: 'TEST' | 'PRODUCTION';
  phones: string[];
  emails: string[];
  economicActivity: string;
}

type WorkspaceNavigationState = {
  workspaceMode?: 'create_workspace' | 'edit_workspace';
  workspaceId?: string;
} | null;

type EnsureDefaultOperationalSetupParams = {
  company: Company | null;
  establishment: Establishment | null;
  userId: string | null;
  configState: {
    cajas: Caja[];
    currencies: Currency[];
  };
  dispatch: (action: { type: 'ADD_CAJA' | 'UPDATE_CAJA'; payload: Caja }) => void;
};

async function ensureDefaultOperationalSetup({
  company,
  establishment,
  userId,
  configState,
  dispatch,
}: EnsureDefaultOperationalSetupParams): Promise<void> {
  if (!company?.id || !establishment?.id) {
    return;
  }

  const empresaId = company.id;
  const establecimientoId = establishment.id;

  const deriveBaseCurrencyId = (): string => {
    const preferredCode = company.baseCurrency || 'PEN';

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
      if (caja.empresaId !== empresaId || caja.establecimientoId !== establecimientoId) {
        return false;
      }
      return caja.nombre.trim().toLowerCase() === 'caja 1';
    });
  } catch {
    existingDefaultCaja = undefined;
  }

  if (!existingDefaultCaja) {
    existingDefaultCaja = configState.cajas.find((caja) => {
      if (caja.empresaId !== empresaId || caja.establecimientoId !== establecimientoId) {
        return false;
      }
      return caja.nombre.trim().toLowerCase() === 'caja 1';
    });
  }

  if (existingDefaultCaja) {
    if (!userId) {
      return;
    }

    if (existingDefaultCaja.usuariosAutorizados.includes(userId)) {
      return;
    }

    const updated = await cajasDataSource.update(empresaId, establecimientoId, existingDefaultCaja.id, {
      usuariosAutorizados: [...existingDefaultCaja.usuariosAutorizados, userId],
    });

    dispatch({ type: 'UPDATE_CAJA', payload: updated });
    return;
  }

  const mediosPagoPermitidos = [...MEDIOS_PAGO_DISPONIBLES];

  const createInput: CreateCajaInput = {
    establecimientoId,
    nombre: 'Caja 1',
    monedaId,
    mediosPagoPermitidos,
    limiteMaximo: CAJA_CONSTRAINTS.LIMITE_MIN,
    margenDescuadre: CAJA_CONSTRAINTS.MARGEN_MIN,
    habilitada: true,
    usuariosAutorizados: userId ? [userId] : [],
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
  
  const [formData, setFormData] = useState<CompanyFormData>({
    ruc: '',
    businessName: '',
    tradeName: '',
    fiscalAddress: '',
    ubigeo: '',
    baseCurrency: 'PEN',
    environment: 'TEST',
    phones: [''],
    emails: [''],
    economicActivity: ''
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

  const setTenantWorkspaceContext = useCallback((empresa: Company, establishment: Establishment) => {
    const empresaEntry = {
      id: empresa.id,
      ruc: empresa.ruc,
      razonSocial: empresa.businessName,
      nombreComercial: empresa.tradeName,
      direccion: empresa.address,
      telefono: empresa.phones?.[0],
      email: empresa.emails?.[0],
      actividadEconomica: empresa.economicActivity,
      regimen: (empresa.taxRegime as RegimenTributario) ?? RegimenTributario.GENERAL,
      estado: EmpresaStatus.ACTIVA,
      establecimientos: [
        {
          id: establishment.id,
          codigo: establishment.code,
          nombre: establishment.name,
          direccion: establishment.address,
          esPrincipal: establishment.isMainEstablishment,
          activo: establishment.isActive,
        },
      ],
      configuracion: {
        emisionElectronica: true,
      },
    };

    const contexto: WorkspaceContext = {
      empresaId: empresa.id,
      establecimientoId: establishment.id,
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
        businessName: company.businessName,
        tradeName: company.tradeName || '',
        fiscalAddress: company.address,
        ubigeo: company.postalCode || '',
        baseCurrency: company.baseCurrency || 'PEN',
        environment: (company.sunatConfiguration.environment === 'TESTING' ? 'TEST' : 'PRODUCTION') as 'TEST' | 'PRODUCTION',
        phones: company.phones?.length > 0 ? company.phones : [''],
        emails: company.emails?.length > 0 ? company.emails : [''],
        economicActivity: company.economicActivity || ''
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
            businessName: parsedData.razonSocial || '',
            tradeName: parsedData.nombreComercial || parsedData.razonSocial || '',
            address: parsedData.direccion || '',
            district: '',
            province: '',
            department: '',
            postalCode: '',
            phones: parsedData.telefono ? [parsedData.telefono] : [],
            emails: [],
            website: undefined,
            logo: undefined,
            footerText: undefined,
            economicActivity: parsedData.actividadEconomica || '',
            taxRegime: 'GENERAL',
            baseCurrency: 'PEN',
            legalRepresentative: {
              name: '',
              documentType: 'DNI',
              documentNumber: ''
            },
            digitalCertificate: undefined,
            sunatConfiguration: {
              isConfigured: false,
              username: undefined,
              environment: 'TESTING',
              lastSyncDate: undefined
            },
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: true
          };

          // Guardar la empresa en el contexto
          dispatch({ type: 'SET_COMPANY', payload: newCompany });
          
          // Cargar los datos en el formulario
          setFormData(prev => ({
            ...prev,
            ruc: parsedData.ruc || '',
            businessName: parsedData.razonSocial || '',
            tradeName: parsedData.nombreComercial || '',
            fiscalAddress: parsedData.direccion || '',
            phones: parsedData.telefono ? [parsedData.telefono] : [''],
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
      formData.ruc !== originalData.ruc ||
      formData.businessName !== originalData.businessName ||
      formData.tradeName !== originalData.tradeName ||
      formData.fiscalAddress !== originalData.fiscalAddress ||
      formData.ubigeo !== originalData.ubigeo ||
      formData.baseCurrency !== originalData.baseCurrency ||
      formData.environment !== originalData.environment ||
      formData.economicActivity !== originalData.economicActivity ||
      JSON.stringify(formData.phones) !== JSON.stringify(originalData.phones) ||
      JSON.stringify(formData.emails) !== JSON.stringify(originalData.emails);

    setHasChanges(hasFormChanges);
  }, [formData, originalData]);

  // Handle RUC validation callback from RucValidator component
  const handleRucValidation = (result: { isValid: boolean; message: string; data?: any }) => {
    setRucValidation(result);

    if (result.isValid && result.data) {
      setFormData(prev => ({
        ...prev,
        businessName: result.data.businessName,
        fiscalAddress: result.data.fiscalAddress,
        ubigeo: result.data.ubigeo
      }));
    }
  };

  const handleArrayFieldChange = (
    field: 'phones' | 'emails',
    index: number,
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayField = (field: 'phones' | 'emails') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayField = (field: 'phones' | 'emails', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };


  const handleEnvironmentChange = (environment: 'TEST' | 'PRODUCTION') => {
    // Block changing back to TEST if already in PRODUCTION
    if (environment === 'TEST' && company?.sunatConfiguration?.environment === 'PRODUCTION') {
      return; // Do nothing - this change is not allowed
    }

    if (environment === 'PRODUCTION') {
      setShowProductionModal(true);
    } else {
      setFormData(prev => ({ ...prev, environment }));
    }
  };

  const confirmProductionChange = () => {
    setFormData(prev => ({ ...prev, environment: 'PRODUCTION' }));
    setShowProductionModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const targetWorkspaceId = workspaceIdForSubmit ?? generateWorkspaceId();
      ensuredWorkspaceIdRef.current = targetWorkspaceId;

      // Filter out empty phones and emails
      const cleanPhones = formData.phones.filter(phone => phone.trim() !== '');
      const cleanEmails = formData.emails.filter(email => email.trim() !== '');

      const updatedCompany: Company = {
        id: company?.id || '1',
        ruc: formData.ruc,
        businessName: formData.businessName,
        tradeName: formData.tradeName || undefined,
        address: formData.fiscalAddress,
        district: company?.district || '',
        province: company?.province || '',
        department: company?.department || '',
        postalCode: formData.ubigeo,
        phones: cleanPhones.length > 0 ? cleanPhones : [],
        emails: cleanEmails.length > 0 ? cleanEmails : [],
        website: company?.website,
        economicActivity: formData.economicActivity,
        taxRegime: company?.taxRegime || 'GENERAL',
        baseCurrency: formData.baseCurrency,
        legalRepresentative: company?.legalRepresentative || {
          name: '',
          documentType: 'DNI',
          documentNumber: ''
        },
        digitalCertificate: company?.digitalCertificate,
        sunatConfiguration: {
          isConfigured: company?.sunatConfiguration?.isConfigured || false,
          username: company?.sunatConfiguration?.username,
          environment: formData.environment === 'TEST' ? 'TESTING' : 'PRODUCTION',
          lastSyncDate: company?.sunatConfiguration?.lastSyncDate
        },
        createdAt: company?.createdAt || new Date(),
        updatedAt: new Date(),
        isActive: company?.isActive ?? true
      };

      dispatch({ type: 'SET_COMPANY', payload: updatedCompany });

      const workspace = createOrUpdateWorkspace({
        id: targetWorkspaceId,
        ruc: formData.ruc,
        razonSocial: formData.businessName,
        nombreComercial: formData.tradeName,
        domicilioFiscal: formData.fiscalAddress,
      });
      ensuredWorkspaceIdRef.current = workspace.id;

      // ===================================================================
      // ONBOARDING AUTOMÁTICO: Crear configuración inicial si es nueva empresa
      // ===================================================================
      const isNewCompany = !company?.id;
      let defaultEstablishment: Establishment | null = null;

      if (isNewCompany && state.establishments.length === 0) {
        // Parsear ubigeo para obtener Departamento, Provincia y Distrito
        const location = parseUbigeoCode(formData.ubigeo);
        
        // 1. CREAR ESTABLECIMIENTO POR DEFECTO
        const createdEstablishment: Establishment = {
          id: 'est-main',
          code: '0001',
          name: 'Establecimiento',
          address: formData.fiscalAddress,
          district: location?.district || 'Lima',
          province: location?.province || 'Lima',
          department: location?.department || 'Lima',
          postalCode: formData.ubigeo,
          phone: cleanPhones[0],
          email: cleanEmails[0],
          isMainEstablishment: true,
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
            economicActivity: company?.economicActivity || 'Comercio',
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
            isWarehouse: false,
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
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true,
        };

        defaultEstablishment = createdEstablishment;
        dispatch({ type: 'ADD_ESTABLISHMENT', payload: createdEstablishment });

        // 2. CREAR ALMACÉN POR DEFECTO
        const defaultWarehouse: Warehouse = {
          id: 'wh-main',
          code: '0001',
          name: 'Almacén',
          establishmentId: 'est-main',
          establishmentName: 'Establecimiento',
          establishmentCode: '0001',
          isActive: true,
          isMainWarehouse: true,
          inventorySettings: {
            allowNegativeStock: false,
            strictStockControl: false,
            requireApproval: false,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          hasMovements: false,
        };

        dispatch({ type: 'ADD_WAREHOUSE', payload: defaultWarehouse });

        // 3. CREAR SERIES POR DEFECTO (FACTURA Y BOLETA)
        const now = new Date();
        
        // Serie de FACTURA (FE01)
        const facturaSeries: Series = {
          id: 'series-factura-default',
          establishmentId: 'est-main',
          documentType: {
            id: 'invoice',
            code: '01',
            name: 'Factura Electrónica',
            shortName: 'FAC',
            category: 'INVOICE',
            properties: {
              affectsTaxes: true,
              requiresCustomerRuc: true,
              requiresCustomerName: true,
              allowsCredit: true,
              requiresPaymentMethod: true,
              canBeVoided: true,
              canHaveCreditNote: true,
              canHaveDebitNote: true,
              isElectronic: true,
              requiresSignature: true,
            },
            seriesConfiguration: {
              defaultPrefix: 'F',
              seriesLength: 3,
              correlativeLength: 8,
              allowedPrefixes: ['F', 'FE'],
            },
            isActive: true,
          },
          series: 'FE01',
          correlativeNumber: 1,
          configuration: {
            minimumDigits: 8,
            startNumber: 1,
            autoIncrement: true,
            allowManualNumber: false,
            requireAuthorization: false,
          },
          sunatConfiguration: {
            isElectronic: true,
            environmentType: formData.environment === 'TEST' ? 'TESTING' : 'PRODUCTION',
            certificateRequired: true,
            mustReportToSunat: true,
            maxDaysToReport: 7,
          },
          status: 'ACTIVE',
          isDefault: true,
          statistics: {
            documentsIssued: 0,
            averageDocumentsPerDay: 0,
          },
          validation: {
            allowZeroAmount: false,
            requireCustomer: true,
          },
          createdAt: now,
          updatedAt: now,
          createdBy: 'system',
          isActive: true,
        };

        // Serie de BOLETA (BE01)
        const boletaSeries: Series = {
          id: 'series-boleta-default',
          establishmentId: 'est-main',
          documentType: {
            id: 'receipt',
            code: '03',
            name: 'Boleta de Venta Electrónica',
            shortName: 'BOL',
            category: 'RECEIPT',
            properties: {
              affectsTaxes: true,
              requiresCustomerRuc: false,
              requiresCustomerName: true,
              allowsCredit: false,
              requiresPaymentMethod: true,
              canBeVoided: true,
              canHaveCreditNote: true,
              canHaveDebitNote: false,
              isElectronic: true,
              requiresSignature: true,
            },
            seriesConfiguration: {
              defaultPrefix: 'B',
              seriesLength: 3,
              correlativeLength: 8,
              allowedPrefixes: ['B', 'BE'],
            },
            isActive: true,
          },
          series: 'BE01',
          correlativeNumber: 1,
          configuration: {
            minimumDigits: 8,
            startNumber: 1,
            autoIncrement: true,
            allowManualNumber: false,
            requireAuthorization: false,
          },
          sunatConfiguration: {
            isElectronic: true,
            environmentType: formData.environment === 'TEST' ? 'TESTING' : 'PRODUCTION',
            certificateRequired: true,
            mustReportToSunat: true,
            maxDaysToReport: 7,
          },
          status: 'ACTIVE',
          isDefault: true,
          statistics: {
            documentsIssued: 0,
            averageDocumentsPerDay: 0,
          },
          validation: {
            allowZeroAmount: false,
            requireCustomer: false,
          },
          createdAt: now,
          updatedAt: now,
          createdBy: 'system',
          isActive: true,
        };

        dispatch({ type: 'ADD_SERIES', payload: facturaSeries });
        dispatch({ type: 'ADD_SERIES', payload: boletaSeries });

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
          establishment: defaultEstablishment,
          userId: session?.userId ?? null,
          configState: {
            cajas: state.cajas,
            currencies: state.currencies,
          },
          dispatch,
        });

      }

      const establishmentForContext =
        defaultEstablishment ||
        state.establishments.find((est) => est.isMainEstablishment) ||
        state.establishments[0] ||
        null;

      if (establishmentForContext) {
        setTenantWorkspaceContext(updatedCompany, establishmentForContext);
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
  const isFormValid = formData.ruc.length === 11 &&
                    formData.businessName.trim() !== '' &&
                    formData.fiscalAddress.trim() !== '' &&
                    (company?.id ? true : rucValidation?.isValid === true) &&
                    hasChanges; // Only enable if there are changes

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => navigate('/configuracion')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Configuración de Empresa
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configura los datos legales y tributarios de tu empresa
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Company Legal Data */}
        <ConfigurationCard
          title="Datos Legales y Tributarios"
          description="Información oficial de tu empresa registrada en SUNAT"
          helpText="Estos datos se obtienen automáticamente al validar el RUC con SUNAT"
        >
          <div className="space-y-6">
            {/* RUC Validator Component */}
            <RucValidator
              value={formData.ruc}
              onChange={(ruc) => setFormData(prev => ({ ...prev, ruc }))}
              onValidation={handleRucValidation}
            />

            {/* Business Name */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Razón Social <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                  className={`
                    w-full px-4 py-3 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    bg-gray-50 dark:bg-gray-800 transition-all duration-200
                    ${formData.businessName ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600'}
                    text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400
                  `}
                  readOnly
                  placeholder="Se completará automáticamente al validar el RUC"
                />
                {formData.businessName && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Trade Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nombre Comercial
              </label>
              <input
                type="text"
                value={formData.tradeName}
                onChange={(e) => setFormData(prev => ({ ...prev, tradeName: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Nombre con el que se conoce tu empresa"
              />
            </div>

            {/* Fiscal Address */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Domicilio Fiscal <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <textarea
                  value={formData.fiscalAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, fiscalAddress: e.target.value }))}
                  className={`
                    w-full px-4 py-3 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    bg-gray-50 dark:bg-gray-800 transition-all duration-200
                    ${formData.fiscalAddress ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600'}
                    text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400
                  `}
                  rows={3}
                  readOnly
                  placeholder="Se completará automáticamente al validar el RUC"
                />
                {formData.fiscalAddress && (
                  <div className="absolute right-3 top-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Economic Activity */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Actividad Económica
              </label>
              <input
                type="text"
                value={formData.economicActivity}
                onChange={(e) => setFormData(prev => ({ ...prev, economicActivity: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Ej: Comercio al por menor"
              />
            </div>
          </div>
        </ConfigurationCard>

        {/* Global Parameters */}
        <ConfigurationCard
          title="Parámetros Globales"
          description="Configuración que afecta todo el sistema"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Base Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Moneda Base *
              </label>
              <select
                value={formData.baseCurrency}
                onChange={(e) => setFormData(prev => ({ ...prev, baseCurrency: e.target.value as 'PEN' | 'USD' }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="PEN">PEN - Soles Peruanos</option>
                <option value="USD">USD - Dólares Americanos</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Impacta catálogos de productos, emisión y POS
              </p>
            </div>

            {/* Environment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ambiente
              </label>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="test"
                    name="environment"
                    checked={formData.environment === 'TEST'}
                    onChange={() => handleEnvironmentChange('TEST')}
                    disabled={company?.sunatConfiguration?.environment === 'PRODUCTION'}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800"
                  />
                  <label htmlFor="test" className={`flex items-center space-x-2 ${company?.sunatConfiguration?.environment === 'PRODUCTION' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Prueba</span>
                    {formData.environment === 'TEST' && (
                      <StatusIndicator status="warning" label="Activo" size="sm" />
                    )}
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="production"
                    name="environment"
                    checked={formData.environment === 'PRODUCTION'}
                    onChange={() => handleEnvironmentChange('PRODUCTION')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                  />
                  <label htmlFor="production" className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Producción</span>
                    {formData.environment === 'PRODUCTION' && (
                      <StatusIndicator status="success" label="Activo" size="sm" />
                    )}
                  </label>
                </div>
              </div>

              {/* Warning: Test Mode */}
              {formData.environment === 'TEST' && company?.sunatConfiguration?.environment !== 'PRODUCTION' && (
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <Shield className="w-4 h-4 inline mr-1" />
                    Los documentos emitidos en prueba no tienen validez legal
                  </p>
                </div>
              )}

              {/* Info: Production Mode Locked */}
              {company?.sunatConfiguration?.environment === 'PRODUCTION' && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <p className="font-medium">Ambiente de Producción Activado</p>
                      <p className="text-xs mt-1">Por seguridad, no es posible regresar al ambiente de prueba una vez activado producción.</p>
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
          description="Teléfonos y correos para comunicación con clientes"
        >
          <div className="space-y-6">
            {/* Phones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Teléfonos
              </label>
              <div className="space-y-2">
                {formData.phones.map((phone, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400 dark:text-gray-500" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => handleArrayFieldChange('phones', index, e.target.value)}
                        placeholder="+51 987 654 321"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      />
                    </div>
                    {formData.phones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayField('phones', index)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={() => addArrayField('phones')}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
                >
                  + Agregar teléfono
                </button>
              </div>
            </div>

            {/* Emails */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Correos Electrónicos
              </label>
              <div className="space-y-2">
                {formData.emails.map((email, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400 dark:text-gray-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => handleArrayFieldChange('emails', index, e.target.value)}
                        placeholder="contacto@miempresa.com"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      />
                    </div>
                    {formData.emails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayField('emails', index)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={() => addArrayField('emails')}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
                >
                  + Agregar correo
                </button>
              </div>
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
            {!isFormValid && formData.ruc.length === 11 && !rucValidation?.isValid && !company?.id && (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Shield className="w-5 h-5" />
                <span className="text-sm font-medium">Valida el RUC para continuar</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/configuracion')}
              className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={!isFormValid || isLoading}
              className={`
                px-8 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2
                ${isFormValid && !isLoading
                  ? 'text-white shadow-lg hover:shadow-xl hover:scale-105'
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }
              `}
              style={isFormValid && !isLoading ? { backgroundColor: '#1478D4' } : {}}
              onMouseEnter={isFormValid && !isLoading ? (e) => e.currentTarget.style.backgroundColor = '#1068C4' : undefined}
              onMouseLeave={isFormValid && !isLoading ? (e) => e.currentTarget.style.backgroundColor = '#1478D4' : undefined}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Guardar Configuración</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Production Confirmation Modal */}
      <ConfirmationModal
        isOpen={showProductionModal}
        onClose={() => setShowProductionModal(false)}
        onConfirm={confirmProductionChange}
        title="⚠️ Cambiar a Ambiente de Producción"
        message="Esta es una acción IRREVERSIBLE. Al activar producción:

• Se eliminarán todos los documentos de prueba
• Necesitarás un Certificado Digital válido
• Los documentos tendrán validez legal ante SUNAT
• NO podrás volver al ambiente de pruebas

¿Estás seguro de continuar?"
        type="warning"
        confirmText="Sí, Activar Producción"
        cancelText="No, Mantener en Prueba"
      />
    </div>
  );
}