import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { BarraSuperior } from '@/presentacion/navegacion/BarraSuperior'
import { BarraLateral } from '@/presentacion/navegacion/BarraLateral'

export function PlantillaPortal() {
  const [barraColapsada, setBarraColapsada] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <BarraLateral
        colapsada={barraColapsada}
        alternarColapso={() => setBarraColapsada((estadoActual) => !estadoActual)}
      />

      <div className="flex h-screen min-w-0 flex-1 flex-col">
        <BarraSuperior />
        <main className="min-h-0 flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
