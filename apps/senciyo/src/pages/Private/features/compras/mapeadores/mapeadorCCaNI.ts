import type { ComprobanteCompra } from '../modelos/ComprobanteCompra';
import type { LineaCompra } from '../modelos/LineaCompra';
import type { TratamientoImpuestoCompra } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { calcularEsInventariable, resolverSnapshotInventarioLinea, resolverEsImpuestoRecuperableLinea } from '../logica/reglasCompras';
import { redondearAPrecision, PRECISION_COSTO_UNITARIO_INTERNO } from '../../gestion-inventario/utils/precisionInventario';

export interface LineaNIDesdeCC {
  lineaCompraId: string;
  productoId?: string;
  codigoProducto?: string;
  nombreProducto: string;
  /** Presentación comercial original del CC — conservada, nunca sustituida por la unidad mínima. */
  unidadComercialOriginal: string;
  unidadMedidaCodigo: string;
  /**
   * Cantidad comercial documentada que originó el snapshot (`LineaCompra.cantidadSolicitada`) —
   * NUNCA `cantidadRecibida`, que es un contador de recepción física independiente y ambiguo
   * para este propósito (ver `resolverSnapshotInventarioLinea`, reglasCompras.ts).
   */
  cantidadComercialOriginal: number;
  /** Snapshot histórico usado — nunca reconsultado desde el catálogo vigente. */
  factorConversionAplicado: number;
  /**
   * Cantidad en unidad mínima — se lee DIRECTAMENTE de `LineaCompra.cantidadDocumentadaInventariable`
   * (el snapshot canónico ya resuelto y validado al confirmar la línea), nunca se vuelve a
   * multiplicar por el factor ni se reconsulta el catálogo.
   */
  cantidad: number;
  /** Costo por unidad mínima, en moneda base — YA neto/incluye impuesto recuperable según `tratamientoImpuestoCompra` y ya convertido con el TC histórico. Nunca el costo comercial bruto (`LineaCompra.costoUnitario`) copiado sin dividir por el factor (Etapa 3, corrección del bug confirmado en auditoría). */
  costoUnitario: number;
  /** Costo comercial por presentación, en moneda ORIGINAL, ya neto de descuento y de impuesto recuperable — `costoUnitarioBaseOriginal * factorConversionAplicado`, para que la capa resultante mantenga el invariante `costoUnitarioBaseOriginal = costoUnitarioComercialOriginal / factorConversionAplicado` exactamente. */
  costoUnitarioComercialOriginal: number;
  /** Recuperabilidad tributaria ya resuelta para esta línea — snapshot, nunca vuelto a derivar al confirmar. */
  esImpuestoRecuperable: boolean | null;
  /** Descuento por unidad ya aplicado en la línea de origen — informativo. */
  descuentoAplicado: number;
  monedaOriginal: string;
  tipoCambioAplicado: number;
  fechaTipoCambio?: string;
  almacenDestinoId?: string;
  almacenDestinoNombre?: string;
  observacion?: string;
}

/** Línea que no pudo mapearse de forma segura — nunca se inventa un factor, una cantidad ni un costo. */
export interface LineaPendienteDeValidacion {
  lineaCompraId: string;
  nombreProducto: string;
  motivo: string;
}

export interface DatosNIDesdeCC {
  comprobanteCompraOrigenId: string;
  proveedorId: string;
  tipoIngreso: '02';
  motivo: 'COMPRA';
  fechaIngreso: string;
  observaciones?: string;
  lineas: LineaNIDesdeCC[];
  /** Líneas inventariables/afectan-inventario con recepción, pero sin snapshot canónico o costo resoluble — requieren revisión antes de poder generar NI (nunca se asume un valor). */
  lineasPendientesDeValidacion: LineaPendienteDeValidacion[];
}

/** Contexto tributario/monetario de la empresa, necesario para resolver el costo valorizable — nunca se relee dentro de esta función pura; el llamador lo obtiene de la fuente real (preferenciasInventario, currencyManager). */
export interface ContextoCostoValorizableCC {
  tratamientoImpuestoCompra: TratamientoImpuestoCompra;
  /** Código real de la moneda base de la empresa — nunca `'PEN'` hardcodeado ni un fallback silencioso. */
  monedaBase: string;
}

export interface ResultadoCostoValorizableLinea {
  costoUnitarioBaseOriginal: number;
  costoUnitarioBaseMonedaBase: number;
  costoUnitarioComercialOriginal: number;
  esImpuestoRecuperable: boolean | null;
  monedaOriginal: string;
  tipoCambioAplicado: number;
}

