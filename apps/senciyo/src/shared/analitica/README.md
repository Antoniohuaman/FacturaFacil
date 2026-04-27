# Arquitectura de analítica SenciYo (frontend)

Esta carpeta centraliza la capa analítica del frontend de SenciYo para eventos de producto, identidad analítica y política común de payloads.

## Objetivo

- Centralizar los wrappers de eventos de negocio.
- Mantener separada la identidad analítica del disparo de eventos.
- Unificar las propiedades globales que se envían a proveedores.
- Documentar explícitamente qué proveedor recibe qué información.

## Principios

- Registrar hitos de negocio, no clicks sueltos ni telemetría accidental.
- No capturar eventos desde localhost ni desde desarrollo.
- Normalizar el payload wire a snake_case.
- Mantener variantes de negocio como propiedades, no como nombres de eventos nuevos.
- No enviar PII ni datos sensibles innecesarios.
- Mantener los eventos técnicos fuera del contrato principal de KPI.

## Archivos de la carpeta

- `analitica.ts`: wrappers, propiedades globales, identidad por proveedor y captura común.
- `identidadAnalitica.ts`: resolución del contexto analítico desde auth, sesión y tenant.
- `AnalyticsIdentitySync.tsx`: sincronización reactiva entre el shell privado y la identidad analítica.
- `eventosAnalitica.ts`: reexport del contrato de eventos y tipos locales del frontend.
- `README.md`: referencia técnica de la arquitectura actual.

## Proveedores

- PostHog: recibe solo eventos del contrato principal de negocio/KPI y eventos internos de identidad (`$identify`, `$groupidentify`).
- Amplitude: recibe eventos de negocio y eventos técnicos que pasan por `registrarEventoTecnico`.
- Mixpanel: recibe eventos de negocio y eventos técnicos que pasan por `registrarEventoTecnico`.
- Amplitude Session Replay: solo captura replay de sesión; no define eventos de negocio propios.

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
- `user_status`
- `entorno`
- `entorno_emision`
- `entorno_sunat`

## Propiedades específicas por evento

- `flujo_venta_abandonado`: `origen_venta`, `motivo_abandono?`
- `comprobante_estado_actualizado`: `estado`, `tipo_comprobante?`, `forma_pago?`, `origen_venta?`
- `ayuda_consultada`: `tipo_ayuda`, `origen`
- `borrador_accion_realizada`: `accion`, `origen_venta?`
- `venta_completada`: `entorno`, `origen_venta`, `forma_pago?`
- `primera_venta_completada`: `entorno`, `origen_venta`, `forma_pago?`
- `producto_creado_exitoso`: `entorno`, `origen`
- `cliente_creado_exitoso`: `entorno`, `origen`
- `importacion_completada`: `entorno`, `entidad`, `resultado`, `errores_rango`
- `movimiento_caja_registrado`: `origen`, `tipo_movimiento?`
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
- Valor recomendado de ejemplo: `0`, para evitar captura accidental al copiar `.env.example`.
- Selectores soportados por configuración:
	- `.amp-mask`
	- `.amp-block`
	- `[data-private]`
	- `[data-sensitive]`
	- `.amp-unmask`
- Si se agregan nuevos puntos sensibles en UI, deben marcarse explícitamente en DOM antes de elevar el sample rate.

## Entorno y no-op

- PostHog, Amplitude, Mixpanel y Session Replay quedan bloqueados en localhost y desarrollo.
- Si un proveedor no está habilitado por entorno o credenciales, la capa continúa sin romper el flujo del usuario.

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
