# Auditoría Extrema — PM Portal
**Fecha:** 2026-03-04
**Auditor:** Claude Sonnet 4.6 (Senior Software Auditor + QA Lead + Security Reviewer + PM Ops Analyst)
**Metodología:** Solo lectura. No se modificó ningún archivo. No se ejecutaron migraciones ni inserts masivos.
**Rama auditada:** `develop` (commit HEAD: `3872347c`)

---

## 1. Resumen Ejecutivo

El PM Portal es una aplicación React 19 + TypeScript que sigue arquitectura limpia (presentación → aplicación → infraestructura → dominio). Cubre 13 módulos/páginas, 9 repositorios Supabase, y gestiona 18+ tablas. La base de código está bien estructurada, sin dead code evidente, sin TODO/FIXME, y con patrones consistentes de carga/vacío/error. **Lint y build pasan sin errores ni warnings**. Las debilidades principales son: ausencia universal de notificaciones toast (éxito/error), paginación solo del lado cliente para todos los listados, validación de fechas débil en Zod, falta de guardias de transición de estados, y un hallazgo de historial git que requiere rotación de credenciales. RLS de Supabase **no pudo confirmarse** desde código (requiere acceso directo a la BD). Ningún P0 activo en producción con el código actual; el único riesgo P0 es el historial git con credenciales previas.

---

## 2. Tabla Maestra de Módulos

| # | Módulo / Pantalla | Ruta | Qué hace | CRUD | Tablas Supabase | Validaciones principales | Dependencias | Estado |
|---|---|---|---|---|---|---|---|---|
| 1 | Login | `/ingresar` | Autenticación email+password | - | `perfiles` (rol) | `ingresoSchema` (Zod) | Supabase Auth | **OK** |
| 2 | Tablero | `/` | Dashboard: estado despliegue + métricas PostHog + health Supabase | R | `perfiles` (health) | Ninguna | PostHog API, estado.json | **OK** |
| 3 | Roadmap (resumen) | `/roadmap` | Vista global: objetivos, iniciativas, entregas + Plan vs Real | R+Filtros | `objetivos`, `iniciativas`, `entregas`, `pm_catalogo_ventanas`, `pm_catalogo_etapas` | Filtros client-side | Catálogos | **OK** |
| 4 | Objetivos | `/roadmap/objetivos` | CRUD objetivos estratégicos | CRUD | `objetivos` | `objetivoSchema` | Ninguna | **OK** |
| 5 | Iniciativas | `/roadmap/iniciativas` | CRUD iniciativas + cálculo RICE | CRUD | `iniciativas`, `pm_catalogo_ventanas`, `pm_catalogo_etapas`, `configuracion_rice` | `iniciativaSchema` + RICE | Objetivos, Ventanas, Etapas | **OK** |
| 6 | Entregas | `/roadmap/entregas` | CRUD entregas + filtro fecha/ventana | CRUD | `entregas`, `iniciativas`, `pm_catalogo_ventanas` | `entregaSchema` | Iniciativas, Ventanas | **OK** |
| 7 | Matriz de Valor | `/matriz-valor` | CRUD matriz valor + score automático | CRUD | `matriz_valor`, `iniciativas` | `matrizValorSchema` | Iniciativas, Objetivos | **OK** |
| 8 | Validación (resumen) | `/validacion` | Dashboard resumen: planes activos + últimas 5 ejecuciones | R | `pm_planes_validacion`, `pm_ejecuciones_validacion` | Ninguna | Módulos | **OK** |
| 9 | Validación por módulo | `/validacion/por-modulo` | CRUD planes + plantillas; aplicar plantilla a plan | CRUD | `pm_planes_validacion`, `pm_plantillas_validacion` | `planValidacionSchema`, `plantillaValidacionSchema` | Módulos, Estados | **OK** |
| 10 | Ejecuciones de Validación | `/validacion/ejecuciones` | CRUD ejecuciones de planes | CRUD | `pm_ejecuciones_validacion` | `ejecucionValidacionSchema` | Planes, Módulos, Estados | **OK** |
| 11 | Decisiones | `/decisiones` | CRUD decisiones PM con links/tags y referencias cruzadas | CRUD | `pm_decisiones` | `decisionPmSchema` | Iniciativas, Entregas, Ejecuciones, Estados | **OK** |
| 12 | Auditorías | `/auditorias` | CRUD auditorías + hallazgos (entidad anidada) | CRUD x2 | `pm_auditorias`, `pm_hallazgos_auditoria`, `pm_catalogo_tipos_auditoria` | `auditoriaPmSchema`, `hallazgoAuditoriaSchema` | Tipos, Módulos, Severidades, Estados, Decisiones, Ejecuciones | **OK (Parcial: formulario grande)** |
| 13 | Ajustes | `/ajustes` | Gestión de catálogos: ventanas, etapas, módulos, severidades, KPIs, integraciones, RICE config | CRUD x8 | `pm_catalogo_ventanas`, `pm_catalogo_etapas`, `pm_catalogo_modulos`, `pm_catalogo_severidades`, `pm_catalogo_estados`, `kpis_config`, `pm_integraciones_config`, `configuracion_rice` | Esquemas Zod por catálogo | Ninguna | **Parcial (1058 líneas, demasiado acoplado)** |

