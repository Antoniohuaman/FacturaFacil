import { clienteSupabase } from '@/infraestructura/supabase/clienteSupabase'

interface ScopeOrdenRoadmap {
  campo: string
  valor: string | null
}

function aplicarScopeEnUpdate<TConsulta extends { eq(campo: string, valor: string): TConsulta; is(campo: string, valor: null): TConsulta }>(
  consulta: TConsulta,
  scope: ScopeOrdenRoadmap | null
) {
  if (!scope) {
    return consulta
  }

  return scope.valor ? consulta.eq(scope.campo, scope.valor) : consulta.is(scope.campo, null)
}

export async function listarRegistrosOrdenadosRoadmap<T>(tabla: string, scope: ScopeOrdenRoadmap | null = null) {
  let consulta = clienteSupabase.from(tabla).select('*')

  if (scope) {
    consulta = scope.valor ? consulta.eq(scope.campo, scope.valor) : consulta.is(scope.campo, null)
  }

  const { data, error } = await consulta.order('orden', { ascending: true }).order('updated_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as T[]
}

export async function obtenerSiguienteOrdenRoadmap(tabla: string, scope: ScopeOrdenRoadmap | null = null) {
  let consulta = clienteSupabase.from(tabla).select('orden')

  if (scope) {
    consulta = scope.valor ? consulta.eq(scope.campo, scope.valor) : consulta.is(scope.campo, null)
  }

  const { data, error } = await consulta.order('orden', { ascending: false }).limit(1).maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const ordenActual = typeof data?.orden === 'number' ? data.orden : 0
  return ordenActual + 10
}

export async function reordenarRegistrosRoadmap<T extends { id: string }>(
  tabla: string,
  idsOrdenados: string[],
  scope: ScopeOrdenRoadmap | null = null
) {
  const previas = await listarRegistrosOrdenadosRoadmap<T>(tabla, scope)
  const idsPrevios = previas.map((registro) => registro.id)

  if (idsPrevios.length !== idsOrdenados.length) {
    throw new Error('El contenedor no coincide con la lista enviada para reordenamiento')
  }

  const idsPreviosSet = new Set(idsPrevios)
  if (idsOrdenados.some((id) => !idsPreviosSet.has(id))) {
    throw new Error('La lista enviada contiene registros fuera del contenedor permitido')
  }

  const tareasActualizacion = idsOrdenados.map(async (id, indice) => {
    let consulta = clienteSupabase.from(tabla).update({ orden: (indice + 1) * 10 }).eq('id', id)
    consulta = aplicarScopeEnUpdate(consulta, scope)

    const { error } = await consulta

    if (error) {
      throw new Error(error.message)
    }
  })

  try {
    await Promise.all(tareasActualizacion)
  } catch (error) {
    throw error instanceof Error ? error : new Error('No se pudo persistir el reordenamiento del roadmap')
  }

  const actuales = await listarRegistrosOrdenadosRoadmap<T>(tabla, scope)

  return {
    previas,
    actuales
  }
}