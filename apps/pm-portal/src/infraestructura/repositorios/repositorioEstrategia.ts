import type {
  HipotesisPm,
  KeyResultPm,
  KpiEstrategicoPm,
  ObjetivoEstrategicoPm,
  PeriodoEstrategicoPm,
  RelIniciativaHipotesisPm,
  RelIniciativaKrPm,
  RelObjetivoRoadmapKrPm
} from '@/dominio/modelos'
import type {
  HipotesisEntrada,
  KeyResultEntrada,
  KpiEstrategicoEntrada,
  ObjetivoEstrategicoEntrada,
  PeriodoEstrategicoEntrada
} from '@/compartido/validacion/esquemas'
import { clienteSupabase } from '@/infraestructura/supabase/clienteSupabase'

const TABLA_PERIODOS = 'pm_periodos_estrategicos'
const TABLA_OBJETIVOS = 'pm_objetivos_estrategicos'
const TABLA_KR = 'pm_key_results'
const TABLA_KPIS = 'pm_kpis_estrategicos'
const TABLA_HIPOTESIS = 'pm_hipotesis'
const TABLA_REL_OBJETIVOS = 'pm_rel_objetivo_roadmap_kr'
const TABLA_REL_INICIATIVA_KR = 'pm_rel_iniciativa_kr'
const TABLA_REL_INICIATIVA_HIPOTESIS = 'pm_rel_iniciativa_hipotesis'

function normalizarNulos<T extends Record<string, unknown>>(entrada: T) {
  return Object.fromEntries(
    Object.entries(entrada).map(([clave, valor]) => [clave, valor === '' ? null : valor])
  ) as T
}

