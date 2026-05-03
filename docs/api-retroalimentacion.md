# API oficial versionada de lectura de retroalimentación

## Propósito

Este documento define la arquitectura objetivo y el estado actual de la implementación inicial versionada de lectura de retroalimentación bajo `/api/v1/retroalimentacion`.

Su propósito es documentar una superficie versionada mantenible, con compatibilidad operativa respecto de la API interna actual consumida por PM Portal, sin presentar esta implementación inicial como una API habilitada para terceros mientras permanezca pendiente la integración de autorización por alcance y ámbito autorizado.

Alcance de esta documentación:

- Definir la superficie oficial propuesta bajo `/api/v1/retroalimentacion`.
- Documentar el estado actual de la implementación inicial versionada y su condición de habilitación operativa.
- Establecer contratos JSON formales para listado, detalle, resumen y errores.
- Definir campos base, campos sensibles y reglas de exposición por perfil de consumidor.
- Establecer el modelo objetivo de autenticación, autorización, scopes y control por empresa o tenant.
- Definir lineamientos de seguridad, CORS, rate limiting, observabilidad y privacidad.
- Definir la estrategia de coexistencia entre la API interna actual y la futura API oficial.

Fuera de alcance en la fase de diseño inicial:

- Habilitación operativa de lectura para consumidores transversales o de terceros sin autorización por alcance y ámbito autorizado.
- Cambios en PM Portal.
- Cambios en tablas o vistas de Supabase.
- Cambios en credenciales, despliegues o configuración real de Cloudflare.

## Estado de implementación actual de `/api/v1`

La implementación inicial versionada de la API queda expuesta en paralelo a la API interna actual mediante:

- `GET /api/v1/retroalimentacion`
- `GET /api/v1/retroalimentacion/{registro_uid}`
- `GET /api/v1/retroalimentacion/resumen`

Características de esta implementación:

- Reutiliza la validación Bearer server-side ya existente.
- Mantiene preparados los contratos versionados para listado, detalle y resumen.
- Permanece pendiente de integración de autorización por alcance y ámbito autorizado antes de habilitar lectura operativa.
- Responde con error formal `501 operational_read_not_enabled` cuando una solicitud autenticada intenta ejecutar lectura operativa.
- No expone datos reales de retroalimentación mientras la habilitación operativa permanezca pendiente.
- No habilita acceso a campos sensibles, scopes formales ni control por empresa o tenant.
- Coexiste con la API interna actual sin modificar el comportamiento de `/api/retroalimentacion/*`.

Límites de la implementación actual:

- La autorización formal por scopes permanece pendiente de implementación.
- El control explícito por empresa o tenant permanece pendiente de implementación.
- La habilitación operativa de lectura permanece bloqueada hasta integrar esas capacidades.
- La exposición de campos sensibles permanece restringida para una fase posterior.
- La migración de PM Portal permanece fuera de alcance en esta fase.

## Estado actual y objetivo arquitectónico

### Estado actual confirmado

- Existe una API interna de lectura bajo `/api/retroalimentacion`.
- Esa API es consumida actualmente por PM Portal.
- La lectura se resuelve server-side sobre `public.v_retroalimentacion_unificada`.
- La conexión a Supabase de SenciYo usa service role solo en backend.
- El acceso actual usa `Authorization: Bearer <token>`.
- La superficie actual mantiene compatibilidad operativa con PM Portal y no debe modificarse durante la transición controlada.

### Objetivo arquitectónico

El objetivo es incorporar una API oficial versionada, desacoplada conceptualmente de PM Portal y apta para consumidores autorizados con políticas explícitas de contrato, seguridad y privacidad.

Principios de diseño:

1. Versionado explícito.
2. Contrato JSON formal y estable.
3. Separación entre datos generales y datos sensibles.
4. Autorización por scopes y control por empresa o tenant.
5. Ejecución exclusivamente server-side.
6. Ausencia total de exposición del service role al frontend.
7. Coexistencia controlada con la API interna actual hasta completar migración y validación.

## Superficie oficial propuesta

### Endpoints oficiales principales

