export type {
  TipoCatalogo,
  CatalogoTributarioBase,
  TipoOperacionTributaria,
  CodigoDetraccionTributaria,
  LeyendaTributaria,
  CargoDescuentoTributario,
  TipoPrecioTributario,
  ItemCatalogoTributario,
  ConfiguracionDetraccionEmpresa,
  SobrescriturasCatalogo,
} from './tipos-catalogos-tributarios';

export { ETIQUETAS_CATALOGO, ORDEN_CATALOGOS } from './tipos-catalogos-tributarios';

export type {
  ItemEvaluableDetraccion,
  EntradaEvaluacionDetraccion,
  ResultadoEvaluacionDetraccion,
} from './calculo-detraccion';

export {
  obtenerUmbralDetraccionPorCodigo,
  resolverTipoOperacionDetraccion,
  resolverCodigoDetraccion,
  calcularMontoDetraccion,
  validarReglasDetraccion,
  evaluarDetraccion,
} from './calculo-detraccion';

export {
  CATALOGO_51_TIPOS_OPERACION,
  CATALOGO_54_DETRACCIONES,
  CATALOGO_52_LEYENDAS,
  CATALOGO_53_CARGOS_DESCUENTOS,
  CATALOGO_16_TIPOS_PRECIO,
  obtenerCatalogoTributario,
  buscarItemCatalogoTributario,
  listarTiposOperacion,
  listarCodigosDetraccion,
  listarLeyendasTributarias,
  listarCargosDescuentos,
  listarTiposPrecio,
  esTipoOperacionDetraccion,
  esTipoOperacionExportacion,
  cargarConfiguracionDetraccion,
  guardarConfiguracionDetraccion,
} from './catalogos-tributarios';
