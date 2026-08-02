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

export interface ImpuestoConfiguradoGasto {
  id: string;
  nombre: string;
  /** Fracción (0.18 = 18%) — nunca el 0-100 crudo de `Tax.rate`. */
  tasa: number;
}

/** Impuestos activos disponibles para un gasto — misma fuente que Compras (`config.taxes`), nunca una segunda lista ni una tasa fija. */
export function listarImpuestosConfiguradosGasto(taxes: readonly Tax[]): ImpuestoConfiguradoGasto[] {
  return taxes
    .filter((tax) => tax.isActive)
    .map((tax) => ({ id: tax.id, nombre: `${tax.name} (${tax.rate}%)`, tasa: tax.rate / 100 }));
}

/** Resuelve el impuesto configurado por id — `undefined`/no encontrado/inactivo ⇒ `null` (nunca una tasa asumida). */
export function resolverImpuestoGasto(impuestoId: string | undefined, taxes: readonly Tax[]): ImpuestoConfiguradoGasto | null {
  if (!impuestoId) return null;
  const tax = taxes.find((t) => t.id === impuestoId && t.isActive);
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
