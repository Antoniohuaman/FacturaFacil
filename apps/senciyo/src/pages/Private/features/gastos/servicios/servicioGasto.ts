// gastos/servicios/servicioGasto.ts
//
// Reglas puras del dominio de Gastos — nunca cálculo monetario en JSX, nunca
// una segunda CxP/Pago (reutiliza `tieneCxPPagosActivos`/`recalcularEstadoPagoComprobante`
// ya existentes en `compras/logica/reglasCompras.ts`, la MISMA regla que ya usa
// `ComprobanteCompra`, nunca una reimplementación paralela).

import type { CuentaPorPagar } from '../../compras/modelos/CuentaPorPagar';
import type { PagoCompra } from '../../compras/modelos/PagoCompra';
import type { MonedaCompra } from '../../compras/modelos/tiposBaseCompras';
import type { AdjuntoCompra } from '../../compras/modelos/AdjuntoCompra';
import type { CreditScheduleTerms } from '@/shared/payments/paymentTerms';
import type { Series } from '../../configuracion-sistema/modelos/Series';
import { tieneCxPPagosActivos, recalcularEstadoPagoComprobante, round2 } from '../../compras/logica/reglasCompras';
import { getNombreTipoDocumentoProveedor } from '../../compras/constantes/tiposDocumentoProveedor';
import { isExpenseSeries } from '@/shared/series/expenseSeries';
import { formatBusinessDateTimeIso } from '@/shared/time/businessTime';
import { BADGE_ESTADO_PAGO } from '@/shared/status/estadoPago';
import {
  ESTADO_DOCUMENTO_GASTO_LABELS,
  ESTADO_PAGO_GASTO_LABELS,
  BADGE_ESTADO_DOCUMENTO_GASTO,
  type Gasto,
  type EstadoDocumentoGasto,
  type EstadoPagoGasto,
  type TratamientoImpuestoGasto,
} from '../modelos/Gasto';

/**
 * Etiqueta única para el alcance de un gasto sin establecimiento asignado
 * ("Aplica a" en el formulario) — corrección final consolidada §3: nunca
 * "General" a secas, reutilizada en listado, Drawer, Excel e impresión.
 */
export const ETIQUETA_ALCANCE_TODA_EMPRESA = 'Toda la empresa';

export interface DatosNuevoGasto {
  empresaId: string;
  /** Serie de Gasto elegida en el formulario (catálogo central de Series) — un borrador puede conservarla sin consumirla; Registrar/Registrar y pagar la exigen activa. */
  serieId?: string;
  establecimientoId?: string;
  fechaReconocimiento: string;
  fechaEmision?: string;
  fechaVencimiento?: string;
  categoriaId: string;
  concepto: string;
  proveedorId?: string;
  proveedorNombre?: string;
  proveedorNumeroDocumento?: string;
  beneficiario?: string;
  tipoDocumento?: string;
  serieDocumentoProveedor?: string;
  numeroDocumentoProveedor?: string;
  moneda: MonedaCompra;
  tipoCambio?: number;
  subtotal: number;
  impuesto: number;
  total: number;
  tratamientoImpuesto: TratamientoImpuestoGasto;
  impuestoId?: string;
  tasaImpuesto?: number;
  condicionPago: 'contado' | 'credito';
  formaPagoMetodoId?: string;
  creditTerms?: CreditScheduleTerms;
  observaciones?: string;
  adjuntos?: AdjuntoCompra[];
  /** Clave de idempotencia del COMANDO "Registrar gasto"/conversión de borrador (§13 de la corrección final) — ver `Gasto.claveIdempotencia`/`buscarGastoPorClaveIdempotencia`. Ignorada por `guardarBorradorGasto` (un borrador no consume recursos escasos). */
  claveIdempotencia?: string;
}

export interface ErrorValidacionGasto {
  campo: string;
  mensaje: string;
}

/**
 * Filtra un mapa de errores YA MOSTRADOS (de un intento de envío previo)
 * contra una validación FRESCA — única fuente de la revalidación reactiva
 * del formulario (corrección final puntual §1): un campo cuyo error ya no
 * aparece en `frescos` desaparece de inmediato (el usuario lo corrigió);
 * uno que sigue apareciendo conserva (o actualiza) su mensaje. Nunca agrega
 * un campo nuevo que el usuario no haya intentado enviar todavía — solo
 * revalida lo que YA estaba marcado en rojo.
 */
