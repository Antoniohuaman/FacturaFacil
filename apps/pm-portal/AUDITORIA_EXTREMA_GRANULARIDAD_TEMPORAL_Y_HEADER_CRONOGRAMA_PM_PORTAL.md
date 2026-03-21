# Auditoría extrema exhaustiva del cronograma Roadmap: granularidad temporal futura, header operativo y filtro "Vista temporal"

## 1. Resumen ejecutivo

La vista de Cronograma del Roadmap en pm-portal concentra prácticamente toda su lógica temporal en un solo archivo: `src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx`. La implementación actual es consistente y funcional para dos modos de rango visible: año completo y trimestre específico del año seleccionado. No existe hoy una arquitectura de granularidad temporal independiente al rango visible.

Hallazgos principales:

- El filtro llamado "Vista temporal" no controla una granularidad visual real tipo Jira; controla el alcance temporal visible del cronograma. Sus únicos valores actuales son `anio` y `trimestre`.
- La malla visual del timeline siempre está construida en meses, con ancho fijo por mes (`ANCHO_MES = 140`). Cambia el rango mostrado, pero no cambia la unidad visual base del grid.
- La vista trimestral sí tiene efecto real: reduce el rango visible a tres meses, recalcula `totalDias`, reduce el número de columnas mensuales y por tanto aumenta el nivel de zoom efectivo. No es solo un label.
- El año seleccionado es el eje temporal principal. `Vista temporal` y `trimestre` son dependencias subordinadas a ese año.
- La línea de HOY no define navegación; solo se dibuja si la fecha actual cae dentro del rango visible calculado.
- El header superior actual tiene espacio razonable para un control visible adicional en desktop gracias a `flex-wrap`, pero no soporta bien una suma de controles temporales nuevos sin repliorizar o mover elementos. Si se agrega una segmented control tipo Jira encima de lo actual, aumentará el riesgo de redundancia y de doble fuente de verdad temporal.
- La futura navegación tipo Jira (`Hoy`, `Meses`, `Trimestres`, `Año`) es viable, pero no como simple añadido cosmético. Requiere separar dos conceptos que hoy están mezclados: `rango visible` y `granularidad/zoom`.

Conclusión ejecutiva:

- Sí es viable introducir una navegación temporal visible tipo Jira.
- No conviene convivir con el filtro actual "Vista temporal" tal como está nombrado y modelado.
- La decisión con menor riesgo de UX y producto es convertir la temporalidad principal en un control visible del header y dejar el panel de filtros para filtros de dataset, no para el control primario del zoom o alcance temporal.
- El nivel de refactor necesario es medio: no por complejidad algorítmica alta, sino porque la arquitectura actual acopla estado temporal, rango visible, chips de resumen, query string, conteo de filtros y render mensual en una sola pieza.

## 2. Alcance auditado

Archivos revisados con evidencia directa:

- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx`
- `apps/pm-portal/src/presentacion/paginas/roadmap/NavegacionRoadmap.tsx`
- `apps/pm-portal/src/presentacion/paginas/roadmap/PaginaRoadmap.tsx`

Superficies auditadas dentro del cronograma:

- Definición del modelo temporal local.
- Estados conectados a `searchParams`.
- Cálculo de años disponibles.
- Construcción del rango visible.
- Filtrado de objetivos, iniciativas y entregas por solapamiento temporal.
- Construcción de segmentos y posicionamiento de barras.
- Render del header temporal mensual.
- Línea de HOY.
- Scroll horizontal sincronizado.
- Header operativo superior.
- Panel de filtros y comportamiento real de "Vista temporal".

No se implementaron cambios de código ni se alteró la lógica existente. El único resultado nuevo es este documento de auditoría.

## 3. Arquitectura temporal actual del cronograma

### 3.1. El modelo temporal actual es local a la página

La vista define localmente los tipos `VistaTemporal`, `RangoCronogramaBase` y `RangoTemporalCronograma`. `VistaTemporal` solo soporta `anio` y `trimestre`. No existe un modelo separado para granularidad visual, zoom, centro en HOY o navegación por períodos visibles.

Implicación:

- La temporalidad actual no está abstraída como un módulo reutilizable.
- La futura mejora temporal tocará directamente la página principal del cronograma.

### 3.2. Fuente de verdad temporal actual

La fuente de verdad temporal actual se compone de tres estados:

- `vistaTemporal`
- `anioSeleccionado`
- `trimestreSeleccionado`

Estos estados se inicializan desde `useSearchParams` y luego vuelven a escribirse en la URL. Es decir, la URL refleja el estado temporal, pero no lo reemplaza como única fuente de verdad; el estado React sigue siendo la autoridad operativa inmediata.

Esto se ve en:

- inicialización de estados desde `searchParams`
- sincronización posterior mediante `setSearchParams`

Consecuencia técnica:

- El control temporal actual ya forma parte de la navegación profunda de la página.
- Cualquier rediseño temporal deberá conservar compatibilidad con URL o definir una migración explícita.

### 3.3. Cómo se calculan los años disponibles

El selector de año no toma un catálogo fijo. Se construye dinámicamente a partir de múltiples fuentes de fecha:

- rangos propios de objetivos
- rangos propios de iniciativas
- rangos propios de entregas
- año explícito de ventanas
- fechas de inicio y fin de ventanas
- `fecha_objetivo` y `fecha_completado` de entregas
- fechas reales o programadas de releases

Esto hace que el selector de año sea amplio y tolerante a datos heterogéneos.

Implicaciones:

- El año seleccionado no representa solo años con barras visibles planificadas; también incorpora años que aparecen por ventanas, fechas objetivo, completado o releases.
- Puede existir un año seleccionable con evidencia temporal parcial, no necesariamente con una narrativa de timeline completa.

### 3.4. Cómo se construye el rango temporal visible

El `useMemo` de `rangoTemporal` calcula:

- `inicio`
- `fin`
- arreglo de `meses`
- `totalDias`

Reglas actuales:

- Si `vistaTemporal === 'anio'`, el rango es del 1 de enero al 31 de diciembre del año seleccionado.
- Si `vistaTemporal === 'trimestre'`, el rango va del primer día del trimestre seleccionado al último día de ese trimestre dentro del mismo año.

Este cálculo define toda la vista:

- qué columnas se renderizan
- qué barras entran o quedan fuera
- dónde cae la línea de HOY
- cómo se calculan posiciones y anchos

### 3.5. Cómo se calculan columnas, cabeceras y escalas

La cabecera temporal siempre itera `rangoTemporal.meses`. Cada mes visible produce una columna con:

- año en texto pequeño
- mes abreviado

La escala base del grid es siempre mensual. No hay un modo de cabecera trimestral agregada ni una vista anual condensada en quarter buckets.

Además:

- `ANCHO_MES = 140`
- `anchoTimeline = max(meses visibles * 140, 760)`

Eso significa:

- Año completo: 12 meses, ancho base aproximado 1680 px.
- Trimestre: 3 meses, pero con ancho mínimo 760 px, por lo que la vista trimestral actúa como zoom sobre el mismo sistema mensual.

Conclusión técnica clave:

- La app no tiene hoy varias granularidades visuales. Tiene una sola granularidad visual mensual y dos ventanas de alcance.

### 3.6. Cómo se deciden los meses o trimestres a mostrar

Los meses visibles derivan exclusivamente del rango calculado por `vistaTemporal + anioSeleccionado + trimestreSeleccionado`.

No existe lógica adicional para:

- ocultar meses vacíos
- centrar automáticamente en actividad real
- construir trimestres como unidad visual
- desplazarse a partir de HOY

El trimestre no se calcula por datos del negocio, sino por calendario fijo del año seleccionado.

### 3.7. Cómo se posicionan las barras

Cada fila contiene `segmentos` con `inicio`, `fin`, `variante` y `origen`.

Reglas actuales de rango por entidad:

- Objetivo: usa sus fechas propias o, si faltan, agrega el rango mínimo-máximo de sus hijos.
- Iniciativa: usa sus fechas propias o hace fallback a su `ventana_planificada`.
- Entrega: usa sus fechas propias o hace fallback a su `ventana_planificada`.

En render:

- el segmento se recorta al rango visible (`inicioVisible` y `finVisible`)
- la posición izquierda sale de `porcentajeHorizontal(inicioVisible)`
- el ancho sale de la proporción de días visibles sobre `rangoTemporal.totalDias`

Eso implica que las barras no redefinen el rango; se adaptan al rango ya decidido por la UI temporal.

### 3.8. Cómo se posiciona la línea de HOY

La línea de HOY:

- se calcula contra la fecha actual local truncada al inicio del día
- solo aparece si `hoy` cae dentro de `rangoTemporal.inicio` y `rangoTemporal.fin`
- usa `posicionHorizontalPx(hoy)` para ubicarse

No existe hoy lógica de:

- auto-scroll a HOY
- centrado inicial en HOY
- botón HOY
- persistencia de posición relacionada a HOY

Por tanto, HOY es hoy un marcador pasivo, no un modo de navegación.

### 3.9. Cómo se comporta el scroll horizontal

La estructura está separada en:

- encabezado del timeline
- cuerpo del timeline

El scroll horizontal usable está en el cuerpo (`overflow-x-auto`). El encabezado tiene `overflow-x-hidden` y recibe `scrollLeft` programático para mantenerse alineado.

Observación relevante:

- La función de sincronización contempla origen `encabezado` o `cuerpo`, pero en la UI actual solo el cuerpo dispara `onScroll`.
- Operativamente, el usuario desplaza el cuerpo y el encabezado acompaña.

Esto es correcto para el estado actual, pero significa que un futuro control tipo HOY debería intervenir sobre el `scrollLeft` del cuerpo, no sobre el header.

### 3.10. Cómo impactan los filtros en el rango visible

Los filtros no recalculan el rango visible. El rango visible siempre sale del estado temporal.

Lo que sí hacen los filtros es reducir el conjunto de filas que sobreviven dentro de ese rango:

- `filtroObjetivo`
- `filtroEstado`
- `filtroVentana`

Además del filtro directo, iniciativas y entregas se filtran por solapamiento con el `rangoTemporal`.

En otras palabras:

- temporalidad decide la ventana
- filtros deciden qué entidades quedan dentro de esa ventana

### 3.11. Papel del año seleccionado

El año seleccionado es la clave temporal dominante:

- determina el año del rango anual
- determina el año del trimestre visible
- se refleja en chips de resumen
- se escribe en la URL
- se resetea en `limpiarFiltros`

Sin `anioSeleccionado`, `vistaTemporal` pierde significado operativo.

## 4. Análisis profundo del filtro "Vista temporal"

### 4.1. Qué valores soporta hoy

Valores soportados:

- `anio`
- `trimestre`

No hay soporte actual para:

- `mes`
- `hoy`
- `semana`
- `trimestres` como granularidad agregada
- `anio` como resumen agregado distinto de la malla mensual

### 4.2. Qué significan funcionalmente esos valores

`anio` significa:

- mostrar del 1 de enero al 31 de diciembre del `anioSeleccionado`
- renderizar 12 columnas mensuales
- calcular posiciones contra el total de días del año

`trimestre` significa:

- mostrar solo el trimestre elegido dentro del `anioSeleccionado`
- renderizar 3 columnas mensuales
- recalcular posiciones y anchos contra el total de días de ese trimestre
- mostrar un control adicional de trimestre

### 4.3. Qué efecto real tienen sobre el cronograma

El efecto es real y estructural, no cosmético:

- cambia el rango visible
- cambia `meses`
- cambia `totalDias`
- cambia el ancho del timeline
- cambia qué filas sobreviven por solapamiento temporal
- cambia la visibilidad de la línea de HOY
- cambia el resumen de controles
- cambia el conteo de filtros activos
- cambia la URL

Por tanto, no es correcto describir el filtro como mero cambio de etiqueta.

### 4.4. Dónde se consume `vistaTemporal`

`vistaTemporal` se consume en múltiples lugares de la página:

- normalización inicial desde query string
- escritura a `searchParams`
- condición para agregar o remover `trimestre` en URL
- estado inicial de `filtrosAbiertos`
- cálculo de `rangoTemporal`
- conteo de `filtrosActivos`
- construcción de `resumenControles`
- `limpiarFiltros`
- render del select de `Vista temporal`
- render condicional del select de `Trimestre`

Esto confirma que no es un filtro aislado sino un estado transversal del módulo.

### 4.5. Qué hooks, helpers o cálculos dependen de él

Dependencias directas:

- `normalizarVistaTemporal`
- `useState` de `vistaTemporal`
- `useEffect` de sincronización con URL
- `useMemo` de `rangoTemporal`
- `useMemo` de `filtrosActivos`
- `useMemo` de `resumenControles`
- `limpiarFiltros`

Dependencias indirectas:

- filtrado de iniciativas por solapamiento con `rangoTemporal`
- filtrado de entregas por solapamiento con `rangoTemporal`
- selección de objetivos visibles por solapamiento
- posición de barras y recorte visible
- visibilidad de la línea de HOY

### 4.6. ¿Está bien nombrado?

No del todo.

Desde código y UX, "Vista temporal" induce a pensar que cambia la forma de visualizar el tiempo, cuando en realidad hoy hace algo más específico:

- cambia el alcance visible del calendario
- no cambia la unidad base visual del grid

Nombre funcional más preciso, según el comportamiento actual:

- "Rango visible"
- "Período visible"
- "Alcance temporal"

El nombre actual puede tolerarse mientras solo existan dos opciones, pero se vuelve problemático en cuanto se incorpore una granularidad visible tipo Jira.

### 4.7. ¿Representa realmente una "vista temporal"?

Solo parcialmente.

Sí cambia la vista en el sentido de qué intervalo se muestra.
No cambia la vista en el sentido de escala visual independiente.

Técnicamente hoy representa más un `scope selector` que un `granularity selector`.

### 4.8. ¿Se cruza con año y trimestre?

Sí, completamente.

- `anioSeleccionado` es obligatorio para ambos modos.
- `trimestreSeleccionado` solo existe operativamente cuando `vistaTemporal === 'trimestre'`.
- si se vuelve a `anio`, el parámetro `trimestre` se elimina de la URL.

Relación real:

- `anioSeleccionado` = base temporal principal
- `vistaTemporal` = modo de alcance del año
- `trimestreSeleccionado` = subselector cuando el alcance es trimestral

### 4.9. ¿Ya hay lógica parcial de granularidad escondida?

Sí, pero es parcial y no equivale a la mejora futura.

Lo existente:

- vista anual con meses
- vista trimestral con los mismos meses pero en una ventana más corta

Lo que no existe:

- una capa explícita de granularidad independiente del rango
- vista trimestral agregada por quarter blocks
- vista HOY como navegación activa
- modo mensual centrado o navegable por período corto

### 4.10. ¿Sería redundante al agregar un control visible tipo Jira?

Sí, si se mantiene tal cual y además se agrega una segmented control visible.

Ejemplo de confusión probable:

- el usuario ve arriba `Meses | Trimestres | Año`
- abre filtros y encuentra `Vista temporal: Año/Trimestre`

Eso introduce dos preguntas ambiguas:

- ¿qué control manda realmente?
- ¿uno cambia zoom y el otro cambia rango o ambos hacen lo mismo?

Ese es el riesgo más importante de producto y UX en esta auditoría.

### 4.11. ¿Eliminarlo, moverlo o absorberlo tendría impacto?

Sí tendría impacto técnico, pero es acotado y localizado.

El impacto estaría en:

- estado local
- query string
- panel de filtros
- chips de resumen
- conteo de filtros

No aparece consumo externo del valor fuera de la propia página del cronograma. Eso reduce el radio de cambio.

Conclusión:

- mantenerlo igual no es lo más conveniente
- moverlo o absorberlo es viable
- absorberlo en una UI temporal principal visible es la opción más coherente si se decide avanzar con granularidad estilo Jira

## 5. Relación entre "Vista temporal", año, trimestre y rango visible

### 5.1. Relación funcional actual

Matriz simplificada del comportamiento actual:

- `Año + vistaTemporal=anio` -> muestra enero-diciembre del año elegido.
- `Año + vistaTemporal=trimestre + trimestre=Tn` -> muestra solo los tres meses de ese trimestre del mismo año.

### 5.2. Qué se recalcula cuando cambia cada control

Si cambia el año:

- cambia el rango base
- cambian los meses visibles
- cambia la posición relativa de todas las barras
- puede cambiar la visibilidad de HOY
- cambia el resumen y la URL

Si cambia `vistaTemporal`:

- cambia el modo anual/trimestral
- cambia si existe selector de trimestre
- cambia el conteo de filtros activos
- cambia el rango y por tanto el conjunto de filas visibles

Si cambia el trimestre:

- solo cambia el recorte dentro del año ya seleccionado
- no redefine el año

### 5.3. Relación con el rango real del timeline

El rango real del timeline no se extrae de la data. Se impone desde la UI temporal y luego la data se intersecta con ese rango.

Eso es importante para la mejora futura porque implica que:

- cambiar el control temporal cambia la experiencia de navegación aunque la data sea la misma
- la UI manda sobre el viewport temporal

### 5.4. Relación con los filtros temporales de negocio

El filtro de ventana (`filtroVentana`) se cruza con la temporalidad visible, pero no la reemplaza.

Casos relevantes:

- iniciativas: filtran por `ventana_planificada_id` exacto y además por solapamiento con el rango visible
- entregas: si su rango viene de `ventana_planificada`, filtran por id exacto; si su rango viene de fechas propias, filtran por superposición contra la ventana seleccionada

Observación:

- ya existe una semántica temporal relativamente compleja en torno a las ventanas, por lo que añadir otra capa temporal visible sin simplificar la UX incrementaría la carga cognitiva.

## 6. Auditoría del header operativo superior

### 6.1. Composición actual

La banda superior tiene tres bloques funcionales:

- bloque izquierdo principal: buscador + chips resumen
- bloque derecho de acciones: Crear, Resumen, Filtros
- segunda banda condicional: panel de filtros desplegable

La sección usa `flex`, `flex-wrap`, `justify-between` y gaps moderados. Esto le da elasticidad, pero también indica que ya está diseñada para envolver cuando el ancho se comprime.

### 6.2. Espacio real disponible hoy

El buscador ocupa la mayor reserva de espacio:

- `flex-[1_1_26rem]`
- `lg:max-w-xl`

Esto significa que el input busca sostener una base de 26rem y crecer hasta un máximo ancho razonable en desktop.

Los chips resumen comparten la fila izquierda y ya consumen ancho adicional cuando hay:

- año
- `Vista anual` o `Tn`
- objetivo filtrado
- estado filtrado
- ventana filtrada

La banda derecha agrega:

- Crear
- Resumen
- Filtros

Diagnóstico de espacio:

- Desktop amplio: sí hay espacio potencial para una segmented control compacta si se redistribuyen prioridades.
- Tablet / desktop intermedio: el layout sobreviviría por `flex-wrap`, pero aumentaría el wrap de forma visible.
- Mobile: meter más controles en la primera banda sin mover nada degradaría la claridad.

### 6.3. ¿Puede reducirse el buscador?

Sí, moderadamente.

El buscador parece sobredimensionado frente a la densidad actual de la banda superior. Reducir ligeramente su base o su máximo ancho en desktop no debería afectar materialmente la usabilidad, dado que:

- es una búsqueda interna contextual
- tiene placeholder claro
- tiene affordance de limpieza
- no depende de escritura masiva ni de queries largas como un buscador global

Conclusión UX:

- el buscador es el candidato más razonable para ceder ancho si se necesita introducir una segmented control visible.

### 6.4. ¿Hay elementos redundantes hoy en esa banda?

Sí, hay una redundancia suave entre:

- controles temporales reales dentro del panel de filtros
- chips resumen que muestran año y `Vista anual` o `Tn`

Los chips no controlan nada; solo resumen. Pero desde la percepción del usuario, ya existe una pista visual de temporalidad arriba mientras el control real está escondido abajo.

Esto sugiere que el producto ya empuja hacia una temporalidad visible, aunque todavía no la materializa como control.

### 6.5. ¿Conviene mover algo a la fila de filtros?

Sí.

Si se adopta una segmented control temporal visible, conviene que el panel de filtros conserve solo filtros de dataset o de negocio:

- objetivo
- estado
- ventana

Eso deja al tiempo primario en la banda superior y reduce la ambigüedad entre navegación temporal y filtrado de información.

### 6.6. Mejor ubicación exacta de una futura granularidad visible

La ubicación más coherente sería en la banda superior izquierda, junto al buscador y antes de los chips resumen, o reemplazando parcialmente chips temporales.

Razones:

- la temporalidad define el viewport principal del cronograma, no un filtro secundario
- su uso esperado es frecuente y exploratorio
- está conceptualmente más cerca del timeline que del panel de filtros

La peor opción sería duplicarla:

- visible arriba
- y además escondida en Filtros con otra semántica parecida

## 7. Viabilidad de una segmented control temporal tipo Jira

### 7.1. Viabilidad general

La mejora es viable, pero la arquitectura actual no la soporta todavía como concepto completo. Hoy solo existe una combinación de:

- rango visible impuesto por calendario
- malla mensual fija

Por tanto, una segmented control tipo Jira sería viable con refactor medio.

### 7.2. Nivel de refactor estimado

Nivel estimado: medio.

No parece refactor alto porque:

- la temporalidad está centralizada
- no hay muchos consumidores externos
- el timeline ya tiene funciones claras de cálculo y render

No parece refactor leve porque:

- hoy no existe separación entre `rango visible` y `granularidad visual`
- `vistaTemporal` toca URL, filtros, resumen, render y estado del panel
- el grid está hardcodeado a 140 px por mes y a una cabecera mensual fija

### 7.3. Qué partes exactas tocaría una futura implementación

Superficies que necesariamente se tocarían:

- tipo `VistaTemporal`
- normalizadores de query string
- estado local temporal
- `rangoTemporal`
- `anchoTimeline`
- render de cabecera temporal
- render del grid de fondo mensual
- cálculo de posición y anchura de segmentos
- lógica de visibilidad y navegación de HOY
- `filtrosActivos`
- `resumenControles`
- panel de filtros
- header operativo superior

### 7.4. Evaluación específica de cada opción futura

#### Hoy

Con la arquitectura actual, `Hoy` solo encaja de forma natural como atajo de scroll/centrado o como acción para seleccionar un período que contenga HOY.

No existe hoy soporte para que HOY sea una vista con ventana móvil propia.

Conclusión:

- si se implementa pronto, `Hoy` debería entenderse primero como acción de navegación, no como granularidad equivalente a `Meses`, `Trimestres` o `Año`

#### Meses

Es la opción más cercana a la arquitectura actual si significa:

- mostrar meses del año seleccionado con la malla actual

En ese sentido, la vista anual actual ya es una vista mensual del año.

Pero si `Meses` pretendiera significar una ventana corta por mes o navegación mensual focalizada, eso ya requiere nueva lógica de rango.

#### Trimestres

Hoy existe un recorte trimestral del año, pero no una granularidad trimestral visual independiente.

Por eso, la futura opción `Trimestres` necesita definirse semánticamente antes de implementar:

- ¿será mostrar solo un trimestre del año, como hoy?
- ¿será agregar la cabecera o la densidad en quarter blocks?
- ¿será navegar trimestre a trimestre, manteniendo distinta granularidad visual?

La arquitectura actual no responde sola a esa decisión.

#### Año

La opción `Año` sí existe ya de facto: rango enero-diciembre con columnas mensuales.

Es la opción más directamente compatible con el código actual.

### 7.5. ¿Meses, Trimestres y Año se basarían en el calendario real del año seleccionado?

Sí, si se reutiliza la arquitectura actual.

Toda la lógica vigente está anclada al calendario real del `anioSeleccionado`, no a un rango derivado de actividad ni a una escala desacoplada.

### 7.6. ¿Hay riesgo de colisión con el filtro actual "Vista temporal"?

Sí, riesgo alto.

Motivo:

- el filtro actual ya ocupa el espacio conceptual de la navegación temporal primaria
- pero está escondido y además está mal nombrado para convivir con granularidad visible nueva

### 7.7. ¿Qué genera menos confusión para el usuario?

La opción menos confusa es:

- tener un único control temporal principal y visible en el header
- sacar `Vista temporal` del panel de filtros o redefinirlo por completo
- reservar el panel de filtros para filtros de dataset y negocio

## 8. Riesgos P0 / P1 / P2

### P0

- Doble fuente de verdad temporal si se agrega una segmented control visible y además se mantiene `Vista temporal` escondida con semántica parecida.
- Inconsistencia entre lo visible y el rango real si se introduce una nueva UI de granularidad pero se sigue filtrando por el viejo modelo anual/trimestral sin separar conceptos.
- Confusión de producto si el usuario no distingue entre `rango visible`, `granularidad` y `filtros temporales de negocio` como `Ventana`.

### P1

- Redundancia entre chips de resumen temporales y nuevos controles visibles.
- Aumento del wrap del header en anchos intermedios si se suma un control nuevo sin reasignar espacio.
- Deterioro de claridad si `Hoy` se presenta como vista equiparable a `Año` sin comportamiento real de navegación.
- Riesgo de que la línea de HOY quede fuera de expectativa del usuario si el control `Hoy` no desplaza ni centra el timeline.

### P2

- Mayor complejidad de URL al incorporar más estados temporales.
- Necesidad de recalibrar el conteo de filtros activos si la temporalidad deja de vivir dentro del panel de filtros.
- Ajustes visuales menores en chips, spacing y jerarquía del header.

## 9. Qué conviene mantener, qué conviene mover, qué conviene reemplazar

### Mantener

- El año seleccionado como ancla temporal principal.
- La lógica de cálculo de rango por calendario del año.
- La estrategia de posicionamiento proporcional por días.
- El render de barras con clipping al rango visible.
- El scroll horizontal controlado desde el cuerpo del timeline.

### Mover

- La temporalidad primaria fuera del panel de filtros y hacia el header operativo superior.
- La exposición del estado temporal hacia una UI visible y frecuente de exploración.

### Reemplazar

- El naming y el rol del filtro `Vista temporal`.

Si la mejora Jira avanza, ese control no debería sobrevivir como hoy. Debería:

- desaparecer del panel de filtros, o
- convertirse explícitamente en otro concepto distinto, como rango o período, si el diseño final necesitara dos niveles temporales

### No conviene

- mantener `Vista temporal` igual y además agregar otro control visible parecido
- esconder la granularidad nueva dentro de Filtros si se espera uso frecuente y exploratorio

## 10. Recomendación final de producto + UX + técnica

Recomendación final:

- La futura granularidad visible tipo Jira sí debería vivir en el header superior, no escondida dentro del panel de filtros.
- El filtro actual `Vista temporal` no debería mantenerse tal cual si se incorpora esa mejora.
- La solución más coherente es promover la temporalidad a control primario visible y dejar el panel de filtros para filtrado de dataset.

Lectura integrada producto + UX + técnica:

- Producto: hoy `Vista temporal` ya actúa como control estructural, no como filtro accesorio. Por eso está mal ubicado para la importancia que tiene.
- UX: el usuario entiende mejor una temporalidad visible y cercana al timeline que un selector escondido en filtros mientras arriba solo ve chips informativos.
- Técnica: el código actual permite evolucionar porque la lógica está concentrada, pero exige separar explícitamente dos cosas que hoy están mezcladas: el alcance del período y la granularidad del zoom.

Decisión recomendada antes de implementar:

- definir si `Meses`, `Trimestres` y `Año` serán modos de rango, modos de escala, o combinación de ambos
- definir `Hoy` como acción de navegación o como vista real
- eliminar la ambigüedad semántica de `Vista temporal` antes de sumar otra capa temporal

Si se busca el camino con menos riesgo:

- usar un solo control temporal visible
- convertir la vista actual anual en la base de `Año`
- reinterpretar cuidadosamente el actual `trimestre` para no mezclar quarter range con quarter granularity

## 11. Anexo de evidencias con rutas y líneas

### 11.1. Definición del modelo temporal y constantes base

- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:45` define `type VistaTemporal = 'anio' | 'trimestre'`.
- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:95` define `ANCHO_MES = 140`.
- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:110` define `ALTURA_VISTA_CUERPO_CRONOGRAMA = 'min(68vh, 720px)'`.

