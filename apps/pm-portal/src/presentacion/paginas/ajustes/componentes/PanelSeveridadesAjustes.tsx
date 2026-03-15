import type { CatalogoSeveridadPm } from '@/dominio/modelos'

type PanelSeveridadesAjustesProps = {
  esAdmin: boolean
  severidades: CatalogoSeveridadPm[]
  onCrear: () => void
  onEditar: (severidad: CatalogoSeveridadPm) => void
  onEliminar: (severidad: CatalogoSeveridadPm) => void
}

export function PanelSeveridadesAjustes({
  esAdmin,
  severidades,
  onCrear,
  onEditar,
  onEliminar
}: PanelSeveridadesAjustesProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Catálogo de severidades</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Administra niveles de criticidad usados por auditorías y seguimiento.
          </p>
        </div>
        <button
          type="button"
          disabled={!esAdmin}
          onClick={onCrear}
          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
        >
          Crear severidad
        </button>
      </div>

      <ul className="grid gap-2 md:grid-cols-3">
        {severidades.map((severidad) => (
          <li key={severidad.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
            <p className="font-medium">{severidad.nombre}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {severidad.codigo} · Nivel {severidad.nivel}
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={!esAdmin}
                onClick={() => onEditar(severidad)}
                className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
              >
                Editar
              </button>
              <button
                type="button"
                disabled={!esAdmin}
                onClick={() => onEliminar(severidad)}
                className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50 dark:border-red-800 dark:text-red-300"
              >
                Eliminar
              </button>
            </div>
          </li>
        ))}

        {severidades.length === 0 ? (
          <li className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No hay severidades configuradas.
          </li>
        ) : null}
      </ul>
    </article>
  )
}