# Auditoría Exhaustiva de Repositorio — FacturaFacil Monorepo
**Fecha:** 2026-03-06
**Auditor:** Arquitecto de Software Senior (análisis automatizado + revisión completa)
**Alcance:** Repositorio completo — rama `develop`
**Apps auditadas:** SenciYo (raíz `/`) · PM Portal (`apps/pm-portal/`)

---

## 1. Resumen Ejecutivo

El repositorio contiene **dos aplicaciones React + TypeScript** (SenciYo y PM Portal) coexistiendo en el mismo repositorio sin herramientas de monorepo reales. No hay workspaces, no hay Turborepo, no hay Nx, no hay CI/CD configurado en el repo. El mayor problema estructural es que **SenciYo vive en la raíz del repositorio** en lugar de en su propia subcarpeta, haciendo que el `package.json` raíz sea simultáneamente el manifest del monorepo y el de SenciYo.

No existe acoplamiento de código fuente entre apps (cero imports cruzados). Sin embargo, existe un **acoplamiento semántico crítico**: PM Portal consulta los eventos de PostHog de SenciYo por nombre literal, y esos nombres están duplicados en ambas apps sin contrato compartido. Un renombramiento en SenciYo rompe las métricas del PM Portal sin ningún error en compilación.

**Recomendación: Opción C — Mantener monorepo con ajustes estructurales.**
El equipo es pequeño, no hay CI/CD que gestionar por separado aún, y el acoplamiento existente (semántico, no de código) es más fácil de controlar con un paquete compartido que con repos separados. La separación en este momento añadiría overhead sin resolver el problema real.

---

## 2. Diagnóstico General por Categorías

### A. Arquitectura del Repositorio

| Aspecto | Estado | Severidad |
|---|---|---|
| SenciYo vive en la raíz (no en `apps/senciyo/`) | Problema estructural | P1 |
| No hay herramienta de monorepo (workspaces, turbo, nx) | Ausencia crítica | P1 |
| `app/shared/src/` vestigial (3 archivos, no usados) | Deuda técnica | P2 |
| `apps/pm-portal/` correctamente aislada | ✅ Bien | — |
| Sin CODEOWNERS ni boundaries de lint | Ausencia | P1 |
| Artefactos en raíz (`unmerged.txt`, `unmerged_list.txt`, `unmerged_remaining.txt`) | Deuda técnica | P2 |

La estructura real del repositorio es:

```
/ (raíz = SenciYo)
├── src/                   ← código fuente de SenciYo
├── package.json           ← manifest de SenciYo (nombre: "web")
├── vite.config.ts         ← config de build de SenciYo
├── apps/
│   └── pm-portal/         ← PM Portal (app separada)
│       ├── src/
│       ├── functions/     ← Cloudflare Pages Functions (serverless)
│       ├── package.json
│       └── vite.config.ts
├── app/shared/src/        ← vestigial (3 archivos, no usado por nadie)
└── docs_web/              ← sitio de documentación (propio node_modules)
```

El `package.json` raíz se llama `"web"` (no `"senciyo-monorepo"` ni similar), lo que confirma que la raíz del repo es al mismo tiempo la app SenciYo, no un manifest de monorepo.

---

### B. Dependencias y Compatibilidad

| Dependencia | SenciYo | PM Portal | Estado |
|---|---|---|---|
| React | ^19.1.1 | ^19.1.1 | ✅ Alineado |
| react-router-dom | ^7.9.1 | ^7.9.1 | ✅ Alineado |
| TypeScript | ~5.8.3 | ~5.8.3 | ✅ Alineado |
| Vite | ^7.1.2 | ^7.1.2 | ✅ Alineado |
| **zod** | **^3.24.1** | **^4.3.6** | ⚠️ **Drift MAYOR** |
| @hookform/resolvers | ^3.9.1 | ^5.2.2 | ⚠️ Drift MAYOR |
| react-hook-form | ^7.54.2 | ^7.71.2 | Drift menor |
| tailwindcss | ^3.4.17 | ^3.4.17 | ✅ Alineado |
| Supabase | ausente | ^2.98.0 | — diferente dominio |
| Amplitude / Mixpanel | presentes | **ausentes** | — diferente dominio |