### 11.2. Normalización del estado temporal

- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:301` normaliza `VistaTemporal`.
- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:310` normaliza `trimestre`.

### 11.3. Estados temporales y query string

- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:687-689` inicializa `vistaTemporal`, `anioSeleccionado` y `trimestreSeleccionado` desde `searchParams`.
- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:806-813` escribe `vista`, `anio` y `trimestre` en la URL.
- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:733-739` usa presencia de parámetros temporales para abrir inicialmente el panel de filtros.

### 11.4. Años disponibles

- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:858-906` construye `aniosDisponibles` desde objetivos, iniciativas, entregas, ventanas y releases.
- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:910-911` corrige `anioSeleccionado` si deja de existir en la lista disponible.

### 11.5. Construcción del rango visible

- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:979-1002` calcula `rangoTemporal`.
- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:1004` calcula `anchoTimeline` en función de los meses visibles.

### 11.6. Solapamiento temporal y supervivencia de filas

- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:1006-1023` filtra iniciativas por objetivo, estado, ventana y solapamiento con el rango visible.
- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:1025-1045` filtra entregas por objetivo, estado, ventana y solapamiento con el rango visible.
- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:1056-1090` determina objetivos visibles, incluyendo objetivos sin asignación directa.

### 11.7. Construcción de rangos por entidad

- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:480-498` obtiene rango de una ventana planificada.
- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:501-512` obtiene rango propio desde fechas inicio/fin.
- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:515-536` calcula rango de objetivo y fallback por hijos.
- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:539-558` calcula rango de iniciativa con fallback a ventana.
- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:561-580` calcula rango de entrega con fallback a ventana.

### 11.8. Consumo transversal de `vistaTemporal`

- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:1331-1351` contabiliza `vistaTemporal === 'trimestre'` como filtro activo.
- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:1353-1371` agrega `Vista anual` o `Tn` a los chips de resumen.
- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:1661-1668` resetea la temporalidad en `limpiarFiltros`.
- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:1874-1881` renderiza el select `Vista temporal`.
- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:1957-1968` renderiza el select de trimestre solo cuando la vista temporal es trimestral.

### 11.9. Header operativo superior

- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:1774` limita el ancho global del contenido a `max-w-7xl`.
- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:1781-1783` estructura la banda superior con `flex-wrap` y reserva al buscador `flex-[1_1_26rem]` con `lg:max-w-xl`.
- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:1812-1818` renderiza chips de resumen temporal y de filtros activos.
- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:1825-1863` renderiza acciones Crear, Resumen y Filtros.

### 11.10. Cabecera temporal, scroll y línea de HOY

- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:1586-1595` calcula posición horizontal y visibilidad de HOY.
- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:1637-1658` define sincronización de scroll horizontal.
- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:2029-2041` arma la estructura del encabezado temporal.
- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:2043-2054` renderiza las columnas mensuales.
- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:2196-2208` renderiza el cuerpo con scroll horizontal y línea de HOY.
- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:2234` dibuja el grid de fondo con repetición fija de 140 px, confirmando la malla mensual.
- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx:2244-2253` recorta y dimensiona segmentos contra el rango visible.

### 11.11. Contexto de navegación del módulo

- `apps/pm-portal/src/presentacion/paginas/roadmap/NavegacionRoadmap.tsx:5-8` confirma la vista de `Cronograma` como sección formal del Roadmap.
- `apps/pm-portal/src/presentacion/paginas/roadmap/PaginaRoadmap.tsx:452-464` evidencia que las ventanas del roadmap ya usan `anio` y `orden`, reforzando que el dominio temporal del módulo está anclado al calendario anual.