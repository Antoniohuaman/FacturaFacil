import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { periodoEstrategicoSchema, type PeriodoEstrategicoEntrada } from '@/compartido/validacion/esquemas'
import type { PeriodoEstrategicoPm } from '@/dominio/modelos'
import {
  crearPeriodoEstrategico,
  editarPeriodoEstrategico,
  eliminarPeriodoEstrategico
} from '@/aplicacion/casos-uso/estrategia'
import { ModalPortal } from '@/compartido/ui/ModalPortal'

type ModoModal = 'crear' | 'editar'

interface GestionPeriodosEstrategicosProps {
  periodos: PeriodoEstrategicoPm[]
  esEdicionPermitida: boolean
  onRecargar: () => Promise<void>
}

function normalizarNombre(nombre: string) {
  return nombre.trim().toLowerCase()
}

export function GestionPeriodosEstrategicos({
  periodos,
  esEdicionPermitida,
  onRecargar
}: GestionPeriodosEstrategicosProps) {
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [periodoActivoModal, setPeriodoActivoModal] = useState<PeriodoEstrategicoPm | null>(null)
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null)

  const formulario = useForm<PeriodoEstrategicoEntrada>({
    resolver: zodResolver(periodoEstrategicoSchema),
    defaultValues: {
      nombre: '',
      descripcion: null,
      fecha_inicio: new Date().toISOString().slice(0, 10),
      fecha_fin: new Date().toISOString().slice(0, 10),
      activo: true
    }
  })

  const abrirModal = (modo: ModoModal, periodo?: PeriodoEstrategicoPm) => {
    setModoModal(modo)
    setPeriodoActivoModal(periodo ?? null)
    setErrorFormulario(null)
    setModalAbierto(true)
    formulario.reset({
      nombre: periodo?.nombre ?? '',
      descripcion: periodo?.descripcion ?? null,
      fecha_inicio: periodo?.fecha_inicio ?? new Date().toISOString().slice(0, 10),
      fecha_fin: periodo?.fecha_fin ?? new Date().toISOString().slice(0, 10),
      activo: periodo?.activo ?? true
    })
  }

  return (
    <>
      <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Períodos estratégicos</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Define la ventana operativa para objetivos estratégicos, KR, KPIs e hipótesis.
            </p>
          </div>
          <button
            type="button"
            disabled={!esEdicionPermitida}
            onClick={() => abrirModal('crear')}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
          >
            Crear período
          </button>
        </div>

        {periodos.length > 0 ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2">Período</th>
                  <th className="px-3 py-2">Fechas</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {periodos.map((periodo) => (
                  <tr key={periodo.id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-3 py-2">
                      <p className="font-medium">{periodo.nombre}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{periodo.descripcion ?? 'Sin descripción'}</p>
                    </td>
                    <td className="px-3 py-2">{periodo.fecha_inicio} → {periodo.fecha_fin}</td>
                    <td className="px-3 py-2">{periodo.activo ? 'Activo' : 'Inactivo'}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={!esEdicionPermitida}
                          onClick={() => abrirModal('editar', periodo)}
                          className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          disabled={!esEdicionPermitida}
                          onClick={() => {
                            if (window.confirm('¿Eliminar este período estratégico?')) {
                              void eliminarPeriodoEstrategico(periodo.id).then(onRecargar).catch((errorInterno) => {
                                setErrorFormulario(
                                  errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar el período'
                                )
                              })
                            }
                          }}
                          className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50 dark:border-red-800 dark:text-red-300"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
            No hay períodos estratégicos registrados. Crea el primero para habilitar el flujo completo de Estrategia.
          </div>
        )}
      </article>

      <ModalPortal
        abierto={modalAbierto}
        titulo={`${modoModal === 'crear' ? 'Crear' : 'Editar'} período estratégico`}
        alCerrar={() => setModalAbierto(false)}
      >
        <form
          className="space-y-4"
          onSubmit={formulario.handleSubmit(async (valores) => {
            const nombreNormalizado = normalizarNombre(valores.nombre)
            const periodoDuplicado = periodos.find(
              (periodo) =>
                normalizarNombre(periodo.nombre) === nombreNormalizado &&
                periodo.id !== periodoActivoModal?.id
            )

            if (periodoDuplicado) {
              setErrorFormulario('Ya existe un período estratégico con ese nombre.')
              return
            }

            try {
              setErrorFormulario(null)

              if (modoModal === 'crear') {
                await crearPeriodoEstrategico(valores)
              }

              if (modoModal === 'editar' && periodoActivoModal) {
                await editarPeriodoEstrategico(periodoActivoModal.id, valores)
              }

              setModalAbierto(false)
              await onRecargar()
            } catch (errorInterno) {
              setErrorFormulario(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar el período')
            }
          })}
        >
          <div>
            <label className="text-sm font-medium">Nombre</label>
            <input
              {...formulario.register('nombre')}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Descripción</label>
            <textarea
              {...formulario.register('descripcion')}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Fecha inicio</label>
              <input
                type="date"
                {...formulario.register('fecha_inicio')}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Fecha fin</label>
              <input
                type="date"
                {...formulario.register('fecha_fin')}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...formulario.register('activo')} />
            Período activo
          </label>
          {errorFormulario ? <p className="text-sm text-red-600 dark:text-red-300">{errorFormulario}</p> : null}
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900"
          >
            Guardar
          </button>
        </form>
      </ModalPortal>
    </>
  )
}