# Implementacion Fase 1 Portal PM

## Alcance implementado

Se implementaron las tres capacidades solicitadas para la Fase 1 del Portal PM existente, manteniendo un enfoque aditivo y sin alterar los flujos actuales de los modulos ya operativos.

1. Trazabilidad real de cambios con registro best effort por CRUD principal.
2. Exportacion CSV en listados principales, respetando los filtros activos en cada pantalla.
3. Modulo Estrategia minimo viable con periodos, OKRs, KPIs, hipotesis y vinculacion con roadmap.

## Cambios funcionales

### Trazabilidad

- Se agrego `pm_historial_cambios` a nivel de dominio, repositorio y caso de uso.
- Se incorporo registro de cambios en los casos de uso de roadmap, validacion, decisiones, auditorias, ajustes y estrategia.
- El registro es best effort: si falla el historial, no se rompe la operacion principal.
- Se creo la pantalla `Trazabilidad`, visible solo para administradores, con filtros por modulo, entidad, accion, actor y fecha.

### Exportacion CSV

- Se creo un helper reutilizable para generar CSV con BOM UTF-8.
- Se agrego exportacion en:
  - Roadmap objetivos
  - Roadmap iniciativas
  - Roadmap entregas
  - Matriz de valor
  - Validacion por modulo
  - Ejecuciones de validacion
  - Decisiones
  - Auditorias
- Cada exportacion usa las colecciones filtradas en UI, por lo que respeta busquedas y filtros ya activos.

### Estrategia minimo viable

- Se agregaron nuevas rutas:
  - `/estrategia`
  - `/estrategia/okrs`
  - `/estrategia/kpis`
  - `/estrategia/hipotesis`
  - `/trazabilidad`
- Se agregaron entradas de menu para `Estrategia` y `Trazabilidad`.
- Se implementaron tablas y contratos para:
  - periodos estrategicos
  - objetivos estrategicos
  - key results
  - KPIs estrategicos
  - hipotesis
  - relaciones con objetivos e iniciativas del roadmap
- Se agregaron pantallas nuevas para resumen estrategico, OKRs, KPIs e hipotesis.
- Se integraron indicadores de vinculo estrategico en roadmap objetivos e iniciativas.

## Capas afectadas

### Dominio y validacion

- Extension de [src/dominio/modelos.ts](src/dominio/modelos.ts)
- Extension de [src/compartido/validacion/esquemas.ts](src/compartido/validacion/esquemas.ts)

### Helpers compartidos

- Nuevo helper CSV en [src/compartido/utilidades/csv.ts](src/compartido/utilidades/csv.ts)
- Nuevo helper de formato en [src/compartido/utilidades/formatoPortal.ts](src/compartido/utilidades/formatoPortal.ts)

### Aplicacion e infraestructura

- Nuevo caso de uso de historial en [src/aplicacion/casos-uso/historialCambios.ts](src/aplicacion/casos-uso/historialCambios.ts)
- Nuevo repositorio de historial en [src/infraestructura/repositorios/repositorioHistorialCambios.ts](src/infraestructura/repositorios/repositorioHistorialCambios.ts)
- Nuevo caso de uso de estrategia en [src/aplicacion/casos-uso/estrategia.ts](src/aplicacion/casos-uso/estrategia.ts)
- Nuevo repositorio de estrategia en [src/infraestructura/repositorios/repositorioEstrategia.ts](src/infraestructura/repositorios/repositorioEstrategia.ts)
- Integracion de historial en casos de uso existentes de roadmap, validacion, decisiones, auditorias y ajustes.

### Presentacion

- Nuevas pantallas en `presentacion/paginas/estrategia/*`
- Nueva pantalla de trazabilidad en `presentacion/paginas/trazabilidad/*`
- Modificaciones en paginas existentes para CSV y vinculos estrategicos

## Archivos nuevos principales

