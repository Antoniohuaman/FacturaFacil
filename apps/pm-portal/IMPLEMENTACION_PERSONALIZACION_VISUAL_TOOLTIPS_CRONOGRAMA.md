# IMPLEMENTACION PERSONALIZACION VISUAL TOOLTIPS CRONOGRAMA

## 1. Que se implemento

Se implemento en la vista Cronograma una primera fase de personalizacion visual con alcance minimo:

- boton iconografico de tres puntos verticales
- popover compacto de opciones
- una sola preferencia persistente: `Mostrar tooltips`

No se implemento progreso ni ningun otro switch.

## 2. Donde se agrego el boton

El boton se agrego en la franja superior derecha del header operativo del Cronograma, dentro del grupo de acciones secundarias del bloque principal.

Archivo principal afectado:

- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx`

## 3. Como se construyo el menu

Se creo un componente nuevo y acotado:

- `apps/pm-portal/src/presentacion/paginas/roadmap/componentes/MenuPersonalizacionCronograma.tsx`

Ese componente resuelve:

- apertura y cierre del popover
- cierre por click afuera
- cierre por `Escape`
- foco inicial al switch cuando se abre
- integracion visual discreta con el resto del header

## 4. Como se resolvio la preferencia de tooltips

La preferencia no se resolvio con condiciones repetidas en cada uso del tooltip.

Se centralizo en el wrapper propio del Cronograma:

- `TooltipCronograma`

Se introdujo un contexto local de la vista para indicar si los tooltips del Cronograma estan habilitados. El wrapper combina:

- su `disabled` local, si se usa
- la preferencia global `tooltipsVisibles`

Con eso, el cambio afecta de forma uniforme a todos los tooltips de esta vista sin duplicar logica.

## 5. Como se persistio

La preferencia se persistio en `localStorage` con una clave especifica del Cronograma:

- `pm-portal-roadmap-cronograma-tooltips-visible`

La preferencia es:

- local al navegador
- especifica del Cronograma
- persistente entre recargas
- no mezclada con filtros ni `query string`

## 6. Que componentes del cronograma quedaron afectados

Quedaron afectados solo los elementos del Cronograma que ya usan `TooltipCronograma`:

- tooltips de acciones del header del Cronograma que usan ese wrapper
- tooltip del titulo de fila
- tooltip del badge `Desvío`
- tooltip del marcador `Hoy`
- tooltip de barras del timeline

## 7. Que NO se toco

No se toco:

- progreso
- logica temporal
- calculo de barras
- altura de filas
- padding vertical
- layout del timeline
- menu contextual por fila
- exportable
- fullscreen
- buscador
- filtros
- resumen
- backend
- base de datos

## 8. Validaciones ejecutadas

Se ejecutaron validaciones sobre `apps/pm-portal`:

- `npm run dev`
- `npm run lint`
- `npm run build`

Adicionalmente, se verifico el comportamiento funcional del control dentro del Cronograma.

## 9. Riesgos residuales reales

Riesgos residuales bajos:

- cuando los tooltips estan apagados, se pierde ayuda contextual secundaria de lectura en filas y barras
- varios anchors del tooltip del Cronograma ya eran principalmente mouse-first antes del cambio, por lo que esta implementacion no introduce esa deuda pero tampoco la corrige

No se introdujeron cambios en temporalidad, layout ni jerarquia visual.