// gastos/servicios/consultaGastosOperativos.service.ts
//
// Proyección de LECTURA de Gastos operativos — única fuente reutilizada por
// la página de Gastos, su exportación a Excel, el reporte del Reports Hub y
// la sección "Utilidad operativa" de Indicadores → Rentabilidad. Nunca
// recalcula el importe reconocido (reutiliza `importeReconocidoComoGasto`) ni
// duplica agregaciones — mismo criterio arquitectónico que
// `consultaRentabilidadVentas.service.ts`.

import { round2 } from '../../compras/logica/reglasCompras';
import { convertMoney } from '@/shared/currency';
import { getNombreTipoDocumentoProveedor } from '../../compras/constantes/tiposDocumentoProveedor';
import { getBusinessDateParts } from '@/shared/time/businessTime';
import type { CuentaPorPagar } from '../../compras/modelos/CuentaPorPagar';
import type { PagoCompra } from '../../compras/modelos/PagoCompra';
import type { ComprobanteCompra } from '../../compras/modelos/ComprobanteCompra';
import type { Series } from '../../configuracion-sistema/modelos/Series';
import type { Gasto, EstadoDocumentoGasto } from '../modelos/Gasto';
import { importeReconocidoComoGasto, resolverEstadoPagoGasto, presentarReferenciaGasto, presentarEstadoVisualGasto, presentarClaseEstadoVisualGasto, esBorradorDescartadoGasto, ETIQUETA_ALCANCE_TODA_EMPRESA } from './servicioGasto';

export type AgrupacionGasto = 'sin_agrupar' | 'categoria' | 'proveedor' | 'establecimiento' | 'periodo';

export interface FilaGastoOperativo {
  id: string;
  gastoId: string;
  referenciaInterna: string;
  fecha: string;
  concepto: string;
  categoriaId: string;
  categoriaNombre: string;
  proveedorId?: string;
  proveedorONombre: string;
  establecimientoId?: string;
  establecimientoNombre: string;
  monedaOriginal: string;
  subtotal: number;
  impuesto: number;
  total: number;
  tipoCambio?: number;
  condicionPago: 'contado' | 'credito';
  /** En moneda base — `null` cuando falta un TC histórico válido (nunca asumido en 1). */
  importeReconocidoBase: number | null;
  estadoDocumento: EstadoDocumentoGasto;
  /** Un borrador descartado reutiliza internamente el estado terminal 'anulado' (§3 de una corrección previa) — nunca debe leerse ni filtrarse como un gasto genuinamente anulado (corrección puntual §5). */
  esBorradorDescartado: boolean;
  /** Presentación humana de `referenciaInterna` (`presentarReferenciaGasto`) — nunca el identificador técnico de un borrador (activo o descartado). Única fuente para búsqueda, Excel e impresión. */
  referenciaPresentada: string;
  estadoPago: 'pendiente' | 'parcial' | 'pagado';
  /** Estado visual único (§8 de la corrección final) — resuelve `estadoDocumento`/`estadoPago` en UN solo texto para la columna "Estado" de la tabla, sin fusionar las fuentes internas. */
  estadoPresentado: string;
  /** Clase de chip para `estadoPresentado` — mismos badges ya usados por cada dimensión, nunca un color paralelo. */
  estadoClase: string;
  tieneDocumento: boolean;
  proveedorNumeroDocumento: string;
  serieDocumento: string;
  numeroDocumento: string;
  cantidadPagos: number;
  /** Números PG de los pagos aplicados a este gasto — para búsqueda y columnas opcionales (§4/§18 del alcance). */
  numerosPago: string[];
}

export interface GrupoGastoOperativo {
  clave: string;
  etiqueta: string;
  totalGastos: number;
  importeReconocidoBase: number;
  cantidadFilas: number;
}

export interface IndicadoresGastosOperativos {
  gastosOperativosReconocidos: number;
  totalLineas: number;
  lineasSinTipoCambio: number;
}

