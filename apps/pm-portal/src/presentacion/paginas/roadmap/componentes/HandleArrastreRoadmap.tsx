import type { DragEvent } from 'react'

interface HandleArrastreRoadmapProps {
  etiqueta: string
  deshabilitado?: boolean
  activo?: boolean
  onDragStart: (evento: DragEvent<HTMLButtonElement>) => void
  onDragEnd: () => void
}

export function HandleArrastreRoadmap({
  etiqueta,
  deshabilitado = false,
  activo = false,
  onDragStart,
  onDragEnd
}: HandleArrastreRoadmapProps) {
  return (
    <button
      type="button"
      draggable={!deshabilitado}
      disabled={deshabilitado}
      onClick={(evento) => {
        evento.stopPropagation()
      }}
      onDragStart={(evento) => {
        evento.stopPropagation()
        evento.dataTransfer.effectAllowed = 'move'
        evento.dataTransfer.setData('text/plain', etiqueta)
        onDragStart(evento)
      }}
      onDragEnd={(evento) => {
        evento.stopPropagation()
        onDragEnd()
      }}
      title={`Reordenar ${etiqueta}`}
      aria-label={`Reordenar ${etiqueta}`}
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-slate-400 transition-colors ${
        deshabilitado
          ? 'cursor-not-allowed opacity-40'
          : activo
            ? 'cursor-grabbing text-slate-700 dark:text-slate-200'
            : 'cursor-grab hover:text-slate-600 dark:hover:text-slate-300'
      }`}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5 fill-current">
        <circle cx="5" cy="3.25" r="1.1" />
        <circle cx="11" cy="3.25" r="1.1" />
        <circle cx="5" cy="8" r="1.1" />
        <circle cx="11" cy="8" r="1.1" />
        <circle cx="5" cy="12.75" r="1.1" />
        <circle cx="11" cy="12.75" r="1.1" />
      </svg>
    </button>
  )
}