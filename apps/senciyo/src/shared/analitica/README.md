# Arquitectura de analítica SenciYo (frontend)

Esta carpeta centraliza la capa analítica del frontend de SenciYo para eventos de producto, identidad analítica y política común de payloads.
La implementación actual mantiene operativo el prototipo funcional y deja la base preparada para migración al repositorio oficial con backend real.

## Objetivo

- Centralizar los wrappers de eventos de negocio.
- Mantener separada la identidad analítica del disparo de eventos.
- Unificar las propiedades globales que se envían a proveedores.
- Documentar explícitamente qué proveedor recibe qué información.

## Principios

- Registrar hitos de negocio, no clicks sueltos ni telemetría accidental.
- Mantener a Amplitude como proveedor principal de producto.
- Tratar PostHog y Mixpanel como proveedores compatibles y opcionales.
- No capturar eventos desde localhost ni desde desarrollo.
- No activar proveedores por variables vacías, con espacios o placeholders booleanos.
- Normalizar el payload wire a snake_case.
- Mantener variantes de negocio como propiedades, no como nombres de eventos nuevos.
- No enviar PII ni datos sensibles innecesarios.
- Mantener los eventos técnicos fuera del contrato principal de KPI.

## Archivos de la carpeta

- `configuracionAnalitica.ts`: normalización común de variables públicas, guards de entorno y sample rate de replay.
- `analitica.ts`: wrappers, propiedades globales, identidad por proveedor y captura común.
- `identidadAnalitica.ts`: resolución del contexto analítico desde auth, sesión y tenant.
- `AnalyticsIdentitySync.tsx`: sincronización reactiva entre el shell privado y la identidad analítica.
- `eventosAnalitica.ts`: reexport del contrato de eventos y tipos locales del frontend.
- `README.md`: referencia técnica de la arquitectura actual.

## Proveedores

- Amplitude: proveedor principal. Recibe eventos de negocio, eventos técnicos que pasan por `registrarEventoTecnico` y Session Replay si se habilita.
- PostHog: proveedor compatible/secundario. Recibe solo eventos del contrato principal de negocio/KPI y eventos internos de identidad (`$identify`, `$groupidentify`).
- Mixpanel: proveedor compatible/secundario. Recibe eventos de negocio y eventos técnicos que pasan por `registrarEventoTecnico`.
- Amplitude Session Replay: solo captura replay de sesión; no define eventos de negocio propios.

## Estado operativo del prototipo funcional

- Este repo es un prototipo funcional. La analítica sigue activa para validar eventos reales del uso actual sin convertir estos flujos en una verdad definitiva de backend.
- `primera_venta_completada` sigue activo en emisión y punto de venta, pero hoy se deduplica por `sessionStorage` del navegador. En el repositorio oficial debe depender de una verdad persistente por empresa/establecimiento.
- `comprobante_estado_actualizado` con `estado = aceptado` sigue activo para validar el flujo actual, pero hoy se origina en la transición mock `Enviado -> Aceptado` del frontend. En el repositorio oficial debe salir de una confirmación real de backend/OSE.
- `caja_abierta_exitoso`, `movimiento_caja_registrado` y `caja_cerrada_exitoso` siguen activos, pero hoy salen de un flujo de caja simulado. En el repositorio oficial deben reconectarse a resultados persistidos.
- `producto_creado_exitoso` e `importacion_completada` con `entidad = productos` siguen activos para validar adopción del catálogo del prototipo, pero hoy dependen de store/local persistence. En el repositorio oficial deben reconectarse a persistencia real.

## Qué recibe cada proveedor

### PostHog

- Eventos de negocio definidos en `EVENTOS_ANALITICA`.
- Eventos internos de identidad/grupo permitidos por `before_send`.
- No recibe eventos técnicos de retroalimentación (`retroalimentacion_*`).

### Amplitude

- Eventos de negocio.
- Eventos técnicos disparados mediante `registrarEventoTecnico`.
- Identidad de usuario (`setUserId`, `identify`) y grupo `company`.
- Session Replay mediante el plugin oficial.

### Mixpanel

- Eventos de negocio.
- Eventos técnicos disparados mediante `registrarEventoTecnico`.
- Identidad de usuario y superprops analíticas compartidas.

### Amplitude Session Replay

- Solo replay visual de sesión.
- No captura en localhost ni en desarrollo.
- Su sample rate depende de `VITE_PUBLIC_AMPLITUDE_SESSION_REPLAY_SAMPLE_RATE`.

## Eventos disponibles

- `registro_usuario_completado`
- `registro_empresa_exitoso`
- `inicio_sesion_exitoso`
- `caja_abierta_exitoso`
- `movimiento_caja_registrado`
- `caja_cerrada_exitoso`
- `flujo_venta_abandonado`
- `comprobante_estado_actualizado`
- `ayuda_consultada`
- `borrador_accion_realizada`
- `venta_completada`
- `primera_venta_completada`
- `producto_creado_exitoso`
- `cliente_creado_exitoso`
- `importacion_completada`

