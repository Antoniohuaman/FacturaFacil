# AUDITORÍA EXTREMA EXHAUSTIVA — EXPORTABLE DE LA VISTA CRONOGRAMA DEL ROADMAP PM PORTAL

## 1. Objetivo de esta auditoría

Definir, con base en el código real del módulo, qué exportable conviene construir para la vista Cronograma del Roadmap, cuál debe ser su contrato funcional, qué opciones deben descartarse en una primera fase y qué riesgos existen antes de tocar implementación.

Esta auditoría no propone todavía cambios de código. El foco es decidir bien antes de construir.

## 1.1. Base real de revisión

Esta auditoría está basada en lectura directa del código y de la infraestructura real del módulo. Para sustentar el diagnóstico se revisaron, como mínimo, estas superficies:

- [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx)
- [src/presentacion/paginas/roadmap/cronograma/ControlTemporalCronograma.tsx](src/presentacion/paginas/roadmap/cronograma/ControlTemporalCronograma.tsx)
- [src/compartido/utilidades/csv.ts](src/compartido/utilidades/csv.ts)
- [src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx](src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx)
- [src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx)
- [src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx)
- [src/dominio/modelos.ts](src/dominio/modelos.ts)
- [apps/pm-portal/package.json](apps/pm-portal/package.json)

Validaciones concretas obtenidas de esa revisión:

- El cronograma sí usa rangos propios cuando existen y recién luego cae a fallbacks por ventana o agregación de hijos.
- La búsqueda no filtra una tabla simple: recompone subárboles y fuerza expansión efectiva para mostrar coincidencias.
- `filasCronograma` no es una colección neutra; depende de expansión efectiva y por tanto no puede tomarse sin más como contrato de exportación.
- El timeline visible recorta segmentos al rango activo antes de pintarlos, así que el DOM no es una verdad exportable fiel.
- El portal tiene patrón real de CSV en otras pantallas, pero no tiene dependencias para PDF visual ni `.xlsx`.

---

## 2. Veredicto ejecutivo

### Recomendación principal

El primer exportable que conviene construir para la vista Cronograma es un **CSV estructurado del cronograma derivado en el contexto actual**.

Eso significa:

- respetar rango temporal activo, filtros y búsqueda
- exportar la jerarquía del cronograma como datos tabulares estables
- reutilizar la misma lógica que hoy deriva filas y rangos temporales
- **no depender** de fullscreen, ancho de columna, scroll horizontal ni estado visual puntual del DOM

### Recomendación explícita de lo que NO conviene hacer primero

No conviene empezar por:

- PDF visual tipo screenshot de la vista
- impresión exacta del layout actual
- Excel `.xlsx` como primera entrega

### Motivo central

La vista Cronograma no es una lista plana. Es una **proyección temporal y jerárquica derivada en cliente**, construida desde múltiples fuentes y con reglas de fallback semántico. Eso hace que el exportable correcto no sea “capturar lo que se ve en pantalla”, sino **exportar honestamente el modelo derivado que la pantalla representa**.

---

## 3. Hallazgos principales

### 3.1. El Cronograma ya tiene una lógica compleja y madura de derivación temporal

La vista principal está concentrada en [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx).

Hallazgos clave:

- Carga datos de objetivos, iniciativas, entregas, releases, ventanas, etapas y configuración RICE desde cliente en una sola carga coordinada.
- Persiste parte del estado en URL con `useSearchParams`, lo cual convierte al cronograma en una vista contextual compartible.
- Persiste además preferencias visuales en `localStorage`: expansión, resumen visible, ancho de jerarquía y preferencias temporales.
- Deriva rangos temporales propios y de fallback para objetivo, iniciativa y entrega.
- Construye filas sintéticas como `Sin objetivo asignado` y `Sin iniciativa asignada`.
- Usa conteos agregados de releases y banderas de entregas atrasadas, pero no renderiza releases como barras propias.

Evidencia útil:

- Inicialización y sincronización de parámetros: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L734](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L734)
- Rango de objetivo con fallback: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L577](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L577)
- Rango de iniciativa con fallback: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L601](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L601)
- Rango de entrega con fallback: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L623](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L623)
- Reconstrucción jerárquica por búsqueda: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1187](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1187)
- Construcción de filas derivadas: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1451](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1451)

### 3.1.1. Hallazgo crítico: `filasCronograma` hoy depende del estado visual

Este punto es central para el exportable.

La colección que hoy termina renderizándose en pantalla no es una estructura puramente de negocio. Se arma con dependencia explícita de:

- `objetivosExpandidosEfectivos`
- `iniciativasExpandidasEfectivas`
- la autoexpansión inducida por `resultadoBusquedaCronograma`

Evidencia:

- expansión efectiva de objetivos: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1365](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1365)
- expansión efectiva de iniciativas: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1372](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1372)
- uso de esa expansión dentro de `filasCronograma`: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1515](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1515)

Conclusión fuerte:

Si la exportación se monta directamente sobre `filasCronograma`, el archivo dependerá de qué ramas estaban abiertas en ese momento y, bajo búsqueda activa, también de expansiones automáticas no decididas explícitamente por el usuario.

### 3.2. El portal sí tiene un patrón de exportación existente, pero solo para superficies tabulares

Roadmap ya exporta CSV en otras pantallas:

- objetivos: [src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx#L134](src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx#L134)
- iniciativas: [src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L317](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L317)
- entregas: [src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L457](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L457)

La utilidad existente es [src/compartido/utilidades/csv.ts](src/compartido/utilidades/csv.ts) y ya resuelve lo esencial:

- serialización básica
- comillas y separadores
- BOM UTF-8 para Excel
- descarga directa del archivo

Conclusión:

El sistema ya tiene una convención real para exportables simples. Lo razonable es extender ese patrón hacia Cronograma, no inventar primero una infraestructura de reporting completamente distinta.

### 3.3. No existe infraestructura actual para PDF, XLSX ni captura del DOM

En [package.json](package.json) del `apps/pm-portal` no hay dependencias para:

- `xlsx`, `exceljs`, `sheetjs`
- `jspdf`, `pdfmake`, `pdf-lib`
- `html2canvas`, `dom-to-image`, `puppeteer`, `playwright`

Eso significa que cualquier propuesta de PDF visual o Excel real no sería una extensión menor del estado actual: sería una **nueva capacidad técnica** con radio de cambio mayor.

### 3.4. El cronograma visible depende de dos cosas distintas: contexto de datos y estado de presentación

El módulo mezcla dos capas:

#### Capa de contexto de negocio

- rango temporal activo
- filtros por objetivo, estado y ventana
- búsqueda textual
- reglas de visibilidad temporal por solapamiento
- derivación de filas y segmentos

#### Capa de presentación local

- objetivos expandidos
- iniciativas expandidas
- fullscreen
- ancho de columna jerárquica
- scroll horizontal
- panel de filtros abierto/cerrado
- resumen visible

Evidencia útil:

- controles de cabecera: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1977](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1977)
- fullscreen: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1877](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1877)
- render temporal y barras: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L2345](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L2345)
- control temporal colapsable de UI: [src/presentacion/paginas/roadmap/cronograma/ControlTemporalCronograma.tsx#L37](src/presentacion/paginas/roadmap/cronograma/ControlTemporalCronograma.tsx#L37)

Conclusión:

El exportable correcto debe basarse en la primera capa. Si se amarra a la segunda, el archivo resultará frágil, inconsistente y difícil de explicar.

### 3.5. Hallazgo crítico: el DOM del timeline ya está recortado por la vista activa

La vista temporal no pinta los rangos “en bruto”. Antes de renderizar, el código recorta cada segmento al rango visible actual y recalcula su ancho relativo.

Evidencia:

- clipping de `inicioVisible` y `finVisible`: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L2347](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L2347)
- cálculo de ancho de barra contra `rangoTemporal.totalDias`: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L2354](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L2354)
- ancho del timeline según meses visibles: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1086](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1086)

