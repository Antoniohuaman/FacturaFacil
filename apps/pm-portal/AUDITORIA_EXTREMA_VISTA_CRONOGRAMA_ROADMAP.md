# AUDITORÍA EXTREMA — VISTA DEL CRONOGRAMA ROADMAP

## 1. Resumen ejecutivo

Diagnóstico general.

La vista actual del cronograma está razonablemente ordenada y ya no es una superficie saturada de señales. El lienzo principal quedó enfocado en tres bandas temporales de planificación: objetivo, iniciativa plan y entrega plan, con una línea única de HOY y una leyenda consistente con ese render. La jerarquía izquierda, los badges de estado, los filtros y la navegación siguen presentes.

Nivel de consistencia visual actual.

La consistencia visual es media-alta. La columna izquierda es sticky, la cabecera temporal también es sticky, existe un separador vertical explícito entre jerarquía y timeline, y la línea de HOY ya está resuelta como una capa única continua. Sin embargo, la separación entre panel izquierdo y panel temporal es todavía más visual que estructural: el scroll horizontal pertenece al contenedor completo del cronograma, no a un panel derecho independiente.

Si la vista está bien estructurada o no.

Sí está estructurada de forma funcional y mantenible, pero no está completamente panelizada al estilo de una herramienta como Jira. La implementación actual usa una sola superficie scrolleable horizontal con columna izquierda sticky para simular la separación. Eso funciona, pero deja una percepción de que la barra de scroll inferior pertenece al bloque completo y no exclusivamente al timeline.

Severidad de los problemas detectados.

- P0: no se detectaron.
- P1: anclaje estructural del scroll horizontal y separación incompleta entre panel izquierdo y panel temporal.
- P2: residuos de complejidad histórica fuera del render principal, sobre todo cálculos y datos de releases y fechas históricas que aún participan en algunos resúmenes y disponibilidad de años.

Conclusión de alto nivel.

La vista ya está bastante más limpia y centrada en planificación. No hace falta rehacer el cronograma. El siguiente ajuste correcto no es volver a limpiar barras o leyenda, porque eso ya está hecho, sino refinar la arquitectura del contenedor para que el timeline derecho tenga una identidad de panel más clara y el scroll horizontal se perciba asociado a ese panel.

## 2. Alcance auditado

Archivos revisados.

- [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx)

Capas revisadas.

- Carga de datos y ensamblaje de filas.
- Filtros y resumen superior.
- KPIs superiores.
- Contenedor general del cronograma.
- Cabecera temporal.
- Columna jerárquica izquierda.
- Lienzo temporal derecho.
- Línea de HOY.
- Tooltips.
- Leyenda final.

Límites de la auditoría.

- No se auditó persistencia, CRUD, formularios ni validaciones.
- No se auditó backend ni repositorios, porque el problema pedido es de vista y layout.
- No se auditó el resto del módulo Roadmap fuera de esta página.
- No se implementó ningún cambio. Este documento describe únicamente el estado actual con evidencia.

## 3. Estructura actual de la vista

### 3.1 Contenedores principales

Evidencia.

La página compone la vista dentro de `EstadoVista`, luego arma una columna principal con `header`, panel de filtros, bloque de KPIs y el bloque del cronograma en una sola página React. Todo está concentrado en un único archivo y componente principal: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L521), [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1217), [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1363).

Diagnóstico.

La vista es monolítica a nivel de archivo, pero coherente: toda la lógica de datos, layout y render está colocalizada. Eso simplifica auditarla, aunque también hace que layout, datos y UX estén fuertemente acoplados dentro del mismo componente.

### 3.2 Panel izquierdo

Evidencia.

La columna izquierda se define como la primera columna de una grilla de dos columnas, con ancho controlado por `anchoColumnaJerarquia`. La cabecera izquierda usa `sticky left-0 z-30`, y cada fila izquierda usa `sticky left-0 z-10`, con borde derecho y fondo propio: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1383), [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1385), [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1461), [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1463).

