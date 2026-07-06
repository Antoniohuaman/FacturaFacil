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
