# AUDITORÍA EXHAUSTIVA E INTEGRAL — PM PORTAL
**Fecha de auditoría:** 2026-03-15
**Sistema auditado:** PM Portal (apps/pm-portal)
**Rama activa:** pm-construccion
**Auditor:** Claude Sonnet 4.6 — Revisión integral de código fuente, UX funcional y consistencia de producto

---

## 1. RESUMEN EJECUTIVO

### Diagnóstico general

El PM Portal es un sistema de gestión de producto avanzado, bien arquitecturado desde el punto de vista técnico, con cobertura funcional muy amplia: 14 módulos principales, 50+ entidades, relaciones cruzadas entre módulos, control de acceso por roles, exportación CSV, historial de cambios y soporte dark mode.

Sin embargo, el sistema presenta un **problema estructural serio**: su crecimiento acumulativo por fases ha generado acumulación de ruido, inconsistencias de presentación y una jerarquía de navegación que no refleja el flujo natural de trabajo de un PM real.

El sistema **no está listo para uso productivo serio** por un equipo PM que lo descubra por primera vez. Para alguien que lo conozca ya puede ser funcional, pero con fricciones reales.

### Nivel global de madurez

**7.0 / 10** — Sistema con bases arquitectónicas sólidas, cobertura funcional muy amplia, pero con inconsistencias de UX/presentación que erosionan la confianza del usuario.

### Impresión general funcional

- **Lo que está excelente:** Arquitectura técnica, relaciones cruzadas entre módulos, RICE automático, roles de acceso, trazabilidad.
- **Lo que está bien:** La mayoría de CRUDs, filtros, paginación, exportación CSV, mensajes de estado vacío, manejo de errores.
- **Lo que está riesgoso:** Navegación (orden, longitud), Tablero (equivocado para un PM), inconsistencias de fecha, estados en snake_case sin formatear en Roadmap.
- **Lo que está mal:** El Tablero es un dashboard técnico/DevOps, no un dashboard PM. La navegación global tiene 53 entradas. Matriz de valor es un ítem huérfano. El `normalizarFechaPortal` devuelve fechas brutas YYYY-MM-DD.

### Conclusión honesta

El sistema tiene musculatura funcional real. Pero la experiencia de navegación está descuidada: demasiados ítems de menú, orden incorrecto, Tablero que no ayuda a un PM, fechas inconsistentes, estados sin formatear en la pantalla más visitada del sistema (Roadmap). Corregir estos problemas no requiere reescribir nada; requiere disciplina en la presentación.

---

## 2. PONDERACIÓN GLOBAL

| Dimensión | Evaluación | Puntaje |
|---|---|---|
| Arquitectura técnica | Excelente | 9/10 |
| Cobertura funcional (CRUD, relaciones) | Bien | 8/10 |
| Consistencia transversal de UI | Aceptable | 6/10 |
| Claridad semántica | Aceptable | 6/10 |
| Navegación global | Riesgoso | 4/10 |
| Integridad de relaciones entre módulos | Bien | 7/10 |
| Formularios (campos, validaciones) | Bien | 7/10 |
| Resúmenes y dashboards | Riesgoso | 5/10 |
| Fechas y formatos | Riesgoso | 4/10 |
| UX funcional para PM real | Aceptable | 6/10 |
| Estética general | Bien | 7/10 |
| **Promedio global** | **Aceptable** | **6.5/10** |

---

## 3. INVENTARIO COMPLETO DEL SISTEMA

| Módulo | Submódulo | Ruta | Estado | Observación |
|---|---|---|---|---|
| Tablero | — | `/` | Implementado | Dashboard técnico/DevOps, no PM |
| Roadmap | Resumen | `/roadmap` | Implementado | Excelente, pero estados en snake_case |
| Roadmap | Objetivos | `/roadmap/objetivos` | Implementado | Bien |
| Roadmap | Iniciativas | `/roadmap/iniciativas` | Implementado | Bien, RICE automático |
| Roadmap | Entregas | `/roadmap/entregas` | Implementado | Bien |
| Matriz de valor | — | `/matriz-valor` | Implementado | Ítem huérfano en menú, sin módulo padre |
| Validación | Resumen | `/validacion` | Implementado | Thin: solo 3 métricas, sin sub-nav |
| Validación | Por módulo | `/validacion/por-modulo` | Implementado | Bien |
| Validación | Ejecuciones | `/validacion/ejecuciones` | Implementado | Bien |
| Estrategia | Resumen | `/estrategia` | Implementado | Fechas ISO brutas, buena lógica |
| Estrategia | Períodos | `/estrategia/periodos` | Implementado | Bien |
| Estrategia | OKRs | `/estrategia/okrs` | Implementado | Bien |
| Estrategia | KPIs | `/estrategia/kpis` | Implementado | Colisión de nombre con Analítica/KPIs |
| Estrategia | Hipótesis | `/estrategia/hipotesis` | Implementado | Bien |
| Discovery | Resumen | `/discovery` | Implementado | Fechas YYYY-MM-DD brutas |
| Discovery | Insights | `/discovery/insights` | Implementado | Bien |
| Discovery | Problemas y oportunidades | `/discovery/problemas` | Implementado | Bien |
| Discovery | Investigaciones | `/discovery/investigaciones` | Implementado | Bien |
| Discovery | Segmentos | `/discovery/segmentos` | Implementado | Bien |
| Discovery | Hipótesis discovery | `/discovery/hipotesis` | Implementado | Bien |
| Requerimientos | Resumen | `/requerimientos` | Implementado | Patrón "últimas 8" — thin |
| Requerimientos | Historias de usuario | `/requerimientos/historias` | Implementado | Bien, con criterios de aceptación |
| Requerimientos | Casos de uso | `/requerimientos/casos-uso` | Implementado | Bien |
| Requerimientos | Reglas de negocio | `/requerimientos/reglas-negocio` | Implementado | Bien |
| Requerimientos | RNF | `/requerimientos/no-funcionales` | Implementado | Bien |
| Lanzamientos | Resumen | `/lanzamientos` | Implementado | Fechas YYYY-MM-DD brutas via normalizarFechaPortal |
| Lanzamientos | Releases | `/lanzamientos/releases` | Implementado | Bien |
| Lanzamientos | Seguimiento | `/lanzamientos/seguimiento` | Implementado | Bien |
| Lanzamientos | Checklist | N/A | **Sin página propia** | Gestionado dentro de Releases |
| Operación | Resumen | `/operacion` | Implementado | Bien |
| Operación | Bugs | `/operacion/bugs` | Implementado | Bien |
| Operación | Mejoras | `/operacion/mejoras` | Implementado | Bien |
| Operación | Deuda técnica | `/operacion/deuda-tecnica` | Implementado | Bien |
| Operación | Bloqueos | `/operacion/bloqueos` | Implementado | Bien |
| Operación | Lecciones aprendidas | `/operacion/lecciones-aprendidas` | Implementado | Bien |
| Analítica | Resumen | `/analitica` | Implementado | Bien |
| Analítica | KPIs ejecutivos | `/analitica/kpis` | Implementado | Colisión de nombre con Estrategia/KPIs |
| Analítica | Portafolio | `/analitica/portafolio` | Implementado | Bien |
| Analítica | Tendencias | `/analitica/tendencias` | Implementado | Bien |
| Analítica | Health scores | `/analitica/health-scores` | Implementado | Bien |
| Gobierno | Resumen | `/gobierno` | Implementado | Bien |
| Gobierno | Stakeholders | `/gobierno/stakeholders` | Implementado | Bien |
| Gobierno | Riesgos | `/gobierno/riesgos` | Implementado | Bien |
| Gobierno | Dependencias | `/gobierno/dependencias` | Implementado | Bien |
| Decisiones | — | `/decisiones` | Implementado | Bien, con paginación y búsqueda |
| Auditorías | — | `/auditorias` | Implementado | Bien, con hallazgos |
| Ajustes | — | `/ajustes` | Implementado | Admin only, bien |
| Trazabilidad | — | `/trazabilidad` | Implementado | Admin only, sin indicación visual en menú |

