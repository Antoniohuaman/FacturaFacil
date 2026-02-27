import type { EntregaEntrada } from '@/compartido/validacion/esquemas'
import { repositorioEntregas } from '@/infraestructura/repositorios/repositorioEntregas'

export function listarEntregas() {
  return repositorioEntregas.listar()
}

export async function crearEntrega(entrada: EntregaEntrada) {
  const creada = await repositorioEntregas.crear(entrada)
  return creada
}

export async function editarEntrega(id: string, entrada: EntregaEntrada) {
  const actualizada = await repositorioEntregas.editar(id, entrada)
  return actualizada
}

export async function eliminarEntrega(id: string) {
  await repositorioEntregas.eliminar(id)
}
