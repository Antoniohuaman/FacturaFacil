# Fase 12 — Consistencia mínima de microcopy en PM Portal

## Objetivo

Aplicar una mejora transversal mínima y segura de consistencia en lenguaje visible para usuario, sin tocar dominio, persistencia ni arquitectura.

## Diagnóstico real

La investigación mostró que no convenía abrir una limpieza general. El corte útil y seguro quedó reducido a dos patrones concretos:

1. **Verbo de creación inconsistente**
   - El patrón dominante del portal es `Crear <entidad>`.
   - Persistían excepciones visibles como `Nuevo stakeholder` y botones genéricos `Crear` en pantallas donde la entidad ya era conocida.

2. **Verbo de relación inconsistente**
   - El patrón dominante del portal y de las implementaciones previas es `vinculado / vinculados`.
   - Algunas tarjetas de resumen seguían usando `conectado / conectados` para relaciones equivalentes.

## Corte mínimo aplicado

### 1. Verbos de acción

Se unificó la acción primaria de creación hacia el patrón `Crear <entidad>` en:

- Stakeholders
- Iniciativas Roadmap
- Entregas Roadmap

### 2. Relaciones semánticas

Se unificaron tarjetas de resumen para usar `vinculado / vinculados` cuando la relación ya estaba siendo expresada así en la mayoría del portal:

- Estrategia resumen
- Discovery resumen
- Requerimientos resumen

## Qué no se tocó

- No se cambió `owner`, `responsable` ni `aprobador`, porque representan roles distintos según contexto.
- No se intentó unificar todos los encabezados `Resumen ...`, porque varias diferencias son legítimas por módulo.
- No se tocaron SQL, Supabase, tablas, dominio, repositorios, casos de uso, router ni navegación top-level.

## Archivos modificados

- `apps/pm-portal/src/presentacion/paginas/gobierno/stakeholders/PaginaStakeholders.tsx`
- `apps/pm-portal/src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx`
- `apps/pm-portal/src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx`
- `apps/pm-portal/src/presentacion/paginas/estrategia/PaginaResumenEstrategico.tsx`
- `apps/pm-portal/src/presentacion/paginas/discovery/PaginaResumenDiscovery.tsx`
- `apps/pm-portal/src/presentacion/paginas/requerimientos/PaginaResumenRequerimientos.tsx`
- `apps/pm-portal/IMPLEMENTACION_FASE_12_PORTAL_PM.md`

## SQL

Fase 12 no requiere cambios SQL; se resolvió únicamente con microcopy visible en la capa de presentación y documentación.

## Riesgos residuales

- El portal todavía conserva heterogeneidad legítima en algunos mensajes vacíos y encabezados por contexto funcional.
- Esta fase no buscó normalizar todo el lenguaje visible, solo el subconjunto con mejor impacto y menor riesgo.