export interface ParametrosProyeccionGastos {
  gastos: readonly Gasto[];
  cuentasPorPagar: readonly CuentaPorPagar[];
  /** Pagos (origen 'gasto') ya filtrados por el llamador — solo para exponer números PG por fila, nunca para recalcular montos. */
  pagos?: readonly PagoCompra[];
  categorias: ReadonlyMap<string, string>;
  establecimientos: ReadonlyMap<string, string>;
  /** Catálogo central de Series (`config.series`, tal cual) — para resolver "G001 · Sin correlativo" en un borrador vía `presentarReferenciaGasto` (corrección técnica final §11), nunca una serie inventada. */
  series?: readonly Pick<Series, 'id' | 'series'>[];
  monedaBase: string;
  /** Cadena vacía en `desde`/`hasta` = sin límite en ese extremo ("Todas las fechas" — el listado operativo de Gastos abre así por defecto, §5 de la corrección). */
  periodo: { desde: string; hasta: string };
  establecimientoId?: string;
}

/** Convierte el importe reconocido a moneda base con el TC HISTÓRICO del propio gasto — nunca el vigente, nunca asumido en 1 (mismo criterio que Rentabilidad de Ventas). Exportada para que `proyectarLineasGastoDesdeComprobantesCompra` (GAS-P2-001) reutilice la MISMA conversión, nunca una segunda fórmula. */
export function convertirAMonedaBase(importe: number, monedaOriginal: string, monedaBase: string, tipoCambio: number | undefined): number | null {
  if (monedaOriginal === monedaBase) return round2(importe);
  if (!tipoCambio || tipoCambio <= 0) return null;
  return round2(convertMoney(importe, monedaOriginal, monedaBase, tipoCambio));
}

/** Proyecta una fila por gasto dentro del periodo/establecimiento indicados. Filtra por `fechaReconocimiento` — nunca por fecha de pago. */
export function proyectarFilasGastosOperativos(params: ParametrosProyeccionGastos): FilaGastoOperativo[] {
  const { gastos, cuentasPorPagar, pagos = [], categorias, establecimientos, series = [], monedaBase, periodo, establecimientoId } = params;
  const cxpPorId = new Map(cuentasPorPagar.map((c) => [c.id, c] as const));
  const pagosPorId = new Map(pagos.map((p) => [p.id, p] as const));

  return gastos
    .filter((g) => {
      const fecha = g.fechaReconocimiento.slice(0, 10);
      if (periodo.desde && fecha < periodo.desde) return false;
      if (periodo.hasta && fecha > periodo.hasta) return false;
      if (establecimientoId && establecimientoId !== 'Todos' && g.establecimientoId !== establecimientoId) return false;
      return true;
    })
    .map((g) => {
      const importeReconocido = importeReconocidoComoGasto(g);
      // Borrador/anulado nunca afectan Rentabilidad (§21 de la corrección) — 0
      // explícito, nunca `null` (que los marcaría como "sin TC" en los indicadores).
      const importeReconocidoBase = g.estadoDocumento === 'anulado' || g.estadoDocumento === 'borrador'
        ? 0
        : convertirAMonedaBase(importeReconocido, g.moneda, monedaBase, g.tipoCambio);
      const cxp = g.cuentaPorPagarId ? cxpPorId.get(g.cuentaPorPagarId) : undefined;
      const estadoPago = resolverEstadoPagoGasto(cxp);

      return {
        id: g.id,
        gastoId: g.id,
        referenciaInterna: g.referenciaInterna,
        fecha: g.fechaReconocimiento,
        concepto: g.concepto,
        categoriaId: g.categoriaId,
        categoriaNombre: categorias.get(g.categoriaId) ?? 'Sin categoría',
        proveedorId: g.proveedorId,
        proveedorONombre: g.proveedorNombre ?? g.beneficiario ?? 'Sin proveedor',
        establecimientoId: g.establecimientoId,
        establecimientoNombre: g.establecimientoId ? establecimientos.get(g.establecimientoId) ?? g.establecimientoId : ETIQUETA_ALCANCE_TODA_EMPRESA,
        monedaOriginal: g.moneda,
        subtotal: g.subtotal,
        impuesto: g.impuesto,
        total: g.total,
        tipoCambio: g.tipoCambio,
        condicionPago: g.condicionPago,
        importeReconocidoBase,
        estadoDocumento: g.estadoDocumento,
        esBorradorDescartado: esBorradorDescartadoGasto(g),
        referenciaPresentada: presentarReferenciaGasto(g, series),
        estadoPago,
        estadoPresentado: presentarEstadoVisualGasto(g, estadoPago),
        estadoClase: presentarClaseEstadoVisualGasto(g, estadoPago),
        tieneDocumento: Boolean(g.tipoDocumento),
        proveedorNumeroDocumento: g.proveedorNumeroDocumento ?? '',
        serieDocumento: g.serieDocumentoProveedor ?? '',
        numeroDocumento: g.numeroDocumentoProveedor ?? '',
        cantidadPagos: g.pagosRelacionados.length,
        numerosPago: g.pagosRelacionados
          .map((pagoId) => pagosPorId.get(pagoId)?.numeroPago)
          .filter((numero): numero is string => Boolean(numero)),
      };
    });
}

