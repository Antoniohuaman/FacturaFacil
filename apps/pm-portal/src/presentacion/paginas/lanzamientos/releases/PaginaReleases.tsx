import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'react-router-dom'
import { releaseSchema, type ChecklistSalidaEntrada, type ReleaseEntrada } from '@/compartido/validacion/esquemas'
import type { DecisionPm, Entrega, Iniciativa, Objetivo, ReleaseChecklistItemPm, ReleasePm } from '@/dominio/modelos'
import {
  estadosReleasePm,
  formatearEstadoRelease,
  formatearTipoRelease,
  tiposReleasePm
} from '@/dominio/modelos'
import {
  ErrorValidacionReleaseRoadmap,
  crearRelease,
  editarRelease,
  eliminarRelease,
  listarChecklistSalida,
  listarReleases
} from '@/aplicacion/casos-uso/lanzamientos'
import {
  listarBloqueosPm,
  listarBugsPm,
  listarDeudaTecnicaPm,
  listarLeccionesAprendidasPm
} from '@/aplicacion/casos-uso/operacion'
import { listarObjetivos } from '@/aplicacion/casos-uso/objetivos'
import { listarDecisionesPm } from '@/aplicacion/casos-uso/decisiones'
import { listarEntregas } from '@/aplicacion/casos-uso/entregas'
import { listarIniciativas } from '@/aplicacion/casos-uso/iniciativas'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { PaginacionTabla } from '@/compartido/ui/PaginacionTabla'
import { exportarCsv } from '@/compartido/utilidades/csv'
import { formatearFechaCorta, normalizarFechaPortal } from '@/compartido/utilidades/formatoPortal'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'
import { usePaginacion } from '@/compartido/utilidades/usePaginacion'
import { NavegacionLanzamientos } from '@/presentacion/paginas/lanzamientos/NavegacionLanzamientos'
import { GestionChecklistSalida } from '@/presentacion/paginas/lanzamientos/releases/GestionChecklistSalida'

type ModoModal = 'crear' | 'editar' | 'ver'

function construirChecklistPorRelease(checklist: ReleaseChecklistItemPm[]) {
  return checklist.reduce((mapa, item) => {
    const actual = mapa.get(item.release_id) ?? []
    return mapa.set(item.release_id, [...actual, item])
  }, new Map<string, ReleaseChecklistItemPm[]>())
}

