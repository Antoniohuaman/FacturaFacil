# Implementacion Fase 2 Portal PM

## Resumen de lo implementado

Se implemento la Fase 2 del Portal PM agregando el modulo autonomo `Discovery` de forma aditiva y sin romper los flujos existentes de roadmap, estrategia, decisiones, auditorias o ajustes.

La implementacion cubre:

1. Modulo nuevo `Discovery` en menu lateral y enrutador principal.
2. Pantalla de resumen discovery.
3. CRUD completo para insights, problemas y oportunidades, investigaciones, segmentos e hipotesis discovery.
4. Trazabilidad best effort para CRUD y para altas/bajas de relaciones de discovery.
5. Exportacion CSV respetando filtros activos en cada listado discovery.
6. Integraciones opcionales con Estrategia, Iniciativas y Decisiones.
7. Documento SQL de Supabase para crear tablas, indices, triggers, RLS y policies de Fase 2.

## Tablas nuevas

Tablas principales:

- `pm_segmentos`
- `pm_insights`
- `pm_problemas_oportunidades`
- `pm_investigaciones`
- `pm_hipotesis_discovery`

Tablas relacionales nuevas:

- `pm_rel_insight_problema`
- `pm_rel_investigacion_insight`
- `pm_rel_hipotesis_discovery_iniciativa`
- `pm_rel_problema_objetivo_estrategico`
- `pm_rel_insight_decision`

Notas:

- Todas las relaciones nuevas son opcionales.
- `Hipotesis discovery` se mantiene separada de `Hipotesis` del modulo Estrategia.
- El modulo nuevo queda registrado en catalogo con codigo `discovery`.

## Rutas nuevas

- `/discovery`
- `/discovery/insights`
- `/discovery/problemas`
- `/discovery/investigaciones`
- `/discovery/segmentos`
- `/discovery/hipotesis`

## Componentes nuevos

- Navegacion interna de discovery para las seis vistas.
- Selector reutilizable de relaciones opcionales con checkbox list.
- Pantalla resumen con metricas, distribucion por estado, recientes y relaciones cruzadas.
- Pantallas CRUD para segmentos, insights, problemas y oportunidades, investigaciones e hipotesis discovery.

## Repositorios nuevos

- `repositorioDiscovery.ts` para persistencia Supabase de entidades y relaciones discovery.

## Casos de uso nuevos

- `discovery.ts` para orquestacion de CRUD, sincronizacion de relaciones y trazabilidad best effort.

## Pantallas modificadas

- Roadmap iniciativas: muestra hipotesis discovery vinculadas por iniciativa y las exporta en CSV.
- Decisiones: muestra insights discovery vinculados por decision y los exporta en CSV.
- Resumen estrategico: muestra conteo de problemas discovery conectados a objetivos estrategicos.
- Navegacion general y sidebar: incorporan el modulo Discovery.
- Router principal: incorpora todas las rutas de discovery.

## Relaciones con modulos existentes

Integraciones opcionales agregadas:

- Insight -> Decision
- Insight -> Problema/Oportunidad
- Investigacion -> Insight
- Problema/Oportunidad -> Objetivo estrategico
- Hipotesis discovery -> Iniciativa roadmap

Decisiones de integracion:

- Ninguna relacion es obligatoria para crear o editar registros discovery.
- No se mezclo el modelo de hipotesis discovery con el de estrategia.
- No se alteraron los contratos ni los flujos CRUD existentes fuera de los contadores y lecturas cruzadas.

## Trazabilidad

- Se reutilizo el patron existente de `registrarCambioEntidadBestEffort`.
- Se registra trazabilidad best effort para crear, editar y eliminar:
  - segmentos
  - insights
  - problemas y oportunidades
  - investigaciones
  - hipotesis discovery
- Tambien se registra alta y baja de relaciones discovery cuando se sincronizan sus tablas relacionales.
- Si el historial falla, la operacion principal no se bloquea.

## Exportacion CSV

Se agrego exportacion CSV usando las colecciones filtradas en UI para:

- Segmentos
- Insights
- Problemas y oportunidades
- Investigaciones
- Hipotesis discovery

Tambien se ampliaron exportaciones existentes en:

- Iniciativas roadmap
- Decisiones

## SQL Supabase

El SQL de Fase 2 fue dejado en:

- `apps/pm-portal/docs/sql_fase_2_discovery_supabase.md`

Ese documento incluye:

- alta o actualizacion del modulo `discovery` en `pm_catalogo_modulos`
- creacion de las 5 tablas principales
- creacion de las 5 tablas relacionales
- indices de consulta
- triggers `updated_at`
- habilitacion RLS
- policies para lectura y escritura por rol
- consultas de validacion post-migracion

## Riesgos detectados