export interface FiltrosAvanzadosGasto {
  busqueda?: string;
  categoriaId?: string;
  proveedorId?: string;
  condicionPago?: 'contado' | 'credito';
  moneda?: string;
  estadoDocumento?: EstadoDocumentoGasto;
  estadoPago?: 'pendiente' | 'parcial' | 'pagado';
  conDocumento?: boolean;
}

/**
 * Filtra filas ya proyectadas — nunca vuelve a leer repositorios ni a
 * recalcular importes. NUNCA excluye anulados implícitamente: sin
 * `estadoDocumento` en `filtros` devuelve TODOS los estados documentales
 * (el listado operativo de Gastos debe mostrar anulados por defecto). Un
 * llamador que sí deba excluirlos (p. ej. Rentabilidad Operativa) debe
 * pasar `estadoDocumento: 'registrado'` explícitamente. ÚNICA excepción,
 * incondicional y sin filtro que la desactive: un borrador descartado
 * (§9 de la corrección final) — nunca fue un documento registrado, así
 * que queda fuera del listado operativo pase lo que pase.
 */
export function filtrarFilasGastosOperativos(filas: readonly FilaGastoOperativo[], filtros: FiltrosAvanzadosGasto): FilaGastoOperativo[] {
  const busquedaNormalizada = filtros.busqueda?.trim().toLowerCase();
  return filas.filter((fila) => {
    // Un borrador descartado nunca fue un documento registrado — queda oculto
    // del listado operativo SIEMPRE, sin importar el filtro aplicado (§9 de
    // la corrección final consolidada, más estricto que la corrección
    // puntual previa que solo lo excluía del filtro "Anulado").
    if (fila.esBorradorDescartado) return false;
    if (busquedaNormalizada) {
      // Concepto, proveedor/beneficiario, RUC/documento, serie y número del
      // documento sustentatorio, referencia interna del gasto y número(s) de
      // pago PG relacionados — todos en un único buscador (§4 del alcance).
      // Un borrador (activo o descartado) nunca se busca por su
      // identificador técnico (nunca mostrado, corrección puntual §5) —
      // se busca por su presentación humana, igual que se ve en pantalla.
      const haystack = [
        fila.concepto,
        fila.proveedorONombre,
        fila.proveedorNumeroDocumento,
        fila.serieDocumento,
        fila.numeroDocumento,
        fila.referenciaPresentada,
        ...fila.numerosPago,
      ].join(' ').toLowerCase();
      if (!haystack.includes(busquedaNormalizada)) return false;
    }
    if (filtros.categoriaId && fila.categoriaId !== filtros.categoriaId) return false;
    if (filtros.proveedorId && fila.proveedorId !== filtros.proveedorId) return false;
    if (filtros.condicionPago && fila.condicionPago !== filtros.condicionPago) return false;
    if (filtros.moneda && fila.monedaOriginal !== filtros.moneda) return false;
    if (filtros.estadoDocumento && fila.estadoDocumento !== filtros.estadoDocumento) return false;
    if (filtros.estadoPago && fila.estadoPago !== filtros.estadoPago) return false;
    if (filtros.conDocumento !== undefined && fila.tieneDocumento !== filtros.conDocumento) return false;
    return true;
  });
}

