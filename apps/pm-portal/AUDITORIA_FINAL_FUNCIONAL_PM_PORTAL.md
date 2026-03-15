# AUDITORÍA FINAL FUNCIONAL — PM Portal
**Fecha:** 2026-03-15
**Auditor:** Claude Sonnet 4.6 — rol: auditor senior de producto + auditor técnico funcional + revisor UX funcional
**Rama auditada:** pm-construccion
**Método:** lectura directa de código fuente (~90 archivos), análisis de relaciones, lint + build

---

## 1. Resumen ejecutivo

### Diagnóstico general

El PM Portal es un sistema de Product Management de alcance corporativo completo: 38 rutas, ~35 tipos de entidad gestionados, ~28 páginas CRUD, ~10 páginas de solo lectura/resumen, cobertura de audit trail al 100%, sistema de roles funcional, exports CSV, paginación, URL persistence, dark mode, y TypeScript sin errores.

El sistema no es un prototipo. Tiene estructura, coherencia y profundidad. La mayoría de sus módulos están funcionalmente completos y pueden considerarse cerrados.

Sin embargo, existen **inconsistencias reales y localizables** — principalmente en el módulo de Analítica — que impiden declarar el sistema como 100% listo sin correcciones menores.

### Estado actual real

**Sistema sólido, con 4-6 ajustes menores pendientes, ninguno crítico para operación.**

El sistema ya puede usarse en un contexto corporativo. Lo pendiente no rompe flujos principales ni impide el uso. Son inconsistencias de experiencia y un hueco de paginación en Analítica.

### Conclusión honesta

> El PM Portal está en estado **maduro beta-corporativa**. No es perfecto. Tiene rugosidades reales. Pero cierra funcionalmente de punta a punta, conecta sus módulos de forma coherente, y supera ampliamente el umbral de un sistema serio de product management. Con 4-6 correcciones puntuales, puede considerarse corporativamente concluido.

---

## 2. Ponderación global

| Dimensión | Puntaje | Evidencia |
|---|---|---|
| Arquitectura funcional | 9/10 | 38 rutas, separación limpia dominio/aplicación/infraestructura/presentación, patrones consistentes |
| Consistencia entre módulos | 8/10 | URL persistence, paginación, filtros, modales — todos consistentes; excepción: Analítica |
| Integridad de relaciones | 8.5/10 | FK explícitas entre todas las entidades, M2M correctamente implementados, algunas asimetrías direccionales menores |
| Claridad de navegación | 7.5/10 | Sidebar mejorado con toggle manual; menú denso (~50 ítems) pero manejable |
| Completitud de CRUDs | 9.5/10 | Todos los módulos tienen crear/editar/ver/eliminar; validación con Zod; excepción: campos free-text en 3 entidades |
| Calidad de resúmenes | 8/10 | Resúmenes con datos cruzados reales; PaginaValidacion es el más delgado |
| UX funcional | 7.5/10 | Patrones claros, dark mode, estados vacíos; Analítica inconsistente, modal ancho limitado en formularios complejos |
| Audit trail / trazabilidad | 10/10 | `registrarCambioEntidadBestEffort` en 100% de mutaciones, con snapshot antes/después |
| Gestión de roles | 9/10 | lector/editor/admin correctamente aplicado en todas las páginas |
| Validación técnica | 10/10 | Lint limpio, build limpio, TypeScript sin errores |
| **Readiness general** | **8.2/10** | Sistema usable corporativamente con ajustes menores pendientes |

---

## 3. Inventario del sistema

