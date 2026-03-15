import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  estadosRegistro,
  type CasoUsoPm,
  type CriterioAceptacionPm,
  type HistoriaUsuarioPm,
  type ReglaNegocioPm,
  type RequerimientoNoFuncionalPm
} from '@/dominio/modelos'
import {
  listarCasosUso,
  listarCriteriosAceptacion,
  listarHistoriasUsuario,
  listarReglasNegocio,
  listarRequerimientosNoFuncionales
} from '@/aplicacion/casos-uso/requerimientos'
import { listarEntregas } from '@/aplicacion/casos-uso/entregas'
import { listarIniciativas } from '@/aplicacion/casos-uso/iniciativas'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { formatearEstadoLegible, normalizarFechaPortal } from '@/compartido/utilidades/formatoPortal'
import { NavegacionRequerimientos } from '@/presentacion/paginas/requerimientos/NavegacionRequerimientos'

interface RegistroReciente {
  id: string
  entidad: string
  ruta: string
  titulo: string
  descripcion: string
  estado: string | null
  fecha: string
  vinculacion: string | null
}

function construirRecientes(
  historias: HistoriaUsuarioPm[],
  criterios: CriterioAceptacionPm[],
  casosUso: CasoUsoPm[],
  reglas: ReglaNegocioPm[],
  noFuncionales: RequerimientoNoFuncionalPm[]
) {
  const registros: RegistroReciente[] = [
    ...historias.map((historia) => ({
      id: historia.id,
      entidad: 'Historia de usuario',
      ruta: '/requerimientos/historias',
      titulo: historia.titulo,
      descripcion: historia.codigo,
      estado: historia.estado,
      fecha: historia.updated_at,
      vinculacion: [historia.iniciativa_id ? 'Iniciativa' : null, historia.entrega_id ? 'Entrega' : null].filter(Boolean).join(' · ') || null
    })),
    ...criterios.map((criterio) => ({
      id: criterio.id,
      entidad: 'Criterio de aceptación',
      ruta: '/requerimientos/historias',
      titulo: criterio.descripcion,
      descripcion: `Historia ${criterio.historia_usuario_id}`,
      estado: criterio.estado_validacion,
      fecha: criterio.updated_at,
      vinculacion: criterio.obligatorio ? 'Obligatorio' : 'Opcional'
    })),
    ...casosUso.map((caso) => ({
      id: caso.id,
      entidad: 'Caso de uso',
      ruta: '/requerimientos/casos-uso',
      titulo: caso.titulo,
      descripcion: caso.codigo,
      estado: caso.estado,
      fecha: caso.updated_at,
      vinculacion: caso.actor_principal
    })),
    ...reglas.map((regla) => ({
      id: regla.id,
      entidad: 'Regla de negocio',
      ruta: '/requerimientos/reglas-negocio',
      titulo: regla.nombre,
      descripcion: regla.codigo,
      estado: regla.estado,
      fecha: regla.updated_at,
      vinculacion: regla.categoria
    })),
    ...noFuncionales.map((requerimiento) => ({
      id: requerimiento.id,
      entidad: 'Requerimiento no funcional',
      ruta: '/requerimientos/no-funcionales',
      titulo: requerimiento.nombre,
      descripcion: requerimiento.codigo,
      estado: requerimiento.estado,
      fecha: requerimiento.updated_at,
      vinculacion: requerimiento.tipo
    }))
  ]

  return registros.sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 8)
}

