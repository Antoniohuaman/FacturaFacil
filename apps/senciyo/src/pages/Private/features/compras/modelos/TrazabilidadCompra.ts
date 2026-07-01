export interface TrazabilidadCompra {
  requerimientoCompraOrigenId?: string;
  requerimientoCompraOrigenNumero?: string;
  ordenCompraOrigenId?: string;
  ordenCompraOrigenNumero?: string;
  comprobanteCompraId?: string;
  comprobanteCompraNumero?: string;
  cuentaPorPagarId?: string;
  pagoCompraIds?: string[];
  notaIngresoIds?: string[];
  movimientoInventarioIds?: string[];
  documentoDestinoTipo?: string;
  documentoDestinoId?: string;
  documentoDestinoNumero?: string;
}
