# AUDITORIA EXTREMA — HITOS, RELEASES Y CRONOGRAMA ROADMAP

## 1. Resumen ejecutivo

La revisión funcional y técnica del PM Portal confirma que hoy no existe una entidad explícita de `Hito`, `Milestone`, `Checkpoint` ni equivalente en el código fuente operativo de `apps/pm-portal/src`. La búsqueda en el código del portal no arroja modelos, repositorios, esquemas, páginas ni rutas dedicadas a ese concepto. El dominio real sí contiene una entidad explícita y madura de `Release`, implementada como `ReleasePm`, con módulo propio, CRUD, checklist de salida, seguimiento post-lanzamiento, relaciones opcionales con iniciativa, entrega y decisión, y persistencia dedicada en `pm_releases`, `pm_release_checklist_items` y `pm_release_seguimiento`.

La fuente más coherente para una futura línea visual de eventos puntuales orientada a liberaciones, go-live y salidas a producción es el módulo `Lanzamientos/Releases`, no una entidad de Hito inexistente. Si se exigiera que la futura banda saliera de una sola estructura existente, la recomendación es alimentarla desde `ReleasePm`, usando como fecha del evento `fecha_lanzamiento_real ?? fecha_programada`. El nombre funcional más fiel al dominio actual sería `Releases`. El nombre `Hitos` solo sería correcto como abstracción visual, no como reflejo literal del modelo actual.

El segundo hallazgo importante es que el Roadmap sí posee estructuras con fechas que pueden comportarse como checkpoints de producto, sobre todo `Entrega.fecha_objetivo`, pero esas fechas no constituyen una entidad propia ni representan necesariamente una liberación. Por eso, `Entrega.fecha_objetivo` sirve como complemento potencial para una futura abstracción visual de hitos, pero no sustituye semánticamente a `ReleasePm`.

El tercer hallazgo es que el cronograma actual no expone una capa visual propia de releases. `PaginaCronogramaRoadmap.tsx` carga releases, los incorpora al cálculo de años visibles y los cuenta por iniciativa, pero no renderiza una banda específica ni un botón dedicado. Además, la integración actual es parcial: el cronograma agrupa releases por `iniciativa_id`, pero no construye una agregación equivalente por `entrega_id`, a pesar de que `ReleasePm` permite vinculación directa a entrega sin iniciativa.

### Veredicto ejecutivo

- Entidad explícita de Hito: no existe.
- Entidad explícita de Release: sí existe y está madura.
- Fuente única más coherente para una futura línea de eventos de lanzamiento: `ReleasePm`.
- Fuente más amplia para una futura abstracción visual tipo `Hitos`: mezcla de `ReleasePm` + `Entrega.fecha_objetivo`, pero hoy esa mezcla no existe como modelo unificado.
- Riesgo principal: llamar `Hitos` a una línea alimentada solo por releases puede ser correcto a nivel UX, pero no describe literalmente el dominio actual.

## 2. Inventario de artefactos encontrados

### 2.1 Modelos y tipos del dominio

#### Roadmap

- `src/dominio/modelos.ts`
  - `Objetivo`: rango temporal opcional con `fecha_inicio` y `fecha_fin`.
  - `Iniciativa`: relación con `objetivo_id`, `ventana_planificada_id`, `etapa_id` y rango temporal opcional con `fecha_inicio` y `fecha_fin`.
  - `Entrega`: relación con `iniciativa_id`, `ventana_planificada_id`, `ventana_real_id`, rango opcional `fecha_inicio` / `fecha_fin`, fecha puntual `fecha_objetivo` y fecha real `fecha_completado`.
  - `CatalogoVentanaPm`: ventanas temporales con `fecha_inicio` y `fecha_fin`.

#### Lanzamientos

- `src/dominio/modelos.ts`
  - `ReleasePm`: entidad explícita de release.
  - `ReleaseChecklistItemPm`: checklist de salida por release.
  - `ReleaseSeguimientoPm`: seguimiento post-lanzamiento por release.

