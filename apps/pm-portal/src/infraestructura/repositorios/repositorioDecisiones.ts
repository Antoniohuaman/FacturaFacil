import type { DecisionPm } from '@/dominio/modelos'
import type { DecisionPmEntrada } from '@/compartido/validacion/esquemas'
import { clienteSupabase } from '@/infraestructura/supabase/clienteSupabase'

export const repositorioDecisiones = {
  async listar() {
    const { data, error } = await clienteSupabase
      .from('pm_decisiones')
      .select('*')
      .order('fecha_decision', { ascending: false })
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as DecisionPm[]
  },

  async crear(entrada: DecisionPmEntrada) {
    const payload = {
      ...entrada,
      owner: entrada.owner || null,
      links: entrada.links ?? [],
      tags: entrada.tags ?? [],
      iniciativa_id: entrada.iniciativa_id || null,
      entrega_id: entrada.entrega_id || null,
      ejecucion_validacion_id: entrada.ejecucion_validacion_id || null
    }

    const { data, error } = await clienteSupabase.from('pm_decisiones').insert(payload).select('*').single()

    if (error) {
      throw new Error(error.message)
    }

    return data as DecisionPm
  },

  async editar(id: string, entrada: DecisionPmEntrada) {
    const payload = {
      ...entrada,
      owner: entrada.owner || null,
      links: entrada.links ?? [],
      tags: entrada.tags ?? [],
      iniciativa_id: entrada.iniciativa_id || null,
      entrega_id: entrada.entrega_id || null,
      ejecucion_validacion_id: entrada.ejecucion_validacion_id || null
    }

    const { data, error } = await clienteSupabase
      .from('pm_decisiones')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as DecisionPm
  },

  async eliminar(id: string) {
    const { error } = await clienteSupabase.from('pm_decisiones').delete().eq('id', id)
    if (error) {
      throw new Error(error.message)
    }
  }
}