| Módulo | Submódulo | Ruta | Tipo | Estado | Observación |
|---|---|---|---|---|---|
| Tablero | — | `/` | Dashboard PM + infra | ✅ Completo | Salud global funcional; lógica de señal levemente agresiva |
| Estrategia | Períodos | `/estrategia/periodos` | CRUD | ✅ Completo | GestionPeriodosEstrategicos embebido también en resumen |
| Estrategia | OKRs | `/estrategia/okrs` | CRUD | ✅ Completo | M2M con KRs, hipótesis; RICE no aplica aquí, bien separado |
| Estrategia | KPIs estratégicos | `/estrategia/kpis` | CRUD | ✅ Completo | Semáforo triple umbral funcional |
| Estrategia | Hipótesis estrategia | `/estrategia/hipotesis` | CRUD | ✅ Completo | Banner diferenciador correcto |
| Estrategia | Resumen | `/estrategia` | Dashboard | ✅ Completo | 6 KPIs + panel relaciones cruzadas + % avance |
| Discovery | Insights | `/discovery/insights` | CRUD | ✅ Completo | tipo free-text → filtro dinámico frágil |
| Discovery | Problemas | `/discovery/problemas` | CRUD | ✅ Completo | M2M con insights y objetivos estratégicos |
| Discovery | Investigaciones | `/discovery/investigaciones` | CRUD | ✅ Completo | tipo free-text → filtro dinámico frágil |
| Discovery | Segmentos | `/discovery/segmentos` | CRUD | ✅ Completo | Simple, sin relaciones directas |
| Discovery | Hipótesis discovery | `/discovery/hipotesis` | CRUD | ✅ Completo | Banner diferenciador; vinculo asimétrico con problemas |
| Discovery | Resumen | `/discovery` | Dashboard | ⚠️ Funcional | Sin filtros en el resumen; denso con muchos recientes |
| Requerimientos | Historias de usuario | `/requerimientos/historias` | CRUD + sub-entidad | ✅ Completo | Criterios de aceptación embebidos, reordenables |
| Requerimientos | Casos de uso | `/requerimientos/casos-uso` | CRUD | ✅ Completo | Vinculo a historia_usuario_id sin navegación inversa |
| Requerimientos | Reglas de negocio | `/requerimientos/reglas-negocio` | CRUD | ✅ Completo | categoria free-text; vinculo a historia sin navegación inversa |
| Requerimientos | No funcionales | `/requerimientos/no-funcionales` | CRUD | ✅ Completo | tipo enum correctamente tipado |
| Requerimientos | Resumen | `/requerimientos` | Dashboard | ✅ Completo | Vínculos con roadmap claros |
| Roadmap | Objetivos | `/roadmap/objetivos` | CRUD | ⚠️ Funcional | Sin URL persistence ni paginación |
| Roadmap | Iniciativas | `/roadmap/iniciativas` | CRUD | ✅ Completo | RICE auto-calculado, M2M con KRs e hipótesis, 5 filtros |
| Roadmap | Entregas | `/roadmap/entregas` | CRUD | ✅ Completo | 12 fuentes cruzadas, rich derived data, rich filters |
| Roadmap | Resumen | `/roadmap` | Dashboard | ✅ Completo | 9 KPI cards, plan vs real, top RICE, próximas entregas |
| Matriz de valor | — | `/matriz-valor` | CRUD | ✅ Completo | Fórmula live preview, score calculado server-side |
| Validación | Por módulo | `/validacion/por-modulo` | CRUD doble | ✅ Completo | Planes + plantillas en una página; auto-fill desde plantilla |
| Validación | Ejecuciones | `/validacion/ejecuciones` | CRUD | ✅ Completo | Catálogo dinámico de estados |
| Validación | Resumen | `/validacion` | Dashboard | ⚠️ Delgado | Solo 3 KPIs + top 5 ejecuciones; no hay señal de calidad |
| Lanzamientos | Releases | `/lanzamientos/releases` | CRUD | ✅ Completo | Checklist de salida embebido, reordenable, 9 fuentes cruzadas |
| Lanzamientos | Seguimiento | `/lanzamientos/seguimiento` | CRUD | ⚠️ Funcional | Sin búsqueda de texto |
| Lanzamientos | Resumen | `/lanzamientos` | Dashboard | ✅ Completo | 7 KPIs, gobierno cross-signals, recientes |
| Operación | Bugs | `/operacion/bugs` | CRUD | ✅ Completo | 9 filtros, referencias cruzadas completas |
| Operación | Mejoras | `/operacion/mejoras` | CRUD | ✅ Completo | Vínculos a discovery (insight + hipótesis) |
| Operación | Deuda técnica | `/operacion/deuda-tecnica` | CRUD | ✅ Completo | — |
| Operación | Bloqueos | `/operacion/bloqueos` | CRUD | ✅ Completo | — |
| Operación | Lecciones aprendidas | `/operacion/lecciones` | CRUD | ✅ Completo | Vínculos a auditorías y releases |
| Operación | Resumen | `/operacion` | Dashboard | ✅ Completo | Gobierno cross-signals integrados |
| Analítica | KPIs ejecutivos | `/analitica/kpis` | CRUD | ❌ Problema | **Sin paginación**, sin URL persistence |
| Analítica | Health Scores | `/analitica/health-scores` | CRUD | ❌ Problema | **Sin paginación, sin búsqueda**, sin URL persistence |
| Analítica | Portafolio | `/analitica/portafolio` | Solo lectura | ⚠️ Funcional | Estado filter free-text, sin URL persistence |
| Analítica | Tendencias | `/analitica/tendencias` | Solo lectura | ✅ Correcto | Solo lectura — paginación no aplica |
| Analítica | Resumen | `/analitica` | Dashboard | ⚠️ Funcional | 27 fuentes en Promise.all — si una falla, todo falla |
| Gobierno | Stakeholders | `/gobierno/stakeholders` | CRUD | ✅ Completo | — |
| Gobierno | Riesgos | `/gobierno/riesgos` | CRUD | ✅ Completo | — |
| Gobierno | Dependencias | `/gobierno/dependencias` | CRUD | ✅ Completo | — |
| Gobierno | Resumen | `/gobierno` | Dashboard | ✅ Completo | Señales ejecutivas, distribuciones, próximos vencimientos |
| Decisiones | — | `/decisiones` | CRUD | ✅ Completo | ADR completo, contadores cross-module, pagination URL |
| Auditorías | — | `/auditorias` | CRUD doble | ✅ Completo | Auditorías + hallazgos, paginaciones independientes |
| Ajustes | RICE | `/ajustes?vista=rice` | Config | ✅ Completo | Solo admin |
| Ajustes | Planificación | `/ajustes?vista=planificacion` | CRUD | ✅ Completo | Ventanas y etapas, sub-tabs |
| Ajustes | Módulos | `/ajustes?vista=modulos` | CRUD | ✅ Completo | — |
| Ajustes | Severidades | `/ajustes?vista=severidades` | CRUD | ✅ Completo | — |
| Ajustes | KPIs | `/ajustes?vista=kpis` | CRUD | ✅ Completo | — |
| Ajustes | Integraciones | `/ajustes?vista=integraciones` | CRUD | ✅ Completo | JSON config textarea con serialización |
| Trazabilidad | — | `/trazabilidad` | Solo lectura | ✅ Completo | Admin-only, 6 filtros, modal JSON |

**Leyenda:** ✅ Completo · ⚠️ Funcional con observaciones · ❌ Problema funcional real

---

## 4. Auditoría por módulo

