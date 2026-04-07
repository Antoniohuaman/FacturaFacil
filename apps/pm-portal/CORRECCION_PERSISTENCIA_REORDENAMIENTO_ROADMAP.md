# Correccion persistencia reordenamiento Roadmap

## 1. Causa exacta del bug

El bug estaba en `src/infraestructura/repositorios/repositorioRoadmapOrden.ts`.

La persistencia del reordenamiento usaba `upsert(...)` con un payload parcial formado solo por:

- `id`
- `orden`

Eso es incorrecto para tablas como `objetivos`, `iniciativas` y `entregas`, porque sus registros tienen columnas `NOT NULL` como `nombre` y `descripcion`.

## 2. Por que `upsert` era incorrecto aqui

`upsert` no expresa “actualiza solo este campo en un registro ya existente”.

Con ese payload parcial, Supabase podia interpretar la operacion como intento de insercion o resolucion de conflicto con datos incompletos. En ese escenario aparecian errores como:

- `null value in column "nombre" of relation "entregas" violates not-null constraint`

El problema no era la columna `orden`, ni la migracion SQL, ni el drag and drop, sino la estrategia elegida para persistir el reordenamiento.

## 3. Estrategia usada en su lugar

Se reemplazo `upsert` por `update` explicito por `id`.

La nueva estrategia:

- actualiza solo registros existentes
- modifica solo el campo `orden`
- aplica tambien el `scope` del contenedor cuando corresponde
- no intenta insertar nada
- mantiene intacta la validacion previa de ids y contenedores

En concreto, el repositorio ahora hace una serie de updates del tipo:

- `update { orden } where id = ...`
- y, si aplica, tambien restringe por `objetivo_id` o `iniciativa_id`

## 4. Que se corrigio exactamente

Archivo corregido:

- `src/infraestructura/repositorios/repositorioRoadmapOrden.ts`

Cambios realizados:

- se elimino el `upsert(...)` parcial
- se agrego una aplicacion segura del `scope` tambien en los updates
- se persistio el orden mediante `Promise.all` de `update` por fila
- se mantuvo igual toda la capa funcional superior:
  - objetivos
  - iniciativas
  - entregas
  - cronograma

No se tocaron:

- SQL
- migraciones
- UI
- drag handle
- layout
- alturas
- paddings
- estilos

## 5. Validaciones ejecutadas

Validaciones tecnicas ejecutadas en `apps/pm-portal`:

- `npm run lint` -> OK
- `npm run build` -> OK

Validaciones de auditoria de codigo:

- ya no queda `upsert(` en la persistencia de reordenamiento del Roadmap
- el repositorio ahora solo actualiza filas existentes
- no hay camino de insercion parcial en el reordenamiento
- la validacion previa del contenedor se mantiene

## 6. Cobertura del resultado esperado

Con esta correccion:

- arrastrar un objetivo ya no debe intentar insertar un objetivo parcial
- arrastrar una iniciativa ya no debe intentar insertar una iniciativa parcial
- arrastrar una entrega ya no debe intentar insertar una entrega parcial
- no deberian volver a aparecer errores `NOT NULL` derivados del reordenamiento
- la persistencia del orden sigue funcionando sobre registros existentes

Nota:

- En este entorno pude validar lint, build y la eliminacion del camino defectuoso de persistencia.
- La comprobacion final del flujo completo contra Supabase requiere interaccion real en UI con el entorno conectado a datos, pero el origen exacto del bug ya quedo corregido en la capa responsable.