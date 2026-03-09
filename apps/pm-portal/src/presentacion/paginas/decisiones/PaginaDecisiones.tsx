import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSearchParams } from 'react-router-dom'
import { decisionPmSchema, type DecisionPmEntrada } from '@/compartido/validacion/esquemas'
import type { CatalogoEstadoPm, DecisionPm, EjecucionValidacion, Entrega, Iniciativa } from '@/dominio/modelos'
import {
  crearDecisionPm,
  editarDecisionPm,
  eliminarDecisionPm,
  listarDecisionesPm
} from '@/aplicacion/casos-uso/decisiones'
import { listarEstadosPm } from '@/aplicacion/casos-uso/ajustes'
import { listarIniciativas } from '@/aplicacion/casos-uso/iniciativas'
import { listarEntregas } from '@/aplicacion/casos-uso/entregas'
import { listarEjecucionesValidacion } from '@/aplicacion/casos-uso/ejecucionesValidacion'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'
import { usePaginacion } from '@/compartido/utilidades/usePaginacion'
import { PaginacionTabla } from '@/compartido/ui/PaginacionTabla'
import { exportarCsv } from '@/compartido/utilidades/csv'
import { formatearEstadoLegible, normalizarFechaPortal } from '@/compartido/utilidades/formatoPortal'

type ModoModal = 'crear' | 'ver' | 'editar'

const decisionFormularioSchema = decisionPmSchema
  .omit({ links: true, tags: true })
  .extend({
    links_texto: z.string(),
    tags_texto: z.string()
  })

type FormularioDecision = z.infer<typeof decisionFormularioSchema>

function dividirTextoLista(valor: string) {
  return valor
    .split(',')
    .map((elemento) => elemento.trim())
    .filter(Boolean)
}