---

## 3. Trazabilidad UI → Caso de Uso → Repositorio → Supabase

### Arquitectura confirmada

```
Presentación (páginas/componentes)
  → Casos de Uso (aplicacion/casos-uso/)
    → Repositorios (infraestructura/repositorios/)
      → clienteSupabase → Supabase (tablas)
```

### Mapa de trazabilidad por entidad clave

| UI | Caso de Uso | Repositorio | Tabla(s) Supabase | Lógica extra |
|---|---|---|---|---|
| `PaginaObjetivosRoadmap` | `crearObjetivo`, `editarObjetivo`, `eliminarObjetivo` | `repositorioObjetivos` | `objetivos` | Ninguna |
| `PaginaIniciativasRoadmap` | `crearIniciativa`, `editarIniciativa` | `repositorioIniciativas` | `iniciativas` | **RICE calculado en UC** antes de persist |
| `PaginaEntregasRoadmap` | `crearEntrega`, `editarEntrega` | `repositorioEntregas` | `entregas` | Ninguna |
| `PaginaMatrizValor` | `crearMatrizValor`, `editarMatrizValor` | `repositorioMatrizValor` | `matriz_valor` | **puntaje_valor calculado en UC** antes de persist |
| `PaginaValidacionPorModulo` | `crearPlanValidacion`, `crearPlantillaValidacion` | `repositorioValidaciones` | `pm_planes_validacion`, `pm_plantillas_validacion` | Aplicar plantilla→plan (lógica UI) |
| `PaginaEjecucionesValidacion` | `crearEjecucionValidacion` | `repositorioEjecucionesValidacion` | `pm_ejecuciones_validacion` | Ninguna |
| `PaginaDecisiones` | `crearDecisionPm` | `repositorioDecisiones` | `pm_decisiones` | links/tags: texto→array en UI |
| `PaginaAuditorias` | `crearAuditoriaPm`, `crearHallazgoAuditoriaPm` | `repositorioAuditorias` | `pm_auditorias`, `pm_hallazgos_auditoria` | Ninguna |
| `PaginaAjustes` | 18 funciones de ajustes | `repositorioAjustes` | 8 tablas de catálogo | Config RICE con upsert |

### Inconsistencias detectadas (UI → DB)

