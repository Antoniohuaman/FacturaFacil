import type {
  HipotesisDiscoveryEntrada,
  InsightDiscoveryEntrada,
  InvestigacionDiscoveryEntrada,
  ProblemaOportunidadDiscoveryEntrada,
  SegmentoDiscoveryEntrada
} from '@/compartido/validacion/esquemas'
import type {
  RelHipotesisDiscoveryIniciativaPm,
  RelInsightDecisionPm,
  RelInsightProblemaPm,
  RelInvestigacionInsightPm,
  RelProblemaObjetivoEstrategicoPm
} from '@/dominio/modelos'
import { repositorioDiscovery } from '@/infraestructura/repositorios/repositorioDiscovery'
import { obtenerRegistroTablaPorId, registrarCambioEntidadBestEffort } from '@/aplicacion/casos-uso/historialCambios'

const MODULO_DISCOVERY = 'discovery'
const TABLA_SEGMENTOS = 'pm_segmentos'
const TABLA_INSIGHTS = 'pm_insights'
const TABLA_PROBLEMAS = 'pm_problemas_oportunidades'
const TABLA_INVESTIGACIONES = 'pm_investigaciones'
const TABLA_HIPOTESIS = 'pm_hipotesis_discovery'
const TABLA_REL_INSIGHT_PROBLEMA = 'pm_rel_insight_problema'
const TABLA_REL_INVESTIGACION_INSIGHT = 'pm_rel_investigacion_insight'
const TABLA_REL_HIPOTESIS_INICIATIVA = 'pm_rel_hipotesis_discovery_iniciativa'
const TABLA_REL_PROBLEMA_OBJETIVO = 'pm_rel_problema_objetivo_estrategico'
const TABLA_REL_INSIGHT_DECISION = 'pm_rel_insight_decision'

function registrarCambioDiscovery(
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
    moduloCodigo: MODULO_DISCOVERY,
    entidad,
    entidadId,
    accion,
    antes,
    despues,
    metadata
  })
}

async function registrarCambiosRelaciones<TRel extends { id: string }>(opciones: {
  tabla: string
  entidad: string
  previas: TRel[]
  actuales: TRel[]
  obtenerClave: (relacion: TRel) => string
}) {
  const { tabla, entidad, previas, actuales, obtenerClave } = opciones
  const previasPorClave = new Map(previas.map((relacion) => [obtenerClave(relacion), relacion]))
  const actualesPorClave = new Map(actuales.map((relacion) => [obtenerClave(relacion), relacion]))
  const tareas: Promise<unknown>[] = []

  for (const [clave, relacion] of actualesPorClave) {
    if (!previasPorClave.has(clave)) {
      tareas.push(registrarCambioDiscovery(tabla, entidad, 'crear', relacion.id, null, relacion))
    }
  }

  for (const [clave, relacion] of previasPorClave) {
    if (!actualesPorClave.has(clave)) {
      tareas.push(registrarCambioDiscovery(tabla, entidad, 'eliminar', relacion.id, relacion, null))
    }
  }

  await Promise.all(tareas)
}

export function listarSegmentosDiscovery() {
  return repositorioDiscovery.listarSegmentos()
}

export async function crearSegmentoDiscovery(entrada: SegmentoDiscoveryEntrada) {
  const creado = await repositorioDiscovery.crearSegmento(entrada)
  await registrarCambioDiscovery(TABLA_SEGMENTOS, 'segmento_discovery', 'crear', creado.id, null, creado)
  return creado
}

export async function editarSegmentoDiscovery(id: string, entrada: SegmentoDiscoveryEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_SEGMENTOS, id)
  const actualizado = await repositorioDiscovery.editarSegmento(id, entrada)
  await registrarCambioDiscovery(TABLA_SEGMENTOS, 'segmento_discovery', 'editar', actualizado.id, antes, actualizado)
  return actualizado
}

export async function eliminarSegmentoDiscovery(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_SEGMENTOS, id)
  await repositorioDiscovery.eliminarSegmento(id)
  await registrarCambioDiscovery(TABLA_SEGMENTOS, 'segmento_discovery', 'eliminar', id, antes)
}

