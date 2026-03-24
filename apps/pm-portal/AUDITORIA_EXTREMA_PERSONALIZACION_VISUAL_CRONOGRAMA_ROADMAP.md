# AUDITORIA EXTREMA DE PERSONALIZACION VISUAL DEL CRONOGRAMA ROADMAP

## 1. Resumen ejecutivo

### Veredicto general

Si conviene incorporar un menu de personalizacion visual en la vista Cronograma, pero con un alcance inicial muy contenido.

La evidencia del codigo muestra que el Cronograma ya tiene:

- una franja superior con acciones consolidadas y patron claro de controles compactos
- varios estados visuales persistidos en `localStorage`
- un componente propio de tooltip encapsulado en la misma pagina
- un resumen ejecutivo colapsable ya persistido
- patrones reutilizables de menu flotante pequeno en el propio modulo Roadmap

Eso hace viable agregar un boton adicional de personalizacion en la zona superior derecha sin romper la arquitectura actual, siempre que se mantenga como control compacto, sin texto dominante y sin ampliar la altura de filas ni del header.

### Recomendacion de producto

Lanzar primero solo un switch:

- `Mostrar tooltips`

No recomiendo lanzar de inmediato `Mostrar progreso` dentro de Cronograma sin antes extraer y formalizar la logica de progreso que hoy vive acoplada a la vista Resumen del Roadmap.

### Motivo principal

El switch de tooltips es de bajo acoplamiento y tiene una implementacion probable limpia: el Cronograma usa un unico wrapper `TooltipCronograma` para la mayoria de ayudas visuales, y ese wrapper ya expone una propiedad `disabled`.

En cambio, el switch de progreso hoy no es un simple toggle visual. Requiere resolver primero:

- de donde sale la metrica exacta
- a que nivel se muestra
- como se evita duplicar la logica de `PaginaRoadmap`
- como se integra sin aumentar densidad, wraps ni altura de fila

### Alcance minimo seguro recomendado

Fase 1:

- boton compacto de personalizacion en header
- popover pequeno
- switch `Mostrar tooltips`
- persistencia local por navegador y exclusiva del Cronograma

Fase 2, solo si se valida diseno y extraccion de logica:

- switch `Mostrar progreso`
- indicador solo en objetivo e iniciativa
- reutilizando un selector compartido de progreso, no logica duplicada dentro de la pagina

---

## 2. Alcance auditado

Se auditaron archivos reales del modulo Roadmap y del Cronograma:

- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx`
- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/ControlTemporalCronograma.tsx`
- `apps/pm-portal/src/presentacion/paginas/roadmap/NavegacionRoadmap.tsx`
- `apps/pm-portal/src/presentacion/paginas/roadmap/componentes/MenuCrearRoadmapGlobal.tsx`
- `apps/pm-portal/src/presentacion/paginas/roadmap/componentes/MenuContextualFilaRoadmap.tsx`
- `apps/pm-portal/src/presentacion/paginas/roadmap/PaginaRoadmap.tsx`

Tambien se revisaron patrones transversales de UI en `src/presentacion/**` para confirmar si existen:

- switches reutilizables
- menus o popovers pequenos
- persistencia de preferencias UI
- indicadores de progreso reutilizables

No se audito backend, base de datos ni integraciones remotas porque no son necesarias para esta decision.

---

## 3. Estado actual del header del cronograma

## 3.1 Estructura actual

La cabecera del Cronograma esta construida en dos niveles:

1. Header de pagina:
- titulo `Cronograma`
- `NavegacionRoadmap` con tabs `Resumen`, `Cronograma`, `Objetivos`, `Iniciativas`, `Entregas`

2. Franja operativa superior del bloque principal del cronograma:
- buscador interno
- chips de resumen de filtros activos
- `Crear` con menu desplegable si el rol permite edicion
- `Resumen` como toggle persistido
- `Filtros` como toggle de panel
- `Exportar` como boton iconico con tooltip
- `Expandir cronograma` como boton iconico con tooltip

