import { createBrowserRouter } from 'react-router-dom'
import { PlantillaPortal } from '@/presentacion/layout/PlantillaPortal'
import { GuardSesionPortalPM } from '@/aplicacion/autenticacion/GuardSesionPortalPM'
import { PaginaIngresar } from '@/presentacion/paginas/ingresar/PaginaIngresar'
import { PaginaTablero } from '@/presentacion/paginas/tablero/PaginaTablero'
import { PaginaRoadmap } from '@/presentacion/paginas/roadmap/PaginaRoadmap'
import { PaginaCronogramaRoadmap } from '@/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap'
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
import { PaginaResumenEstrategico } from '@/presentacion/paginas/estrategia/PaginaResumenEstrategico'
import { PaginaPeriodosEstrategicos } from '@/presentacion/paginas/estrategia/periodos/PaginaPeriodosEstrategicos'
import { PaginaOkrs } from '@/presentacion/paginas/estrategia/okrs/PaginaOkrs'
import { PaginaKpisEstrategicos } from '@/presentacion/paginas/estrategia/kpis/PaginaKpisEstrategicos'
import { PaginaHipotesis } from '@/presentacion/paginas/estrategia/hipotesis/PaginaHipotesis'
import { PaginaTrazabilidad } from '@/presentacion/paginas/trazabilidad/PaginaTrazabilidad'
import { PaginaResumenDiscovery } from '@/presentacion/paginas/discovery/PaginaResumenDiscovery'
import { PaginaInsights } from '@/presentacion/paginas/discovery/insights/PaginaInsights'
import { PaginaProblemasOportunidades } from '@/presentacion/paginas/discovery/problemas/PaginaProblemasOportunidades'
import { PaginaInvestigaciones } from '@/presentacion/paginas/discovery/investigaciones/PaginaInvestigaciones'
import { PaginaSegmentos } from '@/presentacion/paginas/discovery/segmentos/PaginaSegmentos'
import { PaginaHipotesisDiscovery } from '@/presentacion/paginas/discovery/hipotesis/PaginaHipotesisDiscovery'
import { PaginaResumenRequerimientos } from '@/presentacion/paginas/requerimientos/PaginaResumenRequerimientos'
import { PaginaHistoriasUsuario } from '@/presentacion/paginas/requerimientos/historias/PaginaHistoriasUsuario'
import { PaginaCasosUso } from '@/presentacion/paginas/requerimientos/casos-uso/PaginaCasosUso'
import { PaginaReglasNegocio } from '@/presentacion/paginas/requerimientos/reglas/PaginaReglasNegocio'
import { PaginaRequerimientosNoFuncionales } from '@/presentacion/paginas/requerimientos/no-funcionales/PaginaRequerimientosNoFuncionales'
import { PaginaResumenLanzamientos } from '@/presentacion/paginas/lanzamientos/PaginaResumenLanzamientos'
import { PaginaReleases } from '@/presentacion/paginas/lanzamientos/releases/PaginaReleases'
import { PaginaSeguimientoLanzamientos } from '@/presentacion/paginas/lanzamientos/seguimiento/PaginaSeguimientoLanzamientos'
import { PaginaResumenOperacion } from '@/presentacion/paginas/operacion/PaginaResumenOperacion'
import { PaginaBugs } from '@/presentacion/paginas/operacion/bugs/PaginaBugs'
import { PaginaMejoras } from '@/presentacion/paginas/operacion/mejoras/PaginaMejoras'
import { PaginaDeudaTecnica } from '@/presentacion/paginas/operacion/deuda-tecnica/PaginaDeudaTecnica'
import { PaginaBloqueos } from '@/presentacion/paginas/operacion/bloqueos/PaginaBloqueos'
import { PaginaLeccionesAprendidas } from '@/presentacion/paginas/operacion/lecciones/PaginaLeccionesAprendidas'
import { PaginaResumenAnalitico } from '@/presentacion/paginas/analitica/PaginaResumenAnalitico'
import { PaginaKpis } from '@/presentacion/paginas/analitica/kpis/PaginaKpis'
import { PaginaPortafolio } from '@/presentacion/paginas/analitica/portafolio/PaginaPortafolio'
import { PaginaTendencias } from '@/presentacion/paginas/analitica/tendencias/PaginaTendencias'
import { PaginaHealthScores } from '@/presentacion/paginas/analitica/health-scores/PaginaHealthScores'
import { PaginaResumenGobierno } from '@/presentacion/paginas/gobierno/PaginaResumenGobierno'
import { PaginaStakeholders } from '@/presentacion/paginas/gobierno/stakeholders/PaginaStakeholders'
import { PaginaRiesgos } from '@/presentacion/paginas/gobierno/riesgos/PaginaRiesgos'
import { PaginaDependencias } from '@/presentacion/paginas/gobierno/dependencias/PaginaDependencias'

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
      { path: 'roadmap/cronograma', element: <PaginaCronogramaRoadmap /> },
      { path: 'roadmap/objetivos', element: <PaginaObjetivosRoadmap /> },
      { path: 'roadmap/iniciativas', element: <PaginaIniciativasRoadmap /> },
      { path: 'roadmap/entregas', element: <PaginaEntregasRoadmap /> },
      { path: 'matriz-valor', element: <PaginaMatrizValor /> },
      { path: 'validacion', element: <PaginaValidacion /> },
      { path: 'validacion/por-modulo', element: <PaginaValidacionPorModulo /> },
      { path: 'validacion/ejecuciones', element: <PaginaEjecucionesValidacion /> },
      { path: 'estrategia', element: <PaginaResumenEstrategico /> },
      { path: 'estrategia/periodos', element: <PaginaPeriodosEstrategicos /> },
      { path: 'estrategia/okrs', element: <PaginaOkrs /> },
      { path: 'estrategia/kpis', element: <PaginaKpisEstrategicos /> },
      { path: 'estrategia/hipotesis', element: <PaginaHipotesis /> },
      { path: 'discovery', element: <PaginaResumenDiscovery /> },
      { path: 'discovery/insights', element: <PaginaInsights /> },
      { path: 'discovery/problemas', element: <PaginaProblemasOportunidades /> },
      { path: 'discovery/investigaciones', element: <PaginaInvestigaciones /> },
      { path: 'discovery/segmentos', element: <PaginaSegmentos /> },
      { path: 'discovery/hipotesis', element: <PaginaHipotesisDiscovery /> },
      { path: 'requerimientos', element: <PaginaResumenRequerimientos /> },
      { path: 'requerimientos/historias', element: <PaginaHistoriasUsuario /> },
      { path: 'requerimientos/casos-uso', element: <PaginaCasosUso /> },
      { path: 'requerimientos/reglas-negocio', element: <PaginaReglasNegocio /> },
      { path: 'requerimientos/no-funcionales', element: <PaginaRequerimientosNoFuncionales /> },
      { path: 'lanzamientos', element: <PaginaResumenLanzamientos /> },
      { path: 'lanzamientos/releases', element: <PaginaReleases /> },
      { path: 'lanzamientos/seguimiento', element: <PaginaSeguimientoLanzamientos /> },
      { path: 'operacion', element: <PaginaResumenOperacion /> },
      { path: 'operacion/bugs', element: <PaginaBugs /> },
      { path: 'operacion/mejoras', element: <PaginaMejoras /> },
      { path: 'operacion/deuda-tecnica', element: <PaginaDeudaTecnica /> },
      { path: 'operacion/bloqueos', element: <PaginaBloqueos /> },
      { path: 'operacion/lecciones-aprendidas', element: <PaginaLeccionesAprendidas /> },
      { path: 'analitica', element: <PaginaResumenAnalitico /> },
      { path: 'analitica/kpis', element: <PaginaKpis /> },
      { path: 'analitica/portafolio', element: <PaginaPortafolio /> },
      { path: 'analitica/tendencias', element: <PaginaTendencias /> },
      { path: 'analitica/health-scores', element: <PaginaHealthScores /> },
      { path: 'gobierno', element: <PaginaResumenGobierno /> },
      { path: 'gobierno/stakeholders', element: <PaginaStakeholders /> },
      { path: 'gobierno/riesgos', element: <PaginaRiesgos /> },
      { path: 'gobierno/dependencias', element: <PaginaDependencias /> },
      { path: 'decisiones', element: <PaginaDecisiones /> },
      { path: 'auditorias', element: <PaginaAuditorias /> },
      { path: 'ajustes', element: <PaginaAjustes /> },
      { path: 'trazabilidad', element: <PaginaTrazabilidad /> }
    ]
  }
])
