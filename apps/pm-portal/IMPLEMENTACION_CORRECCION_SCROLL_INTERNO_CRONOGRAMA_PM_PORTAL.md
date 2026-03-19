# IMPLEMENTACION - CORRECCION DE SCROLL INTERNO DEL CRONOGRAMA PM PORTAL

## Objetivo

Corregir la ergonomia del bloque principal del cronograma para que exista:

- un solo scroll vertical interno global dentro del bloque del cronograma,
- scroll horizontal solo en el panel temporal derecho,
- cabecera temporal separada y sincronizada horizontalmente con el cuerpo,
- panel izquierdo sin scrollbar vertical propio.

## Problema detectado

La version anterior de la panelizacion seguia dejando dos comportamientos no deseados:

- el panel izquierdo tenia su propio `overflow-y`, lo que introducia un segundo scroll vertical interno,
- el refactor posterior quedo mezclado con JSX antiguo y nuevo dentro del `return`, rompiendo el arbol del componente.

## Correccion aplicada

Se recompuso el bloque visual completo del cronograma en `PaginaCronogramaRoadmap.tsx` con esta estructura final:

1. cabecera del bloque separada en dos paneles:
   - jerarquia a la izquierda,
   - timeline a la derecha.
2. cabecera del timeline con `overflow-x-auto` propio.
3. cuerpo completo del cronograma con un unico `overflow-y-auto` global.
4. columna izquierda renderizada dentro de ese cuerpo comun, sin `overflow-y-auto` propio.
5. cuerpo del timeline con `overflow-x-auto` propio y sincronizacion horizontal respecto a la cabecera.

## Elementos preservados

- resize de la columna de jerarquia,
- alturas sincronizadas entre filas de jerarquia y filas del timeline,
- tooltips de filas y segmentos,
- linea continua de HOY con tooltip de fecha real,
- leyenda reducida a Objetivo, Iniciativa plan y Entrega plan,
- expansion y colapso de objetivos e iniciativas.

## Limpieza complementaria

Durante la reparacion se eliminaron restos del enfoque previo que ya no debian existir:

- `cuerpoJerarquiaRef`
- `sincronizarScrollVertical`
- `sincronizandoScrollVerticalRef`

## Validacion ejecutada

Se verifico lo siguiente sobre `apps/pm-portal`:

- `npm run lint -w apps/pm-portal`
- `npm run build -w apps/pm-portal`
- `npm run dev:sin-abrir -w apps/pm-portal`

Resultado:

- lint correcto,
- build correcto,
- servidor de desarrollo levantando en `http://localhost:5181/`.

## Observacion

El build mantiene un warning no bloqueante de Vite por tamano de chunk mayor a 1200 kB. No forma parte de esta correccion de layout.