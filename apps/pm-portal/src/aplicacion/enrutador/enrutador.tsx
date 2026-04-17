import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { PlantillaPortal } from '@/presentacion/layout/PlantillaPortal'
import { GuardSesionPortalPM } from '@/aplicacion/autenticacion/GuardSesionPortalPM'

function cargarComponenteDiferido<TModulo extends Record<string, unknown>, TComponente extends keyof TModulo>(
  cargador: () => Promise<TModulo>,
  exportacion: TComponente
): LazyExoticComponent<ComponentType> {
  return lazy(async () => {
    const modulo = await cargador()
    const componente = modulo[exportacion]

    if (typeof componente !== 'function') {
      throw new Error(`La exportación ${String(exportacion)} no es un componente válido.`)
    }

    return { default: componente as ComponentType }
  })
}

const fallbackRuta = (
  <div className="flex min-h-[40vh] items-center justify-center rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
    Cargando módulo...
  </div>
)

function crearElementoDiferido(Componente: LazyExoticComponent<ComponentType>) {
  return (
    <Suspense fallback={fallbackRuta}>
      <Componente />
    </Suspense>
  )
}

const PaginaIngresar = cargarComponenteDiferido(() => import('@/presentacion/paginas/ingresar/PaginaIngresar'), 'PaginaIngresar')
const PaginaTablero = cargarComponenteDiferido(() => import('@/presentacion/paginas/tablero/PaginaTablero'), 'PaginaTablero')
const PaginaRoadmap = cargarComponenteDiferido(() => import('@/presentacion/paginas/roadmap/PaginaRoadmap'), 'PaginaRoadmap')
const PaginaCronogramaRoadmap = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap'),
  'PaginaCronogramaRoadmap'
)
const PaginaObjetivosRoadmap = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap'),
  'PaginaObjetivosRoadmap'
)
const PaginaIniciativasRoadmap = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap'),
  'PaginaIniciativasRoadmap'
)
const PaginaEntregasRoadmap = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap'),
  'PaginaEntregasRoadmap'
)
const PaginaMatrizValor = cargarComponenteDiferido(() => import('@/presentacion/paginas/matriz-valor/PaginaMatrizValor'), 'PaginaMatrizValor')
const PaginaValidacion = cargarComponenteDiferido(() => import('@/presentacion/paginas/validacion/PaginaValidacion'), 'PaginaValidacion')
const PaginaValidacionPorModulo = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/validacion/por-modulo/PaginaValidacionPorModulo'),
  'PaginaValidacionPorModulo'
)
const PaginaEjecucionesValidacion = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/validacion/ejecuciones/PaginaEjecucionesValidacion'),
  'PaginaEjecucionesValidacion'
)
const PaginaDecisiones = cargarComponenteDiferido(() => import('@/presentacion/paginas/decisiones/PaginaDecisiones'), 'PaginaDecisiones')
const PaginaAuditorias = cargarComponenteDiferido(() => import('@/presentacion/paginas/auditorias/PaginaAuditorias'), 'PaginaAuditorias')
const PaginaAjustes = cargarComponenteDiferido(() => import('@/presentacion/paginas/ajustes/PaginaAjustes'), 'PaginaAjustes')
const PaginaResumenEstrategico = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/estrategia/PaginaResumenEstrategico'),
  'PaginaResumenEstrategico'
)
const PaginaPeriodosEstrategicos = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/estrategia/periodos/PaginaPeriodosEstrategicos'),
  'PaginaPeriodosEstrategicos'
)
const PaginaOkrs = cargarComponenteDiferido(() => import('@/presentacion/paginas/estrategia/okrs/PaginaOkrs'), 'PaginaOkrs')
const PaginaKpisEstrategicos = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/estrategia/kpis/PaginaKpisEstrategicos'),
  'PaginaKpisEstrategicos'
)
const PaginaHipotesis = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/estrategia/hipotesis/PaginaHipotesis'),
  'PaginaHipotesis'
)
const PaginaTrazabilidad = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/trazabilidad/PaginaTrazabilidad'),
  'PaginaTrazabilidad'
)
const PaginaResumenDiscovery = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/discovery/PaginaResumenDiscovery'),
  'PaginaResumenDiscovery'
)
const PaginaInsights = cargarComponenteDiferido(() => import('@/presentacion/paginas/discovery/insights/PaginaInsights'), 'PaginaInsights')
const PaginaProblemasOportunidades = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/discovery/problemas/PaginaProblemasOportunidades'),
  'PaginaProblemasOportunidades'
)
const PaginaInvestigaciones = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/discovery/investigaciones/PaginaInvestigaciones'),
  'PaginaInvestigaciones'
)
const PaginaSegmentos = cargarComponenteDiferido(() => import('@/presentacion/paginas/discovery/segmentos/PaginaSegmentos'), 'PaginaSegmentos')
const PaginaHipotesisDiscovery = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/discovery/hipotesis/PaginaHipotesisDiscovery'),
  'PaginaHipotesisDiscovery'
)
const PaginaResumenRequerimientos = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/requerimientos/PaginaResumenRequerimientos'),
  'PaginaResumenRequerimientos'
)
const PaginaHistoriasUsuario = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/requerimientos/historias/PaginaHistoriasUsuario'),
  'PaginaHistoriasUsuario'
)
const PaginaCasosUso = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/requerimientos/casos-uso/PaginaCasosUso'),
  'PaginaCasosUso'
)
const PaginaReglasNegocio = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/requerimientos/reglas/PaginaReglasNegocio'),
  'PaginaReglasNegocio'
)
const PaginaRequerimientosNoFuncionales = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/requerimientos/no-funcionales/PaginaRequerimientosNoFuncionales'),
  'PaginaRequerimientosNoFuncionales'
)
const PaginaResumenLanzamientos = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/lanzamientos/PaginaResumenLanzamientos'),
  'PaginaResumenLanzamientos'
)
const PaginaReleases = cargarComponenteDiferido(() => import('@/presentacion/paginas/lanzamientos/releases/PaginaReleases'), 'PaginaReleases')
const PaginaSeguimientoLanzamientos = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/lanzamientos/seguimiento/PaginaSeguimientoLanzamientos'),
  'PaginaSeguimientoLanzamientos'
)
const PaginaResumenOperacion = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/operacion/PaginaResumenOperacion'),
  'PaginaResumenOperacion'
)
const PaginaBugs = cargarComponenteDiferido(() => import('@/presentacion/paginas/operacion/bugs/PaginaBugs'), 'PaginaBugs')
const PaginaMejoras = cargarComponenteDiferido(() => import('@/presentacion/paginas/operacion/mejoras/PaginaMejoras'), 'PaginaMejoras')
const PaginaDeudaTecnica = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/operacion/deuda-tecnica/PaginaDeudaTecnica'),
  'PaginaDeudaTecnica'
)
const PaginaBloqueos = cargarComponenteDiferido(() => import('@/presentacion/paginas/operacion/bloqueos/PaginaBloqueos'), 'PaginaBloqueos')
const PaginaLeccionesAprendidas = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/operacion/lecciones/PaginaLeccionesAprendidas'),
  'PaginaLeccionesAprendidas'
)
const PaginaResumenAnalitico = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/analitica/PaginaResumenAnalitico'),
  'PaginaResumenAnalitico'
)
const PaginaRetroalimentacion = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/analitica/retroalimentacion/PaginaRetroalimentacion'),
  'PaginaRetroalimentacion'
)
const PaginaKpis = cargarComponenteDiferido(() => import('@/presentacion/paginas/analitica/kpis/PaginaKpis'), 'PaginaKpis')
const PaginaPortafolio = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/analitica/portafolio/PaginaPortafolio'),
  'PaginaPortafolio'
)
const PaginaTendencias = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/analitica/tendencias/PaginaTendencias'),
  'PaginaTendencias'
)
const PaginaHealthScores = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/analitica/health-scores/PaginaHealthScores'),
  'PaginaHealthScores'
)
const PaginaResumenGobierno = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/gobierno/PaginaResumenGobierno'),
  'PaginaResumenGobierno'
)
const PaginaStakeholders = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/gobierno/stakeholders/PaginaStakeholders'),
  'PaginaStakeholders'
)
const PaginaRiesgos = cargarComponenteDiferido(() => import('@/presentacion/paginas/gobierno/riesgos/PaginaRiesgos'), 'PaginaRiesgos')
const PaginaDependencias = cargarComponenteDiferido(
  () => import('@/presentacion/paginas/gobierno/dependencias/PaginaDependencias'),
  'PaginaDependencias'
)

