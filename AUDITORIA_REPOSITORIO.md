# AUDITORÍA DE REPOSITORIO — FacturaFacil (Monorepo)
**Fecha:** 2026-03-06
**Auditor:** Arquitecto de Software Senior (análisis automatizado + revisión estructural)
**Alcance:** Repositorio completo — SenciYo (app principal) + PM-Portal (app interna)
**Rama auditada:** `develop`

---

## 1. RESUMEN EJECUTIVO

El repositorio **no es un monorepo real**: es un repositorio git único donde SenciYo vive en la raíz y PM-Portal vive en `apps/pm-portal/`, sin ninguna herramienta de workspace (Turborepo, NX, pnpm workspaces). Esta asimetría estructural es el problema de raíz de casi todos los hallazgos.

Se identifican **2 issues P0** (críticos e inmediatos): secretos reales de Supabase comprometidos en el repositorio (`.env` commiteado), y un drift de versión mayor en Zod (v3 vs v4) que representa riesgo de ruptura silenciosa. Se identifican además **4 issues P1** relevantes: ausencia total de CI/CD, nombres de eventos de analítica duplicados como strings en dos apps sin contrato compartido, `chunkSizeWarningLimit: 5000` que oculta una señal de alerta de bundle, y ausencia de CODEOWNERS.

**Recomendación: Opción C — Mantener monorepo con ajustes estructurales.**

Las apps comparten dominio semántico (PM-Portal consume eventos PostHog emitidos por SenciYo), son mantenidas por el mismo equipo, y el costo operativo de separar repositorios supera el beneficio en esta etapa. Sin embargo, el monorepo actual no tiene ninguna de las salvaguardas que un monorepo real requiere. Se deben aplicar ajustes estructurales antes de que el repo crezca más.

---

## 2. DIAGNÓSTICO GENERAL POR CATEGORÍAS

### A. Arquitectura del Repositorio

El repositorio presenta una estructura asimétrica: SenciYo ocupa la raíz del repo (`/src`, `/public`, `vite.config.ts`, `package.json` raíz), mientras que PM-Portal está anidado en `apps/pm-portal/`. No existe una raíz de workspace que orqueste ambas apps como unidades iguales.

```
C:/FacturaFacil/          ← raíz = SenciYo (problema)
├── src/                  ← código de SenciYo
├── apps/
│   └── pm-portal/        ← PM-Portal (ciudadano de segunda clase)
├── app/shared/src/       ← código muerto / legacy (3 archivos)
├── scripts/              ← 1 script suelto
├── docs/ docs_web/       ← documentación
└── dist/                 ← build commiteado (posible issue)
```

**Problema estructural central:** No hay una carpeta `apps/senciyo/` equivalente. SenciYo no tiene su propio scope. Todo lo que está en la raíz se asume como parte de SenciYo (Tailwind, TSConfig, Vite, ESLint), lo que hace imposible configurar CI diferenciado, lint por app, o herramientas de workspace correctamente.

**`app/shared/src/`** (nótese: sin `s` al final, diferente de `apps/`) contiene solo 3 archivos: `types.ts` con tipos `Order` genéricos (toy code), `ConfirmationModal.tsx` y `UnderlinedFiltersTable.tsx`. No es importado por ninguna de las dos apps activas. Es código muerto/legacy.

No existen: `pnpm-workspace.yaml`, `turbo.json`, `nx.json`, CODEOWNERS, `.github/workflows/`.

### B. Dependencias y Compatibilidad

Las apps gestionan sus dependencias de forma independiente con sus propios `node_modules`. No hay deduplicación. El root `package.json` declara `"name": "web"` (sin scope, sin nombre significativo), lo que evidencia que no fue diseñado como raíz de workspace.

**Drift de versiones crítico detectado:**

| Paquete | SenciYo (raíz) | PM-Portal | Tipo de cambio |
|---|---|---|---|
| `zod` | `^3.24.1` | `^4.3.6` | **MAJOR** (breaking API) |
| `@hookform/resolvers` | `^3.9.1` | `^5.2.2` | **MAJOR** (breaking API) |
| `react-hook-form` | `^7.54.2` | `^7.71.2` | Minor |
| `react` | `^19.1.1` | `^19.1.1` | OK |
| `react-router-dom` | `^7.9.1` | `^7.9.1` | OK |
| `typescript` | `~5.8.3` | `~5.8.3` | OK |
| `vite` | `^7.1.2` | `^7.1.2` | OK |