**Hallazgo crítico — Zod v3 vs v4**: La migración de Zod v3 a v4 incluye breaking changes en la API (`.parse()`, `.safeParse()`, tipos de unión). Si en algún momento se intenta compartir código de validación, esto causaría errores silenciosos o de compilación. Por ahora no hay esquemas compartidos, pero el drift es un riesgo latente.

**Hallazgo: `node` en devDependencies** (solo SenciYo, `package.json` raíz):
```json
"devDependencies": {
  "node": "^25.5.0"  // incorrecto — debería estar en "engines", no aquí
}
```
Esto no instala Node.js real; es un stub que contamina el lockfile y puede confundir herramientas de CI.

**Tamaño de bundle — SenciYo**: `vite.config.ts` tiene `chunkSizeWarningLimit: 5000` (5 MB). El valor por defecto de Vite es 500 KB. Esta configuración silencia advertencias de bundle grande. SenciYo incluye Amplitude + Mixpanel + PostHog + ExcelJS + XLSX + Recharts + DnD-Kit: todas librerías pesadas. El bundle actual casi con certeza supera 1 MB.

---

### C. Build, CI/CD y Despliegue

| Aspecto | Estado | Severidad |
|---|---|---|
| Sin GitHub Actions ni CI/CD en el repo | Ausencia crítica | P0 |
| Configuración operativa centralizada en Cloudflare Pages dashboard | ✅ Activo | — |
| Deployments Cloudflare configurados solo en el panel (sin IaC) | Riesgo | P1 |
| Build de SenciYo: `tsc -b && vite build` | ✅ Estándar | — |
| Build de PM Portal: genera `estado.json` + `tsc -b` + `vite build` | ✅ Bien | — |
| Un cambio en una app no dispara automáticamente el pipeline de la otra | Sin automatizar | P1 |

**Scripts raíz que actúan como proxy** (en `package.json` raíz):
```json
"dev:portal-pm":    "npm --prefix apps/pm-portal run dev",
"build:portal-pm":  "npm --prefix apps/pm-portal run build",
"lint:portal-pm":   "npm --prefix apps/pm-portal run lint"
```
Esto es un parche manual, no una solución de monorepo real. No hay pipeline unificado, no hay caché de builds, no hay `--filter` por app afectada.

**Inconsistencia de puerto en PM Portal**: El script `dev` en `package.json` pasa `--port 5181`, pero `vite.config.ts` declara `port: 5177`. El script sobreescribe la config. Esto genera confusión al depurar (distintos valores en distintos lugares).

| App | Dev | Preview |
|---|---|---|
| SenciYo | 5173 | 5175 |
| PM Portal | 5181 (script) / 5177 (vite config) | 5182 (script) / 5178 (vite config) |

---

### D. Seguridad y Secretos

| Aspecto | Estado | Severidad |
|---|---|---|
| `.env` raíz: solo placeholders vacíos | ✅ Seguro | — |
| `apps/pm-portal/.env`: contiene URL y anon_key Supabase **reales** | ⚠️ Riesgo local | P1 |
| `.gitignore` excluye `.env` y `.env.*` correctamente | ✅ Correcto | — |
| `SUPABASE_SERVICE_ROLE_KEY` solo en Cloudflare Pages (secret de servidor) | ✅ Correcto | — |
| `POSTHOG_PERSONAL_API_KEY` solo en Cloudflare Pages (secret de servidor) | ✅ Correcto | — |
| Claves publishable (`VITE_PUBLIC_*`) en `.env.example` sin valores | ✅ Correcto | — |
| Sin CODEOWNERS: cualquier dev puede modificar archivos sensibles | Riesgo | P1 |
| Archivo `.env` (no `.env.local`) con credenciales reales en PM Portal | Riesgo menor | P1 |