| # | Tipo | Detalle |
|---|---|---|
| I-1 | Schema/Repo | `iniciativa.rice` y `matriz_valor.puntaje_valor` son campos calculados ausentes en Zod → se inyectan en UC; correcto pero no documentado |
| I-2 | Weak validation | `estado_codigo` en planes, ejecuciones, decisiones, auditorías, hallazgos: validado solo como `string(2-60)` en Zod; debería ser enum dinámico contra `pm_catalogo_estados` |
| I-3 | Weak validation | Campos de fecha (`fecha_decision`, `fecha_auditoria`, `fecha_ejecucion`): validados como `string.min(10).max(20)`, sin regex ni `.datetime()`. Acepta strings inválidos |
| I-4 | Null handling | `repositorioEntregas` pasa `entrada` directo a Supabase; otros repos normalizan nulls con `|| null`. Inconsistente. |
| I-5 | Race condition | `guardarConfiguracionRice()`: pattern read-then-insert sin constraint único. Dos llamadas simultáneas pueden causar doble INSERT |
| I-6 | No FK validation | `MatrizValor.iniciativa_id`, `HallazgoAuditoriaPm.auditoria_id`, `DecisionPm.iniciativa_id/entrega_id` no verifican existencia antes de insertar |
| I-7 | Computed fields | `MatrizValor.puntaje_valor = valor_negocio * 2 - esfuerzo - riesgo`; puede ser negativo (edge case no manejado en UI) |

---

## 4. Persistencia por Módulo

> **Nota metodológica:** Auditoría es SOLO LECTURA. No se crearon registros de prueba. La confirmación de persistencia se basa en trazado de código: llamadas reales a Supabase, tablas reales, sin mocks ni datos hardcodeados en repos.

| Módulo | Tabla Supabase | Insert confirmado (código) | Select confirmado | Update confirmado | Delete confirmado | Estado |
|---|---|---|---|---|---|---|
| Objetivos | `objetivos` | ✓ `.insert(entrada).select('*').single()` | ✓ `.select('*').order('updated_at', desc)` | ✓ `.update(entrada).eq('id', id)` | ✓ `.delete().eq('id', id)` | **CONFIRMADO** |
| Iniciativas | `iniciativas` | ✓ con `rice` calculado | ✓ | ✓ | ✓ | **CONFIRMADO** |
| Entregas | `entregas` | ✓ | ✓ | ✓ | ✓ | **CONFIRMADO** |
| Matriz Valor | `matriz_valor` | ✓ con `puntaje_valor` calculado | ✓ | ✓ | ✓ | **CONFIRMADO** |
| Planes Validación | `pm_planes_validacion` | ✓ | ✓ | ✓ | ✓ | **CONFIRMADO** |
| Plantillas Validación | `pm_plantillas_validacion` | ✓ | ✓ | ✓ | ✓ | **CONFIRMADO** |
| Ejecuciones Validación | `pm_ejecuciones_validacion` | ✓ | ✓ | ✓ | ✓ | **CONFIRMADO** |
| Decisiones PM | `pm_decisiones` | ✓ | ✓ | ✓ | ✓ | **CONFIRMADO** |
| Auditorías PM | `pm_auditorias` | ✓ | ✓ | ✓ | ✓ | **CONFIRMADO** |
| Hallazgos Auditoría | `pm_hallazgos_auditoria` | ✓ | ✓ | ✓ | ✓ | **CONFIRMADO** |
| Catálogos (Ajustes) | 8 tablas `pm_catalogo_*` + `kpis_config` + `pm_integraciones_config` + `configuracion_rice` | ✓ | ✓ | ✓ | ✓ | **CONFIRMADO** |
| RLS / Policies | — | NO CONFIRMADO | NO CONFIRMADO | NO CONFIRMADO | NO CONFIRMADO | **NO CONFIRMADO** (requiere acceso BD) |
| Perfiles/Roles | `perfiles` | NO evaluado (solo lectura en UI) | ✓ | NO evaluado | NO evaluado | **PARCIAL** |

---

## 5. Hallazgos por Severidad

### P0 — Bloquea operación o riesgo de seguridad