Conclusión fuerte:

Capturar el DOM o intentar exportar “lo que se ve” no equivale a exportar el cronograma. Equivale a exportar una proyección visual ya transformada por rango activo, layout y viewport.

---

## 4. Qué está realmente exportando hoy el Roadmap y qué NO exporta el Cronograma

### Lo que sí existe hoy

- exportación CSV de listas filtradas
- exportación desde memoria cliente, sin backend adicional
- columnas explícitas definidas en cada pantalla
- patrón consistente: exportar la colección filtrada completa, no solo una página visible

Evidencia directa en código:

- objetivos: `exportarCsv(..., objetivosFiltrados)` en [src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx#L134](src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx#L134)
- iniciativas: `exportarCsv(..., iniciativasFiltradas)` en [src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L317](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L317)
- entregas: `exportarCsv(..., entregasFiltradas)` en [src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L457](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L457)
- utilidad compartida: [src/compartido/utilidades/csv.ts#L19](src/compartido/utilidades/csv.ts#L19)

Hay evidencia incluso documental de ese patrón en [IMPLEMENTACION_PROMPT_11_CIERRE_ROADMAP_OBJETIVOS_PM_PORTAL.md](IMPLEMENTACION_PROMPT_11_CIERRE_ROADMAP_OBJETIVOS_PM_PORTAL.md), donde se explicita que el CSV exporta la lista completa filtrada y no solo la página actual.

### Lo que NO existe en Cronograma

- botón propio de exportación
- modelo explícito de fila exportable
- selector puro separado para exportar el cronograma
- contrato decidido sobre si exportar solo filas expandidas o toda la estructura derivada
- infraestructura visual para “imprimir igual a pantalla”

Evidencia material:

- la banda superior del cronograma incluye búsqueda, crear, resumen, filtros y fullscreen, pero no exportación: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1917](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1917)

Conclusión:

La decisión pendiente no es simplemente agregar un botón. La decisión correcta es definir **qué representa el archivo**.

---

## 5. Naturaleza del problema: Cronograma no es una tabla, es una proyección derivada

La vista no expone directamente entidades persistidas tal cual vienen del dominio. Expone `FilaCronograma`, que combina:

- identidad real o sintética
- jerarquía
- estado
- resumen textual
- detalle textual
- rango visible derivado
- contexto temporal derivado
- segmentos de barra
- alerta de atraso

La estructura está modelada localmente en [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L58](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L58).

Esto tiene implicancias directas:

1. Un exportable “por entidad” no alcanza para explicar lo que el usuario ve.
2. Un exportable “por screenshot” capturaría el layout, pero no el modelo semántico.
3. El activo real a exportar es el **cronograma derivado**.

---

## 6. Opciones de exportable evaluadas

## Opción A. CSV estructurado del cronograma derivado

### Qué sería

Un archivo plano con una fila por nodo exportable del cronograma, incluyendo jerarquía y metadatos temporales.

### Ventajas

- Máxima compatibilidad con el patrón actual del portal.
- Reutiliza [src/compartido/utilidades/csv.ts](src/compartido/utilidades/csv.ts).
- No exige nuevas librerías.
- Es auditable y fácil de validar.
- Puede respetar filtros, rango temporal y búsqueda sin pelearse con el layout.
- Sirve para análisis posterior en Excel, Sheets o BI.

### Desventajas

- No replica visualmente la experiencia del diagrama.
- Requiere diseñar bien columnas y significado de las filas sintéticas.

### Viabilidad

**Muy alta.**

### Riesgo

**Bajo a medio**, si se implementa reutilizando exactamente la lógica derivada del cronograma.

## Opción B. Excel real `.xlsx`

### Qué sería

Un archivo de Excel con hojas, formato y potencialmente agrupaciones jerárquicas.

### Ventajas

- Mejor percepción ejecutiva que CSV.
- Permite múltiples hojas y mejor ergonomía para negocio.

### Desventajas

- No existe infraestructura actual.
- Introduce dependencia nueva.
- Aumenta superficie de bugs y mantenimiento.
- Si no hay contrato semántico claro, solo traslada el mismo problema a otro formato.

### Viabilidad

**Media**, pero no como primera fase.

### Riesgo

**Medio.**

## Opción C. PDF visual de la vista actual

### Qué sería

Un archivo que intente capturar el cronograma como se ve en pantalla.

### Ventajas

- Muy atractivo para stakeholders no técnicos.
- Útil para presentaciones o comité.

### Desventajas críticas

- No hay librerías ni pipeline actual para captura o generación PDF.
- El cronograma depende de scroll horizontal, clipping temporal, fullscreen y tamaños dinámicos.
- El DOM no representa de manera estable “todo el cronograma” como una página imprimible.
- Hay riesgo alto de que el archivo mienta por recortes, superposición o escala.
- La UX actual usa tooltips y pistas interactivas que no se traducen bien a PDF.

### Viabilidad

**Baja** como primera entrega.

### Riesgo

**Alto.**

## Opción D. Exportar “lo visible exacto” según expansión actual

### Qué sería

Generar un archivo a partir de `filasCronograma` tal como está renderizado en ese momento, respetando qué ramas están colapsadas.

### Ventajas

- Se parece a la sesión actual del usuario.

### Desventajas críticas

- El archivo dependería de un estado visual incidental.
- Dos usuarios con los mismos filtros podrían exportar cosas distintas solo por tener ramas distintas abiertas.
- El resultado sería difícil de explicar y de auditar.
- Con búsqueda activa, además, la propia pantalla altera la expansión efectiva para exponer coincidencias, así que “lo visible” no siempre equivale a una decisión manual del usuario.

### Viabilidad

**Alta técnicamente**, pero **mala como decisión de producto**.

### Riesgo

**Alto en semántica.**

---

## 7. Recomendación cerrada

### Exportable recomendado para Fase 1

**CSV estructurado del cronograma derivado del contexto actual, independiente del estado visual de expansión y layout.**

### Definición práctica

El archivo debe respetar:

- vista temporal activa: año o trimestre
- año y trimestre seleccionados
- filtros por objetivo, estado y ventana
- búsqueda textual activa

El archivo no debe depender de:

- fullscreen
- ancho de columna jerárquica
- scroll horizontal actual
- paneles abiertos o cerrados
- ramas manualmente expandidas o colapsadas

### Motivo

Eso conserva el contexto de análisis real, pero evita que la exportación quede contaminada por un estado de UI puramente local.

---

## 8. Contrato funcional recomendado del exportable

## 8.1. Unidad exportada

Una fila exportada debe representar un nodo del cronograma derivado:

- objetivo
- iniciativa
- entrega
- fila sintética de agrupación cuando corresponda

## 8.2. Fuente de verdad recomendada

No conviene exportar directamente desde el DOM ni desde la colección persistida sin procesar.

Conviene exportar desde un selector puro que reutilice:

- los filtros ya aplicados en `objetivosCronograma`, `iniciativasCronograma` y `entregasCronograma`
- las mismas reglas de rango usadas por `obtenerRangoPlanObjetivo`, `obtenerRangoPlanIniciativa` y `obtenerRangoPlanEntrega`
- la misma semántica de `describirContextoTemporalRango`

Punto clave:

La exportación no debe leer `filasCronograma` si eso hace que el archivo dependa del estado de expansión. Debe reutilizar la lógica derivada, pero no la capa presentacional incidental.

Traducción práctica:

- sí conviene reutilizar `objetivosCronograma`, `iniciativasCronograma`, `entregasCronograma`, cálculo de rangos y semántica temporal
- no conviene tomar la colección final pintada en pantalla como contrato exportable, porque esa colección ya llega alterada por expansión efectiva, búsqueda y clipping visual

Esto además coincide con el patrón arquitectónico del repositorio: las exportaciones deben reutilizar los arreglos filtrados y no duplicar filtros.

## 8.3. Columnas mínimas recomendadas

### Columnas estructurales

- `tipo_fila`
- `nivel`
- `id`
- `id_padre`
- `es_sintetica`
- `titulo`

### Columnas de contexto jerárquico

- `objetivo_id`
- `objetivo_nombre`
- `iniciativa_id`
- `iniciativa_nombre`

### Columnas de negocio

- `estado`
- `prioridad` cuando exista en la entidad real
- `resumen`
- `detalle`
- `tiene_hijos`
- `entrega_atrasada`

### Columnas temporales

- `rango_inicio`
- `rango_fin`
- `origen_rango`
- `contexto_temporal`
- `rango_visible_inicio`
- `rango_visible_fin`
- `vista_temporal`
- `anio`
- `trimestre` cuando aplique

### Columnas complementarias útiles

- `ventana_planificada`
- `fecha_objetivo`
- `fecha_completado`
- `cantidad_entregas`
- `cantidad_releases`

### Comentario importante

No todas las columnas aplican a todos los tipos de fila. Eso es aceptable. El CSV puede tener celdas vacías por tipo.

## 8.4. Convención de nombre de archivo recomendada

Algo del tipo:

`roadmap-cronograma-2026-anual.csv`

o

`roadmap-cronograma-2026-t2.csv`

Si hay filtros fuertes, puede agregarse un sufijo estable, pero sin sobrecargar demasiado el nombre.

## 8.5. Qué debe hacer con la búsqueda

La exportación debe respetar la búsqueda activa, porque la búsqueda ya altera el subconjunto analítico del cronograma.

Pero no debe depender de la autoexpansión visual que la búsqueda activa para mostrar resultados en pantalla.

## 8.6. Qué debe hacer con las filas sintéticas

Debe exportarlas explícitamente como filas válidas, no esconderlas.

Motivo:

- `Sin objetivo asignado` y `Sin iniciativa asignada` son parte de la verdad operativa del roadmap
- ocultarlas haría perder integridad del análisis

Eso sí: deben ir marcadas con `es_sintetica = true`.

---

## 9. Qué NO debe significar el exportable

El exportable de Fase 1 no debe prometer:

- réplica visual exacta del timeline
- paginación o maquetación de comité
- dibujo de barras en PDF
- exportación WYSIWYG del fullscreen
- trazado gráfico de releases como si hoy fueran una capa visual formal

Punto importante:

El cronograma hoy **cuenta** releases por objetivo e iniciativa, pero no los representa como segmentos temporales propios. Sería incorrecto que un futuro archivo sugiera una precisión visual que la propia vista aún no sostiene.

Evidencia:

- uso de releases para agregados: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1488](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1488)
- detalle por iniciativa con releases: [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1544](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1544)