Esta franja esta implementada con `flex flex-wrap items-center justify-between gap-3`, y el grupo derecho tambien usa `flex flex-wrap items-center gap-2`. Eso indica dos cosas:

- hay intencion explicita de tolerar wrap en anchos menores
- el header ya esta cerca de su nivel razonable de densidad, pero aun admite un control iconico adicional

## 3.2 Espacio real para un boton de personalizacion

Si hay espacio real, pero no para otro boton verbal del mismo peso que `Resumen` o `Filtros`.

La solucion coherente no es otro boton con texto largo, sino un control compacto de icono, preferiblemente alineado con `Exportar` y `Expandir`, porque:

- esas acciones ya son iconicas y secundarias
- compiten menos con `Crear`, `Resumen` y `Filtros`
- permiten mantener la lectura principal del header

### Conclusiones de layout

- En desktop, un boton iconico extra es viable.
- En tablet y anchos intermedios, el layout ya depende de `flex-wrap`, por lo que un control mas con texto aumentaria ruido y saltos de linea.
- En mobile o anchos estrechos, un icono de ajustes es claramente mas prudente que un boton textual adicional.

## 3.3 Patrones reutilizables ya existentes

Dentro del mismo Roadmap ya existen dos patrones pequenos y reutilizables:

- `MenuCrearRoadmapGlobal.tsx`
  - boton con `aria-haspopup="menu"`
  - cierre por click afuera y `Escape`
  - focus inicial al primer item con `requestAnimationFrame`
  - panel absoluto `right-0 top-12`

- `MenuContextualFilaRoadmap.tsx`
  - menu flotante pequeno por fila
  - mismo patron de cierre y foco

Adicionalmente, `ControlTemporalCronograma.tsx` ya usa un panel expandible compacto a la derecha inferior del cronograma, confirmando que el modulo tolera micro-paneles contextuales y no necesita inventar una nueva familia visual.

## 3.4 Persistencia y patrones de preferencias en el Cronograma

El Cronograma ya persiste estados UI en `localStorage` con claves propias:

- `pm-portal-roadmap-cronograma-ancho-jerarquia`
- `pm-portal-roadmap-cronograma-objetivos-expandidos`
- `pm-portal-roadmap-cronograma-iniciativas-expandidas`
- `pm-portal-roadmap-cronograma-resumen-visible`
- `pm-portal-roadmap-cronograma-preferencias-temporales`

Ademas, combina `useSearchParams` para estado compartible del contexto temporal y filtros:

- `vista`
- `anio`
- `trimestre`
- `objetivo`
- `estado`
- `ventana`

Esto es importante porque ya existe una separacion implicita de responsabilidades:

- `query string` para contexto navegable o compartible
- `localStorage` para preferencias visuales o de ergonomia local

### Diagnostico

El header del Cronograma si tiene coherencia UX y tecnica para recibir un boton adicional de personalizacion, siempre que sea:

- compacto
- secundario
- sin desplazar la jerarquia actual
- apoyado en patrones de menu ya existentes

---

## 4. Estado actual de tooltips

## 4.1 Donde y como se renderizan hoy

Los tooltips del Cronograma no vienen de una libreria compartida. Estan implementados dentro de `PaginaCronogramaRoadmap.tsx` como un componente local llamado `TooltipCronograma`.

Ese componente:

- gestiona su propio estado `abierto`
- calcula posicion con `getBoundingClientRect`
- escucha `resize` y `scroll`
- soporta apertura por `mouse enter`, `mouse move` y `focus`
- renderiza un popup con `role="tooltip"`
- ya acepta `disabled?: boolean`

La propiedad `disabled` es la evidencia tecnica mas importante para esta auditoria: el apagado global de tooltips es estructuralmente viable sin reescribir el patron completo.

## 4.2 Tipos de tooltip detectados

Hoy no existe un solo tooltip. Hay varios usos distintos del mismo wrapper:

### A. Tooltips de acciones del header

- exportar CSV
- expandir o restaurar cronograma

