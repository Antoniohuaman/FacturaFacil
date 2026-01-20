import type { Caja } from '../modelos/Caja';

export class NoActiveCajaError extends Error {
  constructor(message: string = 'No hay cajas habilitadas para el establecimiento actual') {
    super(message);
    this.name = 'NoActiveCajaError';
  }
}

interface ResolveActiveCajaParams {
  empresaId?: string;
  establecimientoId?: string;
  cajas: Caja[];
}

/**
 * Resuelve la caja activa para un establecimiento dado.
 * Regla:
 * 1) Solo considera cajas habilitadas del establecimiento actual.
 * 2) Si existe alguna marcada con tieneSesionAbierta === true, prioriza la primera.
 * 3) Si no, toma la primera habilitada por orden estable (orden actual en el array).
 * 4) Si no hay ninguna habilitada, lanza NoActiveCajaError.
 */
export function resolveActiveCajaForEstablecimiento(
  { empresaId, establecimientoId, cajas }: ResolveActiveCajaParams,
): Caja {
  if (!empresaId || !establecimientoId) {
    throw new NoActiveCajaError('Empresa y establecimiento son requeridos para resolver la caja activa');
  }

  const scoped = cajas.filter(
    (caja) => caja.empresaId === empresaId && caja.establecimientoIdCaja === establecimientoId && caja.habilitadaCaja,
  );

  if (scoped.length === 0) {
    throw new NoActiveCajaError();
  }

  const withOpenSession = scoped.find((caja) => caja.tieneSesionAbierta);
  if (withOpenSession) {
    return withOpenSession;
  }

  return scoped[0];
}