---

## 4. AUDITORÍA MÓDULO POR MÓDULO

---

### 4.1 TABLERO (`/`)

**Qué existe:**
Tres paneles en grid: (1) Banner promocional de "Analítica" con links, (2) Estado del despliegue (versión, commit, rama, fecha de build, repo), (3) Salud operativa (Auth, Supabase), (4) Métricas PostHog con filtros por período o rango personalizado.

**Qué está excelente:**
La validación de Supabase en tiempo real es técnicamente sólida. Las métricas PostHog con semáforo OK/Atención/Riesgo están bien implementadas.

**Qué está MAL — severidad CRÍTICA:**
El Tablero no es un dashboard para un PM. Es un dashboard de DevOps/infraestructura. Un PM real entra al sistema y lo primero que ve es: el commit hash del repositorio, la fecha de compilación del build, el estado de conexión a Supabase, y métricas de onboarding de usuarios. Ninguna de estas cosas le ayuda a gestionar su producto.

Un PM necesita en su home screen: resumen de estado del período estratégico activo, bugs y bloqueos críticos abiertos, releases próximos, KPIs fuera de umbral, iniciativas en riesgo. El Tablero actual no tiene ninguno de estos datos.

**Qué está inconsistente:**
El banner "Nuevo módulo: Analítica" es contenido hardcodeado que ya no es nuevo. Sigue apareciendo a perpetuidad como si fuera un anuncio, lo que daña la credibilidad del sistema.

**Qué le falta:**
- Datos reales de proyecto (OKRs, bugs, releases, iniciativas)
- Resumen de salud operativa del producto (no del servidor)

**Riesgo:** Alto. El Tablero es la primera pantalla que ve cualquier usuario. Si muestra irrelevancia, el usuario pierde confianza en el sistema desde el primer segundo.

---

### 4.2 ROADMAP — Resumen (`/roadmap`)

**Qué existe:**
Filtros por ventana y etapa. Grid de 9 tarjetas de contexto transversal (releases, operación, gobierno). Totales globales (objetivos, iniciativas, entregas, % completado, pendientes, en progreso, completados, Plan vs Real). Progreso por objetivo con barra de avance. Top 5 prioridades RICE. Próximas entregas con fecha.

**Qué está excelente:**
La lógica de filtrado transversal (ventana + etapa) que afecta simultáneamente a iniciativas, entregas y objetivos derivados es técnicamente sólida. La integración de contexto de operación (bugs abiertos, bloqueos activos) y gobierno (riesgos, dependencias bloqueantes) en el resumen del roadmap es excelente — un PM puede ver el estado completo de su pipeline en una sola pantalla.

El "Progreso por objetivo" con barra de avance y detección del "objetivo más activo" es un diseño funcional muy valioso.

**Qué está MAL — severidad ALTA:**
Los badges de estado en Progreso por objetivo, Top prioridades y Próximas entregas muestran el valor raw del enum directamente: `{objetivo.estado}` → renderiza "en_progreso", "completado", "pendiente" en snake_case. La función `formatearEstadoRegistro()` existe y convierte a "En Progreso", "Completado", "Pendiente", pero NO se usa en estos badges del resumen.

**Qué está inconsistente:**
El grid de 9 tarjetas de contexto (releases, operación, gobierno) usa `xl:grid-cols-9` que en pantallas medianas colapsa a 3 columnas, lo que es correcto. Pero visualmente las 9 tarjetas pequeñas en una fila en xl-screens tienen texto muy comprimido.

**Qué está correcto pero mejorable:**
La carga de 11 llamadas API simultáneas en mount es agresiva. Con datasets grandes puede generar latencia perceptible. No hay skeleton loading, solo un spinner genérico.

**Riesgo:** Medio-Alto. El bug de snake_case en badges afecta la impresión de profesionalismo del sistema.

---

### 4.3 ROADMAP — Objetivos, Iniciativas, Entregas (`/roadmap/objetivos`, `/iniciativas`, `/entregas`)

