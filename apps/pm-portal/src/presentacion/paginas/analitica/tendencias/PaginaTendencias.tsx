import { useEffect, useMemo, useState } from 'react'
import { exportarCsv } from '@/compartido/utilidades/csv'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { obtenerFuentesTendenciasAnalitica } from '@/aplicacion/casos-uso/analitica'
import { NavegacionAnalitica } from '@/presentacion/paginas/analitica/NavegacionAnalitica'

type FuentesTendencias = Awaited<ReturnType<typeof obtenerFuentesTendenciasAnalitica>>

interface FilaTendencia {
  periodo: string
  releases: number
  bugsReportados: number
  bugsResueltos: number
  mejoras: number
  deudaTecnica: number
  validaciones: number
  decisiones: number
  hallazgos: number
}

function obtenerClaveMes(fecha: string | null | undefined) {
  if (!fecha) {
    return null
  }

  return fecha.slice(0, 7)
}

function construirPeriodos(desde: string, hasta: string) {
  const periodos: string[] = []
  const cursor = new Date(`${desde}T00:00:00`)
  const limite = new Date(`${hasta}T00:00:00`)
  cursor.setDate(1)
  limite.setDate(1)

  while (cursor <= limite) {
    const clave = `${String(cursor.getFullYear())}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
    periodos.push(clave)
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return periodos
}

export function PaginaTendencias() {
  const hoy = new Date()
  const haceDoceMeses = new Date(hoy)
  haceDoceMeses.setMonth(haceDoceMeses.getMonth() - 11)

  const [fuentes, setFuentes] = useState<FuentesTendencias | null>(null)
  const [fechaDesde, setFechaDesde] = useState(`${String(haceDoceMeses.getFullYear())}-${String(haceDoceMeses.getMonth() + 1).padStart(2, '0')}-01`)
  const [fechaHasta, setFechaHasta] = useState(`${String(hoy.getFullYear())}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const cargar = async () => {
      setCargando(true)
      setError(null)

      try {
        const resultado = await obtenerFuentesTendenciasAnalitica()
        setFuentes(resultado)
      } catch (errorInterno) {
        setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudieron cargar las tendencias')
      } finally {
        setCargando(false)
      }
    }

    void cargar()
  }, [])

  const filas = useMemo(() => {
    if (!fuentes || fechaHasta < fechaDesde) {
      return [] as FilaTendencia[]
    }

    const periodos = construirPeriodos(fechaDesde, fechaHasta)
    const mapa = new Map<string, FilaTendencia>(
      periodos.map((periodo) => [
        periodo,
        {
          periodo,
          releases: 0,
          bugsReportados: 0,
          bugsResueltos: 0,
          mejoras: 0,
          deudaTecnica: 0,
          validaciones: 0,
          decisiones: 0,
          hallazgos: 0
        }
      ])
    )

    for (const release of fuentes.releases) {
      const clave = obtenerClaveMes(release.fecha_programada)
      if (clave && mapa.has(clave)) {
        mapa.get(clave)!.releases += 1
      }
    }

    for (const bug of fuentes.bugs) {
      const claveReporte = obtenerClaveMes(bug.fecha_reporte)
      if (claveReporte && mapa.has(claveReporte)) {
        mapa.get(claveReporte)!.bugsReportados += 1
      }

      const claveResolucion = obtenerClaveMes(bug.fecha_resolucion)
      if (claveResolucion && mapa.has(claveResolucion)) {
        mapa.get(claveResolucion)!.bugsResueltos += 1
      }
    }

    for (const mejora of fuentes.mejoras) {
      const clave = obtenerClaveMes(mejora.fecha_solicitud)
      if (clave && mapa.has(clave)) {
        mapa.get(clave)!.mejoras += 1
      }
    }

    for (const deuda of fuentes.deudas) {
      const clave = obtenerClaveMes(deuda.fecha_identificacion)
      if (clave && mapa.has(clave)) {
        mapa.get(clave)!.deudaTecnica += 1
      }
    }

    for (const ejecucion of fuentes.ejecuciones) {
      const clave = obtenerClaveMes(ejecucion.fecha_ejecucion)
      if (clave && mapa.has(clave)) {
        mapa.get(clave)!.validaciones += 1
      }
    }

    for (const decision of fuentes.decisiones) {
      const clave = obtenerClaveMes(decision.fecha_decision)
      if (clave && mapa.has(clave)) {
        mapa.get(clave)!.decisiones += 1
      }
    }

    for (const hallazgo of fuentes.hallazgos) {
      const clave = obtenerClaveMes(hallazgo.created_at)
      if (clave && mapa.has(clave)) {
        mapa.get(clave)!.hallazgos += 1
      }
    }

    return periodos.map((periodo) => mapa.get(periodo) as FilaTendencia)
  }, [fechaDesde, fechaHasta, fuentes])

  const maximo = useMemo(() => {
    return filas.reduce((valorMaximo, fila) => {
      return Math.max(
        valorMaximo,
        fila.releases,
        fila.bugsReportados,
        fila.bugsResueltos,
        fila.mejoras,
        fila.deudaTecnica,
        fila.validaciones,
        fila.decisiones,
        fila.hallazgos
      )
    }, 1)
  }, [filas])

  const exportar = () => {
    exportarCsv(
      'pm-portal-analitica-tendencias.csv',
      [
        { encabezado: 'Periodo', valor: (fila) => fila.periodo },
        { encabezado: 'Releases por período', valor: (fila) => fila.releases },
        { encabezado: 'Bugs reportados', valor: (fila) => fila.bugsReportados },
        { encabezado: 'Bugs resueltos', valor: (fila) => fila.bugsResueltos },
        { encabezado: 'Mejoras registradas', valor: (fila) => fila.mejoras },
        { encabezado: 'Deuda técnica registrada', valor: (fila) => fila.deudaTecnica },
        { encabezado: 'Validaciones ejecutadas', valor: (fila) => fila.validaciones },
        { encabezado: 'Decisiones registradas', valor: (fila) => fila.decisiones },
        { encabezado: 'Hallazgos', valor: (fila) => fila.hallazgos }
      ],
      filas
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Tendencias</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Evolución mensual simple de releases, bugs, mejoras, deuda técnica, validaciones, decisiones y hallazgos.
          </p>
        </div>
        <NavegacionAnalitica />
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3 dark:border-slate-800 dark:bg-slate-900">
        <input type="date" value={fechaDesde} onChange={(evento) => setFechaDesde(evento.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <input type="date" value={fechaHasta} onChange={(evento) => setFechaHasta(evento.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <button type="button" onClick={exportar} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700">Exportar CSV</button>
      </div>

      <EstadoVista cargando={cargando} error={error} vacio={filas.length === 0} mensajeVacio="No hay datos agregados para el rango seleccionado.">
        <>
          <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-8">
            {[
              ['Releases', filas.reduce((total, fila) => total + fila.releases, 0)],
              ['Bugs reportados', filas.reduce((total, fila) => total + fila.bugsReportados, 0)],
              ['Bugs resueltos', filas.reduce((total, fila) => total + fila.bugsResueltos, 0)],
              ['Mejoras', filas.reduce((total, fila) => total + fila.mejoras, 0)],
              ['Deuda técnica', filas.reduce((total, fila) => total + fila.deudaTecnica, 0)],
              ['Validaciones', filas.reduce((total, fila) => total + fila.validaciones, 0)],
              ['Decisiones', filas.reduce((total, fila) => total + fila.decisiones, 0)],
              ['Hallazgos', filas.reduce((total, fila) => total + fila.hallazgos, 0)]
            ].map(([titulo, valor]) => (
              <article key={titulo} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{titulo}</p>
                <p className="mt-2 text-2xl font-semibold">{valor}</p>
              </article>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-950/40">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Periodo</th>
                    <th className="px-4 py-3 text-left font-medium">Releases</th>
                    <th className="px-4 py-3 text-left font-medium">Bugs reportados</th>
                    <th className="px-4 py-3 text-left font-medium">Bugs resueltos</th>
                    <th className="px-4 py-3 text-left font-medium">Mejoras</th>
                    <th className="px-4 py-3 text-left font-medium">Deuda técnica</th>
                    <th className="px-4 py-3 text-left font-medium">Validaciones</th>
                    <th className="px-4 py-3 text-left font-medium">Decisiones</th>
                    <th className="px-4 py-3 text-left font-medium">Hallazgos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filas.map((fila) => (
                    <tr key={fila.periodo}>
                      <td className="px-4 py-3 font-medium">{fila.periodo}</td>
                      {[fila.releases, fila.bugsReportados, fila.bugsResueltos, fila.mejoras, fila.deudaTecnica, fila.validaciones, fila.decisiones, fila.hallazgos].map((valor, indice) => (
                        <td key={`${fila.periodo}-${String(indice)}`} className="px-4 py-3">
                          <div className="flex min-w-[110px] items-center gap-3">
                            <span className="w-8 text-right">{valor}</span>
                            <div className="h-2 flex-1 rounded-full bg-slate-100 dark:bg-slate-800">
                              <div className="h-2 rounded-full bg-slate-900 dark:bg-slate-200" style={{ width: `${String(Math.round((valor / maximo) * 100))}%` }} />
                            </div>
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      </EstadoVista>
    </section>
  )
}