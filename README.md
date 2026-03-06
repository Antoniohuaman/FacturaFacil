# FacturaFacil — Monorepo

Este repositorio contiene dos aplicaciones:
- **SenciYo** (raíz `/`) — Producto principal de facturación
- **PM-Portal** (`apps/pm-portal/`) — Portal interno de gestión de producto

---

## Variables de entorno

**Regla fundamental: los archivos `.env` con valores reales NUNCA se commitean.**

Cada app tiene un `.env.example` con todos los nombres de variable y comentarios.
Para configurar tu entorno local:

1. Copia `.env.example` → `.env.local` en la raíz (SenciYo)
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

src/
├── assets/
├── components/
│   └── ui/                     # Componentes globales reutilizables (botones, inputs, etc.)
├── layouts/
│   ├── PublicLayout.jsx
│   └── PrivateLayout.jsx
├── routes/
│   ├── PublicRoutes.jsx
│   └── PrivateRoutes.jsx
├── hooks/                      # Hooks globales o cross-cutting (ej: useAuth, useApi)
├── services/                   # Clientes HTTP genéricos o instancias de axios/fetch
├── store/                      # Estado global si lo usas (Redux, etc.)
├── utils/                      # Funciones comunes (formateo, fechas, validaciones)
├── contasis/                   # comonentes
├── pages/
│   ├── public/
│   │   ├── features/           ← Features solo para contexto público
│   │   │   └── auth/
│   │   │       ├── components/
│   │   │       ├── hooks/
│   │   │       └── services/
│   │   ├── Login.jsx
│   │   └── Register.jsx
│   └── private/
│       ├── features/           ← Features solo para contexto privado
│       │   ├── dashboard/
│       │   ├── receipts/
│       │   └── subscriptions/  # Aquí iría tu lógica
│       ├── Dashboard.jsx
│       ├── Receipts.jsx
│       └── Subscriptions.jsx
└── App.jsx