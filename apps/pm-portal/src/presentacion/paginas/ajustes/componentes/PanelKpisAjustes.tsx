import type { KpiConfigPm } from '@/dominio/modelos'

type PanelKpisAjustesProps = {
  esAdmin: boolean
  kpis: KpiConfigPm[]
  onCrear: () => void
  onEditar: (kpi: KpiConfigPm) => void
  onEliminar: (kpi: KpiConfigPm) => void
}

export function PanelKpisAjustes({ esAdmin, kpis, onCrear, onEditar, onEliminar }: PanelKpisAjustesProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Configuración de KPIs</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define unidades, metas y umbrales operativos para KPIs configurables.
          </p>
        </div>
        <button
          type="button"
          disabled={!esAdmin}
          onClick={onCrear}
          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
        >
          Crear KPI
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left dark:bg-slate-800">
            <tr>
              <th className="px-3 py-2">KPI</th>
              <th className="px-3 py-2">Unidad</th>
              <th className="px-3 py-2">Meta 7/30/90</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {kpis.map((kpi) => (
              <tr key={kpi.id} className="border-t border-slate-200 dark:border-slate-800">
                <td className="px-3 py-2">
                  <p className="font-medium">{kpi.nombre}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{kpi.clave_kpi}</p>
                </td>
                <td className="px-3 py-2">{kpi.unidad}</td>
                <td className="px-3 py-2">{kpi.meta_7 ?? '-'} / {kpi.meta_30 ?? '-'} / {kpi.meta_90 ?? '-'}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!esAdmin}
                      onClick={() => onEditar(kpi)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={!esAdmin}
                      onClick={() => onEliminar(kpi)}
                      className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50 dark:border-red-800 dark:text-red-300"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {kpis.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  No hay KPIs configurados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </article>
  )
}