**Qué está bien:**
- CRUDs completos con formularios validados (Zod + React Hook Form)
- Filtros por búsqueda, estado, prioridad
- Paginación funcional con persistencia en URL
- Exportación CSV en las tres páginas
- RICE calculado automáticamente en Iniciativas
- Relaciones cruzadas visibles (KR vinculados, hipótesis, historias, etc.)
- Modales de solo lectura (ver detalle) separados del formulario de edición

**Qué está correcto pero mejorable:**
- `Objetivo` no tiene campo `owner` — cualquier otro submódulo más avanzado sí tiene owner pero el Objetivo del roadmap, que es la entidad raíz, no tiene responsable asignado.
- `Iniciativa.objetivo_id` es opcional — una iniciativa puede flotar sin objetivo. Esto es semánticamente válido para un backlog libre, pero puede generar confusión en el resumen cuando aparecen iniciativas "sin objetivo".

---

### 4.4 MATRIZ DE VALOR (`/matriz-valor`)

**Qué existe:**
Página standalone que evalúa iniciativas por valor_negocio, esfuerzo y riesgo con puntaje calculado.

**Qué está MAL — severidad MEDIA:**
"Matriz de valor" es un ítem de menú de nivel superior entre Roadmap y Validación. Semánticamente pertenece al análisis de iniciativas (Roadmap) o a la evaluación del portafolio (Analítica). Como ítem huérfano en el menú principal, un PM nuevo no sabe qué esperar al hacer clic en él.

**Qué le falta:**
No hay sub-navegación contextual que explique la relación entre Matriz de valor y las Iniciativas del roadmap. El usuario tiene que inferir que esta pantalla complementa `/roadmap/iniciativas`.

---

### 4.5 VALIDACIÓN — Resumen (`/validacion`)

**Qué existe:**
3 tarjetas: Planes registrados, Planes activos, Plantillas. Lista de 5 ejecuciones recientes.

**Qué está MAL — severidad MEDIA:**
La página Validación es la más thin de todos los resúmenes. Solo muestra 3 métricas numéricas y 5 ejecuciones recientes. No muestra: planes por módulo, estados de los planes, tendencia de validaciones aprobadas vs rechazadas, vinculación con releases o entregas.

**Inconsistencia crítica:** El módulo Validación es el ÚNICO módulo complejo (con subpáginas) que NO tiene un componente `NavegacionValidacion`. Todos los demás módulos multi-página (Estrategia, Discovery, Requerimientos, Lanzamientos, Operación, Analítica, Gobierno) tienen su barra de sub-navegación interna. Validación carece de ella, lo que obliga al usuario a usar el menú lateral para navegar entre Por módulo y Ejecuciones.

**Posición en menú — severidad ALTA:**
Validación aparece en el menú ANTES de Estrategia. El flujo natural de PM es: Estrategia → Discovery → Requerimientos → Validación → Lanzamientos → Operación. Tener Validación como el tercer ítem del menú (después de Roadmap y Matriz de valor) rompe completamente el flujo lógico.

---

### 4.6 ESTRATEGIA — Resumen (`/estrategia`)

**Qué existe:**
Tarjetas para período activo, objetivos, KR, KPIs, hipótesis, avance general. Gestión de períodos embebida. Panel de relaciones cruzadas (discovery ↔ estrategia, roadmap ↔ estrategia).

**Qué está excelente:**
La advertencia cuando no existe período estratégico ("Falta el dato maestro inicial") con CTA directo es un diseño excepcional. El sistema guía al usuario en lugar de dejarlo perdido.

La sección "Relaciones cruzadas" que muestra la conectividad entre estrategia, discovery y roadmap es conceptualmente muy valiosa para un PM.

**Qué está MAL — severidad ALTA (fechas):**
Las fechas del período activo se muestran como:
```
{periodoActivo.fecha_inicio} → {periodoActivo.fecha_fin}
```
Esto renderiza texto crudo como "2024-01-01 → 2024-12-31" en lugar de "1 ene 2024 → 31 dic 2024". La función `Intl.DateTimeFormat` usada en Roadmap no se aplicó aquí.

**Qué está correcto pero mejorable:**
El componente `GestionPeriodosEstrategicos` embebido en la página Resumen hace que el resumen sea también un panel de administración de períodos. Un usuario lector (sin permisos de edición) verá la lista de períodos igualmente, lo cual es útil. Pero la mezcla de "resumen" y "gestión" en una sola pantalla puede ser confusa.

---

### 4.7 ESTRATEGIA — OKRs, KPIs, Hipótesis, Períodos

**Qué está bien:**
CRUDs completos, formularios ricos con campos específicos (KPIs con umbral bajo/alto/fórmula/fuente, KR con baseline/meta/valor_actual, Hipótesis con criterio_exito/impacto_esperado).

**Inconsistencia — KPIs:**
El menú muestra "KPIs" tanto bajo Estrategia como bajo Analítica. El contexto diferencia (KPIs estratégicos vs KPIs ejecutivos), pero el label en el sidebar es idéntico: "KPIs". Un usuario nuevo buscará "KPIs" y no sabrá cuál de los dos entrar.

---

### 4.8 DISCOVERY — Resumen (`/discovery`)

**Qué existe:**
6 tarjetas numéricas (insights, problemas, investigaciones, segmentos activos, hipótesis, segmentos totales). Distribución por estado. Vínculos opcionales. Panel de "Recientes" con las 8 entidades más recientes (mezcla de segmentos, insights, problemas, investigaciones, hipótesis).

**Qué está MAL — severidad ALTA (fechas):**
El panel "Recientes" muestra la fecha de cada registro usando `normalizarFechaPortal(registro.fecha)`. Esta función trunca el timestamp a "YYYY-MM-DD" y lo devuelve sin formatear. Ejemplo: "2024-03-15" aparece como texto literal, no como "15 mar 2024". Es la misma función usada en Lanzamientos Resumen.

