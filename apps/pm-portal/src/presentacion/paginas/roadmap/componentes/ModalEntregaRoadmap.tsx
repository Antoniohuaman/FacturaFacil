import type { FormEventHandler } from 'react'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import type { EntregaEntrada } from '@/compartido/validacion/esquemas'
import type { LimitesFechasJerarquicas } from '@/compartido/validacion/roadmapJerarquiaFechas'
import { validarCampoFechaEnJerarquia } from '@/compartido/validacion/roadmapJerarquiaFechas'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { estadosRegistro, prioridadesRegistro, type CatalogoVentanaPm, type Iniciativa } from '@/dominio/modelos'
import type { ModoModalRoadmap } from './tiposModalRoadmap'

interface ModalEntregaRoadmapProps {
  abierto: boolean
  modo: ModoModalRoadmap
  register: UseFormRegister<EntregaEntrada>
  errors: FieldErrors<EntregaEntrada>
  isSubmitting: boolean
  iniciativas: Iniciativa[]
  ventanas: CatalogoVentanaPm[]
  iniciativaSeleccionada: Iniciativa | null
  limitesFechasIniciativa: LimitesFechasJerarquicas
  fechaCompletadoVisible: string | null
  onSubmit: FormEventHandler<HTMLFormElement>
  alCerrar: () => void
}

export function ModalEntregaRoadmap({
  abierto,
  modo,
  register,
  errors,
  isSubmitting,
  iniciativas,
  ventanas,
  iniciativaSeleccionada,
  limitesFechasIniciativa,
  fechaCompletadoVisible,
  onSubmit,
  alCerrar
}: ModalEntregaRoadmapProps) {
  return (
    <ModalPortal
      abierto={abierto}
      titulo={`${modo === 'crear' ? 'Crear' : modo === 'editar' ? 'Editar' : 'Ver'} entrega`}
      alCerrar={alCerrar}
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="text-sm font-medium">Iniciativa</label>
          <select
            {...register('iniciativa_id')}
            disabled={modo === 'ver'}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="">Sin iniciativa</option>
            {iniciativas.map((iniciativa) => (
              <option key={iniciativa.id} value={iniciativa.id}>
                {iniciativa.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Ventana planificada</label>
            <select
              {...register('ventana_planificada_id')}
              disabled={modo === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">Sin asignar</option>
              {ventanas.map((ventana) => (
                <option key={ventana.id} value={ventana.id}>
                  {ventana.etiqueta_visible}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Ventana real</label>
            <select
              {...register('ventana_real_id')}
              disabled={modo === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">Sin asignar</option>
              {ventanas.map((ventana) => (
                <option key={ventana.id} value={ventana.id}>
                  {ventana.etiqueta_visible}
                </option>
              ))}
            </select>
          </div>
        </div>

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
            <label className="text-sm font-medium">Fecha inicio</label>
            <input
              type="date"
              min={limitesFechasIniciativa.minFechaInicio}
              max={limitesFechasIniciativa.maxFechaInicio}
              {...register('fecha_inicio', {
                validate: (valor) =>
                  validarCampoFechaEnJerarquia(
                    'fecha_inicio',
                    valor,
                    {
                      fecha_inicio: iniciativaSeleccionada?.fecha_inicio ?? null,
                      fecha_fin: iniciativaSeleccionada?.fecha_fin ?? null
                    },
                    'iniciativa'
                  )
              })}
              readOnly={modo === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            {errors.fecha_inicio ? <p className="text-xs text-red-500">{errors.fecha_inicio.message}</p> : null}
          </div>
          <div>
            <label className="text-sm font-medium">Fecha fin</label>
            <input
              type="date"
              min={limitesFechasIniciativa.minFechaFin}
              max={limitesFechasIniciativa.maxFechaFin}
              {...register('fecha_fin', {
                validate: (valor) =>
                  validarCampoFechaEnJerarquia(
                    'fecha_fin',
                    valor,
                    {
                      fecha_inicio: iniciativaSeleccionada?.fecha_inicio ?? null,
                      fecha_fin: iniciativaSeleccionada?.fecha_fin ?? null
                    },
                    'iniciativa'
                  )
              })}
              readOnly={modo === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            {errors.fecha_fin ? <p className="text-xs text-red-500">{errors.fecha_fin.message}</p> : null}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Fecha objetivo</label>
          <input
            type="date"
            {...register('fecha_objetivo')}
            readOnly={modo === 'ver'}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          {errors.fecha_objetivo ? <p className="text-xs text-red-500">{errors.fecha_objetivo.message}</p> : null}
        </div>

        {fechaCompletadoVisible ? (
          <div>
            <label className="text-sm font-medium">Fecha completado</label>
            <input
              value={fechaCompletadoVisible}
              readOnly
              className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
        ) : null}

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