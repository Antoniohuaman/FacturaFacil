export type { ErrorValidacion } from './tiposServiciosCompras';

export { validarOrdenCompraBasica, crearLineaCompraDesdeProducto } from './servicioOrdenCompra';
export type { ProductDataLineaCompra } from './servicioOrdenCompra';

export {
  validarComprobanteCompraBasico,
  validarComprobanteCompraDuplicado,
  generarClaveUnicaCC,
} from './servicioComprobanteCompra';

export {
  generarCuentaPorPagar,
  aplicarPagoACuentaPorPagar,
  revertirPagoDeCuentaPorPagar,
  anularCuentaPorPagarPorComprobante,
  calcularEstadoVencimiento,
  calcularDiasVencidos,
  calcularDiasCredito,
} from './servicioCuentaPorPagar';

export {
  validarPagoCompraBasico,
  validarMediosPagoCompra,
  tieneMedioDeCaja,
  esMedioDeCaja,
  esMedioBancario,
  requiereReferencia,
} from './servicioPagoCompra';

export { persistirProveedorSiEsNuevo } from './servicioProveedorCompras';

// Reglas de negocio transversales (permisos de acción por estado, validaciones
// cruzadas entre entidades). Centralizadas en logica/reglasCompras para evitar
// duplicar las mismas condiciones en servicios individuales.
export {
  puedeEditarOC,
  puedeAprobarOC,
  puedeRechazarOC,
  puedeGenerarCCDesdeOC,
  puedeAnularOC,
  puedeCerrarOC,
  motivoBloqueoAnulacionOC,
  puedeAnularCC,
  motivoBloqueoAnulacionCC,
  puedeRegistrarPago,
  puedeAnularPago,
  motivoBloqueoAnulacionPago,
  esCompraACredito,
  validarFechaVencimientoCredito,
  validarTipoCambioRequerido,
  validarLineasCompra,
  recalcularEstadoPagoComprobante,
  calcularTotalesLineas,
} from '../logica/reglasCompras';
