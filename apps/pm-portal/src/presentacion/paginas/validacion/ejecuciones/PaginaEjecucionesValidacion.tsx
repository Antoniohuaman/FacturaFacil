import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'react-router-dom'
import {
  ejecucionValidacionSchema,
  validarCodigoCatalogoDinamico,
  type EjecucionValidacionEntrada
} from '@/compartido/validacion/esquemas'
import type { CatalogoEstadoPm, CatalogoModuloPm, EjecucionValidacion, PlanValidacion } from '@/dominio/modelos'
import {
  crearEjecucionValidacion,
  editarEjecucionValidacion,
  eliminarEjecucionValidacion,
  listarEjecucionesValidacion
} from '@/aplicacion/casos-uso/ejecucionesValidacion'
import { listarPlanesValidacion } from '@/aplicacion/casos-uso/validaciones'
import { listarEstadosPm, listarModulosPm } from '@/aplicacion/casos-uso/ajustes'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'
import { usePaginacion } from '@/compartido/utilidades/usePaginacion'
import { PaginacionTabla } from '@/compartido/ui/PaginacionTabla'
import { exportarCsv } from '@/compartido/utilidades/csv'
import { formatearEstadoCatalogo, formatearFechaCorta, normalizarFechaPortal } from '@/compartido/utilidades/formatoPortal'
import { NavegacionValidacion } from '@/presentacion/paginas/validacion/NavegacionValidacion'

type ModoModal = 'crear' | 'ver' | 'editar'