### TABLERO
- **Qué existe:** Dashboard PM-first con 5 bloques: encabezado ejecutivo, snapshot PM (5 tarjetas con señales activas), atención inmediata (condicional), salud global derivada, bloque técnico compacto (deploy + Supabase + PostHog).
- **Qué está bien:** Separación clara entre datos PM y datos técnicos. Carga paralela de 4 fuentes PM. Auto-apertura del módulo activo en sidebar via useEffect.
- **Qué está excelente:** La señal de "salud global" derivada de múltiples fuentes. El bloque de atención inmediata que solo aparece cuando hay algo real.
- **Qué está incompleto:** —
- **Qué está inconsistente:** La lógica `derivarSaludGlobal` marca "En riesgo" con `bloqueosActivos > 0` sin distinguir severidad del bloqueo. Un bloqueo en estado `en_seguimiento` de prioridad baja activa la señal roja.
- **Severidad del módulo:** Baja
- **Readiness:** ✅ Listo con observación menor

### ESTRATEGIA
- **Qué existe:** Períodos, OKRs (Objetivos + KRs), KPIs estratégicos, Hipótesis. Resumen con avance calculado.
- **Qué está bien:** M2M entre KRs e iniciativas/objetivos roadmap. Avance calculado via `calcularAvancePorcentaje`. Banners diferenciadores en hipótesis y objetivos.
- **Qué está excelente:** La gestión de períodos integrada tanto en su página propia como inline en el resumen. El sistema de síncronización de relaciones M2M es robusto.
- **Qué está incompleto:** —
- **Qué está inconsistente:** `GestionPeriodosEstrategicos` aparece embebido en `PaginaResumenEstrategico` como panel siempre visible. Mezcla gestión CRUD con visualización de resumen.
- **Severidad del módulo:** Baja
- **Readiness:** ✅ Listo

### DISCOVERY
- **Qué existe:** Insights, Problemas/Oportunidades, Investigaciones, Segmentos, Hipótesis discovery. Resumen con recientes.
- **Qué está bien:** M2M correctamente implementado: insight↔problema, insight↔decisión, problema↔objetivo estratégico, hipótesis↔iniciativa, investigación↔insight.
- **Qué está excelente:** La profundidad del modelo de discovery: el sistema captura el ciclo completo (investigación → insight → problema → hipótesis → iniciativa). Es raro ver esto bien implementado.
- **Qué está incompleto:** El resumen no tiene filtros. Con muchos items, el PM no puede orientarse.
- **Qué está inconsistente:** `tipo` en insights e `tipo_investigacion` en investigaciones son campos free-text. Los filtros correspondientes generan opciones dinámicamente desde los datos cargados, lo que funciona pero es frágil: dos usuarios escribiendo "Entrevista" e "entrevista" rompen la agrupación.
- **Severidad del módulo:** Media (por free-text types)
- **Readiness:** ⚠️ Funcional, mejora recomendada en tipos

### REQUERIMIENTOS
- **Qué existe:** Historias de usuario (con criterios de aceptación), Casos de uso, Reglas de negocio, RNF. Resumen con vínculos a roadmap.
- **Qué está bien:** La gestión de criterios de aceptación embebida en la historia de usuario es la implementación más cuidada del sistema — reordenables, con estado de validación, obligatorio/opcional.
- **Qué está excelente:** Los RNF tienen un `tipo` tipado como enum (no free-text). Bien hecho.
- **Qué está incompleto:** Navegación inversa ausente: una historia no muestra sus casos de uso ni reglas de negocio asociadas. Un caso de uso no muestra su historia padre con link. Solo navegable en una dirección.
- **Qué está inconsistente:** `categoria` en reglas de negocio es free-text (misma fragilidad que discovery types).
- **Severidad del módulo:** Baja-Media
- **Readiness:** ✅ Listo con observación menor

### ROADMAP
- **Qué existe:** Objetivos roadmap (distintos de OKR), Iniciativas (con RICE), Entregas. Resumen rico con 9 KPIs, plan vs real, top RICE.
- **Qué está bien:** El RICE auto-calculado server-side en crear/editar. El `planVsReal` comparando ventana planificada vs real. Las 12 fuentes cruzadas en entregas mostrando estado operativo completo.
- **Qué está excelente:** La entrega es la entidad mejor conectada del sistema — tiene vínculos a releases, historias, RNF, bugs, bloqueos, deudas, mejoras, lecciones. La vista de entregas es una herramienta de PM real.
- **Qué está incompleto:** —
- **Qué está inconsistente:** `PaginaObjetivosRoadmap` no tiene URL persistence ni paginación. Es la única entidad fundacional del roadmap sin esas capacidades. Si un PM tiene 30+ objetivos y filtra, pierde el filtro al navegar.
- **Severidad del módulo:** Media (objetivos sin URL persistence es un hueco real)
- **Readiness:** ⚠️ Objetivos necesita URL persistence + paginación

### MATRIZ DE VALOR
- **Qué existe:** Scoring manual por iniciativa con fórmula `valor_negocio * 2 - esfuerzo - riesgo`. Live preview. Top 3 en panel resumen.
- **Qué está bien:** La fórmula es transparente y el cálculo se hace server-side antes de persistir. Live preview del score en el formulario.
- **Qué está inconsistente:** No hay validación de rango en `valor_negocio`, `esfuerzo`, `riesgo`. El score puede ser negativo si esfuerzo+riesgo > valor_negocio*2. El UI no avisa al usuario. Funcionally minor pero puede confundir.
- **Severidad del módulo:** Baja
- **Readiness:** ✅ Listo

### VALIDACIÓN
- **Qué existe:** Planes de validación (con referencia a plantillas), Plantillas, Ejecuciones. Resumen delgado.
- **Qué está bien:** La auto-fill desde plantilla al seleccionar `plantilla_id` en el plan. El catálogo dinámico de estados (`listarEstadosPm('validacion_plan')`).
- **Qué está excelente:** El flujo plan → ejecución → hallazgo (via auditoría) → decisión está completo y trazable.
- **Qué está incompleto:** El resumen de validación (`PaginaValidacion`) muestra solo 3 KPIs básicos (total planes, activos, total plantillas) y top 5 ejecuciones. No hay señal de calidad: ¿cuántos planes fallaron? ¿cuántos están vencidos? ¿cuántas ejecuciones con resultado negativo?
- **Qué está inconsistente:** `PlanValidacion` no tiene FK directa a `iniciativa_id` ni `entrega_id`. La vinculación es solo via `modulo_id`. Si quieres saber "¿qué planes de validación tiene esta iniciativa?" la respuesta no es directamente navegable.
- **Severidad del módulo:** Media (resumen delgado)
- **Readiness:** ⚠️ Funcional, resumen necesita señales de calidad