export function filtrarErroresVigentes(
  base: Record<string, string>,
  frescos: readonly ErrorValidacionGasto[],
): Record<string, string> {
  const resultado: Record<string, string> = {};
  for (const campo of Object.keys(base)) {
    const vigente = frescos.find((e) => e.campo === campo);
    if (vigente) resultado[campo] = vigente.mensaje;
  }
  return resultado;
}

/**
 * Campos mínimos exigidos por CUALQUIER gasto, sea borrador o registrado
 * (§4 de la corrección: un borrador nunca se guarda vacío o casi vacío,
 * pero tampoco exige aún nada que dependa de una forma de pago/cronograma
 * todavía sin definir). Fuente única reutilizada por `validarGastoBasico`
 * (registro completo) y `validarMinimoBorradorGasto` — nunca dos listas de
 * reglas paralelas.
 */
function validarCamposMinimosGasto(datos: Partial<DatosNuevoGasto>): ErrorValidacionGasto[] {
  const errores: ErrorValidacionGasto[] = [];

  if (!datos.categoriaId) {
    errores.push({ campo: 'categoriaId', mensaje: 'La categoría es obligatoria.' });
  }
  if (!datos.concepto?.trim()) {
    errores.push({ campo: 'concepto', mensaje: 'El concepto es obligatorio.' });
  }
  if (!datos.proveedorId && !datos.beneficiario?.trim()) {
    errores.push({ campo: 'beneficiario', mensaje: 'Indica un proveedor o un beneficiario.' });
  }
  if (!datos.fechaReconocimiento) {
    errores.push({ campo: 'fechaReconocimiento', mensaje: 'La fecha del gasto es obligatoria.' });
  }
  if (!datos.total || datos.total <= 0) {
    errores.push({ campo: 'total', mensaje: 'El total debe ser mayor a 0.' });
  }

  return errores;
}

/** Un gasto exige proveedor O beneficiario de texto libre — nunca ninguno de los dos (§9 del alcance: no se permite un gasto sin identificar a quién se le pagó/paga). */
export function validarGastoBasico(datos: Partial<DatosNuevoGasto>): ErrorValidacionGasto[] {
  const errores = validarCamposMinimosGasto(datos);
  if (datos.condicionPago === 'credito' && !datos.fechaVencimiento) {
    errores.push({ campo: 'fechaVencimiento', mensaje: 'La fecha de vencimiento es obligatoria para gastos al crédito.' });
  }
  return errores;
}

/**
 * Mínimo exigido para "Guardar borrador" — nunca guarda un gasto vacío o
 * casi vacío (corrección de UX/consistencia funcional). A diferencia de
 * `validarGastoBasico`, nunca exige la fecha de vencimiento de un crédito:
 * un borrador puede no tener aún su forma de pago/cronograma definidos.
 */
export function validarMinimoBorradorGasto(datos: Partial<DatosNuevoGasto>): ErrorValidacionGasto[] {
  return validarCamposMinimosGasto(datos);
}

/**
 * Construye el Gasto — `estadoDocumento` decide si nace como `borrador` (sin
 * efecto financiero, §4 de la corrección) o `registrado` (reconoce el hecho
 * económico de inmediato). `referenciaInterna` se resuelve ANTES de llamar:
 * para un borrador es un identificador técnico estable (nunca una
 * numeración oficial simulada, ver `referenciaTecnicaBorradorGasto`); para
 * un registro real, la serie/correlativo reservados por el catálogo central
 * de Series (ver `getNextExpenseDocument`, `@/shared/series/expenseSeries`)
 * — mismo criterio que `numeroPago` se resuelve antes de construir un
 * `PagoCompra`.
 */