#### Otras estructuras con fecha puntual o deadline

- `src/dominio/modelos.ts`
  - `DecisionPm.fecha_decision`.
  - `BugPm.fecha_reporte` / `fecha_resolucion` y `release_id` opcional.
  - `DeudaTecnicaPm.fecha_objetivo` y `release_id` opcional.
  - `BloqueoPm.fecha_reporte` / `fecha_resolucion`, `release_id` y `decision_id` opcionales.
  - `LeccionAprendidaPm.fecha_leccion` y `release_id` opcional.
  - `RiesgoPm.fecha_objetivo`, `release_id`, `decision_id` opcionales.
  - `DependenciaPm.fecha_objetivo`, `release_id`, `decision_id` opcionales.
  - `KpiEjecutivoPm.fecha_corte` y `HealthScorePm.fecha_corte`.

### 2.2 Validaciones y DTOs

- `src/compartido/validacion/esquemas.ts`
  - `objetivoSchema`: valida `fecha_inicio <= fecha_fin`.
  - `iniciativaSchema`: valida `fecha_inicio <= fecha_fin`.
  - `entregaSchema`: valida `fecha_inicio <= fecha_fin`, `fecha_objetivo >= fecha_inicio` y `fecha_objetivo <= fecha_fin`.
  - `releaseSchema`: valida `fecha_lanzamiento_real >= fecha_programada`.
  - `checklistSalidaSchema`.
  - `seguimientoReleaseSchema`.
  - Varios esquemas operativos y de gobierno admiten `release_id` y/o `fecha_objetivo`.

### 2.3 Repositorios y persistencia

- `src/infraestructura/repositorios/repositorioObjetivos.ts`
  - CRUD sobre tabla `objetivos`.
- `src/infraestructura/repositorios/repositorioIniciativas.ts`
  - CRUD sobre tabla `iniciativas`.
- `src/infraestructura/repositorios/repositorioEntregas.ts`
  - CRUD sobre tabla `entregas`.
- `src/infraestructura/repositorios/repositorioLanzamientos.ts`
  - CRUD sobre `pm_releases`.
  - Sincronización por lote sobre `pm_release_checklist_items`.
  - CRUD sobre `pm_release_seguimiento`.

### 2.4 Casos de uso

- `src/aplicacion/casos-uso/objetivos.ts`
  - `listarObjetivos`, `crearObjetivo`, `editarObjetivo`, `eliminarObjetivo`.
- `src/aplicacion/casos-uso/iniciativas.ts`
  - `listarIniciativas`, `crearIniciativa`, `editarIniciativa`, `eliminarIniciativa`.
  - Calcula RICE y valida contención temporal contra el objetivo padre.
- `src/aplicacion/casos-uso/entregas.ts`
  - `listarEntregas`, `crearEntrega`, `editarEntrega`, `eliminarEntrega`.
  - Valida contención temporal contra la iniciativa padre.
- `src/aplicacion/casos-uso/lanzamientos.ts`
  - `listarReleases`, `crearRelease`, `editarRelease`, `eliminarRelease`.
  - `listarChecklistSalida`, `reordenarChecklistSalida`.
  - `listarSeguimientosRelease`, `crearSeguimientoRelease`, `editarSeguimientoRelease`, `eliminarSeguimientoRelease`.
  - Registra historial de cambios para releases, checklist y seguimiento.

### 2.5 Reglas de negocio de contención temporal

- `src/aplicacion/validaciones/contencionJerarquicaRoadmap.ts`
  - `asegurarIniciativaDentroDeObjetivo`.
  - `asegurarEntregaDentroDeIniciativa`.

### 2.6 UI, páginas y navegación

#### Roadmap

- `src/presentacion/paginas/roadmap/NavegacionRoadmap.tsx`
  - Solo expone `Resumen`, `Cronograma`, `Objetivos`, `Iniciativas`, `Entregas`.
- `src/presentacion/paginas/roadmap/PaginaRoadmap.tsx`
  - Consume releases relacionados por iniciativa o entrega para resumen agregado del roadmap.
