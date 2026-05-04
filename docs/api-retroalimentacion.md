# API oficial v1 de retroalimentación

## Propósito

Este documento fija la superficie oficial bajo `/api/v1/retroalimentacion` y la separa de la API interna actual `/api/retroalimentacion/*`.

No forman parte de la superficie oficial:

- `GET /api/v1/retroalimentacion`
- `GET /api/v1/retroalimentacion/{registro_uid}`
- `GET /api/v1/retroalimentacion/distribuciones`
- `GET /api/v1/retroalimentacion/exportacion`

## Superficie oficial implementada

| Método | Ruta | Propósito | Estado |
|---|---|---|---|
| `GET` | `/api/v1/retroalimentacion/resumen` | Resumen agregado oficial | Implementada |
| `GET` | `/api/v1/retroalimentacion/panel` | KPIs y distribuciones agregadas para dashboard | Implementada, gateada por feature flag |
| `GET` | `/api/v1/retroalimentacion/registros` | Listado paginado oficial | Implementada |
| `GET` | `/api/v1/retroalimentacion/registros/{registro_uid}` | Detalle oficial por `registro_uid` | Implementada |

Handlers versionados presentes en esta rama:

- [functions/api/v1/retroalimentacion/resumen.ts](functions/api/v1/retroalimentacion/resumen.ts)
- [functions/api/v1/retroalimentacion/panel.ts](functions/api/v1/retroalimentacion/panel.ts)
- [functions/api/v1/retroalimentacion/registros.ts](functions/api/v1/retroalimentacion/registros.ts)
- [functions/api/v1/retroalimentacion/registros/[registro_uid].ts](functions/api/v1/retroalimentacion/registros/%5Bregistro_uid%5D.ts)

## Autorización y scopes

Autorización obligatoria en todas las rutas oficiales:

- `Authorization: Bearer <token-de-aplicacion>`
- `FEEDBACK_API_CONSUMERS_JSON`
- `FEEDBACK_API_KEY_HASH_PEPPER`

Modelo formal de tenant por consumidor:

- `tenant_access: "restricted"` para consumidores limitados a empresas explícitas.
- `tenant_access: "all"` para consumidores administrativos globales.
- Si `tenant_access` falta, el default seguro es `restricted`.
- `allowed_empresa_ids: ["*"]` es inválido y no habilita acceso global.
- En `tenant_access: "all"`, `allowed_empresa_ids` puede omitirse o enviarse vacío; cualquier valor no vacío es inválido.

Scopes reales soportados:

- `feedback:read:summary`
- `feedback:read:panel`
- `feedback:read:records`
- `feedback:read:record-detail`
- `feedback:read:sensitive`
- `feedback:filter:user`

Reglas:

- `feedback:read:sensitive` solo habilita `incluir_sensibles=true` en `registros` y `registros/{registro_uid}`.
- `feedback:filter:user` solo habilita `usuario_id` como filtro.
- No existe `feedback:admin`.

## Reglas de tenant

El tenant no viene del frontend; se resuelve con la configuración del consumidor autenticado.

Reglas vigentes:

- `tenant_access: "restricted"` conserva el modelo limitado actual.
- `tenant_access: "all"` representa un consumidor administrativo global y permite consultar empresas actuales y futuras sin mantener una lista fija de `empresa_id`.
- En `restricted`, `allowed_empresa_ids` delimita el universo permitido.
- En `restricted`, `empresa_id` solo puede reducir dentro de `allowed_empresa_ids`.
- En `restricted`, si el consumidor es monoempresa, puede omitir `empresa_id`.
- En `restricted`, si el consumidor es multiempresa, `resumen` solo permite omitir `empresa_id` cuando `allow_multi_tenant_summary=true`.
- En `restricted`, si el consumidor es multiempresa, `panel` solo permite omitir `empresa_id` cuando `allow_multi_tenant_panel=true`.
- En `restricted`, `registros` y `registros/{registro_uid}` requieren `empresa_id` cuando hay más de una empresa autorizada.
- En `all`, `resumen` y `panel` pueden consultar agregado global cuando no se envía `empresa_id`.
- En `all`, `registros` puede listar globalmente cuando no se envía `empresa_id`, manteniendo paginación y scopes.
- En `all`, `registros/{registro_uid}` puede consultar globalmente por `registro_uid` cuando no se envía `empresa_id`.
- En cualquier modo, si se envía `empresa_id`, la consulta se acota a esa empresa.
- `registros/{registro_uid}` responde `404 not_found` si el registro no existe o queda fuera del tenant autorizado efectivo.

Ejemplo de consumidor limitado:

```json
{
	"consumer_id": "cliente-externo",
	"name": "Cliente externo",
	"status": "active",
	"token_hash": "sha256_hex_de_64_caracteres",
	"tenant_access": "restricted",
	"allowed_empresa_ids": ["empresa_1"],
	"scopes": ["feedback:read:panel"]
}
```

Ejemplo de consumidor administrativo global:

```json
{
	"consumer_id": "pm-portal-admin",
	"name": "PM Portal Administrativo",
	"status": "active",
	"token_hash": "sha256_hex_de_64_caracteres",
	"tenant_access": "all",
	"allowed_empresa_ids": [],
	"scopes": [
		"feedback:read:summary",
		"feedback:read:panel",
		"feedback:read:records",
		"feedback:read:record-detail",
		"feedback:read:sensitive",
		"feedback:filter:user"
	],
	"allow_multi_tenant_summary": true,
	"allow_multi_tenant_panel": true
}
```

## Contratos operativos

### `GET /api/v1/retroalimentacion/resumen`

Scope requerido:

- `feedback:read:summary`

Filtros permitidos:

- `tipo`
- `empresa_id`
- `establecimiento_id`
- `modulo`
- `desde`
- `hasta`
- `puntaje`
- `estado_animo`
- `usuario_id` solo con `feedback:filter:user`

Respuesta:

- `data.total_registros`
- `data.totales_por_tipo`
- `data.promedio_calificacion`
- `data.distribucion_estado_animo`
- `data.cantidad_ideas`
- `data.serie_diaria`
- `meta`
- `filters`

### `GET /api/v1/retroalimentacion/panel`

Scope requerido:

- `feedback:read:panel`

Runtime adicional:

- `FEEDBACK_API_V1_PANEL_ENABLED=true`

Comportamiento:

- Si la feature flag no está en `true`, responde `501 operational_read_not_enabled`.
- Reutiliza la misma familia de filtros agregados de `resumen`.
- No expone PII ni texto libre.

Respuesta:

- `data.resumen`
- `data.distribuciones.por_tipo`
- `data.distribuciones.por_modulo`
- `data.distribuciones.puntajes`
- `data.distribuciones.estados_animo`
- `data.distribuciones.serie_diaria`
- `meta`
- `filters`

### `GET /api/v1/retroalimentacion/registros`

Scope requerido:

- `feedback:read:records`

Filtros permitidos:

- `tipo`
- `empresa_id`
- `establecimiento_id`
- `modulo`
- `desde`
- `hasta`
- `puntaje`
- `estado_animo`
- `usuario_id` solo con `feedback:filter:user`
- `incluir_sensibles=true` solo con `feedback:read:sensitive`

Paginación y orden:

- `pagina`
- `tamano`
- `ordenar_por`
- `direccion`
- `tamano` máximo: `100`
- orden secundario determinista: `created_at desc`, `registro_uid asc` cuando aplica
- en `tenant_access: "all"`, puede listar globalmente sin `empresa_id`
- en `tenant_access: "restricted"`, si hay varias empresas autorizadas, requiere `empresa_id`

Proyección por defecto:

- `registro_uid`
- `tipo`
- `created_at`
- `empresa_id`
- `establecimiento_id`
- `modulo`
- `puntaje`
- `estado_animo`

Campos adicionales cuando `incluir_sensibles=true` y existe scope:

- `usuario_id`
- `usuario_nombre`
- `usuario_correo`
- `empresa_ruc`
- `empresa_razon_social`
- `empresa_nombre`
- `establecimiento_nombre`
- `ruta`
- `valor_principal`
- `detalle`

### `GET /api/v1/retroalimentacion/registros/{registro_uid}`

Scope requerido:

- `feedback:read:record-detail`

Parámetros permitidos:

- `empresa_id`
- `incluir_sensibles=true` solo con `feedback:read:sensitive`

Reglas:

- `registro_uid` debe tener forma `tipo:uuid`.
- En `tenant_access: "restricted"` con varias empresas autorizadas, `empresa_id` es obligatorio.
- En `tenant_access: "all"`, `empresa_id` es opcional.
- No devuelve `id` interno de tabla origen.
- Si el registro existe fuera del tenant autorizado, la respuesta sigue siendo `404`.

## Seguridad

- La lectura se resuelve exclusivamente server-side.
- El service role de SenciYo permanece solo en backend.
- La API oficial v1 no expone acceso directo a Supabase.
- No hay CORS abierto `*` agregado por esta implementación.
- No se entrega PII ni texto libre por defecto.
- No se usa wildcard `*` para resolver acceso global.
- La exportación debe resolverse consumiendo `/api/v1/retroalimentacion/registros` paginado; no existe endpoint adicional de exportación.

## Relación con PM Portal

- PM Portal sigue consumiendo la API interna `/api/retroalimentacion/*`.
- Esta implementación no modifica PM Portal.
- Esta implementación no modifica SenciYo.
- Esta implementación no modifica la API interna actual.
- PM Portal administrativo debe configurarse como consumidor `tenant_access: "all"` cuando se evalúe su migración futura a esta API oficial.

## Variables runtime relevantes

- `SENCIYO_SUPABASE_URL`
- `SENCIYO_SUPABASE_SERVICE_ROLE_KEY`
- `FEEDBACK_API_CONSUMERS_JSON`
- `FEEDBACK_API_KEY_HASH_PEPPER`
- `FEEDBACK_API_V1_PANEL_ENABLED`

## Estado de cierre

- La superficie oficial quedó limitada a cuatro rutas reales.
- Las rutas raíz incorrectas no fueron reintroducidas.
- `/distribuciones` y `/exportacion` siguen fuera de la API oficial v1.