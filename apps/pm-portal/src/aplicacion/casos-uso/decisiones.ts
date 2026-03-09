import type { DecisionPmEntrada } from '@/compartido/validacion/esquemas'
import { repositorioDecisiones } from '@/infraestructura/repositorios/repositorioDecisiones'
import { obtenerRegistroTablaPorId, registrarCambioEntidadBestEffort } from '@/aplicacion/casos-uso/historialCambios'

const TABLA_DECISIONES = 'pm_decisiones'

export function listarDecisionesPm() {
  return repositorioDecisiones.listar()
}

export function crearDecisionPm(entrada: DecisionPmEntrada) {
  return repositorioDecisiones.crear(entrada).then(async (creada) => {
    await registrarCambioEntidadBestEffort({
      tabla: TABLA_DECISIONES,
      moduloCodigo: 'decisiones',
      entidad: 'decision',
      entidadId: creada.id,
      accion: 'crear',
      despues: creada
    })
    return creada
  })
}

export async function editarDecisionPm(id: string, entrada: DecisionPmEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_DECISIONES, id)
  const actualizada = await repositorioDecisiones.editar(id, entrada)
  await registrarCambioEntidadBestEffort({
    tabla: TABLA_DECISIONES,
    moduloCodigo: 'decisiones',
    entidad: 'decision',
    entidadId: actualizada.id,
    accion: 'editar',
    antes,
    despues: actualizada
  })
  return actualizada
}

export async function eliminarDecisionPm(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_DECISIONES, id)
  await repositorioDecisiones.eliminar(id)
  await registrarCambioEntidadBestEffort({
    tabla: TABLA_DECISIONES,
    moduloCodigo: 'decisiones',
    entidad: 'decision',
    entidadId: id,
    accion: 'eliminar',
    antes
  })
}
