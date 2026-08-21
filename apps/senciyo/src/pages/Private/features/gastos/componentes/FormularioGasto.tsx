// gastos/componentes/FormularioGasto.tsx
//
// Página completa de registrar/editar gasto (§1/§9 de una corrección
// anterior — sustituye el Drawer largo original). Mismo shell reutilizable
// que Compras (`FormularioPagoCompra.tsx`): `PageHeader`/`Breadcrumb`,
// `FormSectionCard`, `CollapsibleNotes`, footer fijo con tres acciones
// jerarquizadas (§7 de esta corrección: Guardar borrador / Registrar gasto /
// Registrar y pagar — nunca ocultas en un menú de tres puntos). Dos columnas
// en escritorio (principal + resumen), una columna en móvil. Reutiliza
// `BuscadorProveedor`, `EditorMediosPagoCompra`, `AdjuntosCompra`,
// `CreditScheduleModal`/`CreditScheduleSummaryCard`, `CreditPaymentMethodModal`
// (Nuevo crédito, ya usado en Configuración de Negocio → Pagos) y el motor
// tributario de `servicioImpuestoGasto.ts` — nunca un cálculo manual de IGV,
// nunca un cronograma de cuotas paralelo, nunca una forma de pago inventada.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb, PageHeader } from '@/contasis';
import { FormSectionCard, CollapsibleNotes } from '@/shared/ui';
import { formatMoney } from '@/shared/currency';
import { useFeedback } from '@/shared/feedback/useFeedback';
import { useUserSession } from '@/contexts/UserSessionContext';
import { getConfiguredPaymentMeans, isCashPaymentMeanCode } from '@/shared/payments/paymentMeans';
import { CreditScheduleModal } from '@/shared/payments/CreditScheduleModal';
import { CreditScheduleSummaryCard } from '@/shared/payments/CreditScheduleSummaryCard';
import { CreditPaymentMethodModal } from '@/shared/payments/CreditPaymentMethodModal';
import { useCreditTermsConfigurator } from '@/shared/payments/useCreditTermsConfigurator';
import { useBankAccounts } from '../../configuracion-sistema/hooks/useCuentasBancarias';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { obtenerUsuarioDesdeSesion, tienePermiso } from '../../configuracion-sistema/utilidades/permisos';
import { useTenant } from '@/shared/tenant/TenantContext';
import { filterExpenseSeries, getNextExpenseDocument } from '@/shared/series/expenseSeries';
import { getBusinessTodayISODate } from '@/shared/time/businessTime';
import BuscadorProveedor, { type ProveedorSeleccionado } from '../../compras/componentes/BuscadorProveedor';
import { enfocarPrimerCampoConError, convertirErroresValidacion } from '../../compras/modelos/ErroresValidacion';
import EditorMediosPagoCompra from '../../compras/componentes/pagos/EditorMediosPagoCompra';
import AdjuntosCompra from '../../compras/componentes/adjuntos/AdjuntosCompra';
import { TIPOS_DOCUMENTO_PROVEEDOR } from '../../compras/constantes/tiposDocumentoProveedor';
import {
  TRATAMIENTO_IMPUESTO_GASTO_LABELS,
  TIPOS_ADJUNTO_GASTO,
  type Gasto,
  type TratamientoImpuestoGasto,
} from '../modelos/Gasto';
import type { CategoriaGasto } from '../modelos/CategoriaGasto';
import type { MonedaCompra } from '../../compras/modelos/tiposBaseCompras';
import {
  nivelEdicionGasto,
  validarGastoBasico,
  validarMinimoBorradorGasto,
  filtrarErroresVigentes,
  motivoBloqueoEfectivoMonedaExtranjera,
  TIPOS_DOCUMENTO_SUSTENTATORIO_GASTO_COMPATIBLES,
  type DatosNuevoGasto,
} from '../servicios/servicioGasto';
import {
  listarImpuestosConfiguradosGasto,
  resolverImpuestoGasto,
  calcularImportesGastoDesdeSubtotal,
  calcularImportesGastoDesdeTotal,
  calcularImportesGastoSinDesglose,
} from '../servicios/servicioImpuestoGasto';
import { useContextoGastos } from '../contexto/useContextoGastos';
import { useCaja } from '../../control-caja/context/CajaContext';
import type { MedioPagoCompra } from '../../compras/modelos/PagoCompra';

export type ModoFormularioGasto = 'crear' | 'editar';

interface FormularioGastoProps {
  modo: ModoFormularioGasto;
  gasto?: Gasto;
  valoresIniciales?: Omit<DatosNuevoGasto, 'fechaReconocimiento' | 'empresaId'>;
  categorias: CategoriaGasto[];
  establecimientos: Array<{ value: string; label: string }>;
  monedas: Array<{ code: string; label: string }>;
  monedaBase: string;
  empresaId: string;
  onExito: () => void;
  onCancelar: () => void;
}

type ModoIngresoImporte = 'subtotal' | 'total';
type IntentGasto = 'guardar_borrador' | 'registrar' | 'registrar_y_pagar';

// Sentinel dentro del propio selector "Forma de pago" (mismo patrón que
// `FormularioHeaderComercial.tsx` en Documentos Comerciales) — "+ Crear nueva
// forma de crédito" vive DENTRO del desplegable, nunca como un botón aparte.
const NUEVO_CREDITO_VALUE = '__nuevo_credito__';

