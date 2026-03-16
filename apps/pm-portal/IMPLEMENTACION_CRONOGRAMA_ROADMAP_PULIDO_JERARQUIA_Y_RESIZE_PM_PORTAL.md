# Implementacion Cronograma Roadmap Pulido Jerarquia y Resize PM Portal

## Objetivo

Aplicar una mejora focalizada sobre la vista Roadmap > Cronograma sin rehacer la pantalla, preservando la lectura horizontal existente y corrigiendo tres frentes puntuales:

- jerarquia colapsable por niveles
- eliminacion de ruido visual redundante bajo los titulos
- resize horizontal de la columna izquierda

## Evidencia previa y corte minimo

La logica jerarquica ya existia en el componente y no requeria reescritura del modelo ni de la ruta.

Se intervino solo:
- `src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx`

No fue necesario tocar:
- rutas
- navegacion
- casos de uso
- repositorios
- dominio
- SQL

## Cambios implementados

### 1. Jerarquia colapsable preservada y reforzada

- Se mantuvo la jerarquia objetivo > iniciativa > entrega.
- En modo ejecutivo los objetivos siguen colapsados por defecto y expandibles.
- En modo detalle las iniciativas siguen pudiendo expandirse para mostrar entregas.
- Se preservo el affordance compacto con chevron, sin texto extra en la UI.

### 2. Limpieza de ruido visible

- Se eliminaron las lineas secundarias visibles bajo cada titulo que repetian `resumen` y `detalle`.
- El titulo y los badges quedan como contenido principal de la fila.
- La informacion ampliada permanece disponible en el tooltip, evitando perdida funcional.

### 3. Columna izquierda redimensionable

- Se reemplazo el ancho fijo de la jerarquia por un ancho controlado por estado.
- Se agrego un handle discreto entre la columna sticky izquierda y el timeline.
- El usuario puede agrandar o achicar la columna con drag horizontal.
- Se agregaron limites minimo y maximo para evitar layouts inestables.
- El ancho se persiste en `localStorage` para mantener continuidad visual.

## Elementos preservados intactos

- vista horizontal del cronograma
- eje temporal superior
- marcador de Hoy
- tooltip existente
- look minimalista general
- navegacion secundaria de Roadmap
- filtros colapsables
- KPIs superiores
- dark mode
- ruta `/roadmap/cronograma`

## SQL y datos

- No hubo cambios de base de datos.
- No hubo SQL.
- No hubo cambios al modelo de datos.

## Validacion

- `npm run lint`
- `npm run build`

## Riesgo residual

Riesgo bajo.

El area nueva con mayor sensibilidad es el resizer por drag, porque convive con sticky, scroll horizontal y tooltips. Se controlo con:
- limites de ancho
- handle estrecho y discreto
- actualizacion local del ancho sin tocar la estructura de datos
- persistencia simple en `localStorage` sin dependencias nuevas
