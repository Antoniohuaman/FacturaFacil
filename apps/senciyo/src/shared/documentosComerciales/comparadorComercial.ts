/**
 * Comparador centralizado de datos comerciales para flujos de conversión desde cotización.
 * Usado por DocumentosComerciales (NV/OV) y ComprobantesElectronicos (boleta/factura).
 * Sin dependencias de módulos de features — solo lógica pura.
 */

export interface ItemSnapshotComercial {
  code: string | null;
  name?: string | null;
  quantity: number;
  price: number;
}

export interface SnapshotComercial {
  clienteNumeroDocumento: string | null;
  moneda: string;
  formaPago: string | null;
  items: ItemSnapshotComercial[];
}

function normalizarNumero(n: number): number {
  return Math.round(n * 100) / 100;
}

function llavesItems(items: ItemSnapshotComercial[]): string {
  return items
    .map((i) => `${i.code ?? i.name ?? ''}|${normalizarNumero(i.quantity)}|${normalizarNumero(i.price)}`)
    .sort()
    .join(';');
}

/**
 * Devuelve true si hay diferencias comerciales relevantes entre el snapshot original
 * (de la cotización) y el snapshot actual (del formulario de destino).
 * Resiste nulls, orden de items y redondeo de decimales a 2 cifras.
 */
export function tieneCambiosComerciales(
  original: SnapshotComercial,
  actual: SnapshotComercial,
): boolean {
  if ((original.clienteNumeroDocumento ?? null) !== (actual.clienteNumeroDocumento ?? null)) {
    return true;
  }
  if (original.moneda !== actual.moneda) {
    return true;
  }
  if ((original.formaPago ?? null) !== (actual.formaPago ?? null)) {
    return true;
  }
  return llavesItems(original.items) !== llavesItems(actual.items);
}
