import type {
  CatalogoEstadoPm,
  CatalogoModuloPm,
  CatalogoSeveridadPm,
  IntegracionPm,
  KpiConfigPm
} from '@/dominio/modelos'
import type {
  CatalogoModuloPmEntrada,
  CatalogoSeveridadPmEntrada,
  IntegracionPmEntrada,
  KpiConfigPmEntrada
} from '@/compartido/validacion/esquemas'
import { clienteSupabase } from '@/infraestructura/supabase/clienteSupabase'

export const repositorioAjustes = {
  async listarModulos() {
    const { data, error } = await clienteSupabase
      .from('pm_catalogo_modulos')
      .select('*')
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as CatalogoModuloPm[]
  },

  async crearModulo(entrada: CatalogoModuloPmEntrada) {
    const { data, error } = await clienteSupabase
      .from('pm_catalogo_modulos')
      .insert(entrada)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as CatalogoModuloPm
  },

  async editarModulo(id: string, entrada: CatalogoModuloPmEntrada) {
    const { data, error } = await clienteSupabase
      .from('pm_catalogo_modulos')
      .update(entrada)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as CatalogoModuloPm
  },

  async eliminarModulo(id: string) {
    const { error } = await clienteSupabase.from('pm_catalogo_modulos').delete().eq('id', id)
    if (error) {
      throw new Error(error.message)
    }
  },

  async listarSeveridades() {
    const { data, error } = await clienteSupabase
      .from('pm_catalogo_severidades')
      .select('*')
      .order('nivel', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as CatalogoSeveridadPm[]
  },

  async crearSeveridad(entrada: CatalogoSeveridadPmEntrada) {
    const { data, error } = await clienteSupabase
      .from('pm_catalogo_severidades')
      .insert(entrada)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as CatalogoSeveridadPm
  },

  async editarSeveridad(id: string, entrada: CatalogoSeveridadPmEntrada) {
    const { data, error } = await clienteSupabase
      .from('pm_catalogo_severidades')
      .update(entrada)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as CatalogoSeveridadPm
  },

  async eliminarSeveridad(id: string) {
    const { error } = await clienteSupabase.from('pm_catalogo_severidades').delete().eq('id', id)
    if (error) {
      throw new Error(error.message)
    }
  },

  async listarEstadosPorAmbito(ambito: string) {
    const { data, error } = await clienteSupabase
      .from('pm_catalogo_estados')
      .select('*')
      .eq('ambito', ambito)
      .eq('activo', true)
      .order('orden', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as CatalogoEstadoPm[]
  },

  async listarKpis() {
    const { data, error } = await clienteSupabase
      .from('kpis_config')
      .select('*')
      .order('clave_kpi', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as KpiConfigPm[]
  },

  async crearKpi(entrada: KpiConfigPmEntrada) {
    const { data, error } = await clienteSupabase.from('kpis_config').insert(entrada).select('*').single()

    if (error) {
      throw new Error(error.message)
    }

    return data as KpiConfigPm
  },

  async editarKpi(id: string, entrada: KpiConfigPmEntrada) {
    const { data, error } = await clienteSupabase
      .from('kpis_config')
      .update(entrada)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as KpiConfigPm
  },

  async eliminarKpi(id: string) {
    const { error } = await clienteSupabase.from('kpis_config').delete().eq('id', id)
    if (error) {
      throw new Error(error.message)
    }
  },

  async listarIntegraciones() {
    const { data, error } = await clienteSupabase
      .from('pm_integraciones_config')
      .select('*')
      .order('clave', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as IntegracionPm[]
  },

  async crearIntegracion(entrada: IntegracionPmEntrada) {
    const { data, error } = await clienteSupabase
      .from('pm_integraciones_config')
      .insert(entrada)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as IntegracionPm
  },

  async editarIntegracion(id: string, entrada: IntegracionPmEntrada) {
    const { data, error } = await clienteSupabase
      .from('pm_integraciones_config')
      .update(entrada)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as IntegracionPm
  },

  async eliminarIntegracion(id: string) {
    const { error } = await clienteSupabase.from('pm_integraciones_config').delete().eq('id', id)
    if (error) {
      throw new Error(error.message)
    }
  }
}
