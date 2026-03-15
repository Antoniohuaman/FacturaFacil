import { useEffect, useMemo, useState } from 'react'
import type { HistorialCambioPm } from '@/dominio/modelos'
import { listarHistorialCambios } from '@/aplicacion/casos-uso/historialCambios'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { puedeAdministrar } from '@/compartido/utilidades/permisosRol'
import { formatearEstadoLegible, formatearFechaHoraCorta } from '@/compartido/utilidades/formatoPortal'

export function PaginaTrazabilidad() {
  const { rol } = useSesionPortalPM()
  const [eventos, setEventos] = useState<HistorialCambioPm[]>([])
  const [filtroModulo, setFiltroModulo] = useState('todos')
  const [filtroEntidad, setFiltroEntidad] = useState('todos')
  const [filtroAccion, setFiltroAccion] = useState<'todos' | 'crear' | 'editar' | 'eliminar'>('todos')
  const [filtroActor, setFiltroActor] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [eventoActivo, setEventoActivo] = useState<HistorialCambioPm | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const esAdmin = puedeAdministrar(rol)

  useEffect(() => {
    if (!esAdmin) {
      setCargando(false)
      return
    }

    const cargar = async () => {
      setCargando(true)
      setError(null)

      try {
        const data = await listarHistorialCambios({
          modulo: filtroModulo,
          entidad: filtroEntidad,
          accion: filtroAccion,
          actor: filtroActor,
          fechaDesde,
          fechaHasta
        })

        setEventos(data)
      } catch (errorInterno) {
        setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar el historial')
      } finally {
        setCargando(false)
      }
    }

    void cargar()
  }, [esAdmin, filtroModulo, filtroEntidad, filtroAccion, filtroActor, fechaDesde, fechaHasta])

  const modulos = useMemo(() => [...new Set(eventos.map((evento) => evento.modulo_codigo))].sort(), [eventos])
  const entidades = useMemo(() => [...new Set(eventos.map((evento) => evento.entidad))].sort(), [eventos])

  if (!esAdmin) {
    return (
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Trazabilidad</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Esta vista es exclusiva para administradores del portal PM.
          </p>
        </header>
      </section>
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Trazabilidad</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Historial transversal de cambios por módulo, entidad, actor y fecha.
        </p>
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-6 dark:border-slate-800 dark:bg-slate-900">
        <select value={filtroModulo} onChange={(evento) => setFiltroModulo(evento.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="todos">Módulo: todos</option>
          {modulos.map((modulo) => <option key={modulo} value={modulo}>{modulo}</option>)}
        </select>
        <select value={filtroEntidad} onChange={(evento) => setFiltroEntidad(evento.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="todos">Entidad: todas</option>
          {entidades.map((entidad) => <option key={entidad} value={entidad}>{entidad}</option>)}
        </select>
        <select value={filtroAccion} onChange={(evento) => setFiltroAccion(evento.target.value as 'todos' | 'crear' | 'editar' | 'eliminar')} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="todos">Acción: todas</option>
          <option value="crear">Crear</option>
          <option value="editar">Editar</option>
          <option value="eliminar">Eliminar</option>
        </select>
        <input value={filtroActor} onChange={(evento) => setFiltroActor(evento.target.value)} placeholder="Actor o email" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <input type="date" value={fechaDesde} onChange={(evento) => setFechaDesde(evento.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <input type="date" value={fechaHasta} onChange={(evento) => setFechaHasta(evento.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
      </div>

      <EstadoVista cargando={cargando} error={error} vacio={eventos.length === 0} mensajeVacio="No hay eventos de historial para los filtros seleccionados.">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">Fecha y hora</th>
                <th className="px-3 py-2">Módulo</th>
                <th className="px-3 py-2">Entidad</th>
                <th className="px-3 py-2">Acción</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Resumen</th>
                <th className="px-3 py-2">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((evento) => (
                <tr key={evento.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-3 py-2">{formatearFechaHoraCorta(evento.created_at)}</td>
                  <td className="px-3 py-2">{evento.modulo_codigo}</td>
                  <td className="px-3 py-2">{evento.entidad}</td>
                  <td className="px-3 py-2">{formatearEstadoLegible(evento.accion)}</td>
                  <td className="px-3 py-2">{evento.actor_email ?? evento.actor_user_id ?? 'Sistema'}</td>
                  <td className="px-3 py-2">{evento.resumen}</td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => setEventoActivo(evento)} className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">Ver JSON</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </EstadoVista>

      <ModalPortal abierto={Boolean(eventoActivo)} titulo="Detalle de cambio" alCerrar={() => setEventoActivo(null)}>
        {eventoActivo ? (
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium">Resumen</p>
              <p className="mt-1 text-slate-600 dark:text-slate-300">{eventoActivo.resumen}</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="font-medium">Antes</p>
                <pre className="mt-2 max-h-80 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950">{JSON.stringify(eventoActivo.antes_json, null, 2)}</pre>
              </div>
              <div>
                <p className="font-medium">Después</p>
                <pre className="mt-2 max-h-80 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950">{JSON.stringify(eventoActivo.despues_json, null, 2)}</pre>
              </div>
            </div>
            <div>
              <p className="font-medium">Metadata</p>
              <pre className="mt-2 max-h-60 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950">{JSON.stringify(eventoActivo.metadata_json, null, 2)}</pre>
            </div>
          </div>
        ) : null}
      </ModalPortal>
    </section>
  )
}