export interface ProductUnitOption {
  code: string;
  label: string;
  isBase?: boolean;
}

export interface AdditionalUnitLike {
  id?: string;
  unidadCodigo: string;
  nombre?: string;
  unidadName?: string;
  unidadSymbol?: string;
}

export interface ProductWithUnitsLike {
  unidad?: string;
  unitName?: string;
  unitSymbol?: string;
  unidadesMedidaAdicionales?: AdditionalUnitLike[];
}

/**
 * Unidad base + unidades alternativas/presentaciones de un producto, tal
 * como las define el propio producto en el catálogo. No consulta listas de
 * unidades de Configuración ni price-books: solo lo que el producto declara.
 */
export const getProductUnitOptions = (product: ProductWithUnitsLike): ProductUnitOption[] => {
  const options: ProductUnitOption[] = [];

  if (product.unidad) {
    options.push({
      code: product.unidad,
      label: product.unitName || product.unitSymbol || product.unidad,
      isBase: true,
    });
  }

  (product.unidadesMedidaAdicionales ?? []).forEach((unidad) => {
    if (!unidad?.unidadCodigo) return;
    const code = unidad.id ? `${unidad.unidadCodigo}__${unidad.id}` : unidad.unidadCodigo;
    options.push({
      code,
      label: unidad.nombre || unidad.unidadName || unidad.unidadSymbol || unidad.unidadCodigo,
    });
  });

  return options;
};
