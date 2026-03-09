import type {
  CatalogoEtapaPm,
  CatalogoVentanaPm,
  CatalogoEstadoPm,
  CatalogoModuloPm,
  CatalogoSeveridadPm,
  ConfiguracionRice,
  IntegracionPm,
  KpiConfigPm
} from '@/dominio/modelos'
import type {
  CatalogoEtapaPmEntrada,
  CatalogoModuloPmEntrada,
  CatalogoSeveridadPmEntrada,
  CatalogoVentanaPmEntrada,
  ConfiguracionRiceEntrada,
  IntegracionPmEntrada,
  KpiConfigPmEntrada
} from '@/compartido/validacion/esquemas'
import { clienteSupabase } from '@/infraestructura/supabase/clienteSupabase'

const CONFIGURACION_RICE_DEFECTO: ConfiguracionRiceEntrada = {
  alcance_periodo: 'mes',
  esfuerzo_unidad: 'persona_semana'
}

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

  async listarVentanas() {
    const { data, error } = await clienteSupabase
      .from('pm_catalogo_ventanas')
      .select('*')
      .order('orden', { ascending: true })
      .order('etiqueta_visible', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as CatalogoVentanaPm[]
  },

  async crearVentana(entrada: CatalogoVentanaPmEntrada) {
    const { data, error } = await clienteSupabase
      .from('pm_catalogo_ventanas')
      .insert(entrada)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as CatalogoVentanaPm
  },

  async editarVentana(id: string, entrada: CatalogoVentanaPmEntrada) {
    const { data, error } = await clienteSupabase
      .from('pm_catalogo_ventanas')
      .update(entrada)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as CatalogoVentanaPm
  },

  async eliminarVentana(id: string) {
    const { error } = await clienteSupabase.from('pm_catalogo_ventanas').delete().eq('id', id)
    if (error) {
      throw new Error(error.message)
    }
  },

  async listarEtapas() {
    const { data, error } = await clienteSupabase
      .from('pm_catalogo_etapas')
      .select('*')
      .order('orden', { ascending: true })
      .order('etiqueta_visible', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as CatalogoEtapaPm[]
  },

  async crearEtapa(entrada: CatalogoEtapaPmEntrada) {
    const { data, error } = await clienteSupabase
      .from('pm_catalogo_etapas')
      .insert(entrada)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as CatalogoEtapaPm
  },

  async editarEtapa(id: string, entrada: CatalogoEtapaPmEntrada) {
    const { data, error } = await clienteSupabase
      .from('pm_catalogo_etapas')
      .update(entrada)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as CatalogoEtapaPm
  },

  async eliminarEtapa(id: string) {
    const { error } = await clienteSupabase.from('pm_catalogo_etapas').delete().eq('id', id)
    if (error) {
      throw new Error(error.message)
    }
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
  },

  async obtenerConfiguracionRice() {
    const data = await this.obtenerConfiguracionRiceActual()

    if (data) {
      return data
    }

    const { data: creada, error: errorCreacion } = await clienteSupabase
      .from('configuracion_rice')
      .insert(CONFIGURACION_RICE_DEFECTO)
      .select('*')
      .single()

    if (errorCreacion) {
      throw new Error(errorCreacion.message)
    }

    return creada as ConfiguracionRice
  },

  async obtenerConfiguracionRiceActual() {
    const { data, error } = await clienteSupabase
      .from('configuracion_rice')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? null) as ConfiguracionRice | null
  },

  async guardarConfiguracionRice(entrada: ConfiguracionRiceEntrada) {
    const { data: actual, error: errorLectura } = await clienteSupabase
      .from('configuracion_rice')
      .select('id')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (errorLectura) {
      throw new Error(errorLectura.message)
    }

    if (!actual) {
      const { data: creada, error: errorCreacion } = await clienteSupabase
        .from('configuracion_rice')
        .insert(entrada)
        .select('*')
        .single()

      if (errorCreacion) {
        throw new Error(errorCreacion.message)
      }

      return creada as ConfiguracionRice
    }

    const { data: actualizada, error: errorActualizacion } = await clienteSupabase
      .from('configuracion_rice')
      .update(entrada)
      .eq('id', actual.id)
      .select('*')
      .single()

    if (errorActualizacion) {
      throw new Error(errorActualizacion.message)
    }

    return actualizada as ConfiguracionRice
  }
}
