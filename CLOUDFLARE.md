# Cloudflare Pages — Configuración de Despliegue

## Configuración recomendada por proyecto

Ambos proyectos deben usar **`/` (raíz del repositorio)** como Root Directory.
Las apps dependen del workspace package `@facturafacil/analytics-events` (en `packages/`).
Si se configura Root Directory como el directorio de la app (`apps/senciyo/` o `apps/pm-portal/`),
el `npm install` de Cloudflare no instalará el workspace completo y el build fallará.

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
| `VITE_PUBLIC_POSTHOG_KEY` | Production | Clave publishable |
| `VITE_PUBLIC_POSTHOG_HOST` | Production | Ej: `https://us.i.posthog.com` |
| `VITE_PUBLIC_AMPLITUDE_API_KEY` | Production | Clave publishable |
| `VITE_PUBLIC_MIXPANEL_TOKEN` | Production | Token publishable |
| `VITE_DEV_MODE` | Preview | `true` para activar mocks |

### PM Portal

| Variable | Entorno | Nota |
|---|---|---|
| `VITE_SUPABASE_URL` | Production + Preview | Build-time — URL pública del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Production + Preview | Build-time — Clave anon (pública) |
| `SUPABASE_URL` | Production + Preview | Runtime (Functions) — igual que la anterior |
| `SUPABASE_SERVICE_ROLE_KEY` | Production + Preview | **Secret** — acceso admin total, solo servidor |
| `POSTHOG_HOST` | Production | Runtime (Functions) |
| `POSTHOG_PROJECT_ID` | Production | Runtime (Functions) |
| `POSTHOG_PERSONAL_API_KEY` | Production | **Secret** — solo servidor |
| `GITHUB_OWNER` | Production | Opcional, para endpoint resumen-repo |
| `GITHUB_REPO` | Production | Opcional |
| `GITHUB_TOKEN` | Production | **Secret** — opcional |
| `DIAGNOSTICO_METRICAS` | Production | Opcional — activa logs de diagnóstico |

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
