import type { CatalogoModuloPm } from '@/dominio/modelos'

type PanelModulosAjustesProps = {
  esAdmin: boolean
  modulos: CatalogoModuloPm[]
  onCrear: () => void
  onEditar: (modulo: CatalogoModuloPm) => void
  onEliminar: (modulo: CatalogoModuloPm) => void
}

export function PanelModulosAjustes({ esAdmin, modulos, onCrear, onEditar, onEliminar }: PanelModulosAjustesProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Catálogo de módulos</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Mantiene módulos reutilizados por otras áreas del portal PM.
          </p>
        </div>
        <button
          type="button"
          disabled={!esAdmin}
          onClick={onCrear}
          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
        >
          Crear módulo
        </button>
      </div>

      <ul className="grid gap-2 md:grid-cols-2">
        {modulos.map((modulo) => (
          <li key={modulo.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
            <p className="font-medium">{modulo.nombre}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{modulo.codigo} · Orden {modulo.orden}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={!esAdmin}
                onClick={() => onEditar(modulo)}
                className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
              >
                Editar
              </button>
              <button
                type="button"
                disabled={!esAdmin}
                onClick={() => onEliminar(modulo)}
                className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50 dark:border-red-800 dark:text-red-300"
              >
                Eliminar
              </button>
            </div>
          </li>
        ))}

        {modulos.length === 0 ? (
          <li className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No hay módulos configurados.
          </li>
        ) : null}
      </ul>
    </article>
  )
}