export function listarInsightsDiscovery() {
  return repositorioDiscovery.listarInsights()
}

export async function crearInsightDiscovery(
  entrada: InsightDiscoveryEntrada,
  problemaIds: string[] = [],
  decisionIds: string[] = []
) {
  const creado = await repositorioDiscovery.crearInsight(entrada)
  const [relProblemas, relDecisiones] = await Promise.all([
    repositorioDiscovery.sincronizarRelInsightProblema(creado.id, problemaIds),
    repositorioDiscovery.sincronizarRelInsightDecision(creado.id, decisionIds)
  ])

  await Promise.all([
    registrarCambioDiscovery(TABLA_INSIGHTS, 'insight', 'crear', creado.id, null, creado, {
      problema_ids: problemaIds,
      decision_ids: decisionIds
    }),
    registrarCambiosRelaciones<RelInsightProblemaPm>({
      tabla: TABLA_REL_INSIGHT_PROBLEMA,
      entidad: 'rel_insight_problema',
      previas: relProblemas.previas,
      actuales: relProblemas.actuales,
      obtenerClave: (relacion) => relacion.problema_oportunidad_id
    }),
    registrarCambiosRelaciones<RelInsightDecisionPm>({
      tabla: TABLA_REL_INSIGHT_DECISION,
      entidad: 'rel_insight_decision',
      previas: relDecisiones.previas,
      actuales: relDecisiones.actuales,
      obtenerClave: (relacion) => relacion.decision_id
    })
  ])

  return creado
}

export async function editarInsightDiscovery(
  id: string,
  entrada: InsightDiscoveryEntrada,
  problemaIds: string[] = [],
  decisionIds: string[] = []
) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_INSIGHTS, id)
  const actualizado = await repositorioDiscovery.editarInsight(id, entrada)
  const [relProblemas, relDecisiones] = await Promise.all([
    repositorioDiscovery.sincronizarRelInsightProblema(actualizado.id, problemaIds),
    repositorioDiscovery.sincronizarRelInsightDecision(actualizado.id, decisionIds)
  ])

  await Promise.all([
    registrarCambioDiscovery(TABLA_INSIGHTS, 'insight', 'editar', actualizado.id, antes, actualizado, {
      problema_ids: problemaIds,
      decision_ids: decisionIds
    }),
    registrarCambiosRelaciones<RelInsightProblemaPm>({
      tabla: TABLA_REL_INSIGHT_PROBLEMA,
      entidad: 'rel_insight_problema',
      previas: relProblemas.previas,
      actuales: relProblemas.actuales,
      obtenerClave: (relacion) => relacion.problema_oportunidad_id
    }),
    registrarCambiosRelaciones<RelInsightDecisionPm>({
      tabla: TABLA_REL_INSIGHT_DECISION,
      entidad: 'rel_insight_decision',
      previas: relDecisiones.previas,
      actuales: relDecisiones.actuales,
      obtenerClave: (relacion) => relacion.decision_id
    })
  ])

  return actualizado
}

export async function eliminarInsightDiscovery(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_INSIGHTS, id)
  await repositorioDiscovery.eliminarInsight(id)
  await registrarCambioDiscovery(TABLA_INSIGHTS, 'insight', 'eliminar', id, antes)
}

export function listarProblemasOportunidadesDiscovery() {
  return repositorioDiscovery.listarProblemasOportunidades()
}