**Redundancia en tarjetas:**
"Segmentos activos" y "Segmentos totales" son dos tarjetas separadas de 6. Esto significa que 2 de 6 slots del grid superior son variaciones del mismo dato. El dato útil sería "Segmentos activos: X de Y total" en una sola tarjeta.

**Qué está bien:**
La sección "Vínculos opcionales" que muestra el porcentaje de conectividad entre discovery y estrategia/roadmap/decisiones es excelente — directamente útil para un PM que necesita saber si su discovery está alimentando decisiones reales.

---

### 4.9 DISCOVERY — Submódulos (Insights, Problemas, Investigaciones, Segmentos, Hipótesis)

**Qué está bien:**
CRUDs completos para los 5 submódulos. Relaciones ricas: insights → problemas, problemas → objetivos estratégicos, hipótesis → iniciativas. Tipos diferenciados en formularios.

**Qué está correcto pero mejorable:**
Discovery tiene 5 submódulos (el módulo con más subitems junto con Operación). Para un PM real, el flujo típico es: Investigación → Insight → Problema/Oportunidad → Hipótesis. Los Segmentos son datos maestros. Esta jerarquía no se refleja en el orden del submenú (que muestra: Resumen, Insights, Problemas, Investigaciones, Segmentos, Hipótesis — un orden sin lógica de flujo).

---

### 4.10 REQUERIMIENTOS — Resumen (`/requerimientos`)

**Qué existe:**
Contadores de historias, casos de uso, reglas, RNF. Últimas 8 entidades recientes (mezcla de los 4 tipos).

**Qué está correcto pero thin:**
El patrón "últimas 8 entidades" del resumen es el mismo que en Discovery. Para requerimientos, lo más útil sería ver: historias por estado, RNF no cubiertos, criterios de aceptación pendientes de validación. El resumen actual no diferencia entre tipos de requerimiento en términos de estado o riesgo.

---

### 4.11 REQUERIMIENTOS — Historias de Usuario

**Qué está excelente:**
Criterios de aceptación con estado de validación (pendiente/en_progreso/completado) embebidos en la historia. Relación directa con hipótesis_discovery_id para trazabilidad discovery → requerimiento. Filtros por owner, iniciativa, entrega, estado, prioridad con persistencia en URL.

**Qué está correcto pero mejorable:**
El formulario de historia tiene 9 campos visibles + criterios de aceptación dinámicos. Para una historia simple, el formulario puede sentirse largo. Los campos `descripcion`, `notas` y el propio campo `owner` son opcionales pero siempre visibles.

---

### 4.12 LANZAMIENTOS — Resumen (`/lanzamientos`)

**Qué existe:**
Distribución por estado de releases. Releases próximos. Releases recientes (últimos 30 días). Checklist completeness por release. Riesgos y dependencias vinculadas a releases.

**Qué está MAL — severidad MEDIA (fechas):**
Usa `normalizarFechaPortal()` para mostrar fechas de releases. Devuelve YYYY-MM-DD en texto plano, inconsistente con Roadmap que usa `Intl.DateTimeFormat`.

**Checklist:** No existe página standalone de checklist. Los items del checklist viven dentro de cada release. Esto es una decisión de diseño válida (el checklist es inherente a un release), pero limita la visibilidad transversal: no se puede ver en un solo lugar qué releases tienen checklist incompleto, excepto en este resumen donde sí se calcula el porcentaje.

**Qué está bien:**
La integración de riesgos y dependencias de gobierno en el contexto de lanzamientos es excelente. Un PM puede ver si hay dependencias bloqueantes antes de lanzar.

---

### 4.13 OPERACIÓN — Resumen y Submódulos

**Qué existe:**
6 submódulos separados: Bugs, Mejoras, Deuda técnica, Bloqueos, Lecciones aprendidas, más el Resumen.

**Qué está bien:**
Estados diferenciados por tipo de entidad: bugs tienen nuevo→triage→en_progreso→resuelto→cerrado, bloqueos tienen abierto→escalado→resuelto, lecciones tienen capturada→aplicada→archivada. Esta granularidad semántica es correcta para un PM.

**Qué es mejorable — cantidad de submódulos:**
6 submódulos es mucho. Un PM real que entra a Operación quiere ver "qué está roto / qué me bloquea hoy". La distribución en 5 páginas separadas fragmenta la visibilidad. Podría considerarse agrupar Mejoras, Deuda técnica y Lecciones aprendidas en un panel consolidado, dejando Bugs y Bloqueos como páginas de alta prioridad.

---

### 4.14 ANALÍTICA — Resumen y Submódulos

**Qué existe:**
Señales ejecutivas calculadas (cobertura, calidad, riesgo operativo, validación). KPIs configurables. Portafolio consolidado. Tendencias. Health scores por ámbito.

**Qué está excelente:**
El sistema de señales ejecutivas calculadas en tiempo real desde los datos del portal (bugs abiertos / total entregas → calidad, bloqueos activos / total iniciativas → riesgo, etc.) es funcionalmente el componente más sofisticado del sistema. Es exactamente lo que un director de producto necesita.

**Qué está correcto pero mejorable:**
El módulo Analítica usa `normalizarFechaPortal` en el resumen para fechas de corte de KPIs y health scores (devuelve YYYY-MM-DD).

---

### 4.15 GOBIERNO — Resumen y Submódulos

**Qué existe:**
Resumen con próximos vencimientos, riesgos por criticidad, dependencias bloqueantes. Stakeholders, Riesgos, Dependencias con CRUDs completos.

**Qué está bien:**
Las relaciones de Riesgos y Dependencias con iniciativas, entregas y releases crean un sistema de gobierno genuinamente útil. La integración de datos de gobierno en el Roadmap resumen y el Lanzamientos resumen es excelente.

---

### 4.16 DECISIONES (`/decisiones`)

**Qué existe:**
CRUD completo con búsqueda full-text, paginación, tags, links externos, relaciones con casi todos los módulos.