| ID | Hallazgo | Evidencia | Acción requerida |
|---|---|---|---|
| P0-1 | **Credenciales Supabase en historial git** | `git log --all -- apps/pm-portal/.env` muestra commit `d29e7f6e` "remove .env file containing Supabase credentials". El `.env` se commitó y luego se borró, pero las credenciales permanecen en la historia git. | **Rotar inmediatamente** la `VITE_SUPABASE_ANON_KEY` en el panel de Supabase. Limpiar git history con `git filter-repo` o BFG si el repo es público/compartido. |
| P0-2 | **RLS no confirmada** | Los repositorios usan `clienteSupabase` con anon key. No hay evidencia en código de políticas RLS activas. Si las tablas `objetivos`, `iniciativas`, etc. no tienen RLS, cualquier usuario autenticado puede leer/escribir todos los registros de todos los tenants. | Verificar y documentar RLS en Supabase dashboard para todas las tablas. Ejecutar prueba de acceso cruzado. |

### P1 — Afecta lógica/consistencia o UX fuertemente

| ID | Hallazgo | Evidencia | Recomendación |
|---|---|---|---|
| P1-1 | **Cero notificaciones toast en toda la app** | Revisión de 13 páginas: ninguna muestra feedback de éxito/error al usuario tras crear/editar/eliminar. Solo se setea estado `error` en componente pero sin notificación visible. | Implementar sistema de toasts (ej. `react-hot-toast` o similar). Añadir en todos los onSubmit y onDelete. |
| P1-2 | **Errores de validación Zod no visibles en formularios** | `PaginaEjecucionesValidacion` y `PaginaValidacionPorModulo`: `formState.errors` no se mapea a los campos del formulario en UI. Usuario ve botón deshabilitado sin explicación. | Añadir `{errors.campo && <p>{errors.campo.message}</p>}` bajo cada campo afectado. |
| P1-3 | **Sin transiciones de estado controladas** | No existe lógica que impida pasar un objetivo de `pendiente` a `completado` directamente, ni que valide `fecha_completado` al marcar como completado una entrega. | Definir matrix de transiciones permitidas y validar en caso de uso. Autocompletar `fecha_completado` al estado `completado`. |
| P1-4 | **Delete sin cascada controlada a nivel app** | Eliminar un Objetivo que tiene Iniciativas: la app no advierte ni bloquea. Si la FK en DB no tiene `ON DELETE CASCADE`, fallará silenciosamente (error de constraint); si sí tiene CASCADE, borrará iniciativas sin confirmación. | Verificar FK constraints en DB. En app: antes de eliminar objetivo, verificar si tiene hijos y pedir confirmación explícita. |
| P1-5 | **Validación de fechas débil** | `fecha_decision`, `fecha_auditoria`, `fecha_ejecucion` → `z.string().trim().min(10).max(20)`. Permite `"12345678901234"` como fecha válida. Evidencia: `esquemas.ts` líneas ~100, ~130, ~160. | Cambiar a `z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')` o `z.coerce.date()`. |
| P1-6 | **`estado_codigo` sin enum validation** | En planes, ejecuciones, decisiones, auditorías y hallazgos: `estado_codigo: z.string().trim().min(2).max(60)`. Cualquier string pasa. Si el usuario o atacante envía un código inexistente, se guarda en DB sin validar. | Cargar catálogo de estados al montar formulario y validar contra él, o añadir enum estricto por ámbito. |
| P1-7 | **Race condition en upsert RICE config** | `repositorioAjustes.ts`: read → conditional insert. Dos llamadas paralelas pueden insertar dos filas. La segunda falla silenciosamente. | Usar `INSERT INTO configuracion_rice ... ON CONFLICT (id) DO UPDATE` o añadir constraint UNIQUE en tabla y manejar el conflicto. |
| P1-8 | **PaginaAjustes tiene 1058 líneas** | `wc -l apps/pm-portal/src/presentacion/paginas/ajustes/PaginaAjustes.tsx` → 1058. Gestiona 8 catálogos distintos. Difícil de mantener, propensa a bugs de estado compartido. | Descomponer en sub-páginas o sub-componentes por catálogo: `TabVentanas`, `TabEtapas`, `TabModulos`, etc. |

### P2 — Mejoras / deuda técnica / performance

