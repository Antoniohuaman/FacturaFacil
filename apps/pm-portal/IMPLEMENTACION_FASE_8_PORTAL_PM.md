# Implementación Fase 8 Portal PM

## Nombre de la fase

Fase 8 = Ajustes

## Tipo de trabajo

Reestructuración interna del módulo existente `Ajustes`, manteniendo la ruta raíz `/ajustes` y sin crear un módulo top-level nuevo.

## Objetivo

Convertir `PaginaAjustes` en una experiencia más mantenible y navegable, separando internamente las secciones reales ya existentes del módulo sin alterar contratos, casos de uso, repositorios ni trazabilidad best effort.

## Alcance implementado

Se trabajó exclusivamente con las secciones confirmadas en código:

1. Estándar RICE
2. Planificación
   - Ventanas
   - Etapas
3. Catálogo de módulos
4. Catálogo de severidades
5. Configuración de KPIs
6. Integraciones

## Decisión de diseño

Se eligió navegación interna propia de Ajustes basada en `searchParams` en lugar de subrutas nuevas.

Motivos:

- preserva `/ajustes` como punto único de entrada
- sigue un patrón ya usado por otros módulos del portal
- evita tocar el menú global y el router top-level sin necesidad real
- permite mantener estado navegable y compartible con URL (`vista` y `planificacion`)
- reduce el tamaño y el acoplamiento de `PaginaAjustes` sin duplicar lógica de dominio

## Estructura final

### Página raíz

- `src/presentacion/paginas/ajustes/PaginaAjustes.tsx`

Responsabilidades:

- carga de datos del módulo
- gestión de permisos
- sincronización de sección activa con URL
- sincronización de pestaña de planificación con URL
- orquestación de modales y formularios existentes
- reutilización completa de casos de uso actuales

### Modelo de navegación interna

- `src/presentacion/paginas/ajustes/modeloAjustes.ts`

Incluye:

- ids válidos de secciones
- ids válidos de pestañas de planificación
- catálogo de secciones visibles
- normalización defensiva de query params

### Componentes creados

- `src/presentacion/paginas/ajustes/componentes/NavegacionAjustes.tsx`
- `src/presentacion/paginas/ajustes/componentes/PanelRiceAjustes.tsx`
- `src/presentacion/paginas/ajustes/componentes/PanelPlanificacionAjustes.tsx`
- `src/presentacion/paginas/ajustes/componentes/PanelModulosAjustes.tsx`
- `src/presentacion/paginas/ajustes/componentes/PanelSeveridadesAjustes.tsx`
- `src/presentacion/paginas/ajustes/componentes/PanelKpisAjustes.tsx`
- `src/presentacion/paginas/ajustes/componentes/PanelIntegracionesAjustes.tsx`

## Compatibilidad preservada

Se mantuvo sin cambios la lógica existente de:

- casos de uso en `src/aplicacion/casos-uso/ajustes.ts`
- repositorio en `src/infraestructura/repositorios/repositorioAjustes.ts`
- validaciones Zod
- permisos por rol
- modales y formularios ya existentes
- trazabilidad best effort en operaciones mutables

## Cambios funcionales visibles

- Ajustes ya no renderiza todas las secciones en una sola vista monolítica
- ahora existe navegación interna por sección dentro de `/ajustes`
- planificación sigue dentro de Ajustes, pero con separación explícita entre `Ventanas` y `Etapas`
- la vista seleccionada puede mantenerse en URL mediante query params

## Cambios descartados explícitamente

No se implementó lo siguiente porque no formaba parte del alcance aprobado:

- nuevo módulo top-level
- nueva fila en `pm_catalogo_modulos`
- nueva sección para Estados
- cambios de contratos de datos
- SQL nuevo para esta fase

## SQL

Fase 8 no requiere cambios SQL; se resolvió como reestructuración interna del módulo Ajustes.

## Validación esperada

Validar con:

```bash
npm run lint
npm run build
```

## Riesgos residuales

- La página raíz sigue concentrando la gestión de modales y formularios, aunque la renderización ya quedó desacoplada por secciones.
- La configuración RICE conserva su flujo actual de lectura y actualización; esta fase no modificó esa persistencia para evitar cambios de comportamiento.