# Implementación de unificación de grosor y color de barras del cronograma

## 1. Qué estaba inconsistente antes

- Las barras de objetivo, iniciativa y entregable usaban alturas distintas.
- La diferenciación combinaba grosor y color, lo que hacía menos uniforme la lectura del timeline.
- El color de entregable estaba demasiado cerca de la familia visual del badge `Pendiente`.

## 2. Qué se unificó

- Las tres barras del timeline ahora usan el mismo grosor visual.
- La diferenciación entre tipos quedó solo por color.

## 3. Nuevo grosor aplicado

- Se aplicó un grosor único de `8px` para:
  - objetivo
  - iniciativa
  - entregable

## 4. Colores finales por tipo

- Objetivo: slate suave
- Iniciativa: teal medio
- Entregable: naranja suave

## 5. Qué no se tocó

- longitudes de barras
- posición temporal
- tooltips
- filtros
- buscador
- acciones del bloque
- fullscreen
- alineación de filas
- altura de filas
- paddings del layout
- scroll
- lógica temporal y de negocio

## 6. Validación realizada

- `npm run dev`
- `npm run lint`
- `npm run build`

Resultado:

- sin errores
- sin warnings nuevos atribuibles al ajuste
- mismo grosor para las tres barras
- diferenciación solo por color