**Qué está bien:**
Decisión es la entidad de mayor conectividad transversal del sistema. Tiene relaciones opcionales con: iniciativa, entrega, ejecución validación, reglas de negocio, releases, bloqueos, stakeholders, riesgos, dependencias, insights. Esto es excelente para trazabilidad de decisiones de producto.

**Qué está correcto pero mejorable:**
No existe una vista de "árbol de decisiones" o "timeline de decisiones". La lista plana con paginación es funcional pero básica para la importancia que tienen las decisiones de PM.

---

### 4.17 AUDITORÍAS (`/auditorias`)

**Qué existe:**
Auditorías con hallazgos. Los hallazgos tienen severidad configurable (catálogo dinámico), relaciones con módulo, decisión, ejecución_validación, bugs y lecciones.

**Qué está bien:**
La arquitectura de auditoría → hallazgo → bug/lección es correcta y completa para un PM.

---

### 4.18 AJUSTES (`/ajustes`)

**Qué existe:**
6 paneles: RICE, Planificación (ventanas y etapas), Módulos, Severidades, KPIs, Integraciones.

**Qué está bien:**
Los catálogos dinámicos (módulos, severidades, estados por ámbito, ventanas, etapas) son la columna vertebral de la configurabilidad del sistema. Correctamente restringidos a admin.

**Riesgo menor:**
No hay indicación en el menú de que Ajustes y Trazabilidad son admin-only. Un editor o lector que navegue a Ajustes verá el panel pero sin poder modificar nada (botones deshabilitados). Sería mejor ocultar o etiquetar estas rutas en el menú según el rol.

---

### 4.19 TRAZABILIDAD (`/trazabilidad`)

**Qué existe:**
Log de cambios con módulo, entidad, acción (crear/editar/eliminar), actor, timestamp, diff JSON.

**Qué está bien:**
Funciona como audit log completo. Admin-only es correcto.

---

## 5. HALLAZGOS TRANSVERSALES

| # | Hallazgo | Módulos afectados | Severidad | Impacto | Evidencia | Recomendación |
|---|---|---|---|---|---|---|
| T1 | **Tablero es un dashboard técnico, no PM** | Tablero | Crítico | El PM no puede gestionar su producto desde la home screen | PaginaTablero.tsx: muestra commit hash, Supabase health, PostHog | Reemplazar con resumen ejecutivo de producto real |
| T2 | **Banner "Nuevo módulo: Analítica" hardcodeado y obsoleto** | Tablero | Alto | Daña credibilidad del sistema | PaginaTablero.tsx líneas 349-366: `<p>Nuevo módulo</p><h1>Analítica</h1>` | Eliminar o reemplazar por contenido dinámico |
| T3 | **Fechas ISO brutas en varios módulos (normalizarFechaPortal)** | Discovery Resumen, Lanzamientos Resumen, Analítica Resumen | Alto | Las fechas se muestran como "2024-03-15" en lugar de "15 mar 2024" | formatoPortal.ts: `return fechaNormalizada` (sin formato) | Reemplazar con Intl.DateTimeFormat consistente |
| T4 | **Fechas ISO brutas en Estrategia (interpolación directa)** | Estrategia Resumen | Alto | Período activo muestra "2024-01-01 → 2024-12-31" | PaginaResumenEstrategico.tsx línea 162: `{periodoActivo.fecha_inicio}` | Aplicar formateador |
| T5 | **Estados en snake_case sin formatear en Roadmap resumen** | Roadmap Resumen | Alto | Badges muestran "en_progreso", "completado", "pendiente" | PaginaRoadmap.tsx: `{objetivo.estado}`, `{iniciativa.estado}`, `{entrega.estado}` sin formatear | Aplicar `formatearEstadoRegistro()` |
| T6 | **Menú con 53 entradas de navegación** | Global | Alto | Abruma al usuario, especialmente nuevo | menuPortal.ts: 14 top-level + 39 subitems | Colapsar, agrupar o dividir en contextos |
| T7 | **Orden del menú no sigue el flujo PM** | Global | Alto | Validación antes de Estrategia rompe el flujo mental | menuPortal.ts: Roadmap → Matriz → Validación → Estrategia → Discovery | Reordenar |
| T8 | **Matriz de valor es ítem huérfano** | Matriz de valor | Medio | El usuario no entiende a qué módulo pertenece | menuPortal.ts línea 23: ítem standalone | Mover a Roadmap o Analítica como submódulo |
| T9 | **Validación sin NavegacionValidacion** | Validación | Medio | Único módulo complejo sin sub-nav interna | PaginaValidacion.tsx: no tiene NavegacionValidacion | Añadir componente de sub-navegación |
| T10 | **Colisión de nombre "KPIs" en dos módulos** | Estrategia, Analítica | Medio | El usuario no sabe a qué "KPIs" ir | menuPortal.ts: "KPIs" en /estrategia/kpis y /analitica/kpis | Diferenciar en menú: "KPIs estratégicos" vs "KPIs ejecutivos" |
| T11 | **Submódulos Resumen duplicados en menú** | Estrategia, Discovery, Requerimientos, Lanzamientos, Operación, Analítica, Gobierno | Bajo | Cada módulo tiene "Resumen de X" como primer submenú apuntando a la misma ruta que el padre | menuPortal.ts: `/estrategia` == `/estrategia` (Resumen estratégico) | Eliminar el submódulo redundante de cada menú |
| T12 | **Objetivo (roadmap) sin campo owner** | Roadmap Objetivos | Bajo | No se puede asignar responsable a un objetivo | modelos.ts Objetivo: no tiene owner | Añadir owner opcional |
| T13 | **Ajustes y Trazabilidad sin indicación de rol requerido** | Ajustes, Trazabilidad | Bajo | Editor o lector puede navegar y ver contenido sin poder actuar | menuPortal.ts: ítems sin distinción | Etiquetar o condicionar visibilidad |
| T14 | **Estados en Roadmap summary a modo de texto plano** | Roadmap | Alto | Inconsistencia de presentación vs todos los demás módulos | La función formatearEstadoRegistro existe pero no se usa aquí | Usar la función en todos los badges |

