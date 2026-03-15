# Fase 15 — Consistencia mínima en títulos principales de pantallas resumen

## Objetivo

Aplicar una mejora mínima y segura de consistencia en títulos principales (`h1`) de pantallas resumen equivalentes del PM Portal, sin tocar subtítulos, lógica ni arquitectura.

## Diagnóstico real

La revisión mostró que no convenía abrir una limpieza general de encabezados. La inconsistencia útil y segura estaba acotada a las pantallas resumen principales:

- El patrón dominante ya presente en varios módulos es `Resumen de ...`.
- Persistían cuatro outliers con formas adjetivales o mixtas:
  - `Resumen estratégico`
  - `Resumen discovery`
  - `Resumen analítico`
  - `Resumen operativo`

Ese desvío afectaba la consistencia visible entre pantallas equivalentes de resumen en Estrategia, Discovery, Analítica y Operación.

## Corte mínimo aplicado

Se unificaron los `h1` al patrón `Resumen de <módulo>` en:

- Estrategia → `Resumen de estrategia`
- Discovery → `Resumen de discovery`
- Analítica → `Resumen de analítica`
- Operación → `Resumen de operación`

## Qué no se tocó

- No se modificaron subtítulos descriptivos.
- No se tocaron títulos de CRUD o listados específicos como `Riesgos`, `Dependencias`, `Stakeholders`, `Releases` o `Auditorías`.
- No se renombraron pantallas-hub como `Roadmap` o `Validación`, porque no siguen el patrón de resumen.
- No se tocaron modales, botones, placeholders, mensajes vacíos, router, menú global, dominio, repositorios, casos de uso, SQL ni Supabase.

## Archivos modificados

- `apps/pm-portal/src/presentacion/paginas/analitica/PaginaResumenAnalitico.tsx`
- `apps/pm-portal/src/presentacion/paginas/discovery/PaginaResumenDiscovery.tsx`
- `apps/pm-portal/src/presentacion/paginas/estrategia/PaginaResumenEstrategico.tsx`
- `apps/pm-portal/src/presentacion/paginas/operacion/PaginaResumenOperacion.tsx`
- `apps/pm-portal/IMPLEMENTACION_FASE_15_PORTAL_PM.md`

## SQL

Fase 15 no requiere cambios SQL; se resolvió exclusivamente con texto visible en la capa de presentación y documentación.

## Riesgos residuales

- El portal mantiene diferencias legítimas entre pantallas resumen, pantallas-hub y CRUDs especializados.
- Esta fase no pretende unificar toda la taxonomía visible, solo el subconjunto de `h1` equivalentes con mejor relación impacto/riesgo.