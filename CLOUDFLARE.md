# Cloudflare Pages — Configuración de Despliegue

## Configuración recomendada por proyecto

Ambos proyectos deben usar **`/` (raíz del repositorio)** como Root Directory.
Las apps dependen del workspace package `@facturafacil/analytics-events` (en `packages/`).
Si se configura Root Directory como el directorio de la app (`apps/senciyo/` o `apps/pm-portal/`),
el `npm install` de Cloudflare no instalará el workspace completo y el build fallará.

El repositorio no debe exponer un `wrangler.toml` en la raíz para los deploys Git de Pages.
Cloudflare lo autodetecta y puede sobrescribir el output esperado de otra app del monorepo.
PM Portal mantiene su flujo local de `wrangler pages dev` invocando explícitamente
`apps/pm-portal/dist` y sus flags de desarrollo desde `npm run dev:pm:cf`.

### SenciYo

| Parámetro | Valor |
|---|---|
| Root directory | `/` |
| Build command | `npm run build:senciyo` |
| Output directory | `apps/senciyo/dist` |
| Node.js version | 22 |

### PM Portal

| Parámetro | Valor |
|---|---|
| Root directory | `/` |
| Build command | `npm run build:pm` |
| Output directory | `apps/pm-portal/dist` |
| Node.js version | 22 |

Para desarrollo local con Pages Functions, PM Portal usa:

- Script: `npm run dev:pm:cf`
- Static directory: `apps/pm-portal/dist`
- Wrangler flags: `--compatibility-date 2026-03-07 --ip 127.0.0.1 --port 8788 --local-protocol http`
- Functions directory: `functions/`
- Secretos locales: `/.dev.vars`

---

## Variables de entorno por proyecto

Las variables `VITE_*` son **build-time**: Vite las embebe estáticamente en el bundle.
Deben estar configuradas en Cloudflare Pages → Settings → Variables and Secrets
**antes** de que corra el build. Un cambio en estas variables requiere un nuevo build completo;
reintentarlo sobre un artifact ya compilado no es suficiente.

### SenciYo

| Variable | Entorno | Nota |
|---|---|---|
| `VITE_API_URL` | Production | URL base del backend |
| `VITE_INDICADORES_API_URL` | Production | API de KPIs |
| `VITE_INDICADORES_NOTIFICACIONES_API_URL` | Production | API de notificaciones de KPIs |
| `VITE_SUPABASE_URL` | Production + Preview | Build-time — URL pública del proyecto Supabase usada por SenciYo para insertar retroalimentación desde frontend |
| `VITE_SUPABASE_ANON_KEY` | Production + Preview | Build-time — Clave anon pública usada por SenciYo para insertar retroalimentación desde frontend |
| `VITE_PUBLIC_POSTHOG_KEY` | Production | Clave publishable |
| `VITE_PUBLIC_POSTHOG_HOST` | Production | Ej: `https://us.i.posthog.com` |
| `VITE_PUBLIC_AMPLITUDE_API_KEY` | Production | Clave publishable |
| `VITE_PUBLIC_AMPLITUDE_SESSION_REPLAY_SAMPLE_RATE` | Production | `0` = apagado, `0.05` = 5%, `0.1` = 10%, `1` = 100% |
| `VITE_PUBLIC_MIXPANEL_TOKEN` | Production | Token publishable |
| `VITE_DEV_MODE` | Preview | `true` para activar mocks |
| `APIPERU_TOKEN` | Production | Runtime (Functions) — **Secret** para consulta real de RUC/DNI |
| `APIPERU_BASE_URL` | Production | Runtime (Functions) — opcional, default `https://dniruc.apisperu.com/api/v1` |

La consulta documental real de SenciYo se resuelve desde `functions/api/documentos/*`.
El token del proveedor debe existir solo como secreto runtime y no debe declararse como `VITE_*`.

Notas de retroalimentación:

- `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` son necesarios para que SenciYo pueda insertar retroalimentación real en Supabase desde el frontend.
- `VITE_SUPABASE_ANON_KEY` puede cargarse como Secret en Cloudflare Pages por higiene operativa, pero al ser una variable `VITE_*` termina embebida en el bundle final y debe tratarse como credencial pública de cliente, no como secreto de servidor.
- Estas variables no reemplazan RLS ni las policies INSERT de Supabase; solo permiten bootstrap del cliente browser-side.

