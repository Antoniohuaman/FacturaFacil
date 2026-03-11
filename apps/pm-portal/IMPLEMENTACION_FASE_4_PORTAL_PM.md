# Implementación Fase 4 Portal PM

## Resumen de lo implementado

Se implementó el módulo autónomo `Lanzamientos` con tres pantallas:

- Resumen de lanzamientos
- Releases
- Seguimiento post-lanzamiento

El checklist de salida quedó embebido dentro de `Releases`, sin menú top-level propio. La implementación mantiene vínculos opcionales con iniciativas, entregas y decisiones, reutiliza trazabilidad best effort existente y respeta exportación CSV filtrada en listados principales.

## Tablas nuevas

- `pm_releases`
- `pm_release_checklist_items`
- `pm_release_seguimiento`

## Rutas nuevas

- `/lanzamientos`
- `/lanzamientos/releases`
- `/lanzamientos/seguimiento`

## Componentes nuevos

- `src/presentacion/paginas/lanzamientos/NavegacionLanzamientos.tsx`
- `src/presentacion/paginas/lanzamientos/PaginaResumenLanzamientos.tsx`
- `src/presentacion/paginas/lanzamientos/releases/PaginaReleases.tsx`
- `src/presentacion/paginas/lanzamientos/releases/GestionChecklistSalida.tsx`
- `src/presentacion/paginas/lanzamientos/seguimiento/PaginaSeguimientoLanzamientos.tsx`

## Repositorios nuevos

- `src/infraestructura/repositorios/repositorioLanzamientos.ts`

## Pantallas modificadas

- `src/aplicacion/enrutador/enrutador.tsx`
- `src/presentacion/navegacion/menuPortal.ts`
- `src/presentacion/navegacion/BarraLateral.tsx`
- `src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx`
- `src/presentacion/paginas/decisiones/PaginaDecisiones.tsx`
- `src/presentacion/paginas/roadmap/PaginaRoadmap.tsx`

## Relaciones con módulos existentes

- `Roadmap / Entregas`: se agregan señales suaves de cantidad de releases vinculados y estado del release más reciente.
- `Decisiones`: se agrega contador de releases vinculados.
- `Roadmap`: se agregan indicadores suaves de releases relacionados con el filtro activo.
- `Validación`: no se altera su estructura base; el punto de contacto queda únicamente a través del tipo de checklist `validacion`.

## Riesgos detectados

- El resumen de lanzamientos calcula métricas en cliente; si el volumen crece mucho podría convenir pasar parte del agregado a vistas SQL o RPC.
- `pm_release_checklist_items` usa sincronización por lote para soportar edición y ordenamiento sin complejidad adicional en UI.
- Las señales suaves en Roadmap, Entregas y Decisiones dependen de la disponibilidad de `pm_releases`; si la migración no se aplica, esas vistas fallarán al consultar lanzamientos.

## Validaciones pendientes

- Ejecutar migración SQL de Fase 4 en Supabase.
- Validar con datos reales que el orden del módulo en catálogo (`orden = 8`) sea el esperado en paneles que consuman `pm_catalogo_modulos`.
- Confirmar RLS en ambiente real con usuarios `lector`, `editor` y `admin`.

## Checklist manual de prueba

- Crear un release sin iniciativa, sin entrega y sin decisión.
- Crear un release con rollback preparado y comunicación requerida.
- Editar un release y modificar checklist de salida agregando, editando, eliminando y reordenando ítems.
- Verificar que exportación CSV de `Releases` respete filtros activos.
- Crear seguimiento post-lanzamiento para un release existente.
- Editar y eliminar seguimiento post-lanzamiento.
- Verificar registros en trazabilidad para release, checklist de salida y seguimiento post-lanzamiento.
- Abrir `Roadmap`, `Entregas` y `Decisiones` y confirmar que muestran contadores suaves sin bloquear CRUD existente.

## Lista exacta de archivos creados y modificados

### Creados

- `apps/pm-portal/src/infraestructura/repositorios/repositorioLanzamientos.ts`
- `apps/pm-portal/src/aplicacion/casos-uso/lanzamientos.ts`
- `apps/pm-portal/src/presentacion/paginas/lanzamientos/NavegacionLanzamientos.tsx`
- `apps/pm-portal/src/presentacion/paginas/lanzamientos/PaginaResumenLanzamientos.tsx`
- `apps/pm-portal/src/presentacion/paginas/lanzamientos/releases/PaginaReleases.tsx`
- `apps/pm-portal/src/presentacion/paginas/lanzamientos/releases/GestionChecklistSalida.tsx`
- `apps/pm-portal/src/presentacion/paginas/lanzamientos/seguimiento/PaginaSeguimientoLanzamientos.tsx`
- `apps/pm-portal/docs/sql_fase_4_lanzamientos_supabase.md`
- `apps/pm-portal/IMPLEMENTACION_FASE_4_PORTAL_PM.md`

### Modificados

- `apps/pm-portal/src/dominio/modelos.ts`
- `apps/pm-portal/src/compartido/validacion/esquemas.ts`
- `apps/pm-portal/src/aplicacion/enrutador/enrutador.tsx`
- `apps/pm-portal/src/presentacion/navegacion/menuPortal.ts`
- `apps/pm-portal/src/presentacion/navegacion/BarraLateral.tsx`
- `apps/pm-portal/src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx`
- `apps/pm-portal/src/presentacion/paginas/decisiones/PaginaDecisiones.tsx`
- `apps/pm-portal/src/presentacion/paginas/roadmap/PaginaRoadmap.tsx`