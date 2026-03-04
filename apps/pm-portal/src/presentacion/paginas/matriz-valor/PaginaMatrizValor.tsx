import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'react-router-dom'
import { matrizValorSchema, type MatrizValorEntrada } from '@/compartido/validacion/esquemas'
import {
  estadosRegistro,
  prioridadesRegistro,
  type CatalogoEtapaPm,
  type CatalogoVentanaPm,
  type Iniciativa,
  type MatrizValor,
  type Objetivo
} from '@/dominio/modelos'
import {
  crearMatrizValor,
  editarMatrizValor,
  eliminarMatrizValor,
  listarMatrizValor
} from '@/aplicacion/casos-uso/matrizValor'
import { listarIniciativas } from '@/aplicacion/casos-uso/iniciativas'
import { listarObjetivos } from '@/aplicacion/casos-uso/objetivos'
import { listarEtapasPm, listarVentanasPm } from '@/aplicacion/casos-uso/ajustes'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'
import { usePaginacion } from '../../../compartido/utilidades/usePaginacion'
import { PaginacionTabla } from '@/compartido/ui/PaginacionTabla'

type ModoModal = 'crear' | 'ver' | 'editar'

function calcularPuntaje(valor_negocio: number, esfuerzo: number, riesgo: number) {
  return Number((valor_negocio * 2 - esfuerzo - riesgo).toFixed(2))
}

