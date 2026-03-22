# Implementación del ajuste de alineación de filas del cronograma

## 1. Causa real detectada

- La altura usada por el timeline derecho se derivaba desde la fila real del panel izquierdo.
- Esa medición se estaba redondeando con `Math.ceil(...)` antes de aplicarse al lado derecho.
- La fila izquierda conservaba su altura natural renderizada, mientras que la derecha recibía una altura ligeramente mayor cuando el navegador producía alturas fraccionales por tipografía, wrapping, badges o composición interna.
- Resultado: el borde inferior y la banda horizontal del timeline podían correrse algunos decimales o hasta 1 px respecto al renglón izquierdo, generando sensación de desalineación.
- Además, el estado activo no se evaluaba exactamente igual en ambos lados: la izquierda consideraba también `menuAbiertoFilaId`, mientras la derecha no siempre reflejaba esa misma condición visual.
- También había una asimetría estructural: la derecha tenía altura explícita y la izquierda no, aunque ambas dependían de la misma medición.

## 2. Archivos tocados

- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx`
- `apps/pm-portal/IMPLEMENTACION_AJUSTE_ALINEACION_FILAS_CRONOGRAMA.md`

## 3. Ajuste aplicado

- Se eliminó el redondeo ascendente de la medición de altura de fila.
- El timeline ahora usa la altura medida real de la fila izquierda, respetando su valor efectivo exacto.
- La fila izquierda también pasa a fijar su altura explícitamente con esa misma medición compartida, de modo que ambos lados renderizan el mismo renglón efectivo.
- Se unificó la condición de fila activa entre izquierda y derecha para evitar estados visuales divergentes cuando una fila está abierta o enfocada por acciones contextuales.
- Se ajustó la tolerancia de comparación de alturas para evitar ignorar diferencias pequeñas pero visualmente perceptibles.

## 4. Por qué no se aumentó la altura

- No se modificó `ALTURA_MINIMA_FILA_CRONOGRAMA`.
- No se tocaron `padding`, `line-height`, badges, títulos, iconos ni densidad visual.
- La solución sincroniza la altura existente en lugar de inflarla.

## 5. Cómo se validó la corrección

- Se auditó el flujo de medición con `referenciasFilasJerarquiaRef` y `alturasFilas`.
- Se verificó que el lado derecho siga dependiendo de la altura del lado izquierdo, pero ahora sin sobre-redondeo.
- Se ejecutaron validaciones de desarrollo, lint y build para confirmar que el ajuste quedó limpio.

## 6. Confirmación de alcance

- No se tocó semántica temporal.
- No se tocaron filtros, buscador, acciones, menús contextuales, modales, leyenda, scroll, tooltips ni jerarquía.
- No se cambió la altura compacta existente.