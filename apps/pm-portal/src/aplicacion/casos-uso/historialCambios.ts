import type { AccionHistorialCambio } from '@/dominio/modelos'
import { clienteSupabase } from '@/infraestructura/supabase/clienteSupabase'
import {
  repositorioHistorialCambios,
  type FiltrosHistorialCambios
} from '@/infraestructura/repositorios/repositorioHistorialCambios'

interface RegistrarCambioEntidadEntrada {
  tabla: string
  moduloCodigo: string
  entidad: string
  entidadId: string
  accion: AccionHistorialCambio
  antes?: unknown | null
  despues?: unknown | null
  metadata?: Record<string, unknown> | null
}

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function extraerEtiquetaRegistro(registro: unknown) {
  if (!esRegistro(registro)) {
    return null
  }

  const clavesPreferidas = [
    'nombre',
    'titulo',
    'codigo',
    'clave',
    'clave_kpi',
    'etiqueta_visible',
    'fecha_auditoria',
    'fecha_ejecucion'
  ]

  for (const clave of clavesPreferidas) {
    const valor = registro[clave]
    if (typeof valor === 'string' && valor.trim()) {
      return valor.trim()
    }
  }

  return null
}

function obtenerCamposModificados(
  antes: unknown,
  despues: unknown
) {
  if (!esRegistro(antes) || !esRegistro(despues)) {
    return [] as string[]
  }

  const claves = new Set([...Object.keys(antes), ...Object.keys(despues)])
  return [...claves].filter((clave) => JSON.stringify(antes[clave]) !== JSON.stringify(despues[clave]))
}

function construirResumenCambio(
  accion: AccionHistorialCambio,
  entidad: string,
  antes: unknown,
  despues: unknown
) {
  const etiqueta = extraerEtiquetaRegistro(despues) ?? extraerEtiquetaRegistro(antes)
  const entidadLegible = entidad.replace(/_/g, ' ')

  if (accion === 'crear') {
    return etiqueta ? `Creación de ${entidadLegible}: ${etiqueta}` : `Creación de ${entidadLegible}`
  }

  if (accion === 'eliminar') {
    return etiqueta ? `Eliminación de ${entidadLegible}: ${etiqueta}` : `Eliminación de ${entidadLegible}`
  }

  return etiqueta ? `Actualización de ${entidadLegible}: ${etiqueta}` : `Actualización de ${entidadLegible}`
}

async function obtenerActorActual() {
  try {
    const {
      data: { user }
    } = await clienteSupabase.auth.getUser()

    return {
      actor_user_id: user?.id ?? null,
      actor_email: user?.email ?? null
    }
  } catch {
    return {
      actor_user_id: null,
      actor_email: null
    }
  }
}

export function listarHistorialCambios(filtros: FiltrosHistorialCambios = {}) {
  return repositorioHistorialCambios.listar(filtros)
}

export function obtenerRegistroTablaPorId<T>(tabla: string, id: string) {
  return repositorioHistorialCambios.obtenerRegistroPorId<T>(tabla, id)
}

export async function registrarCambioEntidadBestEffort({
  tabla,
  moduloCodigo,
  entidad,
  entidadId,
  accion,
  antes = null,
  despues = null,
  metadata = null
}: RegistrarCambioEntidadEntrada) {
  try {
    const actor = await obtenerActorActual()
    const camposModificados = obtenerCamposModificados(antes, despues)

    await repositorioHistorialCambios.registrar({
      modulo_codigo: moduloCodigo,
      entidad,
      entidad_id: entidadId,
      accion,
      resumen: construirResumenCambio(accion, entidad, antes, despues),
      actor_user_id: actor.actor_user_id,
      actor_email: actor.actor_email,
      antes_json: antes,
      despues_json: despues,
      metadata_json: {
        tabla,
        campos_modificados: camposModificados,
        ...(metadata ?? {})
      }
    })
  } catch (error) {
    console.error('No se pudo registrar historial de cambios', error)
  }
}