Diagnóstico.

La columna izquierda sí está visualmente protegida y funciona como panel fijo durante el scroll horizontal. Tiene además soporte de resize manual y persistencia en `localStorage`, lo que refuerza que conceptualmente ya fue pensada como un panel diferenciado: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L81), [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L727), [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L754), [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1418).

### 3.3 Panel temporal derecho

Evidencia.

El timeline derecho es la segunda columna de la misma grilla. Su ancho se calcula como `anchoTimeline = Math.max(rangoTemporal.meses.length * ANCHO_MES, 760)`, y se renderiza con cabecera de meses, grid vertical, barras y línea de HOY: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L806), [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1383), [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1392), [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1544), [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1545).

Diagnóstico.

Sí existe un panel temporal reconocible, pero no es un subpanel scrolleable autónomo. Es una mitad de una grilla mayor cuyo ancho total es la suma del panel izquierdo y del timeline.

### 3.4 Relación entre ambos

Evidencia.

La relación está resuelta como una grilla de dos columnas repetida tanto en la cabecera como en cada fila. Además, hay un separador vertical absoluto en la coordenada `left: anchoColumnaJerarquia`: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1383), [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1409).

Diagnóstico.

La separación existe y no es imaginaria. Pero es una separación de layout interno, no de scroll containers. Por eso la sensación visual se acerca a “dos paneles”, mientras que la sensación del scroll inferior todavía comunica “un solo bloque ancho”.

## 4. Auditoría del layout y scroll

### 4.1 Scroll horizontal

Evidencia.

El único `overflow-x` del componente está en el wrapper externo del cronograma: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1379). Además, el propio comentario del resize confirma que se usa el contenedor externo `overflow-x-auto` como referencia geométrica: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L754).

Diagnóstico.

El scroll horizontal pertenece al bloque completo del cronograma, no exclusivamente al panel temporal derecho.

Conclusión explícita.

La hipótesis del usuario queda confirmada: la barra inferior no está anclada a un subpanel temporal independiente. Está anclada al wrapper que contiene la suma de columna izquierda más timeline.

### 4.2 Scroll vertical

Evidencia.

No hay contenedores con `overflow-y-*` dentro del componente. La búsqueda sobre la página no devuelve coincidencias de `overflow-y`, `overflow-scroll` ni `overflow-auto` vertical. En cambio, sí existe `sticky top-0` para la cabecera del cronograma: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1382).

Diagnóstico.

El scroll vertical no está encapsulado en un body interno del cronograma. Depende del scroll normal de la página/documento. La cabecera del cronograma se fija con `sticky top-0`, por lo que el usuario ve una experiencia de tabla larga dentro del documento, no un body scrolleable propio.

### 4.3 Qué contenedor gobierna cada overflow

Tabla de gobierno de overflow.

| Comportamiento | Contenedor actual | Evidencia | Diagnóstico |
| --- | --- | --- | --- |
| Scroll horizontal | Wrapper externo del bloque cronograma | [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1379) | Pertenece al bloque completo |
| Scroll vertical | Documento/página | Ausencia de `overflow-y` interno y cabecera sticky en [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1382) | No existe body interno del cronograma |
| Fijación panel izquierdo | Celdas sticky de la primera columna | [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1385), [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1463) | Separación funcional pero no por contenedor |
| Separador entre paneles | Capa absoluta alineada con ancho de jerarquía | [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1409) | Refuerza corte visual |

### 4.4 Si el scroll inferior respeta o no la columna izquierda

Evidencia.

El min-width del contenido scrolleable es la suma `anchoColumnaJerarquia + anchoTimeline`: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1380).

Diagnóstico.

Visualmente la columna izquierda se mantiene fija gracias a `sticky`, pero el scroll inferior no pertenece a un timeline aislado. Por eso, aunque la columna no se mueva, la percepción del usuario puede seguir siendo que la barra inferior “abarca todo el cronograma”.

