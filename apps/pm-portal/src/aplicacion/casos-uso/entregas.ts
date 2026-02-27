import type { EntregaEntrada } from '@/compartido/validacion/esquemas'
import { repositorioEntregas } from '@/infraestructura/repositorios/repositorioEntregas'
import { registrarEventoAnalitica } from '@/infraestructura/analitica/seguimientoPortalPM'

export function listarEntregas() {
  return repositorioEntregas.listar()
}

export async function crearEntrega(entrada: EntregaEntrada) {
  const creada = await repositorioEntregas.crear(entrada)
  registrarEventoAnalitica('pm_entrega_creada', { entrega_id: creada.id })
  return creada
}

export async function editarEntrega(id: string, entrada: EntregaEntrada) {
  const actualizada = await repositorioEntregas.editar(id, entrada)
  registrarEventoAnalitica('pm_entrega_editada', { entrega_id: actualizada.id })
  return actualizada
}

export async function eliminarEntrega(id: string) {
  await repositorioEntregas.eliminar(id)
  registrarEventoAnalitica('pm_entrega_eliminada', { entrega_id: id })
}