### LANZAMIENTOS
- **Qué existe:** Releases (con checklist de salida gestionable), Seguimiento post-lanzamiento. Resumen con gobierno integrado.
- **Qué está bien:** El checklist de salida es excelente — reordenable, con tipos, obligatorio/opcional, completado, evidencia. El `GestionChecklistSalida` es uno de los componentes más completos del sistema.
- **Qué está excelente:** La integración gobierno en el resumen (riesgos altos + dependencias abiertas cross-signal desde releases). La vista de releases con 9 fuentes cruzadas y contadores.
- **Qué está incompleto:** El seguimiento post-lanzamiento no tiene búsqueda de texto libre.
- **Qué está inconsistente:** `PaginaResumenLanzamientos` no tiene `let activo = true / return () => { activo = false }` en su useEffect principal, a diferencia del resto del sistema. Race condition potencial en unmount rápido.
- **Severidad del módulo:** Baja
- **Readiness:** ✅ Listo con observaciones menores

### OPERACIÓN
- **Qué existe:** Bugs, Mejoras, Deuda técnica, Bloqueos, Lecciones aprendidas. Resumen con señales gobierno.
- **Qué está bien:** Los vínculos cruzados: mejoras ↔ discovery (insight + hipótesis), bugs ↔ auditorías + hallazgos, lecciones ↔ auditorías. El resumen integra señales de gobierno (riesgos operativos + dependencias bloqueantes).
- **Qué está excelente:** La cobertura del módulo operación es completa. El sistema captura todo el ciclo: bug → auditoria → hallazgo → decisión → lección.
- **Qué está incompleto:** No hay SLA tracking en bloqueos (sin `fecha_escalacion`, sin tiempo en estado).
- **Qué está inconsistente:** —
- **Severidad del módulo:** Baja
- **Readiness:** ✅ Listo

### ANALÍTICA
- **Qué existe:** KPIs ejecutivos (CRUD), Health Scores (CRUD), Portafolio (solo lectura, 5 filas fijas), Tendencias (solo lectura, tabla mensual). Resumen (27 fuentes, señales ejecutivas).
- **Qué está bien:** La vista de tendencias es útil, clara y exportable. El portafolio agrega datos reales de múltiples módulos.
- **Qué está excelente:** La cantidad de señales derivadas en el resumen analítico (15 KPI cards + 3 señales ejecutivas + distribución iniciativas + releases recientes + issues críticos).
- **Qué está incompleto:** KPIs ejecutivos **sin paginación** — es el único CRUD en todo el sistema que no tiene `PaginacionTabla`. Health Scores sin paginación ni búsqueda.
- **Qué está inconsistente:** KPIs, Health Scores y Portafolio **sin URL persistence** — inconsistente con todo el resto del portal. Estado en Portafolio es un `<input type="text">` libre, no un select. El resumen analítico usa `obtenerFuentesResumenAnalitico()` con 27 fuentes en un `Promise.all` sin manejo de fallo parcial.
- **Severidad del módulo:** Alta (problema funcional real en paginación)
- **Readiness:** ❌ Necesita corrección antes de darlo por cerrado

### GOBIERNO
- **Qué existe:** Stakeholders, Riesgos, Dependencias. Resumen ejecutivo con señales y distribuciones.
- **Qué está bien:** El resumen gobierno es el más completo del sistema: señales ejecutivas con semáforo, distribuciones múltiples, `proximosVencimientos` (próximos 14 días). Toda la cadena de alertas.
- **Qué está excelente:** Las relaciones de riesgos y dependencias son las más ricas del sistema — pueden vincularse a módulo, iniciativa, entrega, release, decisión, auditoría simultáneamente.
- **Qué está incompleto:** —
- **Qué está inconsistente:** —
- **Severidad del módulo:** Baja
- **Readiness:** ✅ Listo

### DECISIONES
- **Qué existe:** ADRs completos con contexto, decisión, alternativas, impacto, links, tags. Contadores cross-module en tabla.
- **Qué está bien:** La paginación con URL persistence, los contadores cruzados calculados al cargar (insights, reglas, releases, bloqueos, stakeholders, riesgos, dependencias vinculados), el CSV de 15 columnas.
- **Qué está excelente:** La validación runtime de catálogo dinámico (`validarCodigoCatalogoDinamico`) con error inline. El sistema ADR está bien implementado.
- **Qué está incompleto:** —
- **Qué está inconsistente:** `DecisionPm` no tiene FK directa a `auditoria_id`. La relación auditoria → decisión existe (via `HallazgoAuditoriaPm.decision_id`), pero no al revés. Aceptable por diseño (una decisión puede preceder a una auditoría), pero crea asimetría de navegación.
- **Severidad del módulo:** Baja
- **Readiness:** ✅ Listo

### AUDITORÍAS
- **Qué existe:** Auditorías + Hallazgos (dos entidades en una página). Doble paginación independiente. Contadores cross-module.
- **Qué está bien:** La gestión de dos entidades relacionadas en una misma página (auditoría y sus hallazgos). Las dos paginaciones independientes con URLs separadas. Los contadores cross en lista.
- **Qué está excelente:** `HallazgoAuditoriaPm` puede vincularse a decisión, módulo, y ejecución de validación — el hallazgo es el pivote que conecta auditoría con el ciclo completo.
- **Qué está incompleto:** —
- **Qué está inconsistente:** La página gestiona dos entidades con sus propios filtros, paginaciones y formularios, lo que la hace la más compleja del sistema (939 líneas). Funcional pero denso.
- **Severidad del módulo:** Baja
- **Readiness:** ✅ Listo