Estos ya tienen ademas `aria-label` y `title`, por lo que el tooltip custom es una ayuda redundante, no una dependencia critica.

### B. Tooltip del titulo de fila

Sobre el texto del objetivo, iniciativa o entrega se muestra:

- titulo completo
- descripcion del registro si existe

Este tooltip es mas relevante porque da contexto adicional que no siempre esta visible en la fila truncada a dos lineas.

### C. Tooltip del badge `Desvio`

Explica que la fila tiene entregas con fecha objetivo vencida aun sin completar.

### D. Tooltip del marcador `Hoy`

Muestra la fecha larga del dia actual sobre la linea vertical del timeline.

### E. Tooltip de segmentos del timeline

Cada barra temporal muestra:

- fecha de inicio
- fecha de fin

Este es uno de los usos mas densos del sistema porque potencialmente se replica muchas veces dentro del timeline.

## 4.3 Datos que muestran hoy

Los tooltips del Cronograma hoy muestran solo ayudas de lectura, no acciones criticas:

- etiquetas de accion secundaria
- descripcion larga de registros
- explicacion de desvio
- fechas del marcador hoy
- inicio y fin de los segmentos

No se detecto que un tooltip sea la unica via para ejecutar una accion o acceder a una entidad.

## 4.4 Dependencias y acoplamiento tecnico

`TooltipCronograma` depende de:

- estado local React
- refs a ancla y tooltip
- eventos de ventana para reposicionamiento
- contenido arbitrario `ReactNode`

No depende de stores globales, contexto ni servicios externos.

Esto hace que el switch `Mostrar tooltips` sea tecnicamente facil de introducir.

## 4.5 Facilidad real de apagado global

La viabilidad tecnica es alta porque:

- hay un solo componente de tooltip dentro de la pagina
- la mayoria de usos pasan por ese wrapper
- el wrapper ya tiene `disabled`

Eso sugiere un camino limpio futuro:

- preferencia global booleana del cronograma
- prop `disabled={!mostrarTooltips}` en las instancias

## 4.6 Riesgos y matices del apagado

### Riesgo 1: perdida de informacion contextual no visible en fila

Si se apagan tooltips, se pierde el acceso rapido a:

- descripciones de objetivo, iniciativa y entrega
- fechas exactas de segmentos
- explicacion del badge de desvio

No rompe la operacion base, pero si reduce riqueza interpretativa.

### Riesgo 2: accesibilidad inconsistente ya existente

El componente escucha `onFocus`, pero varios anchors de tooltip no son elementos enfocables por teclado:

- titulos de fila envueltos sobre texto no interactivo
- badge `Desvio`
- linea `Hoy`
- segmentos del timeline

Conclusiones:

- parte de los tooltips ya son efectivamente mouse-first
- el switch no empeora de forma estructural la accesibilidad existente
- tampoco resuelve la deuda actual de accesibilidad

### Riesgo 3: granularidad futura

Desde UX, un unico switch `Mostrar tooltips` es aceptable para una primera iteracion.

Pero tecnicamente hay al menos dos familias distintas:

- tooltips de accion secundaria del header
- tooltips semanticos de lectura del timeline y filas

Si en el futuro hay feedback de usuarios avanzados, podria tener sentido separar:

- `Mostrar ayudas del timeline`
- `Mostrar ayudas de acciones`

No lo recomiendo para la primera fase porque seria sobredisenar.

## 4.7 Veredicto sobre el switch `Mostrar tooltips`

### Conclusion

Si es viable, limpio y seguro.

### Condiciones para que siga siendo seguro

- debe ser una preferencia solo visual
- no debe alterar el DOM base ni la altura de filas
- debe limitarse a habilitar o deshabilitar `TooltipCronograma`
- no debe eliminar `aria-label` ni `title` ya presentes en botones de accion

---

## 5. Estado actual del progreso

## 5.1 Donde existe hoy la logica de progreso

La logica de progreso derivado no esta en el Cronograma. Hoy vive en `PaginaRoadmap.tsx`, dentro del bloque `Progreso por objetivo`.

