import type {
  BloqueoEntrada,
  BugEntrada,
  DeudaTecnicaEntrada,
  LeccionAprendidaEntrada,
  MejoraEntrada
} from '@/compartido/validacion/esquemas'
import { listarModulosPm } from '@/aplicacion/casos-uso/ajustes'
import { listarAuditoriasPm, listarHallazgosAuditoriaPm } from '@/aplicacion/casos-uso/auditorias'
import { listarDecisionesPm } from '@/aplicacion/casos-uso/decisiones'
import { listarHipotesisDiscovery, listarInsightsDiscovery } from '@/aplicacion/casos-uso/discovery'
import { listarEntregas } from '@/aplicacion/casos-uso/entregas'
import { obtenerRegistroTablaPorId, registrarCambioEntidadBestEffort } from '@/aplicacion/casos-uso/historialCambios'
import { listarIniciativas } from '@/aplicacion/casos-uso/iniciativas'
import { listarReleases } from '@/aplicacion/casos-uso/lanzamientos'
import { repositorioOperacion } from '@/infraestructura/repositorios/repositorioOperacion'

const MODULO_OPERACION = 'operacion'
const TABLA_BUGS = 'pm_bugs'
const TABLA_MEJORAS = 'pm_mejoras'
const TABLA_DEUDA_TECNICA = 'pm_deuda_tecnica'
const TABLA_BLOQUEOS = 'pm_bloqueos'
const TABLA_LECCIONES = 'pm_lecciones_aprendidas'

function registrarCambioOperacion(
  tabla: string,
  entidad: string,
  accion: 'crear' | 'editar' | 'eliminar',
  entidadId: string,
  antes?: unknown | null,
  despues?: unknown | null,
  metadata?: Record<string, unknown> | null
) {
  return registrarCambioEntidadBestEffort({
    tabla,
    moduloCodigo: MODULO_OPERACION,
    entidad,
    entidadId,
    accion,
    antes,
    despues,
    metadata
  })
}

export function listarBugsPm() {
  return repositorioOperacion.listarBugs()
}

export async function crearBugPm(entrada: BugEntrada) {
  const creado = await repositorioOperacion.crearBug(entrada)
  await registrarCambioOperacion(TABLA_BUGS, 'bug', 'crear', creado.id, null, creado)
  return creado
}

export async function editarBugPm(id: string, entrada: BugEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_BUGS, id)
  const actualizado = await repositorioOperacion.editarBug(id, entrada)
  await registrarCambioOperacion(TABLA_BUGS, 'bug', 'editar', actualizado.id, antes, actualizado)
  return actualizado
}

export async function eliminarBugPm(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_BUGS, id)
  await repositorioOperacion.eliminarBug(id)
  await registrarCambioOperacion(TABLA_BUGS, 'bug', 'eliminar', id, antes, null)
}

export function listarMejorasPm() {
  return repositorioOperacion.listarMejoras()
}

export async function crearMejoraPm(entrada: MejoraEntrada) {
  const creada = await repositorioOperacion.crearMejora(entrada)
  await registrarCambioOperacion(TABLA_MEJORAS, 'mejora', 'crear', creada.id, null, creada)
  return creada
}

export async function editarMejoraPm(id: string, entrada: MejoraEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_MEJORAS, id)
  const actualizada = await repositorioOperacion.editarMejora(id, entrada)
  await registrarCambioOperacion(TABLA_MEJORAS, 'mejora', 'editar', actualizada.id, antes, actualizada)
  return actualizada
}

export async function eliminarMejoraPm(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_MEJORAS, id)
  await repositorioOperacion.eliminarMejora(id)
  await registrarCambioOperacion(TABLA_MEJORAS, 'mejora', 'eliminar', id, antes, null)
}

export function listarDeudaTecnicaPm() {
  return repositorioOperacion.listarDeudaTecnica()
}

export async function crearDeudaTecnicaPm(entrada: DeudaTecnicaEntrada) {
  const creada = await repositorioOperacion.crearDeudaTecnica(entrada)
  await registrarCambioOperacion(TABLA_DEUDA_TECNICA, 'deuda_tecnica', 'crear', creada.id, null, creada)
  return creada
}