export function PaginaMatrizValor() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paginaInicial = Number(searchParams.get('pagina') ?? '1')
  const tamanoInicial = Number(searchParams.get('tamano') ?? '10')
  const { rol } = useSesionPortalPM()
  const [matrices, setMatrices] = useState<MatrizValor[]>([])
  const [iniciativas, setIniciativas] = useState<Iniciativa[]>([])
  const [objetivos, setObjetivos] = useState<Objetivo[]>([])
  const [ventanas, setVentanas] = useState<CatalogoVentanaPm[]>([])
  const [etapas, setEtapas] = useState<CatalogoEtapaPm[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState(searchParams.get('q') ?? '')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | (typeof estadosRegistro)[number]>(
    (searchParams.get('estado') as 'todos' | (typeof estadosRegistro)[number]) ?? 'todos'
  )
  const [filtroPrioridad, setFiltroPrioridad] = useState<'todas' | (typeof prioridadesRegistro)[number]>(
    (searchParams.get('prioridad') as 'todas' | (typeof prioridadesRegistro)[number]) ?? 'todas'
  )
  const [filtroObjetivo, setFiltroObjetivo] = useState(searchParams.get('objetivo') ?? 'todos')
  const [filtroIniciativa, setFiltroIniciativa] = useState(searchParams.get('iniciativa') ?? 'todas')
  const [filtroVentana, setFiltroVentana] = useState(searchParams.get('ventana') ?? 'todas')
  const [filtroEtapa, setFiltroEtapa] = useState(searchParams.get('etapa') ?? 'todas')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [matrizActiva, setMatrizActiva] = useState<MatrizValor | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<MatrizValorEntrada>({
    resolver: zodResolver(matrizValorSchema),
    defaultValues: {
      iniciativa_id: '',
      titulo: '',
      valor_negocio: 10,
      esfuerzo: 10,
      riesgo: 10,
      estado: 'pendiente',
      prioridad: 'media'
    }
  })

  const esEdicionPermitida = puedeEditar(rol)

  const valorNegocio = watch('valor_negocio')
  const esfuerzo = watch('esfuerzo')
  const riesgo = watch('riesgo')
  const puntajeCalculado = useMemo(
    () => calcularPuntaje(valorNegocio, esfuerzo, riesgo),
    [valorNegocio, esfuerzo, riesgo]
  )

  const cargarInformacion = async () => {
    setCargando(true)
    setError(null)
    try {
      const [listaMatriz, listaIniciativas, listaObjetivos, listaVentanas, listaEtapas] = await Promise.all([
        listarMatrizValor(),
        listarIniciativas(),
        listarObjetivos(),
        listarVentanasPm(),
        listarEtapasPm()
      ])
      setMatrices(listaMatriz)
      setIniciativas(listaIniciativas)
      setObjetivos(listaObjetivos)
      setVentanas(listaVentanas)
      setEtapas(listaEtapas)
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar matriz de valor')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargarInformacion()
  }, [])

  const matricesFiltradas = useMemo(() => {
    const objetivoPorIniciativa = new Map(iniciativas.map((iniciativa) => [iniciativa.id, iniciativa.objetivo_id]))
    const ventanaPorIniciativa = new Map(
      iniciativas.map((iniciativa) => [iniciativa.id, iniciativa.ventana_planificada_id])
    )
    const etapaPorIniciativa = new Map(iniciativas.map((iniciativa) => [iniciativa.id, iniciativa.etapa_id]))

    return matrices.filter((matriz) => {
      const coincideBusqueda = matriz.titulo.toLowerCase().includes(busqueda.toLowerCase())
      const coincideEstado = filtroEstado === 'todos' ? true : matriz.estado === filtroEstado
      const coincidePrioridad = filtroPrioridad === 'todas' ? true : matriz.prioridad === filtroPrioridad
      const coincideObjetivo =
        filtroObjetivo === 'todos'
          ? true
          : objetivoPorIniciativa.get(matriz.iniciativa_id) === filtroObjetivo
      const coincideIniciativa = filtroIniciativa === 'todas' ? true : matriz.iniciativa_id === filtroIniciativa
      const coincideVentana =
        filtroVentana === 'todas'
          ? true
          : filtroVentana === 'sin_asignar'
            ? !ventanaPorIniciativa.get(matriz.iniciativa_id)
            : ventanaPorIniciativa.get(matriz.iniciativa_id) === filtroVentana
      const coincideEtapa =
        filtroEtapa === 'todas'
          ? true
          : filtroEtapa === 'sin_asignar'
            ? !etapaPorIniciativa.get(matriz.iniciativa_id)
            : etapaPorIniciativa.get(matriz.iniciativa_id) === filtroEtapa

      return (
        coincideBusqueda &&
        coincideEstado &&
        coincidePrioridad &&
        coincideObjetivo &&
        coincideIniciativa &&
        coincideVentana &&
        coincideEtapa
      )
    })
  }, [
    matrices,
    iniciativas,
    busqueda,
    filtroEstado,
    filtroPrioridad,
    filtroObjetivo,
    filtroIniciativa,
    filtroVentana,
    filtroEtapa
  ])

  const iniciativasDisponibles = useMemo(() => {
    if (filtroObjetivo === 'todos') {
      return iniciativas
    }

    return iniciativas.filter((iniciativa) => iniciativa.objetivo_id === filtroObjetivo)
  }, [iniciativas, filtroObjetivo])

  const paginacion = usePaginacion({
    items: matricesFiltradas,
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
    if (filtroPrioridad !== 'todas') {
      parametros.set('prioridad', filtroPrioridad)
    }
    if (filtroObjetivo !== 'todos') {
      parametros.set('objetivo', filtroObjetivo)
    }
    if (filtroIniciativa !== 'todas') {
      parametros.set('iniciativa', filtroIniciativa)
    }
    if (filtroVentana !== 'todas') {
      parametros.set('ventana', filtroVentana)
    }
    if (filtroEtapa !== 'todas') {
      parametros.set('etapa', filtroEtapa)
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
    filtroPrioridad,
    filtroObjetivo,
    filtroIniciativa,
    filtroVentana,
    filtroEtapa,
    paginacion.paginaActual,
    paginacion.tamanoPagina,
    setSearchParams
  ])

  const iniciativaPorId = useMemo(() => {
    return new Map(iniciativas.map((iniciativa) => [iniciativa.id, iniciativa.nombre]))
  }, [iniciativas])

  const ventanaPorId = useMemo(() => {
    return new Map(ventanas.map((ventana) => [ventana.id, ventana.etiqueta_visible]))
  }, [ventanas])

  const etapaPorId = useMemo(() => {
    return new Map(etapas.map((etapa) => [etapa.id, etapa.etiqueta_visible]))
  }, [etapas])

  const iniciativaPlanificacion = useMemo(() => {
    return new Map<string, { ventana: string; etapa: string }>(
      iniciativas.map((iniciativa) => [
        iniciativa.id,
        {
          ventana: ventanaPorId.get(iniciativa.ventana_planificada_id ?? '') ?? 'Sin asignar',
          etapa: etapaPorId.get(iniciativa.etapa_id ?? '') ?? 'Sin asignar'
        }
      ])
    )
  }, [iniciativas, ventanaPorId, etapaPorId])

  const resumenMatriz = useMemo(() => {
    const top3 = [...matrices].sort((a, b) => b.puntaje_valor - a.puntaje_valor).slice(0, 3)

    const distribucion = estadosRegistro.map((estado) => ({
      estado,
      total: matrices.filter((matriz) => matriz.estado === estado).length
    }))

    return {
      total: matrices.length,
      top3,
      distribucion
    }
  }, [matrices])

  const clasesBadgeEstado = (estado: string) => {
    if (estado === 'completado') {
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
    }
    if (estado === 'en_progreso') {
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
    }
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
  }

  const abrirModal = (modo: ModoModal, matriz?: MatrizValor) => {
    setModoModal(modo)
    setMatrizActiva(matriz ?? null)
    setModalAbierto(true)
    reset({
      iniciativa_id: matriz?.iniciativa_id ?? '',
      titulo: matriz?.titulo ?? '',
      valor_negocio: matriz?.valor_negocio ?? 10,
      esfuerzo: matriz?.esfuerzo ?? 10,
      riesgo: matriz?.riesgo ?? 10,
      estado: matriz?.estado ?? 'pendiente',
      prioridad: matriz?.prioridad ?? 'media'
    })
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Matriz de valor</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Evalúa valor por iniciativa con puntaje automático de priorización.
        </p>
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
        <input
          type="search"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar en matriz"
          aria-label="Buscar en matriz de valor"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800"
        />
        <select
          value={filtroEstado}
          onChange={(evento) =>
            setFiltroEstado(evento.target.value as 'todos' | (typeof estadosRegistro)[number])
          }
          aria-label="Filtrar matriz por estado"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todos">Estado: todos</option>
          {estadosRegistro.map((estado) => (
            <option key={estado} value={estado}>
              Estado: {estado}
            </option>
          ))}
        </select>
        <select
          value={filtroObjetivo}
          onChange={(evento) => {
            setFiltroObjetivo(evento.target.value)
            setFiltroIniciativa('todas')
            paginacion.setPaginaActual(1)
          }}
          aria-label="Filtrar matriz por objetivo"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todos">Objetivo: todos</option>
          {objetivos.map((objetivo) => (
            <option key={objetivo.id} value={objetivo.id}>
              {objetivo.nombre}
            </option>
          ))}
        </select>
        <select
          value={filtroIniciativa}
          onChange={(evento) => {
            setFiltroIniciativa(evento.target.value)
            paginacion.setPaginaActual(1)
          }}
          aria-label="Filtrar matriz por iniciativa"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todas">Iniciativa: todas</option>
          {iniciativasDisponibles.map((iniciativa) => (
            <option key={iniciativa.id} value={iniciativa.id}>
              {iniciativa.nombre}
            </option>
          ))}
        </select>
        <select
          value={filtroPrioridad}
          onChange={(evento) =>
            setFiltroPrioridad(evento.target.value as 'todas' | (typeof prioridadesRegistro)[number])
          }
          aria-label="Filtrar matriz por prioridad"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todas">Prioridad: todas</option>
          {prioridadesRegistro.map((prioridad) => (
            <option key={prioridad} value={prioridad}>
              Prioridad: {prioridad}
            </option>
          ))}
        </select>
        <select
          value={filtroVentana}
          onChange={(evento) => {
            setFiltroVentana(evento.target.value)
            paginacion.setPaginaActual(1)
          }}
          aria-label="Filtrar matriz por ventana"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
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
          value={filtroEtapa}
          onChange={(evento) => {
            setFiltroEtapa(evento.target.value)
            paginacion.setPaginaActual(1)
          }}
          aria-label="Filtrar matriz por etapa"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todas">Etapa: todas</option>
          <option value="sin_asignar">Etapa: sin asignar</option>
          {etapas.map((etapa) => (
            <option key={etapa.id} value={etapa.id}>
              {etapa.etiqueta_visible}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setBusqueda('')
            setFiltroEstado('todos')
            setFiltroPrioridad('todas')
            setFiltroObjetivo('todos')
            setFiltroIniciativa('todas')
            setFiltroVentana('todas')
            setFiltroEtapa('todas')
            paginacion.setPaginaActual(1)
          }}
          aria-label="Limpiar filtros de matriz"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700"
        >
          Limpiar
        </button>
        <button
          type="button"
          disabled={!esEdicionPermitida}
          onClick={() => abrirModal('crear')}
          aria-label="Crear registro de matriz"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
        >
          Crear
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <article className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total de items</p>
          <p className="mt-1 text-xl font-semibold">{resumenMatriz.total}</p>
        </article>

        <article className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/70 lg:col-span-2">
          <h2 className="text-sm font-semibold">Top 3 por puntaje</h2>
          {resumenMatriz.top3.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Sin datos</p>
          ) : (
            <ul className="mt-2 grid gap-2 md:grid-cols-3">
              {resumenMatriz.top3.map((matriz) => (
                <li key={matriz.id} className="rounded-md border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                  <p className="truncate text-sm font-medium">{matriz.titulo}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {iniciativaPorId.get(matriz.iniciativa_id) ?? 'Sin iniciativa'}
                  </p>
                  <span className="mt-2 inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                    Puntaje: {matriz.puntaje_valor}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>

      <article className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/70">
        <h2 className="text-sm font-semibold">Distribución por estado</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {resumenMatriz.distribucion.map((registro) => (
            <span
              key={registro.estado}
              className={`inline-flex rounded-full px-2.5 py-1 text-xs ${clasesBadgeEstado(registro.estado)}`}
            >
              {registro.estado}: {registro.total}
            </span>
          ))}
        </div>
      </article>

      <EstadoVista
        cargando={cargando}
        error={error}
        vacio={matricesFiltradas.length === 0}
        mensajeVacio="No hay registros de matriz para los filtros seleccionados."
      >
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">Título</th>
                <th className="px-3 py-2">Iniciativa</th>
                <th className="px-3 py-2">Planificación</th>
                <th className="px-3 py-2 text-right">Puntaje</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginacion.itemsPaginados.map((matriz) => (
                <tr key={matriz.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-3 py-2">
                    <p className="font-medium">{matriz.titulo}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Prioridad: {matriz.prioridad}</p>
                  </td>
                  <td className="px-3 py-2">{iniciativaPorId.get(matriz.iniciativa_id) ?? 'Sin iniciativa'}</td>
                  <td className="px-3 py-2">
                    <p className="text-xs">{iniciativaPlanificacion.get(matriz.iniciativa_id)?.ventana ?? 'Sin asignar'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {iniciativaPlanificacion.get(matriz.iniciativa_id)?.etapa ?? 'Sin asignar'}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                      {matriz.puntaje_valor}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${clasesBadgeEstado(matriz.estado)}`}>
                      {matriz.estado}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => abrirModal('ver', matriz)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
                      >
                        Ver detalle
                      </button>
                      <button
                        type="button"
                        disabled={!esEdicionPermitida}
                        onClick={() => abrirModal('editar', matriz)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={!esEdicionPermitida}
                        onClick={() => {
                          if (window.confirm('¿Eliminar este registro de matriz?')) {
                            void eliminarMatrizValor(matriz.id).then(cargarInformacion).catch((errorInterno) => {
                              setError(
                                errorInterno instanceof Error
                                  ? errorInterno.message
                                  : 'No se pudo eliminar el registro'
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
        titulo={`${modoModal === 'crear' ? 'Crear' : modoModal === 'editar' ? 'Editar' : 'Ver'} matriz`}
        alCerrar={() => setModalAbierto(false)}
      >
        <form
          className="space-y-4"
          onSubmit={handleSubmit(async (valores) => {
            if (modoModal === 'ver') {
              return
            }

            try {
              if (modoModal === 'crear') {
                await crearMatrizValor(valores)
              }

              if (modoModal === 'editar' && matrizActiva) {
                await editarMatrizValor(matrizActiva.id, valores)
              }

              setModalAbierto(false)
              await cargarInformacion()
            } catch (errorInterno) {
              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar la matriz')
            }
          })}
        >
          <div>
            <label className="text-sm font-medium">Iniciativa</label>
            <select
              {...register('iniciativa_id')}
              disabled={modoModal === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">Selecciona una iniciativa</option>
              {iniciativas.map((iniciativa) => (
                <option key={iniciativa.id} value={iniciativa.id}>
                  {iniciativa.nombre}
                </option>
              ))}
            </select>
            {errors.iniciativa_id ? <p className="text-xs text-red-500">{errors.iniciativa_id.message}</p> : null}
          </div>

          <div>
            <label className="text-sm font-medium">Título</label>
            <input
              {...register('titulo')}
              readOnly={modoModal === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            {errors.titulo ? <p className="text-xs text-red-500">{errors.titulo.message}</p> : null}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Valor negocio</label>
              <input
                type="number"
                {...register('valor_negocio', { valueAsNumber: true })}
                readOnly={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Esfuerzo</label>
              <input
                type="number"
                {...register('esfuerzo', { valueAsNumber: true })}
                readOnly={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Riesgo</label>
              <input
                type="number"
                {...register('riesgo', { valueAsNumber: true })}
                readOnly={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300">
            Puntaje calculado automáticamente: <span className="font-semibold">{puntajeCalculado}</span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Estado</label>
              <select
                {...register('estado')}
                disabled={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {estadosRegistro.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Prioridad</label>
              <select
                {...register('prioridad')}
                disabled={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {prioridadesRegistro.map((prioridad) => (
                  <option key={prioridad} value={prioridad}>
                    {prioridad}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {modoModal !== 'ver' ? (
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-70 dark:bg-slate-200 dark:text-slate-900"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          ) : null}
        </form>
      </ModalPortal>
    </section>
  )
}