| Método | Ruta | Propósito | Consumidor esperado | Tipo de respuesta | Naturaleza de datos | ¿Puede incluir PII? | Alcance de autorización objetivo | Filtros | Paginación | Observaciones |
|---|---|---|---|---|---|---|---|---|---|---|
| `GET` | `/api/v1/retroalimentacion` | Listado oficial de retroalimentación | Consumidor interno administrativo, consumidor interno analítico, consumidor externo autorizado | Detallada paginada | Registros individuales | Sí, solo bajo alcance sensible | `feedback:read` | Sí | Sí | Ruta implementada y pendiente de habilitación operativa; actualmente responde `501 operational_read_not_enabled` tras autenticación base y validación de parámetros. |
| `GET` | `/api/v1/retroalimentacion/{registro_uid}` | Detalle oficial de un registro consolidado | Consumidor interno administrativo, consumidor externo autorizado con permiso específico | Detallada individual | Registro individual | Sí, solo bajo alcance sensible | `feedback:read:detail` | No por query | No | Ruta implementada y pendiente de habilitación operativa; actualmente responde `501 operational_read_not_enabled` tras autenticación base y validación de parámetros. |
| `GET` | `/api/v1/retroalimentacion/resumen` | Resumen agregado oficial | Consumidor interno analítico, consumidor externo autorizado con alcance agregado | Agregada | Métricas consolidadas | No por defecto | `feedback:read:summary` | Sí | No | Ruta implementada y pendiente de habilitación operativa; actualmente responde `501 operational_read_not_enabled` tras autenticación base y validación de parámetros. |

### Endpoints analíticos futuros opcionales

| Método | Ruta | Propósito | Perfil recomendado | Observación de diseño |
|---|---|---|---|---|
| `GET` | `/api/v1/retroalimentacion/distribuciones` | Distribuciones especializadas para analítica | Consumidor interno analítico | Recomendado como endpoint analítico interno; no es necesario para integraciones generales. |
| `GET` | `/api/v1/retroalimentacion/panel` | Superficie compuesta para panel operativo | Consumidor interno analítico | Recomendado como endpoint de composición interna; no es la primera opción para integraciones externas. |

Decisión de diseño:

- La superficie oficial mínima debe centrarse en listado, detalle y resumen.
- Las superficies de panel y distribuciones pueden mantenerse como endpoints analíticos orientados a operación interna.

## Contratos JSON oficiales

### Estado HTTP actual de la implementación inicial

La implementación inicial versionada no se encuentra habilitada para lectura operativa mientras permanezca pendiente la integración de autorización por alcance y ámbito autorizado.

Para solicitudes autenticadas válidas, las rutas versionadas responden actualmente con el siguiente error formal:

    {
      "error": {
        "code": "operational_read_not_enabled",
        "message": "La superficie versionada de retroalimentación requiere integración de autorización por alcance y ámbito autorizado antes de habilitar la lectura operativa.",
        "details": {
          "surface": "/api/v1/retroalimentacion",
          "pending_integration": "authorization_scope_and_authorized_scope"
        }
      },
      "request_id": "req_01HXYZ..."
    }

## Listado versionado

Ruta:

- `GET /api/v1/retroalimentacion`

Contrato de datos preparado para la habilitación operativa:

    {
      "data": [
        {
          "registro_uid": "estado_animo:8f3b...",
          "tipo": "estado_animo",
          "created_at": "2026-05-03T16:20:00.000Z",
          "empresa_id": "c1a2...",
          "empresa_nombre": "Empresa SAC",
          "establecimiento_id": "loc-01",
          "establecimiento_nombre": "Sucursal Centro",
          "modulo": "ventas",
          "valor_principal": "feliz",
          "puntaje": null,
          "estado_animo": "feliz"
        }
      ],
      "meta": {
        "api_version": "v1",
        "generated_at": "2026-05-03T18:00:00.000Z",
        "request_id": "req_01HXYZ...",
        "scope_profile": "authenticated_sanitized"
      },
      "filters": {
        "tipo": "estado_animo",
        "empresa_id": null,
        "establecimiento_id": null,
        "modulo": null,
        "desde": "2026-05-01",
        "hasta": "2026-05-03",
        "usuario_id": null,
        "incluir_sensibles": false,
        "ordenar_por": "created_at",
        "direccion": "desc"
      },
      "pagination": {
        "pagina": 1,
        "tamano": 20,
        "total": 153,
        "total_paginas": 8,
        "ordenar_por": "created_at",
        "direccion": "desc"
      }
    }