/** Indicadores agregados — SIEMPRE sobre el conjunto ya filtrado. Excluye filas sin TC válido del total reconocido (mismo criterio que Rentabilidad de Ventas con ventas sin TC). */
export function calcularIndicadoresGastosOperativos(filas: readonly FilaGastoOperativo[]): IndicadoresGastosOperativos {
  let gastosOperativosReconocidos = 0;
  let lineasSinTipoCambio = 0;
  for (const fila of filas) {
    if (fila.importeReconocidoBase === null) {
      lineasSinTipoCambio += 1;
      continue;
    }
    gastosOperativosReconocidos += fila.importeReconocidoBase;
  }
  return {
    gastosOperativosReconocidos: round2(gastosOperativosReconocidos),
    totalLineas: filas.length,
    lineasSinTipoCambio,
  };
}

// ---------------------------------------------------------------------------
// GAS-P2-001 — Proyección consolidada del "gasto operativo" de la empresa.
//
// La auditoría del módulo de Gastos detectó que un gasto operativo con
// comprobante formal del proveedor puede registrarse por DOS caminos
// igualmente válidos: (a) como `Gasto` en este módulo, o (b) como
// `ComprobanteCompra` en Compras con una línea `clasificacion === 'gasto'`
// (`compras/modelos/LineaCompra.ts`, usada hoy únicamente para decidir que la
// línea nunca es inventariable — `calcularEsInventariable`,
// `compras/logica/reglasCompras.ts`). Ambos caminos generan correctamente su
// propia Cuenta por Pagar/Pago (nunca se duplica ni se genera una segunda
// obligación aquí — esto sigue siendo una proyección de LECTURA), pero solo
// el camino (a) alimentaba los indicadores de "gasto operativo"/Rentabilidad
// Operativa. Las funciones de abajo consolidan AMBOS orígenes en los MISMOS
// indicadores (`IndicadoresGastosOperativos`) sin fusionar sus filas ni crear
// un tercer modelo de persistencia — cada fila conserva su `origen` explícito.
// ---------------------------------------------------------------------------

/** Una fila de Compras que participa en el gasto operativo consolidado — nunca un `Gasto`, nunca genera CxP/Pago aquí (esos ya existen, generados por Compras). */
export interface FilaGastoDesdeCompra {
  id: string;
  origen: 'compra';
  comprobanteCompraId: string;
  lineaId: string;
  fecha: string;
  concepto: string;
  proveedorNombre: string;
  monedaOriginal: string;
  tipoCambio?: number;
  subtotal: number;
  impuesto: number;
  total: number;
  /** En moneda base — `null` cuando falta un TC histórico válido (mismo criterio que `FilaGastoOperativo.importeReconocidoBase`, nunca asumido en 1). */
  importeReconocidoBase: number | null;
}

/**
 * Importe reconocido de UNA línea de Compra clasificada como gasto — mismo
 * criterio que `importeReconocidoComoGasto` (Gasto.ts): si el IGV de la línea
 * es recuperable, el impuesto NO forma parte del gasto (solo el subtotal);
 * en cualquier otro caso (no recuperable, o `esImpuestoRecuperable` ausente/
 * `null` — nunca ocurre en una línea ya registrada, `validarLineasCompra`
 * bloquea ese estado antes de guardar) el total completo se reconoce como
 * gasto. Nunca una segunda fórmula de "qué parte del impuesto es gasto".
 */
function importeReconocidoLineaCompraGasto(linea: Pick<import('../../compras/modelos/LineaCompra').LineaCompra, 'subtotal' | 'total' | 'esImpuestoRecuperable'>): number {
  return linea.esImpuestoRecuperable === true ? round2(linea.subtotal) : round2(linea.total);
}

/**
 * Proyecta, como filas de gasto operativo, las líneas `clasificacion ===
 * 'gasto'` de los Comprobantes de Compra REGISTRADOS (nunca borrador ni
 * anulado — mismo criterio que el filtro `estadoDocumento: 'registrado'` que
 * ya aplica Rentabilidad Operativa al proyectar `Gasto`). Filtra por periodo
 * con `fechaRegistro` (mismo campo que usa Compras para sus propios reportes,
 * nunca la fecha del documento del proveedor, que puede ser anterior).
 *
 * `ComprobanteCompra` no tiene un campo de establecimiento propio (a
 * diferencia de `Gasto.establecimientoId`) — nunca se le inventa una
 * atribución: cuando el llamador filtra por un establecimiento ESPECÍFICO
 * (`establecimientoId` presente y distinto de `undefined`/`'Todos'`), esta
 * función retorna un arreglo vacío en vez de adivinar a qué establecimiento
 * pertenece cada línea (evita sobre-contar un gasto de la empresa completa
 * dentro del reporte de un solo establecimiento). Solo participa en la vista
 * consolidada de "Toda la empresa".
 */