**Sobre `apps/pm-portal/.env`**: El archivo usa la convención `.env` (sin sufijo `.local`). Está excluido por `.gitignore`, pero la convención recomendada por Vite para desarrollo local es `.env.local` (semánticamente más claro y con doble protección). Usar `.env` sin sufijo puede generar confusión en el equipo sobre qué archivos son seguros de commitear.

**Separación de secretos entre apps**: Las claves de SenciYo (PostHog client-side, Amplitude, Mixpanel) son completamente independientes de las de PM Portal (Supabase anon key, Supabase service role key, PostHog server-side API key). No hay contaminación cruzada de secretos. ✅

**Riesgo potencial**: Un `git add .` en la raíz podría incluir `apps/pm-portal/.env` si el patrón `.gitignore` fallara por alguna razón (ej: archivo en untracked state al inicio del repo). Se recomienda agregar explícitamente `/apps/pm-portal/.env` al `.gitignore` raíz.

---

### E. Observabilidad y Analítica

| Aspecto | Estado | Severidad |
|---|---|---|
| Triple tracking en SenciYo (PostHog + Amplitude + Mixpanel, mismo evento) | Riesgo costo/consistencia | P1 |
| Nombres de eventos **duplicados** sin contrato compartido | Acoplamiento semántico | **P0** |
| PM Portal accede a eventos de SenciYo vía PostHog API server-side | ✅ Bien aislado técnicamente | — |
| Analytics desactivadas en development y localhost en SenciYo | ✅ Correcto | — |
| Sin PII en propiedades de eventos | ✅ Correcto | — |
| `ignore_dnt: true` en Mixpanel | ⚠️ Puede violar preferencias DNT del usuario | P2 |

**Hallazgo crítico P0 — Duplicación de nombres de eventos**:

SenciYo emite (en `src/shared/analitica/eventosAnalitica.ts`):
```
registro_usuario_completado, venta_completada, primera_venta_completada,
producto_creado_exitoso, cliente_creado_exitoso, importacion_completada,
ruc_actualizado_exitoso
```

PM Portal consulta PostHog usando (en `apps/pm-portal/functions/api/eventos-posthog-kpi.ts`):
```
venta_completada, producto_creado_exitoso, cliente_creado_exitoso,
importacion_completada, registro_usuario_completado
```

Los strings son **iguales por convención, no por contrato compilado**. Si SenciYo renombra `venta_completada` → `comprobante_emitido`, el PM Portal seguirá buscando `venta_completada` en PostHog y devolverá 0 métricas — sin error de compilación, sin test que lo detecte, y sin alerta.

**Hallazgo — Código de autorización duplicado dentro del PM Portal**:
`metricas-posthog.ts` contiene su propia copia inline de `validarAutorizacion` (aprox. líneas 533–578 del archivo), a pesar de que el módulo `_autorizacion.ts` existe específicamente para ese propósito. El comentario en `_autorizacion.ts` lo reconoce: "Usado por: metricas-posthog (**tiene su propio inline**)". Esto es deuda técnica: si se parchea un bug de seguridad en `_autorizacion.ts`, `metricas-posthog.ts` queda vulnerable.

---

### F. Productividad y Operación del Equipo

| Aspecto | Estado |
|---|---|
| Onboarding requiere instalar deps en raíz Y en `apps/pm-portal/` por separado | ⚠️ No es obvio |
| README describe estructura de carpetas antigua (`.jsx`, no corresponde a la real) | ⚠️ Desactualizado |
| Un PR puede mezclar cambios de SenciYo y PM Portal sin granularidad | Riesgo de revisión |
| Sin labels de PR, templates de issue o templates de PR en el repo | Ausencia |
| Sin tests automatizados en ninguna app | Deuda técnica |

**README desactualizado**: El `README.md` raíz documenta una estructura antigua (archivos `.jsx`, `PublicLayout.jsx`, `Dashboard.jsx`, etc.) que no corresponde a la estructura real actual del proyecto (todo es `.tsx`, la arquitectura cambió).