/**
 * Calcula el costo valorizable de UNA línea de compra ya resuelta en unidad mínima (Etapa 3, §8) —
 * función pura y central, única fuente de esta regla (nunca duplicada en el formulario ni en
 * `notaIngreso.service.ts`). Pasos exactos:
 *  1. Importe neto real de la línea después de descuentos: `LineaCompra.subtotal` (base imponible,
 *     sin impuesto) o `LineaCompra.total` (con impuesto), según corresponda excluir o no.
 *  2. Recuperabilidad: se usa EXCLUSIVAMENTE el snapshot ya congelado en la línea
 *     (`LineaCompra.esImpuestoRecuperable`, resuelto por `resolverEsImpuestoRecuperableLinea` en el
 *     momento de construir/editar la línea) — VAL-P2-004/VAL-P1-007: nunca se vuelve a derivar de
 *     `contexto.tratamientoImpuestoCompra` aquí, para que un cambio posterior de la configuración
 *     general (o, en modo manual, el tiempo transcurrido entre registrar el CC y confirmar la NI)
 *     nunca altere el costo de una línea ya registrada. Una línea histórica sin snapshot (creada
 *     antes de este campo) se resuelve una única vez con la configuración vigente, igual criterio
 *     que el ya usado para `factorConversionAplicado`/`cantidadDocumentadaInventariable`.
 *  3. Si es recuperable, se excluye el impuesto (`subtotal`); si no lo es o no está determinado
 *     (`segun_afectacion` sin elección de línea), se conserva en el costo (`total`) — nunca se
 *     asume recuperabilidad quitando impuesto sin una determinación explícita.
 *  4-5. El costo total valorizable se divide entre la cantidad real en unidad mínima.
 *  6. Se convierte a moneda base con el tipo de cambio HISTÓRICO del documento — nunca la
 *     cotización vigente.
 *
 * Lanza (nunca asume) si: `tratamientoImpuestoCompra==='pendiente_configuracion'`, la cantidad o el
 * factor no son finitos/mayores a cero, el costo total valorizable no es mayor a cero, la moneda
 * base no está configurada, o las monedas difieren sin un tipo de cambio histórico válido.
 */
