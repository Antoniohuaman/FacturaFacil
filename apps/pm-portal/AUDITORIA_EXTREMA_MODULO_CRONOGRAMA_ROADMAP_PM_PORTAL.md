# AUDITORÍA EXTREMA — MÓDULO CRONOGRAMA ROADMAP — PM PORTAL
**Auditor:** Claude Sonnet 4.6 (auditor senior funcional + UX + revisor técnico)
**Fecha:** 2026-03-15
**Rama auditada:** `develop`
**Archivo principal:** `src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx` (1 616 líneas)
**Validaciones ejecutadas:** `npm run lint` → OK sin errores · `npm run build` → OK sin errores TypeScript

---

## 1. Resumen ejecutivo

**Veredicto: FUNCIONAL PERO INCOMPLETO**

El módulo compila, lintea y se ejecuta sin errores. La estructura de datos real está conectada. La jerarquía existe y el cronograma visual es legible. Sin embargo, hay **defectos concretos y reales** en la implementación que impiden declarar el módulo como terminado:

- La expansión inicial en modo ejecutivo está en estado colapsado (el usuario ve solo filas de objetivos, sin iniciativas).
- El resize tiene un **bug real** cuando el timeline está desplazado horizontalmente.
- Los segmentos muestran fechas recortadas al viewport en el tooltip, no las fechas reales de la ventana.
- No existe leyenda de colores: el usuario no puede saber qué significa cada banda o marcador sin memorizar el sistema.
- El grupo "Sin iniciativa asignada" aparece en la jerarquía con **cero representación temporal** (sin segmentos ni marcadores en el lienzo).
- Los marcadores de objetivos se truncan silenciosamente a 6.
- El resize handle es invisible para usuarios nuevos (el pill es de 1.5px de ancho, oculto salvo hover).
- No hay navegación hacia el detalle de un release o entrega desde los marcadores o segmentos.

---

## 2. Estado general del módulo

| Dimensión | Estado | Calificación |
|---|---|---|
| Jerarquía funcional | Objetivo → Iniciativa visibles; Entrega solo en detalle | ⚠️ Parcial |
| Temporalidad | Entregas bien cubiertos; Iniciativas solo plan; Objetivos derivados | ⚠️ Parcial |
| Tooltips | Presentes en títulos, segmentos y marcadores; huecos relevantes | ⚠️ Parcial |
| Resize columna | Existe y persiste; bug en scroll horizontal; handle poco visible | ❌ Incompleto |
| UX general | Lectura horizontal correcta; sin leyenda; estado inicial colapsado | ⚠️ Parcial |
| Integración con Roadmap | Ruta, menú, navegación y datos correctos | ✅ Correcto |
| Robustez técnica | Sin errores; fragilidades menores identificadas | ⚠️ Aceptable |
| Build / Lint | Sin errores, sin warnings TypeScript | ✅ Correcto |

---

## 3. Lo que sí está correcto

### 3.1 Integración de datos real y completa
El componente carga en paralelo los cinco conjuntos de datos reales del sistema:
```
Promise.all([listarObjetivos, listarIniciativas, listarEntregas, listarReleases, listarVentanasPm])
```
No hay datos mockeados ni hardcodeados en la lógica temporal.

### 3.2 Modelo de segmentos honesto por nivel
- **Entrega** → usa `ventana_planificada_id` (band amber) + `ventana_real_id` (band emerald) + `fecha_objetivo` (marcador) + `fecha_completado` (marcador real) + releases propios.
- **Iniciativa** → usa `ventana_planificada_id` (band cyan) + releases sin `entrega_id`.
- **Objetivo** → banda agregada calculada como `min(inicio hijos)` → `max(fin hijos)`. Honesto: no inventa datos.

### 3.3 Filtrado temporal correcto
Las iniciativas solo aparecen si su ventana se superpone con el rango seleccionado o tienen un release en rango. Las entregas aplican la misma lógica con cuatro posibles evidencias (plan, real, fecha_objetivo, fecha_completado). Esto es robusto.

### 3.4 Persistencia URL bien implementada
Los parámetros `vista`, `anio`, `trimestre`, `objetivo`, `estado`, `ventana` y `densidad` se persisten en la URL y se sincronizan con el estado React. El ancho de la columna se persiste en localStorage.

### 3.5 Tooltips en los tres puntos de interacción principales
Todos los títulos de jerarquía (objetivo, iniciativa, entrega), todos los segmentos/bandas, y todos los marcadores/hitos tienen tooltip implementado.