- `src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx`
  - Carga `listarObjetivos`, `listarIniciativas`, `listarEntregas`, `listarReleases`, `listarVentanasPm`, `listarEtapasPm`.
  - Renderiza filas de `objetivo`, `iniciativa`, `entrega`.
  - No crea una capa visual explícita de releases ni un botón `Hitos` o `Releases`.
- `src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx`
  - CRUD de objetivos.
- `src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx`
  - CRUD de iniciativas.
- `src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx`
  - CRUD de entregas y lectura de señales operativas y de releases por entrega.
- `src/presentacion/paginas/roadmap/componentes/GestorModalObjetivoRoadmap.tsx`
- `src/presentacion/paginas/roadmap/componentes/ModalObjetivoRoadmap.tsx`
- `src/presentacion/paginas/roadmap/componentes/GestorModalIniciativaRoadmap.tsx`
- `src/presentacion/paginas/roadmap/componentes/ModalIniciativaRoadmap.tsx`
- `src/presentacion/paginas/roadmap/componentes/GestorModalEntregaRoadmap.tsx`
- `src/presentacion/paginas/roadmap/componentes/ModalEntregaRoadmap.tsx`

#### Lanzamientos

- `src/presentacion/paginas/lanzamientos/NavegacionLanzamientos.tsx`
  - Expone `Resumen de lanzamientos`, `Releases`, `Seguimiento post-lanzamiento`.
- `src/presentacion/paginas/lanzamientos/PaginaResumenLanzamientos.tsx`
  - Resumen ejecutivo de releases próximos, recientes, checklist incompleto, rollback y gobierno ligado a release.
- `src/presentacion/paginas/lanzamientos/releases/PaginaReleases.tsx`
  - CRUD completo de releases y checklist.
- `src/presentacion/paginas/lanzamientos/releases/GestionChecklistSalida.tsx`
  - Gestión del checklist dentro del flujo de release.
- `src/presentacion/paginas/lanzamientos/seguimiento/PaginaSeguimientoLanzamientos.tsx`
  - CRUD de seguimiento post-lanzamiento.

#### Rutas y menú principal

- `src/aplicacion/enrutador/enrutador.tsx`
  - Rutas separadas para `roadmap/*` y `lanzamientos/*`.
- `src/presentacion/navegacion/menuPortal.ts`
  - `Roadmap` y `Lanzamientos` aparecen como módulos distintos.

### 2.7 Evidencia de base de datos

- `docs/sql_fase_4_lanzamientos_supabase.md`
  - Define `pm_releases`, `pm_release_checklist_items`, `pm_release_seguimiento`.
  - `pm_releases.fecha_programada` es obligatoria.
  - `pm_releases.fecha_lanzamiento_real` es opcional.
  - `iniciativa_id`, `entrega_id` y `decision_id` son relaciones opcionales.
- `scripts/migracion_fase1_temporalidad_roadmap.sql`
  - Agrega `fecha_inicio` y `fecha_fin` a `objetivos` e `iniciativas`.
- `scripts/migracion_fase2a_rango_entregas.sql`
  - Agrega `fecha_inicio` y `fecha_fin` a `entregas`.

## 3. Hitos: estado actual real

### 3.1 ¿Existe hoy una entidad explícita de Hito?

No.

La auditoría no encontró en `apps/pm-portal/src` ninguna entidad explícita llamada `Hito`, `Milestone`, `Checkpoint`, `GoLive` o equivalente. No existen:

- modelo de dominio dedicado,
- repositorio dedicado,
- esquema Zod dedicado,
- caso de uso dedicado,
- tabla propia,
- página CRUD dedicada,
- navegación o rutas dedicadas.

La búsqueda en el código fuente del portal para términos como `hito`, `hitos`, `milestone`, `milestones`, `checkpoint`, `go-live` y `golive` no devolvió resultados operativos.

### 3.2 ¿Qué estructuras cumplen parcialmente ese papel?

