import type { UseFormReturn } from 'react-hook-form'
import {
  alcancesPeriodoRice,
  formatearEsfuerzoUnidadRice,
  unidadesEsfuerzoRice,
  type ConfiguracionRice
} from '@/dominio/modelos'
import type { ConfiguracionRiceEntrada } from '@/compartido/validacion/esquemas'

type PanelRiceAjustesProps = {
  configuracionRice: ConfiguracionRice | null
  esAdmin: boolean
  formularioRice: UseFormReturn<ConfiguracionRiceEntrada>
  mensajeRice: string | null
  onGuardar: (valores: ConfiguracionRiceEntrada) => Promise<void>
}

export function PanelRiceAjustes({
  configuracionRice,
  esAdmin,
  formularioRice,
  mensajeRice,
  onGuardar
}: PanelRiceAjustesProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Estándar RICE</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configura el periodo y la unidad de esfuerzo usados en iniciativas.
          </p>
        </div>
        {mensajeRice ? <p className="text-xs text-emerald-600 dark:text-emerald-400">{mensajeRice}</p> : null}
      </div>

      <form className="grid gap-3 md:grid-cols-2" onSubmit={formularioRice.handleSubmit(onGuardar)}>
        <div>
          <label className="text-sm font-medium">Alcance (periodo)</label>
          <select
            {...formularioRice.register('alcance_periodo')}
            disabled={!esAdmin || formularioRice.formState.isSubmitting}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            {alcancesPeriodoRice.map((periodo) => (
              <option key={periodo} value={periodo}>
                {periodo === 'semana' ? 'Semana' : periodo === 'trimestre' ? 'Trimestre' : 'Mes'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Esfuerzo (unidad)</label>
          <select
            {...formularioRice.register('esfuerzo_unidad')}
            disabled={!esAdmin || formularioRice.formState.isSubmitting}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            {unidadesEsfuerzoRice.map((unidad) => (
              <option key={unidad} value={unidad}>
                {formatearEsfuerzoUnidadRice(unidad)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between gap-3 md:col-span-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Esta configuración ajusta etiquetas y estándar visual RICE en iniciativas.
          </p>
          <button
            type="submit"
            disabled={!esAdmin || formularioRice.formState.isSubmitting || !formularioRice.formState.isDirty}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
          >
            {formularioRice.formState.isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>

        {configuracionRice ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 md:col-span-2">
            Actual: alcance por {configuracionRice.alcance_periodo} · esfuerzo en{' '}
            {formatearEsfuerzoUnidadRice(configuracionRice.esfuerzo_unidad)}.
          </p>
        ) : null}
      </form>
    </article>
  )
}