### 3.6 Marcador de hoy
La línea vertical de "hoy" aparece correctamente cuando la fecha actual está dentro del rango visible, con badge "Hoy" legible.

### 3.7 Modo detalle auto-expande
Al activar densidad `detalle`, el sistema auto-expande todos los objetivos con hijos y todas las iniciativas con entregas. Esto es una UX thoughtful que funciona bien.

### 3.8 Accesibilidad mínima cubierta
Los botones de expansión tienen `aria-label` y `aria-expanded` correctos.

### 3.9 Sin errores de compilación
`tsc -b` + `vite build` y `eslint` pasan limpios. 0 errores.

---

## 4. Lo que está incompleto, mal resuelto o inconsistente

### 4.1 Estado inicial colapsado sin guía al usuario (CRÍTICO UX)
En modo ejecutivo (default), `objetivosExpandidos` se inicializa como array vacío:
```typescript
const [objetivosExpandidos, setObjetivosExpandidos] = useState<string[]>([])
```
El resultado: al cargar la página por primera vez, el usuario ve **únicamente filas de objetivos** sin ninguna iniciativa visible. No hay botón "Expandir todo". El usuario debe hacer clic en cada objetivo para ver las iniciativas. Esto quiebra la expectativa de una vista de cronograma que debería mostrar el estado del roadmap sin requerir navegación manual.

### 4.2 Modo ejecutivo esconde completamente el nivel de entregas
En modo `ejecutivo`, el campo `tieneHijos` de cada fila de iniciativa se establece como:
```typescript
tieneHijos: densidad === 'detalle' && entregasIniciativa.length > 0
```
Esto significa que en modo ejecutivo, ninguna iniciativa tiene botón de expansión. La única manera de ver entregas es activar el modo `detalle`. Si el usuario no descubre ese control, la vista parece que no tiene tercer nivel. No hay ningún indicador visual en las filas de iniciativa que sugiera que existen entregas disponibles.

### 4.3 Bug de resize en scroll horizontal
**Evidencia en código (línea 641):**
```typescript
const rect = contenedor.getBoundingClientRect()
const nuevoAncho = limitarAnchoColumnaJerarquia(evento.clientX - rect.left)
```
`getBoundingClientRect().left` devuelve la posición del elemento relativa al viewport. Cuando el usuario desplaza el timeline horizontalmente (overflow-x-auto en el contenedor externo), `rect.left` del `contenedorCronogramaRef` se vuelve negativo (por ejemplo, -200 si scrolleó 200px). Entonces el cálculo `clientX - (-200) = clientX + 200` sobreestima el ancho por el valor del scroll. El resize en estado scrolleado produce un ancho incorrecto.

### 4.4 Handle de resize no sticky y visualmente casi invisible
El botón de resize:
```jsx
<button
  className={`absolute inset-y-0 z-50 hidden w-4 -translate-x-1/2 cursor-col-resize md:block ...`}
  style={{ left: `${anchoColumnaJerarquia}px` }}
>
  <span className="absolute left-1/2 top-6 h-10 w-1.5 -translate-x-1/2 rounded-full bg-slate-300 dark:bg-slate-600" />
</button>
```
- El pill visual mide **1.5px de ancho × 40px de alto**. Es prácticamente invisible hasta hacer hover.
- El botón es `absolute` dentro del contenedor no-sticky. Cuando el usuario scrollea el timeline a la derecha, el handle desaparece fuera de la pantalla. Para redimensionar, el usuario debe primero volver a scrollear al inicio.
- Sin soporte touch: no funciona en tablets.

### 4.5 Tooltip de segmento muestra fechas recortadas al viewport, no fechas reales
**Evidencia (líneas 1526-1549):**
```typescript
const inicioVisible =
  segmento.inicio.getTime() < rangoTemporal.inicio.getTime() ? rangoTemporal.inicio : segmento.inicio
const finVisible = segmento.fin.getTime() > rangoTemporal.fin.getTime() ? rangoTemporal.fin : segmento.fin
// ...
<p className="...">{formatearRangoFechas(inicioVisible, finVisible)}</p>
```
Si una ventana comienza el 1 de noviembre del año anterior y el rango visible es el año actual, el tooltip muestra "01 ene 2026 - 31 mar 2026" en lugar de "01 nov 2025 - 31 mar 2026". El usuario no puede saber la fecha real de inicio de la ventana planificada. Esto induce a error.