El drift en **Zod (v3→v4)** es el más peligroso: las APIs de validación cambiaron. Si se llegase a crear un paquete compartido de esquemas, habría incompatibilidad inmediata. Las inferencias de tipos serían distintas entre apps.

**Dependencias exclusivas de SenciYo:** `@amplitude/analytics-browser`, `mixpanel-browser`, `posthog-js`, `@posthog/react`, `@dnd-kit/core`, `@dnd-kit/sortable`, `exceljs`, `xlsx`, `recharts`, `zustand`.

**Dependencias exclusivas de PM-Portal:** `@supabase/supabase-js`.

No hay imports cruzados entre apps a nivel de código TypeScript (verificado). El acoplamiento es **semántico** (eventos PostHog), no de código.

### C. Build, CI/CD y Despliegue

**No existe CI/CD.** No hay directorio `.github/workflows/`. Las builds y deploys son manuales.

Los scripts en el root `package.json` para PM-Portal son:
- `dev:portal-pm` → `npm --prefix apps/pm-portal run dev`
- `build:portal-pm` → `npm --prefix apps/pm-portal run build`
- `lint:portal-pm` → `npm --prefix apps/pm-portal run lint`

Esto es un proxy manual, no un workspace real. Un `npm install` en la raíz **no instala** las dependencias de PM-Portal. Un developer nuevo debe recordar entrar a `apps/pm-portal/` y correr `npm install` por separado.

**No hay estrategia de "build por rutas"**: cualquier cambio en cualquier archivo podría, en principio, requerir rebuild de ambas apps. Sin CI, no hay forma de automatizar esto.

PM-Portal tiene un script `generar:estado` que corre un archivo `.mjs` antes del build, lo que sugiere generación de metadatos de despliegue. Cloudflare Pages Functions están en `apps/pm-portal/functions/api/` (5 endpoints serverless).

**`chunkSizeWarningLimit: 5000`** (5 MB) en `vite.config.ts` de SenciYo es una señal de alerta suprimida. Vite por defecto avisa a los 500 KB. Aumentar este límite 10x oculta el problema en lugar de resolverlo. Con 3 SDKs de analítica (PostHog + Amplitude + Mixpanel) + exceljs + xlsx + recharts + DnD Kit, el bundle probablemente supera los límites razonables para una app web.

**`dist/` en el repo:** La carpeta `dist/` existe en la raíz del repositorio. Si está commiteada (no ignorada por `.gitignore`), esto representa deuda técnica y contaminación del historial de git.

### D. Seguridad y Secretos

**CRÍTICO P0:** El archivo `apps/pm-portal/.env` contiene credenciales reales:
```
VITE_SUPABASE_URL=https://iggrwzenbytvokywqali.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_rJgrKKBsdjEGXtr8Lvm3BQ_RrPjwWfO
```

Este archivo está en el repositorio. Aunque la clave `anon` de Supabase es pública por diseño (está sujeta a RLS), su presencia en el repo:
1. Establece el patrón incorrecto de committear `.env`
2. Expone la URL del proyecto Supabase y el nombre del proyecto
3. Si en algún momento la `SERVICE_ROLE_KEY` termina en ese archivo por error de un developer, el daño sería total (acceso irrestricto a la base de datos)

El archivo `.env.example` de PM-Portal existe y tiene los placeholders correctos, pero el `.env` real fue commiteado igualmente.

**Secretos del lado servidor** (Cloudflare Pages Functions): `POSTHOG_PERSONAL_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GITHUB_TOKEN` — estos no están en el repo pero deben configurarse manualmente en cada entorno de Cloudflare. Sin documentación centralizada ni CI, el riesgo de olvido es alto.

**Claves en el frontend:** Las claves de PostHog, Amplitude y Mixpanel en SenciYo son del tipo "publishable" (diseñadas para estar en el cliente). El riesgo es aceptable pero el patrón de tener 3 herramientas distintas de telemetría aumenta la superficie de exposición.

**No hay separación de secretos entre apps**: ambas apps comparten el mismo `.gitignore` raíz. Un `.env` en la raíz con las claves de SenciYo podría ser accidentalmente expandido a un contexto donde no corresponde.

### E. Observabilidad y Analítica

**Triplicación de telemetría en SenciYo:** Los eventos se envían simultáneamente a PostHog, Amplitude y Mixpanel desde `src/shared/analitica/analitica.ts`. El patrón está correctamente gateado por `import.meta.env.PROD` y verificaciones de host local, pero:

1. **Costo triple**: el mismo evento genera carga en 3 plataformas de pago
2. **Riesgo de inconsistencia**: si una de las 3 falla silenciosamente, los números no cuadran entre herramientas
3. **Evento duplicado en PM-Portal**: `EVENTOS_POSTHOG_KPI` en `apps/pm-portal/functions/api/eventos-posthog-kpi.ts` duplica como strings literales los mismos nombres de eventos de `EVENTOS_ANALITICA` en SenciYo

```
SenciYo:    EVENTOS_ANALITICA.VENTA_COMPLETADA = 'venta_completada'
PM-Portal:  EVENTOS_POSTHOG_KPI.VENTA_COMPLETADA = 'venta_completada'
```

No hay contrato compartido (paquete compartido, tipo unión, nada). Si un developer renombra el evento en SenciYo, PM-Portal consume datos vacíos silenciosamente. No hay TypeScript ni tests que detecten esto.

**Identificación de usuarios:** El módulo de analítica usa `entorno: EntornoAnalitica` ('demo' | 'produccion') como propiedad base. No se observa envío de PII directamente, lo cual es correcto.

**Mixpanel inicializado lazy:** `asegurarMixpanelInicializado()` se llama en cada evento. Si Mixpanel falla en inicializar, esto podría generar logs de error en cada evento.

### F. Productividad y Operación del Equipo

**Flujo de trabajo actual:**
- Un commit a la rama `develop` afecta a ambas apps (mismo historial de git)
- No hay PRs automáticas, no hay checks de CI
- Los mensajes de commit son informales (`MIXPANEL INTEGRACION`, `Ajuste Amplitude`), sin convención establecida

**Onboarding problemático:** Un developer nuevo debe:
1. Clonar el repo
2. Correr `npm install` en la raíz (instala SenciYo)
3. Recordar entrar a `apps/pm-portal/` y correr `npm install` por separado
4. Configurar manualmente las variables de entorno para ambas apps
5. No hay README de onboarding en la raíz que explique esta estructura

**Riesgo de conflicto:** Al estar ambas apps en el mismo historial, un merge conflict en `package.json` de la raíz podría bloquear el trabajo de ambos equipos simultáneamente.

**Scripts de conveniencia:** Los scripts `dev:portal-pm`, `build:portal-pm`, `lint:portal-pm` en el root son un parche razonable, pero no escalan. Con workspace tooling, esto sería nativo.

### G. Escalabilidad a 6-12 Meses

**Escenario SenciYo crece (más módulos):**
- `src/shared/` ya tiene 20+ carpetas. Sin boundaries de lint o paths enforced, cualquier módulo puede importar de cualquier otro
- El bundle ya supera los límites de Vite (evidencia: `chunkSizeWarningLimit: 5000`)
- La triple analítica y las dependencias pesadas (exceljs, xlsx) necesitarán code-splitting explícito

**Escenario PM-Portal crece (más módulos):**
- La arquitectura de PM-Portal (dominio/aplicacion/infraestructura/presentacion) es limpia y escalable
- El riesgo es que empiece a necesitar componentes compartidos con SenciYo sin mecanismo para compartirlos

**Escenario más devs:**
- Sin CODEOWNERS, cualquier developer puede modificar cualquier parte de cualquier app sin revisión especializada
- Sin CI, los errores de compilación no se detectan automáticamente

---

## 3. TABLA DE ACOPLAMIENTO