Alli se calcula `progresoPorObjetivo` con `useMemo`, usando:

- objetivos filtrados
- iniciativas filtradas
- entregas filtradas

El calculo deriva, por objetivo:

- total de iniciativas y entregas relacionadas
- completadas
- pendientes
- en progreso
- proximas
- `porcentaje = completadas / totalRelacionadas`
- `puntajeActividad`

Luego ese progreso se renderiza como:

- porcentaje numerico
- barra horizontal con `role="progressbar"`
- contador `completadas / totalRelacionadas`

## 5.2 Fuente y semantica del progreso actual

La fuente real del progreso es el estado de iniciativas y entregas asociadas al objetivo.

No es un campo persistido del objetivo.

Eso implica que el progreso es:

- derivado
- contextual a los filtros aplicados en la vista
- calculado en cliente

## 5.3 Reutilizacion posible en Cronograma

La reutilizacion conceptual es posible, pero hoy la reutilizacion tecnica es pobre porque la logica esta embebida en `PaginaRoadmap.tsx` y no extraida a un selector o helper compartido.

Eso significa que agregar progreso a Cronograma sin refactor previo empuja a una de estas dos opciones, ambas malas si se hacen con prisa:

- duplicar la logica dentro de `PaginaCronogramaRoadmap.tsx`
- importar logica acoplada a una vista que hoy no esta diseñada como modulo reusable

## 5.4 Existe algo parecido ya en Cronograma

No existe hoy un indicador visual de progreso por fila dentro del Cronograma.

Lo que si existe es:

- badge de estado
- titulo truncado
- indicador `Desvio`
- segmentos temporales
- resaltado de fila activa

Esto significa que el progreso seria una nueva capa visual, no una extension de un patron ya presente en la fila.

## 5.5 Nivel prudente para mostrar progreso

La lectura del codigo sugiere el siguiente orden de prudencia:

### Mas prudente

- objetivo

Porque ya existe calculo probado en Resumen a ese nivel.

### Prudente con refactor previo

- iniciativa

Pero hoy no existe calculo reutilizable formal para iniciativa, por lo que habria que definir su semantica exacta:

- porcentaje por entregas hijas completadas
- que hacer si no tiene entregas
- si su propio `estado` debe influir o no

### Poco prudente para una primera iteracion

- entregable

Porque una entrega ya tiene estado final suficiente y agregar progreso a ese nivel seria ruido semantico.

## 5.6 Impacto en densidad visual del Cronograma

Este es el punto critico.

Las filas del Cronograma ya estan muy optimizadas:

- altura minima fija `48px`
- titulo truncado a dos lineas
- badge de estado
- posible badge de desvio
- menu contextual
- timeline paralelo

Agregar progreso como barra adicional dentro de la zona de jerarquia tiene riesgos directos:

- wrap horizontal del cluster de badges
- crecimiento de altura en filas con titulos largos
- perdida de limpieza visual en objetivo e iniciativa
- competencia visual con estado, desvio y accion contextual

## 5.7 Integracion sin alterar altura o padding

Solo seria razonablemente segura si el progreso se representa como un elemento extremadamente compacto, por ejemplo:

- porcentaje corto en badge pequeno
- micro-indicador en la misma linea de metadatos
- senal discreta sin segunda linea ni barra expandida

Lo que no conviene:

- barra de progreso debajo del titulo
- bloque apilado nuevo
- texto descriptivo adicional por fila
- cualquier elemento que fuerce mas altura o padding vertical

## 5.8 Veredicto sobre el switch `Mostrar progreso`

### Conclusion

Es viable en terminos de producto, pero todavia no es una mejora limpia ni segura para una primera fase tecnica.

### Motivos

- la logica actual esta acoplada a `PaginaRoadmap.tsx`
- no existe selector compartido reusable
- no existe hoy patron visual de progreso dentro de las filas del Cronograma
- la vista ya esta muy densa y optimizada en altura

### Recomendacion

