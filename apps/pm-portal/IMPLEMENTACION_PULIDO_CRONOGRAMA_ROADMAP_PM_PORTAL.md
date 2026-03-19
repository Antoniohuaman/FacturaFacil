# Implementacion de pulido Cronograma Roadmap PM Portal

## Objetivo

Aplicar un pulido quirurgico de UX/UI sobre la vista existente de cronograma sin alterar su logica base ni ampliar el alcance funcional del modulo.

## Cambios aplicados

### 1. Panel de filtros mas compacto

- Se reemplazo la exposicion permanente de filtros por un panel colapsable.
- Se agrego un resumen superior de la configuracion activa.
- Se mantiene la misma semantica de filtros y sincronizacion con query params.

### 2. Mejor lectura de la jerarquia

- Se ajusto el ancho de la columna izquierda segun la densidad seleccionada.
- Los nombres largos ahora pueden ocupar hasta dos lineas antes de truncarse.
- Se incorporaron tooltips locales para exponer titulo, estado y detalle sin recargar la superficie principal.

### 3. Timeline con mayor protagonismo

- La cabecera temporal conserva el enfoque horizontal y mejora la separacion entre jerarquia y lienzo.
- El objetivo pasa a representarse como una banda suave de agrupacion, menos dominante que las iniciativas y entregas.
- Se mantuvo la linea de hoy y la lectura por meses sin convertir la vista en un gantt operativo.

### 4. Barras y marcadores mas sobrios

- Se redujo la saturacion visual de los segmentos y marcadores.
- Se diferencio mejor entre ventana planificada, ventana real y releases.
- Los hover details se resuelven con tooltips discretos y consistentes.

### 5. Decision tecnica: no resize manual

No se implemento resize manual de la columna izquierda en esta fase.

Motivo:
- La combinacion actual de columna sticky, scroll horizontal, cabecera sticky y timeline absoluto hace que introducir resize arrastre bastante complejidad de layout y mantenimiento.
- Para un pulido quirurgico, el ajuste dinamico por densidad entrega valor con mucho menos riesgo.

### 6. Ajuste complementario en la linea de hoy

- La linea vertical continua de hoy se mantuvo como referencia unica sobre todo el lienzo temporal.
- Se reincorporo un tooltip al hacer hover sobre esa linea, mostrando la fecha real actual en formato legible.
- El tooltip se resolvio sobre una sola ancla interactiva estrecha, sin volver a segmentar la linea por filas.

## Alcance respetado

- Sin cambios en base de datos.
- Sin cambios en dominio, repositorios o casos de uso.
- Sin nuevas dependencias.
- Sin reescritura conceptual del cronograma.
- Sin alterar rutas ni navegacion fuera de lo ya existente.

## Archivo intervenido

- `src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx`
- `IMPLEMENTACION_PULIDO_CRONOGRAMA_ROADMAP_PM_PORTAL.md`

## Validacion ejecutada

- `npm run lint` completado sin hallazgos.
- `npm run build` completo correctamente, con warning no bloqueante preexistente de Vite por tamano de chunk.
