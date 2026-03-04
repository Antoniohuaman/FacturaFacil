import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { listarObjetivos } from '@/aplicacion/casos-uso/objetivos'
import { listarIniciativas } from '@/aplicacion/casos-uso/iniciativas'
import { listarEntregas } from '@/aplicacion/casos-uso/entregas'
import { listarEtapasPm, listarVentanasPm } from '@/aplicacion/casos-uso/ajustes'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import {
  estadosRegistro,
  type CatalogoEtapaPm,
  type CatalogoVentanaPm,
  type Entrega,
  type Iniciativa,
  type Objetivo
} from '@/dominio/modelos'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'

const patronUuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normalizarFiltroDesdeQuery(valor: string | null) {
  if (!valor) {
    return 'todas'
  }

  if (valor === 'todas' || valor === 'sin_asignar' || patronUuid.test(valor)) {
    return valor
  }

  return 'todas'
}

export function PaginaRoadmap() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { rol } = useSesionPortalPM()

  const [objetivos, setObjetivos] = useState<Objetivo[]>([])
  const [iniciativas, setIniciativas] = useState<Iniciativa[]>([])
  const [entregas, setEntregas] = useState<Entrega[]>([])
  const [ventanas, setVentanas] = useState<CatalogoVentanaPm[]>([])
  const [etapas, setEtapas] = useState<CatalogoEtapaPm[]>([])
  const [filtroVentanaGlobal, setFiltroVentanaGlobal] = useState(() =>
    normalizarFiltroDesdeQuery(searchParams.get('ventana'))
  )
  const [filtroEtapaGlobal, setFiltroEtapaGlobal] = useState(() =>
    normalizarFiltroDesdeQuery(searchParams.get('etapa'))
  )
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [menuCrearAbierto, setMenuCrearAbierto] = useState(false)

  const esEdicionPermitida = puedeEditar(rol)

  const cargarRoadmap = async () => {
    setCargando(true)
    setError(null)

    try {
      const [objetivosData, iniciativasData, entregasData] = await Promise.all([
        listarObjetivos(),
        listarIniciativas(),
        listarEntregas()
      ])

      setObjetivos(objetivosData)
      setIniciativas(iniciativasData)
      setEntregas(entregasData)

      const [ventanasResultado, etapasResultado] = await Promise.allSettled([
        listarVentanasPm(),
        listarEtapasPm()
      ])

      setVentanas(ventanasResultado.status === 'fulfilled' ? ventanasResultado.value : [])
      setEtapas(etapasResultado.status === 'fulfilled' ? etapasResultado.value : [])
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar roadmap')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargarRoadmap()
  }, [])

  useEffect(() => {
    const parametros = new URLSearchParams(searchParams)

    if (filtroVentanaGlobal === 'todas') {
      parametros.delete('ventana')
    } else {
      parametros.set('ventana', filtroVentanaGlobal)
    }

    if (filtroEtapaGlobal === 'todas') {
      parametros.delete('etapa')
    } else {
      parametros.set('etapa', filtroEtapaGlobal)
    }

    const actual = searchParams.toString()
    const siguiente = parametros.toString()

    if (actual !== siguiente) {
      setSearchParams(parametros, { replace: true })
    }
  }, [filtroVentanaGlobal, filtroEtapaGlobal, searchParams, setSearchParams])

  const objetivoPorId = useMemo(() => {
    return new Map(objetivos.map((objetivo) => [objetivo.id, objetivo.nombre]))
  }, [objetivos])

  const iniciativaPorId = useMemo(() => {
    return new Map(iniciativas.map((iniciativa) => [iniciativa.id, iniciativa]))
  }, [iniciativas])

  const ventanaPorId = useMemo(() => {
    return new Map(ventanas.map((ventana) => [ventana.id, ventana]))
  }, [ventanas])

  const iniciativasFiltradas = useMemo(() => {
    return iniciativas.filter((iniciativa) => {
      const coincideVentana =
        filtroVentanaGlobal === 'todas'
          ? true
          : filtroVentanaGlobal === 'sin_asignar'
            ? !iniciativa.ventana_planificada_id
            : iniciativa.ventana_planificada_id === filtroVentanaGlobal
      const coincideEtapa =
        filtroEtapaGlobal === 'todas'
          ? true
          : filtroEtapaGlobal === 'sin_asignar'
            ? !iniciativa.etapa_id
            : iniciativa.etapa_id === filtroEtapaGlobal

      return coincideVentana && coincideEtapa
    })
  }, [iniciativas, filtroVentanaGlobal, filtroEtapaGlobal])

  const entregasFiltradas = useMemo(() => {
    return entregas.filter((entrega) => {
      const iniciativaAsociada = entrega.iniciativa_id ? iniciativaPorId.get(entrega.iniciativa_id) : undefined
      const coincideFiltroEtapa =
        filtroEtapaGlobal === 'todas'
          ? true
          : filtroEtapaGlobal === 'sin_asignar'
            ? !iniciativaAsociada?.etapa_id
            : iniciativaAsociada?.etapa_id === filtroEtapaGlobal

      const coincideFiltroVentana =
        filtroVentanaGlobal === 'todas'
          ? true
          : filtroVentanaGlobal === 'sin_asignar'
            ? !entrega.ventana_planificada_id && !entrega.ventana_real_id
            : entrega.ventana_planificada_id === filtroVentanaGlobal || entrega.ventana_real_id === filtroVentanaGlobal

      return coincideFiltroEtapa && coincideFiltroVentana
    })
  }, [entregas, filtroEtapaGlobal, filtroVentanaGlobal, iniciativaPorId])

  const objetivosFiltrados = useMemo(() => {
    const idsObjetivos = new Set(iniciativasFiltradas.map((iniciativa) => iniciativa.objetivo_id).filter(Boolean))
    return objetivos.filter((objetivo) => idsObjetivos.has(objetivo.id))
  }, [objetivos, iniciativasFiltradas])

  const topIniciativasRice = useMemo(() => {
    return [...iniciativasFiltradas]
      .sort((iniciativaA, iniciativaB) => {
        if (iniciativaA.estado === 'completado' && iniciativaB.estado !== 'completado') {
          return 1
        }
        if (iniciativaA.estado !== 'completado' && iniciativaB.estado === 'completado') {
          return -1
        }

        return iniciativaB.rice - iniciativaA.rice
      })
      .slice(0, 5)
  }, [iniciativasFiltradas])

  const formateadorFecha = useMemo(
    () =>
      new Intl.DateTimeFormat('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }),
    []
  )

  const formatearFechaHumana = (fecha?: string | null) => {
    if (!fecha) {
      return 'Sin fecha'
    }

    const fechaDate = new Date(`${fecha}T00:00:00`)
    if (Number.isNaN(fechaDate.getTime())) {
      return fecha
    }

    return formateadorFecha.format(fechaDate)
  }

  const proximasEntregas = useMemo(() => {
    return entregasFiltradas
      .filter((entrega) => Boolean(entrega.fecha_objetivo))
      .sort((entregaA, entregaB) => {
        return new Date(entregaA.fecha_objetivo ?? '').getTime() - new Date(entregaB.fecha_objetivo ?? '').getTime()
      })
      .slice(0, 5)
  }, [entregasFiltradas])

  const totalPorEstado = useMemo(() => {
    const registros = [...objetivosFiltrados, ...iniciativasFiltradas, ...entregasFiltradas]

    return estadosRegistro.map((estado) => ({
      estado,
      total: registros.filter((registro) => registro.estado === estado).length
    }))
  }, [objetivosFiltrados, iniciativasFiltradas, entregasFiltradas])

  const totalesPorEstado = useMemo(() => {
    return {
      pendiente: totalPorEstado.find((registro) => registro.estado === 'pendiente')?.total ?? 0,
      en_progreso: totalPorEstado.find((registro) => registro.estado === 'en_progreso')?.total ?? 0,
      completado: totalPorEstado.find((registro) => registro.estado === 'completado')?.total ?? 0
    }
  }, [totalPorEstado])

  const totalesGlobales = useMemo(() => {
    const total = objetivosFiltrados.length + iniciativasFiltradas.length + entregasFiltradas.length
    const completado = totalesPorEstado.completado

    return {
      total,
      completado,
      porcentajeCompletado: total === 0 ? 0 : Math.round((completado / total) * 100)
    }
  }, [objetivosFiltrados.length, iniciativasFiltradas.length, entregasFiltradas.length, totalesPorEstado.completado])

  const progresoPorObjetivo = useMemo(() => {
    const ahora = new Date().getTime()
    const estadoOrden: Record<'pendiente' | 'en_progreso' | 'completado', number> = {
      en_progreso: 0,
      pendiente: 1,
      completado: 2
    }

    const lista = objetivosFiltrados.map((objetivo) => {
      const iniciativasObjetivo = iniciativasFiltradas.filter((iniciativa) => iniciativa.objetivo_id === objetivo.id)
      const idsIniciativas = new Set(iniciativasObjetivo.map((iniciativa) => iniciativa.id))
      const entregasObjetivo = entregasFiltradas.filter((entrega) => idsIniciativas.has(entrega.iniciativa_id ?? ''))

      const totalRelacionadas = iniciativasObjetivo.length + entregasObjetivo.length
      const completadas =
        iniciativasObjetivo.filter((iniciativa) => iniciativa.estado === 'completado').length +
        entregasObjetivo.filter((entrega) => entrega.estado === 'completado').length
      const pendientes =
        iniciativasObjetivo.filter((iniciativa) => iniciativa.estado === 'pendiente').length +
        entregasObjetivo.filter((entrega) => entrega.estado === 'pendiente').length
      const enProgreso =
        iniciativasObjetivo.filter((iniciativa) => iniciativa.estado === 'en_progreso').length +
        entregasObjetivo.filter((entrega) => entrega.estado === 'en_progreso').length
      const proximas = entregasObjetivo.filter((entrega) => {
        if (!entrega.fecha_objetivo) {
          return false
        }

        const fecha = new Date(`${entrega.fecha_objetivo}T00:00:00`).getTime()
        if (Number.isNaN(fecha)) {
          return false
        }

        return fecha >= ahora
      }).length

      const puntajeActividad = enProgreso * 3 + pendientes * 2 + proximas

      return {
        id: objetivo.id,
        nombre: objetivo.nombre,
        estado: objetivo.estado,
        totalRelacionadas,
        completadas,
        porcentaje: totalRelacionadas === 0 ? null : Math.round((completadas / totalRelacionadas) * 100),
        pendientes,
        enProgreso,
        proximas,
        puntajeActividad
      }
    })

    return lista.sort((objetivoA, objetivoB) => {
      const ordenEstado = estadoOrden[objetivoA.estado] - estadoOrden[objetivoB.estado]
      if (ordenEstado !== 0) {
        return ordenEstado
      }

      return objetivoB.puntajeActividad - objetivoA.puntajeActividad
    })
  }, [objetivosFiltrados, iniciativasFiltradas, entregasFiltradas])

  const objetivoMasActivoId = useMemo(() => {
    if (progresoPorObjetivo.length === 0) {
      return null
    }

    return [...progresoPorObjetivo]
      .sort((objetivoA, objetivoB) => objetivoB.puntajeActividad - objetivoA.puntajeActividad)[0]?.id ?? null
  }, [progresoPorObjetivo])

  const hayDatosRoadmap =
    objetivosFiltrados.length > 0 || iniciativasFiltradas.length > 0 || entregasFiltradas.length > 0

  const planVsReal = useMemo(() => {
    const entregasConPlan = entregasFiltradas.filter((entrega) => Boolean(entrega.ventana_planificada_id)).length
    const entregasConReal = entregasFiltradas.filter((entrega) => Boolean(entrega.ventana_real_id)).length

    const obtenerPosicion = (id: string | null) => {
      if (!id) {
        return null
      }

      const ventana = ventanaPorId.get(id)
      if (!ventana) {
        return null
      }

      if (ventana.anio === null || ventana.anio === undefined) {
        return null
      }

      if (ventana.orden === null || ventana.orden === undefined) {
        return null
      }

      if (!Number.isFinite(ventana.anio) || !Number.isFinite(ventana.orden)) {
        return null
      }

      return ventana.anio * 10000 + ventana.orden
    }

    let atrasado = 0
    let adelantado = 0
    let enLinea = 0

    entregasFiltradas.forEach((entrega) => {
      const plan = obtenerPosicion(entrega.ventana_planificada_id)
      const real = obtenerPosicion(entrega.ventana_real_id)

      if (plan === null || real === null) {
        return
      }

      if (real > plan) {
        atrasado += 1
        return
      }

      if (real < plan) {
        adelantado += 1
        return
      }

      enLinea += 1
    })

    return {
      entregasConPlan,
      entregasConReal,
      atrasado,
      adelantado,
      enLinea
    }
  }, [entregasFiltradas, ventanaPorId])

  const clasesBadgeEstado = (estado: string) => {
    if (estado === 'completado') {
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
    }
    if (estado === 'en_progreso') {
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
    }
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
  }

  const navegarACrear = (ruta: string) => {
    setMenuCrearAbierto(false)
    navigate(ruta)
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Roadmap</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Panorama general de objetivos, iniciativas y entregas planificadas.
        </p>
      </header>

      <div className="relative flex justify-end">
        <button
          type="button"
          aria-label="Abrir opciones de creación del roadmap"
          aria-expanded={menuCrearAbierto}
          disabled={!esEdicionPermitida}
          onClick={() => setMenuCrearAbierto((abierto) => !abierto)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
        >
          Crear
        </button>

        {menuCrearAbierto ? (
          <div className="absolute top-12 z-10 w-52 rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => navegarACrear('/roadmap/objetivos')}
              className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Crear objetivo
            </button>
            <button
              type="button"
              onClick={() => navegarACrear('/roadmap/iniciativas')}
              className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Crear iniciativa
            </button>
            <button
              type="button"
              onClick={() => navegarACrear('/roadmap/entregas')}
              className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Crear entrega
            </button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <select
          value={filtroVentanaGlobal}
          onChange={(evento) => setFiltroVentanaGlobal(evento.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
          aria-label="Filtrar dashboard por ventana"
        >
          <option value="todas">Ventana: todas</option>
          <option value="sin_asignar">Ventana: sin asignar</option>
          {ventanas.map((ventana) => (
            <option key={ventana.id} value={ventana.id}>
              {ventana.etiqueta_visible}
            </option>
          ))}
        </select>
        <select
          value={filtroEtapaGlobal}
          onChange={(evento) => setFiltroEtapaGlobal(evento.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
          aria-label="Filtrar dashboard por etapa"
        >
          <option value="todas">Etapa: todas</option>
          <option value="sin_asignar">Etapa: sin asignar</option>
          {etapas.map((etapa) => (
            <option key={etapa.id} value={etapa.id}>
              {etapa.etiqueta_visible}
            </option>
          ))}
        </select>
      </div>

      <EstadoVista cargando={cargando} error={null} vacio={false} mensajeVacio="">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void cargarRoadmap()}
              className="mt-3 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium dark:border-red-700"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <section className="grid gap-3 lg:grid-cols-4">
              <article className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/60">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Objetivos</p>
                <p className="mt-2 text-3xl font-semibold leading-none">{objetivosFiltrados.length}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/60">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Iniciativas</p>
                <p className="mt-2 text-3xl font-semibold leading-none">{iniciativasFiltradas.length}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/60">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Entregas</p>
                <p className="mt-2 text-3xl font-semibold leading-none">{entregasFiltradas.length}</p>
              </article>
              <article className="rounded-xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-white p-4 shadow-sm dark:border-emerald-900/50 dark:from-emerald-950/40 dark:to-slate-900/60">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">% completado</p>
                <p className="mt-2 text-3xl font-semibold leading-none">{totalesGlobales.porcentajeCompletado}%</p>
              </article>

              <article className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                <p className="text-xs text-amber-700 dark:text-amber-300">Pendientes</p>
                <p className="mt-1 text-xl font-semibold text-amber-800 dark:text-amber-200">{totalesPorEstado.pendiente}</p>
              </article>
              <article className="rounded-lg border border-blue-200 bg-blue-50/70 p-3 dark:border-blue-900/40 dark:bg-blue-950/20">
                <p className="text-xs text-blue-700 dark:text-blue-300">En progreso</p>
                <p className="mt-1 text-xl font-semibold text-blue-800 dark:text-blue-200">{totalesPorEstado.en_progreso}</p>
              </article>
              <article className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <p className="text-xs text-emerald-700 dark:text-emerald-300">Completados</p>
                <p className="mt-1 text-xl font-semibold text-emerald-800 dark:text-emerald-200">{totalesPorEstado.completado}</p>
              </article>
              <article className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                <p className="text-xs text-slate-600 dark:text-slate-400">Registros totales</p>
                <p className="mt-1 text-xl font-semibold">{totalesGlobales.total}</p>
              </article>

              <article className="rounded-lg border border-indigo-200 bg-indigo-50/70 p-3 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                <p className="text-xs text-indigo-700 dark:text-indigo-300">Plan vs Real</p>
                <p className="mt-1 text-sm text-indigo-800 dark:text-indigo-200">
                  Planificadas: {planVsReal.entregasConPlan} · Reales: {planVsReal.entregasConReal}
                </p>
                <p className="text-xs text-indigo-700 dark:text-indigo-300">
                  En línea: {planVsReal.enLinea} · Adelantado: {planVsReal.adelantado} · Atrasado: {planVsReal.atrasado}
                </p>
              </article>
            </section>

            <div className="grid gap-4 lg:grid-cols-3">
              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
                <h2 className="text-sm font-semibold">Progreso por objetivo</h2>

                {!hayDatosRoadmap || objetivos.length === 0 ? (
                  <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    <p>No hay objetivos registrados para mostrar progreso.</p>
                    {esEdicionPermitida ? (
                      <button
                        type="button"
                        onClick={() => navegarACrear('/roadmap/objetivos')}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700"
                      >
                        Crear objetivo
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {progresoPorObjetivo.map((objetivo) => (
                      <li
                        key={objetivo.id}
                        className={`rounded-lg border p-3 dark:border-slate-700 ${
                          objetivo.id === objetivoMasActivoId
                            ? 'border-blue-300 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-950/20'
                            : 'border-slate-200'
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{objetivo.nombre}</p>
                            {objetivo.id === objetivoMasActivoId ? (
                              <p className="text-[11px] text-blue-700 dark:text-blue-300">Objetivo más activo</p>
                            ) : null}
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${clasesBadgeEstado(objetivo.estado)}`}>
                            {objetivo.estado}
                          </span>
                        </div>

                        {objetivo.totalRelacionadas === 0 ? (
                          <p className="text-xs text-slate-500 dark:text-slate-400">Sin iniciativas o entregas asociadas.</p>
                        ) : (
                          <>
                            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={objetivo.porcentaje ?? 0} aria-label={`Progreso de ${objetivo.nombre}`}>
                              <div
                                className="h-2 rounded-full bg-slate-900 transition-all dark:bg-slate-200"
                                style={{ width: `${objetivo.porcentaje ?? 0}%` }}
                              />
                            </div>
                            <div className="mt-1 flex items-center justify-between">
                              <p className="text-xs text-slate-500 dark:text-slate-400">{objetivo.porcentaje}% completado</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {objetivo.completadas}/{objetivo.totalRelacionadas}
                              </p>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-sm font-semibold">Top prioridades</h2>

                {topIniciativasRice.length === 0 ? (
                  <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    <p>No hay iniciativas disponibles.</p>
                    {esEdicionPermitida ? (
                      <button
                        type="button"
                        onClick={() => navegarACrear('/roadmap/iniciativas')}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700"
                      >
                        Crear iniciativa
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {topIniciativasRice.map((iniciativa) => (
                      <li
                        key={iniciativa.id}
                        className={`rounded-lg border border-slate-200 p-2 dark:border-slate-700 ${
                          iniciativa.estado === 'completado' ? 'opacity-70' : ''
                        }`}
                      >
                        <p className="font-medium">{iniciativa.nombre}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Objetivo: {objetivoPorId.get(iniciativa.objetivo_id ?? '') ?? 'Sin objetivo'}
                        </p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            RICE: {iniciativa.rice}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${clasesBadgeEstado(iniciativa.estado)}`}>
                            {iniciativa.estado}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </div>

            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-semibold">Próximas entregas</h2>

              {proximasEntregas.length === 0 ? (
                <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <p>No hay entregas con fecha objetivo.</p>
                  {esEdicionPermitida ? (
                    <button
                      type="button"
                      onClick={() => navegarACrear('/roadmap/entregas')}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700"
                    >
                      Crear entrega
                    </button>
                  ) : null}
                </div>
              ) : (
                <ul className="mt-3 space-y-3">
                  {proximasEntregas.map((entrega) => (
                    <li key={entrega.id} className="grid grid-cols-[auto_1fr] gap-3">
                      <div className="mt-1 flex flex-col items-center">
                        <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500" />
                        <span className="mt-1 h-full w-px bg-slate-200 dark:bg-slate-700" />
                      </div>
                      <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{entrega.nombre}</p>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${clasesBadgeEstado(entrega.estado)}`}>
                            {entrega.estado}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Iniciativa: {iniciativaPorId.get(entrega.iniciativa_id ?? '')?.nombre ?? 'Sin iniciativa'}
                        </p>
                        <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {formatearFechaHumana(entrega.fecha_objetivo)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </div>
        )}
      </EstadoVista>
    </section>
  )
}