Conclusión explícita.

La columna izquierda está respetada en posición, pero no está respetada como frontera del scrollbar. El problema es de anclaje estructural del scroll, no de sticky.

### 4.5 Diagnóstico estructural

La arquitectura actual permite una corrección relativamente focalizada.

- No hace falta rehacer la lógica temporal.
- No hace falta rehacer la jerarquía.
- No hace falta tocar filtros ni tooltips para resolver el problema principal.
- Sí haría falta reorganizar el wrapper para que el panel temporal tenga su propio contenedor scrolleable, o introducir una solución equivalente que recorte visual y funcionalmente el scrollbar al panel derecho.

Diagnóstico final de esta sección.

La estructura no está “rota”, pero está resuelta a medias respecto a la aspiración tipo Jira. La separación ya existe a nivel visual y sticky. Lo que falta es la separación de scroll container.

## 5. Auditoría de la línea de HOY

Implementación actual.

La línea de HOY se renderiza como una sola capa absoluta, anclada al panel temporal por `left: anchoColumnaJerarquia` y `width: anchoTimeline`, con una única ancla interactiva de tooltip colocada por porcentaje horizontal de la fecha actual: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1428), [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1435), [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1439).

Anclaje.

Está correctamente anclada al área temporal, no a cada fila. Esa es una mejora estructural real respecto a una simulación por renglón.

Continuidad.

La línea es continua a lo largo del lienzo porque se dibuja una sola vez por encima de todas las filas y no dentro de cada fila. El render de filas solo dibuja segmentos: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1547).

Problemas visuales o estructurales.

- No se detecta el defecto previo de segmentación por filas.
- El stacking parece suficiente: `z-[18]` para HOY, `z-[12]` para segmentos y `z-40` para el separador de paneles.
- El tooltip de HOY ya existe y muestra fecha real legible.

Conclusión.

La línea de HOY está bien resuelta estructuralmente en su estado actual. No es un área que requiera una nueva reimplementación; como mucho, admite refinamientos menores de estilo.

## 6. Auditoría de señales visibles

### 6.1 Barras activas hoy

Evidencia.

El tipo `SegmentoCronograma` solo admite `objetivo`, `iniciativa` y `plan`: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L32-L37). Los estilos de segmento también cubren exclusivamente esas tres variantes: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L314-L337).

Diagnóstico.

Las barras activas hoy son:

- Objetivo.
- Iniciativa plan.
- Entrega plan.

### 6.2 Marcadores activos hoy

Evidencia.

No existe ya un tipo `MarcadorCronograma` en la página actual, y el render del lienzo itera únicamente `fila.segmentos.map(...)`: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L40-L53), [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1547).

Diagnóstico.

En la vista principal actual no hay marcadores activos visibles de entrega real, fecha objetivo, completada ni releases.

### 6.3 Capas que aún se calculan

Evidencia.

Aunque el lienzo principal ya no las muestra, la página todavía sigue cargando releases y agrupándolos por iniciativa: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L531), [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L596), [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L656-L665). También sigue usando releases para el detalle textual de objetivos e iniciativas: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1019-L1035), [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1075). Además, `aniosDisponibles` todavía incorpora `fecha_objetivo`, `fecha_completado` y releases en su cálculo: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L668-L717).

Diagnóstico.

La limpieza de señales visibles es real en render, pero no total a nivel de insumos laterales. Persisten residuos funcionales e informativos históricos en tres zonas:

- Carga de releases.
- Conteos textuales de releases en detalles de fila.
- Cálculo de años disponibles basado también en fechas históricas y releases.

Esto no rompe la vista, pero demuestra que la página aún arrastra complejidad residual fuera del lienzo principal.

### 6.4 Si la vista principal ya quedó enfocada en planificación

Diagnóstico.

