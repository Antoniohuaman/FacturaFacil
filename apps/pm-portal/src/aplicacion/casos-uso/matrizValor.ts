import type { MatrizValorEntrada } from '@/compartido/validacion/esquemas'
import { repositorioMatrizValor } from '@/infraestructura/repositorios/repositorioMatrizValor'
import { obtenerRegistroTablaPorId, registrarCambioEntidadBestEffort } from '@/aplicacion/casos-uso/historialCambios'

const TABLA_MATRIZ_VALOR = 'matriz_valor'

function calcularPuntajeValor(entrada: MatrizValorEntrada) {
  return Number((entrada.valor_negocio * 2 - entrada.esfuerzo - entrada.riesgo).toFixed(2))
}

export function listarMatrizValor() {
  return repositorioMatrizValor.listar()
}

export async function crearMatrizValor(entrada: MatrizValorEntrada) {
  const creada = await repositorioMatrizValor.crear({ ...entrada, puntaje_valor: calcularPuntajeValor(entrada) })
  await registrarCambioEntidadBestEffort({
    tabla: TABLA_MATRIZ_VALOR,
    moduloCodigo: 'matriz_valor',
    entidad: 'matriz_valor',
    entidadId: creada.id,
    accion: 'crear',
    despues: creada
  })
  return creada
}

export async function editarMatrizValor(id: string, entrada: MatrizValorEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_MATRIZ_VALOR, id)
  const actualizada = await repositorioMatrizValor.editar(id, {
    ...entrada,
    puntaje_valor: calcularPuntajeValor(entrada)
  })
  await registrarCambioEntidadBestEffort({
    tabla: TABLA_MATRIZ_VALOR,
    moduloCodigo: 'matriz_valor',
    entidad: 'matriz_valor',
    entidadId: actualizada.id,
    accion: 'editar',
    antes,
    despues: actualizada
  })
  return actualizada
}

export async function eliminarMatrizValor(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_MATRIZ_VALOR, id)
  await repositorioMatrizValor.eliminar(id)
  await registrarCambioEntidadBestEffort({
    tabla: TABLA_MATRIZ_VALOR,
    moduloCodigo: 'matriz_valor',
    entidad: 'matriz_valor',
    entidadId: id,
    accion: 'eliminar',
    antes
  })
}
