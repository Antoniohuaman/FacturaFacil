# Auditoria de completitud de la API oficial v1 de retroalimentacion para dashboard

Fecha de revision: 2026-05-04

## Resumen ejecutivo

La API oficial v1 de retroalimentacion ya esta completa para que PM Portal u otra aplicacion autorizada construya un dashboard read-only completo.

La superficie oficial vigente queda cerrada en estas cuatro rutas:

- `GET /api/v1/retroalimentacion/resumen`
- `GET /api/v1/retroalimentacion/panel`
- `GET /api/v1/retroalimentacion/registros`
- `GET /api/v1/retroalimentacion/registros/{registro_uid}`

Con esas cuatro rutas ya se cubren KPIs, agregados, distribuciones, series, tabla paginada, detalle puntual y exportacion basada en recorrido del listado paginado.

La unica cautela real no es de endpoints faltantes, sino de operacion y contrato:

- `panel` depende de `FEEDBACK_API_V1_PANEL_ENABLED=true`.
- La API oficial v1 no replica deliberadamente todos los filtros de texto libre de la API interna actual.

## Cobertura por necesidad del dashboard

### KPIs y resumen ejecutivo

Quedan cubiertos con `resumen` y `panel`.

Datos ya disponibles:

- `total_registros`
- `totales_por_tipo`
- `promedio_calificacion`
- `distribucion_estado_animo`
- `cantidad_ideas`
- `serie_diaria`

Conclusion: no hace falta un endpoint adicional de `metricas`, `kpis` o `series`.

### Graficos y distribuciones

Quedan cubiertos por `GET /api/v1/retroalimentacion/panel`.

Distribuciones ya disponibles dentro de `panel`:

- `data.distribuciones.por_tipo`
- `data.distribuciones.por_modulo`
- `data.distribuciones.puntajes`
- `data.distribuciones.estados_animo`
- `data.distribuciones.serie_diaria`

Conclusion: no hace falta crear `GET /api/v1/retroalimentacion/distribuciones`.

### Tabla de registros

Queda cubierta por `GET /api/v1/retroalimentacion/registros`.

Capacidades ya disponibles:

- paginacion
- ordenamiento
- tamano maximo de 100
- filtros estructurados
- retorno base sin PII por defecto
- retorno enriquecido con `incluir_sensibles=true` solo con scope valido

Conclusion: no hace falta crear un endpoint adicional para tabla o listado extendido.

### Detalle modal por registro

Queda cubierto por `GET /api/v1/retroalimentacion/registros/{registro_uid}`.

Ese endpoint ya resuelve la lectura puntual del registro y permite campos sensibles solo cuando el consumidor tiene el scope correspondiente.

Conclusion: no hace falta crear `GET /api/v1/retroalimentacion/detalle`, ni aliases raiz como `GET /api/v1/retroalimentacion/{registro_uid}`.

### Exportacion

La exportacion ya queda resuelta consumiendo `GET /api/v1/retroalimentacion/registros` paginado e iterando todas las paginas.

Eso no es teorico: PM Portal hoy ya resuelve la exportacion de esa forma en la superficie interna actual, recorriendo todas las paginas del listado antes de construir el Excel.

Conclusion: no hace falta crear `GET /api/v1/retroalimentacion/exportacion`.

### Filtros utiles para dashboard

La API oficial v1 ya soporta estos filtros estructurados:

- `tipo`
- `empresa_id`
- `establecimiento_id`
- `modulo`
- `desde`
- `hasta`
- `puntaje`
- `estado_animo`
- `usuario_id` solo con `feedback:filter:user`

Conclusion: para dashboard analitico, los filtros actuales son suficientes.

### Multiempresa y consumidores globales

La API oficial v1 ya soporta el modelo correcto para consumidores administrativos globales mediante:

- `tenant_access: "restricted"`
- `tenant_access: "all"`

Ademas:

- `allowed_empresa_ids: ["*"]` es invalido
- `tenant_access: "all"` evita enumerar empresas actuales y futuras
- `resumen` y `panel` pueden agregar globalmente cuando no se envia `empresa_id`
- `registros` y `registros/{registro_uid}` pueden operar globalmente para consumidores `all`

Conclusion: no hace falta crear endpoints adicionales por empresa para resolver dashboards administrativos globales.

## Endpoints actuales

### `GET /api/v1/retroalimentacion/resumen`

Sirve para resumen agregado oficial.

Cobertura:

- tarjetas de totales
- promedio
- estado dominante
- serie diaria agregada

### `GET /api/v1/retroalimentacion/panel`

Sirve para KPIs y distribuciones agregadas del dashboard.

Cobertura:

- resumen consolidado
- distribuciones por tipo
- distribuciones por modulo
- distribucion de puntajes
- distribucion de estados de animo
- serie diaria

### `GET /api/v1/retroalimentacion/registros`

Sirve para listado paginado oficial.

Cobertura:

