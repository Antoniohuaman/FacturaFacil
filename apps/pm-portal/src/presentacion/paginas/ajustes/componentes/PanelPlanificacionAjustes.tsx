import type { CatalogoEtapaPm, CatalogoVentanaPm } from '@/dominio/modelos'
import type { AjustesPlanificacionTabId } from '@/presentacion/paginas/ajustes/modeloAjustes'

type PanelPlanificacionAjustesProps = {
  esAdmin: boolean
  etapas: CatalogoEtapaPm[]
  ventanas: CatalogoVentanaPm[]
  pestanaActiva: AjustesPlanificacionTabId
  onCambiarPestana: (pestana: AjustesPlanificacionTabId) => void
  onCrearVentana: () => void
  onEditarVentana: (ventana: CatalogoVentanaPm) => void
  onEliminarVentana: (ventana: CatalogoVentanaPm) => void
  onCrearEtapa: () => void
  onEditarEtapa: (etapa: CatalogoEtapaPm) => void
  onEliminarEtapa: (etapa: CatalogoEtapaPm) => void
}

export function PanelPlanificacionAjustes({
  esAdmin,
  etapas,
  ventanas,
  pestanaActiva,
  onCambiarPestana,
  onCrearVentana,
  onEditarVentana,
  onEliminarVentana,
  onCrearEtapa,
  onEditarEtapa,
  onEliminarEtapa
}: PanelPlanificacionAjustesProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Planificación</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Separa la administración del calendario operativo entre ventanas y etapas.
          </p>
        </div>

        {pestanaActiva === 'ventanas' ? (
          <button
            type="button"
            disabled={!esAdmin}
            onClick={onCrearVentana}
            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
          >
            Crear ventana
          </button>
        ) : (
          <button
            type="button"
            disabled={!esAdmin}
            onClick={onCrearEtapa}
            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
          >
            Crear etapa
          </button>
        )}
      </div>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => onCambiarPestana('ventanas')}
          className={`rounded-full px-3 py-1 text-xs ${
            pestanaActiva === 'ventanas'
              ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900'
              : 'border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
          }`}
        >
          Ventanas
        </button>
        <button
          type="button"
          onClick={() => onCambiarPestana('etapas')}
          className={`rounded-full px-3 py-1 text-xs ${
            pestanaActiva === 'etapas'
              ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900'
              : 'border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
          }`}
        >
          Etapas
        </button>
      </div>

      {pestanaActiva === 'ventanas' ? (
        <ul className="grid gap-2 md:grid-cols-2">
          {ventanas.map((ventana) => (
            <li key={ventana.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
              <p className="font-medium">{ventana.etiqueta_visible}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {ventana.tipo} · Orden {ventana.orden}
                {ventana.anio ? ` · ${ventana.anio}` : ''}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {ventana.fecha_inicio ?? 'Sin fecha inicio'} → {ventana.fecha_fin ?? 'Sin fecha fin'}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={!esAdmin}
                  onClick={() => onEditarVentana(ventana)}
                  className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
                >
                  Editar
                </button>
                <button
                  type="button"
                  disabled={!esAdmin}
                  onClick={() => onEliminarVentana(ventana)}
                  className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50 dark:border-red-800 dark:text-red-300"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}

          {ventanas.length === 0 ? (
            <li className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No hay ventanas configuradas.
            </li>
          ) : null}
        </ul>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {etapas.map((etapa) => (
            <li key={etapa.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
              <p className="font-medium">{etapa.etiqueta_visible}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Orden {etapa.orden}</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={!esAdmin}
                  onClick={() => onEditarEtapa(etapa)}
                  className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
                >
                  Editar
                </button>
                <button
                  type="button"
                  disabled={!esAdmin}
                  onClick={() => onEliminarEtapa(etapa)}
                  className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50 dark:border-red-800 dark:text-red-300"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}

          {etapas.length === 0 ? (
            <li className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No hay etapas configuradas.
            </li>
          ) : null}
        </ul>
      )}
    </article>
  )
}