export function proyectarLineasGastoDesdeComprobantesCompra(params: {
  comprobantes: readonly ComprobanteCompra[];
  monedaBase: string;
  periodo: { desde: string; hasta: string };
  establecimientoId?: string;
}): FilaGastoDesdeCompra[] {
  const { comprobantes, monedaBase, periodo, establecimientoId } = params;
  if (establecimientoId && establecimientoId !== 'Todos') return [];

  const filas: FilaGastoDesdeCompra[] = [];
  for (const cc of comprobantes) {
    if (cc.estadoDocumento !== 'registrado') continue;
    const fecha = cc.fechaRegistro.slice(0, 10);
    if (periodo.desde && fecha < periodo.desde) continue;
    if (periodo.hasta && fecha > periodo.hasta) continue;

    for (const linea of cc.lineas) {
      if (linea.clasificacion !== 'gasto') continue;
      const importeReconocido = importeReconocidoLineaCompraGasto(linea);
      filas.push({
        id: `${cc.id}-${linea.id}`,
        origen: 'compra',
        comprobanteCompraId: cc.id,
        lineaId: linea.id,
        fecha: cc.fechaRegistro,
        concepto: linea.nombreProducto,
        proveedorNombre: cc.proveedorNombre,
        monedaOriginal: cc.moneda,
        tipoCambio: cc.tipoCambio,
        subtotal: round2(linea.subtotal),
        impuesto: round2(linea.igv),
        total: round2(linea.total),
        importeReconocidoBase: convertirAMonedaBase(importeReconocido, cc.moneda, monedaBase, cc.tipoCambio),
      });
    }
  }
  return filas;
}

/**
 * Indicadores consolidados de gasto operativo — MISMA forma
 * (`IndicadoresGastosOperativos`) que ya consume `calcularResultadoOperativo`
 * (`indicadores-negocio/services/consultaRentabilidadVentas.service.ts`), por
 * lo que ese consumidor no necesita ningún cambio: solo se le pasa un total
 * que ahora también considera las líneas de Compra clasificadas como gasto,
 * sumadas UNA sola vez cada una (nunca su CxP, nunca su Pago, nunca una
 * segunda vez si el mismo comprobante tiene varias líneas de gasto — cada
 * línea aporta solo su propio importe).
 */
export function calcularIndicadoresGastoOperativoConsolidado(
  filasGasto: readonly FilaGastoOperativo[],
  filasCompras: readonly FilaGastoDesdeCompra[],
): IndicadoresGastosOperativos {
  const indicadoresGasto = calcularIndicadoresGastosOperativos(filasGasto);
  let gastosOperativosReconocidos = indicadoresGasto.gastosOperativosReconocidos;
  let lineasSinTipoCambio = indicadoresGasto.lineasSinTipoCambio;
  for (const fila of filasCompras) {
    if (fila.importeReconocidoBase === null) {
      lineasSinTipoCambio += 1;
      continue;
    }
    gastosOperativosReconocidos += fila.importeReconocidoBase;
  }
  return {
    gastosOperativosReconocidos: round2(gastosOperativosReconocidos),
    totalLineas: indicadoresGasto.totalLineas + filasCompras.length,
    lineasSinTipoCambio,
  };
}

function determinarClavePeriodoGasto(fechaIso: string): { clave: string; etiqueta: string } {
  const fecha = fechaIso.slice(0, 10);
  const mes = fecha.slice(0, 7);
  return { clave: mes, etiqueta: mes };
}

