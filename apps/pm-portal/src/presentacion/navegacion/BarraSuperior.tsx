import { useTema } from '@/compartido/tema/contextoTema'

export function BarraSuperior() {
  const { modoTema, alternarTema } = useTema()

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex w-full max-w-xl items-center gap-3">
        <input
          type="search"
          placeholder="Buscar en el portal"
          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:focus:border-slate-500"
        />
      </div>
      <div className="ml-4 flex items-center gap-2">
        <a
          href="#"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Repositorio
        </a>
        <button
          type="button"
          onClick={alternarTema}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {modoTema === 'oscuro' ? 'Modo claro' : 'Modo oscuro'}
        </button>
      </div>
    </header>
  )
}
