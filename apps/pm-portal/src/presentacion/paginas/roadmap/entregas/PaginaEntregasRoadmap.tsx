import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { entregaSchema, type EntregaEntrada } from '@/compartido/validacion/esquemas'
import { estadosRegistro, prioridadesRegistro, type Entrega, type Iniciativa } from '@/dominio/modelos'
import { crearEntrega, editarEntrega, eliminarEntrega, listarEntregas } from '@/aplicacion/casos-uso/entregas'
import { listarIniciativas } from '@/aplicacion/casos-uso/iniciativas'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'

type ModoModal = 'crear' | 'ver' | 'editar'

export function PaginaEntregasRoadmap() {
  const { rol } = useSesionPortalPM()
  const [entregas, setEntregas] = useState<Entrega[]>([])
  const [iniciativas, setIniciativas] = useState<Iniciativa[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | (typeof estadosRegistro)[number]>('todos')
  const [filtroPrioridad, setFiltroPrioridad] = useState<'todas' | (typeof prioridadesRegistro)[number]>('todas')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [entregaActiva, setEntregaActiva] = useState<Entrega | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<EntregaEntrada>({
    resolver: zodResolver(entregaSchema),
    defaultValues: {
      iniciativa_id: null,
      nombre: '',
      descripcion: '',
      fecha_objetivo: null,
      estado: 'pendiente',
      prioridad: 'media'
    }
  })

  const esEdicionPermitida = puedeEditar(rol)

  const cargarInformacion = async () => {
    setCargando(true)
    setError(null)
    try {
      const [listaEntregas, listaIniciativas] = await Promise.all([listarEntregas(), listarIniciativas()])
      setEntregas(listaEntregas)
      setIniciativas(listaIniciativas)
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar entregas')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargarInformacion()
  }, [])

  const entregasFiltradas = useMemo(() => {
    return entregas.filter((entrega) => {
      const coincideBusqueda =
        entrega.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        entrega.descripcion.toLowerCase().includes(busqueda.toLowerCase())

      const coincideEstado = filtroEstado === 'todos' ? true : entrega.estado === filtroEstado
      const coincidePrioridad = filtroPrioridad === 'todas' ? true : entrega.prioridad === filtroPrioridad

      return coincideBusqueda && coincideEstado && coincidePrioridad
    })
  }, [entregas, busqueda, filtroEstado, filtroPrioridad])

  const iniciativaPorId = useMemo(() => {
    return new Map(iniciativas.map((iniciativa) => [iniciativa.id, iniciativa.nombre]))
  }, [iniciativas])

  const abrirModal = (modo: ModoModal, entrega?: Entrega) => {
    setModoModal(modo)
    setEntregaActiva(entrega ?? null)
    setModalAbierto(true)
    reset({
      iniciativa_id: entrega?.iniciativa_id ?? null,
      nombre: entrega?.nombre ?? '',
      descripcion: entrega?.descripcion ?? '',
      fecha_objetivo: entrega?.fecha_objetivo ?? null,
      estado: entrega?.estado ?? 'pendiente',
      prioridad: entrega?.prioridad ?? 'media'
    })
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Roadmap de entregas</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Administra entregas, fechas objetivo y su estado operativo.
        </p>
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
        <input
          type="search"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar entrega"
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
        vacio={entregasFiltradas.length === 0}
        mensajeVacio="No hay entregas para los filtros seleccionados."
      >
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">Entrega</th>
                <th className="px-3 py-2">Iniciativa</th>
                <th className="px-3 py-2">Fecha objetivo</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {entregasFiltradas.map((entrega) => (
                <tr key={entrega.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-3 py-2">
                    <p className="font-medium">{entrega.nombre}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{entrega.descripcion}</p>
                  </td>
                  <td className="px-3 py-2">{iniciativaPorId.get(entrega.iniciativa_id ?? '') ?? 'Sin iniciativa'}</td>
                  <td className="px-3 py-2">{entrega.fecha_objetivo ?? 'Sin fecha'}</td>
                  <td className="px-3 py-2">{entrega.estado}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => abrirModal('ver', entrega)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        disabled={!esEdicionPermitida}
                        onClick={() => abrirModal('editar', entrega)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={!esEdicionPermitida}
                        onClick={() => {
                          if (window.confirm('¿Eliminar esta entrega?')) {
                            void eliminarEntrega(entrega.id).then(cargarInformacion).catch((errorInterno) => {
                              setError(
                                errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar la entrega'
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
        titulo={`${modoModal === 'crear' ? 'Crear' : modoModal === 'editar' ? 'Editar' : 'Ver'} entrega`}
        alCerrar={() => setModalAbierto(false)}
      >
        <form
          className="space-y-4"
          onSubmit={handleSubmit(async (valores) => {
            if (modoModal === 'ver') {
              return
            }

            try {
              const carga = {
                ...valores,
                iniciativa_id: valores.iniciativa_id || null,
                fecha_objetivo: valores.fecha_objetivo || null
              }

              if (modoModal === 'crear') {
                await crearEntrega(carga)
              }

              if (modoModal === 'editar' && entregaActiva) {
                await editarEntrega(entregaActiva.id, carga)
              }

              setModalAbierto(false)
              await cargarInformacion()
            } catch (errorInterno) {
              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar la entrega')
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
              <option value="">Sin iniciativa</option>
              {iniciativas.map((iniciativa) => (
                <option key={iniciativa.id} value={iniciativa.id}>
                  {iniciativa.nombre}
                </option>
              ))}
            </select>
          </div>

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

          <div>
            <label className="text-sm font-medium">Fecha objetivo</label>
            <input
              type="date"
              {...register('fecha_objetivo')}
              readOnly={modoModal === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
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