export async function editarDeudaTecnicaPm(id: string, entrada: DeudaTecnicaEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_DEUDA_TECNICA, id)
  const actualizada = await repositorioOperacion.editarDeudaTecnica(id, entrada)
  await registrarCambioOperacion(TABLA_DEUDA_TECNICA, 'deuda_tecnica', 'editar', actualizada.id, antes, actualizada)
  return actualizada
}

export async function eliminarDeudaTecnicaPm(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_DEUDA_TECNICA, id)
  await repositorioOperacion.eliminarDeudaTecnica(id)
  await registrarCambioOperacion(TABLA_DEUDA_TECNICA, 'deuda_tecnica', 'eliminar', id, antes, null)
}

export function listarBloqueosPm() {
  return repositorioOperacion.listarBloqueos()
}

export async function crearBloqueoPm(entrada: BloqueoEntrada) {
  const creado = await repositorioOperacion.crearBloqueo(entrada)
  await registrarCambioOperacion(TABLA_BLOQUEOS, 'bloqueo', 'crear', creado.id, null, creado)
  return creado
}

export async function editarBloqueoPm(id: string, entrada: BloqueoEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_BLOQUEOS, id)
  const actualizado = await repositorioOperacion.editarBloqueo(id, entrada)
  await registrarCambioOperacion(TABLA_BLOQUEOS, 'bloqueo', 'editar', actualizado.id, antes, actualizado)
  return actualizado
}

export async function eliminarBloqueoPm(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_BLOQUEOS, id)
  await repositorioOperacion.eliminarBloqueo(id)
  await registrarCambioOperacion(TABLA_BLOQUEOS, 'bloqueo', 'eliminar', id, antes, null)
}

export function listarLeccionesAprendidasPm() {
  return repositorioOperacion.listarLeccionesAprendidas()
}

export async function crearLeccionAprendidaPm(entrada: LeccionAprendidaEntrada) {
  const creada = await repositorioOperacion.crearLeccionAprendida(entrada)
  await registrarCambioOperacion(TABLA_LECCIONES, 'leccion_aprendida', 'crear', creada.id, null, creada)
  return creada
}

export async function editarLeccionAprendidaPm(id: string, entrada: LeccionAprendidaEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_LECCIONES, id)
  const actualizada = await repositorioOperacion.editarLeccionAprendida(id, entrada)
  await registrarCambioOperacion(TABLA_LECCIONES, 'leccion_aprendida', 'editar', actualizada.id, antes, actualizada)
  return actualizada
}

export async function eliminarLeccionAprendidaPm(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_LECCIONES, id)
  await repositorioOperacion.eliminarLeccionAprendida(id)
  await registrarCambioOperacion(TABLA_LECCIONES, 'leccion_aprendida', 'eliminar', id, antes, null)
}

export async function obtenerResumenOperacion() {
  const [bugs, mejoras, deudas, bloqueos, lecciones] = await Promise.all([
    repositorioOperacion.listarBugs(),
    repositorioOperacion.listarMejoras(),
    repositorioOperacion.listarDeudaTecnica(),
    repositorioOperacion.listarBloqueos(),
    repositorioOperacion.listarLeccionesAprendidas()
  ])

  return {
    bugs,
    mejoras,
    deudas,
    bloqueos,
    lecciones
  }
}

export async function listarReferenciasOperacion() {
  const [
    modulos,
    iniciativas,
    entregas,
    releases,
    auditorias,
    hallazgos,
    decisiones,
    insights,
    hipotesisDiscovery
  ] = await Promise.all([
    listarModulosPm(),
    listarIniciativas(),
    listarEntregas(),
    listarReleases(),
    listarAuditoriasPm(),
    listarHallazgosAuditoriaPm(),
    listarDecisionesPm(),
    listarInsightsDiscovery(),
    listarHipotesisDiscovery()
  ])

  return {
    modulos,
    iniciativas,
    entregas,
    releases,
    auditorias,
    hallazgos,
    decisiones,
    insights,
    hipotesisDiscovery
  }
}