Reglas del contrato preparado:

- `data`: colección de registros.
- `meta`: metadatos de la respuesta.
- `filters`: eco normalizado de filtros aplicados.
- `pagination`: estado de paginación y orden.

## Detalle versionado

Ruta:

- `GET /api/v1/retroalimentacion/{registro_uid}`

Contrato de datos preparado para la habilitación operativa:

    {
      "data": {
        "registro_uid": "idea:12ab...",
        "tipo": "idea",
        "created_at": "2026-05-03T15:00:00.000Z",
        "empresa_id": "c1a2...",
        "empresa_nombre": "Empresa SAC",
        "establecimiento_id": "loc-01",
        "establecimiento_nombre": "Sucursal Centro",
        "modulo": "inventario",
        "valor_principal": "Quiero una búsqueda más rápida",
        "puntaje": null,
        "estado_animo": null
      },
      "meta": {
        "api_version": "v1",
        "generated_at": "2026-05-03T18:00:00.000Z",
        "request_id": "req_01HXYZ...",
        "scope_profile": "authenticated_sanitized"
      }
    }

Reglas del contrato preparado:

- `data`: registro individual.
- `meta`: metadatos de trazabilidad de la respuesta.

## Resumen versionado

Ruta:

- `GET /api/v1/retroalimentacion/resumen`

Contrato de datos preparado para la habilitación operativa:

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
        "scope_profile": "authenticated_summary"
      },
      "filters": {
        "tipo": null,
        "empresa_id": null,
        "establecimiento_id": null,
        "modulo": null,
        "desde": "2026-05-01",
        "hasta": "2026-05-03",
        "usuario_id": null,
        "incluir_sensibles": false
      }
    }

Reglas del contrato preparado:

- `data`: agregado de negocio.
- `meta`: metadatos de respuesta.
- `filters`: eco normalizado de filtros agregados.

## Error estándar

Forma de respuesta:

    {
      "error": {
        "code": "operational_read_not_enabled",
        "message": "La superficie versionada de retroalimentación requiere integración de autorización por alcance y ámbito autorizado antes de habilitar la lectura operativa.",
        "details": {
          "surface": "/api/v1/retroalimentacion",
          "pending_integration": "authorization_scope_and_authorized_scope"
        }
      },
      "request_id": "req_01HXYZ..."
    }

Reglas del contrato:

- `error.code`: código estable y machine-readable.
- `error.message`: mensaje legible y apto para integración.
- `error.details`: objeto opcional con contexto adicional no sensible.
- `request_id`: identificador opcional pero recomendado para trazabilidad operativa.

## Modelo de campos

### Campos base permitidos para integración general

- `registro_uid`
- `tipo`
- `created_at`
- `empresa_id`
- `empresa_nombre`
- `establecimiento_id`
- `establecimiento_nombre`
- `modulo`
- `valor_principal`
- `puntaje`
- `estado_animo`

Observación:

- Aunque algunos campos base tienen sensibilidad contextual en ciertos escenarios, esta categoría representa la superficie mínima de negocio prevista para integraciones generales.

### Campos sensibles de acceso restringido

- `usuario_id`
- `usuario_nombre`
- `usuario_correo`
- `empresa_ruc`
- `empresa_razon_social`
- `ruta`
- `detalle`

### Campos internos o no recomendados para integraciones externas

- Cualquier metadato operativo que no sea necesario para el caso de uso del consumidor.
- Cualquier campo que revele navegación interna, trazabilidad de interfaz o contenido libre sin necesidad justificada.
- Cualquier expansión futura que combine PII y texto libre fuera de un propósito administrativo explícito.

