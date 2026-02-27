import type { MatrizValorEntrada } from '@/compartido/validacion/esquemas'
import { repositorioMatrizValor } from '@/infraestructura/repositorios/repositorioMatrizValor'
import { registrarEventoAnalitica } from '@/infraestructura/analitica/seguimientoPortalPM'

function calcularPuntajeValor(entrada: MatrizValorEntrada) {
  return Number((entrada.valor_negocio * 2 - entrada.esfuerzo - entrada.riesgo).toFixed(2))
}

export function listarMatrizValor() {
  return repositorioMatrizValor.listar()
}

export async function crearMatrizValor(entrada: MatrizValorEntrada) {
  const creada = await repositorioMatrizValor.crear({ ...entrada, puntaje_valor: calcularPuntajeValor(entrada) })
  registrarEventoAnalitica('pm_matriz_actualizada', { matriz_valor_id: creada.id, accion: 'crear' })
  return creada
}

export async function editarMatrizValor(id: string, entrada: MatrizValorEntrada) {
  const actualizada = await repositorioMatrizValor.editar(id, {
    ...entrada,
    puntaje_valor: calcularPuntajeValor(entrada)
  })
  registrarEventoAnalitica('pm_matriz_actualizada', { matriz_valor_id: actualizada.id, accion: 'editar' })
  return actualizada
}

export async function eliminarMatrizValor(id: string) {
  await repositorioMatrizValor.eliminar(id)
  registrarEventoAnalitica('pm_matriz_actualizada', { matriz_valor_id: id, accion: 'eliminar' })
}
