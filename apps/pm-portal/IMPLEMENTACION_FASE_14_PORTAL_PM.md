# Fase 14 — Consistencia mínima en acciones secundarias y etiquetas de interacción

## Objetivo

Aplicar una mejora transversal mínima y segura en lenguaje visible de acciones secundarias del PM Portal, manteniendo intactas la arquitectura, la lógica funcional y la persistencia.

## Diagnóstico real

La revisión del código mostró que no convenía homogenizar todos los CTAs. El corte útil y seguro quedó reducido a dos patrones concretos:

1. **Títulos readonly desalineados con la acción de entrada**
   - En la mayoría de CRUDs del portal, el botón secundario es `Ver` y el modal readonly también sigue el patrón `Ver <entidad>`.
   - Persistían excepciones en Gobierno y Operación donde el botón decía `Ver`, pero el modal abría con `Detalle <código>`.

2. **Un único outlier en exportación**
   - El patrón dominante en listados exportables es `Exportar CSV`.
   - Auditorías mantenía `Exportar CSV auditorías`, sin una diferencia funcional que justificara ese desvío.

## Corte mínimo aplicado

### 1. Modales readonly

Se unificó la rama de solo lectura hacia el patrón `Ver <código o entidad>` en:

- Stakeholders
- Riesgos
- Dependencias
- Mejoras
- Lecciones aprendidas
- Deuda técnica
- Bloqueos
- Bugs

### 2. Botón de exportación

Se alineó Auditorías con el patrón transversal `Exportar CSV`.

## Qué no se tocó

- No se unificaron enlaces `Ir a ...` y `Ver ...` en resúmenes o dashboards, porque esa diferencia sí es legítima según la intención de navegación.
- No se cambió `Detalle de cambio` en Trazabilidad, porque corresponde a un detalle técnico y no a un CRUD estándar.
- No se tocaron `Nuevo/Nueva` frente a `Crear`, porque eso abriría una limpieza mayor fuera del corte de esta fase.
- No se tocaron SQL, Supabase, tablas, dominio, repositorios, casos de uso, router ni menú global.

## Archivos modificados

- `apps/pm-portal/src/presentacion/paginas/auditorias/PaginaAuditorias.tsx`
- `apps/pm-portal/src/presentacion/paginas/gobierno/stakeholders/PaginaStakeholders.tsx`
- `apps/pm-portal/src/presentacion/paginas/gobierno/riesgos/PaginaRiesgos.tsx`
- `apps/pm-portal/src/presentacion/paginas/gobierno/dependencias/PaginaDependencias.tsx`
- `apps/pm-portal/src/presentacion/paginas/operacion/mejoras/PaginaMejoras.tsx`
- `apps/pm-portal/src/presentacion/paginas/operacion/lecciones/PaginaLeccionesAprendidas.tsx`
- `apps/pm-portal/src/presentacion/paginas/operacion/deuda-tecnica/PaginaDeudaTecnica.tsx`
- `apps/pm-portal/src/presentacion/paginas/operacion/bloqueos/PaginaBloqueos.tsx`
- `apps/pm-portal/src/presentacion/paginas/operacion/bugs/PaginaBugs.tsx`
- `apps/pm-portal/IMPLEMENTACION_FASE_14_PORTAL_PM.md`

## SQL

Fase 14 no requiere cambios SQL; se resolvió exclusivamente con microcopy visible en la capa de presentación y documentación.

## Riesgos residuales

- El portal conserva diferencias legítimas entre acciones de navegación contextual y acciones de lectura en modal.
- Esta fase no buscó normalizar todo el lenguaje de botones, solo el subconjunto con mayor consistencia y menor riesgo.