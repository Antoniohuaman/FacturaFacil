// gastos/servicios/servicioImpuestoGasto.ts
//
// Motor tributario de Gastos — reutiliza la MISMA fórmula base⇄total que
// Compras (`derivarBaseImponibleDesdeTotal`/`derivarTotalDesdeBaseImponible`
// en `compras/logica/reglasCompras.ts`, extraídas de `calcularLineaCompra`),
// nunca una segunda implementación. La tasa SIEMPRE se resuelve desde
// `config.taxes` (Configuración de Negocio → Impuestos) — nunca hardcodeada
// (§12 del alcance: bloqueante funcional). El usuario nunca calcula el IGV a
// mano: entra por subtotal O por total y el resto se deriva.

import type { Tax } from '../../configuracion-sistema/modelos/Tax';
import { derivarBaseImponibleDesdeTotal, derivarTotalDesdeBaseImponible, round2 } from '../../compras/logica/reglasCompras';
import type { TratamientoImpuestoGasto } from '../modelos/Gasto';

/**
 * Código de afectación '10' (Catálogo N° 07 SUNAT) = "Gravado - Operación
 * Onerosa" — el único código de afectación donde existe un IGV real que
 * pueda calificarse como recuperable o no recuperable. Un impuesto
 * Exonerado/Inafecto/Exportación (afectación '20'/'30'/'40') tiene tasa 0%
 * por definición: no hay IGV que recuperar, así que "Impuesto recuperable" +
 * esa afectación es una combinación conceptualmente incoherente (auditoría
 * `docs/AUDITORIA_FUENTES_VERDAD_GASTOS.md` §12/§21). Metadato REAL de
 * `Tax.affectationCode` — nunca un nombre ("Exonerado") comparado a mano.
 */
const CODIGO_AFECTACION_GRAVADO = '10';

export interface ImpuestoConfiguradoGasto {
  id: string;
  nombre: string;
  /** Fracción (0.18 = 18%) — nunca el 0-100 crudo de `Tax.rate`. */
  tasa: number;
}

/**
 * Impuestos activos disponibles para un gasto — misma fuente que Compras
 * (`config.taxes`), nunca una segunda lista ni una tasa fija. Dos filtros
 * CONTEXTUALES de Gastos, ninguno modifica el catálogo central:
 * - Solo `type === 'PERCENTAGE'`: el motor de Gastos siempre calcula
 *   `tasa / 100` como fracción — un impuesto de monto fijo (ej. ICBPER)
 *   se calcularía mal si se ofreciera aquí.
 * - Con `tratamientoImpuesto === 'recuperable'`: solo impuestos Gravados
 *   (afectación '10') — ver `CODIGO_AFECTACION_GRAVADO`. Sin
 *   `tratamientoImpuesto` (o con otro valor), no se filtra por afectación.
 */
export function listarImpuestosConfiguradosGasto(
  taxes: readonly Tax[],
  tratamientoImpuesto?: TratamientoImpuestoGasto,
): ImpuestoConfiguradoGasto[] {
  return taxes
    .filter((tax) => tax.isActive && tax.type === 'PERCENTAGE')
    .filter((tax) => tratamientoImpuesto !== 'recuperable' || tax.affectationCode === CODIGO_AFECTACION_GRAVADO)
    .map((tax) => ({ id: tax.id, nombre: `${tax.name} (${tax.rate}%)`, tasa: tax.rate / 100 }));
}

/** Resuelve el impuesto configurado por id — `undefined`/no encontrado/inactivo/no porcentual ⇒ `null` (nunca una tasa asumida ni un monto fijo tratado como fracción). */
export function resolverImpuestoGasto(impuestoId: string | undefined, taxes: readonly Tax[]): ImpuestoConfiguradoGasto | null {
  if (!impuestoId) return null;
  const tax = taxes.find((t) => t.id === impuestoId && t.isActive && t.type === 'PERCENTAGE');
  if (!tax) return null;
  return { id: tax.id, nombre: `${tax.name} (${tax.rate}%)`, tasa: tax.rate / 100 };
}

export interface ImportesCalculadosGasto {
  subtotal: number;
  impuesto: number;
  total: number;
}

/** A. Ingreso desde subtotal → impuesto y total derivados (nunca calculado por el usuario). */
export function calcularImportesGastoDesdeSubtotal(subtotal: number, tasa: number): ImportesCalculadosGasto {
  const { igv, total } = derivarTotalDesdeBaseImponible(subtotal, tasa);
  return { subtotal: round2(subtotal), impuesto: round2(igv), total: round2(total) };
}

/** B. Ingreso desde total → base imponible e impuesto derivados. */
export function calcularImportesGastoDesdeTotal(total: number, tasa: number): ImportesCalculadosGasto {
  const { baseImponible, igv } = derivarBaseImponibleDesdeTotal(total, tasa);
  return { subtotal: round2(baseImponible), impuesto: round2(igv), total: round2(total) };
}

/** Sin desglose: el total registrado ES el importe, sin impuesto separado — política explícita del documento, nunca un cálculo con tasa 0 disfrazado. */
export function calcularImportesGastoSinDesglose(total: number): ImportesCalculadosGasto {
  return { subtotal: round2(total), impuesto: 0, total: round2(total) };
}
