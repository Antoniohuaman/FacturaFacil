# AUDITORÍA EXTREMA — CRONOGRAMA ROADMAP COMO SUPERFICIE OPERATIVA CONTEXTUAL

## 1. Resumen ejecutivo

La vista Cronograma ya tiene madurez suficiente como superficie ejecutiva de lectura, pero todavía no está preparada para convertirse directamente en superficie operativa contextual sin una fase previa de desacople prudente.

Hallazgo central: el cronograma sí puede hospedar acciones contextuales por fila, pero hoy no puede abrir de forma limpia “los mismos modales reales” de Objetivos, Iniciativas y Entregables sin arrastrar demasiada lógica incrustada por página.

La razón no es visual sino arquitectónica:

- el cronograma concentra carga, filtros, jerarquía, tooltips, layout sticky, sincronización de scroll, resize de columna, KPIs y render del timeline en un único componente
- los CRUD de roadmap no exponen formularios reutilizables; el formulario y el controlador viven embebidos dentro de cada página
- los modales actuales reutilizan únicamente el contenedor ModalPortal, no el formulario, ni la carga de catálogos, ni los efectos, ni la lógica de reseteo, ni la lógica de refresco

Conclusión estratégica:

- Sí conviene evolucionar el cronograma hacia acciones contextuales por fila.
- No conviene intentar abrir “tal cual” los modales embebidos actuales desde el cronograma.
- La ruta prudente es extraer formularios/controladores reutilizables o introducir un adaptador de operación contextual, y recién después integrar menú de tres puntos y create/edit contextual.

Lo que no debe tocarse en esa futura mejora:

- semántica temporal del timeline
- filtros estabilizados
- scroll horizontal/vertical ya pulido
- compactación y jerarquía visual ya logradas
- línea de hoy
- tooltips informativos actuales

## 2. Alcance auditado

Se auditó con evidencia directa:

- Cronograma principal: apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx
- CRUD de objetivos: apps/pm-portal/src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx
- CRUD de iniciativas: apps/pm-portal/src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx
- CRUD de entregas: apps/pm-portal/src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx
- modal base compartido: apps/pm-portal/src/compartido/ui/ModalPortal.tsx
- wrapper de carga/error/vacío: apps/pm-portal/src/compartido/ui/EstadoVista.tsx
- helper de validación jerárquica de frontend: apps/pm-portal/src/compartido/validacion/roadmapJerarquiaFechas.ts
- refuerzo de negocio fuera del frontend: apps/pm-portal/src/aplicacion/validaciones/contencionJerarquicaRoadmap.ts
- casos de uso con enforcement actual: apps/pm-portal/src/aplicacion/casos-uso/iniciativas.ts y apps/pm-portal/src/aplicacion/casos-uso/entregas.ts
- navegación y patrón actual de entrada al módulo: apps/pm-portal/src/presentacion/paginas/roadmap/PaginaRoadmap.tsx y apps/pm-portal/src/presentacion/paginas/roadmap/NavegacionRoadmap.tsx

No se implementó ningún cambio. No se modificó ninguna vista ni archivo funcional del sistema.

## 3. Estado actual del cronograma

### 3.1. El cronograma es un componente de alta responsabilidad

En PaginaCronogramaRoadmap.tsx, la página no solo renderiza filas y barras; también concentra:

- parsing y utilidades temporales desde el inicio del archivo, incluyendo parseo de fechas, superposición de rangos y formato de meses y rangos, desde aproximadamente PaginaCronogramaRoadmap.tsx:1-420
- semántica temporal real de objetivo, iniciativa y entrega mediante obtenerRangoPlanObjetivo, obtenerRangoPlanIniciativa y obtenerRangoPlanEntrega en PaginaCronogramaRoadmap.tsx:461-527
- carga de datos de objetivos, iniciativas, entregas, releases y ventanas dentro de un useEffect local en PaginaCronogramaRoadmap.tsx:693-718
- persistencia de estado UI en localStorage para ancho de jerarquía, expansión y resumen visible en PaginaCronogramaRoadmap.tsx:644-672 y 837-855
- sincronización de query string con filtros/vista temporal en PaginaCronogramaRoadmap.tsx:720-758
- cálculo de años disponibles, filtros, KPIs, filas, segmentos, resumen y autoexpansión en PaginaCronogramaRoadmap.tsx:760-1332
- sincronización horizontal encabezado/cuerpo del timeline y resize manual de columna en PaginaCronogramaRoadmap.tsx:857-906 y 1344-1374
- control de hover activo de fila mediante filaActiva en PaginaCronogramaRoadmap.tsx:691, 1641-1642 y 1763-1764