---

## 10. Riesgos técnicos y de producto

## 10.1. Riesgo de exportar una verdad distinta a la pantalla

Si la exportación reimplementa reglas temporales en otro sitio, el archivo puede divergir de la vista.

Mitigación:

- extraer selector puro común
- no duplicar lógica de filtros ni de rangos

## 10.2. Riesgo de depender del estado de expansión

Si se exporta desde `filasCronograma` tal cual, el archivo dependerá de qué ramas estaban abiertas.

Si además hay búsqueda activa, dependerá también de la autoexpansión inducida por esa búsqueda.

Mitigación:

- separar contexto analítico de estado visual
- exportar árbol derivado completo del contexto actual

## 10.3. Riesgo semántico por rangos de fallback

Muchas barras no son rangos “propios”, sino inferidos por ventana o por hijos. Si el archivo no lo explicita, puede vender precisión falsa.

Mitigación:

- exportar `origen_rango`
- exportar `contexto_temporal`

## 10.4. Riesgo con fechas y zona horaria

La vista normaliza fechas mediante `new Date(...T00:00:00)` cuando no viene timestamp. Para exportación tabular conviene serializar fechas en formato portal y evitar reinterpretaciones innecesarias.

Mitigación:

- exportar strings normalizados, no objetos `Date`
- mantener convención consistente con las otras pantallas CSV