---

### G. Escalabilidad a 6–12 meses

Con el crecimiento proyectado, los problemas actuales se amplifican:

- **Más módulos en SenciYo** → bundle aún más grande (ya supera el límite de Vite sin alarma)
- **Más eventos analíticos en SenciYo** → más strings duplicados en PM Portal sin contrato formal
- **Más devs** → sin CODEOWNERS ni boundaries, cualquiera puede modificar cualquier archivo sensible
- **Más releases independientes** → sin CI/CD, el despliegue sigue siendo manual sin trazabilidad
- **Más features en PM Portal** → sin workspace real, la gestión de deps compartidas es ad-hoc

---

## 3. Tabla de Acoplamiento (con evidencia)

| # | Item | Evidencia | Impacto | Severidad | Recomendación |
|---|---|---|---|---|---|
| AC-01 | Nombres de eventos PostHog duplicados sin contrato | `src/shared/analitica/eventosAnalitica.ts` vs `apps/pm-portal/functions/api/eventos-posthog-kpi.ts` — mismos strings, código independiente | Renombrar un evento en SenciYo rompe métricas del PM Portal en silencio | **P0** | Crear `packages/analytics-events` como fuente de verdad compartida |
| AC-02 | Scripts raíz gestionan PM Portal con `npm --prefix` | `package.json` raíz, líneas 13–15: `"dev:portal-pm": "npm --prefix apps/pm-portal run dev"` | Acoplamiento operativo; el dev debe conocer la ubicación de cada app para usar el script correcto | P1 | Migrar a npm workspaces con scripts unificados |
| AC-03 | SenciYo vive en la raíz del repo | `package.json` → `"name": "web"`, `src/`, `index.html`, `vite.config.ts` en raíz | Confunde la raíz del monorepo con la app SenciYo; bloquea añadir más apps con estructura limpia | P1 | Mover SenciYo a `apps/senciyo/` |
| AC-04 | Un único `.gitignore` raíz gestiona secretos de ambas apps | `.gitignore` raíz excluye `.env` y `.env.*` | Si el patrón falla, la exposición afecta a ambas apps | P1 | Agregar `.gitignore` local en `apps/pm-portal/` para sus secretos propios |
| AC-05 | Código de autorización duplicado en PM Portal | `apps/pm-portal/functions/api/metricas-posthog.ts` líneas ~500–578 (inline) + `apps/pm-portal/functions/api/_autorizacion.ts` (módulo) | Bug de seguridad parchado en uno no se replica al otro | P1 | Eliminar la copia inline en `metricas-posthog.ts` y usar `_autorizacion.ts` |
| AC-06 | Zod v3 (SenciYo) vs Zod v4 (PM Portal) | `package.json` raíz: `"zod": "^3.24.1"` vs `apps/pm-portal/package.json`: `"zod": "^4.3.6"` | Imposibilita compartir esquemas de validación entre apps sin refactoring mayor | P1 | Alinear a Zod v4 en SenciYo |
| AC-07 | `app/shared/src/` vestigial no conectado a ninguna app | `app/shared/src/components/ConfirmationModal.tsx`, `UnderlinedFiltersTable.tsx`, `types.ts` — sin imports en `src/` ni en `apps/pm-portal/src/` | Confusión en onboarding: parece un paquete compartido funcional cuando no lo es | P2 | Eliminar el directorio o formalizarlo como `packages/ui` |
| AC-08 | `docs_web/` con su propio `node_modules` sin integración | `docs_web/node_modules/` presente, sin scripts en `package.json` raíz ni en CI | Tercera instancia de `node_modules`; dependencias no gestionadas en el monorepo | P2 | Integrar en workspace o mover a repo separado |

---

