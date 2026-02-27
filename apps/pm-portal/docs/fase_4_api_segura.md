# Fase 4: API segura de métricas (Pages Functions)

## Objetivo
Retornar métricas agregadas al Portal PM desde servidor (Cloudflare Pages Functions), evitando exponer secretos en frontend.

## Variables y secretos en Cloudflare Pages
Configurar en **Pages > proyecto `pm-portal` > Settings > Variables and secrets**.

### Requeridas para PostHog
- `POSTHOG_HOST` (ejemplo: `https://us.i.posthog.com`)
- `POSTHOG_PROJECT_ID`
- `POSTHOG_PERSONAL_API_KEY`

### Opcionales para GitHub (endpoint opcional)
- `GITHUB_TOKEN`
- `GITHUB_OWNER`
- `GITHUB_REPO`

## Endpoints disponibles
Las Functions viven en `apps/pm-portal/functions/api`.

### `GET /api/metricas-posthog`
Archivo: `functions/api/metricas-posthog.ts`

- Consulta PostHog Query API (`POST /api/projects/:project_id/query/`)
- Calcula métricas agregadas de últimos 30 días
- Aplica caché en memoria de 60 segundos
- Responde `200` incluso si falta configuración, con `disponible=false` y métricas en `null`

Respuesta (resumen):

```json
{
  "fuente": "posthog",
  "periodo_dias": 30,
  "actualizado_en": "2026-02-27T00:00:00.000Z",
  "disponible": true,
  "motivo_no_disponible": null,
  "metricas": [
    {
      "clave": "ventas_completadas",
      "nombre": "Ventas completadas",
      "valor": 42,
      "periodo": "Últimos 30 días",
      "disponible": true
    }
  ]
}
```

Métricas incluidas:
- `usuarios_activos`
- `ventas_completadas` (`venta_completada`)
- `primera_venta` (`primera_venta_completada`)
- `ruc_actualizado` (`ruc_actualizado`)
- `productos_creados` (`producto_creado_exitoso`)
- `clientes_creados` (`cliente_creado_exitoso`)

Si un evento no existe en el rango, se devuelve con `valor: null` para no romper UI.

### `GET /api/resumen-repo` (opcional)
Archivo: `functions/api/resumen-repo.ts`

- Consulta GitHub API con token servidor
- Retorna commits recientes y conteo de commits de 7 días
- Caché en memoria de 60 segundos
- Si faltan secretos, responde `disponible=false`

## Consumo frontend
- Cliente único: `src/infraestructura/apis/clienteApiPortalPM.ts`
- Esquemas zod: `src/infraestructura/apis/esquemasApiPortalPM.ts`
- Vista tablero: `src/presentacion/paginas/tablero/PaginaTablero.tsx`

El frontend consume solo rutas relativas:
- `/api/metricas-posthog`
- `/api/resumen-repo`

No se usa ningún secreto ni variable `VITE_` para estas APIs.

## Prueba local (sin commitear secretos)
Para desarrollo local con Pages Functions, usar archivo local de secretos (por ejemplo `.dev.vars`) y **no subirlo al repositorio**.

Importante: `vite` por sí solo no ejecuta `functions/`; para probar `/api/metricas-posthog` localmente se debe usar runtime de Pages.

Ejemplo:

```env
POSTHOG_HOST=https://us.i.posthog.com
POSTHOG_PROJECT_ID=...
POSTHOG_PERSONAL_API_KEY=...
GITHUB_TOKEN=...
GITHUB_OWNER=Antoniohuaman
GITHUB_REPO=FacturaFacil
```

Si no están configurados, el Tablero muestra métricas como **No disponible** sin romper la página.

Comandos sugeridos para prueba local de Functions:

```bash
npm --prefix apps/pm-portal run build
cd apps/pm-portal
npx wrangler pages dev dist --port 8788
```

Luego probar:

```bash
curl http://localhost:8788/api/metricas-posthog
```
