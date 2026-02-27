import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { matrizValorSchema, type MatrizValorEntrada } from '@/compartido/validacion/esquemas'
import { estadosRegistro, prioridadesRegistro, type Iniciativa, type MatrizValor } from '@/dominio/modelos'
import {
  crearMatrizValor,
  editarMatrizValor,
  eliminarMatrizValor,
  listarMatrizValor
} from '@/aplicacion/casos-uso/matrizValor'
import { listarIniciativas } from '@/aplicacion/casos-uso/iniciativas'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'

type ModoModal = 'crear' | 'ver' | 'editar'

function calcularPuntaje(valor_negocio: number, esfuerzo: number, riesgo: number) {
  return Number((valor_negocio * 2 - esfuerzo - riesgo).toFixed(2))
}

export function PaginaMatrizValor() {
  const { rol } = useSesionPortalPM()
  const [matrices, setMatrices] = useState<MatrizValor[]>([])
  const [iniciativas, setIniciativas] = useState<Iniciativa[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | (typeof estadosRegistro)[number]>('todos')
  const [filtroPrioridad, setFiltroPrioridad] = useState<'todas' | (typeof prioridadesRegistro)[number]>('todas')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [matrizActiva, setMatrizActiva] = useState<MatrizValor | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<MatrizValorEntrada>({
    resolver: zodResolver(matrizValorSchema),
    defaultValues: {
      iniciativa_id: '',
      titulo: '',
      valor_negocio: 10,
      esfuerzo: 10,
      riesgo: 10,
      estado: 'pendiente',
      prioridad: 'media'
    }
  })

  const esEdicionPermitida = puedeEditar(rol)

  const valorNegocio = watch('valor_negocio')
  const esfuerzo = watch('esfuerzo')
  const riesgo = watch('riesgo')
  const puntajeCalculado = useMemo(
    () => calcularPuntaje(valorNegocio, esfuerzo, riesgo),
    [valorNegocio, esfuerzo, riesgo]
  )

  const cargarInformacion = async () => {
    setCargando(true)
    setError(null)
    try {
      const [listaMatriz, listaIniciativas] = await Promise.all([listarMatrizValor(), listarIniciativas()])
      setMatrices(listaMatriz)
      setIniciativas(listaIniciativas)
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar matriz de valor')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargarInformacion()
  }, [])

  const matricesFiltradas = useMemo(() => {
    return matrices.filter((matriz) => {
      const coincideBusqueda = matriz.titulo.toLowerCase().includes(busqueda.toLowerCase())
      const coincideEstado = filtroEstado === 'todos' ? true : matriz.estado === filtroEstado
      const coincidePrioridad = filtroPrioridad === 'todas' ? true : matriz.prioridad === filtroPrioridad
      return coincideBusqueda && coincideEstado && coincidePrioridad
    })
  }, [matrices, busqueda, filtroEstado, filtroPrioridad])

  const iniciativaPorId = useMemo(() => {
    return new Map(iniciativas.map((iniciativa) => [iniciativa.id, iniciativa.nombre]))
  }, [iniciativas])

  const abrirModal = (modo: ModoModal, matriz?: MatrizValor) => {
    setModoModal(modo)
    setMatrizActiva(matriz ?? null)
    setModalAbierto(true)
    reset({
      iniciativa_id: matriz?.iniciativa_id ?? '',
      titulo: matriz?.titulo ?? '',
      valor_negocio: matriz?.valor_negocio ?? 10,
      esfuerzo: matriz?.esfuerzo ?? 10,
      riesgo: matriz?.riesgo ?? 10,
      estado: matriz?.estado ?? 'pendiente',
      prioridad: matriz?.prioridad ?? 'media'
    })
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Matriz de valor</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Evalúa valor por iniciativa con puntaje automático de priorización.
        </p>
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
        <input
          type="search"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar en matriz"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800"
        />
        <select
          value={filtroEstado}
          onChange={(evento) =>
            setFiltroEstado(evento.target.value as 'todos' | (typeof estadosRegistro)[number])
          }
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todos">Estado: todos</option>
          {estadosRegistro.map((estado) => (
            <option key={estado} value={estado}>
              Estado: {estado}
            </option>
          ))}
        </select>
        <select
          value={filtroPrioridad}
          onChange={(evento) =>
            setFiltroPrioridad(evento.target.value as 'todas' | (typeof prioridadesRegistro)[number])
          }
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todas">Prioridad: todas</option>
          {prioridadesRegistro.map((prioridad) => (
            <option key={prioridad} value={prioridad}>
              Prioridad: {prioridad}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!esEdicionPermitida}
          onClick={() => abrirModal('crear')}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
        >
          Crear
        </button>
      </div>

      <EstadoVista
        cargando={cargando}
        error={error}
        vacio={matricesFiltradas.length === 0}
        mensajeVacio="No hay registros de matriz para los filtros seleccionados."
      >
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">Título</th>
                <th className="px-3 py-2">Iniciativa</th>
                <th className="px-3 py-2">Puntaje</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {matricesFiltradas.map((matriz) => (
                <tr key={matriz.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-3 py-2 font-medium">{matriz.titulo}</td>
                  <td className="px-3 py-2">{iniciativaPorId.get(matriz.iniciativa_id) ?? 'Sin iniciativa'}</td>
                  <td className="px-3 py-2 font-semibold">{matriz.puntaje_valor}</td>
                  <td className="px-3 py-2">{matriz.estado}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => abrirModal('ver', matriz)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        disabled={!esEdicionPermitida}
                        onClick={() => abrirModal('editar', matriz)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={!esEdicionPermitida}
                        onClick={() => {
                          if (window.confirm('¿Eliminar este registro de matriz?')) {
                            void eliminarMatrizValor(matriz.id).then(cargarInformacion).catch((errorInterno) => {
                              setError(
                                errorInterno instanceof Error
                                  ? errorInterno.message
                                  : 'No se pudo eliminar el registro'
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
      </EstadoVista>

      <ModalPortal
        abierto={modalAbierto}
        titulo={`${modoModal === 'crear' ? 'Crear' : modoModal === 'editar' ? 'Editar' : 'Ver'} matriz`}
        alCerrar={() => setModalAbierto(false)}
      >
        <form
          className="space-y-4"
          onSubmit={handleSubmit(async (valores) => {
            if (modoModal === 'ver') {
              return
            }

            try {
              if (modoModal === 'crear') {
                await crearMatrizValor(valores)
              }

              if (modoModal === 'editar' && matrizActiva) {
                await editarMatrizValor(matrizActiva.id, valores)
              }

              setModalAbierto(false)
              await cargarInformacion()
            } catch (errorInterno) {
              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar la matriz')
            }
          })}
        >
          <div>
            <label className="text-sm font-medium">Iniciativa</label>
            <select
              {...register('iniciativa_id')}
              disabled={modoModal === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">Selecciona una iniciativa</option>
              {iniciativas.map((iniciativa) => (
                <option key={iniciativa.id} value={iniciativa.id}>
                  {iniciativa.nombre}
                </option>
              ))}
            </select>
            {errors.iniciativa_id ? <p className="text-xs text-red-500">{errors.iniciativa_id.message}</p> : null}
          </div>

          <div>
            <label className="text-sm font-medium">Título</label>
            <input
              {...register('titulo')}
              readOnly={modoModal === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            {errors.titulo ? <p className="text-xs text-red-500">{errors.titulo.message}</p> : null}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Valor negocio</label>
              <input
                type="number"
                {...register('valor_negocio', { valueAsNumber: true })}
                readOnly={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Esfuerzo</label>
              <input
                type="number"
                {...register('esfuerzo', { valueAsNumber: true })}
                readOnly={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Riesgo</label>
              <input
                type="number"
                {...register('riesgo', { valueAsNumber: true })}
                readOnly={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300">
            Puntaje calculado automáticamente: <span className="font-semibold">{puntajeCalculado}</span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Estado</label>
              <select
                {...register('estado')}
                disabled={modoModal === 'ver'}
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
                disabled={modoModal === 'ver'}
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

          {modoModal !== 'ver' ? (
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
    </section>
  )
}
