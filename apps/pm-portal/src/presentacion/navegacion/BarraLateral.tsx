import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { menuPortal } from '@/presentacion/navegacion/menuPortal'

interface PropiedadesBarraLateral {
  colapsada: boolean
  alternarColapso: () => void
}

export function BarraLateral({ colapsada, alternarColapso }: PropiedadesBarraLateral) {
  const ubicacion = useLocation()

  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({
    Roadmap: true,
    Validación: true,
    Estrategia: true,
    Discovery: true,
    Requerimientos: true
  })

  const rutaActiva = ubicacion.pathname

  const menuConEstado = useMemo(
    () =>
      menuPortal.map((item) => ({
        ...item,
        activo: rutaActiva === item.ruta || rutaActiva.startsWith(`${item.ruta}/`)
      })),
    [rutaActiva]
  )

  return (
    <aside
      className={`flex h-screen flex-col border-r border-slate-200 bg-white transition-all dark:border-slate-800 dark:bg-slate-900 ${
        colapsada ? 'w-16' : 'w-72'
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-3 dark:border-slate-800">
        {!colapsada && <span className="text-sm font-semibold">Portal PM</span>}
        <button
          type="button"
          onClick={alternarColapso}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
          aria-label="Alternar barra lateral"
        >
          {colapsada ? '»' : '«'}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {menuConEstado.map((item) => {
            const tieneSubmenu = Boolean(item.submenus?.length)
            const abierto = abiertos[item.etiqueta] ?? false

            return (
              <li key={item.etiqueta}>
                <div className="flex items-center gap-1">
                  <Link
                    to={item.ruta}
                    className={`flex-1 truncate rounded-md px-3 py-2 text-sm transition ${
                      item.activo
                        ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                    title={colapsada ? item.etiqueta : undefined}
                  >
                    {colapsada ? item.etiqueta.charAt(0) : item.etiqueta}
                  </Link>

                  {!colapsada && tieneSubmenu && (
                    <button
                      type="button"
                      onClick={() =>
                        setAbiertos((estadoActual) => ({
                          ...estadoActual,
                          [item.etiqueta]: !abierto
                        }))
                      }
                      className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      aria-label={`Alternar submenú de ${item.etiqueta}`}
                    >
                      {abierto ? '−' : '+'}
                    </button>
                  )}
                </div>

                {!colapsada && tieneSubmenu && abierto && (
                  <ul className="mt-1 space-y-1 pl-4">
                    {item.submenus?.map((submenu) => {
                      const activoSubmenu = rutaActiva === submenu.ruta
                      return (
                        <li key={submenu.ruta}>
                          <Link
                            to={submenu.ruta}
                            className={`block rounded-md px-3 py-2 text-sm transition ${
                              activoSubmenu
                                ? 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white'
                                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                            }`}
                          >
                            {submenu.etiqueta}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