No lanzar `Mostrar progreso` en la primera fase del menu de personalizacion.

Si se decide avanzar despues, hacerlo solo tras:

1. extraer la logica a una utilidad compartida o selector
2. definir semantica para objetivo e iniciativa
3. validar una representacion visual que no cambie altura, padding ni wraps

---

## 6. Persistencia recomendada

## 6.1 Opcion recomendada

Para esta mejora conviene `localStorage`.

## 6.2 Motivo

Ya es el patron dominante del propio Cronograma para preferencias de ergonomia local:

- ancho de columna
- expansion de objetivos
- expansion de iniciativas
- resumen visible
- preferencias temporales del cronograma

En contraste, el `query string` hoy se usa para estados que tienen sentido de navegacion o comparticion:

- vista temporal
- anio y trimestre
- filtros activos

Los switches `Mostrar tooltips` y `Mostrar progreso` no son buen candidato a query string porque:

- no forman parte del contexto de negocio
- no es necesario compartirlos entre usuarios
- agregarian ruido al URL
- mezclarian estado visual local con filtros funcionales

## 6.3 Persistencia entre recargas

Si deberian persistir entre recargas.

Es coherente con el patron ya existente del Cronograma y evita que el usuario tenga que reconfigurar preferencias de lectura cada vez.

## 6.4 Alcance de la persistencia

Deberian ser:

- locales al navegador del usuario
- exclusivas del Cronograma
- no compartidas automaticamente con otras vistas del Roadmap

## 6.5 Riesgo de inconsistencia

El principal riesgo no es tecnico sino de producto: si mas adelante otras pantallas del Roadmap introducen la misma idea de personalizacion visual con nombres distintos, aparecera fragmentacion.

Hoy, con la evidencia disponible, no existe aun un sistema unificado de preferencias visuales del Roadmap. Por eso no conviene forzar una abstraccion global prematura.

### Recomendacion de naming futuro

Si se implementa, mantener claves claramente scoped, por ejemplo:

- `pm-portal-roadmap-cronograma-tooltips-visible`
- `pm-portal-roadmap-cronograma-progreso-visible`

Eso preserva consistencia con las claves actuales.

---

## 7. Diseno UX recomendado

## 7.1 Ubicacion del boton

Debe ir en la parte superior derecha de la franja operativa del cronograma, junto al grupo de acciones secundarias.

La mejor zona es:

- entre `Filtros` y `Exportar`, o
- entre `Exportar` y `Expandir`

Mi recomendacion principal es ubicarlo junto a los iconos secundarios, no junto a `Crear`.

## 7.2 Tipo de icono

Recomiendo un icono de ajustes o sliders.

No recomiendo tres puntos para este caso porque:

- el sistema ya usa tres puntos para menu contextual por fila
- podria confundirse con acciones overflow, no con preferencias visuales

Tampoco recomiendo un engranaje demasiado pesado si visualmente rompe la ligereza del header. El mejor equilibrio es un icono de sliders o controles.

## 7.3 Tipo de contenedor

Recomiendo un popover pequeno o dropdown alineado a la derecha.

No recomiendo panel lateral porque:

- para dos switches es sobredimensionado
- mete demasiado peso interactivo en una preferencia menor
- compite innecesariamente con el contenido principal

El patron del propio `MenuCrearRoadmapGlobal` ya demuestra que un popover pequeno es consistente con el modulo.

## 7.4 Cantidad razonable de switches iniciales

Al inicio deben mostrarse solo dos como maximo.

Idealmente en la primera fase visual del menu:

- `Mostrar tooltips`
- `Mostrar progreso` solo si se aprueba para una fase posterior

Si el progreso no entra en la primera fase, el menu puede nacer con un solo switch. Eso no invalida el patron siempre que el boton tenga nombre claro de personalizacion y deje espacio para crecimiento futuro.

## 7.5 Etiquetas recomendadas

Etiquetas principales recomendadas:

- `Mostrar tooltips`
- `Mostrar progreso`