export const enrutadorPortal = createBrowserRouter([
  {
    path: '/ingresar',
    element: crearElementoDiferido(PaginaIngresar)
  },
  {
    path: '/',
    element: (
      <GuardSesionPortalPM>
        <PlantillaPortal />
      </GuardSesionPortalPM>
    ),
    children: [
      { index: true, element: crearElementoDiferido(PaginaTablero) },
      { path: 'roadmap', element: crearElementoDiferido(PaginaRoadmap) },
      { path: 'roadmap/cronograma', element: crearElementoDiferido(PaginaCronogramaRoadmap) },
      { path: 'roadmap/objetivos', element: crearElementoDiferido(PaginaObjetivosRoadmap) },
      { path: 'roadmap/iniciativas', element: crearElementoDiferido(PaginaIniciativasRoadmap) },
      { path: 'roadmap/entregas', element: crearElementoDiferido(PaginaEntregasRoadmap) },
      { path: 'matriz-valor', element: crearElementoDiferido(PaginaMatrizValor) },
      { path: 'validacion', element: crearElementoDiferido(PaginaValidacion) },
      { path: 'validacion/por-modulo', element: crearElementoDiferido(PaginaValidacionPorModulo) },
      { path: 'validacion/ejecuciones', element: crearElementoDiferido(PaginaEjecucionesValidacion) },
      { path: 'estrategia', element: crearElementoDiferido(PaginaResumenEstrategico) },
      { path: 'estrategia/periodos', element: crearElementoDiferido(PaginaPeriodosEstrategicos) },
      { path: 'estrategia/okrs', element: crearElementoDiferido(PaginaOkrs) },
      { path: 'estrategia/kpis', element: crearElementoDiferido(PaginaKpisEstrategicos) },
      { path: 'estrategia/hipotesis', element: crearElementoDiferido(PaginaHipotesis) },
      { path: 'discovery', element: crearElementoDiferido(PaginaResumenDiscovery) },
      { path: 'discovery/insights', element: crearElementoDiferido(PaginaInsights) },
      { path: 'discovery/problemas', element: crearElementoDiferido(PaginaProblemasOportunidades) },
      { path: 'discovery/investigaciones', element: crearElementoDiferido(PaginaInvestigaciones) },
      { path: 'discovery/segmentos', element: crearElementoDiferido(PaginaSegmentos) },
      { path: 'discovery/hipotesis', element: crearElementoDiferido(PaginaHipotesisDiscovery) },
      { path: 'requerimientos', element: crearElementoDiferido(PaginaResumenRequerimientos) },
      { path: 'requerimientos/historias', element: crearElementoDiferido(PaginaHistoriasUsuario) },
      { path: 'requerimientos/casos-uso', element: crearElementoDiferido(PaginaCasosUso) },
      { path: 'requerimientos/reglas-negocio', element: crearElementoDiferido(PaginaReglasNegocio) },
      { path: 'requerimientos/no-funcionales', element: crearElementoDiferido(PaginaRequerimientosNoFuncionales) },
      { path: 'lanzamientos', element: crearElementoDiferido(PaginaResumenLanzamientos) },
      { path: 'lanzamientos/releases', element: crearElementoDiferido(PaginaReleases) },
      { path: 'lanzamientos/seguimiento', element: crearElementoDiferido(PaginaSeguimientoLanzamientos) },
      { path: 'operacion', element: crearElementoDiferido(PaginaResumenOperacion) },
      { path: 'operacion/bugs', element: crearElementoDiferido(PaginaBugs) },
      { path: 'operacion/mejoras', element: crearElementoDiferido(PaginaMejoras) },
      { path: 'operacion/deuda-tecnica', element: crearElementoDiferido(PaginaDeudaTecnica) },
      { path: 'operacion/bloqueos', element: crearElementoDiferido(PaginaBloqueos) },
      { path: 'operacion/lecciones-aprendidas', element: crearElementoDiferido(PaginaLeccionesAprendidas) },
      { path: 'analitica', element: crearElementoDiferido(PaginaResumenAnalitico) },
      { path: 'analitica/retroalimentacion', element: crearElementoDiferido(PaginaRetroalimentacion) },
      { path: 'analitica/kpis', element: crearElementoDiferido(PaginaKpis) },
      { path: 'analitica/portafolio', element: crearElementoDiferido(PaginaPortafolio) },
      { path: 'analitica/tendencias', element: crearElementoDiferido(PaginaTendencias) },
      { path: 'analitica/health-scores', element: crearElementoDiferido(PaginaHealthScores) },
      { path: 'gobierno', element: crearElementoDiferido(PaginaResumenGobierno) },
      { path: 'gobierno/stakeholders', element: crearElementoDiferido(PaginaStakeholders) },
      { path: 'gobierno/riesgos', element: crearElementoDiferido(PaginaRiesgos) },
      { path: 'gobierno/dependencias', element: crearElementoDiferido(PaginaDependencias) },
      { path: 'decisiones', element: crearElementoDiferido(PaginaDecisiones) },
      { path: 'auditorias', element: crearElementoDiferido(PaginaAuditorias) },
      { path: 'ajustes', element: crearElementoDiferido(PaginaAjustes) },
      { path: 'trazabilidad', element: crearElementoDiferido(PaginaTrazabilidad) }
    ]
  }
])
