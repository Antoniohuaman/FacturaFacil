import type { HealthScoreEntrada, KpiEjecutivoEntrada } from '@/compartido/validacion/esquemas'
import { listarModulosPm, listarEtapasPm, listarVentanasPm } from '@/aplicacion/casos-uso/ajustes'
import { listarAuditoriasPm, listarHallazgosAuditoriaPm } from '@/aplicacion/casos-uso/auditorias'
import { listarDecisionesPm } from '@/aplicacion/casos-uso/decisiones'
import { listarInsightsDiscovery, listarHipotesisDiscovery } from '@/aplicacion/casos-uso/discovery'
import { listarEjecucionesValidacion } from '@/aplicacion/casos-uso/ejecucionesValidacion'
import { listarEntregas } from '@/aplicacion/casos-uso/entregas'
import {
  listarDependenciasPm,
  listarRiesgosPm,
  listarStakeholdersPm
} from '@/aplicacion/casos-uso/gobierno'
import {
  obtenerRegistroTablaPorId,
  registrarCambioEntidadBestEffort
} from '@/aplicacion/casos-uso/historialCambios'
import { listarIniciativas } from '@/aplicacion/casos-uso/iniciativas'
import { listarReleases } from '@/aplicacion/casos-uso/lanzamientos'
import { listarObjetivos } from '@/aplicacion/casos-uso/objetivos'
import {
  listarBloqueosPm,
  listarBugsPm,
  listarDeudaTecnicaPm,
  listarLeccionesAprendidasPm,
  listarMejorasPm
} from '@/aplicacion/casos-uso/operacion'
import {
  listarCasosUso,
  listarHistoriasUsuario,
  listarReglasNegocio,
  listarRequerimientosNoFuncionales
} from '@/aplicacion/casos-uso/requerimientos'
import {
  listarKpisEstrategicos,
  listarObjetivosEstrategicos,
  listarPeriodosEstrategicos
} from '@/aplicacion/casos-uso/estrategia'
import { repositorioAnalitica } from '@/infraestructura/repositorios/repositorioAnalitica'

const MODULO_ANALITICA = 'analitica'
const TABLA_KPIS_EJECUTIVOS = 'pm_kpis_ejecutivos'
const TABLA_HEALTH_SCORES = 'pm_health_scores'

function registrarCambioAnalitica(
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
    moduloCodigo: MODULO_ANALITICA,
    entidad,
    entidadId,
    accion,
    antes,
    despues,
    metadata
  })
}

export function listarKpisEjecutivosPm() {
  return repositorioAnalitica.listarKpisEjecutivos()
}

export async function crearKpiEjecutivoPm(entrada: KpiEjecutivoEntrada) {
  const creado = await repositorioAnalitica.crearKpiEjecutivo(entrada)
  await registrarCambioAnalitica(TABLA_KPIS_EJECUTIVOS, 'kpi_ejecutivo', 'crear', creado.id, null, creado)
  return creado
}

export async function editarKpiEjecutivoPm(id: string, entrada: KpiEjecutivoEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_KPIS_EJECUTIVOS, id)
  const actualizado = await repositorioAnalitica.editarKpiEjecutivo(id, entrada)
  await registrarCambioAnalitica(TABLA_KPIS_EJECUTIVOS, 'kpi_ejecutivo', 'editar', actualizado.id, antes, actualizado)
  return actualizado
}

export async function eliminarKpiEjecutivoPm(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_KPIS_EJECUTIVOS, id)
  await repositorioAnalitica.eliminarKpiEjecutivo(id)
  await registrarCambioAnalitica(TABLA_KPIS_EJECUTIVOS, 'kpi_ejecutivo', 'eliminar', id, antes, null)
}

export function listarHealthScoresPm() {
  return repositorioAnalitica.listarHealthScores()
}

export async function crearHealthScorePm(entrada: HealthScoreEntrada) {
  const creado = await repositorioAnalitica.crearHealthScore(entrada)
  await registrarCambioAnalitica(TABLA_HEALTH_SCORES, 'health_score', 'crear', creado.id, null, creado)
  return creado
}

export async function editarHealthScorePm(id: string, entrada: HealthScoreEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_HEALTH_SCORES, id)
  const actualizado = await repositorioAnalitica.editarHealthScore(id, entrada)
  await registrarCambioAnalitica(TABLA_HEALTH_SCORES, 'health_score', 'editar', actualizado.id, antes, actualizado)
  return actualizado
}

