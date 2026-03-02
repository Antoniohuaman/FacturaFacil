import type { PlanValidacionEntrada, PlantillaValidacionEntrada } from '@/compartido/validacion/esquemas'
import { repositorioValidaciones } from '@/infraestructura/repositorios/repositorioValidaciones'

export function listarPlanesValidacion() {
  return repositorioValidaciones.listarPlanes()
}

export function crearPlanValidacion(entrada: PlanValidacionEntrada) {
  return repositorioValidaciones.crearPlan(entrada)
}

export function editarPlanValidacion(id: string, entrada: PlanValidacionEntrada) {
  return repositorioValidaciones.editarPlan(id, entrada)
}

export function eliminarPlanValidacion(id: string) {
  return repositorioValidaciones.eliminarPlan(id)
}

export function listarPlantillasValidacion() {
  return repositorioValidaciones.listarPlantillas()
}

export function crearPlantillaValidacion(entrada: PlantillaValidacionEntrada) {
  return repositorioValidaciones.crearPlantilla(entrada)
}

export function editarPlantillaValidacion(id: string, entrada: PlantillaValidacionEntrada) {
  return repositorioValidaciones.editarPlantilla(id, entrada)
}

export function eliminarPlantillaValidacion(id: string) {
  return repositorioValidaciones.eliminarPlantilla(id)
}

export function obtenerResumenValidacion() {
  return repositorioValidaciones.obtenerResumen()
}