#### A. `Entrega.fecha_objetivo`

Es la estructura más cercana a un checkpoint de roadmap.

Evidencia:

- `src/dominio/modelos.ts`: `Entrega` tiene `fecha_objetivo` y `fecha_completado`.
- `src/compartido/validacion/esquemas.ts`: `entregaSchema` valida coherencia entre `fecha_inicio`, `fecha_fin` y `fecha_objetivo`.
- `src/presentacion/paginas/roadmap/componentes/ModalEntregaRoadmap.tsx`: el formulario captura `fecha_objetivo`.
- `src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx`: la UI lista, filtra y exporta `fecha_objetivo`.
- `src/presentacion/paginas/roadmap/PaginaRoadmap.tsx`: construye `proximasEntregas` ordenando por `fecha_objetivo`.

Limitaciones reales:

- no es una entidad independiente;
- no tiene checklist ni ciclo de vida de lanzamiento;
- representa una fecha objetivo del entregable, no necesariamente una liberación;
- la relación con release es indirecta: el release referencia a la entrega, no al revés.

#### B. `DecisionPm.fecha_decision`

Es una fecha puntual explícita, pero pertenece a gobierno/decisiones, no al roadmap temporal ejecutivo.

Evidencia:

- `src/dominio/modelos.ts`: `DecisionPm.fecha_decision`.
- `src/presentacion/paginas/decisiones/PaginaDecisiones.tsx`: CRUD, filtros y exportación por `fecha_decision`.
- `PaginaDecisiones.tsx` también cuenta releases relacionados por `decision_id`.

Limitaciones reales:

- representa una decisión, no una entrega o liberación;
- no está integrada al cronograma del roadmap.

#### C. Fechas objetivo en gobierno y operación

Existen deadlines y fechas puntuales en otros módulos:

- `RiesgoPm.fecha_objetivo`.
- `DependenciaPm.fecha_objetivo`.
- `DeudaTecnicaPm.fecha_objetivo`.
- `KpiEjecutivoPm.fecha_corte`.
- `HealthScorePm.fecha_corte`.

Estas fechas sirven para seguimiento operativo o ejecutivo, pero no constituyen una fuente coherente para una banda de hitos del cronograma roadmap.

### 3.3 CRUD y cobertura real de Hitos

No existe CRUD de Hitos porque no existe la entidad.

Lo que sí existe es CRUD de entidades que pueden aportar fechas con comportamiento parecido a hitos:

- `Objetivo`: CRUD completo, pero trabaja con rango.
- `Iniciativa`: CRUD completo, pero trabaja con rango.
- `Entrega`: CRUD completo y fecha objetivo puntual.
- `DecisionPm`: CRUD completo y fecha puntual.

### 3.4 Relación con objetivo, iniciativa, entrega o release

Al no existir una entidad `Hito`, no existe relación formal Hito-Objetivo, Hito-Iniciativa, Hito-Entrega ni Hito-Release.

La relación que hoy existe en el dominio real es la siguiente:

- `Entrega` pertenece opcionalmente a una `Iniciativa`.
- `Iniciativa` pertenece opcionalmente a un `Objetivo`.
- `ReleasePm` puede referenciar `iniciativa_id` y/o `entrega_id`.
- `ReleasePm` también puede referenciar `decision_id`.

## 4. Releases: estado actual real

### 4.1 ¿Existe hoy una entidad explícita de Release?

Sí.

La entidad vive en:

- Modelo de dominio: `src/dominio/modelos.ts` (`ReleasePm`).
- Validación: `src/compartido/validacion/esquemas.ts` (`releaseSchema`).
- Repositorio: `src/infraestructura/repositorios/repositorioLanzamientos.ts`.
- Casos de uso: `src/aplicacion/casos-uso/lanzamientos.ts`.
- UI: `src/presentacion/paginas/lanzamientos/releases/PaginaReleases.tsx`.
- Resumen: `src/presentacion/paginas/lanzamientos/PaginaResumenLanzamientos.tsx`.
- Seguimiento: `src/presentacion/paginas/lanzamientos/seguimiento/PaginaSeguimientoLanzamientos.tsx`.
- Persistencia documentada: `docs/sql_fase_4_lanzamientos_supabase.md`.

