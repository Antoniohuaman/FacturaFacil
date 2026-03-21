import { useEffect, useId, useRef } from 'react'

interface MenuCrearRoadmapGlobalProps {
  abierto: boolean
  alAlternar: () => void
  alCerrar: () => void
  alCrearObjetivo: () => void
  alCrearIniciativa: () => void
  alCrearEntrega: () => void
}

function IconoMas() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function MenuCrearRoadmapGlobal({
  abierto,
  alAlternar,
  alCerrar,
  alCrearObjetivo,
  alCrearIniciativa,
  alCrearEntrega
}: MenuCrearRoadmapGlobalProps) {
  const contenedorRef = useRef<HTMLDivElement | null>(null)
  const primerItemRef = useRef<HTMLButtonElement | null>(null)
  const menuId = useId()

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
      primerItemRef.current?.focus()
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
        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 ${
          abierto
            ? 'border-slate-400 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
            : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800'
        }`}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? menuId : undefined}
      >
        <IconoMas />
        <span>Crear</span>
      </button>

      {abierto ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Crear entidades del roadmap"
          className="absolute right-0 top-12 z-[70] min-w-[176px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900"
        >
          <button
            ref={primerItemRef}
            type="button"
            role="menuitem"
            onClick={() => {
              alCerrar()
              alCrearObjetivo()
            }}
            className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800"
          >
            Crear objetivo
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              alCerrar()
              alCrearIniciativa()
            }}
            className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800"
          >
            Crear iniciativa
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              alCerrar()
              alCrearEntrega()
            }}
            className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800"
          >
            Crear entrega
          </button>
        </div>
      ) : null}
    </div>
  )
}