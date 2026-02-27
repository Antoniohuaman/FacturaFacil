import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { objetivoSchema, type ObjetivoEntrada } from '@/compartido/validacion/esquemas'
import { estadosRegistro, prioridadesRegistro, type Objetivo } from '@/dominio/modelos'
import {
  crearObjetivo,
  editarObjetivo,
  eliminarObjetivo,
  listarObjetivos
} from '@/aplicacion/casos-uso/objetivos'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'

type ModoModal = 'crear' | 'ver' | 'editar'

export function PaginaObjetivosRoadmap() {
  const { rol } = useSesionPortalPM()
  const [objetivos, setObjetivos] = useState<Objetivo[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | (typeof estadosRegistro)[number]>('todos')
  const [filtroPrioridad, setFiltroPrioridad] = useState<'todas' | (typeof prioridadesRegistro)[number]>('todas')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [objetivoActivo, setObjetivoActivo] = useState<Objetivo | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<ObjetivoEntrada>({
    resolver: zodResolver(objetivoSchema),
    defaultValues: {
      nombre: '',
      descripcion: '',
      estado: 'pendiente',
      prioridad: 'media'
    }
  })

  const esEdicionPermitida = puedeEditar(rol)

  const cargarObjetivos = async () => {
    setCargando(true)
    setError(null)
    try {
      const data = await listarObjetivos()
      setObjetivos(data)
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar objetivos')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargarObjetivos()
  }, [])

  const objetivosFiltrados = useMemo(() => {
    return objetivos.filter((objetivo) => {
      const coincideBusqueda =
        objetivo.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        objetivo.descripcion.toLowerCase().includes(busqueda.toLowerCase())

      const coincideEstado = filtroEstado === 'todos' ? true : objetivo.estado === filtroEstado
      const coincidePrioridad = filtroPrioridad === 'todas' ? true : objetivo.prioridad === filtroPrioridad

      return coincideBusqueda && coincideEstado && coincidePrioridad
    })
  }, [objetivos, busqueda, filtroEstado, filtroPrioridad])

  const abrirModal = (modo: ModoModal, objetivo?: Objetivo) => {
    setModoModal(modo)
    setObjetivoActivo(objetivo ?? null)
    setModalAbierto(true)
    reset({
      nombre: objetivo?.nombre ?? '',
      descripcion: objetivo?.descripcion ?? '',
      estado: objetivo?.estado ?? 'pendiente',
      prioridad: objetivo?.prioridad ?? 'media'
    })
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Roadmap de objetivos</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Define objetivos estratégicos y su estado de ejecución.
        </p>
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
        <input
          type="search"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar por nombre o descripción"
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
        vacio={objetivosFiltrados.length === 0}
        mensajeVacio="No hay objetivos para los filtros seleccionados."
      >
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Prioridad</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {objetivosFiltrados.map((objetivo) => (
                <tr key={objetivo.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-3 py-2">
                    <p className="font-medium">{objetivo.nombre}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{objetivo.descripcion}</p>
                  </td>
                  <td className="px-3 py-2">{objetivo.estado}</td>
                  <td className="px-3 py-2">{objetivo.prioridad}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => abrirModal('ver', objetivo)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        disabled={!esEdicionPermitida}
                        onClick={() => abrirModal('editar', objetivo)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={!esEdicionPermitida}
                        onClick={() => {
                          if (window.confirm('¿Eliminar este objetivo?')) {
                            void eliminarObjetivo(objetivo.id).then(cargarObjetivos).catch((errorInterno) => {
                              setError(
                                errorInterno instanceof Error
                                  ? errorInterno.message
                                  : 'No se pudo eliminar el objetivo'
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
        titulo={`${modoModal === 'crear' ? 'Crear' : modoModal === 'editar' ? 'Editar' : 'Ver'} objetivo`}
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
                await crearObjetivo(valores)
              }

              if (modoModal === 'editar' && objetivoActivo) {
                await editarObjetivo(objetivoActivo.id, valores)
              }

              setModalAbierto(false)
              await cargarObjetivos()
            } catch (errorInterno) {
              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar el objetivo')
            }
          })}
        >
          <div>
            <label className="text-sm font-medium">Nombre</label>
            <input
              {...register('nombre')}
              readOnly={modoModal === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            {errors.nombre ? <p className="text-xs text-red-500">{errors.nombre.message}</p> : null}
          </div>

          <div>
            <label className="text-sm font-medium">Descripción</label>
            <textarea
              {...register('descripcion')}
              readOnly={modoModal === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            {errors.descripcion ? <p className="text-xs text-red-500">{errors.descripcion.message}</p> : null}
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
