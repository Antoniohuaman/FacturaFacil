import type { Objetivo } from '@/dominio/modelos'
import type { ObjetivoEntrada } from '@/compartido/validacion/esquemas'
import { clienteSupabase } from '@/infraestructura/supabase/clienteSupabase'
import {
  obtenerSiguienteOrdenRoadmap,
  listarRegistrosOrdenadosRoadmap,
  reordenarRegistrosRoadmap
} from '@/infraestructura/repositorios/repositorioRoadmapOrden'

interface ObjetivoPersistencia extends ObjetivoEntrada {
  orden: number
}

export const repositorioObjetivos = {
  async listar() {
    return listarRegistrosOrdenadosRoadmap<Objetivo>('objetivos')
  },
  async obtenerPorId(id: string) {
    const { data, error } = await clienteSupabase.from('objetivos').select('*').eq('id', id).maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? null) as Objetivo | null
  },
  async crear(entrada: ObjetivoPersistencia) {
    const { data, error } = await clienteSupabase.from('objetivos').insert(entrada).select('*').single()

    if (error) {
      throw new Error(error.message)
    }

    return data as Objetivo
  },
  async editar(id: string, entrada: ObjetivoPersistencia) {
    const { data, error } = await clienteSupabase
      .from('objetivos')
      .update(entrada)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as Objetivo
  },
  async eliminar(id: string) {
    const { error } = await clienteSupabase.from('objetivos').delete().eq('id', id)
    if (error) {
      throw new Error(error.message)
    }
  },
  obtenerSiguienteOrden() {
    return obtenerSiguienteOrdenRoadmap('objetivos')
  },
  reordenar(idsOrdenados: string[]) {
    return reordenarRegistrosRoadmap<Objetivo>('objetivos', idsOrdenados)
  }
}