- tabla principal
- paginacion
- ordenamiento
- exportacion por iteracion de paginas
- acceso opcional a campos sensibles bajo scope

### `GET /api/v1/retroalimentacion/registros/{registro_uid}`

Sirve para detalle oficial por `registro_uid`.

Cobertura:

- modal de detalle
- consulta puntual por registro
- lectura enriquecida bajo scope sensible

## Endpoints que NO se deben crear

No se deben crear ahora estos endpoints, porque la necesidad ya queda resuelta con la superficie actual:

- `GET /api/v1/retroalimentacion/exportacion`
- `GET /api/v1/retroalimentacion/distribuciones`
- `GET /api/v1/retroalimentacion/metricas`
- `GET /api/v1/retroalimentacion/kpis`
- `GET /api/v1/retroalimentacion/series`
- `GET /api/v1/retroalimentacion/detalle`
- `GET /api/v1/retroalimentacion/{registro_uid}`
- `GET /api/v1/retroalimentacion`
- `GET /api/v1/retroalimentacion/usuarios`
- `GET /api/v1/retroalimentacion/empresas`
- `GET /api/v1/retroalimentacion/modulos`

Motivos:

- exportacion ya se resuelve con `registros` paginado
- distribuciones ya vienen dentro de `panel`
- KPIs y metricas ya salen de `resumen` y `panel`
- detalle ya existe mediante `registros/{registro_uid}`
- la superficie oficial ya fue cerrada deliberadamente en 4 rutas
- usuarios, empresas y modulos no son una brecha real del dashboard de retroalimentacion v1

## Brechas reales, si existen

No hay una brecha real de endpoint para construir el dashboard.

Las brechas reales son estas:

### 1. Habilitacion operativa del panel

Si `FEEDBACK_API_V1_PANEL_ENABLED` no esta en `true`, el endpoint `panel` responde `501 operational_read_not_enabled`.

Esto no implica que falte un endpoint. Implica que la ruta existente esta gateada operativamente.

### 2. Scopes insuficientes para campos sensibles

Si la aplicacion necesita:

- `usuario_nombre`
- `usuario_correo`
- `empresa_nombre`
- `empresa_ruc`
- `empresa_razon_social`
- `ruta`
- `valor_principal`
- `detalle`

entonces necesita `feedback:read:sensitive` y debe usar `incluir_sensibles=true` en `registros` o `registros/{registro_uid}`.

Esto no implica endpoint faltante. Implica perfil de autorizacion insuficiente si el consumidor no tiene esos scopes.

### 3. No hay paridad 1:1 con la API interna actual

PM Portal hoy sigue consumiendo `/api/retroalimentacion/*` y esa superficie interna todavia acepta filtros de texto libre como `empresa`, `usuario` y `ruta`.

La API oficial v1 no replica deliberadamente esa amplitud. En v1 el contrato queda mas estrecho y estructurado.

Esto tampoco implica endpoint faltante para dashboard. Solo implica que una migracion futura de PM Portal a v1 requeriria adaptar parte de la UX si hoy depende de esos filtros libres.

## Veredicto

La API oficial v1 de retroalimentacion ya esta completa para construir un dashboard completo read-only.

Las 4 rutas actuales son suficientes.

No hace falta crear ningun endpoint adicional en este momento.

La conclusion estricta es:

- no falta `exportacion`
- no falta `distribuciones`
- no falta `metricas`
- no falta `kpis`
- no falta `detalle`
- no falta `usuarios`
- no falta `empresas`
- no falta `modulos`

Lo unico que puede bloquear el uso real es:

- la feature flag de `panel`
- la falta de scopes correctos
- una expectativa de paridad completa con la UX interna actual

Ninguno de esos tres puntos se resuelve creando endpoints nuevos.

## Fuentes revisadas

- `functions/api/_autorizacion.ts`
- `functions/api/_retroalimentacion_v1.ts`
- `functions/api/v1/retroalimentacion/resumen.ts`
- `functions/api/v1/retroalimentacion/panel.ts`
- `functions/api/v1/retroalimentacion/registros.ts`
- `functions/api/v1/retroalimentacion/registros/[registro_uid].ts`
- `docs/api-retroalimentacion.md`
- `docs/retroalimentacion-senciyo-pm-portal.md`
- `apps/pm-portal/src/presentacion/paginas/analitica/retroalimentacion/PaginaRetroalimentacion.tsx`
- `apps/pm-portal/src/presentacion/paginas/analitica/retroalimentacion/ModalDetalleRetroalimentacion.tsx`
- `apps/pm-portal/src/presentacion/paginas/analitica/retroalimentacion/exportarRetroalimentacionExcel.ts`
- `apps/pm-portal/src/aplicacion/casos-uso/retroalimentacion.ts`
- `apps/pm-portal/src/infraestructura/repositorios/repositorioRetroalimentacion.ts`
- `apps/pm-portal/src/infraestructura/apis/clienteApiPortalPM.ts`