import { createBrowserRouter } from 'react-router-dom'
import { PlantillaPortal } from '@/presentacion/layout/PlantillaPortal'
import { GuardSesionPortalPM } from '@/aplicacion/autenticacion/GuardSesionPortalPM'
import { PaginaIngresar } from '@/presentacion/paginas/ingresar/PaginaIngresar'
import { PaginaTablero } from '@/presentacion/paginas/tablero/PaginaTablero'
import { PaginaRoadmap } from '@/presentacion/paginas/roadmap/PaginaRoadmap'
import { PaginaObjetivosRoadmap } from '@/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap'
import { PaginaIniciativasRoadmap } from '@/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap'
import { PaginaEntregasRoadmap } from '@/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap'
import { PaginaMatrizValor } from '@/presentacion/paginas/matriz-valor/PaginaMatrizValor'
import { PaginaValidacion } from '@/presentacion/paginas/validacion/PaginaValidacion'
import { PaginaValidacionPorModulo } from '@/presentacion/paginas/validacion/por-modulo/PaginaValidacionPorModulo'
import { PaginaEjecucionesValidacion } from '@/presentacion/paginas/validacion/ejecuciones/PaginaEjecucionesValidacion'
import { PaginaDecisiones } from '@/presentacion/paginas/decisiones/PaginaDecisiones'
import { PaginaAuditorias } from '@/presentacion/paginas/auditorias/PaginaAuditorias'
import { PaginaAjustes } from '@/presentacion/paginas/ajustes/PaginaAjustes'

export const enrutadorPortal = createBrowserRouter([
  {
    path: '/ingresar',
    element: <PaginaIngresar />
  },
  {
    path: '/',
    element: (
      <GuardSesionPortalPM>
        <PlantillaPortal />
      </GuardSesionPortalPM>
    ),
    children: [
      { index: true, element: <PaginaTablero /> },
      { path: 'roadmap', element: <PaginaRoadmap /> },
      { path: 'roadmap/objetivos', element: <PaginaObjetivosRoadmap /> },
      { path: 'roadmap/iniciativas', element: <PaginaIniciativasRoadmap /> },
      { path: 'roadmap/entregas', element: <PaginaEntregasRoadmap /> },
      { path: 'matriz-valor', element: <PaginaMatrizValor /> },
      { path: 'validacion', element: <PaginaValidacion /> },
      { path: 'validacion/por-modulo', element: <PaginaValidacionPorModulo /> },
      { path: 'validacion/ejecuciones', element: <PaginaEjecucionesValidacion /> },
      { path: 'decisiones', element: <PaginaDecisiones /> },
      { path: 'auditorias', element: <PaginaAuditorias /> },
      { path: 'ajustes', element: <PaginaAjustes /> }
    ]
  }
])
