# Implementacion Fase 3 Portal PM

## Resumen de lo implementado

Se implemento la Fase 3 del Portal PM agregando el modulo autonomo `Requerimientos` de forma aditiva y sin romper los flujos existentes de roadmap, estrategia, discovery, decisiones, auditorias o ajustes.

La implementacion cubre:

1. Modulo nuevo `Requerimientos` en menu lateral y enrutador principal.
2. Pantalla de resumen de requerimientos.
3. CRUD completo para historias de usuario, casos de uso, reglas de negocio y requerimientos no funcionales.
4. Gestion embebida de criterios de aceptacion dentro de historias de usuario.
5. Trazabilidad best effort para CRUD y cambios de criterios.
6. Exportacion CSV respetando filtros activos en cada listado del modulo.
7. Integraciones opcionales con Discovery, Iniciativas, Entregas y Decisiones.
8. Documento SQL de Supabase para crear tablas, indices, triggers, RLS y policies de Fase 3.

## Tablas nuevas

- `pm_historias_usuario`
- `pm_criterios_aceptacion`
- `pm_casos_uso`
- `pm_reglas_negocio`
- `pm_requerimientos_no_funcionales`

Notas:

- `Criterios de aceptacion` se mantiene como subentidad de `Historias de usuario`, no como menu independiente.
- Todas las relaciones hacia Discovery, Roadmap y Decisiones son opcionales.
- El modulo nuevo queda registrado en catalogo con codigo `requerimientos`.

## Rutas nuevas

- `/requerimientos`
- `/requerimientos/historias`
- `/requerimientos/casos-uso`
- `/requerimientos/reglas-negocio`
- `/requerimientos/no-funcionales`

## Componentes nuevos

- Navegacion interna de requerimientos para las cinco vistas.
- Pantalla resumen con metricas, distribucion por estado, recientes y resumen de vinculos opcionales.
- Gestor embebido de criterios de aceptacion con agregar, editar, eliminar y reordenar.
- Pantalla CRUD para historias de usuario.
- Pantalla CRUD para casos de uso.
- Pantalla CRUD para reglas de negocio.
- Pantalla CRUD para requerimientos no funcionales.

## Repositorios nuevos

- `repositorioRequerimientos.ts` para persistencia Supabase de entidades y sincronizacion de criterios.

## Casos de uso nuevos

- `requerimientos.ts` para orquestacion de CRUD, trazabilidad best effort y sincronizacion de criterios.

## Pantallas modificadas

- Roadmap iniciativas: muestra historias, casos de uso y RNF vinculados por iniciativa y los exporta en CSV.
- Roadmap entregas: muestra historias y RNF vinculados por entrega y los exporta en CSV.
- Hipotesis discovery: muestra historias derivadas por hipotesis y las exporta en CSV.
- Decisiones: muestra reglas de negocio vinculadas por decision y las exporta en CSV.
- Navegacion general y sidebar: incorporan el modulo Requerimientos.
- Router principal: incorpora todas las rutas de Requerimientos.

## Relaciones con modulos existentes

Integraciones opcionales agregadas:

- Historia de usuario -> Iniciativa
- Historia de usuario -> Entrega
- Historia de usuario -> Hipotesis discovery
- Caso de uso -> Iniciativa
- Caso de uso -> Entrega
- Caso de uso -> Historia de usuario
- Regla de negocio -> Modulo
- Regla de negocio -> Iniciativa
- Regla de negocio -> Historia de usuario
- Regla de negocio -> Decision
- RNF -> Iniciativa
- RNF -> Entrega

Decisiones de integracion:

- Ninguna relacion es obligatoria para crear o editar registros.
- No se alteraron contratos existentes fuera de nuevas lecturas cruzadas y contadores.
- Los contadores y exportaciones usan siempre las colecciones filtradas en UI cuando aplica.

## Trazabilidad

- Se reutilizo el patron existente de `registrarCambioEntidadBestEffort`.
- Se registra trazabilidad best effort para crear, editar y eliminar:
  - historias de usuario
  - criterios de aceptacion
  - casos de uso
  - reglas de negocio
  - requerimientos no funcionales
- Los cambios de criterios se calculan por diff entre estado previo y actual.
- Si el historial falla, la operacion principal no se bloquea.

## Exportacion CSV

Se agrego exportacion CSV usando las colecciones filtradas en UI para:

- Historias de usuario
- Casos de uso
- Reglas de negocio
- Requerimientos no funcionales

Tambien se ampliaron exportaciones existentes en:

- Iniciativas roadmap
- Entregas roadmap
- Hipotesis discovery
- Decisiones

## SQL Supabase

El SQL de Fase 3 fue dejado en:

- `apps/pm-portal/docs/sql_fase_3_requerimientos_supabase.md`