- `apps/pm-portal/src/compartido/utilidades/csv.ts`
- `apps/pm-portal/src/compartido/utilidades/formatoPortal.ts`
- `apps/pm-portal/src/aplicacion/casos-uso/historialCambios.ts`
- `apps/pm-portal/src/infraestructura/repositorios/repositorioHistorialCambios.ts`
- `apps/pm-portal/src/aplicacion/casos-uso/estrategia.ts`
- `apps/pm-portal/src/infraestructura/repositorios/repositorioEstrategia.ts`
- `apps/pm-portal/src/presentacion/paginas/estrategia/NavegacionEstrategia.tsx`
- `apps/pm-portal/src/presentacion/paginas/estrategia/PaginaResumenEstrategico.tsx`
- `apps/pm-portal/src/presentacion/paginas/estrategia/okrs/PaginaOkrs.tsx`
- `apps/pm-portal/src/presentacion/paginas/estrategia/kpis/PaginaKpisEstrategicos.tsx`
- `apps/pm-portal/src/presentacion/paginas/estrategia/hipotesis/PaginaHipotesis.tsx`
- `apps/pm-portal/src/presentacion/paginas/trazabilidad/PaginaTrazabilidad.tsx`
- `apps/pm-portal/docs/sql_fase_1_estrategia_trazabilidad.md`

## Archivos modificados principales

- `apps/pm-portal/src/dominio/modelos.ts`
- `apps/pm-portal/src/compartido/validacion/esquemas.ts`
- `apps/pm-portal/src/aplicacion/enrutador/enrutador.tsx`
- `apps/pm-portal/src/presentacion/navegacion/menuPortal.ts`
- `apps/pm-portal/src/presentacion/navegacion/BarraLateral.tsx`
- `apps/pm-portal/src/aplicacion/casos-uso/objetivos.ts`
- `apps/pm-portal/src/aplicacion/casos-uso/iniciativas.ts`
- `apps/pm-portal/src/aplicacion/casos-uso/entregas.ts`
- `apps/pm-portal/src/aplicacion/casos-uso/matrizValor.ts`
- `apps/pm-portal/src/aplicacion/casos-uso/validaciones.ts`
- `apps/pm-portal/src/aplicacion/casos-uso/ejecucionesValidacion.ts`
- `apps/pm-portal/src/aplicacion/casos-uso/decisiones.ts`
- `apps/pm-portal/src/aplicacion/casos-uso/auditorias.ts`
- `apps/pm-portal/src/aplicacion/casos-uso/ajustes.ts`
- Paginas CRUD/listados existentes afectadas por exportacion CSV y senales de vinculo estrategico.

## SQL requerido

El SQL pendiente para Supabase fue dejado en [docs/sql_fase_1_estrategia_trazabilidad.md](docs/sql_fase_1_estrategia_trazabilidad.md).

Ese documento crea:

- `pm_historial_cambios`
- `pm_periodos_estrategicos`
- `pm_objetivos_estrategicos`
- `pm_key_results`
- `pm_kpis_estrategicos`
- `pm_hipotesis`
- `pm_rel_objetivo_roadmap_kr`
- `pm_rel_iniciativa_kr`
- `pm_rel_iniciativa_hipotesis`

## Decision tecnica relevante

- Se corrigio el snapshot previo de `configuracion_rice` para que la trazabilidad no use una lectura mutante al comparar antes y despues.
- `pm_historial_cambios` no reemplaza `pm_auditorias`; ambos cumplen funciones distintas.
- No se refactorizo la arquitectura base: se extendieron patrones existentes de repositorio, caso de uso, formulario y pagina.

## Verificacion esperada

Validaciones tecnicas a ejecutar despues de aplicar el SQL:

1. `npm run lint`
2. `npm run build`
3. Navegacion manual por `/estrategia` y `/trazabilidad`
4. Alta, edicion y eliminacion de registros con comprobacion visual del historial
5. Exportacion CSV en cada listado principal con filtros activos

## Riesgos y notas

- Sin el SQL de Fase 1 aplicado en Supabase, las nuevas pantallas de Estrategia y Trazabilidad no tendran persistencia real.
- La trazabilidad depende del usuario autenticado disponible en Supabase Auth; si no puede resolverse, el historial se registra con actor nulo y no bloquea la operacion.
- El detalle de historial guarda JSON antes/despues, por lo que conviene revisar politicas RLS y volumen si el uso crece mucho.