## 10.5. Riesgo de documento interno desactualizado

Existe documentación del repositorio que ya no refleja el estado real de exportaciones del portal. En [AUDITORIA_EXTREMA_PORTAL_PM.md](AUDITORIA_EXTREMA_PORTAL_PM.md) se afirma que no existe ningún CSV, pero el código actual sí tiene exportaciones CSV en varias pantallas.

Esto importa porque un diseño del exportable no debe apoyarse ciegamente en auditorías antiguas si contradicen el código vigente.

## 10.6. Riesgo de sobreprometer una versión ejecutiva demasiado pronto

Si se intenta arrancar con PDF bonito o Excel enriquecido, se eleva mucho el costo antes de fijar el contrato de datos.

Mitigación:

- primero estabilizar el exportable factual
- luego evaluar una capa ejecutiva sobre esa base

---

## 11. Propuesta de secuencia futura de implementación

Esta sección no implica cambiar nada ahora. Solo ordena la futura ejecución.

### Fase 1

- extraer un selector puro de filas exportables del cronograma
- definir contrato de columnas
- agregar acción `Exportar CSV` en la banda superior del Cronograma
- reutilizar [src/compartido/utilidades/csv.ts](src/compartido/utilidades/csv.ts)
- validar que el archivo respete filtros, búsqueda y rango temporal