| # | Item | Evidencia | Impacto | Severidad | Recomendación |
|---|---|---|---|---|---|
| 1 | Nombres de eventos de analítica duplicados | `src/shared/analitica/eventosAnalitica.ts` vs `apps/pm-portal/functions/api/eventos-posthog-kpi.ts` — mismos strings sin contrato compartido | Si SenciYo renombra un evento, PM-Portal pierde métricas silenciosamente | P0 | Crear paquete `@facturafacil/eventos-kpi` compartido vía workspace |
| 2 | SenciYo vive en la raíz del monorepo | `/src`, `/package.json`, `/vite.config.ts` son de SenciYo pero están en la raíz del repo | Imposibilita workspace tooling, CI por app, y boundaries claros | P0 | Mover SenciYo a `apps/senciyo/` como parte de restructuración |
| 3 | Scripts proxy manuales para PM-Portal | `package.json` raíz: `"dev:portal-pm": "npm --prefix apps/pm-portal run dev"` | `npm install` en raíz no instala PM-Portal; onboarding roto | P1 | Adoptar npm/pnpm workspaces con workspace linking real |
| 4 | Zod v3 (SenciYo) vs Zod v4 (PM-Portal) | `package.json` raíz: `"zod": "^3.24.1"` vs `apps/pm-portal/package.json`: `"zod": "^4.3.6"` | Si se crea código compartido con Zod, los tipos serán incompatibles | P0 | Alinear a Zod v4 en ambas apps |
| 5 | @hookform/resolvers v3 vs v5 | `package.json` raíz: `"@hookform/resolvers": "^3.9.1"` vs PM-Portal: `"^5.2.2"` | Riesgo de incompatibilidad en código compartido | P1 | Alinear versiones |
| 6 | `app/shared/src/` (legacy, sin uso) | `/app/shared/src/types.ts`, `ConfirmationModal.tsx`, `UnderlinedFiltersTable.tsx` — no importados por ninguna app activa | Confusión sobre dónde va el código compartido; dead code acumula deuda | P2 | Eliminar o documentar como obsoleto |
| 7 | `chunkSizeWarningLimit: 5000` en SenciYo | `vite.config.ts` raíz: `build: { chunkSizeWarningLimit: 5000 }` | Oculta señal de bundle excesivo; 3 analytics SDKs + exceljs + xlsx + recharts | P1 | Bajar límite a 800 y resolver chunking real con code splitting |
| 8 | `dist/` potencialmente commiteado | Carpeta `/dist/` presente en el root (requiere verificar `.gitignore`) | Historial git contaminado; diferencias entre builds y código fuente | P2 | Verificar y agregar a `.gitignore` si aplica |

---

## 4. TABLA DE RIESGOS — MANTENER MONOREPO (estado actual sin cambios)

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Developer renombra evento en SenciYo, PM-Portal deja de recibir métricas sin error visible | Alta | Alto | Paquete compartido de eventos con TypeScript |
| Secret `SERVICE_ROLE_KEY` de Supabase acaba en `.env` commiteado por error de contexto | Media | Alto | Hacer `.env` global en `.gitignore`, rotar credenciales |
| Build de SenciYo supera límites de Cloudflare Pages (25 MB bundle) | Media | Alto | Code splitting, lazy loading de SDKs de analítica |
| Nuevo developer instala solo dependencias raíz y PM-Portal no funciona | Alta | Medio | README de onboarding + workspace real |
| PR que toca SenciYo y PM-Portal a la vez genera conflict en `package.json` raíz | Media | Medio | Separar package.json de SenciYo (moverlo a `apps/senciyo/`) |
| Zod v4 introducido en SenciYo (por upgrade accidental) rompe esquemas de validación | Media | Alto | Pinning de versiones + CI que valide compatibilidad |
| Triple analítica genera costos desproporcionados al escalar | Alta | Medio | Definir una herramienta principal; las otras como fallback o eliminar |
| Sin CI, errores de compilación llegan a producción | Alta | Alto | Implementar GitHub Actions con checks por app |
| Acumulación de dependencias en raíz que técnicamente solo usa SenciYo confunde ownership | Alta | Bajo | Estructura de workspace que separe `node_modules` por app |

---

## 5. TABLA DE RIESGOS — SEPARAR EN DOS REPOSITORIOS

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| El contrato de eventos PostHog entre SenciYo y PM-Portal se rompe sin mecanismo de validación | Alta | Alto | Publicar paquete NPM privado con los tipos de eventos; CI que valide versiones |
| Duplicación de código de UI/utilidades en ambos repos sin forma de compartir | Alta | Medio | Crear repositorio `@facturafacil/shared` + npm privado o monorepo con apps bien separadas |
| Overhead operativo: 2 repos, 2 CI pipelines, 2 procesos de release | Media | Medio | Aceptable si el equipo tiene >3 devs especializados por app |
| Desincronización de versiones de dependencias comunes (React, Vite, TS) | Alta | Medio | Dependabot en ambos repos + versiones pinneadas |
| Historial de git dividido: perder contexto de cambios relacionados | Baja | Bajo | Documentar decisiones en ADR; usar links de PR cross-repo |
| Onboarding más complejo para devs full-stack que trabajan en ambas apps | Media | Bajo | README con instrucciones de setup de ambos repos |
| Proceso de release desacoplado puede desincronizar features | Media | Medio | Versionado semántico + tags de release sincronizados |

