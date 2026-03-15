import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { exportarCsv } from '@/compartido/utilidades/csv'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { kpiEjecutivoSchema, type KpiEjecutivoEntrada } from '@/compartido/validacion/esquemas'
import {
  categoriasKpiEjecutivoPm,
  estadosSaludAnaliticaPm,
  formatearCategoriaKpiEjecutivo,
  formatearEstadoSaludAnalitica,
  formatearTendenciaAnalitica,
  tendenciasAnaliticaPm,
  type KpiEjecutivoPm
} from '@/dominio/modelos'
import {
  crearKpiEjecutivoPm,
  editarKpiEjecutivoPm,
  eliminarKpiEjecutivoPm,
  listarKpisEjecutivosPm,
  listarReferenciasAnalitica
} from '@/aplicacion/casos-uso/analitica'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'
import { NavegacionAnalitica } from '@/presentacion/paginas/analitica/NavegacionAnalitica'

type ModoModal = 'crear' | 'editar' | 'ver'
type ReferenciasAnalitica = Awaited<ReturnType<typeof listarReferenciasAnalitica>>

function calcularVariacion(valorActual: number | null, valorAnterior: number | null) {
  if (valorActual === null || valorAnterior === null || valorAnterior === 0) {
    return null
  }

  return Number((((valorActual - valorAnterior) / Math.abs(valorAnterior)) * 100).toFixed(1))
}

