import type { ObjetivoEntrada } from '@/compartido/validacion/esquemas'
import { repositorioObjetivos } from '@/infraestructura/repositorios/repositorioObjetivos'

export function listarObjetivos() {
  return repositorioObjetivos.listar()
}

export async function crearObjetivo(entrada: ObjetivoEntrada) {
  const creado = await repositorioObjetivos.crear(entrada)
  return creado
}

export async function editarObjetivo(id: string, entrada: ObjetivoEntrada) {
  const actualizado = await repositorioObjetivos.editar(id, entrada)
  return actualizado
}

export async function eliminarObjetivo(id: string) {
  await repositorioObjetivos.eliminar(id)
}
