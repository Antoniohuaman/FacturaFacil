import { type ReactNode, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listarModulosPm } from '@/aplicacion/casos-uso/ajustes'
import {
  obtenerDetalleRetroalimentacion,
  obtenerDistribucionesRetroalimentacion,
  obtenerListadoRetroalimentacion,
  obtenerResumenRetroalimentacion
} from '@/aplicacion/casos-uso/retroalimentacion'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { formatearFechaHoraCorta } from '@/compartido/utilidades/formatoPortal'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import type {
  CatalogoModuloPm,
  RegistroRetroalimentacionPm,
  RespuestaDetalleRetroalimentacionPm,
  RespuestaDistribucionesRetroalimentacionPm,
  RespuestaListadoRetroalimentacionPm,
  RespuestaResumenRetroalimentacionPm,
  TipoRetroalimentacionPm
} from '@/dominio/modelos'
import { tiposRetroalimentacionPm } from '@/dominio/modelos'
import { NavegacionAnalitica } from '@/presentacion/paginas/analitica/NavegacionAnalitica'
import { FranjaVisualRetroalimentacion } from '@/presentacion/paginas/analitica/retroalimentacion/FranjaVisualRetroalimentacion'
import { ModalDetalleRetroalimentacion } from '@/presentacion/paginas/analitica/retroalimentacion/ModalDetalleRetroalimentacion'
import {
  formatearEstadoDominanteRetroalimentacion,
  formatearTipoRetroalimentacion,
  obtenerClaseTipoRetroalimentacion,
  obtenerMetaSecundariaRetroalimentacion,
  obtenerSubtituloEmpresa,
  opcionesTipoRetroalimentacion,
  resumirTexto
} from '@/presentacion/paginas/analitica/retroalimentacion/retroalimentacionPresentacion'

const TAMANOS_PAGINA = [10, 25, 50]
const TAMANO_POR_DEFECTO = 10
const CLASE_CONTROL_FILTRO =
  'h-9 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-sm text-slate-700 transition outline-none focus:border-slate-400 focus:bg-white dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-200 dark:focus:border-slate-600 dark:focus:bg-slate-900'
const CLASE_BOTON_TABLA =
  'h-9 rounded-full border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
const CLASE_BOTON_PAGINACION =
  'inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-slate-200 px-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'

function CampoFiltro({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <label className="space-y-1">
      <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        {etiqueta}
      </span>
      {children}
    </label>
  )
}

function leerPagina(valor: string | null) {
  const numero = Number(valor ?? '1')
  return Number.isInteger(numero) && numero > 0 ? numero : 1
}

function leerTamano(valor: string | null) {
  const numero = Number(valor ?? String(TAMANO_POR_DEFECTO))
  return TAMANOS_PAGINA.includes(numero) ? numero : TAMANO_POR_DEFECTO
}

function leerTipo(valor: string | null): 'todos' | TipoRetroalimentacionPm {
  if (!valor) {
    return 'todos'
  }

  return tiposRetroalimentacionPm.includes(valor as TipoRetroalimentacionPm)
    ? (valor as TipoRetroalimentacionPm)
    : 'todos'
}

function construirTarjetasResumen(resumen: RespuestaResumenRetroalimentacionPm) {
  const estadoPrincipal = resumen.distribucion_estado_animo[0]?.estado_animo ?? null

  return [
    {
      titulo: 'Total',
      valor: resumen.total_registros.toLocaleString('es-PE'),
      detalle: null
    },
    {
      titulo: 'Ideas',
      valor: resumen.cantidad_ideas.toLocaleString('es-PE'),
      detalle: null
    },
    {
      titulo: 'Ánimo',
      valor: resumen.totales_por_tipo.estado_animo.toLocaleString('es-PE'),
      detalle: formatearEstadoDominanteRetroalimentacion(estadoPrincipal)
    },
    {
      titulo: 'Calificaciones',
      valor: resumen.totales_por_tipo.calificacion.toLocaleString('es-PE'),
      detalle: null
    },
    {
      titulo: 'Promedio',
      valor:
        resumen.promedio_calificacion === null
          ? '—'
          : resumen.promedio_calificacion.toLocaleString('es-PE', {
              minimumFractionDigits: resumen.promedio_calificacion % 1 === 0 ? 0 : 1,
              maximumFractionDigits: 2
            }),
      detalle: null
    }
  ]
}

