# IMPLEMENTACION CASCADA UX RELEASES OBJETIVO INICIATIVA ENTREGA

## 1. Que se implemento

Se mejoro el formulario de Releases para guiar mejor la relacion con Roadmap sin alterar el modelo persistido.

- Se agrego un selector auxiliar de `Objetivo` en el modal de create/edit/view de releases.
- Se implemento una cascada UX `Objetivo -> Iniciativa -> Entrega`.
- `Iniciativa` se filtra por el objetivo auxiliar cuando este existe.
- `Entrega` se filtra por la iniciativa seleccionada y, si no hay iniciativa, usa el objetivo auxiliar como filtro contextual.
- Cuando un cambio deja una iniciativa o entrega fuera del nuevo contexto valido, el formulario limpia ese valor.
- Se agrego validacion de coherencia entre `iniciativa_id` y `entrega_id` en frontend y en la capa de aplicacion.
- Se agrego un aviso pequeno cuando el release no queda vinculado al roadmap y por tanto no aparecera en el cronograma.

## 2. Por que Objetivo es auxiliar y no persistido

`Objetivo` se implemento solo como ayuda UX porque la auditoria previa confirmo que:

- `ReleasePm` no tiene `objetivo_id`;
- `releaseSchema` no tiene `objetivo_id`;
- `pm_releases` no tiene columna `objetivo_id`;
- la relacion persistida correcta del release sigue siendo por `iniciativa_id` y/o `entrega_id`.

Por eso el nuevo selector de `Objetivo`:

- no forma parte de `ReleasePm`;
- no entra en `ReleaseEntrada`;
- no se envia al backend;
- no se persiste en SQL.

Quedo resuelto como estado local del formulario, usado unicamente para guiar la seleccion de relaciones reales.

## 3. Como funciona la cascada

Comportamiento aplicado:

- `Objetivo` es opcional.
- Si no se selecciona objetivo, la lista de iniciativas muestra todas las iniciativas.
- Si se selecciona objetivo, la lista de iniciativas muestra solo iniciativas de ese objetivo.
- `Iniciativa` sigue teniendo la opcion `Sin iniciativa`.
- Si se selecciona una iniciativa, la lista de entregas muestra solo entregas de esa iniciativa.
- Si no hay iniciativa pero si hay objetivo, la lista de entregas se reduce a las entregas cuya iniciativa pertenece a ese objetivo.
- Si no hay ni iniciativa ni objetivo, la lista de entregas muestra todas las entregas.
- `Entrega` sigue teniendo la opcion `Sin entrega`.
- Si el objetivo cambia y la iniciativa seleccionada deja de ser compatible, la iniciativa se limpia.
- Si la iniciativa cambia y la entrega seleccionada deja de ser compatible, la entrega se limpia.

Esta variante mantiene los casos validos del dominio actual:

- release sin relacion roadmap;
- release ligado solo a iniciativa;
- release ligado solo a entrega;
- release ligado a iniciativa y entrega coherentes.

## 4. Como se valida la coherencia iniciativa entrega

La coherencia se resolvio en dos niveles.

### Frontend

- El formulario filtra las opciones disponibles para reducir incoherencias.
- Si el usuario termina con una entrega incompatible con la iniciativa seleccionada, el campo muestra mensaje breve y no deja continuar.

Mensaje aplicado:

- `La entrega seleccionada no pertenece a la iniciativa elegida.`

### Capa de aplicacion

- Se agrego validacion robusta en `src/aplicacion/casos-uso/lanzamientos.ts`.
- `crearRelease` y `editarRelease` ahora verifican la coherencia cuando ambos campos vienen informados.
- La validacion consulta la entrega real y confirma que `entrega.iniciativa_id === iniciativa_id`.
- Si no coincide, se lanza `ErrorValidacionReleaseRoadmap`.

Con esto la consistencia no depende solo de la UI.

## 5. Como se resolvio el aviso de no visibilidad en cronograma

Se agrego un aviso minimo, solo cuando corresponde.

Condicion:

- no hay `iniciativa_id`
- y no hay `entrega_id`

Texto aplicado:

- `Sin iniciativa ni entrega, este release no se mostrara en el cronograma.`

Se implemento como texto pequeno y discreto dentro del formulario, sin convertirlo en un bloque de warning pesado.

## 6. Que no se toco

No se modifico:

- `ReleasePm`
- `releaseSchema`
- SQL o migraciones
- `pm_releases`
- la semantica del cronograma
- la banda visual de Releases del roadmap
- los listados generales de Roadmap
- el modelo de dominio con `objetivo_id`

Tampoco se agregaron:

- nuevas entidades
- multiseleccion
- nuevas tablas
- conceptos de hitos

## 7. Validaciones ejecutadas

Validaciones tecnicas ejecutadas:

- chequeo de errores de los archivos modificados
- `npm run lint -w portal-pm`
- `npm run build -w portal-pm`
- `npm run dev -w portal-pm`

Validaciones funcionales cubiertas por implementacion y revision:

- el formulario de Release sigue abriendo
- `Objetivo` existe como selector auxiliar
- `Objetivo` no se persiste
- `Objetivo` no se envia al backend
- `Iniciativa` se filtra por objetivo
- `Entrega` se filtra por iniciativa
- cambiar objetivo limpia iniciativa invalida
- cambiar iniciativa limpia entrega invalida
- no se permite guardar una entrega incoherente con la iniciativa
- sigue siendo posible crear release sin vinculo roadmap
- en ese caso se muestra el aviso de no visibilidad en cronograma
- no se toca la banda de Releases del cronograma