- Sin aplicar el SQL de Fase 2 en Supabase, el modulo compila pero no tendra persistencia real.
- Las policies asumen la existencia y comportamiento consistente de `public.rol_actual_usuario()` como en Fase 1.
- La sincronizacion de relaciones se resuelve con borrado y reinsercion del set actual; funcionalmente es correcta, pero en entornos con alto volumen puede generar mas escritura que un diff incremental en base de datos.
- La calidad de los vinculos cruzados depende de que existan datos previos validos en estrategia, iniciativas y decisiones.

## Validaciones pendientes

Validado:

- `npm run lint -w portal-pm`
- `npm run build -w portal-pm`

Pendiente a nivel operativo:

- aplicar el SQL en Supabase
- validar manualmente CRUD y relaciones con datos reales
- revisar acceso por roles `lector`, `editor` y `admin` en entorno integrado
- confirmar trazabilidad visible en la pantalla de historial despues de operaciones discovery

## Checklist manual de prueba

1. Aplicar el SQL de [apps/pm-portal/docs/sql_fase_2_discovery_supabase.md](c:/FacturaFacil/apps/pm-portal/docs/sql_fase_2_discovery_supabase.md).
2. Abrir [apps/pm-portal/src/aplicacion/enrutador/enrutador.tsx](c:/FacturaFacil/apps/pm-portal/src/aplicacion/enrutador/enrutador.tsx) via la app y verificar acceso a `/discovery` desde el menu lateral.
3. Crear al menos un segmento en Discovery y confirmar que aparezca en listados y exportacion CSV.
4. Crear un insight con segmento y modulo opcional, vincularlo a un problema y a una decision, y verificar sus contadores.
5. Crear un problema u oportunidad y vincularlo a insights y a un objetivo estrategico.
6. Crear una investigacion y vincularla a uno o mas insights.
7. Crear una hipotesis discovery y vincularla a una iniciativa de roadmap.
8. Confirmar que Iniciativas muestra conteo de hipotesis discovery vinculadas.
9. Confirmar que Decisiones muestra conteo de insights discovery vinculados.
10. Confirmar que Resumen Estrategico muestra conteo de problemas discovery vinculados a objetivos estrategicos.
11. Exportar CSV en cada pantalla discovery con filtros activos y verificar que solo salgan los registros filtrados.
12. Revisar la pantalla de trazabilidad y confirmar eventos de crear, editar y eliminar en entidades discovery y sus relaciones.
13. Verificar acceso en modo solo lectura con rol `lector`.
14. Verificar alta, edicion y eliminacion con rol `editor` o `admin`.

## Lista exacta de archivos creados

- `apps/pm-portal/IMPLEMENTACION_FASE_2_PORTAL_PM.md`
- `apps/pm-portal/docs/sql_fase_2_discovery_supabase.md`
- `apps/pm-portal/src/aplicacion/casos-uso/discovery.ts`
- `apps/pm-portal/src/infraestructura/repositorios/repositorioDiscovery.ts`
- `apps/pm-portal/src/presentacion/paginas/discovery/NavegacionDiscovery.tsx`
- `apps/pm-portal/src/presentacion/paginas/discovery/SelectorRelaciones.tsx`
- `apps/pm-portal/src/presentacion/paginas/discovery/PaginaResumenDiscovery.tsx`
- `apps/pm-portal/src/presentacion/paginas/discovery/segmentos/PaginaSegmentos.tsx`
- `apps/pm-portal/src/presentacion/paginas/discovery/insights/PaginaInsights.tsx`
- `apps/pm-portal/src/presentacion/paginas/discovery/problemas/PaginaProblemasOportunidades.tsx`
- `apps/pm-portal/src/presentacion/paginas/discovery/investigaciones/PaginaInvestigaciones.tsx`
- `apps/pm-portal/src/presentacion/paginas/discovery/hipotesis/PaginaHipotesisDiscovery.tsx`

## Lista exacta de archivos modificados

- `apps/pm-portal/src/dominio/modelos.ts`
- `apps/pm-portal/src/compartido/validacion/esquemas.ts`
- `apps/pm-portal/src/aplicacion/enrutador/enrutador.tsx`
- `apps/pm-portal/src/presentacion/navegacion/menuPortal.ts`
- `apps/pm-portal/src/presentacion/navegacion/BarraLateral.tsx`
- `apps/pm-portal/src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx`
- `apps/pm-portal/src/presentacion/paginas/decisiones/PaginaDecisiones.tsx`
- `apps/pm-portal/src/presentacion/paginas/estrategia/PaginaResumenEstrategico.tsx`

## Estado final

La Fase 2 queda implementada a nivel de codigo, integrada en UI, con soporte de persistencia documentado para Supabase y con validacion tecnica local completada mediante lint y build exitosos.