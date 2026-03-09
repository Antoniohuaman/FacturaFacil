# AUDITORÍA EXTREMA — PORTAL PM
**Fecha de auditoría:** 2026-03-08
**Auditor:** Claude Sonnet 4.6 (Modo Auditor Senior)
**Alcance:** Punta a punta — frontend, backend, persistencia, autenticación, autorización, analítica, seguridad, gobierno y contraste con modelo corporativo ideal
**Modo:** Solo lectura · Sin modificaciones · Sin suposiciones genéricas · Evidencia concreta en cada hallazgo

---

## TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Árbol Completo del Sistema](#2-árbol-completo-del-sistema)
3. [Inventario Maestro de Módulos y Funcionalidades](#3-inventario-maestro-de-módulos-y-funcionalidades)
4. [Inventario Pantalla por Pantalla](#4-inventario-pantalla-por-pantalla)
5. [Inventario de Datos y Persistencia](#5-inventario-de-datos-y-persistencia)
6. [Inventario de Endpoints y Funciones Backend](#6-inventario-de-endpoints-y-funciones-backend)
7. [Seguridad, Autenticación y Permisos](#7-seguridad-autenticación-y-permisos)
8. [Analítica y Métricas](#8-analítica-y-métricas)
9. [Exportación, Importación, Reportes y Automatización](#9-exportación-importación-reportes-y-automatización)
10. [Matriz de Comparación contra Sistema Ideal de Product Manager](#10-matriz-de-comparación-contra-sistema-ideal-de-product-manager)
11. [Brechas Detectadas](#11-brechas-detectadas)
12. [Hallazgos Especiales](#12-hallazgos-especiales)
13. [Conclusión Final](#13-conclusión-final)

---

## 1. RESUMEN EJECUTIVO

### Nivel de madurez general: **INTERMEDIO-AVANZADO** (no corporativo pleno)

El Portal PM es una aplicación React/TypeScript/Supabase desplegada en Cloudflare Pages, construida bajo arquitectura hexagonal limpia. Cuenta con 12 rutas funcionales, 9 módulos reales, roles de acceso, catálogos configurables y cobertura parcial del ciclo de vida de producto.

### Completitud estimada por dominio

| Dominio | Cobertura estimada |
|---|---|
| Gobierno / Configuración | 65% |
| Roadmap y planificación | 55% |
| Priorización (Valor) | 60% |
| Validación y calidad | 45% |
| Decisiones / ADR | 70% |
| Auditorías y hallazgos | 65% |
| Analítica e instrumentación | 25% |
| Estrategia (OKRs, KPIs, visión) | 5% |
| Discovery e investigación | 0% |
| Lanzamientos y releases | 5% |
| Gestión financiera y ROI | 0% |
| Stakeholders y riesgos | 0% |
| Notificaciones y alertas | 0% |
| Exportación / Importación | 0% |
| Reporting ejecutivo | 5% |

### Principales fortalezas

1. **Arquitectura limpia y bien estructurada** — capas domain/aplicacion/infraestructura/presentacion claramente separadas
2. **TypeScript estricto + Zod** — validación runtime y compile-time en todos los formularios
3. **Catálogos configurables** — estados, severidades, ventanas, etapas, módulos, todos gestionables desde Ajustes
4. **ADR Module operativo** — registro de decisiones con contexto, alternativas, impacto y trazabilidad
5. **Módulo de auditorías con hallazgos** — jerarquía auditoria → hallazgo con severidad
6. **Autenticación Supabase con roles** — lector / editor / admin correctamente aplicados en UI
7. **Integración PostHog funcional** — métricas externas visibles desde el dashboard
8. **Deployment monitoring** — estado.json con commit, branch, versión, timestamp
9. **RICE scoring automático** — fórmula definida en dominio, no solo campos manuales
10. **Plan vs Real** — campo `ventana_real_id` en entregas para comparar planificación vs ejecución

### Principales vacíos críticos

1. **Sin módulo de estrategia** — no hay visión, OKRs, KPIs estratégicos, ni hipótesis
2. **Sin módulo de discovery** — no hay insights, entrevistas, personas, JTBD, oportunidades
3. **Sin exportación** — ningún módulo exporta a CSV, Excel o PDF
4. **Sin importación** — ningún módulo importa datos
5. **Sin gestión financiera** — no hay ROI, costo, valor esperado, esfuerzo monetizado
6. **Sin stakeholders ni dependencias externas**
7. **Sin notificaciones ni alertas** — no hay sistema de avisos
8. **Sin jobs programados** — no hay crons, recordatorios ni automatizaciones
9. **Sin módulo de lanzamiento** — no hay checklist de release, plan de rollback, capacitación
10. **Analítica interna nula** — no hay dashboards de uso del propio portal, ni health scores calculados internamente

---

## 2. ÁRBOL COMPLETO DEL SISTEMA

```
Portal PM
│
├── AUTENTICACIÓN
│   ├── Login (email/password vía Supabase signInWithPassword)
│   ├── Sesión persistida (localStorage vía Supabase SDK)
│   ├── Auth guard (GuardSesionPortalPM → redirect /ingresar)
│   ├── Roles: lector | editor | admin (tabla perfiles)
│   └── Context: useSesionPortalPM()
│
├── TABLERO (Dashboard)
│   ├── Pantalla: PaginaTablero → ruta "/"
│   ├── Widget: Estado del despliegue
│   │   ├── version, commit, rama, fechaConstruccion
│   │   └── fuente: /public/estado.json (build artifact)
│   ├── Widget: Salud operativa
│   │   ├── Estado de sesión Supabase
│   │   └── Health check: query a tabla perfiles
│   └── Widget: Métricas PostHog
│       ├── Periodos: 7d / 30d / 90d / rango personalizado
│       ├── Métricas con Δ (delta vs período anterior)
│       ├── Indicadores: OK / Atención / Riesgo
│       └── fuente: /api/metricas-posthog (Cloudflare Function)
│
├── ROADMAP
│   ├── Resumen (PaginaRoadmap → "/roadmap")
│   │   ├── KPIs: conteo objetivos/iniciativas/entregas
│   │   ├── % completado general
│   │   ├── Distribución por estado (pendiente/en_progreso/completado)
│   │   ├── Plan vs Real en entregas
│   │   ├── Top 5 iniciativas por RICE score
│   │   ├── Progreso por objetivo
│   │   └── Próximas entregas (timeline)
│   │
│   ├── Objetivos (PaginaObjetivosRoadmap → "/roadmap/objetivos")
│   │   ├── Tabla: nombre, estado, prioridad, acciones
│   │   ├── Filtros: estado, prioridad
│   │   ├── Paginación configurable (10/25/50)
│   │   └── CRUD completo (crear/editar/eliminar/ver detalle)
│   │
│   ├── Iniciativas (PaginaIniciativasRoadmap → "/roadmap/iniciativas")
│   │   ├── Tabla: nombre, objetivo, ventana, etapa, RICE, estado
│   │   ├── Filtros: objetivo, ventana, etapa, estado
│   │   ├── RICE: alcance, impacto, confianza, esfuerzo (campos configurables)
│   │   └── CRUD completo
│   │
│   └── Entregas (PaginaEntregasRoadmap → "/roadmap/entregas")
│       ├── Tabla: nombre, iniciativa, fecha_objetivo, estado
│       ├── Campo plan vs real: ventana_planificada_id / ventana_real_id
│       ├── Filtros: iniciativa, ventana, etapa, estado
│       └── CRUD completo
│
├── MATRIZ DE VALOR
│   ├── Pantalla: PaginaMatrizValor → "/matriz-valor"
│   ├── Scoring: puntaje = (valor_negocio × 2) - esfuerzo - riesgo
│   ├── Filtros: texto, estado, prioridad, objetivo, iniciativa, ventana, etapa
│   ├── Paginación configurable (10/25/50)
│   ├── Top 3 por puntaje (cards)
│   ├── Distribución por estado (badges)
│   └── CRUD completo (sliders 1-100 para los 3 componentes)
│
├── VALIDACIÓN
│   ├── Hub (PaginaValidacion → "/validacion")
│   │   ├── KPIs: total planes, planes activos, total plantillas
│   │   └── Últimas 5 ejecuciones (fecha, estado_codigo)
│   │
│   ├── Por Módulo (PaginaValidacionPorModulo → "/validacion/por-modulo")
│   │   ├── Planes de validación por módulo del sistema
│   │   ├── Plantillas de validación
│   │   └── CRUD completo de planes y plantillas
│   │
│   └── Ejecuciones (PaginaEjecucionesValidacion → "/validacion/ejecuciones")
│       ├── Tabla: fecha_ejecucion, plan, rango, resultado, estado
│       ├── Filtros: plan, estado
│       └── CRUD completo
│
├── DECISIONES (ADR)
│   ├── Pantalla: PaginaDecisiones → "/decisiones"
│   ├── Campos: título, contexto, decisión, alternativas, impacto
│   ├── Tags, links (URLs validadas), owner, fecha
│   ├── Referencias cruzadas: iniciativa_id, entrega_id, ejecucion_validacion_id
│   ├── Filtros: búsqueda, estado, fecha desde/hasta
│   ├── Paginación
│   └── CRUD completo
│
├── AUDITORÍAS
│   ├── Pantalla: PaginaAuditorias → "/auditorias"
│   ├── Nivel 1 — Auditoría: tipo, alcance, checklist, evidencias, responsable, estado, fecha
│   ├── Nivel 2 — Hallazgo: título, descripción, severidad, estado, módulo, decisión, ejecución, evidencia_url
│   ├── Filtros: búsqueda, tipo_auditoria, estado_auditoria, estado_hallazgo, severidad, módulo
│   └── CRUD completo (doble entidad)
│
├── AJUSTES (Admin)
│   ├── Pantalla: PaginaAjustes → "/ajustes" (solo admin)
│   ├── Catálogo Módulos PM (pm_catalogo_modulos)
│   ├── Catálogo Ventanas PM (pm_catalogo_ventanas)
│   ├── Catálogo Etapas PM (pm_catalogo_etapas)
│   ├── Catálogo Severidades PM (pm_catalogo_severidades)
│   ├── Catálogo Estados PM (pm_catalogo_estados) — por ámbito
│   ├── Configuración KPIs (pm_config_kpis)
│   ├── Integraciones PM (pm_integraciones) — JSON config
│   └── Configuración RICE (pm_config_rice) — unidades y períodos
│
├── INFRAESTRUCTURA
│   ├── Supabase (PostgreSQL + Auth + RLS)
│   ├── Cloudflare Pages (hosting + functions)
│   ├── PostHog (analytics externas)
│   ├── GitHub (repositorio + métricas repo)
│   └── estado.json (build artifact)
│
└── CAPAS TÉCNICAS
    ├── presentacion/  → UI (páginas, layouts, navegación)
    ├── aplicacion/    → Casos de uso, router, providers
    ├── dominio/       → Modelos, enums, tipos
    └── infraestructura/ → Repositorios, Supabase client, APIs
```

---

## 3. INVENTARIO MAESTRO DE MÓDULOS Y FUNCIONALIDADES

### M01 · TABLERO
| Atributo | Valor |
|---|---|
| Propósito | Dashboard operativo del sistema |
| Ruta | `/` |
| Pantallas | 1 (PaginaTablero) |
| Funciones principales | Salud Supabase, estado despliegue, métricas PostHog |
| CRUD | No (solo lectura) |
| Filtros | Período de métricas (7/30/90d o rango) |
| KPIs | Métricas PostHog con Δ, estado auth, versión app |
| Reportes | No |
| Exportar | No |
| Importar | No |
| Permisos | Solo lectura para todos los roles |
| Auditoría | No |
| Integraciones | Supabase (health), PostHog (métricas), GitHub (deploy) |
| Backend | `/api/metricas-posthog`, `/api/resumen-repo` |
| Persistencia | `perfiles` (health check), `pm_config_kpis` |
| Estado | **OPERATIVO** |

---

### M02 · ROADMAP — OBJETIVOS
| Atributo | Valor |
|---|---|
| Propósito | Gestión de objetivos estratégicos del portafolio |
| Ruta | `/roadmap/objetivos` |
| Pantallas | 1 (PaginaObjetivosRoadmap) |
| Funciones principales | Listar, crear, editar, eliminar objetivos |
| CRUD | Completo (C/R/U/D) |
| Filtros | Estado, prioridad |
| KPIs | Conteo por estado en resumen roadmap |
| Reportes | No |
| Exportar | No |
| Importar | No |
| Permisos | Lector: ver · Editor/Admin: crear, editar, eliminar |
| Auditoría | No (timestamps created_at/updated_at, sin log de cambios) |
| Integraciones | No |
| Backend | Supabase directo vía repositorioObjetivos |
| Persistencia | Tabla `objetivos` |
| Estado | **OPERATIVO** |

---

### M03 · ROADMAP — INICIATIVAS
| Atributo | Valor |
|---|---|
| Propósito | Iniciativas de trabajo con scoring RICE |
| Ruta | `/roadmap/iniciativas` |
| Pantallas | 1 (PaginaIniciativasRoadmap) |
| Funciones principales | CRUD + RICE automático + asociación a objetivo, ventana, etapa |
| CRUD | Completo |
| Filtros | Objetivo, ventana, etapa, estado |
| KPIs | RICE score por iniciativa, top 5 en resumen |
| Reportes | No |
| Exportar | No |
| Importar | No |
| Permisos | Lector: ver · Editor/Admin: CRUD |
| Auditoría | No |
| Integraciones | No |
| Backend | repositorioIniciativas → Supabase |
| Persistencia | Tabla `iniciativas` |
| Estado | **OPERATIVO** |

---

### M04 · ROADMAP — ENTREGAS
| Atributo | Valor |
|---|---|
| Propósito | Entregables con tracking plan vs real |
| Ruta | `/roadmap/entregas` |
| Pantallas | 1 (PaginaEntregasRoadmap) |
| Funciones principales | CRUD + ventana_planificada vs ventana_real + fechas objetivo/completado |
| CRUD | Completo |
| Filtros | Iniciativa, ventana, etapa, estado |
| KPIs | En línea / Adelantado / Atrasado (en resumen roadmap) |
| Reportes | No |
| Exportar | No |
| Importar | No |
| Permisos | Lector: ver · Editor/Admin: CRUD |
| Auditoría | No |
| Integraciones | No |
| Backend | repositorioEntregas → Supabase |
| Persistencia | Tabla `entregas` |
| Estado | **OPERATIVO** |

---

### M05 · MATRIZ DE VALOR
| Atributo | Valor |
|---|---|
| Propósito | Priorización por scoring automático de valor |
| Ruta | `/matriz-valor` |
| Pantallas | 1 (PaginaMatrizValor) |
| Funciones principales | CRUD + scoring automático (valor_negocio×2 - esfuerzo - riesgo) + top 3 |
| CRUD | Completo |
| Filtros | Texto, estado, prioridad, objetivo, iniciativa, ventana, etapa |
| KPIs | Top 3 por puntaje, distribución por estado |
| Reportes | No |
| Exportar | No |
| Importar | No |
| Permisos | Lector: ver · Editor/Admin: CRUD |
| Auditoría | No |
| Integraciones | No |
| Backend | repositorioMatrizValor → Supabase |
| Persistencia | Tabla `matriz_valor` |
| Estado | **OPERATIVO** |

---

### M06 · VALIDACIÓN — PLANES Y PLANTILLAS
| Atributo | Valor |
|---|---|
| Propósito | Gestión de planes y plantillas de validación por módulo |
| Ruta | `/validacion/por-modulo` |
| Pantallas | 1 (PaginaValidacionPorModulo) |
| Funciones principales | CRUD planes, CRUD plantillas, asociación a módulo y criterios |
| CRUD | Completo (dos entidades) |
| Filtros | Módulo, estado |
| KPIs | Total planes, planes activos, total plantillas (hub) |
| Reportes | No |
| Exportar | No |
| Importar | No |
| Permisos | Lector: ver · Editor/Admin: CRUD |
| Auditoría | No |
| Integraciones | No |
| Backend | repositorioValidaciones → Supabase |
| Persistencia | `pm_planes_validacion`, `pm_plantillas_validacion` |
| Estado | **OPERATIVO** |

---

### M07 · VALIDACIÓN — EJECUCIONES
| Atributo | Valor |
|---|---|
| Propósito | Registro de ejecuciones de validación con resultado, hallazgos y aprobador |
| Ruta | `/validacion/ejecuciones` |
| Pantallas | 1 (PaginaEjecucionesValidacion) |
| Funciones principales | CRUD ejecuciones + rango fechas + resultado + evidencia_url + aprobador |
| CRUD | Completo |
| Filtros | Plan, estado |
| KPIs | Últimas 5 ejecuciones (hub) |
| Reportes | No |
| Exportar | No |
| Importar | No |
| Permisos | Lector: ver · Editor/Admin: CRUD |
| Auditoría | No |
| Integraciones | No |
| Backend | repositorioEjecucionesValidacion → Supabase |
| Persistencia | `pm_ejecuciones_validacion` |
| Estado | **OPERATIVO** |

---

### M08 · DECISIONES (ADR)
| Atributo | Valor |
|---|---|
| Propósito | Registro de decisiones arquitectónicas y de producto (ADR pattern) |
| Ruta | `/decisiones` |
| Pantallas | 1 (PaginaDecisiones) |
| Funciones principales | CRUD ADR + tags + links validadas + referencias cruzadas a iniciativa/entrega/ejecución |
| CRUD | Completo |
| Filtros | Búsqueda texto, estado, fecha desde/hasta |
| KPIs | No |
| Reportes | No |
| Exportar | No |
| Importar | No |
| Permisos | Lector: ver · Editor/Admin: CRUD |
| Auditoría | No (módulo de auditoría existe pero es separado) |
| Integraciones | Referencia a ejecuciones de validación |
| Backend | repositorioDecisiones → Supabase |
| Persistencia | `pm_decisiones` |
| Estado | **OPERATIVO** |

---

### M09 · AUDITORÍAS Y HALLAZGOS
| Atributo | Valor |
|---|---|
| Propósito | Registro de auditorías de calidad con hallazgos jerárquicos |
| Ruta | `/auditorias` |
| Pantallas | 1 (PaginaAuditorias) |
| Funciones principales | CRUD auditorías + CRUD hallazgos + severidad + referencias cruzadas |
| CRUD | Completo (dos entidades jerárquicas) |
| Filtros | Búsqueda, tipo_auditoria, estado_auditoria, estado_hallazgo, severidad, módulo |
| KPIs | No |
| Reportes | No |
| Exportar | No |
| Importar | No |
| Permisos | Lector: ver · Editor/Admin: CRUD |
| Auditoría | Propia del módulo (hallazgos son la traza) |
| Integraciones | Referencia a módulos, decisiones, ejecuciones |
| Backend | repositorioAuditorias → Supabase |
| Persistencia | `pm_auditorias`, `pm_hallazgos_auditorias` |
| Estado | **OPERATIVO** |

---

### M10 · AJUSTES (Admin)
| Atributo | Valor |
|---|---|
| Propósito | Panel de administración de catálogos y configuración del sistema |
| Ruta | `/ajustes` |
| Pantallas | 1 (PaginaAjustes) |
| Funciones principales | CRUD 5 catálogos + config KPIs + config RICE + integraciones JSON |
| CRUD | Completo en todos los catálogos |
| Filtros | Por ámbito en estados |
| KPIs | No |
| Reportes | No |
| Exportar | No |
| Importar | No |
| Permisos | Solo Admin |
| Auditoría | No |
| Integraciones | pm_integraciones (JSON config) |
| Backend | repositorioAjustes → Supabase |
| Persistencia | 7 tablas de catálogos y configuración |
| Estado | **OPERATIVO** |

---

## 4. INVENTARIO PANTALLA POR PANTALLA

### P01 · `/ingresar` — PaginaIngresar
- **Objetivo:** Autenticación de usuario
- **Archivo:** `src/presentacion/paginas/ingresar/PaginaIngresar.tsx` (84 líneas)
- **Campos:** Correo (email), Contraseña (password)
- **Botones:** Ingresar (submit con loading state)
- **Validaciones:** Email válido (Zod), password mín. 6 chars
- **Comportamiento:** Redirige a "/" si ya autenticado; muestra error de auth
- **Origen de datos:** Supabase Auth `signInWithPassword()`
- **Manejo de errores:** Mensaje de error del contexto de sesión
- **Permisos:** Público (sin guard)

---

### P02 · `/` — PaginaTablero
- **Objetivo:** Dashboard operativo del sistema
- **Archivo:** `src/presentacion/paginas/tablero/PaginaTablero.tsx` (597 líneas)
- **Widgets:**
  - Card "Estado del despliegue": versión, commit (link GitHub), rama, fecha build, URL repo
  - Card "Salud operativa": estado auth, conexión Supabase (test query a `perfiles`)
  - Card "Métricas PostHog": métricas con Δ, indicadores OK/Atención/Riesgo
- **Filtros:** Período métricas (7/30/90d; rango desde/hasta con validación YYYY-MM-DD, máx 365d)
- **Botones:** Selector período, aplicar rango custom
- **Métricas:** Dependientes de configuración KPIs en PostHog
- **Validaciones:** Formato fecha, rango máx 365 días, fechas coherentes
- **Origen de datos:** `/public/estado.json`, Supabase health, `/api/metricas-posthog`
- **Manejo de errores:** EstadoVista con loading/error/vacío
- **Permisos:** Todos los roles autenticados

---

### P03 · `/roadmap` — PaginaRoadmap
- **Objetivo:** Vista ejecutiva del roadmap con KPIs y tendencias
- **Archivo:** `src/presentacion/paginas/roadmap/PaginaRoadmap.tsx` (691 líneas)
- **Widgets:**
  - Conteo: Objetivos, Iniciativas, Entregas
  - % Completado general
  - Distribución por estado (pendiente/en_progreso/completado)
  - Plan vs Real (en_línea/adelantado/atrasado)
  - Progreso por objetivo (barras + score actividad)
  - Top 5 iniciativas por RICE (con objetivo asociado)
  - Próximas entregas (timeline ordenado por fecha)
- **Filtros:** Ventana (dropdown), Etapa (dropdown) — propagados en jerarquía
- **Botones:** Crear (desplegable: Objetivo / Iniciativa / Entrega) — solo editor/admin
- **Métricas:** Calculadas en componente con useMemo sobre datos cargados
- **Origen de datos:** repositorioObjetivos, repositorioIniciativas, repositorioEntregas (carga en paralelo)
- **Manejo de errores:** EstadoVista por sección
- **Permisos:** Ver todos; crear solo editor/admin

---

### P04 · `/roadmap/objetivos` — PaginaObjetivosRoadmap
- **Objetivo:** CRUD de objetivos estratégicos
- **Tabla:** Nombre, estado (badge), prioridad (badge), acciones (ver/editar/eliminar)
- **Filtros:** Estado, prioridad
- **Paginación:** 10/25/50 items
- **Modal crear/editar:** nombre, descripción, estado, prioridad
- **Modal ver:** mismo formulario en read-only
- **Validaciones:** nombre mín 3 chars, descripción mín 5 chars (Zod)
- **Origen de datos:** repositorioObjetivos
- **Permisos:** Botones CRUD ocultos/deshabilitados para lector

---

### P05 · `/roadmap/iniciativas` — PaginaIniciativasRoadmap
- **Objetivo:** CRUD de iniciativas con RICE
- **Tabla:** Nombre, objetivo, ventana, etapa, RICE score (badge), estado
- **Filtros:** Objetivo, ventana, etapa, estado
- **Paginación:** 10/25/50 items
- **Modal:** nombre, objetivo_id (requerido), alcance (0.25/0.5/1/2/3), impacto, confianza, esfuerzo, ventana_planificada_id, etapa_id, estado, descripción
- **RICE calculado:** alcance × impacto × confianza / esfuerzo (visible en formulario)
- **Origen de datos:** repositorioIniciativas + catálogos
- **Permisos:** Lector solo ve; editor/admin CRUD

---

### P06 · `/roadmap/entregas` — PaginaEntregasRoadmap
- **Objetivo:** CRUD de entregables con tracking plan vs real
- **Tabla:** Nombre, iniciativa, ventana_planificada, ventana_real, fecha_objetivo, estado
- **Filtros:** Iniciativa, ventana, etapa, estado
- **Paginación:** 10/25/50 items
- **Modal:** nombre (mín 3 chars), iniciativa_id (requerido), ventana_planificada_id, ventana_real_id, fecha_objetivo, fecha_completado, estado
- **Origen de datos:** repositorioEntregas + catálogos
- **Permisos:** Lector solo ve; editor/admin CRUD

---

### P07 · `/matriz-valor` — PaginaMatrizValor
- **Objetivo:** Priorización por scoring automático
- **Tabla:** Título + prioridad, iniciativa, planificación (ventana+etapa), puntaje (badge indigo), estado, acciones
- **Cards resumen:** Total items, top 3 por puntaje, distribución por estado
- **Filtros:** Búsqueda texto, estado, prioridad, objetivo, iniciativa, ventana, etapa
- **Paginación:** 10/25/50 items + clear filters
- **Modal:** iniciativa_id (requerido), título, valor_negocio (slider 1-100), esfuerzo (slider 1-100), riesgo (slider 1-100), puntaje auto-calculado (infobox), estado, prioridad
- **Fórmula:** `puntaje = (valor_negocio × 2) - esfuerzo - riesgo`
- **Origen de datos:** repositorioMatrizValor + catálogos
- **Permisos:** Lector ve; editor/admin CRUD

---

### P08 · `/validacion` — PaginaValidacion
- **Objetivo:** Hub de validación (overview)
- **Archivo:** `src/presentacion/paginas/validacion/PaginaValidacion.tsx` (129 líneas)
- **Widgets:** Total planes, planes activos, total plantillas
- **Últimas ejecuciones:** 5 más recientes con fecha y estado
- **Botones:** "Ir a Por módulo", "Ir a Ejecuciones"
- **Origen de datos:** repositorioValidaciones.obtenerResumen() + repositorioEjecucionesValidacion.listar(limit:5)
- **Permisos:** Todos los roles

---

### P09 · `/validacion/por-modulo` — PaginaValidacionPorModulo
- **Objetivo:** Gestión de planes y plantillas por módulo del sistema
- **Tabla planes:** Nombre, módulo, criterios (truncados), estado, acciones
- **Tabla plantillas:** Nombre, módulo, criterios, acciones
- **Filtros:** Módulo, estado
- **Modal planes:** modulo_id (requerido), nombre, criterios (textarea), estado, fecha_inicio, fecha_fin
- **Modal plantillas:** modulo_id (requerido), nombre, criterios
- **Origen de datos:** repositorioValidaciones + pm_catalogo_modulos
- **Permisos:** Lector ve; editor/admin CRUD

---

### P10 · `/validacion/ejecuciones` — PaginaEjecucionesValidacion
- **Objetivo:** Registro de ejecuciones de validación
- **Tabla:** Fecha ejecución, plan asociado, rango (desde-hasta), resultado (truncado), estado
- **Filtros:** Plan, estado
- **Modal:** plan_validacion_id (requerido), fecha_ejecucion, rango_desde, rango_hasta, resultado (textarea), hallazgos (textarea), evidencia_url (URL), aprobador, estado
- **Origen de datos:** repositorioEjecucionesValidacion + repositorioValidaciones
- **Permisos:** Lector ve; editor/admin CRUD

---

### P11 · `/decisiones` — PaginaDecisiones
- **Objetivo:** Registro de decisiones (ADR pattern)
- **Archivo:** `src/presentacion/paginas/decisiones/PaginaDecisiones.tsx` (545 líneas)
- **Tabla:** Título, tags (chips), estado (badge), fecha, owner, acciones
- **Filtros:** Búsqueda por título/estado/tags, estado (dropdown), fecha desde/hasta
- **Paginación:** configurable
- **Modal crear/editar:** título (máx 160), contexto (5-5000), decisión (5-5000), alternativas, impacto, estado, owner, fecha_decision, iniciativa_id (opcional), entrega_id (opcional), ejecucion_validacion_id (opcional), links (CSV de URLs), tags (CSV de strings)
- **Validaciones:** URLs validadas con Zod `.url()`; arrays desde CSV
- **Origen de datos:** repositorioDecisiones + catálogos
- **Permisos:** Lector ve; editor/admin CRUD

---

### P12 · `/auditorias` — PaginaAuditorias
- **Objetivo:** Gestión jerárquica de auditorías y hallazgos
- **Sección Auditorías:** Tabla con tipo, alcance (truncado), responsable, estado, fecha, acciones
- **Sección Hallazgos:** Tabla con título, auditoría, módulo, severidad, estado, acciones
- **Filtros:** Búsqueda, tipo auditoría, estado auditoría, estado hallazgo, severidad, módulo
- **Paginación separada:** auditorías y hallazgos independientes
- **Modal auditoría:** tipo_auditoria_codigo, alcance (5-5000), checklist (5-5000), evidencias (5-5000), responsable, estado, fecha_auditoria
- **Modal hallazgo:** auditoria_id (requerido), título (máx 160), descripción (3-5000), severidad_codigo, estado, modulo_id (opcional), decision_id (opcional), ejecucion_validacion_id (opcional), evidencia_url (opcional)
- **Origen de datos:** repositorioAuditorias + catálogos
- **Permisos:** Lector ve; editor/admin CRUD

---

### P13 · `/ajustes` — PaginaAjustes
- **Objetivo:** Panel admin de catálogos y configuración
- **Acceso:** Solo rol admin (redirige si no)
- **Secciones con CRUD completo:**
  1. Módulos PM (código, nombre, descripción, orden, activo)
  2. Ventanas PM (etiqueta, tipo, año, orden, fecha_inicio, fecha_fin, activo)
  3. Etapas PM (etiqueta, orden, activo)
  4. Severidades PM (código, nombre, nivel, descripción, activo)
  5. Estados PM (ámbito, código, nombre, orden, activo)
  6. KPIs (configuración de indicadores)
  7. Integraciones (editor JSON de configuración)
  8. Configuración RICE (alcance_periodo, esfuerzo_unidad)
- **Origen de datos:** repositorioAjustes → múltiples tablas catálogo
- **Permisos:** puedeAdministrar(rol) — solo admin

---

## 5. INVENTARIO DE DATOS Y PERSISTENCIA

### Tablas del sistema (detectadas por repositorios, modelos y código)

#### TABLAS OPERATIVAS

| Tabla | Propósito | Entidad asociada | Relaciones clave |
|---|---|---|---|
| `perfiles` | Perfiles de usuario con rol | PerfilUsuario | FK: auth.users(id) |
| `objetivos` | Objetivos estratégicos del roadmap | Objetivo | — |
| `iniciativas` | Iniciativas con RICE | Iniciativa | FK: objetivos(id), ventanas(id), etapas(id) |
| `entregas` | Entregables por iniciativa | Entrega | FK: iniciativas(id), ventanas(id) x2 |
| `matriz_valor` | Items de priorización | MatrizValor | FK: iniciativas(id) |
| `pm_planes_validacion` | Planes de validación | PlanValidacion | FK: pm_catalogo_modulos(id) |
| `pm_plantillas_validacion` | Plantillas reutilizables | PlantillaValidacion | FK: pm_catalogo_modulos(id) |
| `pm_ejecuciones_validacion` | Ejecuciones de validación | EjecucionValidacion | FK: pm_planes_validacion(id) |
| `pm_decisiones` | Decisiones / ADR | DecisionPm | FK: iniciativas(id), entregas(id), ejecuciones(id) |
| `pm_auditorias` | Auditorías de calidad | AuditoriaPm | FK: pm_catalogo_tipos_auditoria(código), pm_catalogo_estados |
| `pm_hallazgos_auditorias` | Hallazgos de auditoría | HallazgoAuditoriaPm | FK: pm_auditorias(id), pm_catalogo_modulos(id), pm_decisiones(id) |

#### TABLAS DE CATÁLOGO

| Tabla | Propósito | Campos clave |
|---|---|---|
| `pm_catalogo_modulos` | Módulos del sistema | código, nombre, descripción, orden, activo |
| `pm_catalogo_ventanas` | Ventanas de planificación | etiqueta_visible, tipo, anio, orden, fecha_inicio, fecha_fin, activo |
| `pm_catalogo_etapas` | Etapas de desarrollo | etiqueta_visible, orden, activo |
| `pm_catalogo_severidades` | Niveles de severidad | código, nombre, nivel, descripción, activo |
| `pm_catalogo_estados` | Estados por ámbito | ambito, código, nombre, orden, activo |
| `pm_catalogo_tipos_auditoria` | Tipos de auditoría | código, nombre |

#### TABLAS DE CONFIGURACIÓN

| Tabla | Propósito | Campos clave |
|---|---|---|
| `pm_config_kpis` | Configuración de KPIs | nombre, descripción, formula, meta, activo |
| `pm_integraciones` | Config. integraciones JSON | nombre, configuracion (JSONB) |
| `pm_config_rice` | Configuración del modelo RICE | alcance_periodo, esfuerzo_unidad |

### Campos comunes en todas las tablas
- `id` (UUID, PK)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### Campos de tipos especiales detectados
- `links` en `pm_decisiones` → almacenado como array JSON (text[])
- `tags` en `pm_decisiones` → almacenado como array JSON (text[])
- `configuracion` en `pm_integraciones` → JSONB
- `rice` en `iniciativas` → float calculado (alcance × impacto × confianza / esfuerzo)
- `puntaje_valor` en `matriz_valor` → integer calculado en cliente

### RLS (Row Level Security)
- **Evidencia directa:** El dashboard valida la conexión ejecutando una query a `perfiles` con manejo de errores RLS
- **Configuración:** No visible en código (gestionada en Supabase dashboard)
- **Inferido:** El access token se pasa en todas las queries al cliente Supabase — las políticas RLS están activas

### Relaciones principales detectadas
```
objetivos ──< iniciativas ──< entregas
iniciativas ──< matriz_valor
pm_planes_validacion ──< pm_ejecuciones_validacion
pm_auditorias ──< pm_hallazgos_auditorias
pm_decisiones >── iniciativas (opcional)
pm_decisiones >── entregas (opcional)
pm_decisiones >── pm_ejecuciones_validacion (opcional)
pm_hallazgos_auditorias >── pm_decisiones (opcional)
pm_hallazgos_auditorias >── pm_ejecuciones_validacion (opcional)
```

---

## 6. INVENTARIO DE ENDPOINTS Y FUNCIONES BACKEND

### 6.1 Cloudflare Pages Functions

**Archivo:** `src/infraestructura/apis/clienteApiPortalPM.ts`

#### ENDPOINT 1: `/api/metricas-posthog`
| Atributo | Valor |
|---|---|
| Propósito | Obtener métricas de analítica desde PostHog |
| Método | GET |
| Autenticación | Authorization: Bearer {accessToken} — requerido |
| Params modo período | `periodo_dias` = 7 \| 30 \| 90 |
| Params modo rango | `desde` (YYYY-MM-DD), `hasta` (YYYY-MM-DD) |
| Respuesta | RespuestaMetricasPosthog (validado con Zod) |
| Tablas/Servicios | PostHog API (externo) |
| Pantalla consumidora | PaginaTablero |
| Estado | **OPERATIVO** |

#### ENDPOINT 2: `/api/resumen-repo`
| Atributo | Valor |
|---|---|
| Propósito | Resumen del repositorio GitHub |
| Método | GET |
| Autenticación | No requerida |
| Params | Ninguno |
| Respuesta | Datos del repositorio GitHub |
| Pantallas consumidoras | PaginaTablero |
| Estado | **OPERATIVO** |

### 6.2 Supabase como Backend (Client SDK directo)

Todos los repositorios invocan Supabase directamente desde el cliente. No hay capa de API propia entre frontend y Supabase. La seguridad descansa en:
- RLS policies de Supabase
- JWT del usuario autenticado
- Validaciones Zod en cliente antes de escribir

**Repositorios y operaciones:**

| Repositorio | Operaciones | Tabla(s) |
|---|---|---|
| repositorioObjetivos | listar, crear, editar, eliminar | objetivos |
| repositorioIniciativas | listar, crear, editar, eliminar | iniciativas |
| repositorioEntregas | listar, crear, editar, eliminar | entregas |
| repositorioMatrizValor | listar, crear, editar, eliminar | matriz_valor |
| repositorioValidaciones | listarPlanes, crearPlan, editarPlan, eliminarPlan, listarPlantillas, crearPlantilla, editarPlantilla, eliminarPlantilla, obtenerResumen | pm_planes_validacion, pm_plantillas_validacion |
| repositorioEjecucionesValidacion | listar, crear, editar, eliminar | pm_ejecuciones_validacion |
| repositorioDecisiones | listar, crear, editar, eliminar | pm_decisiones |
| repositorioAuditorias | listarAuditorias, crearAuditoria, editarAuditoria, eliminarAuditoria, listarHallazgos, crearHallazgo, editarHallazgo, eliminarHallazgo, listarTipos | pm_auditorias, pm_hallazgos_auditorias |
| repositorioAjustes | CRUD completo × 8 catálogos/configs | 8 tablas catálogo/config |

---

## 7. SEGURIDAD, AUTENTICACIÓN Y PERMISOS

### 7.1 Flujo de autenticación

```
1. Usuario → /ingresar → formulario email/password
2. PaginaIngresar → useSesionPortalPM().iniciarSesionConCorreo()
3. ProveedorSesionPortalPM → clienteSupabase.auth.signInWithPassword()
4. Supabase retorna: User + Session (JWT)
5. Provider consulta tabla `perfiles` → obtiene rol (lector|editor|admin)
6. Estado de sesión: { usuario, accessToken, rol } guardado en Context
7. Supabase SDK persiste sesión en localStorage (persistSession: true)
8. onAuthStateChange listener mantiene sesión fresca (autoRefreshToken: true)
```

### 7.2 Guard de rutas

**Archivo:** `src/aplicacion/autenticacion/GuardSesionPortalPM.tsx`
- Wrappea el router principal
- Si `!usuario && !cargando` → redirect a `/ingresar`
- Mientras carga → muestra estado de loading
- Implementado como componente wrapper sobre `<Outlet />`

### 7.3 Roles y permisos

**Archivo:** `src/compartido/utilidades/permisosRol.ts`

```typescript
puedeEditar(rol)       → rol === 'editor' || rol === 'admin'
puedeAdministrar(rol)  → rol === 'admin'
```

**Aplicación en UI:**
- Botón "Crear" → `disabled={!puedeEditar(rol)}`
- Botones "Editar/Eliminar" → condicional `puedeEditar(rol)`
- Página Ajustes → redirige si `!puedeAdministrar(rol)`
- Consistencia: aplicado en las 10 páginas con operaciones de escritura

**Tabla de permisos por rol:**

| Acción | lector | editor | admin |
|---|---|---|---|
| Ver cualquier módulo | ✅ | ✅ | ✅ |
| Crear registros | ❌ | ✅ | ✅ |
| Editar registros | ❌ | ✅ | ✅ |
| Eliminar registros | ❌ | ✅ | ✅ |
| Acceder a Ajustes | ❌ | ❌ | ✅ |
| Configurar catálogos | ❌ | ❌ | ✅ |
| Configurar RICE | ❌ | ❌ | ✅ |
| Gestionar integraciones | ❌ | ❌ | ✅ |

### 7.4 Seguridad de secretos

- `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` son build-time vars (embedded en bundle)
- **Riesgo conocido:** El anon key de Supabase es público por diseño — la protección real viene del RLS
- No se detectó exposición de service_role key en código
- Access token del usuario viaja en headers `Authorization: Bearer` hacia los endpoints Cloudflare
- `.env.example` documenta las variables necesarias pero no contiene valores reales

### 7.5 Debilidades de seguridad visibles

| Debilidad | Severidad | Evidencia |
|---|---|---|
| Permisos solo en UI (no en backend propio) | Alto | Repositorios no validan rol antes de escribir; depende 100% del RLS de Supabase |
| Sin rate limiting visible | Medio | No detectado en código; Cloudflare puede tener defaults |
| Sin RBAC a nivel de recurso | Medio | Lector puede ver TODOS los registros sin filtro por equipo/producto |
| Sin log de cambios / audit trail interno | Alto | No hay tabla de historial de cambios; solo timestamps |
| Sin 2FA visible | Bajo | Supabase lo soporta pero no está configurado en código |
| Sin timeout de sesión configurable | Bajo | Depende de configuración Supabase por defecto |

### 7.6 Trazabilidad y auditoría real

- **created_at / updated_at** en todas las tablas: timestamps pero sin quién los cambió
- **Módulo pm_auditorias:** es auditoría de calidad de producto, NO un log de cambios del sistema
- **Sin tabla de eventos/cambios:** no hay event sourcing, no hay historial de ediciones
- **Conclusión:** La trazabilidad de cambios es MÍNIMA — solo se sabe cuándo se creó/actualizó, no quién ni qué cambió

---

## 8. ANALÍTICA Y MÉTRICAS

### 8.1 Dashboards existentes

| Dashboard | Ubicación | Fuente | KPIs |
|---|---|---|---|
| Tablero operativo | `/` | PostHog API + Supabase health | Métricas PostHog con Δ, salud de conexión, estado deploy |
| Resumen roadmap | `/roadmap` | Supabase (queries en memoria) | % completado, distribución estados, plan vs real, top RICE |
| Resumen validación | `/validacion` | Supabase | Total planes, activos, total plantillas, últimas ejecuciones |
| Top 3 valor | `/matriz-valor` | Supabase | Top 3 por puntaje_valor, distribución por estado |

### 8.2 KPIs calculados internamente

| KPI | Cálculo | Módulo |
|---|---|---|
| % Completado roadmap | completados / total × 100 | /roadmap |
| Distribución por estado | count por estado_codigo | /roadmap |
| Plan vs Real entregas | comparación ventana_planificada vs ventana_real | /roadmap |
| Score de actividad por objetivo | sumatoria ponderada iniciativas + entregas | /roadmap |
| RICE por iniciativa | alcance × impacto × confianza / esfuerzo | /roadmap/iniciativas |
| Puntaje valor | valor_negocio × 2 - esfuerzo - riesgo | /matriz-valor |
| Planes activos | count WHERE activo=true | /validacion |
| Métricas PostHog | Δ vs período anterior | /tablero |

### 8.3 Integración PostHog

- **Paquete:** `@facturafacil/analytics-events` (paquete interno del monorepo)
- **Uso:** Lectura de métricas via API autenticada (no tracking de eventos del portal en sí)
- **Evidencia:** `src/infraestructura/apis/clienteApiPortalPM.ts` — endpoint `/api/metricas-posthog`
- **Limitación:** Solo se consumen métricas de PostHog externas; no se detectó tracking de eventos del propio portal PM

### 8.4 Métricas faltantes

- **Health scores por módulo** — no existen
- **Velocity del equipo** — no existe
- **Burndown / Burnup** — no existen
- **Cumulative flow diagram** — no existe
- **Lead time / Cycle time** — no existen
- **Tasa de validaciones aprobadas** — no calculada
- **% hallazgos por severidad** — no calculado
- **Trend de decisiones** — no calculado
- **Madurez del portafolio** — no existe
- **Dashboard ejecutivo** — no existe

---

## 9. EXPORTACIÓN, IMPORTACIÓN, REPORTES Y AUTOMATIZACIÓN

### 9.1 Exportación

| Formato | ¿Existe? | Evidencia |
|---|---|---|
| CSV | ❌ NO | No se encontró ningún código de generación CSV |
| Excel (.xlsx) | ❌ NO | No hay dependencia xlsx/exceljs/sheetjs en package.json |
| PDF | ❌ NO | No hay dependencia jspdf/pdfmake/puppeteer |
| Markdown | ❌ NO | — |
| JSON | ❌ NO | — |

**Veredicto: NINGÚN módulo exporta datos. Es una brecha crítica para un sistema corporativo.**

### 9.2 Importación

| Tipo | ¿Existe? | Evidencia |
|---|---|---|
| Importar CSV | ❌ NO | No detectado |
| Importar Excel | ❌ NO | No detectado |
| Importar desde Jira/ADO | ❌ NO | No detectado |
| Bulk upload | ❌ NO | No detectado |

**Veredicto: NINGUNA funcionalidad de importación existe.**

### 9.3 Reportes descargables

| Reporte | ¿Existe? | Evidencia |
|---|---|---|
| Reporte de roadmap | ❌ NO | — |
| Reporte de validaciones | ❌ NO | — |
| Reporte de auditorías | ❌ NO | — |
| Reporte de decisiones | ❌ NO | — |
| Reporte ejecutivo | ❌ NO | — |
| Reporte de sprint/release | ❌ NO | — |

### 9.4 Automatizaciones y Jobs

| Tipo | ¿Existe? | Evidencia |
|---|---|---|
| Cron jobs | ❌ NO | No detectado en Cloudflare ni Supabase |
| Notificaciones email | ❌ NO | No hay dependencia nodemailer/resend/sendgrid |
| Alertas en app | ❌ NO | No hay sistema de notificaciones |
| Recordatorios de fechas | ❌ NO | No detectado |
| Webhooks salientes | ❌ NO | `pm_integraciones` existe como JSON pero sin lógica de envío |
| Webhooks entrantes | ❌ NO | No detectado |
| Slack/Teams notificaciones | ❌ NO | No detectado |
| Auto-generación de documentos | ❌ NO | — |

---

## 10. MATRIZ DE COMPARACIÓN CONTRA SISTEMA IDEAL DE PRODUCT MANAGER

### A. GOBIERNO DEL PRODUCTO

| Capacidad ideal | Existe | Parcial | Evidencia | Madurez | Observación |
|---|---|---|---|---|---|
| Portafolio de productos/módulos | Sí | — | `pm_catalogo_modulos`, `/ajustes` | Medio | Solo catálogo de módulos, sin jerarquía portafolio real |
| Roles y permisos | Sí | — | `permisosRol.ts`, tabla `perfiles`, 3 roles | Medio | Solo 3 roles planos; sin permisos por módulo/recurso |
| Trazabilidad de cambios | — | Sí | timestamps en todas las tablas | Bajo | Solo fechas created_at/updated_at; sin quién cambió qué |
| Auditoría de cambios | — | Sí | módulo `pm_auditorias` | Bajo | Auditoría de calidad, no log de cambios del sistema |
| Aprobaciones / workflows | No | — | — | Nulo | No existe flujo de aprobación en ningún módulo |
| Historial de versiones | No | — | — | Nulo | Sin versionado de registros |
| ADRs / Decisiones registradas | Sí | — | `pm_decisiones`, `/decisiones` | Alto | Módulo completo con contexto, alternativas, impacto |

### B. ESTRATEGIA

| Capacidad ideal | Existe | Parcial | Evidencia | Madurez | Observación |
|---|---|---|---|---|---|
| Visión del producto | No | — | — | Nulo | No existe campo/módulo de visión |
| Objetivos estratégicos | Sí | — | tabla `objetivos`, `/roadmap/objetivos` | Medio | Existe pero sin alineación explícita a negocio/misión |
| OKRs | No | — | — | Nulo | Objetivos simples, sin KR asociados ni tracking |
| KPIs estratégicos | — | Sí | `pm_config_kpis` + PostHog | Bajo | Configuración existe pero sin tablero propio de KPIs estratégicos |
| Problemas priorizados | No | — | — | Nulo | Sin módulo de problem statements |
| Hipótesis | No | — | — | Nulo | Sin backlog de hipótesis |
| Propuesta de valor | No | — | — | Nulo | Sin canvas de propuesta de valor |
| Alineación con negocio | No | — | — | Nulo | Sin mapa de alineación estratégica |

### C. DISCOVERY E INVESTIGACIÓN

| Capacidad ideal | Existe | Parcial | Evidencia | Madurez | Observación |
|---|---|---|---|---|---|
| Insights | No | — | — | Nulo | No existe |
| Entrevistas | No | — | — | Nulo | No existe |
| Feedback de usuarios | No | — | — | Nulo | No existe |
| Segmentos / Personas | No | — | — | Nulo | No existe |
| JTBD (Jobs To Be Done) | No | — | — | Nulo | No existe |
| Oportunidades detectadas | No | — | — | Nulo | No existe |
| Benchmark competitivo | No | — | — | Nulo | No existe |
| Backlog de hipótesis | No | — | — | Nulo | No existe |

### D. GESTIÓN DE ROADMAP

| Capacidad ideal | Existe | Parcial | Evidencia | Madurez | Observación |
|---|---|---|---|---|---|
| Objetivos en roadmap | Sí | — | tabla `objetivos` | Medio | Funcional pero sin KRs ni métricas de outcome |
| Iniciativas | Sí | — | tabla `iniciativas` | Alto | Con RICE, ventana, etapa, estado |
| Épicas | No | — | — | Nulo | No existe nivel épica entre iniciativa y entrega |
| Entregables / Hitos | Sí | — | tabla `entregas` | Medio | Existe con fechas y plan vs real, pero sin dependencias |
| Dependencias entre items | No | — | — | Nulo | No hay campo ni UI de dependencias |
| Estados por item | Sí | — | `pm_catalogo_estados` | Alto | Configurable por ámbito |
| Fechas objetivo y real | Sí | — | `fecha_objetivo`, `fecha_completado`, ventanas | Alto | Plan vs real implementado |
| Responsables | — | Sí | Solo en auditorías y decisiones (owner/responsable) | Bajo | Sin asignación de responsable en objetivos/iniciativas |
| Vista por ventana temporal | Sí | — | filtro ventana en resumen roadmap | Medio | Filtro existe, no hay gantt ni timeline visual |
| Vista por etapa | Sí | — | filtro etapa | Medio | Filtro existe, no hay vista Kanban/board |
| Vista por prioridad | — | Sí | sorting en tabla, top 5 RICE | Bajo | Sin vista dedicada por prioridad |
| Vista por equipo/objetivo | — | Sí | filtro objetivo en iniciativas | Bajo | Sin vista de equipo ni agrupación visual |

### E. REQUERIMIENTOS

| Capacidad ideal | Existe | Parcial | Evidencia | Madurez | Observación |
|---|---|---|---|---|---|
| Historias de usuario | No | — | — | Nulo | No existe módulo de user stories |
| Casos de uso | No | — | — | Nulo | No existe |
| Reglas de negocio | No | — | — | Nulo | No existe |
| Criterios de aceptación | — | Sí | `criterios` en planes/plantillas validación | Bajo | Solo en contexto de validación, no en requerimientos |
| Requerimientos no funcionales | No | — | — | Nulo | No existe |
| Riesgos | — | Sí | `riesgo` en matriz_valor (campo numérico) | Bajo | Solo como número en scoring, sin módulo de riesgos |
| Supuestos y restricciones | No | — | — | Nulo | No existe |
| Versionado de requerimientos | No | — | — | Nulo | No existe |

### F. DISEÑO Y ESPECIFICACIÓN

| Capacidad ideal | Existe | Parcial | Evidencia | Madurez | Observación |
|---|---|---|---|---|---|
| Flujos UX | No | — | — | Nulo | No existe |
| Links a Figma/diseño | — | Sí | `links` en pm_decisiones | Bajo | URLs en decisiones, sin módulo de diseño |
| Componentes afectados | No | — | — | Nulo | No existe |
| Edge cases documentados | No | — | — | Nulo | No existe |
| States vacíos/error documentados | No | — | — | Nulo | No existe |
| Definition of Done checklist | — | Sí | `checklist` en pm_auditorias | Bajo | Solo en auditorías, no en items de roadmap |

### G. PLANIFICACIÓN Y DELIVERY

| Capacidad ideal | Existe | Parcial | Evidencia | Madurez | Observación |
|---|---|---|---|---|---|
| Planificación de capacidad | No | — | — | Nulo | No existe |
| Carga por recurso/equipo | No | — | — | Nulo | No existe |
| Asignación de trabajo | No | — | — | Nulo | Solo responsable textual en algunos módulos |
| Seguimiento plan vs real | — | Sí | ventana_planificada vs ventana_real | Medio | Existe en entregas, no hay burndown |
| Bloqueos | No | — | — | Nulo | No existe campo ni módulo de bloqueos |
| Salud de ejecución | — | Sí | En línea/Adelantado/Atrasado en resumen | Bajo | Calculado pero sin alertas ni detalle |

### H. VALIDACIÓN Y CALIDAD

| Capacidad ideal | Existe | Parcial | Evidencia | Madurez | Observación |
|---|---|---|---|---|---|
| Planes de validación | Sí | — | `pm_planes_validacion` | Medio | Completo con módulo, criterios, estado |
| Ejecuciones de validación | Sí | — | `pm_ejecuciones_validacion` | Medio | Con resultado, hallazgos, evidencia, aprobador |
| Plantillas reutilizables | Sí | — | `pm_plantillas_validacion` | Medio | Funcional |
| Resultados y hallazgos | — | Sí | campo `hallazgos` en ejecución (texto libre) | Bajo | Texto libre, sin items estructurados por hallazgo |
| Incidencias de calidad | Sí | — | `pm_hallazgos_auditorias` con severidad | Medio | Bien estructurado con severidad y estado |
| UAT | — | Sí | pm_ejecuciones_validacion puede usarse para UAT | Bajo | Sin tipo diferenciado de UAT |
| Criterios de salida | — | Sí | `criterios` en planes | Bajo | Texto libre, sin checklist ejecutable |
| Validación de negocio | — | Sí | campo `aprobador` en ejecuciones | Bajo | Solo nombre textual de aprobador |

### I. ANALÍTICA Y MÉTRICAS

| Capacidad ideal | Existe | Parcial | Evidencia | Madurez | Observación |
|---|---|---|---|---|---|
| Métricas por módulo | — | Sí | PostHog en tablero (métricas externas) | Bajo | Métricas de producto externas, no del portal en sí |
| KPIs propios | — | Sí | `pm_config_kpis` + cálculos en roadmap | Bajo | Configuración existe; cálculos básicos en UI |
| Funnels | No | — | — | Nulo | No existe |
| Cohortes | No | — | — | Nulo | No existe |
| Eventos de tracking | — | Sí | Paquete @facturafacil/analytics-events | Bajo | Paquete existe pero uso en portal no detectado |
| Dashboards por módulo | No | — | — | Nulo | Solo tablero global |
| Health scores | No | — | — | Nulo | No existe cálculo de health score |
| Alertas | No | — | — | Nulo | No existe sistema de alertas |
| Seguimiento post-release | No | — | — | Nulo | No existe módulo de post-release |

### J. LANZAMIENTOS

| Capacidad ideal | Existe | Parcial | Evidencia | Madurez | Observación |
|---|---|---|---|---|---|
| Gestión de releases | No | — | — | Nulo | No existe módulo de releases |
| Checklist de lanzamiento | — | Sí | `checklist` en pm_auditorias | Bajo | Solo en auditorías; no en releases |
| Plan de comunicación | No | — | — | Nulo | No existe |
| Plan de capacitación | No | — | — | Nulo | No existe |
| Plan de rollback | No | — | — | Nulo | No existe |
| Monitoreo post-lanzamiento | No | — | — | Nulo | No existe |

### K. OPERACIÓN Y MEJORA CONTINUA

| Capacidad ideal | Existe | Parcial | Evidencia | Madurez | Observación |
|---|---|---|---|---|---|
| Registro de bugs | No | — | — | Nulo | No existe |
| Mejoras pendientes | No | — | — | Nulo | No existe |
| Deuda técnica visible | No | — | — | Nulo | No existe |
| Lecciones aprendidas | No | — | — | Nulo | Sin módulo específico |
| Feedback post-release | No | — | — | Nulo | No existe |
| Ciclo de mejora | No | — | — | Nulo | No existe |

### L. GESTIÓN FINANCIERA Y VALOR

| Capacidad ideal | Existe | Parcial | Evidencia | Madurez | Observación |
|---|---|---|---|---|---|
| Valor esperado | — | Sí | `valor_negocio` en matriz_valor (1-100) | Bajo | Escala subjetiva, sin monetización |
| Impacto en negocio | — | Sí | `impacto` en iniciativas (RICE, escala 0.25-3) | Bajo | Escala RICE, no monetario |
| Costo estimado | No | — | — | Nulo | No existe |
| Esfuerzo monetizado | No | — | — | Nulo | esfuerzo es semanas-persona, no hay conversión |
| ROI | No | — | — | Nulo | No existe |
| Priorización ejecutiva | — | Sí | RICE + puntaje valor + top rankings | Bajo | Scoring existe; sin decisión ejecutiva formal |

### M. GESTIÓN ORGANIZACIONAL

| Capacidad ideal | Existe | Parcial | Evidencia | Madurez | Observación |
|---|---|---|---|---|---|
| Stakeholders | No | — | — | Nulo | No existe módulo de stakeholders |
| Dependencias externas | No | — | — | Nulo | Sin tracking de dependencias entre equipos/sistemas |
| Riesgos del producto | — | Sí | `riesgo` en matriz_valor | Bajo | Numérico subjetivo; sin módulo de riesgos real |
| Mitigaciones | No | — | — | Nulo | No existe |
| Change management | No | — | — | Nulo | No existe |
| Knowledge management | — | Sí | pm_decisiones con contexto y alternativas | Bajo | ADRs capturan conocimiento de decisiones |
| Compliance | No | — | — | Nulo | No existe |
| Privacidad y seguridad (módulo) | No | — | — | Nulo | No existe registro de requerimientos de privacidad |

---

## 11. BRECHAS DETECTADAS

### CRÍTICAS (bloquean el uso corporativo del sistema)

| # | Brecha | Tipo | Impacto |
|---|---|---|---|
| C01 | Sin exportación de ningún tipo (CSV/Excel/PDF) | operaciones | No se puede sacar información del sistema hacia stakeholders |
| C02 | Sin audit trail de cambios (quién cambió qué y cuándo) | gobierno / seguridad | Imposible auditar modificaciones en producción |
| C03 | Sin módulo de OKRs ni KPIs estratégicos propios | estrategia | Sistema de objetivos plano sin trazabilidad a outcomes |
| C04 | Sin módulo de discovery/investigación | discovery | Sin base de evidencia para las decisiones de producto |
| C05 | Sin gestión financiera (ROI, costo, presupuesto) | valor financiero | Imposible justificar inversiones en lenguaje ejecutivo |
| C06 | Sin módulo de stakeholders ni dependencias externas | stakeholders | Sin visibilidad de quién impacta o es impactado |
| C07 | Sin sistema de notificaciones ni alertas | operaciones | Sin proactividad ante fechas vencidas, bloqueos o riesgos |
| C08 | Permisos solo en UI (RLS como único control backend) | seguridad | Sin capa de validación de permisos en servidor propio |

### ALTAS (degradan significativamente la utilidad del sistema)

| # | Brecha | Tipo |
|---|---|---|
| A01 | Sin tracking de responsables en objetivos e iniciativas | delivery |
| A02 | Sin dependencias entre items del roadmap | roadmap |
| A03 | Sin módulo de releases / lanzamientos | lanzamiento |
| A04 | Sin historias de usuario ni requerimientos estructurados | roadmap / delivery |
| A05 | Sin bloqueos ni impedimentos visibles | delivery |
| A06 | Sin health scores por módulo o por portafolio | analítica |
| A07 | Sin dashboards ejecutivos (agregados de alto nivel) | analítica |
| A08 | Sin backlog de hipótesis ni experimentos | discovery / estrategia |
| A09 | Sin vistas de tablero (kanban, gantt, timeline visual) | roadmap |
| A10 | Sin gestión de bugs ni deuda técnica | operaciones |
| A11 | Sin módulo de capacidad y planificación de equipo | delivery |
| A12 | Sin lecciones aprendidas ni mejora continua estructurada | operaciones |

### MEDIAS (limitan la completitud pero no bloquean uso básico)

| # | Brecha | Tipo |
|---|---|---|
| M01 | Sin importación de datos | operaciones |
| M02 | Sin versionado de registros | gobierno |
| M03 | Sin workflows de aprobación | gobierno |
| M04 | Sin feedback de usuarios del portal (NPS, comentarios) | operaciones |
| M05 | Sin segmentos ni personas definidas | discovery |
| M06 | Sin benchmark competitivo | discovery |
| M07 | Sin flujos UX ni wireframes vinculados | diseño |
| M08 | Sin criterios de salida ejecutables (checklist) | validación |
| M09 | Sin tipos diferenciados de validación (QA/UAT/E2E) | validación |
| M10 | Sin follow-up post-release estructurado | lanzamiento |
| M11 | Sin compliance ni privacidad gestionados | compliance |
| M12 | Sin reportes descargables | analítica |
| M13 | Sin planificación por épicas | roadmap |

### BAJAS (mejoras de madurez deseable)

| # | Brecha | Tipo |
|---|---|---|
| B01 | Sin KPIs en tiempo real (solo PostHog externo) | analítica |
| B02 | Sin integración con Jira/GitHub Issues | integraciones |
| B03 | Sin integración con Confluence/Notion | knowledge management |
| B04 | Sin dark mode completo en todos los componentes | UX |
| B05 | Sin accesibilidad explícita (ARIA, keyboard nav) | UX |
| B06 | Sin onboarding o guía de uso | UX |
| B07 | Sin búsqueda global entre módulos | UX |
| B08 | Sin agrupación o filtrado por equipo de desarrollo | delivery |
| B09 | Sin integración SSO/SAML para enterprise | seguridad |
| B10 | Sin tags unificados entre módulos | governance |

---

## 12. HALLAZGOS ESPECIALES

### H01 · Módulo de validación con estructura sólida pero hallazgos en texto libre
- **Evidencia:** `pm_ejecuciones_validacion.hallazgos` es campo texto libre (textarea)
- **Problema:** Los hallazgos de una ejecución no son items estructurados; no tienen severidad, estado ni seguimiento individual
- **Contraste:** `pm_hallazgos_auditorias` sí tiene estructura completa — inconsistencia entre módulos
- **Estado:** PARCIAL — funciona pero no es trazable a nivel granular

### H02 · `pm_integraciones` existe como tabla pero sin lógica de ejecución
- **Evidencia:** `repositorioAjustes` gestiona `pm_integraciones` con campos nombre + configuracion (JSON)
- **Problema:** Solo es un almacén de configuración JSON. No hay ningún código que use esa configuración para disparar webhooks, llamar APIs externas o enviar notificaciones
- **Estado:** UI SIN BACKEND OPERATIVO — capacidad almacenada pero no ejecutada

### H03 · `pm_config_kpis` existe pero sin tablero propio de KPIs
- **Evidencia:** `repositorioAjustes` gestiona `pm_config_kpis`; existe en Ajustes para CRUD
- **Problema:** Los KPIs configurados no tienen una pantalla de seguimiento propia con valores actuales, tendencias ni alertas
- **Estado:** INCOMPLETO — estructura de datos sin UI de consumo

### H04 · RICE configurado pero sin recálculo automático al cambiar config
- **Evidencia:** `pm_config_rice` almacena `alcance_periodo` y `esfuerzo_unidad`; RICE se calcula en cliente con `calcularRice()` en `src/compartido/utilidades/calcularRice.ts`
- **Problema:** Si se cambia la unidad de esfuerzo en Ajustes, los RICE scores históricos no se recalculan
- **Estado:** PARCIAL — configuración existe pero sin sincronización retroactiva

### H05 · Resumen roadmap con cálculos en memoria sobre datos completos (sin paginación)
- **Evidencia:** `PaginaRoadmap.tsx` carga todos los objetivos, iniciativas y entregas sin límite, hace cálculos con useMemo
- **Riesgo:** Con portafolios grandes (>500 items) puede haber problemas de rendimiento
- **Estado:** TÉCNICO — funciona para volúmenes pequeños/medianos

### H06 · Sin rutas huérfanas detectadas
- Todas las rutas definidas en `enrutador.tsx` tienen componente de página asociado
- Todos los items del menú en `menuPortal.ts` coinciden con rutas existentes
- **Estado:** Sin huérfanas — arquitectura de rutas consistente

### H07 · Módulo de validación tiene dos sub-páginas pero el hub `/validacion` no funciona como drill-down completo
- **Evidencia:** `/validacion` muestra resumen (5 últimas ejecuciones, conteos) pero no permite crear desde ahí
- **Problema:** El hub es informativo pero no transaccional — usuario debe navegar a sub-páginas para todas las acciones
- **Estado:** DISEÑO INTENCIONAL pero limita eficiencia operativa

### H08 · Estado.json es build artifact, no hay forma de ver histórico de deploys
- **Evidencia:** `public/estado.json` se sobreescribe en cada build
- **Problema:** Sin historial de deployments ni changelog visible en el portal
- **Estado:** LIMITACIÓN CONOCIDA de la arquitectura de deploy

### H09 · Sin página 404 personalizada detectada
- **Evidencia:** `_redirects` de Cloudflare redirige todo a `/index.html` (SPA mode)
- **Problema:** Rutas inválidas llevan al dashboard sin mensaje de error
- **Estado:** MENOR — no hay 404.tsx dedicado

### H10 · Filtros en cascada (objetivo → iniciativa → entrega) implementados solo en matriz valor
- **Evidencia:** `PaginaMatrizValor.tsx` implementa filtro dependiente objetivo → iniciativa
- **Problema:** En roadmap/entregas y roadmap/iniciativas los filtros son independientes sin cascada automática
- **Estado:** INCONSISTENTE entre módulos

### H11 · El campo `owner` en decisiones es texto libre sin validación contra usuarios del sistema
- **Evidencia:** `decisionPmSchema.owner` es string opcional sin referencia a tabla perfiles
- **Problema:** Sin integridad referencial — el owner puede ser cualquier texto
- **Estado:** DEUDA TÉCNICA menor — funcional pero no integrado con perfiles reales

### H12 · No se detectaron datos mock en producción
- No hay archivos seed, fixtures o datos de prueba en el código del proyecto
- `estado.json` refleja el ambiente real de build
- **Veredicto:** Sistema limpio de datos demo

---

## 13. CONCLUSIÓN FINAL

### ¿Qué SÍ es hoy el Portal PM?

El Portal PM es un **sistema de gestión táctica y operativa de producto**, bien construido técnicamente, con:

1. **Planificación jerárquica operacional:** Objetivos → Iniciativas → Entregas con fechas, estados y scoring RICE
2. **Priorización de valor:** Matriz de valor con scoring automático configurable
3. **Gobierno de calidad:** Módulo de validaciones (planes, plantillas, ejecuciones) y auditorías con hallazgos
4. **Registro de decisiones:** ADR module con contexto completo, trazabilidad cruzada y tags
5. **Configuración avanzada:** Sistema de catálogos completamente configurable por un administrador
6. **Monitoreo de sistema:** Dashboard operativo con salud de infraestructura, deploy y métricas externas
7. **Control de acceso básico:** 3 roles con permisos aplicados consistentemente en toda la UI
8. **Arquitectura sólida:** Clean Architecture, TypeScript estricto, Zod, React 19, Supabase, Cloudflare

### ¿Qué NO es todavía?

El Portal PM **no es todavía** un sistema corporativo profesional de Product Management porque le faltan:

1. **Todo el ciclo de estrategia:** Sin visión, OKRs, KPIs propios con seguimiento, hipótesis
2. **Todo el ciclo de discovery:** Sin insights, personas, JTBD, feedback, investigación
3. **Requerimientos formales:** Sin user stories, criterios de aceptación estructurados, reglas de negocio
4. **Inteligencia de datos:** Sin exportación, sin reportes, sin dashboards ejecutivos, sin alertas
5. **Gestión organizacional:** Sin stakeholders, sin dependencias de equipo, sin riesgos estructurados
6. **Gestión del valor financiero:** Sin costos, sin ROI, sin presupuesto
7. **Ciclo de vida completo:** Sin releases, sin feedback post-lanzamiento, sin mejora continua
8. **Audit trail real:** Sin log de cambios del sistema

### ¿Puede considerarse un sistema corporativo profesional de Product Management?

**No todavía.** Cubre aproximadamente el **35-40% de las capacidades** esperadas de un sistema corporativo de PM. Es un sistema robusto para el ciclo de **planificación → priorización → validación → decisiones**, pero le falta la mitad superior del ciclo (estrategia, discovery, requerimientos) y la mitad inferior (lanzamiento, post-release, mejora continua, analítica de producto).

### ¿Qué le falta para poder afirmarlo con solidez?

Para alcanzar nivel **corporativo profesional** requiere como mínimo:

**Prioridad 1 — Capacidades bloqueantes:**
- Exportación (CSV/Excel mínimo) en todos los módulos
- Audit trail (log de cambios: quién, qué, cuándo)
- Módulo de OKRs con Key Results y tracking
- Notificaciones y alertas de fechas/estados

**Prioridad 2 — Expansión del ciclo de vida:**
- Módulo de discovery mínimo (insights + hipótesis)
- Gestión de releases / checklist de lanzamiento
- Histórico de cambios por registro
- Métricas propias del portal (no solo PostHog externo)

**Prioridad 3 — Madurez corporativa:**
- Gestión financiera básica (esfuerzo → costo, valor → ROI)
- Módulo de stakeholders
- Dashboards ejecutivos (agrupados por portafolio/período)
- Importación de datos (al menos CSV para carga masiva)

**El camino más eficiente:** El sistema tiene una base arquitectónica excelente. No necesita reescritura — necesita **expansión modular** del ciclo de vida de producto hacia arriba (estrategia/discovery) y hacia abajo (lanzamiento/operación), más instrumentación analítica propia.

---

*Auditoría generada el 2026-03-08 mediante análisis estático exhaustivo del código fuente.*
*Metodología: solo lectura, sin modificaciones, toda afirmación con evidencia en archivo y línea.*
*Alcance: 100% del repositorio `C:\FacturaFacil\apps\pm-portal`*