export async function crearProblemaOportunidadDiscovery(
  entrada: ProblemaOportunidadDiscoveryEntrada,
  insightIds: string[] = [],
  objetivoIds: string[] = []
) {
  const creado = await repositorioDiscovery.crearProblemaOportunidad(entrada)
  const [relInsights, relObjetivos] = await Promise.all([
    repositorioDiscovery.sincronizarRelProblemaInsight(creado.id, insightIds),
    repositorioDiscovery.sincronizarRelProblemaObjetivoEstrategico(creado.id, objetivoIds)
  ])

  await Promise.all([
    registrarCambioDiscovery(TABLA_PROBLEMAS, 'problema_oportunidad', 'crear', creado.id, null, creado, {
      insight_ids: insightIds,
      objetivo_estrategico_ids: objetivoIds
    }),
    registrarCambiosRelaciones<RelInsightProblemaPm>({
      tabla: TABLA_REL_INSIGHT_PROBLEMA,
      entidad: 'rel_insight_problema',
      previas: relInsights.previas,
      actuales: relInsights.actuales,
      obtenerClave: (relacion) => relacion.insight_id
    }),
    registrarCambiosRelaciones<RelProblemaObjetivoEstrategicoPm>({
      tabla: TABLA_REL_PROBLEMA_OBJETIVO,
      entidad: 'rel_problema_objetivo_estrategico',
      previas: relObjetivos.previas,
      actuales: relObjetivos.actuales,
      obtenerClave: (relacion) => relacion.objetivo_estrategico_id
    })
  ])

  return creado
}

export async function editarProblemaOportunidadDiscovery(
  id: string,
  entrada: ProblemaOportunidadDiscoveryEntrada,
  insightIds: string[] = [],
  objetivoIds: string[] = []
) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_PROBLEMAS, id)
  const actualizado = await repositorioDiscovery.editarProblemaOportunidad(id, entrada)
  const [relInsights, relObjetivos] = await Promise.all([
    repositorioDiscovery.sincronizarRelProblemaInsight(actualizado.id, insightIds),
    repositorioDiscovery.sincronizarRelProblemaObjetivoEstrategico(actualizado.id, objetivoIds)
  ])

  await Promise.all([
    registrarCambioDiscovery(TABLA_PROBLEMAS, 'problema_oportunidad', 'editar', actualizado.id, antes, actualizado, {
      insight_ids: insightIds,
      objetivo_estrategico_ids: objetivoIds
    }),
    registrarCambiosRelaciones<RelInsightProblemaPm>({
      tabla: TABLA_REL_INSIGHT_PROBLEMA,
      entidad: 'rel_insight_problema',
      previas: relInsights.previas,
      actuales: relInsights.actuales,
      obtenerClave: (relacion) => relacion.insight_id
    }),
    registrarCambiosRelaciones<RelProblemaObjetivoEstrategicoPm>({
      tabla: TABLA_REL_PROBLEMA_OBJETIVO,
      entidad: 'rel_problema_objetivo_estrategico',
      previas: relObjetivos.previas,
      actuales: relObjetivos.actuales,
      obtenerClave: (relacion) => relacion.objetivo_estrategico_id
    })
  ])

  return actualizado
}

export async function eliminarProblemaOportunidadDiscovery(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_PROBLEMAS, id)
  await repositorioDiscovery.eliminarProblemaOportunidad(id)
  await registrarCambioDiscovery(TABLA_PROBLEMAS, 'problema_oportunidad', 'eliminar', id, antes)
}

export function listarInvestigacionesDiscovery() {
  return repositorioDiscovery.listarInvestigaciones()
}

export async function crearInvestigacionDiscovery(
  entrada: InvestigacionDiscoveryEntrada,
  insightIds: string[] = []
) {
  const creada = await repositorioDiscovery.crearInvestigacion(entrada)
  const relaciones = await repositorioDiscovery.sincronizarRelInvestigacionInsight(creada.id, insightIds)

  await Promise.all([
    registrarCambioDiscovery(TABLA_INVESTIGACIONES, 'investigacion', 'crear', creada.id, null, creada, {
      insight_ids: insightIds
    }),
    registrarCambiosRelaciones<RelInvestigacionInsightPm>({
      tabla: TABLA_REL_INVESTIGACION_INSIGHT,
      entidad: 'rel_investigacion_insight',
      previas: relaciones.previas,
      actuales: relaciones.actuales,
      obtenerClave: (relacion) => relacion.insight_id
    })
  ])

  return creada
}

