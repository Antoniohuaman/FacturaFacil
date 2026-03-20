# IMPLEMENTACIÓN — LIMPIEZA VISUAL DE VENTANA POR FILA EN CRONOGRAMA

## 1. Resumen ejecutivo
- Se eliminó del render de la lista jerárquica el texto secundario por fila que mostraba la ventana, por ejemplo `Q1`, `Q2` o etiquetas equivalentes.
- Ese dato era redundante porque el contexto de ventana ya existe en el filtro superior del cronograma.
- La mejora UX aporta más compactación vertical y menos ruido visual por fila.
- No se tocaron lógica temporal, filtros funcionales, persistencia, timeline, barras, tooltips, scroll, sticky, línea de HOY ni expand/collapse.

## 2. Archivos modificados

| Archivo | Motivo | Tipo de cambio |
| --- | --- | --- |
| apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx | Eliminar el texto secundario redundante de ventana por fila y limpiar helper sin uso | Ajuste UX visual mínimo |
| apps/pm-portal/IMPLEMENTACION_LIMPIEZA_VISUAL_VENTANA_POR_FILA_CRONOGRAMA.md | Documentar implementación y validaciones | Documentación |

## 3. Problema anterior
- `Q1`, `Q2` y etiquetas equivalentes eran redundantes porque el usuario ya recibe ese contexto desde el filtro superior de Ventana.
- Repetir esa información en cada fila consumía espacio vertical y atención visual sin aportar una señal nueva.
- En una vista con muchas filas, esa repetición reducía densidad útil y compactación del cronograma.

## 4. Solución implementada
- Se eliminó únicamente el bloque de render que mostraba el texto secundario debajo del título de filas no objetivo.
- No fue necesario ajustar padding adicional porque al desaparecer esa segunda línea la fila queda naturalmente más compacta sin dejar huecos.
- La lista resultante conserva título, badges y affordances principales, pero gana espacio útil y limpieza visual.

## 5. Compatibilidad y no regresión
- Se preservó la estructura de datos de las filas, por lo que el valor `resumen` sigue disponible donde ya aportaba contexto, como en tooltips y lógica interna de armado de fila.
- No se modificó el filtro de Ventana ni la lógica que determina qué elementos se muestran.
- No se tocó el timeline ni su alineación, por lo que el cronograma mantiene su comportamiento previo.

## 6. Limpieza técnica
- Se eliminó el helper de clases del texto secundario, que quedó sin uso después del cambio.
- No quedaron imports muertos, variables sin usar ni código muerto asociado a esta limpieza visual.
- No se introdujeron warnings nuevos.

## 7. Verificaciones técnicas
- Se ejecutó `npm run dev`.
- Se ejecutó `npm run lint`.
- Se ejecutó `npm run build`.
- El cronograma se mantiene estable a nivel técnico, y la lista jerárquica ya no renderiza el texto redundante de ventana por fila.
- El build conserva únicamente el warning histórico de tamaño de chunk de Vite, no atribuible a este cambio.

## 8. Riesgos residuales
- El único riesgo residual razonable es de percepción UX: validar en uso real que ningún equipo eche de menos ese contexto repetido por fila.
- Si más adelante se decide mostrar otro metadato secundario útil por fila, convendrá priorizar información no redundante con el filtro superior.

## 9. Recomendación siguiente
- La siguiente mejora UX natural sería revisar si algunos badges secundarios pueden compactarse aún más en filas muy densas, siempre sin sacrificar legibilidad.