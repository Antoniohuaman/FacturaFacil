# IMPLEMENTACIÓN — ALINEACIÓN DEL FILTRO DE VENTANA EN ENTREGABLES

## Objetivo

Corregir la incongruencia entre la barra visible del entregable en Cronograma y el filtro `Ventana`, para que ambos respondan a la misma fuente temporal.

## Problema detectado

En la vista Cronograma, la barra visible de un entregable ya se calcula con esta prioridad:

1. `fecha_inicio` + `fecha_fin` propias del entregable.
2. Fallback a `ventana_planificada_id` cuando no existe rango propio.

Sin embargo, el filtro `Ventana` seguía aceptando entregables por coincidencia con `ventana_real_id`, aunque ese dato ya no gobierna la barra visible principal.

Resultado: un entregable podía aparecer al filtrar por una ventana que no correspondía con la temporalidad que el usuario veía en la grilla del cronograma.

## Cambio aplicado

Se incorporó una función específica para evaluar el filtro de ventana de entregables usando la misma semántica temporal visible del timeline:

1. Si el entregable se está mostrando por `ventana_planificada_id`, el filtro compara contra esa misma ventana planificada.
2. Si el entregable se está mostrando por rango propio, el filtro compara ese rango visible contra el rango temporal de la ventana seleccionada.
3. `ventana_real_id` deja de participar en la decisión del filtro.

## Archivo modificado

- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx`

## Impacto funcional

- Se corrige la coherencia entre filtrado y representación visual de entregables.
- No se modifica la lógica de objetivos.
- No se modifica la lógica de iniciativas.
- No se alteran tooltips, layout, estilos ni persistencia.
- No se cambia la semántica del render principal del cronograma; solo se alinea el filtro con esa semántica ya existente.

## Validación ejecutada

Sobre `apps/pm-portal`:

- `npm run dev`
  - Servidor iniciado correctamente en `http://localhost:5181/`.
- `npm run lint`
  - Sin errores.
- `npm run build`
  - Compilación completada correctamente.
  - Se mantiene una advertencia preexistente de Vite por tamaño de chunk, sin relación con este cambio.

## Resultado final

El filtro `Ventana` de entregables quedó alineado con la fuente temporal visible del cronograma y ya no introduce coincidencias espurias vía `ventana_real_id`.