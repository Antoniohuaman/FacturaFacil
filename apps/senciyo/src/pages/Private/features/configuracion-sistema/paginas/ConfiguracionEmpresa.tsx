// src/features/configuration/pages/CompanyConfiguration.tsx
import { useState, useEffect, useRef, useMemo } from 'react';
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
import { Button, Select, Input, PageHeader } from '@/contasis';
import {
  construirEmpresaInicial,
  inicializarEmpresaEnAlmacenamiento,
  useConfigurationContext,
} from '../contexto/ContextoConfiguracion';
import { TarjetaConfiguracion } from '../components/comunes/TarjetaConfiguracion';
import { RucValidator } from '../components/empresa/ValidadorRuc';
import { useTenant } from '../../../../../shared/tenant/TenantContext';
import { generateWorkspaceId } from '../../../../../shared/tenant';
import { useUserSession } from '../../../../../contexts/UserSessionContext';
import type { Company } from '../modelos/Company';
import { obtenerUsuarioDesdeSesion, tienePermiso } from '../utilidades/permisos';
import type { DatosConsultaRuc } from '@/shared/documentos/servicioConsultaDocumentos';
import {
  coincideConDatosBaseDemo,
  esEmpresaDemo,
  esRucEmpresaDemo,
} from '@/shared/empresas/empresaDemo';


interface CompanyFormData {
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  direccionFiscal: string;
  ubigeo: string;
  departamento: string;
  provincia: string;
  distrito: string;
  monedaBase: 'PEN' | 'USD';
  telefonos: string[];
  correosElectronicos: string[];
  actividadEconomica: string;
}

type WorkspaceNavigationState = {
  workspaceMode?: 'create_workspace' | 'edit_workspace';
  workspaceId?: string;
  returnTo?: string;
} | null;

