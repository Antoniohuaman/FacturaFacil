# IMPLEMENTACION LOGICA Y TOOLTIP DE PROGRESO CRONOGRAMA

## 1. Que se implemento

Se implemento la logica de progreso en Cronograma sin agregar ninguna capa visual fija en la fila.

El progreso ahora se expone solo dentro del tooltip del badge de estado:

- primera linea: estado actual
- segunda linea: `Progreso: XX%`
- tercera linea: `X de Y`

La fila mantiene exactamente su apariencia base sin barras, porcentajes visibles ni indicadores permanentes.

## 2. Por que no se agrego un switch de progreso

No se agrego un switch `Mostrar progreso` porque el requerimiento actual pide fase 0 de progreso visual permanente.

La unica preferencia que sigue existiendo es `Mostrar tooltips`.

Eso deja un comportamiento simple y consistente:

- si tooltips esta activo, el progreso aparece dentro del tooltip del badge
- si tooltips esta apagado, no aparece tooltip ni progreso

## 3. Como se calculo el progreso

Se extrajo una utilidad compartida para evitar duplicar semantica entre Resumen y Cronograma.

Semantica aplicada:

- iniciativa: progreso derivado de sus entregables hijos
- objetivo: progreso derivado de iniciativas y entregables descendientes reales
- entregable: no expone subprogreso propio adicional

La fuente compartida queda en:

- `src/presentacion/paginas/roadmap/roadmapProgreso.ts`

## 4. Como se integro al tooltip del estado

No se modifico el layout de la fila.

La integracion se hizo envolviendo el badge de estado con `TooltipCronograma` y agregando contenido minimo:

- estado
- `Progreso: XX%`
- `X de Y`

Solo objetivo e iniciativa muestran las lineas de progreso dentro del tooltip. Entregable conserva solo el estado.

## 5. Como interactua con `Mostrar tooltips`

Se reutilizo el sistema existente de `TooltipCronograma`.

Consecuencia:

- con `Mostrar tooltips` activo, el badge muestra progreso en hover o foco
- con `Mostrar tooltips` apagado, no aparece ningun tooltip ni progreso

## 6. Que no se toco

No se toco:

- layout del cronograma
- altura de filas
- padding
- ancho de columna izquierda
- alineacion con timeline
- timeline
- leyenda
- buscador
- filtros
- crear
- resumen
- exportar
- expandir
- menu contextual por fila
- backend
- SQL
- CRUD
- otros modulos

## 7. Validaciones ejecutadas

Se ejecutaron:

- `npm run dev`
- `npm run lint`
- `npm run build`

Tambien se valido explicitamente que:

- `Mostrar tooltips` siga funcionando
- no exista un nuevo switch `Mostrar progreso`
- la fila del cronograma no cambie visualmente
- no aparezcan barras ni porcentajes visibles
- al hacer hover o foco sobre el badge de estado aparezca el progreso
- se vea `Progreso: XX%`
- se vea tambien el conteo `X de Y`
- iniciativas calculen segun entregables hijos
- objetivos calculen segun descendencia real
- con tooltips apagados no aparezca nada
- no se rompan tooltips existentes
- no aparezcan warnings nuevos de TypeScript o ESLint

Advertencia conocida preexistente:

- la build sigue mostrando la advertencia historica de Vite por chunks grandes, no relacionada con este cambio