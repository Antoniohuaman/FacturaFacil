# AUDITORÍA EXTREMA — CRONOGRAMA ROADMAP E INTEGRACIÓN TEMPORAL Y OPERATIVA

## 1. Resumen ejecutivo

### Diagnóstico general

La vista de Cronograma del Roadmap sí está hoy conectada con la planificación propia de Objetivos, Iniciativas y Entregables, pero no de forma homogénea ni puramente directa en los tres niveles.

- Objetivo usa primero su planificación propia (`fecha_inicio` / `fecha_fin`) y, si no existe un rango válido, cae a un agregado derivado de hijos. Evidencia: [PaginaCronogramaRoadmap.tsx#L461](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L461).
- Iniciativa usa primero su planificación propia y, si no existe, cae a `ventana_planificada_id`. Evidencia: [PaginaCronogramaRoadmap.tsx#L485](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L485).
- Entregable usa primero su planificación propia y, si no existe, cae a `ventana_planificada_id`. Evidencia: [PaginaCronogramaRoadmap.tsx#L507](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L507).

El cronograma, por tanto, no es un render “solo fechas propias”; es un render híbrido con política explícita de fallback.

### Nivel de madurez del cronograma

El componente está maduro en estructura visual e interacción de lectura:

- jerarquía clara y expandible,
- tooltips honestos sobre el origen temporal,
- línea de hoy correcta para el modelo actual de fechas,
- filtros útiles,
- persistencia local de expansión y ancho de columna,
- resumen KPI suficientemente ejecutivo.

Pero todavía no está maduro como superficie operativa:

- no crea ni edita desde la propia vista,
- no expone acciones contextuales por fila,
- la leyenda no explica por completo la semántica real de fallback,
- sigue arrastrando señales temporales no visibles en el render principal para calcular años disponibles y algunos indicadores.

### Estado de sincronización temporal

La cadena `captura -> validación -> persistencia -> lectura -> render timeline` está funcional en los tres niveles, con un matiz crítico:

- la persistencia y la lectura sí respetan `fecha_inicio` / `fecha_fin` en Objetivo, Iniciativa y Entregable,
- el render también las respeta si existen,
- pero Iniciativa y Entregable siguen teniendo fallback a ventana planificada,
- y Objetivo sigue teniendo fallback a agregado de hijos.

Conclusión: la sincronización existe, pero la fuente de verdad temporal no es exclusiva ni uniforme.

### Estado de integridad jerárquica

La contención temporal entre niveles existe hoy solo en frontend:

- helper compartido: [roadmapJerarquiaFechas.ts#L45](src/compartido/validacion/roadmapJerarquiaFechas.ts#L45), [roadmapJerarquiaFechas.ts#L71](src/compartido/validacion/roadmapJerarquiaFechas.ts#L71), [roadmapJerarquiaFechas.ts#L98](src/compartido/validacion/roadmapJerarquiaFechas.ts#L98),
- validación de inputs en formularios de iniciativa y entrega,
- validación defensiva en submit de creación y edición.

No hay evidencia en casos de uso, repositorios ni SQL del repositorio de una defensa equivalente a nivel backend para contener Iniciativa dentro de Objetivo o Entregable dentro de Iniciativa.

### Estado de integración con módulos

La integración de lectura con otros módulos existe y es real:

- cronograma carga releases y ventanas,
- usa releases para conteos por fila y para años disponibles,
- usa `fecha_objetivo` para alertas y KPI de entregas próximas/atrasadas,
- usa ventanas para fallback temporal y filtrado.

La integración operativa todavía no existe:

- el cronograma no abre modales,
- no navega a creación/edición,
- no reutiliza los formularios existentes.

### Conclusión de alto nivel

El cronograma ya es una vista ejecutiva sólida de lectura y análisis, pero todavía no es una superficie segura de trabajo en vivo. La arquitectura actual permite evolucionarlo hacia creación/edición contextual, pero hacerlo bien requiere extraer la lógica de formularios hoy incrustada en las páginas CRUD para no duplicar validación ni romper separación de capas.

## 2. Alcance auditado

### Archivos revisados

- Dominio: [modelos.ts#L6](src/dominio/modelos.ts#L6), [modelos.ts#L18](src/dominio/modelos.ts#L18), [modelos.ts#L38](src/dominio/modelos.ts#L38)
- Validación: [esquemas.ts#L44](src/compartido/validacion/esquemas.ts#L44), [esquemas.ts#L63](src/compartido/validacion/esquemas.ts#L63), [esquemas.ts#L89](src/compartido/validacion/esquemas.ts#L89), [roadmapJerarquiaFechas.ts#L45](src/compartido/validacion/roadmapJerarquiaFechas.ts#L45)
- Cronograma: [PaginaCronogramaRoadmap.tsx#L461](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L461), [PaginaCronogramaRoadmap.tsx#L744](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L744), [PaginaCronogramaRoadmap.tsx#L892](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L892), [PaginaCronogramaRoadmap.tsx#L911](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L911), [PaginaCronogramaRoadmap.tsx#L1040](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1040)
- CRUD Objetivos: [PaginaObjetivosRoadmap.tsx#L52](src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx#L52), [PaginaObjetivosRoadmap.tsx#L119](src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx#L119), [PaginaObjetivosRoadmap.tsx#L358](src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx#L358)
- CRUD Iniciativas: [PaginaIniciativasRoadmap.tsx#L102](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L102), [PaginaIniciativasRoadmap.tsx#L360](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L360), [PaginaIniciativasRoadmap.tsx#L716](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L716), [PaginaIniciativasRoadmap.tsx#L978](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L978)
- CRUD Entregas: [PaginaEntregasRoadmap.tsx#L82](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L82), [PaginaEntregasRoadmap.tsx#L412](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L412), [PaginaEntregasRoadmap.tsx#L843](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L843), [PaginaEntregasRoadmap.tsx#L966](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L966)
- Casos de uso: [objetivos.ts](src/aplicacion/casos-uso/objetivos.ts), [iniciativas.ts](src/aplicacion/casos-uso/iniciativas.ts), [entregas.ts](src/aplicacion/casos-uso/entregas.ts), [lanzamientos.ts](src/aplicacion/casos-uso/lanzamientos.ts)
- Repositorios: [repositorioObjetivos.ts](src/infraestructura/repositorios/repositorioObjetivos.ts), [repositorioIniciativas.ts](src/infraestructura/repositorios/repositorioIniciativas.ts), [repositorioEntregas.ts](src/infraestructura/repositorios/repositorioEntregas.ts)
- Resumen Roadmap e integración contextual actual: [PaginaRoadmap.tsx#L213](src/presentacion/paginas/roadmap/PaginaRoadmap.tsx#L213), [PaginaRoadmap.tsx#L251](src/presentacion/paginas/roadmap/PaginaRoadmap.tsx#L251), [PaginaRoadmap.tsx#L438](src/presentacion/paginas/roadmap/PaginaRoadmap.tsx#L438), [PaginaRoadmap.tsx#L547](src/presentacion/paginas/roadmap/PaginaRoadmap.tsx#L547)
- Infra UI modal: [ModalPortal.tsx](src/compartido/ui/ModalPortal.tsx)
- SQL y migraciones: [migracion_fase1_temporalidad_roadmap.sql](scripts/migracion_fase1_temporalidad_roadmap.sql), [migracion_fase2a_rango_entregas.sql](scripts/migracion_fase2a_rango_entregas.sql), [sql_planificacion_supabase.md#L36](docs/sql_planificacion_supabase.md#L36), [sql_supabase_portal_pm.md#L134](docs/sql_supabase_portal_pm.md#L134)

### Capas revisadas

- modelos de dominio,
- esquemas Zod,
- helper jerárquico de fechas,
- formularios y modales,
- submit defensivo,
- casos de uso,
- repositorios Supabase,
- cronograma,
- resumen Roadmap,
- SQL/migraciones disponibles en el repositorio,
- documentos recientes de implementación.

### Límites de auditoría

- Auditoría de solo lectura.
- No se ejecutaron mutaciones ni pruebas sobre una base real.
- No se validó comportamiento visual con datos de producción.
- No se infiere ninguna regla no presente en el repositorio.

## 3. Fuente temporal real por entidad

### 3.1 Objetivo

#### Fuente real del timeline

El cronograma resuelve Objetivo así:

1. intenta `fecha_inicio` / `fecha_fin` propias;
2. si el rango propio no es válido o no existe, usa un agregado del mínimo inicio y máximo fin de los segmentos hijos visibles.

Evidencia:

- lectura de fechas propias: [PaginaCronogramaRoadmap.tsx#L462](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L462)
- fallback por hijos: [PaginaCronogramaRoadmap.tsx#L471](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L471)

#### Diagnóstico

- Sí usa `fecha_inicio` / `fecha_fin`.
- Sí usa agregado de hijos como fallback.
- Sí hay mezcla semántica controlada.

#### Implicación funcional

La barra gris de objetivo no siempre significa “planificación propia del objetivo”. Significa:

- planificación propia cuando existe,
- rango derivado cuando no existe rango propio válido.

### 3.2 Iniciativa

#### Fuente real del timeline

La iniciativa se dibuja así:

1. usa `fecha_inicio` / `fecha_fin` propias si existen y son válidas;
2. si no, usa la ventana planificada asociada.

Evidencia:

- prioridad a fechas propias: [PaginaCronogramaRoadmap.tsx#L486](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L486)
- fallback a ventana planificada: [PaginaCronogramaRoadmap.tsx#L495](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L495)

#### Diagnóstico

- Sí usa `fecha_inicio` / `fecha_fin`.
- Sí usa `ventana_planificada_id` como respaldo.
- No usa otra fuente temporal.

### 3.3 Entregable

#### Fuente real del timeline

La entrega se dibuja así:

1. usa `fecha_inicio` / `fecha_fin` propias si existen y son válidas;
2. si no, usa la ventana planificada.

Evidencia:

- prioridad a fechas propias: [PaginaCronogramaRoadmap.tsx#L508](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L508)
- fallback a ventana planificada: [PaginaCronogramaRoadmap.tsx#L517](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L517)

#### Qué no usa para dibujar la barra

- no usa `fecha_objetivo` para la barra,
- no usa `ventana_real_id` para la barra,
- no usa `ventana_real` visible en el timeline,
- no usa `fecha_completado` para la barra.

Esos campos sí intervienen en señales auxiliares:

- atraso por `fecha_objetivo`: [PaginaCronogramaRoadmap.tsx#L413](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L413)
- años disponibles por `fecha_objetivo` y `fecha_completado`: [PaginaCronogramaRoadmap.tsx#L775](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L775)
- detalle textual por `fecha_objetivo`: bloque de filas de entrega en [PaginaCronogramaRoadmap.tsx#L1177](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1177)

#### Diagnóstico

- Sí usa `fecha_inicio` / `fecha_fin`.
- Sí usa `ventana_planificada_id` como fallback.
- `fecha_objetivo` ya no gobierna la barra principal.
- `ventana_real_id` no está representada visualmente en el cronograma actual.

## 4. Sincronización end-to-end

### 4.1 Objetivo

#### Captura

El formulario de objetivos captura `fecha_inicio` y `fecha_fin` en el modal de la página CRUD. Evidencia: [PaginaObjetivosRoadmap.tsx#L358](src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx#L358).

#### Validación

Usa `objetivoSchema`, que valida coherencia interna del rango. Evidencia: [PaginaObjetivosRoadmap.tsx#L52](src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx#L52), [esquemas.ts#L44](src/compartido/validacion/esquemas.ts#L44).

#### Persistencia

El submit normaliza `'' -> null` y llama a `crearObjetivo` o `editarObjetivo`. Evidencia: [PaginaObjetivosRoadmap.tsx#L358](src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx#L358), [PaginaObjetivosRoadmap.tsx#L371](src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx#L371), [PaginaObjetivosRoadmap.tsx#L375](src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx#L375).

El caso de uso y repositorio pasan esos campos a Supabase sin recortarlos. Evidencia: [objetivos.ts](src/aplicacion/casos-uso/objetivos.ts), [repositorioObjetivos.ts](src/infraestructura/repositorios/repositorioObjetivos.ts).

#### Lectura

El cronograma carga objetivos con `listarObjetivos()` en su arranque. Evidencia: [PaginaCronogramaRoadmap.tsx#L668](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L668).

#### Render timeline

Usa fechas propias y fallback agregado de hijos. Evidencia: [PaginaCronogramaRoadmap.tsx#L461](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L461).

#### Tooltip

Sí. El tooltip de fila y el de segmento muestran rango y contexto temporal. Evidencia: bloque tooltip de fila y segmento en [PaginaCronogramaRoadmap.tsx#L1600](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1600).

#### Resumen lateral

No existe un resumen lateral específico del cronograma. Solo existe un resumen superior tipo KPI dentro de la propia página. Evidencia: [PaginaCronogramaRoadmap.tsx#L1000](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1000).

#### Filtros

Sí existen filtros de vista, año, objetivo, estado y ventana. Evidencia: [PaginaCronogramaRoadmap.tsx#L1391](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1391).

#### Estado de la cadena

Cadena completa hasta timeline: sí.

Matiz: el timeline puede dejar de representar la planificación propia del objetivo si cae al fallback agregado.

### 4.2 Iniciativa

#### Captura

El formulario captura `fecha_inicio` y `fecha_fin`, junto con objetivo, ventana y etapa. Evidencia: [PaginaIniciativasRoadmap.tsx#L702](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L702).

#### Validación

- esquema base: [esquemas.ts#L63](src/compartido/validacion/esquemas.ts#L63)
- límites jerárquicos construidos desde objetivo padre: [PaginaIniciativasRoadmap.tsx#L360](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L360)
- validación de campo en inputs: [PaginaIniciativasRoadmap.tsx#L978](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L978), [PaginaIniciativasRoadmap.tsx#L1005](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L1005)
- validación defensiva en submit: [PaginaIniciativasRoadmap.tsx#L716](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L716)

#### Persistencia

El submit normaliza nulos y persiste create/edit con el mismo flujo. Evidencia: [PaginaIniciativasRoadmap.tsx#L741](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L741), [iniciativas.ts](src/aplicacion/casos-uso/iniciativas.ts), [repositorioIniciativas.ts](src/infraestructura/repositorios/repositorioIniciativas.ts).

#### Lectura

El cronograma carga iniciativas con `listarIniciativas()`. Evidencia: [PaginaCronogramaRoadmap.tsx#L668](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L668).

#### Render timeline

Usa fechas propias con fallback a ventana planificada. Evidencia: [PaginaCronogramaRoadmap.tsx#L485](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L485).

#### Tooltip

Sí, describe si es rango propio o ventana usada como respaldo. Evidencia: [PaginaCronogramaRoadmap.tsx#L549](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L549).

#### Filtros

Sí. El cronograma filtra iniciativas por objetivo, estado y ventana, y solo muestra las que tengan evidencia temporal suficiente. Evidencia: [PaginaCronogramaRoadmap.tsx#L892](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L892).

#### Expansión jerárquica

Sí. Objetivo expande iniciativas; la expansión se persiste en localStorage. Evidencia: [PaginaCronogramaRoadmap.tsx#L618](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L618), [PaginaCronogramaRoadmap.tsx#L811](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L811).

#### Estado de la cadena

Cadena completa hasta timeline: sí.

Matiz: el render no garantiza que siempre se vea la planificación propia; si no hay rango propio, se ve la ventana planificada.

### 4.3 Entregable

#### Captura

El formulario captura `fecha_inicio`, `fecha_fin`, `fecha_objetivo`, `ventana_planificada_id` y `ventana_real_id`. Evidencia: [PaginaEntregasRoadmap.tsx#L830](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L830).

#### Validación

- esquema base: [esquemas.ts#L89](src/compartido/validacion/esquemas.ts#L89)
- regla interna de `fecha_objetivo` contra rango propio: [esquemas.ts#L111](src/compartido/validacion/esquemas.ts#L111), [esquemas.ts#L118](src/compartido/validacion/esquemas.ts#L118)
- límites jerárquicos desde iniciativa padre: [PaginaEntregasRoadmap.tsx#L412](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L412)
- validación de campo en inputs: [PaginaEntregasRoadmap.tsx#L966](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L966), [PaginaEntregasRoadmap.tsx#L989](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L989)
- validación defensiva en submit: [PaginaEntregasRoadmap.tsx#L843](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L843)

#### Persistencia

El submit normaliza nulos y persiste create/edit con el mismo flujo. Evidencia: [PaginaEntregasRoadmap.tsx#L868](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L868), [PaginaEntregasRoadmap.tsx#L870](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L870), [entregas.ts](src/aplicacion/casos-uso/entregas.ts), [repositorioEntregas.ts](src/infraestructura/repositorios/repositorioEntregas.ts).

#### Lectura

El cronograma carga entregas con `listarEntregas()`. Evidencia: [PaginaCronogramaRoadmap.tsx#L668](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L668).

#### Render timeline

Usa fechas propias con fallback a ventana planificada. Evidencia: [PaginaCronogramaRoadmap.tsx#L507](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L507).

#### Tooltip

Sí, pero el tooltip del entregable mezcla dos planos:

- barra: describe el origen del rango de la barra,
- fila: detalle textual muestra `fecha_objetivo`.

Eso es útil, pero exige entender que la fecha objetivo no es la barra.

#### Filtros

Sí, aunque con un matiz importante: el filtro de ventana acepta coincidencia por `ventana_planificada_id` o `ventana_real_id`, mientras la barra visible no representa `ventana_real_id`. Evidencia: [PaginaCronogramaRoadmap.tsx#L911](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L911).

#### Expansión jerárquica

Sí. Entrega es hoja terminal; no expande más. Evidencia: bloque de filas en [PaginaCronogramaRoadmap.tsx#L1600](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1600).

#### Estado de la cadena

Cadena completa hasta timeline: sí.

Matiz: la barra no representa ni `fecha_objetivo` ni `ventana_real_id`; esos campos siguen vivos en señales auxiliares.

## 5. Integridad jerárquica de fechas

### Qué reglas existen

- contención Iniciativa dentro de Objetivo en frontend,
- contención Entregable dentro de Iniciativa en frontend,
- validación de rango propio interno por Zod,
- validación defensiva al guardar en create y edit.

Evidencia:

- helper compartido: [roadmapJerarquiaFechas.ts#L45](src/compartido/validacion/roadmapJerarquiaFechas.ts#L45), [roadmapJerarquiaFechas.ts#L71](src/compartido/validacion/roadmapJerarquiaFechas.ts#L71)
- iniciativas: [PaginaIniciativasRoadmap.tsx#L716](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L716)
- entregas: [PaginaEntregasRoadmap.tsx#L843](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L843)

### Dónde viven

- UI de calendario: `min` / `max` en inputs,
- helper compartido de validación,
- submit defensivo en formularios,
- no hay evidencia de schema jerárquico Zod autónomo,
- no hay evidencia de enforcement en casos de uso,
- no hay evidencia de enforcement en repositorios,
- no hay evidencia de constraint o trigger SQL de contención entre tablas.

La documentación SQL disponible solo muestra:

- columnas y checks internos de rango,
- autocompletado de `ventana_real_id` por `fecha_completado`.

Evidencia: [sql_planificacion_supabase.md#L20](docs/sql_planificacion_supabase.md#L20), [sql_planificacion_supabase.md#L109](docs/sql_planificacion_supabase.md#L109).

### Qué tan sólidas son

Solidez actual: media en frontend, baja end-to-end.

Fortalezas:

- misma validación en create y edit,
- misma regla en input y submit,
- helper compartido evita divergencia entre Iniciativas y Entregas.

Debilidades:

- si el padre no tiene rango completo y válido, la contención no se aplica,
- no existe barrera en backend/casos de uso/repositorio/SQL,
- cualquier nuevo punto de escritura que no reutilice estos formularios puede saltarse la regla.

### Qué falta

- enforcement fuera del frontend,
- una política explícita sobre qué pasa si el padre no tiene rango,
- auditoría de datos históricos incoherentes,
- eventual validación a nivel de dominio o backend antes de volver el cronograma editable.

## 6. Semántica visible del cronograma

### Barras

- barra gris de objetivo: no siempre representa planificación propia; puede representar rango derivado. Evidencia: [PaginaCronogramaRoadmap.tsx#L461](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L461)
- barra de iniciativa: representa su propio rango si existe; si no, representa su ventana planificada. Evidencia: [PaginaCronogramaRoadmap.tsx#L485](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L485)
- barra de entregable: representa su propio rango si existe; si no, representa su ventana planificada. Evidencia: [PaginaCronogramaRoadmap.tsx#L507](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L507)

### Tooltips

Los tooltips sí describen correctamente la fuente temporal real.

El helper `describirContextoTemporalRango` distingue:

- rango planificado propio,
- rango derivado de hijos,
- ventana planificada usada como respaldo.

Evidencia: [PaginaCronogramaRoadmap.tsx#L549](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L549), [PaginaCronogramaRoadmap.tsx#L563](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L563), [PaginaCronogramaRoadmap.tsx#L566](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L566).

Diagnóstico: tooltips honestos.

### Leyenda

La leyenda visible solo dice:

- `Objetivo`
- `Iniciativa plan`
- `Entrega plan`

Evidencia: cierre del componente en [PaginaCronogramaRoadmap.tsx#L1803](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1803).

Diagnóstico: no coincide 100% con el render real, porque no comunica:

- que Objetivo puede ser derivado,
- que Iniciativa y Entrega pueden estar mostrando fallback por ventana,
- que `fecha_objetivo` sigue afectando desvíos y KPI sin ser la barra.

### Línea de HOY

La línea de hoy está bien resuelta para el modelo actual:

- se calcula una vez a medianoche local del cliente,
- solo se renderiza si cae dentro del rango visible,
- se posiciona por la misma escala temporal que usan las barras.

Evidencia: [PaginaCronogramaRoadmap.tsx#L586](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L586), bloque visible en [PaginaCronogramaRoadmap.tsx#L1688](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1688).

Matiz: no está fijada a una zona horaria corporativa única; usa el reloj del cliente.

### Filtros

Los filtros son útiles y suficientemente ejecutivos, pero no completamente semánticos.

Punto correcto:

- vista temporal,
- año,
- trimestre,
- objetivo,
- estado,
- ventana.

Punto inconsistente:

- en entregas, el filtro por ventana permite coincidencia por `ventana_real_id`, aunque el timeline no dibuja esa ventana. Evidencia: [PaginaCronogramaRoadmap.tsx#L911](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L911).

### Resúmenes

El resumen KPI del cronograma es útil, compacto y ejecutivo. Evidencia: [PaginaCronogramaRoadmap.tsx#L1000](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1000).

Pero sigue mezclando señales no idénticas al render principal:

- `Entregas próximas` y `Entregas atrasadas` dependen de `fecha_objetivo`, no de la barra dibujada.

## 7. Residuos históricos y complejidad oculta

### Releases

El cronograma sigue cargando releases. Evidencia: [PaginaCronogramaRoadmap.tsx#L668](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L668).

Uso real actual:

- conteos por objetivo e iniciativa: [PaginaCronogramaRoadmap.tsx#L1103](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1103), [PaginaCronogramaRoadmap.tsx#L1159](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1159)
- años disponibles: [PaginaCronogramaRoadmap.tsx#L785](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L785)

No hay evidencia de render de releases en el timeline actual.

Diagnóstico: residuo funcional todavía activo, pero lateral, no central.

### Años disponibles

El selector de años se arma con una mezcla amplia de señales:

- fechas propias de objetivo,
- fechas propias de iniciativa,
- fechas propias de entrega,
- años y fechas de ventanas,
- `fecha_objetivo`,
- `fecha_completado`,
- releases.

Evidencia: [PaginaCronogramaRoadmap.tsx#L744](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L744).

Diagnóstico: esto amplía la cobertura del selector, pero ya no responde solo a lo que el timeline principal dibuja.

### Detalles heredados

- El detalle de entrega muestra `fecha_objetivo` aunque la barra no la represente como fuente principal.
- El desvío se calcula por `fecha_objetivo` vencida, no por atraso respecto al rango dibujado.

Diagnóstico: semánticamente defendible, pero exige alfabetización del usuario.

### Lógica antigua

No hay evidencia de que `ventana_real_id` o releases sigan gobernando la barra principal del cronograma. La lógica antigua quedó reducida a filtros, conteos y años disponibles.

## 8. Auditoría UX del cronograma

### Lo que está bien

- jerarquía visual clara entre objetivo, iniciativa y entrega,
- expansión/colapso persistente y útil,
- columna jerárquica redimensionable,
- relación izquierda vs timeline bien resuelta,
- hover útil y no ruidoso,
- densidad visual contenida,
- resumen KPI compacto y apagable,
- empty state honesto: no finge cronograma sin evidencia temporal.

Evidencia estructural: [PaginaCronogramaRoadmap.tsx#L1391](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1391), [PaginaCronogramaRoadmap.tsx#L1600](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1600).

### Lo que está regular

- la leyenda se queda corta respecto a la semántica real,
- el usuario solo entiende el origen temporal real si hace hover,
- el filtro por ventana en entregas mezcla plan y real sin reflejar esa dualidad en la barra,
- no existe CTA contextual para operar sin salir de la vista.

### Lo que falta

- acciones contextuales por fila,
- visibilidad no-hover del origen temporal (`plan propio`, `ventana`, `derivado`),
- integración de creación/edición in situ,
- una decisión de producto explícita sobre si `fecha_objetivo` debe seguir siendo señal secundaria o debe reaparecer visualmente.

### Lo que no conviene tocar más

- la estructura base de jerarquía,
- el patrón visual de tres barras,
- la compactación general,
- la línea de hoy,
- la persistencia local de expansión.

### Siguiente mejora UX correcta

La siguiente mejora correcta no es más decoración. Es añadir acciones contextuales y hacer visible el origen temporal sin obligar a hover.

## 9. Viabilidad de creación/edición contextual desde el cronograma

### Estado actual

Hoy no existe integración contextual dentro del cronograma.

- no usa `ModalPortal`,
- no usa navegación a CRUD,
- no tiene botones de crear/editar por fila,
- solo hay interacciones de filtros, resumen y expansión.

Evidencia: no hay `ModalPortal` ni `navigate` en [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx); las únicas `onClick` relevantes son filtros y expansión. Ver búsqueda y render en [PaginaCronogramaRoadmap.tsx#L1624](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1624).

### Formularios reutilizables o no

Los formularios todavía no están extraídos como componentes compartidos reutilizables.

Cada página CRUD concentra:

- estado del modal,
- modo crear/ver/editar,
- entidad activa,
- `useForm`,
- submit,
- carga de catálogos/datos auxiliares,
- render completo del formulario dentro de la propia página.

Evidencia:

- Objetivos: [PaginaObjetivosRoadmap.tsx#L42](src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx#L42), [PaginaObjetivosRoadmap.tsx#L119](src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx#L119), [PaginaObjetivosRoadmap.tsx#L351](src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx#L351)
- Iniciativas: [PaginaIniciativasRoadmap.tsx#L102](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L102), [PaginaIniciativasRoadmap.tsx#L385](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L385), [PaginaIniciativasRoadmap.tsx#L702](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L702)
- Entregas: [PaginaEntregasRoadmap.tsx#L82](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L82), [PaginaEntregasRoadmap.tsx#L433](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L433), [PaginaEntregasRoadmap.tsx#L830](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L830)

Diagnóstico: reutilización actual baja a media.

### Qué tan fácil sería abrirlos desde cronograma

- Objetivo: relativamente fácil.
- Entrega: dificultad media.
- Iniciativa: dificultad media-alta.

Razón:

- Objetivo tiene pocas dependencias.
- Entrega depende de iniciativas y ventanas.
- Iniciativa depende de objetivos, ventanas, etapas y configuración RICE.

### Si conviene reusar modal existente o extraer componente compartido

La opción prudente no es reusar las páginas completas, sino extraer el contenido del formulario y su hook/controlador.

Conviene separar:

1. componente de formulario puro,
2. hook o controlador de submit y carga auxiliar,
3. host visual actual en cada página CRUD,
4. host nuevo en cronograma.

### Deuda técnica por duplicación

Sí habría deuda técnica alta si se implementa directamente un segundo formulario dentro del cronograma sin extracción previa.

Se duplicaría:

- validación jerárquica,
- normalización de nulos,
- carga de catálogos,
- control de create/edit,
- mensajería de error.

### Mejor estrategia de interacción

#### Para prudencia técnica

Modal es la estrategia más segura a corto plazo, porque:

- ya existe `ModalPortal`: [ModalPortal.tsx](src/compartido/ui/ModalPortal.tsx)
- el producto ya usa modales en los CRUD del Roadmap,
- minimiza superficie nueva.

#### Para contexto ejecutivo ideal

Un drawer grande preservaría mejor el contexto del timeline, pero hoy introducirlo sería un cambio adicional de patrón y no es la opción más prudente para la primera iteración.

#### Recomendación concreta

- Fase 1 segura: extracción + apertura en modal reutilizando `ModalPortal`.
- Fase 2 opcional: evaluar drawer solo si el uso intensivo en reuniones demuestra que perder parte del fondo del cronograma perjudica la conversación.

### Nivel de riesgo técnico

Riesgo global: medio.

- bajo para Objetivo,
- medio para Entrega,
- medio-alto para Iniciativa.

No por el repositorio o los casos de uso, sino por la necesidad de desacoplar formularios hoy incrustados.

## 10. Uso del cronograma en reuniones ejecutivas

### Estado actual

Hoy sirve bien para lectura ejecutiva y conversación de seguimiento.

Sirve para:

- revisar secuencia temporal,
- entender jerarquía,
- detectar entregas próximas o atrasadas,
- discutir foco y ventana.

### Limitaciones

No sirve todavía como verdadera superficie de trabajo en vivo, porque no permite:

- crear objetivo desde la vista,
- crear iniciativa bajo objetivo contextual,
- crear entrega bajo iniciativa contextual,
- editar registro desde la fila,
- ajustar fechas sin salir de la vista.

### Mejoras necesarias

- acciones contextuales por nivel,
- formularios reutilizados desde el cronograma,
- prefills contextuales por fila,
- refuerzo de visibilidad del origen temporal,
- protección jerárquica fuera del frontend antes de abrir más puntos de escritura.

### Factibilidad

Sí es factible evolucionarlo a superficie de trabajo, pero no conviene hacerlo como parche de UI. Requiere refactor seguro de formularios y consolidación de validación.

## 11. Hallazgos críticos

### P0

No se confirmó ningún P0 activo en el código auditado. No hay evidencia de que el cronograma esté dibujando fechas inventadas o inconsistentes con lo cargado; los fallbacks están codificados explícitamente y los tooltips los explican.

### P1-1. La contención jerárquica vive solo en frontend

- Descripción: la regla “iniciativa dentro de objetivo” y “entregable dentro de iniciativa” no tiene evidencia de enforcement en casos de uso, repositorios ni SQL.
- Evidencia: [roadmapJerarquiaFechas.ts#L71](src/compartido/validacion/roadmapJerarquiaFechas.ts#L71), [PaginaIniciativasRoadmap.tsx#L716](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L716), [PaginaEntregasRoadmap.tsx#L843](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L843), contraste con [iniciativas.ts](src/aplicacion/casos-uso/iniciativas.ts), [entregas.ts](src/aplicacion/casos-uso/entregas.ts), [sql_planificacion_supabase.md#L109](docs/sql_planificacion_supabase.md#L109)
- Impacto funcional: nuevas superficies de escritura podrían persistir incoherencias temporales.
- Impacto UX: el usuario puede creer que la jerarquía está garantizada globalmente cuando solo está protegida en esos formularios.
- Impacto técnico: alta dependencia en formularios específicos.
- Riesgo: medio-alto.

### P1-2. El filtro de ventana de entregas mezcla `ventana_real_id` con un timeline que no dibuja ventana real

- Descripción: una entrega puede entrar por filtro gracias a `ventana_real_id`, pero la barra visible seguirá siendo rango propio o ventana planificada.
- Evidencia: [PaginaCronogramaRoadmap.tsx#L911](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L911), [PaginaCronogramaRoadmap.tsx#L507](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L507)
- Impacto funcional: subconjunto filtrado no siempre coincide intuitivamente con la semántica visible de la barra.
- Impacto UX: genera ambigüedad al filtrar por ventana.
- Impacto técnico: deuda semántica, no de datos.
- Riesgo: medio.

### P1-3. La leyenda no expresa la semántica real de fallback

- Descripción: la leyenda reduce todo a tres barras y no expone cuándo el cronograma está mostrando plan propio, respaldo por ventana o derivación por hijos.
- Evidencia: [PaginaCronogramaRoadmap.tsx#L1803](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1803) contra [PaginaCronogramaRoadmap.tsx#L549](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L549)
- Impacto funcional: bajo.
- Impacto UX: medio; obliga a hover para entender la semántica exacta.
- Impacto técnico: bajo.
- Riesgo: medio.

### P2-1. Releases siguen cargándose sin representación visual en el timeline principal

- Descripción: releases todavía afectan años disponibles y conteos, pero ya no tienen representación visual en el cronograma actual.
- Evidencia: [PaginaCronogramaRoadmap.tsx#L668](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L668), [PaginaCronogramaRoadmap.tsx#L785](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L785), [PaginaCronogramaRoadmap.tsx#L1103](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1103)
- Impacto funcional: bajo.
- Impacto UX: bajo-medio; complejidad no visible.
- Impacto técnico: complejidad residual.
- Riesgo: bajo.

### P2-2. Años disponibles se calculan con señales temporales más amplias que el render principal

- Descripción: el selector de años incorpora `fecha_objetivo`, `fecha_completado` y releases, además de rangos dibujables.
- Evidencia: [PaginaCronogramaRoadmap.tsx#L744](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L744)
- Impacto funcional: bajo.
- Impacto UX: puede exponer años con evidencia lateral más que visual.
- Impacto técnico: complejidad oculta moderada.
- Riesgo: bajo.

### P2-3. El cronograma aún no es una superficie operativa

- Descripción: no hay modales, navegación contextual ni formularios reutilizados desde la vista.
- Evidencia: ausencia de `ModalPortal` y `navigate` en [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx); contraste con [PaginaRoadmap.tsx#L547](src/presentacion/paginas/roadmap/PaginaRoadmap.tsx#L547) y los CRUD [PaginaObjetivosRoadmap.tsx#L351](src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx#L351), [PaginaIniciativasRoadmap.tsx#L702](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L702), [PaginaEntregasRoadmap.tsx#L830](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L830)
- Impacto funcional: limita la planificación en vivo.
- Impacto UX: obliga a salir del flujo ejecutivo.
- Impacto técnico: deuda de composición, no de datos.
- Riesgo: medio si se implementa sin extracción previa.

## 12. Validación de hipótesis

| Hipótesis | Estado | Evidencia | Comentario |
| --- | --- | --- | --- |
| El cronograma usa `fecha_inicio` / `fecha_fin` de Objetivo | Confirmada parcialmente | [PaginaCronogramaRoadmap.tsx#L462](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L462) | Las usa primero, pero no exclusivamente |
| El cronograma usa agregado de hijos para Objetivo | Confirmada | [PaginaCronogramaRoadmap.tsx#L471](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L471) | Fallback explícito |
| El cronograma usa `fecha_inicio` / `fecha_fin` de Iniciativa | Confirmada parcialmente | [PaginaCronogramaRoadmap.tsx#L486](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L486) | Prioridad a rango propio |
| El cronograma usa `ventana_planificada` en Iniciativa | Confirmada | [PaginaCronogramaRoadmap.tsx#L495](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L495) | Como respaldo |
| El cronograma usa `fecha_inicio` / `fecha_fin` de Entregable | Confirmada parcialmente | [PaginaCronogramaRoadmap.tsx#L508](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L508) | Prioridad a rango propio |
| El cronograma usa `ventana_planificada` en Entregable | Confirmada | [PaginaCronogramaRoadmap.tsx#L517](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L517) | Como respaldo |
| La barra de Entregable usa `fecha_objetivo` | Refutada | [PaginaCronogramaRoadmap.tsx#L507](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L507) | `fecha_objetivo` solo queda en detalle y alertas |
| La barra de Entregable usa `ventana_real_id` | Refutada | [PaginaCronogramaRoadmap.tsx#L507](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L507) | `ventana_real_id` no tiene barra propia |
| La leyenda coincide exactamente con el render real | Refutada parcialmente | [PaginaCronogramaRoadmap.tsx#L1803](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1803), [PaginaCronogramaRoadmap.tsx#L549](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L549) | Explica color/tipo, no origen temporal real |
| Los tooltips describen correctamente la fuente temporal | Confirmada | [PaginaCronogramaRoadmap.tsx#L549](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L549), [PaginaCronogramaRoadmap.tsx#L1715](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1715) | Son la parte más honesta del componente |
| La contención temporal está implementada | Confirmada parcialmente | [roadmapJerarquiaFechas.ts#L71](src/compartido/validacion/roadmapJerarquiaFechas.ts#L71) | Solo en frontend |
| La contención vive en UI/helper/submit | Confirmada | [PaginaIniciativasRoadmap.tsx#L360](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L360), [PaginaEntregasRoadmap.tsx#L412](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L412) | No hay evidencia en backend |
| Se valida igual en creación y edición | Confirmada | mismos submit handlers en [PaginaIniciativasRoadmap.tsx#L716](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L716) y [PaginaEntregasRoadmap.tsx#L843](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L843) | Mismo modal, mismo flujo |
| Existen fallbacks históricos activos | Confirmada | [PaginaCronogramaRoadmap.tsx#L471](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L471), [PaginaCronogramaRoadmap.tsx#L495](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L495), [PaginaCronogramaRoadmap.tsx#L517](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L517) | Ya no dominan todo, pero siguen activos |
| Desde el cronograma hoy se puede crear/editar | Refutada | [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx) | No hay infraestructura contextual actual |
| Los formularios ya son reutilizables | Refutada parcialmente | [PaginaObjetivosRoadmap.tsx#L351](src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx#L351), [PaginaIniciativasRoadmap.tsx#L702](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L702), [PaginaEntregasRoadmap.tsx#L830](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L830) | Reutilizables por patrón, no por extracción real |

## 13. Recomendación final

### Qué está bien

- el cronograma ya está correctamente sincronizado con `fecha_inicio` / `fecha_fin` como primera prioridad en los tres niveles,
- los fallbacks están codificados de forma explícita y no oculta,
- los tooltips sí comunican la fuente temporal real,
- la validación jerárquica de frontend está razonablemente bien resuelta,
- la UX de lectura está suficientemente bien para uso ejecutivo.

### Qué está roto o incompleto

- la contención jerárquica no está defendida fuera del frontend,
- la semántica visible no es autosuficiente sin hover,
- el filtro de ventana de entregas mezcla una señal (`ventana_real_id`) no representada en la barra,
- el cronograma no es todavía una superficie operativa.

### Siguiente paso correcto

El siguiente paso correcto no es rediseñar visualmente el cronograma. Es preparar la arquitectura para edición contextual sin duplicación:

1. extraer formularios y controladores de Objetivo, Iniciativa y Entrega,
2. mantener las páginas CRUD actuales como hosts de esos formularios,
3. abrir esos mismos formularios desde cronograma en `ModalPortal`,
4. añadir acciones por fila con prefills contextuales,
5. antes o en paralelo, elevar la contención jerárquica fuera del frontend.

### Plan prudente recomendado

#### Fase 1

- extraer `FormularioObjetivoRoadmap`, `FormularioIniciativaRoadmap`, `FormularioEntregaRoadmap`,
- extraer hooks/controladores de submit y carga auxiliar.

#### Fase 2

- agregar acciones contextuales en cronograma:
  - crear objetivo global,
  - crear iniciativa bajo objetivo,
  - crear entrega bajo iniciativa,
  - editar fila existente.

#### Fase 3

- reforzar integridad jerárquica fuera de la UI,
- revisar si el filtro de ventana de entregas debe dejar de mezclar `ventana_real_id` o si el timeline debe representar esa señal.

#### Interacción recomendada

- modal para la primera iteración por prudencia y consistencia con el sistema,
- drawer solo después, si el uso real demuestra necesidad de preservar más contexto visual durante edición.

## 14. Anexo de evidencias

| Archivo / bloque | Evidencia | Hallazgo asociado |
| --- | --- | --- |
| [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L461](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L461) | Objetivo usa fechas propias y fallback agregado | Fuente temporal Objetivo |
| [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L485](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L485) | Iniciativa usa fechas propias y fallback ventana | Fuente temporal Iniciativa |
| [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L507](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L507) | Entrega usa fechas propias y fallback ventana | Fuente temporal Entrega |
| [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L549](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L549) | Texto de origen temporal real | Honestidad de tooltips |
| [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L744](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L744) | Años disponibles mezclan rangos, hitos y releases | Residuos y complejidad oculta |
| [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L892](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L892) | Filtro de iniciativas por rango temporal y ventana | Filtros cronograma |
| [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L911](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L911) | Filtro de entregas mezcla plan y real | Hallazgo P1-2 |
| [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1000](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1000) | KPI superiores del cronograma | Resumen ejecutivo de la vista |
| [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1600](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1600) | Render de filas, tooltips, línea de hoy y segmentos | UX y semántica visible |
| [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1803](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1803) | Leyenda visible actual | Hallazgo P1-3 |
| [src/compartido/validacion/roadmapJerarquiaFechas.ts#L45](src/compartido/validacion/roadmapJerarquiaFechas.ts#L45) | Construcción de límites del padre | Contención en UI |
| [src/compartido/validacion/roadmapJerarquiaFechas.ts#L71](src/compartido/validacion/roadmapJerarquiaFechas.ts#L71) | Validación jerárquica compartida | Contención en frontend |
| [src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L716](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L716) | Submit defensivo de iniciativa | Contención create/edit |
| [src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L843](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L843) | Submit defensivo de entrega | Contención create/edit |
| [src/aplicacion/casos-uso/iniciativas.ts](src/aplicacion/casos-uso/iniciativas.ts) | Caso de uso sin enforcement jerárquico adicional | Hallazgo P1-1 |
| [src/aplicacion/casos-uso/entregas.ts](src/aplicacion/casos-uso/entregas.ts) | Caso de uso sin enforcement jerárquico adicional | Hallazgo P1-1 |
| [src/infraestructura/repositorios/repositorioIniciativas.ts](src/infraestructura/repositorios/repositorioIniciativas.ts) | Persistencia directa en Supabase | Hallazgo P1-1 |
| [src/infraestructura/repositorios/repositorioEntregas.ts](src/infraestructura/repositorios/repositorioEntregas.ts) | Persistencia directa en Supabase | Hallazgo P1-1 |
| [docs/sql_planificacion_supabase.md#L109](docs/sql_planificacion_supabase.md#L109) | Trigger de autocompletado de ventana real, sin contención jerárquica | Hallazgo P1-1 |
| [src/presentacion/paginas/roadmap/PaginaRoadmap.tsx#L547](src/presentacion/paginas/roadmap/PaginaRoadmap.tsx#L547) | El resumen Roadmap navega a creación, no abre modal compartido | Estado actual de integración operativa |
| [src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx#L351](src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx#L351) | Modal objetivo incrustado en página | Reutilización baja-media |
| [src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L702](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L702) | Modal iniciativa incrustado en página | Reutilización baja-media |
| [src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L830](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L830) | Modal entrega incrustado en página | Reutilización baja-media |
