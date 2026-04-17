import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listarModulosPm } from '@/aplicacion/casos-uso/ajustes'
import {
  obtenerDetalleRetroalimentacion,
  obtenerListadoRetroalimentacion,
  obtenerResumenRetroalimentacion
} from '@/aplicacion/casos-uso/retroalimentacion'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { formatearEstadoLegible, formatearFechaHoraCorta } from '@/compartido/utilidades/formatoPortal'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { PaginacionTabla } from '@/compartido/ui/PaginacionTabla'
import type {
  CatalogoModuloPm,
  RegistroRetroalimentacionPm,
  RespuestaDetalleRetroalimentacionPm,
  RespuestaListadoRetroalimentacionPm,
  RespuestaResumenRetroalimentacionPm,
  TipoRetroalimentacionPm
} from '@/dominio/modelos'
import { tiposRetroalimentacionPm } from '@/dominio/modelos'
import { NavegacionAnalitica } from '@/presentacion/paginas/analitica/NavegacionAnalitica'
import { ModalDetalleRetroalimentacion } from '@/presentacion/paginas/analitica/retroalimentacion/ModalDetalleRetroalimentacion'
import {
  formatearTipoRetroalimentacion,
  obtenerClaseTipoRetroalimentacion,
  obtenerMetaSecundariaRetroalimentacion,
  obtenerSubtituloEmpresa,
  opcionesTipoRetroalimentacion,
  resumirTexto
} from '@/presentacion/paginas/analitica/retroalimentacion/retroalimentacionPresentacion'

const TAMANOS_PAGINA = [10, 25, 50]
const TAMANO_POR_DEFECTO = 10

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
      detalle: 'Lecturas directas consolidadas con los filtros actuales.'
    },
    {
      titulo: 'Ideas',
      valor: resumen.cantidad_ideas.toLocaleString('es-PE'),
      detalle: 'Aportes y sugerencias ingresadas por usuarios.'
    },
    {
      titulo: 'Estados de ánimo',
      valor: resumen.totales_por_tipo.estado_animo.toLocaleString('es-PE'),
      detalle: estadoPrincipal ? `Predomina ${formatearEstadoLegible(estadoPrincipal)}.` : 'Sin estado dominante.'
    },
    {
      titulo: 'Calificaciones',
      valor: resumen.totales_por_tipo.calificacion.toLocaleString('es-PE'),
      detalle: 'Registros con puntaje explícito de experiencia.'
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
      detalle: `${resumen.totales_por_tipo.calificacion.toLocaleString('es-PE')} respuestas con puntaje.`
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
      const [respuestaListado, respuestaResumen] = await Promise.all([
        obtenerListadoRetroalimentacion({
          accessToken,
          parametros: parametrosListado
        }),
        obtenerResumenRetroalimentacion({
          accessToken,
          filtros: filtrosConsulta
        })
      ])

      if (solicitudActual !== solicitudContenidoRef.current) {
        return
      }

      setListado(respuestaListado)
      setResumen(respuestaResumen)
      haCargadoContenidoRef.current = true
    } catch (errorInterno) {
      if (solicitudActual !== solicitudContenidoRef.current) {
        return
      }

      if (!haCargadoContenidoRef.current) {
        setListado(null)
        setResumen(null)
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
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Retroalimentación</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Señales directas de uso, satisfacción e ideas del producto.
          </p>
        </div>
        <NavegacionAnalitica />
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
          <p>Lectura unificada de estados de ánimo, ideas y calificaciones.</p>
          <p className="text-xs text-slate-500 dark:text-slate-500">
            {actualizando
              ? 'Actualizando información…'
              : resumen
                ? `Última actualización ${formatearFechaHoraCorta(resumen.actualizado_en)}.`
                : 'Preparando lectura del módulo.'}
          </p>
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
            disabled={!hayFiltrosActivos}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      <EstadoVista cargando={cargandoInicial} error={error && !resumen ? error : null} vacio={false} mensajeVacio="">
        <>
          {resumen ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {tarjetasResumen.map((tarjeta) => (
                <article key={tarjeta.titulo} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{tarjeta.titulo}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">{tarjeta.valor}</p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{tarjeta.detalle}</p>
                </article>
              ))}
            </div>
          ) : null}

          <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-6 dark:border-slate-800 dark:bg-slate-900">
            <select
              value={filtroTipo}
              onChange={(evento) => {
                setFiltroTipo(evento.target.value as 'todos' | TipoRetroalimentacionPm)
                setPagina(1)
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              {opcionesTipoRetroalimentacion.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>
                  {opcion.etiqueta}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={fechaDesde}
              onChange={(evento) => {
                setFechaDesde(evento.target.value)
                setPagina(1)
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />

            <input
              type="date"
              value={fechaHasta}
              onChange={(evento) => {
                setFechaHasta(evento.target.value)
                setPagina(1)
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />

            <input
              value={empresa}
              onChange={(evento) => {
                setEmpresa(evento.target.value)
                setPagina(1)
              }}
              placeholder="Empresa"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />

            <input
              value={usuarioFiltro}
              onChange={(evento) => {
                setUsuarioFiltro(evento.target.value)
                setPagina(1)
              }}
              placeholder="Usuario"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />

            <select
              value={modulo}
              onChange={(evento) => {
                setModulo(evento.target.value)
                setPagina(1)
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="todos">Todos los módulos</option>
              {modulos.map((item) => (
                <option key={item.id} value={item.codigo}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </div>

          {error && resumen && listado ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p>{error}</p>
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

          <article className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <div>
                <h2 className="text-base font-semibold">Registros</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {resumen ? `${resumen.total_registros.toLocaleString('es-PE')} resultados con los filtros aplicados.` : 'Cargando resultados.'}
                </p>
              </div>
              {actualizando ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
                  Actualizando…
                </span>
              ) : null}
            </header>

            {listado && listado.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/40">
                    <tr>
                      <th className="px-4 py-3 font-medium">Fecha</th>
                      <th className="px-4 py-3 font-medium">Tipo</th>
                      <th className="px-4 py-3 font-medium">Usuario</th>
                      <th className="px-4 py-3 font-medium">Empresa</th>
                      <th className="px-4 py-3 font-medium">Módulo</th>
                      <th className="px-4 py-3 font-medium">Valor principal</th>
                      <th className="px-4 py-3 font-medium">Detalle breve</th>
                      <th className="px-4 py-3 text-right font-medium">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {listado.items.map((registro) => {
                      const metaSecundaria = obtenerMetaSecundariaRetroalimentacion(registro)

                      return (
                        <tr key={registro.registro_uid} className="align-top">
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            {formatearFechaHoraCorta(registro.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${obtenerClaseTipoRetroalimentacion(registro.tipo)}`}>
                              {formatearTipoRetroalimentacion(registro.tipo)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900 dark:text-slate-100">{registro.usuario_nombre}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{registro.usuario_id}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900 dark:text-slate-100">{registro.empresa_nombre}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{obtenerSubtituloEmpresa(registro)}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{registro.modulo}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900 dark:text-slate-100">{registro.valor_principal}</p>
                            {metaSecundaria ? (
                              <p className="text-xs text-slate-500 dark:text-slate-400">{metaSecundaria}</p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{resumirTexto(registro.detalle)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setRegistroSeleccionado(registro)
                                setDetalleSeleccionado(null)
                                setErrorDetalle(null)
                                setModalDetalleAbierto(true)
                              }}
                              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              Ver detalle
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
                No hay registros para los filtros seleccionados.
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