export interface SubmenuPortal {
  etiqueta: string
  ruta: string
}

export interface ItemMenuPortal {
  etiqueta: string
  ruta: string
  submenus?: SubmenuPortal[]
}

export const menuPortal: ItemMenuPortal[] = [
  { etiqueta: 'Tablero', ruta: '/' },
  {
    etiqueta: 'Estrategia',
    ruta: '/estrategia',
    submenus: [
      { etiqueta: 'Períodos', ruta: '/estrategia/periodos' },
      { etiqueta: 'OKRs', ruta: '/estrategia/okrs' },
      { etiqueta: 'KPIs estratégicos', ruta: '/estrategia/kpis' },
      { etiqueta: 'Hipótesis', ruta: '/estrategia/hipotesis' }
    ]
  },
  {
    etiqueta: 'Discovery',
    ruta: '/discovery',
    submenus: [
      { etiqueta: 'Insights', ruta: '/discovery/insights' },
      { etiqueta: 'Problemas y oportunidades', ruta: '/discovery/problemas' },
      { etiqueta: 'Investigaciones', ruta: '/discovery/investigaciones' },
      { etiqueta: 'Segmentos', ruta: '/discovery/segmentos' },
      { etiqueta: 'Hipótesis discovery', ruta: '/discovery/hipotesis' }
    ]
  },
  {
    etiqueta: 'Requerimientos',
    ruta: '/requerimientos',
    submenus: [
      { etiqueta: 'Historias de usuario', ruta: '/requerimientos/historias' },
      { etiqueta: 'Casos de uso', ruta: '/requerimientos/casos-uso' },
      { etiqueta: 'Reglas de negocio', ruta: '/requerimientos/reglas-negocio' },
      { etiqueta: 'Requerimientos no funcionales', ruta: '/requerimientos/no-funcionales' }
    ]
  },
  {
    etiqueta: 'Roadmap',
    ruta: '/roadmap',
    submenus: [
      { etiqueta: 'Objetivos', ruta: '/roadmap/objetivos' },
      { etiqueta: 'Iniciativas', ruta: '/roadmap/iniciativas' },
      { etiqueta: 'Entregas', ruta: '/roadmap/entregas' }
    ]
  },
  { etiqueta: 'Matriz de valor', ruta: '/matriz-valor' },
  {
    etiqueta: 'Validación',
    ruta: '/validacion',
    submenus: [
      { etiqueta: 'Por módulo', ruta: '/validacion/por-modulo' },
      { etiqueta: 'Ejecuciones', ruta: '/validacion/ejecuciones' }
    ]
  },
  {
    etiqueta: 'Lanzamientos',
    ruta: '/lanzamientos',
    submenus: [
      { etiqueta: 'Releases', ruta: '/lanzamientos/releases' },
      { etiqueta: 'Seguimiento post-lanzamiento', ruta: '/lanzamientos/seguimiento' }
    ]
  },
  {
    etiqueta: 'Operación',
    ruta: '/operacion',
    submenus: [
      { etiqueta: 'Bugs', ruta: '/operacion/bugs' },
      { etiqueta: 'Mejoras', ruta: '/operacion/mejoras' },
      { etiqueta: 'Deuda técnica', ruta: '/operacion/deuda-tecnica' },
      { etiqueta: 'Bloqueos', ruta: '/operacion/bloqueos' },
      { etiqueta: 'Lecciones aprendidas', ruta: '/operacion/lecciones-aprendidas' }
    ]
  },
  {
    etiqueta: 'Analítica',
    ruta: '/analitica',
    submenus: [
      { etiqueta: 'KPIs ejecutivos', ruta: '/analitica/kpis' },
      { etiqueta: 'Portafolio', ruta: '/analitica/portafolio' },
      { etiqueta: 'Tendencias', ruta: '/analitica/tendencias' },
      { etiqueta: 'Health scores', ruta: '/analitica/health-scores' }
    ]
  },
  {
    etiqueta: 'Gobierno',
    ruta: '/gobierno',
    submenus: [
      { etiqueta: 'Stakeholders', ruta: '/gobierno/stakeholders' },
      { etiqueta: 'Riesgos', ruta: '/gobierno/riesgos' },
      { etiqueta: 'Dependencias', ruta: '/gobierno/dependencias' }
    ]
  },
  { etiqueta: 'Decisiones', ruta: '/decisiones' },
  { etiqueta: 'Auditorías', ruta: '/auditorias' },
  { etiqueta: 'Ajustes', ruta: '/ajustes' },
  { etiqueta: 'Trazabilidad', ruta: '/trazabilidad' }
]
