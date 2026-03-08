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
Las Functions viven en `functions/api` en la raíz del repositorio.

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

## Prueba local
`vite` por sí solo no ejecuta `functions/`; en entorno local se puede validar el frontend y hacer pruebas de integración en un despliegue preview de Cloudflare Pages.

Si faltan secretos de servidor en el proyecto de Pages, el Tablero muestra métricas como **No disponible** sin romper la página.