Notas de analítica:

- Amplitude es el proveedor principal de producto; PostHog y Mixpanel son opcionales.
- No configures claves productivas en Preview si ese entorno comparte el mismo destino analítico que Production.
- Mantén `VITE_PUBLIC_AMPLITUDE_SESSION_REPLAY_SAMPLE_RATE=0` por defecto.
- Antes de subir el sample rate de Replay en Production, marca pantallas sensibles con masking/blocking en UI.

### PM Portal

| Variable | Entorno | Nota |
|---|---|---|
| `VITE_SUPABASE_URL` | Production + Preview | Build-time — URL pública del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Production + Preview | Build-time — Clave anon (pública) |
| `PM_PORTAL_SUPABASE_URL` | Production + Preview | Runtime (Functions) — **preferida** para auth/server-side del Portal PM |
| `PM_PORTAL_SUPABASE_ANON_KEY` | Production + Preview | Runtime (Functions) — **preferida** para validar sesiones del Portal PM |
| `PM_PORTAL_SUPABASE_SERVICE_ROLE_KEY` | Production + Preview | **Secret** — runtime admin del Portal PM cuando una Function requiere service role |
| `SUPABASE_URL` | Production + Preview | Runtime (Functions) — igual que la anterior |
| `SUPABASE_ANON_KEY` | Production + Preview | Runtime (Functions) — legado compatible para validar sesiones |
| `SUPABASE_SERVICE_ROLE_KEY` | Production + Preview | **Secret** — acceso admin total, solo servidor |
| `SENCIYO_SUPABASE_URL` | Production + Preview | Runtime (Functions) — URL del proyecto Supabase de SenciYo para endpoints `/api/retroalimentacion/*` |
| `SENCIYO_SUPABASE_SERVICE_ROLE_KEY` | Production + Preview | **Secret** — service role del proyecto Supabase de SenciYo para lectura de retroalimentación |
| `FEEDBACK_API_CONSUMERS_JSON` | Production + Preview | **Secret** — configuración declarativa de consumidores autorizados para la API oficial v1 de retroalimentación |
| `FEEDBACK_API_KEY_HASH_PEPPER` | Production + Preview | **Secret** — pepper para validar `token_hash = sha256(<pepper>:<token>)` de consumidores de aplicación |
| `POSTHOG_HOST` | Production | Runtime (Functions) |
| `POSTHOG_PROJECT_ID` | Production | Runtime (Functions) |
| `POSTHOG_PERSONAL_API_KEY` | Production | **Secret** — solo servidor |
| `GITHUB_OWNER` | Production | Opcional, para endpoint resumen-repo |
| `GITHUB_REPO` | Production | Opcional |
| `GITHUB_TOKEN` | Production | **Secret** — opcional |
| `DIAGNOSTICO_METRICAS` | Production | Opcional — activa logs de diagnóstico |

La API server-side de lectura de retroalimentación, disponible bajo ` /api/retroalimentacion/* ` y ` /api/v1/retroalimentacion/* `, no lee datos desde el Supabase del propio portal.
Las rutas internas bajo ` /api/retroalimentacion/* ` autorizan con esta prioridad en `functions/api/_autorizacion.ts`:

1. `PM_PORTAL_SUPABASE_URL` + `PM_PORTAL_SUPABASE_ANON_KEY` (preferido)
2. `SUPABASE_URL` + `SUPABASE_ANON_KEY` (legado)
3. `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (compatibilidad para evitar `500 configuracion_auth`, no recomendado como configuración runtime final)

Para lectura de retroalimentación, además requieren `SENCIYO_SUPABASE_URL` y
`SENCIYO_SUPABASE_SERVICE_ROLE_KEY` en `functions/api/_retroalimentacion.ts`.
Si faltan las variables de auth, la Function responde `500 configuracion_auth`.
Si falta la conexión runtime hacia SenciYo, responde `500 configuracion_supabase`.

La API oficial v1 de retroalimentación no usa el JWT de usuario del PM Portal como principal de autorización.
Su autorización real se resuelve con:

- `Authorization: Bearer <token-de-aplicacion>`
- `FEEDBACK_API_CONSUMERS_JSON` como configuración declarativa de consumidores autorizados
- `FEEDBACK_API_KEY_HASH_PEPPER` para validar `token_hash = sha256(<pepper>:<token>)`
- scopes explícitos por ruta: `feedback:read:summary`, `feedback:read:panel`, `feedback:read:records`, `feedback:read:record-detail`, `feedback:read:sensitive` y `feedback:filter:user`
- `tenant_access: restricted | all` para resolver el alcance multi-tenant de cada consumidor

La superficie oficial `GET /api/v1/retroalimentacion/resumen`, `GET /api/v1/retroalimentacion/panel`, `GET /api/v1/retroalimentacion/registros` y `GET /api/v1/retroalimentacion/registros/{registro_uid}` sigue leyendo datos desde el Supabase de SenciYo por backend y no expone service role al frontend.
La ruta `GET /api/v1/retroalimentacion/panel` requiere además `FEEDBACK_API_V1_PANEL_ENABLED=true` para quedar operativa.
Las rutas raíz `GET /api/v1/retroalimentacion` y `GET /api/v1/retroalimentacion/{registro_uid}` no forman parte de la superficie oficial v1.

Reglas de configuración del consumidor:

- `tenant_access: "restricted"` mantiene consumidores limitados por `allowed_empresa_ids`.
- `tenant_access: "all"` habilita consumidores administrativos globales para empresas actuales y futuras.
- Si `tenant_access` falta, el runtime usa `restricted`.
- `allowed_empresa_ids: ["*"]` es inválido y no debe configurarse.
- `tenant_access: "all"` no debe combinarse con una lista no vacía de `allowed_empresa_ids`.
- PM Portal administrativo debe usar `tenant_access: "all"` cuando se configure como consumidor oficial v1.

Configuración recomendada final para PM Portal en Cloudflare Production:

- `PM_PORTAL_SUPABASE_URL`
- `PM_PORTAL_SUPABASE_ANON_KEY`
- `PM_PORTAL_SUPABASE_SERVICE_ROLE_KEY`
- `SENCIYO_SUPABASE_URL`
- `SENCIYO_SUPABASE_SERVICE_ROLE_KEY`

Variables opcionales por endpoint:

- `POSTHOG_HOST`
- `POSTHOG_PROJECT_ID`
- `POSTHOG_PERSONAL_API_KEY`
- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_TOKEN`
- `DIAGNOSTICO_METRICAS`

Variables adicionales para la autorización versionada de retroalimentación:

- `FEEDBACK_API_CONSUMERS_JSON`
- `FEEDBACK_API_KEY_HASH_PEPPER`
- `FEEDBACK_API_V1_PANEL_ENABLED`

---

## Por qué ambos proyectos reaccionan al mismo push

Cloudflare Pages no dispone de filtros de paths para disparar builds (a diferencia de GitHub Actions).
Cualquier push a la rama monitoreada dispara un build en **todos** los proyectos conectados al mismo
repositorio. Esto es una limitación de la plataforma; no hay configuración de repo que lo evite.

**Lo que sí ayuda:**

- Los pipelines de CI en `.github/workflows/` tienen path filters y validan solo la app afectada.
  Si el CI falla, el equipo lo detecta antes de que Cloudflare intente desplegar.
- Para saltar el build de Cloudflare en un commit concreto, incluye `[skip ci]` en el mensaje.
- En Settings → Builds → Branch deploy controls se puede limitar qué branches disparan deploys
  de producción (ej: solo `main`), reduciendo builds de ramas de trabajo.

**Consecuencia práctica en el plan gratuito:**
Cada push dispara dos builds (uno por proyecto). En el plan gratuito de Cloudflare Pages
(500 builds/mes), un ritmo de ~8 pushes/día agotaría el límite. Considerar plan de pago
o ajustar el flujo de trabajo (squash commits, PRs en lugar de pushes directos).
