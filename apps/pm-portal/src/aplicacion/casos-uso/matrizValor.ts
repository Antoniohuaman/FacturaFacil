import type { MatrizValorEntrada } from '@/compartido/validacion/esquemas'
import { repositorioMatrizValor } from '@/infraestructura/repositorios/repositorioMatrizValor'

function calcularPuntajeValor(entrada: MatrizValorEntrada) {
  return Number((entrada.valor_negocio * 2 - entrada.esfuerzo - entrada.riesgo).toFixed(2))
}

export function listarMatrizValor() {
  return repositorioMatrizValor.listar()
}

export async function crearMatrizValor(entrada: MatrizValorEntrada) {
  const creada = await repositorioMatrizValor.crear({ ...entrada, puntaje_valor: calcularPuntajeValor(entrada) })
  return creada
}

export async function editarMatrizValor(id: string, entrada: MatrizValorEntrada) {
  const actualizada = await repositorioMatrizValor.editar(id, {
    ...entrada,
    puntaje_valor: calcularPuntajeValor(entrada)
  })
  return actualizada
}

export async function eliminarMatrizValor(id: string) {
  await repositorioMatrizValor.eliminar(id)
}
