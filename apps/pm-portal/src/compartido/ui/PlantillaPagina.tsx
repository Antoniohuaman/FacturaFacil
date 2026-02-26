interface PropiedadesPlantillaPagina {
  titulo: string
  descripcion: string
  tipoContenido: 'tabla' | 'tarjetas'
}

function EstadoSinDatos({ titulo }: { titulo: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
      <p className="text-base font-semibold">Sin datos en {titulo}</p>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Aún no hay registros. Esta sección está lista para conectar datos en la siguiente fase.
      </p>
    </div>
  )
}

function TablaVacia() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
        <span>Nombre</span>
        <span>Estado</span>
        <span>Responsable</span>
        <span>Actualizado</span>
      </div>
      <div className="p-6">
        <EstadoSinDatos titulo="la tabla" />
      </div>
    </div>
  )
}

function TarjetasVacias() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {['Resumen', 'Prioridad', 'Seguimiento'].map((tarjeta) => (
        <article
          key={tarjeta}
          className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
        >
          <h3 className="text-sm font-semibold">{tarjeta}</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Sin datos disponibles.</p>
        </article>
      ))}
    </div>
  )
}

export function PlantillaPagina({ titulo, descripcion, tipoContenido }: PropiedadesPlantillaPagina) {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{titulo}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">{descripcion}</p>
      </header>

      <div className="flex justify-end">
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-lg bg-slate-300 px-4 py-2 text-sm font-medium text-slate-700 opacity-80 dark:bg-slate-700 dark:text-slate-300"
        >
          Crear
        </button>
      </div>

      {tipoContenido === 'tabla' ? <TablaVacia /> : <TarjetasVacias />}
    </section>
  )
}