## 4. Riesgos si se Mantiene el Monorepo (sin cambios)

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Métricas PM Portal en 0 de forma silenciosa al renombrar evento en SenciYo | **Alta** | **Alto** | Paquete compartido `packages/analytics-events` |
| Bundle de SenciYo continúa creciendo sin alerta (límite suprimido a 5 MB) | **Alta** | Medio | Reducir `chunkSizeWarningLimit`, analizar bundle, lazy loading |
| `.env` de PM Portal commiteado accidentalmente (credenciales reales) | Baja | **Muy Alto** | Renombrar a `.env.local` + hook pre-commit + entrada explícita en `.gitignore` |
| Dev modifica PM Portal y rompe build de SenciYo sin darse cuenta (raíz compartida, sin CI) | Media | Alto | CI independiente por app con paths filter |
| Drift de dependencias acumulado bloquea refactoring futuro (ej: compartir código con Zod distinto) | **Alta** | Medio | Renovate/Dependabot + política de versiones |
| Nuevo dev confunde `app/shared/` con código real y lo importa erróneamente | Media | Bajo | Eliminar el directorio |
| Bug de seguridad en lógica de autorización parchado solo en `_autorizacion.ts` pero no en la copia inline de `metricas-posthog.ts` | Baja | **Alto** | Unificar en un solo módulo |

---

## 5. Riesgos si se Separa en Dos Repositorios

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Contrato de eventos PostHog sigue sin ser explícito entre repos separados | **Alta** | **Alto** | Publicar paquete npm privado `@facturafacil/analytics-events` antes de separar |
| Duplicación de configuración (ESLint, TypeScript, Vite, Tailwind) en 2 repos | **Alta** | Medio | Paquete de config compartida `@facturafacil/config` o plantilla de repo |
| Sincronización de dependencias comunes se vuelve completamente manual | **Alta** | Medio | Dependabot en cada repo |
| Historial git interrumpido para archivos que migran entre repos | Media | Bajo | Migrar con `git filter-repo` preservando historial |
| Mayor overhead operativo (2 pipelines CI, 2 configuraciones Cloudflare, 2 procesos de release) | **Alta** | Medio | Automatización desde el inicio; no separar sin CI ya funcionando |
| Cambios coordinados (ej: nuevo evento analítico) requieren PRs en 2 repos | Media | Medio | Convención explícita de PRs relacionados; el paquete compartido reduce la frecuencia |
| PM Portal pierde visibilidad del repo de SenciYo si el endpoint `resumen-repo` apunta al repo unificado | Media | Bajo | El endpoint usa GitHub API; actualizar la config del endpoint |

---

## 6. Comparativa Final Monorepo vs Multirepo

| Criterio | Peso | Monorepo actual (sin cambios) | **Monorepo ajustado (Opción C)** | Multirepo (Opción B) |
|---|---|---|---|---|
| **Seguridad** — separación de secretos y accesos | 20% | 3 — secretos en un solo `.gitignore` | **4** — CODEOWNERS + `.gitignore` por app | 5 — repos independientes |
| **Independencia de despliegue** — cada app despliega sola | 15% | 2 — manual, sin pipeline | **4** — CI por app con paths filter | 5 — pipelines totalmente independientes |
| **Reuse** — compartir código y contratos | 20% | 1 — no hay paquetes reales | **5** — `packages/` con contrato de eventos | 3 — requiere paquete npm privado |
| **Costo operativo** — mantenimiento de infra | 15% | 2 — bajo ahora, alto a futuro | **3** — algo más setup, escalable | 2 — doble infraestructura desde el inicio |
| **Velocidad** — rapidez para hacer cambios | 15% | 3 — un solo repo pero sin herramientas | **4** — builds selectivos, herramientas | 3 — cambios coordinados = 2 PRs |
| **Onboarding** — claridad para nuevos devs | 15% | 2 — estructura confusa (raíz = app) | **4** — `apps/`, `packages/` claros | 3 — 2 repos, 2 setups |
| **Puntuación ponderada** | 100% | **2.25 / 5** | **4.05 / 5** | **3.60 / 5** |

