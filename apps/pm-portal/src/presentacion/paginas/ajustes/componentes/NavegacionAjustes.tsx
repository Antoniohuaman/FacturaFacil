import { seccionesAjustes, type AjustesSeccionId } from '@/presentacion/paginas/ajustes/modeloAjustes'

type NavegacionAjustesProps = {
  seccionActiva: AjustesSeccionId
  onSeleccionar: (seccion: AjustesSeccionId) => void
}

export function NavegacionAjustes({ seccionActiva, onSeleccionar }: NavegacionAjustesProps) {
  return (
    <nav className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Secciones de ajustes">
      {seccionesAjustes.map((seccion) => {
        const activa = seccion.id === seccionActiva

        return (
          <button
            key={seccion.id}
            type="button"
            onClick={() => onSeleccionar(seccion.id)}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              activa
                ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-200 dark:bg-slate-200 dark:text-slate-900'
                : 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
            }`}
          >
            <p className="text-sm font-semibold">{seccion.etiqueta}</p>
            <p className={`mt-1 text-xs ${activa ? 'text-slate-200 dark:text-slate-700' : 'text-slate-500 dark:text-slate-400'}`}>
              {seccion.descripcion}
            </p>
          </button>
        )
      })}
    </nav>
  )
}