# Corrección Períodos Estratégicos Fase 1

## Diagnóstico encontrado

El problema no era ausencia total de backend ni de wiring de períodos estratégicos.

- Sí existía repositorio y caso de uso funcional para `pm_periodos_estrategicos` dentro de la capa de Estrategia.
- Sí existía un CRUD parcial de períodos dentro de la pantalla de resumen estratégico.
- Sí existía dependencia real de esa tabla en los formularios de OKRs, KPIs e Hipótesis.
- Sí existía dependencia real de objetivos estratégicos para habilitar la creación de KR.

El vacío funcional estaba en la UI:

- la gestión de períodos quedaba oculta cuando no existía ningún período
- el estado vacío de `/estrategia` mostraba un mensaje, pero no dejaba visible el botón ni la tabla para crear el primer período
- las pantallas dependientes permitían llegar a formularios bloqueados sin una guía clara sobre el dato maestro faltante

Conclusión:

Sí había un CRUD incompleto a nivel de experiencia. La cadena funcional quedaba bloqueada por falta de visibilidad y acceso usable al dato maestro inicial.

## Corrección aplicada

Se reutilizó el CRUD existente de períodos y se completó de forma aditiva.

### Cambios principales

- Se extrajo la gestión de períodos a un componente reutilizable.
- Se mantuvo la gestión dentro del módulo Estrategia.
- Se agregó una vista dedicada en `/estrategia/periodos`.
- Se agregó la entrada `Períodos` en la navegación interna de Estrategia.
- Se agregó la entrada `Períodos` en el submenu lateral de Estrategia.
- Se corrigió `/estrategia` para que el primer período pueda crearse incluso cuando no existen registros.
- Se agregaron CTAs y bloqueos guiados en OKRs, KPIs e Hipótesis cuando faltan períodos.
- Se bloqueó la creación de KR cuando aún no existen objetivos estratégicos.

## Archivos creados

- `apps/pm-portal/src/presentacion/paginas/estrategia/GestionPeriodosEstrategicos.tsx`
- `apps/pm-portal/src/presentacion/paginas/estrategia/periodos/PaginaPeriodosEstrategicos.tsx`
- `apps/pm-portal/CORRECCION_PERIODOS_ESTRATEGICOS_FASE_1.md`

## Archivos modificados

- `apps/pm-portal/src/presentacion/paginas/estrategia/PaginaResumenEstrategico.tsx`
- `apps/pm-portal/src/presentacion/paginas/estrategia/NavegacionEstrategia.tsx`
- `apps/pm-portal/src/presentacion/paginas/estrategia/okrs/PaginaOkrs.tsx`
- `apps/pm-portal/src/presentacion/paginas/estrategia/kpis/PaginaKpisEstrategicos.tsx`
- `apps/pm-portal/src/presentacion/paginas/estrategia/hipotesis/PaginaHipotesis.tsx`
- `apps/pm-portal/src/aplicacion/enrutador/enrutador.tsx`
- `apps/pm-portal/src/presentacion/navegacion/menuPortal.ts`

## Rutas nuevas o subsecciones nuevas

- Nueva ruta: `/estrategia/periodos`
- Nueva subsección visible en navegación de Estrategia: `Períodos`

## Validaciones agregadas

- `nombre` requerido
- `fecha_inicio` requerida
- `fecha_fin` requerida
- `fecha_inicio <= fecha_fin` ya soportado por `periodoEstrategicoSchema`
- validación UI para evitar duplicados obvios por nombre dentro del CRUD de períodos

## Cómo quedó el flujo final

1. Entrar a `/estrategia/periodos` o `/estrategia`
2. Crear período estratégico
3. Ir a `/estrategia/okrs`
4. Crear objetivo estratégico usando ese período
5. Crear KR usando ese objetivo estratégico
6. Ir a `/estrategia/kpis`
7. Crear KPI usando ese período
8. Ir a `/estrategia/hipotesis`
9. Crear hipótesis usando ese período

Además:

- si faltan períodos, OKRs/KPIs/Hipótesis muestran guía explícita hacia `Períodos`
- si faltan objetivos estratégicos, OKRs muestra guía para crear primero el objetivo y recién después el KR

## Trazabilidad

No fue necesario cambiar el backend de trazabilidad.

La creación, edición y eliminación de períodos estratégicos siguen registrando historial best effort porque ese wiring ya existía en el caso de uso de Estrategia.

## Checklist manual de prueba

1. Abrir `/estrategia` sin registros en `pm_periodos_estrategicos`.
2. Verificar que el botón para crear el primer período esté visible y usable.
3. Abrir `/estrategia/periodos` y crear un período estratégico.
4. Confirmar que el nuevo período aparezca listado inmediatamente.
5. Ir a `/estrategia/okrs` y confirmar que el selector de período ya muestra el nuevo registro.
6. Crear un objetivo estratégico y confirmar que luego aparece en el selector de KR.
7. Crear un KR usando el objetivo recién creado.
8. Ir a `/estrategia/kpis` y confirmar que el selector de período muestra el registro creado.
9. Crear un KPI usando ese período.
10. Ir a `/estrategia/hipotesis` y confirmar que el selector de período muestra el registro creado.
11. Crear una hipótesis usando ese período.
12. Revisar `/trazabilidad` y verificar eventos de crear/editar/eliminar período estratégico si el usuario tiene rol admin.
13. Ejecutar `npm run lint` y `npm run build`.