### Fase 2

- evaluar exportable `.xlsx` si negocio realmente necesita hojas, agrupaciones o formatos enriquecidos

### Fase 3

- evaluar una salida ejecutiva visual, ya sea impresión estilizada o PDF, solo después de estabilizar el contrato factual

---

## 12. Criterios de aceptación recomendados para la futura implementación

1. El CSV debe respetar exactamente el contexto analítico actual: vista temporal, año, trimestre, filtros y búsqueda.
2. El CSV no debe depender de fullscreen, scroll ni ancho de jerarquía.
3. El CSV debe incluir filas sintéticas marcadas como tales.
4. Cada fila exportada debe poder explicarse desde la lógica ya usada por la pantalla.
5. El origen del rango temporal debe quedar explícito.
6. La exportación no debe duplicar filtros en una implementación paralela.
7. La exportación debe seguir el patrón del portal: colección completa del contexto filtrado, no “solo lo que entra en viewport”.

---

## 13. Preguntas de producto que conviene cerrar antes de programar

1. ¿El usuario espera un archivo para análisis operativo o un archivo para presentación ejecutiva?
2. ¿Debe exportarse el árbol completo del contexto actual o únicamente objetivos con descendencia materializada?
3. ¿Las filas sintéticas deben quedar visibles como tales o prefieren compactarlas solo en hojas ejecutivas futuras?
4. ¿El nombre del archivo debe incluir filtros seleccionados o solo el período?
5. ¿Hace falta una segunda variante futura “resumen ejecutivo” distinta del CSV factual?

---

## 14. Conclusión final

La decisión más sólida, con mejor relación entre valor, riesgo y congruencia arquitectónica, es construir primero un **CSV factual del cronograma derivado**.

Ese exportable:

- encaja con el patrón ya vivo del portal
- no requiere infraestructura nueva
- respeta la naturaleza real del Cronograma
- evita mentir con una “foto bonita” de una UI que hoy depende demasiado de interacción y layout
- deja preparada una base limpia para versiones futuras en `.xlsx` o PDF

En términos de producto y de ingeniería, el orden correcto no es:

`hacer un PDF bonito primero`

El orden correcto es:

`cerrar contrato semántico -> exportar datos derivados honestos -> luego decidir si hace falta una capa ejecutiva visual`

Ese es, hoy, el camino técnicamente más sensato para el exportable del Cronograma Roadmap del pm-portal.