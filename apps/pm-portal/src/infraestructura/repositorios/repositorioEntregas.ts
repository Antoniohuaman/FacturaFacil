import type { Entrega } from '@/dominio/modelos'
import type { EntregaEntrada } from '@/compartido/validacion/esquemas'
import { clienteSupabase } from '@/infraestructura/supabase/clienteSupabase'
import {
  obtenerSiguienteOrdenRoadmap,
  listarRegistrosOrdenadosRoadmap,
  reordenarRegistrosRoadmap
} from '@/infraestructura/repositorios/repositorioRoadmapOrden'

interface EntregaPersistencia extends EntregaEntrada {
  orden: number
}

export const repositorioEntregas = {
  async listar() {
    return listarRegistrosOrdenadosRoadmap<Entrega>('entregas')
  },
  async obtenerPorId(id: string) {
    const { data, error } = await clienteSupabase.from('entregas').select('*').eq('id', id).maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? null) as Entrega | null
  },
  async crear(entrada: EntregaPersistencia) {
    const { data, error } = await clienteSupabase.from('entregas').insert(entrada).select('*').single()

    if (error) {
      throw new Error(error.message)
    }

    return data as Entrega
  },
  async editar(id: string, entrada: EntregaPersistencia) {
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
  },
  listarEnIniciativa(iniciativaId: string | null) {
    return listarRegistrosOrdenadosRoadmap<Entrega>('entregas', { campo: 'iniciativa_id', valor: iniciativaId })
  },
  obtenerSiguienteOrdenEnIniciativa(iniciativaId: string | null) {
    return obtenerSiguienteOrdenRoadmap('entregas', { campo: 'iniciativa_id', valor: iniciativaId })
  },
  reordenarEnIniciativa(iniciativaId: string | null, idsOrdenados: string[]) {
    return reordenarRegistrosRoadmap<Entrega>('entregas', idsOrdenados, { campo: 'iniciativa_id', valor: iniciativaId })
  }
}