---

## 6. REVISIÓN DE FECHAS

| Módulo/Pantalla | Campo | Cómo se muestra | Problema | Recomendación |
|---|---|---|---|---|
| Tablero | fecha_construccion (build) | `toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })` | ✅ Correcto y amigable | Mantener como referencia |
| Roadmap Resumen | fecha_objetivo de entregas | `Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })` | ✅ Correcto | Mantener como referencia |
| Estrategia Resumen | fecha_inicio, fecha_fin del período | Interpolación directa `{periodoActivo.fecha_inicio}` | ❌ Muestra "2024-01-01" en bruto | Aplicar `Intl.DateTimeFormat` |
| Discovery Resumen | updated_at de registros recientes | `normalizarFechaPortal()` → retorna YYYY-MM-DD | ❌ Muestra "2024-03-15" sin formato | Reemplazar con formateador |
| Lanzamientos Resumen | fecha_programada de releases | `normalizarFechaPortal()` → retorna YYYY-MM-DD | ❌ Muestra "2024-03-15" sin formato | Reemplazar con formateador |
| Analítica Resumen | fecha_corte de KPIs y health scores | `normalizarFechaPortal()` → retorna YYYY-MM-DD | ❌ Muestra "2024-03-15" sin formato | Reemplazar con formateador |
| Validación Resumen | fecha_ejecucion de ejecuciones recientes | Pendiente de verificación (probable normalizarFechaPortal) | ⚠️ Probable problema igual | Verificar y reemplazar si aplica |
| Operación (todos) | fecha_reporte, fecha_resolucion | Pendiente de verificación | ⚠️ Probable inconsistencia | Verificar |

**Diagnóstico de fechas:**
Existen al menos **tres patrones distintos** de formateo de fechas en el sistema. Solo uno de ellos (`Intl.DateTimeFormat`) es humanamente legible. Los otros dos muestran fechas crudas. Esto no es coherencia — es fragmentación acumulada.

---

## 7. OBLIGATORIO VS OPCIONAL

| Entidad / Formulario | Campo / Relación | Estado actual | Evaluación | Recomendación |
|---|---|---|---|---|
| Objetivo (Roadmap) | `owner` | No existe en el modelo | ❌ Falta campo crítico | Añadir como opcional |
| Iniciativa | `objetivo_id` | Opcional | ✅ Correcto para backlog | Mantener opcional, pero advertir en UI cuando está sin objetivo |
| Iniciativa | `ventana_planificada_id` | Opcional | ✅ Correcto | Mantener |
| Entrega | `iniciativa_id` | Opcional | ⚠️ Riesgoso | Una entrega sin iniciativa pierde trazabilidad. Considerar obligatorio o advertir |
| Historia de usuario | `iniciativa_id` | Opcional | ✅ Correcto | Mantener |
| Historia de usuario | `owner` | Opcional | ⚠️ Mejorable | Para un equipo real, el owner debería ser obligatorio |
| Historia de usuario | `codigo` | Requerido | ✅ Correcto | Mantener |
| Caso de uso | `actor_principal` | Requerido | ✅ Correcto | Mantener |
| KPI Estratégico | `umbral_bajo`, `umbral_alto` | Opcionales | ✅ Correcto | Mantener, pero el semáforo de color requiere ambos |
| Release | `fecha_programada` | Requerido | ✅ Correcto | Mantener |
| Release | `responsable_aprobacion` | Opcional | ⚠️ Mejorable | Para releases en producción, debería ser obligatorio |
| Bug | `fecha_resolucion` | Opcional | ✅ Correcto (puede no estar resuelto) | Mantener |
| Riesgo | `plan_mitigacion` | Opcional | ⚠️ Para riesgos de alta criticidad debería ser obligatorio | Considerar validación condicional |
| Decisión | `fecha_decision` | Requerido | ✅ Correcto | Mantener |
| Validación Plan | `plantilla_id` | Opcional | ✅ Correcto | Mantener |
| Período Estratégico | `activo` (booleano) | Opcional, por defecto false | ⚠️ Solo puede haber un período activo, pero no hay validación que lo garantice | Añadir validación de unicidad de período activo |

---

## 8. UX FUNCIONAL

### Qué abruma

1. **El menú lateral** con 14 top-level + 39 subitems es el mayor problema de UX del sistema. Un PM nuevo se siente ante un formulario de administración, no ante una herramienta de trabajo.

2. **Operación con 6 submódulos** — Bugs, Mejoras, Deuda técnica, Bloqueos, Lecciones aprendidas y Resumen son páginas separadas. En el menú lateral esto genera 6 clics potenciales para un módulo que debería ser "ver qué está roto".

3. **Roadmap resumen cargando 11 APIs** — La pantalla de resumen más usada del sistema hace 11 llamadas a la API en mount. Sin skeleton loading, el usuario ve un spinner durante varios segundos antes de que aparezca todo el contenido.

4. **Discovery con 5 submódulos en el menú** — El orden (Resumen, Insights, Problemas y oportunidades, Investigaciones, Segmentos, Hipótesis) no refleja un flujo lógico de trabajo de discovery.

### Qué está limpio

- Los formularios modales (crear/editar/ver) están bien separados y tienen campos razonables
- Los mensajes de estado vacío con CTAs directos son excelentes
- El manejo de errores con botón "Reintentar" es correcto
- Las tablas con filtros persistidos en URL son profesionales
- Los modales de solo lectura (modo "ver") separados del modo "editar" es la decisión correcta

### Qué conviene ocultar / quitar

1. **El banner "Nuevo módulo: Analítica"** del Tablero — quitar ya
2. **Los ítems "Resumen de X" duplicados en submenús** — quitar de los 6 módulos afectados (el padre ya navega al resumen)
3. **Ajustes y Trazabilidad en menú** — ocultar para lector/editor o añadir badge "Admin"

### Qué conviene colapsar

1. **Operación** — Combinar Mejoras + Deuda técnica + Lecciones aprendidas en una sola página con pestañas o filtro de tipo, dejando Bugs y Bloqueos como páginas dedicadas.

