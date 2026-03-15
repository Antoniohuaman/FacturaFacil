import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'react-router-dom'
import { seguimientoReleaseSchema, type SeguimientoReleaseEntrada } from '@/compartido/validacion/esquemas'
import type { ReleasePm, ReleaseSeguimientoPm } from '@/dominio/modelos'
import {
  estadosEstabilizacionReleasePm,
  formatearEstadoEstabilizacionRelease
} from '@/dominio/modelos'
import {
  crearSeguimientoRelease,
  editarSeguimientoRelease,
  eliminarSeguimientoRelease,
  listarReleases,
  listarSeguimientosRelease
} from '@/aplicacion/casos-uso/lanzamientos'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { PaginacionTabla } from '@/compartido/ui/PaginacionTabla'
import { exportarCsv } from '@/compartido/utilidades/csv'
import { formatearFechaCorta, normalizarFechaPortal } from '@/compartido/utilidades/formatoPortal'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'
import { usePaginacion } from '@/compartido/utilidades/usePaginacion'
import { NavegacionLanzamientos } from '@/presentacion/paginas/lanzamientos/NavegacionLanzamientos'

type ModoModal = 'crear' | 'editar' | 'ver'

export function PaginaSeguimientoLanzamientos() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paginaInicial = Number(searchParams.get('pagina') ?? '1')
  const tamanoInicial = Number(searchParams.get('tamano') ?? '10')
  const { rol } = useSesionPortalPM()
  const [seguimientos, setSeguimientos] = useState<ReleaseSeguimientoPm[]>([])
  const [releases, setReleases] = useState<ReleasePm[]>([])
  const [filtroRelease, setFiltroRelease] = useState(searchParams.get('release') ?? 'todos')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | (typeof estadosEstabilizacionReleasePm)[number]>(
    (searchParams.get('estado_estabilizacion') as 'todos' | (typeof estadosEstabilizacionReleasePm)[number]) ?? 'todos'
  )
  const [filtroOwner, setFiltroOwner] = useState(searchParams.get('owner') ?? '')
  const [fechaDesde, setFechaDesde] = useState(searchParams.get('desde') ?? '')
  const [fechaHasta, setFechaHasta] = useState(searchParams.get('hasta') ?? '')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [seguimientoActivo, setSeguimientoActivo] = useState<ReleaseSeguimientoPm | null>(null)

  const esEdicionPermitida = puedeEditar(rol)

  const formulario = useForm<SeguimientoReleaseEntrada>({
    resolver: zodResolver(seguimientoReleaseSchema),
    defaultValues: {
      release_id: '',
      fecha_registro: new Date().toISOString().slice(0, 10),
      estado_estabilizacion: 'estable',
      observaciones: '',
      incidencias_detectadas: '',
      metrica_clave: null,
      decision_requerida: false,
      owner: null
    }
  })

  const cargar = async () => {
    setCargando(true)
    setError(null)

    try {
      const [seguimientosData, releasesData] = await Promise.all([listarSeguimientosRelease(), listarReleases()])
      setSeguimientos(seguimientosData)
      setReleases(releasesData)
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar seguimiento post-lanzamiento')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const seguimientosFiltrados = useMemo(() => {
    const owner = filtroOwner.toLowerCase()

    return seguimientos.filter((seguimiento) => {
      const coincideRelease = filtroRelease === 'todos' ? true : seguimiento.release_id === filtroRelease
      const coincideEstado = filtroEstado === 'todos' ? true : seguimiento.estado_estabilizacion === filtroEstado
      const coincideOwner = owner ? (seguimiento.owner ?? '').toLowerCase().includes(owner) : true
      const coincideDesde = fechaDesde ? seguimiento.fecha_registro >= fechaDesde : true
      const coincideHasta = fechaHasta ? seguimiento.fecha_registro <= fechaHasta : true

      return coincideRelease && coincideEstado && coincideOwner && coincideDesde && coincideHasta
    })
  }, [seguimientos, filtroRelease, filtroEstado, filtroOwner, fechaDesde, fechaHasta])

  const paginacion = usePaginacion({
    items: seguimientosFiltrados,
    paginaInicial: Number.isFinite(paginaInicial) && paginaInicial > 0 ? paginaInicial : 1,
    tamanoInicial: [10, 25, 50].includes(tamanoInicial) ? tamanoInicial : 10
  })

  useEffect(() => {
    const parametros = new URLSearchParams()

    if (filtroRelease !== 'todos') {
      parametros.set('release', filtroRelease)
    }
    if (filtroEstado !== 'todos') {
      parametros.set('estado_estabilizacion', filtroEstado)
    }
    if (filtroOwner) {
      parametros.set('owner', filtroOwner)
    }
    if (fechaDesde) {
      parametros.set('desde', fechaDesde)
    }
    if (fechaHasta) {
      parametros.set('hasta', fechaHasta)
    }
    if (paginacion.paginaActual > 1) {
      parametros.set('pagina', String(paginacion.paginaActual))
    }
    if (paginacion.tamanoPagina !== 10) {
      parametros.set('tamano', String(paginacion.tamanoPagina))
    }

    setSearchParams(parametros, { replace: true })
  }, [filtroRelease, filtroEstado, filtroOwner, fechaDesde, fechaHasta, paginacion.paginaActual, paginacion.tamanoPagina, setSearchParams])

  const releasePorId = useMemo(() => new Map(releases.map((release) => [release.id, `${release.codigo} · ${release.nombre}`])), [releases])

  const abrirModal = (modo: ModoModal, seguimiento?: ReleaseSeguimientoPm) => {
    setModoModal(modo)
    setSeguimientoActivo(seguimiento ?? null)
    setModalAbierto(true)
    formulario.reset({
      release_id: seguimiento?.release_id ?? '',
      fecha_registro: seguimiento?.fecha_registro ?? new Date().toISOString().slice(0, 10),
      estado_estabilizacion: seguimiento?.estado_estabilizacion ?? 'estable',
      observaciones: seguimiento?.observaciones ?? '',
      incidencias_detectadas: seguimiento?.incidencias_detectadas ?? '',
      metrica_clave: seguimiento?.metrica_clave ?? null,
      decision_requerida: seguimiento?.decision_requerida ?? false,
      owner: seguimiento?.owner ?? null
    })
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Seguimiento post-lanzamiento</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Registra estabilización, incidencias y necesidad de decisiones posteriores al release.
          </p>
        </div>
        <NavegacionLanzamientos />
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3 dark:border-slate-800 dark:bg-slate-900">
        <select
          value={filtroRelease}
          onChange={(evento) => {
            setFiltroRelease(evento.target.value)
            paginacion.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todos">Release: todos</option>
          {releases.map((release) => (
            <option key={release.id} value={release.id}>
              {release.codigo} · {release.nombre}
            </option>
          ))}
        </select>
        <select
          value={filtroEstado}
          onChange={(evento) => {
            setFiltroEstado(evento.target.value as 'todos' | (typeof estadosEstabilizacionReleasePm)[number])
            paginacion.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todos">Estado estabilización: todos</option>
          {estadosEstabilizacionReleasePm.map((estado) => (
            <option key={estado} value={estado}>
              {formatearEstadoEstabilizacionRelease(estado)}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={filtroOwner}
          onChange={(evento) => {
            setFiltroOwner(evento.target.value)
            paginacion.setPaginaActual(1)
          }}
          placeholder="Filtrar por owner"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        />
        <input
          type="date"
          value={fechaDesde}
          onChange={(evento) => {
            setFechaDesde(evento.target.value)
            paginacion.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        />
        <input
          type="date"
          value={fechaHasta}
          onChange={(evento) => {
            setFechaHasta(evento.target.value)
            paginacion.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        />
        <button
          type="button"
          onClick={() => {
            setFiltroRelease('todos')
            setFiltroEstado('todos')
            setFiltroOwner('')
            setFechaDesde('')
            setFechaHasta('')
            paginacion.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700"
        >
          Limpiar
        </button>
        <button
          type="button"
          onClick={() => {
            exportarCsv(
              'lanzamientos-seguimiento-post-lanzamiento.csv',
              [
                { encabezado: 'Release', valor: (seguimiento) => releasePorId.get(seguimiento.release_id) ?? '' },
                { encabezado: 'Fecha registro', valor: (seguimiento) => normalizarFechaPortal(seguimiento.fecha_registro) },
                { encabezado: 'Estado estabilización', valor: (seguimiento) => formatearEstadoEstabilizacionRelease(seguimiento.estado_estabilizacion) },
                { encabezado: 'Observaciones', valor: (seguimiento) => seguimiento.observaciones },
                { encabezado: 'Incidencias detectadas', valor: (seguimiento) => seguimiento.incidencias_detectadas },
                { encabezado: 'Métrica clave', valor: (seguimiento) => seguimiento.metrica_clave ?? '' },
                { encabezado: 'Decisión requerida', valor: (seguimiento) => seguimiento.decision_requerida },
                { encabezado: 'Owner', valor: (seguimiento) => seguimiento.owner ?? '' }
              ],
              seguimientosFiltrados
            )
          }}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700"
        >
          Exportar CSV
        </button>
        <button
          type="button"
          disabled={!esEdicionPermitida}
          onClick={() => abrirModal('crear')}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
        >
          Crear seguimiento
        </button>
      </div>

      <EstadoVista cargando={cargando} error={error} vacio={seguimientosFiltrados.length === 0} mensajeVacio="No hay registros de seguimiento post-lanzamiento para los filtros seleccionados.">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">Release</th>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Estabilización</th>
                <th className="px-3 py-2">Owner</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginacion.itemsPaginados.map((seguimiento) => (
                <tr key={seguimiento.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-3 py-2">
                    <p className="font-medium">{releasePorId.get(seguimiento.release_id) ?? 'Release no disponible'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{seguimiento.metrica_clave ?? 'Sin métrica clave'}</p>
                  </td>
                  <td className="px-3 py-2">{formatearFechaCorta(seguimiento.fecha_registro)}</td>
                  <td className="px-3 py-2">
                    <p>{formatearEstadoEstabilizacionRelease(seguimiento.estado_estabilizacion)}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {seguimiento.decision_requerida ? 'Requiere decisión' : 'Sin decisión requerida'}
                    </p>
                  </td>
                  <td className="px-3 py-2">{seguimiento.owner ?? 'Sin owner'}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => abrirModal('ver', seguimiento)} className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">Ver</button>
                      <button type="button" disabled={!esEdicionPermitida} onClick={() => abrirModal('editar', seguimiento)} className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700">Editar</button>
                      <button
                        type="button"
                        disabled={!esEdicionPermitida}
                        onClick={() => {
                          if (window.confirm('¿Eliminar este seguimiento post-lanzamiento?')) {
                            void eliminarSeguimientoRelease(seguimiento.id).then(cargar).catch((errorInterno) => {
                              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar el seguimiento')
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
        <PaginacionTabla
          paginaActual={paginacion.paginaActual}
          totalPaginas={paginacion.totalPaginas}
          totalItems={paginacion.totalItems}
          desde={paginacion.desde}
          hasta={paginacion.hasta}
          tamanoPagina={paginacion.tamanoPagina}
          alCambiarPagina={paginacion.setPaginaActual}
          alCambiarTamanoPagina={paginacion.setTamanoPagina}
        />
      </EstadoVista>

      <ModalPortal
        abierto={modalAbierto}
        titulo={`${modoModal === 'crear' ? 'Crear' : modoModal === 'editar' ? 'Editar' : 'Ver'} seguimiento post-lanzamiento`}
        alCerrar={() => setModalAbierto(false)}
      >
        <form
          noValidate
          className="space-y-4"
          onSubmit={formulario.handleSubmit(async (valores) => {
            if (modoModal === 'ver') {
              return
            }

            try {
              if (modoModal === 'crear') {
                await crearSeguimientoRelease(valores)
              }

              if (modoModal === 'editar' && seguimientoActivo) {
                await editarSeguimientoRelease(seguimientoActivo.id, valores)
              }

              setModalAbierto(false)
              await cargar()
            } catch (errorInterno) {
              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar el seguimiento')
            }
          })}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Release</label>
              <select {...formulario.register('release_id')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                <option value="">Selecciona un release</option>
                {releases.map((release) => <option key={release.id} value={release.id}>{release.codigo} · {release.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Fecha registro</label>
              <input type="date" {...formulario.register('fecha_registro')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Estado estabilización</label>
              <select {...formulario.register('estado_estabilizacion')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                {estadosEstabilizacionReleasePm.map((estado) => <option key={estado} value={estado}>{formatearEstadoEstabilizacionRelease(estado)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Métrica clave</label>
              <input {...formulario.register('metrica_clave')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
            <div>
              <label className="text-sm font-medium">Owner</label>
              <input {...formulario.register('owner')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Observaciones</label>
            <textarea {...formulario.register('observaciones')} readOnly={modoModal === 'ver'} className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div>
            <label className="text-sm font-medium">Incidencias detectadas</label>
            <textarea {...formulario.register('incidencias_detectadas')} readOnly={modoModal === 'ver'} className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-3 text-sm dark:border-slate-800">
            <input type="checkbox" {...formulario.register('decision_requerida')} disabled={modoModal === 'ver'} />
            Decisión requerida
          </label>

          {modoModal !== 'ver' ? (
            <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900">
              Guardar
            </button>
          ) : null}
        </form>
      </ModalPortal>
    </section>
  )
}