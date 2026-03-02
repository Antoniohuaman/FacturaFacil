import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarObjetivos } from '@/aplicacion/casos-uso/objetivos'
import { listarIniciativas } from '@/aplicacion/casos-uso/iniciativas'
import { listarEntregas } from '@/aplicacion/casos-uso/entregas'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { estadosRegistro, type Entrega, type Iniciativa, type Objetivo } from '@/dominio/modelos'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'

export function PaginaRoadmap() {
  const navigate = useNavigate()
  const { rol } = useSesionPortalPM()

  const [objetivos, setObjetivos] = useState<Objetivo[]>([])
  const [iniciativas, setIniciativas] = useState<Iniciativa[]>([])
  const [entregas, setEntregas] = useState<Entrega[]>([])
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
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar roadmap')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargarRoadmap()
  }, [])

  const objetivoPorId = useMemo(() => {
    return new Map(objetivos.map((objetivo) => [objetivo.id, objetivo.nombre]))
  }, [objetivos])

  const iniciativaPorId = useMemo(() => {
    return new Map(iniciativas.map((iniciativa) => [iniciativa.id, iniciativa.nombre]))
  }, [iniciativas])

  const topIniciativasRice = useMemo(() => {
    return [...iniciativas]
      .sort((iniciativaA, iniciativaB) => iniciativaB.rice - iniciativaA.rice)
      .slice(0, 5)
  }, [iniciativas])

  const proximasEntregas = useMemo(() => {
    return entregas
      .filter((entrega) => Boolean(entrega.fecha_objetivo))
      .sort((entregaA, entregaB) => {
        return new Date(entregaA.fecha_objetivo ?? '').getTime() - new Date(entregaB.fecha_objetivo ?? '').getTime()
      })
      .slice(0, 5)
  }, [entregas])

  const totalPorEstado = useMemo(() => {
    const registros = [...objetivos, ...iniciativas, ...entregas]

    return estadosRegistro.map((estado) => ({
      estado,
      total: registros.filter((registro) => registro.estado === estado).length
    }))
  }, [objetivos, iniciativas, entregas])

  const hayDatosRoadmap = objetivos.length > 0 || iniciativas.length > 0 || entregas.length > 0

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
          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-semibold">Resumen</h2>

              {hayDatosRoadmap ? (
                <div className="mt-3 space-y-2 text-sm">
                  <p>Objetivos: {objetivos.length}</p>
                  <p>Iniciativas: {iniciativas.length}</p>
                  <p>Entregas: {entregas.length}</p>
                  <div className="mt-2 border-t border-slate-200 pt-2 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-400">
                    {totalPorEstado.map((registro) => (
                      <p key={registro.estado}>
                        {registro.estado}: {registro.total}
                      </p>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <p>Aún no hay objetivos/iniciativas/entregas.</p>
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
              )}
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-semibold">Prioridad</h2>

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
                    <li key={iniciativa.id} className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                      <p className="font-medium">{iniciativa.nombre}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Objetivo: {objetivoPorId.get(iniciativa.objetivo_id ?? '') ?? 'Sin objetivo'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        RICE: {iniciativa.rice} · Estado: {iniciativa.estado}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-semibold">Seguimiento</h2>

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
                <ul className="mt-3 space-y-2 text-sm">
                  {proximasEntregas.map((entrega) => (
                    <li key={entrega.id} className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                      <p className="font-medium">{entrega.nombre}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Iniciativa: {iniciativaPorId.get(entrega.iniciativa_id ?? '') ?? 'Sin iniciativa'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Fecha objetivo: {entrega.fecha_objetivo} · Estado: {entrega.estado}
                      </p>
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
