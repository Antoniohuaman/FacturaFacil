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
import { PaginacionTabla } from '@/compartido/ui/PaginacionTabla'
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
  formatearCantidadConPuntaje,
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

function CampoFiltro({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="block text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
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
      titulo: 'Total de registros',
      valor: resumen.total_registros.toLocaleString('es-PE'),
      detalle: null
    },
    {
      titulo: 'Ideas',
      valor: resumen.cantidad_ideas.toLocaleString('es-PE'),
      detalle: null
    },
    {
      titulo: 'Estados de ánimo',
      valor: resumen.totales_por_tipo.estado_animo.toLocaleString('es-PE'),
      detalle: formatearEstadoDominanteRetroalimentacion(estadoPrincipal)
    },
    {
      titulo: 'Calificaciones',
      valor: resumen.totales_por_tipo.calificacion.toLocaleString('es-PE'),
      detalle: null
    },
    {
      titulo: 'Promedio de calificación',
      valor:
        resumen.promedio_calificacion === null
          ? '—'
          : resumen.promedio_calificacion.toLocaleString('es-PE', {
              minimumFractionDigits: resumen.promedio_calificacion % 1 === 0 ? 0 : 1,
              maximumFractionDigits: 2
            }),
      detalle:
        resumen.totales_por_tipo.calificacion > 0
          ? formatearCantidadConPuntaje(resumen.totales_por_tipo.calificacion)
          : 'Sin respuestas con puntaje'
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

  const textoActualizacion = actualizando
    ? 'Actualizando resultados…'
    : resumen
      ? `Actualizado ${formatearFechaHoraCorta(resumen.actualizado_en)}`
      : 'Ajusta los filtros para refinar la lectura.'

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 xl:gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Retroalimentación</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Señales directas de uso, satisfacción e ideas del producto.
          </p>
        </div>
        <NavegacionAnalitica />
      </header>

      <EstadoVista cargando={cargandoInicial} error={error && !resumen ? error : null} vacio={false} mensajeVacio="">
        <>
          {resumen ? (
            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-5">
              {tarjetasResumen.map((tarjeta) => (
                <article key={tarjeta.titulo} className="rounded-2xl border border-slate-200/90 bg-white p-4 dark:border-slate-800/90 dark:bg-slate-900">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{tarjeta.titulo}</p>
                  <p className="mt-2.5 text-[1.65rem] font-semibold tracking-tight text-slate-900 dark:text-slate-50">{tarjeta.valor}</p>
                  {tarjeta.detalle ? (
                    <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">{tarjeta.detalle}</p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}

          {distribuciones ? <FranjaVisualRetroalimentacion distribuciones={distribuciones} /> : null}

          <article className="rounded-2xl border border-slate-200/90 bg-white p-3.5 dark:border-slate-800/90 dark:bg-slate-900">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Filtros</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{textoActualizacion}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void cargarContenido()
                  }}
                  disabled={cargandoInicial || actualizando}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Recargar
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
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Limpiar
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <CampoFiltro etiqueta="Tipo">
                <select
                  value={filtroTipo}
                  onChange={(evento) => {
                    setFiltroTipo(evento.target.value as 'todos' | TipoRetroalimentacionPm)
                    setPagina(1)
                  }}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
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
                  onChange={(evento) => {
                    setFechaDesde(evento.target.value)
                    setPagina(1)
                  }}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </CampoFiltro>

              <CampoFiltro etiqueta="Hasta">
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(evento) => {
                    setFechaHasta(evento.target.value)
                    setPagina(1)
                  }}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
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
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
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
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </CampoFiltro>

              <CampoFiltro etiqueta="Módulo">
                <select
                  value={modulo}
                  onChange={(evento) => {
                    setModulo(evento.target.value)
                    setPagina(1)
                  }}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
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
          </article>

          {error && resumen && listado ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p>No se pudo actualizar la información. Se muestran los últimos datos disponibles.</p>
                <button
                  type="button"
                  onClick={() => {
                    void cargarContenido()
                  }}
                  className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-medium transition hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-900/40"
                >
                  Reintentar
                </button>
              </div>
            </div>
          ) : null}

          <article className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <div>
                <h2 className="text-base font-semibold">Registros</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {resumen ? `${resumen.total_registros.toLocaleString('es-PE')} registros` : 'Cargando registros…'}
                </p>
              </div>
              {actualizando ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
                  Actualizando
                </span>
              ) : null}
            </header>

            {listado && listado.items.length > 0 ? (
              <div className="overflow-auto md:max-h-[52vh]">
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                  <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-3 font-medium backdrop-blur dark:bg-slate-950/95">Fecha</th>
                      <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-3 font-medium backdrop-blur dark:bg-slate-950/95">Tipo</th>
                      <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-3 font-medium backdrop-blur dark:bg-slate-950/95">Usuario</th>
                      <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-3 font-medium backdrop-blur dark:bg-slate-950/95">Empresa</th>
                      <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-3 font-medium backdrop-blur dark:bg-slate-950/95">Módulo</th>
                      <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-3 font-medium backdrop-blur dark:bg-slate-950/95">Señal</th>
                      <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-3 text-right font-medium backdrop-blur dark:bg-slate-950/95">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {listado.items.map((registro) => {
                      const metaSecundaria = obtenerMetaSecundariaRetroalimentacion(registro)
                      const detalleBreve = resumirTexto(registro.detalle, 84)
                      const subtituloEmpresa = obtenerSubtituloEmpresa(registro)

                      return (
                        <tr key={registro.registro_uid} className="align-top transition hover:bg-slate-50/70 dark:hover:bg-slate-950/30">
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                            {formatearFechaHoraCorta(registro.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${obtenerClaseTipoRetroalimentacion(registro.tipo)}`}>
                              {formatearTipoRetroalimentacion(registro.tipo)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900 dark:text-slate-100">{registro.usuario_nombre}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900 dark:text-slate-100">{registro.empresa_nombre}</p>
                            {subtituloEmpresa ? (
                              <p className="text-xs text-slate-500 dark:text-slate-400">{subtituloEmpresa}</p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{registro.modulo}</td>
                          <td className="px-4 py-3">
                            <div className="max-w-[30rem] space-y-1 xl:max-w-[36rem]">
                              <p className="font-medium text-slate-900 dark:text-slate-100">{registro.valor_principal}</p>
                              {metaSecundaria || detalleBreve ? (
                                <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                                  {metaSecundaria ? <p>{metaSecundaria}</p> : null}
                                  {detalleBreve ? <p>{detalleBreve}</p> : null}
                                </div>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setRegistroSeleccionado(registro)
                                setDetalleSeleccionado(null)
                                setErrorDetalle(null)
                                setModalDetalleAbierto(true)
                              }}
                              className="rounded-full px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
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
          </article>

          {listado && listado.paginacion.total > 0 ? (
            <PaginacionTabla
              paginaActual={listado.paginacion.pagina}
              totalPaginas={listado.paginacion.total_paginas}
              totalItems={listado.paginacion.total}
              desde={rangoPagina.desde}
              hasta={rangoPagina.hasta}
              tamanoPagina={listado.paginacion.tamano}
              alCambiarTamanoPagina={(nuevoTamano) => {
                setTamano(nuevoTamano)
                setPagina(1)
              }}
              alCambiarPagina={setPagina}
            />
          ) : null}
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