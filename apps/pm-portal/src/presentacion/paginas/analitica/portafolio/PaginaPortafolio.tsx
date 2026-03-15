import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { exportarCsv } from '@/compartido/utilidades/csv'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { obtenerFuentesPortafolioAnalitica } from '@/aplicacion/casos-uso/analitica'
import { NavegacionAnalitica } from '@/presentacion/paginas/analitica/NavegacionAnalitica'

type FuentesPortafolio = Awaited<ReturnType<typeof obtenerFuentesPortafolioAnalitica>>

interface FilaPortafolio {
  codigo: string
  nombre: string
  iniciativas: number
  entregas: number
  releases: number
  bugsAbiertos: number
  bloqueosAbiertos: number
  deudaTecnica: number
  mejoras: number
  hallazgos: number
  healthScore: number | null
  healthEstado: string
  owners: string[]
  estados: string[]
  ventanas: string[]
  etapas: string[]
  fechas: string[]
}

function promedio(valores: number[]) {
  if (valores.length === 0) {
    return null
  }

  return Number((valores.reduce((acumulado, actual) => acumulado + actual, 0) / valores.length).toFixed(1))
}

function topOwners(valores: (string | null)[]) {
  const conteos = new Map<string, number>()

  for (const valor of valores) {
    if (!valor) {
      continue
    }
    conteos.set(valor, (conteos.get(valor) ?? 0) + 1)
  }

  return [...conteos.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([owner]) => owner)
}

