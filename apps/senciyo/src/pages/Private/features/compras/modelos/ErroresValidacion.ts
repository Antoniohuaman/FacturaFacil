/**
 * Error de validación estructurado para formularios de Compras (OC, CC).
 * La UI debe identificar el campo afectado por `campo`/`codigo`, nunca
 * comparando el texto de `mensaje`.
 */
export interface ErrorCampoDocumento {
  campo: string;
  codigo: string;
  mensaje: string;
}

export function obtenerErrorDeCampo(
  errores: ErrorCampoDocumento[],
  campo: string,
): ErrorCampoDocumento | undefined {
  return errores.find((e) => e.campo === campo);
}

/**
 * Adapta los `ErrorValidacion` que ya devuelven los validadores de servicio
 * (`validarOrdenCompraBasica`, `validarComprobanteCompraBasico`, etc. —
 * `servicios/tiposServiciosCompras.ts`) a `ErrorCampoDocumento`, para que el
 * formulario reutilice exactamente la misma regla que ya aplica el servicio
 * en vez de duplicarla. `codigo` no tiene consumidores por comportamiento
 * (solo `campo` se usa para ubicar el control); se rellena con el propio
 * `campo` en mayúsculas para no dejarlo vacío.
 */
export function convertirErroresValidacion(
  errores: Array<{ campo: string; mensaje: string }>,
): ErrorCampoDocumento[] {
  return errores.map((e) => ({ campo: e.campo, codigo: e.campo.toUpperCase(), mensaje: e.mensaje }));
}

/**
 * Una línea de producto/servicio reporta su error con `campo` del tipo
 * `lineas[2].cantidadSolicitada` (índice real de fila). La sección de
 * productos se trata como un solo bloque a efectos de foco/visibilidad (no
 * hay una fila "tocada" individual en la tabla compartida), así que aquí se
 * normaliza cualquier `campo` que empiece con `lineas` a `'lineas'`.
 */
export function normalizarCampoLineas(campo: string): string {
  return campo.startsWith('lineas') ? 'lineas' : campo;
}

/**
 * Desplaza la vista y enfoca el primer campo inválido tras un intento de
 * envío fallido. Depende de que el contenedor del campo tenga
 * `id="campo-<nombre>"` (convención usada por los formularios de Compras);
 * si no lo encuentra, no hace nada (nunca lanza).
 */
export function enfocarPrimerCampoConError(errores: ErrorCampoDocumento[]): void {
  if (errores.length === 0) return;
  const idCampo = normalizarCampoLineas(errores[0].campo);
  const contenedor = document.getElementById(`campo-${idCampo}`);
  if (!contenedor) return;
  contenedor.scrollIntoView({ behavior: 'smooth', block: 'center' });
  contenedor.querySelector<HTMLElement>('input, select, textarea, button')?.focus();
}