Sí, en el lienzo principal la vista ya está enfocada en planificación. El ruido visual principal fue retirado. Lo que sigue existiendo es complejidad residual en datos auxiliares y resúmenes, no en la superficie principal del timeline.

## 7. Auditoría de la leyenda / referencia

Qué muestra.

La leyenda final solo muestra tres entradas: Objetivo, Iniciativa plan y Entrega plan: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1599-L1611).

Si coincide con el render real.

Sí. Coincide con el tipo de segmentos permitido y con los estilos realmente renderizados: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L32-L37), [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L314-L337).

Inconsistencias residuales.

No se detectan inconsistencias en la leyenda actual. La referencia ya no arrastra hitos ni releases que no estén dibujados. En este punto, volver a pedir limpieza de leyenda sería redundante.

## 8. Auditoría de tooltips

Qué elementos usan tooltip.

Evidencia.

La página usa un solo `TooltipCronograma` custom con posicionamiento `fixed` y recálculo por `scroll` y `resize`: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L95-L201).

Hoy hay tooltips sobre:

- Línea de HOY: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1435-L1450)
- Título de fila en la jerarquía: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1492-L1518)
- Badge de desvío: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1527-L1531)
- Barras temporales: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1564-L1588)

Contenido.

El contenido actual es coherente con el estado visible:

- HOY muestra fecha real actual.
- El título muestra nombre, estado, rango, contexto temporal, resumen y detalle.
- El desvío muestra una razón simple y útil.
- La barra muestra título, tipo de rango y fechas.

Posicionamiento.

El tooltip es más robusto que un hover básico porque calcula centro, revisa espacio superior/inferior y reacciona a scroll y resize. Aun así, sigue siendo una solución artesanal colocada dentro del mismo archivo, no una capa de overlay especializada. Su robustez actual es suficiente, pero no sobresaliente.

Utilidad real.

La utilidad es buena. Ya no hay tooltips residuales de marcadores retirados, lo cual reduce ruido.

Problemas detectados.

- No se detecta basura de tooltips sobre señales ya no renderizadas.
- La solución sigue siendo custom y manual, lo que la hace más frágil a futuro que un patrón de overlay dedicado.
- El tooltip de fila todavía mezcla información de rango con detalles heredados como ventana textual o conteos de releases en ciertas filas, lo que preserva algo de semántica histórica fuera del lienzo principal.

## 9. Comparación funcional con la inspiración tipo Jira

### 9.1 Qué ya está logrado

- Existe separación visual entre jerarquía y timeline.
- La columna izquierda queda fija durante el scroll horizontal.
- La cabecera temporal queda fija en vertical.
- El timeline tiene grilla mensual legible.
- La línea de HOY ya es continua y está anclada al panel temporal.
- La vista principal está visualmente menos ruidosa.

### 9.2 Qué está parcialmente logrado

- Sensación de panel temporal diferenciado: sí existe, pero depende de sticky y separador visual, no de un contenedor autónomo.
- Scroll asociado al timeline: parcial. Funcionalmente parece del timeline, estructuralmente no lo es.
- Claridad ejecutiva: buena en barras principales, parcial en detalles laterales por residuos de semántica histórica.

### 9.3 Qué todavía falta

- Un panel temporal derecho realmente independiente a nivel de scroll horizontal.
- Un scrollbar inferior que se perciba perteneciente solo al timeline.
- Un refinamiento final del layout para que el corte entre paneles sea estructural, no solo visual.

### 9.4 Qué sería redundante pedir

- Volver a limpiar la leyenda principal.
- Volver a retirar marcadores visuales ya eliminados.
- Pedir de nuevo una línea de HOY continua.
- Pedir tooltip de HOY como mejora pendiente, porque ya existe.

## 10. Hallazgos críticos

### P0

No se detectaron hallazgos P0.

### P1

