import type { EjecucionValidacionEntrada } from '@/compartido/validacion/esquemas'
import { repositorioEjecucionesValidacion } from '@/infraestructura/repositorios/repositorioEjecucionesValidacion'

export function listarEjecucionesValidacion() {
  return repositorioEjecucionesValidacion.listar()
}

export function crearEjecucionValidacion(entrada: EjecucionValidacionEntrada) {
  return repositorioEjecucionesValidacion.crear(entrada)
}

export function editarEjecucionValidacion(id: string, entrada: EjecucionValidacionEntrada) {
  return repositorioEjecucionesValidacion.editar(id, entrada)
}

export function eliminarEjecucionValidacion(id: string) {
  return repositorioEjecucionesValidacion.eliminar(id)
}
