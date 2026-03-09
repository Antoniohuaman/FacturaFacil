import type { EjecucionValidacionEntrada } from '@/compartido/validacion/esquemas'
import { repositorioEjecucionesValidacion } from '@/infraestructura/repositorios/repositorioEjecucionesValidacion'
import { obtenerRegistroTablaPorId, registrarCambioEntidadBestEffort } from '@/aplicacion/casos-uso/historialCambios'

const TABLA_EJECUCIONES = 'pm_ejecuciones_validacion'

export function listarEjecucionesValidacion() {
  return repositorioEjecucionesValidacion.listar()
}

export function crearEjecucionValidacion(entrada: EjecucionValidacionEntrada) {
  return repositorioEjecucionesValidacion.crear(entrada).then(async (creada) => {
    await registrarCambioEntidadBestEffort({
      tabla: TABLA_EJECUCIONES,
      moduloCodigo: 'validacion',
      entidad: 'ejecucion_validacion',
      entidadId: creada.id,
      accion: 'crear',
      despues: creada
    })
    return creada
  })
}

export async function editarEjecucionValidacion(id: string, entrada: EjecucionValidacionEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_EJECUCIONES, id)
  const actualizada = await repositorioEjecucionesValidacion.editar(id, entrada)
  await registrarCambioEntidadBestEffort({
    tabla: TABLA_EJECUCIONES,
    moduloCodigo: 'validacion',
    entidad: 'ejecucion_validacion',
    entidadId: actualizada.id,
    accion: 'editar',
    antes,
    despues: actualizada
  })
  return actualizada
}

export async function eliminarEjecucionValidacion(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_EJECUCIONES, id)
  await repositorioEjecucionesValidacion.eliminar(id)
  await registrarCambioEntidadBestEffort({
    tabla: TABLA_EJECUCIONES,
    moduloCodigo: 'validacion',
    entidad: 'ejecucion_validacion',
    entidadId: id,
    accion: 'eliminar',
    antes
  })
}