| Título | Descripción | Evidencia | Impacto visual | Impacto funcional | Impacto técnico | Riesgo |
| --- | --- | --- | --- | --- | --- | --- |
| El scroll horizontal pertenece al bloque completo y no al panel temporal | La vista usa un único `overflow-x-auto` envolviendo el ancho total de jerarquía más timeline. La columna izquierda queda fija por `sticky`, pero el scrollbar inferior no nace de un panel derecho autónomo. | [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1379-L1385) | Alto: la percepción de corte entre paneles queda incompleta | Medio: no rompe uso, pero deteriora ergonomía y lectura espacial | Medio: exige ajuste estructural de contenedor, no de lógica temporal | Medio |
| La separación entre jerarquía y timeline es visualmente fuerte, pero estructuralmente incompleta | Hay grilla de dos columnas, sticky de columna izquierda y separador absoluto, pero no dos scroll containers sincronizados. | [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1383-L1409), [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1461-L1463) | Alto: sensación de “tabla ancha” en vez de “panel timeline” | Bajo: no rompe interacción básica | Medio: requiere rediseñar wrapper, no datos | Medio |

### P2

| Título | Descripción | Evidencia | Impacto visual | Impacto funcional | Impacto técnico | Riesgo |
| --- | --- | --- | --- | --- | --- | --- |
| Persisten residuos históricos fuera del lienzo principal | Aunque el render principal ya es plan-focused, la vista sigue cargando releases, agrupándolos y mostrándolos en resúmenes textuales. | [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L531), [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L596), [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L656-L665), [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1019-L1035) | Bajo: no vuelve a contaminar el lienzo | Medio: conserva semántica vieja en detalles y cómputos laterales | Bajo-medio: deuda localizada | Bajo |
| El cálculo de años disponibles todavía usa señales históricas ya no prioritarias para la vista principal | `aniosDisponibles` incorpora `fecha_objetivo`, `fecha_completado` y releases. | [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L668-L717) | Bajo | Bajo-medio: puede ampliar años visibles por señales no centrales del lienzo actual | Bajo | Bajo |
| Los tooltips siguen siendo una implementación custom manual | El tooltip se posiciona con lógica local y listeners de ventana. Funciona, pero no es una solución especializada. | [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L95-L201) | Bajo | Bajo | Bajo-medio | Bajo |

## 11. Validación de hipótesis

| Hipótesis | Estado | Evidencia | Comentario |
| --- | --- | --- | --- |
| La columna izquierda y el timeline ya tienen cierta separación | Confirmada | [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1383-L1409), [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1461-L1463) | Existe separación visual y sticky real |
| El scroll horizontal pertenece solo al panel derecho | Refutada | [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1379-L1380) | Pertenece al wrapper total |
| La barra inferior invade perceptualmente el ancho total | Confirmada | Inferencia basada en un único wrapper `overflow-x-auto` y min-width total en [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1379-L1380) | La columna queda fija, pero el scrollbar no está recortado al timeline |
| La línea de HOY sigue simulada por fila | Refutada | [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1428-L1450) | Ahora es una capa única continua |
| La leyenda principal ya fue limpiada | Confirmada | [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1599-L1611) | Coincide con el render real |
| La vista principal sigue mostrando marcadores/hitos históricos | Refutada | [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L32-L37), [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1547) | No hay marcadores visibles en el lienzo principal |
| La vista principal ya está centrada en planificación | Confirmada | Variantes de segmento y leyenda actuales en [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L32-L37), [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1599-L1611) | Persisten residuos auxiliares, pero no en el render principal |
| Las mejoras inspiradas en Jira faltan por completo | Parcial | Sticky y separación visual ya existen; panel scrollable independiente no | Hay base sólida, pero incompleta |

## 12. Qué conviene mejorar y qué no

Mejoras recomendadas.

- Separar estructuralmente el panel temporal derecho en su propio contenedor horizontal scrolleable.
- Mantener la columna izquierda como panel fijo real y no solo sticky dentro del mismo scroll wrapper.
- Revisar si los resúmenes textuales deben seguir mencionando releases en esta vista principal.
- Revisar si `aniosDisponibles` debe seguir ampliándose por fechas y releases que ya no gobiernan el lienzo principal.

