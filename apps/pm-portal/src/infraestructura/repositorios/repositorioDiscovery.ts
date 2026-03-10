import type {
  HipotesisDiscoveryPm,
  InsightDiscoveryPm,
  InvestigacionDiscoveryPm,
  ProblemaOportunidadDiscoveryPm,
  RelHipotesisDiscoveryIniciativaPm,
  RelInsightDecisionPm,
  RelInsightProblemaPm,
  RelInvestigacionInsightPm,
  RelProblemaObjetivoEstrategicoPm,
  SegmentoDiscoveryPm
} from '@/dominio/modelos'
import type {
  HipotesisDiscoveryEntrada,
  InsightDiscoveryEntrada,
  InvestigacionDiscoveryEntrada,
  ProblemaOportunidadDiscoveryEntrada,
  SegmentoDiscoveryEntrada
} from '@/compartido/validacion/esquemas'
import { clienteSupabase } from '@/infraestructura/supabase/clienteSupabase'

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

function normalizarNulos<T extends Record<string, unknown>>(entrada: T) {
  return Object.fromEntries(
    Object.entries(entrada).map(([clave, valor]) => [clave, valor === '' ? null : valor])
  ) as T
}

function depurarIds(ids: string[]) {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
}

async function sincronizarRelaciones<TRel extends { id: string }>(
  tabla: string,
  columnaBase: string,
  baseId: string,
  columnaRelacion: string,
  idsRelacionados: string[]
) {
  const { data: previas, error: errorPrevias } = await clienteSupabase
    .from(tabla)
    .select('*')
    .eq(columnaBase, baseId)

  if (errorPrevias) {
    throw new Error(errorPrevias.message)
  }

  const { error: errorEliminar } = await clienteSupabase.from(tabla).delete().eq(columnaBase, baseId)

  if (errorEliminar) {
    throw new Error(errorEliminar.message)
  }

  const idsDepurados = depurarIds(idsRelacionados)

  if (idsDepurados.length === 0) {
    return {
      previas: (previas ?? []) as TRel[],
      actuales: [] as TRel[]
    }
  }

  const { data, error } = await clienteSupabase
    .from(tabla)
    .insert(idsDepurados.map((idRelacionado) => ({ [columnaBase]: baseId, [columnaRelacion]: idRelacionado })))
    .select('*')

  if (error) {
    throw new Error(error.message)
  }

  return {
    previas: (previas ?? []) as TRel[],
    actuales: (data ?? []) as TRel[]
  }
}

