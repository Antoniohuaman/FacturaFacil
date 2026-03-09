import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { PeriodoEstrategicoPm } from '@/dominio/modelos'
import { listarPeriodosEstrategicos } from '@/aplicacion/casos-uso/estrategia'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { NavegacionEstrategia } from '@/presentacion/paginas/estrategia/NavegacionEstrategia'
import { GestionPeriodosEstrategicos } from '@/presentacion/paginas/estrategia/GestionPeriodosEstrategicos'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'

export function PaginaPeriodosEstrategicos() {
  const { rol } = useSesionPortalPM()
  const [periodos, setPeriodos] = useState<PeriodoEstrategicoPm[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const esEdicionPermitida = puedeEditar(rol)

  const cargar = async () => {
    setCargando(true)
    setError(null)

    try {
      setPeriodos(await listarPeriodosEstrategicos())
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudieron cargar los períodos')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Períodos estratégicos</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Gestiona los datos maestros que habilitan objetivos estratégicos, KR, KPIs e hipótesis.
          </p>
        </div>
        <NavegacionEstrategia />
      </header>

      <EstadoVista cargando={cargando} error={error} vacio={false} mensajeVacio="">
        {periodos.length > 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <p className="font-medium text-slate-900 dark:text-slate-100">Flujo habilitado</p>
            <p className="mt-1">
              Una vez creado un período, ya puede utilizarse en <Link to="/estrategia/okrs" className="font-medium underline underline-offset-2">OKRs</Link>, <Link to="/estrategia/kpis" className="font-medium underline underline-offset-2">KPIs</Link> y <Link to="/estrategia/hipotesis" className="font-medium underline underline-offset-2">Hipótesis</Link>.
            </p>
          </div>
        ) : null}
        <GestionPeriodosEstrategicos periodos={periodos} esEdicionPermitida={esEdicionPermitida} onRecargar={cargar} />
      </EstadoVista>
    </section>
  )
}