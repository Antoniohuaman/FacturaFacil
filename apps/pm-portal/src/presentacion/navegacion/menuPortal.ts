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
    etiqueta: 'Estrategia',
    ruta: '/estrategia',
    submenus: [
      { etiqueta: 'Resumen estratégico', ruta: '/estrategia' },
      { etiqueta: 'Períodos', ruta: '/estrategia/periodos' },
      { etiqueta: 'OKRs', ruta: '/estrategia/okrs' },
      { etiqueta: 'KPIs', ruta: '/estrategia/kpis' },
      { etiqueta: 'Hipótesis', ruta: '/estrategia/hipotesis' }
    ]
  },
  {
    etiqueta: 'Discovery',
    ruta: '/discovery',
    submenus: [
      { etiqueta: 'Resumen discovery', ruta: '/discovery' },
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
      { etiqueta: 'Resumen de requerimientos', ruta: '/requerimientos' },
      { etiqueta: 'Historias de usuario', ruta: '/requerimientos/historias' },
      { etiqueta: 'Casos de uso', ruta: '/requerimientos/casos-uso' },
      { etiqueta: 'Reglas de negocio', ruta: '/requerimientos/reglas-negocio' },
      { etiqueta: 'Requerimientos no funcionales', ruta: '/requerimientos/no-funcionales' }
    ]
  },
  {
    etiqueta: 'Lanzamientos',
    ruta: '/lanzamientos',
    submenus: [
      { etiqueta: 'Resumen de lanzamientos', ruta: '/lanzamientos' },
      { etiqueta: 'Releases', ruta: '/lanzamientos/releases' },
      { etiqueta: 'Seguimiento post-lanzamiento', ruta: '/lanzamientos/seguimiento' }
    ]
  },
  {
    etiqueta: 'Operación',
    ruta: '/operacion',
    submenus: [
      { etiqueta: 'Resumen operativo', ruta: '/operacion' },
      { etiqueta: 'Bugs', ruta: '/operacion/bugs' },
      { etiqueta: 'Mejoras', ruta: '/operacion/mejoras' },
      { etiqueta: 'Deuda técnica', ruta: '/operacion/deuda-tecnica' },
      { etiqueta: 'Bloqueos', ruta: '/operacion/bloqueos' },
      { etiqueta: 'Lecciones aprendidas', ruta: '/operacion/lecciones-aprendidas' }
    ]
  },
  { etiqueta: 'Decisiones', ruta: '/decisiones' },
  { etiqueta: 'Auditorías', ruta: '/auditorias' },
  { etiqueta: 'Ajustes', ruta: '/ajustes' },
  { etiqueta: 'Trazabilidad', ruta: '/trazabilidad' }
]