### 4.2 Campos reales de `ReleasePm`

Según `src/dominio/modelos.ts`, `ReleasePm` tiene los siguientes campos:

- `id`
- `codigo`
- `nombre`
- `descripcion`
- `tipo_release`
- `estado`
- `fecha_programada`
- `fecha_lanzamiento_real`
- `iniciativa_id`
- `entrega_id`
- `owner`
- `responsable_aprobacion`
- `decision_id`
- `rollback_preparado`
- `rollback_descripcion`
- `rollback_responsable`
- `comunicacion_requerida`
- `comunicacion_descripcion`
- `audiencia_objetivo`
- `notas`
- `created_at`
- `updated_at`

No es un simple punto en el tiempo. Es un registro operacional y de gobierno alrededor de una salida.

### 4.3 Semántica real actual

Dentro de este sistema, `ReleasePm` representa una liberación gestionada, no solo una marca temporal. La semántica real incluye:

- planeación de salida (`fecha_programada`),
- eventual ejecución real (`fecha_lanzamiento_real`),
- estado de ciclo de vida (`borrador`, `planificado`, `listo_para_salida`, `lanzado`, `revertido`, `cerrado`),
- preparación operativa (`rollback_*`, `comunicacion_*`),
- checklist de salida,
- seguimiento post-lanzamiento,
- vínculos opcionales con iniciativa, entrega y decisión,
- trazabilidad hacia bugs, deuda, bloqueos, lecciones, riesgos y dependencias mediante `release_id` en otros módulos.

### 4.4 ¿Es punto en el tiempo o registro más amplio?

Es ambas cosas, pero en capas distintas.

- Como registro de dominio: es amplio.
- Como insumo temporal: sí contiene un evento puntual usable, basado en `fecha_lanzamiento_real ?? fecha_programada`.

Esto se ve en el cronograma, donde la función `fechaRelease` calcula precisamente esa fecha efectiva, y también en analítica/portafolio donde se usa `fecha_lanzamiento_real ?? fecha_programada` para ordenar o agrupar.

### 4.5 ¿Tiene fecha única? ¿Tiene fecha planificada y fecha real?

Sí.

- `fecha_programada`: obligatoria.
- `fecha_lanzamiento_real`: opcional.

Validaciones reales:

- `releaseSchema` exige `fecha_programada`.
- `releaseSchema` solo valida que `fecha_lanzamiento_real` no sea menor que `fecha_programada`.
- `docs/sql_fase_4_lanzamientos_supabase.md` replica la misma restricción a nivel SQL.

### 4.6 ¿Tiene estado?

Sí. `ReleasePm.estado` usa:

- `borrador`
- `planificado`
- `listo_para_salida`
- `lanzado`
- `revertido`
- `cerrado`

### 4.7 ¿Tiene relación con roadmap?

Sí, pero no directa con objetivo.

Relaciones reales:

- `iniciativa_id` opcional.
- `entrega_id` opcional.
- `decision_id` opcional.

No existe `objetivo_id` en `ReleasePm`.

Por lo tanto, la relación con objetivo es derivada, no nativa:

- release -> iniciativa -> objetivo, o
- release -> entrega -> iniciativa -> objetivo.

### 4.8 ¿Tiene UI CRUD?

Sí.

#### CRUD principal

- `src/presentacion/paginas/lanzamientos/releases/PaginaReleases.tsx`
  - Carga `listarReleases`, `listarChecklistSalida`, `listarIniciativas`, `listarEntregas`, `listarDecisionesPm`.
  - Permite `crear`, `editar`, `ver`, `eliminar`.
  - Tiene filtros por búsqueda, tipo, estado, owner, iniciativa, entrega, decisión y rango de fechas.
  - Exporta CSV.
  - El modal captura todos los campos clave del release, incluyendo relaciones, rollback, comunicación y checklist.

