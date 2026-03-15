import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'react-router-dom'
import {
  auditoriaPmSchema,
  hallazgoAuditoriaSchema,
  validarCodigoCatalogoDinamico,
  type AuditoriaPmEntrada,
  type HallazgoAuditoriaEntrada
} from '@/compartido/validacion/esquemas'
import type {
  AuditoriaPm,
  CatalogoEstadoPm,
  CatalogoModuloPm,
  CatalogoSeveridadPm,
  CatalogoTipoAuditoriaPm,
  DecisionPm,
  EjecucionValidacion,
  HallazgoAuditoriaPm
} from '@/dominio/modelos'
import {
  crearAuditoriaPm,
  crearHallazgoAuditoriaPm,
  editarAuditoriaPm,
  editarHallazgoAuditoriaPm,
  eliminarAuditoriaPm,
  eliminarHallazgoAuditoriaPm,
  listarAuditoriasPm,
  listarHallazgosAuditoriaPm,
  listarTiposAuditoriaPm
} from '@/aplicacion/casos-uso/auditorias'
import { listarRiesgosPm } from '@/aplicacion/casos-uso/gobierno'
import { listarBugsPm, listarLeccionesAprendidasPm } from '@/aplicacion/casos-uso/operacion'
import { listarDecisionesPm } from '@/aplicacion/casos-uso/decisiones'
import { listarEjecucionesValidacion } from '@/aplicacion/casos-uso/ejecucionesValidacion'
import { listarModulosPm, listarSeveridadesPm, listarEstadosPm } from '@/aplicacion/casos-uso/ajustes'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'
import { usePaginacion } from '@/compartido/utilidades/usePaginacion'
import { PaginacionTabla } from '@/compartido/ui/PaginacionTabla'
import { exportarCsv } from '@/compartido/utilidades/csv'
import {
  formatearEstadoCatalogo,
  formatearEstadoLegible,
  formatearFechaCorta,
  normalizarFechaPortal
} from '@/compartido/utilidades/formatoPortal'

type ModoModal = 'crear' | 'ver' | 'editar'