### AJUSTES
- **Qué existe:** 6 secciones de configuración: RICE, Planificación (ventanas + etapas), Módulos, Severidades, KPIs analíticos, Integraciones.
- **Qué está bien:** Todo protegido por `puedeAdministrar(rol)`. Las integraciones con configuración JSON deserializada. El catálogo de estados dinámico que alimenta otros módulos.
- **Qué está excelente:** La sección de planificación con sub-tabs para ventanas y etapas es el master data más bien resuelto del sistema.
- **Qué está incompleto:** —
- **Qué está inconsistente:** —
- **Severidad del módulo:** Baja
- **Readiness:** ✅ Listo

### TRAZABILIDAD
- **Qué existe:** Log de auditoría de todas las mutaciones del sistema. Filtros por módulo, entidad, acción, actor, rango de fechas. Modal JSON con antes/después.
- **Qué está bien:** El timezone correcto (`-05:00` Lima). Los filtros reactivos. El modal de detalle con JSON prettyprinted.
- **Qué está excelente:** La cobertura es 100% — todos los módulos usan `registrarCambioEntidadBestEffort`. El sistema nunca falla silenciosamente en el audit trail.
- **Qué está incompleto:** Sin paginación client-side. Si los filtros arrojan miles de registros, todos se renderizan en DOM. No rompe, pero puede ser lento.
- **Qué está inconsistente:** —
- **Severidad del módulo:** Baja
- **Readiness:** ✅ Listo

---

## 5. Hallazgos transversales

| ID | Hallazgo | Módulos afectados | Severidad | Impacto | Evidencia | Recomendación |
|---|---|---|---|---|---|---|
| T-01 | PaginaKpis (analítica) sin paginación | Analítica/KPIs | Alta | Con muchos KPIs todos renderizan en DOM; inconsistente con el resto | Único CRUD sin `usePaginacion` + `PaginacionTabla` | Añadir `usePaginacion` con tamaños 10/25/50 |
| T-02 | PaginaHealthScores sin paginación ni búsqueda | Analítica/HealthScores | Alta | Misma consecuencia que T-01; además no tiene `busqueda` text filter | Único CRUD sin búsqueda de texto | Añadir `usePaginacion` + campo `busqueda` |
| T-03 | PaginaObjetivosRoadmap sin URL persistence ni paginación | Roadmap/Objetivos | Media | El PM pierde estado de filtro al navegar; entidad fundacional de roadmap | Único CRUD fundacional sin `useSearchParams` | Añadir `useSearchParams` + `usePaginacion` |
| T-04 | KPIs, Health Scores, Portafolio sin URL persistence | Analítica | Media | Inconsistente con ~25 otras páginas del sistema | Comparar con PaginaBugs, PaginaRiesgos, etc. | Añadir `useSearchParams` en las 3 páginas |
| T-05 | Estado filter en PaginaPortafolio es free-text | Analítica/Portafolio | Media | Filtro inconsistente y frágil; select sería correcto | `<input type="text">` en lugar de `<select>` | Cambiar a select con opciones fijas |
| T-06 | `tipo` en insights e investigaciones es free-text | Discovery | Media | Filtro dinámico frágil (case-sensitive); "Entrevista" ≠ "entrevista" | Sin enum, filtro generado desde datos | Convertir a enum o catálogo configurable |
| T-07 | `categoria` en reglas de negocio es free-text | Requerimientos | Media | Misma fragilidad que T-06 | `categoria` sin enum | Mismo patrón: enum o catálogo |
| T-08 | Resumen de validación sin señales de calidad | Validación | Media | Solo 3 KPIs triviales; no hay señal de planes fallidos, vencidos o ejecuciones negativas | PaginaValidacion: totalPlanes/planesActivos/totalPlantillas + top 5 | Añadir: % completado, ejecuciones fallidas, planes vencidos |
| T-09 | `derivarSaludGlobal` marca riesgo con 1 bloqueo sin considerar severidad | Tablero | Baja | Un bloqueo en seguimiento de prioridad baja activa señal roja | `bloqueosActivos > 0` → 'riesgo' | Filtrar por `prioridad === 'alta'` o estado `'escalado'` |
| T-10 | Navegación inversa ausente en Requerimientos | Requerimientos | Baja | No se puede ver desde una historia sus casos de uso ni reglas asociadas | Historia modal no muestra casos de uso ni reglas vinculadas | Añadir contadores en modal de solo lectura |
| T-11 | `PaginaResumenLanzamientos` sin cancellation flag en useEffect | Lanzamientos | Baja | Race condition potencial en unmount rápido; patrón inconsistente | Falta `let activo = true` comparado con otros | Añadir patrón estándar de cancellation |
| T-12 | `PaginaResumenAnalitico` carga 27 fuentes en un solo Promise.all | Analítica | Baja | Si una fuente falla, el resumen completo falla | `obtenerFuentesResumenAnalitico()` con 27 en Promise.all | Agrupar en Promise.allSettled o cargar por bloque |
| T-13 | Trazabilidad sin paginación client-side | Trazabilidad | Baja | Con filtros amplios puede retornar miles de registros en DOM | PaginaTrazabilidad no usa PaginacionTabla | Añadir paginación server-side o client-side |
| T-14 | ModalPortal max-w-2xl para formularios complejos | Sistema | Baja | Formularios de Release (~18 campos), Iniciativa (M2M incluido) scroll vertical intenso | `max-w-2xl` hardcodeado en ModalPortal | Permitir ancho configurable por prop |
| T-15 | Discovery Resumen sin filtros | Discovery | Baja | Con muchos items el PM no puede orientarse en el resumen | PaginaResumenDiscovery sin ningún filtro | Añadir filtros de módulo y estado mínimo |