export const repositorioEstrategia = {
  async listarPeriodos() {
    const { data, error } = await clienteSupabase
      .from(TABLA_PERIODOS)
      .select('*')
      .order('activo', { ascending: false })
      .order('fecha_inicio', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as PeriodoEstrategicoPm[]
  },

  async crearPeriodo(entrada: PeriodoEstrategicoEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_PERIODOS)
      .insert(normalizarNulos(entrada))
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as PeriodoEstrategicoPm
  },

  async editarPeriodo(id: string, entrada: PeriodoEstrategicoEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_PERIODOS)
      .update(normalizarNulos(entrada))
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as PeriodoEstrategicoPm
  },

  async eliminarPeriodo(id: string) {
    const { error } = await clienteSupabase.from(TABLA_PERIODOS).delete().eq('id', id)
    if (error) {
      throw new Error(error.message)
    }
  },

  async listarObjetivos() {
    const { data, error } = await clienteSupabase
      .from(TABLA_OBJETIVOS)
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as ObjetivoEstrategicoPm[]
  },

  async crearObjetivo(entrada: ObjetivoEstrategicoEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_OBJETIVOS)
      .insert(normalizarNulos(entrada))
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as ObjetivoEstrategicoPm
  },

  async editarObjetivo(id: string, entrada: ObjetivoEstrategicoEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_OBJETIVOS)
      .update(normalizarNulos(entrada))
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as ObjetivoEstrategicoPm
  },

  async eliminarObjetivo(id: string) {
    const { error } = await clienteSupabase.from(TABLA_OBJETIVOS).delete().eq('id', id)
    if (error) {
      throw new Error(error.message)
    }
  },

  async listarKeyResults() {
    const { data, error } = await clienteSupabase
      .from(TABLA_KR)
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as KeyResultPm[]
  },

  async crearKeyResult(entrada: KeyResultEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_KR)
      .insert(normalizarNulos(entrada))
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as KeyResultPm
  },

  async editarKeyResult(id: string, entrada: KeyResultEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_KR)
      .update(normalizarNulos(entrada))
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as KeyResultPm
  },

  async eliminarKeyResult(id: string) {
    const { error } = await clienteSupabase.from(TABLA_KR).delete().eq('id', id)
    if (error) {
      throw new Error(error.message)
    }
  },

  async listarKpis() {
    const { data, error } = await clienteSupabase
      .from(TABLA_KPIS)
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as KpiEstrategicoPm[]
  },

  async crearKpi(entrada: KpiEstrategicoEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_KPIS)
      .insert(normalizarNulos(entrada))
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as KpiEstrategicoPm
  },

  async editarKpi(id: string, entrada: KpiEstrategicoEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_KPIS)
      .update(normalizarNulos(entrada))
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as KpiEstrategicoPm
  },

  async eliminarKpi(id: string) {
    const { error } = await clienteSupabase.from(TABLA_KPIS).delete().eq('id', id)
    if (error) {
      throw new Error(error.message)
    }
  },

  async listarHipotesis() {
    const { data, error } = await clienteSupabase
      .from(TABLA_HIPOTESIS)
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as HipotesisPm[]
  },

  async crearHipotesis(entrada: HipotesisEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_HIPOTESIS)
      .insert(normalizarNulos(entrada))
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as HipotesisPm
  },

  async editarHipotesis(id: string, entrada: HipotesisEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_HIPOTESIS)
      .update(normalizarNulos(entrada))
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as HipotesisPm
  },

  async eliminarHipotesis(id: string) {
    const { error } = await clienteSupabase.from(TABLA_HIPOTESIS).delete().eq('id', id)
    if (error) {
      throw new Error(error.message)
    }
  },

  async listarRelObjetivoRoadmapKr() {
    const { data, error } = await clienteSupabase.from(TABLA_REL_OBJETIVOS).select('*')

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as RelObjetivoRoadmapKrPm[]
  },

  async listarRelIniciativaKr() {
    const { data, error } = await clienteSupabase.from(TABLA_REL_INICIATIVA_KR).select('*')

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as RelIniciativaKrPm[]
  },

  async listarRelIniciativaHipotesis() {
    const { data, error } = await clienteSupabase.from(TABLA_REL_INICIATIVA_HIPOTESIS).select('*')

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as RelIniciativaHipotesisPm[]
  },

  async sincronizarObjetivosRoadmapKr(
    keyResultId: string,
    objetivoEstrategicoId: string,
    objetivosRoadmapIds: string[]
  ) {
    const { error: errorEliminar } = await clienteSupabase.from(TABLA_REL_OBJETIVOS).delete().eq('key_result_id', keyResultId)

    if (errorEliminar) {
      throw new Error(errorEliminar.message)
    }

    if (objetivosRoadmapIds.length === 0) {
      return [] as RelObjetivoRoadmapKrPm[]
    }

    const { data, error } = await clienteSupabase
      .from(TABLA_REL_OBJETIVOS)
      .insert(
        objetivosRoadmapIds.map((objetivoRoadmapId) => ({
          objetivo_roadmap_id: objetivoRoadmapId,
          objetivo_estrategico_id: objetivoEstrategicoId,
          key_result_id: keyResultId
        }))
      )
      .select('*')

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as RelObjetivoRoadmapKrPm[]
  },

  async sincronizarIniciativasKr(keyResultId: string, iniciativaIds: string[]) {
    const { error: errorEliminar } = await clienteSupabase.from(TABLA_REL_INICIATIVA_KR).delete().eq('key_result_id', keyResultId)

    if (errorEliminar) {
      throw new Error(errorEliminar.message)
    }

    if (iniciativaIds.length === 0) {
      return [] as RelIniciativaKrPm[]
    }

    const { data, error } = await clienteSupabase
      .from(TABLA_REL_INICIATIVA_KR)
      .insert(iniciativaIds.map((iniciativaId) => ({ iniciativa_id: iniciativaId, key_result_id: keyResultId })))
      .select('*')

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as RelIniciativaKrPm[]
  },

  async sincronizarIniciativasHipotesis(hipotesisId: string, iniciativaIds: string[]) {
    const { error: errorEliminar } = await clienteSupabase
      .from(TABLA_REL_INICIATIVA_HIPOTESIS)
      .delete()
      .eq('hipotesis_id', hipotesisId)

    if (errorEliminar) {
      throw new Error(errorEliminar.message)
    }

    if (iniciativaIds.length === 0) {
      return [] as RelIniciativaHipotesisPm[]
    }

    const { data, error } = await clienteSupabase
      .from(TABLA_REL_INICIATIVA_HIPOTESIS)
      .insert(iniciativaIds.map((iniciativaId) => ({ iniciativa_id: iniciativaId, hipotesis_id: hipotesisId })))
      .select('*')

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as RelIniciativaHipotesisPm[]
  }
}