function nuevoMedioPago(monto: number): MedioPagoCompra {
  return { id: `medio-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, medioPagoCodigo: '', medioPagoNombre: '', monto };
}

/** Borde rojo cuando el campo tiene un error de validación pendiente — nunca solo color, siempre acompañado del mensaje debajo (§5 de la corrección). */
function claseControl(tieneError: boolean): string {
  return `w-full border rounded-lg px-3 py-2 text-sm ${tieneError ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-400' : 'border-gray-300'}`;
}

function MensajeErrorCampo({ mensaje }: { mensaje?: string }) {
  if (!mensaje) return null;
  return <span className="block text-[11px] text-red-600">{mensaje}</span>;
}

export default function FormularioGasto({
  modo,
  gasto,
  valoresIniciales,
  categorias,
  establecimientos,
  monedas,
  monedaBase,
  empresaId,
  onExito,
  onCancelar,
}: FormularioGastoProps) {
  const feedback = useFeedback();
  const { session } = useUserSession();
  const { state: config, dispatch: dispatchConfig, rolesConfigurados } = useConfigurationContext();
  const { activeEstablecimientoId } = useTenant();
  const { guardarBorradorGasto, registrarGasto, registrarGastoConPagoInmediato, editarGasto, obtenerCuentaPorPagarDeGasto, obtenerPagosDeGasto } = useContextoGastos();
  const { accounts: cuentasBancarias } = useBankAccounts();
  const { status: estadoCaja } = useCaja();

  const base = valoresIniciales ?? gasto;
  const esBorradorExistente = gasto?.estadoDocumento === 'borrador';
  // Edición completa (borrador o gasto nuevo) vs limitada (registrado con
  // pagos ACTIVOS aplicados: solo observaciones/adjuntos, §12 de la
  // corrección / corrección técnica final §10 — pagos ya anulados nunca
  // cuentan, nunca solo `pagosRelacionados.length`).
  const nivelEdicion = gasto ? nivelEdicionGasto(gasto, obtenerCuentaPorPagarDeGasto(gasto), obtenerPagosDeGasto(gasto)) : 'completa';
  const soloEdicionLimitada = nivelEdicion === 'limitada';

  // Serie de Gasto — selector real (§1 de la corrección), NUNCA una única
  // serie fija: fuente exclusiva el catálogo central de Series, filtrado por
  // empresa (tenant), establecimiento OPERATIVO actual (cabecera del
  // sistema — nunca el campo "Establecimiento" de asignación del gasto) y
  // tipo documental "Gasto" activo. Un gasto YA REGISTRADO nunca cambia de
  // serie: se bloquea a solo lectura.
  const serieEsSoloLectura = modo === 'editar' && Boolean(gasto) && !esBorradorExistente;
  const seriesGastoActivas = useMemo(
    () => filterExpenseSeries(config.series, activeEstablecimientoId),
    [config.series, activeEstablecimientoId],
  );
  // La serie ya asignada a este gasto/borrador se mantiene siempre visible
  // como opción aunque haya dejado de estar activa o cambie el
  // establecimiento operativo — nunca debe desaparecer silenciosamente del
  // propio registro que la usa.
  const serieAsignadaId = gasto?.serieId;
  const serieAsignada = serieAsignadaId ? config.series.find((s) => s.id === serieAsignadaId) : undefined;
  const opcionesSerie = useMemo(() => {
    if (serieAsignada && !seriesGastoActivas.some((s) => s.id === serieAsignada.id)) {
      return [serieAsignada, ...seriesGastoActivas];
    }
    return seriesGastoActivas;
  }, [seriesGastoActivas, serieAsignada]);

  const [serieId, setSerieId] = useState<string>(
    () => serieAsignadaId ?? seriesGastoActivas.find((s) => s.isDefault)?.id ?? seriesGastoActivas[0]?.id ?? '',
  );
  const serieSeleccionada = opcionesSerie.find((s) => s.id === serieId);
  // Previsualización del correlativo (patrón visual de `FormularioPagoCompra`
  // — `numeroPagoPreview`), en tres estados distintos (corrección final
  // consolidada §2/§10):
  // - Registrado: su referencia real y definitiva, nunca recalculada.
  // - Borrador (nuevo o ya existente): "G001 · Sin correlativo" — nunca un
  //   número fabricado como si estuviera reservado, porque otro gasto podría
  //   consumir ese correlativo antes de que este borrador se registre.
  // - Nuevo gasto que se registrará de inmediato: el próximo correlativo
  //   real, siempre leído de `Series.correlativeNumber`, nunca escaneado.
  const previsualizacionSerie = serieEsSoloLectura && gasto
    ? gasto.referenciaInterna
    : esBorradorExistente
      ? (serieSeleccionada ? `${serieSeleccionada.series} · Sin correlativo` : null)
      : serieSeleccionada
        ? getNextExpenseDocument(serieSeleccionada).fullNumber
        : null;

  const usuarioActual = obtenerUsuarioDesdeSesion(config.users, session);
  // Nombre visible del usuario que registra/edita (corrección final puntual
  // §3.3) — MISMA fuente central ya resuelta arriba (`obtenerUsuarioDesdeSesion`),
  // nunca un id técnico ni un catálogo de usuarios paralelo. `creadoPor`/
  // `historial[].usuario` ya se presentan tal cual en el Drawer y en el
  // Excel, así que deben recibir un nombre humano desde el momento en que
  // se escriben, no un identificador crudo.
  const nombreUsuarioActual = usuarioActual?.personalInfo.fullName || session?.userEmail || undefined;
  const establecimientoIdSesion = session?.currentEstablecimientoId;
  const puedeGestionarFormasDePago = tienePermiso({
    usuario: usuarioActual,
    permisoId: 'config.negocio.gestionar',
    rolesDisponibles: rolesConfigurados,
    establecimientoId: establecimientoIdSesion,
  });
  // "Registrar y pagar" ejecuta el pago en el mismo acto (§6): la ruta de
  // este formulario solo exige `gastos.crear`, así que el permiso de pago se
  // verifica aquí además — mismo doble enforcement que ya aplica
  // `registrarGastoConPagoInmediato` en `ContextoGastos.tsx`.
  const puedePagarGastos = tienePermiso({
    usuario: usuarioActual,
    permisoId: 'gastos.pagar',
    rolesDisponibles: rolesConfigurados,
    establecimientoId: establecimientoIdSesion,
  });

  const [fechaReconocimiento, setFechaReconocimiento] = useState(gasto?.fechaReconocimiento?.slice(0, 10) ?? getBusinessTodayISODate());
  const [fechaEmision, setFechaEmision] = useState(base?.fechaEmision?.slice(0, 10) ?? '');
  const [fechaVencimiento, setFechaVencimiento] = useState(base?.fechaVencimiento?.slice(0, 10) ?? '');
  // Nunca preseleccionada automáticamente (§10 de la remediación UX): un
  // gasto nuevo empieza sin categoría elegida — el usuario decide, en vez de
  // heredar en silencio la primera del catálogo (ej. "Alquileres") y arriesgar
  // un registro mal clasificado. Sigue siendo obligatoria al registrar.
  const [categoriaId, setCategoriaId] = useState(base?.categoriaId ?? '');
  const [establecimientoId, setEstablecimientoId] = useState(base?.establecimientoId ?? '');
  const [concepto, setConcepto] = useState(base?.concepto ?? '');
  const [proveedor, setProveedor] = useState<ProveedorSeleccionado | null>(
    base?.proveedorId
      ? { id: base.proveedorId, nombre: base.proveedorNombre ?? '', tipoDocumento: '', numeroDocumento: base.proveedorNumeroDocumento ?? '' }
      : null,
  );
  const [sinProveedorFormal, setSinProveedorFormal] = useState(!base?.proveedorId && Boolean(base?.beneficiario));
  const [beneficiario, setBeneficiario] = useState(base?.beneficiario ?? '');
  const [tipoDocumento, setTipoDocumento] = useState(base?.tipoDocumento ?? '');
  const [serieDocumentoProveedor, setSerieDocumentoProveedor] = useState(base?.serieDocumentoProveedor ?? '');
  const [numeroDocumentoProveedor, setNumeroDocumentoProveedor] = useState(base?.numeroDocumentoProveedor ?? '');
  const [moneda, setMoneda] = useState<MonedaCompra>(base?.moneda ?? (monedaBase as MonedaCompra));
  const [tipoCambio, setTipoCambio] = useState(base?.tipoCambio?.toString() ?? '');

  const [tratamientoImpuesto, setTratamientoImpuesto] = useState<TratamientoImpuestoGasto>(base?.tratamientoImpuesto ?? 'sin_desglose');
  const [impuestoId, setImpuestoId] = useState(base?.impuestoId ?? '');
  const [modoIngreso, setModoIngreso] = useState<ModoIngresoImporte>('total');
  const [monto, setMonto] = useState((base?.total ?? '').toString());

  // Forma de pago — FUENTE ÚNICA (§8 de la corrección): un solo selector,
  // nunca un radio Contado/Crédito separado. `condicionPago` se DERIVA de si
  // la forma elegida es de crédito (`isCreditMethod`), nunca se elige aparte.
  const metodosPagoActivos = useMemo(() => config.paymentMethods.filter((m) => m.isActive), [config.paymentMethods]);
  const metodoPagoPredeterminado = metodosPagoActivos.find((m) => m.isDefault) ?? metodosPagoActivos[0];
  const [formaPagoMetodoId, setFormaPagoMetodoId] = useState(base?.formaPagoMetodoId ?? metodoPagoPredeterminado?.id ?? '');
  const [modalCuotasAbierto, setModalCuotasAbierto] = useState(false);
  const [modalNuevoCreditoAbierto, setModalNuevoCreditoAbierto] = useState(false);

  const [observaciones, setObservaciones] = useState(gasto?.observaciones ?? '');
  const [adjuntos, setAdjuntos] = useState(gasto?.adjuntos ?? []);
  const [enviando, setEnviando] = useState<IntentGasto | null>(null);
  // Errores por campo (§5 de la corrección: nunca solo un resumen global) —
  // `errorGeneral` queda solo para fallos que no son de un campo puntual
  // (p. ej. una regla de negocio del comando en el contexto).
  const [erroresPorCampo, setErroresPorCampo] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  // Última intención validada (§1 de la corrección final puntual) — la
  // revalidación reactiva reutiliza la MISMA regla que produjo el error
  // vigente (Guardar borrador es más laxo que Registrar/Registrar y pagar),
  // nunca una regla paralela para el onChange.
  const [ultimoIntentoValidado, setUltimoIntentoValidado] = useState<IntentGasto | null>(null);

  // Medios de pago para "Registrar y pagar" — disponible para cualquier
  // forma de pago (§6 de la corrección: ya no exclusivo de "Contado").
  // Colapsado por defecto (§2/§8 de esta corrección): la sección de pago
  // nunca estorba visualmente cuando el usuario aún no decidió pagar ahora.
  const [mostrarPagoAhora, setMostrarPagoAhora] = useState(false);
  const [mediosPago, setMediosPago] = useState<MedioPagoCompra[]>(() => [nuevoMedioPago(0)]);
  const [claveIdempotencia] = useState(() => `gasto-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  const mediosDisponibles = useMemo(() => getConfiguredPaymentMeans().filter((m) => m.isVisible), []);

  /**
   * Oculta la sección de pago (§2 de la corrección final puntual) — nunca
   * conserva silenciosamente medios/montos invisibles: si el usuario había
   * ingresado algo (un medio elegido o un monto > 0), se descarta al mismo
   * tiempo que se oculta la sección, dejando un único renglón en blanco listo
   * para un intento futuro. Solución directa y predecible, sin un diálogo de
   * confirmación adicional ni un segundo estado de "pago pendiente de
   * limpiar".
   */
  function ocultarDatosDePago() {
    setMostrarPagoAhora(false);
    setMediosPago([nuevoMedioPago(0)]);
  }

  // Impuesto aplicable: solo impuestos porcentuales y, con tratamiento
  // "recuperable", solo impuestos Gravados (auditoría de fuentes de verdad
  // §20/§21) — filtro CONTEXTUAL de Gastos, nunca sobre el catálogo central.
  const impuestosDisponibles = useMemo(
    () => listarImpuestosConfiguradosGasto(config.taxes, tratamientoImpuesto),
    [config.taxes, tratamientoImpuesto],
  );
  const impuestoSeleccionado = useMemo(() => resolverImpuestoGasto(impuestoId, config.taxes), [impuestoId, config.taxes]);
  // Ningún impuesto elegido todavía pero el tratamiento SÍ exige desglose —
  // el Resumen nunca debe mostrar "IGV S/ 0.00" como si el cálculo ya fuera
  // definitivo (§25 de la remediación UX): la validación ya bloquea el envío
  // (`validarImpuestoAplicableGasto`), esto es solo la presentación mientras
  // el usuario todavía no eligió.
  const impuestoPendienteSeleccion = tratamientoImpuesto !== 'sin_desglose' && !impuestoSeleccionado;

  // Documento sustentatorio — subconjunto compatible con Gastos (§14 de la
  // remediación UX / auditoría de fuentes de verdad §9). Un gasto YA
  // registrado con un tipo fuera del subconjunto (registro histórico previo
  // a esta regla) conserva su opción visible — nunca desaparece del propio
  // registro que la usa, mismo criterio que `opcionesSerie` arriba.
  const opcionesTipoDocumento = useMemo(() => {
    if (tipoDocumento && !TIPOS_DOCUMENTO_SUSTENTATORIO_GASTO_COMPATIBLES.some((t) => t.codigo === tipoDocumento)) {
      const original = TIPOS_DOCUMENTO_PROVEEDOR.find((t) => t.codigo === tipoDocumento);
      return original ? [original, ...TIPOS_DOCUMENTO_SUSTENTATORIO_GASTO_COMPATIBLES] : TIPOS_DOCUMENTO_SUSTENTATORIO_GASTO_COMPATIBLES;
    }
    return TIPOS_DOCUMENTO_SUSTENTATORIO_GASTO_COMPATIBLES;
  }, [tipoDocumento]);

  const importesCalculados = useMemo(() => {
    const montoNum = Number(monto) || 0;
    if (tratamientoImpuesto === 'sin_desglose') return calcularImportesGastoSinDesglose(montoNum);
    const tasa = impuestoSeleccionado?.tasa ?? 0;
    return modoIngreso === 'subtotal'
      ? calcularImportesGastoDesdeSubtotal(montoNum, tasa)
      : calcularImportesGastoDesdeTotal(montoNum, tasa);
  }, [monto, tratamientoImpuesto, modoIngreso, impuestoSeleccionado]);

  const importeReconocido = tratamientoImpuesto === 'recuperable' ? importesCalculados.subtotal : importesCalculados.total;

  // Crédito y cuotas: MISMA fuente y motor que Compras — la forma de pago
  // configurada en Configuración de Negocio → Pagos decide si hay
  // cronograma e hidrata su plantilla de cuotas.
  const metodoPagoSeleccionado = metodosPagoActivos.find((m) => m.id === formaPagoMetodoId);
  const {
    isCreditMethod,
    templates: plantillasCuotas,
    setTemplates: setPlantillasCuotas,
    creditTerms: cronogramaCuotas,
    errors: erroresCuotas,
    restoreDefaults: restaurarCuotasPorDefecto,
  } = useCreditTermsConfigurator({
    paymentMethodId: formaPagoMetodoId,
    total: importesCalculados.total,
    issueDate: fechaReconocimiento || undefined,
    initialCreditTerms: gasto?.creditTerms,
  });
  const condicionPago: 'contado' | 'credito' = isCreditMethod ? 'credito' : 'contado';
  // Dos conceptos distintos (corrección técnica final §7) — `isCreditMethod`
  // ya implica `condicionPago === 'credito'` (se deriva de él), así que
  // comparar ambos era una rama inalcanzable. Lo que sí varía es si la forma
  // de crédito elegida TIENE un cronograma real configurado (`creditSchedule`
  // del método, o cuotas armadas a mano en el modal) — cuando no lo tiene,
  // es "una sola cuota" con vencimiento manual, nunca el día de hoy silencioso
  // que producía `cronogramaCuotas.fechaVencimientoGlobal` con un template vacío.
  const tieneCronogramaConfigurado = isCreditMethod && (cronogramaCuotas?.schedule.length ?? 0) > 0;

  const cuentasBancariasCompatibles = useMemo(
    () => cuentasBancarias.filter((c) => c.isVisible && c.currencyCode === moneda),
    [cuentasBancarias, moneda],
  );
  const hayMedioDeCaja = mediosPago.some((m) => isCashPaymentMeanCode(m.medioPagoCodigo));

  function construirDatos(): DatosNuevoGasto {
    const proveedorId = sinProveedorFormal ? undefined : proveedor?.id?.toString();
    return {
      empresaId,
      serieId: serieEsSoloLectura ? gasto?.serieId : (serieId || undefined),
      establecimientoId: establecimientoId || undefined,
      fechaReconocimiento,
      fechaEmision: fechaEmision || undefined,
      fechaVencimiento: isCreditMethod && !tieneCronogramaConfigurado ? fechaVencimiento || undefined : cronogramaCuotas?.fechaVencimientoGlobal,
      categoriaId,
      concepto,
      proveedorId,
      proveedorNombre: sinProveedorFormal ? undefined : proveedor?.nombre,
      proveedorNumeroDocumento: sinProveedorFormal ? undefined : proveedor?.numeroDocumento,
      beneficiario: sinProveedorFormal ? beneficiario : undefined,
      tipoDocumento: tipoDocumento || undefined,
      serieDocumentoProveedor: tipoDocumento ? serieDocumentoProveedor || undefined : undefined,
      numeroDocumentoProveedor: tipoDocumento ? numeroDocumentoProveedor || undefined : undefined,
      moneda,
      tipoCambio: moneda !== monedaBase ? Number(tipoCambio) || undefined : undefined,
      subtotal: importesCalculados.subtotal,
      impuesto: importesCalculados.impuesto,
      total: importesCalculados.total,
      tratamientoImpuesto,
      impuestoId: tratamientoImpuesto === 'sin_desglose' ? undefined : impuestoSeleccionado?.id,
      tasaImpuesto: tratamientoImpuesto === 'sin_desglose' ? undefined : impuestoSeleccionado?.tasa,
      condicionPago,
      // Persiste SIEMPRE la forma elegida, también en contado (corrección
      // técnica final §6) — nunca borra la fuente de verdad de Configuración.
      formaPagoMetodoId: formaPagoMetodoId || undefined,
      creditTerms: tieneCronogramaConfigurado ? cronogramaCuotas : undefined,
      observaciones: observaciones || undefined,
      adjuntos,
      claveIdempotencia,
    };
  }

  /**
   * ÚNICA fuente de reglas de validación por campo (corrección final puntual
   * §1) — usada TANTO al enviar como por la revalidación reactiva de abajo,
   * nunca una regla paralela para el onChange. Reutiliza las MISMAS
   * `validarGastoBasico`/`validarMinimoBorradorGasto` que ya aplica
   * `ContextoGastos.tsx` como segunda barrera.
   */
  function calcularErroresGasto(intent: IntentGasto, datos: DatosNuevoGasto) {
    const errores = intent === 'guardar_borrador'
      ? validarMinimoBorradorGasto(datos)
      : validarGastoBasico(datos, monedaBase);
    // Registrar/Registrar y pagar exigen una serie de Gasto activa
    // seleccionada (§2 de la corrección) — Guardar borrador nunca la exige.
    // El gasto ya registrado (edición completa/limitada) no pasa por aquí:
    // su serie ya quedó fija al momento de registrarse.
    if (intent !== 'guardar_borrador' && (modo === 'crear' || esBorradorExistente) && !serieSeleccionada) {
      errores.push({ campo: 'serieId', mensaje: 'Selecciona una serie de Gasto activa para continuar.' });
    }
    return errores;
  }

  /**
   * GAS-P1-004: "Registrar y pagar" paga el gasto en el mismo acto — Caja no
   * es multimoneda, así que un gasto en moneda extranjera no puede pagarse
   * con un medio que la impacte, ni siquiera en este atajo. Se muestra de
   * inmediato (sin esperar al intento de envío) igual que el aviso
   * equivalente del formulario central de "Registrar pago"
   * (`FormularioPagoCompra.tsx`), reutilizando la MISMA regla de dominio —
   * `registrarGastoConPagoInmediato` la vuelve a exigir de todas formas.
   */
  const motivoBloqueoMonedaRegistrarYPagar = mostrarPagoAhora
    ? motivoBloqueoEfectivoMonedaExtranjera(moneda, monedaBase, mediosPago)
    : null;

  /**
   * Revalidación reactiva DERIVADA en el render (§1 de la corrección final
   * puntual) — un campo que YA muestra error (`erroresPorCampo`, escrito
   * solo al enviar) se filtra contra la validación FRESCA en cada render:
   * si ya es válido, desaparece de inmediato de `erroresMostrados`; si sigue
   * inválido, su mensaje se actualiza; nunca espera a un nuevo envío. Un
   * valor derivado durante el render (no un `useEffect` con `setState`)
   * porque `construirDatos()`/`calcularErroresGasto` son puros y baratos —
   * no hace falta memoizarlos ni perseguir una lista de ~30 dependencias
   * para saber cuándo "cambió algo": simplemente se recalculan siempre.
   */
  const erroresVigentes = ultimoIntentoValidado ? calcularErroresGasto(ultimoIntentoValidado, construirDatos()) : [];
  const erroresMostrados = filtrarErroresVigentes(erroresPorCampo, erroresVigentes);

  async function ejecutar(intent: IntentGasto) {
    setErrorGeneral(null);
    setUltimoIntentoValidado(intent);

    const datosParaValidar = construirDatos();
    const errores = calcularErroresGasto(intent, datosParaValidar);
    if (errores.length > 0) {
      setErroresPorCampo(Object.fromEntries(errores.map((e) => [e.campo, e.mensaje])));
      // Desplaza y enfoca el primer campo inválido (§6 de la corrección) —
      // reutiliza la MISMA utilidad genérica que ya usa `FormularioPagoCompra.tsx`,
      // nunca una segunda implementación de foco/scroll.
      enfocarPrimerCampoConError(convertirErroresValidacion(errores));
      return;
    }
    setErroresPorCampo({});

    setEnviando(intent);
    try {
      if (modo === 'editar' && gasto && !esBorradorExistente) {
        // Registrado (edición completa o limitada) — nunca cambia de estado documental aquí.
        await editarGasto(gasto.id, datosParaValidar, nombreUsuarioActual);
        feedback.success('Gasto actualizado correctamente.');
        onExito();
        return;
      }

      const gastoExistenteId = esBorradorExistente ? gasto!.id : undefined;

      if (intent === 'guardar_borrador') {
        await guardarBorradorGasto(datosParaValidar, nombreUsuarioActual, gastoExistenteId);
        feedback.success('Borrador guardado correctamente.');
      } else if (intent === 'registrar_y_pagar') {
        await registrarGastoConPagoInmediato({ datos: datosParaValidar, mediosPago, claveIdempotencia, gastoExistenteId }, nombreUsuarioActual);
        feedback.success('Gasto registrado y pagado correctamente.');
      } else {
        await registrarGasto(datosParaValidar, nombreUsuarioActual, gastoExistenteId);
        feedback.success('Gasto registrado correctamente.');
      }
      onExito();
    } catch (error) {
      setErrorGeneral(error instanceof Error ? error.message : 'No se pudo guardar el gasto.');
    } finally {
      setEnviando(null);
    }
  }

  const tituloPagina = modo === 'editar' && gasto
    ? (esBorradorExistente ? `Editar borrador — ${gasto.concepto}` : 'Editar gasto')
    : 'Registrar gasto';

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <PageHeader
        breadcrumb={<Breadcrumb items={[{ label: 'Gastos', onClick: onCancelar }, { label: modo === 'editar' ? 'Editar gasto' : 'Registrar gasto' }]} />}
        title={
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold text-gray-900 leading-tight">{tituloPagina}</h1>
            {previsualizacionSerie ? (
              <span className="text-xs text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded">{previsualizacionSerie}</span>
            ) : esBorradorExistente ? (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Sin correlativo asignado</span>
            ) : null}
          </div>
        }
      />

      <div className="w-full px-4 sm:px-6 lg:px-8 py-5 space-y-4">
        {errorGeneral && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorGeneral}
          </div>
        )}

        {opcionesSerie.length === 0 && (modo === 'crear' || esBorradorExistente) && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            No hay una serie de Gasto activa configurada para este establecimiento. Puedes guardar como borrador, pero para registrar necesitas{' '}
            <Link to="/configuracion/series" className="font-medium underline hover:text-amber-900">
              crear una serie activa de tipo &quot;Gasto&quot; en Configuración → Series
            </Link>.
          </div>
        )}

        {soloEdicionLimitada && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Este gasto ya tiene pagos aplicados: solo pueden editarse observaciones y adjuntos. Total, moneda, proveedor, forma de pago, cronograma, tratamiento tributario y fecha del gasto quedan bloqueados para no desincronizar la Cuenta por Pagar, los Pagos o Caja.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <fieldset disabled={soloEdicionLimitada} className="space-y-4 disabled:opacity-60">
              <FormSectionCard titulo="Datos generales">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <label id="campo-serieId" className="space-y-1">
                    <span className="text-xs text-gray-500">Serie *</span>
                    {serieEsSoloLectura ? (
                      <select value={serieId} disabled className={claseControl(false)}>
                        {serieSeleccionada && <option value={serieSeleccionada.id}>{serieSeleccionada.series}</option>}
                      </select>
                    ) : (
                      <select
                        value={serieId}
                        onChange={(e) => setSerieId(e.target.value)}
                        disabled={opcionesSerie.length === 0}
                        aria-invalid={Boolean(erroresMostrados.serieId)}
                        className={claseControl(Boolean(erroresMostrados.serieId))}
                      >
                        {opcionesSerie.length === 0 && <option value="">Sin series de Gasto activas</option>}
                        {opcionesSerie.map((s) => (
                          <option key={s.id} value={s.id}>{s.series}</option>
                        ))}
                      </select>
                    )}
                    <MensajeErrorCampo mensaje={erroresMostrados.serieId} />
                  </label>
                  <label id="campo-fechaReconocimiento" className="space-y-1">
                    <span className="text-xs text-gray-500">Fecha del gasto *</span>
                    <input type="date" value={fechaReconocimiento} onChange={(e) => setFechaReconocimiento(e.target.value)} aria-invalid={Boolean(erroresMostrados.fechaReconocimiento)} className={claseControl(Boolean(erroresMostrados.fechaReconocimiento))} />
                    <MensajeErrorCampo mensaje={erroresMostrados.fechaReconocimiento} />
                  </label>
                  <label id="campo-categoriaId" className="space-y-1">
                    <span className="text-xs text-gray-500">Categoría *</span>
                    <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} aria-invalid={Boolean(erroresMostrados.categoriaId)} className={claseControl(Boolean(erroresMostrados.categoriaId))}>
                      <option value="" disabled>Selecciona una categoría</option>
                      {categorias.filter((c) => c.estado === 'activa' || c.id === categoriaId).map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                    <MensajeErrorCampo mensaje={erroresMostrados.categoriaId} />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-gray-500">Establecimiento</span>
                    <select value={establecimientoId} onChange={(e) => setEstablecimientoId(e.target.value)} className={claseControl(false)}>
                      <option value="">Toda la empresa</option>
                      {establecimientos.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                    </select>
                  </label>
                </div>
                <label id="campo-concepto" className="block space-y-1 mt-3">
                  <span className="text-xs text-gray-500">Concepto *</span>
                  <input type="text" value={concepto} onChange={(e) => setConcepto(e.target.value)} aria-invalid={Boolean(erroresMostrados.concepto)} className={claseControl(Boolean(erroresMostrados.concepto))} placeholder="Ej. Alquiler del local" />
                  <MensajeErrorCampo mensaje={erroresMostrados.concepto} />
                </label>
              </FormSectionCard>

              <FormSectionCard titulo="Proveedor o beneficiario">
                <label className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                  <input type="checkbox" checked={sinProveedorFormal} onChange={(e) => setSinProveedorFormal(e.target.checked)} />
                  Sin proveedor formal
                </label>
                <p className="text-[11px] text-gray-400 mb-2">Para movilidad, propinas u otros pagos a personas.</p>
                <div id="campo-beneficiario">
                {sinProveedorFormal ? (
                  <div className="space-y-1">
                    <input type="text" value={beneficiario} onChange={(e) => setBeneficiario(e.target.value)} placeholder="Nombre del beneficiario" aria-invalid={Boolean(erroresMostrados.beneficiario)} className={claseControl(Boolean(erroresMostrados.beneficiario))} />
                    <MensajeErrorCampo mensaje={erroresMostrados.beneficiario} />
                  </div>
                ) : (
                  <BuscadorProveedor proveedor={proveedor} onSeleccionar={setProveedor} error={erroresMostrados.beneficiario} />
                )}
                </div>
              </FormSectionCard>

              <FormSectionCard titulo="Documento sustentatorio">
                <div className="grid grid-cols-2 sm:grid-cols-12 gap-3">
                  <label className={`space-y-1 col-span-2 ${tipoDocumento ? 'sm:col-span-4' : 'sm:col-span-12'}`}>
                    <span className="text-xs text-gray-500">Tipo de documento</span>
                    <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)} className={claseControl(false)}>
                      <option value="">Sin documento</option>
                      {opcionesTipoDocumento.map((t) => <option key={t.codigo} value={t.codigo}>{t.nombre}</option>)}
                    </select>
                  </label>
                  {tipoDocumento && (
                    <>
                      <label className="space-y-1 col-span-1 sm:col-span-3">
                        <span className="text-xs text-gray-500">Fecha del documento</span>
                        <input type="date" value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} className={claseControl(false)} />
                      </label>
                      <label className="space-y-1 col-span-1 sm:col-span-2">
                        <span className="text-xs text-gray-500">Serie</span>
                        <input type="text" value={serieDocumentoProveedor} onChange={(e) => setSerieDocumentoProveedor(e.target.value)} className={claseControl(false)} />
                      </label>
                      <label className="space-y-1 col-span-2 sm:col-span-3">
                        <span className="text-xs text-gray-500">Número</span>
                        <input type="text" value={numeroDocumentoProveedor} onChange={(e) => setNumeroDocumentoProveedor(e.target.value)} className={claseControl(false)} />
                      </label>
                    </>
                  )}
                </div>
              </FormSectionCard>

              <FormSectionCard titulo="Importes">
                <div className="grid grid-cols-2 sm:grid-cols-12 gap-3">
                  <label className="space-y-1 sm:col-span-3">
                    <span className="text-xs text-gray-500">Moneda *</span>
                    <select value={moneda} onChange={(e) => setMoneda(e.target.value as MonedaCompra)} className={claseControl(false)}>
                      {monedas.map((m) => <option key={m.code} value={m.code}>{m.label}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1 sm:col-span-5">
                    <span className="text-xs text-gray-500">Tratamiento del IGV</span>
                    <select value={tratamientoImpuesto} onChange={(e) => setTratamientoImpuesto(e.target.value as TratamientoImpuestoGasto)} className={claseControl(false)}>
                      {(Object.keys(TRATAMIENTO_IMPUESTO_GASTO_LABELS) as TratamientoImpuestoGasto[]).map((t) => (
                        <option key={t} value={t}>{TRATAMIENTO_IMPUESTO_GASTO_LABELS[t]}</option>
                      ))}
                    </select>
                  </label>
                  <label id="campo-total" className="space-y-1 sm:col-span-4">
                    <span className="text-xs text-gray-500">{tratamientoImpuesto === 'sin_desglose' ? 'Total del gasto *' : modoIngreso === 'total' ? 'Total (incluye IGV) *' : 'Subtotal (sin IGV) *'}</span>
                    <input type="number" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} aria-invalid={Boolean(erroresMostrados.total)} className={`${claseControl(Boolean(erroresMostrados.total))} text-right`} />
                    <MensajeErrorCampo mensaje={erroresMostrados.total} />
                  </label>
                  {moneda !== monedaBase && (
                    <label className="space-y-1 sm:col-span-4">
                      <span className="text-xs text-gray-500">Tipo de cambio *</span>
                      <input type="number" step="0.0001" value={tipoCambio} onChange={(e) => setTipoCambio(e.target.value)} aria-invalid={Boolean(erroresMostrados.tipoCambio)} className={`${claseControl(Boolean(erroresMostrados.tipoCambio))} text-right`} />
                      <MensajeErrorCampo mensaje={erroresMostrados.tipoCambio} />
                    </label>
                  )}
                  {tratamientoImpuesto !== 'sin_desglose' && (
                    <>
                      <label className="space-y-1 sm:col-span-5">
                        <span className="text-xs text-gray-500">Impuesto aplicable *</span>
                        <select value={impuestoId} onChange={(e) => setImpuestoId(e.target.value)} aria-invalid={Boolean(erroresMostrados.impuestoId)} className={claseControl(Boolean(erroresMostrados.impuestoId))}>
                          <option value="">Selecciona un impuesto...</option>
                          {impuestosDisponibles.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                        </select>
                        <MensajeErrorCampo mensaje={erroresMostrados.impuestoId} />
                      </label>
                      {/* Misma fila compacta que "Impuesto aplicable" (remediación visual §17-18) — nunca un bloque aparte debajo del grid. */}
                      <div className="space-y-1 sm:col-span-7">
                        <span className="text-xs text-gray-500">¿El importe incluye IGV?</span>
                        <div className="flex gap-3 pt-2">
                          <label className="flex items-center gap-1.5 text-sm">
                            <input type="radio" checked={modoIngreso === 'total'} onChange={() => setModoIngreso('total')} /> Sí (es el total)
                          </label>
                          <label className="flex items-center gap-1.5 text-sm">
                            <input type="radio" checked={modoIngreso === 'subtotal'} onChange={() => setModoIngreso('subtotal')} /> No (es el subtotal)
                          </label>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </FormSectionCard>
            </fieldset>

            <FormSectionCard titulo="Adjuntos">
              <AdjuntosCompra
                adjuntos={adjuntos}
                tiposPermitidos={TIPOS_ADJUNTO_GASTO}
                // Default contextual (§38 de la remediación UX): solo sugiere
                // "Factura del proveedor" cuando ya hay un documento
                // tributario elegido — "Sin documento" nunca preselecciona un
                // tipo de adjunto incompatible con ese escenario.
                tipoInicial={tipoDocumento ? 'factura_proveedor' : 'otro'}
                onAgregar={(a) => setAdjuntos((prev) => [...prev, a])}
                onEliminar={(id) => setAdjuntos((prev) => prev.filter((a) => a.id !== id))}
              />
            </FormSectionCard>

            <CollapsibleNotes observaciones={observaciones} onCambiarObservaciones={setObservaciones} />
          </div>

          <div className="lg:col-span-1 space-y-4">
            <FormSectionCard titulo="Resumen">
              {/*
                Divulgación progresiva (§22/§24 de la remediación UX): "sin
                desglose" no repite 4 veces el mismo número (subtotal=IGV0=
                total=gasto considerado) — solo el total. "No recuperable"
                muestra Subtotal/IGV/Total (el gasto considerado sería
                idéntico al Total, no aporta). Solo "Recuperable" agrega
                "Gasto considerado" porque ahí SÍ difiere del Total.
              */}
              {tratamientoImpuesto === 'sin_desglose' ? (
                <div className="flex justify-between py-1 text-sm">
                  <span className="font-medium text-gray-700">Total del gasto</span>
                  <span className="font-semibold text-gray-900">{formatMoney(importesCalculados.total, moneda)}</span>
                </div>
              ) : impuestoPendienteSeleccion ? (
                <div className="space-y-1">
                  <div className="flex justify-between py-1 text-sm"><span className="text-gray-500">Subtotal</span><span className="text-gray-400">—</span></div>
                  <div className="flex justify-between py-1 text-sm"><span className="text-gray-500">IGV</span><span className="text-gray-400">Selecciona un impuesto</span></div>
                  <div className="flex justify-between py-1 text-sm border-t border-gray-100 pt-2"><span className="font-medium text-gray-700">Total</span><span className="text-gray-400">—</span></div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex justify-between py-1 text-sm"><span className="text-gray-500">Subtotal</span><span>{formatMoney(importesCalculados.subtotal, moneda)}</span></div>
                  <div className="flex justify-between py-1 text-sm"><span className="text-gray-500">{tratamientoImpuesto === 'recuperable' ? 'IGV recuperable' : 'IGV'}</span><span>{formatMoney(importesCalculados.impuesto, moneda)}</span></div>
                  <div className="flex justify-between py-1 text-sm border-t border-gray-100 pt-2"><span className="font-medium text-gray-700">Total</span><span className="font-semibold text-gray-900">{formatMoney(importesCalculados.total, moneda)}</span></div>
                  {tratamientoImpuesto === 'recuperable' && (
                    <>
                      <div className="flex justify-between py-1 text-sm">
                        <span className="text-gray-500" title="Monto que se descontará de la utilidad bruta.">Gasto considerado</span>
                        <span className="font-medium">{formatMoney(importeReconocido, moneda)}</span>
                      </div>
                      <span className="block text-[11px] text-gray-400">El IGV no forma parte del gasto porque puede utilizarse como crédito fiscal.</span>
                    </>
                  )}
                </div>
              )}
            </FormSectionCard>

            <fieldset disabled={soloEdicionLimitada} className="space-y-4 disabled:opacity-60">
              <FormSectionCard titulo="Forma de pago">
                <label className="block space-y-1">
                  <span className="text-xs text-gray-500">Forma de pago *</span>
                  <select
                    value={formaPagoMetodoId}
                    onChange={(e) => {
                      if (e.target.value === NUEVO_CREDITO_VALUE) {
                        setModalNuevoCreditoAbierto(true);
                        return;
                      }
                      setFormaPagoMetodoId(e.target.value);
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    {metodosPagoActivos.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    {puedeGestionarFormasDePago && <option value={NUEVO_CREDITO_VALUE}>+ Crear nueva forma de crédito</option>}
                  </select>
                </label>

                {tieneCronogramaConfigurado ? (
                  <div className="mt-3">
                    <CreditScheduleSummaryCard
                      creditTerms={cronogramaCuotas}
                      currency={moneda}
                      total={importesCalculados.total}
                      onConfigure={() => setModalCuotasAbierto(true)}
                      errors={erroresCuotas}
                      paymentMethodName={metodoPagoSeleccionado?.name}
                      showStatusColumn={false}
                    />
                  </div>
                ) : isCreditMethod && (
                  <label id="campo-fechaVencimiento" className="block space-y-1 mt-3">
                    <span className="text-xs text-gray-500">Fecha de vencimiento *</span>
                    <input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} aria-invalid={Boolean(erroresMostrados.fechaVencimiento)} className={claseControl(Boolean(erroresMostrados.fechaVencimiento))} />
                    <MensajeErrorCampo mensaje={erroresMostrados.fechaVencimiento} />
                    <span className="block text-[11px] text-gray-400">Una sola cuota — esta forma de pago no tiene un cronograma configurado.</span>
                  </label>
                )}
              </FormSectionCard>

              {/*
                Sin permiso de pago, nunca tiene sentido ofrecer esta sección
                (§29 de la remediación UX): sin ella nunca puede existir
                "Registrar y pagar" como acción disponible más abajo.
              */}
              {puedePagarGastos && (
                mostrarPagoAhora ? (
                  <FormSectionCard
                    titulo="Datos del pago"
                    acciones={
                      <button type="button" onClick={ocultarDatosDePago} className="text-xs font-medium text-gray-500 hover:text-gray-700">
                        Ocultar datos del pago
                      </button>
                    }
                  >
                    {motivoBloqueoMonedaRegistrarYPagar && (
                      <div className="mb-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                        {motivoBloqueoMonedaRegistrarYPagar}
                      </div>
                    )}
                    <EditorMediosPagoCompra
                      mediosPago={mediosPago}
                      mediosDisponibles={mediosDisponibles}
                      cuentasBancariasCompatibles={cuentasBancariasCompatibles}
                      moneda={moneda}
                      cajaAbierta={estadoCaja === 'abierta'}
                      hayMedioDeCaja={hayMedioDeCaja}
                      onAgregar={() => setMediosPago((prev) => [...prev, nuevoMedioPago(0)])}
                      onEliminar={(id) => setMediosPago((prev) => prev.filter((m) => m.id !== id))}
                      onCambiarMedio={(id, codigo) => {
                        const opcion = mediosDisponibles.find((m) => m.code === codigo);
                        setMediosPago((prev) => prev.map((m) => (m.id === id ? { ...m, medioPagoCodigo: codigo, medioPagoNombre: opcion?.label ?? '' } : m)));
                      }}
                      onCambiarCampo={(id, campo, valor) => setMediosPago((prev) => prev.map((m) => (m.id === id ? { ...m, [campo]: valor } : m)))}
                    />
                  </FormSectionCard>
                ) : (
                  <div className="px-1">
                    <button
                      type="button"
                      onClick={() => setMostrarPagoAhora(true)}
                      className="text-left text-xs font-medium text-blue-600 hover:underline"
                    >
                      + Agregar datos del pago
                    </button>
                    <p className="text-[11px] text-gray-400 mt-1">Completa esta sección para registrar el gasto y el pago en una sola operación.</p>
                  </div>
                )
              )}
            </fieldset>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-end gap-3">
          <button type="button" onClick={onCancelar} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
            Cancelar
          </button>
          {!soloEdicionLimitada && (modo === 'crear' || esBorradorExistente) && (
            <button
              type="button"
              disabled={enviando !== null}
              onClick={() => void ejecutar('guardar_borrador')}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {enviando === 'guardar_borrador' ? 'Guardando...' : 'Guardar borrador'}
            </button>
          )}
          {(modo === 'crear' || esBorradorExistente) ? (
            // Una sola decisión, nunca dos (§29 de la remediación UX): sin
            // datos de pago completados, la acción principal es "Registrar
            // gasto"; con la sección de pago abierta (solo posible con
            // permiso `gastos.pagar`, ver el gate más arriba), la MISMA
            // acción se convierte en "Registrar y pagar" — nunca un menú
            // desplegable con una segunda intención oculta.
            <div className="flex" title={!serieSeleccionada ? 'Selecciona una serie de Gasto activa para poder registrar.' : undefined}>
              <button
                type="button"
                disabled={enviando !== null || !serieSeleccionada}
                onClick={() => void ejecutar(mostrarPagoAhora && puedePagarGastos ? 'registrar_y_pagar' : 'registrar')}
                className="px-5 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {enviando === 'registrar_y_pagar'
                  ? 'Registrando y pagando...'
                  : enviando === 'registrar'
                    ? 'Registrando...'
                    : mostrarPagoAhora && puedePagarGastos
                      ? 'Registrar y pagar'
                      : 'Registrar gasto'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={enviando !== null}
              onClick={() => void ejecutar('registrar')}
              className="px-5 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {enviando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          )}
        </div>
      </div>

      <CreditScheduleModal
        isOpen={modalCuotasAbierto}
        templates={plantillasCuotas}
        onChange={setPlantillasCuotas}
        onSave={() => setModalCuotasAbierto(false)}
        onCancel={() => { restaurarCuotasPorDefecto(); setModalCuotasAbierto(false); }}
        onRestoreDefaults={restaurarCuotasPorDefecto}
        errors={erroresCuotas}
        paymentMethodName={metodoPagoSeleccionado?.name}
      />

      <CreditPaymentMethodModal
        open={modalNuevoCreditoAbierto}
        onClose={() => setModalNuevoCreditoAbierto(false)}
        paymentMethods={config.paymentMethods}
        onUpdatePaymentMethods={async (methods) => {
          dispatchConfig({ type: 'SET_PAYMENT_METHODS', payload: methods });
        }}
        onCreated={(method) => {
          setFormaPagoMetodoId(method.id);
          setModalNuevoCreditoAbierto(false);
        }}
      />
    </div>
  );
}
