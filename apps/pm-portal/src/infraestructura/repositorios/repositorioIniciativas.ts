import type { Iniciativa } from '@/dominio/modelos'
import type { IniciativaEntrada } from '@/compartido/validacion/esquemas'
import { clienteSupabase } from '@/infraestructura/supabase/clienteSupabase'

interface IniciativaPersistencia extends IniciativaEntrada {
  rice: number
}

export const repositorioIniciativas = {
  async listar() {
    const { data, error } = await clienteSupabase
      .from('iniciativas')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as Iniciativa[]
  },
  async crear(entrada: IniciativaPersistencia) {
    const { data, error } = await clienteSupabase.from('iniciativas').insert(entrada).select('*').single()

    if (error) {
      throw new Error(error.message)
    }

    return data as Iniciativa
  },
  async editar(id: string, entrada: IniciativaPersistencia) {
    const { data, error } = await clienteSupabase
      .from('iniciativas')
      .update(entrada)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as Iniciativa
  },
  async eliminar(id: string) {
    const { error } = await clienteSupabase.from('iniciativas').delete().eq('id', id)
    if (error) {
      throw new Error(error.message)
    }
  }
}