---

## 6. Coherencia lógica entre módulos

### Estrategia ↔ Discovery
| Relación | Estado | Detalle |
|---|---|---|
| Problema → Objetivo estratégico | ✅ Implementada | `RelProblemaObjetivoEstrategicoPm` M2M |
| Hipótesis discovery → Iniciativa roadmap | ✅ Implementada | `RelHipotesisDiscoveryIniciativaPm` M2M |
| Insight → Decisión | ✅ Implementada | `RelInsightDecisionPm` M2M |
| Insight → Objetivo estratégico (directo) | ⚪ Ausente (2 hops) | Insight → Problema → Objetivo. Aceptable. |

### Discovery ↔ Requerimientos
| Relación | Estado | Detalle |
|---|---|---|
| Historia usuario → Hipótesis discovery | ✅ Implementada | `hipotesis_discovery_id` FK en historia |
| Mejora → Insight discovery | ✅ Implementada | `insight_id` FK en mejora |
| Problema → Historia usuario (directo) | ⚪ Ausente (2 hops) | Problema → Hipótesis → Historia. Aceptable. |

### Requerimientos ↔ Roadmap
| Relación | Estado | Detalle |
|---|---|---|
| Historia → Iniciativa | ✅ Implementada | `iniciativa_id` FK; contadores en tabla iniciativas |
| Historia → Entrega | ✅ Implementada | `entrega_id` FK; contadores en tabla entregas |
| Caso de uso → Iniciativa | ✅ Implementada | `iniciativa_id` FK |
| RNF → Iniciativa + Entrega | ✅ Implementada | Ambas FK presentes |
| Regla negocio → Iniciativa | ✅ Implementada | `iniciativa_id` FK |

### Roadmap ↔ Lanzamientos
| Relación | Estado | Detalle |
|---|---|---|
| Release → Iniciativa | ✅ Implementada | `iniciativa_id` FK |
| Release → Entrega | ✅ Implementada | `entrega_id` FK |
| Entrega → Releases (conteo) | ✅ Implementada | `releasesPorEntrega` en PaginaEntregas |
| Plan vs real por ventana | ✅ Implementada | `planVsReal` en PaginaRoadmap |

### Roadmap ↔ Validación
| Relación | Estado | Detalle |
|---|---|---|
| Plan validación → Módulo | ✅ Implementada | `modulo_id` FK |
| Plan validación → Iniciativa/Entrega | ⚠️ Ausente | Sin FK directa. Vinculo solo por módulo. |
| Ejecución → Decisión (via hallazgo) | ✅ Implementada | `DecisionPm.ejecucion_validacion_id` |

### Operación ↔ Gobierno
| Relación | Estado | Detalle |
|---|---|---|
| Riesgo → Release/Auditoria/Decision | ✅ Implementada | FKs múltiples en RiesgoPm |
| Bloqueo → Release/Decision | ✅ Implementada | FKs en BloqueoPm |
| Bug → Auditoria + Hallazgo | ✅ Implementada | `auditoria_id` + `hallazgo_id` en BugPm |
| Dependencias → múltiples entidades | ✅ Implementada | FKs en DependenciaPm |
| ResumenOperacion integra señales gobierno | ✅ Implementada | `riesgosOperativos` + `dependenciasBloqueantes` |

### Decisiones ↔ Auditorías ↔ Trazabilidad
| Relación | Estado | Detalle |
|---|---|---|
| Hallazgo auditoria → Decisión | ✅ Implementada | `decision_id` en HallazgoAuditoriaPm |
| Bug → Hallazgo auditoria | ✅ Implementada | `hallazgo_id` en BugPm |
| Lección aprendida → Auditoria | ✅ Implementada | `auditoria_id` en LeccionAprendidaPm |
| Riesgo gobierno → Auditoria | ✅ Implementada | `auditoria_id` en RiesgoPm |
| Decisión → Auditoria (directo) | ⚪ Ausente | Solo via hallazgo. Asimetría direccional aceptable. |
| Trazabilidad cubre todas las mutaciones | ✅ 100% | `registrarCambioEntidadBestEffort` universal |

### Veredicto de coherencia

> La arquitectura funcional **cierra**. Las relaciones entre módulos forman un grafo coherente. Los huecos identificados son asimetrías direccionales menores (2 hops en lugar de 1) que no rompen trazabilidad sino que la hacen más indirecta. No existen entidades huérfanas sin contexto, ni relaciones que contradigan la lógica de producto.

---

## 7. Obligatorio vs opcional — revisión de campos y relaciones

