import type {
  CasoUsoPm,
  CriterioAceptacionPm,
  HistoriaUsuarioPm,
  ReglaNegocioPm,
  RequerimientoNoFuncionalPm
} from '@/dominio/modelos'
import type {
  CasoUsoEntrada,
  CriterioAceptacionEntrada,
  HistoriaUsuarioEntrada,
  ReglaNegocioEntrada,
  RequerimientoNoFuncionalEntrada
} from '@/compartido/validacion/esquemas'
import { clienteSupabase } from '@/infraestructura/supabase/clienteSupabase'

const TABLA_HISTORIAS = 'pm_historias_usuario'
const TABLA_CRITERIOS = 'pm_criterios_aceptacion'
const TABLA_CASOS_USO = 'pm_casos_uso'
const TABLA_REGLAS = 'pm_reglas_negocio'
const TABLA_RNF = 'pm_requerimientos_no_funcionales'

function normalizarNulos<T extends Record<string, unknown>>(entrada: T) {
  return Object.fromEntries(
    Object.entries(entrada).map(([clave, valor]) => [clave, valor === '' ? null : valor])
  ) as T
}

function tieneIdValido(id: string | null | undefined) {
  return typeof id === 'string' && id.trim().length > 0
}

export const repositorioRequerimientos = {
  async listarHistoriasUsuario() {
    const { data, error } = await clienteSupabase
      .from(TABLA_HISTORIAS)
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as HistoriaUsuarioPm[]
  },

  async crearHistoriaUsuario(entrada: HistoriaUsuarioEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_HISTORIAS)
      .insert(normalizarNulos(entrada))
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as HistoriaUsuarioPm
  },

  async editarHistoriaUsuario(id: string, entrada: HistoriaUsuarioEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_HISTORIAS)
      .update(normalizarNulos(entrada))
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as HistoriaUsuarioPm
  },

  async eliminarHistoriaUsuario(id: string) {
    const { error } = await clienteSupabase.from(TABLA_HISTORIAS).delete().eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  },

  async listarCriteriosAceptacion(historiaUsuarioId?: string) {
    let consulta = clienteSupabase.from(TABLA_CRITERIOS).select('*').order('orden', { ascending: true })

    if (historiaUsuarioId) {
      consulta = consulta.eq('historia_usuario_id', historiaUsuarioId)
    }

    const { data, error } = await consulta

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as CriterioAceptacionPm[]
  },

  async crearCriterioAceptacion(historiaUsuarioId: string, entrada: CriterioAceptacionEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_CRITERIOS)
      .insert(
        normalizarNulos({
          ...entrada,
          historia_usuario_id: historiaUsuarioId
        })
      )
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as CriterioAceptacionPm
  },

  async editarCriterioAceptacion(id: string, entrada: CriterioAceptacionEntrada) {
    const carga = normalizarNulos({ ...entrada })
    delete carga.id

    const { data, error } = await clienteSupabase
      .from(TABLA_CRITERIOS)
      .update(carga)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as CriterioAceptacionPm
  },

  async eliminarCriterioAceptacion(id: string) {
    const { error } = await clienteSupabase.from(TABLA_CRITERIOS).delete().eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  },

  async sincronizarCriteriosAceptacion(historiaUsuarioId: string, criterios: CriterioAceptacionEntrada[]) {
    const { data: previas, error: errorPrevias } = await clienteSupabase
      .from(TABLA_CRITERIOS)
      .select('*')
      .eq('historia_usuario_id', historiaUsuarioId)
      .order('orden', { ascending: true })

    if (errorPrevias) {
      throw new Error(errorPrevias.message)
    }

    const previasTipadas = (previas ?? []) as CriterioAceptacionPm[]
    const idsConservar = new Set(
      criterios
        .map((criterio) => criterio.id)
        .filter((id): id is string => tieneIdValido(id))
    )

    const idsEliminar = previasTipadas.filter((criterio) => !idsConservar.has(criterio.id)).map((criterio) => criterio.id)

    if (idsEliminar.length > 0) {
      const { error: errorEliminar } = await clienteSupabase.from(TABLA_CRITERIOS).delete().in('id', idsEliminar)

      if (errorEliminar) {
        throw new Error(errorEliminar.message)
      }
    }

    const criteriosExistentes = criterios.filter((criterio) => tieneIdValido(criterio.id))

    for (let indice = 0; indice < criteriosExistentes.length; indice += 1) {
      const criterio = criteriosExistentes[indice]
      const { error } = await clienteSupabase
        .from(TABLA_CRITERIOS)
        .update({ orden: 1000 + indice })
        .eq('id', criterio.id as string)

      if (error) {
        throw new Error(error.message)
      }
    }

    const criteriosNuevos = criterios
      .map((criterio, indice) => ({ criterio, indice }))
      .filter(({ criterio }) => !tieneIdValido(criterio.id))

    if (criteriosNuevos.length > 0) {
      const { error: errorInsertar } = await clienteSupabase.from(TABLA_CRITERIOS).insert(
        criteriosNuevos.map(({ criterio, indice }) =>
          normalizarNulos({
            historia_usuario_id: historiaUsuarioId,
            descripcion: criterio.descripcion,
            orden: (indice + 1) * 10,
            obligatorio: criterio.obligatorio,
            estado_validacion: criterio.estado_validacion,
            notas: criterio.notas
          })
        )
      )

      if (errorInsertar) {
        throw new Error(errorInsertar.message)
      }
    }

    for (let indice = 0; indice < criterios.length; indice += 1) {
      const criterio = criterios[indice]

      if (!tieneIdValido(criterio.id)) {
        continue
      }

      const carga = normalizarNulos({
        historia_usuario_id: historiaUsuarioId,
        descripcion: criterio.descripcion,
        orden: (indice + 1) * 10,
        obligatorio: criterio.obligatorio,
        estado_validacion: criterio.estado_validacion,
        notas: criterio.notas
      })

      const { error } = await clienteSupabase.from(TABLA_CRITERIOS).update(carga).eq('id', criterio.id as string)

      if (error) {
        throw new Error(error.message)
      }
    }

    const { data: actuales, error: errorActuales } = await clienteSupabase
      .from(TABLA_CRITERIOS)
      .select('*')
      .eq('historia_usuario_id', historiaUsuarioId)
      .order('orden', { ascending: true })

    if (errorActuales) {
      throw new Error(errorActuales.message)
    }

    return {
      previas: previasTipadas,
      actuales: (actuales ?? []) as CriterioAceptacionPm[]
    }
  },

  async listarCasosUso() {
    const { data, error } = await clienteSupabase
      .from(TABLA_CASOS_USO)
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as CasoUsoPm[]
  },

  async crearCasoUso(entrada: CasoUsoEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_CASOS_USO)
      .insert(normalizarNulos(entrada))
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as CasoUsoPm
  },

  async editarCasoUso(id: string, entrada: CasoUsoEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_CASOS_USO)
      .update(normalizarNulos(entrada))
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as CasoUsoPm
  },

  async eliminarCasoUso(id: string) {
    const { error } = await clienteSupabase.from(TABLA_CASOS_USO).delete().eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  },

  async listarReglasNegocio() {
    const { data, error } = await clienteSupabase
      .from(TABLA_REGLAS)
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as ReglaNegocioPm[]
  },

  async crearReglaNegocio(entrada: ReglaNegocioEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_REGLAS)
      .insert(normalizarNulos(entrada))
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as ReglaNegocioPm
  },

  async editarReglaNegocio(id: string, entrada: ReglaNegocioEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_REGLAS)
      .update(normalizarNulos(entrada))
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as ReglaNegocioPm
  },

  async eliminarReglaNegocio(id: string) {
    const { error } = await clienteSupabase.from(TABLA_REGLAS).delete().eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  },

  async listarRequerimientosNoFuncionales() {
    const { data, error } = await clienteSupabase
      .from(TABLA_RNF)
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as RequerimientoNoFuncionalPm[]
  },

  async crearRequerimientoNoFuncional(entrada: RequerimientoNoFuncionalEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_RNF)
      .insert(normalizarNulos(entrada))
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as RequerimientoNoFuncionalPm
  },

  async editarRequerimientoNoFuncional(id: string, entrada: RequerimientoNoFuncionalEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_RNF)
      .update(normalizarNulos(entrada))
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as RequerimientoNoFuncionalPm
  },

  async eliminarRequerimientoNoFuncional(id: string) {
    const { error } = await clienteSupabase.from(TABLA_RNF).delete().eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  }
}