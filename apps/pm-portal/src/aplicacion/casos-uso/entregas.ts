import type { EntregaEntrada } from '@/compartido/validacion/esquemas'
import { repositorioEntregas } from '@/infraestructura/repositorios/repositorioEntregas'
import { obtenerRegistroTablaPorId, registrarCambioEntidadBestEffort } from '@/aplicacion/casos-uso/historialCambios'

const TABLA_ENTREGAS = 'entregas'

export function listarEntregas() {
  return repositorioEntregas.listar()
}

export async function crearEntrega(entrada: EntregaEntrada) {
  const creada = await repositorioEntregas.crear(entrada)
  await registrarCambioEntidadBestEffort({
    tabla: TABLA_ENTREGAS,
    moduloCodigo: 'roadmap',
    entidad: 'entrega',
    entidadId: creada.id,
    accion: 'crear',
    despues: creada
  })
  return creada
}

export async function editarEntrega(id: string, entrada: EntregaEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_ENTREGAS, id)
  const actualizada = await repositorioEntregas.editar(id, entrada)
  await registrarCambioEntidadBestEffort({
    tabla: TABLA_ENTREGAS,
    moduloCodigo: 'roadmap',
    entidad: 'entrega',
    entidadId: actualizada.id,
    accion: 'editar',
    antes,
    despues: actualizada
  })
  return actualizada
}

export async function eliminarEntrega(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_ENTREGAS, id)
  await repositorioEntregas.eliminar(id)
  await registrarCambioEntidadBestEffort({
    tabla: TABLA_ENTREGAS,
    moduloCodigo: 'roadmap',
    entidad: 'entrega',
    entidadId: id,
    accion: 'eliminar',
    antes
  })
}
