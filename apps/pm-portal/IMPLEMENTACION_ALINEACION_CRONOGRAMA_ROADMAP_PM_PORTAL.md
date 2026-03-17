# IMPLEMENTACIÓN — ALINEACIÓN DEL CRONOGRAMA ROADMAP CON FECHAS PROPIAS

## 1. Resumen ejecutivo

Se alineó la fuente temporal principal del Cronograma para que las barras horizontales principales usen las fechas propias de cada entidad cuando existen:

- Objetivos: `fecha_inicio` / `fecha_fin`
- Iniciativas: `fecha_inicio` / `fecha_fin`
- Entregables: `fecha_inicio` / `fecha_fin`

No se tocaron estados, badges, lógica de estado, CRUD, formularios ni la semántica de releases. Las ventanas y señales históricas se conservaron como compatibilidad y capa secundaria, no como fuente dominante de planificación.

La fuente temporal principal ya cambió por entidad, con fallback prudente cuando faltan fechas propias:

- Objetivo: fallback a agregado de hijos solo si no tiene rango propio.
- Iniciativa: fallback a `ventana_planificada_id` solo si no tiene rango propio.
- Entregable: fallback a `ventana_planificada_id` para la barra principal solo si no tiene rango propio; `ventana_real_id` queda como capa real secundaria.

Riesgos detectados:

- Sigue existiendo deuda funcional en integridad jerárquica fuerte entre niveles; esta fase no la endurece para no romper flujos existentes.
- El build mantiene una advertencia preexistente de chunk grande de Vite, pero no introduce error de compilación.
- No se implementó edición contextual desde el Cronograma en esta fase para evitar duplicación de formularios o una abstracción incompleta.

## 2. Archivos modificados

| Archivo | Motivo | Tipo de cambio |
| --- | --- | --- |
| `src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx` | Alinear barras, tooltips, filtros temporales y fallback por entidad | Refactor funcional focalizado |
| `IMPLEMENTACION_ALINEACION_CRONOGRAMA_ROADMAP_PM_PORTAL.md` | Documentar la implementación y las verificaciones | Documentación |

## 3. Cambios de fuente de verdad temporal

### Objetivos

Antes:

- La barra principal se construía como envelope de iniciativas y entregables hijos.

Ahora:

- La barra principal usa `fecha_inicio` / `fecha_fin` del objetivo cuando ambas existen.

Fallback:

- Si el objetivo no tiene rango propio, se conserva el agregado de hijos como compatibilidad.
- El tooltip ahora distingue si el rango es propio o derivado.

### Iniciativas

Antes:

- La barra principal dependía de `ventana_planificada_id`.

Ahora:

- La barra principal usa `fecha_inicio` / `fecha_fin` de la iniciativa cuando ambas existen.

Fallback:

- Si faltan fechas propias, se usa la ventana planificada histórica como respaldo.
- La ventana deja de ser la semántica dominante si ya existe rango propio.

### Entregables

Antes:

- La barra principal dependía de ventanas planificadas y reales, mientras `fecha_objetivo` y `fecha_completado` actuaban como marcadores.

Ahora:

- La barra principal usa `fecha_inicio` / `fecha_fin` del entregable cuando ambas existen.

Cómo conviven señales secundarias:

- `fecha_objetivo` se mantiene como marcador.
- `fecha_completado` se mantiene como marcador.
- `ventana_real_id` se mantiene como segmento secundario real.
- `ventana_planificada_id` solo queda como fallback de planificación si faltan fechas propias.
- Los releases se mantienen como marcadores de compatibilidad visual.

## 4. Cambios en cronograma

### Construcción de barras

- Se añadió precedencia temporal explícita por entidad.
- Se incorporó metadata de origen temporal por segmento para distinguir `plan_propio`, `fallback_ventana_plan`, `fallback_agregado_hijos` e `historico_real`.
- Se evitó que la barra principal siga comunicando la lógica anterior cuando ya existe rango propio.

### Construcción de marcadores

- Se conservaron marcadores de `fecha_objetivo`, `fecha_completado` y releases.
- No se cambió la lógica de estados ni la semántica de los marcadores existentes.

### Filtros

