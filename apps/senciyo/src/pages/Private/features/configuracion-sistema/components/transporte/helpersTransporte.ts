import type { Conductor } from '../../modelos/Transporte';

/** "APELLIDO PATERNO APELLIDO MATERNO, NOMBRES COMPLETOS" */
export function nombreCompletoConductor(c: Conductor): string {
  const apellidos = [c.apellidoPaterno, c.apellidoMaterno]
    .map((a) => a.trim())
    .filter(Boolean)
    .join(' ');
  return `${apellidos}, ${c.nombres.trim()}`;
}

export function formatearPlaca(placa: string): string {
  if (placa.length === 6) return `${placa.slice(0, 3)}-${placa.slice(3)}`;
  return placa;
}
