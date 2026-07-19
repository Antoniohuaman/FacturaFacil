import { useEffect, useMemo, useState } from 'react';
import { Settings, Pencil, Wallet } from 'lucide-react';
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
import {
  calcularTotalesLineas,
  puedeEditarCC,
  puedeEditarCamposFinancierosCC,
  motivoBloqueoCamposFinancierosCC,
  tieneCCPagosActivos,
  calcularMontoRetencion,
  round2,
  calcularEsInventariable,
  calcularAfectaInventarioLinea,
  resolverSnapshotInventarioLinea,
} from '../../logica/reglasCompras';
import { persistirProveedorSiEsNuevo } from '../../servicios/servicioProveedorCompras';
import { validarComprobanteCompraBasico } from '../../servicios/servicioComprobanteCompra';
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
import {
  convertirErroresValidacion,
  enfocarPrimerCampoConError,
  normalizarCampoLineas,
} from '../../modelos/ErroresValidacion';

interface FormularioComprobanteCompraProps {
  ocOrigen?: OrdenCompra;
  ccBase?: Partial<ComprobanteCompra>;
  onExito: (cc: ComprobanteCompra, cxp?: CuentaPorPagar) => void;
  onCancelar: () => void;
  /**
   * Navega a la edición de la Orden de Compra de origen (misma OC, nunca una
   * nueva). Solo se ofrece cuando el CC realmente proviene de una OC y no
   * tiene pagos activos. El segundo argumento son los datos propios del CC ya
   * ingresados en una conversión todavía no registrada (tipo/serie/número/
   * fecha/tipo de operación/retención/modalidad de inventario/observaciones/
   * adjuntos) — el llamador los conserva y los reinyecta al volver, sin
   * perderlos ni crear ningún documento en el tránsito.
   */
  onEditarOrdenCompra?: (oc: OrdenCompra, datosPropiosCC?: Partial<ComprobanteCompra>) => void;
  /** Navega al detalle de la Cuenta por Pagar (donde se ven los pagos aplicados). Se ofrece en vez de "Editar Orden de Compra" cuando el CC ya tiene pagos activos. */
  onVerCuentaPorPagar?: (cxp: CuentaPorPagar) => void;
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
  onEditarOrdenCompra,
  onVerCuentaPorPagar,
}: FormularioComprobanteCompraProps) {
  const {
    state,
    registrarComprobanteCompra,
    guardarBorradorCC,
    actualizarComprobanteCompraBorrador,
    registrarComprobanteCompraDesdeBorrador,
    actualizarComprobanteCompra,
    refrescarProveedores,
  } = useCompras();
  const esBorradorExistente = Boolean(ccBase?.id) && ccBase?.estadoDocumento === 'borrador';
  const esEdicionRegistrada = Boolean(ccBase?.id) && ccBase?.estadoDocumento === 'registrado';
  const camposFinancierosBloqueados = esEdicionRegistrada && !puedeEditarCamposFinancierosCC(ccBase as ComprobanteCompra);
  const motivoBloqueo = esEdicionRegistrada ? motivoBloqueoCamposFinancierosCC(ccBase as ComprobanteCompra) : null;
  // Único origen de "este CC hereda de una OC": la conversión recién iniciada
  // (prop ocOrigen, aún sin registrar) y la edición de un CC ya guardado con
  // ordenCompraOrigenId son la MISMA condición — se unifican aquí para no
  // duplicar la clasificación de campos heredados/propios en dos sitios.
  const ordenCompraOrigenId = ocOrigen?.id ?? ccBase?.ordenCompraOrigenId;
  const heredaDeOC = Boolean(ordenCompraOrigenId);
  // Bloqueo de los campos realmente heredados de la OC de origen (proveedor,
  // direcciones, moneda/TC, forma de pago/cronograma, centro de costo/
  // presupuesto, líneas —producto/cantidad/unidad/costo/impuesto—): esta
  // etapa no implementa facturación parcial, así que la cantidad se bloquea
  // igual que el resto de datos heredados, sin excepción durante la
  // conversión. Independiente del bloqueo por pagos, se combinan con OR solo
  // en esos campos — los propios y exclusivos del CC (tipo/serie/número,
  // tipo de operación, retención, modalidad de inventario) siguen editables
  // aunque el CC provenga de una OC.
  const camposHeredadosBloqueados = camposFinancierosBloqueados || heredaDeOC;
  // En creación, `ocOrigen` ya es el objeto real (evita una búsqueda); en
  // edición se relee de `state.ordenes` para reflejar la OC más reciente.
  const ocOrigenReal = heredaDeOC
    ? (ocOrigen ?? state.ordenes.find((o) => o.id === ordenCompraOrigenId))
    : undefined;
  // Mensaje específico para la sección de productos cuando hereda de una OC:
  // el acceso "Editar Orden de Compra" ya existe en la cabecera de la card de
  // datos del comprobante (más abajo) — este texto no repite esa acción, solo
  // informa. Si no hereda de una OC, `SeccionProductosCompra` usa su mensaje
  // genérico por defecto (ej. comprobante con pagos activos sin origen en OC).
  const mensajeProductosHeredados = heredaDeOC && ocOrigenReal
    ? `Los productos y cantidades provienen de la ${formatearNumeroCompra(ocOrigenReal.serie, ocOrigenReal.correlativo)}. Para modificarlos, edita el documento de origen.`
    : undefined;
  // Misma fuente robusta (cruza relaciones reales CxP → Pagos, no un estado
  // derivado) que usa el bloqueo de edición de la OC — decide si el aviso
  // ofrece "Editar Orden de Compra" o, en su lugar, "Ver pagos relacionados".
  // Solo aplica a un CC que ya existe (una conversión recién iniciada nunca
  // tiene pagos todavía).
  const tienePagosActivosOC =
    heredaDeOC && Boolean(ccBase?.id) && tieneCCPagosActivos(ccBase as ComprobanteCompra, state.cuentasPorPagar, state.pagos);
  const cxpOrigenReal = tienePagosActivosOC
    ? state.cuentasPorPagar.find((c) => c.id === (ccBase as ComprobanteCompra).cuentaPorPagarId)
    : undefined;
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
  // La OC solo aporta un valor inicial sugerido (si lo tiene) — el CC conserva
  // su propio campo, editable e independiente del de la OC (nunca se tratan
  // como el mismo dato compartido; ver aplicarDatosHeredadosCC en ContextoCompras.tsx).
  const [fechaVencimiento, setFechaVencimiento] = useState(ccBase?.fechaVencimiento ?? ocOrigen?.fechaVencimiento ?? '');
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

  // Recibo por Honorarios (código '12'): siempre es un servicio prestado por
  // una persona natural, nunca afecta inventario — se fuerza y bloquea la
  // modalidad para no ofrecer un almacén/Nota de Ingreso que no corresponde.
  const esRH = tipoComprobante === '12';
  useEffect(() => {
    if (esRH) setModalidadInventario('no_afecta_inventario');
  }, [esRH]);

  // Retención (solo RH): la tasa la ingresa el usuario por documento — no
  // existe (todavía) un catálogo de tasas de retención en Configuración, así
  // que nunca se hardcodea un porcentaje.
  const [aplicaRetencion, setAplicaRetencion] = useState(Boolean(ccBase?.retencion));
  const [tasaRetencionInput, setTasaRetencionInput] = useState(
    ccBase?.retencion ? String(ccBase.retencion.tasaRetencion) : '',
  );
  const [centroCosto, setCentroCosto] = useState(ccBase?.centroCosto ?? datosDesdeOC?.centroCosto ?? '');
  const [presupuesto, setPresupuesto] = useState(ccBase?.presupuesto ?? datosDesdeOC?.presupuesto ?? '');
  const [observaciones, setObservaciones] = useState(ccBase?.observaciones ?? datosDesdeOC?.observaciones ?? '');
  const [adjuntos, setAdjuntos] = useState<AdjuntoCompra[]>(ccBase?.adjuntos ?? []);
  const [enviando, setEnviando] = useState(false);
  // Mismo esquema que FormularioOrdenCompra.tsx: sin errores en un formulario
  // recién abierto, solo tras un intento real de guardar borrador o
  // registrar/actualizar; se recalculan en cada render así que desaparecen
  // apenas el campo vuelve a ser válido.
  const [intentoRegistrar, setIntentoRegistrar] = useState(false);
  const [intentoBorrador, setIntentoBorrador] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const lineasCompra = useLineasCompra(ccBase?.lineas ?? datosDesdeOC?.lineas ?? [], {
    tratamientoImpuestoCompra: config.preferenciasInventario.tratamientoImpuestoCompra,
    taxes: config.taxes,
  });
  const lineas = lineasCompra.lineas;

  const totalesCalculados = calcularTotalesLineas(lineas);
  const tasaRetencion = aplicaRetencion ? parseFloat(tasaRetencionInput) || 0 : 0;
  const montoRetencion = esRH && aplicaRetencion ? calcularMontoRetencion(totalesCalculados.total, tasaRetencion) : 0;
  const netoAPagarCC = round2(totalesCalculados.total - montoRetencion);
  const documentoAfectaInventario = modalidadInventario !== 'no_afecta_inventario';
  const almacenSeleccionado = almacenesActivos.find((a) => a.id === almacenId);

  /**
   * Única resolución final por línea (naturaleza inventariable + afectación + snapshot de
   * conversión), calculada UNA vez con la unidad y cantidad YA vigentes de cada línea — reutilizada
   * tanto por la validación (bloquea si `snapshot.error`) como por `construirDatosCC` (persiste
   * `snapshot.factorConversionAplicado`/`cantidadDocumentadaInventariable` tal cual, nunca conserva
   * el valor anterior de la línea). Un solo recorrido: nunca dos cálculos independientes que puedan
   * divergir entre lo que se valida y lo que finalmente se guarda.
   */
  const resolucionesLineas = useMemo(
    () =>
      lineas.map((l) => {
        const esInventariable = l.esInventariable ?? calcularEsInventariable(l);
        const afectaInventarioLinea = calcularAfectaInventarioLinea(esInventariable, modalidadInventario);
        const snapshot = resolverSnapshotInventarioLinea({
          esInventariable,
          unidadMedidaCodigo: l.unidadMedidaCodigo,
          unidadesDisponibles: l.unidadesDisponibles,
          cantidadComercialFinal: l.cantidadSolicitada,
        });
        return { linea: l, esInventariable, afectaInventarioLinea, snapshot };
      }),
    [lineas, modalidadInventario],
  );

  // Misma validación que ya aplica el servicio (`validarComprobanteCompraBasico`,
  // servicioComprobanteCompra.ts) — se reutiliza tal cual para no duplicar
  // reglas. El almacén no forma parte de ese validador (es una condición
  // propia de esta UI, no del modelo de CC) y se agrega aparte.
  const erroresValidacion = useMemo(() => {
    const base = convertirErroresValidacion(
      validarComprobanteCompraBasico({
        proveedorId: proveedor?.id?.toString(),
        tipoComprobanteProveedor: tipoComprobante || undefined,
        serieProveedor: serieProveedor.trim() || undefined,
        numeroProveedor: numeroProveedor.trim() || undefined,
        fechaEmisionProveedor: fechaEmisionProveedor || undefined,
        fechaVencimiento: fechaVencimiento || undefined,
        moneda,
        formaPago,
        modalidadInventario,
        lineas,
      }),
    );
    if (documentoAfectaInventario && !almacenSeleccionado) {
      base.push({
        campo: 'almacenId',
        codigo: 'ALMACEN_REQUERIDO',
        mensaje: 'Selecciona el almacén de destino para el ingreso a inventario.',
      });
    }
    // Validación definitiva del snapshot de conversión — con la unidad y cantidad YA finales de
    // cada línea, inmediatamente antes de permitir confirmar el CC. Una línea inventariable que
    // vaya a afectar inventario no puede guardarse sin un snapshot válido (§4 del saneamiento).
    resolucionesLineas.forEach(({ linea: l, afectaInventarioLinea, snapshot }) => {
      if (!afectaInventarioLinea) return;
      if (snapshot.error) {
        base.push({
          campo: 'lineas',
          codigo: 'SNAPSHOT_CONVERSION_INVALIDO',
          mensaje: `${l.nombreProducto}: ${snapshot.error}`,
        });
      }
    });
    return base;
  }, [
    proveedor,
    tipoComprobante,
    serieProveedor,
    numeroProveedor,
    fechaEmisionProveedor,
    fechaVencimiento,
    moneda,
    formaPago,
    modalidadInventario,
    lineas,
    documentoAfectaInventario,
    almacenSeleccionado,
    resolucionesLineas,
  ]);
  // Los campos realmente heredados de una OC (proveedor, moneda, forma de
  // pago, líneas) llegan ya validados desde un documento real: si algo ahí
  // fallara, sería una inconsistencia del documento de origen, no un error
  // que el usuario pueda corregir en un control que no puede editar — se
  // excluyen de la visualización en campo (regla general de negocio, no
  // representada aquí porque en la práctica no ocurre con datos reales).
  const CAMPOS_HEREDADOS = ['proveedorId', 'moneda', 'formaPago', 'lineas', 'tipoCambio'];
  function errorDeCampo(campo: string): string | undefined {
    if (heredaDeOC && CAMPOS_HEREDADOS.includes(campo)) return undefined;
    const visible = intentoRegistrar || (intentoBorrador && campo === 'proveedorId');
    if (!visible) return undefined;
    return erroresValidacion.find((e) => normalizarCampoLineas(e.campo) === campo)?.mensaje;
  }
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
      retencion:
        esRH && aplicaRetencion
          ? { tasaRetencion, montoRetencion, netoAPagar: netoAPagarCC }
          : undefined,
      modalidadInventario,
      centroCosto: centroCosto || undefined,
      presupuesto: presupuesto || undefined,
      observaciones: observaciones || undefined,
      observacionPresupuestal: ccBase?.observacionPresupuestal,
      // Misma resolución ya calculada para `erroresValidacion` (resolucionesLineas) — la línea
      // definitiva persiste EXACTAMENTE ese resultado fresco, nunca los valores de
      // factorConversionAplicado/cantidadDocumentadaInventariable que ya traía `l` en el estado:
      // si difieren, prevalece el resultado final recién calculado con la unidad y cantidad
      // vigentes (§ Cierre 1). Para una línea no inventariable, el snapshot resuelve `{}` (ambos
      // campos ausentes) — nunca se inventa factor 1 ni cantidad 0.
      lineas: resolucionesLineas.map(({ linea: l, esInventariable, afectaInventarioLinea, snapshot }) => ({
        ...l,
        esInventariable,
        afectaInventario: afectaInventarioLinea,
        almacenDestinoId: afectaInventarioLinea ? almacenSeleccionado?.id : undefined,
        almacenDestinoNombre: afectaInventarioLinea ? almacenSeleccionado?.nombreAlmacen : undefined,
        factorConversionAplicado: snapshot.factorConversionAplicado,
        cantidadDocumentadaInventariable: snapshot.cantidadDocumentadaInventariable,
      })),
      totales: {
        subtotal: totalesCalculados.subtotal,
        subtotalExonerado: totalesCalculados.subtotalExonerado,
        subtotalInafecto: totalesCalculados.subtotalInafecto,
        descuentoTotal: totalesCalculados.descuentoTotal,
        igv: totalesCalculados.igv,
        retencion: esRH && aplicaRetencion ? montoRetencion : undefined,
        total: totalesCalculados.total,
        moneda,
      },
      ordenCompraOrigenId: ocOrigen?.id ?? ccBase?.ordenCompraOrigenId,
      adjuntos,
    };
  }

  /**
   * Snapshot de los datos propios del CC ya ingresados (nunca los heredados
   * de la OC, que se van a recargar desde la OC actualizada). Se usa
   * exclusivamente al pulsar "Editar Orden de Compra" durante una conversión
   * todavía no registrada, para que el llamador los conserve y los reinyecte
   * al volver — no se crea ni persiste ningún documento en ese tránsito.
   */
  function construirDatosPropiosCC(): Partial<ComprobanteCompra> {
    return {
      tipoComprobanteProveedor: tipoComprobante || undefined,
      serieProveedor: serieProveedor.trim() ? serieProveedor.toUpperCase() : undefined,
      numeroProveedor: numeroProveedor.trim() || undefined,
      fechaEmisionProveedor: fechaEmisionProveedor || undefined,
      tipoOperacion: tipoOperacion || undefined,
      retencion: esRH && aplicaRetencion ? { tasaRetencion, montoRetencion, netoAPagar: netoAPagarCC } : undefined,
      modalidadInventario,
      observaciones: observaciones || undefined,
      adjuntos,
    };
  }

  async function handleGuardarBorrador() {
    setIntentoBorrador(true);
    if (!proveedor) {
      enfocarPrimerCampoConError([{ campo: 'proveedorId', codigo: 'PROVEEDOR_REQUERIDO', mensaje: 'Selecciona un proveedor para guardar el borrador.' }]);
      return;
    }
    setErrorGeneral(null);
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
      setErrorGeneral(mensaje);
      feedback.error(mensaje);
    } finally {
      setEnviando(false);
    }
  }

  async function handleSubmit() {
    setIntentoRegistrar(true);
    if (erroresValidacion.length > 0) {
      enfocarPrimerCampoConError(erroresValidacion);
      return;
    }

    setErrorGeneral(null);
    setEnviando(true);

    try {
      const datos = construirDatosCC();
      const { comprobante, cuentaPorPagar } = esEdicionRegistrada
        ? await actualizarComprobanteCompra(ccBase!.id!, datos, session?.userName)
        : esBorradorExistente
          ? await registrarComprobanteCompraDesdeBorrador(ccBase!.id!, datos, session?.userName)
          : await registrarComprobanteCompra(datos, session?.userId);

      if (proveedor && !esEdicionRegistrada) {
        await persistirProveedorSiEsNuevo(proveedor, createCliente);
        refrescarProveedores();
      }

      feedback.success(esEdicionRegistrada ? 'Comprobante de compra actualizado correctamente.' : 'Comprobante de compra registrado.');
      onExito(comprobante, cuentaPorPagar);
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : (esEdicionRegistrada ? 'Error al actualizar el comprobante.' : 'Error al registrar el comprobante.');
      setErrorGeneral(mensaje);
      feedback.error(mensaje);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <PageHeader
        breadcrumb={
          <Breadcrumb items={[{ label: 'Compras', onClick: onCancelar }, { label: esEdicionRegistrada ? 'Editar comprobante' : esBorradorExistente ? 'Editar borrador de comprobante' : 'Registrar comprobante' }]} />
        }
        title={
          <div className="flex items-center gap-2.5">
            <div>
              <h1 className="text-lg font-semibold text-gray-900 leading-tight">
                {esEdicionRegistrada ? 'Editar Comprobante de Compra' : esBorradorExistente ? 'Editar Borrador de Comprobante' : 'Registrar Comprobante de Compra'}
              </h1>
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
        {errorGeneral && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {errorGeneral}
          </div>
        )}

        {motivoBloqueo && !heredaDeOC && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
            {motivoBloqueo}
          </div>
        )}

        {/* Card principal: Datos del comprobante — referencia discreta + acción cuando el CC viene de una OC, integradas en la cabecera de la card (nunca un banner de ancho completo). */}
        <FormSectionCard
          titulo="Datos del comprobante"
          subtitulo={
            heredaDeOC && ocOrigenReal
              ? `Datos comerciales heredados de la ${formatearNumeroCompra(ocOrigenReal.serie, ocOrigenReal.correlativo)}${tienePagosActivosOC ? ' — tiene pagos aplicados' : ''}`
              : undefined
          }
          acciones={
            <div className="flex items-center gap-3">
              {heredaDeOC && ocOrigenReal && (
                tienePagosActivosOC ? (
                  onVerCuentaPorPagar && cxpOrigenReal && (
                    <button
                      type="button"
                      onClick={() => onVerCuentaPorPagar(cxpOrigenReal)}
                      title="Ver pagos relacionados"
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      <Wallet size={13} />
                      Ver pagos relacionados
                    </button>
                  )
                ) : (
                  onEditarOrdenCompra && (
                    <button
                      type="button"
                      onClick={() => onEditarOrdenCompra(ocOrigenReal, construirDatosPropiosCC())}
                      title="Editar Orden de Compra"
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      <Pencil size={13} />
                      Editar Orden de Compra
                    </button>
                  )
                )
              )}
              <button
                type="button"
                onClick={() => setModalCamposAbierto(true)}
                className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-medium transition-colors"
              >
                <Settings size={13} />
                <span>+ Campos</span>
              </button>
            </div>
          }
        >
          <TwoColumnDocumentFields
            izquierda={
              <>
                <div className="space-y-1" id="campo-proveedorId">
                  <label className="text-sm font-medium text-gray-700">Proveedor</label>
                  <BuscadorProveedor
                    proveedor={proveedor}
                    onSeleccionar={(p) => {
                      setProveedor(p);
                      setDireccionFacturacion(p?.direccion ?? '');
                      setDireccionEntrega(p?.direccion ?? '');
                    }}
                    deshabilitado={camposHeredadosBloqueados}
                    error={errorDeCampo('proveedorId') ?? null}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Dirección de facturación</label>
                  <input
                    type="text"
                    value={direccionFacturacion}
                    onChange={(e) => setDireccionFacturacion(e.target.value)}
                    disabled={camposHeredadosBloqueados}
                    placeholder="Selecciona un proveedor para autocompletar..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Dirección de entrega</label>
                  <input
                    type="text"
                    value={direccionEntrega}
                    onChange={(e) => setDireccionEntrega(e.target.value)}
                    disabled={camposHeredadosBloqueados}
                    placeholder="Selecciona un proveedor para autocompletar..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>
              </>
            }
            derecha={
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1" id="campo-tipoComprobanteProveedor">
                    <label className="text-sm font-medium text-gray-700">Tipo de comprobante</label>
                    <select
                      value={tipoComprobante}
                      onChange={(e) => setTipoComprobante(e.target.value)}
                      disabled={camposFinancierosBloqueados}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400 ${
                        errorDeCampo('tipoComprobanteProveedor') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    >
                      {TIPOS_DOCUMENTO_PROVEEDOR.map((t) => (
                        <option key={t.codigo} value={t.codigo}>
                          {t.nombre}
                        </option>
                      ))}
                    </select>
                    {errorDeCampo('tipoComprobanteProveedor') && (
                      <p className="text-xs text-red-600">{errorDeCampo('tipoComprobanteProveedor')}</p>
                    )}
                  </div>
                  <div className="space-y-1" id="campo-serieProveedor">
                    <label className="text-sm font-medium text-gray-700" title="Serie del comprobante emitido por el proveedor (máx. 4 caracteres)">Serie</label>
                    <input
                      type="text"
                      value={serieProveedor}
                      onChange={(e) => setSerieProveedor(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))}
                      maxLength={4}
                      disabled={camposFinancierosBloqueados}
                      placeholder={obtenerPlaceholderSerieDocumentoProveedor(tipoComprobante)}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400 ${
                        errorDeCampo('serieProveedor') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {errorDeCampo('serieProveedor') && <p className="text-xs text-red-600">{errorDeCampo('serieProveedor')}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1" id="campo-numeroProveedor">
                    <label className="text-sm font-medium text-gray-700" title="Número del comprobante emitido por el proveedor, tal como aparece en el documento">Número</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={numeroProveedor}
                      onChange={(e) => setNumeroProveedor(e.target.value.replace(/\D/g, ''))}
                      disabled={camposFinancierosBloqueados}
                      placeholder="Ej: 123"
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400 ${
                        errorDeCampo('numeroProveedor') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {errorDeCampo('numeroProveedor') && <p className="text-xs text-red-600">{errorDeCampo('numeroProveedor')}</p>}
                  </div>
                  <div className="space-y-1" id="campo-fechaEmisionProveedor">
                    <label className="text-sm font-medium text-gray-700">Fecha de emisión</label>
                    <input
                      type="date"
                      value={fechaEmisionProveedor}
                      onChange={(e) => setFechaEmisionProveedor(e.target.value)}
                      disabled={camposFinancierosBloqueados}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400 ${
                        errorDeCampo('fechaEmisionProveedor') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {errorDeCampo('fechaEmisionProveedor') && (
                      <p className="text-xs text-red-600">{errorDeCampo('fechaEmisionProveedor')}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1" id="campo-fechaVencimiento">
                    <label className="text-sm font-medium text-gray-700">F. vencimiento</label>
                    <input
                      type="date"
                      value={fechaVencimiento}
                      onChange={(e) => setFechaVencimiento(e.target.value)}
                      readOnly={isCreditMethod}
                      disabled={camposFinancierosBloqueados}
                      title={isCreditMethod ? 'Calculada automáticamente desde la última cuota del cronograma de crédito' : undefined}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400 ${
                        isCreditMethod ? 'bg-gray-50 text-gray-600 border-gray-300' : errorDeCampo('fechaVencimiento') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {!isCreditMethod && errorDeCampo('fechaVencimiento') && (
                      <p className="text-xs text-red-600">{errorDeCampo('fechaVencimiento')}</p>
                    )}
                  </div>
                  <div className="space-y-1" id="campo-moneda">
                    <label className="text-sm font-medium text-gray-700">Moneda</label>
                    <select
                      value={moneda}
                      onChange={(e) => setMoneda(e.target.value as MonedaCompra)}
                      disabled={camposHeredadosBloqueados}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400 ${
                        errorDeCampo('moneda') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    >
                      {config.currencies.filter((c) => c.isActive).map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.symbol} {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                    {errorDeCampo('moneda') && <p className="text-xs text-red-600">{errorDeCampo('moneda')}</p>}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Tipo de operación</label>
                  <select
                    value={tipoOperacion}
                    onChange={(e) => setTipoOperacion(e.target.value)}
                    disabled={camposFinancierosBloqueados}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400"
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
                      disabled={camposHeredadosBloqueados}
                      placeholder={`1 ${moneda} = ? ${monedaBase}`}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1" id="campo-formaPago">
                    <label className="text-sm font-medium text-gray-700">Forma de pago</label>
                    <select
                      value={formaPagoMetodoId}
                      onChange={(e) => handleFormaPagoChange(e.target.value)}
                      disabled={camposHeredadosBloqueados}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400 ${
                        errorDeCampo('formaPago') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    >
                      {!formaPagoMetodoId && <option value="">Seleccionar</option>}
                      {metodosPagoActivos.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                      <option value={NUEVO_CREDITO_VALUE}>+ Crear crédito</option>
                    </select>
                    {errorDeCampo('formaPago') && <p className="text-xs text-red-600">{errorDeCampo('formaPago')}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Comprador</label>
                    <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600">
                      {ccBase?.compradorNombre ?? session?.userName ?? 'Usuario no identificado'}
                    </div>
                  </div>
                </div>

                <div id="campo-almacenId">
                  <SelectorModalidadInventario
                    modalidad={modalidadInventario}
                    onCambiarModalidad={setModalidadInventario}
                    almacenesActivos={almacenesActivos}
                    almacenId={almacenId}
                    onCambiarAlmacen={setAlmacenId}
                    bloqueada={esRH || camposFinancierosBloqueados}
                    motivoBloqueo={esRH ? 'Recibo por Honorarios no afecta inventario.' : motivoBloqueo ?? undefined}
                  />
                  {errorDeCampo('almacenId') && <p className="mt-1 text-xs text-red-600">{errorDeCampo('almacenId')}</p>}
                </div>

                {esRH && (
                  <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={aplicaRetencion}
                        onChange={(e) => setAplicaRetencion(e.target.checked)}
                        disabled={camposFinancierosBloqueados}
                        className="rounded border-gray-300"
                      />
                      Aplica retención
                    </label>
                    {aplicaRetencion && (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs text-gray-500">Tasa (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={tasaRetencionInput}
                            onChange={(e) => setTasaRetencionInput(e.target.value)}
                            disabled={camposFinancierosBloqueados}
                            placeholder="Ej: 8"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-gray-500">Monto retenido</label>
                          <div className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm text-gray-600">
                            {formatMoney(montoRetencion, moneda)}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-gray-500">Neto a pagar</label>
                          <div className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm font-medium text-gray-900">
                            {formatMoney(netoAPagarCC, moneda)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {esVisible('centroCosto') && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Centro de costo</label>
                    <input
                      type="text"
                      value={centroCosto}
                      onChange={(e) => setCentroCosto(e.target.value)}
                      disabled={camposHeredadosBloqueados}
                      placeholder="Ej: Administración"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400"
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
                      disabled={camposHeredadosBloqueados}
                      placeholder="Ej: Presupuesto 2026-Q3"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>
                )}
              </>
            }
          />
        </FormSectionCard>

        {/* Productos - Servicios */}
        <div id="campo-lineas" className="space-y-1">
          {errorDeCampo('lineas') && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
              {errorDeCampo('lineas')}
            </div>
          )}
          <SeccionProductosCompra
            moneda={moneda}
            lineasCompra={lineasCompra}
            totalesCalculados={totalesCalculados}
            disabled={camposHeredadosBloqueados}
            mensajeBloqueo={mensajeProductosHeredados}
          />
        </div>

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
        onGuardarBorrador={esEdicionRegistrada ? undefined : handleGuardarBorrador}
        primaryAction={{
          label: enviando
            ? (esEdicionRegistrada ? 'Actualizando...' : 'Guardando...')
            : (esEdicionRegistrada ? 'Actualizar comprobante' : 'Registrar comprobante'),
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
