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

/**
 * Corrección obligatoria: seleccionar la modalidad `ingreso_automatico` NUNCA es, por sí sola,
 * evidencia de que exista una Nota de Ingreso real — la Etapa 0 no conecta ninguna generación
 * automática de NI (esa saga se construye recién en la Etapa 3 del diseño aprobado). Por eso
 * `evidenciaIngresoAutomaticoConfirmado` es un parámetro explícito, no una inferencia desde la
 * modalidad: solo cuando el llamador puede demostrar (con una NI automática realmente
 * confirmada y relacionada al CC) que el ingreso ocurrió, el resultado puede ser `'automatico'`.
 * Mientras esa evidencia no exista (el valor por defecto, `false`, en toda esta etapa), una línea
 * en modalidad `ingreso_automatico` se evalúa con la MISMA lógica de cantidades reales que
 * `con_nota_ingreso` — nunca se inventa una NI ni una relación ficticia para satisfacer el estado.
 */
export function calcularEstadoInventarioCC(
  lineas: LineaCompra[],
  modalidadInventario: ModalidadInventarioCC,
  evidenciaIngresoAutomaticoConfirmado: boolean = false,
): EstadoInventarioCC {
  if (modalidadInventario === 'no_afecta_inventario') return 'no_aplica';

  const lineasConStock = lineas.filter((l) => l.afectaInventario);
  if (lineasConStock.length === 0) return 'no_aplica';

  const totalFacturado = lineasConStock.reduce((acc, l) => acc + l.cantidadFacturada, 0);
  const totalIngresado = lineasConStock.reduce((acc, l) => acc + l.cantidadIngresadaInventario, 0);

  if (
    modalidadInventario === 'ingreso_automatico' &&
    evidenciaIngresoAutomaticoConfirmado &&
    totalFacturado > 0 &&
    totalIngresado >= totalFacturado
  ) {
    return 'automatico';
  }

  if (totalFacturado <= 0) return 'pendiente';
  if (totalIngresado >= totalFacturado) return 'completo';
  if (totalIngresado > 0) return 'parcial';
  return 'pendiente';
}