**Conclusión**: El monorepo ajustado (Opción C) es la mejor estrategia. La separación total solo tiene sentido si los equipos son completamente independientes o si los requisitos de seguridad/compliance exigen acceso diferenciado a nivel de repositorio. Ninguna de esas condiciones se verifica actualmente.

---

## 7. Recomendación Final — Opción C con Plan Concreto

### Estructura objetivo del monorepo

```
/
├── apps/
│   ├── senciyo/              ← mover contenido de la raíz aquí (P2)
│   └── pm-portal/            ← ya está correctamente ubicado
├── packages/
│   └── analytics-events/     ← nuevo: contrato de eventos PostHog (P1)
├── package.json              ← raíz: solo workspaces + scripts orquestadores
├── .gitignore                ← raíz: patrones globales
└── .github/
    ├── CODEOWNERS
    └── workflows/
        ├── senciyo.yml       ← pipeline SenciYo con paths filter
        └── pm-portal.yml     ← pipeline PM Portal con paths filter
```

### Reglas no negociables si se sigue con monorepo

1. **npm Workspaces activos** en el `package.json` raíz: `"workspaces": ["apps/*", "packages/*"]`
2. **CI por app** con `paths` filter: cambios en `apps/senciyo/**` disparan solo el pipeline de SenciYo
3. **CODEOWNERS** con granularidad por app: devs de PM Portal no pueden aprobar merges en `apps/senciyo/` sin revisión del equipo producto
4. **Paquete `packages/analytics-events`** como única fuente de verdad para nombres de eventos PostHog
5. **Zod alineado**: SenciYo debe migrar a v4 (o documentar explícitamente la razón para mantener v3 con fecha de expiración)
6. **Configuración de entorno operativa en Cloudflare Pages dashboard** (sin secretos en repo)

---

## 8. Plan de Acción Mínimo

### P0 — Hacer ya (bloquean seguridad o calidad real)

| Tarea | Archivo(s) afectado(s) | Por qué es P0 |
|---|---|---|
| Agregar CI/CD mínimo (GitHub Actions) con lint + build por app | Crear `.github/workflows/senciyo.yml` y `.github/workflows/pm-portal.yml` | Sin CI, cualquier push puede romper producción sin detección |
| Eliminar duplicación de lógica de autorización en `metricas-posthog.ts` | `apps/pm-portal/functions/api/metricas-posthog.ts` líneas ~500–578 | Bug de seguridad no se propaga si hay 2 copias del código |
| Renombrar `apps/pm-portal/.env` a `.env.local` | `apps/pm-portal/.env` | Reducir riesgo de commit accidental de credenciales reales |

### P1 — Próximas semanas

| Tarea | Archivo(s) afectado(s) | Beneficio |
|---|---|---|
| Crear `packages/analytics-events` con los strings de eventos | Nuevo `packages/analytics-events/index.ts`; actualizar `src/shared/analitica/eventosAnalitica.ts` y `apps/pm-portal/functions/api/eventos-posthog-kpi.ts` | Rompe el acoplamiento semántico; cambio de evento = error de compilación |
| Configurar npm workspaces en `package.json` raíz | `package.json` raíz | Base para gestión unificada de dependencias |
| Crear CODEOWNERS | `.github/CODEOWNERS` | Ownership explícito por app |
| Alinear Zod a v4 en SenciYo | `package.json` raíz + todos los archivos que usan Zod en `src/` | Habilita compartir esquemas en el futuro |
| Consolidar documentación de despliegue dashboard-driven para PM Portal | `README.md` y `apps/pm-portal/docs/*` | Evita ambigüedad y configuración híbrida |
| Agregar entrada explícita `/apps/pm-portal/.env` en `.gitignore` raíz | `.gitignore` | Doble protección para credenciales reales |
| Actualizar README con estructura real y comandos vigentes | `README.md` | Onboarding correcto para nuevos devs |

### P2 — Mejoras de calidad y experiencia

