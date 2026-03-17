# AUDITORÍA EXTREMA — CONGRUENCIA DEL CRONOGRAMA ROADMAP

## 1. Resumen ejecutivo

### Diagnóstico general

El sistema sí incorporó las nuevas fechas propias en el modelo, formularios y persistencia de Objetivos, Iniciativas y Entregables, pero el Cronograma no está alineado end-to-end con ese cambio.

La integración actual es parcial:

- Objetivos: tienen `fecha_inicio` y `fecha_fin` en dominio, validación, formulario y persistencia, pero el Cronograma no usa esas fechas para dibujar la barra del objetivo. La barra se sigue derivando de iniciativas y entregas hijas.
- Iniciativas: tienen `fecha_inicio` y `fecha_fin` en dominio, validación, formulario y persistencia, pero el Cronograma sigue usando `ventana_planificada_id` como fuente visual principal.
- Entregables: tienen `fecha_inicio` y `fecha_fin` en dominio, validación, formulario y persistencia, pero el Cronograma ignora ese rango nuevo y sigue representando plan/real por ventanas y objetivo/completado por marcadores.

### ¿El cronograma está realmente alineado?

No. Está parcialmente alineado con la persistencia y desalineado semánticamente con el nuevo modelo temporal.

### Nivel de integridad actual

- Integridad de captura: media-alta.
- Integridad de persistencia: alta para los campos nuevos visibles en repositorios CRUD.
- Integridad jerárquica: baja.
- Integridad semántica del Cronograma: baja-media.
- Integridad UX del Cronograma: media-baja.

### Severidad general

Alta. No parece haber una corrupción de datos obvia en el flujo CRUD, pero sí hay una inconsistencia estructural entre lo que el usuario captura y lo que el Cronograma comunica.

### Conclusión de alto nivel

El Roadmap hoy da una falsa sensación de jerarquía temporal fuerte. La cadena formulario → validación básica → persistencia sí existe, pero la cadena completa hasta Cronograma y edición contextual está incompleta. El mayor problema no es decorativo: es semántico. El Cronograma sigue anclado a lógica previa de ventanas, agregaciones y marcadores, mientras el modelo ya evolucionó hacia rangos propios por entidad.

## 2. Alcance auditado

### Archivos revisados

