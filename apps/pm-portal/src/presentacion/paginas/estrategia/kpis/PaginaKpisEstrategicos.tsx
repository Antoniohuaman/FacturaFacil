import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { kpiEstrategicoSchema, type KpiEstrategicoEntrada } from '@/compartido/validacion/esquemas'
import type { KpiEstrategicoPm, PeriodoEstrategicoPm } from '@/dominio/modelos'
import { estadosRegistro, tendenciasKpiEstrategico } from '@/dominio/modelos'
import {
  crearKpiEstrategico,
  editarKpiEstrategico,
  eliminarKpiEstrategico,
  listarKpisEstrategicos,
  listarPeriodosEstrategicos
} from '@/aplicacion/casos-uso/estrategia'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { NavegacionEstrategia } from '@/presentacion/paginas/estrategia/NavegacionEstrategia'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'
import { formatearTendenciaLegible, obtenerSemaforoKpi } from '@/compartido/utilidades/formatoPortal'

type ModoModal = 'crear' | 'editar' | 'ver'

export function PaginaKpisEstrategicos() {
  const { rol } = useSesionPortalPM()
  const [periodos, setPeriodos] = useState<PeriodoEstrategicoPm[]>([])
  const [kpis, setKpis] = useState<KpiEstrategicoPm[]>([])
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | (typeof estadosRegistro)[number]>('todos')
  const [filtroOwner, setFiltroOwner] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [kpiActivo, setKpiActivo] = useState<KpiEstrategicoPm | null>(null)

  const esEdicionPermitida = puedeEditar(rol)

  const formulario = useForm<KpiEstrategicoEntrada>({
    resolver: zodResolver(kpiEstrategicoSchema),
    defaultValues: {
      periodo_id: '',
      nombre: '',
      definicion: '',
      formula: '',
      fuente: '',
      unidad: '%',
      meta: 100,
      umbral_bajo: 40,
      umbral_alto: 80,
      valor_actual: 0,
      tendencia: 'estable',
      estado: 'pendiente',
      owner: null
    }
  })

  const cargar = async () => {
    setCargando(true)
    setError(null)

    try {
      const [periodosData, kpisData] = await Promise.all([listarPeriodosEstrategicos(), listarKpisEstrategicos()])
      setPeriodos(periodosData)
      setKpis(kpisData)
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudieron cargar KPIs estratégicos')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const periodosPorId = useMemo(() => new Map(periodos.map((periodo) => [periodo.id, periodo.nombre])), [periodos])

  const kpisFiltrados = useMemo(() => {
    return kpis.filter((kpi) => {
      const coincidePeriodo = filtroPeriodo === 'todos' ? true : kpi.periodo_id === filtroPeriodo
      const coincideEstado = filtroEstado === 'todos' ? true : kpi.estado === filtroEstado
      const coincideOwner = filtroOwner ? (kpi.owner ?? '').toLowerCase().includes(filtroOwner.toLowerCase()) : true
      return coincidePeriodo && coincideEstado && coincideOwner
    })
  }, [kpis, filtroPeriodo, filtroEstado, filtroOwner])

  const abrirModal = (modo: ModoModal, kpi?: KpiEstrategicoPm) => {
    setModoModal(modo)
    setKpiActivo(kpi ?? null)
    setModalAbierto(true)
    formulario.reset({
      periodo_id: kpi?.periodo_id ?? periodos[0]?.id ?? '',
      nombre: kpi?.nombre ?? '',
      definicion: kpi?.definicion ?? '',
      formula: kpi?.formula ?? '',
      fuente: kpi?.fuente ?? '',
      unidad: kpi?.unidad ?? '%',
      meta: kpi?.meta ?? 100,
      umbral_bajo: kpi?.umbral_bajo ?? 40,
      umbral_alto: kpi?.umbral_alto ?? 80,
      valor_actual: kpi?.valor_actual ?? 0,
      tendencia: kpi?.tendencia ?? 'estable',
      estado: kpi?.estado ?? 'pendiente',
      owner: kpi?.owner ?? null
    })
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">KPIs</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Seguimiento funcional de KPIs estratégicos por periodo, owner y semáforo de resultado.
          </p>
        </div>
        <NavegacionEstrategia />
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
        <select value={filtroPeriodo} onChange={(evento) => setFiltroPeriodo(evento.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="todos">Periodo: todos</option>
          {periodos.map((periodo) => <option key={periodo.id} value={periodo.id}>{periodo.nombre}</option>)}
        </select>
        <select value={filtroEstado} onChange={(evento) => setFiltroEstado(evento.target.value as 'todos' | (typeof estadosRegistro)[number])} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="todos">Estado: todos</option>
          {estadosRegistro.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
        </select>
        <input value={filtroOwner} onChange={(evento) => setFiltroOwner(evento.target.value)} placeholder="Filtrar por owner" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <button type="button" disabled={!esEdicionPermitida} onClick={() => abrirModal('crear')} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900">Crear KPI</button>
      </div>

      <EstadoVista cargando={cargando} error={error} vacio={kpisFiltrados.length === 0} mensajeVacio="No hay KPIs para los filtros seleccionados.">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">KPI</th>
                <th className="px-3 py-2">Periodo</th>
                <th className="px-3 py-2">Valor / Meta</th>
                <th className="px-3 py-2">Semáforo</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {kpisFiltrados.map((kpi) => (
                <tr key={kpi.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-3 py-2">
                    <p className="font-medium">{kpi.nombre}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{kpi.owner ?? 'Sin owner'} · {formatearTendenciaLegible(kpi.tendencia)}</p>
                  </td>
                  <td className="px-3 py-2">{periodosPorId.get(kpi.periodo_id) ?? 'Sin periodo'}</td>
                  <td className="px-3 py-2">{kpi.valor_actual ?? 'Sin dato'} / {kpi.meta ?? 'Sin meta'} {kpi.unidad}</td>
                  <td className="px-3 py-2">{obtenerSemaforoKpi(kpi.valor_actual, kpi.umbral_bajo, kpi.umbral_alto)}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => abrirModal('ver', kpi)} className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">Ver</button>
                      <button type="button" disabled={!esEdicionPermitida} onClick={() => abrirModal('editar', kpi)} className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700">Editar</button>
                      <button type="button" disabled={!esEdicionPermitida} onClick={() => { if (window.confirm('¿Eliminar este KPI estratégico?')) { void eliminarKpiEstrategico(kpi.id).then(cargar).catch((errorInterno) => { setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar el KPI') }) } }} className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50 dark:border-red-800 dark:text-red-300">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </EstadoVista>

      <ModalPortal abierto={modalAbierto} titulo={`${modoModal === 'crear' ? 'Crear' : modoModal === 'editar' ? 'Editar' : 'Ver'} KPI estratégico`} alCerrar={() => setModalAbierto(false)}>
        <form className="space-y-4" onSubmit={formulario.handleSubmit(async (valores) => {
          if (modoModal === 'ver') {
            return
          }

          try {
            if (modoModal === 'crear') {
              await crearKpiEstrategico(valores)
            }

            if (modoModal === 'editar' && kpiActivo) {
              await editarKpiEstrategico(kpiActivo.id, valores)
            }

            setModalAbierto(false)
            await cargar()
          } catch (errorInterno) {
            setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar el KPI estratégico')
          }
        })}>
          <select {...formulario.register('periodo_id')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"><option value="">Selecciona periodo</option>{periodos.map((periodo) => <option key={periodo.id} value={periodo.id}>{periodo.nombre}</option>)}</select>
          <input {...formulario.register('nombre')} readOnly={modoModal === 'ver'} placeholder="Nombre" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <textarea {...formulario.register('definicion')} readOnly={modoModal === 'ver'} placeholder="Definición" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <div className="grid gap-3 md:grid-cols-2">
            <input {...formulario.register('formula')} readOnly={modoModal === 'ver'} placeholder="Fórmula" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            <input {...formulario.register('fuente')} readOnly={modoModal === 'ver'} placeholder="Fuente" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <input {...formulario.register('unidad')} readOnly={modoModal === 'ver'} placeholder="Unidad" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            <input type="number" step="0.01" {...formulario.register('meta', { valueAsNumber: true })} readOnly={modoModal === 'ver'} placeholder="Meta" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            <input type="number" step="0.01" {...formulario.register('valor_actual', { valueAsNumber: true })} readOnly={modoModal === 'ver'} placeholder="Valor actual" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            <input {...formulario.register('owner')} readOnly={modoModal === 'ver'} placeholder="Owner" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <input type="number" step="0.01" {...formulario.register('umbral_bajo', { valueAsNumber: true })} readOnly={modoModal === 'ver'} placeholder="Umbral bajo" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            <input type="number" step="0.01" {...formulario.register('umbral_alto', { valueAsNumber: true })} readOnly={modoModal === 'ver'} placeholder="Umbral alto" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            <select {...formulario.register('tendencia')} disabled={modoModal === 'ver'} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">{tendenciasKpiEstrategico.map((tendencia) => <option key={tendencia} value={tendencia}>{tendencia}</option>)}</select>
            <select {...formulario.register('estado')} disabled={modoModal === 'ver'} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">{estadosRegistro.map((estado) => <option key={estado} value={estado}>{estado}</option>)}</select>
          </div>
          {modoModal !== 'ver' ? <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900">Guardar</button> : null}
        </form>
      </ModalPortal>
    </section>
  )
}