| ID | Hallazgo | Evidencia | Recomendación |
|---|---|---|---|
| P2-1 | **Paginación solo client-side** | Todos los repositorios usan `SELECT *` sin `limit/offset`. `usePaginacion.ts` pagina en memoria. Para tablas grandes (>5000 filas), carga completa puede ser lenta. | Añadir `range(desde, hasta)` en repos y pasar `page/pageSize` desde las páginas. Implementar server-side pagination. |
| P2-2 | **Bundle size 764 kB (warning suprimido)** | `vite.config.ts`: `chunkSizeWarningLimit: 1200`. Build produce `index-CHiuwG5X.js` de 764 kB. Vite normalmente advierte en >500 kB. | Implementar code-splitting por ruta con `React.lazy()` + `Suspense`. Reducir bundle y restaurar límite a 500 kB. |
| P2-3 | **`slice(0, 5)` y `slice(0, 3)` hardcodeados** | `PaginaValidacion.tsx:38` — últimas 5 ejecuciones. `PaginaRoadmap.tsx:181, 213` — top 5 iniciativas. `PaginaMatrizValor.tsx:255` — top 3 matrices. | Convertir en constante configurables o extraer a props/config. |
| P2-4 | **`window.confirm()` para confirmaciones de borrado** | Todos los delete en 13 páginas usan `window.confirm(...)`. Diálogo nativo del browser, bloquea UI, no es accesible, no soporta internacionalización. | Implementar `ModalConfirmacion` reutilizable con mensaje personalizado y callbacks de confirmación. |
| P2-5 | **ModalPortal no cierra con tecla Escape** | `compartido/ui/ModalPortal.tsx`: backdrop click implementado, pero no hay listener de `keydown` para Escape. Falla accesibilidad WCAG 2.1 (patrón dialog). | Añadir `useEffect(() => { const handler = (e) => { if (e.key === 'Escape') onCerrar() }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler) })`. |
| P2-6 | **Filtros no sincronizados a URL en páginas consistentemente** | `PaginaObjetivosRoadmap` y `PaginaTablero` (filtro de métricas) no sincronizan filtros a URL. El resto sí lo hace. | Aplicar el patrón `useSearchParams` de forma uniforme en todas las páginas. |
| P2-7 | **Default form values con array indexing** | `PaginaAuditorias.tsx:88` — `tiposAuditoria[0]?.codigo ?? ''`. Si la carga de catálogos falla o llega vacía, el formulario defaultea a string vacío y la validación falla sin feedback. | Usar `undefined` como default y añadir opción vacía "Seleccionar..." en select. Validar campo como requerido para que el error sea visible. |
| P2-8 | **Sin debounce en inputs de búsqueda** | Todas las páginas con búsqueda recomputá el `useMemo` en cada tecla. Con datasets grandes puede causar jank. | Añadir `useDebounce` de 200-300 ms en el input de búsqueda. |
| P2-9 | **Null normalization inconsistente** | `repositorioEntregas`: pasa `entrada` directo. `repositorioAuditorias`: `responsable: entrada.responsable || null`. `repositorioDecisiones`: `owner: entrada.owner || null`. | Estandarizar: todos los repos deben normalizar campos opcionales a `null` explícitamente. |
| P2-10 | **`obtenerResumen()` no atómico** | `repositorioValidaciones.ts` llama `listarPlanes()` y `listarPlantillas()` en `Promise.all`. No son atómicas; datos del resumen pueden estar desincronizados. | Aceptable para dashboard. Documentar como "approximate summary". Si se requiere exactitud, usar una vista SQL o función Supabase. |

---

## 6. Checklist "100% Listo"