- [src/dominio/modelos.ts](src/dominio/modelos.ts#L6)
- [src/compartido/validacion/esquemas.ts](src/compartido/validacion/esquemas.ts#L44)
- [src/compartido/utilidades/formatoPortal.ts](src/compartido/utilidades/formatoPortal.ts#L3)
- [src/infraestructura/repositorios/repositorioObjetivos.ts](src/infraestructura/repositorios/repositorioObjetivos.ts#L1)
- [src/infraestructura/repositorios/repositorioIniciativas.ts](src/infraestructura/repositorios/repositorioIniciativas.ts#L1)
- [src/infraestructura/repositorios/repositorioEntregas.ts](src/infraestructura/repositorios/repositorioEntregas.ts#L1)
- [src/aplicacion/casos-uso/objetivos.ts](src/aplicacion/casos-uso/objetivos.ts#L1)
- [src/aplicacion/casos-uso/iniciativas.ts](src/aplicacion/casos-uso/iniciativas.ts#L1)
- [src/aplicacion/casos-uso/entregas.ts](src/aplicacion/casos-uso/entregas.ts#L1)
- [src/aplicacion/casos-uso/lanzamientos.ts](src/aplicacion/casos-uso/lanzamientos.ts#L1)
- [src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx](src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx#L119)
- [src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L351)
- [src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L398)
- [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L92)
- [src/presentacion/paginas/roadmap/PaginaRoadmap.tsx](src/presentacion/paginas/roadmap/PaginaRoadmap.tsx#L1)
- [src/presentacion/paginas/roadmap/NavegacionRoadmap.tsx](src/presentacion/paginas/roadmap/NavegacionRoadmap.tsx#L1)
- [scripts/migracion_fase1_temporalidad_roadmap.sql](scripts/migracion_fase1_temporalidad_roadmap.sql#L1)
- [scripts/migracion_fase2a_rango_entregas.sql](scripts/migracion_fase2a_rango_entregas.sql#L1)

### Capas revisadas

- Dominio y tipos.
- Validación Zod.
- Persistencia y casos de uso CRUD.
- Formularios y modales de edición.
- Construcción visual del Cronograma.
- Tooltips.
- Navegación e interacción contextual.

### Límites de la auditoría

- Auditoría de solo lectura sobre código y scripts del repositorio.
- No se ejecutaron mutaciones ni pruebas contra una base de datos real.
- No se verificó comportamiento en un navegador con datos reales de producción.
- Las conclusiones sobre UX se sustentan en la estructura del componente y su semántica, no en una sesión visual grabada.

## 3. Regla jerárquica esperada vs estado real

### 3.1 Objetivo → Iniciativa

Regla esperada: la Iniciativa debe estar contenida temporalmente dentro del Objetivo.

Estado real: no hay evidencia de validación cruzada entre fechas de Objetivo e Iniciativa. Los esquemas solo validan coherencia interna inicio ≤ fin por entidad en [src/compartido/validacion/esquemas.ts](src/compartido/validacion/esquemas.ts#L44) y [src/compartido/validacion/esquemas.ts](src/compartido/validacion/esquemas.ts#L63).

Conclusión: no implementada.

### 3.2 Iniciativa → Entregable

Regla esperada: el Entregable debe estar contenido temporalmente dentro de la Iniciativa.

Estado real: tampoco hay validación cruzada entre fechas de Iniciativa y Entrega. El esquema de Entrega valida solo consistencia interna entre `fecha_inicio`, `fecha_fin` y `fecha_objetivo` en [src/compartido/validacion/esquemas.ts](src/compartido/validacion/esquemas.ts#L89).

Conclusión: no implementada.

### 3.3 Qué reglas existen hoy

- `fecha_inicio <= fecha_fin` para Objetivo.
- `fecha_inicio <= fecha_fin` para Iniciativa.
- `fecha_inicio <= fecha_fin` para Entrega.
- `fecha_objetivo >= fecha_inicio` y `fecha_objetivo <= fecha_fin` para Entrega.

### 3.4 Qué reglas faltan

- Contención de Iniciativa dentro del Objetivo.
- Contención de Entrega dentro de la Iniciativa.
- Contención fuerte a nivel SQL o dominio, no solo formulario.
- Resolución explícita de precedencia entre fechas nuevas y lógica histórica de ventanas.
- Definición semántica de qué representa exactamente cada barra por entidad.

## 4. Estado actual por entidad

### 4.1 Objetivos

#### Fechas disponibles

El modelo `Objetivo` ya expone `fecha_inicio` y `fecha_fin` en [src/dominio/modelos.ts](src/dominio/modelos.ts#L6).

#### Persistencia

- La migración agrega ambas columnas como `DATE NULL` en [scripts/migracion_fase1_temporalidad_roadmap.sql](scripts/migracion_fase1_temporalidad_roadmap.sql#L1).
- El repositorio hace `select('*')`, `insert(entrada)` y `update(entrada)` en [src/infraestructura/repositorios/repositorioObjetivos.ts](src/infraestructura/repositorios/repositorioObjetivos.ts#L5).
- El caso de uso no hace mapeos que descarten esas fechas en [src/aplicacion/casos-uso/objetivos.ts](src/aplicacion/casos-uso/objetivos.ts#L6).

Diagnóstico: la persistencia de las fechas nuevas de Objetivo sí está integrada.

#### Validación

`objetivoSchema` incluye ambas fechas y solo valida `inicio <= fin` en [src/compartido/validacion/esquemas.ts](src/compartido/validacion/esquemas.ts#L44).

Diagnóstico: validación interna presente, validación jerárquica ausente.

#### Uso en cronograma

No hay referencias a `objetivo.fecha_inicio` ni `objetivo.fecha_fin` en el Cronograma. La fila de objetivo se construye agregando segmentos de iniciativas y entregas en [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L975), y el tooltip incluso explicita `Rango derivado de hijos` en [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1606).

Diagnóstico: la nueva temporalidad de Objetivo no está integrada al Cronograma.

#### Evidencias

- Modelo: [src/dominio/modelos.ts](src/dominio/modelos.ts#L6)
- Validación: [src/compartido/validacion/esquemas.ts](src/compartido/validacion/esquemas.ts#L44)
- Formulario: [src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx](src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx#L358)
- Campos de fecha: [src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx](src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx#L442)
- Cronograma derivado por hijos: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L975)

### 4.2 Iniciativas

#### Fechas disponibles

El modelo `Iniciativa` ya expone `fecha_inicio` y `fecha_fin` en [src/dominio/modelos.ts](src/dominio/modelos.ts#L18).

#### Persistencia

- La migración agrega ambas columnas en [scripts/migracion_fase1_temporalidad_roadmap.sql](scripts/migracion_fase1_temporalidad_roadmap.sql#L1).
- El repositorio usa `select('*')`, `insert` y `update` sin eliminar esos campos en [src/infraestructura/repositorios/repositorioIniciativas.ts](src/infraestructura/repositorios/repositorioIniciativas.ts#L9).
- El caso de uso solo agrega `rice`, pero no elimina las fechas en [src/aplicacion/casos-uso/iniciativas.ts](src/aplicacion/casos-uso/iniciativas.ts#L10).

Diagnóstico: las fechas nuevas de Iniciativa sí se guardan y leen.

#### Validación

`iniciativaSchema` incluye ambas fechas y valida solo consistencia interna en [src/compartido/validacion/esquemas.ts](src/compartido/validacion/esquemas.ts#L63).

Diagnóstico: validación jerárquica ausente.

#### Uso en cronograma

El Cronograma no usa `iniciativa.fecha_inicio` ni `iniciativa.fecha_fin`. La visualización de iniciativa se calcula con `ventana_planificada_id` en [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L927) y además el filtro temporal de iniciativas también se resuelve por ventana y releases en [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L718).

Diagnóstico: el Cronograma sigue anclado a ventanas para iniciativas. Las fechas nuevas no están integradas visualmente.

#### Evidencias

- Modelo: [src/dominio/modelos.ts](src/dominio/modelos.ts#L18)
- Validación: [src/compartido/validacion/esquemas.ts](src/compartido/validacion/esquemas.ts#L63)
- Formulario: [src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L676)
- Campos de fecha: [src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L920)
- Cronograma por ventana: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L927)

### 4.3 Entregables

#### Fechas disponibles

El modelo `Entrega` incluye simultáneamente:

- `fecha_inicio`
- `fecha_fin`
- `fecha_objetivo`
- `fecha_completado`
- `ventana_planificada_id`
- `ventana_real_id`

Todo esto convive en [src/dominio/modelos.ts](src/dominio/modelos.ts#L38).

#### Persistencia

- La migración agrega `fecha_inicio` y `fecha_fin` en [scripts/migracion_fase2a_rango_entregas.sql](scripts/migracion_fase2a_rango_entregas.sql#L1).
- El repositorio de entregas persiste vía `select('*')`, `insert` y `update` en [src/infraestructura/repositorios/repositorioEntregas.ts](src/infraestructura/repositorios/repositorioEntregas.ts#L5).
- El caso de uso no hace mapeo destructivo en [src/aplicacion/casos-uso/entregas.ts](src/aplicacion/casos-uso/entregas.ts#L6).

Diagnóstico: las fechas nuevas de Entregable sí están integradas a la persistencia.

#### Validación

`entregaSchema` valida:

- `fecha_inicio <= fecha_fin`
- `fecha_objetivo >= fecha_inicio`
- `fecha_objetivo <= fecha_fin`

Evidencia en [src/compartido/validacion/esquemas.ts](src/compartido/validacion/esquemas.ts#L89).

Diagnóstico: la validación interna es más rica que en Objetivo/Iniciativa, pero sigue sin validar contención dentro de la Iniciativa.

#### Uso en cronograma

El Cronograma no usa `entrega.fecha_inicio` ni `entrega.fecha_fin`. La visualización de entrega se sigue armando con:

- barra plan: `ventana_planificada_id`
- barra real: `ventana_real_id`
- marcador objetivo: `fecha_objetivo`
- marcador completado: `fecha_completado`
- marcadores de release

Evidencia en [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L951).

Diagnóstico: el rango nuevo de Entregable existe pero no gobierna la visualización del Cronograma.

#### Evidencias

- Modelo híbrido: [src/dominio/modelos.ts](src/dominio/modelos.ts#L38)
- Validación: [src/compartido/validacion/esquemas.ts](src/compartido/validacion/esquemas.ts#L89)
- Formulario: [src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L802)
- Campos de fecha visibles: [src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L907)
- `fecha_completado` solo lectura en edición: [src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L935)
- Cronograma basado en ventanas y marcadores: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L951)

## 5. Auditoría del cronograma

### 5.1 Qué fuente de datos usa cada barra

#### Barra de Objetivo

Fuente real: agregación de segmentos de iniciativas y entregas hijas, no las fechas propias del Objetivo.

Evidencia: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L975).

#### Barra de Iniciativa

Fuente real: `ventana_planificada_id` de la Iniciativa.

Evidencia: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L927).

#### Barra de Entregable

Fuente real:

- segmento plan: `ventana_planificada_id`
- segmento real: `ventana_real_id`

Evidencia: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L951).

### 5.2 Qué representa cada barra realmente

- Objetivo: rango agregado del conjunto de hijos con señal visual de “cobertura temporal observada”, no de “compromiso explícito del objetivo”.
- Iniciativa: ventana planificada asociada, no rango propio capturado en formulario.
- Entregable: ventana planificada/real, no el rango nuevo `fecha_inicio` → `fecha_fin`.

### 5.3 Qué representa cada marcador realmente

- Entregable objetivo: `fecha_objetivo`.
- Entregable real: `fecha_completado`.
- Release programado: `fecha_programada`.
- Release ejecutado: `fecha_lanzamiento_real` o fallback a `fecha_programada` vía `fechaRelease`.

Evidencias:

- Marcadores de entrega: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L951)
- Estructura `ReleasePm`: [src/dominio/modelos.ts](src/dominio/modelos.ts#L607)

### 5.4 Qué lógica antigua sigue viva

- Ventanas planificadas y reales siguen siendo la base visual del Cronograma.
- Objetivos siguen representados por agregación de hijos.
- Entregables siguen dependiendo de `fecha_objetivo` y `fecha_completado` para los marcadores más prominentes.
- Releases siguen incrustados en la misma capa temporal del Cronograma del Roadmap.

Evidencia fuerte: no existen referencias a `objetivo.fecha_inicio`, `objetivo.fecha_fin`, `iniciativa.fecha_inicio`, `iniciativa.fecha_fin`, `entrega.fecha_inicio` ni `entrega.fecha_fin` dentro del archivo del Cronograma; sí existen múltiples referencias a ventanas, `fecha_objetivo` y `fecha_completado`.

### 5.5 Qué lógica nueva sí está integrada

- Los formularios capturan las nuevas fechas.
- Los esquemas Zod las aceptan y validan parcialmente.
- Los repositorios las leen y guardan.
- Las tablas/listados de Objetivos e Iniciativas muestran esos períodos.

Pero esa integración se corta antes del Cronograma.

### 5.6 Dónde hay mezcla confusa entre plan / real / objetivo / completado

La mezcla se concentra en Entregables:

- barra plan por ventana
- barra real por ventana
- marcador de fecha objetivo
- marcador de fecha completado
- marcadores de release

Esto superpone al menos cinco señales temporales distintas sobre una misma fila de Entrega. Técnicamente es rico; funcionalmente es ambiguo si no existe una convención corporativa muy explícita.

Adicionalmente, el Objetivo agrega segmentos de hijos de distinta semántica, lo que produce barras largas que no necesariamente representan el rango comprometido del Objetivo.

## 6. Auditoría de tooltips

### Contenido

Los tooltips muestran título, estado, rango o fecha y descripciones de segmento o marcador en [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1590) y [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1633).

### Fuente real de datos

- Tooltip de barra: se alimenta del mismo segmento que dibuja la barra.
- Tooltip de marcador: se alimenta del mismo marcador que dibuja el punto.
- Tooltip de fila: se alimenta de `fila.rangoFechas`, `fila.resumen` y `fila.detalle`, que en varios casos no son las fechas nuevas sino ventanas y agregaciones.

### Consistencia con la barra

La consistencia interna barra ↔ tooltip es razonable. El problema es semántico: ambos son coherentes entre sí, pero ambos pueden estar representando una fuente que ya no es la fuente de verdad esperada por el usuario.

Ejemplo crítico:

- En Objetivo, barra y tooltip son consistentes entre sí.
- Pero ambos describen un rango derivado de hijos, no el rango propio del Objetivo.

### Posicionamiento

`TooltipCronograma` usa posicionamiento `fixed` con coordenadas calculadas desde `getBoundingClientRect()` y un offset vertical fijo de `-10`, más `-translate-y-full`, en [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L92) y [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L150).

Problemas detectables por código:

- No hay lógica de colisión con bordes de viewport.
- No hay flip automático arriba/abajo.
- No hay corrección lateral si el tooltip queda pegado a extremos.
- No hay portal dedicado ni estrategia de clipping adaptativa.

### Problemas UX detectados

- El contenido es relativamente informativo, pero no resuelve la ambigüedad de fondo porque describe la semántica actual, no la esperada.
- El posicionamiento es frágil en bordes y en escenarios con scroll o elementos densos.
- El tooltip de fila y el tooltip de barra pueden redundar información sin resolver la pregunta central del usuario: “¿esto es plan propio, real, objetivo o agregado?”

Conclusión: los tooltips no están “rotos” a nivel básico, pero están incompletamente resueltos tanto en semántica como en robustez de posicionamiento.

## 7. Auditoría de interacción

### 7.1 Qué pasa hoy al hacer clic en objetivo

No hay evidencia de navegación ni edición contextual desde la fila o barra del Cronograma hacia edición de Objetivo. En el Cronograma solo hay clics de expansión/colapso de jerarquía en [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1491).

### 7.2 Qué pasa hoy al hacer clic en iniciativa

Mismo diagnóstico: no existe handler de edición contextual ni navegación a módulo de Iniciativas desde el Cronograma.

### 7.3 Qué pasa hoy al hacer clic en entregable

Mismo diagnóstico: no existe handler de edición contextual ni navegación a módulo de Entregas desde el Cronograma.

### 7.4 Si hay o no edición contextual reutilizando formularios existentes

No existe hoy.

Además, no hay evidencia de formularios reutilizables extraídos como componentes independientes. Cada página tiene su `ModalPortal` y su formulario inline:

- Objetivos: [src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx](src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx#L358)
- Iniciativas: [src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L676)
- Entregas: [src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L802)

Conclusión: la edición contextual no solo está ausente en el Cronograma; también falta una abstracción de formulario compartido que permita reutilización limpia.

### 7.5 Recomendación funcional correcta

Sí es coherente reutilizar el mismo formulario de edición desde el Cronograma, pero solo después de extraer los formularios a componentes reutilizables o centralizar la lógica de edición. Reusar la página completa o duplicar el formulario dentro del Cronograma aumentaría divergencia.

## 8. Hallazgos críticos

### P0 — El Cronograma no usa las fechas nuevas como fuente de verdad visual

Descripción:

Las fechas nuevas de Objetivo, Iniciativa y Entregable están presentes en modelo, validación básica, formulario y persistencia, pero el Cronograma no las usa para dibujar sus barras principales.

Evidencia:

- Objetivo deriva barra de hijos: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L975)
- Iniciativa usa ventana: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L927)
- Entrega usa ventanas y marcadores históricos: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L951)

Impacto funcional:

El usuario puede guardar un rango que luego el Cronograma ignora.

Impacto UX:

La interfaz comunica una temporalidad distinta a la capturada.

Impacto técnico:

El modelo y la vista tienen fuentes temporales divergentes.

Riesgo:

Decisiones ejecutivas basadas en barras semánticamente incorrectas.

### P0 — No existe contención temporal fuerte entre niveles jerárquicos

Descripción:

No hay evidencia de reglas que obliguen a que Iniciativa quede dentro del Objetivo ni Entrega dentro de la Iniciativa.

Evidencia:

- Objetivo schema: [src/compartido/validacion/esquemas.ts](src/compartido/validacion/esquemas.ts#L44)
- Iniciativa schema: [src/compartido/validacion/esquemas.ts](src/compartido/validacion/esquemas.ts#L63)
- Entrega schema: [src/compartido/validacion/esquemas.ts](src/compartido/validacion/esquemas.ts#L89)
- Migraciones SQL solo agregan columnas nullables, sin restricciones: [scripts/migracion_fase1_temporalidad_roadmap.sql](scripts/migracion_fase1_temporalidad_roadmap.sql#L1) y [scripts/migracion_fase2a_rango_entregas.sql](scripts/migracion_fase2a_rango_entregas.sql#L1)

Impacto funcional:

Puede existir inconsistencia temporal real sin bloqueo del sistema.

Impacto UX:

La jerarquía parece ordenada, pero no está garantizada.

Impacto técnico:

La integridad depende del comportamiento manual del usuario.

Riesgo:

Roadmap visualmente plausible pero lógicamente inválido.

### P1 — Objetivos siguen representados por agregación, no por compromiso propio

Descripción:

Aunque el Objetivo ya tiene rango propio, su barra sigue siendo un envelope de hijos.

Evidencia:

- Construcción agregada: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L975)
- Tooltip explicita “Rango derivado de hijos”: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1606)

Impacto funcional:

Un objetivo sin hijos o con hijos mal distribuidos no representa su propio rango real.

Impacto UX:

Las barras largas pueden inducir a creer que el objetivo dura más o menos de lo declarado.

Impacto técnico:

El cambio de modelo temporal quedó incompleto.

Riesgo:

Distorsión de lectura ejecutiva del portafolio.

### P1 — Entregables mezclan demasiadas capas temporales en una sola fila

Descripción:

En una misma fila conviven plan, real, objetivo, completado y releases.

Evidencia:

- Segmentos y marcadores en [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L951)

Impacto funcional:

Cuesta discernir qué constituye el compromiso principal del entregable.

Impacto UX:

Sobrecarga cognitiva y lectura poco inmediata.

Impacto técnico:

La semántica visual no está separada por capa conceptual.

Riesgo:

Usuarios interpretan como barra “real” lo que es ventana operativa, o como alcance del entregable lo que es solo una fecha objetivo.

### P1 — No existe edición contextual desde el Cronograma

Descripción:

No se puede editar Objetivos, Iniciativas o Entregas directamente desde donde se visualizan temporalmente.

Evidencia:

- Cronograma sin navegación/edición contextual; solo expansión: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1491)
- Formularios inline por página, no reutilizables: [src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx](src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx#L358), [src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L676), [src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L802)

Impacto funcional:

El usuario debe salir del contexto visual para corregir datos.

Impacto UX:

Flujo más lento y propenso a pérdida de contexto.

Impacto técnico:

El Cronograma está desacoplado de la edición operativa.

Riesgo:

Menor adopción del Cronograma como superficie real de trabajo.

### P2 — Tooltips con semántica parcial y posicionamiento frágil

Descripción:

Los tooltips informan, pero no resuelven la semántica de fondo y no tienen manejo robusto de bordes.

Evidencia:

- Implementación base: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L92)
- Posicionamiento fijo simple: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L150)

Impacto funcional:

Bajo-medio.

Impacto UX:

Incomodidad en bordes y persistencia de ambigüedad conceptual.

Impacto técnico:

Implementación artesanal sin manejo de colisiones.

Riesgo:

Baja confianza en una interfaz ya cargada de señales temporales.

## 9. Validación de hipótesis

| Hipótesis | Estado | Evidencia | Comentario |
| --- | --- | --- | --- |
| Las fechas nuevas de Objetivo ya están realmente integradas al cronograma | Refutada | El Objetivo tiene fechas en modelo/formulario/persistencia, pero el Cronograma construye su barra por agregación de hijos en [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L975) | Integración parcial, no end-to-end |
| Las fechas nuevas de Iniciativa ya están realmente integradas al cronograma | Refutada | La barra de Iniciativa usa `ventana_planificada_id` en [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L927) | La nueva fecha propia no gobierna la vista |
| Las fechas nuevas de Entregable ya están realmente integradas al cronograma | Refutada | La fila de Entrega usa ventanas, `fecha_objetivo`, `fecha_completado` y releases en [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L951) | `fecha_inicio/fecha_fin` no participan |
| El cronograma hoy sigue usando parcialmente lógica antigua | Confirmada | Referencias repetidas a ventanas, `fecha_objetivo`, `fecha_completado` y agregación de hijos | La lógica histórica sigue siendo dominante |
| La visualización actual mezcla demasiadas capas a la vez y por eso se vuelve confusa | Confirmada | Entregas combinan segmentos plan/real + marcadores objetivo/completado + releases | La densidad semántica es alta |
| Las barras largas actuales no siempre representan correctamente lo que el usuario espera | Confirmada | Objetivos se alargan por envelope de hijos, no por fechas propias | El problema es funcional, no estético |
| No existe aún una contención temporal fuerte entre Objetivo, Iniciativa y Entregable | Confirmada | No hay validación cruzada ni restricciones SQL visibles | La jerarquía temporal no está garantizada |
| Los tooltips actuales no están resueltos correctamente en contenido o posición | Parcial | Contenido razonable pero anclado a semántica antigua; posicionamiento sin colisiones | No están colapsados, pero sí incompletos |
| El flujo de edición contextual desde el cronograma no está resuelto o está incompleto | Confirmada | No hay handlers de edición contextual en el Cronograma | Actualmente está ausente |
| El cronograma necesita una separación más clara entre planificación y seguimiento real | Confirmada | Plan/real/objetivo/completado/release compiten en las mismas filas | La lectura ejecutiva pierde claridad |

## 10. Congruencia end-to-end

### Trazabilidad completa por cadena

#### Objetivo

- Formulario: sí.
- Validación: sí, básica.
- Persistencia: sí.
- Lectura: sí.
- Cronograma: no usa fechas nuevas.
- Tooltip: sí, pero basado en agregación.
- Edición posterior desde Cronograma: no.

Resultado: cadena rota entre persistencia y Cronograma.

#### Iniciativa

- Formulario: sí.
- Validación: sí, básica.
- Persistencia: sí.
- Lectura: sí.
- Cronograma: usa ventana, no fechas nuevas.
- Tooltip: consistente con ventana, no con fechas propias.
- Edición posterior desde Cronograma: no.

Resultado: cadena rota entre persistencia y Cronograma.

#### Entregable

- Formulario: sí.
- Validación: sí, mejor que otras entidades.
- Persistencia: sí.
- Lectura: sí.
- Cronograma: usa lógica histórica híbrida.
- Tooltip: consistente con la lógica híbrida, no con el rango nuevo.
- Edición posterior desde Cronograma: no.

Resultado: cadena rota por divergencia entre dato capturado y representación temporal.

### Respuesta explícita

La cadena end-to-end no está completa. Está completa hasta lectura/listado CRUD, pero se rompe en Cronograma y en interacción contextual.

## 11. Qué está faltando para que el cronograma se entienda

### Causas de confusión

- La fuente temporal principal no está unificada por entidad.
- El usuario captura un rango, pero ve otra cosa.
- Objetivos agregan hijos en vez de expresar su propio compromiso.
- Entregables condensan demasiadas señales en una sola fila.
- Releases compiten visualmente con señales núcleo del Roadmap.

### Causas de barras excesivamente largas

- La barra de Objetivo es un envelope del mínimo inicio y máximo fin de hijos visibles, no un rango propio.
- Si los hijos usan ventanas amplias o heterogéneas, el objetivo se extiende artificialmente.

### Causas de mezcla visual

- Plan y real conviven como segmentos.
- Objetivo y completado conviven como marcadores.
- Releases conviven en la misma capa operativa.
- La jerarquía no separa claramente planificación estructural de seguimiento operativo.

### Causas de baja legibilidad

- Exceso de señales por fila.
- Tooltips que explican piezas, pero no priorizan semántica.
- Falta de acción directa desde la visualización.

### Qué parte es problema de dato y qué parte es problema de UX

Problema de dato/integridad:

- No hay contención temporal fuerte entre niveles.
- El Cronograma no usa las nuevas fechas propias.

Problema de UX/semántica visual:

- Se mezclan demasiadas capas temporales.
- La visualización no deja claro qué señal es principal y cuál es secundaria.

## 12. Plan recomendado sin romper nada

### Fase 1 — Ajuste de integridad

- Definir fuente de verdad temporal por entidad.
- Acordar precedencia formal entre fechas propias y ventanas históricas.
- Incorporar validaciones jerárquicas en aplicación antes de tocar visualización.
- Verificar si la contención debe vivir solo en UI, en casos de uso, o también en SQL.

### Fase 2 — Ajuste de cronograma

- Hacer que Objetivo use sus fechas propias cuando existan.
- Hacer que Iniciativa use sus fechas propias cuando existan.
- Hacer que Entrega use su rango propio como barra principal si el modelo ya decidió eso.
- Mantener ventanas históricas solo como capa secundaria o auxiliar, no como semántica dominante si el nuevo modelo las reemplaza.

### Fase 3 — Ajuste de interacción

- Extraer formularios reutilizables por entidad.
- Habilitar edición contextual desde el Cronograma con el mismo formulario y las mismas validaciones.
- Evitar duplicar lógica de edición dentro del Cronograma.

### Fase 4 — Ajuste visual/UX

- Separar visualmente planificación vs ejecución real.
- Reducir la cantidad de señales simultáneas por fila.
- Refinar tooltips con semántica más explícita y posicionamiento robusto.
- Mantener releases como capa visible solo cuando aporten a la lectura ejecutiva, no como ruido permanente.

## 13. Recomendación final

### Qué está bien

- El modelo ya contempla las nuevas fechas.
- Los formularios las muestran y guardan.
- La persistencia CRUD visible no las descarta.
- La validación interna básica existe.

### Qué está mal

- El Cronograma no está alineado con las fechas nuevas.
- La jerarquía temporal no está garantizada.
- Objetivos se dibujan por agregación aunque ya tienen rango propio.
- Entregables mezclan demasiadas capas temporales.

### Qué está incompleto

- Integración end-to-end hasta la visualización.
- Edición contextual desde el Cronograma.
- Reutilización real de formularios.
- Resolución robusta de tooltips.

### Qué no debe tocarse todavía

- No conviene rediseñar visualmente el Cronograma antes de fijar la fuente de verdad temporal por entidad.
- No conviene duplicar formularios dentro del Cronograma para “resolver rápido” la edición contextual.

### Cuál es el siguiente paso correcto

Primero fijar semántica e integridad temporal. Después alinear la lógica del Cronograma con esa semántica. Recién luego conviene resolver edición contextual y refinamiento visual.

## 14. Anexo de evidencias

### Funciones y componentes relevantes

- Tooltip del Cronograma: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L92)
- Filtro temporal de iniciativas: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L718)
- Filtro temporal de entregas: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L750)
- Cálculo visual de iniciativas: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L927)
- Cálculo visual de entregas: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L951)
- Construcción de fila de objetivo: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L975)
- Expansión de jerarquía en Cronograma: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1491)

### Evidencias concretas por área

- Dominio Objetivo/Iniciativa/Entrega: [src/dominio/modelos.ts](src/dominio/modelos.ts#L6)
- Release como capa temporal adicional: [src/dominio/modelos.ts](src/dominio/modelos.ts#L607)
- Validación Zod por entidad: [src/compartido/validacion/esquemas.ts](src/compartido/validacion/esquemas.ts#L44)
- Normalización/formateo de fecha: [src/compartido/utilidades/formatoPortal.ts](src/compartido/utilidades/formatoPortal.ts#L3)
- Persistencia Objetivos: [src/infraestructura/repositorios/repositorioObjetivos.ts](src/infraestructura/repositorios/repositorioObjetivos.ts#L5)
- Persistencia Iniciativas: [src/infraestructura/repositorios/repositorioIniciativas.ts](src/infraestructura/repositorios/repositorioIniciativas.ts#L9)
- Persistencia Entregas: [src/infraestructura/repositorios/repositorioEntregas.ts](src/infraestructura/repositorios/repositorioEntregas.ts#L5)
- Formulario Objetivos: [src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx](src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx#L358)
- Formulario Iniciativas: [src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L676)
- Formulario Entregas: [src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L802)
- Migración de fechas nuevas en objetivos/iniciativas: [scripts/migracion_fase1_temporalidad_roadmap.sql](scripts/migracion_fase1_temporalidad_roadmap.sql#L1)
- Migración de fechas nuevas en entregas: [scripts/migracion_fase2a_rango_entregas.sql](scripts/migracion_fase2a_rango_entregas.sql#L1)

### Síntesis final de evidencia vs inferencia

Evidencia directa:

- Los campos nuevos existen en dominio, formularios, validación y repositorios.
- El Cronograma sigue consumiendo ventanas, `fecha_objetivo`, `fecha_completado`, releases y agregaciones.
- No hay edición contextual desde el Cronograma.

Inferencia razonable sustentada:

- La lectura ejecutiva actual del Cronograma es confusa no por color o estética, sino porque la semántica visual quedó desfasada respecto del modelo temporal actual.
- La ausencia de contención temporal fuerte permite inconsistencias jerárquicas aunque el CRUD funcione correctamente.