export function PaginaReleases() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paginaInicial = Number(searchParams.get('pagina') ?? '1')
  const tamanoInicial = Number(searchParams.get('tamano') ?? '10')
  const { rol } = useSesionPortalPM()
  const [objetivos, setObjetivos] = useState<Objetivo[]>([])
  const [releases, setReleases] = useState<ReleasePm[]>([])
  const [checklist, setChecklist] = useState<ReleaseChecklistItemPm[]>([])
  const [iniciativas, setIniciativas] = useState<Iniciativa[]>([])
  const [entregas, setEntregas] = useState<Entrega[]>([])
  const [decisiones, setDecisiones] = useState<DecisionPm[]>([])
  const [bugsPorRelease, setBugsPorRelease] = useState<Map<string, number>>(new Map())
  const [deudasPorRelease, setDeudasPorRelease] = useState<Map<string, number>>(new Map())
  const [bloqueosPorRelease, setBloqueosPorRelease] = useState<Map<string, number>>(new Map())
  const [leccionesPorRelease, setLeccionesPorRelease] = useState<Map<string, number>>(new Map())
  const [busqueda, setBusqueda] = useState(searchParams.get('q') ?? '')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | (typeof tiposReleasePm)[number]>(
    (searchParams.get('tipo_release') as 'todos' | (typeof tiposReleasePm)[number]) ?? 'todos'
  )
  const [filtroEstado, setFiltroEstado] = useState<'todos' | (typeof estadosReleasePm)[number]>(
    (searchParams.get('estado') as 'todos' | (typeof estadosReleasePm)[number]) ?? 'todos'
  )
  const [filtroOwner, setFiltroOwner] = useState(searchParams.get('owner') ?? '')
  const [filtroIniciativa, setFiltroIniciativa] = useState(searchParams.get('iniciativa') ?? 'todos')
  const [filtroEntrega, setFiltroEntrega] = useState(searchParams.get('entrega') ?? 'todos')
  const [filtroDecision, setFiltroDecision] = useState(searchParams.get('decision') ?? 'todos')
  const [fechaDesde, setFechaDesde] = useState(searchParams.get('desde') ?? '')
  const [fechaHasta, setFechaHasta] = useState(searchParams.get('hasta') ?? '')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [releaseActivo, setReleaseActivo] = useState<ReleasePm | null>(null)
  const [checklistEdicion, setChecklistEdicion] = useState<ChecklistSalidaEntrada[]>([])
  const [objetivoAuxiliarId, setObjetivoAuxiliarId] = useState('')

  const esEdicionPermitida = puedeEditar(rol)

  const formulario = useForm<ReleaseEntrada>({
    resolver: zodResolver(releaseSchema),
    defaultValues: {
      codigo: '',
      nombre: '',
      descripcion: '',
      tipo_release: 'mvp',
      estado: 'borrador',
      fecha_programada: new Date().toISOString().slice(0, 10),
      fecha_lanzamiento_real: null,
      iniciativa_id: null,
      entrega_id: null,
      owner: null,
      responsable_aprobacion: null,
      decision_id: null,
      rollback_preparado: false,
      rollback_descripcion: null,
      rollback_responsable: null,
      comunicacion_requerida: false,
      comunicacion_descripcion: null,
      audiencia_objetivo: null,
      notas: null
    }
  })

  const cargar = async () => {
    setCargando(true)
    setError(null)

    try {
      const [objetivosData, releasesData, checklistData, iniciativasData, entregasData, decisionesData, bugsData, deudasData, bloqueosData, leccionesData] = await Promise.all([
        listarObjetivos(),
        listarReleases(),
        listarChecklistSalida(),
        listarIniciativas(),
        listarEntregas(),
        listarDecisionesPm(),
        listarBugsPm(),
        listarDeudaTecnicaPm(),
        listarBloqueosPm(),
        listarLeccionesAprendidasPm()
      ])

      setObjetivos(objetivosData)
      setReleases(releasesData)
      setChecklist(checklistData)
      setIniciativas(iniciativasData)
      setEntregas(entregasData)
      setDecisiones(decisionesData)
      setBugsPorRelease(
        bugsData.reduce((mapa, bug) => {
          if (!bug.release_id) {
            return mapa
          }

          return mapa.set(bug.release_id, (mapa.get(bug.release_id) ?? 0) + 1)
        }, new Map<string, number>())
      )
      setDeudasPorRelease(
        deudasData.reduce((mapa, deuda) => {
          if (!deuda.release_id) {
            return mapa
          }

          return mapa.set(deuda.release_id, (mapa.get(deuda.release_id) ?? 0) + 1)
        }, new Map<string, number>())
      )
      setBloqueosPorRelease(
        bloqueosData.reduce((mapa, bloqueo) => {
          if (!bloqueo.release_id) {
            return mapa
          }

          return mapa.set(bloqueo.release_id, (mapa.get(bloqueo.release_id) ?? 0) + 1)
        }, new Map<string, number>())
      )
      setLeccionesPorRelease(
        leccionesData.reduce((mapa, leccion) => {
          if (!leccion.release_id) {
            return mapa
          }

          return mapa.set(leccion.release_id, (mapa.get(leccion.release_id) ?? 0) + 1)
        }, new Map<string, number>())
      )
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudieron cargar los releases')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const checklistPorRelease = useMemo(() => construirChecklistPorRelease(checklist), [checklist])

  const releasesFiltrados = useMemo(() => {
    const termino = busqueda.toLowerCase()
    const owner = filtroOwner.toLowerCase()

    return releases.filter((release) => {
      const coincideBusqueda =
        release.codigo.toLowerCase().includes(termino) ||
        release.nombre.toLowerCase().includes(termino) ||
        release.descripcion.toLowerCase().includes(termino)
      const coincideTipo = filtroTipo === 'todos' ? true : release.tipo_release === filtroTipo
      const coincideEstado = filtroEstado === 'todos' ? true : release.estado === filtroEstado
      const coincideOwner = owner ? (release.owner ?? '').toLowerCase().includes(owner) : true
      const coincideIniciativa = filtroIniciativa === 'todos' ? true : release.iniciativa_id === filtroIniciativa
      const coincideEntrega = filtroEntrega === 'todos' ? true : release.entrega_id === filtroEntrega
      const coincideDecision = filtroDecision === 'todos' ? true : release.decision_id === filtroDecision
      const coincideDesde = fechaDesde ? release.fecha_programada >= fechaDesde : true
      const coincideHasta = fechaHasta ? release.fecha_programada <= fechaHasta : true

      return (
        coincideBusqueda &&
        coincideTipo &&
        coincideEstado &&
        coincideOwner &&
        coincideIniciativa &&
        coincideEntrega &&
        coincideDecision &&
        coincideDesde &&
        coincideHasta
      )
    })
  }, [
    releases,
    busqueda,
    filtroTipo,
    filtroEstado,
    filtroOwner,
    filtroIniciativa,
    filtroEntrega,
    filtroDecision,
    fechaDesde,
    fechaHasta
  ])

  const paginacion = usePaginacion({
    items: releasesFiltrados,
    paginaInicial: Number.isFinite(paginaInicial) && paginaInicial > 0 ? paginaInicial : 1,
    tamanoInicial: [10, 25, 50].includes(tamanoInicial) ? tamanoInicial : 10
  })

  useEffect(() => {
    const parametros = new URLSearchParams()

    if (busqueda) {
      parametros.set('q', busqueda)
    }
    if (filtroTipo !== 'todos') {
      parametros.set('tipo_release', filtroTipo)
    }
    if (filtroEstado !== 'todos') {
      parametros.set('estado', filtroEstado)
    }
    if (filtroOwner) {
      parametros.set('owner', filtroOwner)
    }
    if (filtroIniciativa !== 'todos') {
      parametros.set('iniciativa', filtroIniciativa)
    }
    if (filtroEntrega !== 'todos') {
      parametros.set('entrega', filtroEntrega)
    }
    if (filtroDecision !== 'todos') {
      parametros.set('decision', filtroDecision)
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
    filtroTipo,
    filtroEstado,
    filtroOwner,
    filtroIniciativa,
    filtroEntrega,
    filtroDecision,
    fechaDesde,
    fechaHasta,
    paginacion.paginaActual,
    paginacion.tamanoPagina,
    setSearchParams
  ])

  const iniciativasPorId = useMemo(() => new Map(iniciativas.map((iniciativa) => [iniciativa.id, iniciativa])), [iniciativas])
  const entregasPorId = useMemo(() => new Map(entregas.map((entrega) => [entrega.id, entrega])), [entregas])
  const iniciativaPorId = useMemo(() => new Map(iniciativas.map((iniciativa) => [iniciativa.id, iniciativa.nombre])), [iniciativas])
  const entregaPorId = useMemo(() => new Map(entregas.map((entrega) => [entrega.id, entrega.nombre])), [entregas])
  const decisionPorId = useMemo(() => new Map(decisiones.map((decision) => [decision.id, decision.titulo])), [decisiones])

  const iniciativaSeleccionadaId = formulario.watch('iniciativa_id') ?? ''
  const entregaSeleccionadaId = formulario.watch('entrega_id') ?? ''
  const sinVinculoRoadmap = !iniciativaSeleccionadaId && !entregaSeleccionadaId

  const iniciativasDisponiblesFormulario = useMemo(() => {
    if (!objetivoAuxiliarId) {
      return iniciativas
    }

    return iniciativas.filter((iniciativa) => iniciativa.objetivo_id === objetivoAuxiliarId)
  }, [iniciativas, objetivoAuxiliarId])

  const entregasDisponiblesFormulario = useMemo(() => {
    if (iniciativaSeleccionadaId) {
      return entregas.filter((entrega) => entrega.iniciativa_id === iniciativaSeleccionadaId)
    }

    if (!objetivoAuxiliarId) {
      return entregas
    }

    const iniciativasCompatibles = new Set(iniciativasDisponiblesFormulario.map((iniciativa) => iniciativa.id))
    return entregas.filter((entrega) => (entrega.iniciativa_id ? iniciativasCompatibles.has(entrega.iniciativa_id) : false))
  }, [entregas, iniciativaSeleccionadaId, iniciativasDisponiblesFormulario, objetivoAuxiliarId])

  useEffect(() => {
    if (!iniciativaSeleccionadaId) {
      return
    }

    const sigueSiendoValida = iniciativasDisponiblesFormulario.some((iniciativa) => iniciativa.id === iniciativaSeleccionadaId)
    if (!sigueSiendoValida) {
      formulario.setValue('iniciativa_id', null, { shouldDirty: true, shouldValidate: true })
    }
  }, [formulario, iniciativaSeleccionadaId, iniciativasDisponiblesFormulario])

  useEffect(() => {
    if (!entregaSeleccionadaId) {
      formulario.clearErrors('entrega_id')
      return
    }

    const sigueSiendoValida = entregasDisponiblesFormulario.some((entrega) => entrega.id === entregaSeleccionadaId)
    if (!sigueSiendoValida) {
      formulario.setValue('entrega_id', null, { shouldDirty: true, shouldValidate: true })
      formulario.clearErrors('entrega_id')
      return
    }

    const entregaActual = entregasPorId.get(entregaSeleccionadaId)
    if (iniciativaSeleccionadaId && entregaActual && entregaActual.iniciativa_id !== iniciativaSeleccionadaId) {
      formulario.setError('entrega_id', {
        type: 'validate',
        message: 'La entrega seleccionada no pertenece a la iniciativa elegida.'
      })
      return
    }

    formulario.clearErrors('entrega_id')
  }, [entregaSeleccionadaId, entregasDisponiblesFormulario, entregasPorId, formulario, iniciativaSeleccionadaId])

  const abrirModal = (modo: ModoModal, release?: ReleasePm) => {
    setModoModal(modo)
    setReleaseActivo(release ?? null)
    setModalAbierto(true)
    setError(null)

    const iniciativaBase = release?.iniciativa_id ? iniciativasPorId.get(release.iniciativa_id) ?? null : null
    const entregaBase = release?.entrega_id ? entregasPorId.get(release.entrega_id) ?? null : null
    const iniciativaDerivada = entregaBase?.iniciativa_id ? iniciativasPorId.get(entregaBase.iniciativa_id) ?? null : null
    setObjetivoAuxiliarId(iniciativaBase?.objetivo_id ?? iniciativaDerivada?.objetivo_id ?? '')

    formulario.reset({
      codigo: release?.codigo ?? '',
      nombre: release?.nombre ?? '',
      descripcion: release?.descripcion ?? '',
      tipo_release: release?.tipo_release ?? 'mvp',
      estado: release?.estado ?? 'borrador',
      fecha_programada: release?.fecha_programada ?? new Date().toISOString().slice(0, 10),
      fecha_lanzamiento_real: release?.fecha_lanzamiento_real ?? null,
      iniciativa_id: release?.iniciativa_id ?? null,
      entrega_id: release?.entrega_id ?? null,
      owner: release?.owner ?? null,
      responsable_aprobacion: release?.responsable_aprobacion ?? null,
      decision_id: release?.decision_id ?? null,
      rollback_preparado: release?.rollback_preparado ?? false,
      rollback_descripcion: release?.rollback_descripcion ?? null,
      rollback_responsable: release?.rollback_responsable ?? null,
      comunicacion_requerida: release?.comunicacion_requerida ?? false,
      comunicacion_descripcion: release?.comunicacion_descripcion ?? null,
      audiencia_objetivo: release?.audiencia_objetivo ?? null,
      notas: release?.notas ?? null
    })
    setChecklistEdicion(
      (release ? checklistPorRelease.get(release.id) ?? [] : []).map((item) => ({
        id: item.id,
        release_id: item.release_id,
        tipo_item: item.tipo_item,
        descripcion: item.descripcion,
        obligatorio: item.obligatorio,
        completado: item.completado,
        evidencia: item.evidencia ?? '',
        orden: item.orden
      }))
    )
  }

  const rollbackPreparado = formulario.watch('rollback_preparado')
  const comunicacionRequerida = formulario.watch('comunicacion_requerida')

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Releases</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Gestiona releases con vínculos opcionales a iniciativa, entrega y decisión, incluyendo rollback, comunicación y checklist de salida.
          </p>
        </div>
        <NavegacionLanzamientos />
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3 dark:border-slate-800 dark:bg-slate-900">
        <input
          type="search"
          value={busqueda}
          onChange={(evento) => {
            setBusqueda(evento.target.value)
            paginacion.setPaginaActual(1)
          }}
          placeholder="Buscar release"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        />
        <select
          value={filtroTipo}
          onChange={(evento) => {
            setFiltroTipo(evento.target.value as 'todos' | (typeof tiposReleasePm)[number])
            paginacion.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todos">Tipo release: todos</option>
          {tiposReleasePm.map((tipo) => (
            <option key={tipo} value={tipo}>
              {formatearTipoRelease(tipo)}
            </option>
          ))}
        </select>
        <select
          value={filtroEstado}
          onChange={(evento) => {
            setFiltroEstado(evento.target.value as 'todos' | (typeof estadosReleasePm)[number])
            paginacion.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todos">Estado: todos</option>
          {estadosReleasePm.map((estado) => (
            <option key={estado} value={estado}>
              {formatearEstadoRelease(estado)}
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
        <select
          value={filtroIniciativa}
          onChange={(evento) => {
            setFiltroIniciativa(evento.target.value)
            paginacion.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todos">Iniciativa: todas</option>
          {iniciativas.map((iniciativa) => (
            <option key={iniciativa.id} value={iniciativa.id}>
              {iniciativa.nombre}
            </option>
          ))}
        </select>
        <select
          value={filtroEntrega}
          onChange={(evento) => {
            setFiltroEntrega(evento.target.value)
            paginacion.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todos">Entrega: todas</option>
          {entregas.map((entrega) => (
            <option key={entrega.id} value={entrega.id}>
              {entrega.nombre}
            </option>
          ))}
        </select>
        <select
          value={filtroDecision}
          onChange={(evento) => {
            setFiltroDecision(evento.target.value)
            paginacion.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todos">Decisión: todas</option>
          {decisiones.map((decision) => (
            <option key={decision.id} value={decision.id}>
              {decision.titulo}
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
            setFiltroTipo('todos')
            setFiltroEstado('todos')
            setFiltroOwner('')
            setFiltroIniciativa('todos')
            setFiltroEntrega('todos')
            setFiltroDecision('todos')
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
              'lanzamientos-releases.csv',
              [
                { encabezado: 'Código', valor: (release) => release.codigo },
                { encabezado: 'Nombre', valor: (release) => release.nombre },
                { encabezado: 'Descripción', valor: (release) => release.descripcion },
                { encabezado: 'Tipo release', valor: (release) => formatearTipoRelease(release.tipo_release) },
                { encabezado: 'Estado', valor: (release) => formatearEstadoRelease(release.estado) },
                { encabezado: 'Fecha programada', valor: (release) => normalizarFechaPortal(release.fecha_programada) },
                { encabezado: 'Fecha lanzamiento real', valor: (release) => normalizarFechaPortal(release.fecha_lanzamiento_real) },
                { encabezado: 'Iniciativa', valor: (release) => iniciativaPorId.get(release.iniciativa_id ?? '') ?? '' },
                { encabezado: 'Entrega', valor: (release) => entregaPorId.get(release.entrega_id ?? '') ?? '' },
                { encabezado: 'Decision', valor: (release) => decisionPorId.get(release.decision_id ?? '') ?? '' },
                { encabezado: 'Owner', valor: (release) => release.owner ?? '' },
                { encabezado: 'Responsable aprobación', valor: (release) => release.responsable_aprobacion ?? '' },
                { encabezado: 'Bugs operativos', valor: (release) => bugsPorRelease.get(release.id) ?? 0 },
                { encabezado: 'Deuda técnica vinculada', valor: (release) => deudasPorRelease.get(release.id) ?? 0 },
                { encabezado: 'Bloqueos vinculados', valor: (release) => bloqueosPorRelease.get(release.id) ?? 0 },
                { encabezado: 'Lecciones vinculadas', valor: (release) => leccionesPorRelease.get(release.id) ?? 0 },
                { encabezado: 'Rollback preparado', valor: (release) => release.rollback_preparado },
                { encabezado: 'Comunicación requerida', valor: (release) => release.comunicacion_requerida },
                {
                  encabezado: 'Checklist completo',
                  valor: (release) => (checklistPorRelease.get(release.id) ?? []).every((item) => item.completado)
                }
              ],
              releasesFiltrados
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
          Crear release
        </button>
      </div>

      <EstadoVista cargando={cargando} error={error} vacio={releasesFiltrados.length === 0} mensajeVacio="No hay releases para los filtros seleccionados.">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">Release</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Vínculos</th>
                <th className="px-3 py-2">Checklist de salida</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginacion.itemsPaginados.map((release) => {
                const checklistRelease = checklistPorRelease.get(release.id) ?? []
                const completados = checklistRelease.filter((item) => item.completado).length
                const incompletos = checklistRelease.filter((item) => !item.completado).length

                return (
                  <tr key={release.id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-3 py-2">
                      <p className="font-medium">{release.codigo} · {release.nombre}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatearTipoRelease(release.tipo_release)} · {formatearEstadoRelease(release.estado)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {release.owner ?? 'Sin owner'} · {release.responsable_aprobacion ?? 'Sin responsable aprobación'}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <p>{formatearFechaCorta(release.fecha_programada)}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Real: {formatearFechaCorta(release.fecha_lanzamiento_real) || 'Sin fecha'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {release.rollback_preparado ? 'Rollback preparado' : 'Sin rollback preparado'}
                        {release.comunicacion_requerida ? ' · Requiere comunicación' : ''}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <p>{iniciativaPorId.get(release.iniciativa_id ?? '') ?? 'Sin iniciativa'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{entregaPorId.get(release.entrega_id ?? '') ?? 'Sin entrega'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{decisionPorId.get(release.decision_id ?? '') ?? 'Sin decisión'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {bugsPorRelease.get(release.id) ?? 0} bugs · {deudasPorRelease.get(release.id) ?? 0} deudas · {bloqueosPorRelease.get(release.id) ?? 0} bloqueos · {leccionesPorRelease.get(release.id) ?? 0} lecciones
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <p>{completados}/{checklistRelease.length} completados</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {incompletos > 0 ? `${incompletos} pendientes` : 'Sin pendientes'}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => abrirModal('ver', release)} className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">Ver</button>
                        <button type="button" disabled={!esEdicionPermitida} onClick={() => abrirModal('editar', release)} className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700">Editar</button>
                        <button
                          type="button"
                          disabled={!esEdicionPermitida}
                          onClick={() => {
                            if (window.confirm('¿Eliminar este release?')) {
                              void eliminarRelease(release.id).then(cargar).catch((errorInterno) => {
                                setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar el release')
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
                )
              })}
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
        titulo={`${modoModal === 'crear' ? 'Crear' : modoModal === 'editar' ? 'Editar' : 'Ver'} release`}
        alCerrar={() => {
          setModalAbierto(false)
          setObjetivoAuxiliarId('')
          formulario.clearErrors('entrega_id')
        }}
      >
        <form
          noValidate
          className="space-y-4"
          onSubmit={formulario.handleSubmit(async (valores) => {
            if (modoModal === 'ver') {
              return
            }

            setError(null)

            const entregaSeleccionada = valores.entrega_id ? entregasPorId.get(valores.entrega_id) ?? null : null
            if (valores.iniciativa_id && entregaSeleccionada && entregaSeleccionada.iniciativa_id !== valores.iniciativa_id) {
              formulario.setError('entrega_id', {
                type: 'validate',
                message: 'La entrega seleccionada no pertenece a la iniciativa elegida.'
              })
              return
            }

            try {
              if (modoModal === 'crear') {
                await crearRelease(valores, checklistEdicion)
              }

              if (modoModal === 'editar' && releaseActivo) {
                await editarRelease(releaseActivo.id, valores, checklistEdicion)
              }

              setModalAbierto(false)
              setObjetivoAuxiliarId('')
              await cargar()
            } catch (errorInterno) {
              if (errorInterno instanceof ErrorValidacionReleaseRoadmap) {
                formulario.setError('entrega_id', {
                  type: 'validate',
                  message: errorInterno.message
                })
                return
              }

              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar el release')
            }
          })}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Código</label>
              <input {...formulario.register('codigo')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
            <div>
              <label className="text-sm font-medium">Nombre</label>
              <input {...formulario.register('nombre')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Descripción</label>
            <textarea {...formulario.register('descripcion')} readOnly={modoModal === 'ver'} className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium">Tipo release</label>
              <select {...formulario.register('tipo_release')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                {tiposReleasePm.map((tipo) => <option key={tipo} value={tipo}>{formatearTipoRelease(tipo)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Estado</label>
              <select {...formulario.register('estado')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                {estadosReleasePm.map((estado) => <option key={estado} value={estado}>{formatearEstadoRelease(estado)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Fecha programada</label>
              <input type="date" {...formulario.register('fecha_programada')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
            <div>
              <label className="text-sm font-medium">Fecha lanzamiento real</label>
              <input type="date" {...formulario.register('fecha_lanzamiento_real')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium">Objetivo</label>
              <select
                value={objetivoAuxiliarId}
                onChange={(evento) => setObjetivoAuxiliarId(evento.target.value)}
                disabled={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">Sin objetivo</option>
                {objetivos.map((objetivo) => (
                  <option key={objetivo.id} value={objetivo.id}>
                    {objetivo.nombre}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Auxiliar de seleccion. No se guarda en el release.</p>
            </div>
            <div>
              <label className="text-sm font-medium">Iniciativa</label>
              <select
                {...formulario.register('iniciativa_id')}
                disabled={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">Sin iniciativa</option>
                {iniciativasDisponiblesFormulario.map((iniciativa) => <option key={iniciativa.id} value={iniciativa.id}>{iniciativa.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Entrega</label>
              <select
                {...formulario.register('entrega_id')}
                disabled={modoModal === 'ver'}
                className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-slate-800 ${
                  formulario.formState.errors.entrega_id
                    ? 'border-red-300 dark:border-red-800'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              >
                <option value="">Sin entrega</option>
                {entregasDisponiblesFormulario.map((entrega) => <option key={entrega.id} value={entrega.id}>{entrega.nombre}</option>)}
              </select>
              {formulario.formState.errors.entrega_id?.message ? (
                <p className="mt-1 text-[11px] text-red-600 dark:text-red-300">{formulario.formState.errors.entrega_id.message}</p>
              ) : null}
            </div>
            <div>
              <label className="text-sm font-medium">Decisión</label>
              <select {...formulario.register('decision_id')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                <option value="">Sin decisión</option>
                {decisiones.map((decision) => <option key={decision.id} value={decision.id}>{decision.titulo}</option>)}
              </select>
            </div>
          </div>

          {sinVinculoRoadmap ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sin iniciativa ni entrega, este release no se mostrara en el cronograma.
            </p>
          ) : null}

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Owner</label>
              <input {...formulario.register('owner')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
            <div>
              <label className="text-sm font-medium">Responsable aprobación</label>
              <input {...formulario.register('responsable_aprobacion')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
            <div>
              <label className="text-sm font-medium">Audiencia objetivo</label>
              <input {...formulario.register('audiencia_objetivo')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-3 text-sm dark:border-slate-800">
              <input type="checkbox" {...formulario.register('rollback_preparado')} disabled={modoModal === 'ver'} />
              Rollback preparado
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-3 text-sm dark:border-slate-800">
              <input type="checkbox" {...formulario.register('comunicacion_requerida')} disabled={modoModal === 'ver'} />
              Comunicación requerida
            </label>
          </div>

          {rollbackPreparado || modoModal === 'ver' ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Rollback descripción</label>
                <textarea {...formulario.register('rollback_descripcion')} readOnly={modoModal === 'ver'} className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
              </div>
              <div>
                <label className="text-sm font-medium">Rollback responsable</label>
                <input {...formulario.register('rollback_responsable')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
              </div>
            </div>
          ) : null}

          {comunicacionRequerida || modoModal === 'ver' ? (
            <div>
              <label className="text-sm font-medium">Comunicación descripción</label>
              <textarea {...formulario.register('comunicacion_descripcion')} readOnly={modoModal === 'ver'} className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
          ) : null}

          <div>
            <label className="text-sm font-medium">Notas</label>
            <textarea {...formulario.register('notas')} readOnly={modoModal === 'ver'} className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>

          <GestionChecklistSalida checklist={checklistEdicion} soloLectura={modoModal === 'ver'} onChange={setChecklistEdicion} />

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