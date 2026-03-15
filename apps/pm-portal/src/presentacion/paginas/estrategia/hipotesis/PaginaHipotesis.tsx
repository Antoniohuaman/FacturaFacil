import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { hipotesisSchema, type HipotesisEntrada } from '@/compartido/validacion/esquemas'
import type { HipotesisPm, Iniciativa, PeriodoEstrategicoPm, RelIniciativaHipotesisPm } from '@/dominio/modelos'
import { estadosRegistro, prioridadesRegistro } from '@/dominio/modelos'
import {
  crearHipotesisPm,
  editarHipotesisPm,
  eliminarHipotesisPm,
  listarHipotesisPm,
  listarPeriodosEstrategicos,
  listarRelIniciativaHipotesis
} from '@/aplicacion/casos-uso/estrategia'
import { listarIniciativas } from '@/aplicacion/casos-uso/iniciativas'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { NavegacionEstrategia } from '@/presentacion/paginas/estrategia/NavegacionEstrategia'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'

type ModoModal = 'crear' | 'editar' | 'ver'

export function PaginaHipotesis() {
  const { rol } = useSesionPortalPM()
  const [periodos, setPeriodos] = useState<PeriodoEstrategicoPm[]>([])
  const [hipotesis, setHipotesis] = useState<HipotesisPm[]>([])
  const [iniciativas, setIniciativas] = useState<Iniciativa[]>([])
  const [relaciones, setRelaciones] = useState<RelIniciativaHipotesisPm[]>([])
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | (typeof estadosRegistro)[number]>('todos')
  const [filtroPrioridad, setFiltroPrioridad] = useState<'todas' | (typeof prioridadesRegistro)[number]>('todas')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [hipotesisActiva, setHipotesisActiva] = useState<HipotesisPm | null>(null)
  const [iniciativasSeleccionadas, setIniciativasSeleccionadas] = useState<string[]>([])

  const esEdicionPermitida = puedeEditar(rol)
  const hayPeriodos = periodos.length > 0

  const formulario = useForm<HipotesisEntrada>({
    resolver: zodResolver(hipotesisSchema),
    defaultValues: {
      periodo_id: '',
      titulo: '',
      problema: '',
      hipotesis: '',
      impacto_esperado: '',
      criterio_exito: '',
      estado: 'pendiente',
      prioridad: 'media',
      owner: null,
      evidencia_url: null,
      notas: null
    }
  })

  const cargar = async () => {
    setCargando(true)
    setError(null)

    try {
      const [periodosData, hipotesisData, iniciativasData, relacionesData] = await Promise.all([
        listarPeriodosEstrategicos(),
        listarHipotesisPm(),
        listarIniciativas(),
        listarRelIniciativaHipotesis()
      ])

      setPeriodos(periodosData)
      setHipotesis(hipotesisData)
      setIniciativas(iniciativasData)
      setRelaciones(relacionesData)
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudieron cargar hipótesis')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const periodosPorId = useMemo(() => new Map(periodos.map((periodo) => [periodo.id, periodo.nombre])), [periodos])

  const hipotesisFiltradas = useMemo(() => {
    return hipotesis.filter((item) => {
      const coincidePeriodo = filtroPeriodo === 'todos' ? true : item.periodo_id === filtroPeriodo
      const coincideEstado = filtroEstado === 'todos' ? true : item.estado === filtroEstado
      const coincidePrioridad = filtroPrioridad === 'todas' ? true : item.prioridad === filtroPrioridad
      return coincidePeriodo && coincideEstado && coincidePrioridad
    })
  }, [hipotesis, filtroPeriodo, filtroEstado, filtroPrioridad])

  const abrirModal = (modo: ModoModal, item?: HipotesisPm) => {
    setModoModal(modo)
    setHipotesisActiva(item ?? null)
    setModalAbierto(true)
    formulario.reset({
      periodo_id: item?.periodo_id ?? periodos[0]?.id ?? '',
      titulo: item?.titulo ?? '',
      problema: item?.problema ?? '',
      hipotesis: item?.hipotesis ?? '',
      impacto_esperado: item?.impacto_esperado ?? '',
      criterio_exito: item?.criterio_exito ?? '',
      estado: item?.estado ?? 'pendiente',
      prioridad: item?.prioridad ?? 'media',
      owner: item?.owner ?? null,
      evidencia_url: item?.evidencia_url ?? null,
      notas: item?.notas ?? null
    })
    setIniciativasSeleccionadas(item ? relaciones.filter((rel) => rel.hipotesis_id === item.id).map((rel) => rel.iniciativa_id) : [])
  }

  const contarIniciativas = (hipotesisId: string) => relaciones.filter((rel) => rel.hipotesis_id === hipotesisId).length

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Hipótesis estrategia</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Gestiona hipótesis del módulo Estrategia para orientar apuestas del período y relaciónalas opcionalmente con iniciativas del roadmap.
          </p>
        </div>
        <NavegacionEstrategia />
      </header>

      <article className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-100">
        <p className="font-medium">Qué es y qué no es</p>
        <p className="mt-1">
          La hipótesis estrategia vive en Estrategia y sirve para sostener apuestas del período estratégico. No equivale a una hipótesis discovery de experimentación sobre problemas detectados.
        </p>
      </article>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
        <select value={filtroPeriodo} onChange={(evento) => setFiltroPeriodo(evento.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"><option value="todos">Periodo: todos</option>{periodos.map((periodo) => <option key={periodo.id} value={periodo.id}>{periodo.nombre}</option>)}</select>
        <select value={filtroEstado} onChange={(evento) => setFiltroEstado(evento.target.value as 'todos' | (typeof estadosRegistro)[number])} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"><option value="todos">Estado: todos</option>{estadosRegistro.map((estado) => <option key={estado} value={estado}>{estado}</option>)}</select>
        <select value={filtroPrioridad} onChange={(evento) => setFiltroPrioridad(evento.target.value as 'todas' | (typeof prioridadesRegistro)[number])} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"><option value="todas">Prioridad: todas</option>{prioridadesRegistro.map((prioridad) => <option key={prioridad} value={prioridad}>{prioridad}</option>)}</select>
        <button type="button" disabled={!esEdicionPermitida || !hayPeriodos} onClick={() => abrirModal('crear')} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900">Crear hipótesis estrategia</button>
      </div>

      {!hayPeriodos ? (
        <article className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-medium">No hay períodos estratégicos disponibles para crear hipótesis estrategia.</p>
          <p className="mt-1">
            Crea el dato maestro en <Link to="/estrategia/periodos" className="font-medium underline underline-offset-2">Períodos</Link> y luego vuelve a esta pantalla.
          </p>
        </article>
      ) : null}

      <EstadoVista cargando={cargando} error={error} vacio={hipotesisFiltradas.length === 0} mensajeVacio="No hay hipótesis estrategia para los filtros seleccionados.">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">Hipótesis estrategia</th>
                <th className="px-3 py-2">Periodo</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Vínculos</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {hipotesisFiltradas.map((item) => (
                <tr key={item.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-3 py-2">
                    <p className="font-medium">{item.titulo}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.prioridad} · {item.owner ?? 'Sin owner'}</p>
                  </td>
                  <td className="px-3 py-2">{periodosPorId.get(item.periodo_id) ?? 'Sin periodo'}</td>
                  <td className="px-3 py-2">{item.estado}</td>
                  <td className="px-3 py-2">{contarIniciativas(item.id)} iniciativas</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => abrirModal('ver', item)} className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">Ver</button>
                      <button type="button" disabled={!esEdicionPermitida} onClick={() => abrirModal('editar', item)} className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700">Editar</button>
                      <button type="button" disabled={!esEdicionPermitida} onClick={() => { if (window.confirm('¿Eliminar esta hipótesis?')) { void eliminarHipotesisPm(item.id).then(cargar).catch((errorInterno) => { setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar la hipótesis') }) } }} className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50 dark:border-red-800 dark:text-red-300">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </EstadoVista>

      <ModalPortal abierto={modalAbierto} titulo={`${modoModal === 'crear' ? 'Crear' : modoModal === 'editar' ? 'Editar' : 'Ver'} hipótesis estrategia`} alCerrar={() => setModalAbierto(false)}>
        <form className="space-y-4" onSubmit={formulario.handleSubmit(async (valores) => {
          if (modoModal === 'ver') {
            return
          }

          try {
            if (modoModal === 'crear') {
              await crearHipotesisPm(valores, iniciativasSeleccionadas)
            }

            if (modoModal === 'editar' && hipotesisActiva) {
              await editarHipotesisPm(hipotesisActiva.id, valores, iniciativasSeleccionadas)
            }

            setModalAbierto(false)
            await cargar()
          } catch (errorInterno) {
            setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar la hipótesis')
          }
        })}>
          <select {...formulario.register('periodo_id')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"><option value="">Selecciona periodo</option>{periodos.map((periodo) => <option key={periodo.id} value={periodo.id}>{periodo.nombre}</option>)}</select>
          <input {...formulario.register('titulo')} readOnly={modoModal === 'ver'} placeholder="Título" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <textarea {...formulario.register('problema')} readOnly={modoModal === 'ver'} placeholder="Problema" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <textarea {...formulario.register('hipotesis')} readOnly={modoModal === 'ver'} placeholder="Hipótesis" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <textarea {...formulario.register('impacto_esperado')} readOnly={modoModal === 'ver'} placeholder="Impacto esperado" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <textarea {...formulario.register('criterio_exito')} readOnly={modoModal === 'ver'} placeholder="Criterio de éxito" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <div className="grid gap-3 md:grid-cols-4">
            <select {...formulario.register('estado')} disabled={modoModal === 'ver'} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">{estadosRegistro.map((estado) => <option key={estado} value={estado}>{estado}</option>)}</select>
            <select {...formulario.register('prioridad')} disabled={modoModal === 'ver'} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">{prioridadesRegistro.map((prioridad) => <option key={prioridad} value={prioridad}>{prioridad}</option>)}</select>
            <input {...formulario.register('owner')} readOnly={modoModal === 'ver'} placeholder="Owner" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            <input {...formulario.register('evidencia_url')} readOnly={modoModal === 'ver'} placeholder="Evidencia URL" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <textarea {...formulario.register('notas')} readOnly={modoModal === 'ver'} placeholder="Notas" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />

          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <h3 className="text-sm font-medium">Vincular con iniciativas</h3>
            <div className="mt-3 max-h-40 space-y-2 overflow-auto text-sm">
              {iniciativas.map((iniciativa) => (
                <label key={iniciativa.id} className="flex items-start gap-2">
                  <input type="checkbox" disabled={modoModal === 'ver'} checked={iniciativasSeleccionadas.includes(iniciativa.id)} onChange={(evento) => setIniciativasSeleccionadas((actual) => evento.target.checked ? [...actual, iniciativa.id] : actual.filter((id) => id !== iniciativa.id))} />
                  <span>{iniciativa.nombre}</span>
                </label>
              ))}
            </div>
          </div>

          {modoModal !== 'ver' ? <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900">Guardar</button> : null}
        </form>
      </ModalPortal>
    </section>
  )
}