export function CompanyConfiguration() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch, rolesConfigurados } = useConfigurationContext();
  const { company } = state;
  const { session } = useUserSession();
  const usuarioActual = useMemo(() => obtenerUsuarioDesdeSesion(state.users, session), [state.users, session]);
  const puedeEditarEmpresa = useMemo(() => tienePermiso({
    usuario: usuarioActual,
    permisoId: 'config.empresa.editar',
    rolesDisponibles: rolesConfigurados,
    establecimientoId: session?.currentEstablecimientoId,
  }), [rolesConfigurados, session?.currentEstablecimientoId, usuarioActual]);
  const {
    createOrUpdateWorkspace,
    activeWorkspace,
    tenantId,
    workspaces,
    setActiveEstablecimientoId,
    setActiveEstablecimientoIdParaTenant,
  } = useTenant();
  const workspaceState = (location.state as WorkspaceNavigationState) ?? null;
  const rutaRetorno = workspaceState?.returnTo || '/configuracion';
  const navegarRetorno = () => navigate(rutaRetorno);
  const isCreateWorkspaceMode = workspaceState?.workspaceMode === 'create_workspace';
  const empresaActual = isCreateWorkspaceMode ? null : company;
  const esEmpresaDemoActual = esEmpresaDemo(empresaActual);
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
  const workspaceIdForSubmit = isCreateWorkspaceMode
    ? ensuredWorkspaceIdRef.current
    : workspaceState?.workspaceId || tenantId || activeWorkspace?.id;

  const [datosFormulario, setFormData] = useState<CompanyFormData>({
    ruc: '',
    razonSocial: '',
    nombreComercial: '',
    direccionFiscal: '',
    ubigeo: '',
    departamento: '',
    provincia: '',
    distrito: '',
    monedaBase: 'PEN',
    telefonos: [''],
    correosElectronicos: [''],
    actividadEconomica: ''
  });

  const [rucValidation, setRucValidation] = useState<{
    isValid: boolean;
    message: string;
    data?: DatosConsultaRuc;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState<CompanyFormData | null>(null);
  const entornoSunatInterno = useMemo<'TEST' | 'PRODUCTION'>(() => {
    if (isCreateWorkspaceMode) {
      return 'PRODUCTION';
    }

    if (esEmpresaDemoActual) {
      return 'TEST';
    }

    return empresaActual?.configuracionSunatEmpresa?.entornoSunat === 'PRODUCTION'
      ? 'PRODUCTION'
      : 'TEST';
  }, [empresaActual?.configuracionSunatEmpresa?.entornoSunat, esEmpresaDemoActual, isCreateWorkspaceMode]);

  const datosFormularioCoincidenConDemo = useMemo(
    () => coincideConDatosBaseDemo({
      ruc: datosFormulario.ruc,
      razonSocial: datosFormulario.razonSocial,
      nombreComercial: datosFormulario.nombreComercial,
      direccionFiscal: datosFormulario.direccionFiscal,
      actividadEconomica: datosFormulario.actividadEconomica,
    }),
    [
      datosFormulario.actividadEconomica,
      datosFormulario.direccionFiscal,
      datosFormulario.nombreComercial,
      datosFormulario.razonSocial,
      datosFormulario.ruc,
    ],
  );

  const existeRucDuplicado = useMemo(() => {
    const ruc = datosFormulario.ruc.trim();
    if (!ruc || ruc.length !== 11) {
      return false;
    }

    const empresaActualId = empresaActual?.id ?? workspaceIdForSubmit;

    return workspaces.some((workspace) => {
      if (workspace.id === empresaActualId) {
        return false;
      }

      return workspace.ruc.trim() !== '' && workspace.ruc === ruc;
    });
  }, [datosFormulario.ruc, empresaActual?.id, workspaceIdForSubmit, workspaces]);

  const mensajeValidacionBloqueante = useMemo(() => {
    if (!esEmpresaDemoActual && esRucEmpresaDemo(datosFormulario.ruc)) {
      return 'El RUC de la demo solo puede usarse en la empresa demo inicial.';
    }

    if (!esEmpresaDemoActual && datosFormularioCoincidenConDemo) {
      return 'Los datos base de SenciYo solo pueden existir en la demo inicial.';
    }

    if (existeRucDuplicado) {
      return 'Ya existe una empresa registrada con ese RUC.';
    }

    return null;
  }, [datosFormulario.ruc, datosFormularioCoincidenConDemo, esEmpresaDemoActual, existeRucDuplicado]);

  // Load existing company data
  useEffect(() => {
    if (isCreateWorkspaceMode) {
      return;
    }

    if (empresaActual) {
      // Empresa ya existe en el contexto, cargar sus datos
      const loadedData = {
        ruc: empresaActual.ruc,
        razonSocial: empresaActual.razonSocial,
        nombreComercial: empresaActual.nombreComercial || '',
        direccionFiscal: empresaActual.direccionFiscal,
        ubigeo: empresaActual.codigoPostal || '',
        departamento: empresaActual.departamento || '',
        provincia: empresaActual.provincia || '',
        distrito: empresaActual.distrito || '',
        monedaBase: empresaActual.monedaBase || 'PEN',
        telefonos: empresaActual.telefonos?.length > 0 ? empresaActual.telefonos : [''],
        correosElectronicos: empresaActual.correosElectronicos?.length > 0 ? empresaActual.correosElectronicos : [''],
        actividadEconomica: empresaActual.actividadEconomica || ''
      };
      setFormData(loadedData);
      setOriginalData(loadedData);
      setHasChanges(false);
    }
  }, [empresaActual, isCreateWorkspaceMode]);

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
      datosFormulario.departamento !== originalData.departamento ||
      datosFormulario.provincia !== originalData.provincia ||
      datosFormulario.distrito !== originalData.distrito ||
      datosFormulario.monedaBase !== originalData.monedaBase ||
      datosFormulario.actividadEconomica !== originalData.actividadEconomica ||
      JSON.stringify(datosFormulario.telefonos) !== JSON.stringify(originalData.telefonos) ||
      JSON.stringify(datosFormulario.correosElectronicos) !== JSON.stringify(originalData.correosElectronicos);

    setHasChanges(hasFormChanges);
  }, [datosFormulario, originalData]);

  // Handle RUC validation callback from RucValidator component
  const handleRucValidation = (result: { isValid: boolean; message: string; data?: DatosConsultaRuc }) => {
    if (esEmpresaDemoActual) {
      return;
    }

    if (result.isValid && isCreateWorkspaceMode && esRucEmpresaDemo(result.data?.ruc || datosFormulario.ruc)) {
      setRucValidation({
        isValid: false,
        message: 'El RUC de la demo no se puede registrar como empresa real.',
      });
      return;
    }

    setRucValidation(result);

    if (result.isValid && result.data) {
      const datosSunat = result.data;

      setFormData(prev => ({
        ...prev,
        razonSocial: datosSunat.razonSocial,
        nombreComercial: prev.nombreComercial.trim() ? prev.nombreComercial : (datosSunat.nombreComercial || ''),
        direccionFiscal: datosSunat.direccion,
        ubigeo: datosSunat.ubigeo || prev.ubigeo,
        departamento: datosSunat.departamento || prev.departamento,
        provincia: datosSunat.provincia || prev.provincia,
        distrito: datosSunat.distrito || prev.distrito,
        actividadEconomica: prev.actividadEconomica.trim()
          ? prev.actividadEconomica
          : (datosSunat.actividadEconomicaPrincipal || datosSunat.actEconomicas?.[0] || ''),
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

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!puedeEditarEmpresa) {
      alert('No tienes permisos para editar la configuracion de empresa.');
      return;
    }

    setIsLoading(true);

    try {
      if (!workspaceIdForSubmit) {
        throw new Error('No hay workspace activo para guardar la empresa.');
      }

      if (mensajeValidacionBloqueante) {
        throw new Error(mensajeValidacionBloqueante);
      }

      const targetWorkspaceId = workspaceIdForSubmit;
      ensuredWorkspaceIdRef.current = targetWorkspaceId;

      // Filter out empty phones and emails
      const cleanPhones = datosFormulario.telefonos.filter(phone => phone.trim() !== '');
      const cleanEmails = datosFormulario.correosElectronicos.filter(email => email.trim() !== '');

      const datosEmpresa = {
        ruc: datosFormulario.ruc,
        razonSocial: datosFormulario.razonSocial,
        nombreComercial: datosFormulario.nombreComercial,
        direccionFiscal: datosFormulario.direccionFiscal,
        ubigeo: datosFormulario.ubigeo,
        departamento: datosFormulario.departamento,
        provincia: datosFormulario.provincia,
        distrito: datosFormulario.distrito,
        actividadEconomica: datosFormulario.actividadEconomica,
        telefonos: cleanPhones,
        correosElectronicos: cleanEmails,
        monedaBase: datosFormulario.monedaBase,
        entornoSunat: entornoSunatInterno,
        tipoEmpresa: esEmpresaDemoActual ? 'demo' as const : 'real' as const,
      };

      if (isCreateWorkspaceMode) {
        const resultadoInicializacion = await inicializarEmpresaEnAlmacenamiento({
          tenantId: targetWorkspaceId,
          datos: datosEmpresa,
          userId: session?.userId ?? null,
        });

        createOrUpdateWorkspace({
          id: targetWorkspaceId,
          tipoEmpresa: resultadoInicializacion.company.tipoEmpresa,
          ruc: resultadoInicializacion.company.ruc,
          razonSocial: resultadoInicializacion.company.razonSocial,
          nombreComercial: resultadoInicializacion.company.nombreComercial,
          domicilioFiscal: resultadoInicializacion.company.direccionFiscal,
        });

        setActiveEstablecimientoIdParaTenant(targetWorkspaceId, resultadoInicializacion.establecimiento.id);

        if (resultadoInicializacion.monedas.length) {
          dispatch({ type: 'SET_CURRENCIES', payload: resultadoInicializacion.monedas });
        }

        if (resultadoInicializacion.impuestos.length) {
          dispatch({ type: 'SET_TAXES', payload: resultadoInicializacion.impuestos });
        }

        navigate(rutaRetorno);
        return;
      }

      const updatedCompany: Company = construirEmpresaInicial({
        companyId: targetWorkspaceId,
        datos: datosEmpresa,
        baseCompany: empresaActual,
        fechaUltimaSincronizacionSunat:
          rucValidation?.isValid && rucValidation.data?.ruc === datosFormulario.ruc
            ? new Date()
            : empresaActual?.configuracionSunatEmpresa?.fechaUltimaSincronizacionSunat,
      });

      dispatch({ type: 'SET_COMPANY', payload: updatedCompany });

      const workspace = createOrUpdateWorkspace({
        id: targetWorkspaceId,
        tipoEmpresa: updatedCompany.tipoEmpresa,
        ruc: datosFormulario.ruc,
        razonSocial: datosFormulario.razonSocial,
        nombreComercial: datosFormulario.nombreComercial,
        domicilioFiscal: datosFormulario.direccionFiscal,
      });
      ensuredWorkspaceIdRef.current = workspace.id;

      // ===================================================================
      // ONBOARDING AUTOMÁTICO: Crear configuración inicial si es nueva empresa
      // ===================================================================
      const isNewCompany = !empresaActual?.id;
      let defaultEstablecimiento = null;

      if (isNewCompany && state.Establecimientos.length === 0) {
        const resultadoInicializacion = await inicializarEmpresaEnAlmacenamiento({
          tenantId: targetWorkspaceId,
          datos: datosEmpresa,
          userId: session?.userId ?? null,
        });

        defaultEstablecimiento = resultadoInicializacion.establecimiento;
        dispatch({ type: 'SET_EstablecimientoS', payload: [resultadoInicializacion.establecimiento] });
        dispatch({ type: 'SET_ALMACENES', payload: [resultadoInicializacion.almacen] });
        dispatch({ type: 'SET_CAJAS', payload: [resultadoInicializacion.caja] });
        dispatch({ type: 'SET_SERIES', payload: resultadoInicializacion.series });
        dispatch({ type: 'SET_CURRENCIES', payload: resultadoInicializacion.monedas });
        dispatch({ type: 'SET_TAXES', payload: resultadoInicializacion.impuestos });
      }

      const EstablecimientoForContext =
        defaultEstablecimiento ||
        state.Establecimientos.find((est) => est.isMainEstablecimiento) ||
        state.Establecimientos[0] ||
        null;

      if (EstablecimientoForContext) {
        setActiveEstablecimientoId(EstablecimientoForContext.id);
      }

      // Show success and redirect
      navigate(rutaRetorno);
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
    (empresaActual?.id ? true : rucValidation?.isValid === true) &&
    !mensajeValidacionBloqueante &&
    hasChanges; // Only enable if there are changes

  if (!empresaActual && !isCreateWorkspaceMode) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader
          title="Configuración de Empresa"
          actions={
            <Button
              variant="secondary"
              icon={<ArrowLeft />}
              onClick={navegarRetorno}
            >
              Volver
            </Button>
          }
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Cargando datos de la empresa...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <PageHeader
        title="Configuración de Empresa"
        actions={
          <Button
            variant="secondary"
            icon={<ArrowLeft />}
            onClick={navegarRetorno}
          >
            Volver
          </Button>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          <form onSubmit={manejarEnvio} className="space-y-8">
            {/* Company Legal Data */}
            <TarjetaConfiguracion
              title="Datos Legales y Tributarios"
              density="compact"
            >
              <div className="space-y-2">
                {esEmpresaDemoActual && (
                  <div className="mb-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-200">
                    Esta empresa corresponde a la demo inicial.
                  </div>
                )}

                {/* RUC Validator Component */}
                <RucValidator
                  value={datosFormulario.ruc}
                  onChange={(ruc) => setFormData(prev => ({ ...prev, ruc }))}
                  onValidation={handleRucValidation}
                  disabled={esEmpresaDemoActual}
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
                    disabled={esEmpresaDemoActual}
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
                  disabled={esEmpresaDemoActual}
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
            </TarjetaConfiguracion>

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
              {/* Form Status Indicator */}
              <div className="flex items-center gap-3">
                {isFormValid && hasChanges && (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 animate-in slide-in-from-left duration-300">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      {empresaActual?.id ? 'Listo para guardar cambios' : 'Formulario completo y listo para guardar'}
                    </span>
                  </div>
                )}
                {empresaActual?.id && !hasChanges && (
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">Sin cambios pendientes</span>
                  </div>
                )}
                {mensajeValidacionBloqueante && (
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <Shield className="w-5 h-5" />
                    <span className="text-sm font-medium">{mensajeValidacionBloqueante}</span>
                  </div>
                )}
                {!isFormValid && datosFormulario.ruc.length === 11 && !rucValidation?.isValid && !empresaActual?.id && !mensajeValidacionBloqueante && (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Shield className="w-5 h-5" />
                    <span className="text-sm font-medium">Valida el RUC para continuar</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={navegarRetorno}
                >
                  Cancelar
                </Button>

                <Button
                  variant="primary"
                  type="submit"
                  disabled={!isFormValid || isLoading}
                  icon={isLoading ? <Loader2 className="animate-spin" /> : undefined}
                >
                  {isLoading ? 'Guardando...' : empresaActual?.id ? 'Guardar Cambios' : 'Crear Empresa'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};


