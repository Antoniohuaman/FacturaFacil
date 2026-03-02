import type { EjecucionValidacion } from '@/dominio/modelos'
import type { EjecucionValidacionEntrada } from '@/compartido/validacion/esquemas'
import { clienteSupabase } from '@/infraestructura/supabase/clienteSupabase'

export const repositorioEjecucionesValidacion = {
  async listar() {
    const { data, error } = await clienteSupabase
      .from('pm_ejecuciones_validacion')
      .select('*')
      .order('fecha_ejecucion', { ascending: false })
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as EjecucionValidacion[]
  },

  async crear(entrada: EjecucionValidacionEntrada) {
    const payload = {
      ...entrada,
      rango_desde: entrada.rango_desde || null,
      rango_hasta: entrada.rango_hasta || null,
      evidencia_url: entrada.evidencia_url || null,
      aprobador: entrada.aprobador || null
    }

    const { data, error } = await clienteSupabase
      .from('pm_ejecuciones_validacion')
      .insert(payload)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as EjecucionValidacion
  },

  async editar(id: string, entrada: EjecucionValidacionEntrada) {
    const payload = {
      ...entrada,
      rango_desde: entrada.rango_desde || null,
      rango_hasta: entrada.rango_hasta || null,
      evidencia_url: entrada.evidencia_url || null,
      aprobador: entrada.aprobador || null
    }

    const { data, error } = await clienteSupabase
      .from('pm_ejecuciones_validacion')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as EjecucionValidacion
  },

  async eliminar(id: string) {
    const { error } = await clienteSupabase.from('pm_ejecuciones_validacion').delete().eq('id', id)
    if (error) {
      throw new Error(error.message)
    }
  }
}
