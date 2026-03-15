import type { AccionHistorialCambio, HistorialCambioPm } from '@/dominio/modelos'
import { clienteSupabase } from '@/infraestructura/supabase/clienteSupabase'

export interface EntradaHistorialCambio {
  modulo_codigo: string
  entidad: string
  entidad_id: string
  accion: AccionHistorialCambio
  resumen: string
  actor_user_id: string | null
  actor_email: string | null
  antes_json: unknown | null
  despues_json: unknown | null
  metadata_json: unknown | null
}

export interface FiltrosHistorialCambios {
  modulo?: string
  entidad?: string
  accion?: AccionHistorialCambio | 'todos'
  actor?: string
  fechaDesde?: string
  fechaHasta?: string
}

export const repositorioHistorialCambios = {
  async listar(filtros: FiltrosHistorialCambios = {}) {
    let consulta = clienteSupabase
      .from('pm_historial_cambios')
      .select('*')
      .order('created_at', { ascending: false })

    if (filtros.modulo && filtros.modulo !== 'todos') {
      consulta = consulta.eq('modulo_codigo', filtros.modulo)
    }

    if (filtros.entidad && filtros.entidad !== 'todos') {
      consulta = consulta.eq('entidad', filtros.entidad)
    }

    if (filtros.accion && filtros.accion !== 'todos') {
      consulta = consulta.eq('accion', filtros.accion)
    }

    if (filtros.actor) {
      consulta = consulta.or(`actor_email.ilike.%${filtros.actor}%,actor_user_id.ilike.%${filtros.actor}%`)
    }

    if (filtros.fechaDesde) {
      consulta = consulta.gte('created_at', `${filtros.fechaDesde}T00:00:00-05:00`)
    }

    if (filtros.fechaHasta) {
      consulta = consulta.lte('created_at', `${filtros.fechaHasta}T23:59:59.999-05:00`)
    }

    const { data, error } = await consulta

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as HistorialCambioPm[]
  },

  async registrar(entrada: EntradaHistorialCambio) {
    const { data, error } = await clienteSupabase
      .from('pm_historial_cambios')
      .insert(entrada)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as HistorialCambioPm
  },

  async obtenerRegistroPorId<T>(tabla: string, id: string) {
    const { data, error } = await clienteSupabase.from(tabla).select('*').eq('id', id).maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? null) as T | null
  }
}