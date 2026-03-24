import { useEffect, useId, useRef } from 'react'

interface MenuPersonalizacionCronogramaProps {
  abierto: boolean
  tooltipsVisibles: boolean
  alAlternar: () => void
  alCerrar: () => void
  alCambiarTooltipsVisibles: (visible: boolean) => void
}

function IconoMasOpcionesVertical() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="h-4 w-4">
      <circle cx="8" cy="3" r="1.25" />
      <circle cx="8" cy="8" r="1.25" />
      <circle cx="8" cy="13" r="1.25" />
    </svg>
  )
}

export function MenuPersonalizacionCronograma({
  abierto,
  tooltipsVisibles,
  alAlternar,
  alCerrar,
  alCambiarTooltipsVisibles
}: MenuPersonalizacionCronogramaProps) {
  const contenedorRef = useRef<HTMLDivElement | null>(null)
  const switchRef = useRef<HTMLButtonElement | null>(null)
  const panelId = useId()

  useEffect(() => {
    if (!abierto) {
      return
    }

    const manejarPointerDown = (evento: PointerEvent) => {
      if (!contenedorRef.current?.contains(evento.target as Node)) {
        alCerrar()
      }
    }

    const manejarKeyDown = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        alCerrar()
      }
    }

    const frame = window.requestAnimationFrame(() => {
      switchRef.current?.focus()
    })

    window.addEventListener('pointerdown', manejarPointerDown)
    window.addEventListener('keydown', manejarKeyDown)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('pointerdown', manejarPointerDown)
      window.removeEventListener('keydown', manejarKeyDown)
    }
  }, [abierto, alCerrar])

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        onClick={alAlternar}
        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 ${
          abierto
            ? 'border-slate-400 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
            : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-100'
        }`}
        aria-label="Más opciones del cronograma"
        title="Más opciones"
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-controls={abierto ? panelId : undefined}
      >
        <IconoMasOpcionesVertical />
      </button>

      {abierto ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Opciones de visualización del cronograma"
          className="absolute right-0 top-12 z-[70] min-w-[220px] rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Mostrar tooltips</p>

            <button
              ref={switchRef}
              type="button"
              role="switch"
              aria-checked={tooltipsVisibles}
              aria-label="Mostrar tooltips"
              onClick={() => alCambiarTooltipsVisibles(!tooltipsVisibles)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 ${
                tooltipsVisibles
                  ? 'border-slate-900 bg-slate-900 dark:border-slate-100 dark:bg-slate-100'
                  : 'border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition dark:bg-slate-900 ${
                  tooltipsVisibles ? 'translate-x-[22px]' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}