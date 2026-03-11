import type { HealthScoreEntrada, KpiEjecutivoEntrada } from '@/compartido/validacion/esquemas'
import type { HealthScorePm, KpiEjecutivoPm } from '@/dominio/modelos'
import { clienteSupabase } from '@/infraestructura/supabase/clienteSupabase'

const TABLA_KPIS_EJECUTIVOS = 'pm_kpis_ejecutivos'
const TABLA_HEALTH_SCORES = 'pm_health_scores'

function normalizarNulos<T extends Record<string, unknown>>(entrada: T) {
  return Object.fromEntries(
    Object.entries(entrada).map(([clave, valor]) => {
      if (valor === '' || (typeof valor === 'number' && Number.isNaN(valor))) {
        return [clave, null]
      }

      return [clave, valor]
    })
  ) as T
}

export const repositorioAnalitica = {
  async listarKpisEjecutivos() {
    const { data, error } = await clienteSupabase
      .from(TABLA_KPIS_EJECUTIVOS)
      .select('*')
      .order('fecha_corte', { ascending: false })
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as KpiEjecutivoPm[]
  },

  async crearKpiEjecutivo(entrada: KpiEjecutivoEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_KPIS_EJECUTIVOS)
      .insert(normalizarNulos(entrada))
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as KpiEjecutivoPm
  },

  async editarKpiEjecutivo(id: string, entrada: KpiEjecutivoEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_KPIS_EJECUTIVOS)
      .update(normalizarNulos(entrada))
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as KpiEjecutivoPm
  },

  async eliminarKpiEjecutivo(id: string) {
    const { error } = await clienteSupabase.from(TABLA_KPIS_EJECUTIVOS).delete().eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  },

  async listarHealthScores() {
    const { data, error } = await clienteSupabase
      .from(TABLA_HEALTH_SCORES)
      .select('*')
      .order('fecha_corte', { ascending: false })
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as HealthScorePm[]
  },

  async crearHealthScore(entrada: HealthScoreEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_HEALTH_SCORES)
      .insert(normalizarNulos(entrada))
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as HealthScorePm
  },

  async editarHealthScore(id: string, entrada: HealthScoreEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_HEALTH_SCORES)
      .update(normalizarNulos(entrada))
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as HealthScorePm
  },

  async eliminarHealthScore(id: string) {
    const { error } = await clienteSupabase.from(TABLA_HEALTH_SCORES).delete().eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  }
}