export function crearGasto(
  datos: DatosNuevoGasto,
  id: string,
  referenciaInterna: string,
  usuario?: string,
  estadoDocumento: EstadoDocumentoGasto = 'registrado',
  /**
   * Instante REAL en que se guarda en SenciYo — nunca `datos.fechaReconocimiento`
   * (la "Fecha del gasto" económica que el usuario elige y que puede ser
   * anterior al día de registro, corrección técnica final §5). Parámetro
   * explícito e inyectable (en vez de un `new Date()` interno) para que las
   * pruebas puedan fijar el instante de registro sin depender del reloj real;
   * por defecto usa la hora de negocio actual (America/Lima), nunca UTC crudo.
   */
  fechaCreacion: string = formatBusinessDateTimeIso(),
): Gasto {
  const accionHistorial = estadoDocumento === 'borrador' ? 'Guardado como borrador' : 'Gasto registrado';
  return {
    id,
    referenciaInterna,
    serieId: datos.serieId,
    empresaId: datos.empresaId,
    establecimientoId: datos.establecimientoId,
    fechaReconocimiento: datos.fechaReconocimiento,
    fechaEmision: datos.fechaEmision,
    fechaVencimiento: datos.condicionPago === 'credito' ? datos.fechaVencimiento : undefined,
    categoriaId: datos.categoriaId,
    concepto: datos.concepto,
    proveedorId: datos.proveedorId,
    proveedorNombre: datos.proveedorNombre,
    proveedorNumeroDocumento: datos.proveedorNumeroDocumento,
    beneficiario: datos.proveedorId ? undefined : datos.beneficiario,
    tipoDocumento: datos.tipoDocumento,
    serieDocumentoProveedor: datos.serieDocumentoProveedor,
    numeroDocumentoProveedor: datos.numeroDocumentoProveedor,
    moneda: datos.moneda,
    tipoCambio: datos.tipoCambio,
    subtotal: round2(datos.subtotal),
    impuesto: round2(datos.impuesto),
    total: round2(datos.total),
    tratamientoImpuesto: datos.tratamientoImpuesto,
    impuestoId: datos.tratamientoImpuesto === 'sin_desglose' ? undefined : datos.impuestoId,
    tasaImpuesto: datos.tratamientoImpuesto === 'sin_desglose' ? undefined : datos.tasaImpuesto,
    condicionPago: datos.condicionPago,
    // Persiste SIEMPRE la forma de pago configurada, también en contado
    // (corrección técnica final §6) — `condicionPago` sigue siendo la única
    // clasificación derivada que gobierna las reglas funcionales (cronograma,
    // vencimiento), pero ya no borra la fuente de verdad de Configuración.
    formaPagoMetodoId: datos.formaPagoMetodoId,
    creditTerms: datos.condicionPago === 'credito' ? datos.creditTerms : undefined,
    cuentaPorPagarId: undefined,
    pagosRelacionados: [],
    adjuntos: datos.adjuntos ?? [],
    observaciones: datos.observaciones,
    claveIdempotencia: datos.claveIdempotencia,
    estadoDocumento,
    historial: [
      { fecha: fechaCreacion, usuario, accion: accionHistorial, detalle: `${referenciaInterna} — ${datos.concepto}` },
    ],
    creadoPor: usuario,
    fechaCreacion,
    fechaActualizacion: fechaCreacion,
  };
}

/**
 * Protección real de idempotencia del COMANDO "Registrar gasto" (sin pago) y
 * de la conversión borrador→registrado (§13 de la corrección final) — se
 * comprueba contra los gastos YA PERSISTIDOS de la empresa activa, nunca
 * contra estado en memoria de un formulario. Nunca compara `undefined ===
 * undefined`: dos gastos sin clave jamás se consideran el mismo. Mismo
 * criterio que `buscarPagoPorClaveIdempotencia` (`compras/servicios/servicioPagoCompra.ts`),
 * reutilizado aquí en vez de duplicado porque la clave vive en el propio
 * `Gasto`, no en un `PagoCompra`.
 */
export function buscarGastoPorClaveIdempotencia(
  gastos: readonly Gasto[],
  claveIdempotencia: string | undefined,
): Gasto | undefined {
  if (!claveIdempotencia) return undefined;
  return gastos.find((g) => g.claveIdempotencia === claveIdempotencia);
}