export function calcularCostoValorizableLineaCompra(
  linea: Pick<LineaCompra, 'subtotal' | 'total' | 'tipoAfectacion' | 'descuentoUnitario' | 'esImpuestoRecuperable'>,
  cantidadEnUnidadMinima: number,
  factorConversionAplicado: number,
  cc: Pick<ComprobanteCompra, 'moneda' | 'tipoCambio' | 'fechaRegistro'>,
  contexto: ContextoCostoValorizableCC
): ResultadoCostoValorizableLinea {
  if (contexto.tratamientoImpuestoCompra === 'pendiente_configuracion') {
    throw new Error('No se puede calcular el costo valorizable: el tratamiento de impuestos de compra está pendiente de configuración.');
  }
  if (!Number.isFinite(cantidadEnUnidadMinima) || cantidadEnUnidadMinima <= 0) {
    throw new Error(`No se puede calcular el costo valorizable: la cantidad en unidad mínima (${cantidadEnUnidadMinima}) debe ser finita y mayor a cero.`);
  }
  if (!Number.isFinite(factorConversionAplicado) || factorConversionAplicado <= 0) {
    throw new Error(`No se puede calcular el costo valorizable: el factor de conversión (${factorConversionAplicado}) debe ser finito y mayor a cero.`);
  }
  if (!contexto.monedaBase || !contexto.monedaBase.trim()) {
    throw new Error('No se puede calcular el costo valorizable: no hay una moneda base configurada para la empresa.');
  }

  // Snapshot ya congelado en la línea; solo se resuelve en vivo como fallback de compatibilidad
  // para líneas históricas creadas antes de que este campo existiera (`undefined`, nunca `null`
  // explícito — `null` significa "ya se resolvió y quedó indeterminado", una decisión ya tomada
  // que tampoco se debe recalcular).
  const esImpuestoRecuperable = linea.esImpuestoRecuperable !== undefined
    ? linea.esImpuestoRecuperable
    : resolverEsImpuestoRecuperableLinea(linea.tipoAfectacion, contexto.tratamientoImpuestoCompra);
  // Recuperable → se excluye del costo (subtotal, sin impuesto). No recuperable O indeterminado
  // (segun_afectacion sin señal adicional) → se conserva en el costo (total, con impuesto) —
  // nunca se asume recuperabilidad para excluir impuesto sin una determinación explícita.
  const costoTotalValorizableOriginal = esImpuestoRecuperable === true ? linea.subtotal : linea.total;
  if (!Number.isFinite(costoTotalValorizableOriginal) || costoTotalValorizableOriginal <= 0) {
    throw new Error(`No se puede calcular el costo valorizable: el importe neto de la línea (${costoTotalValorizableOriginal}) debe ser finito y mayor a cero.`);
  }

  const monedaOriginal = cc.moneda;
  let tipoCambioAplicado: number;
  if (monedaOriginal === contexto.monedaBase) {
    tipoCambioAplicado = 1;
  } else {
    if (!Number.isFinite(cc.tipoCambio) || (cc.tipoCambio as number) <= 0) {
      throw new Error(
        `No se puede calcular el costo valorizable: el Comprobante está en "${monedaOriginal}" (moneda base: "${contexto.monedaBase}") y no tiene un tipo de cambio histórico válido.`
      );
    }
    tipoCambioAplicado = cc.tipoCambio as number;
  }

  const costoUnitarioBaseOriginal = redondearAPrecision(costoTotalValorizableOriginal / cantidadEnUnidadMinima, PRECISION_COSTO_UNITARIO_INTERNO);
  const costoUnitarioBaseMonedaBase = redondearAPrecision(costoUnitarioBaseOriginal * tipoCambioAplicado, PRECISION_COSTO_UNITARIO_INTERNO);
  // Back-derivado (nunca el costoUnitario bruto de la línea) para que la capa resultante conserve
  // el invariante documentado `costoUnitarioBaseOriginal = costoUnitarioComercialOriginal / factorConversionAplicado`
  // incluso cuando hubo descuento o exclusión de impuesto recuperable.
  const costoUnitarioComercialOriginal = redondearAPrecision(costoUnitarioBaseOriginal * factorConversionAplicado, PRECISION_COSTO_UNITARIO_INTERNO);

  return {
    costoUnitarioBaseOriginal,
    costoUnitarioBaseMonedaBase,
    costoUnitarioComercialOriginal,
    esImpuestoRecuperable,
    monedaOriginal,
    tipoCambioAplicado,
  };
}

/**
 * Prepara los datos de una Nota de Ingreso a partir de un Comprobante de Compra — función pura,
 * sin efectos secundarios, sin persistencia, sin llamadas a servicios de Inventario. Reglas:
 *  1. Solo incluye líneas con esInventariable=true.
 *  2. Solo incluye líneas con afectaInventario=true.
 *  3. La elegibilidad NUNCA depende de `cantidadRecibida`: la Nota de Ingreso es precisamente el
 *     documento que va a CONFIRMAR la recepción, así que exigir una recepción ya realizada antes
 *     de poder prepararla es circular. La única condición cuantitativa es que la cantidad
 *     documental (`cantidadDocumentadaInventariable`, punto 4) sea resoluble y mayor a 0.
 *  4. La cantidad canónica es SIEMPRE `LineaCompra.cantidadDocumentadaInventariable` — el
 *     snapshot ya resuelto y validado por `resolverSnapshotInventarioLinea` al confirmar la
 *     línea (§4 del saneamiento). Nunca se deriva de `cantidadRecibida` ni se multiplica de
 *     nuevo por el factor: eso duplicaría un cálculo que ya ocurrió una sola vez.
 *  5. La cantidad/unidad comercial original que se reporta es la misma que originó el snapshot
 *     (`cantidadSolicitada`/`unidadMedida`), no un contador físico ambiguo distinto.
 *  6. Una línea histórica sin snapshot (`cantidadDocumentadaInventariable`/`factorConversionAplicado`
 *     ausentes) intenta resolverse una única vez, sin reconsultar el catálogo vigente, mediante
 *     `resolverSnapshotInventarioLinea`; si no puede resolverse de forma demostrable, queda en
 *     `lineasPendientesDeValidacion` — nunca se asume un factor.
 *  7. Una cantidad documental resuelta ≤ 0 tampoco produce una línea válida — queda pendiente de
 *     validación (nunca se genera una línea de NI con cantidad nula o negativa).
 *  8. El costo valorizable (Etapa 3, §8) se calcula con `calcularCostoValorizableLineaCompra` — una
 *     línea cuyo costo no puede resolverse (política tributaria pendiente, moneda/TC faltante,
 *     costo/factor inválido) también queda en `lineasPendientesDeValidacion`, nunca con un costo
 *     inventado — el llamador decide si eso bloquea la generación completa (ingreso automático) o
 *     solo advierte (ingreso manual, donde el usuario puede revisar antes de confirmar).
 */
