import { useMemo, useState } from 'react'
import { formatearTipoChecklistSalida, tiposChecklistSalidaPm } from '@/dominio/modelos'
import type { ChecklistSalidaEntrada } from '@/compartido/validacion/esquemas'

interface PropiedadesGestionChecklistSalida {
  checklist: ChecklistSalidaEntrada[]
  soloLectura?: boolean
  onChange: (checklist: ChecklistSalidaEntrada[]) => void
}

interface BorradorChecklist {
  id?: string | null
  tipo_item: (typeof tiposChecklistSalidaPm)[number]
  descripcion: string
  obligatorio: boolean
  completado: boolean
  evidencia: string | null | undefined
}

type ChecklistNormalizado = ReturnType<typeof normalizarChecklist>[number]

const borradorInicial: BorradorChecklist = {
  id: null,
  tipo_item: 'funcional',
  descripcion: '',
  obligatorio: true,
  completado: false,
  evidencia: ''
}

function normalizarChecklist(checklist: ChecklistSalidaEntrada[]) {
  return checklist.map((item, indice) => ({
    ...item,
    release_id: item.release_id ?? null,
    evidencia: item.evidencia ?? '',
    orden: (indice + 1) * 10
  }))
}

export function GestionChecklistSalida({ checklist, soloLectura = false, onChange }: PropiedadesGestionChecklistSalida) {
  const [borrador, setBorrador] = useState<BorradorChecklist>(borradorInicial)
  const [indiceEdicion, setIndiceEdicion] = useState<number | null>(null)

  const checklistNormalizado = useMemo(() => normalizarChecklist(checklist), [checklist])

  const limpiarBorrador = () => {
    setBorrador(borradorInicial)
    setIndiceEdicion(null)
  }

  const guardarBorrador = () => {
    if (!borrador.descripcion.trim()) {
      return
    }

    const siguiente = [...checklistNormalizado]
    const item: ChecklistNormalizado = {
      id: borrador.id ?? null,
      release_id: null,
      tipo_item: borrador.tipo_item,
      descripcion: borrador.descripcion.trim(),
      obligatorio: borrador.obligatorio,
      completado: borrador.completado,
      evidencia: borrador.evidencia?.trim() ? borrador.evidencia.trim() : '',
      orden: 10
    }

    if (indiceEdicion === null) {
      siguiente.push(item)
    } else {
      siguiente.splice(indiceEdicion, 1, item)
    }

    onChange(normalizarChecklist(siguiente))
    limpiarBorrador()
  }

  const mover = (indice: number, direccion: -1 | 1) => {
    const destino = indice + direccion

    if (destino < 0 || destino >= checklistNormalizado.length) {
      return
    }

    const siguiente = [...checklistNormalizado]
    const temporal = siguiente[indice]
    siguiente[indice] = siguiente[destino]
    siguiente[destino] = temporal
    onChange(normalizarChecklist(siguiente))
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <div>
        <h3 className="text-sm font-medium">Checklist de salida</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Vive dentro del release y permite controlar preparación funcional, validación, comunicación, soporte y rollback.
        </p>
      </div>

      {!soloLectura ? (
        <div className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={borrador.tipo_item}
              onChange={(evento) =>
                setBorrador((actual) => ({
                  ...actual,
                  tipo_item: evento.target.value as (typeof tiposChecklistSalidaPm)[number]
                }))
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              {tiposChecklistSalidaPm.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {formatearTipoChecklistSalida(tipo)}
                </option>
              ))}
            </select>
            <input
              value={borrador.evidencia ?? ''}
              onChange={(evento) => setBorrador((actual) => ({ ...actual, evidencia: evento.target.value }))}
              placeholder="Evidencia opcional"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <textarea
            value={borrador.descripcion}
            onChange={(evento) => setBorrador((actual) => ({ ...actual, descripcion: evento.target.value }))}
            placeholder="Describe el item del checklist de salida"
            className="min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={borrador.obligatorio}
                onChange={(evento) => setBorrador((actual) => ({ ...actual, obligatorio: evento.target.checked }))}
              />
              Obligatorio
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={borrador.completado}
                onChange={(evento) => setBorrador((actual) => ({ ...actual, completado: evento.target.checked }))}
              />
              Completado
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={guardarBorrador}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900"
            >
              {indiceEdicion === null ? 'Agregar item' : 'Actualizar item'}
            </button>
            {indiceEdicion !== null ? (
              <button
                type="button"
                onClick={limpiarBorrador}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700"
              >
                Cancelar edición
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {checklistNormalizado.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Este release todavía no tiene checklist de salida.
        </div>
      ) : (
        <div className="space-y-2">
          {checklistNormalizado.map((item, indice) => (
            <div key={item.id ?? `nuevo-${indice}`} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {indice + 1}. {item.descripcion}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {formatearTipoChecklistSalida(item.tipo_item)}
                    {item.obligatorio ? ' · Obligatorio' : ' · Opcional'}
                    {item.completado ? ' · Completado' : ' · Pendiente'}
                    {item.evidencia ? ` · ${item.evidencia}` : ''}
                  </p>
                </div>
                {!soloLectura ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => mover(indice, -1)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
                    >
                      Subir
                    </button>
                    <button
                      type="button"
                      onClick={() => mover(indice, 1)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
                    >
                      Bajar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIndiceEdicion(indice)
                        setBorrador({
                          id: item.id ?? null,
                          tipo_item: item.tipo_item,
                          descripcion: item.descripcion,
                          obligatorio: item.obligatorio,
                          completado: item.completado,
                          evidencia: item.evidencia ?? ''
                        })
                      }}
                      className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(normalizarChecklist(checklistNormalizado.filter((_, posicion) => posicion !== indice)))
                        if (indiceEdicion === indice) {
                          limpiarBorrador()
                        }
                      }}
                      className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 dark:border-red-800 dark:text-red-300"
                    >
                      Eliminar
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}