/**
 * Identificador técnico estable de un borrador — NUNCA una numeración
 * oficial simulada (§4 de la corrección): el propio `id` interno del
 * registro, nunca pasado por `siguienteCorrelativoInterno`. Se sustituye
 * por la referencia real recién al convertir el borrador en registrado
 * (ver `convertirBorradorEnRegistrado`).
 */
export function referenciaTecnicaBorradorGasto(id: string): string {
  return `BORR-${id}`;
}

/**
 * Presentación humana ÚNICA de la referencia — el identificador técnico de
 * un borrador (`referenciaTecnicaBorradorGasto`) nunca se muestra en
 * pantalla, Excel o impresión (corrección de UX): un usuario no debe ver
 * "BORR-gasto-1234567890-abc123". Un borrador DESCARTADO reutiliza ese mismo
 * identificador técnico internamente (§3 de la corrección original: solo 3
 * estados documentales), así que también debe presentarse humano — nunca
 * "BORR-..." aunque su `estadoDocumento` ya sea 'anulado' (corrección
 * puntual §5). Un borrador con una serie YA elegida (`serieId`) muestra
 * "G001 · Sin correlativo" — resuelto aquí a partir del catálogo de Series
 * provisto, NUNCA una serie inventada; sin `serieId` resuelto muestra "Sin
 * serie · Sin correlativo" (corrección técnica final §11: antes el
 * formulario mostraba "G001 · Sin correlativo" mientras listado/Drawer/
 * buscador/Excel/impresión/historial mostraban genéricamente "Borrador — sin
 * numeración", una inconsistencia real). Fuente única reutilizada por TODOS
 * esos lugares — nunca una condición repetida ni una segunda función de
 * presentación por componente.
 */
export function presentarReferenciaGasto(
  gasto: Pick<Gasto, 'referenciaInterna' | 'estadoDocumento' | 'motivoAnulacion' | 'serieId'>,
  series: readonly Pick<Series, 'id' | 'series'>[] = [],
): string {
  if (gasto.estadoDocumento === 'borrador' || esBorradorDescartadoGasto(gasto)) {
    const serie = gasto.serieId ? series.find((s) => s.id === gasto.serieId) : undefined;
    return serie ? `${serie.series} · Sin correlativo` : 'Sin serie · Sin correlativo';
  }
  return gasto.referenciaInterna;
}

/**
 * Presentación humana del ESTADO documental — un borrador descartado
 * reutiliza internamente el estado terminal 'anulado' (§3 de la corrección
 * original), pero nunca debe leerse como si fuera un gasto genuinamente
 * anulado: se clasifica y presenta como "Borrador descartado" (corrección
 * puntual §5). Fuente única reutilizada por el listado, el Drawer, el Excel
 * y la constancia imprimible.
 */
export function presentarEstadoDocumentoGasto(gasto: Pick<Gasto, 'estadoDocumento' | 'motivoAnulacion'>): string {
  if (esBorradorDescartadoGasto(gasto)) return 'Borrador descartado';
  return ESTADO_DOCUMENTO_GASTO_LABELS[gasto.estadoDocumento];
}

/**
 * Estado visual ÚNICO (§8 de la corrección final): la tabla principal muestra
 * UNA sola columna "Estado" en vez de las dos columnas separadas (Estado de
 * pago / Estado documental) — pero las dos fuentes internas
 * (`estadoDocumento`/`estadoPago`) nunca se fusionan en el modelo, esta
 * función solo las RESUELVE para presentación. Un borrador descartado nunca
 * llega aquí en el listado operativo normal (queda oculto, §9), pero se
 * etiqueta igual que `presentarEstadoDocumentoGasto` por si otro consumidor
 * (auditoría) lo solicita explícitamente.
 */
export function presentarEstadoVisualGasto(
  gasto: Pick<Gasto, 'estadoDocumento' | 'motivoAnulacion'>,
  estadoPago: EstadoPagoGasto,
): string {
  if (esBorradorDescartadoGasto(gasto)) return 'Borrador descartado';
  if (gasto.estadoDocumento === 'borrador') return 'Borrador';
  if (gasto.estadoDocumento === 'anulado') return 'Anulado';
  return ESTADO_PAGO_GASTO_LABELS[estadoPago];
}

