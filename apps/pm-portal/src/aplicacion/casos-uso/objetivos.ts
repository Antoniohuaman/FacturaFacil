import {
  type ObjetivoEntrada,
  reordenamientoObjetivosRoadmapSchema,
  type ReordenamientoObjetivosRoadmapEntrada
} from '@/compartido/validacion/esquemas'
import { repositorioObjetivos } from '@/infraestructura/repositorios/repositorioObjetivos'
import { obtenerRegistroTablaPorId, registrarCambioEntidadBestEffort } from '@/aplicacion/casos-uso/historialCambios'
import { registrarCambiosOrdenRoadmapBestEffort } from '@/aplicacion/casos-uso/roadmapOrdenHistorial'

const TABLA_OBJETIVOS = 'objetivos'

export function listarObjetivos() {
  return repositorioObjetivos.listar()
}

export async function crearObjetivo(entrada: ObjetivoEntrada) {
  const orden = await repositorioObjetivos.obtenerSiguienteOrden()
  const creado = await repositorioObjetivos.crear({ ...entrada, orden })
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
  const objetivoActual = await repositorioObjetivos.obtenerPorId(id)

  if (!objetivoActual) {
    throw new Error('No se encontró el objetivo a editar')
  }

  const actualizado = await repositorioObjetivos.editar(id, { ...entrada, orden: objetivoActual.orden })
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

export async function reordenarObjetivosRoadmap(entrada: ReordenamientoObjetivosRoadmapEntrada) {
  const idsOrdenados = reordenamientoObjetivosRoadmapSchema.parse(entrada)
  const { previas, actuales } = await repositorioObjetivos.reordenar(idsOrdenados)
  await registrarCambiosOrdenRoadmapBestEffort({
    tabla: TABLA_OBJETIVOS,
    entidad: 'objetivo',
    previas,
    actuales
  })
  return actuales
}