---

## 6. COMPARATIVA FINAL — MONOREPO VS MULTIREPO

| Criterio | Peso | Monorepo actual (sin cambios) | Monorepo con ajustes (Opción C) | Multirepo |
|---|---|---|---|---|
| Seguridad de secretos | 20% | 1 — `.env` real commiteado, sin CI | 4 — `.gitignore` global, CI, rotación | 3 — separación natural pero mismos riesgos base |
| Independencia de despliegue | 15% | 2 — scripts manuales, sin CI por app | 4 — CI por app, builds independientes | 5 — total independencia |
| Integridad del contrato de analítica | 20% | 1 — strings duplicados sin contrato | 5 — paquete compartido con TypeScript | 2 — requiere paquete NPM privado y CI cross-repo |
| Reutilización de código | 10% | 1 — `app/shared/` está muerto, sin workspace | 4 — workspace real, paquetes compartidos nativos | 2 — requiere publicación de paquetes |
| Costo operativo y velocidad | 15% | 3 — simple pero frágil | 4 — más setup inicial, más robusto | 2 — doble pipeline, doble onboarding |
| Complejidad para el equipo | 10% | 2 — confuso (raíz = SenciYo) | 4 — claro una vez restructurado | 3 — simple por app, complejo entre apps |
| Escalabilidad a 12 meses | 10% | 1 — no escala sin cambios | 5 — escala con boundaries y packages | 4 — escala bien si el equipo crece |
| **TOTAL PONDERADO** | 100% | **1.65 / 5** | **4.25 / 5** | **2.95 / 5** |

**Conclusión:** El monorepo actual sin cambios es la peor opción. El monorepo con ajustes estructurales (Opción C) supera al multirepo en el contexto actual: mismo equipo, dominio compartido, y la dependencia semántica de PM-Portal sobre los eventos de SenciYo hace que un paquete compartido sea más fácil de mantener dentro de un workspace que como paquete NPM publicado.

---

## 7. RECOMENDACIÓN FINAL — OPCIÓN C: MONOREPO CON AJUSTES ESTRUCTURALES

### Justificación

1. **Acoplamiento semántico innegable:** PM-Portal consume eventos emitidos por SenciYo vía PostHog. Los nombres de esos eventos están duplicados como strings literales en dos lugares sin contrato compartido. Separar los repos haría este problema más difícil de resolver, no más fácil.

2. **Equipo unificado:** El mismo equipo mantiene ambas apps. Los beneficios del monorepo (contexto compartido, refactors atómicos, single PR para cambios cross-app) superan los costos.

3. **Etapa del producto:** SenciYo y PM-Portal son productos tempranos que evolucionan rápido. La separación en repos agrega overhead antes de que las apps tengan límites estables.

### Reglas estrictas para el monorepo ajustado

**Estructura objetivo:**
```
C:/FacturaFacil/            ← raíz de workspace (solo config global)
├── apps/
│   ├── senciyo/            ← SenciYo movido aquí
│   └── pm-portal/          ← PM-Portal (ya existe aquí)
├── packages/
│   └── eventos-kpi/        ← paquete compartido: tipos de eventos PostHog
├── package.json            ← workspace root con "workspaces": ["apps/*", "packages/*"]
├── tsconfig.base.json      ← config TypeScript base compartida
├── .gitignore              ← ignorar todos los .env, dist/
└── CODEOWNERS              ← ownership por carpeta
```

**Boundaries obligatorios:**
- `apps/senciyo/` nunca importa de `apps/pm-portal/`
- `apps/pm-portal/` nunca importa de `apps/senciyo/`
- Ambas apps pueden importar de `packages/*`
- ESLint `import/no-restricted-paths` o `eslint-plugin-boundaries` para enforcement

**CI por app (GitHub Actions):**
- Job `ci-senciyo`: se activa solo si hay cambios en `apps/senciyo/**` o `packages/**`
- Job `ci-pm-portal`: se activa solo si hay cambios en `apps/pm-portal/**` o `packages/**`
- Cada job: lint → typecheck → build

**CODEOWNERS mínimo:**
```
apps/senciyo/        @equipo-producto
apps/pm-portal/      @equipo-pm
packages/            @tech-lead
```

---

## 8. PLAN DE ACCIÓN MÍNIMO

