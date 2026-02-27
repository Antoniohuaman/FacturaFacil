import type { ObjetivoEntrada } from '@/compartido/validacion/esquemas'
import { repositorioObjetivos } from '@/infraestructura/repositorios/repositorioObjetivos'
import { registrarEventoAnalitica } from '@/infraestructura/analitica/seguimientoPortalPM'

export function listarObjetivos() {
  return repositorioObjetivos.listar()
}

export async function crearObjetivo(entrada: ObjetivoEntrada) {
  const creado = await repositorioObjetivos.crear(entrada)
  registrarEventoAnalitica('pm_objetivo_creado', { objetivo_id: creado.id })
  return creado
}

export async function editarObjetivo(id: string, entrada: ObjetivoEntrada) {
  const actualizado = await repositorioObjetivos.editar(id, entrada)
  registrarEventoAnalitica('pm_objetivo_editado', { objetivo_id: actualizado.id })
  return actualizado
}

export async function eliminarObjetivo(id: string) {
  await repositorioObjetivos.eliminar(id)
  registrarEventoAnalitica('pm_objetivo_eliminado', { objetivo_id: id })
}