Conclusión: el cronograma está funcionalmente sólido, pero no está desacoplado. Cualquier mejora contextual que meta modales, menús, estado de operación, refresco fino o restauración de foco dentro del mismo archivo aumentará bastante la complejidad si se hace sin extracción previa.

### 3.2. La vista izquierda es sticky de facto en su propio layout y la interacción ya es sensible

El layout principal del cuerpo usa una grilla de dos columnas, con jerarquía a la izquierda y timeline a la derecha, dentro de un contenedor con overflow vertical y un timeline con overflow horizontal independiente en PaginaCronogramaRoadmap.tsx:1577-1769.

Esto significa que una futura acción contextual tendría que convivir con:

- dos zonas visuales sincronizadas por hover, una textual y una temporal
- resalte de fila activa en ambos paneles
- scroll horizontal sincronizado entre encabezado y cuerpo
- tooltip flotante de alto z-index con posicionamiento dinámico
- una columna jerárquica redimensionable por drag

No es un entorno hostil, pero sí uno donde un menú contextual mal posicionado o con z-index insuficiente puede romper la percepción de estabilidad.

### 3.3. El cronograma hoy no tiene motor de acción contextual

La única interacción por fila es:

- hover para resaltar fila
- tooltip sobre título y sobre segmentos
- expansión/colapso cuando la fila tiene hijos

La columna jerárquica no define botones de acción adicionales. En la porción de render de filas, después del botón de expansión, la celda solo renderiza título, badge de estado y badge Desvío cuando aplica en PaginaCronogramaRoadmap.tsx:1648-1721.

No existe hoy:

- menú contextual
- foco explícito por teclado sobre la fila completa
- acción “ver detalle” enlazada
- acción create/edit inline
- refresco contextual por entidad

## 4. Estado actual de CRUD y modales

### 4.1. Objetivos

El CRUD de objetivos mantiene todo en la página:

- carga propia de datos y relaciones estratégicas en PaginaObjetivosRoadmap.tsx:64-80
- estado local de modal y entidad activa en PaginaObjetivosRoadmap.tsx:42-44
- apertura y reseteo del formulario en abrirModal en PaginaObjetivosRoadmap.tsx:119-129
- render de acciones Ver, Editar y Eliminar en tabla en PaginaObjetivosRoadmap.tsx:296-330
- ModalPortal con el formulario embebido dentro de la misma página en PaginaObjetivosRoadmap.tsx:351-472
- submit con create/edit y recarga completa mediante cargarObjetivos en PaginaObjetivosRoadmap.tsx:358-381

Objetivos es el caso más simple de los tres, pero tampoco expone un formulario o controlador reutilizable.

### 4.2. Iniciativas

El CRUD de iniciativas es significativamente más pesado:

- la página carga iniciativas, objetivos, ventanas, etapas, relaciones con KR, hipótesis, discovery, historias, casos de uso, RNF y configuración RICE en PaginaIniciativasRoadmap.tsx:174-237
- mantiene estados locales de filtros, catálogos, relaciones, modal y configuración en PaginaIniciativasRoadmap.tsx:80-105
- construye mapas derivados, límites de fechas, helper texts de RICE y validación reactiva de fechas en PaginaIniciativasRoadmap.tsx:262-383
- resetea el formulario con defaults y conversión de impacto en abrirModal en PaginaIniciativasRoadmap.tsx:385-400
- renderiza tabla y acciones Ver, Editar y Eliminar en PaginaIniciativasRoadmap.tsx:639-680
- embebe dentro de la misma página un formulario largo con campos de negocio, catálogos, cálculo RICE, fechas y validación jerárquica en PaginaIniciativasRoadmap.tsx:702-1034
- el submit no solo persiste sino que además revalida jerarquía, normaliza payload, cierra modal y recarga toda la página con cargarInformacion en PaginaIniciativasRoadmap.tsx:710-756

