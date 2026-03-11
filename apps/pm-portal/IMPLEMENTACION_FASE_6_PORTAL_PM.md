# Implementación Fase 6 Portal PM

## Resumen de lo implementado

Se implementó el nuevo módulo top-level **Analítica** como capacidad aditiva y autónoma del Portal PM, sin reemplazar Tablero y sin alterar flujos existentes de Roadmap, Validación, Estrategia, Discovery, Requerimientos, Lanzamientos, Operación, Decisiones o Auditorías.

La fase incorpora cinco pantallas:

- Resumen analítico
- KPIs
- Portafolio
- Tendencias
- Health scores

La persistencia propia se limitó a configuraciones que realmente la ameritan: KPIs ejecutivos y Health scores. El resumen ejecutivo, el portafolio consolidado y las tendencias se resolvieron por consolidación en vivo desde datos ya existentes del portal.

## Tablas nuevas

- `pm_kpis_ejecutivos`
- `pm_health_scores`

## Rutas nuevas

- `/analitica`
- `/analitica/kpis`
- `/analitica/portafolio`
- `/analitica/tendencias`
- `/analitica/health-scores`

## Componentes nuevos

- `src/presentacion/paginas/analitica/NavegacionAnalitica.tsx`
- `src/presentacion/paginas/analitica/PaginaResumenAnalitico.tsx`
- `src/presentacion/paginas/analitica/kpis/PaginaKpis.tsx`
- `src/presentacion/paginas/analitica/portafolio/PaginaPortafolio.tsx`
- `src/presentacion/paginas/analitica/tendencias/PaginaTendencias.tsx`
- `src/presentacion/paginas/analitica/health-scores/PaginaHealthScores.tsx`

## Repositorios nuevos

- `src/infraestructura/repositorios/repositorioAnalitica.ts`

## Pantallas modificadas

- `src/aplicacion/enrutador/enrutador.tsx`
- `src/presentacion/navegacion/menuPortal.ts`
- `src/presentacion/navegacion/BarraLateral.tsx`
- `src/presentacion/paginas/tablero/PaginaTablero.tsx`

## Relaciones con módulos existentes

- Tablero: se agregó acceso suave a Analítica sin reemplazar el panel operativo actual.
- Roadmap: se consolidan iniciativas, entregas y señales de distribución por estado.
- Validación: se usan ejecuciones y planes para señales ejecutivas y tendencias.
- Estrategia: se integran objetivos estratégicos, períodos y KPIs estratégicos como señal complementaria.
- Discovery: se integran insights e hipótesis discovery en el resumen transversal.
- Requerimientos: se integran historias, casos de uso y RNF como señal de backlog funcional.
- Lanzamientos: se usan releases y su evolución temporal en resumen, portafolio y tendencias.
- Operación: se usa como insumo fuerte para bugs, bloqueos, mejoras, deuda técnica y lecciones.
- Decisiones: se integran decisiones recientes y su tendencia temporal.
- Auditorías: se integran auditorías y hallazgos abiertos como señal de gobierno y riesgo.

## Riesgos detectados

- El portafolio consolidado usa dominios seguros del portal en lugar de inferir módulos inexistentes para iniciativas y entregas. Eso evita inventar relaciones, pero implica una consolidación deliberadamente conservadora.
- Los hallazgos de auditoría no exponen `modulo_codigo` sino `modulo_id`; por eso la agregación por módulo en resumen es conservadora y no fuerza mapeos dudosos.
- Las tendencias se agregan por mes para mantener simplicidad y evitar librerías adicionales de gráficos.

## Validaciones pendientes

- Ejecutar el SQL de Fase 6 en Supabase y verificar RLS/policies con usuarios `lector`, `editor` y `admin`.
- Confirmar si negocio desea que futuros health scores por Auditorías o Discovery tengan ámbito específico adicional; en esta fase se respetó estrictamente el set pedido.
- Validar visualmente con datos reales si conviene ampliar o reducir los umbrales heurísticos de señales ejecutivas del resumen.

## Checklist manual de prueba

- Entrar a `/analitica` y verificar navegación interna a las cinco subpantallas.
- Crear, editar y eliminar un KPI ejecutivo; confirmar que la operación principal no falla aunque trazabilidad sea best effort.
- Crear, editar y eliminar un health score; validar score visible y semáforo.
- Aplicar filtros en KPIs y exportar CSV; revisar que el CSV respete exactamente los filtros activos.
- Aplicar filtros en Portafolio y exportar CSV; revisar que solo salgan las filas filtradas.
- Cambiar rango temporal en Tendencias y exportar CSV; verificar agregación mensual coherente.
- Confirmar que Tablero sigue funcionando y que el acceso a Analítica no rompe su operación actual.
- Navegar a módulos previos para verificar que Roadmap, Operación, Validación, Decisiones y Auditorías siguen sin regresiones visibles.

## Lista exacta de archivos creados y modificados

### Creados

- `apps/pm-portal/docs/sql_fase_6_analitica_supabase.md`
- `apps/pm-portal/IMPLEMENTACION_FASE_6_PORTAL_PM.md`
- `apps/pm-portal/src/infraestructura/repositorios/repositorioAnalitica.ts`
- `apps/pm-portal/src/aplicacion/casos-uso/analitica.ts`
- `apps/pm-portal/src/presentacion/paginas/analitica/NavegacionAnalitica.tsx`
- `apps/pm-portal/src/presentacion/paginas/analitica/PaginaResumenAnalitico.tsx`
- `apps/pm-portal/src/presentacion/paginas/analitica/kpis/PaginaKpis.tsx`
- `apps/pm-portal/src/presentacion/paginas/analitica/portafolio/PaginaPortafolio.tsx`
- `apps/pm-portal/src/presentacion/paginas/analitica/tendencias/PaginaTendencias.tsx`
- `apps/pm-portal/src/presentacion/paginas/analitica/health-scores/PaginaHealthScores.tsx`

### Modificados

- `apps/pm-portal/src/dominio/modelos.ts`
- `apps/pm-portal/src/compartido/validacion/esquemas.ts`
- `apps/pm-portal/src/aplicacion/enrutador/enrutador.tsx`
- `apps/pm-portal/src/presentacion/navegacion/menuPortal.ts`
- `apps/pm-portal/src/presentacion/navegacion/BarraLateral.tsx`
- `apps/pm-portal/src/presentacion/paginas/tablero/PaginaTablero.tsx`