Cosas que no conviene tocar.

- No conviene rehacer la línea de HOY.
- No conviene volver a limpiar la leyenda principal.
- No conviene reabrir la discusión de marcadores visibles en esta vista principal.
- No conviene tocar filtros ni jerarquía expandible para resolver el problema de scroll.

Cosas que solo requieren refinamiento.

- El layout scrollable.
- La identidad espacial del timeline como panel.
- Algunos detalles textuales laterales todavía cargados de semántica histórica.
- La ergonomía del tooltip custom, si se quisiera endurecer más adelante.

## 13. Recomendación final

Cuál es el siguiente ajuste correcto.

El siguiente ajuste correcto es atacar el layout y el scroll, no la semántica temporal ni la leyenda. En concreto, conviene desacoplar estructuralmente el panel izquierdo del panel temporal para que el scrollbar horizontal pertenezca visual y funcionalmente al timeline derecho.

Qué conviene tocar primero.

Primero layout y scroll. Después, si todavía hace falta, refinamientos menores del timeline. Leyenda y línea de HOY no deberían ser prioridad ahora porque ya están suficientemente resueltas.

Plan prudente sin romper nada.

1. Mantener intacta la lógica de armado de filas y segmentos.
2. Reorganizar únicamente wrappers de layout para separar panel izquierdo y panel temporal.
3. Conservar sticky, tooltips y línea de HOY como están, reubicándolos en la nueva estructura sin cambiar su semántica.
4. Revisar después los residuos auxiliares de releases y años disponibles solo si esa limpieza no compromete compatibilidad del módulo.

Respuesta explícita a las 10 preguntas pedidas.

1. La vista se estructura hoy como una sola página React con filtros, KPIs y un cronograma basado en una grilla de dos columnas dentro de un único wrapper con `overflow-x-auto`.
2. La columna izquierda y el timeline derecho están separados visualmente, pero no son paneles separados a nivel de contenedor de scroll.
3. El scroll horizontal pertenece al bloque completo, no al panel temporal derecho.
4. La línea de HOY está bien resuelta estructuralmente en el estado actual.
5. La leyenda actual coincide con lo que realmente se muestra.
6. La vista principal ya está enfocada en planificación, aunque todavía arrastra complejidad residual fuera del lienzo.
7. Ya existen sticky, separación visual entre paneles, grid temporal, línea de HOY continua, leyenda limpia y reducción previa de señales.
8. Falta implementar la separación estructural del scroll y consolidar al timeline como panel autónomo.
9. Está implementado a medias el concepto de panel temporal: visualmente sí, estructuralmente no.
10. El siguiente ajuste correcto es layout y scroll del timeline, no más limpieza semántica del render principal.

## 14. Anexo de evidencias

Funciones, componentes y estructuras relevantes.

- Componente principal: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L521)
- Tipo de segmentos visibles: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L32-L37)
- Tooltip base custom: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L95-L201)
- Estilos de barras por variante: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L314-L337)
- Carga de releases aún presente: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L531), [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L596), [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L656-L665)
- Cálculo de años con señales históricas: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L668-L717)
- Wrapper horizontal del cronograma: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1379-L1380)
- Cabecera sticky del cronograma: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1382-L1392)
- Cabecera sticky de jerarquía: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1385-L1390)
- Separador absoluto entre paneles: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1409-L1410)
- Handle de resize de jerarquía: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1412-L1426)
- Línea de HOY continua con tooltip: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1428-L1450)
- Columna izquierda sticky por fila: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1461-L1463)
- Tooltip de título de fila: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1492-L1518)
- Tooltip de desvío: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1527-L1531)
- Render de segmentos del timeline: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1547-L1588)
- Leyenda actual del cronograma: [PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1599-L1611)