Ese documento incluye:

- alta o actualizacion del modulo `requerimientos` en `pm_catalogo_modulos`
- creacion de las 5 tablas nuevas
- indices de consulta
- triggers `updated_at`
- habilitacion RLS
- policies para lectura y escritura por rol
- consultas de validacion post-migracion

## Riesgos detectados

- Sin aplicar el SQL de Fase 3 en Supabase, el modulo compila pero no tendra persistencia real.
- Las policies asumen la existencia y comportamiento consistente de `public.rol_actual_usuario()` como en fases previas.
- La sincronizacion de criterios resuelve reordenamiento moviendo primero ordenes existentes y luego consolidando el orden final; funcionalmente es correcta, pero genera varias escrituras por actualizacion.
- Los contadores cruzados dependen de que los ids opcionales esten poblados en datos reales.

## Validaciones pendientes

Validado:

- `npm run lint`
- `npm run build`

Pendiente a nivel operativo:

- aplicar el SQL en Supabase
- validar manualmente CRUD y relaciones con datos reales
- revisar acceso por roles `lector`, `editor` y `admin` en entorno integrado
- confirmar trazabilidad visible en la pantalla de historial despues de operaciones del modulo

## Checklist manual de prueba

1. Aplicar el SQL de `apps/pm-portal/docs/sql_fase_3_requerimientos_supabase.md`.
2. Verificar acceso al menu `Requerimientos` y a las cinco rutas nuevas.
3. Crear una historia de usuario con iniciativa, entrega e hipotesis discovery opcionales.
4. Agregar, editar, reordenar y eliminar criterios de aceptacion dentro de la historia.
5. Exportar CSV de historias con filtros activos y validar que solo salgan registros filtrados.
6. Crear un caso de uso y vincularlo opcionalmente a historia, iniciativa y entrega.
7. Crear una regla de negocio vinculada a un modulo y opcionalmente a una decision.
8. Crear un requerimiento no funcional vinculado opcionalmente a iniciativa y entrega.
9. Confirmar que Iniciativas muestra conteo de historias, casos de uso y RNF vinculados.
10. Confirmar que Entregas muestra conteo de historias y RNF vinculados.
11. Confirmar que Hipotesis discovery muestra historias derivadas.
12. Confirmar que Decisiones muestra reglas de negocio vinculadas.
13. Revisar la pantalla de trazabilidad y confirmar eventos de crear, editar y eliminar.
14. Verificar acceso en modo solo lectura con rol `lector`.
15. Verificar alta, edicion y eliminacion con rol `editor` o `admin`.

## Lista exacta de archivos creados

- `apps/pm-portal/IMPLEMENTACION_FASE_3_PORTAL_PM.md`
- `apps/pm-portal/docs/sql_fase_3_requerimientos_supabase.md`
- `apps/pm-portal/src/aplicacion/casos-uso/requerimientos.ts`
- `apps/pm-portal/src/infraestructura/repositorios/repositorioRequerimientos.ts`
- `apps/pm-portal/src/presentacion/paginas/requerimientos/NavegacionRequerimientos.tsx`
- `apps/pm-portal/src/presentacion/paginas/requerimientos/PaginaResumenRequerimientos.tsx`
- `apps/pm-portal/src/presentacion/paginas/requerimientos/historias/GestionCriteriosAceptacion.tsx`
- `apps/pm-portal/src/presentacion/paginas/requerimientos/historias/PaginaHistoriasUsuario.tsx`
- `apps/pm-portal/src/presentacion/paginas/requerimientos/casos-uso/PaginaCasosUso.tsx`
- `apps/pm-portal/src/presentacion/paginas/requerimientos/reglas/PaginaReglasNegocio.tsx`
- `apps/pm-portal/src/presentacion/paginas/requerimientos/no-funcionales/PaginaRequerimientosNoFuncionales.tsx`

## Lista exacta de archivos modificados

- `apps/pm-portal/src/dominio/modelos.ts`
- `apps/pm-portal/src/compartido/validacion/esquemas.ts`
- `apps/pm-portal/src/aplicacion/enrutador/enrutador.tsx`
- `apps/pm-portal/src/presentacion/navegacion/menuPortal.ts`
- `apps/pm-portal/src/presentacion/navegacion/BarraLateral.tsx`
- `apps/pm-portal/src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx`
- `apps/pm-portal/src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx`
- `apps/pm-portal/src/presentacion/paginas/discovery/hipotesis/PaginaHipotesisDiscovery.tsx`
- `apps/pm-portal/src/presentacion/paginas/decisiones/PaginaDecisiones.tsx`

## Estado final

La Fase 3 queda implementada a nivel de codigo, integrada en UI, con soporte de persistencia documentado para Supabase y lista para operar despues de aplicar la migracion SQL correspondiente.