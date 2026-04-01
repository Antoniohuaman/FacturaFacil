import type { Entrega } from '@/dominio/modelos'
import type { EntregaEntrada } from '@/compartido/validacion/esquemas'
import { clienteSupabase } from '@/infraestructura/supabase/clienteSupabase'

export const repositorioEntregas = {
  async listar() {
    const { data, error } = await clienteSupabase
      .from('entregas')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as Entrega[]
  },
  async obtenerPorId(id: string) {
    const { data, error } = await clienteSupabase.from('entregas').select('*').eq('id', id).maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? null) as Entrega | null
  },
  async crear(entrada: EntregaEntrada) {
    const { data, error } = await clienteSupabase.from('entregas').insert(entrada).select('*').single()

    if (error) {
      throw new Error(error.message)
    }

    return data as Entrega
  },
  async editar(id: string, entrada: EntregaEntrada) {
    const { data, error } = await clienteSupabase
      .from('entregas')
      .update(entrada)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as Entrega
  },
  async eliminar(id: string) {
    const { error } = await clienteSupabase.from('entregas').delete().eq('id', id)
    if (error) {
      throw new Error(error.message)
    }
  }
}