| Entidad / Campo | Estado actual | Evaluación | Observación |
|---|---|---|---|
| `ReleasePm.iniciativa_id` | Opcional | ✅ Correcto | Un release puede existir sin iniciativa (hotfix) |
| `ReleasePm.decision_id` | Opcional | ✅ Correcto | No toda decisión genera un release |
| `BugPm.auditoria_id` | Opcional | ✅ Correcto | Un bug puede existir sin auditoria |
| `HistoriaUsuarioPm.hipotesis_discovery_id` | Opcional | ✅ Correcto | Una historia puede existir sin hipótesis previa |
| `PlanValidacion.iniciativa_id` | Ausente | ⚠️ Reconsiderar | Podría ser útil para trazar validaciones a iniciativas específicas |
| `InsightDiscoveryPm.tipo` | Free-text | ⚠️ Reconsiderar | Debería ser enum o catálogo para filtering confiable |
| `InvestigacionDiscoveryPm.tipo_investigacion` | Free-text | ⚠️ Reconsiderar | Mismo caso |
| `ReglaNegocioPm.categoria` | Free-text | ⚠️ Reconsiderar | Mismo caso |
| `ObjetivoEstrategicoPm.periodo_id` | Obligatorio | ✅ Correcto | Un OKR sin período no tiene sentido |
| `KeyResultPm.objetivo_estrategico_id` | Obligatorio | ✅ Correcto | Un KR sin objetivo no tiene contexto |
| `MatrizValor.iniciativa_id` | Obligatorio | ✅ Correcto | La puntuación es sobre una iniciativa |
| `Iniciativa.objetivo_id` | Obligatorio | ✅ Correcto | Una iniciativa sin objetivo roadmap no tiene norte |
| `BloqueoPm.prioridad` | Obligatorio | ✅ Correcto | La prioridad es parte del triage |
| `RiesgoPm.criticidad` | Obligatorio | ✅ Correcto | Necesario para las señales ejecutivas |
| `HallazgoAuditoriaPm.auditoria_id` | Obligatorio | ✅ Correcto | Un hallazgo sin auditoría no tiene contexto |

---

## 8. UX funcional

### Vistas principales

| Vista | Evaluación | Detalles |
|---|---|---|
| Tablero | ✅ Útil | PM-first, señales claras, técnico secundario. El único dashboard home que realmente sirve a un PM. |
| Resumen estratégico | ✅ Útil | Vínculos cruzados claros, avance calculado, GestionPeriodos accesible |
| Resumen discovery | ⚠️ Mejorable | Sin filtros, demasiados recientes sin contexto |
| Resumen roadmap | ✅ Útil | El más completo del sistema: 9 KPIs + RICE + plan vs real |
| Resumen lanzamientos | ✅ Útil | Gobierno integrado, releases próximos y recientes |
| Resumen operación | ✅ Útil | Señales gobierno integradas, recientes |
| Resumen gobierno | ✅ Excelente | El mejor resumen del sistema: semáforo, distribuciones, vencimientos próximos |
| Resumen analítico | ⚠️ Mejorable | 27 fuentes → lento; valioso cuando carga |
| Resumen validación | ❌ Delgado | Solo 3 KPIs básicos; no informa sobre calidad |

### ¿El sistema abruma?

El sidebar tiene ~50 ítems en total (16 módulos + submenús). Con las mejoras recientes de colapso automático y toggle manual, es manejable pero denso. Un usuario nuevo tardará en aprender la topología. No es un problema crítico — es una consecuencia del alcance del sistema.

### ¿El usuario entiende qué hacer?

Sí, con algunos caveats. Los banners diferenciadores en Hipótesis y Objetivos son necesarios y están presentes. Los estados vacíos con mensajes claros están en todas las páginas (via `EstadoVista`). Los formularios tienen campos claramente organizados con labels descriptivos.

### ¿El sistema se siente corporativo?

Sí. La consistencia de patrones (URL persistence, paginación, CSV, modal crear/editar/ver, roles) genera confianza. El dark mode es consistente. Los estados de carga son correctos. El sistema no tiene elementos rotos ni placeholders visibles.

El único área que quiebra la sensación corporativa es Analítica — la inconsistencia de paginación y URL persistence se nota.

---

## 9. Top fortalezas

1. **Audit trail universal al 100%** — Cada mutación de cualquier entidad genera un registro en `pm_historial_cambios` con snapshot antes/después. Esto es raro en sistemas PM y es una fortaleza real.

2. **Modelo de relaciones maduro** — 8 tablas M2M correctamente implementadas. Las entidades no viven aisladas — forman un grafo de producto coherente.

3. **RICE auto-calculado** — El score se calcula server-side antes de persistir, nunca queda desincronizado. Configuración de unidades en Ajustes.

4. **Discovery completo** — Investigación → Insight → Problema → Hipótesis → Iniciativa. Pocos sistemas PM implementan este ciclo completo.

5. **Criterios de aceptación gestionables** — El sub-componente `GestionCriteriosAceptacion` con reordenamiento, estado de validación y flags de obligatoriedad es el artefacto más cuidado del sistema.

6. **Checklist de salida gestionable** — Mismo nivel de cuidado que los criterios: reordenable, tipos, completado, evidencia.

7. **URL persistence en ~25 páginas** — El usuario puede compartir URL con filtros aplicados y recuperar estado al navegar con el botón atrás.

8. **Catálogos dinámicos** — Los estados, tipos de auditoría, severidades, módulos y ventanas son configurables desde Ajustes, no hardcodeados.

9. **TypeScript sin errores + Lint limpio + Build limpio** — El sistema no tiene deuda técnica de compilación.

10. **Roles bien aplicados** — `lector / editor / admin` aplicado consistentemente en todas las páginas. El acceso a trazabilidad es exclusivo para admins con mensaje claro para no-admins.

---

## 10. Top problemas críticos

1. **Analítica sin paginación (KPIs + Health Scores)** — Es el único módulo CRUD del sistema que viola este patrón fundamental. Afecta funcionalidad real con datos reales.

2. **Analítica sin URL persistence (3 páginas)** — Pérdida de estado de filtros al navegar; inconsistente con todo el resto.

3. **Roadmap/Objetivos sin URL persistence ni paginación** — Los objetivos son la entidad raíz del roadmap. Sin URL persistence, un PM con muchos objetivos no puede trabajar eficientemente.

4. **Tipos free-text en Discovery e Investigaciones** — Filtering frágil que degrada con el tiempo y el crecimiento de datos.

5. **Resumen de validación sin señales de calidad** — Una pantalla que no dice nada útil no se usa. Si el resumen no muestra estado de salud de la validación, el módulo pierde presencia ejecutiva.

