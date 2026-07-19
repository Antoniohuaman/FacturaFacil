export interface ProductUnitOption {
  code: string;
  label: string;
  isBase?: boolean;
  /**
   * Factor de conversión hacia la unidad mínima (1 para la unidad base). Necesario para que
   * consumidores que ya no tienen el `Product` completo (ej. Compras, que solo conserva
   * `unidadesDisponibles` en `LineaCompra`) puedan resolver/validar snapshots de conversión en
   * cualquier momento del ciclo de vida de la línea, sin volver a consultar el catálogo — ver
   * `resolverSnapshotInventarioLinea` en `compras/logica/reglasCompras.ts`.
   */
  factorConversion?: number;
}

export interface AdditionalUnitLike {
  id?: string;
  unidadCodigo: string;
  nombre?: string;
  unidadName?: string;
  unidadSymbol?: string;
  factorConversion?: number;
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
      factorConversion: 1,
    });
  }

  (product.unidadesMedidaAdicionales ?? []).forEach((unidad) => {
    if (!unidad?.unidadCodigo) return;
    const code = unidad.id ? `${unidad.unidadCodigo}__${unidad.id}` : unidad.unidadCodigo;
    options.push({
      code,
      label: unidad.nombre || unidad.unidadName || unidad.unidadSymbol || unidad.unidadCodigo,
      factorConversion: unidad.factorConversion,
    });
  });

  return options;
};