/** Agrupa filas ya filtradas — cambia la granularidad real, nunca solo un filtro visual (mismo principio que Rentabilidad de Ventas). */
export function agruparFilasGastosOperativos(filas: readonly FilaGastoOperativo[], modo: AgrupacionGasto): GrupoGastoOperativo[] {
  if (modo === 'sin_agrupar') {
    return filas.map((fila) => ({
      clave: fila.id,
      etiqueta: fila.concepto,
      totalGastos: fila.total,
      importeReconocidoBase: fila.importeReconocidoBase ?? 0,
      cantidadFilas: 1,
    }));
  }

  const grupos = new Map<string, GrupoGastoOperativo>();
  for (const fila of filas) {
    let clave: string;
    let etiqueta: string;
    switch (modo) {
      case 'categoria':
        clave = fila.categoriaId;
        etiqueta = fila.categoriaNombre;
        break;
      case 'proveedor':
        clave = fila.proveedorONombre;
        etiqueta = fila.proveedorONombre;
        break;
      case 'establecimiento':
        clave = fila.establecimientoId ?? '__general__';
        etiqueta = fila.establecimientoNombre;
        break;
      case 'periodo': {
        const bucket = determinarClavePeriodoGasto(fila.fecha);
        clave = bucket.clave;
        etiqueta = bucket.etiqueta;
        break;
      }
      default:
        clave = fila.id;
        etiqueta = fila.concepto;
    }

    const existente = grupos.get(clave);
    const importe = fila.importeReconocidoBase ?? 0;
    if (!existente) {
      grupos.set(clave, { clave, etiqueta, totalGastos: fila.total, importeReconocidoBase: importe, cantidadFilas: 1 });
    } else {
      existente.totalGastos = round2(existente.totalGastos + fila.total);
      existente.importeReconocidoBase = round2(existente.importeReconocidoBase + importe);
      existente.cantidadFilas += 1;
    }
  }
  return [...grupos.values()];
}

/**
 * Encabezados y claves EXACTOS del Excel de Gastos operativos — única fuente
 * consumida por `PaginaGastos.tsx` (§15 de la corrección: nunca duplicados
 * ni redefinidos ad-hoc en el componente, para que un cambio de columna no
 * pueda desalinearse entre el `header` y la clave que arma cada fila).
 */
export const CLAVES_EXCEL_GASTOS_OPERATIVOS = [
  'referenciaInterna', 'concepto', 'categoria', 'proveedor', 'ruc', 'fecha', 'fechaEmision',
  'tipoDocumento', 'serie', 'numero', 'subtotal', 'impuesto', 'tratamientoImpuesto', 'total',
  'moneda', 'tipoCambio', 'reconocido', 'monedaBase', 'condicionPago', 'formaPago', 'numeroCuotas', 'vencimiento',
  'saldoPendiente', 'estado', 'numerosPago', 'totalPagado', 'establecimiento',
  'usuario', 'fechaRegistro', 'cantidadAdjuntos',
] as const;

export type ClaveExcelGastoOperativo = typeof CLAVES_EXCEL_GASTOS_OPERATIVOS[number];

export type FilaExcelGastoOperativo = Record<ClaveExcelGastoOperativo, string | number | Date | null>;

/** Etiqueta neutral cuando no hay un usuario resoluble (corrección final puntual §3.3) — nunca un ID técnico. */
const ETIQUETA_USUARIO_NO_RESOLUBLE = 'Usuario del sistema';

/**
 * Fecha/hora de REGISTRO real (`fechaCreacion`) → `Date` "ancla" que ExcelJS
 * serializa preservando la hora de NEGOCIO América/Lima (corrección final
 * puntual §3.4) — nunca UTC crudo. Extrae los componentes en la zona de
 * negocio vía `getBusinessDateParts` (Intl.DateTimeFormat de
 * `@/shared/time/businessTime`, nunca un offset "-5 horas" hardcodeado) y
 * los reconstruye como componentes UTC: Excel/ExcelJS calcula el número de
 * serie de fecha a partir de los getters UTC de un `Date`, así que "fingir"
 * que la hora de Lima ES la hora UTC es la única forma de que el archivo
 * exportado muestre la hora real sin importar la zona horaria del equipo
 * donde se genera — nunca depende de ella.
 */