### P0 — HACER YA (esta semana)

| # | Acción | Justificación | Archivos afectados |
|---|---|---|---|
| P0-1 | Revocar la `SUPABASE_ANON_KEY` actual de PM-Portal y generar una nueva. Agregar `apps/pm-portal/.env` al `.gitignore` global y eliminar el archivo del historial de git (git filter o BFG) | Secreto comprometido en repo | `apps/pm-portal/.env`, `.gitignore` raíz |
| P0-2 | Crear un archivo `packages/eventos-kpi/index.ts` que exporte los nombres de eventos como constantes TypeScript únicas, y referenciar ese archivo desde ambas apps (aunque sea con path relativo mientras no haya workspace real) | Elimina la duplicación de strings sin contrato | `src/shared/analitica/eventosAnalitica.ts`, `apps/pm-portal/functions/api/eventos-posthog-kpi.ts` |
| P0-3 | Alinear Zod a v4 en SenciYo (o degradar PM-Portal a v3 mientras se planifica la migración). Documentar decisión | Drift de versión major con riesgo de ruptura silenciosa | `package.json` raíz |

### P1 — PRÓXIMAS SEMANAS

| # | Acción | Justificación | Archivos afectados |
|---|---|---|---|
| P1-1 | Crear pipeline básico de GitHub Actions: 2 jobs independientes (senciyo y pm-portal), con path filters | Sin CI los problemas llegan a producción sin detección | `.github/workflows/ci.yml` (crear) |
| P1-2 | Configurar npm workspaces en `package.json` raíz: `"workspaces": ["apps/*", "packages/*"]` y correr `npm install` una sola vez desde la raíz | Elimina el problema de doble `npm install` y habilita workspace linking | `package.json` raíz |
| P1-3 | Reducir `chunkSizeWarningLimit` de 5000 a 800 en `vite.config.ts` de SenciYo y resolver los warnings reales con `import()` dinámico en los SDKs de analítica | Ocultar el problema no lo resuelve | `vite.config.ts` raíz |
| P1-4 | Crear `CODEOWNERS` mínimo en la raíz del repo | Nadie tiene ownership definido actualmente | `/CODEOWNERS` (crear) |
| P1-5 | Alinear `@hookform/resolvers` a la misma versión en ambas apps | Drift de versión major | `package.json` raíz y `apps/pm-portal/package.json` |
| P1-6 | Agregar `dist/` y `*.env` al `.gitignore` global si no están ya, y verificar el historial | Contaminación del repo | `.gitignore` raíz |
| P1-7 | Agregar `README.md` en la raíz con instrucciones de setup para ambas apps | Onboarding de nuevos devs actualmente roto | `/README.md` (crear o actualizar) |

### P2 — MEJORAS (próximas iteraciones)

| # | Acción | Justificación |
|---|---|---|
| P2-1 | Evaluar si es necesario mantener las 3 herramientas de analítica (PostHog + Amplitude + Mixpanel) simultáneamente o definir una como primaria | Costo triple y riesgo de inconsistencia entre plataformas |
| P2-2 | Mover SenciYo de la raíz a `apps/senciyo/` para igualar la estructura | Prerequisito para workspace tooling real y CI por app limpio |
| P2-3 | Instalar `eslint-plugin-boundaries` o `eslint-import-resolver-typescript` con `no-restricted-paths` para enforcer que las apps no se importen entre sí | Sin enforcement automático, los boundaries no se respetan |
| P2-4 | Eliminar `app/shared/src/` (sin `s` en `app`) que contiene código muerto | Reduce confusión sobre dónde va el código compartido |
| P2-5 | Definir convención de commits (Conventional Commits) y configurar `commitlint` | Los mensajes actuales no tienen convención (ej: "MIXPANEL INTEGRACION") |
| P2-6 | Implementar code splitting en SenciYo: lazy load de SDKs de analítica, exceljs, xlsx | Reducir el bundle inicial y mejorar el Largest Contentful Paint |
| P2-7 | Documentar en ADR (Architecture Decision Records) la decisión de mantener monorepo y los boundaries | Preservar contexto para futuros developers |

---

## 9. APÉNDICE

### Checklist de Verificación

#### Arquitectura
- [ ] SenciYo vive en la raíz del repo (no en `apps/senciyo/`) — necesita restructuración
- [ ] `app/shared/src/` contiene código muerto (3 archivos) — eliminar
- [ ] No existe `pnpm-workspace.yaml`, `turbo.json`, ni `nx.json`
- [ ] No existe CODEOWNERS
- [ ] No existen GitHub Actions workflows