| Tarea | Detalle |
|---|---|
| Investigar y reducir bundle de SenciYo | Eliminar `chunkSizeWarningLimit: 5000`; analizar bundle con `vite-bundle-visualizer`; aplicar lazy loading a Amplitude/Mixpanel/ExcelJS |
| Mover SenciYo a `apps/senciyo/` | Requiere actualizar paths, aliases TypeScript, configuración Cloudflare Pages y CI |
| Eliminar `app/shared/src/` | Los 3 archivos no se usan; si se quiere compartir UI, crear `packages/ui` |
| Eliminar artefactos de raíz | `unmerged.txt`, `unmerged_list.txt`, `unmerged_remaining.txt` |
| Mover `"node": "^25.5.0"` de `devDependencies` a `"engines"` | `package.json` raíz |
| Resolver inconsistencia de puerto en PM Portal | Unificar `vite.config.ts` (5177) y script `dev` (5181) a un solo valor |
| Revisar `ignore_dnt: true` en Mixpanel | `src/shared/analitica/analitica.ts` línea ~95; puede violar preferencias de privacidad del usuario |
| Integrar o separar `docs_web/` | Si es parte del producto, agregar a workspace y CI; si no, moverlo a repo separado |
| Agregar hook `pre-commit` con git-secrets o similar | Prevenir commits accidentales de archivos con credenciales reales |

---

## 9. Apéndice

### 9.1 Checklist de Verificación

#### Arquitectura
- [x] Estructura de carpetas documentada y verificada
- [ ] SenciYo en su propia subcarpeta (`apps/senciyo/`)
- [ ] npm workspaces configurados en `package.json` raíz
- [ ] `app/shared/src/` eliminado o formalizado como `packages/ui`
- [ ] CODEOWNERS en `.github/CODEOWNERS`
- [ ] ESLint con reglas de boundaries para prevenir imports cruzados accidentales

#### Dependencias
- [x] React, Vite, TypeScript alineados entre apps
- [ ] Zod alineado (v3 en SenciYo → migrar a v4)
- [ ] `@hookform/resolvers` alineado (v3.9 vs v5.2)
- [ ] `"node"` eliminado de `devDependencies`; agregar `"engines"` en `package.json` raíz
- [ ] Renovate o Dependabot configurado para detectar drift automáticamente

#### Build y CI/CD
- [ ] GitHub Actions pipeline para SenciYo (con `paths` filter)
- [ ] GitHub Actions pipeline para PM Portal (con `paths` filter)
- [x] Estrategia dashboard-driven para variables y despliegue de PM Portal
- [ ] Bundle de SenciYo analizado; `chunkSizeWarningLimit` reducido a ≤ 1000
- [x] Build de PM Portal genera `estado.json` antes del build (correcto)

#### Seguridad
- [x] `.gitignore` excluye todos los archivos `.env` con credenciales reales
- [x] Claves de servidor solo en Cloudflare Pages (secretos)
- [ ] `apps/pm-portal/.env` renombrado a `.env.local`
- [ ] Entrada explícita `/apps/pm-portal/.env` en `.gitignore` raíz
- [ ] Hook `pre-commit` para prevenir commits accidentales de secretos
- [ ] CODEOWNERS para controlar acceso a `apps/pm-portal/functions/` (lógica de servidor)

#### Observabilidad
- [ ] Paquete `packages/analytics-events` creado como fuente de verdad
- [ ] `EVENTOS_ANALITICA` y `EVENTOS_POSTHOG_KPI` unificados en dicho paquete
- [ ] Copia inline de autorización en `metricas-posthog.ts` reemplazada por import de `_autorizacion.ts`
- [ ] `ignore_dnt: true` en Mixpanel revisado con equipo de privacidad
- [x] Analytics desactivadas en development y localhost (correcto)
- [x] Sin PII en propiedades de eventos (correcto)

#### Productividad
- [ ] README actualizado con estructura real y comandos vigentes
- [ ] Artefactos raíz eliminados: `unmerged.txt`, `unmerged_list.txt`, `unmerged_remaining.txt`
- [ ] Puerto de PM Portal unificado entre `vite.config.ts` y scripts `package.json`