#### Seguimiento post-lanzamiento

- `src/presentacion/paginas/lanzamientos/seguimiento/PaginaSeguimientoLanzamientos.tsx`
  - CRUD separado para `ReleaseSeguimientoPm`.
  - Filtra por release, estado de estabilización, owner y fechas.

#### Resumen ejecutivo

- `src/presentacion/paginas/lanzamientos/PaginaResumenLanzamientos.tsx`
  - Muestra releases próximos, recientes, checklist incompleto, rollback preparado, riesgos y dependencias ligados a releases.

### 4.9 Persistencia backend / adapter / repositorio

Sí.

- `repositorioLanzamientos.listarReleases()` consulta `pm_releases` y ordena por `fecha_programada DESC` y `updated_at DESC`.
- `crearRelease`, `editarRelease`, `eliminarRelease` operan sobre `pm_releases`.
- `sincronizarChecklistSalida` opera sobre `pm_release_checklist_items`.
- `listarSeguimientos`, `crearSeguimiento`, `editarSeguimiento`, `eliminarSeguimiento` operan sobre `pm_release_seguimiento`.

## 5. Comparación funcional: Hito vs Release dentro de este sistema

### 5.1 Diferencia real principal

La diferencia principal es que `Release` sí existe y `Hito` no.

No hay dos conceptos implementados y mal delimitados entre sí. Lo que existe hoy es:

- un concepto explícito y persistido de release,
- varias entidades con fechas puntuales o deadlines,
- ninguna entidad formal de hito.

### 5.2 Qué ocupa hoy el lugar funcional de un hito

Hay dos sustitutos parciales, pero con semánticas distintas:

#### `ReleasePm`

Actúa como hito de liberación.

- Tiene fecha puntual.
- Tiene estado.
- Tiene relación opcional con iniciativa y entrega.
- Tiene UI, repositorio y persistencia dedicadas.
- Tiene semántica de salida real a producto.

#### `Entrega.fecha_objetivo`

Actúa como hito de cumplimiento de roadmap.

- Tiene fecha puntual.
- Vive dentro de la entidad Entrega.
- Tiene CRUD indirecto vía la entrega.
- No tiene ciclo de vida de lanzamiento.
- No equivale a go-live.

### 5.3 Similitudes reales

`ReleasePm` y `Entrega.fecha_objetivo` comparten lo siguiente:

- ambas pueden representar un evento puntual en el tiempo,
- ambas tienen relación con la jerarquía roadmap,
- ambas ya tienen captura y visualización en UI,
- ambas pueden alimentar una banda visual de fechas clave.

### 5.4 Solapamientos reales

Existe solapamiento conceptual cuando una entrega tiene `fecha_objetivo` y además existe un release asociado a esa misma entrega.

En ese caso, el sistema ya puede tener dos fechas relevantes diferentes:

- la fecha objetivo del entregable,
- la fecha planificada o real del release.

Eso significa que una futura banda visual no debería mezclar ambas sin tipificación, porque una representa compromiso de delivery y la otra representa liberación.

### 5.5 Incoherencias actuales

#### A. El cronograma consume releases, pero no los visualiza como capa propia

`PaginaCronogramaRoadmap.tsx`:

- importa `listarReleases`,
- carga releases en `Promise.all`,
- calcula `fechaRelease(release.fecha_lanzamiento_real ?? release.fecha_programada)`,
- agrega releases a `aniosDisponibles`,
- construye `releasesPorIniciativa`,
- usa esos datos para contar releases en detalles de filas.

Pero no renderiza una capa visual específica de releases ni un botón dedicado para activarla.

#### B. El cronograma agrupa releases solo por iniciativa

`PaginaCronogramaRoadmap.tsx` construye `releasesPorIniciativa`, pero no una estructura equivalente por `entrega_id`.

Esto es relevante porque `ReleasePm` admite:

- `iniciativa_id = null`,
- `entrega_id != null`.