## Perfiles de consumidor y exposición de campos

| Perfil | Descripción | Campos base | Campos sensibles | Observaciones |
|---|---|---|---|---|
| Consumidor interno administrativo | Superficie operativa con privilegios de revisión y auditoría | Sí | Sí, con alcance explícito | Requiere control de rol y scope sensible. |
| Consumidor interno analítico | Superficie de análisis y visualización agregada | Sí | No por defecto | Debe preferir resumen y distribuciones agregadas. |
| Consumidor externo autorizado | Integración formal con datos necesarios de negocio | Sí | No por defecto | Debe recibir contrato sanitizado. |
| Consumidor externo con datos sanitizados | Integración con mínimo dato necesario | Sí, con posible subconjunto | No | Recomendado para integraciones de menor confianza o mayor alcance. |

Regla recomendada:

- `incluir_sensibles=true` solo debe aceptarse con `feedback:read:sensitive` o `feedback:admin`.

## Modelo objetivo de autenticación y autorización

## Autenticación

La API oficial debe estandarizar el acceso mediante:

- `Authorization: Bearer <access_token>`

Modelos admitidos de principal autenticado:

1. Usuario autenticado interactivo.
2. Aplicación interna autenticada mediante token de aplicación.
3. Integración service-to-service autenticada mediante token de servicio emitido por una capa de identidad o gateway.

Lineamiento recomendado:

- Si se incorporan API keys, deben utilizarse como mecanismo de identificación o provisionamiento en una capa de gateway o broker de identidad, no como sustituto directo del bearer token con scopes.

## Autorización

La autorización de la API oficial debe combinar:

- scopes funcionales,
- rol administrativo cuando aplique,
- control por empresa o tenant,
- perfil del consumidor,
- política de exposición de campos sensibles.

Scopes propuestos:

Los scopes definidos a continuación corresponden al modelo objetivo y no se encuentran integrados en la implementación inicial versionada actual.

| Scope | Permiso |
|---|---|
| `feedback:read` | Permite consultar el listado oficial con campos base dentro del ámbito autorizado. |
| `feedback:read:summary` | Permite consultar resúmenes agregados sin exposición de campos sensibles. |
| `feedback:read:detail` | Permite consultar el detalle oficial de un registro con campos base. |
| `feedback:read:sensitive` | Permite acceder a campos sensibles y filtros restringidos. |
| `feedback:admin` | Permite operación administrativa ampliada, incluyendo consulta transversal según políticas internas. |

Reglas de autorización recomendadas:

1. Un token sin scopes de feedback no debe acceder a la API.
2. Un token con `feedback:read` debe quedar restringido a su empresa o tenant autorizado.
3. Un token con `feedback:read:summary` debe poder acceder a agregados sin PII.
4. Un token con `feedback:read:detail` puede consultar detalle, pero no necesariamente campos sensibles.
5. Un token con `feedback:read:sensitive` habilita campos sensibles y filtros restringidos.
6. `feedback:admin` habilita operación ampliada, siempre bajo control organizacional y trazabilidad.

## Control por empresa o tenant

El diseño oficial debe contemplar control por ámbito de datos.

Opciones válidas de diseño:

- Derivar empresas permitidas desde claims del token.
- Resolver empresas permitidas desde una tabla o servicio interno de autorización.
- Exigir `empresa_id` en tokens de aplicación no administrativos.

Reglas recomendadas:

1. Para tokens de usuario, la API debe resolver su ámbito permitido antes de consultar datos.
2. Para tokens de aplicación no administrativos, `empresa_id` debe ser obligatorio o derivarse del principal autenticado.
3. Para `feedback:admin`, el acceso transversal debe quedar auditado y limitado a casos administrativos.

## Estrategia de seguridad

### Principios

- La lectura debe permanecer exclusivamente server-side.
- El service role debe permanecer únicamente en backend.
- Ningún consumidor debe leer Supabase de forma directa para esta integración.
- La API debe devolver solo los campos coherentes con el perfil y scope del consumidor.

### CORS

Política recomendada:

- Si el consumo será exclusivamente server-to-server, CORS puede mantenerse deshabilitado o no expuesto.
- Si existirá consumo browser cross-origin, debe implementarse allowlist explícita de orígenes confiables.
- No debe habilitarse `*` para una superficie que puede exponer PII o datos operativos sensibles.

### Preferencia de consumo

- Para integraciones externas, la opción preferida debe ser server-to-server.
- El consumo desde navegador externo debe reservarse para casos con requerimiento claro, CORS controlado y scopes limitados.

### Rate limiting

La API oficial debe contemplar:

- límites por principal autenticado,
- límites por aplicación,
- límites por IP cuando corresponda,
- protección diferenciada para endpoints de detalle y endpoints agregados.

### Logs y auditoría

La implementación posterior debe incluir:

- `request_id` por request,
- principal autenticado,
- scopes aplicados,
- empresa o tenant resuelto,
- endpoint invocado,
- resultado HTTP,
- códigos de error,
- métricas de latencia y volumen.

### Protección de PII

La API oficial debe soportar respuesta sanitizada por defecto.

Reglas recomendadas:

1. Los campos sensibles no deben devolverse salvo autorización explícita.
2. Los textos libres deben evaluarse como sensibles por defecto.
3. El detalle debe quedar particularmente restringido si incluye texto libre o trazabilidad interna.

## Filtros y paginación oficiales

Filtros previstos para la habilitación operativa:

- `tipo`
- `empresa_id`
- `establecimiento_id`
- `modulo`
- `desde`
- `hasta`
- `usuario_id`, solo con scopes internos sensibles
- `incluir_sensibles=true`, solo con scope sensible o administrativo
- `pagina`
- `tamano`
- `ordenar_por`
- `direccion`

### Reglas de filtros

| Filtro | Disponibilidad | Observación |
|---|---|---|
| `tipo` | General | Valores permitidos: `estado_animo`, `idea`, `calificacion`. |
| `empresa_id` | General | Debe respetar el ámbito resuelto del token. |
| `establecimiento_id` | General | Subconjunto de empresa. |
| `modulo` | General | Filtro funcional. |
| `desde` | General | Formato `YYYY-MM-DD`. |
| `hasta` | General | Formato `YYYY-MM-DD`. |
| `usuario_id` | Restringido | Solo con scope sensible o administrativo. |
| `incluir_sensibles` | Restringido | Solo cuando el principal tenga permiso de datos sensibles. |
| `pagina` | General | Paginación basada en página. |
| `tamano` | General | Sujeto a límites oficiales. |
| `ordenar_por` | General | Solo campos permitidos. |
| `direccion` | General | `asc` o `desc`. |

### Paginación oficial

Valores recomendados:

- `pagina` por defecto: `1`
- `tamano` por defecto: `20`
- `tamano` máximo: `100`

Campos de ordenamiento permitidos:

- `created_at`
- `tipo`
- `empresa_nombre`
- `establecimiento_nombre`
- `modulo`
- `puntaje`

Direcciones permitidas:

- `asc`
- `desc`

## Errores estándar

| HTTP | Código | Significado |
|---|---|---|
| `401` | `unauthorized` | No existe autenticación válida o el bearer token es inválido. |
| `403` | `forbidden` | El principal autenticado no está autorizado para el recurso solicitado. |
| `403` | `invalid_scope` | El token no incluye el scope requerido. |
| `400` | `invalid_filter` | Uno o más filtros no cumplen el contrato esperado. |
| `400` | `invalid_pagination` | Los parámetros de paginación u orden son inválidos. |
| `404` | `not_found` | El recurso solicitado no existe o no está disponible para el principal autenticado. |
| `429` | `rate_limited` | El consumidor excedió la cuota permitida. |
| `500` | `internal_error` | Error interno no controlado. |
| `501` | `operational_read_not_enabled` | La superficie versionada permanece pendiente de integración de autorización por alcance y ámbito autorizado antes de habilitar lectura operativa. |
| `503` | `service_unavailable` | Dependencia temporalmente no disponible. |

