import type { FormEventHandler } from 'react'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import type { ObjetivoEntrada } from '@/compartido/validacion/esquemas'
import { estadosRegistro, prioridadesRegistro } from '@/dominio/modelos'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import type { ModoModalRoadmap } from './tiposModalRoadmap'

interface ModalObjetivoRoadmapProps {
  abierto: boolean
  modo: ModoModalRoadmap
  register: UseFormRegister<ObjetivoEntrada>
  errors: FieldErrors<ObjetivoEntrada>
  isSubmitting: boolean
  onSubmit: FormEventHandler<HTMLFormElement>
  alCerrar: () => void
}

export function ModalObjetivoRoadmap({ abierto, modo, register, errors, isSubmitting, onSubmit, alCerrar }: ModalObjetivoRoadmapProps) {
  return (
    <ModalPortal
      abierto={abierto}
      titulo={`${modo === 'crear' ? 'Crear' : modo === 'editar' ? 'Editar' : 'Ver'} objetivo roadmap`}
      alCerrar={alCerrar}
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="text-sm font-medium">Nombre</label>
          <input
            {...register('nombre')}
            readOnly={modo === 'ver'}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          {errors.nombre ? <p className="text-xs text-red-500">{errors.nombre.message}</p> : null}
        </div>

        <div>
          <label className="text-sm font-medium">Descripción</label>
          <textarea
            {...register('descripcion')}
            readOnly={modo === 'ver'}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          {errors.descripcion ? <p className="text-xs text-red-500">{errors.descripcion.message}</p> : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Estado</label>
            <select
              {...register('estado')}
              disabled={modo === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              {estadosRegistro.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Prioridad</label>
            <select
              {...register('prioridad')}
              disabled={modo === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              {prioridadesRegistro.map((prioridad) => (
                <option key={prioridad} value={prioridad}>
                  {prioridad}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Fecha inicio</label>
            <input
              type="date"
              {...register('fecha_inicio')}
              readOnly={modo === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Opcional</p>
          </div>
          <div>
            <label className="text-sm font-medium">Fecha fin</label>
            <input
              type="date"
              {...register('fecha_fin')}
              readOnly={modo === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            {errors.fecha_fin ? <p className="mt-1 text-xs text-red-500">{errors.fecha_fin.message}</p> : null}
          </div>
        </div>

        {modo !== 'ver' ? (
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-70 dark:bg-slate-200 dark:text-slate-900"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        ) : null}
      </form>
    </ModalPortal>
  )
}