Conclusión: el modal de iniciativas no es un componente reutilizable; es una parte incrustada del page component con acoplamiento fuerte a estados, catálogos, efectos y cálculos derivados.

### 4.3. Entregables

El CRUD de entregas también está altamente incrustado:

- carga entregas, iniciativas, objetivos, ventanas, historias, RNF, releases y múltiples fuentes de operación en PaginaEntregasRoadmap.tsx:118-250
- mantiene filtros amplios y múltiples mapas derivados para releases, bugs, bloqueos y operación en PaginaEntregasRoadmap.tsx:51-84 y 253-432
- resetea formulario y entidad activa en abrirModal en PaginaEntregasRoadmap.tsx:433-448
- renderiza tabla con Ver, Editar, Eliminar en PaginaEntregasRoadmap.tsx:775-810
- incrusta ModalPortal más formulario largo con iniciativa, ventanas, fechas, estado y fecha completado en PaginaEntregasRoadmap.tsx:830-1069
- el submit revalida jerarquía en frontend, normaliza payload, persiste y luego recarga toda la información de la página en PaginaEntregasRoadmap.tsx:837-884

Conclusión: igual que iniciativas, el modal de entregas no está extraído; es una unidad local de la página, no un asset reutilizable del módulo.

### 4.4. El patrón de reutilización actual es parcial, no real

Reutilización real hoy:

- ModalPortal como shell visual de modal en ModalPortal.tsx:1-39
- EstadoVista como wrapper de loading/error/vacío en EstadoVista.tsx:1-31
- helper de validación jerárquica de frontend en roadmapJerarquiaFechas.ts:1-88
- casos de uso y repositorios para persistencia

Lo que no existe hoy como pieza reutilizable:

- FormularioObjetivoRoadmap
- FormularioIniciativaRoadmap
- FormularioEntregaRoadmap
- hook compartido para catálogos y submit
- adaptador host para abrir esos formularios desde otro contenedor

Diagnóstico: hoy existe reutilización parcial de primitivas, pero no reutilización real de la UX de create/edit del roadmap.

## 5. Viabilidad de reutilización de modales

### 5.1. ¿Es viable abrir el mismo modal desde cronograma?

No de manera limpia, si por “el mismo modal” se entiende reutilizar el modal actual tal como existe en las páginas de objetivos, iniciativas y entregas.

La evidencia es directa:

- el modal está embebido en cada página, no exportado como componente
- el formulario depende de estados locales de esa página
- el submit depende del método de recarga total de esa página
- las páginas controlan catálogos, listas auxiliares, validación reactiva y reset del formulario internamente

Ejemplos concretos:

- iniciativas depende de objetivos, ventanas, etapas, relaciones, configuración RICE y trigger reactivo de validación en PaginaIniciativasRoadmap.tsx:174-400
- entregas depende de iniciativas, objetivos, ventanas, releases y métricas operativas en PaginaEntregasRoadmap.tsx:118-448
- objetivos depende de su propia carga y relaciones KR en PaginaObjetivosRoadmap.tsx:64-129

Si el cronograma intentara abrir esos modales “tal cual”, tendría que:

- duplicar el estado y efectos de esas páginas
- o montar páginas enteras dentro de un modal, lo cual sería desproporcionado y frágil

### 5.2. ¿Puede el cronograma actuar como host de modales?

Sí, pero no con el estado actual del módulo. Es viable como host futuro si antes se extrae una capa compartida.

Datos contextuales que el cronograma tendría que poder pasar:

- tipo de entidad: objetivo, iniciativa, entrega
- modo: crear, editar, ver
- id del registro si es edición/ver
- padre preseleccionado si es creación contextual
- contexto de restauración visual al cerrar: fila activa, expansión, scroll, vista temporal, filtros

Problemas que hoy generaría un host directo en cronograma:

- refresco: hoy cada CRUD llama a su propio cargarInformacion después de guardar
- preselección de padre: hoy abrirModal solo resetea con entidad existente o defaults genéricos, no con contexto de creación desde padre
- validación temporal reactiva: depende de watch y trigger dentro de la página CRUD
- catálogos: cronograma no carga etapas ni configuración RICE; el CRUD de iniciativas sí
- foco y scroll: cronograma mantiene hover/scroll sincronizado, pero no estado de restauración de foco a una fila concreta después de cerrar modal
- carga adicional: cronograma ya carga cinco datasets base; si absorbiera toda la lógica de formularios, se volvería aún más monolítico

### 5.3. Diseño más prudente

Conclusión de diseño:

- No conviene reutilizar el modal actual tal cual.
- Sí conviene extraer formulario y controlador compartido por entidad, o crear un adaptador de operación contextual sobre una pieza extraída.

Orden recomendado de preferencia:

1. Extraer formulario y hook compartido por entidad.
2. Montar ese formulario dentro de ModalPortal tanto en la página CRUD como en cronograma.
3. Mantener la página CRUD como host tradicional y permitir al cronograma actuar como host alterno.

Menos recomendable:

- intentar que el cronograma importe directamente la página CRUD completa
- copiar parte del formulario dentro del cronograma
- duplicar validación o reseteo de formularios para la variante contextual

## 6. Menú contextual por fila: viabilidad y diseño

### 6.1. Viabilidad real

Es viable agregar un menú contextual por fila sin romper la vista, siempre que se mantengan estas condiciones:

- el botón no altere la densidad de la celda cuando no está visible
- el menú se ancle dentro de la columna jerárquica y no del timeline
- el estado del menú sea independiente del hover global de fila
- el comportamiento por teclado esté explícitamente definido
- el menú no compita con el botón de expansión ni con los tooltips del título

La evidencia de superficie disponible está en la estructura del lado izquierdo, donde la fila jerárquica ya renderiza título, badge y badge Desvío dentro de un contenedor flex en PaginaCronogramaRoadmap.tsx:1648-1721. Ahí existe el punto natural de inserción del botón de tres puntos.

### 6.2. Dónde debe ir el botón

Recomendación precisa:

- el botón debe vivir al extremo derecho de la celda jerárquica izquierda, no en la zona del timeline
- no debe ir “pegado” al texto si eso rompe la lectura de títulos largos de dos líneas
- lo correcto es reservar un pequeño espacio de acciones al final del bloque de la celda izquierda, manteniendo el título como primer actor visual

Razón:

- el timeline ya usa hover para resaltar fila y tooltips para barras
- meter el botón sobre la mitad temporal crea conflictos de z-index, anchura variable y scroll horizontal
- la jerarquía izquierda es la zona semántica de identificación de la entidad; ahí es donde tiene sentido una acción contextual

### 6.3. Hover, focus y accesibilidad

Recomendación precisa:

- el botón no debe ser exclusivamente hover-only
- debe hacerse visible en hover y también cuando la fila o el botón recibe foco
- debe ser alcanzable por teclado aunque la fila esté compacta
- el menú debe abrirse con Enter y Space, y cerrarse con Escape

Fundamento:

- el cronograma hoy ya soporta focus para tooltips en TooltipCronograma mediante onFocus/onBlur en PaginaCronogramaRoadmap.tsx:190-198
- si el botón de acciones solo aparece con mouse, la operación contextual quedaría inaccesible en teclado y lector de pantalla

### 6.4. Conflictos que hay que prever

Conflictos reales:

- con expansión/colapso: el botón de tres puntos no debe solaparse con el botón de expandir de la fila
- con tooltips: el hover del título hoy ya dispara TooltipCronograma; si el área del título invade el área del botón, se volverá incómodo
- con sticky/scroll: el menú debe posicionarse respecto a la celda izquierda y no depender del scroll horizontal del timeline
- con badges: la fila puede tener badge de estado y badge Desvío; un botón adicional puede saturar visualmente filas de entregas si no se reserva el layout

### 6.5. Acciones con sentido por nivel

Objetivo:

- sí conviene: Editar objetivo, Crear iniciativa bajo ese objetivo, Ver detalle
- posible pero con cautela: Abrir en módulo Objetivos
- no conviene en esta fase: Crear entrega directo desde objetivo