export function PaginaRetroalimentacion() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { usuario: usuarioSesion, accessToken } = useSesionPortalPM()

  const [pagina, setPagina] = useState(() => leerPagina(searchParams.get('pagina')))
  const [tamano, setTamano] = useState(() => leerTamano(searchParams.get('tamano')))
  const [filtroTipo, setFiltroTipo] = useState<'todos' | TipoRetroalimentacionPm>(() => leerTipo(searchParams.get('tipo')))
  const [fechaDesde, setFechaDesde] = useState(searchParams.get('desde') ?? '')
  const [fechaHasta, setFechaHasta] = useState(searchParams.get('hasta') ?? '')
  const [empresa, setEmpresa] = useState(searchParams.get('empresa') ?? '')
  const [usuarioFiltro, setUsuarioFiltro] = useState(searchParams.get('usuario') ?? '')
  const [modulo, setModulo] = useState(searchParams.get('modulo') ?? 'todos')

  const [modulos, setModulos] = useState<CatalogoModuloPm[]>([])
  const [listado, setListado] = useState<RespuestaListadoRetroalimentacionPm | null>(null)
  const [resumen, setResumen] = useState<RespuestaResumenRetroalimentacionPm | null>(null)
  const [distribuciones, setDistribuciones] = useState<RespuestaDistribucionesRetroalimentacionPm | null>(null)
  const [cargandoInicial, setCargandoInicial] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false)
  const [registroSeleccionado, setRegistroSeleccionado] = useState<RegistroRetroalimentacionPm | null>(null)
  const [detalleSeleccionado, setDetalleSeleccionado] = useState<RespuestaDetalleRetroalimentacionPm | null>(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null)

  const empresaDiferida = useDeferredValue(empresa)
  const usuarioDiferido = useDeferredValue(usuarioFiltro)

  const solicitudContenidoRef = useRef(0)
  const solicitudDetalleRef = useRef(0)
  const haCargadoContenidoRef = useRef(false)

  useEffect(() => {
    const parametros = new URLSearchParams()

    if (filtroTipo !== 'todos') {
      parametros.set('tipo', filtroTipo)
    }

    if (fechaDesde) {
      parametros.set('desde', fechaDesde)
    }

    if (fechaHasta) {
      parametros.set('hasta', fechaHasta)
    }

    if (empresa) {
      parametros.set('empresa', empresa)
    }

    if (usuarioFiltro) {
      parametros.set('usuario', usuarioFiltro)
    }

    if (modulo !== 'todos') {
      parametros.set('modulo', modulo)
    }

    if (pagina > 1) {
      parametros.set('pagina', String(pagina))
    }

    if (tamano !== TAMANO_POR_DEFECTO) {
      parametros.set('tamano', String(tamano))
    }

    setSearchParams(parametros, { replace: true })
  }, [empresa, fechaDesde, fechaHasta, filtroTipo, modulo, pagina, setSearchParams, tamano, usuarioFiltro])

  useEffect(() => {
    let activo = true

    const cargarModulos = async () => {
      try {
        const respuesta = await listarModulosPm()

        if (!activo) {
          return
        }

        setModulos(
          [...respuesta]
            .filter((item) => item.activo)
            .sort((a, b) => a.orden - b.orden)
        )
      } catch {
        if (!activo) {
          return
        }

        setModulos([])
      }
    }

    void cargarModulos()

    return () => {
      activo = false
    }
  }, [])

  const filtrosConsulta = useMemo(
    () => ({
      tipo: filtroTipo === 'todos' ? null : filtroTipo,
      desde: fechaDesde || null,
      hasta: fechaHasta || null,
      empresa: empresaDiferida || null,
      usuario: usuarioDiferido || null,
      modulo: modulo === 'todos' ? null : modulo
    }),
    [empresaDiferida, fechaDesde, fechaHasta, filtroTipo, modulo, usuarioDiferido]
  )

  const parametrosListado = useMemo(
    () => ({
      pagina,
      tamano,
      ordenar_por: 'created_at' as const,
      direccion: 'desc' as const,
      ...filtrosConsulta
    }),
    [filtrosConsulta, pagina, tamano]
  )

  const cargarContenido = useCallback(async () => {
    const solicitudActual = solicitudContenidoRef.current + 1
    solicitudContenidoRef.current = solicitudActual

    if (!usuarioSesion || !accessToken) {
      haCargadoContenidoRef.current = false
      setListado(null)
      setResumen(null)
      setDistribuciones(null)
      setError('Inicia sesión para consultar Retroalimentación.')
      setCargandoInicial(false)
      setActualizando(false)
      return
    }

    if (haCargadoContenidoRef.current) {
      setActualizando(true)
    } else {
      setCargandoInicial(true)
    }

    setError(null)

    try {
      const [respuestaListado, respuestaResumen, respuestaDistribuciones] = await Promise.all([
        obtenerListadoRetroalimentacion({
          accessToken,
          parametros: parametrosListado
        }),
        obtenerResumenRetroalimentacion({
          accessToken,
          filtros: filtrosConsulta
        }),
        obtenerDistribucionesRetroalimentacion({
          accessToken,
          filtros: filtrosConsulta
        })
      ])

      if (solicitudActual !== solicitudContenidoRef.current) {
        return
      }

      setListado(respuestaListado)
      setResumen(respuestaResumen)
      setDistribuciones(respuestaDistribuciones)
      haCargadoContenidoRef.current = true
    } catch (errorInterno) {
      if (solicitudActual !== solicitudContenidoRef.current) {
        return
      }

      if (!haCargadoContenidoRef.current) {
        setListado(null)
        setResumen(null)
        setDistribuciones(null)
      }

      setError(
        errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar el módulo de Retroalimentación.'
      )
    } finally {
      if (solicitudActual === solicitudContenidoRef.current) {
        setCargandoInicial(false)
        setActualizando(false)
      }
    }
  }, [accessToken, filtrosConsulta, parametrosListado, usuarioSesion])

  useEffect(() => {
    void cargarContenido()
  }, [cargarContenido])

  useEffect(() => {
    if (!listado) {
      return
    }

    if (listado.paginacion.total > 0 && listado.items.length === 0 && pagina > listado.paginacion.total_paginas) {
      setPagina(listado.paginacion.total_paginas)
    }
  }, [listado, pagina])

  const cargarDetalle = useCallback(async () => {
    if (!registroSeleccionado) {
      return
    }

    const solicitudActual = solicitudDetalleRef.current + 1
    solicitudDetalleRef.current = solicitudActual

    if (!accessToken) {
      setDetalleSeleccionado(null)
      setErrorDetalle('Inicia sesión para consultar el detalle.')
      setCargandoDetalle(false)
      return
    }

    setCargandoDetalle(true)
    setErrorDetalle(null)

    try {
      const respuesta = await obtenerDetalleRetroalimentacion({
        accessToken,
        tipo: registroSeleccionado.tipo,
        id: registroSeleccionado.id
      })

      if (solicitudActual !== solicitudDetalleRef.current) {
        return
      }

      setDetalleSeleccionado(respuesta)
    } catch (errorInterno) {
      if (solicitudActual !== solicitudDetalleRef.current) {
        return
      }

      setDetalleSeleccionado(null)
      setErrorDetalle(
        errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar el detalle del registro.'
      )
    } finally {
      if (solicitudActual === solicitudDetalleRef.current) {
        setCargandoDetalle(false)
      }
    }
  }, [accessToken, registroSeleccionado])

  useEffect(() => {
    if (!modalDetalleAbierto || !registroSeleccionado) {
      return
    }

    void cargarDetalle()
  }, [cargarDetalle, modalDetalleAbierto, registroSeleccionado])

  const tarjetasResumen = useMemo(
    () => (resumen ? construirTarjetasResumen(resumen) : []),
    [resumen]
  )

  const rangoPagina = useMemo(() => {
    if (!listado || listado.paginacion.total === 0) {
      return { desde: 0, hasta: 0 }
    }

    const desde = (listado.paginacion.pagina - 1) * listado.paginacion.tamano + 1
    const hasta = Math.min(listado.paginacion.pagina * listado.paginacion.tamano, listado.paginacion.total)
    return { desde, hasta }
  }, [listado])

  const hayFiltrosActivos =
    filtroTipo !== 'todos' ||
    Boolean(fechaDesde) ||
    Boolean(fechaHasta) ||
    Boolean(empresa) ||
    Boolean(usuarioFiltro) ||
    modulo !== 'todos'

  return (
    <section className="mx-auto flex w-full max-w-[94rem] flex-col gap-2.5 xl:gap-3">
      <header className="space-y-1.5">
        <div className="space-y-0.5">
          <h1 className="text-[1.7rem] font-semibold tracking-tight text-slate-950 dark:text-slate-50">Retroalimentación</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ideas, ánimo y calificaciones de producto.
          </p>
        </div>
        <NavegacionAnalitica />
      </header>

      <EstadoVista cargando={cargandoInicial} error={error && !resumen ? error : null} vacio={false} mensajeVacio="">
        <>
          {resumen || distribuciones ? (
            <section className="grid gap-2.5 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.94fr)] xl:items-stretch">
              {resumen ? (
                <div className="order-1 grid gap-2 sm:grid-cols-2 xl:order-2 xl:auto-rows-fr">
                  {tarjetasResumen.map((tarjeta, indice) => (
                    <article
                      key={tarjeta.titulo}
                      className={`rounded-xl border border-slate-200/90 bg-gradient-to-br from-white via-white to-slate-50/80 px-3.5 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800/90 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950/70 dark:shadow-none ${indice === tarjetasResumen.length - 1 ? 'sm:col-span-2' : ''}`}
                    >
                      <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{tarjeta.titulo}</p>
                      <div className="mt-1.5 flex items-end justify-between gap-2">
                        <p className="text-[1.35rem] font-semibold tracking-tight text-slate-900 dark:text-slate-50">{tarjeta.valor}</p>
                        {tarjeta.detalle ? (
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {tarjeta.detalle}
                          </span>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}

              {distribuciones ? (
                <div className="order-2 xl:order-1 xl:h-full">
                  <FranjaVisualRetroalimentacion distribuciones={distribuciones} />
                </div>
              ) : null}
            </section>
          ) : null}

          {error && resumen && listado ? (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p>No se pudo actualizar la información. Se muestran los últimos datos disponibles.</p>
                <button
                  type="button"
                  onClick={() => {
                    void cargarContenido()
                  }}
                  className="rounded-full border border-amber-300 px-3 py-1.5 text-xs font-medium transition hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-900/40"
                >
                  Reintentar
                </button>
              </div>
            </div>
          ) : null}

          <article className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] dark:border-slate-800/90 dark:bg-slate-900 dark:shadow-none">
            <header className="border-b border-slate-200/90 px-4 py-3 dark:border-slate-800/90">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Registros</h2>
                  {actualizando ? (
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                      Actualizando
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void cargarContenido()
                    }}
                    disabled={cargandoInicial || actualizando}
                    className={CLASE_BOTON_TABLA}
                  >
                    {actualizando ? 'Actualizando…' : 'Recargar'}
                  </button>
                  {hayFiltrosActivos ? (
                    <button
                      type="button"
                      onClick={() => {
                        setFiltroTipo('todos')
                        setFechaDesde('')
                        setFechaHasta('')
                        setEmpresa('')
                        setUsuarioFiltro('')
                        setModulo('todos')
                        setPagina(1)
                      }}
                      className={CLASE_BOTON_TABLA}
                    >
                      Limpiar
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-6">
                <CampoFiltro etiqueta="Tipo">
                  <select
                    value={filtroTipo}
                    onChange={(evento) => {
                      setFiltroTipo(evento.target.value as 'todos' | TipoRetroalimentacionPm)
                      setPagina(1)
                    }}
                    className={CLASE_CONTROL_FILTRO}
                  >
                    {opcionesTipoRetroalimentacion.map((opcion) => (
                      <option key={opcion.valor} value={opcion.valor}>
                        {opcion.etiqueta}
                      </option>
                    ))}
                  </select>
                </CampoFiltro>

                <CampoFiltro etiqueta="Desde">
                  <input
                    type="date"
                    value={fechaDesde}
                    max={fechaHasta || undefined}
                    onChange={(evento) => {
                      setFechaDesde(evento.target.value)
                      setPagina(1)
                    }}
                    className={CLASE_CONTROL_FILTRO}
                  />
                </CampoFiltro>

                <CampoFiltro etiqueta="Hasta">
                  <input
                    type="date"
                    value={fechaHasta}
                    min={fechaDesde || undefined}
                    onChange={(evento) => {
                      setFechaHasta(evento.target.value)
                      setPagina(1)
                    }}
                    className={CLASE_CONTROL_FILTRO}
                  />
                </CampoFiltro>

                <CampoFiltro etiqueta="Empresa">
                  <input
                    value={empresa}
                    onChange={(evento) => {
                      setEmpresa(evento.target.value)
                      setPagina(1)
                    }}
                    placeholder="Todas"
                    className={CLASE_CONTROL_FILTRO}
                  />
                </CampoFiltro>

                <CampoFiltro etiqueta="Usuario">
                  <input
                    value={usuarioFiltro}
                    onChange={(evento) => {
                      setUsuarioFiltro(evento.target.value)
                      setPagina(1)
                    }}
                    placeholder="Todos"
                    className={CLASE_CONTROL_FILTRO}
                  />
                </CampoFiltro>

                <CampoFiltro etiqueta="Módulo">
                  <select
                    value={modulo}
                    onChange={(evento) => {
                      setModulo(evento.target.value)
                      setPagina(1)
                    }}
                    className={CLASE_CONTROL_FILTRO}
                  >
                    <option value="todos">Todos</option>
                    {modulos.map((item) => (
                      <option key={item.id} value={item.codigo}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                </CampoFiltro>
              </div>
            </header>

            {listado && listado.items.length > 0 ? (
              <div className="overflow-auto md:max-h-[60vh]">
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                  <thead className="text-left text-[10px] uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-2.5 font-medium backdrop-blur dark:bg-slate-950/95">Fecha</th>
                      <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-2.5 font-medium backdrop-blur dark:bg-slate-950/95">Tipo</th>
                      <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-2.5 font-medium backdrop-blur dark:bg-slate-950/95">Usuario</th>
                      <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-2.5 font-medium backdrop-blur dark:bg-slate-950/95">Empresa</th>
                      <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-2.5 font-medium backdrop-blur dark:bg-slate-950/95">Módulo</th>
                      <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-2.5 font-medium backdrop-blur dark:bg-slate-950/95">Señal</th>
                      <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-2.5 text-right font-medium backdrop-blur dark:bg-slate-950/95">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {listado.items.map((registro) => {
                      const metaSecundaria = obtenerMetaSecundariaRetroalimentacion(registro)
                      const detalleBreve = resumirTexto(registro.detalle, 64)
                      const subtituloEmpresa = obtenerSubtituloEmpresa(registro)

                      return (
                        <tr key={registro.registro_uid} className="align-top transition hover:bg-slate-50/70 dark:hover:bg-slate-950/30">
                          <td className="whitespace-nowrap px-4 py-2.5 text-[13px] text-slate-600 dark:text-slate-300">
                            {formatearFechaHoraCorta(registro.created_at)}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${obtenerClaseTipoRetroalimentacion(registro.tipo)}`}>
                              {formatearTipoRetroalimentacion(registro.tipo)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="max-w-[10rem] truncate text-sm font-medium text-slate-900 dark:text-slate-100" title={registro.usuario_nombre}>
                              {registro.usuario_nombre}
                            </p>
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="max-w-[12rem] truncate text-sm font-medium text-slate-900 dark:text-slate-100" title={registro.empresa_nombre}>
                              {registro.empresa_nombre}
                            </p>
                            {subtituloEmpresa ? (
                              <p className="max-w-[12rem] truncate text-[11px] text-slate-500 dark:text-slate-400" title={subtituloEmpresa}>
                                {subtituloEmpresa}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-2.5 text-[13px] text-slate-700 dark:text-slate-200">
                            <span className="block max-w-[9rem] truncate" title={registro.modulo}>
                              {registro.modulo}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="max-w-[36rem] space-y-0.5 xl:max-w-[44rem]">
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{registro.valor_principal}</p>
                              {metaSecundaria || detalleBreve ? (
                                <div className="space-y-0.5 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                                  {metaSecundaria ? <p>{metaSecundaria}</p> : null}
                                  {detalleBreve ? <p>{detalleBreve}</p> : null}
                                </div>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setRegistroSeleccionado(registro)
                                setDetalleSeleccionado(null)
                                setErrorDetalle(null)
                                setModalDetalleAbierto(true)
                              }}
                              className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                            >
                              Abrir
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="m-4 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                No hay resultados con los filtros actuales.
              </div>
            )}

            {listado && listado.paginacion.total > 0 ? (
              <footer className="flex flex-col gap-2 border-t border-slate-200/90 px-4 py-3 dark:border-slate-800/90 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <label htmlFor="tamano-retroalimentacion">Filas</label>
                  <select
                    id="tamano-retroalimentacion"
                    value={listado.paginacion.tamano}
                    onChange={(evento) => {
                      setTamano(Number(evento.target.value))
                      setPagina(1)
                    }}
                    className="h-8 rounded-full border border-slate-200 bg-slate-50 px-2.5 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-200"
                  >
                    {TAMANOS_PAGINA.map((opcion) => (
                      <option key={opcion} value={opcion}>
                        {opcion}
                      </option>
                    ))}
                  </select>
                  <span>
                    {rangoPagina.desde}-{rangoPagina.hasta} de {listado.paginacion.total.toLocaleString('es-PE')}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPagina(1)}
                    disabled={listado.paginacion.pagina <= 1}
                    className={`${CLASE_BOTON_PAGINACION} hidden sm:inline-flex`}
                  >
                    Inicio
                  </button>
                  <button
                    type="button"
                    onClick={() => setPagina(Math.max(1, listado.paginacion.pagina - 1))}
                    disabled={listado.paginacion.pagina <= 1}
                    className={CLASE_BOTON_PAGINACION}
                  >
                    {'<'}
                  </button>
                  <span className="min-w-14 text-center text-xs font-medium text-slate-600 dark:text-slate-300">
                    {listado.paginacion.pagina}/{listado.paginacion.total_paginas}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPagina(Math.min(listado.paginacion.total_paginas, listado.paginacion.pagina + 1))}
                    disabled={listado.paginacion.pagina >= listado.paginacion.total_paginas}
                    className={CLASE_BOTON_PAGINACION}
                  >
                    {'>'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPagina(listado.paginacion.total_paginas)}
                    disabled={listado.paginacion.pagina >= listado.paginacion.total_paginas}
                    className={`${CLASE_BOTON_PAGINACION} hidden sm:inline-flex`}
                  >
                    Fin
                  </button>
                </div>
              </footer>
            ) : null}
          </article>
        </>
      </EstadoVista>

      <ModalDetalleRetroalimentacion
        abierto={modalDetalleAbierto}
        registroBase={registroSeleccionado}
        detalle={detalleSeleccionado}
        cargando={cargandoDetalle}
        error={errorDetalle}
        alCerrar={() => {
          setModalDetalleAbierto(false)
          setRegistroSeleccionado(null)
          setDetalleSeleccionado(null)
          setErrorDetalle(null)
        }}
        alReintentar={() => {
          void cargarDetalle()
        }}
      />
    </section>
  )
}