export function PaginaPortafolio() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [fuentes, setFuentes] = useState<FuentesPortafolio | null>(null)
  const [filtroModulo, setFiltroModulo] = useState(searchParams.get('modulo') ?? 'todos')
  const [filtroEstado, setFiltroEstado] = useState(searchParams.get('estado') ?? 'todos')
  const [filtroOwner, setFiltroOwner] = useState(searchParams.get('owner') ?? '')
  const [filtroVentana, setFiltroVentana] = useState(searchParams.get('ventana') ?? 'todas')
  const [filtroEtapa, setFiltroEtapa] = useState(searchParams.get('etapa') ?? 'todas')
  const [fechaDesde, setFechaDesde] = useState(searchParams.get('desde') ?? '')
  const [fechaHasta, setFechaHasta] = useState(searchParams.get('hasta') ?? '')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const cargar = async () => {
      setCargando(true)
      setError(null)

      try {
        const resultado = await obtenerFuentesPortafolioAnalitica()
        setFuentes(resultado)
      } catch (errorInterno) {
        setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar el portafolio')
      } finally {
        setCargando(false)
      }
    }

    void cargar()
  }, [])

  const filas = useMemo(() => {
    if (!fuentes) {
      return [] as FilaPortafolio[]
    }

    const iniciativasPorId = new Map(fuentes.iniciativas.map((iniciativa) => [iniciativa.id, iniciativa]))
    const entregasPorId = new Map(fuentes.entregas.map((entrega) => [entrega.id, entrega]))

    const health = {
      portafolio: promedio(fuentes.healthScores.filter((item) => item.ambito === 'portafolio' && item.valor_actual !== null).map((item) => item.valor_actual as number)),
      roadmap: promedio(fuentes.healthScores.filter((item) => item.ambito === 'roadmap' && item.valor_actual !== null).map((item) => item.valor_actual as number)),
      lanzamiento: promedio(fuentes.healthScores.filter((item) => item.ambito === 'lanzamiento' && item.valor_actual !== null).map((item) => item.valor_actual as number)),
      operacion: promedio(fuentes.healthScores.filter((item) => item.ambito === 'operacion' && item.valor_actual !== null).map((item) => item.valor_actual as number)),
      validacion: promedio(fuentes.healthScores.filter((item) => item.ambito === 'validacion' && item.valor_actual !== null).map((item) => item.valor_actual as number))
    }

    const roadmapEstados = [...new Set([...fuentes.iniciativas.map((item) => item.estado), ...fuentes.entregas.map((item) => item.estado)])]
    const roadmapVentanas = [
      ...new Set([
        ...fuentes.iniciativas.map((item) => item.ventana_planificada_id).filter(Boolean),
        ...fuentes.entregas.map((item) => item.ventana_planificada_id).filter(Boolean)
      ])
    ] as string[]
    const roadmapEtapas = [...new Set(fuentes.iniciativas.map((item) => item.etapa_id).filter(Boolean))] as string[]

    const roadmap: FilaPortafolio = {
      codigo: 'roadmap',
      nombre: 'Roadmap',
      iniciativas: fuentes.iniciativas.length,
      entregas: fuentes.entregas.length,
      releases: 0,
      bugsAbiertos: 0,
      bloqueosAbiertos: 0,
      deudaTecnica: 0,
      mejoras: 0,
      hallazgos: 0,
      healthScore: health.roadmap,
      healthEstado: health.roadmap === null ? 'Sin dato' : health.roadmap >= 80 ? 'Saludable' : health.roadmap >= 60 ? 'Atención' : 'Riesgo',
      owners: [],
      estados: roadmapEstados,
      ventanas: roadmapVentanas,
      etapas: roadmapEtapas,
      fechas: [...fuentes.iniciativas.map((item) => item.updated_at), ...fuentes.entregas.map((item) => item.updated_at)]
    }

    const lanzamientos: FilaPortafolio = {
      codigo: 'lanzamientos',
      nombre: 'Lanzamientos',
      iniciativas: new Set(fuentes.releases.map((item) => item.iniciativa_id).filter(Boolean)).size,
      entregas: new Set(fuentes.releases.map((item) => item.entrega_id).filter(Boolean)).size,
      releases: fuentes.releases.length,
      bugsAbiertos: 0,
      bloqueosAbiertos: 0,
      deudaTecnica: 0,
      mejoras: 0,
      hallazgos: 0,
      healthScore: health.lanzamiento,
      healthEstado: health.lanzamiento === null ? 'Sin dato' : health.lanzamiento >= 80 ? 'Saludable' : health.lanzamiento >= 60 ? 'Atención' : 'Riesgo',
      owners: topOwners(fuentes.releases.map((item) => item.owner)),
      estados: [...new Set(fuentes.releases.map((item) => item.estado))],
      ventanas: [...new Set(fuentes.releases.flatMap((item) => {
        const iniciativa = item.iniciativa_id ? iniciativasPorId.get(item.iniciativa_id) : null
        const entrega = item.entrega_id ? entregasPorId.get(item.entrega_id) : null
        return [iniciativa?.ventana_planificada_id, entrega?.ventana_planificada_id].filter(Boolean)
      }))] as string[],
      etapas: [...new Set(fuentes.releases.flatMap((item) => {
        const iniciativa = item.iniciativa_id ? iniciativasPorId.get(item.iniciativa_id) : null
        return [iniciativa?.etapa_id].filter(Boolean)
      }))] as string[],
      fechas: fuentes.releases.map((item) => item.fecha_lanzamiento_real ?? item.fecha_programada)
    }

    const bugsAbiertos = fuentes.bugs.filter((item) => !['resuelto', 'cerrado'].includes(item.estado))
    const bloqueosAbiertos = fuentes.bloqueos.filter((item) => item.estado !== 'resuelto')
    const deudasActivas = fuentes.deudas.filter((item) => !['resuelta', 'descartada'].includes(item.estado))
    const mejorasActivas = fuentes.mejoras.filter((item) => !['implementada', 'cerrada'].includes(item.estado))

    const operacion: FilaPortafolio = {
      codigo: 'operacion',
      nombre: 'Operación',
      iniciativas: new Set([
        ...fuentes.bugs.map((item) => item.iniciativa_id),
        ...fuentes.mejoras.map((item) => item.iniciativa_id),
        ...fuentes.deudas.map((item) => item.iniciativa_id),
        ...fuentes.bloqueos.map((item) => item.iniciativa_id)
      ].filter(Boolean)).size,
      entregas: new Set([
        ...fuentes.bugs.map((item) => item.entrega_id),
        ...fuentes.mejoras.map((item) => item.entrega_id),
        ...fuentes.deudas.map((item) => item.entrega_id),
        ...fuentes.bloqueos.map((item) => item.entrega_id)
      ].filter(Boolean)).size,
      releases: new Set([
        ...fuentes.bugs.map((item) => item.release_id),
        ...fuentes.deudas.map((item) => item.release_id),
        ...fuentes.bloqueos.map((item) => item.release_id)
      ].filter(Boolean)).size,
      bugsAbiertos: bugsAbiertos.length,
      bloqueosAbiertos: bloqueosAbiertos.length,
      deudaTecnica: deudasActivas.length,
      mejoras: mejorasActivas.length,
      hallazgos: 0,
      healthScore: health.operacion,
      healthEstado: health.operacion === null ? 'Sin dato' : health.operacion >= 80 ? 'Saludable' : health.operacion >= 60 ? 'Atención' : 'Riesgo',
      owners: topOwners([
        ...fuentes.bugs.map((item) => item.owner),
        ...fuentes.mejoras.map((item) => item.owner),
        ...fuentes.deudas.map((item) => item.owner),
        ...fuentes.bloqueos.map((item) => item.owner)
      ]),
      estados: [...new Set([
        ...fuentes.bugs.map((item) => item.estado),
        ...fuentes.mejoras.map((item) => item.estado),
        ...fuentes.deudas.map((item) => item.estado),
        ...fuentes.bloqueos.map((item) => item.estado)
      ])],
      ventanas: [...new Set([
        ...fuentes.bugs.flatMap((item) => [item.iniciativa_id ? iniciativasPorId.get(item.iniciativa_id)?.ventana_planificada_id : null, item.entrega_id ? entregasPorId.get(item.entrega_id)?.ventana_planificada_id : null]),
        ...fuentes.mejoras.flatMap((item) => [item.iniciativa_id ? iniciativasPorId.get(item.iniciativa_id)?.ventana_planificada_id : null, item.entrega_id ? entregasPorId.get(item.entrega_id)?.ventana_planificada_id : null]),
        ...fuentes.deudas.flatMap((item) => [item.iniciativa_id ? iniciativasPorId.get(item.iniciativa_id)?.ventana_planificada_id : null, item.entrega_id ? entregasPorId.get(item.entrega_id)?.ventana_planificada_id : null]),
        ...fuentes.bloqueos.flatMap((item) => [item.iniciativa_id ? iniciativasPorId.get(item.iniciativa_id)?.ventana_planificada_id : null, item.entrega_id ? entregasPorId.get(item.entrega_id)?.ventana_planificada_id : null])
      ].filter(Boolean))] as string[],
      etapas: [...new Set([
        ...fuentes.bugs.map((item) => item.iniciativa_id ? iniciativasPorId.get(item.iniciativa_id)?.etapa_id : null),
        ...fuentes.mejoras.map((item) => item.iniciativa_id ? iniciativasPorId.get(item.iniciativa_id)?.etapa_id : null),
        ...fuentes.deudas.map((item) => item.iniciativa_id ? iniciativasPorId.get(item.iniciativa_id)?.etapa_id : null),
        ...fuentes.bloqueos.map((item) => item.iniciativa_id ? iniciativasPorId.get(item.iniciativa_id)?.etapa_id : null)
      ].filter(Boolean))] as string[],
      fechas: [
        ...fuentes.bugs.map((item) => item.fecha_reporte),
        ...fuentes.mejoras.map((item) => item.fecha_solicitud),
        ...fuentes.deudas.map((item) => item.fecha_identificacion),
        ...fuentes.bloqueos.map((item) => item.fecha_reporte)
      ]
    }

    const auditorias: FilaPortafolio = {
      codigo: 'auditorias',
      nombre: 'Auditorías',
      iniciativas: 0,
      entregas: 0,
      releases: 0,
      bugsAbiertos: 0,
      bloqueosAbiertos: 0,
      deudaTecnica: 0,
      mejoras: 0,
      hallazgos: fuentes.hallazgos.filter((item) => item.estado_codigo !== 'cerrado').length,
      healthScore: null,
      healthEstado: 'Sin dato',
      owners: [],
      estados: [...new Set(fuentes.hallazgos.map((item) => item.estado_codigo))],
      ventanas: [],
      etapas: [],
      fechas: fuentes.hallazgos.map((item) => item.created_at)
    }

    const portafolio: FilaPortafolio = {
      codigo: 'portafolio',
      nombre: 'Portafolio consolidado',
      iniciativas: fuentes.iniciativas.length,
      entregas: fuentes.entregas.length,
      releases: fuentes.releases.length,
      bugsAbiertos: bugsAbiertos.length,
      bloqueosAbiertos: bloqueosAbiertos.length,
      deudaTecnica: deudasActivas.length,
      mejoras: mejorasActivas.length,
      hallazgos: fuentes.hallazgos.filter((item) => item.estado_codigo !== 'cerrado').length,
      healthScore: health.portafolio,
      healthEstado: health.portafolio === null ? 'Sin dato' : health.portafolio >= 80 ? 'Saludable' : health.portafolio >= 60 ? 'Atención' : 'Riesgo',
      owners: topOwners([...fuentes.releases.map((item) => item.owner), ...fuentes.bugs.map((item) => item.owner), ...fuentes.mejoras.map((item) => item.owner), ...fuentes.deudas.map((item) => item.owner), ...fuentes.bloqueos.map((item) => item.owner)]),
      estados: [...new Set([...roadmapEstados, ...fuentes.releases.map((item) => item.estado), ...fuentes.bugs.map((item) => item.estado), ...fuentes.mejoras.map((item) => item.estado), ...fuentes.deudas.map((item) => item.estado), ...fuentes.bloqueos.map((item) => item.estado)])],
      ventanas: [...new Set([...roadmapVentanas, ...lanzamientos.ventanas, ...operacion.ventanas])],
      etapas: [...new Set([...roadmapEtapas, ...lanzamientos.etapas, ...operacion.etapas])],
      fechas: [...roadmap.fechas, ...lanzamientos.fechas, ...operacion.fechas, ...auditorias.fechas]
    }

    return [portafolio, roadmap, lanzamientos, operacion, auditorias]
  }, [fuentes])

  const filasFiltradas = useMemo(() => {
    const owner = filtroOwner.toLowerCase()

    return filas.filter((fila) => {
      const coincideModulo = filtroModulo === 'todos' ? true : fila.codigo === filtroModulo
      const coincideEstado = filtroEstado === 'todos' ? true : fila.healthEstado === filtroEstado
      const coincideOwner = owner ? fila.owners.some((item) => item.toLowerCase().includes(owner)) : true
      const coincideVentana = filtroVentana === 'todas' ? true : fila.ventanas.includes(filtroVentana)
      const coincideEtapa = filtroEtapa === 'todas' ? true : fila.etapas.includes(filtroEtapa)
      const coincideDesde = fechaDesde ? fila.fechas.some((fecha) => fecha >= fechaDesde) : true
      const coincideHasta = fechaHasta ? fila.fechas.some((fecha) => fecha <= fechaHasta) : true

      return coincideModulo && coincideEstado && coincideOwner && coincideVentana && coincideEtapa && coincideDesde && coincideHasta
    })
  }, [fechaDesde, fechaHasta, filas, filtroEstado, filtroEtapa, filtroModulo, filtroOwner, filtroVentana])

  useEffect(() => {
    const parametros = new URLSearchParams()
    if (filtroModulo !== 'todos') parametros.set('modulo', filtroModulo)
    if (filtroEstado !== 'todos') parametros.set('estado', filtroEstado)
    if (filtroOwner) parametros.set('owner', filtroOwner)
    if (filtroVentana !== 'todas') parametros.set('ventana', filtroVentana)
    if (filtroEtapa !== 'todas') parametros.set('etapa', filtroEtapa)
    if (fechaDesde) parametros.set('desde', fechaDesde)
    if (fechaHasta) parametros.set('hasta', fechaHasta)
    setSearchParams(parametros, { replace: true })
  }, [filtroModulo, filtroEstado, filtroOwner, filtroVentana, filtroEtapa, fechaDesde, fechaHasta, setSearchParams])

  const exportar = () => {
    exportarCsv(
      'pm-portal-analitica-portafolio.csv',
      [
        { encabezado: 'Dominio', valor: (fila) => fila.nombre },
        { encabezado: 'Iniciativas', valor: (fila) => fila.iniciativas },
        { encabezado: 'Entregas', valor: (fila) => fila.entregas },
        { encabezado: 'Releases', valor: (fila) => fila.releases },
        { encabezado: 'Bugs abiertos', valor: (fila) => fila.bugsAbiertos },
        { encabezado: 'Bloqueos abiertos', valor: (fila) => fila.bloqueosAbiertos },
        { encabezado: 'Deuda técnica', valor: (fila) => fila.deudaTecnica },
        { encabezado: 'Mejoras', valor: (fila) => fila.mejoras },
        { encabezado: 'Hallazgos', valor: (fila) => fila.hallazgos },
        { encabezado: 'Health score', valor: (fila) => fila.healthScore ?? '' },
        { encabezado: 'Estado health', valor: (fila) => fila.healthEstado },
        { encabezado: 'Owners dominantes', valor: (fila) => fila.owners.join(' | ') }
      ],
      filasFiltradas
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Portafolio</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Lectura consolidada por dominio operativo del producto, sin duplicar datos ya existentes en roadmap, lanzamientos, operación y auditorías.
          </p>
        </div>
        <NavegacionAnalitica />
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
        <select value={filtroModulo} onChange={(evento) => setFiltroModulo(evento.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="todos">Módulo o dominio: todos</option>
          <option value="portafolio">Portafolio consolidado</option>
          <option value="roadmap">Roadmap</option>
          <option value="lanzamientos">Lanzamientos</option>
          <option value="operacion">Operación</option>
          <option value="auditorias">Auditorías</option>
        </select>
        <select value={filtroEstado} onChange={(evento) => setFiltroEstado(evento.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="todos">Estado health: todos</option>
          <option value="Saludable">Saludable</option>
          <option value="Atención">Atención</option>
          <option value="Riesgo">Riesgo</option>
          <option value="Sin dato">Sin dato</option>
        </select>
        <input value={filtroOwner} onChange={(evento) => setFiltroOwner(evento.target.value)} placeholder="Owner si aplica" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <select value={filtroVentana} onChange={(evento) => setFiltroVentana(evento.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="todas">Ventana: todas</option>
          {(fuentes?.ventanas ?? []).map((ventana) => <option key={ventana.id} value={ventana.id}>{ventana.etiqueta_visible}</option>)}
        </select>
        <select value={filtroEtapa} onChange={(evento) => setFiltroEtapa(evento.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="todas">Etapa: todas</option>
          {(fuentes?.etapas ?? []).map((etapa) => <option key={etapa.id} value={etapa.id}>{etapa.etiqueta_visible}</option>)}
        </select>
        <input type="date" value={fechaDesde} onChange={(evento) => setFechaDesde(evento.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <input type="date" value={fechaHasta} onChange={(evento) => setFechaHasta(evento.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={exportar} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700">Exportar CSV</button>
      </div>

      <EstadoVista cargando={cargando} error={error} vacio={filasFiltradas.length === 0} mensajeVacio="No hay filas de portafolio para los filtros seleccionados.">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-950/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Dominio</th>
                  <th className="px-4 py-3 text-left font-medium">Iniciativas</th>
                  <th className="px-4 py-3 text-left font-medium">Entregas</th>
                  <th className="px-4 py-3 text-left font-medium">Releases</th>
                  <th className="px-4 py-3 text-left font-medium">Bugs</th>
                  <th className="px-4 py-3 text-left font-medium">Bloqueos</th>
                  <th className="px-4 py-3 text-left font-medium">Deuda</th>
                  <th className="px-4 py-3 text-left font-medium">Mejoras</th>
                  <th className="px-4 py-3 text-left font-medium">Hallazgos</th>
                  <th className="px-4 py-3 text-left font-medium">Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filasFiltradas.map((fila) => (
                  <tr key={fila.codigo}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{fila.nombre}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{fila.owners[0] ?? 'Sin owner dominante'} · {fila.healthEstado}</p>
                    </td>
                    <td className="px-4 py-3">{fila.iniciativas}</td>
                    <td className="px-4 py-3">{fila.entregas}</td>
                    <td className="px-4 py-3">{fila.releases}</td>
                    <td className="px-4 py-3">{fila.bugsAbiertos}</td>
                    <td className="px-4 py-3">{fila.bloqueosAbiertos}</td>
                    <td className="px-4 py-3">{fila.deudaTecnica}</td>
                    <td className="px-4 py-3">{fila.mejoras}</td>
                    <td className="px-4 py-3">{fila.hallazgos}</td>
                    <td className="px-4 py-3">{fila.healthScore ?? 'Sin dato'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </EstadoVista>
    </section>
  )
}