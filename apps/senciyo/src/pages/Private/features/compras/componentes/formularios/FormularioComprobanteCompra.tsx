import { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
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
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useUserSession } from '@/contexts/UserSessionContext';
import { useFeedback } from '@/shared/feedback';
import { formatMoney } from '@/shared/currency';
import { calcularTotalesLineas, puedeEditarCC } from '../../logica/reglasCompras';
import { persistirProveedorSiEsNuevo } from '../../servicios/servicioProveedorCompras';
import {
  TIPOS_DOCUMENTO_PROVEEDOR,
  obtenerPlaceholderSerieDocumentoProveedor,
} from '../../constantes/tiposDocumentoProveedor';
import { formatearNumeroCompra } from '../../utilidades/formatearCompras';
import { extraerDatosOCParaCC } from '../../mapeadores/mapeadorOCaCC';
import { useClientes } from '../../../gestion-clientes/hooks/useClientes';
import BuscadorProveedor, { type ProveedorSeleccionado } from '../BuscadorProveedor';
import AdjuntosCompra from '../adjuntos/AdjuntosCompra';
import SelectorModalidadInventario from './SelectorModalidadInventario';
import { listarTiposOperacion } from '@/shared/catalogos-sunat';
import { useCreditTermsConfigurator } from '@/shared/payments/useCreditTermsConfigurator';
import { CreditScheduleModal } from '@/shared/payments/CreditScheduleModal';
import { CreditScheduleSummaryCard } from '@/shared/payments/CreditScheduleSummaryCard';
import { CreditPaymentMethodModal } from '@/shared/payments/CreditPaymentMethodModal';
import { useLineasCompra } from '../items/useLineasCompra';
import SeccionProductosCompra from '../items/SeccionProductosCompra';
import type { ModalidadInventarioCC } from '../../modelos/ComprobanteCompra';
import type { ComprobanteCompra } from '../../modelos/ComprobanteCompra';
import type { CuentaPorPagar } from '../../modelos/CuentaPorPagar';
import type { MonedaCompra } from '../../modelos/tiposBaseCompras';
import type { OrdenCompra } from '../../modelos/OrdenCompra';
import type { AdjuntoCompra } from '../../modelos/AdjuntoCompra';
import { obtenerErrorDeCampo, type ErrorCampoDocumento } from '../../modelos/ErroresValidacion';

interface FormularioComprobanteCompraProps {
  ocOrigen?: OrdenCompra;
  ccBase?: Partial<ComprobanteCompra>;
  onExito: (cc: ComprobanteCompra, cxp?: CuentaPorPagar) => void;
  onCancelar: () => void;
}

const CAMPOS_CC_DEFAULT: CampoConfigurableDocumento[] = [
  { id: 'centroCosto', label: 'Centro de costo', visible: false, grupo: 'Presupuesto' },
  { id: 'presupuesto', label: 'Presupuesto', visible: false, grupo: 'Presupuesto' },
];
const STORAGE_KEY_CAMPOS_CC = 'compras_cc_campos_config';
const NUEVO_CREDITO_VALUE = '__nuevo_credito__';