6. **`derivarSaludGlobal` demasiado sensible** — 1 bloqueo de baja prioridad en seguimiento = señal roja en el tablero. Puede generar alarm fatigue.

---

## 11. Recomendaciones priorizadas

| Prioridad | Problema | Acción concreta | Esfuerzo | Impacto |
|---|---|---|---|---|
| P0 | Analítica/KPIs sin paginación | Añadir `usePaginacion` + `PaginacionTabla` en `PaginaKpis.tsx` | Bajo (30 min) | Alto |
| P0 | Analítica/HealthScores sin paginación ni búsqueda | Añadir `usePaginacion` + `PaginacionTabla` + campo `busqueda` | Bajo (30 min) | Alto |
| P1 | Analítica sin URL persistence (3 páginas) | Añadir `useSearchParams` en KPIs, Health Scores, Portafolio | Bajo (1-2h) | Medio-Alto |
| P1 | Roadmap/Objetivos sin URL persistence ni paginación | Añadir `useSearchParams` + `usePaginacion` en `PaginaObjetivosRoadmap.tsx` | Bajo (1h) | Medio |
| P1 | Estado filter libre en Portafolio | Cambiar `<input>` a `<select>` con opciones fijas | Muy bajo (15 min) | Medio |
| P1 | Resumen validación sin señales | Añadir: % ejecuciones completadas, planes vencidos, ejecuciones con resultado negativo | Medio (2-3h) | Alto |
| P2 | tipos free-text en Discovery | Convertir `tipo` (insights) e `tipo_investigacion` (investigaciones) a catálogo o enum | Medio (requiere migración de datos) | Medio |
| P2 | categoria free-text en ReglasNegocio | Mismo enfoque | Medio | Medio |
| P2 | `derivarSaludGlobal` demasiado sensible | Considerar solo `bloqueosActivos` con `estado === 'escalado'` o `prioridad === 'alta'` | Muy bajo (10 min) | Medio |
| P2 | Navegación inversa en Requerimientos | Añadir en modal ver: contador de casos de uso + reglas vinculadas (solo lectura) | Bajo (1h) | Bajo |
| P2 | Cancellation flag en PaginaResumenLanzamientos | Añadir `let activo = true` / cleanup estándar | Muy bajo (5 min) | Bajo |
| P3 | Trazabilidad sin paginación | Añadir paginación client-side con `usePaginacion` | Bajo (30 min) | Bajo |
| P3 | ModalPortal ancho fijo | Añadir prop `ancho?: string` con default `max-w-2xl` | Bajo (30 min) | Bajo |
| P3 | Discovery resumen sin filtros | Añadir filtros de módulo y estado mínimos | Bajo (1h) | Bajo |

---

## 12. Validación técnica

| Check | Resultado | Detalle |
|---|---|---|
| `npm run lint` | ✅ Sin errores | Ningún error ni warning de ESLint |
| `npm run build` (`tsc -b` + `vite build`) | ✅ Sin errores | 285 módulos transformados; TypeScript sin errores |
| Warning de chunk size | ⚠️ Preexistente | `1,337 kB` — warning de Vite sobre tamaño de bundle; preexistente, no nuevo, no afecta funcionalidad |
| Errores TypeScript | ✅ 0 errores | `tsc -b` limpio |

El warning de chunk size es el único issue técnico visible. No es nuevo, no afecta la confiabilidad del sistema, y requiere code-splitting estratégico (fuera del alcance de esta auditoría).

---

## 13. Conclusión final

### ¿Está listo?

**Sí, con asterisco.**

El PM Portal está en un estado que yo denomino **beta-corporativa madura**: puede usarse en un contexto corporativo real hoy mismo. Sus módulos principales están completos, coherentes y bien conectados. El audit trail es universal. Los patrones son consistentes. TypeScript y lint están limpios.

El asterisco es Analítica. Tiene dos páginas CRUD sin paginación (KPIs y Health Scores), que son una regresión funcional respecto al resto del sistema. Esto no impide usar el sistema, pero impide declararlo terminado sin corrección.

### ¿Qué tan listo está?

**~90-92% listo.**

Los 8-10 puntos restantes son mejoras menores y correcciones de consistencia, no piezas faltantes. No hay módulos incompletos en su núcleo. No hay flujos rotos. No hay entidades sin CRUD. No hay rutas huérfanas.

### ¿Qué faltaría para considerarlo cerrado?

Obligatorio (P0-P1):
1. Paginación en KPIs ejecutivos y Health Scores — ~1 hora
2. URL persistence en Analítica (3 páginas) — ~2 horas
3. URL persistence + paginación en Roadmap/Objetivos — ~1 hora
4. Estado filter → select en Portafolio — ~15 minutos
5. Señales de calidad en Resumen Validación — ~2-3 horas

**Total: ~7-8 horas de trabajo para cerrar todo lo P0-P1.**

### ¿Lo pendiente es menor, medio o crítico?

**Menor-Medio.** Nada crítico en el sentido de "rompe el sistema". Las correcciones P0-P1 son inconsistencias de experiencia, no agujeros funcionales. El sistema opera correctamente incluso sin esas correcciones.

### ¿Ya se puede dar por concluido como sistema corporativo PM?

**Casi. Siete horas de trabajo separan "beta-corporativa madura" de "corporativamente concluido".**

Con las correcciones P0-P1 aplicadas, el PM Portal supera el umbral de un sistema corporativo serio. Sin ellas, es funcional pero visiblemente inconsistente en Analítica — lo cual es suficiente para que un revisor técnico externo note la diferencia.

---

*Generado el 2026-03-15. Archivos auditados: ~90 (páginas, casos de uso, repositorios, dominio, utilidades, router, componentes compartidos). Lint: ✅. Build: ✅.*