### 4.6 Sin leyenda de colores de segmentos y marcadores
No existe en ningún lugar de la página una leyenda que explique:
- Banda slate/gris = rango agregado de objetivo
- Banda cyan = ventana planificada de iniciativa
- Banda amber = ventana planificada de entrega
- Banda emerald = ventana real de entrega
- Punto amber = fecha objetivo de entrega
- Punto emerald = fecha completada
- Punto negro/oscuro grande = release programado
- Punto verde grande = release ejecutado

Un usuario nuevo que vea el cronograma no puede interpretar correctamente los elementos visuales sin documentación externa.

### 4.7 "Sin iniciativa asignada" sin representación temporal
El grupo virtual de entregas huérfanas:
```typescript
{
  tipo: 'iniciativa',
  titulo: 'Sin iniciativa asignada',
  segmentos: [],
  marcadores: [],
  ...
}
```
Aparece en la jerarquía pero tiene **cero representación en el lienzo**. La fila de la derecha queda completamente vacía. Las entregas huérfanas sí tienen sus propios segmentos, pero el grupo padre no tiene una band resumen. Visualmente genera una fila vacía que contrasta con el resto.

### 4.8 Truncado silencioso de marcadores en fila de objetivo
```typescript
const marcadoresObjetivo = [...]
  .sort(...)
  .slice(0, 6)
```
Si un objetivo tiene 7 o más marcadores (posible en roadmaps con varios releases), los excedentes se descartan sin ningún indicador. El usuario no sabe que hay marcadores que no ve.

### 4.9 Tooltip del título en columna jerárquica no incluye rango de fechas
El tooltip del título de una iniciativa muestra:
```
título | estado | ventana label (e.g., "Q1 2026") | "X entregas · Y releases"
```
No muestra las fechas de inicio y fin de la ventana. El usuario debe hacer hover en el segmento de la barra del timeline para ver las fechas. El tooltip del título debería incluir el rango para ser autocontenido.

### 4.10 Los marcadores no son navegables
Todos los marcadores (releases, hitos de entrega) aparecen como puntos visuales con tooltip. Pero no son clickeables para navegar al detalle del release (`/lanzamientos/releases`) ni al detalle de la entrega. Esto reduce la utilidad de la vista como herramienta de trabajo real.

### 4.11 "filtrosActivos" cuenta densidad como filtro
```typescript
if (densidad === 'detalle') {
  total += 1
}
```
Esto incrementa el contador de "filtros activos" cuando el usuario cambia la densidad. La densidad es un modo de vista, no un filtro de datos. El badge numérico sobre el botón "Filtros" puede confundir al usuario.

### 4.12 limpiarFiltros resetea al último año disponible, no al año actual
```typescript
setAnioSeleccionado(aniosDisponibles[aniosDisponibles.length - 1] ?? new Date().getFullYear())
```
Si hay datos en 2027, "Limpiar" resetea a 2027, no al año actual. Esto puede sorprender al usuario.

### 4.13 No hay manejo del caso donde Iniciativa no tiene ventana y aparece en jerarquía visual
Una iniciativa visible (porque tiene releases en el rango) pero sin `ventana_planificada_id` producirá una fila en la jerarquía con **ninguna banda en el timeline** y solo los marcadores de releases. La fila existe pero visualmente el timeline de esa iniciativa está vacío de segmentos. No hay ningún indicador de que esto es intencional.

---

## 5. Hallazgos por severidad

