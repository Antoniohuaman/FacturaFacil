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
import { Button, Select, Input, RadioButton, PageHeader, Textarea } from '@/contasis';
import { ToastNotifications, type Toast } from '@/components/Toast';
import { useConfigurationContext } from '../contexto/ContextoConfiguracion';
import { TarjetaConfiguracion } from '../components/comunes/TarjetaConfiguracion';
import { IndicadorEstado } from '../components/comunes/IndicadorEstado';
import { ModalConfirmacion } from '../components/comunes/ModalConfirmacion';
import { RucValidator } from '../components/empresa/ValidadorRuc';
import { useTenant } from '../../../../../shared/tenant/TenantContext';
import { generateWorkspaceId } from '../../../../../shared/tenant';
import { useUserSession } from '../../../../../contexts/UserSessionContext';
import type { Company } from '../modelos/Company';
import type { Establecimiento } from '../modelos/Establecimiento';
import type { Currency } from '../modelos/Currency';
import type { Caja, CreateCajaInput } from '../modelos/Caja';
import { CAJA_CONSTRAINTS, MEDIOS_PAGO_DISPONIBLES } from '../modelos/Caja';
import { cajasDataSource } from '../api/fuenteDatosCajas';
import { useTenantStore } from '../../autenticacion/store/TenantStore';
import { EmpresaStatus, RegimenTributario } from '../../autenticacion/types/auth.types';
import { useEmpresas } from '../hooks/useEmpresas';
import { clientesClient } from '../../gestion-clientes/api';
import type { CreateClienteDTO } from '../../gestion-clientes/models';

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
  codigoDepartamento?: string;
  codigoProvincia?: string;
  codigoDistrito?: string;
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

const DEFAULT_CLIENTES_VARIOS = {
  tipoDocumento: '1',
  numeroDocumento: '00000000',
  nombre: 'Clientes Varios',
} as const;

const matchesDefaultClientesVarios = (cliente: { tipoDocumento?: string; numeroDocumento?: string; document?: string }) => {
  const numero = (cliente.numeroDocumento || '').toString().trim();
  const tipo = (cliente.tipoDocumento || '').toString().trim();
  if (tipo === DEFAULT_CLIENTES_VARIOS.tipoDocumento && numero === DEFAULT_CLIENTES_VARIOS.numeroDocumento) {
    return true;
  }

  // Fallback defensivo (legacy): "DNI 00000000" o variantes en el campo document.
  const legacy = (cliente.document || '').toString().toUpperCase();
  return legacy.includes('DNI') && legacy.includes(DEFAULT_CLIENTES_VARIOS.numeroDocumento);
};

async function ensureDefaultClienteClientesVarios(): Promise<void> {
  try {
    const response = await clientesClient.getClientes({
      search: DEFAULT_CLIENTES_VARIOS.numeroDocumento,
      limit: 25,
      page: 1,
    });

    const exists = response.data.some(matchesDefaultClientesVarios);
    if (exists) {
      return;
    }

    const payload: CreateClienteDTO = {
      // Campos legacy (retrocompatibilidad)
      documentType: 'DNI',
      documentNumber: DEFAULT_CLIENTES_VARIOS.numeroDocumento,
      name: DEFAULT_CLIENTES_VARIOS.nombre,
      type: 'Cliente',

      // Campos extendidos (mismo shape del alta manual)
      tipoDocumento: DEFAULT_CLIENTES_VARIOS.tipoDocumento,
      numeroDocumento: DEFAULT_CLIENTES_VARIOS.numeroDocumento,
      tipoPersona: 'Natural',
      tipoCuenta: 'Cliente',
      primerNombre: 'Clientes',
      apellidoPaterno: 'Varios',
      apellidoMaterno: '-',
      nombreCompleto: 'Clientes Varios',
      tipoCliente: 'Natural',
      estadoCliente: 'Habilitado',
      emails: [],
      telefonos: [],
      pais: 'PE',
      formaPago: 'Contado',
      monedaPreferida: 'PEN',
      esAgentePercepcion: false,
      exceptuadaPercepcion: false,
      clientePorDefecto: false,
    };

    await clientesClient.createCliente(payload);
  } catch (error) {
    console.warn('[onboarding] No se pudo crear el cliente default "Clientes Varios"', error);
  }
}