export function PaginaEjecucionesValidacion() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paginaInicial = Number(searchParams.get('pagina') ?? '1')
  const tamanoInicial = Number(searchParams.get('tamano') ?? '10')
  const { rol } = useSesionPortalPM()
  const [modulos, setModulos] = useState<CatalogoModuloPm[]>([])
  const [estados, setEstados] = useState<CatalogoEstadoPm[]>([])
  const [planes, setPlanes] = useState<PlanValidacion[]>([])
  const [ejecuciones, setEjecuciones] = useState<EjecucionValidacion[]>([])
  const [busqueda, setBusqueda] = useState(searchParams.get('q') ?? '')
  const [filtroEstado, setFiltroEstado] = useState(searchParams.get('estado') ?? 'todos')
  const [filtroModulo, setFiltroModulo] = useState(searchParams.get('modulo') ?? 'todos')
  const [fechaDesde, setFechaDesde] = useState(searchParams.get('desde') ?? '')
  const [fechaHasta, setFechaHasta] = useState(searchParams.get('hasta') ?? '')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [ejecucionActiva, setEjecucionActiva] = useState<EjecucionValidacion | null>(null)

  const esEdicionPermitida = puedeEditar(rol)

  const formulario = useForm<EjecucionValidacionEntrada>({
    resolver: zodResolver(ejecucionValidacionSchema),
    defaultValues: {
      plan_validacion_id: '',
      modulo_id: '',
      fecha_ejecucion: new Date().toISOString().slice(0, 10),
      rango_desde: null,
      rango_hasta: null,
      resultado: '',
      hallazgos: '',
      evidencia_url: null,
      aprobador: null,
      estado_codigo: ''
    }
  })

  const cargar = async () => {
    setCargando(true)
    setError(null)
    try {
      const [modulosData, estadosData, planesData, ejecucionesData] = await Promise.all([
        listarModulosPm(),
        listarEstadosPm('validacion_ejecucion'),
        listarPlanesValidacion(),
        listarEjecucionesValidacion()
      ])

      setModulos(modulosData.filter((modulo) => modulo.activo))
      setEstados(estadosData.filter((estado) => estado.activo))
      setPlanes(planesData)
      setEjecuciones(ejecucionesData)
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar ejecuciones')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const moduloPorId = useMemo(() => new Map(modulos.map((modulo) => [modulo.id, modulo.nombre])), [modulos])
  const planPorId = useMemo(() => new Map(planes.map((plan) => [plan.id, plan.nombre])), [planes])
  const estadoPorCodigo = useMemo(() => new Map(estados.map((estado) => [estado.codigo, estado.nombre])), [estados])

  const ejecucionesFiltradas = useMemo(() => {
    const termino = busqueda.toLowerCase()
    return ejecuciones.filter((ejecucion) => {
      const nombreEstado = estadoPorCodigo.get(ejecucion.estado_codigo) ?? ''
      const coincideEstado = filtroEstado === 'todos' ? true : ejecucion.estado_codigo === filtroEstado
      const coincideModulo = filtroModulo === 'todos' ? true : ejecucion.modulo_id === filtroModulo
      const coincideDesde = fechaDesde ? ejecucion.fecha_ejecucion >= fechaDesde : true
      const coincideHasta = fechaHasta ? ejecucion.fecha_ejecucion <= fechaHasta : true

      return (
        (planPorId.get(ejecucion.plan_validacion_id) ?? '').toLowerCase().includes(termino) ||
        (moduloPorId.get(ejecucion.modulo_id) ?? '').toLowerCase().includes(termino) ||
        nombreEstado.toLowerCase().includes(termino) ||
        ejecucion.estado_codigo.toLowerCase().includes(termino)
      ) && coincideEstado && coincideModulo && coincideDesde && coincideHasta
    })
  }, [ejecuciones, busqueda, moduloPorId, planPorId, estadoPorCodigo, filtroEstado, filtroModulo, fechaDesde, fechaHasta])

  const paginacion = usePaginacion({
    items: ejecucionesFiltradas,
    paginaInicial: Number.isFinite(paginaInicial) && paginaInicial > 0 ? paginaInicial : 1,
    tamanoInicial: [10, 25, 50].includes(tamanoInicial) ? tamanoInicial : 10
  })

  useEffect(() => {
    const parametros = new URLSearchParams()

    if (busqueda) {
      parametros.set('q', busqueda)
    }
    if (filtroEstado !== 'todos') {
      parametros.set('estado', filtroEstado)
    }
    if (filtroModulo !== 'todos') {
      parametros.set('modulo', filtroModulo)
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
  }, [
    busqueda,
    filtroEstado,
    filtroModulo,
    fechaDesde,
    fechaHasta,
    paginacion.paginaActual,
    paginacion.tamanoPagina,
    setSearchParams
  ])

  const abrirModal = (modo: ModoModal, ejecucion?: EjecucionValidacion) => {
    setModoModal(modo)
    setEjecucionActiva(ejecucion ?? null)
    setModalAbierto(true)
    formulario.reset({
      plan_validacion_id: ejecucion?.plan_validacion_id ?? planes[0]?.id ?? '',
      modulo_id: ejecucion?.modulo_id ?? modulos[0]?.id ?? '',
      fecha_ejecucion: ejecucion?.fecha_ejecucion ?? new Date().toISOString().slice(0, 10),
      rango_desde: ejecucion?.rango_desde ?? null,
      rango_hasta: ejecucion?.rango_hasta ?? null,
      resultado: ejecucion?.resultado ?? '',
      hallazgos: ejecucion?.hallazgos ?? '',
      evidencia_url: ejecucion?.evidencia_url ?? null,
      aprobador: ejecucion?.aprobador ?? null,
      estado_codigo: ejecucion?.estado_codigo ?? estados[0]?.codigo ?? ''
    })
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Ejecuciones de validación</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Registra resultados por rango, hallazgos y evidencia asociados a planes de validación.
          </p>
        </div>
        <NavegacionValidacion />
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3 dark:border-slate-800 dark:bg-slate-900">
        <input
          type="search"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar por plan, módulo o estado"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        />
        <select
          value={filtroEstado}
          onChange={(evento) => {
            setFiltroEstado(evento.target.value)
            paginacion.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todos">Estado: todos</option>
          {estados.map((estado) => (
            <option key={estado.id} value={estado.codigo}>
              {estado.nombre}
            </option>
          ))}
        </select>
        <select
          value={filtroModulo}
          onChange={(evento) => {
            setFiltroModulo(evento.target.value)
            paginacion.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todos">Módulo: todos</option>
          {modulos.map((modulo) => (
            <option key={modulo.id} value={modulo.id}>
              {modulo.nombre}
            </option>
          ))}
        </select>
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
            setBusqueda('')
            setFiltroEstado('todos')
            setFiltroModulo('todos')
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
            exportarCsv('ejecuciones-validacion.csv', [
              { encabezado: 'Fecha', valor: (ejecucion) => normalizarFechaPortal(ejecucion.fecha_ejecucion) },
              { encabezado: 'Plan', valor: (ejecucion) => planPorId.get(ejecucion.plan_validacion_id) ?? 'No disponible' },
              { encabezado: 'Módulo', valor: (ejecucion) => moduloPorId.get(ejecucion.modulo_id) ?? 'No disponible' },
              { encabezado: 'Estado', valor: (ejecucion) => formatearEstadoCatalogo(ejecucion.estado_codigo, estadoPorCodigo) },
              { encabezado: 'Rango desde', valor: (ejecucion) => normalizarFechaPortal(ejecucion.rango_desde) },
              { encabezado: 'Rango hasta', valor: (ejecucion) => normalizarFechaPortal(ejecucion.rango_hasta) },
              { encabezado: 'Aprobador', valor: (ejecucion) => ejecucion.aprobador ?? 'Sin aprobador' }
            ], ejecucionesFiltradas)
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
          Crear ejecución
        </button>
      </div>

      <EstadoVista
        cargando={cargando}
        error={error}
        vacio={ejecucionesFiltradas.length === 0}
        mensajeVacio="No hay ejecuciones de validación para los filtros seleccionados."
      >
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Módulo</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginacion.itemsPaginados.map((ejecucion) => (
                <tr key={ejecucion.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-3 py-2">{formatearFechaCorta(ejecucion.fecha_ejecucion)}</td>
                  <td className="px-3 py-2">{planPorId.get(ejecucion.plan_validacion_id) ?? 'No disponible'}</td>
                  <td className="px-3 py-2">{moduloPorId.get(ejecucion.modulo_id) ?? 'No disponible'}</td>
                  <td className="px-3 py-2">{formatearEstadoCatalogo(ejecucion.estado_codigo, estadoPorCodigo)}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => abrirModal('ver', ejecucion)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        disabled={!esEdicionPermitida}
                        onClick={() => abrirModal('editar', ejecucion)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={!esEdicionPermitida}
                        onClick={() => {
                          if (window.confirm('¿Eliminar esta ejecución?')) {
                            void eliminarEjecucionValidacion(ejecucion.id).then(cargar).catch((errorInterno) => {
                              setError(
                                errorInterno instanceof Error
                                  ? errorInterno.message
                                  : 'No se pudo eliminar la ejecución'
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
        titulo={`${modoModal === 'crear' ? 'Crear' : modoModal === 'editar' ? 'Editar' : 'Ver'} ejecución`}
        alCerrar={() => setModalAbierto(false)}
      >
        <form
          className="space-y-4"
          onSubmit={formulario.handleSubmit(async (valores) => {
            if (modoModal === 'ver') {
              return
            }

            try {
              const errorEstado = validarCodigoCatalogoDinamico(valores.estado_codigo, estados)

              if (errorEstado) {
                formulario.setError('estado_codigo', { type: 'validate', message: errorEstado })
                return
              }

              formulario.clearErrors('estado_codigo')

              if (modoModal === 'crear') {
                await crearEjecucionValidacion(valores)
              }

              if (modoModal === 'editar' && ejecucionActiva) {
                await editarEjecucionValidacion(ejecucionActiva.id, valores)
              }

              setModalAbierto(false)
              await cargar()
            } catch (errorInterno) {
              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar la ejecución')
            }
          })}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Plan</label>
              <select
                {...formulario.register('plan_validacion_id')}
                disabled={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">Selecciona plan</option>
                {planes.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Módulo</label>
              <select
                {...formulario.register('modulo_id')}
                disabled={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">Selecciona módulo</option>
                {modulos.map((modulo) => (
                  <option key={modulo.id} value={modulo.id}>
                    {modulo.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Fecha</label>
              <input
                type="date"
                {...formulario.register('fecha_ejecucion')}
                readOnly={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Desde</label>
              <input
                type="date"
                {...formulario.register('rango_desde')}
                readOnly={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Hasta</label>
              <input
                type="date"
                {...formulario.register('rango_hasta')}
                readOnly={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Resultado</label>
            <textarea
              {...formulario.register('resultado')}
              readOnly={modoModal === 'ver'}
              className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Hallazgos</label>
            <textarea
              {...formulario.register('hallazgos')}
              readOnly={modoModal === 'ver'}
              className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Evidencia URL</label>
              <input
                {...formulario.register('evidencia_url')}
                readOnly={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Aprobador</label>
              <input
                {...formulario.register('aprobador')}
                readOnly={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Estado</label>
              <select
                {...formulario.register('estado_codigo')}
                disabled={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {estados.map((estado) => (
                  <option key={estado.id} value={estado.codigo}>
                    {estado.nombre}
                  </option>
                ))}
              </select>
              <p className={`mt-1 text-xs ${formulario.formState.errors.estado_codigo ? 'text-red-600 dark:text-red-300' : 'text-slate-500 dark:text-slate-400'}`}>
                {formulario.formState.errors.estado_codigo?.message ?? 'El estado debe existir en el catálogo activo configurado en Ajustes.'}
              </p>
            </div>
          </div>

          {modoModal !== 'ver' ? (
            <button
              type="submit"
              disabled={formulario.formState.isSubmitting}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-70 dark:bg-slate-200 dark:text-slate-900"
            >
              {formulario.formState.isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          ) : null}
        </form>
      </ModalPortal>
    </section>
  )
}
