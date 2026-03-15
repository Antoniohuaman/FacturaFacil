import type {
  DependenciaEntrada,
  RiesgoEntrada,
  StakeholderEntrada
} from '@/compartido/validacion/esquemas'
import type { DependenciaPm, RiesgoPm, StakeholderPm } from '@/dominio/modelos'
import { clienteSupabase } from '@/infraestructura/supabase/clienteSupabase'

const TABLA_STAKEHOLDERS = 'pm_stakeholders'
const TABLA_RIESGOS = 'pm_riesgos'
const TABLA_DEPENDENCIAS = 'pm_dependencias'

function normalizarNulos<T extends Record<string, unknown>>(entrada: T) {
  return Object.fromEntries(
    Object.entries(entrada).map(([clave, valor]) => [clave, valor === '' ? null : valor])
  ) as T
}

export const repositorioGobierno = {
  async listarStakeholders() {
    const { data, error } = await clienteSupabase
      .from(TABLA_STAKEHOLDERS)
      .select('*')
      .order('nombre', { ascending: true })
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as StakeholderPm[]
  },

  async crearStakeholder(entrada: StakeholderEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_STAKEHOLDERS)
      .insert(normalizarNulos(entrada))
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as StakeholderPm
  },

  async editarStakeholder(id: string, entrada: StakeholderEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_STAKEHOLDERS)
      .update(normalizarNulos(entrada))
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as StakeholderPm
  },

  async eliminarStakeholder(id: string) {
    const { error } = await clienteSupabase.from(TABLA_STAKEHOLDERS).delete().eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  },

  async listarRiesgos() {
    const { data, error } = await clienteSupabase
      .from(TABLA_RIESGOS)
      .select('*')
      .order('fecha_identificacion', { ascending: false })
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as RiesgoPm[]
  },

  async crearRiesgo(entrada: RiesgoEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_RIESGOS)
      .insert(normalizarNulos(entrada))
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as RiesgoPm
  },

  async editarRiesgo(id: string, entrada: RiesgoEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_RIESGOS)
      .update(normalizarNulos(entrada))
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as RiesgoPm
  },

  async eliminarRiesgo(id: string) {
    const { error } = await clienteSupabase.from(TABLA_RIESGOS).delete().eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  },

  async listarDependencias() {
    const { data, error } = await clienteSupabase
      .from(TABLA_DEPENDENCIAS)
      .select('*')
      .order('fecha_identificacion', { ascending: false })
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as DependenciaPm[]
  },

  async crearDependencia(entrada: DependenciaEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_DEPENDENCIAS)
      .insert(normalizarNulos(entrada))
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as DependenciaPm
  },

  async editarDependencia(id: string, entrada: DependenciaEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_DEPENDENCIAS)
      .update(normalizarNulos(entrada))
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as DependenciaPm
  },

  async eliminarDependencia(id: string) {
    const { error } = await clienteSupabase.from(TABLA_DEPENDENCIAS).delete().eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  }
}