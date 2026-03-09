import type { ObjetivoEntrada } from '@/compartido/validacion/esquemas'
import { repositorioObjetivos } from '@/infraestructura/repositorios/repositorioObjetivos'
import { obtenerRegistroTablaPorId, registrarCambioEntidadBestEffort } from '@/aplicacion/casos-uso/historialCambios'

const TABLA_OBJETIVOS = 'objetivos'

export function listarObjetivos() {
  return repositorioObjetivos.listar()
}

export async function crearObjetivo(entrada: ObjetivoEntrada) {
  const creado = await repositorioObjetivos.crear(entrada)
  await registrarCambioEntidadBestEffort({
    tabla: TABLA_OBJETIVOS,
    moduloCodigo: 'roadmap',
    entidad: 'objetivo',
    entidadId: creado.id,
    accion: 'crear',
    despues: creado
  })
  return creado
}

export async function editarObjetivo(id: string, entrada: ObjetivoEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_OBJETIVOS, id)
  const actualizado = await repositorioObjetivos.editar(id, entrada)
  await registrarCambioEntidadBestEffort({
    tabla: TABLA_OBJETIVOS,
    moduloCodigo: 'roadmap',
    entidad: 'objetivo',
    entidadId: actualizado.id,
    accion: 'editar',
    antes,
    despues: actualizado
  })
  return actualizado
}

export async function eliminarObjetivo(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_OBJETIVOS, id)
  await repositorioObjetivos.eliminar(id)
  await registrarCambioEntidadBestEffort({
    tabla: TABLA_OBJETIVOS,
    moduloCodigo: 'roadmap',
    entidad: 'objetivo',
    entidadId: id,
    accion: 'eliminar',
    antes
  })
}
