import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { iniciativaSchema, type IniciativaEntrada } from '@/compartido/validacion/esquemas'
import { estadosRegistro, prioridadesRegistro, type Iniciativa, type Objetivo } from '@/dominio/modelos'
import {
  crearIniciativa,
  editarIniciativa,
  eliminarIniciativa,
  listarIniciativas
} from '@/aplicacion/casos-uso/iniciativas'
import { listarObjetivos } from '@/aplicacion/casos-uso/objetivos'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'

type ModoModal = 'crear' | 'ver' | 'editar'

function calcularRice(entrada: Pick<IniciativaEntrada, 'alcance' | 'impacto' | 'confianza' | 'esfuerzo'>) {
  return Number(((entrada.alcance * entrada.impacto * entrada.confianza) / entrada.esfuerzo).toFixed(2))
}

export function PaginaIniciativasRoadmap() {
  const { rol } = useSesionPortalPM()
  const [iniciativas, setIniciativas] = useState<Iniciativa[]>([])
  const [objetivos, setObjetivos] = useState<Objetivo[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | (typeof estadosRegistro)[number]>('todos')
  const [filtroPrioridad, setFiltroPrioridad] = useState<'todas' | (typeof prioridadesRegistro)[number]>('todas')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [iniciativaActiva, setIniciativaActiva] = useState<Iniciativa | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<IniciativaEntrada>({
    resolver: zodResolver(iniciativaSchema),
    defaultValues: {
      objetivo_id: null,
      nombre: '',
      descripcion: '',
      alcance: 10,
      impacto: 10,
      confianza: 10,
      esfuerzo: 10,
      estado: 'pendiente',
      prioridad: 'media'
    }
  })

  const esEdicionPermitida = puedeEditar(rol)

  const alcance = watch('alcance')
  const impacto = watch('impacto')
  const confianza = watch('confianza')
  const esfuerzo = watch('esfuerzo')
  const riceCalculado = useMemo(
    () => calcularRice({ alcance, impacto, confianza, esfuerzo }),
    [alcance, impacto, confianza, esfuerzo]
  )

  const cargarInformacion = async () => {
    setCargando(true)
    setError(null)
    try {
      const [listaIniciativas, listaObjetivos] = await Promise.all([listarIniciativas(), listarObjetivos()])
      setIniciativas(listaIniciativas)
      setObjetivos(listaObjetivos)
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar iniciativas')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargarInformacion()
  }, [])

  const iniciativasFiltradas = useMemo(() => {
    return iniciativas.filter((iniciativa) => {
      const coincideBusqueda =
        iniciativa.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        iniciativa.descripcion.toLowerCase().includes(busqueda.toLowerCase())

      const coincideEstado = filtroEstado === 'todos' ? true : iniciativa.estado === filtroEstado
      const coincidePrioridad = filtroPrioridad === 'todas' ? true : iniciativa.prioridad === filtroPrioridad

      return coincideBusqueda && coincideEstado && coincidePrioridad
    })
  }, [iniciativas, busqueda, filtroEstado, filtroPrioridad])

  const objetivoPorId = useMemo(() => {
    return new Map(objetivos.map((objetivo) => [objetivo.id, objetivo.nombre]))
  }, [objetivos])

  const abrirModal = (modo: ModoModal, iniciativa?: Iniciativa) => {
    setModoModal(modo)
    setIniciativaActiva(iniciativa ?? null)
    setModalAbierto(true)
    reset({
      objetivo_id: iniciativa?.objetivo_id ?? null,
      nombre: iniciativa?.nombre ?? '',
      descripcion: iniciativa?.descripcion ?? '',
      alcance: iniciativa?.alcance ?? 10,
      impacto: iniciativa?.impacto ?? 10,
      confianza: iniciativa?.confianza ?? 10,
      esfuerzo: iniciativa?.esfuerzo ?? 10,
      estado: iniciativa?.estado ?? 'pendiente',
      prioridad: iniciativa?.prioridad ?? 'media'
    })
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Roadmap de iniciativas</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Gestiona iniciativas y prioriza usando cálculo RICE automático.
        </p>
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
        <input
          type="search"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar iniciativa"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800"
        />
        <select
          value={filtroEstado}
          onChange={(evento) =>
            setFiltroEstado(evento.target.value as 'todos' | (typeof estadosRegistro)[number])
          }
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
          value={filtroPrioridad}
          onChange={(evento) =>
            setFiltroPrioridad(evento.target.value as 'todas' | (typeof prioridadesRegistro)[number])
          }
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todas">Prioridad: todas</option>
          {prioridadesRegistro.map((prioridad) => (
            <option key={prioridad} value={prioridad}>
              Prioridad: {prioridad}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!esEdicionPermitida}
          onClick={() => abrirModal('crear')}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
        >
          Crear
        </button>
      </div>

      <EstadoVista
        cargando={cargando}
        error={error}
        vacio={iniciativasFiltradas.length === 0}
        mensajeVacio="No hay iniciativas para los filtros seleccionados."
      >
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">Iniciativa</th>
                <th className="px-3 py-2">Objetivo</th>
                <th className="px-3 py-2">RICE</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {iniciativasFiltradas.map((iniciativa) => (
                <tr key={iniciativa.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-3 py-2">
                    <p className="font-medium">{iniciativa.nombre}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{iniciativa.descripcion}</p>
                  </td>
                  <td className="px-3 py-2">{objetivoPorId.get(iniciativa.objetivo_id ?? '') ?? 'Sin objetivo'}</td>
                  <td className="px-3 py-2 font-semibold">{iniciativa.rice}</td>
                  <td className="px-3 py-2">{iniciativa.estado}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => abrirModal('ver', iniciativa)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        disabled={!esEdicionPermitida}
                        onClick={() => abrirModal('editar', iniciativa)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={!esEdicionPermitida}
                        onClick={() => {
                          if (window.confirm('¿Eliminar esta iniciativa?')) {
                            void eliminarIniciativa(iniciativa.id).then(cargarInformacion).catch((errorInterno) => {
                              setError(
                                errorInterno instanceof Error
                                  ? errorInterno.message
                                  : 'No se pudo eliminar la iniciativa'
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
      </EstadoVista>

      <ModalPortal
        abierto={modalAbierto}
        titulo={`${modoModal === 'crear' ? 'Crear' : modoModal === 'editar' ? 'Editar' : 'Ver'} iniciativa`}
        alCerrar={() => setModalAbierto(false)}
      >
        <form
          className="space-y-4"
          onSubmit={handleSubmit(async (valores) => {
            if (modoModal === 'ver') {
              return
            }

            try {
              const carga = {
                ...valores,
                objetivo_id: valores.objetivo_id || null
              }

              if (modoModal === 'crear') {
                await crearIniciativa(carga)
              }

              if (modoModal === 'editar' && iniciativaActiva) {
                await editarIniciativa(iniciativaActiva.id, carga)
              }

              setModalAbierto(false)
              await cargarInformacion()
            } catch (errorInterno) {
              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar la iniciativa')
            }
          })}
        >
          <div>
            <label className="text-sm font-medium">Objetivo</label>
            <select
              {...register('objetivo_id')}
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
          </div>

          <div>
            <label className="text-sm font-medium">Nombre</label>
            <input
              {...register('nombre')}
              readOnly={modoModal === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            {errors.nombre ? <p className="text-xs text-red-500">{errors.nombre.message}</p> : null}
          </div>

          <div>
            <label className="text-sm font-medium">Descripción</label>
            <textarea
              {...register('descripcion')}
              readOnly={modoModal === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            {errors.descripcion ? <p className="text-xs text-red-500">{errors.descripcion.message}</p> : null}
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium">Alcance</label>
              <input
                type="number"
                {...register('alcance', { valueAsNumber: true })}
                readOnly={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Impacto</label>
              <input
                type="number"
                {...register('impacto', { valueAsNumber: true })}
                readOnly={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Confianza</label>
              <input
                type="number"
                {...register('confianza', { valueAsNumber: true })}
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
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
            RICE calculado automáticamente: <span className="font-semibold">{riceCalculado}</span>
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
