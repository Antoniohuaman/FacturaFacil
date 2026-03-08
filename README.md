# FacturaFacil — Monorepo

Este repositorio contiene dos aplicaciones:
- **SenciYo** (`apps/senciyo/`) — Producto principal de facturación
- **PM-Portal** (`apps/pm-portal/`) — Portal interno de gestión de producto

---

## Variables de entorno

**Regla fundamental: los archivos `.env` con valores reales NUNCA se commitean.**

Cada app tiene un `.env.example` con todos los nombres de variable y comentarios.
Para configurar tu entorno local:

1. Copia `apps/senciyo/.env.example` → `apps/senciyo/.env.local` (SenciYo)
2. Copia `apps/pm-portal/.env.example` → `apps/pm-portal/.env.local` (PM-Portal)
3. Completa los valores reales en cada `.env.local`

Los `.env.local` están ignorados por `.gitignore` (`*.local` y `.env.*`).

**En Cloudflare Pages** (producción y preview), las variables de entorno se configuran
exclusivamente en el panel → Settings → Environment variables. No se usan archivos `.env`.

> Las variables `VITE_PUBLIC_*` (PostHog, Amplitude, Mixpanel) son claves publishable:
> son visibles en el bundle del cliente por diseño. Aun así, no se commitean en archivos `.env`.
>
> La `SUPABASE_SERVICE_ROLE_KEY` y la `POSTHOG_PERSONAL_API_KEY` son claves de servidor:
> van SOLO en Cloudflare (producción) o en `.dev.vars` (desarrollo local con Wrangler).

---

## Estructura del repositorio

apps/
├── senciyo/
│   ├── public/
│   ├── scripts/
│   └── src/
└── pm-portal/

functions/
└── api/                  ← Pages Functions usadas por PM Portal

packages/
└── analytics-events/