function fechaHoraRegistroAExcel(iso: string): Date {
  const { year, month, day, hour, minute, second } = getBusinessDateParts(new Date(iso));
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

/**
 * Fecha ECONÓMICA (fecha del gasto / del documento / de vencimiento) →
 * `Date` "ancla" para Excel a partir de solo año-mes-día — NUNCA se
 * interpreta como un instante ni se convierte de huso horario (corrección
 * final puntual §3.4): es un día de calendario elegido por el usuario, no
 * la hora en que se guardó el registro.
 */
function fechaCalendarioAExcel(fechaISO: string): Date {
  const [year, month, day] = fechaISO.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Construye UNA fila del Excel a partir de la proyección ya calculada — la
 * MISMA fuente que la tabla en pantalla, nunca un recálculo independiente.
 * Tipo de documento SIEMPRE traducido (nunca el código SUNAT crudo, §15-B);
 * Serie/Número SOLO cuando existe documento (corrección final puntual §3.1
 * — nunca un residuo de un documento previamente cargado y luego quitado);
 * números PG vacíos cuando no hay pagos (§15-A); moneda original y moneda
 * base como columnas separadas y explícitas (§15-E); fechas reales de Excel
 * en hora de negocio, nunca texto ni UTC crudo (§15-F/§3.4); Usuario
 * siempre una etiqueta humana (§3.3); Estado ÚNICO — misma función que la
 * tabla en pantalla, nunca recalculado aquí (§3.5).
 */
export function construirFilaExcelGastoOperativo(
  fila: FilaGastoOperativo,
  gasto: Gasto | undefined,
  cxp: CuentaPorPagar | undefined,
  monedaBase: string,
  /** Nombre → id de `config.paymentMethods` (§8/§22 de la corrección) — la forma de pago configurada, nunca solo la condición Contado/Crédito derivada. */
  formasPagoPorId?: ReadonlyMap<string, string>,
): FilaExcelGastoOperativo {
  const tieneDocumento = Boolean(gasto?.tipoDocumento);
  return {
    referenciaInterna: fila.referenciaPresentada,
    concepto: fila.concepto,
    categoria: fila.categoriaNombre,
    proveedor: fila.proveedorONombre,
    ruc: fila.proveedorNumeroDocumento,
    fecha: fechaCalendarioAExcel(fila.fecha),
    fechaEmision: tieneDocumento && gasto?.fechaEmision ? fechaCalendarioAExcel(gasto.fechaEmision) : null,
    tipoDocumento: tieneDocumento ? getNombreTipoDocumentoProveedor(gasto!.tipoDocumento!) : 'Sin documento',
    serie: tieneDocumento ? fila.serieDocumento : '',
    numero: tieneDocumento ? fila.numeroDocumento : '',
    subtotal: fila.subtotal,
    impuesto: fila.impuesto,
    tratamientoImpuesto: gasto ? gasto.tratamientoImpuesto : '',
    total: fila.total,
    moneda: fila.monedaOriginal,
    tipoCambio: fila.tipoCambio ?? null,
    reconocido: fila.importeReconocidoBase,
    monedaBase,
    condicionPago: fila.condicionPago === 'credito' ? 'Crédito' : 'Contado',
    formaPago: (gasto?.formaPagoMetodoId && formasPagoPorId?.get(gasto.formaPagoMetodoId)) || '',
    numeroCuotas: gasto?.creditTerms?.schedule.length ?? (fila.condicionPago === 'credito' ? 1 : null),
    vencimiento: gasto?.fechaVencimiento ? fechaCalendarioAExcel(gasto.fechaVencimiento) : null,
    saldoPendiente: cxp?.saldoPendiente ?? 0,
    estado: fila.estadoPresentado,
    numerosPago: fila.numerosPago.join(', '),
    totalPagado: cxp ? round2(cxp.totalPagado) : 0,
    establecimiento: fila.establecimientoNombre,
    usuario: gasto?.creadoPor?.trim() || ETIQUETA_USUARIO_NO_RESOLUBLE,
    fechaRegistro: gasto ? fechaHoraRegistroAExcel(gasto.fechaCreacion) : null,
    cantidadAdjuntos: gasto?.adjuntos.length ?? 0,
  };
}
