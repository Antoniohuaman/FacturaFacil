import type { LineaCompra } from '../modelos/LineaCompra';
import type { EstadoRecepcionOC, EstadoFacturacionOC, EstadoInventarioOC } from '../modelos/OrdenCompra';
import type { EstadoInventarioCC, ModalidadInventarioCC } from '../modelos/ComprobanteCompra';

export function calcularEstadoRecepcion(lineas: LineaCompra[]): EstadoRecepcionOC {
  const lineasConStock = lineas.filter((l) => l.afectaInventario);
  if (lineasConStock.length === 0) return 'no_aplica';

  const todasCompletas = lineasConStock.every(
    (l) => l.cantidadRecibida >= l.cantidadSolicitada,
  );
  if (todasCompletas) return 'completa';

  const algunaRecibida = lineasConStock.some((l) => l.cantidadRecibida > 0);
  return algunaRecibida ? 'parcial' : 'pendiente';
}

export function calcularEstadoFacturacion(lineas: LineaCompra[]): EstadoFacturacionOC {
  if (lineas.length === 0) return 'pendiente';

  const totalSolicitado = lineas.reduce((acc, l) => acc + l.cantidadSolicitada, 0);
  const totalFacturado = lineas.reduce((acc, l) => acc + l.cantidadFacturada, 0);

  if (totalSolicitado <= 0) return 'no_aplica';
  if (totalFacturado >= totalSolicitado) return 'completa';
  if (totalFacturado > 0) return 'parcial';
  return 'pendiente';
}

export function calcularEstadoInventarioOC(lineas: LineaCompra[]): EstadoInventarioOC {
  const lineasConStock = lineas.filter((l) => l.afectaInventario);
  if (lineasConStock.length === 0) return 'no_aplica';

  const totalFacturado = lineasConStock.reduce((acc, l) => acc + l.cantidadFacturada, 0);
  const totalIngresado = lineasConStock.reduce((acc, l) => acc + l.cantidadIngresadaInventario, 0);

  if (totalFacturado <= 0) return 'pendiente';
  if (totalIngresado >= totalFacturado) return 'completo';
  if (totalIngresado > 0) return 'parcial';
  return 'pendiente';
}

export function calcularEstadoInventarioCC(
  lineas: LineaCompra[],
  modalidadInventario: ModalidadInventarioCC,
): EstadoInventarioCC {
  if (modalidadInventario === 'no_afecta_inventario') return 'no_aplica';
  if (modalidadInventario === 'ingreso_automatico') return 'automatico';

  const lineasConStock = lineas.filter((l) => l.afectaInventario);
  if (lineasConStock.length === 0) return 'no_aplica';

  const totalFacturado = lineasConStock.reduce((acc, l) => acc + l.cantidadFacturada, 0);
  const totalIngresado = lineasConStock.reduce((acc, l) => acc + l.cantidadIngresadaInventario, 0);

  if (totalFacturado <= 0) return 'pendiente';
  if (totalIngresado >= totalFacturado) return 'completo';
  if (totalIngresado > 0) return 'parcial';
  return 'pendiente';
}
