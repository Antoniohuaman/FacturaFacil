import type { FormEventHandler } from 'react'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import type { IniciativaEntrada } from '@/compartido/validacion/esquemas'
import type { LimitesFechasJerarquicas } from '@/compartido/validacion/roadmapJerarquiaFechas'
import { validarCampoFechaEnJerarquia } from '@/compartido/validacion/roadmapJerarquiaFechas'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import {
  estadosRegistro,
  prioridadesRegistro,
  type CatalogoEtapaPm,
  type CatalogoVentanaPm,
  type Objetivo
} from '@/dominio/modelos'
import type { ModoModalRoadmap } from './tiposModalRoadmap'
import { opcionesImpactoIniciativaRoadmap } from './auxiliaresFormulariosRoadmap'

interface ModalIniciativaRoadmapProps {
  abierto: boolean
  modo: ModoModalRoadmap
  register: UseFormRegister<IniciativaEntrada>
  errors: FieldErrors<IniciativaEntrada>
  isSubmitting: boolean
  isValid: boolean
  objetivos: Objetivo[]
  ventanas: CatalogoVentanaPm[]
  etapas: CatalogoEtapaPm[]
  objetivoSeleccionado: Objetivo | null
  limitesFechasObjetivo: LimitesFechasJerarquicas
  helperAlcance: string
  helperEsfuerzo: string
  riceCalculado: number | null
  onSubmit: FormEventHandler<HTMLFormElement>
  alCerrar: () => void
}

export function ModalIniciativaRoadmap({
  abierto,
  modo,
  register,
  errors,
  isSubmitting,
  isValid,
  objetivos,
  ventanas,
  etapas,
  objetivoSeleccionado,
  limitesFechasObjetivo,
  helperAlcance,
  helperEsfuerzo,
  riceCalculado,
  onSubmit,
  alCerrar
}: ModalIniciativaRoadmapProps) {
  const claseCampoNumero = (campo: 'alcance' | 'impacto' | 'confianza' | 'esfuerzo') =>
    `mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-slate-800 ${
      errors[campo] ? 'border-red-300 dark:border-red-800' : 'border-slate-300 dark:border-slate-700'
    }`

  return (
    <ModalPortal
      abierto={abierto}
      titulo={`${modo === 'crear' ? 'Crear' : modo === 'editar' ? 'Editar' : 'Ver'} iniciativa`}
      alCerrar={alCerrar}
    >
      <form noValidate className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="text-sm font-medium">Objetivo</label>
          <select
            {...register('objetivo_id')}
            disabled={modo === 'ver'}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="">Sin objetivo</option>
            {objetivos.map((objetivo) => (
              <option key={objetivo.id} value={objetivo.id}>
                {objetivo.nombre}
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
            <label className="text-sm font-medium">Etapa</label>
            <select
              {...register('etapa_id')}
              disabled={modo === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">Sin asignar</option>
              {etapas.map((etapa) => (
                <option key={etapa.id} value={etapa.id}>
                  {etapa.etiqueta_visible}
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

        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="text-sm font-medium">Alcance</label>
            <input
              type="number"
              min={0}
              step={1}
              {...register('alcance', {
                setValueAs: (valor) => {
                  if (valor === '' || valor === null || valor === undefined) {
                    return Number.NaN
                  }

                  return Number(valor)
                }
              })}
              readOnly={modo === 'ver'}
              className={claseCampoNumero('alcance')}
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helperAlcance}</p>
            {errors.alcance ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.alcance.message}</p> : null}
          </div>
          <div>
            <label className="text-sm font-medium">Impacto</label>
            <select
              {...register('impacto', {
                setValueAs: (valor) => Number(valor)
              })}
              disabled={modo === 'ver'}
              className={claseCampoNumero('impacto')}
            >
              {opcionesImpactoIniciativaRoadmap.map((impactoOpcion) => (
                <option key={impactoOpcion} value={impactoOpcion}>
                  {impactoOpcion === 0.25
                    ? '0.25 (muy bajo)'
                    : impactoOpcion === 0.5
                      ? '0.5 (bajo)'
                      : impactoOpcion === 1
                        ? '1 (medio)'
                        : impactoOpcion === 2
                          ? '2 (alto)'
                          : '3 (muy alto)'}
                </option>
              ))}
            </select>
            {errors.impacto ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.impacto.message}</p> : null}
          </div>
          <div>
            <label className="text-sm font-medium">Confianza</label>
            <div className="relative mt-1">
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                {...register('confianza', {
                  setValueAs: (valor) => {
                    if (valor === '' || valor === null || valor === undefined) {
                      return Number.NaN
                    }

                    return Number(valor)
                  }
                })}
                readOnly={modo === 'ver'}
                className={`${claseCampoNumero('confianza')} pr-8`}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500 dark:text-slate-400">
                %
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">0–100%</p>
            {errors.confianza ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.confianza.message}</p> : null}
          </div>
          <div>
            <label className="text-sm font-medium">Esfuerzo</label>
            <input
              type="number"
              min={0.5}
              step={0.5}
              {...register('esfuerzo', {
                setValueAs: (valor) => {
                  if (valor === '' || valor === null || valor === undefined) {
                    return Number.NaN
                  }

                  return Number(valor)
                }
              })}
              readOnly={modo === 'ver'}
              className={claseCampoNumero('esfuerzo')}
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helperEsfuerzo}</p>
            {errors.esfuerzo ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.esfuerzo.message}</p> : null}
          </div>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
          {riceCalculado === null ? (
            <>
              RICE: <span className="font-semibold">inválido</span>. Corrige los campos para ver el RICE.
            </>
          ) : (
            <>
              RICE calculado automáticamente: <span className="font-semibold">{riceCalculado}</span>
            </>
          )}
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
              min={limitesFechasObjetivo.minFechaInicio}
              max={limitesFechasObjetivo.maxFechaInicio}
              {...register('fecha_inicio', {
                validate: (valor) =>
                  validarCampoFechaEnJerarquia(
                    'fecha_inicio',
                    valor,
                    {
                      fecha_inicio: objetivoSeleccionado?.fecha_inicio ?? null,
                      fecha_fin: objetivoSeleccionado?.fecha_fin ?? null
                    },
                    'objetivo'
                  )
              })}
              readOnly={modo === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            {errors.fecha_inicio ? (
              <p className="mt-1 text-xs text-red-500">{errors.fecha_inicio.message}</p>
            ) : (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Opcional</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Fecha fin</label>
            <input
              type="date"
              min={limitesFechasObjetivo.minFechaFin}
              max={limitesFechasObjetivo.maxFechaFin}
              {...register('fecha_fin', {
                validate: (valor) =>
                  validarCampoFechaEnJerarquia(
                    'fecha_fin',
                    valor,
                    {
                      fecha_inicio: objetivoSeleccionado?.fecha_inicio ?? null,
                      fecha_fin: objetivoSeleccionado?.fecha_fin ?? null
                    },
                    'objetivo'
                  )
              })}
              readOnly={modo === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            {errors.fecha_fin ? <p className="mt-1 text-xs text-red-500">{errors.fecha_fin.message}</p> : null}
          </div>
        </div>

        {modo !== 'ver' ? (
          <button
            type="submit"
            disabled={isSubmitting || !isValid}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-70 dark:bg-slate-200 dark:text-slate-900"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        ) : null}
      </form>
    </ModalPortal>
  )
}