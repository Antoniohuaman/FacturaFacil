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
      { etiqueta: 'OKRs', ruta: '/estrategia/okrs' },
      { etiqueta: 'KPIs', ruta: '/estrategia/kpis' },
      { etiqueta: 'Hipótesis', ruta: '/estrategia/hipotesis' }
    ]
  },
  { etiqueta: 'Decisiones', ruta: '/decisiones' },
  { etiqueta: 'Auditorías', ruta: '/auditorias' },
  { etiqueta: 'Ajustes', ruta: '/ajustes' },
  { etiqueta: 'Trazabilidad', ruta: '/trazabilidad' }
]
