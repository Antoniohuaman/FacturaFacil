# IMPLEMENTACION BANDA RELEASES CRONOGRAMA

## 1. Que se implemento

Se incorporo una nueva capa visual de solo lectura en la vista Cronograma del Roadmap.

- Boton `Releases` en el header operativo del cronograma.
- Persistencia local de la preferencia de visibilidad mediante `localStorage`.
- Banda horizontal superior de releases, separada del cuerpo principal del Gantt.
- Render de eventos puntuales distribuidos por fecha efectiva.
- Tooltip compacto por release con contexto funcional minimo.
- Correccion de lectura para contemplar releases relacionados por `iniciativa_id` y por `entrega_id`.

La implementacion quedo localizada en `src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx`.

## 2. Por que se uso ReleasePm y no Hito

La fase se implemento exclusivamente sobre `ReleasePm` porque es la entidad real existente y madura del dominio para liberaciones.

- No se creo una entidad nueva.
- No se mezclo `Entrega.fecha_objetivo`.
- No se introdujo semantica de `Hito`.
- No se modifico backend, SQL ni CRUD de lanzamientos.

La banda se alimenta solo con datos ya cargados por `listarReleases()` dentro del cronograma.

La conexion sigue la misma fuente real del modulo Lanzamientos:

- `PaginaCronogramaRoadmap.tsx` carga `listarReleases()` en paralelo con roadmap.
- `listarReleases()` delega en `src/aplicacion/casos-uso/lanzamientos.ts`.
- ese caso de uso delega en `src/infraestructura/repositorios/repositorioLanzamientos.ts` sobre `pm_releases`.

## 3. Como se resolvio la fecha efectiva

La fecha visual de cada release usa la regla decidida para esta fase:

- `fecha_lanzamiento_real ?? fecha_programada`

La logica se apoya en la utilidad ya existente `fechaRelease(release)` y la banda reutiliza esa fecha efectiva tanto para filtrar por rango temporal como para ubicar el evento en el eje horizontal.

Adicionalmente, el tooltip indica si la fecha efectiva mostrada proviene de la fecha `real` o `programada`.

## 4. Como se resolvio la persistencia del boton

La visibilidad de la banda se persiste con una clave dedicada en `localStorage`:

- `pm-portal-roadmap-cronograma-releases-visible`

Caracteristicas:

- local al navegador
- exclusiva del cronograma
- separada de `searchParams`
- consistente con el patron ya usado por `Resumen`, tooltips y preferencias temporales

## 5. Como se resolvio la lectura por iniciativa y entrega

Se corrigio la integracion parcial detectada en la auditoria.

- Se creo una agregacion `releasesPorEntrega` para releases vinculados directamente por `entrega_id`.
- Se creo una agregacion `releasesRelacionadosPorIniciativa` que deduplica releases asociados directamente por `iniciativa_id` y tambien los inferidos desde una entrega ligada a iniciativa.
- La banda visual toma releases reales del modulo Lanzamientos dentro del rango temporal visible y mantiene solo los relacionados al roadmap por `iniciativa_id` o `entrega_id`.

Con esto no se pierden releases validos ligados solo por entrega.

## 6. Como quedo integrada la banda visual

La banda se inserto como una superficie auxiliar dentro del contenedor principal del cronograma:

- por encima del header mensual del timeline
- por encima del cuerpo principal del Gantt
- como una card independiente del contenedor redimensionable del cronograma
- sincronizada horizontalmente con el scroll del timeline principal

Cada release se representa como:

- nodo puntual sobre una sola linea horizontal
- fecha corta visible
- nombre corto visible debajo del nodo
- tooltip con nombre, fecha efectiva, estado, tipo e iniciativa o entrega cuando aplica

La banda usa una estetica sobria y separada de los colores de barras del cronograma principal.

## 7. Que no se toco

No se modifico:

- backend de releases
- SQL
- CRUD de lanzamientos
- formularios o modales de releases
- semantica temporal principal del Gantt
- altura o padding de filas del cuerpo principal
- exportable CSV existente
- menus contextuales ya existentes fuera del cronograma
- modulo Roadmap fuera de lo estrictamente necesario para esta capa

## 8. Validaciones ejecutadas

Validaciones previstas para esta entrega:

- `npm run dev` en `apps/pm-portal`
- `npm run lint` en `apps/pm-portal`
- `npm run build` en `apps/pm-portal`
- verificacion de tipado y errores del archivo modificado

Tambien se revisaron de forma explicita estos puntos en la implementacion:

- el boton `Releases` aparece en el header operativo
- la banda se muestra y oculta sin integrarse en las filas del Gantt
- la preferencia se persiste por `localStorage`
- la banda usa solo `ReleasePm`
- la fecha visible usa `fecha_lanzamiento_real ?? fecha_programada`
- la lectura contempla releases por iniciativa y por entrega

## 9. Limitaciones reales

- La banda es de solo lectura en esta fase.
- No permite crear ni editar releases desde el cronograma.
- Si no existen releases del modulo Lanzamientos dentro del rango temporal actual, la banda se muestra vacia con mensaje explicito.
- La ubicacion visual usa una sola linea horizontal con hasta dos filas ligeras de etiqueta para evitar solapamientos, pero en escenarios de alta densidad puede haber proximidad visual entre eventos muy cercanos.