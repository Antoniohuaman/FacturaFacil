# Implementacion del buscador interno del Cronograma Roadmap

## Que se implemento

Se incorporo un buscador interno textual en la cabecera operativa del Cronograma Roadmap.

- El campo aparece en el lado izquierdo de la franja superior del bloque del cronograma.
- Las acciones globales existentes se mantienen al lado derecho: Crear, Resumen y Filtros.
- La busqueda reacciona en tiempo real mientras el usuario escribe.
- Se agrego una limpieza rapida y discreta mediante un boton dentro del propio input.
- Cuando no hay resultados, el cronograma muestra un estado vacio especifico de busqueda sin romper el layout general.

## Como se resolvio la busqueda jerarquica

La implementacion no oculta filas de manera plana. En su lugar, parte de la estructura actual ya estabilizada del cronograma:

1. Primero se mantienen intactos los filtros temporales y operativos existentes.
2. Sobre ese subconjunto visible se aplica una segunda derivacion local para la busqueda textual.
3. La coincidencia se evalua sobre el nombre visible de cada nivel:
   - objetivo.nombre
   - iniciativa.nombre
   - entrega.nombre
4. Segun el nivel que coincide, se conserva el contexto jerarquico minimo necesario:
   - si coincide un objetivo, se incluye su subarbol visible actual
   - si coincide una iniciativa, se incluye su objetivo padre y sus entregas visibles
   - si coincide un entregable, se incluye su iniciativa padre y su objetivo padre
5. Durante la busqueda se usa una expansion efectiva derivada solo para render, sin alterar la persistencia existente en localStorage.

Con esto se evita dejar nodos huerfanos y se preserva la lectura del arbol sin tocar la semantica temporal del timeline.

## Archivos tocados

- `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx`
- `apps/pm-portal/IMPLEMENTACION_BUSCADOR_INTERNO_CRONOGRAMA_ROADMAP.md`

## Que no se toco

- No se modifico la semantica temporal de objetivos, iniciativas o entregables.
- No se alteraron los filtros existentes ni su sincronizacion con querystring.
- No se tocaron los modales reutilizables.
- No se alteraron las acciones Crear, Ver, Editar o Eliminar.
- No se modifico la contencion jerarquica de negocio.
- No se cambio el comportamiento base del scroll horizontal ni vertical.

## Resultados de validacion

### npm run dev

Correcto.

- Se levanto Vite en `http://localhost:5181/`.

### npm run lint

Correcto.

- `eslint .` completo sin errores reportados.

### npm run build

Correcto.

- Build finalizada satisfactoriamente.
- Se mantuvo la advertencia no bloqueante previa por chunk grande de Vite/Rollup.

## Riesgos residuales

- La busqueda es intencionalmente textual y simple en esta fase: no resalta coincidencias ni busca por campos adicionales.
- La validacion manual interactiva completa depende de revisar la vista abierta en navegador porque las herramientas disponibles no automatizan interacciones finas sobre menus y expansion.