export function prepararDatosNIDesdeCC(cc: ComprobanteCompra, contexto: ContextoCostoValorizableCC): DatosNIDesdeCC {
  const lineasElegibles = cc.lineas.filter((l: LineaCompra) => {
    const esInventariable = l.esInventariable ?? calcularEsInventariable(l);
    return esInventariable && l.afectaInventario;
  });

  const lineas: LineaNIDesdeCC[] = [];
  const lineasPendientesDeValidacion: LineaPendienteDeValidacion[] = [];

  for (const l of lineasElegibles) {
    let factor = l.factorConversionAplicado;
    let cantidadEnUnidadMinima = l.cantidadDocumentadaInventariable;

    if (factor === undefined || cantidadEnUnidadMinima === undefined) {
      // Línea histórica sin snapshot canónico — se intenta resolver una sola vez, con la misma
      // regla central usada al confirmar líneas nuevas, nunca reconsultando el catálogo vigente
      // (unidadesDisponibles/cantidadSolicitada ya son los datos propios de la línea, no del
      // producto vigente).
      const resuelto = resolverSnapshotInventarioLinea({
        esInventariable: true,
        unidadMedidaCodigo: l.unidadMedidaCodigo,
        unidadesDisponibles: l.unidadesDisponibles,
        cantidadComercialFinal: l.cantidadSolicitada,
      });
      if (resuelto.error || resuelto.factorConversionAplicado === undefined || resuelto.cantidadDocumentadaInventariable === undefined) {
        lineasPendientesDeValidacion.push({
          lineaCompraId: l.id,
          nombreProducto: l.nombreProducto,
          motivo: resuelto.error ?? 'Sin snapshot canónico (cantidadDocumentadaInventariable) y no se pudo resolver de forma demostrable.',
        });
        continue;
      }
      factor = resuelto.factorConversionAplicado;
      cantidadEnUnidadMinima = resuelto.cantidadDocumentadaInventariable;
    }

    if (cantidadEnUnidadMinima <= 0) {
      lineasPendientesDeValidacion.push({
        lineaCompraId: l.id,
        nombreProducto: l.nombreProducto,
        motivo: `La cantidad documental inventariable (${cantidadEnUnidadMinima}) no es mayor a 0.`,
      });
      continue;
    }

    let costo: ResultadoCostoValorizableLinea;
    try {
      costo = calcularCostoValorizableLineaCompra(l, cantidadEnUnidadMinima, factor, cc, contexto);
    } catch (causaCosto) {
      lineasPendientesDeValidacion.push({
        lineaCompraId: l.id,
        nombreProducto: l.nombreProducto,
        motivo: causaCosto instanceof Error ? causaCosto.message : String(causaCosto),
      });
      continue;
    }

    lineas.push({
      lineaCompraId: l.id,
      productoId: l.productoId,
      codigoProducto: l.codigoProducto,
      nombreProducto: l.nombreProducto,
      unidadComercialOriginal: l.unidadMedida,
      unidadMedidaCodigo: l.unidadMedidaCodigo,
      cantidadComercialOriginal: l.cantidadSolicitada,
      factorConversionAplicado: factor,
      cantidad: cantidadEnUnidadMinima,
      costoUnitario: costo.costoUnitarioBaseMonedaBase,
      costoUnitarioComercialOriginal: costo.costoUnitarioComercialOriginal,
      esImpuestoRecuperable: costo.esImpuestoRecuperable,
      descuentoAplicado: l.descuentoUnitario ?? 0,
      monedaOriginal: costo.monedaOriginal,
      tipoCambioAplicado: costo.tipoCambioAplicado,
      fechaTipoCambio: cc.fechaRegistro,
      almacenDestinoId: l.almacenDestinoId,
      almacenDestinoNombre: l.almacenDestinoNombre,
      observacion: l.observacion,
    });
  }

  return {
    comprobanteCompraOrigenId: cc.id,
    proveedorId: cc.proveedorId,
    tipoIngreso: '02',
    motivo: 'COMPRA',
    fechaIngreso: cc.fechaRegistro,
    observaciones: cc.observaciones,
    lineas,
    lineasPendientesDeValidacion,
  };
}
