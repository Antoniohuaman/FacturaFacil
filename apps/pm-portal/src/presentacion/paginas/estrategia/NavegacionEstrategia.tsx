import { NavLink } from 'react-router-dom'

const enlaces = [
  { etiqueta: 'Resumen estratégico', ruta: '/estrategia' },
  { etiqueta: 'Períodos', ruta: '/estrategia/periodos' },
  { etiqueta: 'OKRs', ruta: '/estrategia/okrs' },
  { etiqueta: 'KPIs', ruta: '/estrategia/kpis' },
  { etiqueta: 'Hipótesis estrategia', ruta: '/estrategia/hipotesis' }
]

export function NavegacionEstrategia() {
  return (
    <nav className="flex flex-wrap gap-2">
      {enlaces.map((enlace) => (
        <NavLink
          key={enlace.ruta}
          to={enlace.ruta}
          end={enlace.ruta === '/estrategia'}
          className={({ isActive }) =>
            `rounded-full px-3 py-1.5 text-sm transition ${
              isActive
                ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900'
                : 'border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
            }`
          }
        >
          {enlace.etiqueta}
        </NavLink>
      ))}
    </nav>
  )
}