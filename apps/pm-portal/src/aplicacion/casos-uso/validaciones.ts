import type { PlanValidacionEntrada, PlantillaValidacionEntrada } from '@/compartido/validacion/esquemas'
import { repositorioValidaciones } from '@/infraestructura/repositorios/repositorioValidaciones'
import { obtenerRegistroTablaPorId, registrarCambioEntidadBestEffort } from '@/aplicacion/casos-uso/historialCambios'

const TABLA_PLANES = 'pm_planes_validacion'
const TABLA_PLANTILLAS = 'pm_plantillas_validacion'

export function listarPlanesValidacion() {
  return repositorioValidaciones.listarPlanes()
}

export function crearPlanValidacion(entrada: PlanValidacionEntrada) {
  return repositorioValidaciones.crearPlan(entrada).then(async (creado) => {
    await registrarCambioEntidadBestEffort({
      tabla: TABLA_PLANES,
      moduloCodigo: 'validacion',
      entidad: 'plan_validacion',
      entidadId: creado.id,
      accion: 'crear',
      despues: creado
    })
    return creado
  })
}

export async function editarPlanValidacion(id: string, entrada: PlanValidacionEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_PLANES, id)
  const actualizado = await repositorioValidaciones.editarPlan(id, entrada)
  await registrarCambioEntidadBestEffort({
    tabla: TABLA_PLANES,
    moduloCodigo: 'validacion',
    entidad: 'plan_validacion',
    entidadId: actualizado.id,
    accion: 'editar',
    antes,
    despues: actualizado
  })
  return actualizado
}

export async function eliminarPlanValidacion(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_PLANES, id)
  await repositorioValidaciones.eliminarPlan(id)
  await registrarCambioEntidadBestEffort({
    tabla: TABLA_PLANES,
    moduloCodigo: 'validacion',
    entidad: 'plan_validacion',
    entidadId: id,
    accion: 'eliminar',
    antes
  })
}

export function listarPlantillasValidacion() {
  return repositorioValidaciones.listarPlantillas()
}

export function crearPlantillaValidacion(entrada: PlantillaValidacionEntrada) {
  return repositorioValidaciones.crearPlantilla(entrada).then(async (creada) => {
    await registrarCambioEntidadBestEffort({
      tabla: TABLA_PLANTILLAS,
      moduloCodigo: 'validacion',
      entidad: 'plantilla_validacion',
      entidadId: creada.id,
      accion: 'crear',
      despues: creada
    })
    return creada
  })
}

export async function editarPlantillaValidacion(id: string, entrada: PlantillaValidacionEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_PLANTILLAS, id)
  const actualizada = await repositorioValidaciones.editarPlantilla(id, entrada)
  await registrarCambioEntidadBestEffort({
    tabla: TABLA_PLANTILLAS,
    moduloCodigo: 'validacion',
    entidad: 'plantilla_validacion',
    entidadId: actualizada.id,
    accion: 'editar',
    antes,
    despues: actualizada
  })
  return actualizada
}

export async function eliminarPlantillaValidacion(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_PLANTILLAS, id)
  await repositorioValidaciones.eliminarPlantilla(id)
  await registrarCambioEntidadBestEffort({
    tabla: TABLA_PLANTILLAS,
    moduloCodigo: 'validacion',
    entidad: 'plantilla_validacion',
    entidadId: id,
    accion: 'eliminar',
    antes
  })
}

export function obtenerResumenValidacion() {
  return repositorioValidaciones.obtenerResumen()
}