| ID | Hallazgo | Severidad | Impacto | Evidencia (línea) | Recomendación |
|---|---|---|---|---|---|
| H01 | Estado inicial colapsado: usuario ve solo objetivos sin iniciativas | Alta | UX de primera impresión rota | L.464 `useState<string[]>([])` | Auto-expandir objetivos con hijos en carga inicial, o añadir botón "Expandir todo" |
| H02 | Bug resize: scroll horizontal hace que el cálculo de ancho sea incorrecto | Alta | Resize inutilizable cuando el timeline está scrolleado | L.641 `evento.clientX - rect.left` | Corregir con `evento.clientX - rect.left + contenedorRef.scrollLeft` |
| H03 | Tooltip de segmento muestra fechas recortadas, no fechas reales de ventana | Alta | Información temporal engañosa para el usuario | L.1526-1549 | Mostrar `segmento.inicio` y `segmento.fin` reales en el tooltip, aclarando el recorte visible |
| H04 | Sin leyenda de colores: el sistema visual es ilegible sin documentación | Alta | Comprensión del cronograma requiere conocimiento previo | No hay ningún elemento de leyenda | Añadir leyenda compacta en el header del lienzo temporal |
| H05 | Handle de resize casi invisible (1.5px de ancho) y no sticky | Media | Funcionalidad de resize no descubrible; desaparece al scrollear | L.1436 `w-1.5` | Ampliar area de interacción, añadir `position: sticky` o mover el handle |
| H06 | "Sin iniciativa asignada" sin segmentos en timeline (fila vacía a la derecha) | Media | Inconsistencia visual, fila que parece rota | L.1119 `segmentos: []` | Calcular y mostrar un segment aggregate para el grupo, o agregar indicador |
| H07 | Marcadores no navegables desde el cronograma | Media | Vista de solo lectura, sin utilidad de triage | No hay onClick/Link en marcadores | Añadir link/click en marcadores y segmentos para navegar al detalle |
| H08 | Truncado silencioso de marcadores de objetivo a 6 | Media | Pérdida de información sin indicador | L.1011 `.slice(0, 6)` | Mostrar indicador "+N más" o eliminar el límite arbitrario |
| H09 | Tooltip de título de iniciativa/entrega no incluye rango de fechas | Media | Requiere hover doble (título + segmento) para ver fechas | L.1480-1487 | Incluir fecha inicio/fin de ventana en tooltip de título |
| H10 | Modo ejecutivo no indica que existen entregas bajo iniciativas | Baja | Usuario puede no descubrir el nivel de entrega | L.1069 `tieneHijos: densidad === 'detalle'...` | Añadir indicador pasivo (ej. badge con contador) en fila de iniciativa |
| H11 | "filtrosActivos" cuenta densidad como filtro activo | Baja | Confusión conceptual en el badge contador | L.908-910 | Excluir densidad del conteo de filtros activos |
| H12 | limpiarFiltros resetea al último año, no al año actual | Baja | Comportamiento sorpresivo al limpiar | L.1161 | Resetear al año actual: `new Date().getFullYear()` |
| H13 | Sin soporte touch para el resize | Baja | Tablets no pueden redimensionar | Evento mousedown solamente | Añadir touchstart/touchmove equivalente |
| H14 | Iniciativa visible sin ventana produce fila con timeline vacío | Baja | Fila en jerarquía sin evidencia visual temporal | L.963-985 | Añadir texto de aviso o estilo diferenciado en la celda de timeline vacía |

---

## 6. Revisión detallada de jerarquía

### Estructura real implementada

```
NIVEL 0 — Objetivo
  NIVEL 1 — Iniciativa          ← solo si objetivo está expandido
    NIVEL 2 — Entrega            ← solo si densidad=detalle E iniciativa expandida
  NIVEL 1 — Sin iniciativa asignada (virtual)  ← solo si densidad=detalle
    NIVEL 2 — Entregas huérfanas
```

### ¿El objetivo puede desplegar iniciativas?
**SÍ.** `tieneHijos: iniciativasObjetivo.length > 0`. El botón de expansión aparece cuando hay iniciativas hijas. Al expandir, se insertan las filas de iniciativas en el array `filasCronograma`.

### ¿La iniciativa puede desplegar entregables?
**SOLO EN MODO DETALLE.** `tieneHijos: densidad === 'detalle' && entregasIniciativa.length > 0`. En modo ejecutivo, la iniciativa nunca tiene botón de expansión, independientemente de cuántas entregas tenga. Esta es una decisión de diseño, pero no está comunicada en ningún lugar de la UI.

### ¿El colapso/expansión está bien resuelto?
**FUNCIONALMENTE SÍ.** Los handlers `alternarExpansionObjetivo` y `alternarExpansionIniciativa` operan sobre arrays de IDs. La lógica es correcta.

**Problemas detectados:**
1. El estado de expansión **no se persiste en URL**. Al refrescar, todo vuelve a estar colapsado.
2. En modo ejecutivo, el `densidadPreviaRef` y los refs de inicialización garantizan que al pasar a detalle se auto-expanda todo. Pero al volver a ejecutivo desde detalle, el estado de expansión de objetivos persiste (bien), aunque los botones de iniciativas desaparecen (bien). Funcionalmente coherente pero no obvio para el usuario.

### ¿El comportamiento inicial de expansión es correcto?
**NO para ejecutivo.** El estado inicial es completamente colapsado. Ver H01.
**SÍ para detalle.** El `useEffect` de densidad auto-expande todo al entrar en detalle.