2. **Menú principal** — Agrupar Discovery + Requerimientos bajo un grupo "Definición de producto" o separar el menú en dos secciones: "Planeación" (Estrategia, Roadmap, Discovery, Requerimientos) y "Ejecución" (Validación, Lanzamientos, Operación).

3. **Formularios con muchos campos** — Los campos opcionales (`descripcion`, `notas`, `owner`) podrían estar en una sección colapsada "Campos adicionales".

### Qué conviene dividir

- Ninguna pantalla individual necesita dividirse urgentemente. La más cargada, Roadmap resumen, es justificablemente densa dado su propósito.

### Qué conviene fusionar

- Descubrir y filtrar KPIs: la existencia de "KPIs estratégicos" en Estrategia y "KPIs ejecutivos" en Analítica podría unificarse en un módulo KPIs con filtro por tipo.

### Qué conviene simplificar

- El Tablero debería ser un dashboard PM real, no técnico.
- El menú debería tener máximo 10 ítems top-level.

---

## 9. ESTÉTICA BREVE

**Evaluación general: Minimalista / Bien**

- La paleta slate + colores semáforo (emerald/amber/red/blue) es consistente y funcional en el 90% de las pantallas.
- El dark mode está implementado con disciplina en todas las pantallas.
- El spacing y border-radius son uniformes.
- Las tarjetas (articles) tienen el tamaño correcto: no son ni demasiado grandes ni demasiado pequeñas.

**Ruido visual detectado:**

1. **Roadmap resumen: 9 tarjetas de contexto en una fila + 4 tarjetas principales + 3 tarjetas de estado + 1 tarjeta Plan vs Real + Progreso por objetivo + Top prioridades + Próximas entregas** = pantalla muy densa. La sección de 9 tarjetas de contexto (releases, operación, gobierno) en un grid 9-columnas puede verse comprimida en screens medianas.

2. **Tablero: banner + encabezado + grid de 3 cards** — El banner "Nuevo módulo" está visualmente separado del encabezado "Tablero" con un estilo diferente, lo que crea dos bloques de header antes del contenido real.

3. **Discovery Resumen: el grid superior tiene dos tarjetas de segmentos** (activos y totales) que visualmente repiten el patrón sin justificación proporcional.

**Jerarquía visual:** Correcta. Los `h1` para títulos de página, `h2` para secciones internas, y las variaciones de tamaño de texto (`text-2xl`, `text-base`, `text-xs`) crean una jerarquía legible.

---

## 10. TOP DE FORTALEZAS

1. **Arquitectura técnica ejemplar** — Separación limpia de casos de uso, repositorios y presentación. TypeScript estricto en todo el codebase. Zod para validación de entrada y respuesta de API.

2. **RICE automático** — La calculación automática del score RICE en iniciativas, con configuración de parámetros en Ajustes, es una funcionalidad genuinamente útil que pocos sistemas PM tienen.

3. **Relaciones cruzadas ricas y bien modeladas** — La iniciativa como eje central conectada a estrategia, discovery, requerimientos, validación, lanzamientos, operación y gobierno es arquitectónicamente correcta y da coherencia al sistema.

4. **Señales ejecutivas en Analítica** — El cálculo de señales ejecutivas (cobertura, calidad, riesgo, validación) desde datos reales del sistema es sofisticado y genuinamente valioso.

5. **Trazabilidad integrada** — El registro automático de quién hizo qué y cuándo en todos los módulos es infraestructura de confianza imprescindible para un equipo.

6. **Mensajes de estado vacío con CTAs** — Los estados vacíos que guían al usuario a crear el primer registro (con botón de acción) son excelentes en UX de onboarding.

7. **Control de acceso por rol** — La triada lector/editor/admin con aplicación consistente en botones y secciones es correcta.

8. **Filtros persistidos en URL** — Todos los filtros de las tablas se persisten en query params, permitiendo compartir y refrescar sin perder contexto.

9. **Exportación CSV universal** — Todas las listas tienen exportación CSV funcional.

10. **Período estratégico como dato maestro** — La advertencia cuando no existe período estratégico y el bloqueo semántico de toda la jerarquía OKR → KR → KPI sin él es excelente gestión de dependencias de datos.

---

## 11. TOP DE PROBLEMAS CRÍTICOS

1. **El Tablero no es un dashboard PM** — Es el primer problema porque es lo primero que ve cualquier usuario. Muestra información técnica de infraestructura irrelevante para gestión de producto.

2. **Menú global con 53 entradas** — El problema de navegación más urgente. El menú lateral es inmanejable. Ningún PM puede recordar dónde está cada cosa con 14 módulos y 39 submódulos.

3. **Orden del menú rompe el flujo PM** — Validación antes de Estrategia, Matriz de valor huérfana, KPIs sin diferenciación. El menú no refleja cómo un PM piensa su trabajo.

4. **Tres patrones de fecha distintos en el sistema** — `normalizarFechaPortal` devuelve YYYY-MM-DD bruto, la Estrategia interpola fechas ISO directamente, el Roadmap usa Intl.DateTimeFormat. Un sistema de producto maduro tiene un solo estándar de formateo.

5. **Estados en snake_case en el módulo más visitado (Roadmap resumen)** — Los badges de estado muestran "en_progreso" en lugar de "En Progreso". La función correctora existe pero no se aplica aquí.

6. **Validación sin sub-navegación** — El único módulo multi-página sin componente de sub-nav, creando una inconsistencia de experiencia notable.

7. **Banner de Analítica hardcodeado y obsoleto** — Daña la credibilidad del sistema presentando algo "nuevo" que ya tiene meses de existencia.

---

## 12. RECOMENDACIONES PRIORIZADAS

