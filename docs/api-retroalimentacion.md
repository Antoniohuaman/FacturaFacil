# API oficial v1 de retroalimentación

## Propósito

La API oficial v1 expone agregados de retroalimentación de SenciYo para aplicaciones autorizadas que necesiten construir dashboards sin acceso directo a Supabase.

La fuente canónica de lectura es `public.v_retroalimentacion_unificada`, consultada solo desde backend. La superficie versionada actual está limitada a respuestas agregadas y no expone PII ni textos libres individuales.

## Superficie actual

La API oficial v1 expone únicamente estas rutas:

| Método | Ruta | Estado | Propósito | Scope | Feature flag | PII |
|---|---|---|---|---|---|---|
| `GET` | `/api/v1/retroalimentacion/resumen` | Operativa | Resumen agregado de métricas de retroalimentación | `feedback:read:summary` | No aplica | No |
| `GET` | `/api/v1/retroalimentacion/panel` | Operativa condicionada | KPIs y distribuciones agregadas para dashboards | `feedback:read:panel` | `FEEDBACK_API_V1_PANEL_ENABLED=true` | No |

No existen rutas versionadas de listado, detalle ni distribuciones especializadas en el estado actual del repositorio.

## Autenticación y autorización

Ambas rutas versionadas requieren:

- `Authorization: Bearer <token-de-aplicacion>`
- `FEEDBACK_API_CONSUMERS_JSON`
- `FEEDBACK_API_KEY_HASH_PEPPER`

El token es opaco. La validación se resuelve server-side comparando `token_hash = sha256(<pepper>:<token>)` contra la configuración declarativa de consumidores autorizados.

Scopes implementados actualmente:

| Scope | Ruta |
|---|---|
| `feedback:read:summary` | `/api/v1/retroalimentacion/resumen` |
| `feedback:read:panel` | `/api/v1/retroalimentacion/panel` |

No hay otros scopes de retroalimentación con enforcement real en la superficie versionada actual.

## Control por empresa o tenant

La autorización de aplicación incorpora control server-side por empresa.

Reglas vigentes:

1. Cada consumidor declara `allowed_empresa_ids` en `FEEDBACK_API_CONSUMERS_JSON`.
2. Si el request envía `empresa_id`, la API valida que pertenezca a ese conjunto autorizado.
3. Si el consumidor es monoempresa y no envía `empresa_id`, la API resuelve esa empresa del lado servidor.
4. Si el consumidor tiene varias empresas y no declara `allow_multi_tenant_summary=true` para `resumen` o `allow_multi_tenant_panel=true` para `panel`, la API exige `empresa_id`.
5. Si el consumidor tiene varias empresas y la ruta agregada admite multiempresa para ese consumidor, la lectura queda limitada al conjunto autorizado y nunca sale de ese alcance.

## Filtros soportados

Las rutas agregadas soportan exactamente estos filtros:

- `tipo`
- `empresa_id`
- `establecimiento_id`
- `modulo`
- `desde`
- `hasta`

Reglas de validación:

- `tipo`: `estado_animo`, `idea`, `calificacion`
- `desde`: formato `YYYY-MM-DD`
- `hasta`: formato `YYYY-MM-DD`
- `desde <= hasta`

No se aceptan filtros por usuario, flags de sensibles ni filtros libres de texto en la API oficial v1 actual.

## Contratos JSON

### `GET /api/v1/retroalimentacion/resumen`

```json
{
  "data": {
    "total_registros": 153,
    "totales_por_tipo": {
      "estado_animo": 60,
      "idea": 33,
      "calificacion": 60
    },
    "promedio_calificacion": 8.7,
    "distribucion_estado_animo": [
      {
        "estado_animo": "feliz",
        "total": 40
      }
    ],
    "cantidad_ideas": 33,
    "serie_diaria": [
      {
        "fecha": "2026-05-01",
        "total": 12,
        "estado_animo": 4,
        "idea": 3,
        "calificacion": 5
      }
    ]
  },
  "meta": {
    "api_version": "v1",
    "generated_at": "2026-05-03T18:00:00.000Z",
    "request_id": "req_01HXYZ...",
    "scope_profile": "application_summary"
  },
  "filters": {
    "tipo": null,
    "empresa_id": "empresa_autorizada_01",
    "establecimiento_id": null,
    "modulo": null,
    "desde": "2026-05-01",
    "hasta": "2026-05-03"
  }
}
```

### `GET /api/v1/retroalimentacion/panel`

