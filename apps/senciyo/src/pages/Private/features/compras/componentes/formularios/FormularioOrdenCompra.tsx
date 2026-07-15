import { useEffect, useMemo, useState } from 'react';
import { Settings, Wallet } from 'lucide-react';
import { Breadcrumb, PageHeader } from '@/contasis';
import {
  FormSectionCard,
  TwoColumnDocumentFields,
  CollapsibleNotes,
  FieldsConfigurationModal,
  useConfiguracionCampos,
  type CampoConfigurableDocumento,
} from '@/shared/ui';
import ActionButtonsSection from '../../../comprobantes-electronicos/shared/form-core/components/ActionButtonsSection';
import { useCompras } from '../../contexto/ContextoCompras';
import { useConfigurationContext, type ShippingMethod } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useUserSession } from '@/contexts/UserSessionContext';
import { useFeedback } from '@/shared/feedback';
import { persistirProveedorSiEsNuevo } from '../../servicios/servicioProveedorCompras';
import {
  calcularTotalesLineas,
  calcularEstadoPrincipalOC,
  puedeEliminarAdjuntoOC,
  tieneOCPagosActivosRelacionados,
  tieneCCPagosActivos,
} from '../../logica/reglasCompras';
import { useClientes } from '../../../gestion-clientes/hooks/useClientes';
import { obtenerContactosCliente } from '../../../gestion-clientes/utils/contactosCliente';
import BuscadorProveedor, { type ProveedorSeleccionado } from '../BuscadorProveedor';
import AdjuntosCompra from '../adjuntos/AdjuntosCompra';
import { useLineasCompra } from '../items/useLineasCompra';
import SeccionProductosCompra from '../items/SeccionProductosCompra';
import { useCreditTermsConfigurator } from '@/shared/payments/useCreditTermsConfigurator';
import { CreditScheduleModal } from '@/shared/payments/CreditScheduleModal';
import { CreditScheduleSummaryCard } from '@/shared/payments/CreditScheduleSummaryCard';
import { CreditPaymentMethodModal } from '@/shared/payments/CreditPaymentMethodModal';
import type { MonedaCompra } from '../../modelos/tiposBaseCompras';
import type { OrdenCompra } from '../../modelos/OrdenCompra';
import type { CuentaPorPagar } from '../../modelos/CuentaPorPagar';
import type { AdjuntoCompra } from '../../modelos/AdjuntoCompra';
import { obtenerErrorDeCampo, type ErrorCampoDocumento } from '../../modelos/ErroresValidacion';

const NUEVO_CREDITO_VALUE = '__nuevo_credito__';
const NUEVO_METODO_ENVIO_VALUE = '__nuevo_metodo_envio__';

interface FormularioOrdenCompraProps {
  ocBase?: Partial<OrdenCompra>;
  onExito: (oc: OrdenCompra) => void;
  onCancelar: () => void;
  /** Navega al detalle de la Cuenta por Pagar del CC relacionado que tiene pagos activos. Solo se ofrece cuando la edición está bloqueada por esos pagos. */
  onVerPagosRelacionados?: (cxp: CuentaPorPagar) => void;
}

const CAMPOS_OC_DEFAULT: CampoConfigurableDocumento[] = [
  { id: 'entregaEsperada', label: 'Entrega esperada', visible: false, grupo: 'Fechas y logística' },
  { id: 'centroCosto', label: 'Centro de costo', visible: false, grupo: 'Presupuesto' },
  { id: 'presupuesto', label: 'Presupuesto', visible: false, grupo: 'Presupuesto' },
  { id: 'requiereAprobacion', label: 'Requiere aprobación', visible: false, grupo: 'Aprobación' },
];
const STORAGE_KEY_CAMPOS_OC = 'compras_oc_campos_config';