### ¿Hay casos donde visualmente parece jerárquico pero no lo es?
**SÍ: el grupo "Sin iniciativa asignada".** Aparece como una fila de nivel 1 con botón de expansión, tiene apariencia de iniciativa, pero:
- No tiene `objetivo_id` en el modelo
- No tiene segmentos ni marcadores propios
- Es un agrupador virtual con ID sintético `${objetivo.id}-__sin_iniciativa__`
- Su estado se calcula como `estadoDominante` de las entregas hijas

El timeline de esa fila está completamente vacío. La fila "aparenta" ser una iniciativa con la misma jerarquía visual, pero su representación temporal está ausente.

---

## 7. Revisión detallada de fechas / rangos / hitos

### Campos temporales usados por nivel

| Nivel | Campo | Uso |
|---|---|---|
| Iniciativa | `ventana_planificada_id` → `fecha_inicio` + `fecha_fin` de ventana | Banda cyan |
| Iniciativa | releases sin `entrega_id` con `fecha_programada` / `fecha_lanzamiento_real` | Marcadores |
| Entrega | `ventana_planificada_id` → `fecha_inicio` + `fecha_fin` de ventana | Banda amber |
| Entrega | `ventana_real_id` → `fecha_inicio` + `fecha_fin` de ventana | Banda emerald |
| Entrega | `fecha_objetivo` | Marcador amber (punto) |
| Entrega | `fecha_completado` | Marcador emerald (punto) |
| Entrega | releases propios con `fecha_programada` / `fecha_lanzamiento_real` | Marcadores |
| Objetivo | Derivado de `min(inicio hijos)` → `max(fin hijos)` | Banda gris aggregate |

### ¿Qué NO está cubierto?

- **Iniciativa sin `ventana_real_id`**: El modelo `Iniciativa` no tiene campo `ventana_real_id`. No existe comparación plan vs real para iniciativas. El cronograma muestra solo la ventana planificada. Un usuario podría esperar ver "cuándo se estimó" vs "cuándo ocurrió realmente" a nivel de iniciativa, y eso no es posible con el modelo actual.
- **`fecha_programada` de Release**: Si un release tiene `fecha_lanzamiento_real`, se usa esa (marcador verde). Si no, se usa `fecha_programada` (marcador oscuro). La función `fechaRelease` maneja esto correctamente.
- **Objetivo nativo sin fechas**: El modelo `Objetivo` no tiene campos de fecha propios. La banda temporal del objetivo es 100% derivada de sus hijos. Si un objetivo no tiene iniciativas ni entregas con datos temporales, no tendrá banda.

### Bug de fechas en tooltip (H03)
El tooltip del segmento muestra `inicioVisible`/`finVisible` (la intersección del segmento con el viewport), no el `segmento.inicio`/`segmento.fin` originales. Ejemplo concreto:

```
Ventana real: 01 nov 2025 → 15 feb 2026
Vista activa: año 2026 (ene-dic)
inicioVisible: 01 ene 2026 (recortado)
finVisible: 15 feb 2026

→ Tooltip muestra "01 ene 2026 - 15 feb 2026" ❌
→ Debería mostrar "01 nov 2025 - 15 feb 2026" ✅
```

### Cálculo de posición en el lienzo
```typescript
const porcentajeHorizontal = (fecha: Date) => {
  const dias = diferenciaDias(rangoTemporal.inicio, fecha)
  return (dias / rangoTemporal.totalDias) * 100
}
```
El cálculo es correcto: días desde inicio del rango / total días × 100. Las barras se posicionan con precisión de píxel ajustada al ancho por mes.

### Mínimo visual garantizado
```typescript
const width = Math.max(
  ((diferenciaDias(inicioVisible, finVisible) + 1) / rangoTemporal.totalDias) * 100,
  segmento.variante === 'objetivo' ? 0.8 : 1.2
)
```
Los segmentos tienen un ancho mínimo garantizado para no desaparecer si la ventana es muy corta en el rango visible. Correcto.

---

## 8. Revisión detallada de tooltips

### Mapa de tooltips: dónde SÍ y dónde NO