Lineamiento adicional:

- Toda respuesta de error debería incluir `request_id` cuando exista trazabilidad disponible.

## Relación con Supabase

Lineamientos obligatorios para la implementación posterior:

- La API oficial debe leer desde `public.v_retroalimentacion_unificada` o desde una vista o capa interna equivalente con contrato estable.
- La lectura debe resolverse exclusivamente server-side.
- El service role debe permanecer solo en backend.
- No debe entregarse acceso directo a Supabase a consumidores de integración.
- Si se requiere sanitización adicional, podrá resolverse mediante una transformación server-side o mediante una vista complementaria orientada a contrato.

Decisión de diseño recomendada:

- Mantener `public.v_retroalimentacion_unificada` como fuente canónica de datos mientras la estructura siga siendo estable.
- Resolver sanitización y políticas de exposición en la capa de API oficial.

## Compatibilidad con PM Portal

La transición debe preservar la operación actual del portal.

Reglas de transición controlada:

1. PM Portal debe continuar funcionando con `/api/retroalimentacion/*` hasta validar la nueva API.
2. La nueva API `/api/v1/*` debe incorporarse en paralelo.
3. El portal debe migrarse solo después de validar contrato, seguridad, observabilidad y performance.
4. Durante la transición, ambas superficies pueden coexistir.
5. Los endpoints actuales no deben retirarse hasta confirmar ausencia de consumidores activos.

## Documentación para integradores una vez habilitada la lectura operativa

La entrega a un integrador deberá publicarse únicamente cuando la lectura operativa quede habilitada con autorización por alcance y ámbito autorizado. En ese momento deberá incluir, como mínimo:

- Base URL del ambiente correspondiente.
- Lista de endpoints habilitados.
- Headers requeridos.
- Modelo de autenticación.
- Scopes disponibles.
- Reglas de control por empresa o tenant.
- Filtros soportados.
- Límites de paginación y rate limiting.
- Ejemplos de request y response.
- Códigos de error.
- Reglas de privacidad y exposición de datos.
- Contacto operativo o canal de soporte.
- Ambiente de prueba o validación, cuando exista.

### Ejemplo de request para integradores

  GET /api/v1/retroalimentacion?tipo=idea&pagina=1&tamano=20&ordenar_por=created_at&direccion=desc
    Authorization: Bearer <access_token>
    Accept: application/json

### Headers esperados

- `Authorization: Bearer <access_token>`
- `Accept: application/json`
- Opcionalmente `X-Request-Id` si la plataforma de entrada lo soporta.

## Estrategia de implementación posterior

Secuencia recomendada:

1. Formalizar principal autenticado y scopes.
2. Incorporar control por empresa o tenant.
3. Incorporar exposición autorizada de campos sensibles.
4. Añadir observabilidad, request_id enriquecido y rate limiting.
5. Validar seguridad y performance.
6. Integrar pruebas de contrato.
7. Migrar PM Portal de forma controlada.
8. Retirar la superficie anterior solo cuando la migración y el monitoreo estén cerrados.

## Checklist de pendientes para implementación

- [ ] Definir el principal autenticado oficial para usuarios y aplicaciones.
- [ ] Definir emisión y validación de scopes.
- [ ] Definir estrategia definitiva de control por empresa o tenant.
- [ ] Definir contrato JSON final y ejemplos oficiales.
- [ ] Definir política de sanitización por perfil de consumidor.
- [ ] Definir CORS para consumo browser externo, si aplica.
- [ ] Implementar rate limiting.
- [ ] Implementar request_id y observabilidad.
- [ ] Incorporar pruebas de contrato.
- [ ] Validar performance del listado, detalle y resumen.
- [ ] Planificar la migración progresiva de PM Portal.

## Relación documental con la API interna actual

- La operación actual de retroalimentación, su fuente de datos y el consumo actual desde PM Portal se documentan en [docs/retroalimentacion-senciyo-pm-portal.md](docs/retroalimentacion-senciyo-pm-portal.md).
- Este documento define exclusivamente la arquitectura objetivo de la futura API oficial versionada.