Justificación para no crear entrega directo desde objetivo:

- la jerarquía real es Objetivo → Iniciativa → Entregable
- permitir crear entrega directo desde objetivo obligaría a inventar una UX para resolver la iniciativa padre durante la acción, generando fricción y potencial inconsistencia

Iniciativa:

- sí conviene: Editar iniciativa, Crear entregable bajo esa iniciativa, Ver detalle
- posible con valor: Abrir módulo Iniciativas filtrado en esa iniciativa
- no conviene: edición inline de fechas o rename directo dentro de la fila

Entregable:

- sí conviene: Editar entregable, Ver detalle
- posible con valor: Abrir módulo Entregas filtrado en ese registro
- no conviene: crear subtareas o capas adicionales desde esta fila, porque la jerarquía actual no las soporta

Acciones que no conviene poner en el menú contextual inicial:

- Eliminar
- Duplicar
- Mover entre padres desde el cronograma
- Crear entrega desde objetivo
- Crear inline solo con nombre
- Editar fechas inline en la fila

Razón: todas esas acciones aumentan riesgo de error, pérdida de contexto o duplicación de reglas en una vista que hoy está optimizada para lectura temporal, no para edición granular intensiva.

## 7. Fechas y validaciones en creación/edición contextual

### 7.1. Estado actual de validación

Hoy la protección de fechas vive en dos capas activas:

1. Frontend visual y formulario
   - límites min/max y validate reactivo por campo en roadmapJerarquiaFechas.ts:33-88
   - iniciativas usa construirLimitesFechasJerarquicas, validarCampoFechaEnJerarquia y validarJerarquiaFechas en PaginaIniciativasRoadmap.tsx:345-375 y 710-726
   - entregas usa la misma estrategia en PaginaEntregasRoadmap.tsx:409-427 y 837-853

2. Aplicación/negocio
   - asegurarIniciativaDentroDeObjetivo en contencionJerarquicaRoadmap.ts:35-48
   - asegurarEntregaDentroDeIniciativa en contencionJerarquicaRoadmap.ts:50-60
   - invocadas desde crear/editar en iniciativas.ts:20-24 y 36-40
   - invocadas desde crear/editar en entregas.ts:19-23 y 35-39

Por tanto, una futura creación o edición desde cronograma no puede saltarse la regla si sigue usando los mismos casos de uso.

### 7.2. Crear iniciativa desde objetivo

Si se crea una iniciativa desde una fila objetivo, el comportamiento prudente sería:

- traer objetivo_id preseleccionado y bloqueado visualmente o, como mínimo, preseleccionado con confirmación explícita del usuario
- aplicar los mismos límites min/max usando el rango del objetivo padre
- mantener la misma validación de submit y la misma barrera de negocio

Si el objetivo no tiene rango completo válido:

- no debería bloquear automáticamente la creación por jerarquía
- tampoco debería inventarse un warning agresivo nuevo si la UX actual no lo hace
- lo más prudente es mantener el mismo criterio actual: no hay contención jerárquica efectiva si el padre no tiene rango válido completo

### 7.3. Crear entregable desde iniciativa

Si se crea un entregable desde una fila iniciativa, el comportamiento prudente sería:

- traer iniciativa_id preseleccionada
- calcular límites de fecha desde la iniciativa padre
- reutilizar exactamente la misma lógica de validación reactiva y de submit
- dejar que la barrera de negocio en aplicación actúe como segunda defensa

Si la iniciativa no tiene rango completo válido:

- no debería bloquearse por jerarquía solo por ese hecho
- debe mantenerse la regla ya existente: solo se refuerza contención cuando el padre tiene rango válido completo

### 7.4. Editar desde cronograma

Editar desde cronograma es viable solo si la acción reusa el mismo pipeline de formulario y submit que hoy usan los CRUD. Si el cronograma implementa una variante parcial de edición:

- creará una segunda fuente de verdad de validación reactiva
- arriesgará divergencia entre mensajes
- puede desalinear fechas propias vs fallback visual del timeline

### 7.5. Riesgos de refresco temporal después de guardar

Después de crear o editar desde cronograma, debería preservarse sí o sí:

- vista temporal actual
- año/trimestre actual
- filtros activos
- expansión de objetivos e iniciativas
- ancho de columna jerárquica
- visibilidad del resumen
- posición de scroll horizontal y vertical si es posible

Hoy el cronograma ya persiste parte del contexto en localStorage y query string:

- vista/filtros en query string en PaginaCronogramaRoadmap.tsx:720-758
- expansión y ancho en localStorage en PaginaCronogramaRoadmap.tsx:644-672 y 837-855

Lo que hoy no existe:

- restauración explícita del scroll vertical tras mutación
- restauración de foco sobre fila creada/editada
- rehidratación de “entidad recién tocada”

## 8. Riesgos UX y técnicos

### P0

P0.1 Duplicación de formularios y validaciones

Si se implementa operación contextual creando formularios ad hoc dentro del cronograma, se rompe la coherencia entre CRUD y cronograma. Riesgo directo de doble fuente de verdad sobre:

- defaults
- reseteo
- mensajes
- límites de fechas
- payload normalizado
- refresh posterior a persistencia

P0.2 Acoplar aún más el cronograma sin extracción previa

El cronograma ya es un componente denso. Añadir modales, catálogos extra, estado de menús, foco, restauración y submit directamente dentro de PaginaCronogramaRoadmap.tsx elevaría mucho el riesgo de regresión visual y de mantenimiento.

### P1

P1.1 Pérdida de contexto visual tras guardar

Si el refresh después de crear/editar es bruto y no restaura foco/scroll/fila, el usuario puede perder completamente el contexto en una vista de alta densidad.

P1.2 Menú contextual compitiendo con hover y tooltips

El cronograma usa hover simultáneo en ambas mitades de la fila y tooltips de título y barra. Un menú mal resuelto puede producir flicker, cierres accidentales o solapes visuales.

P1.3 Accesibilidad incompleta

Un patrón “hover-only como Jira” sería un retroceso de accesibilidad. El botón de acciones debe existir también por foco y teclado.

P1.4 Regresión de performance por estado por fila mal diseñado

Si el menú se implementa con estado distribuido por cada fila o con listeners excesivos, puede degradar una vista que ya hace bastante trabajo derivado en memoria.

### P2

P2.1 Ruido visual por exceso de acciones

Objetivos, iniciativas y entregas ya muestran badges y affordances de expansión. Agregar demasiadas acciones visibles puede romper la compactación lograda.

P2.2 Imitar Jira de forma superficial

Crear inline solo con nombre o editar inline dentro de la fila puede parecer rápido, pero introduce una UX paralela de menor calidad para entidades que tienen más complejidad que un issue simple.

P2.3 Menú fuera de la columna jerárquica

Ubicar acciones dentro del área temporal generaría más complejidad de posicionamiento que beneficio real.

## 9. Qué conviene imitar de Jira y qué no

### Sí conviene imitar de Jira

- descubribilidad ligera de acciones por fila
- botón contextual discreto, no dominante
- menú corto y orientado a acciones de alta frecuencia
- apertura contextual sin abandonar completamente el contexto de trabajo
- preservación del estado visual tras operar

### No conviene imitar de Jira en este sistema actual

- creación inline escribiendo solo nombre
- edición inline en la misma fila del cronograma
- inserción de fila vacía temporal
- rename directo como patrón principal

Razones:

- las entidades de roadmap tienen más campos reales que un issue simple
- hay jerarquía temporal y validación padre-hijo
- hay catálogos, ventanas, etapas, estado, prioridad y dependencias laterales
- hay reglas de negocio ya activas en aplicación
- la vista cronograma no es solo una lista; es también un layout temporal sincronizado con sticky/scroll/tooltip

Conclusión clara:

- Sí conviene imitar el patrón de acción contextual discreta.
- No conviene imitar la edición inline agresiva de Jira en esta fase ni con esta arquitectura.

## 10. Estrategia de implementación recomendada

La ruta prudente derivada del análisis real es la siguiente.

### Fase A — Extraer reutilización real

Objetivo:

- extraer formularios/controladores reutilizables de Objetivos, Iniciativas y Entregables

Resultado esperado:

- la página CRUD y el cronograma podrán montar la misma pieza funcional
- se evita duplicación de lógica y mensajes

### Fase B — Agregar menú contextual por fila sin operación todavía

Objetivo:

- introducir botón de tres puntos, focus handling y estructura de menú
- habilitar acciones seguras como Ver detalle o Abrir módulo

Resultado esperado:

- validar densidad visual, z-index, foco, teclado y convivencia con hover/tooltips antes de meter mutaciones

### Fase C — Habilitar edición contextual

Objetivo:

- permitir Editar objetivo, Editar iniciativa y Editar entrega desde cronograma usando piezas ya extraídas

Resultado esperado:

- operación contextual sin segunda UX paralela

### Fase D — Habilitar creación contextual padre-hijo

Objetivo:

- crear iniciativa bajo objetivo
- crear entrega bajo iniciativa

Resultado esperado:

- preselección de padre y preservación de las validaciones actuales

### Fase E — Preservación fina de contexto

Objetivo:

- restaurar scroll, foco y fila afectada
- mantener expansión, filtros, año/trimestre y resumen

Resultado esperado:

- UX operativa de nivel ejecutivo sin sensación de “salto” o pérdida de ubicación

Este orden es el más prudente porque separa:

- reutilización de lógica
- affordance visual
- operación edit
- operación create
- refinamiento de contexto

## 11. Qué no debe tocarse

No debería tocarse en la futura implementación:

- la semántica temporal actual del cronograma, basada en fecha propia y fallback controlado
- el mecanismo de filtros actual y su query string
- el resize de columna jerárquica
- la sincronización horizontal encabezado/cuerpo
- la persistencia de expansión en localStorage
- la línea de Hoy
- la compactación visual y la jerarquía de densidad actual
- los tooltips temporales existentes
- la barrera de validación de negocio fuera del frontend
- los badges de estado y señal Desvío

Tampoco conviene tocar en la primera fase futura:

- las métricas/KPIs del cronograma
- el comportamiento de releases en el resumen
- la semántica de ventanas que ya fue estabilizada

## 12. Hallazgos priorizados P0/P1/P2

### P0

1. Los modales actuales de roadmap no son reutilizables como piezas funcionales; solo reutilizan el shell ModalPortal.
2. El cronograma ya está suficientemente cargado como para que meter create/edit contextual dentro del mismo archivo sin extracción previa sea una apuesta de alto riesgo.
3. Duplicar formularios o variantes inline abriría una doble fuente de verdad de validación y payload.

### P1

1. La pérdida de contexto visual tras guardar sería una regresión importante si no se diseña explícitamente la restauración.
2. Menús contextuales, hover de fila y tooltips comparten la misma zona de interacción y requieren diseño fino.
3. La accesibilidad por teclado no puede quedar subordinada al hover.
4. La creación contextual necesita preselección de padre y propagación exacta de validación sin inventar reglas nuevas.

### P2

1. Acciones excesivas o demasiado visibles pueden romper la limpieza lograda en la columna jerárquica.
2. El patrón Jira de inline edit/create no encaja bien con la complejidad real de estas entidades.
3. El valor de “Ver detalle” puede resolverse inicialmente navegando al módulo o abriendo modal read-only, sin necesidad de diseñar una nueva pantalla.

## 13. Recomendación final

La mejora es viable y tiene sentido estratégico, pero no debe ejecutarse como “agregar un botón y abrir modales desde cronograma” sin más.

Recomendación final:

- Sí avanzar hacia cronograma como superficie operativa contextual.
- No hacerlo todavía sobre la base actual de formularios incrustados.
- La primera inversión correcta no es visual sino estructural: extraer reutilización real de formularios/controladores.

Decisión técnica recomendada:

- menú contextual discreto por fila
- host contextual en cronograma
- formularios compartidos extraídos
- create contextual solo padre-hijo natural
- sin inline edit tipo Jira
- sin creación directa de entrega desde objetivo
- con preservación fuerte de contexto visual después de operar

Si se respeta esa ruta, la mejora puede elevar mucho la velocidad operativa del PM Portal sin degradar la claridad temporal y sin romper la UX ejecutiva ya conseguida.