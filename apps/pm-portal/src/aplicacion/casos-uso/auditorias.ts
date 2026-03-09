import type { AuditoriaPmEntrada, HallazgoAuditoriaEntrada } from '@/compartido/validacion/esquemas'
import { repositorioAuditorias } from '@/infraestructura/repositorios/repositorioAuditorias'
import { obtenerRegistroTablaPorId, registrarCambioEntidadBestEffort } from '@/aplicacion/casos-uso/historialCambios'

const TABLA_AUDITORIAS = 'pm_auditorias'
const TABLA_HALLAZGOS = 'pm_hallazgos_auditoria'

export function listarTiposAuditoriaPm() {
  return repositorioAuditorias.listarTiposAuditoria()
}

export function listarAuditoriasPm() {
  return repositorioAuditorias.listarAuditorias()
}

export function crearAuditoriaPm(entrada: AuditoriaPmEntrada) {
  return repositorioAuditorias.crearAuditoria(entrada).then(async (creada) => {
    await registrarCambioEntidadBestEffort({
      tabla: TABLA_AUDITORIAS,
      moduloCodigo: 'auditorias',
      entidad: 'auditoria',
      entidadId: creada.id,
      accion: 'crear',
      despues: creada
    })
    return creada
  })
}

export async function editarAuditoriaPm(id: string, entrada: AuditoriaPmEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_AUDITORIAS, id)
  const actualizada = await repositorioAuditorias.editarAuditoria(id, entrada)
  await registrarCambioEntidadBestEffort({
    tabla: TABLA_AUDITORIAS,
    moduloCodigo: 'auditorias',
    entidad: 'auditoria',
    entidadId: actualizada.id,
    accion: 'editar',
    antes,
    despues: actualizada
  })
  return actualizada
}

export async function eliminarAuditoriaPm(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_AUDITORIAS, id)
  await repositorioAuditorias.eliminarAuditoria(id)
  await registrarCambioEntidadBestEffort({
    tabla: TABLA_AUDITORIAS,
    moduloCodigo: 'auditorias',
    entidad: 'auditoria',
    entidadId: id,
    accion: 'eliminar',
    antes
  })
}

export function listarHallazgosAuditoriaPm() {
  return repositorioAuditorias.listarHallazgos()
}

export function crearHallazgoAuditoriaPm(entrada: HallazgoAuditoriaEntrada) {
  return repositorioAuditorias.crearHallazgo(entrada).then(async (creado) => {
    await registrarCambioEntidadBestEffort({
      tabla: TABLA_HALLAZGOS,
      moduloCodigo: 'auditorias',
      entidad: 'hallazgo',
      entidadId: creado.id,
      accion: 'crear',
      despues: creado
    })
    return creado
  })
}

export async function editarHallazgoAuditoriaPm(id: string, entrada: HallazgoAuditoriaEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_HALLAZGOS, id)
  const actualizado = await repositorioAuditorias.editarHallazgo(id, entrada)
  await registrarCambioEntidadBestEffort({
    tabla: TABLA_HALLAZGOS,
    moduloCodigo: 'auditorias',
    entidad: 'hallazgo',
    entidadId: actualizado.id,
    accion: 'editar',
    antes,
    despues: actualizado
  })
  return actualizado
}

export async function eliminarHallazgoAuditoriaPm(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_HALLAZGOS, id)
  await repositorioAuditorias.eliminarHallazgo(id)
  await registrarCambioEntidadBestEffort({
    tabla: TABLA_HALLAZGOS,
    moduloCodigo: 'auditorias',
    entidad: 'hallazgo',
    entidadId: id,
    accion: 'eliminar',
    antes
  })
}