/** Clase de chip para `presentarEstadoVisualGasto` — reutiliza los MISMOS badges ya usados por cada dimensión por separado, nunca un color paralelo. */
export function presentarClaseEstadoVisualGasto(
  gasto: Pick<Gasto, 'estadoDocumento' | 'motivoAnulacion'>,
  estadoPago: EstadoPagoGasto,
): string {
  if (gasto.estadoDocumento === 'borrador' || gasto.estadoDocumento === 'anulado') {
    return BADGE_ESTADO_DOCUMENTO_GASTO[gasto.estadoDocumento];
  }
  return BADGE_ESTADO_PAGO[estadoPago];
}

/**
 * Resuelve y revalida la serie de Gasto elegida en el formulario contra el
 * catálogo central — nunca basta con haberla elegido una vez: se confirma
 * de nuevo (tipo documental "Gasto", activa) en el momento de registrar,
 * fuente única reutilizada tanto por los comandos que registran
 * (`ContextoGastos.tsx`) como por la previsualización/validación del
 * formulario, nunca un predicado duplicado en cada llamador. `undefined`
 * cuando no se eligió ninguna serie o la elegida ya no es válida (fue
 * desactivada, eliminada, o pertenece a otro tipo documental).
 */
export function resolverSerieGastoSeleccionada(series: readonly Series[], serieId: string | undefined): Series | undefined {
  if (!serieId) return undefined;
  const serie = series.find((s) => s.id === serieId);
  if (!serie || !isExpenseSeries(serie) || !serie.isActive || serie.status !== 'ACTIVE') return undefined;
  return serie;
}

/**
 * Convierte un borrador ya persistido en un gasto registrado — la ÚNICA
 * transición que asigna la referencia interna oficial (serie/correlativo ya
 * resueltos por el llamador) y reconoce el hecho económico. Conserva id,
 * fechaCreacion e historial previo; nunca crea un segundo registro.
 */
export function convertirBorradorEnRegistrado(
  borrador: Gasto,
  referenciaInterna: string,
  usuario?: string,
  /** Instante REAL de la conversión — inyectable para pruebas, por defecto la hora de negocio actual (nunca UTC crudo, corrección técnica final §5). */
  fechaConversion: string = formatBusinessDateTimeIso(),
): Gasto {
  const ts = fechaConversion;
  return {
    ...borrador,
    referenciaInterna,
    estadoDocumento: 'registrado',
    historial: [
      ...borrador.historial,
      { fecha: ts, usuario, accion: 'Gasto registrado desde borrador', detalle: `${referenciaInterna} — ${borrador.concepto}` },
    ],
    fechaActualizacion: ts,
  };
}

/**
 * Importe reconocido como gasto operativo — única fuente reutilizada por
 * Gastos, el reporte y Rentabilidad Operativa (nunca una fórmula duplicada,
 * §13 del alcance/§21 de la corrección):
 * - borrador → 0 (nunca afecta Rentabilidad: aún no es un hecho económico confirmado);
 * - anulado → 0 para los indicadores normales;
 * - impuesto recuperable → el impuesto NO forma parte del gasto (subtotal);
 * - impuesto no recuperable o sin desglose → el total completo.
 */
export function importeReconocidoComoGasto(
  gasto: Pick<Gasto, 'estadoDocumento' | 'tratamientoImpuesto' | 'subtotal' | 'total'>,
): number {
  if (gasto.estadoDocumento === 'borrador' || gasto.estadoDocumento === 'anulado') return 0;
  if (gasto.tratamientoImpuesto === 'recuperable') return round2(gasto.subtotal);
  return round2(gasto.total);
}

/** Presentación unificada del documento sustentatorio (§3/§8 de la corrección de UX) — nunca un código SUNAT crudo ni un guion suelto. Única fuente reutilizada por la tabla, el Drawer, la impresión y el Excel. */
export function nombreDocumentoSustentatorioGasto(gasto: Pick<Gasto, 'tipoDocumento' | 'serieDocumentoProveedor' | 'numeroDocumentoProveedor'>): string {
  if (!gasto.tipoDocumento) return 'Sin documento';
  const nombre = getNombreTipoDocumentoProveedor(gasto.tipoDocumento);
  const serieNumero = [gasto.serieDocumentoProveedor, gasto.numeroDocumentoProveedor].filter(Boolean).join('-');
  return serieNumero ? `${nombre} · ${serieNumero}` : nombre;
}

