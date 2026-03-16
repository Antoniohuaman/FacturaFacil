# Auditoria focalizada - Cronograma Roadmap PM Portal

Fecha: 2026-03-15

## Evidencia auditada

- Rutas actuales de Roadmap: `src/aplicacion/enrutador/enrutador.tsx` expone `roadmap`, `roadmap/objetivos`, `roadmap/iniciativas` y `roadmap/entregas`.
- Menu principal: `src/presentacion/navegacion/menuPortal.ts` contiene submenus de Roadmap para Objetivos, Iniciativas y Entregas, pero no Cronograma.
- Navegacion secundaria: otros modulos ya usan componentes dedicados como `NavegacionEstrategia.tsx` y `NavegacionLanzamientos.tsx`; Roadmap no tenia uno propio.
- Modelo temporal real:
  - `Objetivo` no tiene campos temporales.
  - `Iniciativa` solo tiene `ventana_planificada_id`.
  - `Entrega` tiene `ventana_planificada_id`, `ventana_real_id`, `fecha_objetivo` y `fecha_completado`.
  - `ReleasePm` tiene `fecha_programada` y `fecha_lanzamiento_real`, ademas de referencia opcional a iniciativa y entrega.
- Catalogo de ventanas: `CatalogoVentanaPm` incluye `fecha_inicio`, `fecha_fin`, `anio` y `orden`.
- Orden de ventanas: `repositorioAjustes.listarVentanas()` consulta `pm_catalogo_ventanas` y ordena por `orden` ascendente y luego por `etiqueta_visible`.
- Persistencia actual: los repositorios leen de Supabase (`clienteSupabase`) y no existe necesidad de una tabla nueva para el MVP.

## Conclusiones del modelo temporal

### Si soporta hoy

- Agrupacion visual `Objetivo -> Iniciativa -> Entrega`.
- Barra planificada de iniciativa derivada desde la ventana planificada.
- Barra planificada y real de entrega cuando existen ventanas con fechas.
- Hitos puntuales de entregas usando fecha objetivo y fecha completado.
- Hitos de release usando fecha programada o fecha real.
- Comparacion plan vs real solo a nivel entrega, nunca a nivel iniciativa.
- Filtros reales por objetivo, estado, ventana y recorte temporal anual o trimestral.

### No soporta hoy

- Duracion real de iniciativas.
- Dependencias visuales tipo gantt.
- Barras exactas para objetivos, porque el objetivo no tiene fechas propias; solo se puede derivar desde hijos.
- Simulacion honesta de un gantt operativo clasico.

## Base visual recomendada

- Objetivo = agrupador visual ejecutivo.
- Iniciativa = bloque planificado de alto nivel.
- Entrega = evidencia temporal operativa, con plan y real si existen.
- Release = hito puntual ejecutivo.

## Corte MVP correcto

- Sale sin SQL.
- Sale sin migraciones.
- Sale sin tabla nueva.
- Sale con logica derivada sobre entidades ya existentes.

## Decisiones de alcance

- Crear nueva subruta `roadmap/cronograma`.
- Extender menu global Roadmap con `Cronograma`.
- Crear navegacion secundaria propia del modulo Roadmap para alinear Resumen, Objetivos, Iniciativas, Entregas y Cronograma.
- Mantener el resumen actual intacto; la nueva vista no reemplaza ni duplica la pantalla existente.