export async function editarInvestigacionDiscovery(
  id: string,
  entrada: InvestigacionDiscoveryEntrada,
  insightIds: string[] = []
) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_INVESTIGACIONES, id)
  const actualizada = await repositorioDiscovery.editarInvestigacion(id, entrada)
  const relaciones = await repositorioDiscovery.sincronizarRelInvestigacionInsight(actualizada.id, insightIds)

  await Promise.all([
    registrarCambioDiscovery(TABLA_INVESTIGACIONES, 'investigacion', 'editar', actualizada.id, antes, actualizada, {
      insight_ids: insightIds
    }),
    registrarCambiosRelaciones<RelInvestigacionInsightPm>({
      tabla: TABLA_REL_INVESTIGACION_INSIGHT,
      entidad: 'rel_investigacion_insight',
      previas: relaciones.previas,
      actuales: relaciones.actuales,
      obtenerClave: (relacion) => relacion.insight_id
    })
  ])

  return actualizada
}

export async function eliminarInvestigacionDiscovery(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_INVESTIGACIONES, id)
  await repositorioDiscovery.eliminarInvestigacion(id)
  await registrarCambioDiscovery(TABLA_INVESTIGACIONES, 'investigacion', 'eliminar', id, antes)
}

export function listarHipotesisDiscovery() {
  return repositorioDiscovery.listarHipotesisDiscovery()
}

export async function crearHipotesisDiscovery(
  entrada: HipotesisDiscoveryEntrada,
  iniciativaIds: string[] = []
) {
  const creada = await repositorioDiscovery.crearHipotesisDiscovery(entrada)
  const relaciones = await repositorioDiscovery.sincronizarRelHipotesisDiscoveryIniciativa(creada.id, iniciativaIds)

  await Promise.all([
    registrarCambioDiscovery(TABLA_HIPOTESIS, 'hipotesis_discovery', 'crear', creada.id, null, creada, {
      iniciativa_ids: iniciativaIds
    }),
    registrarCambiosRelaciones<RelHipotesisDiscoveryIniciativaPm>({
      tabla: TABLA_REL_HIPOTESIS_INICIATIVA,
      entidad: 'rel_hipotesis_discovery_iniciativa',
      previas: relaciones.previas,
      actuales: relaciones.actuales,
      obtenerClave: (relacion) => relacion.iniciativa_id
    })
  ])

  return creada
}

export async function editarHipotesisDiscovery(
  id: string,
  entrada: HipotesisDiscoveryEntrada,
  iniciativaIds: string[] = []
) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_HIPOTESIS, id)
  const actualizada = await repositorioDiscovery.editarHipotesisDiscovery(id, entrada)
  const relaciones = await repositorioDiscovery.sincronizarRelHipotesisDiscoveryIniciativa(actualizada.id, iniciativaIds)

  await Promise.all([
    registrarCambioDiscovery(TABLA_HIPOTESIS, 'hipotesis_discovery', 'editar', actualizada.id, antes, actualizada, {
      iniciativa_ids: iniciativaIds
    }),
    registrarCambiosRelaciones<RelHipotesisDiscoveryIniciativaPm>({
      tabla: TABLA_REL_HIPOTESIS_INICIATIVA,
      entidad: 'rel_hipotesis_discovery_iniciativa',
      previas: relaciones.previas,
      actuales: relaciones.actuales,
      obtenerClave: (relacion) => relacion.iniciativa_id
    })
  ])

  return actualizada
}

export async function eliminarHipotesisDiscovery(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_HIPOTESIS, id)
  await repositorioDiscovery.eliminarHipotesisDiscovery(id)
  await registrarCambioDiscovery(TABLA_HIPOTESIS, 'hipotesis_discovery', 'eliminar', id, antes)
}

export function listarRelInsightProblema() {
  return repositorioDiscovery.listarRelInsightProblema()
}

export function listarRelInvestigacionInsight() {
  return repositorioDiscovery.listarRelInvestigacionInsight()
}

export function listarRelHipotesisDiscoveryIniciativa() {
  return repositorioDiscovery.listarRelHipotesisDiscoveryIniciativa()
}

export function listarRelProblemaObjetivoEstrategico() {
  return repositorioDiscovery.listarRelProblemaObjetivoEstrategico()
}

export function listarRelInsightDecision() {
  return repositorioDiscovery.listarRelInsightDecision()
}