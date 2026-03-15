# Implementación Fase 7 Portal PM

## Resumen de lo implementado

Se implementó el nuevo módulo top-level **Gobierno** como capacidad aditiva del Portal PM, manteniendo la arquitectura vigente del repositorio y sin reemplazar ni degradar módulos anteriores.

La fase incorpora cuatro pantallas:

- Resumen de gobierno
- Stakeholders
- Riesgos
- Dependencias

La persistencia propia se limitó a tres entidades operativas. El resumen de gobierno se resuelve por consolidación en vivo desde estas tablas y, además, se conectó de forma suave con Roadmap, Lanzamientos, Operación, Analítica, Decisiones y Auditorías.

## Tablas nuevas

- `pm_stakeholders`
- `pm_riesgos`
- `pm_dependencias`

## Rutas nuevas

- `/gobierno`
- `/gobierno/stakeholders`
- `/gobierno/riesgos`
- `/gobierno/dependencias`

## Componentes nuevos

- `src/infraestructura/repositorios/repositorioGobierno.ts`
- `src/aplicacion/casos-uso/gobierno.ts`
- `src/presentacion/paginas/gobierno/NavegacionGobierno.tsx`
- `src/presentacion/paginas/gobierno/PaginaResumenGobierno.tsx`
- `src/presentacion/paginas/gobierno/stakeholders/PaginaStakeholders.tsx`
- `src/presentacion/paginas/gobierno/riesgos/PaginaRiesgos.tsx`
- `src/presentacion/paginas/gobierno/dependencias/PaginaDependencias.tsx`

## Capas y extensiones realizadas

- Dominio: se agregaron tipos, enums, colecciones y formateadores para stakeholders, riesgos y dependencias.
- Validación: se incorporaron esquemas Zod estrictos con validación de fechas para riesgos y dependencias.
- Infraestructura: se agregó un repositorio Supabase específico para Gobierno con CRUD completo.
- Aplicación: se agregaron casos de uso para CRUD, carga de referencias y consolidación del resumen ejecutivo.
- Presentación: se agregaron las cuatro pantallas nuevas y navegación interna del módulo.
- Navegación global: el módulo se integró entre Analítica y Decisiones en menú, sidebar y router.

## Integraciones suaves con módulos existentes

- Roadmap: se agregaron indicadores de riesgos y dependencias vinculados a iniciativas, entregas y releases filtrados.
- Lanzamientos: se agregaron señales de riesgos y dependencias ligadas a releases.
- Operación: se agregaron señales de riesgos operativos/dependencias bloqueantes y acceso directo a Gobierno.
- Analítica: el resumen analítico ahora usa stakeholders, riesgos y dependencias reales para la señal de Gobierno.
- Decisiones: se agregaron contadores de stakeholders, riesgos y dependencias vinculados por decisión.
- Auditorías: se agregó conteo de riesgos vinculados por auditoría.

## Trazabilidad y exportación

- Los tres CRUD de Gobierno registran cambios con `registrarCambioEntidadBestEffort` siguiendo el patrón existente del portal.
- Stakeholders, Riesgos y Dependencias exportan CSV respetando los filtros activos.
- Las referencias cruzadas a módulos previos son opcionales y usan claves foráneas con `on delete set null` en SQL.

## Riesgos detectados

- El orden del catálogo de módulos ya venía evolucionando entre fases previas; en Fase 7 se agregó `gobierno` con orden conservador `35` para ubicarlo entre capacidades analíticas y de decisión sin reescribir catálogos históricos.
- Las integraciones con módulos previos son deliberadamente suaves: agregan señales y conteos, pero no fuerzan dependencias de navegación ni cambios de modelo en esos módulos.
- El resumen ejecutivo de Gobierno usa consolidación en vivo; con volúmenes altos podría requerirse optimización adicional en backend o vistas materializadas, pero no se introdujo complejidad prematura en esta fase.

## Validaciones pendientes

- Ejecutar el SQL de Fase 7 en Supabase y verificar RLS/policies con usuarios `lector`, `editor` y `admin`.
- Validar con datos reales si las heurísticas visuales del resumen de gobierno requieren ajuste en umbrales de alertas.
- Confirmar con negocio si a futuro se necesita relación directa de stakeholders con releases o auditorías; en esta fase no se agregó porque no estaba pedida.

## Checklist manual de prueba

- Entrar a `/gobierno` y verificar navegación interna a las cuatro subpantallas.
- Crear, editar y eliminar un stakeholder; verificar que el CSV respete los filtros activos.
- Crear, editar y eliminar un riesgo con y sin referencias cruzadas; validar la restricción de fechas.
- Crear, editar y eliminar una dependencia con y sin referencias cruzadas; validar la restricción de fechas.
- Confirmar que los roles `lector`, `editor` y `admin` mantengan el comportamiento esperado en botones de edición.
- Revisar Roadmap, Lanzamientos, Operación, Analítica, Decisiones y Auditorías para confirmar que las nuevas señales aparecen sin romper flujos previos.
- Verificar que la trazabilidad best effort no bloquee las operaciones principales del CRUD.

## Lista exacta de archivos creados y modificados

### Creados

- `apps/pm-portal/docs/sql_fase_7_gobierno_supabase.md`
- `apps/pm-portal/IMPLEMENTACION_FASE_7_PORTAL_PM.md`
- `apps/pm-portal/src/infraestructura/repositorios/repositorioGobierno.ts`
- `apps/pm-portal/src/aplicacion/casos-uso/gobierno.ts`
- `apps/pm-portal/src/presentacion/paginas/gobierno/NavegacionGobierno.tsx`
- `apps/pm-portal/src/presentacion/paginas/gobierno/PaginaResumenGobierno.tsx`
- `apps/pm-portal/src/presentacion/paginas/gobierno/stakeholders/PaginaStakeholders.tsx`
- `apps/pm-portal/src/presentacion/paginas/gobierno/riesgos/PaginaRiesgos.tsx`
- `apps/pm-portal/src/presentacion/paginas/gobierno/dependencias/PaginaDependencias.tsx`

### Modificados

- `apps/pm-portal/src/dominio/modelos.ts`
- `apps/pm-portal/src/compartido/validacion/esquemas.ts`
- `apps/pm-portal/src/aplicacion/casos-uso/analitica.ts`
- `apps/pm-portal/src/aplicacion/enrutador/enrutador.tsx`
- `apps/pm-portal/src/presentacion/navegacion/menuPortal.ts`
- `apps/pm-portal/src/presentacion/navegacion/BarraLateral.tsx`
- `apps/pm-portal/src/presentacion/paginas/analitica/PaginaResumenAnalitico.tsx`
- `apps/pm-portal/src/presentacion/paginas/roadmap/PaginaRoadmap.tsx`
- `apps/pm-portal/src/presentacion/paginas/lanzamientos/PaginaResumenLanzamientos.tsx`
- `apps/pm-portal/src/presentacion/paginas/operacion/PaginaResumenOperacion.tsx`
- `apps/pm-portal/src/presentacion/paginas/decisiones/PaginaDecisiones.tsx`
- `apps/pm-portal/src/presentacion/paginas/auditorias/PaginaAuditorias.tsx`
