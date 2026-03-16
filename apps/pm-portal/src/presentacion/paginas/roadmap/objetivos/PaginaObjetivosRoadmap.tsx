import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'react-router-dom'
import { objetivoSchema, type ObjetivoEntrada } from '@/compartido/validacion/esquemas'
import { estadosRegistro, prioridadesRegistro, type Objetivo, type RelObjetivoRoadmapKrPm } from '@/dominio/modelos'
import {
  crearObjetivo,
  editarObjetivo,
  eliminarObjetivo,
  listarObjetivos
} from '@/aplicacion/casos-uso/objetivos'
import { listarRelObjetivoRoadmapKr } from '@/aplicacion/casos-uso/estrategia'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { PaginacionTabla } from '@/compartido/ui/PaginacionTabla'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'
import { usePaginacion } from '@/compartido/utilidades/usePaginacion'
import { exportarCsv } from '@/compartido/utilidades/csv'
import { formatearEstadoLegible, formatearFechaCorta } from '@/compartido/utilidades/formatoPortal'
import { NavegacionRoadmap } from '@/presentacion/paginas/roadmap/NavegacionRoadmap'

type ModoModal = 'crear' | 'ver' | 'editar'

export function PaginaObjetivosRoadmap() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paginaInicial = Number(searchParams.get('pagina') ?? '1')
  const tamanoInicial = Number(searchParams.get('tamano') ?? '10')
  const { rol } = useSesionPortalPM()
  const [objetivos, setObjetivos] = useState<Objetivo[]>([])
  const [relacionesKr, setRelacionesKr] = useState<RelObjetivoRoadmapKrPm[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState(searchParams.get('q') ?? '')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | (typeof estadosRegistro)[number]>(
    (searchParams.get('estado') as 'todos' | (typeof estadosRegistro)[number]) ?? 'todos'
  )
  const [filtroPrioridad, setFiltroPrioridad] = useState<'todas' | (typeof prioridadesRegistro)[number]>(
    (searchParams.get('prioridad') as 'todas' | (typeof prioridadesRegistro)[number]) ?? 'todas'
  )
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
      prioridad: 'media',
      fecha_inicio: null,
      fecha_fin: null
    }
  })

  const esEdicionPermitida = puedeEditar(rol)

  const cargarObjetivos = async () => {
    setCargando(true)
    setError(null)
    try {
      const [data, relaciones] = await Promise.all([listarObjetivos(), listarRelObjetivoRoadmapKr()])
      setObjetivos(data)
      setRelacionesKr(relaciones)
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

  const krPorObjetivo = useMemo(() => {
    return relacionesKr.reduce(
      (mapa, relacion) => mapa.set(relacion.objetivo_roadmap_id, (mapa.get(relacion.objetivo_roadmap_id) ?? 0) + 1),
      new Map<string, number>()
    )
  }, [relacionesKr])

  const paginacion = usePaginacion({
    items: objetivosFiltrados,
    paginaInicial: Number.isFinite(paginaInicial) && paginaInicial > 0 ? paginaInicial : 1,
    tamanoInicial: [10, 25, 50].includes(tamanoInicial) ? tamanoInicial : 10
  })

  useEffect(() => {
    const parametros = new URLSearchParams()
    if (busqueda) parametros.set('q', busqueda)
    if (filtroEstado !== 'todos') parametros.set('estado', filtroEstado)
    if (filtroPrioridad !== 'todas') parametros.set('prioridad', filtroPrioridad)
    if (paginacion.paginaActual > 1) parametros.set('pagina', String(paginacion.paginaActual))
    if (paginacion.tamanoPagina !== 10) parametros.set('tamano', String(paginacion.tamanoPagina))
    setSearchParams(parametros, { replace: true })
  }, [busqueda, filtroEstado, filtroPrioridad, paginacion.paginaActual, paginacion.tamanoPagina, setSearchParams])

  const abrirModal = (modo: ModoModal, objetivo?: Objetivo) => {
    setModoModal(modo)
    setObjetivoActivo(objetivo ?? null)
    setModalAbierto(true)
    reset({
      nombre: objetivo?.nombre ?? '',
      descripcion: objetivo?.descripcion ?? '',
      estado: objetivo?.estado ?? 'pendiente',
      prioridad: objetivo?.prioridad ?? 'media',
      fecha_inicio: objetivo?.fecha_inicio ?? null,
      fecha_fin: objetivo?.fecha_fin ?? null
    })
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Objetivos roadmap</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Define objetivos del módulo Roadmap para ordenar la ejecución y priorización del delivery. No reemplazan objetivos estratégicos de OKRs.
          </p>
        </div>
        <NavegacionRoadmap />
      </header>

      <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-100">
        <p className="font-medium">Qué es y qué no es</p>
        <p className="mt-1">
          El objetivo roadmap vive en Roadmap y sirve para organizar ejecución, entregas e iniciativas. No equivale a un objetivo estratégico del módulo Estrategia.
        </p>
      </article>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <input
            type="search"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar por nombre o descripción"
            aria-label="Buscar objetivos"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800"
          />
          <button
            type="button"
            onClick={() => {
              exportarCsv('roadmap-objetivos.csv', [
                { encabezado: 'Nombre', valor: (objetivo) => objetivo.nombre },
                { encabezado: 'Descripción', valor: (objetivo) => objetivo.descripcion },
                { encabezado: 'Estado', valor: (objetivo) => formatearEstadoLegible(objetivo.estado) },
                { encabezado: 'Prioridad', valor: (objetivo) => objetivo.prioridad },
                { encabezado: 'Fecha inicio', valor: (objetivo) => formatearFechaCorta(objetivo.fecha_inicio) },
                { encabezado: 'Fecha fin', valor: (objetivo) => formatearFechaCorta(objetivo.fecha_fin) },
                { encabezado: 'Vínculos KR', valor: (objetivo) => krPorObjetivo.get(objetivo.id) ?? 0 }
              ], objetivosFiltrados)
            }}
            aria-label="Exportar objetivos a CSV"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700"
          >
            Exportar CSV
          </button>
          <button
            type="button"
            disabled={!esEdicionPermitida}
            onClick={() => abrirModal('crear')}
            aria-label="Crear objetivo roadmap"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
          >
            Crear objetivo roadmap
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Estado</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFiltroEstado('todos')}
              aria-label="Filtrar objetivos por todos los estados"
              className={`rounded-full px-3 py-1 text-xs ${
                filtroEstado === 'todos'
                  ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              Todos
            </button>
            {estadosRegistro.map((estado) => (
              <button
                key={estado}
                type="button"
                onClick={() => setFiltroEstado(estado)}
                aria-label={`Filtrar objetivos por estado ${estado}`}
                className={`rounded-full px-3 py-1 text-xs ${
                  filtroEstado === estado
                    ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900'
                    : 'border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                {estado}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Prioridad</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFiltroPrioridad('todas')}
              aria-label="Filtrar objetivos por todas las prioridades"
              className={`rounded-full px-3 py-1 text-xs ${
                filtroPrioridad === 'todas'
                  ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              Todas
            </button>
            {prioridadesRegistro.map((prioridad) => (
              <button
                key={prioridad}
                type="button"
                onClick={() => setFiltroPrioridad(prioridad)}
                aria-label={`Filtrar objetivos por prioridad ${prioridad}`}
                className={`rounded-full px-3 py-1 text-xs ${
                  filtroPrioridad === prioridad
                    ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900'
                    : 'border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                {prioridad}
              </button>
            ))}
          </div>
        </div>
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
                <th className="px-3 py-2">Objetivo roadmap</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Prioridad</th>
                <th className="px-3 py-2">Período</th>
                <th className="px-3 py-2">Vínculo estratégico</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginacion.itemsPaginados.map((objetivo) => (
                <tr key={objetivo.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-3 py-2">
                    <p className="font-medium">{objetivo.nombre}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{objetivo.descripcion}</p>
                  </td>
                  <td className="px-3 py-2">{objetivo.estado}</td>
                  <td className="px-3 py-2">{objetivo.prioridad}</td>
                  <td className="px-3 py-2">
                    {objetivo.fecha_inicio ? (
                      <p className="text-xs">
                        {formatearFechaCorta(objetivo.fecha_inicio)}
                        {objetivo.fecha_fin ? ` — ${formatearFechaCorta(objetivo.fecha_fin)}` : ''}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-slate-600">Sin período</p>
                    )}
                  </td>
                  <td className="px-3 py-2">{krPorObjetivo.get(objetivo.id) ? `${krPorObjetivo.get(objetivo.id)} KR vinculados` : 'Sin vínculo'}</td>
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

      <PaginacionTabla
        paginaActual={paginacion.paginaActual}
        totalPaginas={paginacion.totalPaginas}
        totalItems={paginacion.totalItems}
        desde={paginacion.desde}
        hasta={paginacion.hasta}
        tamanoPagina={paginacion.tamanoPagina}
        alCambiarTamanoPagina={paginacion.setTamanoPagina}
        alCambiarPagina={paginacion.setPaginaActual}
      />

      <ModalPortal
        abierto={modalAbierto}
        titulo={`${modoModal === 'crear' ? 'Crear' : modoModal === 'editar' ? 'Editar' : 'Ver'} objetivo roadmap`}
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
                fecha_inicio: valores.fecha_inicio || null,
                fecha_fin: valores.fecha_fin || null
              }

              if (modoModal === 'crear') {
                await crearObjetivo(carga)
              }

              if (modoModal === 'editar' && objetivoActivo) {
                await editarObjetivo(objetivoActivo.id, carga)
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

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Fecha inicio</label>
              <input
                type="date"
                {...register('fecha_inicio')}
                readOnly={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Opcional</p>
            </div>
            <div>
              <label className="text-sm font-medium">Fecha fin</label>
              <input
                type="date"
                {...register('fecha_fin')}
                readOnly={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
              {errors.fecha_fin ? (
                <p className="mt-1 text-xs text-red-500">{errors.fecha_fin.message}</p>
              ) : null}
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