| Elemento | Tiene tooltip | Contenido | Diagnóstico |
|---|---|---|---|
| Título de objetivo (columna izquierda) | ✅ SÍ | Nombre, estado, "X iniciativas", "Y entregas · Z releases" | Incompleto: falta rango de fechas del span |
| Título de iniciativa (columna izquierda) | ✅ SÍ | Nombre, estado, etiqueta ventana (solo label), contador entregas/releases | Incompleto: la etiqueta es el nombre de la ventana, no las fechas reales |
| Título de entrega (columna izquierda) | ✅ SÍ | Nombre, estado, etiqueta ventana plan, fecha objetivo formateada | Aceptable, aunque podría incluir ventana real |
| Segmento/banda de objetivo | ✅ SÍ | Nombre, "Rango agregado de objetivo", rango (RECORTADO), estado | **Bug H03**: fechas recortadas al viewport |
| Segmento/banda de iniciativa | ✅ SÍ | Nombre, "Ventana planificada de iniciativa", rango (RECORTADO), estado | **Bug H03** |
| Segmento/banda plan de entrega | ✅ SÍ | Nombre, "Ventana planificada de entrega", rango (RECORTADO), estado | **Bug H03** |
| Segmento/banda real de entrega | ✅ SÍ | Nombre, "Ventana real de entrega", rango (RECORTADO), estado | **Bug H03** |
| Marcador fecha objetivo de entrega | ✅ SÍ | Nombre, "Fecha objetivo de entrega", etiqueta, fecha, estado | Correcto |
| Marcador fecha completada de entrega | ✅ SÍ | Nombre, "Entrega completada", etiqueta, fecha, estado | Correcto |
| Marcador release programado | ✅ SÍ | Nombre, "Release programado", código del release, fecha, estado | Correcto |
| Marcador release ejecutado | ✅ SÍ | Nombre, "Release ejecutado", código del release, fecha, estado | Correcto |
| Badge "Desvío" (rojo) | ❌ NO | — | Sin tooltip: ¿qué entrega está atrasada? ¿por cuánto? |
| KPI "Entregas atrasadas" (número) | ❌ NO | — | El usuario sabe el número pero no cuáles son |
| KPI "Entregas próximas" (número) | ❌ NO | — | Idem |
| Marcador de hoy (línea roja) | ❌ NO | — | Sin tooltip (probablemente no necesario, tiene badge "Hoy") |
| Resumen de controles activos (chips) | ❌ NO | — | Los chips describen el estado pero sin tooltip extendido |

### Diagnóstico del componente TooltipCronograma
El componente es custom (no usa librería externa). Posicionamiento con `fixed` basado en `getBoundingClientRect()`. Esto puede producir desbordamiento en bordes del viewport (no hay boundary detection). En pantallas estrechas o cuando el elemento está cerca del borde derecho, el tooltip puede quedar fuera del viewport visible.

```typescript
setPosicion({
  x: rect.left + rect.width / 2,
  y: rect.top - 10
})
```

No hay corrección de posición si `x > window.innerWidth - tooltipWidth`. Sin embargo, dado que el cronograma usa scroll horizontal, este problema rara vez se manifestará en la práctica para los segmentos centrales.

---

## 9. Revisión detallada de resize

### ¿Existe?
SÍ. Implementado con `onMouseDown` → `setRedimensionandoJerarquia(true)` → `useEffect` que registra `mousemove` / `mouseup` globales.

### ¿Tiene handle visible?
**APENAS.** El indicador visual es:
```jsx
<span className="absolute left-1/2 top-6 h-10 w-1.5 -translate-x-1/2 rounded-full bg-slate-300 dark:bg-slate-600" />
```
1.5px de ancho. Solo visible con esfuerzo. El área de click es mayor (el botón tiene `w-4`), pero el indicador visual no lo sugiere. Un usuario que no conoce la funcionalidad no la descubrirá.

### ¿Se puede arrastrar?
SÍ, en condiciones ideales (sin scroll).

### ¿Modifica el ancho de verdad?
SÍ. `anchoColumnaJerarquia` es state React usado en `gridTemplateColumns` de las filas y el header.

### ¿El handle es sticky?
**NO.** El botón es `absolute` dentro del `contenedorCronogramaRef` que es el inner div del `overflow-x-auto`. Cuando el usuario scrollea el timeline a la derecha, el handle se mueve fuera del viewport. Para poder redimensionar, el usuario debe primero scrollear de vuelta al inicio.

### Bug con scroll horizontal (H02)
```typescript
// línea 640-642
const contenedor = contenedorCronogramaRef.current
const rect = contenedor.getBoundingClientRect()
const nuevoAncho = limitarAnchoColumnaJerarquia(evento.clientX - rect.left)
```