export default function FormularioOrdenCompra({
  ocBase,
  onExito,
  onCancelar,
  onVerPagosRelacionados,
}: FormularioOrdenCompraProps) {
  const {
    state,
    registrarOrdenCompra,
    guardarBorradorOC,
    actualizarOrdenCompraBorrador,
    registrarOrdenCompraDesdeBorrador,
    actualizarOrdenCompra,
    refrescarProveedores,
  } = useCompras();
  const esBorradorExistente = Boolean(ocBase?.id) && ocBase?.estadoDocumento === 'borrador';
  const esEdicionRegistrada = Boolean(ocBase?.id) && ocBase?.estadoDocumento !== 'borrador';
  const esEdicion = esBorradorExistente || esEdicionRegistrada;
  const esConvertida = esEdicionRegistrada && calcularEstadoPrincipalOC(ocBase as OrdenCompra) === 'Convertida';
  // Misma fuente robusta (cruza relaciones reales OC → CC → CxP → Pagos, no
  // un estado derivado) que usa el bloqueo de servicio en `actualizarOrdenCompra`
  // (ContextoCompras.tsx) — bloquea aquí también los campos financieros/
  // heredables y el envío, para no dejar que el usuario llegue a un submit
  // que el servicio rechazará.
  const tienePagosActivos =
    esConvertida &&
    tieneOCPagosActivosRelacionados(ocBase as OrdenCompra, state.comprobantes, state.cuentasPorPagar, state.pagos);
  const ccConPagosActivos = tienePagosActivos
    ? state.comprobantes.find(
        (cc) => cc.ordenCompraOrigenId === ocBase!.id && tieneCCPagosActivos(cc, state.cuentasPorPagar, state.pagos),
      )
    : undefined;
  const cxpConPagosActivos = ccConPagosActivos?.cuentaPorPagarId
    ? state.cuentasPorPagar.find((c) => c.id === ccConPagosActivos.cuentaPorPagarId)
    : undefined;
  const { state: config, dispatch } = useConfigurationContext();
  const { session } = useUserSession();
  const feedback = useFeedback();
  const { createCliente } = useClientes();
  const { campos: camposConfigurables, esVisible, guardar: guardarCamposConfigurables } =
    useConfiguracionCampos(CAMPOS_OC_DEFAULT, STORAGE_KEY_CAMPOS_OC);
  const [modalCamposAbierto, setModalCamposAbierto] = useState(false);

  // Fuentes de verdad desde Configuración
  const monedaDefault = (
    config.currencies.find((c) => c.isBaseCurrency && c.isActive)?.code ?? 'PEN'
  ) as MonedaCompra;

  const seriesOC = config.series.filter(
    (s) => s.documentType?.code === 'OC' && s.status === 'ACTIVE' && s.isActive,
  );
  const monedaBase = config.currencies.find((c) => c.isBaseCurrency)?.code ?? monedaDefault;

  const [proveedor, setProveedor] = useState<ProveedorSeleccionado | null>(
    ocBase?.proveedorId
      ? { id: ocBase.proveedorId, nombre: ocBase.proveedorNombre ?? '', tipoDocumento: ocBase.proveedorTipoDocumento ?? '6', numeroDocumento: ocBase.proveedorNumeroDocumento ?? '' }
      : null,
  );
  const [direccionFacturacion, setDireccionFacturacion] = useState(
    ocBase?.proveedorDireccionFacturacion ?? '',
  );
  const [direccionEntrega, setDireccionEntrega] = useState(
    ocBase?.proveedorDireccionEntrega ?? '',
  );

  // Contacto real del proveedor (Gestión de Clientes → pestaña Contactos).
  const contactosProveedor = useMemo(
    () => obtenerContactosCliente(proveedor).contactos,
    [proveedor],
  );
  const [contactoId, setContactoId] = useState(ocBase?.proveedorContactoId ?? '');
  const contactoSeleccionado = contactosProveedor.find((c) => c.id === contactoId);

  function handleSeleccionarContacto(id: string) {
    setContactoId(id);
  }

  const [metodoEnvio, setMetodoEnvio] = useState(ocBase?.metodoEnvio ?? '');
  const [creandoMetodoEnvio, setCreandoMetodoEnvio] = useState(false);
  const [nuevoMetodoEnvioNombre, setNuevoMetodoEnvioNombre] = useState('');
  const [errorMetodoEnvio, setErrorMetodoEnvio] = useState<string | null>(null);

  function handleCrearMetodoEnvio() {
    const nombre = nuevoMetodoEnvioNombre.trim();
    if (!nombre) {
      setErrorMetodoEnvio('Ingresa un nombre para el método de envío.');
      return;
    }
    const yaExiste = config.shippingMethods.some((m) => m.nombre.toLowerCase() === nombre.toLowerCase());
    if (yaExiste) {
      setErrorMetodoEnvio('Ya existe un método de envío con ese nombre.');
      return;
    }
    const nuevo: ShippingMethod = { id: `sm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, nombre, activo: true };
    dispatch({ type: 'SET_SHIPPING_METHODS', payload: [...config.shippingMethods, nuevo] });
    setMetodoEnvio(nuevo.nombre);
    setCreandoMetodoEnvio(false);
    setNuevoMetodoEnvioNombre('');
    setErrorMetodoEnvio(null);
  }

  const [serieId, setSerieId] = useState(seriesOC[0]?.series ?? '');
  const [fechaEmision, setFechaEmision] = useState(
    ocBase?.fechaEmision ?? new Date().toISOString().slice(0, 10),
  );
  const [fechaVencimiento, setFechaVencimiento] = useState(ocBase?.fechaVencimiento ?? '');
  const [fechaEntregaEsperada, setFechaEntregaEsperada] = useState(
    ocBase?.fechaEntregaEsperada ?? '',
  );
  const [moneda, setMoneda] = useState<MonedaCompra>(ocBase?.moneda ?? monedaDefault);
  const [tipoCambio, setTipoCambio] = useState(ocBase?.tipoCambio?.toString() ?? '');

  // Forma de pago: mismo patrón que Comprobante de Compra — se consume el
  // catálogo real de Configuración de Negocio, nunca un enum local.
  const metodosPagoActivos = config.paymentMethods.filter((m) => m.isActive);
  const [formaPagoMetodoId, setFormaPagoMetodoId] = useState(() => {
    if (ocBase?.formaPagoMetodoId) return ocBase.formaPagoMetodoId;
    const preferido = metodosPagoActivos.find((m) =>
      ocBase?.formaPago === 'credito' ? m.code === 'CREDITO' : m.code === 'CONTADO',
    );
    return preferido?.id ?? metodosPagoActivos[0]?.id ?? '';
  });
  const metodoPagoSeleccionado = metodosPagoActivos.find((m) => m.id === formaPagoMetodoId);
  const formaPago: 'contado' | 'credito' = metodoPagoSeleccionado?.code === 'CREDITO' ? 'credito' : 'contado';
  const [creditScheduleModalOpen, setCreditScheduleModalOpen] = useState(false);
  const [creditModalAbierto, setCreditModalAbierto] = useState(false);
  function handleFormaPagoChange(value: string) {
    if (value === NUEVO_CREDITO_VALUE) {
      setCreditModalAbierto(true);
      return;
    }
    setFormaPagoMetodoId(value);
  }

  const [requiereAprobacion, setRequiereAprobacion] = useState(
    ocBase?.requiereAprobacion ?? false,
  );
  const [centroCosto, setCentroCosto] = useState(ocBase?.centroCosto ?? '');
  const [presupuesto, setPresupuesto] = useState(ocBase?.presupuesto ?? '');
  const [observaciones, setObservaciones] = useState(ocBase?.observaciones ?? '');
  const [adjuntos, setAdjuntos] = useState<AdjuntoCompra[]>(ocBase?.adjuntos ?? []);
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<ErrorCampoDocumento[]>([]);

  const lineasCompra = useLineasCompra(ocBase?.lineas ?? []);
  const lineas = lineasCompra.lineas;

  const totalesCalculados = calcularTotalesLineas(lineas);

  const {
    isCreditMethod,
    templates: creditTemplates,
    setTemplates: setCreditTemplates,
    creditTerms,
    errors: creditErrors,
    restoreDefaults: restoreCreditDefaults,
  } = useCreditTermsConfigurator({
    paymentMethodId: formaPagoMetodoId,
    total: totalesCalculados.total,
    issueDate: fechaEmision,
    initialCreditTerms: ocBase?.creditTerms,
  });

  // La Fecha de vencimiento se calcula desde la última cuota mientras la
  // forma de pago sea crédito; al pasar a Contado, el campo queda libre
  // para edición manual (no se limpia el valor ya tecleado).
  useEffect(() => {
    if (isCreditMethod && creditTerms?.fechaVencimientoGlobal) {
      setFechaVencimiento(creditTerms.fechaVencimientoGlobal);
    }
  }, [isCreditMethod, creditTerms?.fechaVencimientoGlobal]);

  function construirDatosOC() {
    return {
      serie: serieId,
      fechaEmision,
      fechaVencimiento: fechaVencimiento || undefined,
      fechaEntregaEsperada: fechaEntregaEsperada || undefined,
      proveedorId: proveedor!.id.toString(),
      proveedorTipoDocumento: proveedor!.tipoDocumento,
      proveedorNumeroDocumento: proveedor!.numeroDocumento,
      proveedorNombre: proveedor!.nombre,
      proveedorDireccionFacturacion: direccionFacturacion || undefined,
      proveedorDireccionEntrega: direccionEntrega || undefined,
      proveedorContactoId: contactoId || undefined,
      proveedorContactoNombre: contactoSeleccionado?.nombre || undefined,
      proveedorContactoCargo: contactoSeleccionado?.cargo || undefined,
      proveedorContactoCorreo: contactoSeleccionado?.correos[0]?.valor || undefined,
      proveedorContactoTelefono: contactoSeleccionado?.telefonos[0]?.numero || undefined,
      compradorId: session?.userId,
      compradorNombre: session?.userName,
      metodoEnvio: metodoEnvio || undefined,
      moneda,
      tipoCambio: tipoCambio ? parseFloat(tipoCambio) : undefined,
      formaPago,
      formaPagoMetodoId: formaPagoMetodoId || undefined,
      creditTerms: isCreditMethod ? creditTerms : undefined,
      requiereAprobacion,
      centroCosto: centroCosto || undefined,
      presupuesto: presupuesto || undefined,
      observaciones: observaciones || undefined,
      lineas,
      totales: {
        subtotal: totalesCalculados.subtotal,
        subtotalExonerado: totalesCalculados.subtotalExonerado,
        subtotalInafecto: totalesCalculados.subtotalInafecto,
        descuentoTotal: totalesCalculados.descuentoTotal,
        igv: totalesCalculados.igv,
        total: totalesCalculados.total,
        moneda,
      },
      adjuntos,
    };
  }

  async function handleGuardarBorrador() {
    if (!proveedor) {
      setErrores([{ campo: 'proveedorId', codigo: 'PROVEEDOR_REQUERIDO', mensaje: 'Selecciona un proveedor para guardar el borrador.' }]);
      return;
    }
    setErrores([]);
    setEnviando(true);
    try {
      const datos = construirDatosOC();
      const oc = esBorradorExistente
        ? await actualizarOrdenCompraBorrador(ocBase!.id!, datos, session?.userName)
        : await guardarBorradorOC(datos, session?.userId, session?.userName);
      if (proveedor) {
        await persistirProveedorSiEsNuevo(proveedor, createCliente);
        refrescarProveedores();
      }
      feedback.success(esBorradorExistente ? 'Borrador actualizado.' : 'Borrador guardado.');
      onExito(oc);
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'Error al guardar el borrador.';
      setErrores([{ campo: 'general', codigo: 'ERROR_BORRADOR', mensaje }]);
      feedback.error(mensaje);
    } finally {
      setEnviando(false);
    }
  }

  async function handleSubmit() {
    const nuevosErrores: ErrorCampoDocumento[] = [];
    if (!proveedor) {
      nuevosErrores.push({ campo: 'proveedorId', codigo: 'PROVEEDOR_REQUERIDO', mensaje: 'Selecciona un proveedor.' });
    }
    if (seriesOC.length === 0) {
      nuevosErrores.push({ campo: 'serie', codigo: 'SERIES_NO_CONFIGURADAS', mensaje: 'No hay series OC configuradas. Ve a Configuración → Series.' });
    } else if (!serieId) {
      nuevosErrores.push({ campo: 'serie', codigo: 'SERIE_REQUERIDA', mensaje: 'Selecciona una serie OC.' });
    }
    if (lineas.length === 0) {
      nuevosErrores.push({ campo: 'lineas', codigo: 'LINEAS_REQUERIDAS', mensaje: 'Agrega al menos una línea.' });
    }
    if (lineas.some((l) => !l.productoId)) {
      nuevosErrores.push({ campo: 'lineas', codigo: 'PRODUCTO_INVALIDO', mensaje: 'Todos los ítems deben provenir de un producto real del catálogo.' });
    }
    if (lineas.some((l) => !l.unidadMedida)) {
      nuevosErrores.push({ campo: 'lineas', codigo: 'UNIDAD_NO_CONFIGURADA', mensaje: 'El producto no tiene unidad de medida configurada.' });
    }
    if (lineas.some((l) => l.tipoAfectacion === 'sin_configurar')) {
      nuevosErrores.push({ campo: 'lineas', codigo: 'IMPUESTO_NO_CONFIGURADO', mensaje: 'El producto no tiene impuesto configurado.' });
    }
    if (lineas.some((l) => l.cantidadSolicitada <= 0)) {
      nuevosErrores.push({ campo: 'lineas', codigo: 'CANTIDAD_INVALIDA', mensaje: 'La cantidad debe ser mayor a cero.' });
    }
    if (lineas.some((l) => l.costoUnitario < 0)) {
      nuevosErrores.push({ campo: 'lineas', codigo: 'COSTO_INVALIDO', mensaje: 'El costo unitario no puede ser negativo.' });
    }

    if (nuevosErrores.length > 0) {
      setErrores(nuevosErrores);
      return;
    }

    setErrores([]);
    setEnviando(true);

    try {
      const datos = construirDatosOC();
      const oc = esEdicionRegistrada
        ? await actualizarOrdenCompra(ocBase!.id!, datos, session?.userName)
        : esBorradorExistente
          ? await registrarOrdenCompraDesdeBorrador(ocBase!.id!, datos, session?.userName)
          : await registrarOrdenCompra(datos, session?.userId, session?.userName);
      if (proveedor) {
        await persistirProveedorSiEsNuevo(proveedor, createCliente);
        refrescarProveedores();
      }
      const estadoResultante = calcularEstadoPrincipalOC(oc);
      const mensajeExito = estadoResultante === 'Pendiente de aprobación'
        ? 'Orden enviada a aprobación.'
        : esEdicion
          ? 'Orden de compra actualizada.'
          : 'Orden de compra registrada.';
      feedback.success(mensajeExito);
      onExito(oc);
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'Error al registrar la orden.';
      setErrores([{ campo: 'general', codigo: 'ERROR_REGISTRO', mensaje }]);
      feedback.error(mensaje);
    } finally {
      setEnviando(false);
    }
  }

  function handleSeleccionarProveedor(p: ProveedorSeleccionado | null) {
    setProveedor(p);
    setDireccionFacturacion(p?.direccion ?? '');
    setDireccionEntrega(p?.direccion ?? '');
    setContactoId('');
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <PageHeader
        breadcrumb={
          <Breadcrumb items={[{ label: 'Compras', onClick: onCancelar }, { label: esEdicion ? 'Editar orden de compra' : 'Nueva orden de compra' }]} />
        }
        title={
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold text-gray-900 leading-tight">
              {esEdicion ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}
            </h1>
            {serieId && (
              <span className="text-xs text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded">{serieId}</span>
            )}
          </div>
        }
      />

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {errores.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 space-y-1">
            {errores.map((e, i) => (
              <p key={i} className="text-sm text-red-700">• {e.mensaje}</p>
            ))}
          </div>
        )}

        {tienePagosActivos && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            <span>
              El comprobante de compra relacionado ya tiene pagos aplicados. Para editar los datos de esta orden, primero debes anular los pagos relacionados.
            </span>
            {onVerPagosRelacionados && cxpConPagosActivos && (
              <button
                type="button"
                onClick={() => onVerPagosRelacionados(cxpConPagosActivos)}
                title="Ver pagos relacionados"
                className="flex shrink-0 items-center gap-1 font-medium text-blue-700 hover:text-blue-900 transition-colors"
              >
                <Wallet size={12} />
                Ver pagos relacionados
              </button>
            )}
          </div>
        )}

        {/* Card principal: Datos de la orden */}
        <FormSectionCard
          titulo="Datos de la orden"
          acciones={
            <button
              type="button"
              onClick={() => setModalCamposAbierto(true)}
              className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-medium transition-colors"
            >
              <Settings size={13} />
              <span>+ Campos</span>
            </button>
          }
        >
          <TwoColumnDocumentFields
            izquierda={
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Proveedor</label>
                  <BuscadorProveedor
                    proveedor={proveedor}
                    onSeleccionar={handleSeleccionarProveedor}
                    deshabilitado={tienePagosActivos}
                    error={obtenerErrorDeCampo(errores, 'proveedorId')?.mensaje ?? null}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Contacto</label>
                  {!proveedor ? (
                    <div
                      className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-400"
                      title="Selecciona un proveedor para ver sus contactos"
                    >
                      Selecciona un proveedor primero
                    </div>
                  ) : contactosProveedor.length === 0 ? (
                    <div
                      className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-400"
                      title="Este proveedor no tiene contactos registrados en Gestión de Clientes"
                    >
                      Sin contactos registrados
                    </div>
                  ) : (
                    <select
                      value={contactoId}
                      onChange={(e) => handleSeleccionarContacto(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="">Sin contacto específico</option>
                      {contactosProveedor.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}{c.cargo ? ` — ${c.cargo}` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  {contactoSeleccionado && (
                    <p className="text-[11px] text-gray-500">
                      {[contactoSeleccionado.correos[0]?.valor, contactoSeleccionado.telefonos[0]?.numero]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Dirección de facturación</label>
                    <input
                      type="text"
                      value={direccionFacturacion}
                      onChange={(e) => setDireccionFacturacion(e.target.value)}
                      disabled={tienePagosActivos}
                      placeholder="Dirección de facturación..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Dirección de entrega</label>
                    <input
                      type="text"
                      value={direccionEntrega}
                      onChange={(e) => setDireccionEntrega(e.target.value)}
                      disabled={tienePagosActivos}
                      placeholder="Dirección de entrega..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>
                </div>
              </>
            }
            derecha={
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Serie</label>
                    {seriesOC.length > 0 ? (
                      <select
                        value={serieId}
                        onChange={(e) => setSerieId(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        {seriesOC.map((s) => (
                          <option key={s.id} value={s.series}>
                            {s.series}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="border border-amber-200 bg-amber-50 rounded-lg px-3 py-2 text-xs text-amber-700">
                        Sin serie OC. Ve a Configuración → Series.
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Moneda</label>
                    <select
                      value={moneda}
                      onChange={(e) => setMoneda(e.target.value as MonedaCompra)}
                      disabled={tienePagosActivos}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      {config.currencies.filter((c) => c.isActive).map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.symbol} {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {moneda !== monedaBase && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Tipo de cambio</label>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={tipoCambio}
                      onChange={(e) => setTipoCambio(e.target.value)}
                      disabled={tienePagosActivos}
                      placeholder={`1 ${moneda} = ? ${monedaBase}`}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Forma de pago</label>
                    <select
                      value={formaPagoMetodoId}
                      onChange={(e) => handleFormaPagoChange(e.target.value)}
                      disabled={tienePagosActivos}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      {!formaPagoMetodoId && <option value="">Seleccionar</option>}
                      {metodosPagoActivos.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                      <option value={NUEVO_CREDITO_VALUE}>+ Crear crédito</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Fecha emisión</label>
                    <input
                      type="date"
                      value={fechaEmision}
                      onChange={(e) => setFechaEmision(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">F. vencimiento</label>
                    <input
                      type="date"
                      value={fechaVencimiento}
                      onChange={(e) => setFechaVencimiento(e.target.value)}
                      readOnly={isCreditMethod}
                      disabled={tienePagosActivos}
                      title={isCreditMethod ? 'Calculado desde el cronograma de crédito' : undefined}
                      className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400 ${
                        isCreditMethod ? 'bg-gray-50 text-gray-600' : ''
                      }`}
                    />
                    {isCreditMethod && (
                      <p className="text-[11px] text-gray-400">Calculado desde el cronograma de crédito</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Comprador</label>
                    <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600">
                      {session?.userName || 'Usuario no identificado'}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Método de envío</label>
                  {creandoMetodoEnvio ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          autoFocus
                          value={nuevoMetodoEnvioNombre}
                          onChange={(e) => { setNuevoMetodoEnvioNombre(e.target.value); setErrorMetodoEnvio(null); }}
                          placeholder="Nombre del nuevo método de envío..."
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <button
                          type="button"
                          onClick={handleCrearMetodoEnvio}
                          className="px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => { setCreandoMetodoEnvio(false); setNuevoMetodoEnvioNombre(''); setErrorMetodoEnvio(null); }}
                          className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                      {errorMetodoEnvio && <p className="text-xs text-red-600">{errorMetodoEnvio}</p>}
                    </div>
                  ) : (
                    <select
                      value={metodoEnvio}
                      onChange={(e) => {
                        if (e.target.value === NUEVO_METODO_ENVIO_VALUE) {
                          setCreandoMetodoEnvio(true);
                          return;
                        }
                        setMetodoEnvio(e.target.value);
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="">Sin especificar</option>
                      {config.shippingMethods.filter((m) => m.activo).map((m) => (
                        <option key={m.id} value={m.nombre}>
                          {m.nombre}
                        </option>
                      ))}
                      <option value={NUEVO_METODO_ENVIO_VALUE}>+ Crear método de envío</option>
                    </select>
                  )}
                </div>

                {esVisible('entregaEsperada') && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Entrega esperada</label>
                    <input
                      type="date"
                      value={fechaEntregaEsperada}
                      onChange={(e) => setFechaEntregaEsperada(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                )}
                {esVisible('centroCosto') && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Centro de costo</label>
                    <input
                      type="text"
                      value={centroCosto}
                      onChange={(e) => setCentroCosto(e.target.value)}
                      placeholder="Ej: Administración"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                )}
                {esVisible('presupuesto') && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Presupuesto</label>
                    <input
                      type="text"
                      value={presupuesto}
                      onChange={(e) => setPresupuesto(e.target.value)}
                      placeholder="Ej: Presupuesto 2026-Q3"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                )}
                {esVisible('requiereAprobacion') && (
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requiereAprobacion}
                      onChange={(e) => setRequiereAprobacion(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Requiere aprobación antes de generar comprobante de compra
                  </label>
                )}
              </>
            }
          />
        </FormSectionCard>

        {/* Productos - Servicios (incluye Totales) */}
        <SeccionProductosCompra
          moneda={moneda}
          lineasCompra={lineasCompra}
          totalesCalculados={totalesCalculados}
          disabled={tienePagosActivos}
        />

        {/* Cronograma de crédito: solo programación, sin estados de pago (aún no está registrada) */}
        {isCreditMethod && (
          <FormSectionCard titulo="Cronograma de crédito">
            <CreditScheduleSummaryCard
              creditTerms={creditTerms}
              currency={moneda}
              total={totalesCalculados.total}
              onConfigure={() => setCreditScheduleModalOpen(true)}
              errors={creditErrors}
              paymentMethodName={metodoPagoSeleccionado?.name}
              showStatusColumn={false}
            />
          </FormSectionCard>
        )}

        {/* Observaciones */}
        <CollapsibleNotes observaciones={observaciones} onCambiarObservaciones={setObservaciones} />

        {/* Adjuntos */}
        <FormSectionCard titulo="Adjuntos">
          <AdjuntosCompra
            adjuntos={adjuntos}
            tiposPermitidos={['cotizacion_proveedor', 'orden_compra_firmada', 'contrato', 'otro']}
            cargadoPor={session?.userName}
            permiteEliminar={!ocBase?.id || puedeEliminarAdjuntoOC(ocBase as OrdenCompra)}
            onAgregar={(a) => {
              setAdjuntos((prev) => [...prev, a]);
              feedback.success('Adjunto agregado.');
            }}
            onEliminar={(id) => {
              setAdjuntos((prev) => prev.filter((a) => a.id !== id));
              feedback.success('Adjunto eliminado.');
            }}
          />
        </FormSectionCard>
      </div>

      <ActionButtonsSection
        onCancelar={onCancelar}
        onGuardarBorrador={esEdicionRegistrada ? undefined : handleGuardarBorrador}
        primaryAction={{
          label: enviando ? 'Guardando...' : esEdicionRegistrada ? 'Actualizar OC' : 'Registrar OC',
          onClick: handleSubmit,
          disabled: enviando || seriesOC.length === 0 || tienePagosActivos,
          title: tienePagosActivos
            ? 'Anula primero los pagos relacionados para poder editar esta orden.'
            : seriesOC.length === 0
              ? 'Configura una serie OC en Configuración → Series'
              : undefined,
        }}
      />

      <FieldsConfigurationModal
        abierto={modalCamposAbierto}
        titulo="Configuración de campos — Orden de Compra"
        campos={camposConfigurables}
        valoresPorDefecto={CAMPOS_OC_DEFAULT}
        onGuardar={(nuevos) => {
          guardarCamposConfigurables(nuevos);
          setModalCamposAbierto(false);
        }}
        onCerrar={() => setModalCamposAbierto(false)}
      />

      <CreditScheduleModal
        isOpen={creditScheduleModalOpen}
        templates={creditTemplates}
        onChange={setCreditTemplates}
        onSave={() => setCreditScheduleModalOpen(false)}
        onCancel={() => { restoreCreditDefaults(); setCreditScheduleModalOpen(false); }}
        onRestoreDefaults={restoreCreditDefaults}
        errors={creditErrors}
        paymentMethodName={metodoPagoSeleccionado?.name}
      />

      <CreditPaymentMethodModal
        open={creditModalAbierto}
        onClose={() => setCreditModalAbierto(false)}
        paymentMethods={config.paymentMethods}
        onUpdatePaymentMethods={(methods) => dispatch({ type: 'SET_PAYMENT_METHODS', payload: methods })}
        onCreated={(method) => {
          setFormaPagoMetodoId(method.id);
          setCreditModalAbierto(false);
        }}
      />
    </div>
  );
}