Son suficientemente claras, no tecnicas y consistentes con el lenguaje de la vista.

## 7.6 Descripciones secundarias

### Para primera fase

No recomiendo descripcion debajo de cada switch si solo hay uno o dos.

Razones:

- aumentan altura del popover
- agregan densidad innecesaria
- el cronograma ya privilegia compacidad

Si se considera imprescindible, solo usar una descripcion corta y tenue en el caso de progreso, nunca en tooltip.

Ejemplo de descripcion futura opcional:

- `Muestra indicadores derivados en objetivos e iniciativas`

Pero no lo pondria de inicio.

## 7.7 Como evitar recarga visual

Para que no compita con `Crear`, `Resumen`, `Filtros`, `Exportar` y `Expandir`, el control de personalizacion debe cumplir estas reglas:

- ser iconico y no textual en el header
- abrir popover compacto y no panel grande
- no incluir explicaciones largas
- no introducir contadores ni badges extra en el boton
- no usar colores de enfasis mas fuertes que `Resumen` o `Filtros`

---

## 8. Riesgos tecnicos

## 8.1 Riesgo de acoplar demasiada logica al Cronograma

`PaginaCronogramaRoadmap.tsx` ya concentra mucha responsabilidad:

- carga de datos
- filtros
- persistencia local
- sincronizacion con query string
- expansion de jerarquia
- resize de columnas
- fullscreen
- tooltips
- timeline y medicion de alturas
- modales y menu contextual

Agregar personalizacion sin disciplina puede volver la pagina mas fragil.

### Mitigacion

- mantener el estado de preferencias visuales muy pequeno
- no mezclarlo con filtros funcionales
- si se agrega progreso, extraer calculos antes de pintar UI nueva

## 8.2 Riesgo de duplicar logica de progreso

Es el riesgo tecnico mas claro de esta auditoria.

Si se implementa progreso en Cronograma copiando el `useMemo` de `PaginaRoadmap`, se generan:

- reglas dobles
- riesgo de divergencia futura
- inconsistencias entre Resumen y Cronograma

### Mitigacion

- extraer un selector compartido de progreso antes de activar el switch

## 8.3 Riesgo de layout shift

Si el progreso se representa con elementos apilados, puede causar:

- crecimiento de altura de fila
- re-medicion continua de `ResizeObserver`
- desalineacion entre columna de jerarquia y timeline

Esto es especialmente sensible porque el cronograma ya sincroniza alturas y usa medicion DOM por fila.

## 8.4 Riesgo de interferir con hover y foco

El Cronograma ya usa hover y foco para:

- activar resaltado de fila
- mostrar menu contextual de fila
- mostrar tooltips

Un mal manejo del nuevo popover podria:

- cerrar menus abiertos al interactuar con personalizacion
- dejar estados hover pegados
- introducir colisiones de foco con `Escape` o click afuera

### Mitigacion

- reutilizar el patron de `MenuCrearRoadmapGlobal`
- mantener eventos de cierre aislados

## 8.5 Riesgo de rendimiento visual

Apagar o encender tooltips no deberia ser costoso.

Pero mostrar progreso por fila en un arbol grande puede aumentar:

- cantidad de nodos renderizados
- complejidad de las celdas de jerarquia
- recomputaciones si la logica no se memoiza bien

---

## 9. Riesgos UX

## 9.1 Interfaz demasiado cargada

El header actual ya esta bien equipado. Otro boton textual lo volveria pesado.

### Mitigacion

- boton iconico secundario
- popover minimo

## 9.2 Ambiguedad de alcance

Si el usuario no entiende si el switch afecta:

- solo esta sesion
- todo el Roadmap
- solo este navegador

puede interpretar el comportamiento como inconsistente.

### Mitigacion

- hacer la preferencia silenciosamente persistente y local al navegador
- no prometer alcance global del modulo

## 9.3 Progreso visual ambiguo

Sin una definicion clara, `Mostrar progreso` puede inducir interpretaciones incorrectas:

- progreso del objetivo como estado subjetivo
- progreso solo por entregas completadas
- progreso segun rango visible o segun total historico

Ese riesgo es mayor porque el Cronograma es una vista temporal, no una tarjeta ejecutiva.

### Mitigacion

- no lanzar progreso hasta fijar semantica exacta

## 9.4 Perdida de ayudas al apagar tooltips

Si el usuario apaga tooltips y luego no entiende una barra o un desvio, podria percibir perdida de claridad.

### Mitigacion

- mantener el switch claramente reversible
- no hacer desaparecer labels criticas ni estados base

---

## 10. Que no tocar

En una futura implementacion de este menu de personalizacion, no deberian tocarse estas zonas salvo necesidad tecnica extraordinaria:

- semantica temporal del cronograma
- calculo de barras y segmentos
- logica de filtros existentes
- buscador interno
- fullscreen parcial del cronograma
- exportacion CSV
- scroll sincronizado horizontal
- resize de la columna de jerarquia
- altura minima de filas
- padding vertical actual de filas
- jerarquia visual objetivo > iniciativa > entregable
- menu contextual por fila
- modelo de datos del roadmap
- backend y base de datos

### Restriccion fuerte

No deberia introducirse ninguna solucion que:

- aumente altura de fila
- agregue padding vertical adicional
- rompa la alineacion entre jerarquia y timeline
- cambie la semantica del estado visible por badge

---

## 11. Recomendacion final

## 11.1 Conviene o no conviene

Si conviene implementar un menu de personalizacion visual en el Cronograma, pero no conviene lanzarlo con demasiadas opciones desde el inicio.

## 11.2 Que switch conviene lanzar primero

Lanzar primero:

- `Mostrar tooltips`

Porque:

- ya existe un wrapper unico reutilizable
- el comportamiento es puramente visual
- el riesgo de regresion es bajo
- no exige tocar layout de filas

## 11.3 Que switch no conviene lanzar todavia

No conviene lanzar todavia:

- `Mostrar progreso`

Hasta resolver:

- extraccion de logica de progreso desde `PaginaRoadmap`
- definicion semantica para iniciativa
- diseno visual sin impacto de altura ni wrap

## 11.4 Fases recomendadas

### Fase 1 - alcance minimo seguro

- boton de personalizacion iconico en header
- popover pequeno alineado a la derecha
- switch `Mostrar tooltips`
- persistencia en `localStorage`
- alcance solo Cronograma

### Fase 2 - solo con validacion previa

- extraccion de selector compartido de progreso
- definicion de progreso para objetivo e iniciativa
- validacion de representacion visual compacta
- switch `Mostrar progreso`

## 11.5 Orden recomendado de implementacion

1. Introducir el contenedor de personalizacion reutilizando patron de menu pequeno.
2. Agregar persistencia local exclusiva del Cronograma.
3. Conectar `Mostrar tooltips` al wrapper `TooltipCronograma`.
4. Validar accesibilidad, foco y ausencia de regressions de hover.
5. Recién despues evaluar `Mostrar progreso` con selector compartido.

## 11.6 Propuesta de alcance minimo seguro

La propuesta prudente y senior para no tensionar innecesariamente la vista es:

- un unico boton iconico de personalizacion en la franja superior derecha
- un popover con un solo switch inicial: `Mostrar tooltips`
- dejar el segundo slot reservado para `Mostrar progreso` pero no activarlo hasta cerrar la deuda de arquitectura y densidad visual

---

## 12. Decision sugerida

### Si la decision fuera hoy

Implementaria:

- menu de personalizacion: si
- switch `Mostrar tooltips`: si
- switch `Mostrar progreso`: no todavia

### Razon final

El Cronograma ya tiene base suficiente para personalizacion visual local, pero no tiene aun base suficientemente madura para introducir progreso derivado por fila sin riesgo de duplicacion de logica y sobrecarga visual.

La decision mas prudente es abrir el patron con el caso simple y seguro, y reservar el caso complejo para una segunda fase bien delimitada.