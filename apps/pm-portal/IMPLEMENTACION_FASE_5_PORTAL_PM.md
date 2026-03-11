# Implementación Fase 5 Portal PM

## Resumen de lo implementado

Se implementó el módulo autónomo `Operación` con seis pantallas:

- Resumen operativo
- Bugs
- Mejoras
- Deuda técnica
- Bloqueos
- Lecciones aprendidas

La implementación respeta el patrón arquitectónico existente del portal, mantiene relaciones opcionales con roadmap, lanzamientos, decisiones, auditorías, hallazgos e inputs discovery, y reutiliza trazabilidad best effort y exportación CSV filtrada por pantalla.

## Tablas nuevas

- `pm_bugs`
- `pm_mejoras`
- `pm_deuda_tecnica`
- `pm_bloqueos`
- `pm_lecciones_aprendidas`

## Rutas nuevas

- `/operacion`
- `/operacion/bugs`
- `/operacion/mejoras`
- `/operacion/deuda-tecnica`
- `/operacion/bloqueos`
- `/operacion/lecciones-aprendidas`

## Componentes nuevos

- `src/presentacion/paginas/operacion/NavegacionOperacion.tsx`
- `src/presentacion/paginas/operacion/PaginaResumenOperacion.tsx`
- `src/presentacion/paginas/operacion/bugs/PaginaBugs.tsx`
- `src/presentacion/paginas/operacion/mejoras/PaginaMejoras.tsx`
- `src/presentacion/paginas/operacion/deuda-tecnica/PaginaDeudaTecnica.tsx`
- `src/presentacion/paginas/operacion/bloqueos/PaginaBloqueos.tsx`
- `src/presentacion/paginas/operacion/lecciones/PaginaLeccionesAprendidas.tsx`

## Repositorios nuevos

- `src/infraestructura/repositorios/repositorioOperacion.ts`

## Casos de uso nuevos

- `src/aplicacion/casos-uso/operacion.ts`

## Pantallas modificadas

- `src/dominio/modelos.ts`
- `src/compartido/validacion/esquemas.ts`
- `src/aplicacion/enrutador/enrutador.tsx`
- `src/presentacion/navegacion/menuPortal.ts`
- `src/presentacion/navegacion/BarraLateral.tsx`
- `src/presentacion/paginas/lanzamientos/releases/PaginaReleases.tsx`
- `src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx`
- `src/presentacion/paginas/decisiones/PaginaDecisiones.tsx`
- `src/presentacion/paginas/auditorias/PaginaAuditorias.tsx`
- `src/presentacion/paginas/roadmap/PaginaRoadmap.tsx`

## Relaciones con módulos existentes

- `Lanzamientos / Releases`: se agregan contadores suaves de bugs, deuda técnica, bloqueos y lecciones vinculadas por release.
- `Roadmap / Entregas`: se agregan señales suaves de registros operativos vinculados, bugs abiertos y bloqueos activos por entrega.
- `Decisiones`: se agrega contador de bloqueos operativos vinculados.
- `Auditorías`: se agregan contadores suaves de bugs y lecciones por auditoría, y bugs vinculados por hallazgo.
- `Roadmap`: se agregan KPIs suaves de operación relacionada con el filtro activo usando iniciativa, entrega y releases ya vinculados.

## Riesgos detectados

- El resumen operativo y las integraciones suaves calculan agregados en cliente; si el volumen crece mucho podría convenir mover parte del cómputo a vistas SQL o RPCs.
- Las referencias opcionales usan carga amplia de catálogos para mantener formularios coherentes; en datasets muy grandes convendría paginar o autocompletar referencias.
- Las señales suaves en Roadmap, Lanzamientos, Decisiones y Auditorías dependen de que la migración SQL de Fase 5 esté aplicada.

## Validaciones pendientes

- Ejecutar migración SQL de Fase 5 en Supabase.
- Validar en ambiente real RLS con usuarios `lector`, `editor` y `admin`.
- Confirmar orden del módulo `operacion` en `pm_catalogo_modulos` (`orden = 9`) si existe consumo externo del catálogo.

## Checklist manual de prueba

- Crear un bug sin relaciones y luego asociarlo a release, auditoría y hallazgo.
- Crear una mejora vinculada a insight e hipótesis discovery y validar exportación CSV con filtros activos.
- Crear deuda técnica con release asociado y fecha objetivo válida.
- Crear bloqueo con decisión vinculada y responsable de desbloqueo.
- Crear lección aprendida asociada a auditoría o release.
- Verificar trazabilidad visible en la pantalla de historial después de operaciones CRUD del módulo Operación.
- Abrir `Roadmap`, `Entregas`, `Releases`, `Decisiones` y `Auditorías` y confirmar que muestran señales suaves sin romper su comportamiento existente.

## Lista exacta de archivos creados y modificados

### Creados

- `apps/pm-portal/src/infraestructura/repositorios/repositorioOperacion.ts`
- `apps/pm-portal/src/aplicacion/casos-uso/operacion.ts`
- `apps/pm-portal/src/presentacion/paginas/operacion/NavegacionOperacion.tsx`
- `apps/pm-portal/src/presentacion/paginas/operacion/PaginaResumenOperacion.tsx`
- `apps/pm-portal/src/presentacion/paginas/operacion/bugs/PaginaBugs.tsx`
- `apps/pm-portal/src/presentacion/paginas/operacion/mejoras/PaginaMejoras.tsx`
- `apps/pm-portal/src/presentacion/paginas/operacion/deuda-tecnica/PaginaDeudaTecnica.tsx`
- `apps/pm-portal/src/presentacion/paginas/operacion/bloqueos/PaginaBloqueos.tsx`
- `apps/pm-portal/src/presentacion/paginas/operacion/lecciones/PaginaLeccionesAprendidas.tsx`
- `apps/pm-portal/docs/sql_fase_5_operacion_supabase.md`
- `apps/pm-portal/IMPLEMENTACION_FASE_5_PORTAL_PM.md`

### Modificados

- `apps/pm-portal/src/dominio/modelos.ts`
- `apps/pm-portal/src/compartido/validacion/esquemas.ts`
- `apps/pm-portal/src/aplicacion/enrutador/enrutador.tsx`
- `apps/pm-portal/src/presentacion/navegacion/menuPortal.ts`
- `apps/pm-portal/src/presentacion/navegacion/BarraLateral.tsx`
- `apps/pm-portal/src/presentacion/paginas/lanzamientos/releases/PaginaReleases.tsx`
- `apps/pm-portal/src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx`
- `apps/pm-portal/src/presentacion/paginas/decisiones/PaginaDecisiones.tsx`
- `apps/pm-portal/src/presentacion/paginas/auditorias/PaginaAuditorias.tsx`
- `apps/pm-portal/src/presentacion/paginas/roadmap/PaginaRoadmap.tsx`