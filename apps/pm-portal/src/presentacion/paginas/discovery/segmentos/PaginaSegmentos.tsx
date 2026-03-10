import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'react-router-dom'
import { segmentoDiscoverySchema, type SegmentoDiscoveryEntrada } from '@/compartido/validacion/esquemas'
import type { SegmentoDiscoveryPm } from '@/dominio/modelos'
import {
  crearSegmentoDiscovery,
  editarSegmentoDiscovery,
  eliminarSegmentoDiscovery,
  listarSegmentosDiscovery
} from '@/aplicacion/casos-uso/discovery'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { PaginacionTabla } from '@/compartido/ui/PaginacionTabla'
import { exportarCsv } from '@/compartido/utilidades/csv'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'
import { usePaginacion } from '@/compartido/utilidades/usePaginacion'
import { NavegacionDiscovery } from '@/presentacion/paginas/discovery/NavegacionDiscovery'

type ModoModal = 'crear' | 'editar' | 'ver'
type FiltroActivo = 'todos' | 'activos' | 'inactivos'

export function PaginaSegmentos() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paginaInicial = Number(searchParams.get('pagina') ?? '1')
  const tamanoInicial = Number(searchParams.get('tamano') ?? '10')
  const { rol } = useSesionPortalPM()
  const [segmentos, setSegmentos] = useState<SegmentoDiscoveryPm[]>([])
  const [busqueda, setBusqueda] = useState(searchParams.get('q') ?? '')
  const [filtroActivo, setFiltroActivo] = useState<FiltroActivo>((searchParams.get('activo') as FiltroActivo) ?? 'todos')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [segmentoActivo, setSegmentoActivo] = useState<SegmentoDiscoveryPm | null>(null)

  const esEdicionPermitida = puedeEditar(rol)

  const formulario = useForm<SegmentoDiscoveryEntrada>({
    resolver: zodResolver(segmentoDiscoverySchema),
    defaultValues: {
      nombre: '',
      descripcion: null,
      necesidades: null,
      dolores: null,
      contexto: null,
      activo: true
    }
  })

  const cargar = async () => {
    setCargando(true)
    setError(null)

    try {
      const data = await listarSegmentosDiscovery()
      setSegmentos(data)
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudieron cargar los segmentos')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const segmentosFiltrados = useMemo(() => {
    const termino = busqueda.toLowerCase()

    return segmentos.filter((segmento) => {
      const coincideBusqueda =
        segmento.nombre.toLowerCase().includes(termino) ||
        (segmento.descripcion ?? '').toLowerCase().includes(termino) ||
        (segmento.necesidades ?? '').toLowerCase().includes(termino) ||
        (segmento.dolores ?? '').toLowerCase().includes(termino) ||
        (segmento.contexto ?? '').toLowerCase().includes(termino)

      const coincideActivo =
        filtroActivo === 'todos' ? true : filtroActivo === 'activos' ? segmento.activo : !segmento.activo

      return coincideBusqueda && coincideActivo
    })
  }, [segmentos, busqueda, filtroActivo])

  const paginacion = usePaginacion({
    items: segmentosFiltrados,
    paginaInicial: Number.isFinite(paginaInicial) && paginaInicial > 0 ? paginaInicial : 1,
    tamanoInicial: [10, 25, 50].includes(tamanoInicial) ? tamanoInicial : 10
  })

  useEffect(() => {
    const parametros = new URLSearchParams()

    if (busqueda) {
      parametros.set('q', busqueda)
    }

    if (filtroActivo !== 'todos') {
      parametros.set('activo', filtroActivo)
    }

    if (paginacion.paginaActual > 1) {
      parametros.set('pagina', String(paginacion.paginaActual))
    }

    if (paginacion.tamanoPagina !== 10) {
      parametros.set('tamano', String(paginacion.tamanoPagina))
    }

    setSearchParams(parametros, { replace: true })
  }, [busqueda, filtroActivo, paginacion.paginaActual, paginacion.tamanoPagina, setSearchParams])

  const abrirModal = (modo: ModoModal, segmento?: SegmentoDiscoveryPm) => {
    setModoModal(modo)
    setSegmentoActivo(segmento ?? null)
    setModalAbierto(true)
    formulario.reset({
      nombre: segmento?.nombre ?? '',
      descripcion: segmento?.descripcion ?? null,
      necesidades: segmento?.necesidades ?? null,
      dolores: segmento?.dolores ?? null,
      contexto: segmento?.contexto ?? null,
      activo: segmento?.activo ?? true
    })
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Segmentos</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Mantén el catálogo vivo de segmentos para contextualizar insights, investigaciones y problemas.
          </p>
        </div>
        <NavegacionDiscovery />
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_220px_auto_auto] dark:border-slate-800 dark:bg-slate-900">
        <input
          type="search"
          value={busqueda}
          onChange={(evento) => {
            setBusqueda(evento.target.value)
            paginacion.setPaginaActual(1)
          }}
          placeholder="Buscar segmento"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        />
        <select
          value={filtroActivo}
          onChange={(evento) => {
            setFiltroActivo(evento.target.value as FiltroActivo)
            paginacion.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todos">Estado: todos</option>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
        </select>
        <button
          type="button"
          onClick={() => {
            setBusqueda('')
            setFiltroActivo('todos')
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
              'discovery-segmentos.csv',
              [
                { encabezado: 'Nombre', valor: (segmento) => segmento.nombre },
                { encabezado: 'Descripción', valor: (segmento) => segmento.descripcion ?? '' },
                { encabezado: 'Necesidades', valor: (segmento) => segmento.necesidades ?? '' },
                { encabezado: 'Dolores', valor: (segmento) => segmento.dolores ?? '' },
                { encabezado: 'Contexto', valor: (segmento) => segmento.contexto ?? '' },
                { encabezado: 'Activo', valor: (segmento) => segmento.activo }
              ],
              segmentosFiltrados
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
          Crear segmento
        </button>
      </div>

      <EstadoVista
        cargando={cargando}
        error={error}
        vacio={segmentosFiltrados.length === 0}
        mensajeVacio="No hay segmentos para los filtros seleccionados."
      >
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">Segmento</th>
                <th className="px-3 py-2">Necesidades y dolores</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginacion.itemsPaginados.map((segmento) => (
                <tr key={segmento.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-3 py-2">
                    <p className="font-medium">{segmento.nombre}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{segmento.descripcion ?? 'Sin descripción'}</p>
                  </td>
                  <td className="px-3 py-2">
                    <p>{segmento.necesidades ?? 'Sin necesidades registradas'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{segmento.dolores ?? 'Sin dolores registrados'}</p>
                  </td>
                  <td className="px-3 py-2">{segmento.activo ? 'Activo' : 'Inactivo'}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => abrirModal('ver', segmento)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        disabled={!esEdicionPermitida}
                        onClick={() => abrirModal('editar', segmento)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={!esEdicionPermitida}
                        onClick={() => {
                          if (window.confirm('¿Eliminar este segmento?')) {
                            void eliminarSegmentoDiscovery(segmento.id).then(cargar).catch((errorInterno) => {
                              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar el segmento')
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
        titulo={`${modoModal === 'crear' ? 'Crear' : modoModal === 'editar' ? 'Editar' : 'Ver'} segmento`}
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
                await crearSegmentoDiscovery(valores)
              }

              if (modoModal === 'editar' && segmentoActivo) {
                await editarSegmentoDiscovery(segmentoActivo.id, valores)
              }

              setModalAbierto(false)
              await cargar()
            } catch (errorInterno) {
              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar el segmento')
            }
          })}
        >
          <div>
            <label className="text-sm font-medium">Nombre</label>
            <input
              {...formulario.register('nombre')}
              readOnly={modoModal === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Descripción</label>
            <textarea
              {...formulario.register('descripcion')}
              readOnly={modoModal === 'ver'}
              className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Necesidades</label>
              <textarea
                {...formulario.register('necesidades')}
                readOnly={modoModal === 'ver'}
                className="mt-1 min-h-28 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Dolores</label>
              <textarea
                {...formulario.register('dolores')}
                readOnly={modoModal === 'ver'}
                className="mt-1 min-h-28 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Contexto</label>
            <textarea
              {...formulario.register('contexto')}
              readOnly={modoModal === 'ver'}
              className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...formulario.register('activo')} disabled={modoModal === 'ver'} />
            Segmento activo
          </label>

          {modoModal !== 'ver' ? (
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900"
            >
              Guardar
            </button>
          ) : null}
        </form>
      </ModalPortal>
    </section>
  )
}