---

### 9.2 Archivos y Carpetas Clave Revisados

| Archivo / Carpeta | App | Hallazgo principal |
|---|---|---|
| `package.json` (raíz) | SenciYo | Nombre `"web"`, no workspace real; `"node"` en devDeps |
| `apps/pm-portal/package.json` | PM Portal | Zod v4, `@hookform/resolvers` v5 — drift con SenciYo |
| `vite.config.ts` (raíz) | SenciYo | `chunkSizeWarningLimit: 5000` — bundle grande silenciado |
| `apps/pm-portal/vite.config.ts` | PM Portal | Puerto 5177 inconsistente con script `dev` (5181) |
| `.gitignore` (raíz) | Ambas | Correcto; falta entrada explícita `/apps/pm-portal/.env` |
| `.env.example` (raíz) | SenciYo | Solo claves analytics, vacías — correcto |
| `apps/pm-portal/.env.example` | PM Portal | Bien documentado con separación browser/server |
| `apps/pm-portal/.env` | PM Portal | Contiene URL y anon_key reales; debe renombrarse a `.env.local` |
| `src/main.tsx` | SenciYo | Triple init analytics (PostHog + Amplitude + Mixpanel) |
| `src/shared/analitica/analitica.ts` | SenciYo | Bien estructurado; `ignore_dnt: true` en Mixpanel para revisar |
| `src/shared/analitica/eventosAnalitica.ts` | SenciYo | Fuente de verdad de eventos — sin contrato con PM Portal |
| `apps/pm-portal/functions/api/eventos-posthog-kpi.ts` | PM Portal | Duplicación de strings de eventos — acoplamiento semántico P0 |
| `apps/pm-portal/functions/api/metricas-posthog.ts` | PM Portal | Lógica de autorización duplicada inline (~50 líneas) |
| `apps/pm-portal/functions/api/_autorizacion.ts` | PM Portal | Módulo correcto, pero NO usado por `metricas-posthog.ts` |
| `apps/pm-portal/src/infraestructura/supabase/clienteSupabase.ts` | PM Portal | Bien gestionado con fallbacks y detección de config faltante |
| `apps/pm-portal/src/dominio/modelos.ts` | PM Portal | Dominio bien definido y aislado (DDD ligero) |
| `apps/pm-portal/scripts/generarEstadoDespliegue.mjs` | PM Portal | Correcto; usa `CF_PAGES_COMMIT_SHA` y `CF_PAGES_BRANCH` |
| `apps/pm-portal/src/infraestructura/estado/lectorEstado.ts` | PM Portal | Correcto; valida con Zod v4 y manejo de errores |
| `apps/pm-portal/src/aplicacion/autenticacion/ProveedorSesionPortalPM.tsx` | PM Portal | Gestión de sesión Supabase bien implementada |
| `app/shared/src/` | Ninguna | Vestigial — 3 archivos no importados por ninguna app |
| `eslint.config.js` (raíz) | SenciYo | Estándar; sin reglas de boundaries ni restricciones de imports |
| `apps/pm-portal/eslint.config.js` | PM Portal | Idéntico al de SenciYo — sin reglas adicionales |
| `tsconfig.app.json` (raíz) | SenciYo | Strict mode completo — bien configurado |
| `apps/pm-portal/tsconfig.app.json` | PM Portal | Idéntico en opciones de strict — alineado |
| `docs/` (raíz) | SenciYo | SQLs de Supabase, roadmaps, auditoría anterior |
| `docs_web/` (raíz) | — | Sitio docs separado con su propio `node_modules` sin integración |
| `checklist.md` (raíz) | — | Checklist de funcionalidades de SenciYo, no conectado a CI |
| `unmerged*.txt` (raíz) | — | Artefactos de desarrollo pendientes de eliminar |
| `README.md` (raíz) | Ambas | Estructura documentada es la antigua; debe actualizarse |

---

*Auditoría completa. Versión 2.0 — Reemplaza el borrador anterior (2026-03-06).*
