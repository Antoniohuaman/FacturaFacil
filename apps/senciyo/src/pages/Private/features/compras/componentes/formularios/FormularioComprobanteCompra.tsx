import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Breadcrumb, PageHeader } from '@/contasis';
import {
  FormSectionCard,
  TwoColumnDocumentFields,
  CollapsibleNotes,
  DocumentFormFooter,
  FieldsConfigurationModal,
  useConfiguracionCampos,
  type CampoConfigurableDocumento,
} from '@/shared/ui';
import { useCompras } from '../../contexto/ContextoCompras';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useUserSession } from '@/contexts/UserSessionContext';
import { useFeedback } from '@/shared/feedback';
import { calcularTotalesLineas } from '../../logica/reglasCompras';
import { persistirProveedorSiEsNuevo } from '../../servicios/servicioProveedorCompras';
import { TIPOS_DOCUMENTO_PROVEEDOR } from '../../constantes/tiposDocumentoProveedor';
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
  onExito: (cc: ComprobanteCompra, cxp: CuentaPorPagar) => void;
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
  onExito,
  onCancelar,
}: FormularioComprobanteCompraProps) {
  const { registrarComprobanteCompra, refrescarProveedores } = useCompras();
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
    ocOrigen?.proveedorId
      ? { id: ocOrigen.proveedorId, nombre: ocOrigen.proveedorNombre, tipoDocumento: ocOrigen.proveedorTipoDocumento, numeroDocumento: ocOrigen.proveedorNumeroDocumento }
      : null,
  );
  const [direccionFacturacion, setDireccionFacturacion] = useState(
    datosDesdeOC?.proveedorDireccionFacturacion ?? '',
  );
  const [direccionEntrega, setDireccionEntrega] = useState(
    datosDesdeOC?.proveedorDireccionEntrega ?? '',
  );
  const [tipoComprobante, setTipoComprobante] = useState('01');
  const [serieProveedor, setSerieProveedor] = useState('');
  const [numeroProveedor, setNumeroProveedor] = useState('');
  const [fechaEmisionProveedor, setFechaEmisionProveedor] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [tipoOperacion, setTipoOperacion] = useState('');
  const [moneda, setMoneda] = useState<MonedaCompra>(ocOrigen?.moneda ?? monedaDefault);
  const [tipoCambio, setTipoCambio] = useState(datosDesdeOC?.tipoCambio?.toString() ?? '');

  // Forma de pago: se consume el catálogo real de Configuración de Negocio
  // (config.paymentMethods), nunca un enum local. formaPago 'contado'/'credito'
  // se deriva del code del método elegido para no romper el dominio existente
  // de Compras (CuentaPorPagar.formaPago, reglasCompras.ts).
  const metodosPagoActivos = config.paymentMethods.filter((m) => m.isActive);
  const [formaPagoMetodoId, setFormaPagoMetodoId] = useState(() => {
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
    datosDesdeOC?.modalidadInventarioSugerida ?? 'con_nota_ingreso',
  );
  const [almacenId, setAlmacenId] = useState(almacenesActivos[0]?.id ?? '');
  const [centroCosto, setCentroCosto] = useState(datosDesdeOC?.centroCosto ?? '');
  const [presupuesto, setPresupuesto] = useState(datosDesdeOC?.presupuesto ?? '');
  const [observaciones, setObservaciones] = useState(datosDesdeOC?.observaciones ?? '');
  const [adjuntos, setAdjuntos] = useState<AdjuntoCompra[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<ErrorCampoDocumento[]>([]);

  const lineasCompra = useLineasCompra(datosDesdeOC?.lineas ?? []);
  const lineas = lineasCompra.lineas;

  const totalesCalculados = calcularTotalesLineas(lineas);
  const documentoAfectaInventario = modalidadInventario !== 'no_afecta_inventario';
  const almacenSeleccionado = almacenesActivos.find((a) => a.id === almacenId);
  const tipoComprobanteLabel = TIPOS_DOCUMENTO_PROVEEDOR.find((t) => t.codigo === tipoComprobante)?.nombre;
  const tiposOperacionActivos = listarTiposOperacion().filter((t) => t.activo && t.visible);

  // Cuotas de crédito: reutiliza el mismo configurador/modal que Documentos
  // Comerciales (useCreditTermsConfigurator + CreditScheduleModal), nunca un
  // cronograma propio. Se valida suma de cuotas = total y fechas mediante
  // los `errors` que ya calcula el hook.
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
  });

  async function handleSubmit() {
    const nuevosErrores: ErrorCampoDocumento[] = [];
    if (!proveedor) {
      nuevosErrores.push({ campo: 'proveedorId', codigo: 'PROVEEDOR_REQUERIDO', mensaje: 'Selecciona un proveedor.' });
    }
    if (!serieProveedor.trim()) {
      nuevosErrores.push({ campo: 'serieProveedor', codigo: 'SERIE_PROVEEDOR_REQUERIDA', mensaje: 'Ingresa la serie del comprobante del proveedor.' });
    }
    if (!numeroProveedor.trim()) {
      nuevosErrores.push({ campo: 'numeroProveedor', codigo: 'NUMERO_PROVEEDOR_REQUERIDO', mensaje: 'Ingresa el número del comprobante del proveedor.' });
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

    const lineasParaRegistrar = lineas.map((l) => ({
      ...l,
      afectaInventario: documentoAfectaInventario,
      almacenDestinoId: documentoAfectaInventario ? almacenSeleccionado?.id : undefined,
      almacenDestinoNombre: documentoAfectaInventario ? almacenSeleccionado?.nombreAlmacen : undefined,
    }));

    try {
      const { comprobante, cuentaPorPagar } = await registrarComprobanteCompra(
        {
          tipoComprobanteProveedor: tipoComprobante,
          serieProveedor: serieProveedor.toUpperCase(),
          numeroProveedor: numeroProveedor.trim(),
          fechaEmisionProveedor,
          fechaRegistro: new Date().toISOString(),
          fechaVencimiento: fechaVencimiento || undefined,
          proveedorId: proveedor!.id.toString(),
          proveedorTipoDocumento: proveedor!.tipoDocumento,
          proveedorNumeroDocumento: proveedor!.numeroDocumento,
          proveedorNombre: proveedor!.nombre,
          proveedorDireccionFacturacion: direccionFacturacion || undefined,
          proveedorDireccionEntrega: direccionEntrega || undefined,
          tipoOperacion: tipoOperacion || undefined,
          compradorId: session?.userId,
          compradorNombre: session?.userName,
          moneda,
          tipoCambio: tipoCambio ? parseFloat(tipoCambio) : undefined,
          formaPago,
          creditTerms: isCreditMethod ? creditTerms : undefined,
          modalidadInventario,
          centroCosto: centroCosto || undefined,
          presupuesto: presupuesto || undefined,
          lineas: lineasParaRegistrar,
          totales: {
            subtotal: totalesCalculados.subtotal,
            subtotalExonerado: totalesCalculados.subtotalExonerado,
            subtotalInafecto: totalesCalculados.subtotalInafecto,
            descuentoTotal: totalesCalculados.descuentoTotal,
            igv: totalesCalculados.igv,
            total: totalesCalculados.total,
            moneda,
          },
          observaciones: observaciones || undefined,
          ordenCompraOrigenId: ocOrigen?.id,
          adjuntos,
        },
        session?.userId,
      );

      if (proveedor) {
        await persistirProveedorSiEsNuevo(proveedor, createCliente);
        refrescarProveedores();
      }

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
          <Breadcrumb items={[{ label: 'Compras', onClick: onCancelar }, { label: 'Registrar comprobante' }]} />
        }
        title={
          <div className="flex items-center gap-2.5">
            <div>
              <h1 className="text-lg font-semibold text-gray-900 leading-tight">Registrar Comprobante de Compra</h1>
              <p className="text-xs text-gray-500">
                {ocOrigen ? `Desde OC: ${ocOrigen.numero}` : 'Registra el documento recibido del proveedor'}
              </p>
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
                    <label className="text-sm font-medium text-gray-700">Serie</label>
                    <input
                      type="text"
                      value={serieProveedor}
                      onChange={(e) => setSerieProveedor(e.target.value)}
                      placeholder="F001"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Número</label>
                    <input
                      type="text"
                      value={numeroProveedor}
                      onChange={(e) => setNumeroProveedor(e.target.value)}
                      placeholder="00000001"
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
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                    {totalesCalculados.subtotal.toFixed(2)} {moneda}
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
                      {session?.userName || 'Usuario no identificado'}
                    </div>
                  </div>
                </div>

                {isCreditMethod && (
                  <CreditScheduleSummaryCard
                    creditTerms={creditTerms}
                    currency={moneda}
                    total={totalesCalculados.total}
                    onConfigure={() => setCreditScheduleModalOpen(true)}
                    errors={creditErrors}
                    paymentMethodName={metodoPagoSeleccionado?.name}
                  />
                )}

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

        {/* Observaciones */}
        <CollapsibleNotes observaciones={observaciones} onCambiarObservaciones={setObservaciones} />

        {/* Adjuntos */}
        <FormSectionCard titulo="Adjuntos">
          <AdjuntosCompra
            adjuntos={adjuntos}
            tiposPermitidos={['factura_proveedor', 'guia_remision', 'cotizacion_proveedor', 'contrato', 'otro']}
            cargadoPor={session?.userName}
            onAgregar={(a) => setAdjuntos((prev) => [...prev, a])}
            onEliminar={(id) => setAdjuntos((prev) => prev.filter((a) => a.id !== id))}
          />
        </FormSectionCard>
      </div>

      <DocumentFormFooter
        infoIzquierda={
          <>
            {lineas.length} ítem(s) · Total:{' '}
            <span className="font-semibold text-gray-700">
              {totalesCalculados.total.toFixed(2)} {moneda}
            </span>
          </>
        }
        onCancelar={onCancelar}
        onSubmit={handleSubmit}
        textoBotonPrimario="Registrar CC"
        deshabilitado={enviando}
        cargando={enviando}
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
