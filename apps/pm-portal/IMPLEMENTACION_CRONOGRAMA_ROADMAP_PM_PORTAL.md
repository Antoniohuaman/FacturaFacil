# Implementacion - Cronograma Roadmap PM Portal

Fecha: 2026-03-15

## Objetivo del MVP

Agregar una vista horizontal, ejecutiva y expandible para Roadmap en la subruta `/roadmap/cronograma`, sincronizada con datos reales del sistema y sin caer en una tabla ni en un gantt operativo pesado.

## Cambios implementados

- Nueva subruta `roadmap/cronograma` en el enrutador del portal.
- Nuevo submenu `Cronograma` en el menu global de Roadmap.
- Nueva navegacion secundaria `NavegacionRoadmap` reutilizada dentro del modulo.
- Integracion de esa navegacion en:
  - Resumen Roadmap
  - Objetivos Roadmap
  - Iniciativas Roadmap
  - Entregas Roadmap
  - Cronograma Roadmap
- Nueva pagina `PaginaCronogramaRoadmap.tsx` con:
  - encabezado ejecutivo,
  - filtros reales,
  - KPIs breves,
  - eje mensual horizontal,
  - linea de hoy,
  - filas jerarquicas expandibles,
  - modo `Ejecutivo` y `Detalle`,
  - soporte de releases como hitos.

## Logica temporal usada

- Objetivos: agregacion temporal derivada desde iniciativas y entregas hijas.
- Iniciativas: bloque planificado desde `ventana_planificada_id` usando fechas del catalogo de ventanas.
- Entregas:
  - plan desde `ventana_planificada_id`,
  - real desde `ventana_real_id`,
  - hitos puntuales desde `fecha_objetivo` y `fecha_completado`.
- Releases: hitos puntuales desde `fecha_programada` o `fecha_lanzamiento_real`.

## Lo que deliberadamente no se implemento

- Barras reales de iniciativa, porque no existen datos reales de inicio/fin para esa entidad.
- Dependencias visuales entre items.
- Gantt clasico con precision operativa no respaldada por el modelo.

## SQL y base de datos

- No hubo SQL.
- No hubo migraciones.
- No hubo tablas nuevas.

## Riesgos residuales

- Si una ventana catalogada no tiene `fecha_inicio` y `fecha_fin`, la iniciativa o entrega asociada no puede dibujar una barra completa y depende de hitos puntuales u otras evidencias temporales.
- Los objetivos no tienen fecha nativa; su barra es agregada a partir de hijos visibles, por lo que representa cobertura temporal derivada, no una promesa contractual del objetivo.
- Releases ligados solo a iniciativa o entrega se muestran como hitos; si el catalogo temporal queda incompleto, la lectura sigue siendo honesta pero menos rica.