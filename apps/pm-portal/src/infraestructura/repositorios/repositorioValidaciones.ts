import type { PlantillaValidacion, PlanValidacion } from '@/dominio/modelos'
import type { PlanValidacionEntrada, PlantillaValidacionEntrada } from '@/compartido/validacion/esquemas'
import { clienteSupabase } from '@/infraestructura/supabase/clienteSupabase'

interface ResumenValidacion {
  totalPlanes: number
  planesActivos: number
  totalPlantillas: number
}

export const repositorioValidaciones = {
  async listarPlanes() {
    const { data, error } = await clienteSupabase
      .from('pm_planes_validacion')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as PlanValidacion[]
  },

  async crearPlan(entrada: PlanValidacionEntrada) {
    const payload = {
      ...entrada,
      plantilla_id: entrada.plantilla_id || null,
      owner: entrada.owner || null,
      fecha_inicio: entrada.fecha_inicio || null,
      fecha_fin: entrada.fecha_fin || null,
      notas: entrada.notas || null
    }

    const { data, error } = await clienteSupabase
      .from('pm_planes_validacion')
      .insert(payload)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as PlanValidacion
  },

  async editarPlan(id: string, entrada: PlanValidacionEntrada) {
    const payload = {
      ...entrada,
      plantilla_id: entrada.plantilla_id || null,
      owner: entrada.owner || null,
      fecha_inicio: entrada.fecha_inicio || null,
      fecha_fin: entrada.fecha_fin || null,
      notas: entrada.notas || null
    }

    const { data, error } = await clienteSupabase
      .from('pm_planes_validacion')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as PlanValidacion
  },

  async eliminarPlan(id: string) {
    const { error } = await clienteSupabase.from('pm_planes_validacion').delete().eq('id', id)
    if (error) {
      throw new Error(error.message)
    }
  },

  async listarPlantillas() {
    const { data, error } = await clienteSupabase
      .from('pm_plantillas_validacion')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as PlantillaValidacion[]
  },

  async crearPlantilla(entrada: PlantillaValidacionEntrada) {
    const { data, error } = await clienteSupabase
      .from('pm_plantillas_validacion')
      .insert(entrada)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as PlantillaValidacion
  },

  async editarPlantilla(id: string, entrada: PlantillaValidacionEntrada) {
    const { data, error } = await clienteSupabase
      .from('pm_plantillas_validacion')
      .update(entrada)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as PlantillaValidacion
  },

  async eliminarPlantilla(id: string) {
    const { error } = await clienteSupabase.from('pm_plantillas_validacion').delete().eq('id', id)
    if (error) {
      throw new Error(error.message)
    }
  },

  async obtenerResumen(): Promise<ResumenValidacion> {
    const [planes, plantillas] = await Promise.all([this.listarPlanes(), this.listarPlantillas()])

    return {
      totalPlanes: planes.length,
      planesActivos: planes.filter((plan) => plan.estado_codigo !== 'completado').length,
      totalPlantillas: plantillas.length
    }
  }
}
