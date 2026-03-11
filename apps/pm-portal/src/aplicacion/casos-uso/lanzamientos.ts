import type {
  ChecklistSalidaEntrada,
  ReleaseEntrada,
  SeguimientoReleaseEntrada
} from '@/compartido/validacion/esquemas'
import type { ReleaseChecklistItemPm } from '@/dominio/modelos'
import { obtenerRegistroTablaPorId, registrarCambioEntidadBestEffort } from '@/aplicacion/casos-uso/historialCambios'
import { repositorioLanzamientos } from '@/infraestructura/repositorios/repositorioLanzamientos'

const MODULO_LANZAMIENTOS = 'lanzamientos'
const TABLA_RELEASES = 'pm_releases'
const TABLA_CHECKLIST = 'pm_release_checklist_items'
const TABLA_SEGUIMIENTO = 'pm_release_seguimiento'

function registrarCambioLanzamientos(
  tabla: string,
  entidad: string,
  accion: 'crear' | 'editar' | 'eliminar',
  entidadId: string,
  antes?: unknown | null,
  despues?: unknown | null,
  metadata?: Record<string, unknown> | null
) {
  return registrarCambioEntidadBestEffort({
    tabla,
    moduloCodigo: MODULO_LANZAMIENTOS,
    entidad,
    entidadId,
    accion,
    antes,
    despues,
    metadata
  })
}

async function registrarCambiosChecklist(previas: ReleaseChecklistItemPm[], actuales: ReleaseChecklistItemPm[]) {
  const previasPorId = new Map(previas.map((item) => [item.id, item]))
  const actualesPorId = new Map(actuales.map((item) => [item.id, item]))
  const tareas: Promise<unknown>[] = []

  for (const item of actuales) {
    const previa = previasPorId.get(item.id)

    if (!previa) {
      tareas.push(registrarCambioLanzamientos(TABLA_CHECKLIST, 'checklist_salida', 'crear', item.id, null, item))
      continue
    }

    if (JSON.stringify(previa) !== JSON.stringify(item)) {
      tareas.push(registrarCambioLanzamientos(TABLA_CHECKLIST, 'checklist_salida', 'editar', item.id, previa, item))
    }
  }

  for (const item of previas) {
    if (!actualesPorId.has(item.id)) {
      tareas.push(registrarCambioLanzamientos(TABLA_CHECKLIST, 'checklist_salida', 'eliminar', item.id, item, null))
    }
  }

  await Promise.all(tareas)
}

export function listarReleases() {
  return repositorioLanzamientos.listarReleases()
}

export function listarChecklistSalida(releaseId?: string) {
  return repositorioLanzamientos.listarChecklistSalida(releaseId)
}

export async function crearRelease(entrada: ReleaseEntrada, checklist: ChecklistSalidaEntrada[] = []) {
  const creado = await repositorioLanzamientos.crearRelease(entrada)
  const checklistSincronizado = await repositorioLanzamientos.sincronizarChecklistSalida(creado.id, checklist)

  await Promise.all([
    registrarCambioLanzamientos(TABLA_RELEASES, 'release', 'crear', creado.id, null, creado, {
      checklist_salida: checklistSincronizado.actuales.length
    }),
    registrarCambiosChecklist(checklistSincronizado.previas, checklistSincronizado.actuales)
  ])

  return creado
}

export async function editarRelease(id: string, entrada: ReleaseEntrada, checklist: ChecklistSalidaEntrada[] = []) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_RELEASES, id)
  const actualizado = await repositorioLanzamientos.editarRelease(id, entrada)
  const checklistSincronizado = await repositorioLanzamientos.sincronizarChecklistSalida(id, checklist)

  await Promise.all([
    registrarCambioLanzamientos(TABLA_RELEASES, 'release', 'editar', actualizado.id, antes, actualizado, {
      checklist_salida: checklistSincronizado.actuales.length
    }),
    registrarCambiosChecklist(checklistSincronizado.previas, checklistSincronizado.actuales)
  ])

  return actualizado
}

export async function eliminarRelease(id: string) {
  const [antes, checklist, seguimientos] = await Promise.all([
    obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_RELEASES, id),
    repositorioLanzamientos.listarChecklistSalida(id),
    repositorioLanzamientos.listarSeguimientos().then((registros) => registros.filter((registro) => registro.release_id === id))
  ])

  await repositorioLanzamientos.eliminarRelease(id)
  await Promise.all([
    registrarCambioLanzamientos(TABLA_RELEASES, 'release', 'eliminar', id, antes, null),
    ...checklist.map((item) => registrarCambioLanzamientos(TABLA_CHECKLIST, 'checklist_salida', 'eliminar', item.id, item, null)),
    ...seguimientos.map((registro) =>
      registrarCambioLanzamientos(TABLA_SEGUIMIENTO, 'seguimiento_post_lanzamiento', 'eliminar', registro.id, registro, null)
    )
  ])
}

export async function reordenarChecklistSalida(releaseId: string, checklist: ChecklistSalidaEntrada[]) {
  const resultado = await repositorioLanzamientos.sincronizarChecklistSalida(releaseId, checklist)
  await registrarCambiosChecklist(resultado.previas, resultado.actuales)
  return resultado.actuales
}

export function listarSeguimientosRelease() {
  return repositorioLanzamientos.listarSeguimientos()
}

export async function crearSeguimientoRelease(entrada: SeguimientoReleaseEntrada) {
  const creado = await repositorioLanzamientos.crearSeguimiento(entrada)
  await registrarCambioLanzamientos(TABLA_SEGUIMIENTO, 'seguimiento_post_lanzamiento', 'crear', creado.id, null, creado)
  return creado
}

export async function editarSeguimientoRelease(id: string, entrada: SeguimientoReleaseEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_SEGUIMIENTO, id)
  const actualizado = await repositorioLanzamientos.editarSeguimiento(id, entrada)
  await registrarCambioLanzamientos(
    TABLA_SEGUIMIENTO,
    'seguimiento_post_lanzamiento',
    'editar',
    actualizado.id,
    antes,
    actualizado
  )
  return actualizado
}

export async function eliminarSeguimientoRelease(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_SEGUIMIENTO, id)
  await repositorioLanzamientos.eliminarSeguimiento(id)
  await registrarCambioLanzamientos(TABLA_SEGUIMIENTO, 'seguimiento_post_lanzamiento', 'eliminar', id, antes, null)
}

export async function obtenerContadoresLanzamientos() {
  const [releases, checklist, seguimientos] = await Promise.all([
    repositorioLanzamientos.listarReleases(),
    repositorioLanzamientos.listarChecklistSalida(),
    repositorioLanzamientos.listarSeguimientos()
  ])

  return {
    releases,
    checklist,
    seguimientos
  }
}