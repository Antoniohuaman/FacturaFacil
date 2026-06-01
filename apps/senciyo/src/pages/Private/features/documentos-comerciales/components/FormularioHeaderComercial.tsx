import { useState, useEffect, useCallback, useRef } from 'react';
import {
  User,
  Search,
  Loader2,
  X,
  ChevronDown,
  Calendar,
  Hash,
  DollarSign,
  CreditCard,
  Settings,
  Building2,
  Mail,
  MapPin,
  Truck,
  ShoppingBag,
  FileText,
  Package,
} from 'lucide-react';
import { ConfigurationCard } from '../../comprobantes-electronicos/shared/form-core/components/ConfigurationCard';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useClientes } from '../../gestion-clientes/hooks/useClientes';
import { servicioConsultaDocumentos } from '@/shared/documentos/servicioConsultaDocumentos';
import { CreditPaymentMethodModal } from '@/shared/payments/CreditPaymentMethodModal';
import type { Cliente } from '../../gestion-clientes/models/cliente.types';
import type {
  TipoDocumentoComercial,
  ClienteDocumentoComercial,
  CamposOpcionalesDocumentoComercial,
  Currency,
  TipoDocumentoCliente,
} from '../models/documentoComercial.types';
import {
  TIPO_DOCUMENTO_COMERCIAL_LABELS,
} from '../models/documentoComercial.constants';
import {
  inferirTipoDocumentoCliente,
  construirClienteDesdeRuc,
  construirClienteDesdeDni,
} from '../utils/documentoComercial.helpers';
import type { ConfiguracionCamposDocumentoComercial } from '../hooks/useDocumentoComercialFieldsConfig';

const NUEVO_CREDITO_VALUE = '__nuevo_credito__';

interface FormularioHeaderComercialProps {
  tipoDocumento: TipoDocumentoComercial;

  serieSeleccionada: string;
  seriesFiltradas: string[];
  onSerieChange: (serie: string) => void;

  fechaEmision: string;
  onFechaEmisionChange: (fecha: string) => void;

  moneda: Currency;
  onMonedaChange: (moneda: Currency) => void;

  formaPago: string;
  onFormaPagoChange: (formaPago: string) => void;

  cliente: ClienteDocumentoComercial | null;
  onClienteChange: (cliente: ClienteDocumentoComercial | null) => void;

  camposOpcionales: CamposOpcionalesDocumentoComercial;
  onCampoOpcionalChange: (campo: keyof CamposOpcionalesDocumentoComercial, valor: string | boolean | undefined) => void;

  fieldsConfig: ConfiguracionCamposDocumentoComercial;
  onAbrirConfigCampos: () => void;
}

function extraerInfoDocumentoCliente(c: Cliente): { tipo: TipoDocumentoCliente; numero: string } {
  const numExtendido = (c.numeroDocumento ?? '').trim();
  if (numExtendido) {
    return { tipo: inferirTipoDocumentoCliente(numExtendido), numero: numExtendido };
  }

  const docStr = (c.document ?? '').trim();
  if (!docStr || docStr === 'Sin documento') {
    return { tipo: 'OTRO', numero: '' };
  }

  const partes = docStr.split(/\s+/);
  if (partes.length >= 2) {
    const candidato = partes[0].toUpperCase();
    if (['RUC', 'DNI', 'CE', 'PAS'].includes(candidato)) {
      const numero = partes.slice(1).join('').replace(/\D/g, '');
      return { tipo: candidato as TipoDocumentoCliente, numero };
    }
  }

  const soloDigitos = docStr.replace(/\D/g, '');
  return { tipo: inferirTipoDocumentoCliente(soloDigitos), numero: soloDigitos };
}