Cuando `overflow-x-auto` scrollea el contenido, el inner div (`contenedorCronogramaRef`) puede tener `getBoundingClientRect().left < 0`. La fórmula `clientX - rect.left` produce:

```
Ejemplo:
  - scrollLeft = 200px → rect.left = -200
  - clientX = 350px (posición del mouse en viewport)
  - resultado = 350 - (-200) = 550px ← INCORRECTO
  - correcto sería: 350 + 0 = 350px (la columna debería tener 350px)
```

La corrección requeriría añadir el `scrollLeft` del contenedor externo:
```typescript
// Pseudocódigo del fix
const contenedorExterno = contenedorCronogramaRef.current.parentElement
const scrollLeft = contenedorExterno?.scrollLeft ?? 0
const nuevoAncho = limitarAnchoColumnaJerarquia(evento.clientX - rect.left + scrollLeft)
```

### ¿Persiste?
SÍ. localStorage bajo `'pm-portal-roadmap-cronograma-ancho-jerarquia'`. Correcto.

### ¿Convive bien con sticky?
**PARCIALMENTE.** Las celdas de jerarquía tienen `sticky left-0 z-10`, el header `sticky top-0 z-20`. El handle no es sticky. La línea divisoria (el `div` de 1px) tampoco es sticky — es `absolute z-40` dentro del inner div, por lo que scrollea con el contenido. Visualmente no hay un separador sticky entre jerarquía y timeline cuando se scrollea horizontalmente.

---

## 10. Revisión de integración funcional con Roadmap

### Ruta
`/roadmap/cronograma` en el enrutador → `PaginaCronogramaRoadmap`. Correcto.

### Navegación secundaria (NavegacionRoadmap)
```typescript
const enlaces = [
  { etiqueta: 'Resumen', ruta: '/roadmap' },
  { etiqueta: 'Objetivos', ruta: '/roadmap/objetivos' },
  { etiqueta: 'Iniciativas', ruta: '/roadmap/iniciativas' },
  { etiqueta: 'Entregas', ruta: '/roadmap/entregas' },
  { etiqueta: 'Cronograma', ruta: '/roadmap/cronograma' }
]
```
"Cronograma" aparece como último tab. La tab activa se resalta correctamente con `isActive`. El componente `NavegacionRoadmap` se incluye en el header de la página. Correcto.

### Menú lateral (menuPortal.ts)
"Cronograma" es el **primer** item en el submenú de Roadmap:
```typescript
{ etiqueta: 'Cronograma', ruta: '/roadmap/cronograma' },
```
Hay una inconsistencia de orden: en `NavegacionRoadmap`, "Cronograma" es el último tab. En `menuPortal.ts`, "Cronograma" es el primero del submenú. Esta inconsistencia de orden puede generar confusión.

### Parámetros URL
Los filtros y configuraciones de vista persisten en la URL correctamente. Los estados de expansión de objetivos e iniciativas **no persisten** en URL (solo en memoria de sesión). Al refrescar la página, la jerarquía vuelve a estar colapsada.

### Relación con datos del sistema
- Objetivos: conectado a `listarObjetivos()` ✅
- Iniciativas: conectado a `listarIniciativas()` con `objetivo_id`, `ventana_planificada_id`, `estado` ✅
- Entregas: conectado a `listarEntregas()` con `ventana_planificada_id`, `ventana_real_id`, `fecha_objetivo`, `fecha_completado` ✅
- Releases: conectado a `listarReleases()` con `iniciativa_id`, `entrega_id`, `fecha_programada`, `fecha_lanzamiento_real` ✅
- Ventanas: conectado a `listarVentanasPm()` con `fecha_inicio`, `fecha_fin`, `etiqueta_visible` ✅

### Hardcoding
Los únicos valores hardcodeados son constantes de layout que tienen sentido:
```typescript
const ANCHO_MES = 140        // px por mes en el timeline
const ANCHO_COLUMNA_JERARQUIA_MIN = 320
const ANCHO_COLUMNA_JERARQUIA_MAX = 560
const ANCHO_COLUMNA_JERARQUIA_POR_DEFECTO = 392
```
No hay datos hardcodeados de dominio. Los filtros de estado (`pendiente`, `en_progreso`, `completado`) podrían leerse del modelo pero están hardcodeados como `<option>` en el JSX, lo que es aceptable dado que `EstadoRegistro` es un tipo cerrado.

