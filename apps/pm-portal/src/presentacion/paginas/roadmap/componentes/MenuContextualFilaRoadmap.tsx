import { useEffect, useId, useRef } from 'react'

interface MenuContextualFilaRoadmapProps {
  etiquetaEntidad: string
  visible: boolean
  abierto: boolean
  puedeEditar: boolean
  alAlternar: () => void
  alCerrar: () => void
  alVer: () => void
  alEditar: () => void
  alEliminar: () => void
}

function IconoTresPuntos() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="h-4 w-4">
      <circle cx="3" cy="8" r="1.25" />
      <circle cx="8" cy="8" r="1.25" />
      <circle cx="13" cy="8" r="1.25" />
    </svg>
  )
}

export function MenuContextualFilaRoadmap({
  etiquetaEntidad,
  visible,
  abierto,
  puedeEditar,
  alAlternar,
  alCerrar,
  alVer,
  alEditar,
  alEliminar
}: MenuContextualFilaRoadmapProps) {
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

  const claseBoton = `inline-flex h-7 w-7 items-center justify-center rounded-md border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 ${
    abierto || visible
      ? 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-100'
      : 'border-transparent bg-transparent text-slate-400 opacity-0 hover:text-slate-600 focus-visible:border-slate-300 focus-visible:bg-white focus-visible:text-slate-700 focus-visible:opacity-100 dark:text-slate-500 dark:hover:text-slate-300 dark:focus-visible:border-slate-700 dark:focus-visible:bg-slate-900 dark:focus-visible:text-slate-100'
  }`

  return (
    <div ref={contenedorRef} className="relative ml-1 flex w-8 shrink-0 justify-end self-start">
      <button
        type="button"
        className={claseBoton}
        aria-label={`Acciones para ${etiquetaEntidad}`}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? menuId : undefined}
        onClick={alAlternar}
      >
        <IconoTresPuntos />
      </button>

      {abierto ? (
        <div
          id={menuId}
          role="menu"
          aria-label={`Acciones rápidas para ${etiquetaEntidad}`}
          className="absolute right-0 top-8 z-[70] min-w-[144px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900"
        >
          <button
            ref={primerItemRef}
            type="button"
            role="menuitem"
            onClick={() => {
              alCerrar()
              alVer()
            }}
            className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800"
          >
            Ver
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!puedeEditar}
            onClick={() => {
              alCerrar()
              alEditar()
            }}
            className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800"
          >
            Editar
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!puedeEditar}
            onClick={() => {
              alCerrar()
              alEliminar()
            }}
            className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-rose-700 transition hover:bg-rose-50 focus-visible:bg-rose-50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-950/40 dark:focus-visible:bg-rose-950/40"
          >
            Eliminar
          </button>
        </div>
      ) : null}
    </div>
  )
}