| Prioridad | Problema | Acción concreta | Esfuerzo estimado |
|---|---|---|---|
| **P0** | Tablero sin valor para PM | Reemplazar contenido con: resumen del período activo, bugs/bloqueos críticos abiertos, releases próximos, señal ejecutiva top. Mover datos técnicos a un panel "Estado de infraestructura" colapsado. | Alto |
| **P0** | Estados snake_case en Roadmap resumen | Aplicar `formatearEstadoRegistro()` en los tres badges del resumen (objetivo.estado, iniciativa.estado, entrega.estado) | Muy bajo |
| **P0** | `normalizarFechaPortal` devuelve YYYY-MM-DD bruto | Refactorizar la función para usar `Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })` con fallback graceful | Bajo |
| **P0** | Fechas ISO brutas en Estrategia Resumen | Aplicar formateador a `periodoActivo.fecha_inicio` y `periodoActivo.fecha_fin` | Muy bajo |
| **P0** | Banner "Nuevo módulo: Analítica" obsoleto | Eliminar el bloque completo del banner | Muy bajo |
| **P1** | Menú con 53 entradas | Eliminar los submódulos "Resumen de X" duplicados (6 módulos), reduciendo a ~47 entradas. Paso 2: reordenar para flujo PM. | Bajo |
| **P1** | Orden del menú incorrecto | Reordenar: Tablero → Estrategia → Discovery → Requerimientos → Roadmap → Matriz de valor → Validación → Lanzamientos → Operación → Analítica → Gobierno → Decisiones → Auditorías → Ajustes → Trazabilidad | Muy bajo |
| **P1** | Matriz de valor huérfana | Mover como submódulo de Roadmap o de Analítica | Muy bajo |
| **P1** | Validación sin NavegacionValidacion | Crear componente NavegacionValidacion equivalente al de otros módulos | Bajo |
| **P1** | "KPIs" con colisión de nombre | Cambiar en menú: "KPIs" (Estrategia) → "KPIs estratégicos", "KPIs" (Analítica) → "KPIs ejecutivos" | Muy bajo |
| **P2** | Entrega sin iniciativa sin advertencia | Añadir advertencia informativa en formulario cuando `iniciativa_id` está vacío | Bajo |
| **P2** | Período activo sin validación de unicidad | Advertir o prevenir la activación de un segundo período simultáneo | Bajo |
| **P2** | Discovery: dos tarjetas de segmentos en 6 slots | Combinar "Segmentos activos" + "Segmentos totales" en una sola tarjeta "Segmentos: X activos / Y total" | Muy bajo |
| **P2** | Objetivo (Roadmap) sin owner | Añadir campo `owner` opcional al formulario y modelo de Objetivo | Bajo |
| **P2** | Operación con 6 submódulos | Considerar fusionar Mejoras + Deuda técnica + Lecciones aprendidas en una vista consolidada | Alto |
| **P3** | Ajustes/Trazabilidad sin badge de rol | Añadir indicador visual "Admin" o condicionar visibilidad por rol en el menú | Bajo |
| **P3** | Roadmap resumen: 11 APIs en mount | Añadir skeleton loading progresivo; considerar lazy loading de secciones no críticas | Medio |
| **P3** | Formularios con campos opcionales siempre visibles | Colapsar campos `descripcion`, `notas` en sección "Campos adicionales" | Bajo |

---

## 13. CONCLUSIÓN FINAL

### ¿El sistema está consistente?
**Parcialmente.** La arquitectura técnica es consistente y sólida. Los patrones de CRUD, filtros, paginación, exportación y roles son consistentes. Pero la capa de presentación (fechas, estados, navegación) acumula inconsistencias que indican que las fases de implementación no tuvieron un revisor de UI/UX transversal.

### ¿Está listo para uso productivo?
**Para un equipo ya familiarizado con él: sí, con fricciones.** Para un equipo PM que lo adopte como herramienta nueva: **no todavía**. El Tablero sin valor, el menú que abruma y las fechas brutas generan fricciones de onboarding reales.

### ¿Qué tan serio es lo pendiente?
Los problemas P0 son todos de **baja o muy baja complejidad técnica**. Los estados en snake_case se corrigen con 3 cambios de una línea. Las fechas brutas se corrigen con un refactor de `normalizarFechaPortal`. El banner obsoleto se elimina en una línea. Ningún P0 requiere cambios arquitectónicos.

El único P0 complejo es el Tablero, que requiere pensamiento de producto (qué mostrar) y trabajo de desarrollo (conectar al menos 4-5 fuentes de datos). Pero incluso ese puede implementarse incrementalmente.

### ¿Qué módulos están más sólidos?
- **Analítica** — El módulo más maduro conceptualmente. Señales ejecutivas, health scores, tendencias y portafolio están bien pensados.
- **Gobierno** — Riesgos, dependencias y stakeholders bien modelados e integrados transversalmente.
- **Requerimientos** — Historias con criterios de aceptación y su vinculación a discovery/roadmap es excelente.
- **Decisiones** — El hub de decisiones con máximas relaciones cruzadas es arquitectónicamente correcto.

### ¿Qué módulos requieren más trabajo?
- **Tablero** — Necesita una redesign completa de propósito.
- **Validación** — Thin en contenido y falta el componente de sub-navegación.
- **Navegación global** — El mayor trabajo pendiente a nivel de producto es racionalizar el menú y su orden.

### Veredicto final
El PM Portal tiene el DNA correcto para ser una herramienta de gestión de producto seria. Las bases están. Lo que falta es una capa de pulimento en la presentación y una revisión de producto honesta sobre el menú y el Tablero. Los problemas detectados son **solucionables en días, no semanas**. La inversión técnica acumulada en este sistema justifica completamente resolverlos.

---

*Informe generado el 2026-03-15 mediante revisión directa de código fuente. Archivos auditados: enrutador.tsx, menuPortal.ts, PaginaTablero.tsx, PaginaRoadmap.tsx, PaginaResumenEstrategico.tsx, PaginaResumenDiscovery.tsx, PaginaValidacion.tsx, PaginaResumenLanzamientos.tsx, PaginaResumenAnalitico.tsx, PaginaHistoriasUsuario.tsx, formatoPortal.ts, modelos.ts (1135 líneas), y exploración de 100+ archivos adicionales.*
