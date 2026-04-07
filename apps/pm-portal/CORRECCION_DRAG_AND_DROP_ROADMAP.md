# Correccion drag and drop Roadmap

## 1. Causa exacta encontrada

La causa estaba en el handle de arrastre de Roadmap, en `src/presentacion/paginas/roadmap/componentes/HandleArrastreRoadmap.tsx`.

El handle estaba implementado como `button draggable` y, ademas, ejecutaba esta secuencia en `onMouseDown`:

- `evento.preventDefault()`
- `evento.stopPropagation()`

Ese `preventDefault()` en `mousedown` estaba bloqueando el inicio del gesto nativo de drag del navegador, por lo que el flujo nunca llegaba a disparar `dragstart` de forma efectiva.

## 2. Por que no iniciaba el drag

La cadena auditada fue esta:

1. Usuario intenta arrastrar desde el handle.
2. El navegador necesita completar el inicio nativo del gesto para emitir `dragstart`.
3. El handle interceptaba `mousedown` y hacia `preventDefault()`.
4. Al cancelarse ese paso base, el drag no arrancaba realmente.
5. Como consecuencia:
   - no quedaba seteado el item arrastrado en estado
   - `onDragOver` del destino no llegaba a operar sobre un drag real
   - `drop` no se completaba
   - la persistencia no se ejecutaba

Los puntitos y el cursor se veian bien porque el problema no era visual, sino de cancelacion prematura del gesto.

## 3. Que se corrigio

Se hizo una correccion minima y focalizada.

### Cambio aplicado

En `HandleArrastreRoadmap.tsx`:

- se elimino `onMouseDown`
- se elimino el `preventDefault()` que cortaba el inicio del drag
- se mantuvo el mismo elemento visual, tamaño, clases, icono y comportamiento general

No se rehizo la solucion, no se cambiaron paginas, no se modifico SQL y no se toco la persistencia.

## 4. Cadena tecnica validada

Despues de la correccion, la cadena implementada queda consistente:

1. El handle ya no cancela el gesto en `mousedown`.
2. `onDragStart` del handle puede dispararse normalmente.
3. Cada vista ya tiene estado local para marcar el item arrastrado:
   - objetivos
   - iniciativas
   - entregas
   - cronograma
4. Los destinos siguen usando `onDragOver` con `preventDefault()`, que es lo correcto para habilitar `drop`.
5. `onDrop` reconstruye el orden permitido en el mismo contenedor.
6. La persistencia final sigue delegandose a los casos de uso ya implementados.

## 5. Validaciones ejecutadas

Validaciones tecnicas ejecutadas en `apps/pm-portal`:

- `npm run lint` -> OK
- `npm run build` -> OK
- `npm run dev:sin-abrir` -> OK
- verificacion HTTP en `http://localhost:5181/` -> HTTP 200
- verificacion de errores del archivo corregido -> sin errores

Validacion funcional auditada en codigo:

- el punto que bloqueaba el drag era efectivamente el `preventDefault()` en `mousedown`
- el resto de la cadena (`dragstart` -> `dragover` -> `drop` -> persistencia) ya estaba cableada
- no se detectaron nuevos warnings en lint ni build

Nota de alcance:

- En este entorno pude validar arranque, build, lint y la cadena de eventos en codigo.
- La confirmacion gestual visual final de arrastre efectivo en navegador depende de interaccion UI real, pero el bloqueo tecnico exacto que impedia iniciar el drag ya fue removido.

## 6. Que no se toco

No se tocaron:

- SQL
- logica de persistencia
- orden canonico por `orden`
- layout de tablas
- alturas de fila
- paddings
- tamaños del handle
- barras temporales del cronograma
- releases
- tooltips
- filtros
- restricciones de alcance por nivel y contenedor

## 7. Resultado esperado

Con esta correccion:

- objetivo sigue arrastrando solo con objetivo
- iniciativa sigue arrastrando solo dentro del mismo objetivo
- entrega sigue arrastrando solo dentro de la misma iniciativa
- cronograma mantiene el mismo comportamiento restringido por nivel y contenedor

Y ahora el drag ya no queda bloqueado antes de `dragstart`.