## Eventos técnicos

Los eventos `retroalimentacion_*` no forman parte del contrato principal de negocio en `packages/analytics-events`.

- Se disparan vía `registrarEventoTecnico`.
- Se mantienen separados para no mezclar feedback operativo con KPI principales.
- PostHog los ignora de forma intencional.
- Amplitude y Mixpanel los reciben actualmente.

## Propiedades globales enviadas

Cuando existe identidad analítica sincronizada, la capa agrega automáticamente:

- `ruta_actual`
- `timestamp_cliente`
- `company_id`
- `company_configured`
- `establecimiento_id`
- `user_role`
- `entorno`

`user_status` se usa hoy en identify/superprops de proveedor, no como propiedad global automática de todos los eventos.

Para analítica de producto, el único entorno enviado es `entorno` y sus únicos valores válidos son `demo` y `produccion`.

La configuración técnica o tributaria interna puede seguir existiendo en el dominio, pero no se expone como propiedad analítica.

## Propiedades específicas por evento

- `flujo_venta_abandonado`: `origen_venta`, `motivo_abandono?`
- `comprobante_estado_actualizado`: `estado`, `tipo_comprobante?`, `forma_pago?`, `origen_venta?`
- `ayuda_consultada`: `tipo_ayuda`, `origen`
- `borrador_accion_realizada`: `accion`, `origen_venta?`
- `venta_completada`: `entorno`, `origen_venta`, `forma_pago?`
- `primera_venta_completada`: `entorno`, `origen_venta`, `forma_pago?` y en el prototipo actual se deduplica por sesión del navegador.
- `producto_creado_exitoso`: `entorno`, `origen` y en el prototipo actual puede salir desde persistencia local/store.
- `cliente_creado_exitoso`: `entorno`, `origen`
- `importacion_completada`: `entorno`, `entidad`, `resultado`, `errores_rango`; para `productos`, hoy puede salir desde persistencia local/store.
- `movimiento_caja_registrado`: `origen`, `tipo_movimiento?` y en el prototipo actual puede salir desde flujo simulado.
- `registro_empresa_exitoso`: `entorno`, `origen`
- `inicio_sesion_exitoso`: `origen`

## Convención de nombres

- Los nombres de eventos permanecen en el contrato compartido.
- Las propiedades enviadas a proveedores deben ir en snake_case.
- Los nombres camelCase pueden existir solo como variables o tipos internos del frontend.

## Privacidad y exclusiones

No se deben enviar en eventos, propiedades globales, identify properties ni superprops:

- RUC
- razón social
- nombre comercial
- nombres personales
- correos electrónicos
- teléfonos
- direcciones
- datos bancarios
- montos o saldos si no son indispensables
- textos libres
- observaciones
- payload tributario

Nota explícita: `company_name` no se envía a proveedores externos.

## Session Replay

- Proveedor: Amplitude.
- Bloqueo local/dev: no se inicializa en localhost ni en desarrollo.
- Sample rate: se controla con `VITE_PUBLIC_AMPLITUDE_SESSION_REPLAY_SAMPLE_RATE`.
- Valores aceptados de referencia: `0` = apagado, `0.05` = 5%, `0.1` = 10%, `1` = 100%.
- Valor recomendado por defecto: `0`, para evitar captura accidental al copiar `.env.example`.
- Selectores soportados por configuración:
	- `.amp-mask`
	- `.amp-block`
	- `[data-private]`
	- `[data-sensitive]`
	- `.amp-unmask`
- Antes de activar Replay en producción, las pantallas sensibles deben marcarse explícitamente en DOM con masking/blocking.
- No eleves el sample rate en producción sin revisar primero privacidad, masking y consumo de cuota.

## Entorno y no-op

- PostHog, Amplitude, Mixpanel y Session Replay quedan bloqueados en localhost y desarrollo.
- Si un proveedor no está habilitado por entorno o credenciales, la capa continúa sin romper el flujo del usuario.
- Si un proveedor falla al inicializar o capturar, la capa aísla el error y los demás proveedores continúan.

## Cómo agregar un evento nuevo

1. Agregar el nombre del evento al contrato compartido en `packages/analytics-events/index.ts` si es un evento principal de negocio.
2. Reexportarlo desde `eventosAnalitica.ts` sin duplicar strings.
3. Crear o extender el wrapper correspondiente en `analitica.ts`.
4. Normalizar el payload final a snake_case.
5. Evitar PII y textos libres.
6. Si es un evento técnico y no un KPI, usar `registrarEventoTecnico` y documentar por qué queda fuera del contrato principal.
7. Actualizar este README cuando cambie el contrato o la política de proveedores.

## Alcance actual

`analitica.ts` sigue concentrando varias responsabilidades del prototipo. Por ahora se mantiene así para minimizar riesgo, pero la referencia oficial futura debería separar con más claridad: proveedores, identidad, captura común y wrappers de negocio.