export default function FormularioHeaderComercial({
  tipoDocumento,
  serieSeleccionada,
  seriesFiltradas,
  onSerieChange,
  fechaEmision,
  onFechaEmisionChange,
  moneda,
  onMonedaChange,
  formaPago,
  onFormaPagoChange,
  cliente,
  onClienteChange,
  camposOpcionales,
  onCampoOpcionalChange,
  fieldsConfig,
  onAbrirConfigCampos,
}: FormularioHeaderComercialProps) {
  const { state: configState, dispatch } = useConfigurationContext();
  const { clientes, fetchClientes } = useClientes();

  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [cargandoLookup, setCargandoLookup] = useState(false);
  const [errorDocumento, setErrorDocumento] = useState<string | null>(null);
  const [creditModalAbierto, setCreditModalAbierto] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputClienteRef = useRef<HTMLInputElement>(null);

  const monedas = configState.currencies ?? [];
  const metodosPago = configState.paymentMethods ?? [];

  // Inicializar formaPago con el primer método activo cuando se carga configuración
  useEffect(() => {
    if (metodosPago.length === 0) return;
    const nombresValidos = metodosPago.filter((mp) => mp.isActive).map((mp) => mp.name);
    if (!formaPago || !nombresValidos.includes(formaPago)) {
      const primerActivo = metodosPago.find((mp) => mp.isActive);
      if (primerActivo) onFormaPagoChange(primerActivo.name);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metodosPago.length]);

  useEffect(() => {
    if (!busquedaCliente || busquedaCliente.trim().length < 2) {
      setMostrarResultados(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchClientes({ search: busquedaCliente.trim(), limit: 25, page: 1 } as Parameters<typeof fetchClientes>[0]);
      setMostrarResultados(true);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [busquedaCliente, fetchClientes]);

  const handleFormaPagoChange = useCallback((value: string) => {
    if (value === NUEVO_CREDITO_VALUE) {
      setCreditModalAbierto(true);
      return;
    }
    onFormaPagoChange(value);
  }, [onFormaPagoChange]);

  const seleccionarClienteDeApi = useCallback(
    (c: Cliente) => {
      const { tipo, numero } = extraerInfoDocumentoCliente(c);
      onClienteChange({
        clienteId: c.id,
        nombre: c.name,
        numeroDocumento: numero,
        tipoDocumento: tipo,
        direccion: c.direccion || (c.address && c.address !== 'Sin dirección' ? c.address : undefined),
        email: c.email,
        priceProfileId: c.listaPrecio,
      });
      setBusquedaCliente('');
      setMostrarResultados(false);
      setErrorDocumento(null);
    },
    [onClienteChange],
  );

  const limpiarCliente = useCallback(() => {
    onClienteChange(null);
    setBusquedaCliente('');
    setErrorDocumento(null);
    setTimeout(() => inputClienteRef.current?.focus(), 0);
  }, [onClienteChange]);

  const handleLookup = useCallback(async () => {
    const query = busquedaCliente.replace(/\D/g, '');
    if (!query) return;
    setCargandoLookup(true);
    setErrorDocumento(null);
    try {
      if (query.length === 11) {
        const resultado = await servicioConsultaDocumentos.consultarRuc(query);
        if (resultado.success && resultado.data) {
          const c = construirClienteDesdeRuc({
            razonSocial: (resultado.data as { razonSocial?: string }).razonSocial,
            direccionFiscal: (resultado.data as { direccionFiscal?: string }).direccionFiscal,
            ruc: query,
          });
          onClienteChange(c);
          setBusquedaCliente('');
          setMostrarResultados(false);
        } else {
          setErrorDocumento('No se encontró información para este RUC.');
        }
      } else if (query.length === 8) {
        const resultado = await servicioConsultaDocumentos.consultarDni(query);
        if (resultado.success && resultado.data) {
          const data = resultado.data as {
            nombres?: string;
            apellidoPaterno?: string;
            apellidoMaterno?: string;
          };
          const c = construirClienteDesdeDni({ ...data, dni: query });
          onClienteChange(c);
          setBusquedaCliente('');
          setMostrarResultados(false);
        } else {
          setErrorDocumento('No se encontró información para este DNI.');
        }
      }
    } catch {
      setErrorDocumento('Error al consultar el documento. Intente nuevamente.');
    } finally {
      setCargandoLookup(false);
    }
  }, [busquedaCliente, onClienteChange]);

  const camposOpcionalesVisibles = Object.entries(fieldsConfig.optionalFields).filter(
    ([campo, cfg]) => cfg.visible && campo !== 'fechaVencimiento',
  );

  const sinSeries = seriesFiltradas.length === 0;

  return (
    <>
      <ConfigurationCard
        title="Datos del documento"
        icon={FileText}
        defaultExpanded
        actions={
          <button
            type="button"
            onClick={onAbrirConfigCampos}
            className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-medium transition-colors"
            title="Personalizar campos visibles"
          >
            <Settings size={13} />
            <span>+ Campos</span>
          </button>
        }
      >
        <div className="space-y-4">
          {/* Tipo de documento */}
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
              {TIPO_DOCUMENTO_COMERCIAL_LABELS[tipoDocumento]}
            </span>
          </div>

          {/* Serie + Fecha emisión + Fecha vencimiento */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Hash size={11} />
                Serie
              </label>
              {sinSeries ? (
                <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-2 py-2">
                  <ChevronDown size={12} />
                  <span>Sin series configuradas</span>
                </div>
              ) : (
                <select
                  value={serieSeleccionada}
                  onChange={(e) => onSerieChange(e.target.value)}
                  className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
                >
                  {!serieSeleccionada && <option value="">Seleccionar serie</option>}
                  {seriesFiltradas.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Calendar size={11} />
                Fecha emisión
              </label>
              <input
                type="date"
                value={fechaEmision}
                onChange={(e) => onFechaEmisionChange(e.target.value)}
                className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Calendar size={11} />
                Fecha vencimiento
              </label>
              <input
                type="date"
                value={camposOpcionales.fechaVencimiento ?? ''}
                onChange={(e) => onCampoOpcionalChange('fechaVencimiento', e.target.value || undefined)}
                className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
              />
            </div>
          </div>

          {/* Cliente */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <User size={11} />
              Cliente
            </label>

            {cliente ? (
              <div className="flex items-start justify-between gap-2 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 rounded-lg px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                    {cliente.nombre}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {cliente.tipoDocumento !== 'OTRO' && cliente.tipoDocumento
                      ? `${cliente.tipoDocumento}: ${cliente.numeroDocumento}`
                      : cliente.numeroDocumento || '—'}
                    {cliente.direccion && (
                      <span className="ml-2 text-gray-400 truncate">• {cliente.direccion}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={limpiarCliente}
                  className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center gap-1">
                  <div className="relative flex-1">
                    <Search
                      size={14}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                    <input
                      ref={inputClienteRef}
                      type="text"
                      placeholder="Buscar cliente, RUC o DNI..."
                      value={busquedaCliente}
                      onChange={(e) => setBusquedaCliente(e.target.value)}
                      onFocus={() => busquedaCliente.length >= 2 && setMostrarResultados(true)}
                      onBlur={() => setTimeout(() => setMostrarResultados(false), 200)}
                      className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg pl-8 pr-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
                    />
                  </div>
                  {(() => {
                    const soloDigitos = busquedaCliente.replace(/\D/g, '');
                    if (soloDigitos.length < 8) return null;
                    const esRuc = soloDigitos.length === 11;
                    const label = esRuc ? 'SUNAT' : 'RENIEC';
                    const title = esRuc ? 'Consultar RUC en SUNAT' : 'Consultar DNI en RENIEC';
                    return (
                      <button
                        type="button"
                        onClick={() => void handleLookup()}
                        disabled={cargandoLookup}
                        className="flex-shrink-0 flex items-center gap-1 px-2.5 py-2 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 rounded-lg border border-blue-200 dark:border-blue-700 transition-colors disabled:opacity-50"
                        title={title}
                      >
                        {cargandoLookup ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Building2 size={12} />
                        )}
                        <span>{label}</span>
                      </button>
                    );
                  })()}
                </div>

                {errorDocumento && (
                  <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errorDocumento}</p>
                )}

                {mostrarResultados && Array.isArray(clientes) && clientes.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    {(clientes as Cliente[]).slice(0, 8).map((c, idx) => {
                      const { tipo, numero } = extraerInfoDocumentoCliente(c);
                      return (
                        <button
                          key={c.id ?? idx}
                          type="button"
                          onMouseDown={() => seleccionarClienteDeApi(c)}
                          className="w-full text-left px-3 py-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
                        >
                          <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                            {c.name}
                          </div>
                          {numero && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {tipo !== 'OTRO' ? `${tipo}: ${numero}` : numero}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Moneda + Forma de pago */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <DollarSign size={11} />
                Moneda
              </label>
              <select
                value={moneda}
                onChange={(e) => onMonedaChange(e.target.value as Currency)}
                className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
              >
                {monedas.length > 0 ? (
                  monedas.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.symbol} {m.code}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="PEN">S/ PEN</option>
                    <option value="USD">$ USD</option>
                  </>
                )}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <CreditCard size={11} />
                Forma de pago
              </label>
              <select
                value={formaPago}
                onChange={(e) => handleFormaPagoChange(e.target.value)}
                className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
              >
                {!formaPago && <option value="">Seleccionar</option>}
                {metodosPago.filter((mp) => mp.isActive).map((mp) => (
                  <option key={mp.id} value={mp.name}>
                    {mp.name}
                  </option>
                ))}
                {metodosPago.length === 0 && (
                  <>
                    <option value="Contado">Contado</option>
                    <option value="Crédito">Crédito</option>
                  </>
                )}
                <option value={NUEVO_CREDITO_VALUE}>+ Crear crédito (cuotas)</option>
              </select>
            </div>
          </div>

          {/* Método de envío + Fecha de envío previsto */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Package size={11} />
                Método de envío
              </label>
              <input
                type="text"
                value={camposOpcionales.metodoEnvio ?? ''}
                onChange={(e) => onCampoOpcionalChange('metodoEnvio', e.target.value || undefined)}
                placeholder="Ej: Courier, Recojo en tienda..."
                className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Truck size={11} />
                Fecha de envío previsto
              </label>
              <input
                type="date"
                value={camposOpcionales.fechaEntrega ?? ''}
                onChange={(e) => onCampoOpcionalChange('fechaEntrega', e.target.value || undefined)}
                className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
              />
            </div>
          </div>

          {/* Requiere aprobación */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={camposOpcionales.requiereAprobacion ?? false}
              onChange={(e) => onCampoOpcionalChange('requiereAprobacion', e.target.checked || undefined)}
              className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Requiere aprobación</span>
          </label>

          {/* Campos opcionales configurables */}
          {camposOpcionalesVisibles.length > 0 && (
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-100 dark:border-gray-700">
              {fieldsConfig.optionalFields.ordenCompra.visible && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <ShoppingBag size={11} />
                    Orden de compra
                    {fieldsConfig.optionalFields.ordenCompra.required && (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={camposOpcionales.ordenCompra ?? ''}
                    onChange={(e) => onCampoOpcionalChange('ordenCompra', e.target.value || undefined)}
                    placeholder="N° OC del cliente"
                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 outline-none"
                  />
                </div>
              )}

              {fieldsConfig.optionalFields.correo.visible && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Mail size={11} />
                    Correo
                    {fieldsConfig.optionalFields.correo.required && (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                  <input
                    type="email"
                    value={camposOpcionales.correo ?? ''}
                    onChange={(e) => onCampoOpcionalChange('correo', e.target.value || undefined)}
                    placeholder="correo@ejemplo.com"
                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 outline-none"
                  />
                </div>
              )}

              {fieldsConfig.optionalFields.direccion.visible && (
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <MapPin size={11} />
                    Dirección
                    {fieldsConfig.optionalFields.direccion.required && (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={camposOpcionales.direccion ?? ''}
                    onChange={(e) => onCampoOpcionalChange('direccion', e.target.value || undefined)}
                    placeholder="Dirección de entrega"
                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 outline-none"
                  />
                </div>
              )}

              {fieldsConfig.optionalFields.direccionEnvio.visible && (
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Truck size={11} />
                    Dirección de envío
                    {fieldsConfig.optionalFields.direccionEnvio.required && (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={camposOpcionales.direccionEnvio ?? ''}
                    onChange={(e) =>
                      onCampoOpcionalChange('direccionEnvio', e.target.value || undefined)
                    }
                    placeholder="Dirección de envío"
                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 outline-none"
                  />
                </div>
              )}

              {fieldsConfig.optionalFields.guiaRemision.visible && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <FileText size={11} />
                    Guía de remisión
                  </label>
                  <input
                    type="text"
                    value={camposOpcionales.guiaRemision ?? ''}
                    onChange={(e) =>
                      onCampoOpcionalChange('guiaRemision', e.target.value || undefined)
                    }
                    placeholder="Referencia"
                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 outline-none"
                  />
                </div>
              )}

              {fieldsConfig.optionalFields.centroCosto.visible && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Centro de costo
                  </label>
                  <input
                    type="text"
                    value={camposOpcionales.centroCosto ?? ''}
                    onChange={(e) =>
                      onCampoOpcionalChange('centroCosto', e.target.value || undefined)
                    }
                    placeholder="Centro de costo"
                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 outline-none"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </ConfigurationCard>

      <CreditPaymentMethodModal
        open={creditModalAbierto}
        onClose={() => setCreditModalAbierto(false)}
        paymentMethods={metodosPago}
        onUpdatePaymentMethods={(methods) =>
          dispatch({ type: 'SET_PAYMENT_METHODS', payload: methods })
        }
        onCreated={(method) => {
          onFormaPagoChange(method.name);
          setCreditModalAbierto(false);
        }}
      />
    </>
  );
}
