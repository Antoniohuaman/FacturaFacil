import type { IniciativaEntrada } from '@/compartido/validacion/esquemas'
import { repositorioIniciativas } from '@/infraestructura/repositorios/repositorioIniciativas'

function calcularRice(entrada: IniciativaEntrada) {
  return Number(((entrada.alcance * entrada.impacto * entrada.confianza) / entrada.esfuerzo).toFixed(2))
}

export function listarIniciativas() {
  return repositorioIniciativas.listar()
}

export async function crearIniciativa(entrada: IniciativaEntrada) {
  const creado = await repositorioIniciativas.crear({ ...entrada, rice: calcularRice(entrada) })
  return creado
}

export async function editarIniciativa(id: string, entrada: IniciativaEntrada) {
  const actualizada = await repositorioIniciativas.editar(id, { ...entrada, rice: calcularRice(entrada) })
  return actualizada
}

export async function eliminarIniciativa(id: string) {
  await repositorioIniciativas.eliminar(id)
}
