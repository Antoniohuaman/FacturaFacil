import type { MatrizValor } from '@/dominio/modelos'
import type { MatrizValorEntrada } from '@/compartido/validacion/esquemas'
import { clienteSupabase } from '@/infraestructura/supabase/clienteSupabase'

interface MatrizPersistencia extends MatrizValorEntrada {
  puntaje_valor: number
}

export const repositorioMatrizValor = {
  async listar() {
    const { data, error } = await clienteSupabase
      .from('matriz_valor')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as MatrizValor[]
  },
  async crear(entrada: MatrizPersistencia) {
    const { data, error } = await clienteSupabase.from('matriz_valor').insert(entrada).select('*').single()

    if (error) {
      throw new Error(error.message)
    }

    return data as MatrizValor
  },
  async editar(id: string, entrada: MatrizPersistencia) {
    const { data, error } = await clienteSupabase
      .from('matriz_valor')
      .update(entrada)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as MatrizValor
  },
  async eliminar(id: string) {
    const { error } = await clienteSupabase.from('matriz_valor').delete().eq('id', id)
    if (error) {
      throw new Error(error.message)
    }
  }
}
