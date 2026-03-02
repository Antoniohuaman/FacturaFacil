import type { DecisionPmEntrada } from '@/compartido/validacion/esquemas'
import { repositorioDecisiones } from '@/infraestructura/repositorios/repositorioDecisiones'

export function listarDecisionesPm() {
  return repositorioDecisiones.listar()
}

export function crearDecisionPm(entrada: DecisionPmEntrada) {
  return repositorioDecisiones.crear(entrada)
}

export function editarDecisionPm(id: string, entrada: DecisionPmEntrada) {
  return repositorioDecisiones.editar(id, entrada)
}

export function eliminarDecisionPm(id: string) {
  return repositorioDecisiones.eliminar(id)
}
