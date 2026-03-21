import { useEffect, useId, useRef, useState } from 'react'

type VistaTemporalCronograma = 'anio' | 'trimestre'

interface ControlTemporalCronogramaProps {
  vistaTemporal: VistaTemporalCronograma
  anioSeleccionado: number
  trimestreSeleccionado: number
  aniosDisponibles: number[]
  alCambiarVistaTemporal: (vista: VistaTemporalCronograma) => void
  alCambiarAnio: (anio: number) => void
  alCambiarTrimestre: (trimestre: number) => void
}

function IconoEscalaTemporal() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 3.5v13M10 3.5v13M15 3.5v13" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
    </svg>
  )
}

function IconoChevronPanel({ expandido }: { expandido: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-3.5 w-3.5">
      <path
        d={expandido ? 'M9.5 3.5L5 8l4.5 4.5' : 'M6.5 3.5L11 8l-4.5 4.5'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ControlTemporalCronograma({
  vistaTemporal,
  anioSeleccionado,
  trimestreSeleccionado,
  aniosDisponibles,
  alCambiarVistaTemporal,
  alCambiarAnio,
  alCambiarTrimestre
}: ControlTemporalCronogramaProps) {
  const [expandido, setExpandido] = useState(false)
  const contenedorRef = useRef<HTMLDivElement | null>(null)
  const panelId = useId()

  useEffect(() => {
    if (!expandido) {
      return
    }

    const manejarMouseDown = (evento: MouseEvent) => {
      if (!contenedorRef.current?.contains(evento.target as Node)) {
        setExpandido(false)
      }
    }

    const manejarKeyDown = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        setExpandido(false)
      }
    }

    window.addEventListener('mousedown', manejarMouseDown)
    window.addEventListener('keydown', manejarKeyDown)

    return () => {
      window.removeEventListener('mousedown', manejarMouseDown)
      window.removeEventListener('keydown', manejarKeyDown)
    }
  }, [expandido])

  const descripcionEscala = vistaTemporal === 'trimestre' ? `T${trimestreSeleccionado}` : 'Año'

  return (
    <div ref={contenedorRef} className="flex shrink-0 items-center justify-end gap-1.5">
      <div
        id={panelId}
        className={`overflow-hidden rounded-2xl border border-slate-200 bg-white/96 shadow-sm backdrop-blur transition-[max-width,opacity,padding,margin] duration-200 dark:border-slate-700 dark:bg-slate-900/96 ${
          expandido ? 'max-w-[25rem] px-2 py-1 opacity-100' : 'pointer-events-none -mr-1.5 max-w-0 border-transparent px-0 py-0 opacity-0 shadow-none'
        }`}
      >
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50/90 p-0.5 dark:border-slate-700 dark:bg-slate-800/80">
            <button
              type="button"
              onClick={() => alCambiarVistaTemporal('anio')}
              className={`rounded-lg px-2.5 py-1 text-[13px] font-medium transition ${
                vistaTemporal === 'anio'
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
              }`}
              aria-pressed={vistaTemporal === 'anio'}
            >
              Año
            </button>
            <button
              type="button"
              onClick={() => alCambiarVistaTemporal('trimestre')}
              className={`rounded-lg px-2.5 py-1 text-[13px] font-medium transition ${
                vistaTemporal === 'trimestre'
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
              }`}
              aria-pressed={vistaTemporal === 'trimestre'}
            >
              Trimestre
            </button>
          </div>

          <label className="block">
            <span className="sr-only">Seleccionar año</span>
            <select
              value={anioSeleccionado}
              onChange={(evento) => alCambiarAnio(Number(evento.target.value))}
              aria-label="Seleccionar año del cronograma"
              className="h-8 rounded-xl border border-slate-300 bg-white px-2.5 pr-7 text-[13px] text-slate-700 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-600"
            >
              {aniosDisponibles.map((anio) => (
                <option key={anio} value={anio}>
                  {anio}
                </option>
              ))}
            </select>
          </label>

          {vistaTemporal === 'trimestre' ? (
            <label className="block">
              <span className="sr-only">Seleccionar trimestre</span>
              <select
                value={trimestreSeleccionado}
                onChange={(evento) => alCambiarTrimestre(Number(evento.target.value))}
                aria-label="Seleccionar trimestre del cronograma"
                className="h-8 rounded-xl border border-slate-300 bg-white px-2.5 pr-7 text-[13px] text-slate-700 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-600"
              >
                <option value={1}>T1</option>
                <option value={2}>T2</option>
                <option value={3}>T3</option>
                <option value={4}>T4</option>
              </select>
            </label>
          ) : null}

          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {descripcionEscala}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpandido((actual) => !actual)}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border transition ${
          expandido
            ? 'border-slate-400 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200'
        }`}
        aria-expanded={expandido}
        aria-controls={panelId}
        aria-label={expandido ? 'Contraer control temporal del cronograma' : 'Expandir control temporal del cronograma'}
        title={expandido ? 'Contraer' : 'Expandir'}
      >
        {expandido ? <IconoChevronPanel expandido={expandido} /> : <IconoEscalaTemporal />}
      </button>
    </div>
  )
}