| Criterio | Cumple | Nota |
|---|---|---|
| Todas las rutas/páginas identificadas | ✅ | 13 páginas, 13 rutas documentadas |
| Todas las acciones CRUD trazadas a DB | ✅ | 9 repositorios → 18+ tablas |
| Sin mock/seed data en repos | ✅ | Solo `CONFIGURACION_RICE_DEFECTO` como default aceptable |
| Sin hardcode de IDs de negocio | ✅ | `sin_asignar` es sentinel UI, no almacenado en DB |
| Sin TODO/FIXME en código | ✅ | Ninguno encontrado |
| Sin console.log en producción | ✅ | Solo `console.warn` en config faltante y `console.error` en ErrorBoundary (aceptables) |
| Lint OK (0 errores, 0 warnings) | ✅ | `npm run lint` → sin output de errores |
| Build OK (0 errores) | ✅ | `npm run build` → ✓ 212 modules, built in 9.52s |
| Feedback de éxito/error al usuario (toasts) | ❌ | Ninguna página implementa notificaciones |
| Validación de formularios visible en UI | ❌ | 2 páginas no muestran errores de campo |
| Credenciales NO en historial git | ❌ | `.env` fue commitado (commit `d29e7f6e`) — credenciales en historia |
| RLS confirmada por cada tabla | ❌ | NO CONFIRMADO — requiere acceso directo a Supabase |
| Transiciones de estado controladas | ❌ | Sin guards de transición de estados |
| Delete con validación de cascada | ❌ | Sin verificación de hijos antes de eliminar |
| Paginación server-side para listados grandes | ❌ | Todo es client-side |
| Validación de fechas robusta | ❌ | Solo longitud de string, no formato real |
| Accesibilidad modal (Escape key, focus trap) | ❌ | Escape no cierra modal |
| Bundle size óptimo (<500 kB) | ❌ | 764 kB (límite elevado a 1200 kB en config) |

---

## 7. Recomendaciones Priorizadas (máximo 15)

| # | Prioridad | Recomendación | Esfuerzo estimado |
|---|---|---|---|
| 1 | **INMEDIATA** | Rotar `VITE_SUPABASE_ANON_KEY` en Supabase console. Limpiar historia git con BFG/filter-repo si el repo es compartido/público. | 1h |
| 2 | **INMEDIATA** | Verificar y documentar RLS en Supabase para tablas: `objetivos`, `iniciativas`, `entregas`, `matriz_valor`, `pm_decisiones`, `pm_auditorias`, `pm_hallazgos_auditoria`, y todas las tablas `pm_planes/ejecuciones`. | 2-4h |
| 3 | **Alta** | Implementar sistema de notificaciones toast global (`react-hot-toast` o `sonner`). Añadir a todos los onSubmit y onDelete en las 11 páginas con formularios. | 4-6h |
| 4 | **Alta** | Mostrar errores de validación Zod en `PaginaEjecucionesValidacion` y `PaginaValidacionPorModulo` (mapear `formState.errors` a los campos del formulario). | 1-2h |
| 5 | **Alta** | Corregir validación de fechas en `esquemas.ts` para `fecha_decision`, `fecha_auditoria`, `fecha_ejecucion`: usar regex `^\d{4}-\d{2}-\d{2}$` o `z.coerce.date()`. | 1h |
| 6 | **Alta** | Añadir validación de `estado_codigo` como enum dinámico (cargado de `pm_catalogo_estados`) o al menos como union type por ámbito en esquemas relevantes. | 2-3h |
| 7 | **Alta** | Añadir Escape key handler en `ModalPortal.tsx` para cumplir accesibilidad WCAG y mejorar UX. | 30 min |
| 8 | **Media** | Descomponer `PaginaAjustes.tsx` (1058 líneas) en sub-componentes por catálogo: `TabVentanas`, `TabEtapas`, `TabModulos`, etc. | 4-6h |
| 9 | **Media** | Reemplazar `window.confirm()` por un `ModalConfirmacion` reutilizable con props `mensaje`, `onConfirmar`, `onCancelar`. | 3-4h |
| 10 | **Media** | Implementar paginación server-side en repositorios de alto volumen (`iniciativas`, `auditorias`, `decisiones`). Añadir `range(offset, limit)` en repos. | 4-6h |
| 11 | **Media** | Implementar code-splitting por ruta con `React.lazy` + `Suspense`. Reducir bundle de 764 kB y restaurar `chunkSizeWarningLimit` a 500 kB. | 3-4h |
| 12 | **Media** | Definir y aplicar matrix de transiciones de estado permitidas en casos de uso. Auto-completar `fecha_completado` al cambiar estado de entrega a `completado`. | 2-3h |
| 13 | **Media** | Corregir race condition en `guardarConfiguracionRice()`: usar INSERT ... ON CONFLICT DO UPDATE (upsert nativo de Supabase: `.upsert(entrada, { onConflict: 'id' })`). | 1h |
| 14 | **Baja** | Estandarizar null normalization en todos los repositorios: crear helper `normalizarNullable(valor)` y aplicarlo consistentemente. | 2h |
| 15 | **Baja** | Añadir `useDebounce` (200ms) en inputs de búsqueda para evitar recomputación en cada tecla. | 1h |

