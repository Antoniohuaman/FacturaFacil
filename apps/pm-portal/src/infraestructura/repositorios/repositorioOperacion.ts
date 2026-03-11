import type {
  BloqueoEntrada,
  BugEntrada,
  DeudaTecnicaEntrada,
  LeccionAprendidaEntrada,
  MejoraEntrada
} from '@/compartido/validacion/esquemas'
import type {
  BloqueoPm,
  BugPm,
  DeudaTecnicaPm,
  LeccionAprendidaPm,
  MejoraPm
} from '@/dominio/modelos'
import { clienteSupabase } from '@/infraestructura/supabase/clienteSupabase'

const TABLA_BUGS = 'pm_bugs'
const TABLA_MEJORAS = 'pm_mejoras'
const TABLA_DEUDA_TECNICA = 'pm_deuda_tecnica'
const TABLA_BLOQUEOS = 'pm_bloqueos'
const TABLA_LECCIONES = 'pm_lecciones_aprendidas'

function normalizarNulos<T extends Record<string, unknown>>(entrada: T) {
  return Object.fromEntries(
    Object.entries(entrada).map(([clave, valor]) => [clave, valor === '' ? null : valor])
  ) as T
}

export const repositorioOperacion = {
  async listarBugs() {
    const { data, error } = await clienteSupabase
      .from(TABLA_BUGS)
      .select('*')
      .order('fecha_reporte', { ascending: false })
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as BugPm[]
  },

  async crearBug(entrada: BugEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_BUGS)
      .insert(normalizarNulos(entrada))
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as BugPm
  },

  async editarBug(id: string, entrada: BugEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_BUGS)
      .update(normalizarNulos(entrada))
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as BugPm
  },

  async eliminarBug(id: string) {
    const { error } = await clienteSupabase.from(TABLA_BUGS).delete().eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  },

  async listarMejoras() {
    const { data, error } = await clienteSupabase
      .from(TABLA_MEJORAS)
      .select('*')
      .order('fecha_solicitud', { ascending: false })
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as MejoraPm[]
  },

  async crearMejora(entrada: MejoraEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_MEJORAS)
      .insert(normalizarNulos(entrada))
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as MejoraPm
  },

  async editarMejora(id: string, entrada: MejoraEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_MEJORAS)
      .update(normalizarNulos(entrada))
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as MejoraPm
  },

  async eliminarMejora(id: string) {
    const { error } = await clienteSupabase.from(TABLA_MEJORAS).delete().eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  },

  async listarDeudaTecnica() {
    const { data, error } = await clienteSupabase
      .from(TABLA_DEUDA_TECNICA)
      .select('*')
      .order('fecha_identificacion', { ascending: false })
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as DeudaTecnicaPm[]
  },

  async crearDeudaTecnica(entrada: DeudaTecnicaEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_DEUDA_TECNICA)
      .insert(normalizarNulos(entrada))
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as DeudaTecnicaPm
  },

  async editarDeudaTecnica(id: string, entrada: DeudaTecnicaEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_DEUDA_TECNICA)
      .update(normalizarNulos(entrada))
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as DeudaTecnicaPm
  },

  async eliminarDeudaTecnica(id: string) {
    const { error } = await clienteSupabase.from(TABLA_DEUDA_TECNICA).delete().eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  },

  async listarBloqueos() {
    const { data, error } = await clienteSupabase
      .from(TABLA_BLOQUEOS)
      .select('*')
      .order('fecha_reporte', { ascending: false })
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as BloqueoPm[]
  },

  async crearBloqueo(entrada: BloqueoEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_BLOQUEOS)
      .insert(normalizarNulos(entrada))
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as BloqueoPm
  },

  async editarBloqueo(id: string, entrada: BloqueoEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_BLOQUEOS)
      .update(normalizarNulos(entrada))
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as BloqueoPm
  },

  async eliminarBloqueo(id: string) {
    const { error } = await clienteSupabase.from(TABLA_BLOQUEOS).delete().eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  },

  async listarLeccionesAprendidas() {
    const { data, error } = await clienteSupabase
      .from(TABLA_LECCIONES)
      .select('*')
      .order('fecha_leccion', { ascending: false })
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as LeccionAprendidaPm[]
  },

  async crearLeccionAprendida(entrada: LeccionAprendidaEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_LECCIONES)
      .insert(normalizarNulos(entrada))
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as LeccionAprendidaPm
  },

  async editarLeccionAprendida(id: string, entrada: LeccionAprendidaEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_LECCIONES)
      .update(normalizarNulos(entrada))
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as LeccionAprendidaPm
  },

  async eliminarLeccionAprendida(id: string) {
    const { error } = await clienteSupabase.from(TABLA_LECCIONES).delete().eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  }
}