import type {
  DependenciaEntrada,
  RiesgoEntrada,
  StakeholderEntrada
} from '@/compartido/validacion/esquemas'
import { listarModulosPm } from '@/aplicacion/casos-uso/ajustes'
import { listarAuditoriasPm } from '@/aplicacion/casos-uso/auditorias'
import { listarDecisionesPm } from '@/aplicacion/casos-uso/decisiones'
import { listarEntregas } from '@/aplicacion/casos-uso/entregas'
import {
  obtenerRegistroTablaPorId,
  registrarCambioEntidadBestEffort
} from '@/aplicacion/casos-uso/historialCambios'
import { listarIniciativas } from '@/aplicacion/casos-uso/iniciativas'
import { listarReleases } from '@/aplicacion/casos-uso/lanzamientos'
import { repositorioGobierno } from '@/infraestructura/repositorios/repositorioGobierno'

const MODULO_GOBIERNO = 'gobierno'
const TABLA_STAKEHOLDERS = 'pm_stakeholders'
const TABLA_RIESGOS = 'pm_riesgos'
const TABLA_DEPENDENCIAS = 'pm_dependencias'

function registrarCambioGobierno(
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
    moduloCodigo: MODULO_GOBIERNO,
    entidad,
    entidadId,
    accion,
    antes,
    despues,
    metadata
  })
}

export function listarStakeholdersPm() {
  return repositorioGobierno.listarStakeholders()
}

export async function crearStakeholderPm(entrada: StakeholderEntrada) {
  const creado = await repositorioGobierno.crearStakeholder(entrada)
  await registrarCambioGobierno(TABLA_STAKEHOLDERS, 'stakeholder', 'crear', creado.id, null, creado)
  return creado
}

export async function editarStakeholderPm(id: string, entrada: StakeholderEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_STAKEHOLDERS, id)
  const actualizado = await repositorioGobierno.editarStakeholder(id, entrada)
  await registrarCambioGobierno(TABLA_STAKEHOLDERS, 'stakeholder', 'editar', actualizado.id, antes, actualizado)
  return actualizado
}

export async function eliminarStakeholderPm(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_STAKEHOLDERS, id)
  await repositorioGobierno.eliminarStakeholder(id)
  await registrarCambioGobierno(TABLA_STAKEHOLDERS, 'stakeholder', 'eliminar', id, antes, null)
}

export function listarRiesgosPm() {
  return repositorioGobierno.listarRiesgos()
}

export async function crearRiesgoPm(entrada: RiesgoEntrada) {
  const creado = await repositorioGobierno.crearRiesgo(entrada)
  await registrarCambioGobierno(TABLA_RIESGOS, 'riesgo', 'crear', creado.id, null, creado)
  return creado
}

export async function editarRiesgoPm(id: string, entrada: RiesgoEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_RIESGOS, id)
  const actualizado = await repositorioGobierno.editarRiesgo(id, entrada)
  await registrarCambioGobierno(TABLA_RIESGOS, 'riesgo', 'editar', actualizado.id, antes, actualizado)
  return actualizado
}

export async function eliminarRiesgoPm(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_RIESGOS, id)
  await repositorioGobierno.eliminarRiesgo(id)
  await registrarCambioGobierno(TABLA_RIESGOS, 'riesgo', 'eliminar', id, antes, null)
}

export function listarDependenciasPm() {
  return repositorioGobierno.listarDependencias()
}

export async function crearDependenciaPm(entrada: DependenciaEntrada) {
  const creada = await repositorioGobierno.crearDependencia(entrada)
  await registrarCambioGobierno(TABLA_DEPENDENCIAS, 'dependencia', 'crear', creada.id, null, creada)
  return creada
}

export async function editarDependenciaPm(id: string, entrada: DependenciaEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_DEPENDENCIAS, id)
  const actualizada = await repositorioGobierno.editarDependencia(id, entrada)
  await registrarCambioGobierno(TABLA_DEPENDENCIAS, 'dependencia', 'editar', actualizada.id, antes, actualizada)
  return actualizada
}

export async function eliminarDependenciaPm(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_DEPENDENCIAS, id)
  await repositorioGobierno.eliminarDependencia(id)
  await registrarCambioGobierno(TABLA_DEPENDENCIAS, 'dependencia', 'eliminar', id, antes, null)
}

export async function obtenerResumenGobierno() {
  const [stakeholders, riesgos, dependencias] = await Promise.all([
    repositorioGobierno.listarStakeholders(),
    repositorioGobierno.listarRiesgos(),
    repositorioGobierno.listarDependencias()
  ])

  return {
    stakeholders,
    riesgos,
    dependencias
  }
}

export async function listarReferenciasGobierno() {
  const [modulos, iniciativas, entregas, releases, decisiones, auditorias] = await Promise.all([
    listarModulosPm(),
    listarIniciativas(),
    listarEntregas(),
    listarReleases(),
    listarDecisionesPm(),
    listarAuditoriasPm()
  ])

  return {
    modulos,
    iniciativas,
    entregas,
    releases,
    decisiones,
    auditorias
  }
}