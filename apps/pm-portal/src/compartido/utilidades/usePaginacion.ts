import { useEffect, useMemo, useState } from 'react'

interface OpcionesPaginacion<T> {
  items: T[]
  paginaInicial?: number
  tamanoInicial?: number
}

export function usePaginacion<T>({ items, paginaInicial = 1, tamanoInicial = 10 }: OpcionesPaginacion<T>) {
  const [paginaActual, setPaginaActual] = useState(paginaInicial)
  const [tamanoPagina, setTamanoPagina] = useState(tamanoInicial)

  const totalItems = items.length
  const totalPaginas = Math.max(1, Math.ceil(totalItems / tamanoPagina))

  useEffect(() => {
    if (paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas)
    }
  }, [paginaActual, totalPaginas])

  const itemsPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * tamanoPagina
    return items.slice(inicio, inicio + tamanoPagina)
  }, [items, paginaActual, tamanoPagina])

  const desde = totalItems === 0 ? 0 : (paginaActual - 1) * tamanoPagina + 1
  const hasta = totalItems === 0 ? 0 : Math.min(paginaActual * tamanoPagina, totalItems)

  return {
    paginaActual,
    setPaginaActual,
    tamanoPagina,
    setTamanoPagina,
    totalItems,
    totalPaginas,
    desde,
    hasta,
    itemsPaginados
  }
}