export function PaginaKpis() {
  const { rol } = useSesionPortalPM()
  const [kpis, setKpis] = useState<KpiEjecutivoPm[]>([])
  const [referencias, setReferencias] = useState<ReferenciasAnalitica | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState<'todas' | (typeof categoriasKpiEjecutivoPm)[number]>('todas')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | (typeof estadosSaludAnaliticaPm)[number]>('todos')
  const [filtroModulo, setFiltroModulo] = useState('todos')
  const [filtroOwner, setFiltroOwner] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [kpiActivo, setKpiActivo] = useState<KpiEjecutivoPm | null>(null)

  const esEdicionPermitida = puedeEditar(rol)

  const formulario = useForm<KpiEjecutivoEntrada>({
    resolver: zodResolver(kpiEjecutivoSchema),
    defaultValues: {
      codigo: '',
      nombre: '',
      descripcion: '',
      categoria: 'estrategia',
      modulo_codigo: null,
      formula_texto: '',
      unidad: '%',
      meta_valor: null,
      valor_actual: null,
      valor_anterior: null,
      tendencia: 'estable',
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
      const [kpisData, referenciasData] = await Promise.all([listarKpisEjecutivosPm(), listarReferenciasAnalitica()])
      setKpis(kpisData)
      setReferencias(referenciasData)
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudieron cargar los KPIs')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const kpisFiltrados = useMemo(() => {
    const termino = busqueda.toLowerCase()
    const owner = filtroOwner.toLowerCase()

    return kpis.filter((kpi) => {
      const coincideBusqueda =
        kpi.codigo.toLowerCase().includes(termino) ||
        kpi.nombre.toLowerCase().includes(termino) ||
        kpi.descripcion.toLowerCase().includes(termino)
      const coincideCategoria = filtroCategoria === 'todas' ? true : kpi.categoria === filtroCategoria
      const coincideEstado = filtroEstado === 'todos' ? true : kpi.estado === filtroEstado
      const coincideModulo = filtroModulo === 'todos' ? true : kpi.modulo_codigo === filtroModulo
      const coincideOwner = owner ? (kpi.owner ?? '').toLowerCase().includes(owner) : true
      const coincideDesde = fechaDesde ? kpi.fecha_corte >= fechaDesde : true
      const coincideHasta = fechaHasta ? kpi.fecha_corte <= fechaHasta : true

      return (
        coincideBusqueda &&
        coincideCategoria &&
        coincideEstado &&
        coincideModulo &&
        coincideOwner &&
        coincideDesde &&
        coincideHasta
      )
    })
  }, [busqueda, fechaDesde, fechaHasta, filtroCategoria, filtroEstado, filtroModulo, filtroOwner, kpis])

  const nombresModulo = useMemo(
    () => new Map((referencias?.modulos ?? []).map((modulo) => [modulo.codigo, modulo.nombre])),
    [referencias]
  )

  const abrirModal = (modo: ModoModal, kpi?: KpiEjecutivoPm) => {
    setModoModal(modo)
    setKpiActivo(kpi ?? null)
    setModalAbierto(true)
    formulario.reset({
      codigo: kpi?.codigo ?? '',
      nombre: kpi?.nombre ?? '',
      descripcion: kpi?.descripcion ?? '',
      categoria: kpi?.categoria ?? 'estrategia',
      modulo_codigo: kpi?.modulo_codigo ?? null,
      formula_texto: kpi?.formula_texto ?? '',
      unidad: kpi?.unidad ?? '%',
      meta_valor: kpi?.meta_valor ?? null,
      valor_actual: kpi?.valor_actual ?? null,
      valor_anterior: kpi?.valor_anterior ?? null,
      tendencia: kpi?.tendencia ?? 'estable',
      estado: kpi?.estado ?? 'atencion',
      owner: kpi?.owner ?? null,
      fecha_corte: kpi?.fecha_corte ?? new Date().toISOString().slice(0, 10),
      notas: kpi?.notas ?? null
    })
  }

  const exportar = () => {
    exportarCsv(
      'pm-portal-analitica-kpis.csv',
      [
        { encabezado: 'Código', valor: (fila) => fila.codigo },
        { encabezado: 'Nombre', valor: (fila) => fila.nombre },
        { encabezado: 'Categoría', valor: (fila) => formatearCategoriaKpiEjecutivo(fila.categoria) },
        { encabezado: 'Módulo', valor: (fila) => nombresModulo.get(fila.modulo_codigo ?? '') ?? '' },
        { encabezado: 'Valor actual', valor: (fila) => fila.valor_actual ?? '' },
        { encabezado: 'Meta', valor: (fila) => fila.meta_valor ?? '' },
        { encabezado: 'Valor anterior', valor: (fila) => fila.valor_anterior ?? '' },
        { encabezado: 'Tendencia', valor: (fila) => formatearTendenciaAnalitica(fila.tendencia) },
        { encabezado: 'Estado', valor: (fila) => formatearEstadoSaludAnalitica(fila.estado) },
        { encabezado: 'Owner', valor: (fila) => fila.owner ?? '' },
        { encabezado: 'Fecha de corte', valor: (fila) => fila.fecha_corte }
      ],
      kpisFiltrados
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">KPIs ejecutivos</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Gestión formal de KPIs ejecutivos con lectura de valor actual, meta, tendencia y estado de salud.
          </p>
        </div>
        <NavegacionAnalitica />
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
        <input value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Buscar KPI" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <select value={filtroCategoria} onChange={(evento) => setFiltroCategoria(evento.target.value as 'todas' | (typeof categoriasKpiEjecutivoPm)[number])} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="todas">Categoría: todas</option>
          {categoriasKpiEjecutivoPm.map((categoria) => (
            <option key={categoria} value={categoria}>{formatearCategoriaKpiEjecutivo(categoria)}</option>
          ))}
        </select>
        <select value={filtroEstado} onChange={(evento) => setFiltroEstado(evento.target.value as 'todos' | (typeof estadosSaludAnaliticaPm)[number])} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="todos">Estado: todos</option>
          {estadosSaludAnaliticaPm.map((estado) => (
            <option key={estado} value={estado}>{formatearEstadoSaludAnalitica(estado)}</option>
          ))}
        </select>
        <select value={filtroModulo} onChange={(evento) => setFiltroModulo(evento.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="todos">Módulo: todos</option>
          {(referencias?.modulos ?? []).map((modulo) => (
            <option key={modulo.id} value={modulo.codigo}>{modulo.nombre}</option>
          ))}
        </select>
        <input value={filtroOwner} onChange={(evento) => setFiltroOwner(evento.target.value)} placeholder="Filtrar por owner" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <input type="date" value={fechaDesde} onChange={(evento) => setFechaDesde(evento.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <input type="date" value={fechaHasta} onChange={(evento) => setFechaHasta(evento.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => abrirModal('crear')} disabled={!esEdicionPermitida} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">
          Nuevo KPI
        </button>
        <button type="button" onClick={exportar} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700">
          Exportar CSV
        </button>
      </div>

      <EstadoVista cargando={cargando} error={error} vacio={kpisFiltrados.length === 0} mensajeVacio="No hay KPIs para los filtros seleccionados.">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-950/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">KPI</th>
                  <th className="px-4 py-3 text-left font-medium">Categoría</th>
                  <th className="px-4 py-3 text-left font-medium">Valor / Meta</th>
                  <th className="px-4 py-3 text-left font-medium">Tendencia</th>
                  <th className="px-4 py-3 text-left font-medium">Estado</th>
                  <th className="px-4 py-3 text-left font-medium">Corte</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {kpisFiltrados.map((kpi) => {
                  const variacion = calcularVariacion(kpi.valor_actual, kpi.valor_anterior)
                  return (
                    <tr key={kpi.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{kpi.codigo} · {kpi.nombre}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{nombresModulo.get(kpi.modulo_codigo ?? '') ?? 'Sin módulo'} · {kpi.owner ?? 'Sin owner'}</p>
                      </td>
                      <td className="px-4 py-3">{formatearCategoriaKpiEjecutivo(kpi.categoria)}</td>
                      <td className="px-4 py-3">{kpi.valor_actual ?? 'Sin dato'} / {kpi.meta_valor ?? 'Sin meta'} {kpi.unidad}</td>
                      <td className="px-4 py-3">
                        <p>{formatearTendenciaAnalitica(kpi.tendencia)}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{variacion === null ? 'Sin base comparativa' : `${String(variacion)}%`}</p>
                      </td>
                      <td className="px-4 py-3">{formatearEstadoSaludAnalitica(kpi.estado)}</td>
                      <td className="px-4 py-3">{kpi.fecha_corte}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => abrirModal('ver', kpi)} className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">Ver</button>
                          <button type="button" disabled={!esEdicionPermitida} onClick={() => abrirModal('editar', kpi)} className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700">Editar</button>
                          <button type="button" disabled={!esEdicionPermitida} onClick={() => { if (window.confirm('¿Eliminar este KPI ejecutivo?')) { void eliminarKpiEjecutivoPm(kpi.id).then(cargar).catch((errorInterno) => setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar el KPI')) } }} className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-600 disabled:opacity-50 dark:border-rose-800 dark:text-rose-300">Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </EstadoVista>

      <ModalPortal abierto={modalAbierto} titulo={`${modoModal === 'crear' ? 'Crear' : modoModal === 'editar' ? 'Editar' : 'Ver'} KPI ejecutivo`} alCerrar={() => setModalAbierto(false)}>
        <form className="space-y-4" onSubmit={formulario.handleSubmit(async (valores) => {
          if (modoModal === 'ver') {
            return
          }

          try {
            if (modoModal === 'crear') {
              await crearKpiEjecutivoPm(valores)
            }

            if (modoModal === 'editar' && kpiActivo) {
              await editarKpiEjecutivoPm(kpiActivo.id, valores)
            }

            setModalAbierto(false)
            await cargar()
          } catch (errorInterno) {
            setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar el KPI')
          }
        })}>
          <div className="grid gap-3 md:grid-cols-2">
            <input {...formulario.register('codigo')} readOnly={modoModal === 'ver'} placeholder="Código" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            <input {...formulario.register('nombre')} readOnly={modoModal === 'ver'} placeholder="Nombre" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <textarea {...formulario.register('descripcion')} readOnly={modoModal === 'ver'} placeholder="Descripción" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <div className="grid gap-3 md:grid-cols-3">
            <select {...formulario.register('categoria')} disabled={modoModal === 'ver'} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
              {categoriasKpiEjecutivoPm.map((categoria) => <option key={categoria} value={categoria}>{formatearCategoriaKpiEjecutivo(categoria)}</option>)}
            </select>
            <select {...formulario.register('modulo_codigo')} disabled={modoModal === 'ver'} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
              <option value="">Sin módulo</option>
              {(referencias?.modulos ?? []).map((modulo) => <option key={modulo.id} value={modulo.codigo}>{modulo.nombre}</option>)}
            </select>
            <input {...formulario.register('unidad')} readOnly={modoModal === 'ver'} placeholder="Unidad" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <textarea {...formulario.register('formula_texto')} readOnly={modoModal === 'ver'} placeholder="Fórmula" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <div className="grid gap-3 md:grid-cols-3">
            <input type="number" step="0.01" {...formulario.register('meta_valor', { valueAsNumber: true })} readOnly={modoModal === 'ver'} placeholder="Meta" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            <input type="number" step="0.01" {...formulario.register('valor_actual', { valueAsNumber: true })} readOnly={modoModal === 'ver'} placeholder="Valor actual" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            <input type="number" step="0.01" {...formulario.register('valor_anterior', { valueAsNumber: true })} readOnly={modoModal === 'ver'} placeholder="Valor anterior" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <select {...formulario.register('tendencia')} disabled={modoModal === 'ver'} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
              {tendenciasAnaliticaPm.map((tendencia) => <option key={tendencia} value={tendencia}>{formatearTendenciaAnalitica(tendencia)}</option>)}
            </select>
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