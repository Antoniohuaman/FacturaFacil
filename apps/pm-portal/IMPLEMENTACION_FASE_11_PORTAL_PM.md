# Fase 11 — Claridad semántica de objetivos e hipótesis en PM Portal

## Objetivo

Reducir la ambigüedad visual y funcional entre dos pares conceptuales cercanos pero distintos:

- objetivo estratégico vs objetivo roadmap
- hipótesis estrategia vs hipótesis discovery

La fase se resolvió con ajustes mínimos de UI y documentación, sin cambiar persistencia, tablas, SQL, repositorios ni casos de uso.

## Evidencia que justificó el corte

La ambigüedad ya estaba reconocida por el propio repositorio:

- `docs/auditoria_extrema_pm_portal_exhaustiva_2026-03-13.md` identifica explícitamente:
  - `Objetivo roadmap vs objetivo estratégico`
  - `Hipótesis estrategia vs hipótesis discovery`
- `src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx` mostraba el subtítulo: "Define objetivos estratégicos..." aunque la pantalla vive en `/roadmap/objetivos` y opera sobre la entidad de roadmap.
- `src/presentacion/paginas/estrategia/hipotesis/PaginaHipotesis.tsx` y `src/presentacion/paginas/estrategia/NavegacionEstrategia.tsx` seguían usando el rótulo genérico "Hipótesis", mientras Discovery ya diferenciaba "Hipótesis discovery".

## Corte mínimo aplicado

Se eligió el menor cambio útil y seguro:

1. Renombrar títulos, subtítulos y labels visibles donde había ambigüedad directa.
2. Agregar ayudas visuales breves en las pantallas operativas principales.
3. Reforzar en resúmenes la diferencia entre artefactos de Estrategia y artefactos de Roadmap/Discovery.

No se cambió:

- dominio
- validaciones
- repositorios
- casos de uso
- rutas top-level
- menú global
- SQL
- Supabase

## Qué queda claro tras la fase

### Objetivo estratégico

- Vive en `Estrategia > OKRs`.
- Sirve para definir metas del período estratégico.
- Se acompaña de KR y puede vincularse con objetivos roadmap.
- No debe confundirse con el objetivo roadmap de ejecución.

### Objetivo roadmap

- Vive en `Roadmap > Objetivos`.
- Sirve para ordenar ejecución, priorización y delivery.
- Puede vincularse con KR estratégicos.
- No debe confundirse con el objetivo estratégico del período.

### Hipótesis estrategia

- Vive en `Estrategia > Hipótesis estrategia`.
- Sirve para sostener apuestas del período estratégico.
- Puede relacionarse con iniciativas roadmap.
- No debe confundirse con la hipótesis discovery de experimentación.

### Hipótesis discovery

- Vive en `Discovery > Hipótesis discovery`.
- Sirve para validar cambios o experimentos sobre problemas detectados.
- Puede relacionarse con iniciativas roadmap.
- No debe confundirse con la hipótesis estrategia del período.

## Archivos modificados

- `apps/pm-portal/src/presentacion/paginas/estrategia/NavegacionEstrategia.tsx`
- `apps/pm-portal/src/presentacion/paginas/estrategia/okrs/PaginaOkrs.tsx`
- `apps/pm-portal/src/presentacion/paginas/estrategia/PaginaResumenEstrategico.tsx`
- `apps/pm-portal/src/presentacion/paginas/estrategia/hipotesis/PaginaHipotesis.tsx`
- `apps/pm-portal/src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx`
- `apps/pm-portal/src/presentacion/paginas/discovery/PaginaResumenDiscovery.tsx`
- `apps/pm-portal/src/presentacion/paginas/discovery/hipotesis/PaginaHipotesisDiscovery.tsx`
- `apps/pm-portal/IMPLEMENTACION_FASE_11_PORTAL_PM.md`

## SQL

Fase 11 no requiere cambios SQL; se resolvió mediante claridad semántica en títulos, subtítulos, navegación, ayudas visuales y documentación.

## Riesgos residuales

- La distinción sigue siendo de interfaz y lenguaje; no redefine el dominio ni impide que un usuario modelé mal un artefacto si desconoce el proceso de PM.
- Se mantuvo el menú top-level intacto por alcance, por lo que la claridad adicional se concentra dentro de las pantallas y sus encabezados.