export function PaginaDecisiones() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paginaInicial = Number(searchParams.get('pagina') ?? '1')
  const tamanoInicial = Number(searchParams.get('tamano') ?? '10')
  const { rol } = useSesionPortalPM()
  const [decisiones, setDecisiones] = useState<DecisionPm[]>([])
  const [iniciativas, setIniciativas] = useState<Iniciativa[]>([])
  const [entregas, setEntregas] = useState<Entrega[]>([])
  const [ejecuciones, setEjecuciones] = useState<EjecucionValidacion[]>([])
  const [estados, setEstados] = useState<CatalogoEstadoPm[]>([])
  const [busqueda, setBusqueda] = useState(searchParams.get('q') ?? '')
  const [filtroEstado, setFiltroEstado] = useState(searchParams.get('estado') ?? 'todos')
  const [fechaDesde, setFechaDesde] = useState(searchParams.get('desde') ?? '')
  const [fechaHasta, setFechaHasta] = useState(searchParams.get('hasta') ?? '')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [decisionActiva, setDecisionActiva] = useState<DecisionPm | null>(null)

  const esEdicionPermitida = puedeEditar(rol)

  const formulario = useForm<FormularioDecision>({
    resolver: zodResolver(decisionFormularioSchema),
    defaultValues: {
      titulo: '',
      contexto: '',
      decision: '',
      alternativas: '',
      impacto: '',
      estado_codigo: '',
      owner: null,
      fecha_decision: new Date().toISOString().slice(0, 10),
      iniciativa_id: null,
      entrega_id: null,
      ejecucion_validacion_id: null,
      links_texto: '',
      tags_texto: ''
    }
  })

  const cargar = async () => {
    setCargando(true)
    setError(null)

    try {
      const [decisionesData, iniciativasData, entregasData, ejecucionesData, estadosData] = await Promise.all([
        listarDecisionesPm(),
        listarIniciativas(),
        listarEntregas(),
        listarEjecucionesValidacion(),
        listarEstadosPm('decision')
      ])

      setDecisiones(decisionesData)
      setIniciativas(iniciativasData)
      setEntregas(entregasData)
      setEjecuciones(ejecucionesData)
      setEstados(estadosData.filter((estado) => estado.activo))
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar decisiones')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const decisionesFiltradas = useMemo(() => {
    const termino = busqueda.toLowerCase()
    return decisiones.filter((decision) => {
      const coincideEstado = filtroEstado === 'todos' ? true : decision.estado_codigo === filtroEstado
      const coincideDesde = fechaDesde ? decision.fecha_decision >= fechaDesde : true
      const coincideHasta = fechaHasta ? decision.fecha_decision <= fechaHasta : true

      return (
        (decision.titulo.toLowerCase().includes(termino) ||
          decision.estado_codigo.toLowerCase().includes(termino) ||
          decision.tags.some((tag) => tag.toLowerCase().includes(termino))) &&
        coincideEstado &&
        coincideDesde &&
        coincideHasta
      )
    })
  }, [decisiones, busqueda, filtroEstado, fechaDesde, fechaHasta])

  const paginacion = usePaginacion({
    items: decisionesFiltradas,
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
    fechaDesde,
    fechaHasta,
    paginacion.paginaActual,
    paginacion.tamanoPagina,
    setSearchParams
  ])

  const abrirModal = (modo: ModoModal, decision?: DecisionPm) => {
    setModoModal(modo)
    setDecisionActiva(decision ?? null)
    setModalAbierto(true)
    formulario.reset({
      titulo: decision?.titulo ?? '',
      contexto: decision?.contexto ?? '',
      decision: decision?.decision ?? '',
      alternativas: decision?.alternativas ?? '',
      impacto: decision?.impacto ?? '',
      estado_codigo: decision?.estado_codigo ?? estados[0]?.codigo ?? '',
      owner: decision?.owner ?? null,
      fecha_decision: decision?.fecha_decision ?? new Date().toISOString().slice(0, 10),
      iniciativa_id: decision?.iniciativa_id ?? null,
      entrega_id: decision?.entrega_id ?? null,
      ejecucion_validacion_id: decision?.ejecucion_validacion_id ?? null,
      links_texto: (decision?.links ?? []).join(', '),
      tags_texto: (decision?.tags ?? []).join(', ')
    })
  }

  const construirEntradaDecision = (valores: FormularioDecision): DecisionPmEntrada => {
    return {
      titulo: valores.titulo,
      contexto: valores.contexto,
      decision: valores.decision,
      alternativas: valores.alternativas,
      impacto: valores.impacto,
      estado_codigo: valores.estado_codigo,
      owner: valores.owner || null,
      fecha_decision: valores.fecha_decision,
      iniciativa_id: valores.iniciativa_id || null,
      entrega_id: valores.entrega_id || null,
      ejecucion_validacion_id: valores.ejecucion_validacion_id || null,
      links: dividirTextoLista(valores.links_texto),
      tags: dividirTextoLista(valores.tags_texto)
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Decisiones</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Registro ADR de decisiones de producto/arquitectura con trazabilidad a iniciativas, entregas y validaciones.
        </p>
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3 dark:border-slate-800 dark:bg-slate-900">
        <input
          type="search"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar por título, estado o tag"
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
            exportarCsv('decisiones.csv', [
              { encabezado: 'Título', valor: (decision) => decision.titulo },
              { encabezado: 'Estado', valor: (decision) => formatearEstadoLegible(decision.estado_codigo) },
              { encabezado: 'Fecha', valor: (decision) => normalizarFechaPortal(decision.fecha_decision) },
              { encabezado: 'Owner', valor: (decision) => decision.owner ?? 'Sin owner' },
              { encabezado: 'Tags', valor: (decision) => decision.tags.join(', ') },
              { encabezado: 'Iniciativa', valor: (decision) => iniciativas.find((iniciativa) => iniciativa.id === decision.iniciativa_id)?.nombre ?? '' },
              { encabezado: 'Entrega', valor: (decision) => entregas.find((entrega) => entrega.id === decision.entrega_id)?.nombre ?? '' },
              { encabezado: 'Ejecución', valor: (decision) => ejecuciones.find((ejecucion) => ejecucion.id === decision.ejecucion_validacion_id)?.fecha_ejecucion ?? '' }
            ], decisionesFiltradas)
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
          Crear decisión
        </button>
      </div>

      <EstadoVista
        cargando={cargando}
        error={error}
        vacio={decisionesFiltradas.length === 0}
        mensajeVacio="No hay decisiones registradas."
      >
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">Título</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Owner</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginacion.itemsPaginados.map((decision) => (
                <tr key={decision.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-3 py-2">
                    <p className="font-medium">{decision.titulo}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {decision.tags.length > 0 ? decision.tags.join(', ') : 'Sin tags'}
                    </p>
                  </td>
                  <td className="px-3 py-2">{decision.estado_codigo}</td>
                  <td className="px-3 py-2">{decision.fecha_decision}</td>
                  <td className="px-3 py-2">{decision.owner ?? 'Sin owner'}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => abrirModal('ver', decision)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        disabled={!esEdicionPermitida}
                        onClick={() => abrirModal('editar', decision)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={!esEdicionPermitida}
                        onClick={() => {
                          if (window.confirm('¿Eliminar esta decisión?')) {
                            void eliminarDecisionPm(decision.id).then(cargar).catch((errorInterno) => {
                              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar la decisión')
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
        titulo={`${modoModal === 'crear' ? 'Crear' : modoModal === 'editar' ? 'Editar' : 'Ver'} decisión`}
        alCerrar={() => setModalAbierto(false)}
      >
        <form
          className="space-y-4"
          onSubmit={formulario.handleSubmit(async (valores) => {
            if (modoModal === 'ver') {
              return
            }

            try {
              const entrada = construirEntradaDecision(valores)

              if (modoModal === 'crear') {
                await crearDecisionPm(entrada)
              }

              if (modoModal === 'editar' && decisionActiva) {
                await editarDecisionPm(decisionActiva.id, entrada)
              }

              setModalAbierto(false)
              await cargar()
            } catch (errorInterno) {
              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar la decisión')
            }
          })}
        >
          <div>
            <label className="text-sm font-medium">Título</label>
            <input
              {...formulario.register('titulo')}
              readOnly={modoModal === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Contexto</label>
            <textarea
              {...formulario.register('contexto')}
              readOnly={modoModal === 'ver'}
              className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Decisión</label>
            <textarea
              {...formulario.register('decision')}
              readOnly={modoModal === 'ver'}
              className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Alternativas</label>
              <textarea
                {...formulario.register('alternativas')}
                readOnly={modoModal === 'ver'}
                className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Impacto</label>
              <textarea
                {...formulario.register('impacto')}
                readOnly={modoModal === 'ver'}
                className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
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
            </div>
            <div>
              <label className="text-sm font-medium">Owner</label>
              <input
                {...formulario.register('owner')}
                readOnly={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Fecha</label>
              <input
                type="date"
                {...formulario.register('fecha_decision')}
                readOnly={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Iniciativa</label>
              <select
                {...formulario.register('iniciativa_id', { setValueAs: (valor) => valor || null })}
                disabled={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">Sin referencia</option>
                {iniciativas.map((iniciativa) => (
                  <option key={iniciativa.id} value={iniciativa.id}>
                    {iniciativa.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Entrega</label>
              <select
                {...formulario.register('entrega_id', { setValueAs: (valor) => valor || null })}
                disabled={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">Sin referencia</option>
                {entregas.map((entrega) => (
                  <option key={entrega.id} value={entrega.id}>
                    {entrega.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Ejecución validación</label>
              <select
                {...formulario.register('ejecucion_validacion_id', { setValueAs: (valor) => valor || null })}
                disabled={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">Sin referencia</option>
                {ejecuciones.map((ejecucion) => (
                  <option key={ejecucion.id} value={ejecucion.id}>
                    {ejecucion.fecha_ejecucion} · {ejecucion.estado_codigo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Links (separados por coma)</label>
            <input
              {...formulario.register('links_texto')}
              readOnly={modoModal === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Tags (separados por coma)</label>
            <input
              {...formulario.register('tags_texto')}
              readOnly={modoModal === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
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
