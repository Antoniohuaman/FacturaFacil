import { useMemo, useState } from 'react'
import { estadosRegistro, type EstadoRegistro } from '@/dominio/modelos'
import type { CriterioAceptacionEntrada } from '@/compartido/validacion/esquemas'

interface PropiedadesGestionCriteriosAceptacion {
  criterios: CriterioAceptacionEntrada[]
  soloLectura?: boolean
  onChange: (criterios: CriterioAceptacionEntrada[]) => void
}

interface BorradorCriterio {
  id?: string | null
  descripcion: string
  obligatorio: boolean
  estado_validacion: EstadoRegistro | '' | null | undefined
  notas: string | null | undefined
}

type CriterioAceptacionNormalizado = ReturnType<typeof normalizarCriterios>[number]

const borradorInicial: BorradorCriterio = {
  id: null,
  descripcion: '',
  obligatorio: true,
  estado_validacion: '',
  notas: ''
}

function normalizarCriterios(criterios: CriterioAceptacionEntrada[]) {
  return criterios.map((criterio, indice) => ({
    ...criterio,
    orden: (indice + 1) * 10,
    historia_usuario_id: criterio.historia_usuario_id ?? null,
    estado_validacion: criterio.estado_validacion ?? '',
    notas: criterio.notas ?? ''
  }))
}

export function GestionCriteriosAceptacion({ criterios, soloLectura = false, onChange }: PropiedadesGestionCriteriosAceptacion) {
  const [borrador, setBorrador] = useState<BorradorCriterio>(borradorInicial)
  const [indiceEdicion, setIndiceEdicion] = useState<number | null>(null)

  const criteriosNormalizados = useMemo(() => normalizarCriterios(criterios), [criterios])

  const limpiarBorrador = () => {
    setBorrador(borradorInicial)
    setIndiceEdicion(null)
  }

  const guardarBorrador = () => {
    if (!borrador.descripcion.trim()) {
      return
    }

    const siguiente = [...criteriosNormalizados]
    const criterio: CriterioAceptacionNormalizado = {
      id: borrador.id ?? null,
      historia_usuario_id: null,
      descripcion: borrador.descripcion.trim(),
      orden: 10,
      obligatorio: borrador.obligatorio,
      estado_validacion: borrador.estado_validacion ?? '',
      notas: borrador.notas?.trim() ? borrador.notas.trim() : ''
    }

    if (indiceEdicion === null) {
      siguiente.push(criterio)
    } else {
      siguiente.splice(indiceEdicion, 1, criterio)
    }

    onChange(normalizarCriterios(siguiente))
    limpiarBorrador()
  }

  const mover = (indice: number, direccion: -1 | 1) => {
    const destino = indice + direccion

    if (destino < 0 || destino >= criteriosNormalizados.length) {
      return
    }

    const siguiente = [...criteriosNormalizados]
    const temporal = siguiente[indice]
    siguiente[indice] = siguiente[destino]
    siguiente[destino] = temporal
    onChange(normalizarCriterios(siguiente))
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <div>
        <h3 className="text-sm font-medium">Criterios de aceptación</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Mantén los criterios dentro de la historia. Puedes agregar, editar, eliminar y reordenar.
        </p>
      </div>

      {!soloLectura ? (
        <div className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <textarea
            value={borrador.descripcion}
            onChange={(evento) => setBorrador((actual) => ({ ...actual, descripcion: evento.target.value }))}
            placeholder="Describe el criterio de aceptación"
            className="min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={borrador.obligatorio}
                onChange={(evento) => setBorrador((actual) => ({ ...actual, obligatorio: evento.target.checked }))}
              />
              Obligatorio
            </label>
            <select
              value={borrador.estado_validacion ?? ''}
              onChange={(evento) =>
                setBorrador((actual) => ({
                  ...actual,
                  estado_validacion: (evento.target.value as EstadoRegistro | '') || ''
                }))
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">Estado validación: sin definir</option>
              {estadosRegistro.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
            <input
              value={borrador.notas ?? ''}
              onChange={(evento) => setBorrador((actual) => ({ ...actual, notas: evento.target.value }))}
              placeholder="Notas opcionales"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={guardarBorrador}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900"
            >
              {indiceEdicion === null ? 'Agregar criterio' : 'Actualizar criterio'}
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

      {criteriosNormalizados.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          La historia todavía no tiene criterios de aceptación.
        </div>
      ) : (
        <div className="space-y-2">
          {criteriosNormalizados.map((criterio, indice) => (
            <div key={criterio.id ?? `nuevo-${indice}`} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {indice + 1}. {criterio.descripcion}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {criterio.obligatorio ? 'Obligatorio' : 'Opcional'}
                    {criterio.estado_validacion ? ` · ${criterio.estado_validacion}` : ''}
                    {criterio.notas ? ` · ${criterio.notas}` : ''}
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
                          id: criterio.id ?? null,
                          descripcion: criterio.descripcion,
                          obligatorio: criterio.obligatorio,
                          estado_validacion: criterio.estado_validacion ?? '',
                          notas: criterio.notas ?? ''
                        })
                      }}
                      className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(normalizarCriterios(criteriosNormalizados.filter((_, posicion) => posicion !== indice)))
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