Por tanto, un release vinculado solo a entrega puede existir legítimamente, pero quedar fuera de la agregación principal usada por el cronograma.

#### C. El Roadmap principal y Entregas sí consumen release por iniciativa o por entrega

- `PaginaRoadmap.tsx` calcula `resumenReleasesRoadmap` filtrando releases relacionados por iniciativa o entrega.
- `PaginaEntregasRoadmap.tsx` calcula `releasesPorEntrega` y `estadoReleaseRecientePorEntrega`.

Esto confirma que la semántica real de relación con roadmap es más amplia que la que hoy usa `PaginaCronogramaRoadmap.tsx`.

#### D. Estado y fecha real de release no están completamente acoplados

El sistema valida `fecha_lanzamiento_real >= fecha_programada`, pero no obliga a que:

- `estado = lanzado` implique `fecha_lanzamiento_real` informada,
- `estado = cerrado` implique consistencia temporal adicional.

Por lo tanto, la línea visual de releases tendría que asumir que el estado no siempre garantiza completitud temporal perfecta.

## 6. Qué entidad sería la fuente correcta para una futura línea visual en Cronograma

### 6.1 Si se debe escoger una sola fuente existente hoy

La fuente correcta es `ReleasePm`.

Razones:

- es la única entidad explícita de evento/lanzamiento;
- ya tiene una fecha puntual usable;
- ya tiene estado propio;
- ya tiene CRUD completo;
- ya tiene persistencia dedicada;
- ya está vinculada al roadmap por iniciativa y/o entrega;
- ya es consumida por roadmap, lanzamientos, operación, gobierno y analítica.

En otras palabras: si la futura banda quiere representar `liberaciones`, `go-live`, `salidas a producción` y eventos equivalentes, el sistema ya tiene un módulo preparado para eso y se llama `Releases`.

### 6.2 Si la intención fuera una línea más amplia de fechas clave del roadmap

Hoy no existe una sola fuente suficientemente coherente.

La alternativa más sensata sería una abstracción visual de solo lectura compuesta por:

- `ReleasePm` para eventos de liberación.
- `Entrega.fecha_objetivo` para checkpoints de delivery.

Esa mezcla no existe hoy como modelo unificado. Sería una composición visual, no una entidad del dominio.

### 6.3 Evaluación de candidatos

#### `Hitos`

No puede ser la fuente porque no existe.

#### `Releases`

Sí puede ser la fuente y es la opción más consistente si la banda se orienta a liberaciones.

#### `Entregas`

Puede aportar fechas objetivo, pero no reemplaza a releases si lo que se quiere es una lectura de lanzamientos o go-live.

#### `Decisiones`

Tiene fecha puntual y relaciones útiles, pero pertenece a gobierno. No es la fuente más coherente para cronograma roadmap salvo que se quiera una vista ejecutiva de decisiones, que es otra semántica.

#### `Riesgos`, `Dependencias`, `Deuda`

Son deadlines de gestión, no hitos de roadmap/lanzamiento.

### 6.4 Recomendación de naming

Con el dominio actual, si la fuente es solo `ReleasePm`, el naming más honesto es `Releases`.

`Hitos` solo sería un nombre válido si la UI se define explícitamente como una abstracción transversal que mezcla varios tipos de evento. Hoy esa abstracción no existe.

## 7. Riesgos y restricciones

### 7.1 No existe entidad Hito

No se puede implementar una banda `Hitos` pretendiendo que ya hay una fuente persistida de ese nombre. Habría que construirla como derivación visual o crear dominio nuevo.

### 7.2 `ReleasePm` no se relaciona directamente con objetivo

No hay `objetivo_id` en el release. Cualquier lectura por objetivo debe inferirse por la cadena iniciativa/entrega.

### 7.3 El cronograma actual no expone releases como capa visual

Hoy no existe:

- botón específico,
- leyenda específica,
- exportación específica,
- fila específica,
- renderizado puntual específico para releases.