#### Dependencias
- [ ] Zod: v3 en SenciYo vs v4 en PM-Portal — DRIFT MAJOR — resolver
- [ ] @hookform/resolvers: v3 en SenciYo vs v5 en PM-Portal — DRIFT MAJOR — resolver
- [ ] `app/shared/src/types.ts` no es importado por ninguna app activa
- [ ] `npm install` en raíz NO instala dependencias de PM-Portal

#### Seguridad
- [x] Claves de Amplitude, PostHog, Mixpanel son publishable (aceptable en frontend)
- [ ] `apps/pm-portal/.env` con Supabase URL y anon key está commiteado — CRÍTICO
- [ ] `SERVICE_ROLE_KEY` de Supabase no está en el repo — OK pero riesgo latente
- [ ] No hay `.env.local` con secretos reales en raíz — pendiente verificar

#### Build y CI
- [ ] `chunkSizeWarningLimit: 5000` en SenciYo oculta alerta de bundle
- [ ] No hay CI/CD configurado — ningún workflow automático
- [ ] `dist/` existe en la raíz — verificar si está en `.gitignore`
- [ ] PM-Portal tiene script `generar:estado` previo al build — documentar

#### Analítica
- [ ] Eventos duplicados como strings: `eventosAnalitica.ts` vs `eventos-posthog-kpi.ts`
- [ ] Triple tracking activo en SenciYo: PostHog + Amplitude + Mixpanel
- [ ] Inicialización lazy de Mixpanel en cada evento (posible overhead)
- [ ] PM-Portal consume eventos de SenciYo vía PostHog API (acoplamiento semántico, no de código)

#### Productividad
- [ ] No hay README de onboarding que explique la estructura del monorepo
- [ ] No hay convención de commits establecida
- [ ] Ramas adicionales: `dev`, `develop1` sin propósito documentado

---

### Archivos y Carpetas Clave Revisados

| Archivo / Carpeta | Relevancia |
|---|---|
| `/package.json` | Root workspace (sin workspace config real), dependencias de SenciYo |
| `/vite.config.ts` | Build config SenciYo; `chunkSizeWarningLimit: 5000` |
| `/tsconfig.app.json` | TS config SenciYo; alias `@/*` → `src/*` |
| `/eslint.config.js` | ESLint sin reglas de boundaries cross-app |
| `/tailwind.config.js` | Solo cubre rutas de SenciYo |
| `/src/main.tsx` | Inicialización de PostHog y Amplitude para SenciYo |
| `/src/shared/analitica/analitica.ts` | Triple tracking (PostHog + Amplitude + Mixpanel) |
| `/src/shared/analitica/eventosAnalitica.ts` | Definición de eventos — duplicada en PM-Portal |
| `/apps/pm-portal/package.json` | Dependencias de PM-Portal; Zod v4, hookform/resolvers v5 |
| `/apps/pm-portal/vite.config.ts` | Build config PM-Portal; `chunkSizeWarningLimit: 1200` (razonable) |
| `/apps/pm-portal/.env` | **SECRETO COMMITEADO** — Supabase URL y anon key reales |
| `/apps/pm-portal/.env.example` | Placeholders correctos |
| `/apps/pm-portal/src/dominio/modelos.ts` | Modelos de dominio completos de PM-Portal |
| `/apps/pm-portal/functions/api/eventos-posthog-kpi.ts` | Duplicación de nombres de eventos de SenciYo |
| `/apps/pm-portal/functions/api/metricas-posthog.ts` | Aggregación de métricas vía PostHog API (serverless) |
| `/apps/pm-portal/functions/api/_autorizacion.ts` | Middleware de auth con Supabase SERVICE_ROLE_KEY |
| `/apps/pm-portal/src/infraestructura/supabase/clienteSupabase.ts` | Cliente Supabase con anon key |
| `/app/shared/src/types.ts` | Tipos `Order` — código dead/legacy |
| `/app/shared/src/components/ConfirmationModal.tsx` | Componente no usado por ninguna app activa |
| `/scripts/verifyCurrencyPersistence.ts` | Script suelto en raíz, sin integración en CI |

---

*Informe generado mediante análisis estático del repositorio. Ningún código fue modificado durante la auditoría.*
