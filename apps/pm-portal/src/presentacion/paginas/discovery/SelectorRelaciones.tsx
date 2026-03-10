interface OpcionRelacion {
  id: string
  etiqueta: string
  descripcion?: string
}

interface PropiedadesSelectorRelaciones {
  titulo: string
  opciones: OpcionRelacion[]
  seleccionados: string[]
  deshabilitado?: boolean
  textoVacio?: string
  alAlternar: (id: string, seleccionado: boolean) => void
}

export function SelectorRelaciones({
  titulo,
  opciones,
  seleccionados,
  deshabilitado = false,
  textoVacio = 'No hay elementos disponibles para vincular.',
  alAlternar
}: PropiedadesSelectorRelaciones) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <h3 className="text-sm font-medium">{titulo}</h3>
      <div className="mt-3 max-h-44 space-y-2 overflow-auto text-sm">
        {opciones.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">{textoVacio}</p>
        ) : (
          opciones.map((opcion) => (
            <label key={opcion.id} className="flex items-start gap-2 rounded-lg border border-transparent px-1 py-1 hover:border-slate-200 dark:hover:border-slate-800">
              <input
                type="checkbox"
                disabled={deshabilitado}
                checked={seleccionados.includes(opcion.id)}
                onChange={(evento) => alAlternar(opcion.id, evento.target.checked)}
              />
              <span>
                <span className="block">{opcion.etiqueta}</span>
                {opcion.descripcion ? (
                  <span className="text-xs text-slate-500 dark:text-slate-400">{opcion.descripcion}</span>
                ) : null}
              </span>
            </label>
          ))
        )}
      </div>
    </div>
  )
}