La futura línea no puede asumirse como simple activación de algo ya construido visualmente.

### 7.4 La integración actual del cronograma con releases es incompleta

`PaginaCronogramaRoadmap.tsx` agrega releases por `iniciativa_id`, pero no por `entrega_id`. Si la futura línea se construye reaprovechando esa lógica sin corregirla, puede omitir releases válidos vinculados solo a entrega.

### 7.5 `Entrega.fecha_objetivo` y `ReleasePm` pueden duplicar narrativa temporal

Una misma entrega puede tener:

- fecha objetivo del entregable,
- release planificado,
- release real.

Si se muestran juntas sin distinguir tipo y origen, la línea visual puede resultar engañosa.

### 7.6 Release es más rico que un simple hito

`ReleasePm` incluye checklist, rollback, comunicación y seguimiento. Reducirlo a un punto visual sin acceso a contexto podría ocultar semántica importante.

### 7.7 El estado no obliga consistencia completa con fecha real

El sistema no exige que todo release `lanzado` tenga `fecha_lanzamiento_real`. Para una línea temporal esto implica decidir si la fecha visual debe priorizar:

- fecha real cuando exista,
- fecha programada en fallback,
- o una distinción visual entre plan y real.

### 7.8 Frontend y backend del roadmap y lanzamientos están separados por módulos

`Roadmap` y `Lanzamientos` son módulos distintos en rutas, navegación y páginas. Una futura banda de releases dentro del cronograma tendría que respetar esa separación y decidir si solo consume datos o también habilita navegación contextual al módulo de releases.

## 8. Recomendación final

### 8.1 Recomendación principal

Con el estado actual real del sistema, la futura línea no debería alimentarse de una entidad `Hito`, porque esa entidad no existe. Si se desea una banda de eventos temporales clave orientada a liberaciones, go-live y salidas a producción, la fuente correcta es `ReleasePm` del módulo `Lanzamientos`.

### 8.2 Recomendación de nombre

Si la implementación inicial va a usar una sola fuente existente, la recomendación es que la línea se llame `Releases`.

Llamarla `Hitos` en esta etapa sería más una decisión de UX que una descripción fiel del dominio. Puede hacerse, pero solo si se asume explícitamente que `Hitos` es una vista derivada y no una entidad real del sistema.

### 8.3 Recomendación de segunda etapa

Si Product quiere una banda más amplia y ejecutiva, con eventos clave de roadmap más allá de liberaciones, entonces no conviene inventar todavía una nueva entidad persistida. Lo coherente sería crear primero una abstracción visual de solo lectura que tipifique al menos:

- `release` -> desde `ReleasePm.fecha_lanzamiento_real ?? fecha_programada`
- `entrega_objetivo` -> desde `Entrega.fecha_objetivo`

Con badge o tooltip que identifique el tipo. Esa opción evita duplicar persistencia y respeta el modelo actual.

### 8.4 Qué corresponde hacer después de esta auditoría

La secuencia recomendada es la siguiente:

1. Decidir semánticamente si la futura banda representará solo liberaciones o un mix de eventos clave.
2. Si representará solo liberaciones, usar `ReleasePm` como fuente y nombrar la capa `Releases`.
3. Si representará eventos clave mixtos, definir una abstracción visual tipada antes de diseñar la UI, sin crear todavía una nueva entidad persistida.
4. Antes de implementar en cronograma, corregir la integración parcial actual para no perder releases vinculados solo por `entrega_id`.

## Conclusión cerrada

El sistema actual no tiene `Hitos` como entidad. El sistema sí tiene `Releases` como entidad explícita, con módulo completo, semántica temporal clara y relaciones suficientes para alimentar una futura banda de eventos de lanzamiento. Por ello, si la nueva capa debe salir de una sola fuente existente, la decisión correcta es usar `Releases`. Si la intención es más amplia que lanzamientos, entonces hoy todavía no existe una fuente única suficientemente coherente y conviene resolverlo como abstracción visual de lectura, no como duplicación del dominio.