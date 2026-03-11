import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { exportarCsv } from '@/compartido/utilidades/csv'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { healthScoreSchema, type HealthScoreEntrada } from '@/compartido/validacion/esquemas'
import {
  ambitosHealthScorePm,
  estadosSaludAnaliticaPm,
  formatearAmbitoHealthScore,
  formatearEstadoSaludAnalitica,
  type HealthScorePm
} from '@/dominio/modelos'
import {
  crearHealthScorePm,
  editarHealthScorePm,
  eliminarHealthScorePm,
  listarHealthScoresPm,
  listarReferenciasAnalitica
} from '@/aplicacion/casos-uso/analitica'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'
import { NavegacionAnalitica } from '@/presentacion/paginas/analitica/NavegacionAnalitica'

type ModoModal = 'crear' | 'editar' | 'ver'
type ReferenciasAnalitica = Awaited<ReturnType<typeof listarReferenciasAnalitica>>

function calcularScoreVisible(score: HealthScorePm) {
  if (score.valor_actual === null) {
    return null
  }

  return Number(((score.valor_actual * score.peso) / 100).toFixed(1))
}

export function PaginaHealthScores() {
  const { rol } = useSesionPortalPM()
  const [scores, setScores] = useState<HealthScorePm[]>([])
  const [referencias, setReferencias] = useState<ReferenciasAnalitica | null>(null)
  const [filtroAmbito, setFiltroAmbito] = useState<'todos' | (typeof ambitosHealthScorePm)[number]>('todos')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | (typeof estadosSaludAnaliticaPm)[number]>('todos')
  const [filtroModulo, setFiltroModulo] = useState('todos')
  const [filtroOwner, setFiltroOwner] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [scoreActivo, setScoreActivo] = useState<HealthScorePm | null>(null)

  const esEdicionPermitida = puedeEditar(rol)

  const formulario = useForm<HealthScoreEntrada>({
    resolver: zodResolver(healthScoreSchema),
    defaultValues: {
      codigo: '',
      nombre: '',
      ambito: 'portafolio',
      modulo_codigo: null,
      descripcion: '',
      peso: 1,
      valor_actual: null,
      umbral_saludable: 80,
      umbral_atencion: 60,
      estado: 'atencion',
      owner: null,
      fecha_corte: new Date().toISOString().slice(0, 10),
      notas: null
    }
  })

  const cargar = async () => {
    setCargando(true)
    setError(null)

    try {
      const [scoresData, referenciasData] = await Promise.all([listarHealthScoresPm(), listarReferenciasAnalitica()])
      setScores(scoresData)
      setReferencias(referenciasData)
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudieron cargar los health scores')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const scoresFiltrados = useMemo(() => {
    const owner = filtroOwner.toLowerCase()

    return scores.filter((score) => {
      const coincideAmbito = filtroAmbito === 'todos' ? true : score.ambito === filtroAmbito
      const coincideEstado = filtroEstado === 'todos' ? true : score.estado === filtroEstado
      const coincideModulo = filtroModulo === 'todos' ? true : score.modulo_codigo === filtroModulo
      const coincideOwner = owner ? (score.owner ?? '').toLowerCase().includes(owner) : true

      return coincideAmbito && coincideEstado && coincideModulo && coincideOwner
    })
  }, [filtroAmbito, filtroEstado, filtroModulo, filtroOwner, scores])

  const nombresModulo = useMemo(
    () => new Map((referencias?.modulos ?? []).map((modulo) => [modulo.codigo, modulo.nombre])),
    [referencias]
  )

  const abrirModal = (modo: ModoModal, score?: HealthScorePm) => {
    setModoModal(modo)
    setScoreActivo(score ?? null)
    setModalAbierto(true)
    formulario.reset({
      codigo: score?.codigo ?? '',
      nombre: score?.nombre ?? '',
      ambito: score?.ambito ?? 'portafolio',
      modulo_codigo: score?.modulo_codigo ?? null,
      descripcion: score?.descripcion ?? '',
      peso: score?.peso ?? 1,
      valor_actual: score?.valor_actual ?? null,
      umbral_saludable: score?.umbral_saludable ?? 80,
      umbral_atencion: score?.umbral_atencion ?? 60,
      estado: score?.estado ?? 'atencion',
      owner: score?.owner ?? null,
      fecha_corte: score?.fecha_corte ?? new Date().toISOString().slice(0, 10),
      notas: score?.notas ?? null
    })
  }

  const exportar = () => {
    exportarCsv(
      'pm-portal-analitica-health-scores.csv',
      [
        { encabezado: 'Código', valor: (fila) => fila.codigo },
        { encabezado: 'Nombre', valor: (fila) => fila.nombre },
        { encabezado: 'Ámbito', valor: (fila) => formatearAmbitoHealthScore(fila.ambito) },
        { encabezado: 'Módulo', valor: (fila) => nombresModulo.get(fila.modulo_codigo ?? '') ?? '' },
        { encabezado: 'Peso', valor: (fila) => fila.peso },
        { encabezado: 'Valor actual', valor: (fila) => fila.valor_actual ?? '' },
        { encabezado: 'Umbral saludable', valor: (fila) => fila.umbral_saludable ?? '' },
        { encabezado: 'Umbral atención', valor: (fila) => fila.umbral_atencion ?? '' },
        { encabezado: 'Estado', valor: (fila) => formatearEstadoSaludAnalitica(fila.estado) },
        { encabezado: 'Owner', valor: (fila) => fila.owner ?? '' },
        { encabezado: 'Fecha de corte', valor: (fila) => fila.fecha_corte }
      ],
      scoresFiltrados
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Health scores</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Configuración y seguimiento de scores de salud por ámbito y módulo, con score visible y semáforo ejecutivo.
          </p>
        </div>
        <NavegacionAnalitica />
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
        <select value={filtroAmbito} onChange={(evento) => setFiltroAmbito(evento.target.value as 'todos' | (typeof ambitosHealthScorePm)[number])} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="todos">Ámbito: todos</option>
          {ambitosHealthScorePm.map((ambito) => <option key={ambito} value={ambito}>{formatearAmbitoHealthScore(ambito)}</option>)}
        </select>
        <select value={filtroEstado} onChange={(evento) => setFiltroEstado(evento.target.value as 'todos' | (typeof estadosSaludAnaliticaPm)[number])} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="todos">Estado: todos</option>
          {estadosSaludAnaliticaPm.map((estado) => <option key={estado} value={estado}>{formatearEstadoSaludAnalitica(estado)}</option>)}
        </select>
        <select value={filtroModulo} onChange={(evento) => setFiltroModulo(evento.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="todos">Módulo: todos</option>
          {(referencias?.modulos ?? []).map((modulo) => <option key={modulo.id} value={modulo.codigo}>{modulo.nombre}</option>)}
        </select>
        <input value={filtroOwner} onChange={(evento) => setFiltroOwner(evento.target.value)} placeholder="Filtrar por owner" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => abrirModal('crear')} disabled={!esEdicionPermitida} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">Nuevo health score</button>
        <button type="button" onClick={exportar} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700">Exportar CSV</button>
      </div>

      <EstadoVista cargando={cargando} error={error} vacio={scoresFiltrados.length === 0} mensajeVacio="No hay health scores para los filtros seleccionados.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {scoresFiltrados.map((score) => (
            <article key={score.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{score.codigo} · {score.nombre}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{formatearAmbitoHealthScore(score.ambito)} · {nombresModulo.get(score.modulo_codigo ?? '') ?? 'Sin módulo'}</p>
                </div>
                <span className="rounded-full border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">{formatearEstadoSaludAnalitica(score.estado)}</span>
              </div>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{score.descripcion}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Valor actual</p>
                  <p className="mt-1 font-medium">{score.valor_actual ?? 'Sin dato'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Score visible</p>
                  <p className="mt-1 font-medium">{calcularScoreVisible(score) ?? 'Sin dato'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Umbral saludable</p>
                  <p className="mt-1 font-medium">{score.umbral_saludable ?? 'Sin dato'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Umbral atención</p>
                  <p className="mt-1 font-medium">{score.umbral_atencion ?? 'Sin dato'}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => abrirModal('ver', score)} className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">Ver</button>
                <button type="button" disabled={!esEdicionPermitida} onClick={() => abrirModal('editar', score)} className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700">Editar</button>
                <button type="button" disabled={!esEdicionPermitida} onClick={() => { if (window.confirm('¿Eliminar este health score?')) { void eliminarHealthScorePm(score.id).then(cargar).catch((errorInterno) => setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar el health score')) } }} className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-600 disabled:opacity-50 dark:border-rose-800 dark:text-rose-300">Eliminar</button>
              </div>
            </article>
          ))}
        </div>
      </EstadoVista>

      <ModalPortal abierto={modalAbierto} titulo={`${modoModal === 'crear' ? 'Crear' : modoModal === 'editar' ? 'Editar' : 'Ver'} health score`} alCerrar={() => setModalAbierto(false)}>
        <form className="space-y-4" onSubmit={formulario.handleSubmit(async (valores) => {
          if (modoModal === 'ver') {
            return
          }

          try {
            if (modoModal === 'crear') {
              await crearHealthScorePm(valores)
            }

            if (modoModal === 'editar' && scoreActivo) {
              await editarHealthScorePm(scoreActivo.id, valores)
            }

            setModalAbierto(false)
            await cargar()
          } catch (errorInterno) {
            setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar el health score')
          }
        })}>
          <div className="grid gap-3 md:grid-cols-2">
            <input {...formulario.register('codigo')} readOnly={modoModal === 'ver'} placeholder="Código" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            <input {...formulario.register('nombre')} readOnly={modoModal === 'ver'} placeholder="Nombre" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <select {...formulario.register('ambito')} disabled={modoModal === 'ver'} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
              {ambitosHealthScorePm.map((ambito) => <option key={ambito} value={ambito}>{formatearAmbitoHealthScore(ambito)}</option>)}
            </select>
            <select {...formulario.register('modulo_codigo')} disabled={modoModal === 'ver'} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
              <option value="">Sin módulo</option>
              {(referencias?.modulos ?? []).map((modulo) => <option key={modulo.id} value={modulo.codigo}>{modulo.nombre}</option>)}
            </select>
            <input type="number" step="0.01" {...formulario.register('peso', { valueAsNumber: true })} readOnly={modoModal === 'ver'} placeholder="Peso" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <textarea {...formulario.register('descripcion')} readOnly={modoModal === 'ver'} placeholder="Descripción" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <div className="grid gap-3 md:grid-cols-3">
            <input type="number" step="0.01" {...formulario.register('valor_actual', { valueAsNumber: true })} readOnly={modoModal === 'ver'} placeholder="Valor actual" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            <input type="number" step="0.01" {...formulario.register('umbral_saludable', { valueAsNumber: true })} readOnly={modoModal === 'ver'} placeholder="Umbral saludable" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            <input type="number" step="0.01" {...formulario.register('umbral_atencion', { valueAsNumber: true })} readOnly={modoModal === 'ver'} placeholder="Umbral atención" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <select {...formulario.register('estado')} disabled={modoModal === 'ver'} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
              {estadosSaludAnaliticaPm.map((estado) => <option key={estado} value={estado}>{formatearEstadoSaludAnalitica(estado)}</option>)}
            </select>
            <input {...formulario.register('owner')} readOnly={modoModal === 'ver'} placeholder="Owner" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            <input type="date" {...formulario.register('fecha_corte')} readOnly={modoModal === 'ver'} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <textarea {...formulario.register('notas')} readOnly={modoModal === 'ver'} placeholder="Notas" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          {modoModal !== 'ver' ? <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900">Guardar</button> : null}
        </form>
      </ModalPortal>
    </section>
  )
}