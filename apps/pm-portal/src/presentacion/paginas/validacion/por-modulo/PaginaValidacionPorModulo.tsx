import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'react-router-dom'
import {
  planValidacionSchema,
  plantillaValidacionSchema,
  type PlanValidacionEntrada,
  type PlantillaValidacionEntrada
} from '@/compartido/validacion/esquemas'
import type { CatalogoEstadoPm, CatalogoModuloPm, PlanValidacion, PlantillaValidacion } from '@/dominio/modelos'
import {
  crearPlanValidacion,
  crearPlantillaValidacion,
  editarPlanValidacion,
  editarPlantillaValidacion,
  eliminarPlanValidacion,
  eliminarPlantillaValidacion,
  listarPlanesValidacion,
  listarPlantillasValidacion
} from '@/aplicacion/casos-uso/validaciones'
import { listarEstadosPm, listarModulosPm } from '@/aplicacion/casos-uso/ajustes'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'
import { usePaginacion } from '@/compartido/utilidades/usePaginacion'
import { PaginacionTabla } from '@/compartido/ui/PaginacionTabla'
import { exportarCsv } from '@/compartido/utilidades/csv'
import { formatearEstadoLegible, normalizarFechaPortal } from '@/compartido/utilidades/formatoPortal'

type ModoModal = 'crear' | 'ver' | 'editar'

