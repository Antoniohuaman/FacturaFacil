import type { IniciativaEntrada } from '@/compartido/validacion/esquemas'
import { repositorioIniciativas } from '@/infraestructura/repositorios/repositorioIniciativas'
import { calcularRice } from '@/compartido/utilidades/calcularRice'
import { obtenerRegistroTablaPorId, registrarCambioEntidadBestEffort } from '@/aplicacion/casos-uso/historialCambios'

const TABLA_INICIATIVAS = 'iniciativas'

export function listarIniciativas() {
  return repositorioIniciativas.listar()
}

export async function crearIniciativa(entrada: IniciativaEntrada) {
  const creado = await repositorioIniciativas.crear({ ...entrada, rice: calcularRice(entrada) })
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
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_INICIATIVAS, id)
  const actualizada = await repositorioIniciativas.editar(id, { ...entrada, rice: calcularRice(entrada) })
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
