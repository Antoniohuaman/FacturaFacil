import {
  type IniciativaEntrada,
  reordenamientoIniciativasRoadmapSchema,
  type ReordenamientoIniciativasRoadmapEntrada
} from '@/compartido/validacion/esquemas'
import { repositorioIniciativas } from '@/infraestructura/repositorios/repositorioIniciativas'
import { repositorioObjetivos } from '@/infraestructura/repositorios/repositorioObjetivos'
import { calcularRice } from '@/compartido/utilidades/calcularRice'
import { obtenerRegistroTablaPorId, registrarCambioEntidadBestEffort } from '@/aplicacion/casos-uso/historialCambios'
import { asegurarIniciativaDentroDeObjetivo } from '@/aplicacion/validaciones/contencionJerarquicaRoadmap'
import { registrarCambiosOrdenRoadmapBestEffort } from '@/aplicacion/casos-uso/roadmapOrdenHistorial'

const TABLA_INICIATIVAS = 'iniciativas'

async function obtenerObjetivoPadre(objetivoId: string | null | undefined) {
  if (!objetivoId) {
    return null
  }

  return repositorioObjetivos.obtenerPorId(objetivoId)
}

export function listarIniciativas() {
  return repositorioIniciativas.listar()
}

export async function crearIniciativa(entrada: IniciativaEntrada) {
  const objetivoPadre = await obtenerObjetivoPadre(entrada.objetivo_id)
  asegurarIniciativaDentroDeObjetivo(entrada, objetivoPadre)

  const orden = await repositorioIniciativas.obtenerSiguienteOrdenEnObjetivo(entrada.objetivo_id ?? null)
  const creado = await repositorioIniciativas.crear({ ...entrada, orden, rice: calcularRice(entrada) })
  await registrarCambioEntidadBestEffort({
    tabla: TABLA_INICIATIVAS,
    moduloCodigo: 'roadmap',
    entidad: 'iniciativa',
    entidadId: creado.id,
    accion: 'crear',
    despues: creado
  })
  return creado
}

export async function editarIniciativa(id: string, entrada: IniciativaEntrada) {
  const objetivoPadre = await obtenerObjetivoPadre(entrada.objetivo_id)
  asegurarIniciativaDentroDeObjetivo(entrada, objetivoPadre)

  const iniciativaActual = await repositorioIniciativas.obtenerPorId(id)
  if (!iniciativaActual) {
    throw new Error('No se encontró la iniciativa a editar')
  }

  const cambioDeObjetivo = iniciativaActual.objetivo_id !== (entrada.objetivo_id ?? null)
  const orden = cambioDeObjetivo
    ? await repositorioIniciativas.obtenerSiguienteOrdenEnObjetivo(entrada.objetivo_id ?? null)
    : iniciativaActual.orden

  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_INICIATIVAS, id)
  const actualizada = await repositorioIniciativas.editar(id, { ...entrada, orden, rice: calcularRice(entrada) })
  await registrarCambioEntidadBestEffort({
    tabla: TABLA_INICIATIVAS,
    moduloCodigo: 'roadmap',
    entidad: 'iniciativa',
    entidadId: actualizada.id,
    accion: 'editar',
    antes,
    despues: actualizada
  })
  return actualizada
}

export async function eliminarIniciativa(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_INICIATIVAS, id)
  await repositorioIniciativas.eliminar(id)
  await registrarCambioEntidadBestEffort({
    tabla: TABLA_INICIATIVAS,
    moduloCodigo: 'roadmap',
    entidad: 'iniciativa',
    entidadId: id,
    accion: 'eliminar',
    antes
  })
}

export async function reordenarIniciativasRoadmap(entrada: ReordenamientoIniciativasRoadmapEntrada) {
  const { objetivo_id, ids } = reordenamientoIniciativasRoadmapSchema.parse(entrada)
  const { previas, actuales } = await repositorioIniciativas.reordenarEnObjetivo(objetivo_id, ids)
  await registrarCambiosOrdenRoadmapBestEffort({
    tabla: TABLA_INICIATIVAS,
    entidad: 'iniciativa',
    previas,
    actuales,
    metadata: {
      objetivo_id
    }
  })
  return actuales
}