### ¿Se siente integrado o pegado?
**Se siente integrado** en cuanto a datos y navegación. El módulo usa el layout, la navegación y los datos del sistema correctamente. Lo que genera sensación de "pegado" es la ausencia de cross-linking: desde un marcador de release no se puede navegar a `/lanzamientos/releases`, y desde la vista de objetivos no hay un enlace directo al cronograma filtrado por ese objetivo.

---

## 11. Riesgos actuales

| # | Riesgo | Probabilidad | Impacto |
|---|---|---|---|
| R01 | Usuario no descubre funcionalidad de resize (handle invisible) | Alta | Columna izquierda siempre al ancho default |
| R02 | Usuario scrollea el timeline y el resize produce ancho erróneo | Media | Columna queda en un ancho incorrecto, requiere reload |
| R03 | Usuario en modo ejecutivo piensa que no hay entregas en el sistema | Media | Malinterpretación del estado del roadmap |
| R04 | El tooltip muestra fechas incorrectas (recortadas) para ventanas que cruzan el año | Media | Decisiones basadas en fechas de inicio erróneas |
| R05 | Objetivos con muchos releases pierden marcadores sin aviso (slice 0-6) | Baja-Media | Información oculta silenciosamente |
| R06 | Bundle total supera 1.3 MB gzip 284 KB. No específico del módulo pero es contexto de riesgo global | Baja | Carga lenta en conexiones lentas |
| R07 | Un objetivo con todos sus hijos fuera del rango temporal no aparece, aunque el objetivo esté activo | Baja | Falsa sensación de cronograma vacío |

---

## 12. Recomendación final

El módulo **no está listo para ser declarado terminado**. Está funcional y sin errores técnicos, pero tiene defectos de UX y de precisión de datos que afectan la utilidad real de la vista. Estos son los ítems exactos que deben resolverse para poder cerrar el módulo correctamente, ordenados por prioridad:

### Bloquers (deben resolverse antes de declarar el módulo listo)

1. **[H01] Auto-expansión inicial**: Expandir todos los objetivos con hijos al cargar la página en modo ejecutivo, o añadir un botón "Expandir todo" visible.
2. **[H03] Fechas reales en tooltip de segmento**: Mostrar `segmento.inicio` y `segmento.fin` originales, con nota de recorte si aplica.
3. **[H04] Leyenda de colores**: Añadir una leyenda compacta debajo del header del lienzo que explique cada color de banda y tipo de marcador.
4. **[H02] Fix del bug de resize en scroll**: Corregir el cálculo de ancho en `manejarMouseMove` añadiendo el `scrollLeft` del contenedor externo.

### Alta prioridad (mejoran significativamente la experiencia)

5. **[H05] Handle de resize sticky y más visible**: Ampliar el área visual del pill (mínimo 3-4px), añadir tooltip "Arrastra para redimensionar", y hacer el handle sticky a la izquierda.
6. **[H09] Fechas en tooltip de título de iniciativa**: Incluir `fecha_inicio - fecha_fin` de la ventana planificada directamente en el tooltip del título.
7. **[H07] Marcadores y segmentos navegables**: Añadir `onClick` en marcadores y segmentos para navegar al detalle de la entrega o del release.
8. **[H10] Indicador de entregas disponibles en ejecutivo**: En modo ejecutivo, mostrar un badge pasivo con el número de entregas en filas de iniciativa, para que el usuario sepa que existen y sepa que puede activar "Detalle" para verlas.

### Media prioridad (pulido y coherencia)

9. **[H06] Representación temporal del grupo "Sin iniciativa asignada"**: Calcular un segmento agregado para ese grupo o distinguirlo visualmente de iniciativas reales.
10. **[H08] Indicador de marcadores truncados**: Si hay más de 6 marcadores en un objetivo, mostrar "+N más" en la celda del timeline.
11. **[H11] Excluir densidad del contador de filtros activos**: No contar el modo de vista como filtro.
12. **[H12] limpiarFiltros resetea al año actual**: Cambiar a `new Date().getFullYear()` en lugar del último año disponible.
13. **Consistencia de orden en menú vs navegación**: Alinear el orden de "Cronograma" en `menuPortal.ts` y `NavegacionRoadmap.tsx`.

---

*Auditoría generada con base en lectura completa de 1 616 líneas del componente principal, archivos de soporte (NavegacionRoadmap, enrutador, menuPortal, modelos de dominio, casos de uso, helpers de formato), y ejecución de `npm run lint` (sin errores) y `npm run build` (sin errores TypeScript, warning de bundle size no relacionado con el módulo).*
