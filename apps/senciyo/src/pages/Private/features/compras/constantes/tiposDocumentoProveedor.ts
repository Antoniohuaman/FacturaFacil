export interface TipoDocumentoProveedorItem {
  codigo: string;
  nombre: string;
  nombreCorto: string;
}

export const TIPOS_DOCUMENTO_PROVEEDOR: TipoDocumentoProveedorItem[] = [
  { codigo: '01', nombre: 'Factura', nombreCorto: 'F' },
  { codigo: '03', nombre: 'Boleta de Venta', nombreCorto: 'BV' },
  { codigo: '07', nombre: 'Nota de Crédito', nombreCorto: 'NC' },
  { codigo: '08', nombre: 'Nota de Débito', nombreCorto: 'ND' },
  { codigo: '12', nombre: 'Recibo por Honorarios', nombreCorto: 'RH' },
  { codigo: '14', nombre: 'Recibo por Arrendamiento', nombreCorto: 'RA' },
  { codigo: '40', nombre: 'Comprobante de Percepción', nombreCorto: 'CP' },
  { codigo: '56', nombre: 'Comprobante de Retención', nombreCorto: 'CR' },
  { codigo: '91', nombre: 'Comprobante de no domiciliado', nombreCorto: 'CND' },
];

export const TIPOS_DOCUMENTO_PROVEEDOR_POR_CODIGO: Record<string, TipoDocumentoProveedorItem> =
  TIPOS_DOCUMENTO_PROVEEDOR.reduce<Record<string, TipoDocumentoProveedorItem>>(
    (acc, tipo) => {
      acc[tipo.codigo] = tipo;
      return acc;
    },
    {},
  );

export function getNombreTipoDocumentoProveedor(codigo: string): string {
  return TIPOS_DOCUMENTO_PROVEEDOR_POR_CODIGO[codigo]?.nombre ?? codigo;
}

/** Placeholder de serie coherente con el tipo de comprobante elegido (ej. "F001", "BV01", "RH01") — máximo 4 caracteres, sin dispersar esta regla en el JSX del formulario. */
export function obtenerPlaceholderSerieDocumentoProveedor(codigo: string): string {
  const nombreCorto = TIPOS_DOCUMENTO_PROVEEDOR_POR_CODIGO[codigo]?.nombreCorto ?? 'S';
  const ceros = Math.max(0, 4 - nombreCorto.length - 1);
  return `${nombreCorto}${'0'.repeat(ceros)}1`.slice(0, 4);
}
