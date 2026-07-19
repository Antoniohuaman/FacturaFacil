import type { ComprobanteCompra } from '../modelos/ComprobanteCompra';
import type { LineaCompra } from '../modelos/LineaCompra';
import { calcularEsInventariable, resolverSnapshotInventarioLinea } from '../logica/reglasCompras';

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
  costoUnitario: number;
  almacenDestinoId?: string;
  almacenDestinoNombre?: string;
  observacion?: string;
}

/** Línea que no pudo mapearse de forma segura — nunca se inventa un factor ni una cantidad. */
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
  /** Líneas inventariables/afectan-inventario con recepción, pero sin snapshot canónico resoluble — requieren revisión antes de poder generar NI (no se les asume factor 1). */
  lineasPendientesDeValidacion: LineaPendienteDeValidacion[];
}

/**
 * Prepara los datos de una Nota de Ingreso a partir de un Comprobante de Compra — función pura,
 * sin efectos secundarios, sin persistencia, sin llamadas a servicios de Inventario. Sigue sin
 * tener consumidor productivo en esta etapa (se conecta recién en la Etapa 3, ver el diseño
 * aprobado). Reglas:
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
 */
export function prepararDatosNIDesdeCC(cc: ComprobanteCompra): DatosNIDesdeCC {
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
      costoUnitario: l.costoUnitario,
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
