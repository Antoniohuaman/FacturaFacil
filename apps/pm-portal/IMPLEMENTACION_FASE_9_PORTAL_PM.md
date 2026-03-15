# Implementación Fase 9 Portal PM

## Alcance aprobado

Fase 9 se implementa exclusivamente sobre ámbitos que ya usan catálogo dinámico de estados:

- Validación por módulo
- Ejecuciones de validación
- Decisiones
- Auditorías
- Hallazgos de auditoría

Quedan fuera de alcance cambios sobre modelos rígidos, SQL, persistencia, router, menú, módulos top-level y unificación global de estados del portal.

## Problema resuelto

La fase corrige el desfase entre:

- el catálogo dinámico de estados ya existente en Ajustes
- la validación semántica insuficiente en formularios
- la presentación visual que seguía mostrando `estado_codigo` crudo en varias tablas y listas

## Mecanismo de validación aplicado

No se cambió el patrón base de Zod ni se forzó una validación imposible sin contexto runtime.

La solución aplicada fue:

1. Mantener Zod para validación estructural básica en `esquemas.ts`.
2. Agregar un helper compartido de validación complementaria para catálogo dinámico.
3. Validar en cada submit que `estado_codigo` pertenezca al catálogo activo ya cargado por la pantalla correspondiente.
4. Si el estado no pertenece al catálogo activo, bloquear el guardado y marcar error de formulario en `estado_codigo`.

Con esto se conserva el patrón actual del portal y no se rompe la carga de formularios existentes.

## Ajustes implementados

### 1. Render semántico del estado

Se reemplazó la visualización cruda de `estado_codigo` por el nombre semántico del catálogo dinámico en:

- tablas de Validación por módulo
- tablas de Ejecuciones de validación
- tabla de Decisiones
- lista de Auditorías
- lista de Hallazgos

Cuando un código no encuentra coincidencia en el catálogo cargado, se conserva un fallback legible seguro.

### 2. Exportaciones CSV

Las exportaciones afectadas pasan a usar el nombre semántico resuelto desde el catálogo dinámico del ámbito cuando corresponde.

### 3. Formularios

Se añadió ayuda visual y mensaje de error en los selectores de estado para dejar claro que:

- el usuario selecciona un estado del catálogo activo
- el valor que se guarda sigue siendo el código
- el guardado se bloquea si el código ya no es válido para el catálogo cargado

## Archivos modificados

- `apps/pm-portal/src/compartido/validacion/esquemas.ts`
- `apps/pm-portal/src/compartido/utilidades/formatoPortal.ts`
- `apps/pm-portal/src/presentacion/paginas/validacion/por-modulo/PaginaValidacionPorModulo.tsx`
- `apps/pm-portal/src/presentacion/paginas/validacion/ejecuciones/PaginaEjecucionesValidacion.tsx`
- `apps/pm-portal/src/presentacion/paginas/decisiones/PaginaDecisiones.tsx`
- `apps/pm-portal/src/presentacion/paginas/auditorias/PaginaAuditorias.tsx`
- `apps/pm-portal/IMPLEMENTACION_FASE_9_PORTAL_PM.md`

## SQL

Fase 9 no requiere cambios SQL; se resolvió mediante consistencia de validación, presentación semántica y uso correcto del catálogo dinámico de estados.

## Riesgos residuales

- Si un estado queda inactivo en Ajustes mientras un usuario mantiene abierto un formulario antiguo, el guardado será bloqueado hasta refrescar o seleccionar un estado vigente.
- La fase no unifica estados de dominios con enums rígidos, por lo que la consistencia global del portal sigue siendo parcial por decisión explícita de alcance.