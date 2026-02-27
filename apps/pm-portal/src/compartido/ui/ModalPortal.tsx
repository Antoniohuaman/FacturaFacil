import type { PropsWithChildren } from 'react'

interface PropiedadesModalPortal {
  abierto: boolean
  titulo: string
  alCerrar: () => void
}

export function ModalPortal({ abierto, titulo, alCerrar, children }: PropsWithChildren<PropiedadesModalPortal>) {
  if (!abierto) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={alCerrar}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(evento) => evento.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <button
            type="button"
            onClick={alCerrar}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
          >
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