/** Estado de pago derivado — SIEMPRE desde la CxP asociada, nunca una segunda fuente persistida. Reutiliza `recalcularEstadoPagoComprobante` (mismo mapeo que `ComprobanteCompra`). */
export function resolverEstadoPagoGasto(cuentaPorPagar: CuentaPorPagar | undefined): EstadoPagoGasto {
  if (!cuentaPorPagar) return 'pendiente';
  return recalcularEstadoPagoComprobante(cuentaPorPagar.estadoPago);
}

/**
 * Un gasto tiene pagos ACTIVOS — nunca `pagosRelacionados.length`, que cuenta
 * también pagos ya anulados (corrección técnica final §10). Única fuente
 * reutilizada por el nivel de edición, el listado, el Drawer y el formulario
 * — reutiliza `tieneCxPPagosActivos` (genérica, ya usada por Compras), nunca
 * una segunda regla de "pagos activos" duplicada por componente.
 */
export function tienePagosActivosGasto(
  cuentaPorPagar: CuentaPorPagar | undefined,
  pagos: readonly PagoCompra[],
): boolean {
  return Boolean(cuentaPorPagar && tieneCxPPagosActivos(cuentaPorPagar, [...pagos]));
}

export type NivelEdicionGasto = 'completa' | 'limitada' | 'bloqueada';

/**
 * Nivel de edición permitido según estado (§12 de la corrección):
 * - borrador → completa (nada se ha comprometido aún);
 * - registrado sin pagos ACTIVOS aplicados → completa (aún nada depende del
 *   monto/forma de pago — incluye el caso en que TODOS los pagos previos ya
 *   fueron anulados, corrección técnica final §10);
 * - registrado con al menos un pago ACTIVO aplicado → limitada (solo
 *   observaciones/adjuntos, nunca total/moneda/proveedor/forma de
 *   pago/cronograma/tratamiento tributario/fecha del gasto — desincronizarían
 *   CxP, Pago o Caja ya comprometidos);
 * - anulado → bloqueada (solo consulta).
 */
export function nivelEdicionGasto(
  gasto: Pick<Gasto, 'estadoDocumento'>,
  cuentaPorPagar: CuentaPorPagar | undefined,
  pagos: readonly PagoCompra[],
): NivelEdicionGasto {
  if (gasto.estadoDocumento === 'anulado') return 'bloqueada';
  if (gasto.estadoDocumento === 'borrador') return 'completa';
  return tienePagosActivosGasto(cuentaPorPagar, pagos) ? 'limitada' : 'completa';
}

/** La acción "Editar" está disponible salvo que el gasto esté anulado — el nivel exacto (completa/limitada) lo decide `nivelEdicionGasto`. */
export function puedeEditarGasto(
  gasto: Pick<Gasto, 'estadoDocumento'>,
  cuentaPorPagar: CuentaPorPagar | undefined,
  pagos: readonly PagoCompra[],
): boolean {
  return nivelEdicionGasto(gasto, cuentaPorPagar, pagos) !== 'bloqueada';
}

/** Un borrador se descarta, nunca se anula (§4/§13 de la corrección: nunca fue registrado oficialmente). */
export function puedeDescartarBorradorGasto(gasto: Pick<Gasto, 'estadoDocumento'>): boolean {
  return gasto.estadoDocumento === 'borrador';
}

/** Motivo técnico fijo con el que `descartarBorradorGasto` marcaba el estado terminal 'anulado' ANTES de `Gasto.tipoCierre` — conservado únicamente como respaldo de compatibilidad en `esBorradorDescartadoGasto` para registros históricos (corrección técnica final §12), nunca usado para escribir un descarte nuevo. */
export const MOTIVO_DESCARTE_BORRADOR_GASTO = 'Borrador descartado';

