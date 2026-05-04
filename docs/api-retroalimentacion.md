# API oficial v1 de retroalimentación

## Propósito

Este documento fija la estructura oficial de la API versionada de retroalimentación bajo `/api/v1/retroalimentacion` y elimina referencias a rutas raíz incorrectas.

No forman parte de la superficie oficial:

- `GET /api/v1/retroalimentacion`
- `GET /api/v1/retroalimentacion/{registro_uid}`
- `GET /api/v1/retroalimentacion/distribuciones`
- `GET /api/v1/retroalimentacion/exportacion`

## Superficie oficial definida

| Método | Ruta | Propósito | Estado esperado |
|---|---|---|---|
| `GET` | `/api/v1/retroalimentacion/resumen` | Resumen agregado oficial | Implementada en esta rama |
| `GET` | `/api/v1/retroalimentacion/panel` | KPIs y distribuciones agregadas para dashboard | Pendiente si no existe `panel.ts` en la rama |
| `GET` | `/api/v1/retroalimentacion/registros` | Listado paginado oficial | Pendiente |
| `GET` | `/api/v1/retroalimentacion/registros/{registro_uid}` | Detalle oficial por `registro_uid` | Pendiente |

## Estado actual validado en esta rama

- Existe `GET /api/v1/retroalimentacion/resumen` en [functions/api/v1/retroalimentacion/resumen.ts](functions/api/v1/retroalimentacion/resumen.ts).
- No existe `functions/api/v1/retroalimentacion/panel.ts` en esta rama.
- Las rutas raíz incorrectas `GET /api/v1/retroalimentacion` y `GET /api/v1/retroalimentacion/{registro_uid}` no deben permanecer como aliases ni como handlers bloqueados con `501`.
- La API interna actual bajo `/api/retroalimentacion/*` sigue siendo independiente y no forma parte de esta limpieza.

## Contrato operativo actual

### `GET /api/v1/retroalimentacion/resumen`

Autorización:

- `Authorization: Bearer <token-de-aplicacion>`
- `FEEDBACK_API_CONSUMERS_JSON`
- `FEEDBACK_API_KEY_HASH_PEPPER`
- scope `feedback:read:summary`

Características vigentes:

- Resuelve `empresa_id` autorizado del lado servidor.
- No expone PII ni texto libre individual.
- Lee desde `public.v_retroalimentacion_unificada` por backend.

Respuesta de ejemplo:

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
    "hasta": "2026-05-03",
    "usuario_id": null,
    "incluir_sensibles": false
  }
}
```

## Seguridad

- La lectura se resuelve exclusivamente server-side.
- El service role de SenciYo permanece solo en backend.
- La API oficial v1 no expone acceso directo a Supabase.
- `feedback:read` y `feedback:read:detail` no forman parte de la superficie vigente de esta rama.
- No deben documentarse rutas raíz v1 bloqueadas con `501`.

## Relación con PM Portal

- PM Portal sigue consumiendo la API interna `/api/retroalimentacion/*`.
- Esta limpieza no modifica PM Portal.
- Esta limpieza no modifica SenciYo.
- Esta limpieza no modifica la API interna actual.

## Variables runtime relevantes

- `SENCIYO_SUPABASE_URL`
- `SENCIYO_SUPABASE_SERVICE_ROLE_KEY`
- `FEEDBACK_API_CONSUMERS_JSON`
- `FEEDBACK_API_KEY_HASH_PEPPER`

## Inconsistencias pendientes fuera de esta limpieza

- Si la superficie final de producto exige `panel`, debe existir `functions/api/v1/retroalimentacion/panel.ts`.
- Si la superficie final de producto exige listado y detalle oficiales, deben implementarse `/api/v1/retroalimentacion/registros` y `/api/v1/retroalimentacion/registros/{registro_uid}`.
- Esta limpieza no crea esas rutas.