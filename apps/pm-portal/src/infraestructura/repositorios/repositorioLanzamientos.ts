import type {
  ChecklistSalidaEntrada,
  ReleaseEntrada,
  SeguimientoReleaseEntrada
} from '@/compartido/validacion/esquemas'
import type { ReleaseChecklistItemPm, ReleasePm, ReleaseSeguimientoPm } from '@/dominio/modelos'
import { clienteSupabase } from '@/infraestructura/supabase/clienteSupabase'

const TABLA_RELEASES = 'pm_releases'
const TABLA_CHECKLIST = 'pm_release_checklist_items'
const TABLA_SEGUIMIENTO = 'pm_release_seguimiento'

function normalizarNulos<T extends Record<string, unknown>>(entrada: T) {
  return Object.fromEntries(
    Object.entries(entrada).map(([clave, valor]) => [clave, valor === '' ? null : valor])
  ) as T
}

function tieneIdValido(id: string | null | undefined) {
  return typeof id === 'string' && id.trim().length > 0
}

export const repositorioLanzamientos = {
  async listarReleases() {
    const { data, error } = await clienteSupabase
      .from(TABLA_RELEASES)
      .select('*')
      .order('fecha_programada', { ascending: false })
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as ReleasePm[]
  },

  async crearRelease(entrada: ReleaseEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_RELEASES)
      .insert(normalizarNulos(entrada))
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as ReleasePm
  },

  async editarRelease(id: string, entrada: ReleaseEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_RELEASES)
      .update(normalizarNulos(entrada))
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as ReleasePm
  },

  async eliminarRelease(id: string) {
    const { error } = await clienteSupabase.from(TABLA_RELEASES).delete().eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  },

  async listarChecklistSalida(releaseId?: string) {
    let consulta = clienteSupabase.from(TABLA_CHECKLIST).select('*').order('orden', { ascending: true })

    if (releaseId) {
      consulta = consulta.eq('release_id', releaseId)
    }

    const { data, error } = await consulta

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as ReleaseChecklistItemPm[]
  },

  async sincronizarChecklistSalida(releaseId: string, items: ChecklistSalidaEntrada[]) {
    const { data: previas, error: errorPrevias } = await clienteSupabase
      .from(TABLA_CHECKLIST)
      .select('*')
      .eq('release_id', releaseId)
      .order('orden', { ascending: true })

    if (errorPrevias) {
      throw new Error(errorPrevias.message)
    }

    const previasTipadas = (previas ?? []) as ReleaseChecklistItemPm[]
    const idsConservar = new Set(
      items
        .map((item) => item.id)
        .filter((id): id is string => tieneIdValido(id))
    )

    const idsEliminar = previasTipadas.filter((item) => !idsConservar.has(item.id)).map((item) => item.id)

    if (idsEliminar.length > 0) {
      const { error: errorEliminar } = await clienteSupabase.from(TABLA_CHECKLIST).delete().in('id', idsEliminar)

      if (errorEliminar) {
        throw new Error(errorEliminar.message)
      }
    }

    const itemsExistentes = items.filter((item) => tieneIdValido(item.id))

    for (let indice = 0; indice < itemsExistentes.length; indice += 1) {
      const item = itemsExistentes[indice]
      const { error } = await clienteSupabase
        .from(TABLA_CHECKLIST)
        .update({ orden: 1000 + indice })
        .eq('id', item.id as string)

      if (error) {
        throw new Error(error.message)
      }
    }

    const itemsNuevos = items.map((item, indice) => ({ item, indice })).filter(({ item }) => !tieneIdValido(item.id))

    if (itemsNuevos.length > 0) {
      const { error: errorInsertar } = await clienteSupabase.from(TABLA_CHECKLIST).insert(
        itemsNuevos.map(({ item, indice }) =>
          normalizarNulos({
            release_id: releaseId,
            tipo_item: item.tipo_item,
            descripcion: item.descripcion,
            obligatorio: item.obligatorio,
            completado: item.completado,
            evidencia: item.evidencia,
            orden: (indice + 1) * 10
          })
        )
      )

      if (errorInsertar) {
        throw new Error(errorInsertar.message)
      }
    }

    for (let indice = 0; indice < items.length; indice += 1) {
      const item = items[indice]

      if (!tieneIdValido(item.id)) {
        continue
      }

      const carga = normalizarNulos({
        release_id: releaseId,
        tipo_item: item.tipo_item,
        descripcion: item.descripcion,
        obligatorio: item.obligatorio,
        completado: item.completado,
        evidencia: item.evidencia,
        orden: (indice + 1) * 10
      })

      const { error } = await clienteSupabase.from(TABLA_CHECKLIST).update(carga).eq('id', item.id as string)

      if (error) {
        throw new Error(error.message)
      }
    }

    const { data: actuales, error: errorActuales } = await clienteSupabase
      .from(TABLA_CHECKLIST)
      .select('*')
      .eq('release_id', releaseId)
      .order('orden', { ascending: true })

    if (errorActuales) {
      throw new Error(errorActuales.message)
    }

    return {
      previas: previasTipadas,
      actuales: (actuales ?? []) as ReleaseChecklistItemPm[]
    }
  },

  async listarSeguimientos() {
    const { data, error } = await clienteSupabase
      .from(TABLA_SEGUIMIENTO)
      .select('*')
      .order('fecha_registro', { ascending: false })
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as ReleaseSeguimientoPm[]
  },

  async crearSeguimiento(entrada: SeguimientoReleaseEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_SEGUIMIENTO)
      .insert(normalizarNulos(entrada))
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as ReleaseSeguimientoPm
  },

  async editarSeguimiento(id: string, entrada: SeguimientoReleaseEntrada) {
    const { data, error } = await clienteSupabase
      .from(TABLA_SEGUIMIENTO)
      .update(normalizarNulos(entrada))
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as ReleaseSeguimientoPm
  },

  async eliminarSeguimiento(id: string) {
    const { error } = await clienteSupabase.from(TABLA_SEGUIMIENTO).delete().eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  }
}