---

## 8. Resultado de Lint y Build

### Lint
```
> portal-pm@0.1.0 lint
> eslint .

(sin output = 0 errores, 0 warnings)
```
**Resultado: ✅ LINT OK — 0 errores, 0 warnings**

### Build
```
> portal-pm@0.1.0 build
> npm run generar:estado && tsc -b && vite build

> portal-pm@0.1.0 generar:estado
> node scripts/generarEstadoDespliegue.mjs

Estado de despliegue generado en C:\FacturaFacil\apps\pm-portal\public\estado.json

vite v7.3.1 building client environment for production...
transforming...
✓ 212 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.41 kB │ gzip:   0.28 kB
dist/assets/index-CZ-IoL7j.css  23.73 kB │ gzip:   4.83 kB
dist/assets/index-CHiuwG5X.js  764.49 kB │ gzip: 197.42 kB
✓ built in 9.52s
```
**Resultado: ✅ BUILD OK — 0 errores, 0 warnings**

> **Nota importante sobre el bundle:** El JS pesa 764 kB (gzip: 197 kB). Vite normalmente advierte en >500 kB, pero `vite.config.ts` tiene `chunkSizeWarningLimit: 1200`, lo que suprime la advertencia. Se recomienda implementar code-splitting para reducir el bundle (ver Rec. #11).

---

## 9. Apéndice: Comandos exactos utilizados

```bash
# Inventario de estructura
ls /c/FacturaFacil/apps/pm-portal/src/

# Mapeo de tablas Supabase
grep -rn "\.from\('" /c/FacturaFacil/apps/pm-portal/src/infraestructura/repositorios/

# Búsqueda de hardcode / anti-patrones
grep -rn "hardcode|seed|demo|mock|TODO|FIXME|MVP|quarter|trimestre|Q1|Q2" \
  /c/FacturaFacil/apps/pm-portal/src/ -i

# Verificación de sin_asignar
grep -rn "sin_asignar\|sin asignar" /c/FacturaFacil/apps/pm-portal/src/

# Patrones de slice hardcodeado en UI
grep -rn "slice(0," /c/FacturaFacil/apps/pm-portal/src/presentacion/

# Patrones catch/console/window.confirm
grep -n "window\.confirm\|catch\|console\." \
  /c/FacturaFacil/apps/pm-portal/src/presentacion/paginas/ajustes/PaginaAjustes.tsx

# Verificar .gitignore
cat /c/FacturaFacil/.gitignore

# Verificar si .env fue commiteado alguna vez
git -C /c/FacturaFacil ls-files apps/pm-portal/.env
git -C /c/FacturaFacil log --oneline --all -- apps/pm-portal/.env

# Vite config
cat /c/FacturaFacil/apps/pm-portal/vite.config.ts

# Tamaño de PaginaAjustes
wc -l /c/FacturaFacil/apps/pm-portal/src/presentacion/paginas/ajustes/PaginaAjustes.tsx

# Lint
npm --prefix apps/pm-portal run lint

# Build
npm --prefix apps/pm-portal run build

# (Ejecutados desde /c/FacturaFacil)
```

---

*Auditoría realizada en modo solo lectura. Ningún archivo fue modificado. Ninguna migración ni insert fue ejecutado.*