- La visibilidad temporal del Cronograma ya no depende solo de ventanas.
- Iniciativas y Entregables ahora entran al rango visible por sus fechas propias cuando existen.
- El filtro de ventana se preserva como filtro funcional explícito, no como fuente principal del rango.
- Se amplió la recolección de años disponibles para incluir fechas propias de Objetivos, Iniciativas y Entregables.

### Filas

- Las filas ahora incluyen `contextoTemporal` para explicar si el rango mostrado es propio o fallback.
- Objetivos pueden quedar visibles por su propio rango aunque no dependan únicamente de hijos visibles en el período.

### Jerarquía

- Se preservó la jerarquía expandida actual.
- No se alteró la lógica de expansión/colapso.
- No se tocó la lógica de estados por fila.

## 5. Cambios en tooltips

### Qué se corrigió

- El tooltip de barra ahora se alinea con la semántica real del segmento dibujado.
- El tooltip de fila ahora muestra el contexto temporal principal cuando existe.
- Se eliminó el mensaje duro que seguía tratando al objetivo como “rango derivado de hijos” incluso cuando ya tenía rango propio.

### Cómo se mejoró el posicionamiento

- Se agregó medición del tooltip abierto.
- Se añadió clamp horizontal para evitar que quede pegado a bordes del viewport.
- Se añadió lógica simple de flip vertical para mostrarlo debajo cuando no hay espacio arriba.
- Se recalcula posición en `resize` y `scroll`.

### Cómo se alinea ahora con la semántica correcta

- Objetivo: distingue rango planificado propio vs rango derivado por fallback.
- Iniciativa: distingue rango propio vs ventana planificada de respaldo.
- Entregable: distingue rango planificado propio, ventana planificada de respaldo y ventana real histórica.

## 6. Compatibilidad y no regresión

### Qué se preservó

- Estados y sus badges.
- Filtros existentes.
- CRUD y formularios.
- Marcadores históricos.
- Releases como compatibilidad visual.
- Expansión jerárquica.

### Cómo se evitó romper estados, filtros y releases

- No se cambió ninguna enumeración ni condición de estado.
- El filtro de ventana sigue operando sobre los IDs históricos de ventana.
- Releases siguen dibujándose como marcadores; no se alteró su estructura ni su cálculo base.

### Qué fallback se dejó

- Objetivos sin rango propio: agregado de hijos.
- Iniciativas sin rango propio: ventana planificada.
- Entregables sin rango propio: ventana planificada para plan y ventana real como capa real histórica.

## 7. Verificaciones técnicas

- `npm run dev`: inicia correctamente. Evidencia: servidor Vite levantó en `http://localhost:5181/`.
- `npm run lint`: limpio. Evidencia: `LINT_EXIT_CODE=0`.
- `npm run build`: limpio. La compilación finalizó correctamente.
- Render correcto: la página se abrió correctamente en el navegador integrado sobre `http://localhost:5181/`.
- Ausencia de errores runtime: no se observaron errores de arranque ni de compilación en terminal durante `dev` y `build`.

Limitación observacional:

- No hubo acceso directo al contenido del navegador ni a la consola del browser desde las herramientas disponibles. Por eso la evidencia de render se basa en arranque correcto del servidor y apertura exitosa de la página, no en inspección automática del DOM o consola del cliente.

## 8. Riesgos residuales

- La contención temporal jerárquica Objetivo → Iniciativa → Entregable sigue sin enforcement fuerte.
- Las ventanas históricas todavía conviven en el modelo y la UI como compatibilidad; no se retiraron en esta fase.
- La edición contextual desde el Cronograma sigue pendiente de una extracción limpia de formularios reutilizables.
- La advertencia de chunk grande en build sigue presente, pero no fue introducida por esta implementación.

## 9. Recomendación siguiente

- Sí conviene avanzar a una fase posterior de edición contextual, pero solo después de extraer formularios reutilizables por entidad o centralizar la lógica de edición.
- Sí conviene separar más claramente planificación vs seguimiento en una fase posterior, ahora que la barra principal ya quedó alineada con la fuente temporal correcta.
- No conviene endurecer validaciones jerárquicas bloqueantes directamente en esta fase sin revisar impacto en datos históricos y flujos existentes.