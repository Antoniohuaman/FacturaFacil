// src/features/autenticacion/pages/ContextSelectPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { useAuth } from '../hooks';
import { useUserSession } from '../../../../../contexts/UserSessionContext';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { buildMissingDefaultSeries } from '../../configuracion-sistema/utilidades/seriesPredeterminadas';
import type { Empresa, Establecimiento } from '../types/auth.types';

/**
 * ============================================
 * CONTEXT SELECT PAGE - Selección de Contexto
 * ============================================
 * Permite al usuario seleccionar la empresa y establecimiento
 * con los que desea trabajar
 */

export function ContextSelectPage() {
  const navigate = useNavigate();
  const { user, empresas, selectContext, isLoading } = useAuth();
  const { setSession, updateAvailableEstablishments } = useUserSession();
  const { state: configState, dispatch } = useConfigurationContext();

  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(
    empresas.length === 1 ? empresas[0] : null
  );
  const [selectedEstablecimiento, setSelectedEstablecimiento] = useState<Establecimiento | null>(
    null
  );

  const handleSelectEmpresa = (empresa: Empresa) => {
    setSelectedEmpresa(empresa);
    // Auto-seleccionar el establecimiento principal si existe
    const principal = empresa.establecimientos.find((e) => e.esPrincipal);
    setSelectedEstablecimiento(principal || empresa.establecimientos[0] || null);
  };

  // Sincronizar establecimientos desde configuración cuando se carga
  useEffect(() => {
    if (configState.establishments.length > 0 && selectedEmpresa) {
      updateAvailableEstablishments(configState.establishments.filter(e => e.isActive));
    }
  }, [configState.establishments, selectedEmpresa, updateAvailableEstablishments]);

  const handleContinue = async () => {
    if (!selectedEmpresa || !selectedEstablecimiento || !user) return;

    try {
      await selectContext({
        empresaId: selectedEmpresa.id,
        establecimientoId: selectedEstablecimiento.id,
      });

      // ===================================================================
      // SINCRONIZAR DATOS DE EMPRESA A CONFIGURATIONCONTEXT
      // ===================================================================
      // Crear objeto Company con estructura correcta
      const companyForConfig = {
        id: selectedEmpresa.id,
        ruc: selectedEmpresa.ruc,
        razonSocial: selectedEmpresa.razonSocial,
        nombreComercial: selectedEmpresa.nombreComercial || selectedEmpresa.razonSocial,
        direccionFiscal: selectedEmpresa.direccion || '',
        distrito: '',
        provincia: '',
        departamento: '',
        codigoPostal: '',
        telefonos: [],
        correosElectronicos: [],
        sitioWeb: undefined,
        logoEmpresa: selectedEmpresa.logo,
        textoPiePagina: undefined,
        actividadEconomica: '',
        regimenTributario: 'GENERAL' as const,
        monedaBase: 'PEN' as const,
        representanteLegal: {
          nombreRepresentanteLegal: '',
          tipoDocumentoRepresentante: 'DNI' as const,
          numeroDocumentoRepresentante: ''
        },
        certificadoDigital: undefined,
        configuracionSunatEmpresa: {
          estaConfiguradoEnSunat: false,
          usuarioSunat: undefined,
          entornoSunat: 'TESTING' as const,
          fechaUltimaSincronizacionSunat: undefined
        },
        creadoEl: new Date(),
        actualizadoEl: new Date(),
        estaActiva: selectedEmpresa.estado === 'activa'
      };

      // Si la empresa NO existe en ConfigurationContext, crearla
      if (!configState.company || configState.company.ruc !== selectedEmpresa.ruc) {
        dispatch({ type: 'SET_COMPANY', payload: companyForConfig });
      }

      // Si el establecimiento NO existe en ConfigurationContext, crearlo
      const establishmentExists = configState.establishments.find(
        est => est.code === selectedEstablecimiento.codigo
      );

      let fullEstablishment = establishmentExists;

      if (!establishmentExists) {
        const newEstablishment = {
          id: selectedEstablecimiento.id,
          code: selectedEstablecimiento.codigo,
          name: selectedEstablecimiento.nombre,
          address: selectedEstablecimiento.direccion || '',
          district: '',
          province: '',
          department: '',
          postalCode: '',
          phone: undefined,
          email: undefined,
          isMainEstablishment: selectedEstablecimiento.esPrincipal || true,
          businessHours: {
            monday: { isOpen: true, openTime: '09:00', closeTime: '18:00', is24Hours: false },
            tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00', is24Hours: false },
            wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00', is24Hours: false },
            thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00', is24Hours: false },
            friday: { isOpen: true, openTime: '09:00', closeTime: '18:00', is24Hours: false },
            saturday: { isOpen: true, openTime: '09:00', closeTime: '13:00', is24Hours: false },
            sunday: { isOpen: false, openTime: '00:00', closeTime: '00:00', is24Hours: false }
          },
          sunatConfiguration: {
            isRegistered: true,
            registrationDate: new Date(),
            annexCode: '0000',
            economicActivity: 'Comercio'
          },
          posConfiguration: {
            hasPos: true,
            terminalCount: 1,
            printerConfiguration: {
              hasPrinter: false,
              printerType: 'THERMAL' as const,
              paperSize: 'TICKET_80MM' as const,
              isNetworkPrinter: false
            },
            cashDrawerConfiguration: {
              hasCashDrawer: false,
              openMethod: 'MANUAL' as const,
              currency: 'PEN' as const
            },
            barcodeScanner: {
              hasScanner: false,
              scannerType: 'USB' as const
            }
          },
          inventoryConfiguration: {
            managesInventory: true,
            isWarehouse: false,
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
          status: 'ACTIVE' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: selectedEstablecimiento.activo
        };

        dispatch({ type: 'ADD_ESTABLISHMENT', payload: newEstablishment });
        fullEstablishment = newEstablishment;

        // Crear series por defecto para el nuevo establecimiento usando la lógica centralizada
        const environmentType: 'TESTING' | 'PRODUCTION' = 'TESTING';

        const defaultSeries = buildMissingDefaultSeries({
          establishmentId: newEstablishment.id,
          environmentType,
          existingSeries: configState.series,
        });

        defaultSeries.forEach((seriesItem) => {
          dispatch({ type: 'ADD_SERIES', payload: seriesItem });
        });
      }

      // Usar el mismo objeto de empresa ya creado para ConfigurationContext
      const companyData = configState.company || companyForConfig;

      // Guardar sesión en UserSessionContext
      setSession({
        userId: user.id,
        userName: user.nombre,
        userEmail: user.email,
        currentCompanyId: selectedEmpresa.id,
        currentCompany: companyData,
        currentEstablishmentId: fullEstablishment?.id || selectedEstablecimiento.id,
        currentEstablishment: fullEstablishment || null,
        availableEstablishments: configState.establishments.filter(e => e.isActive),
        permissions: ['*'], // Por defecto admin tiene todos los permisos
        role: user.rol,
      });

      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      console.error('Error seleccionando contexto:', err);
    }
  };

  return (
    <AuthLayout showHero={false}>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg
                className="h-10 w-10 text-white"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            ¡Bienvenido, {user?.nombre}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Selecciona tu espacio de trabajo
          </p>
        </div>

        {/* Selección de Empresa */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Selecciona una Empresa
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {empresas.map((empresa: Empresa) => (
              <button
                key={empresa.id}
                onClick={() => handleSelectEmpresa(empresa)}
                className={`
                  w-full p-4 rounded-lg border-2 text-left transition-all
                  ${
                    selectedEmpresa?.id === empresa.id
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Logo o Icono */}
                  <div className="flex-shrink-0">
                    {empresa.logo ? (
                      <img
                        src={empresa.logo}
                        alt={empresa.razonSocial}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <span className="text-white text-xl font-bold">
                          {empresa.razonSocial.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Información */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {empresa.nombreComercial || empresa.razonSocial}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      RUC: {empresa.ruc}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`
                          inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                          ${
                            empresa.estado === 'activa'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                          }
                        `}
                      >
                        {empresa.estado}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {empresa.establecimientos.length} establecimiento
                        {empresa.establecimientos.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Checkmark */}
                  {selectedEmpresa?.id === empresa.id && (
                    <div className="flex-shrink-0">
                      <svg
                        className="w-6 h-6 text-blue-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selección de Establecimiento */}
        {selectedEmpresa && selectedEmpresa.establecimientos.length > 0 && (
          <div className="animate-fadeIn">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Selecciona un Establecimiento
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {selectedEmpresa.establecimientos
                .filter((e) => e.activo)
                .map((establecimiento) => (
                  <button
                    key={establecimiento.id}
                    onClick={() => setSelectedEstablecimiento(establecimiento)}
                    className={`
                      w-full p-4 rounded-lg border-2 text-left transition-all
                      ${
                        selectedEstablecimiento?.id === establecimiento.id
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icono */}
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                          <svg
                            className="w-5 h-5 text-gray-600 dark:text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z"
                            />
                          </svg>
                        </div>
                      </div>

                      {/* Información */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {establecimiento.nombre}
                          </h3>
                          {establecimiento.esPrincipal && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                              Principal
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          Código: {establecimiento.codigo}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                          {establecimiento.direccion}
                        </p>
                      </div>

                      {/* Checkmark */}
                      {selectedEstablecimiento?.id === establecimiento.id && (
                        <div className="flex-shrink-0">
                          <svg
                            className="w-6 h-6 text-blue-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Continuar Button */}
        <button
          onClick={handleContinue}
          disabled={!selectedEmpresa || !selectedEstablecimiento || isLoading}
          className="
            w-full flex justify-center items-center gap-2
            py-3 px-4
            border border-transparent rounded-lg
            text-sm font-medium text-white
            bg-blue-600 hover:bg-blue-700
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
            shadow-lg shadow-blue-500/50 hover:shadow-xl
          "
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Configurando...
            </>
          ) : (
            <>
              Continuar al Dashboard
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </>
          )}
        </button>

        {/* Info Box */}
        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Cambio de contexto</p>
              <p>
                Podrás cambiar de empresa o establecimiento en cualquier momento desde el menú
                principal.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}