```json
{
  "data": {
    "resumen": {
      "total_registros": 153,
      "totales_por_tipo": {
        "estado_animo": 60,
        "idea": 33,
        "calificacion": 60
      },
      "promedio_calificacion": 8.7,
      "distribucion_estado_animo": [
        {
          "estado_animo": "feliz",
          "total": 40
        }
      ],
      "cantidad_ideas": 33
    },
    "distribuciones": {
      "por_tipo": [
        {
          "tipo": "estado_animo",
          "total": 60
        }
      ],
      "estados_animo": [
        {
          "estado_animo": "feliz",
          "total": 40
        }
      ],
      "puntajes": [
        {
          "puntaje": 9,
          "total": 18
        }
      ],
      "serie_diaria": [
        {
          "fecha": "2026-05-01",
          "total": 12,
          "estado_animo": 4,
          "idea": 3,
          "calificacion": 5
        }
      ]
    }
  },
  "meta": {
    "source": "supabase",
    "api_version": "v1",
    "generated_at": "2026-05-03T18:00:00.000Z",
    "request_id": "req_01HXYZ...",
    "scope_profile": "application_panel"
  },
  "filters": {
    "tipo": null,
    "empresa_id": "empresa_autorizada_01",
    "establecimiento_id": null,
    "modulo": null,
    "desde": "2026-05-01",
    "hasta": "2026-05-03"
  }
}
```

La respuesta de `panel` no devuelve `usuario_id`, `usuario_nombre`, `usuario_correo`, `empresa_ruc`, `empresa_razon_social`, `ruta`, `valor_principal` ni `detalle`.

## Errores reales

| HTTP | Código | Significado |
|---|---|---|
| `401` | `unauthorized` | No existe autenticación válida en la solicitud. |
| `401` | `invalid_token` | El bearer token no coincide con un consumidor autorizado activo. |
| `403` | `forbidden` | El consumidor autenticado no está habilitado. |
| `403` | `insufficient_scope` | El consumidor no incluye el scope requerido por la ruta. |
| `400` | `invalid_filter` | Uno o más filtros no cumplen el contrato esperado. |
| `403` | `tenant_not_authorized` | El `empresa_id` solicitado no pertenece al ámbito autorizado del consumidor. |
| `403` | `tenant_scope_empty` | El consumidor no tiene empresas autorizadas configuradas. |
| `403` | `tenant_selection_required` | La solicitud debe indicar una empresa autorizada para esa ruta agregada. |
| `500` | `internal_error` | Error interno no controlado. |
| `501` | `operational_read_not_enabled` | La ruta existe, pero su habilitación operativa no está activa. |
| `503` | `service_unavailable` | Falta configuración runtime para autorización de aplicación. |

Todas las respuestas incluyen `request_id`, y la API acepta `X-Request-Id` de entrada cuando está presente.

## Variables runtime requeridas

- `SENCIYO_SUPABASE_URL`
- `SENCIYO_SUPABASE_SERVICE_ROLE_KEY`
- `FEEDBACK_API_CONSUMERS_JSON`
- `FEEDBACK_API_KEY_HASH_PEPPER`
- `FEEDBACK_API_V1_PANEL_ENABLED` solo para `GET /api/v1/retroalimentacion/panel`

Notas de configuración:

- `FEEDBACK_API_CONSUMERS_JSON` define `consumer_id`, `name`, `status`, `token_hash`, `scopes`, `allowed_empresa_ids`, `allow_multi_tenant_summary` y `allow_multi_tenant_panel`.
- `FEEDBACK_API_KEY_HASH_PEPPER` se usa solo en backend para validar hashes de token.
- No existe un feature flag equivalente para `resumen` en el estado actual del runtime.

## Garantías de seguridad vigentes

- La lectura de datos se resuelve exclusivamente server-side.
- El service role de SenciYo permanece solo en backend.
- No se entrega acceso directo a Supabase a consumidores de integración.
- `resumen` y `panel` no devuelven PII ni textos libres individuales.
- El tenant se resuelve y se valida del lado servidor.
- No hay tokens hardcodeados en el repositorio.
- No se configuran headers CORS explícitos en esta superficie versionada; el consumo previsto es server-side o same-origin controlado.

## Relación con la API interna actual

La API interna actual bajo `/api/retroalimentacion/*` sigue siendo la superficie operativa consumida por PM Portal. La API oficial v1 existe en paralelo y está orientada a aplicaciones autorizadas que necesiten dashboards agregados.

PM Portal no forma parte del contrato de la API oficial v1 y no condiciona su diseño. Sigue consumiendo la superficie interna existente sin cambios de comportamiento.

La operación actual de la integración interna se documenta en [docs/retroalimentacion-senciyo-pm-portal.md](docs/retroalimentacion-senciyo-pm-portal.md).