import type { LineaCompra } from '../modelos/LineaCompra';
import type { TotalesCompra, MonedaCompra } from '../modelos/tiposBaseCompras';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calcularTotalesCompra(lineas: LineaCompra[], moneda: MonedaCompra): TotalesCompra {
  let subtotal = 0;
  let subtotalExonerado = 0;
  let subtotalInafecto = 0;
  let descuentoTotal = 0;
  let igv = 0;

  for (const linea of lineas) {
    descuentoTotal += linea.descuentoTotal ?? 0;
    switch (linea.tipoAfectacion) {
      case 'gravado':
        subtotal += linea.subtotal;
        igv += linea.igv;
        break;
      case 'exonerado':
        subtotalExonerado += linea.subtotal;
        break;
      case 'inafecto':
        subtotalInafecto += linea.subtotal;
        break;
    }
  }

  const total = round2(subtotal + subtotalExonerado + subtotalInafecto + igv);

  return {
    subtotal: round2(subtotal),
    subtotalExonerado: round2(subtotalExonerado),
    subtotalInafecto: round2(subtotalInafecto),
    descuentoTotal: round2(descuentoTotal),
    igv: round2(igv),
    total,
    moneda,
  };
}
