import type { AuditoriaPm, HallazgoAuditoriaPm, CatalogoTipoAuditoriaPm } from '@/dominio/modelos'
import type { AuditoriaPmEntrada, HallazgoAuditoriaEntrada } from '@/compartido/validacion/esquemas'
import { clienteSupabase } from '@/infraestructura/supabase/clienteSupabase'

export const repositorioAuditorias = {
  async listarTiposAuditoria() {
    const { data, error } = await clienteSupabase
      .from('pm_catalogo_tipos_auditoria')
      .select('*')
      .eq('activo', true)
      .order('nombre', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as CatalogoTipoAuditoriaPm[]
  },

  async listarAuditorias() {
    const { data, error } = await clienteSupabase
      .from('pm_auditorias')
      .select('*')
      .order('fecha_auditoria', { ascending: false })
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as AuditoriaPm[]
  },

  async crearAuditoria(entrada: AuditoriaPmEntrada) {
    const payload = {
      ...entrada,
      responsable: entrada.responsable || null
    }

    const { data, error } = await clienteSupabase.from('pm_auditorias').insert(payload).select('*').single()

    if (error) {
      throw new Error(error.message)
    }

    return data as AuditoriaPm
  },

  async editarAuditoria(id: string, entrada: AuditoriaPmEntrada) {
    const payload = {
      ...entrada,
      responsable: entrada.responsable || null
    }

    const { data, error } = await clienteSupabase
      .from('pm_auditorias')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as AuditoriaPm
  },

  async eliminarAuditoria(id: string) {
    const { error } = await clienteSupabase.from('pm_auditorias').delete().eq('id', id)
    if (error) {
      throw new Error(error.message)
    }
  },

  async listarHallazgos() {
    const { data, error } = await clienteSupabase
      .from('pm_hallazgos_auditoria')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as HallazgoAuditoriaPm[]
  },

  async crearHallazgo(entrada: HallazgoAuditoriaEntrada) {
    const payload = {
      ...entrada,
      modulo_id: entrada.modulo_id || null,
      decision_id: entrada.decision_id || null,
      ejecucion_validacion_id: entrada.ejecucion_validacion_id || null,
      evidencia_url: entrada.evidencia_url || null
    }

    const { data, error } = await clienteSupabase
      .from('pm_hallazgos_auditoria')
      .insert(payload)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as HallazgoAuditoriaPm
  },

  async editarHallazgo(id: string, entrada: HallazgoAuditoriaEntrada) {
    const payload = {
      ...entrada,
      modulo_id: entrada.modulo_id || null,
      decision_id: entrada.decision_id || null,
      ejecucion_validacion_id: entrada.ejecucion_validacion_id || null,
      evidencia_url: entrada.evidencia_url || null
    }

    const { data, error } = await clienteSupabase
      .from('pm_hallazgos_auditoria')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as HallazgoAuditoriaPm
  },

  async eliminarHallazgo(id: string) {
    const { error } = await clienteSupabase.from('pm_hallazgos_auditoria').delete().eq('id', id)
    if (error) {
      throw new Error(error.message)
    }
  }
}