export function CompanyConfiguration() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch } = useConfigurationContext();
  const { company } = state;
  const { 
    isLoading: isApiLoading, 
    actualizarEmpresa, 
    crearEmpresa 
  } = useEmpresas();
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
  const contextoActual = useTenantStore((store) => store.contextoActual);
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
    data?: {
      razonSocial: string;
      direccionFiscal: string;
      ubigeo: string;
    };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showProductionModal, setShowProductionModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState<CompanyFormData | null>(null);
  const [autoConfigProcessed, setAutoConfigProcessed] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const autoConfigRef = useRef(false);
  const operationalSetupRef = useRef(false);

  const showToast = (type: Toast['type'], message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!datosFormulario.ruc.trim()) {
      errors.ruc = 'El RUC es obligatorio';
    } else if (datosFormulario.ruc.length !== 11) {
      errors.ruc = 'El RUC debe tener 11 dígitos';
    } else if (!rucValidation?.isValid && operationType === 'CREATE') {
      errors.ruc = 'Debes validar el RUC con SUNAT';
    }

    if (!datosFormulario.razonSocial.trim()) {
      errors.razonSocial = 'La razón social es obligatoria';
    }

    if (!datosFormulario.direccionFiscal.trim()) {
      errors.direccionFiscal = 'El domicilio fiscal es obligatorio';
    }

    datosFormulario.correosElectronicos.forEach((email, index) => {
      if (email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          errors[`email_${index}`] = 'Formato de correo inválido';
        }
      }
    });

    datosFormulario.telefonos.forEach((phone, index) => {
      if (phone.trim()) {
        const phoneRegex = /^[+]?[0-9\s()-]{7,}$/;
        if (!phoneRegex.test(phone)) {
          errors[`phone_${index}`] = 'Formato de teléfono inválido';
        }
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Sincronizar con el contexto global de empresa
  const empresaIdGlobal = useTenantStore((s) => s.contextoActual?.empresaId);
  const { cargarEmpresa } = useEmpresas();

  useEffect(() => {
    if (empresaIdGlobal && !isCreateWorkspaceMode) {
      cargarEmpresa(empresaIdGlobal);
    }
  }, [empresaIdGlobal, isCreateWorkspaceMode, cargarEmpresa]);

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
    }
  }, [company, dispatch, isCreateWorkspaceMode]);

  // AUTO-CONFIGURACIÓN: Detectar y cargar empresa desde login automáticamente
  useEffect(() => {
    // Prevenir ejecuciones múltiples
    if (autoConfigRef.current || autoConfigProcessed) {
      return;
    }

    // Verificar que hay contexto sugerido del login y NO hay company ya cargada
    if (contextoActual && contextoActual.empresa && !company) {
      autoConfigRef.current = true;
      
      const empresaDelLogin = contextoActual.empresa;
      
      // Mapear empresa del contexto a Company del sistema
      const companyFromLogin: Company = {
        id: empresaDelLogin.id,
        ruc: empresaDelLogin.ruc,
        razonSocial: empresaDelLogin.razonSocial,
        nombreComercial: empresaDelLogin.nombreComercial || empresaDelLogin.razonSocial,
        direccionFiscal: empresaDelLogin.direccion || '',
        distrito: '',
        provincia: '',
        departamento: '',
        codigoPostal: '',
        telefonos: empresaDelLogin.telefono ? [empresaDelLogin.telefono] : [],
        correosElectronicos: empresaDelLogin.email ? [empresaDelLogin.email] : [],
        sitioWeb: undefined,
        logoEmpresa: undefined,
        textoPiePagina: undefined,
        actividadEconomica: empresaDelLogin.actividadEconomica || '',
        regimenTributario: (empresaDelLogin.regimen?.toUpperCase() === 'MYPE' || empresaDelLogin.regimen?.toUpperCase() === 'ESPECIAL') 
          ? empresaDelLogin.regimen.toUpperCase() as 'MYPE' | 'ESPECIAL' 
          : 'GENERAL',
        monedaBase: (contextoActual.configuracion?.monedaBase as 'PEN' | 'USD') || 'PEN',
        representanteLegal: {
          nombreRepresentanteLegal: '',
          tipoDocumentoRepresentante: 'DNI',
          numeroDocumentoRepresentante: ''
        },
        certificadoDigital: undefined,
        configuracionSunatEmpresa: {
          estaConfiguradoEnSunat: empresaDelLogin.configuracion?.emisionElectronica || false,
          usuarioSunat: undefined,
          entornoSunat: (contextoActual.configuracion?.ambienteSunat === 'PRODUCTION' ? 'PRODUCTION' : 'TESTING') as 'TESTING' | 'PRODUCTION',
          fechaUltimaSincronizacionSunat: undefined
        },
        creadoEl: new Date(),
        actualizadoEl: new Date(),
        estaActiva: empresaDelLogin.estado === 'activa'
      };

      // Guardar empresa en el contexto de configuración
      dispatch({ type: 'SET_COMPANY', payload: companyFromLogin });

      // Cargar datos en el formulario
      const formDataFromLogin: CompanyFormData = {
        ruc: companyFromLogin.ruc,
        razonSocial: companyFromLogin.razonSocial,
        nombreComercial: companyFromLogin.nombreComercial || '',
        direccionFiscal: companyFromLogin.direccionFiscal,
        ubigeo: companyFromLogin.codigoPostal || '',
        monedaBase: companyFromLogin.monedaBase,
        entornoSunat: companyFromLogin.configuracionSunatEmpresa.entornoSunat === 'TESTING' ? 'TEST' : 'PRODUCTION',
        telefonos: companyFromLogin.telefonos.length > 0 ? companyFromLogin.telefonos : [''],
        correosElectronicos: companyFromLogin.correosElectronicos.length > 0 ? companyFromLogin.correosElectronicos : [''],
        actividadEconomica: companyFromLogin.actividadEconomica
      };

      setFormData(formDataFromLogin);
      setOriginalData(formDataFromLogin);
      
      // Marcar RUC como validado (viene del backend)
      setRucValidation({
        isValid: true,
        message: 'RUC validado desde el sistema',
        data: {
          razonSocial: companyFromLogin.razonSocial,
          direccionFiscal: companyFromLogin.direccionFiscal,
          ubigeo: companyFromLogin.codigoPostal || ''
        }
      });

      setAutoConfigProcessed(true);
    }
  }, [contextoActual, company, dispatch, autoConfigProcessed, isCreateWorkspaceMode]);

  useEffect(() => {
    if (!originalData) {
      setHasChanges(true);
      return;
    }

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
  const handleRucValidation = (result: { 
    isValid: boolean; 
    message: string; 
    data?: {
      razonSocial: string;
      nombreComercial: string;
      direccionFiscal: string;
      ubigeo: string;
      actividadEconomica: string;
      codigoDepartamento: string;
      codigoProvincia: string;
      codigoDistrito: string;
    }
  }) => {
    setRucValidation(result);

    if (result.isValid && result.data) {
      const { data } = result;
      setFormData(prev => ({
        ...prev,
        razonSocial: data.razonSocial,
        nombreComercial: data.nombreComercial || prev.nombreComercial,
        direccionFiscal: data.direccionFiscal,
        ubigeo: data.ubigeo,
        actividadEconomica: data.actividadEconomica || prev.actividadEconomica,
        codigoDepartamento: data.codigoDepartamento,
        codigoProvincia: data.codigoProvincia,
        codigoDistrito: data.codigoDistrito,
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

  const syncEmpresaToBackend = useCallback(async (isAutomatic = false) => {
    setIsLoading(true);

    try {
      // ==========================================
      // FASE 1: Detectar operación CREATE vs UPDATE
      // ==========================================
      const isRealExistingCompany = company?.id && !company.id.startsWith('company-') && !company.id.startsWith('est-');
      const operationType = isRealExistingCompany ? 'UPDATE' : 'CREATE';

      const targetWorkspaceId = workspaceIdForSubmit ?? generateWorkspaceId();
      ensuredWorkspaceIdRef.current = targetWorkspaceId;

      // Preparar datos del formulario
      const cleanPhones = datosFormulario.telefonos.filter(phone => phone.trim() !== '');
      const cleanEmails = datosFormulario.correosElectronicos.filter(email => email.trim() !== '');

      const companyData: Partial<Company> = {
        ruc: datosFormulario.ruc,
        razonSocial: datosFormulario.razonSocial,
        nombreComercial: datosFormulario.nombreComercial || undefined,
        direccionFiscal: datosFormulario.direccionFiscal,
        codigoPostal: datosFormulario.ubigeo,
        telefonos: cleanPhones,
        correosElectronicos: cleanEmails,
        actividadEconomica: datosFormulario.actividadEconomica,
        monedaBase: datosFormulario.monedaBase,
        codigoDepartamento: datosFormulario.codigoDepartamento,
        codigoProvincia: datosFormulario.codigoProvincia,
        codigoDistrito: datosFormulario.codigoDistrito,
        configuracionSunatEmpresa: {
          estaConfiguradoEnSunat: company?.configuracionSunatEmpresa?.estaConfiguradoEnSunat || false,
          entornoSunat: datosFormulario.entornoSunat === 'TEST' ? 'TESTING' : 'PRODUCTION',
        },
        estaActiva: company?.estaActiva ?? true
      };

      // ==========================================
      // FASE 2: Ejecutar CREATE o UPDATE (Backend hace onboarding)
      // ==========================================
      let updatedCompany: Company;
      
      if (operationType === 'UPDATE') {
        updatedCompany = await actualizarEmpresa(company!.id, companyData);
      } else {
        updatedCompany = await crearEmpresa(companyData);
      }

      const workspace = createOrUpdateWorkspace({
        id: targetWorkspaceId,
        ruc: updatedCompany.ruc,
        razonSocial: updatedCompany.razonSocial,
        nombreComercial: updatedCompany.nombreComercial,
        domicilioFiscal: updatedCompany.direccionFiscal,
      });
      ensuredWorkspaceIdRef.current = workspace.id;

      // ==========================================
      // Sincronizar TenantStore con la empresa guardada
      // ==========================================
      const empresaEntry = {
        id: updatedCompany.id,
        ruc: updatedCompany.ruc,
        razonSocial: updatedCompany.razonSocial,
        nombreComercial: updatedCompany.nombreComercial,
        direccion: updatedCompany.direccionFiscal,
        telefono: updatedCompany.telefonos?.[0],
        email: updatedCompany.correosElectronicos?.[0],
        actividadEconomica: updatedCompany.actividadEconomica,
        regimen: (updatedCompany.regimenTributario as RegimenTributario) ?? RegimenTributario.GENERAL,
        estado: updatedCompany.estaActiva ? EmpresaStatus.ACTIVA : EmpresaStatus.SUSPENDIDA,
        establecimientos: contextoActual?.empresa.establecimientos || [],
        configuracion: {
          emisionElectronica: true,
        },
      };

      // Actualizar empresas en TenantStore
      const { empresas } = useTenantStore.getState();
      const withoutEmpresa = empresas.filter((item) => item.id !== empresaEntry.id);
      setTenantEmpresas([...withoutEmpresa, empresaEntry]);

      // Si hay contextoActual, actualizarlo con la empresa guardada
      if (contextoActual) {
        const updatedContexto = {
          ...contextoActual,
          empresa: empresaEntry,
          empresaId: empresaEntry.id,
        };
        setTenantContextoActual(updatedContexto);
      }

      // ==========================================
      // FASE 3: Feedback y navegación
      // ==========================================
      if (!isAutomatic) {
        setTimeout(() => {
          navigate('/configuracion');
        }, 1500);
      }

      return { success: true, empresa: updatedCompany };
    } catch (error) {
      console.error('[ConfiguracionEmpresa] ❌ Error al guardar empresa:', error);
      const mensajeError = error instanceof Error ? error.message : 'Error desconocido';
      
      if (!isAutomatic) {
        alert(`Error al guardar: ${mensajeError}`);
      }
      
      return { success: false, error: mensajeError, empresa: undefined };
    } finally {
      setIsLoading(false);
    }
  }, [company, datosFormulario, workspaceIdForSubmit, actualizarEmpresa, crearEmpresa, createOrUpdateWorkspace, contextoActual, setTenantEmpresas, setTenantContextoActual, navigate]);

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('error', 'Por favor, corrige los errores en el formulario');
      return;
    }

    const result = await syncEmpresaToBackend(false);
    
    if (result.success) {
      showToast('success', operationType === 'UPDATE' ? 'Empresa actualizada correctamente' : 'Empresa creada correctamente');
    } else {
      showToast('error', result.error || 'Error al guardar la empresa');
    }
  };

  useEffect(() => {
    const executeAutoSync = async () => {
      if (!autoConfigProcessed || !company || operationalSetupRef.current) {
        return;
      }

      const isRealCompany = company.id && !company.id.startsWith('company-') && !company.id.startsWith('est-');
      if (!isRealCompany) {
        return;
      }

      operationalSetupRef.current = true;

      try {
        const result = await syncEmpresaToBackend(true);
        
        if (!result.success) {
          console.error('[ConfiguracionEmpresa] Error en sincronización automática:', result.error);
          return;
        }

        const establecimientoActual = contextoActual?.establecimiento;
        
        if (!establecimientoActual) {
          console.warn('[ConfiguracionEmpresa] No hay establecimiento en contexto');
          return;
        }

        const establecimientoMapped: Establecimiento = {
          id: establecimientoActual.id,
          codigo: establecimientoActual.codigo,
          nombre: establecimientoActual.nombre,
          direccion: establecimientoActual.direccion,
          distrito: '',
          provincia: '',
          departamento: '',
          codigoDistrito: '',
          codigoProvincia: '',
          codigoDepartamento: '',
          principal: establecimientoActual.esPrincipal || false,
          businessHours: {},
          sunatConfiguration: {
            isRegistered: false
          },
          inventoryConfiguration: {
            managesInventory: true,
            isalmacen: true,
            allowNegativeStock: false,
            autoTransferStock: false
          },
          financialConfiguration: {
            handlesCash: true,
            defaultCurrencyId: 'PEN',
            acceptedCurrencies: ['PEN', 'USD'],
            defaultTaxId: 'IGV',
            bankAccounts: []
          },
          estado: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
          esActivo: establecimientoActual.activo
        };

        await ensureDefaultOperationalSetup({
          company: result.empresa!,
          Establecimiento: establecimientoMapped,
          userId: session?.userId || null,
          configState: state,
          dispatch,
        });

        await ensureDefaultClienteClientesVarios();
      } catch (error) {
        console.error('[ConfiguracionEmpresa] Error en sincronización automática:', error);
      }
    };

    executeAutoSync();
  }, [autoConfigProcessed, company, contextoActual, session, state, dispatch, syncEmpresaToBackend]);


  // Form validation logic
  // For new company: require RUC validation + has changes
  // For existing company: allow updates without re-validating RUC but require changes
  const isRealExistingCompany = company?.id && !company.id.startsWith('company-') && !company.id.startsWith('est-');
  const operationType = isRealExistingCompany ? 'UPDATE' : 'CREATE';
  
  const isFormValid = datosFormulario.ruc.length === 11 &&
    datosFormulario.razonSocial.trim() !== '' &&
    datosFormulario.direccionFiscal.trim() !== '' &&
    (isRealExistingCompany ? true : rucValidation?.isValid === true) &&
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

      <ToastNotifications toasts={toasts} />

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          <form onSubmit={manejarEnvio} className="space-y-8">{/* Company Legal Data */}
            <TarjetaConfiguracion
              title="Datos Legales y Tributarios"
              density="compact"
            >
              <div className="space-y-2">
                {/* RUC Validator Component */}
                <RucValidator
                  value={datosFormulario.ruc}
                  onChange={(ruc) => {
                    setFormData(prev => ({ ...prev, ruc }));
                    if (formErrors.ruc) {
                      setFormErrors(prev => ({ ...prev, ruc: '' }));
                    }
                  }}
                  onValidation={handleRucValidation}
                  onToast={showToast}
                  error={formErrors.ruc}
                />
                
                {formErrors.ruc && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2.5 mt-1.5">
                    <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-1.5 font-medium">
                      <X className="w-4 h-4" />
                      {formErrors.ruc}
                    </p>
                  </div>
                )}

                {/* Business Name */}
                <div>
                  <Input
                    label="Razón Social"
                    type="text"
                    value={datosFormulario.razonSocial}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, razonSocial: e.target.value }));
                      if (formErrors.razonSocial) {
                        setFormErrors(prev => ({ ...prev, razonSocial: '' }));
                      }
                    }}
                    placeholder="Se completará automáticamente al validar el RUC"
                    readOnly
                    disabled
                    rightIcon={datosFormulario.razonSocial ? <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" /> : undefined}
                    required
                    error={formErrors.razonSocial}
                  />
                </div>

                {/* Trade Name */}
                <div>
                  <Input
                    label="Nombre Comercial"
                    type="text"
                    value={datosFormulario.nombreComercial}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, nombreComercial: e.target.value }));
                      if (formErrors.nombreComercial) {
                        setFormErrors(prev => ({ ...prev, nombreComercial: '' }));
                      }
                    }}
                    placeholder="Nombre con el que se conoce tu empresa"
                    error={formErrors.nombreComercial}
                  />
                </div>

                {/* Fiscal Address */}
                <div>
                  <Textarea
                    label="Domicilio Fiscal"
                    value={datosFormulario.direccionFiscal}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, direccionFiscal: e.target.value }));
                      if (formErrors.direccionFiscal) {
                        setFormErrors(prev => ({ ...prev, direccionFiscal: '' }));
                      }
                    }}
                    placeholder="Se completará automáticamente al validar el RUC"
                    rows={2}
                    disabled
                    required
                    error={formErrors.direccionFiscal}
                  />
                </div>

                <Input
                  label="Actividad Económica"
                  type="text"
                  value={datosFormulario.actividadEconomica}
                  onChange={(e) => setFormData(prev => ({ ...prev, actividadEconomica: e.target.value }))}
                />
              </div>
            </TarjetaConfiguracion>

            {/* Global Parameters */}
            <TarjetaConfiguracion
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
                  <div className="flex items-center space-x-6">
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
                        <IndicadorEstado status="warning" label="Activo" size="sm" />
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
                        <IndicadorEstado status="success" label="Activo" size="sm" />
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
            </TarjetaConfiguracion>

            {/* Contact Information */}
            <TarjetaConfiguracion
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
                            onChange={(e) => {
                              handleArrayFieldChange('telefonos', index, e.target.value);
                              if (formErrors[`phone_${index}`]) {
                                setFormErrors(prev => ({ ...prev, [`phone_${index}`]: '' }));
                              }
                            }}
                            placeholder="+51 987 654 321"
                            leftIcon={<Phone size={18} />}
                            error={formErrors[`phone_${index}`]}
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
                            onChange={(e) => {
                              handleArrayFieldChange('correosElectronicos', index, e.target.value);
                              if (formErrors[`email_${index}`]) {
                                setFormErrors(prev => ({ ...prev, [`email_${index}`]: '' }));
                              }
                            }}
                            placeholder="contacto@miempresa.com"
                            leftIcon={<Mail size={18} />}
                            error={formErrors[`email_${index}`]}
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
            </TarjetaConfiguracion>

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
              {/* Form Status Indicator */}
              <div className="flex items-center gap-3">
                {isFormValid && hasChanges && (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 animate-in slide-in-from-left duration-300">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      {operationType === 'UPDATE' ? 'Listo para actualizar' : 'Listo para crear empresa'}
                    </span>
                  </div>
                )}
                {isRealExistingCompany && !hasChanges && (
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">Sin cambios pendientes</span>
                  </div>
                )}
                {!isFormValid && datosFormulario.ruc.length === 11 && !rucValidation?.isValid && operationType === 'CREATE' && (
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
                  disabled={!isFormValid || isLoading || isApiLoading}
                  icon={(isLoading || isApiLoading) ? <Loader2 className="animate-spin" /> : undefined}
                >
                  {(isLoading || isApiLoading) 
                    ? (operationType === 'UPDATE' ? 'Actualizando...' : 'Creando empresa...') 
                    : (operationType === 'UPDATE' ? 'Actualizar Empresa' : 'Crear Empresa')}
                </Button>
              </div>
            </div>
          </form>

          {/* Production Confirmation Modal */}
          <ModalConfirmacion
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


