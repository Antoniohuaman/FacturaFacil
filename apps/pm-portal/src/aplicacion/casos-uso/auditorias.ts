import type { AuditoriaPmEntrada, HallazgoAuditoriaEntrada } from '@/compartido/validacion/esquemas'
import { repositorioAuditorias } from '@/infraestructura/repositorios/repositorioAuditorias'

export function listarTiposAuditoriaPm() {
  return repositorioAuditorias.listarTiposAuditoria()
}

export function listarAuditoriasPm() {
  return repositorioAuditorias.listarAuditorias()
}

export function crearAuditoriaPm(entrada: AuditoriaPmEntrada) {
  return repositorioAuditorias.crearAuditoria(entrada)
}

export function editarAuditoriaPm(id: string, entrada: AuditoriaPmEntrada) {
  return repositorioAuditorias.editarAuditoria(id, entrada)
}

export function eliminarAuditoriaPm(id: string) {
  return repositorioAuditorias.eliminarAuditoria(id)
}

export function listarHallazgosAuditoriaPm() {
  return repositorioAuditorias.listarHallazgos()
}

export function crearHallazgoAuditoriaPm(entrada: HallazgoAuditoriaEntrada) {
  return repositorioAuditorias.crearHallazgo(entrada)
}

export function editarHallazgoAuditoriaPm(id: string, entrada: HallazgoAuditoriaEntrada) {
  return repositorioAuditorias.editarHallazgo(id, entrada)
}

export function eliminarHallazgoAuditoriaPm(id: string) {
  return repositorioAuditorias.eliminarHallazgo(id)
}
