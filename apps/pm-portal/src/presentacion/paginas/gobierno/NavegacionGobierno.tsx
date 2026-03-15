import { NavLink } from 'react-router-dom'

const enlaces = [
  { etiqueta: 'Resumen de gobierno', ruta: '/gobierno' },
  { etiqueta: 'Stakeholders', ruta: '/gobierno/stakeholders' },
  { etiqueta: 'Riesgos', ruta: '/gobierno/riesgos' },
  { etiqueta: 'Dependencias', ruta: '/gobierno/dependencias' }
]

export function NavegacionGobierno() {
  return (
    <nav className="flex flex-wrap gap-2">
      {enlaces.map((enlace) => (
        <NavLink
          key={enlace.ruta}
          to={enlace.ruta}
          end={enlace.ruta === '/gobierno'}
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