export function PaginaValidacionPorModulo() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paginaInicial = Number(searchParams.get('pagina') ?? '1')
  const tamanoInicial = Number(searchParams.get('tamano') ?? '10')
  const { rol } = useSesionPortalPM()
  const [modulos, setModulos] = useState<CatalogoModuloPm[]>([])
  const [estados, setEstados] = useState<CatalogoEstadoPm[]>([])
  const [planes, setPlanes] = useState<PlanValidacion[]>([])
  const [plantillas, setPlantillas] = useState<PlantillaValidacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState(searchParams.get('q') ?? '')
  const [filtroModulo, setFiltroModulo] = useState(searchParams.get('modulo') ?? 'todos')
  const [filtroEstado, setFiltroEstado] = useState(searchParams.get('estado') ?? 'todos')

  const [modalPlanAbierto, setModalPlanAbierto] = useState(false)
  const [modoPlan, setModoPlan] = useState<ModoModal>('crear')
  const [planActivo, setPlanActivo] = useState<PlanValidacion | null>(null)

  const [modalPlantillaAbierto, setModalPlantillaAbierto] = useState(false)
  const [modoPlantilla, setModoPlantilla] = useState<ModoModal>('crear')
  const [plantillaActiva, setPlantillaActiva] = useState<PlantillaValidacion | null>(null)

  const esEdicionPermitida = puedeEditar(rol)

  const formularioPlan = useForm<PlanValidacionEntrada>({
    resolver: zodResolver(planValidacionSchema),
    defaultValues: {
      modulo_id: '',
      plantilla_id: null,
      nombre: '',
      criterios: '',
      evidencias_esperadas: '',
      owner: null,
      estado_codigo: '',
      fecha_inicio: null,
      fecha_fin: null,
      notas: null
    }
  })

  const formularioPlantilla = useForm<PlantillaValidacionEntrada>({
    resolver: zodResolver(plantillaValidacionSchema),
    defaultValues: {
      modulo_id: '',
      nombre: '',
      criterios: '',
      evidencias_esperadas: '',
      activo: true
    }
  })

  const cargar = async () => {
    setCargando(true)
    setError(null)
    try {
      const [modulosData, estadosData, planesData, plantillasData] = await Promise.all([
        listarModulosPm(),
        listarEstadosPm('validacion_plan'),
        listarPlanesValidacion(),
        listarPlantillasValidacion()
      ])

      setModulos(modulosData.filter((modulo) => modulo.activo))
      setEstados(estadosData.filter((estado) => estado.activo))
      setPlanes(planesData)
      setPlantillas(plantillasData)
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar validación por módulo')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const moduloPorId = useMemo(() => {
    return new Map(modulos.map((modulo) => [modulo.id, modulo.nombre]))
  }, [modulos])

  const plantillasPorId = useMemo(() => {
    return new Map(plantillas.map((plantilla) => [plantilla.id, plantilla]))
  }, [plantillas])

  const planesFiltrados = useMemo(() => {
    const termino = busqueda.toLowerCase()
    return planes.filter((plan) => {
      const nombreModulo = moduloPorId.get(plan.modulo_id) ?? ''
      const coincideModulo = filtroModulo === 'todos' ? true : plan.modulo_id === filtroModulo
      const coincideEstado = filtroEstado === 'todos' ? true : plan.estado_codigo === filtroEstado

      return (
        plan.nombre.toLowerCase().includes(termino) ||
        plan.estado_codigo.toLowerCase().includes(termino) ||
        nombreModulo.toLowerCase().includes(termino)
      ) && coincideModulo && coincideEstado
    })
  }, [planes, busqueda, moduloPorId, filtroModulo, filtroEstado])

  const paginacion = usePaginacion({
    items: planesFiltrados,
    paginaInicial: Number.isFinite(paginaInicial) && paginaInicial > 0 ? paginaInicial : 1,
    tamanoInicial: [10, 25, 50].includes(tamanoInicial) ? tamanoInicial : 10
  })

  useEffect(() => {
    const parametros = new URLSearchParams()

    if (busqueda) {
      parametros.set('q', busqueda)
    }
    if (filtroModulo !== 'todos') {
      parametros.set('modulo', filtroModulo)
    }
    if (filtroEstado !== 'todos') {
      parametros.set('estado', filtroEstado)
    }
    if (paginacion.paginaActual > 1) {
      parametros.set('pagina', String(paginacion.paginaActual))
    }
    if (paginacion.tamanoPagina !== 10) {
      parametros.set('tamano', String(paginacion.tamanoPagina))
    }

    setSearchParams(parametros, { replace: true })
  }, [busqueda, filtroModulo, filtroEstado, paginacion.paginaActual, paginacion.tamanoPagina, setSearchParams])

  const abrirModalPlan = (modo: ModoModal, plan?: PlanValidacion) => {
    setModoPlan(modo)
    setPlanActivo(plan ?? null)
    setModalPlanAbierto(true)
    formularioPlan.reset({
      modulo_id: plan?.modulo_id ?? modulos[0]?.id ?? '',
      plantilla_id: plan?.plantilla_id ?? null,
      nombre: plan?.nombre ?? '',
      criterios: plan?.criterios ?? '',
      evidencias_esperadas: plan?.evidencias_esperadas ?? '',
      owner: plan?.owner ?? null,
      estado_codigo: plan?.estado_codigo ?? estados[0]?.codigo ?? '',
      fecha_inicio: plan?.fecha_inicio ?? null,
      fecha_fin: plan?.fecha_fin ?? null,
      notas: plan?.notas ?? null
    })
  }

  const abrirModalPlantilla = (modo: ModoModal, plantilla?: PlantillaValidacion) => {
    setModoPlantilla(modo)
    setPlantillaActiva(plantilla ?? null)
    setModalPlantillaAbierto(true)
    formularioPlantilla.reset({
      modulo_id: plantilla?.modulo_id ?? modulos[0]?.id ?? '',
      nombre: plantilla?.nombre ?? '',
      criterios: plantilla?.criterios ?? '',
      evidencias_esperadas: plantilla?.evidencias_esperadas ?? '',
      activo: plantilla?.activo ?? true
    })
  }

  const aplicarPlantillaAFormulario = (plantillaId: string | null | undefined) => {
    if (!plantillaId) {
      return
    }
    const plantilla = plantillasPorId.get(plantillaId)
    if (!plantilla) {
      return
    }

    formularioPlan.setValue('modulo_id', plantilla.modulo_id)
    if (!formularioPlan.getValues('nombre').trim()) {
      formularioPlan.setValue('nombre', plantilla.nombre)
    }
    formularioPlan.setValue('criterios', plantilla.criterios)
    formularioPlan.setValue('evidencias_esperadas', plantilla.evidencias_esperadas)
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Validación por módulo</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Administra planes/checklist por módulo y sus plantillas reutilizables.
        </p>
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3 dark:border-slate-800 dark:bg-slate-900">
        <input
          type="search"
          value={busqueda}
          onChange={(evento) => {
            setBusqueda(evento.target.value)
            paginacion.setPaginaActual(1)
          }}
          placeholder="Buscar por módulo, nombre o estado"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        />
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
        <button
          type="button"
          onClick={() => {
            setBusqueda('')
            setFiltroModulo('todos')
            setFiltroEstado('todos')
            paginacion.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700"
        >
          Limpiar filtros
        </button>
        <button
          type="button"
          onClick={() => {
            exportarCsv('validacion-por-modulo.csv', [
              { encabezado: 'Plan', valor: (plan) => plan.nombre },
              { encabezado: 'Módulo', valor: (plan) => moduloPorId.get(plan.modulo_id) ?? 'No disponible' },
              { encabezado: 'Estado', valor: (plan) => formatearEstadoLegible(plan.estado_codigo) },
              { encabezado: 'Owner', valor: (plan) => plan.owner ?? 'Sin owner' },
              { encabezado: 'Fecha inicio', valor: (plan) => normalizarFechaPortal(plan.fecha_inicio) },
              { encabezado: 'Fecha fin', valor: (plan) => normalizarFechaPortal(plan.fecha_fin) },
              { encabezado: 'Notas', valor: (plan) => plan.notas ?? '' }
            ], planesFiltrados)
          }}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700"
        >
          Exportar CSV
        </button>
        <button
          type="button"
          disabled={!esEdicionPermitida}
          onClick={() => abrirModalPlantilla('crear')}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-slate-700"
        >
          Crear plantilla
        </button>
        <button
          type="button"
          disabled={!esEdicionPermitida}
          onClick={() => abrirModalPlan('crear')}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
        >
          Crear plan
        </button>
      </div>

      <EstadoVista
        cargando={cargando}
        error={error}
        vacio={planesFiltrados.length === 0}
        mensajeVacio="No hay planes de validación para mostrar."
      >
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Módulo</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Owner</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginacion.itemsPaginados.map((plan) => (
                <tr key={plan.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-3 py-2">
                    <p className="font-medium">{plan.nombre}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{plan.fecha_inicio ?? 'Sin inicio'} → {plan.fecha_fin ?? 'Sin fin'}</p>
                  </td>
                  <td className="px-3 py-2">{moduloPorId.get(plan.modulo_id) ?? 'No disponible'}</td>
                  <td className="px-3 py-2">{plan.estado_codigo}</td>
                  <td className="px-3 py-2">{plan.owner ?? 'Sin owner'}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => abrirModalPlan('ver', plan)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        disabled={!esEdicionPermitida}
                        onClick={() => abrirModalPlan('editar', plan)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={!esEdicionPermitida}
                        onClick={() => {
                          if (window.confirm('¿Eliminar este plan de validación?')) {
                            void eliminarPlanValidacion(plan.id).then(cargar).catch((errorInterno) => {
                              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar el plan')
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

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold">Plantillas configuradas</h2>
        {plantillas.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No hay plantillas todavía.</p>
        ) : (
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {plantillas.map((plantilla) => (
              <li key={plantilla.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                <p className="font-medium">{plantilla.nombre}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {moduloPorId.get(plantilla.modulo_id) ?? 'No disponible'} · {plantilla.activo ? 'Activa' : 'Inactiva'}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => abrirModalPlantilla('ver', plantilla)}
                    className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
                  >
                    Ver
                  </button>
                  <button
                    type="button"
                    disabled={!esEdicionPermitida}
                    onClick={() => abrirModalPlantilla('editar', plantilla)}
                    className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={!esEdicionPermitida}
                    onClick={() => {
                      if (window.confirm('¿Eliminar esta plantilla?')) {
                        void eliminarPlantillaValidacion(plantilla.id).then(cargar).catch((errorInterno) => {
                          setError(
                            errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar la plantilla'
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
        )}
      </div>

      <ModalPortal
        abierto={modalPlanAbierto}
        titulo={`${modoPlan === 'crear' ? 'Crear' : modoPlan === 'editar' ? 'Editar' : 'Ver'} plan de validación`}
        alCerrar={() => setModalPlanAbierto(false)}
      >
        <form
          className="space-y-4"
          onSubmit={formularioPlan.handleSubmit(async (valores) => {
            if (modoPlan === 'ver') {
              return
            }

            try {
              if (modoPlan === 'crear') {
                await crearPlanValidacion(valores)
              }

              if (modoPlan === 'editar' && planActivo) {
                await editarPlanValidacion(planActivo.id, valores)
              }

              setModalPlanAbierto(false)
              await cargar()
            } catch (errorInterno) {
              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar el plan')
            }
          })}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Módulo</label>
              <select
                {...formularioPlan.register('modulo_id')}
                disabled={modoPlan === 'ver'}
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
            <div>
              <label className="text-sm font-medium">Plantilla</label>
              <select
                {...formularioPlan.register('plantilla_id')}
                disabled={modoPlan === 'ver'}
                onChange={(evento) => {
                  const valor = evento.target.value || null
                  formularioPlan.setValue('plantilla_id', valor)
                  aplicarPlantillaAFormulario(valor)
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">Sin plantilla</option>
                {plantillas.map((plantilla) => (
                  <option key={plantilla.id} value={plantilla.id}>
                    {plantilla.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Nombre</label>
            <input
              {...formularioPlan.register('nombre')}
              readOnly={modoPlan === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Criterios</label>
            <textarea
              {...formularioPlan.register('criterios')}
              readOnly={modoPlan === 'ver'}
              className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Evidencias esperadas</label>
            <textarea
              {...formularioPlan.register('evidencias_esperadas')}
              readOnly={modoPlan === 'ver'}
              className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium">Owner</label>
              <input
                {...formularioPlan.register('owner')}
                readOnly={modoPlan === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Estado</label>
              <select
                {...formularioPlan.register('estado_codigo')}
                disabled={modoPlan === 'ver'}
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
              <label className="text-sm font-medium">Fecha inicio</label>
              <input
                type="date"
                {...formularioPlan.register('fecha_inicio')}
                readOnly={modoPlan === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Fecha fin</label>
              <input
                type="date"
                {...formularioPlan.register('fecha_fin')}
                readOnly={modoPlan === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Notas</label>
            <textarea
              {...formularioPlan.register('notas')}
              readOnly={modoPlan === 'ver'}
              className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          {modoPlan !== 'ver' ? (
            <button
              type="submit"
              disabled={formularioPlan.formState.isSubmitting}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-70 dark:bg-slate-200 dark:text-slate-900"
            >
              {formularioPlan.formState.isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          ) : null}
        </form>
      </ModalPortal>

      <ModalPortal
        abierto={modalPlantillaAbierto}
        titulo={`${modoPlantilla === 'crear' ? 'Crear' : modoPlantilla === 'editar' ? 'Editar' : 'Ver'} plantilla`}
        alCerrar={() => setModalPlantillaAbierto(false)}
      >
        <form
          className="space-y-4"
          onSubmit={formularioPlantilla.handleSubmit(async (valores) => {
            if (modoPlantilla === 'ver') {
              return
            }

            try {
              if (modoPlantilla === 'crear') {
                await crearPlantillaValidacion(valores)
              }

              if (modoPlantilla === 'editar' && plantillaActiva) {
                await editarPlantillaValidacion(plantillaActiva.id, valores)
              }

              setModalPlantillaAbierto(false)
              await cargar()
            } catch (errorInterno) {
              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar la plantilla')
            }
          })}
        >
          <div>
            <label className="text-sm font-medium">Módulo</label>
            <select
              {...formularioPlantilla.register('modulo_id')}
              disabled={modoPlantilla === 'ver'}
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

          <div>
            <label className="text-sm font-medium">Nombre</label>
            <input
              {...formularioPlantilla.register('nombre')}
              readOnly={modoPlantilla === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Criterios</label>
            <textarea
              {...formularioPlantilla.register('criterios')}
              readOnly={modoPlantilla === 'ver'}
              className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Evidencias esperadas</label>
            <textarea
              {...formularioPlantilla.register('evidencias_esperadas')}
              readOnly={modoPlantilla === 'ver'}
              className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...formularioPlantilla.register('activo')} disabled={modoPlantilla === 'ver'} />
            Activa
          </label>

          {modoPlantilla !== 'ver' ? (
            <button
              type="submit"
              disabled={formularioPlantilla.formState.isSubmitting}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-70 dark:bg-slate-200 dark:text-slate-900"
            >
              {formularioPlantilla.formState.isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          ) : null}
        </form>
      </ModalPortal>
    </section>
  )
}