export function PaginaAuditorias() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paginaAuditoriaInicial = Number(searchParams.get('paginaAuditoria') ?? '1')
  const tamanoAuditoriaInicial = Number(searchParams.get('tamanoAuditoria') ?? '10')
  const paginaHallazgoInicial = Number(searchParams.get('paginaHallazgo') ?? '1')
  const tamanoHallazgoInicial = Number(searchParams.get('tamanoHallazgo') ?? '10')
  const { rol } = useSesionPortalPM()
  const [tiposAuditoria, setTiposAuditoria] = useState<CatalogoTipoAuditoriaPm[]>([])
  const [estadosAuditoria, setEstadosAuditoria] = useState<CatalogoEstadoPm[]>([])
  const [estadosHallazgo, setEstadosHallazgo] = useState<CatalogoEstadoPm[]>([])
  const [severidades, setSeveridades] = useState<CatalogoSeveridadPm[]>([])
  const [modulos, setModulos] = useState<CatalogoModuloPm[]>([])
  const [decisiones, setDecisiones] = useState<DecisionPm[]>([])
  const [ejecuciones, setEjecuciones] = useState<EjecucionValidacion[]>([])
  const [auditorias, setAuditorias] = useState<AuditoriaPm[]>([])
  const [hallazgos, setHallazgos] = useState<HallazgoAuditoriaPm[]>([])
  const [bugsPorAuditoria, setBugsPorAuditoria] = useState<Map<string, number>>(new Map())
  const [leccionesPorAuditoria, setLeccionesPorAuditoria] = useState<Map<string, number>>(new Map())
  const [riesgosPorAuditoria, setRiesgosPorAuditoria] = useState<Map<string, number>>(new Map())
  const [bugsPorHallazgo, setBugsPorHallazgo] = useState<Map<string, number>>(new Map())
  const [busqueda, setBusqueda] = useState(searchParams.get('q') ?? '')
  const [filtroTipoAuditoria, setFiltroTipoAuditoria] = useState(searchParams.get('tipo') ?? 'todos')
  const [filtroEstadoAuditoria, setFiltroEstadoAuditoria] = useState(searchParams.get('estadoAuditoria') ?? 'todos')
  const [filtroEstadoHallazgo, setFiltroEstadoHallazgo] = useState(searchParams.get('estadoHallazgo') ?? 'todos')
  const [filtroSeveridad, setFiltroSeveridad] = useState(searchParams.get('severidad') ?? 'todos')
  const [filtroModulo, setFiltroModulo] = useState(searchParams.get('modulo') ?? 'todos')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalAuditoriaAbierto, setModalAuditoriaAbierto] = useState(false)
  const [modoAuditoria, setModoAuditoria] = useState<ModoModal>('crear')
  const [auditoriaActiva, setAuditoriaActiva] = useState<AuditoriaPm | null>(null)

  const [modalHallazgoAbierto, setModalHallazgoAbierto] = useState(false)
  const [modoHallazgo, setModoHallazgo] = useState<ModoModal>('crear')
  const [hallazgoActivo, setHallazgoActivo] = useState<HallazgoAuditoriaPm | null>(null)

  const esEdicionPermitida = puedeEditar(rol)

  const formularioAuditoria = useForm<AuditoriaPmEntrada>({
    resolver: zodResolver(auditoriaPmSchema),
    defaultValues: {
      tipo_auditoria_codigo: '',
      alcance: '',
      checklist: '',
      evidencias: '',
      responsable: null,
      estado_codigo: '',
      fecha_auditoria: new Date().toISOString().slice(0, 10)
    }
  })

  const formularioHallazgo = useForm<HallazgoAuditoriaEntrada>({
    resolver: zodResolver(hallazgoAuditoriaSchema),
    defaultValues: {
      auditoria_id: '',
      titulo: '',
      descripcion: '',
      severidad_codigo: '',
      estado_codigo: '',
      modulo_id: null,
      decision_id: null,
      ejecucion_validacion_id: null,
      evidencia_url: null
    }
  })

  const cargar = async () => {
    setCargando(true)
    setError(null)
    try {
      const [
        tiposAuditoriaData,
        estadosAuditoriaData,
        estadosHallazgoData,
        severidadesData,
        modulosData,
        decisionesData,
        ejecucionesData,
        auditoriasData,
        hallazgosData,
        bugsData,
        leccionesData,
        riesgosData
      ] = await Promise.all([
        listarTiposAuditoriaPm(),
        listarEstadosPm('auditoria'),
        listarEstadosPm('hallazgo'),
        listarSeveridadesPm(),
        listarModulosPm(),
        listarDecisionesPm(),
        listarEjecucionesValidacion(),
        listarAuditoriasPm(),
        listarHallazgosAuditoriaPm(),
        listarBugsPm(),
        listarLeccionesAprendidasPm(),
        listarRiesgosPm()
      ])

      setTiposAuditoria(tiposAuditoriaData)
      setEstadosAuditoria(estadosAuditoriaData)
      setEstadosHallazgo(estadosHallazgoData)
      setSeveridades(severidadesData)
      setModulos(modulosData)
      setDecisiones(decisionesData)
      setEjecuciones(ejecucionesData)
      setAuditorias(auditoriasData)
      setHallazgos(hallazgosData)
      setBugsPorAuditoria(
        bugsData.reduce((mapa, bug) => {
          if (!bug.auditoria_id) {
            return mapa
          }

          return mapa.set(bug.auditoria_id, (mapa.get(bug.auditoria_id) ?? 0) + 1)
        }, new Map<string, number>())
      )
      setLeccionesPorAuditoria(
        leccionesData.reduce((mapa, leccion) => {
          if (!leccion.auditoria_id) {
            return mapa
          }

          return mapa.set(leccion.auditoria_id, (mapa.get(leccion.auditoria_id) ?? 0) + 1)
        }, new Map<string, number>())
      )
      setRiesgosPorAuditoria(
        riesgosData.reduce((mapa, riesgo) => {
          if (!riesgo.auditoria_id) {
            return mapa
          }

          return mapa.set(riesgo.auditoria_id, (mapa.get(riesgo.auditoria_id) ?? 0) + 1)
        }, new Map<string, number>())
      )
      setBugsPorHallazgo(
        bugsData.reduce((mapa, bug) => {
          if (!bug.hallazgo_id) {
            return mapa
          }

          return mapa.set(bug.hallazgo_id, (mapa.get(bug.hallazgo_id) ?? 0) + 1)
        }, new Map<string, number>())
      )
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar auditorías')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const auditoriaPorId = useMemo(
    () => new Map(auditorias.map((auditoria) => [auditoria.id, auditoria.fecha_auditoria])),
    [auditorias]
  )

  const moduloPorId = useMemo(() => new Map(modulos.map((modulo) => [modulo.id, modulo.nombre])), [modulos])
  const estadoAuditoriaPorCodigo = useMemo(
    () => new Map(estadosAuditoria.map((estado) => [estado.codigo, estado.nombre])),
    [estadosAuditoria]
  )
  const estadoHallazgoPorCodigo = useMemo(
    () => new Map(estadosHallazgo.map((estado) => [estado.codigo, estado.nombre])),
    [estadosHallazgo]
  )

  const auditoriasFiltradas = useMemo(() => {
    const termino = busqueda.toLowerCase()
    return auditorias.filter((auditoria) => {
      const coincideBusqueda =
        auditoria.alcance.toLowerCase().includes(termino) ||
        auditoria.tipo_auditoria_codigo.toLowerCase().includes(termino) ||
        (estadoAuditoriaPorCodigo.get(auditoria.estado_codigo) ?? '').toLowerCase().includes(termino) ||
        auditoria.estado_codigo.toLowerCase().includes(termino)

      const coincideTipo = filtroTipoAuditoria === 'todos' ? true : auditoria.tipo_auditoria_codigo === filtroTipoAuditoria
      const coincideEstado =
        filtroEstadoAuditoria === 'todos' ? true : auditoria.estado_codigo === filtroEstadoAuditoria

      return coincideBusqueda && coincideTipo && coincideEstado
    })
  }, [auditorias, busqueda, estadoAuditoriaPorCodigo, filtroTipoAuditoria, filtroEstadoAuditoria])

  const hallazgosFiltrados = useMemo(() => {
    const termino = busqueda.toLowerCase()
    return hallazgos.filter((hallazgo) => {
      const coincideBusqueda =
        hallazgo.titulo.toLowerCase().includes(termino) ||
        hallazgo.descripcion.toLowerCase().includes(termino) ||
        (estadoHallazgoPorCodigo.get(hallazgo.estado_codigo) ?? '').toLowerCase().includes(termino) ||
        hallazgo.estado_codigo.toLowerCase().includes(termino)

      const coincideEstado = filtroEstadoHallazgo === 'todos' ? true : hallazgo.estado_codigo === filtroEstadoHallazgo
      const coincideSeveridad = filtroSeveridad === 'todos' ? true : hallazgo.severidad_codigo === filtroSeveridad
      const coincideModulo = filtroModulo === 'todos' ? true : hallazgo.modulo_id === filtroModulo

      return coincideBusqueda && coincideEstado && coincideSeveridad && coincideModulo
    })
  }, [hallazgos, busqueda, estadoHallazgoPorCodigo, filtroEstadoHallazgo, filtroSeveridad, filtroModulo])

  const paginacionAuditorias = usePaginacion({
    items: auditoriasFiltradas,
    paginaInicial: Number.isFinite(paginaAuditoriaInicial) && paginaAuditoriaInicial > 0 ? paginaAuditoriaInicial : 1,
    tamanoInicial: [10, 25, 50].includes(tamanoAuditoriaInicial) ? tamanoAuditoriaInicial : 10
  })

  const paginacionHallazgos = usePaginacion({
    items: hallazgosFiltrados,
    paginaInicial: Number.isFinite(paginaHallazgoInicial) && paginaHallazgoInicial > 0 ? paginaHallazgoInicial : 1,
    tamanoInicial: [10, 25, 50].includes(tamanoHallazgoInicial) ? tamanoHallazgoInicial : 10
  })

  useEffect(() => {
    const parametros = new URLSearchParams()

    if (busqueda) {
      parametros.set('q', busqueda)
    }
    if (filtroTipoAuditoria !== 'todos') {
      parametros.set('tipo', filtroTipoAuditoria)
    }
    if (filtroEstadoAuditoria !== 'todos') {
      parametros.set('estadoAuditoria', filtroEstadoAuditoria)
    }
    if (filtroEstadoHallazgo !== 'todos') {
      parametros.set('estadoHallazgo', filtroEstadoHallazgo)
    }
    if (filtroSeveridad !== 'todos') {
      parametros.set('severidad', filtroSeveridad)
    }
    if (filtroModulo !== 'todos') {
      parametros.set('modulo', filtroModulo)
    }
    if (paginacionAuditorias.paginaActual > 1) {
      parametros.set('paginaAuditoria', String(paginacionAuditorias.paginaActual))
    }
    if (paginacionAuditorias.tamanoPagina !== 10) {
      parametros.set('tamanoAuditoria', String(paginacionAuditorias.tamanoPagina))
    }
    if (paginacionHallazgos.paginaActual > 1) {
      parametros.set('paginaHallazgo', String(paginacionHallazgos.paginaActual))
    }
    if (paginacionHallazgos.tamanoPagina !== 10) {
      parametros.set('tamanoHallazgo', String(paginacionHallazgos.tamanoPagina))
    }

    setSearchParams(parametros, { replace: true })
  }, [
    busqueda,
    filtroTipoAuditoria,
    filtroEstadoAuditoria,
    filtroEstadoHallazgo,
    filtroSeveridad,
    filtroModulo,
    paginacionAuditorias.paginaActual,
    paginacionAuditorias.tamanoPagina,
    paginacionHallazgos.paginaActual,
    paginacionHallazgos.tamanoPagina,
    setSearchParams
  ])

  const abrirModalAuditoria = (modo: ModoModal, auditoria?: AuditoriaPm) => {
    setModoAuditoria(modo)
    setAuditoriaActiva(auditoria ?? null)
    setModalAuditoriaAbierto(true)
    formularioAuditoria.reset({
      tipo_auditoria_codigo: auditoria?.tipo_auditoria_codigo ?? tiposAuditoria[0]?.codigo ?? '',
      alcance: auditoria?.alcance ?? '',
      checklist: auditoria?.checklist ?? '',
      evidencias: auditoria?.evidencias ?? '',
      responsable: auditoria?.responsable ?? null,
      estado_codigo: auditoria?.estado_codigo ?? estadosAuditoria[0]?.codigo ?? '',
      fecha_auditoria: auditoria?.fecha_auditoria ?? new Date().toISOString().slice(0, 10)
    })
  }

  const abrirModalHallazgo = (modo: ModoModal, hallazgo?: HallazgoAuditoriaPm) => {
    setModoHallazgo(modo)
    setHallazgoActivo(hallazgo ?? null)
    setModalHallazgoAbierto(true)
    formularioHallazgo.reset({
      auditoria_id: hallazgo?.auditoria_id ?? auditorias[0]?.id ?? '',
      titulo: hallazgo?.titulo ?? '',
      descripcion: hallazgo?.descripcion ?? '',
      severidad_codigo: hallazgo?.severidad_codigo ?? severidades[0]?.codigo ?? '',
      estado_codigo: hallazgo?.estado_codigo ?? estadosHallazgo[0]?.codigo ?? '',
      modulo_id: hallazgo?.modulo_id ?? null,
      decision_id: hallazgo?.decision_id ?? null,
      ejecucion_validacion_id: hallazgo?.ejecucion_validacion_id ?? null,
      evidencia_url: hallazgo?.evidencia_url ?? null
    })
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Auditorías</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Registro de auditorías y hallazgos con severidad configurable y relaciones cruzadas.
        </p>
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3 dark:border-slate-800 dark:bg-slate-900">
        <input
          type="search"
          value={busqueda}
          onChange={(evento) => {
            setBusqueda(evento.target.value)
            paginacionAuditorias.setPaginaActual(1)
            paginacionHallazgos.setPaginaActual(1)
          }}
          placeholder="Buscar en auditorías y hallazgos"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        />
        <select
          value={filtroTipoAuditoria}
          onChange={(evento) => {
            setFiltroTipoAuditoria(evento.target.value)
            paginacionAuditorias.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todos">Tipo auditoría: todos</option>
          {tiposAuditoria.map((tipo) => (
            <option key={tipo.id} value={tipo.codigo}>
              {tipo.nombre}
            </option>
          ))}
        </select>
        <select
          value={filtroEstadoAuditoria}
          onChange={(evento) => {
            setFiltroEstadoAuditoria(evento.target.value)
            paginacionAuditorias.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todos">Estado auditoría: todos</option>
          {estadosAuditoria.map((estado) => (
            <option key={estado.id} value={estado.codigo}>
              {estado.nombre}
            </option>
          ))}
        </select>
        <select
          value={filtroEstadoHallazgo}
          onChange={(evento) => {
            setFiltroEstadoHallazgo(evento.target.value)
            paginacionHallazgos.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todos">Estado hallazgo: todos</option>
          {estadosHallazgo.map((estado) => (
            <option key={estado.id} value={estado.codigo}>
              {estado.nombre}
            </option>
          ))}
        </select>
        <select
          value={filtroSeveridad}
          onChange={(evento) => {
            setFiltroSeveridad(evento.target.value)
            paginacionHallazgos.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todos">Severidad: todas</option>
          {severidades.map((severidad) => (
            <option key={severidad.id} value={severidad.codigo}>
              {severidad.nombre}
            </option>
          ))}
        </select>
        <select
          value={filtroModulo}
          onChange={(evento) => {
            setFiltroModulo(evento.target.value)
            paginacionHallazgos.setPaginaActual(1)
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
        <button
          type="button"
          onClick={() => {
            setBusqueda('')
            setFiltroTipoAuditoria('todos')
            setFiltroEstadoAuditoria('todos')
            setFiltroEstadoHallazgo('todos')
            setFiltroSeveridad('todos')
            setFiltroModulo('todos')
            paginacionAuditorias.setPaginaActual(1)
            paginacionHallazgos.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700"
        >
          Limpiar filtros
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          disabled={!esEdicionPermitida}
          onClick={() => abrirModalAuditoria('crear')}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
        >
          Crear auditoría
        </button>
        <button
          type="button"
          disabled={!esEdicionPermitida}
          onClick={() => abrirModalHallazgo('crear')}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-slate-700"
        >
          Crear hallazgo
        </button>
        <button
          type="button"
          onClick={() => {
            exportarCsv('auditorias.csv', [
              { encabezado: 'Fecha', valor: (auditoria) => normalizarFechaPortal(auditoria.fecha_auditoria) },
              { encabezado: 'Tipo', valor: (auditoria) => auditoria.tipo_auditoria_codigo },
              { encabezado: 'Estado', valor: (auditoria) => formatearEstadoCatalogo(auditoria.estado_codigo, estadoAuditoriaPorCodigo) },
              { encabezado: 'Responsable', valor: (auditoria) => auditoria.responsable ?? 'Sin responsable' },
              { encabezado: 'Alcance', valor: (auditoria) => auditoria.alcance },
              { encabezado: 'Checklist', valor: (auditoria) => auditoria.checklist },
              { encabezado: 'Bugs vinculados', valor: (auditoria) => bugsPorAuditoria.get(auditoria.id) ?? 0 },
              { encabezado: 'Lecciones vinculadas', valor: (auditoria) => leccionesPorAuditoria.get(auditoria.id) ?? 0 },
              { encabezado: 'Riesgos vinculados', valor: (auditoria) => riesgosPorAuditoria.get(auditoria.id) ?? 0 }
            ], auditoriasFiltradas)
          }}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700"
        >
          Exportar CSV
        </button>
      </div>

      <EstadoVista
        cargando={cargando}
        error={error}
        vacio={auditoriasFiltradas.length === 0 && hallazgosFiltrados.length === 0}
        mensajeVacio="No hay auditorías ni hallazgos para los filtros seleccionados."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <header className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <h2 className="text-sm font-semibold">Auditorías</h2>
            </header>
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {paginacionAuditorias.itemsPaginados.map((auditoria) => (
                <li key={auditoria.id} className="space-y-2 px-4 py-3 text-sm">
                  <p className="font-medium">{formatearFechaCorta(auditoria.fecha_auditoria)} · {auditoria.tipo_auditoria_codigo}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Estado: {formatearEstadoCatalogo(auditoria.estado_codigo, estadoAuditoriaPorCodigo)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {bugsPorAuditoria.get(auditoria.id) ?? 0} bugs vinculados · {leccionesPorAuditoria.get(auditoria.id) ?? 0} lecciones aprendidas
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{riesgosPorAuditoria.get(auditoria.id) ?? 0} riesgos de Gobierno vinculados</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => abrirModalAuditoria('ver', auditoria)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
                    >
                      Ver
                    </button>
                    <button
                      type="button"
                      disabled={!esEdicionPermitida}
                      onClick={() => abrirModalAuditoria('editar', auditoria)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={!esEdicionPermitida}
                      onClick={() => {
                        if (window.confirm('¿Eliminar esta auditoría?')) {
                          void eliminarAuditoriaPm(auditoria.id).then(cargar).catch((errorInterno) => {
                            setError(
                              errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar la auditoría'
                            )
                          })
                        }
                      }}
                      className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50 dark:border-red-800 dark:text-red-300"
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <PaginacionTabla
              paginaActual={paginacionAuditorias.paginaActual}
              totalPaginas={paginacionAuditorias.totalPaginas}
              totalItems={paginacionAuditorias.totalItems}
              desde={paginacionAuditorias.desde}
              hasta={paginacionAuditorias.hasta}
              tamanoPagina={paginacionAuditorias.tamanoPagina}
              alCambiarPagina={paginacionAuditorias.setPaginaActual}
              alCambiarTamanoPagina={paginacionAuditorias.setTamanoPagina}
            />
          </article>

          <article className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <header className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <h2 className="text-sm font-semibold">Hallazgos</h2>
            </header>
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {paginacionHallazgos.itemsPaginados.map((hallazgo) => (
                <li key={hallazgo.id} className="space-y-2 px-4 py-3 text-sm">
                  <p className="font-medium">{hallazgo.titulo}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {hallazgo.severidad_codigo.toUpperCase()} · {formatearEstadoCatalogo(hallazgo.estado_codigo, estadoHallazgoPorCodigo)} · {moduloPorId.get(hallazgo.modulo_id ?? '') ?? 'Sin módulo'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Auditoría: {auditoriaPorId.get(hallazgo.auditoria_id) ?? 'No disponible'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {bugsPorHallazgo.get(hallazgo.id) ?? 0} bugs operativos vinculados
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => abrirModalHallazgo('ver', hallazgo)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
                    >
                      Ver
                    </button>
                    <button
                      type="button"
                      disabled={!esEdicionPermitida}
                      onClick={() => abrirModalHallazgo('editar', hallazgo)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={!esEdicionPermitida}
                      onClick={() => {
                        if (window.confirm('¿Eliminar este hallazgo?')) {
                          void eliminarHallazgoAuditoriaPm(hallazgo.id).then(cargar).catch((errorInterno) => {
                            setError(
                              errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar el hallazgo'
                            )
                          })
                        }
                      }}
                      className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50 dark:border-red-800 dark:text-red-300"
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <PaginacionTabla
              paginaActual={paginacionHallazgos.paginaActual}
              totalPaginas={paginacionHallazgos.totalPaginas}
              totalItems={paginacionHallazgos.totalItems}
              desde={paginacionHallazgos.desde}
              hasta={paginacionHallazgos.hasta}
              tamanoPagina={paginacionHallazgos.tamanoPagina}
              alCambiarPagina={paginacionHallazgos.setPaginaActual}
              alCambiarTamanoPagina={paginacionHallazgos.setTamanoPagina}
            />
          </article>
        </div>
      </EstadoVista>

      <ModalPortal
        abierto={modalAuditoriaAbierto}
        titulo={`${modoAuditoria === 'crear' ? 'Crear' : modoAuditoria === 'editar' ? 'Editar' : 'Ver'} auditoría`}
        alCerrar={() => setModalAuditoriaAbierto(false)}
      >
        <form
          className="space-y-4"
          onSubmit={formularioAuditoria.handleSubmit(async (valores) => {
            if (modoAuditoria === 'ver') {
              return
            }

            try {
              const errorEstado = validarCodigoCatalogoDinamico(valores.estado_codigo, estadosAuditoria)

              if (errorEstado) {
                formularioAuditoria.setError('estado_codigo', { type: 'validate', message: errorEstado })
                return
              }

              formularioAuditoria.clearErrors('estado_codigo')

              if (modoAuditoria === 'crear') {
                await crearAuditoriaPm(valores)
              }

              if (modoAuditoria === 'editar' && auditoriaActiva) {
                await editarAuditoriaPm(auditoriaActiva.id, valores)
              }

              setModalAuditoriaAbierto(false)
              await cargar()
            } catch (errorInterno) {
              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar la auditoría')
            }
          })}
        >
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <select
                {...formularioAuditoria.register('tipo_auditoria_codigo')}
                disabled={modoAuditoria === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {tiposAuditoria.map((tipo) => (
                  <option key={tipo.id} value={tipo.codigo}>
                    {tipo.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Estado</label>
              <select
                {...formularioAuditoria.register('estado_codigo')}
                disabled={modoAuditoria === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {estadosAuditoria.map((estado) => (
                  <option key={estado.id} value={estado.codigo}>
                    {estado.nombre}
                  </option>
                ))}
              </select>
              <p className={`mt-1 text-xs ${formularioAuditoria.formState.errors.estado_codigo ? 'text-red-600 dark:text-red-300' : 'text-slate-500 dark:text-slate-400'}`}>
                {formularioAuditoria.formState.errors.estado_codigo?.message ?? 'La auditoría usa un estado del catálogo activo configurado en Ajustes.'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Fecha</label>
              <input
                type="date"
                {...formularioAuditoria.register('fecha_auditoria')}
                readOnly={modoAuditoria === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Alcance</label>
            <textarea
              {...formularioAuditoria.register('alcance')}
              readOnly={modoAuditoria === 'ver'}
              className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Checklist</label>
            <textarea
              {...formularioAuditoria.register('checklist')}
              readOnly={modoAuditoria === 'ver'}
              className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Evidencias</label>
            <textarea
              {...formularioAuditoria.register('evidencias')}
              readOnly={modoAuditoria === 'ver'}
              className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Responsable</label>
            <input
              {...formularioAuditoria.register('responsable')}
              readOnly={modoAuditoria === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          {modoAuditoria !== 'ver' ? (
            <button
              type="submit"
              disabled={formularioAuditoria.formState.isSubmitting}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-70 dark:bg-slate-200 dark:text-slate-900"
            >
              {formularioAuditoria.formState.isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          ) : null}
        </form>
      </ModalPortal>

      <ModalPortal
        abierto={modalHallazgoAbierto}
        titulo={`${modoHallazgo === 'crear' ? 'Crear' : modoHallazgo === 'editar' ? 'Editar' : 'Ver'} hallazgo`}
        alCerrar={() => setModalHallazgoAbierto(false)}
      >
        <form
          className="space-y-4"
          onSubmit={formularioHallazgo.handleSubmit(async (valores) => {
            if (modoHallazgo === 'ver') {
              return
            }

            try {
              const errorEstado = validarCodigoCatalogoDinamico(valores.estado_codigo, estadosHallazgo)

              if (errorEstado) {
                formularioHallazgo.setError('estado_codigo', { type: 'validate', message: errorEstado })
                return
              }

              formularioHallazgo.clearErrors('estado_codigo')

              if (modoHallazgo === 'crear') {
                await crearHallazgoAuditoriaPm(valores)
              }

              if (modoHallazgo === 'editar' && hallazgoActivo) {
                await editarHallazgoAuditoriaPm(hallazgoActivo.id, valores)
              }

              setModalHallazgoAbierto(false)
              await cargar()
            } catch (errorInterno) {
              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar el hallazgo')
            }
          })}
        >
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Auditoría</label>
              <select
                {...formularioHallazgo.register('auditoria_id')}
                disabled={modoHallazgo === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {auditorias.map((auditoria) => (
                  <option key={auditoria.id} value={auditoria.id}>
                    {formatearFechaCorta(auditoria.fecha_auditoria)} · {auditoria.tipo_auditoria_codigo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Severidad</label>
              <select
                {...formularioHallazgo.register('severidad_codigo')}
                disabled={modoHallazgo === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {severidades.map((severidad) => (
                  <option key={severidad.id} value={severidad.codigo}>
                    {severidad.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Estado</label>
              <select
                {...formularioHallazgo.register('estado_codigo')}
                disabled={modoHallazgo === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {estadosHallazgo.map((estado) => (
                  <option key={estado.id} value={estado.codigo}>
                    {estado.nombre}
                  </option>
                ))}
              </select>
              <p className={`mt-1 text-xs ${formularioHallazgo.formState.errors.estado_codigo ? 'text-red-600 dark:text-red-300' : 'text-slate-500 dark:text-slate-400'}`}>
                {formularioHallazgo.formState.errors.estado_codigo?.message ?? 'El hallazgo debe usar un estado vigente del catálogo activo.'}
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Título</label>
            <input
              {...formularioHallazgo.register('titulo')}
              readOnly={modoHallazgo === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Descripción</label>
            <textarea
              {...formularioHallazgo.register('descripcion')}
              readOnly={modoHallazgo === 'ver'}
              className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Módulo</label>
              <select
                {...formularioHallazgo.register('modulo_id')}
                disabled={modoHallazgo === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">Sin módulo</option>
                {modulos.map((modulo) => (
                  <option key={modulo.id} value={modulo.id}>
                    {modulo.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Decisión</label>
              <select
                {...formularioHallazgo.register('decision_id')}
                disabled={modoHallazgo === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">Sin decisión</option>
                {decisiones.map((decision) => (
                  <option key={decision.id} value={decision.id}>
                    {decision.titulo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Ejecución</label>
              <select
                {...formularioHallazgo.register('ejecucion_validacion_id')}
                disabled={modoHallazgo === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">Sin ejecución de validación</option>
                {ejecuciones.map((ejecucion) => (
                  <option key={ejecucion.id} value={ejecucion.id}>
                    {formatearFechaCorta(ejecucion.fecha_ejecucion)} · {formatearEstadoLegible(ejecucion.estado_codigo)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Evidencia URL</label>
            <input
              {...formularioHallazgo.register('evidencia_url')}
              readOnly={modoHallazgo === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          {modoHallazgo !== 'ver' ? (
            <button
              type="submit"
              disabled={formularioHallazgo.formState.isSubmitting}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-70 dark:bg-slate-200 dark:text-slate-900"
            >
              {formularioHallazgo.formState.isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          ) : null}
        </form>
      </ModalPortal>
    </section>
  )
}
