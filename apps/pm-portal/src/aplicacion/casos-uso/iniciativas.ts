import type { IniciativaEntrada } from '@/compartido/validacion/esquemas'
import { repositorioIniciativas } from '@/infraestructura/repositorios/repositorioIniciativas'
import { registrarEventoAnalitica } from '@/infraestructura/analitica/seguimientoPortalPM'

function calcularRice(entrada: IniciativaEntrada) {
  return Number(((entrada.alcance * entrada.impacto * entrada.confianza) / entrada.esfuerzo).toFixed(2))
}

export function listarIniciativas() {
  return repositorioIniciativas.listar()
}

export async function crearIniciativa(entrada: IniciativaEntrada) {
  const creado = await repositorioIniciativas.crear({ ...entrada, rice: calcularRice(entrada) })
  registrarEventoAnalitica('pm_iniciativa_creada', { iniciativa_id: creado.id })
  return creado
}

export async function editarIniciativa(id: string, entrada: IniciativaEntrada) {
  const actualizada = await repositorioIniciativas.editar(id, { ...entrada, rice: calcularRice(entrada) })
  registrarEventoAnalitica('pm_iniciativa_editada', { iniciativa_id: actualizada.id })
  return actualizada
}

export async function eliminarIniciativa(id: string) {
  await repositorioIniciativas.eliminar(id)
  registrarEventoAnalitica('pm_iniciativa_eliminada', { iniciativa_id: id })
}