export async function eliminarHealthScorePm(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_HEALTH_SCORES, id)
  await repositorioAnalitica.eliminarHealthScore(id)
  await registrarCambioAnalitica(TABLA_HEALTH_SCORES, 'health_score', 'eliminar', id, antes, null)
}

export async function listarReferenciasAnalitica() {
  const [modulos, ventanas, etapas] = await Promise.all([
    listarModulosPm(),
    listarVentanasPm(),
    listarEtapasPm()
  ])

  return {
    modulos,
    ventanas,
    etapas
  }
}

export async function obtenerFuentesResumenAnalitico() {
  const [
    modulos,
    objetivos,
    iniciativas,
    entregas,
    releases,
    bugs,
    mejoras,
    deudas,
    bloqueos,
    lecciones,
    ejecuciones,
    decisiones,
    auditorias,
    hallazgos,
    stakeholders,
    riesgosGobierno,
    dependenciasGobierno,
    healthScores,
    periodosEstrategicos,
    objetivosEstrategicos,
    kpisEstrategicos,
    insights,
    hipotesisDiscovery,
    historias,
    casosUso,
    reglasNegocio,
    requerimientosNoFuncionales
  ] = await Promise.all([
    listarModulosPm(),
    listarObjetivos(),
    listarIniciativas(),
    listarEntregas(),
    listarReleases(),
    listarBugsPm(),
    listarMejorasPm(),
    listarDeudaTecnicaPm(),
    listarBloqueosPm(),
    listarLeccionesAprendidasPm(),
    listarEjecucionesValidacion(),
    listarDecisionesPm(),
    listarAuditoriasPm(),
    listarHallazgosAuditoriaPm(),
    listarStakeholdersPm(),
    listarRiesgosPm(),
    listarDependenciasPm(),
    listarHealthScoresPm(),
    listarPeriodosEstrategicos(),
    listarObjetivosEstrategicos(),
    listarKpisEstrategicos(),
    listarInsightsDiscovery(),
    listarHipotesisDiscovery(),
    listarHistoriasUsuario(),
    listarCasosUso(),
    listarReglasNegocio(),
    listarRequerimientosNoFuncionales()
  ])

  return {
    modulos,
    objetivos,
    iniciativas,
    entregas,
    releases,
    bugs,
    mejoras,
    deudas,
    bloqueos,
    lecciones,
    ejecuciones,
    decisiones,
    auditorias,
    hallazgos,
    stakeholders,
    riesgosGobierno,
    dependenciasGobierno,
    healthScores,
    periodosEstrategicos,
    objetivosEstrategicos,
    kpisEstrategicos,
    insights,
    hipotesisDiscovery,
    historias,
    casosUso,
    reglasNegocio,
    requerimientosNoFuncionales
  }
}

export async function obtenerFuentesPortafolioAnalitica() {
  const [modulos, ventanas, etapas, iniciativas, entregas, releases, bugs, mejoras, deudas, bloqueos, hallazgos, healthScores] =
    await Promise.all([
      listarModulosPm(),
      listarVentanasPm(),
      listarEtapasPm(),
      listarIniciativas(),
      listarEntregas(),
      listarReleases(),
      listarBugsPm(),
      listarMejorasPm(),
      listarDeudaTecnicaPm(),
      listarBloqueosPm(),
      listarHallazgosAuditoriaPm(),
      listarHealthScoresPm()
    ])

  return {
    modulos,
    ventanas,
    etapas,
    iniciativas,
    entregas,
    releases,
    bugs,
    mejoras,
    deudas,
    bloqueos,
    hallazgos,
    healthScores
  }
}

export async function obtenerFuentesTendenciasAnalitica() {
  const [releases, bugs, mejoras, deudas, ejecuciones, decisiones, hallazgos] = await Promise.all([
    listarReleases(),
    listarBugsPm(),
    listarMejorasPm(),
    listarDeudaTecnicaPm(),
    listarEjecucionesValidacion(),
    listarDecisionesPm(),
    listarHallazgosAuditoriaPm()
  ])

  return {
    releases,
    bugs,
    mejoras,
    deudas,
    ejecuciones,
    decisiones,
    hallazgos
  }
}