export default function FormularioComprobanteCompra({
  ocOrigen,
  ccBase,
  onExito,
  onCancelar,
}: FormularioComprobanteCompraProps) {
  const {
    registrarComprobanteCompra,
    guardarBorradorCC,
    actualizarComprobanteCompraBorrador,
    registrarComprobanteCompraDesdeBorrador,
    refrescarProveedores,
  } = useCompras();
  const esBorradorExistente = Boolean(ccBase?.id) && ccBase?.estadoDocumento === 'borrador';
  const { state: config, dispatch } = useConfigurationContext();
  const { session } = useUserSession();
  const feedback = useFeedback();
  const { createCliente } = useClientes();
  const { campos: camposConfigurables, esVisible, guardar: guardarCamposConfigurables } =
    useConfiguracionCampos(CAMPOS_CC_DEFAULT, STORAGE_KEY_CAMPOS_CC);
  const [modalCamposAbierto, setModalCamposAbierto] = useState(false);

  // Fuentes de verdad desde Configuración
  const monedaDefault = (
    config.currencies.find((c) => c.isBaseCurrency && c.isActive)?.code ?? 'PEN'
  ) as MonedaCompra;

  const almacenesActivos = config.almacenes.filter((a) => a.estaActivoAlmacen);
  const monedaBase = config.currencies.find((c) => c.isBaseCurrency)?.code ?? monedaDefault;

  // Si viene de una OC aprobada, se heredan condiciones, TC, centro de costo/
  // presupuesto y las líneas con sus cantidades de seguimiento reseteadas.
  const datosDesdeOC = ocOrigen ? extraerDatosOCParaCC(ocOrigen) : null;

  const [proveedor, setProveedor] = useState<ProveedorSeleccionado | null>(
    ccBase?.proveedorId
      ? { id: ccBase.proveedorId, nombre: ccBase.proveedorNombre ?? '', tipoDocumento: ccBase.proveedorTipoDocumento ?? '6', numeroDocumento: ccBase.proveedorNumeroDocumento ?? '' }
      : ocOrigen?.proveedorId
        ? { id: ocOrigen.proveedorId, nombre: ocOrigen.proveedorNombre, tipoDocumento: ocOrigen.proveedorTipoDocumento, numeroDocumento: ocOrigen.proveedorNumeroDocumento }
        : null,
  );
  const [direccionFacturacion, setDireccionFacturacion] = useState(
    ccBase?.proveedorDireccionFacturacion ?? datosDesdeOC?.proveedorDireccionFacturacion ?? '',
  );
  const [direccionEntrega, setDireccionEntrega] = useState(
    ccBase?.proveedorDireccionEntrega ?? datosDesdeOC?.proveedorDireccionEntrega ?? '',
  );
  const [tipoComprobante, setTipoComprobante] = useState(ccBase?.tipoComprobanteProveedor ?? '01');
  const [serieProveedor, setSerieProveedor] = useState(ccBase?.serieProveedor ?? '');
  const [numeroProveedor, setNumeroProveedor] = useState(ccBase?.numeroProveedor ?? '');
  const [fechaEmisionProveedor, setFechaEmisionProveedor] = useState(
    ccBase?.fechaEmisionProveedor ?? new Date().toISOString().slice(0, 10),
  );
  const [fechaVencimiento, setFechaVencimiento] = useState(ccBase?.fechaVencimiento ?? '');
  const [tipoOperacion, setTipoOperacion] = useState(ccBase?.tipoOperacion ?? '');
  const [moneda, setMoneda] = useState<MonedaCompra>(ccBase?.moneda ?? ocOrigen?.moneda ?? monedaDefault);
  const [tipoCambio, setTipoCambio] = useState(
    ccBase?.tipoCambio?.toString() ?? datosDesdeOC?.tipoCambio?.toString() ?? '',
  );

  // Forma de pago: se consume el catálogo real de Configuración de Negocio
  // (config.paymentMethods), nunca un enum local. formaPago 'contado'/'credito'
  // se deriva del code del método elegido para no romper el dominio existente
  // de Compras (CuentaPorPagar.formaPago, reglasCompras.ts).
  const metodosPagoActivos = config.paymentMethods.filter((m) => m.isActive);
  const [formaPagoMetodoId, setFormaPagoMetodoId] = useState(() => {
    if (ccBase?.formaPagoMetodoId) return ccBase.formaPagoMetodoId;
    const preferido = metodosPagoActivos.find((m) =>
      ocOrigen?.formaPago === 'credito' ? m.code === 'CREDITO' : m.code === 'CONTADO',
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
  const [modalidadInventario, setModalidadInventario] = useState<ModalidadInventarioCC>(
    ccBase?.modalidadInventario ?? datosDesdeOC?.modalidadInventarioSugerida ?? 'con_nota_ingreso',
  );
  const [almacenId, setAlmacenId] = useState(almacenesActivos[0]?.id ?? '');
  const [centroCosto, setCentroCosto] = useState(ccBase?.centroCosto ?? datosDesdeOC?.centroCosto ?? '');
  const [presupuesto, setPresupuesto] = useState(ccBase?.presupuesto ?? datosDesdeOC?.presupuesto ?? '');
  const [observaciones, setObservaciones] = useState(ccBase?.observaciones ?? datosDesdeOC?.observaciones ?? '');
  const [adjuntos, setAdjuntos] = useState<AdjuntoCompra[]>(ccBase?.adjuntos ?? []);
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<ErrorCampoDocumento[]>([]);

  const lineasCompra = useLineasCompra(ccBase?.lineas ?? datosDesdeOC?.lineas ?? []);
  const lineas = lineasCompra.lineas;

  const totalesCalculados = calcularTotalesLineas(lineas);
  const documentoAfectaInventario = modalidadInventario !== 'no_afecta_inventario';
  const almacenSeleccionado = almacenesActivos.find((a) => a.id === almacenId);
  const tipoComprobanteLabel = TIPOS_DOCUMENTO_PROVEEDOR.find((t) => t.codigo === tipoComprobante)?.nombre;
  const tiposOperacionActivos = listarTiposOperacion().filter((t) => t.activo && t.visible);

  // Cuotas de crédito: reutiliza el mismo configurador/modal que Orden de
  // Compra (useCreditTermsConfigurator + CreditScheduleModal), nunca un
  // cronograma propio.
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
    issueDate: fechaEmisionProveedor,
    initialCreditTerms: ccBase?.creditTerms,
  });

  // La Fecha de vencimiento se calcula desde la última cuota mientras la
  // forma de pago sea crédito; al pasar a Contado, el campo queda libre
  // para edición manual (mismo patrón que Orden de Compra).
  useEffect(() => {
    if (isCreditMethod && creditTerms?.fechaVencimientoGlobal) {
      setFechaVencimiento(creditTerms.fechaVencimientoGlobal);
    }
  }, [isCreditMethod, creditTerms?.fechaVencimientoGlobal]);

  function construirDatosCC() {
    return {
      tipoComprobanteProveedor: tipoComprobante || undefined,
      serieProveedor: serieProveedor.trim() ? serieProveedor.toUpperCase() : undefined,
      numeroProveedor: numeroProveedor.trim() || undefined,
      fechaEmisionProveedor: fechaEmisionProveedor || undefined,
      fechaRegistro: new Date().toISOString(),
      fechaVencimiento: fechaVencimiento || undefined,
      proveedorId: proveedor!.id.toString(),
      proveedorTipoDocumento: proveedor!.tipoDocumento,
      proveedorNumeroDocumento: proveedor!.numeroDocumento,
      proveedorNombre: proveedor!.nombre,
      proveedorDireccionFacturacion: direccionFacturacion || undefined,
      proveedorDireccionEntrega: direccionEntrega || undefined,
      tipoOperacion: tipoOperacion || undefined,
      compradorId: ccBase?.compradorId ?? session?.userId,
      compradorNombre: ccBase?.compradorNombre ?? session?.userName,
      moneda,
      tipoCambio: tipoCambio ? parseFloat(tipoCambio) : undefined,
      formaPago,
      formaPagoMetodoId: formaPagoMetodoId || undefined,
      condicionesPago: ccBase?.condicionesPago ?? datosDesdeOC?.condicionesPago,
      creditTerms: isCreditMethod ? creditTerms : undefined,
      modalidadInventario,
      centroCosto: centroCosto || undefined,
      presupuesto: presupuesto || undefined,
      observaciones: observaciones || undefined,
      observacionPresupuestal: ccBase?.observacionPresupuestal,
      lineas: lineas.map((l) => ({
        ...l,
        afectaInventario: documentoAfectaInventario,
        almacenDestinoId: documentoAfectaInventario ? almacenSeleccionado?.id : undefined,
        almacenDestinoNombre: documentoAfectaInventario ? almacenSeleccionado?.nombreAlmacen : undefined,
      })),
      totales: {
        subtotal: totalesCalculados.subtotal,
        subtotalExonerado: totalesCalculados.subtotalExonerado,
        subtotalInafecto: totalesCalculados.subtotalInafecto,
        descuentoTotal: totalesCalculados.descuentoTotal,
        igv: totalesCalculados.igv,
        total: totalesCalculados.total,
        moneda,
      },
      ordenCompraOrigenId: ocOrigen?.id ?? ccBase?.ordenCompraOrigenId,
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
      const datos = construirDatosCC();
      const cc = esBorradorExistente
        ? await actualizarComprobanteCompraBorrador(ccBase!.id!, datos, session?.userName)
        : await guardarBorradorCC(datos, session?.userId, session?.userName);
      if (proveedor) {
        await persistirProveedorSiEsNuevo(proveedor, createCliente);
        refrescarProveedores();
      }
      feedback.success(esBorradorExistente ? 'Borrador actualizado.' : 'Borrador guardado.');
      onExito(cc);
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
    if (!tipoComprobante) {
      nuevosErrores.push({ campo: 'tipoComprobanteProveedor', codigo: 'TIPO_COMPROBANTE_REQUERIDO', mensaje: 'Selecciona el tipo de comprobante.' });
    }
    if (!serieProveedor.trim()) {
      nuevosErrores.push({ campo: 'serieProveedor', codigo: 'SERIE_REQUERIDA', mensaje: 'Ingresa la serie del comprobante.' });
    }
    if (!numeroProveedor.trim()) {
      nuevosErrores.push({ campo: 'numeroProveedor', codigo: 'NUMERO_REQUERIDO', mensaje: 'Ingresa el número del comprobante.' });
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
    if (documentoAfectaInventario && !almacenSeleccionado) {
      nuevosErrores.push({ campo: 'almacenId', codigo: 'ALMACEN_REQUERIDO', mensaje: 'Selecciona el almacén de destino para el ingreso a inventario.' });
    }

    if (nuevosErrores.length > 0) {
      setErrores(nuevosErrores);
      return;
    }

    setErrores([]);
    setEnviando(true);

    try {
      const datos = construirDatosCC();
      const { comprobante, cuentaPorPagar } = esBorradorExistente
        ? await registrarComprobanteCompraDesdeBorrador(ccBase!.id!, datos, session?.userName)
        : await registrarComprobanteCompra(datos, session?.userId);

      if (proveedor) {
        await persistirProveedorSiEsNuevo(proveedor, createCliente);
        refrescarProveedores();
      }

      feedback.success('Comprobante de compra registrado.');
      onExito(comprobante, cuentaPorPagar);
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'Error al registrar el comprobante.';
      setErrores([{ campo: 'general', codigo: 'ERROR_REGISTRO', mensaje }]);
      feedback.error(mensaje);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <PageHeader
        breadcrumb={
          <Breadcrumb items={[{ label: 'Compras', onClick: onCancelar }, { label: esBorradorExistente ? 'Editar borrador de comprobante' : 'Registrar comprobante' }]} />
        }
        title={
          <div className="flex items-center gap-2.5">
            <div>
              <h1 className="text-lg font-semibold text-gray-900 leading-tight">
                {esBorradorExistente ? 'Editar Borrador de Comprobante' : 'Registrar Comprobante de Compra'}
              </h1>
              {ocOrigen && (
                <p className="text-xs text-gray-500">Desde OC: {formatearNumeroCompra(ocOrigen.serie, ocOrigen.correlativo)}</p>
              )}
            </div>
            {tipoComprobanteLabel && (
              <span className="text-xs text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded">
                {tipoComprobanteLabel}
              </span>
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

        {/* Card principal: Datos del comprobante */}
        <FormSectionCard
          titulo="Datos del comprobante"
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
                    onSeleccionar={(p) => {
                      setProveedor(p);
                      setDireccionFacturacion(p?.direccion ?? '');
                      setDireccionEntrega(p?.direccion ?? '');
                    }}
                    deshabilitado={!!ocOrigen}
                    error={obtenerErrorDeCampo(errores, 'proveedorId')?.mensaje ?? null}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Dirección de facturación</label>
                  <input
                    type="text"
                    value={direccionFacturacion}
                    onChange={(e) => setDireccionFacturacion(e.target.value)}
                    placeholder="Selecciona un proveedor para autocompletar..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Dirección de entrega</label>
                  <input
                    type="text"
                    value={direccionEntrega}
                    onChange={(e) => setDireccionEntrega(e.target.value)}
                    placeholder="Selecciona un proveedor para autocompletar..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </>
            }
            derecha={
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Tipo de comprobante</label>
                    <select
                      value={tipoComprobante}
                      onChange={(e) => setTipoComprobante(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {TIPOS_DOCUMENTO_PROVEEDOR.map((t) => (
                        <option key={t.codigo} value={t.codigo}>
                          {t.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700" title="Serie del comprobante emitido por el proveedor (máx. 4 caracteres)">Serie</label>
                    <input
                      type="text"
                      value={serieProveedor}
                      onChange={(e) => setSerieProveedor(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))}
                      maxLength={4}
                      placeholder={obtenerPlaceholderSerieDocumentoProveedor(tipoComprobante)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700" title="Número del comprobante emitido por el proveedor, tal como aparece en el documento">Número</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={numeroProveedor}
                      onChange={(e) => setNumeroProveedor(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ej: 123"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Fecha de emisión</label>
                    <input
                      type="date"
                      value={fechaEmisionProveedor}
                      onChange={(e) => setFechaEmisionProveedor(e.target.value)}
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
                      title={isCreditMethod ? 'Calculada automáticamente desde la última cuota del cronograma de crédito' : undefined}
                      className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${isCreditMethod ? 'bg-gray-50 text-gray-600' : ''}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Moneda</label>
                    <select
                      value={moneda}
                      onChange={(e) => setMoneda(e.target.value as MonedaCompra)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {config.currencies.filter((c) => c.isActive).map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.symbol} {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Tipo de operación</label>
                  <select
                    value={tipoOperacion}
                    onChange={(e) => setTipoOperacion(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">Sin especificar</option>
                    {tiposOperacionActivos.map((t) => (
                      <option key={t.codigo} value={t.codigo}>
                        {t.codigo} - {t.descripcion}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Base imponible de compra</label>
                  <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600 font-mono">
                    {formatMoney(totalesCalculados.subtotal, moneda)}
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
                      placeholder={`1 ${moneda} = ? ${monedaBase}`}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Forma de pago</label>
                    <select
                      value={formaPagoMetodoId}
                      onChange={(e) => handleFormaPagoChange(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                    <label className="text-sm font-medium text-gray-700">Comprador</label>
                    <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600">
                      {ccBase?.compradorNombre ?? session?.userName ?? 'Usuario no identificado'}
                    </div>
                  </div>
                </div>

                <SelectorModalidadInventario
                  modalidad={modalidadInventario}
                  onCambiarModalidad={setModalidadInventario}
                  almacenesActivos={almacenesActivos}
                  almacenId={almacenId}
                  onCambiarAlmacen={setAlmacenId}
                />

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
              </>
            }
          />
        </FormSectionCard>

        {/* Productos - Servicios */}
        <SeccionProductosCompra
          moneda={moneda}
          lineasCompra={lineasCompra}
          totalesCalculados={totalesCalculados}
        />

        {/* Cronograma de crédito: solo programación, sin estados de pago (aún no está registrado) */}
        {isCreditMethod && (
          <FormSectionCard titulo="Cronograma de crédito">
            <CreditScheduleSummaryCard
              creditTerms={creditTerms}
              currency={moneda}
              total={totalesCalculados.total}
              onConfigure={() => setCreditScheduleModalOpen(true)}
              errors={creditErrors}
              paymentMethodName={metodoPagoSeleccionado?.name}
              context="emision"
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
            tiposPermitidos={['factura_proveedor', 'guia_remision', 'cotizacion_proveedor', 'contrato', 'otro']}
            cargadoPor={session?.userName}
            permiteEliminar={!ccBase?.id || puedeEditarCC(ccBase as ComprobanteCompra)}
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
        onGuardarBorrador={handleGuardarBorrador}
        primaryAction={{
          label: enviando ? 'Guardando...' : 'Registrar comprobante',
          onClick: handleSubmit,
          disabled: enviando,
        }}
      />

      <FieldsConfigurationModal
        abierto={modalCamposAbierto}
        titulo="Configuración de campos — Comprobante de Compra"
        campos={camposConfigurables}
        valoresPorDefecto={CAMPOS_CC_DEFAULT}
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
