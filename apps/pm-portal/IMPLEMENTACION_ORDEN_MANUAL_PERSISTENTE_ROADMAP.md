# Implementacion de orden manual persistente Roadmap

## Objetivo

Se implemento orden manual persistente por arrastre para objetivos, iniciativas y entregas en Roadmap, con persistencia en base de datos y aplicacion del orden en:

- Objetivos
- Iniciativas
- Entregas
- Cronograma

El alcance se mantuvo acotado para no alterar layout, alturas de fila, barras temporales, releases, tooltips ni filtros existentes.

## Cambios principales

### Persistencia

- Se agrego el campo `orden` a los modelos de `Objetivo`, `Iniciativa` y `Entrega`.
- Se documento la migracion SQL en `docs/sql_supabase_portal_pm.md`.
- La lectura canonica dejo de depender de `updated_at desc` y ahora usa `orden asc`, con `updated_at desc` solo como desempate.
- Al crear registros nuevos:
  - objetivo: se agrega al final del listado global
  - iniciativa: se agrega al final de su objetivo o del bucket sin objetivo
  - entrega: se agrega al final de su iniciativa o del bucket sin iniciativa
- Al editar:
  - si no cambia de contenedor, conserva su `orden`
  - si cambia de contenedor, pasa al final del nuevo contenedor

### Casos de uso de reordenamiento

- Se incorporaron operaciones explicitas para reordenar:
  - objetivos globales
  - iniciativas dentro del mismo `objetivo_id`
  - entregas dentro del mismo `iniciativa_id`
- Cada reordenamiento persiste todos los hermanos del contenedor afectado.
- Se registran eventos de historial best effort marcados con `reordenamiento_manual: true`.

### UI de arrastre

- Se creo un handle discreto de arrastre.
- El arrastre solo se permite dentro del mismo nivel y contenedor:
  - objetivo con objetivo
  - iniciativa con iniciativa del mismo objetivo
  - entrega con entrega de la misma iniciativa
- No se implemento arrastre de fila completa; solo desde el handle.
- El cronograma incorpora el mismo comportamiento en la columna jerarquica, sin tocar la timeline.

## Archivos relevantes

- `src/dominio/modelos.ts`
- `src/compartido/validacion/esquemas.ts`
- `src/infraestructura/repositorios/repositorioObjetivos.ts`
- `src/infraestructura/repositorios/repositorioIniciativas.ts`
- `src/infraestructura/repositorios/repositorioEntregas.ts`
- `src/infraestructura/repositorios/repositorioRoadmapOrden.ts`
- `src/aplicacion/casos-uso/objetivos.ts`
- `src/aplicacion/casos-uso/iniciativas.ts`
- `src/aplicacion/casos-uso/entregas.ts`
- `src/aplicacion/casos-uso/roadmapOrdenHistorial.ts`
- `src/presentacion/paginas/roadmap/ordenManualRoadmap.ts`
- `src/presentacion/paginas/roadmap/componentes/HandleArrastreRoadmap.tsx`
- `src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx`
- `src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx`
- `src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx`
- `src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx`
- `docs/sql_supabase_portal_pm.md`

## SQL pendiente de aplicar

La implementacion frontend y de repositorio asume que el campo `orden` ya existe en Supabase. Antes de usar la funcionalidad en un entorno real, aplicar el bloque documentado en:

- `docs/sql_supabase_portal_pm.md`

Ese bloque:

- agrega columnas `orden`
- rellena valores iniciales segun el orden historico actual
- crea indices por contenedor

## Validacion ejecutada

Validacion realizada en `apps/pm-portal`:

- `npm run lint` -> OK
- `npm run build` -> OK
- `npm run dev:sin-abrir` -> OK
- verificacion HTTP de Vite en `http://localhost:5181/` -> HTTP 200

Nota:

- En la raiz del monorepo, `npm run dev` apunta a otro workspace (`senciyo`). Para validar `pm-portal` se uso su script local equivalente sin apertura de navegador.