/**
 * Un borrador descartado reutiliza el estado terminal 'anulado' (§3/§4) pero
 * nunca cuenta como uso histórico real de su categoría (§20) ni como un
 * gasto genuinamente anulado. Se identifica por la señal ESTRUCTURADA
 * `tipoCierre` (corrección técnica final §12) — nunca comparando el TEXTO de
 * `motivoAnulacion` (frágil: un usuario podría escribir ese mismo motivo en
 * una anulación real). Un gasto anulado/descartado ANTES de que existiera
 * `tipoCierre` no lo tiene: cae al criterio de texto histórico como ÚNICO
 * respaldo de compatibilidad, nunca para escrituras nuevas.
 */
export function esBorradorDescartadoGasto(gasto: Pick<Gasto, 'estadoDocumento' | 'motivoAnulacion' | 'tipoCierre'>): boolean {
  if (gasto.estadoDocumento !== 'anulado') return false;
  if (gasto.tipoCierre) return gasto.tipoCierre === 'descarte_borrador';
  return gasto.motivoAnulacion === MOTIVO_DESCARTE_BORRADOR_GASTO;
}

/** Bloqueo de anulación — reutiliza `tieneCxPPagosActivos` (genérica, ya usada por Compras), nunca una segunda regla de "pagos activos". */
export function motivoBloqueoAnulacionGasto(
  gasto: Pick<Gasto, 'estadoDocumento'>,
  cuentaPorPagar: CuentaPorPagar | undefined,
  pagos: readonly PagoCompra[],
): string | null {
  if (gasto.estadoDocumento === 'borrador') return 'Un borrador no se anula: descártalo en su lugar.';
  if (gasto.estadoDocumento === 'anulado') return 'Este gasto ya fue anulado.';
  if (cuentaPorPagar && tieneCxPPagosActivos(cuentaPorPagar, [...pagos])) {
    return 'Este gasto tiene pagos activos. Anula primero los pagos relacionados para poder anular el gasto.';
  }
  return null;
}

export function puedeAnularGasto(
  gasto: Pick<Gasto, 'estadoDocumento'>,
  cuentaPorPagar: CuentaPorPagar | undefined,
  pagos: readonly PagoCompra[],
): boolean {
  return motivoBloqueoAnulacionGasto(gasto, cuentaPorPagar, pagos) === null;
}

/**
 * Datos de prefill para "Duplicar gasto" — nunca un clon silencioso: el
 * usuario revisa y confirma en el formulario de creación antes de que exista
 * un nuevo registro (§2 del alcance: sin plantillas ni generación automática).
 * Omite deliberadamente fechas, observaciones y adjuntos — son propios de
 * cada ocurrencia real, no de la plantilla implícita.
 */
export function datosParaDuplicarGasto(gasto: Gasto): Omit<DatosNuevoGasto, 'fechaReconocimiento'> {
  return {
    empresaId: gasto.empresaId,
    establecimientoId: gasto.establecimientoId,
    categoriaId: gasto.categoriaId,
    concepto: gasto.concepto,
    proveedorId: gasto.proveedorId,
    proveedorNombre: gasto.proveedorNombre,
    proveedorNumeroDocumento: gasto.proveedorNumeroDocumento,
    beneficiario: gasto.beneficiario,
    tipoDocumento: gasto.tipoDocumento,
    moneda: gasto.moneda,
    tipoCambio: gasto.tipoCambio,
    subtotal: gasto.subtotal,
    impuesto: gasto.impuesto,
    total: gasto.total,
    tratamientoImpuesto: gasto.tratamientoImpuesto,
    impuestoId: gasto.impuestoId,
    tasaImpuesto: gasto.tasaImpuesto,
    condicionPago: gasto.condicionPago,
    formaPagoMetodoId: gasto.formaPagoMetodoId,
    // El cronograma de cuotas NUNCA se duplica automáticamente — es propio de
    // cada ocurrencia real del crédito (fechas/vencimientos distintos), el
    // usuario lo reconfigura en el formulario si corresponde (la forma de
    // pago/plantilla base sí se conserva, igual que categoría o moneda).
  };
}
