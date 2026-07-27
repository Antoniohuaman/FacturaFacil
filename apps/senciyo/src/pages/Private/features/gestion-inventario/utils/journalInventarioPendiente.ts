// gestion-inventario/utils/journalInventarioPendiente.ts
//
// Chequeo de solo lectura (Etapa 2, cierre de bloqueante 1 de la revisión): antes de permitir
// `pendiente_costos → validada`, consulta el diario/unidad de trabajo existente de Etapa 1B para
// bloquear si existe una transacción pendiente, ambigua o recuperable que pueda modificar stock.
// Deliberadamente NUNCA invoca `recuperarTransaccionesInterrumpidas` (esa función MUTA — auto-
// resuelve intentos interrumpidos) porque este chequeo se ejecuta en cada render de la UI
// (`verificarCondicionesValidacion`) y una función de solo lectura nunca debe disparar efectos de
// recuperación como side effect de "mostrar la lista de motivos de bloqueo".

import { listarOperacionesIdempotentesPorEmpresa } from '../repositories/operacionIdempotenteInventario.repository';
import { listarTransaccionesInventarioPorEmpresa } from '../repositories/transaccionInventario.repository';

/**
 * `true` si existe, para esta empresa, alguna `OperacionIdempotenteInventario` todavía `'preparada'`
 * (reservada pero sin resolución — el mismo estado que el motor diagnostica como 'ambigua' si no
 * hay una transacción activa enlazada) o alguna `TransaccionInventario` todavía `'preparada'`/
 * `'confirmando'` (un intento en curso o interrumpido a mitad de escritura). Cualquiera de los dos
 * significa que el diario tiene una mutación de stock que todavía no terminó de resolverse —
 * validar la preparación de valorización inicial en ese momento arriesgaría aprobar un snapshot que
 * una transacción pendiente podría modificar después.
 */
export function hayOperacionInventarioPendienteOAmbigua(empresaId: string): boolean {
  const operaciones = listarOperacionesIdempotentesPorEmpresa(empresaId);
  if (operaciones.some((op) => op.estado === 'preparada')) return true;

  const transacciones = listarTransaccionesInventarioPorEmpresa(empresaId);
  return transacciones.some((t) => t.estado === 'preparada' || t.estado === 'confirmando');
}
