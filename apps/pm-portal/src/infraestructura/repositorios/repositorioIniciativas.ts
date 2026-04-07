import type { Iniciativa } from '@/dominio/modelos'
import type { IniciativaEntrada } from '@/compartido/validacion/esquemas'
import { clienteSupabase } from '@/infraestructura/supabase/clienteSupabase'
import {
  obtenerSiguienteOrdenRoadmap,
  listarRegistrosOrdenadosRoadmap,
  reordenarRegistrosRoadmap
} from '@/infraestructura/repositorios/repositorioRoadmapOrden'

interface IniciativaPersistencia extends IniciativaEntrada {
  orden: number
  rice: number
}

export const repositorioIniciativas = {
  async listar() {
    return listarRegistrosOrdenadosRoadmap<Iniciativa>('iniciativas')
  },
  async obtenerPorId(id: string) {
    const { data, error } = await clienteSupabase.from('iniciativas').select('*').eq('id', id).maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? null) as Iniciativa | null
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
  },
  listarEnObjetivo(objetivoId: string | null) {
    return listarRegistrosOrdenadosRoadmap<Iniciativa>('iniciativas', { campo: 'objetivo_id', valor: objetivoId })
  },
  obtenerSiguienteOrdenEnObjetivo(objetivoId: string | null) {
    return obtenerSiguienteOrdenRoadmap('iniciativas', { campo: 'objetivo_id', valor: objetivoId })
  },
  reordenarEnObjetivo(objetivoId: string | null, idsOrdenados: string[]) {
    return reordenarRegistrosRoadmap<Iniciativa>('iniciativas', idsOrdenados, { campo: 'objetivo_id', valor: objetivoId })
  }
}