export function PaginaResumenRequerimientos() {
  const [historias, setHistorias] = useState<HistoriaUsuarioPm[]>([])
  const [criterios, setCriterios] = useState<CriterioAceptacionPm[]>([])
  const [casosUso, setCasosUso] = useState<CasoUsoPm[]>([])
  const [reglas, setReglas] = useState<ReglaNegocioPm[]>([])
  const [noFuncionales, setNoFuncionales] = useState<RequerimientoNoFuncionalPm[]>([])
  const [totalIniciativas, setTotalIniciativas] = useState(0)
  const [totalEntregas, setTotalEntregas] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = async () => {
    setCargando(true)
    setError(null)

    try {
      const [
        historiasData,
        criteriosData,
        casosUsoData,
        reglasData,
        noFuncionalesData,
        iniciativasData,
        entregasData
      ] = await Promise.all([
        listarHistoriasUsuario(),
        listarCriteriosAceptacion(),
        listarCasosUso(),
        listarReglasNegocio(),
        listarRequerimientosNoFuncionales(),
        listarIniciativas(),
        listarEntregas()
      ])

      setHistorias(historiasData)
      setCriterios(criteriosData)
      setCasosUso(casosUsoData)
      setReglas(reglasData)
      setNoFuncionales(noFuncionalesData)
      setTotalIniciativas(iniciativasData.length)
      setTotalEntregas(entregasData.length)
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar requerimientos')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const distribucionEstado = useMemo(() => {
    const registrosConEstado = [...historias, ...casosUso, ...reglas, ...noFuncionales]
    return estadosRegistro.map((estado) => ({
      estado,
      total: registrosConEstado.filter((registro) => registro.estado === estado).length
    }))
  }, [historias, casosUso, reglas, noFuncionales])

  const recientes = useMemo(
    () => construirRecientes(historias, criterios, casosUso, reglas, noFuncionales),
    [historias, criterios, casosUso, reglas, noFuncionales]
  )

  const historiasConIniciativa = useMemo(() => historias.filter((historia) => historia.iniciativa_id).length, [historias])
  const casosUsoConIniciativa = useMemo(() => casosUso.filter((caso) => caso.iniciativa_id).length, [casosUso])
  const rnfConIniciativa = useMemo(() => noFuncionales.filter((requerimiento) => requerimiento.iniciativa_id).length, [noFuncionales])
  const historiasConEntrega = useMemo(() => historias.filter((historia) => historia.entrega_id).length, [historias])
  const rnfConEntrega = useMemo(() => noFuncionales.filter((requerimiento) => requerimiento.entrega_id).length, [noFuncionales])

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Resumen de requerimientos</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Consolida historias, criterios, casos de uso, reglas de negocio y requerimientos no funcionales sin volverlos obligatorios para otros módulos.
          </p>
        </div>
        <NavegacionRequerimientos />
      </header>

      <EstadoVista cargando={cargando} error={error} vacio={false} mensajeVacio="">
        <>
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Historias</p>
              <p className="mt-2 text-2xl font-semibold">{historias.length}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Criterios</p>
              <p className="mt-2 text-2xl font-semibold">{criterios.length}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Casos de uso</p>
              <p className="mt-2 text-2xl font-semibold">{casosUso.length}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Reglas</p>
              <p className="mt-2 text-2xl font-semibold">{reglas.length}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">No funcionales</p>
              <p className="mt-2 text-2xl font-semibold">{noFuncionales.length}</p>
            </article>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Distribución por estado</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Historias, casos de uso, reglas de negocio y requerimientos no funcionales.
                  </p>
                </div>
                <Link to="/requerimientos/historias" className="text-sm font-medium text-slate-700 underline underline-offset-2 dark:text-slate-200">
                  Ir a historias
                </Link>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {distribucionEstado.map((item) => (
                  <div key={item.estado} className="rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-800">
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {formatearEstadoLegible(item.estado)}
                    </p>
                    <p className="mt-2 text-2xl font-semibold">{item.total}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-base font-semibold">Vínculos opcionales</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-800">
                  <p className="font-medium">Requerimientos vinculados a iniciativas</p>
                  <p className="mt-1 text-2xl font-semibold">{historiasConIniciativa + casosUsoConIniciativa + rnfConIniciativa}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {historiasConIniciativa} historias · {casosUsoConIniciativa} casos de uso · {rnfConIniciativa} RNF sobre {totalIniciativas} iniciativas
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-800">
                  <p className="font-medium">Requerimientos vinculados a entregas</p>
                  <p className="mt-1 text-2xl font-semibold">{historiasConEntrega + rnfConEntrega}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {historiasConEntrega} historias · {rnfConEntrega} RNF sobre {totalEntregas} entregas
                  </p>
                </div>
              </div>
            </article>
          </div>

          <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Recientes</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Últimos movimientos del módulo Requerimientos.</p>
              </div>
              <Link to="/trazabilidad" className="text-sm font-medium text-slate-700 underline underline-offset-2 dark:text-slate-200">
                Ver trazabilidad
              </Link>
            </div>

            {recientes.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Requerimientos todavía no tiene registros. Empieza por <Link to="/requerimientos/historias" className="font-medium underline underline-offset-2">Historias</Link>.
              </div>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {recientes.map((registro) => (
                  <Link
                    key={`${registro.entidad}-${registro.id}`}
                    to={registro.ruta}
                    className="rounded-lg border border-slate-200 px-3 py-3 transition hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{registro.entidad}</p>
                        <p className="mt-1 font-medium">{registro.titulo}</p>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{normalizarFechaPortal(registro.fecha)}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{registro.descripcion}</p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {registro.estado ? formatearEstadoLegible(registro.estado) : 'Sin estado'}
                      {registro.vinculacion ? ` · ${registro.vinculacion}` : ''}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </article>
        </>
      </EstadoVista>
    </section>
  )
}