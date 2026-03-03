interface PropiedadesPaginacionTabla {
  paginaActual: number
  totalPaginas: number
  totalItems: number
  desde: number
  hasta: number
  tamanoPagina: number
  alCambiarTamanoPagina: (tamano: number) => void
  alCambiarPagina: (pagina: number) => void
}

const tamanosDisponibles = [10, 25, 50]

export function PaginacionTabla({
  paginaActual,
  totalPaginas,
  totalItems,
  desde,
  hasta,
  tamanoPagina,
  alCambiarTamanoPagina,
  alCambiarPagina
}: PropiedadesPaginacionTabla) {
  return (
    <div className="mt-3 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm md:flex-row md:items-center md:justify-between dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-600 dark:text-slate-400">Items por página</label>
        <select
          value={tamanoPagina}
          onChange={(evento) => alCambiarTamanoPagina(Number(evento.target.value))}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
        >
          {tamanosDisponibles.map((tamano) => (
            <option key={tamano} value={tamano}>
              {tamano}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-400">
        Mostrando {desde}–{hasta} de {totalItems}
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => alCambiarPagina(1)}
          disabled={paginaActual <= 1}
          className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
        >
          Primera
        </button>
        <button
          type="button"
          onClick={() => alCambiarPagina(paginaActual - 1)}
          disabled={paginaActual <= 1}
          className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
        >
          Anterior
        </button>
        <span className="px-2 text-xs">
          {paginaActual}/{totalPaginas}
        </span>
        <button
          type="button"
          onClick={() => alCambiarPagina(paginaActual + 1)}
          disabled={paginaActual >= totalPaginas}
          className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
        >
          Siguiente
        </button>
        <button
          type="button"
          onClick={() => alCambiarPagina(totalPaginas)}
          disabled={paginaActual >= totalPaginas}
          className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
        >
          Última
        </button>
      </div>
    </div>
  )
}