export const repositorioDiscovery = {
  async listarSegmentos() {
    const { data, error } = await clienteSupabase
      .from(TABLA_SEGMENTOS)
      .select('*')
      .order('activo', { ascending: false })
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as SegmentoDiscoveryPm[]
  },

  async crearSegmento(entrada: SegmentoDiscoveryEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_SEGMENTOS)
      .insert(normalizarNulos(entrada))
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as SegmentoDiscoveryPm
  },

  async editarSegmento(id: string, entrada: SegmentoDiscoveryEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_SEGMENTOS)
      .update(normalizarNulos(entrada))
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as SegmentoDiscoveryPm
  },

  async eliminarSegmento(id: string) {
    const { error } = await clienteSupabase.from(TABLA_SEGMENTOS).delete().eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  },

  async listarInsights() {
    const { data, error } = await clienteSupabase
      .from(TABLA_INSIGHTS)
      .select('*')
      .order('fecha_hallazgo', { ascending: false })
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as InsightDiscoveryPm[]
  },

  async crearInsight(entrada: InsightDiscoveryEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_INSIGHTS)
      .insert(normalizarNulos(entrada))
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as InsightDiscoveryPm
  },

  async editarInsight(id: string, entrada: InsightDiscoveryEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_INSIGHTS)
      .update(normalizarNulos(entrada))
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as InsightDiscoveryPm
  },

  async eliminarInsight(id: string) {
    const { error } = await clienteSupabase.from(TABLA_INSIGHTS).delete().eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  },

  async listarProblemasOportunidades() {
    const { data, error } = await clienteSupabase
      .from(TABLA_PROBLEMAS)
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as ProblemaOportunidadDiscoveryPm[]
  },

  async crearProblemaOportunidad(entrada: ProblemaOportunidadDiscoveryEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_PROBLEMAS)
      .insert(normalizarNulos(entrada))
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as ProblemaOportunidadDiscoveryPm
  },

  async editarProblemaOportunidad(id: string, entrada: ProblemaOportunidadDiscoveryEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_PROBLEMAS)
      .update(normalizarNulos(entrada))
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as ProblemaOportunidadDiscoveryPm
  },

  async eliminarProblemaOportunidad(id: string) {
    const { error } = await clienteSupabase.from(TABLA_PROBLEMAS).delete().eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  },

  async listarInvestigaciones() {
    const { data, error } = await clienteSupabase
      .from(TABLA_INVESTIGACIONES)
      .select('*')
      .order('fecha_investigacion', { ascending: false })
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as InvestigacionDiscoveryPm[]
  },

  async crearInvestigacion(entrada: InvestigacionDiscoveryEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_INVESTIGACIONES)
      .insert(normalizarNulos(entrada))
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as InvestigacionDiscoveryPm
  },

  async editarInvestigacion(id: string, entrada: InvestigacionDiscoveryEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_INVESTIGACIONES)
      .update(normalizarNulos(entrada))
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as InvestigacionDiscoveryPm
  },

  async eliminarInvestigacion(id: string) {
    const { error } = await clienteSupabase.from(TABLA_INVESTIGACIONES).delete().eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  },

  async listarHipotesisDiscovery() {
    const { data, error } = await clienteSupabase
      .from(TABLA_HIPOTESIS)
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as HipotesisDiscoveryPm[]
  },

  async crearHipotesisDiscovery(entrada: HipotesisDiscoveryEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_HIPOTESIS)
      .insert(normalizarNulos(entrada))
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as HipotesisDiscoveryPm
  },

  async editarHipotesisDiscovery(id: string, entrada: HipotesisDiscoveryEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_HIPOTESIS)
      .update(normalizarNulos(entrada))
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as HipotesisDiscoveryPm
  },

  async eliminarHipotesisDiscovery(id: string) {
    const { error } = await clienteSupabase.from(TABLA_HIPOTESIS).delete().eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  },

  async listarRelInsightProblema() {
    const { data, error } = await clienteSupabase.from(TABLA_REL_INSIGHT_PROBLEMA).select('*')

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as RelInsightProblemaPm[]
  },

  async listarRelInvestigacionInsight() {
    const { data, error } = await clienteSupabase.from(TABLA_REL_INVESTIGACION_INSIGHT).select('*')

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as RelInvestigacionInsightPm[]
  },

  async listarRelHipotesisDiscoveryIniciativa() {
    const { data, error } = await clienteSupabase.from(TABLA_REL_HIPOTESIS_INICIATIVA).select('*')

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as RelHipotesisDiscoveryIniciativaPm[]
  },

  async listarRelProblemaObjetivoEstrategico() {
    const { data, error } = await clienteSupabase.from(TABLA_REL_PROBLEMA_OBJETIVO).select('*')

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as RelProblemaObjetivoEstrategicoPm[]
  },

  async listarRelInsightDecision() {
    const { data, error } = await clienteSupabase.from(TABLA_REL_INSIGHT_DECISION).select('*')

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as RelInsightDecisionPm[]
  },

  sincronizarRelInsightProblema(insightId: string, problemaIds: string[]) {
    return sincronizarRelaciones<RelInsightProblemaPm>(
      TABLA_REL_INSIGHT_PROBLEMA,
      'insight_id',
      insightId,
      'problema_oportunidad_id',
      problemaIds
    )
  },

  sincronizarRelProblemaInsight(problemaId: string, insightIds: string[]) {
    return sincronizarRelaciones<RelInsightProblemaPm>(
      TABLA_REL_INSIGHT_PROBLEMA,
      'problema_oportunidad_id',
      problemaId,
      'insight_id',
      insightIds
    )
  },

  sincronizarRelInvestigacionInsight(investigacionId: string, insightIds: string[]) {
    return sincronizarRelaciones<RelInvestigacionInsightPm>(
      TABLA_REL_INVESTIGACION_INSIGHT,
      'investigacion_id',
      investigacionId,
      'insight_id',
      insightIds
    )
  },

  sincronizarRelHipotesisDiscoveryIniciativa(hipotesisId: string, iniciativaIds: string[]) {
    return sincronizarRelaciones<RelHipotesisDiscoveryIniciativaPm>(
      TABLA_REL_HIPOTESIS_INICIATIVA,
      'hipotesis_discovery_id',
      hipotesisId,
      'iniciativa_id',
      iniciativaIds
    )
  },

  sincronizarRelProblemaObjetivoEstrategico(problemaId: string, objetivoIds: string[]) {
    return sincronizarRelaciones<RelProblemaObjetivoEstrategicoPm>(
      TABLA_REL_PROBLEMA_OBJETIVO,
      'problema_oportunidad_id',
      problemaId,
      'objetivo_estrategico_id',
      objetivoIds
    )
  },

  sincronizarRelInsightDecision(insightId: string, decisionIds: string[]) {
    return sincronizarRelaciones<RelInsightDecisionPm>(
      TABLA_REL_INSIGHT_DECISION,
      'insight_id',
      insightId,
      'decision_id',
      decisionIds
    )
  }
}