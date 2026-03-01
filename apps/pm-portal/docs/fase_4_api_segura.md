# Fase 4: API segura de métricas (Pages Functions)

## Objetivo
Retornar métricas agregadas al Portal PM desde servidor (Cloudflare Pages Functions), evitando exponer secretos en frontend.

## Variables y secretos en Cloudflare Pages
Configurar en **Pages > proyecto `pm-portal` > Settings > Variables and secrets**.

### Requeridas para PostHog
- `POSTHOG_HOST` (ejemplo: `https://us.i.posthog.com`)
- `POSTHOG_PROJECT_ID`
- `POSTHOG_PERSONAL_API_KEY`

### Requeridas para validación de sesión (Supabase)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Opcionales para GitHub (endpoint opcional)
- `GITHUB_TOKEN`
- `GITHUB_OWNER`
- `GITHUB_REPO`

## Endpoints disponibles
Las Functions viven en `apps/pm-portal/functions/api`.

### `GET /api/metricas-posthog`
Archivo: `functions/api/metricas-posthog.ts`

- Requiere `Authorization: Bearer <access_token>`
- Consulta PostHog Query API (`POST /api/projects/:project_id/query/`)
- Calcula métricas agregadas para períodos de `7`, `30` o `90` días
- Incluye comparación contra período anterior equivalente
- Incluye metas y estado de cumplimiento por KPI
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
      "valor_periodo_actual": 42,
      "valor_periodo_anterior": 36,
      "delta_absoluto": 6,
      "delta_porcentual": 16.67,
      "delta_aplicable": true,
      "unidad": "conteo",
      "meta": 450,
      "estado_meta": "atencion",
      "periodo": "Últimos 30 días",
      "disponible": true
    }
  ]
}
```

Métricas incluidas:
- `activacion_porcentaje` (`usuarios con venta_completada / usuarios con registro_usuario_completado`)
- `ventas_completadas` (`venta_completada`)
- `productos_creados` (`producto_creado_exitoso`)
- `clientes_creados` (`cliente_creado_exitoso`)
- `importacion_realizada` (`importacion_completada`)
- `usuarios_activos`

Si no hay eventos en el rango para un KPI, se devuelve `0`.
Si hay error real de consulta, se devuelve `null` y motivo sanitizado en `motivo_no_disponible`.

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
