# Guía de Migración de Analítica - SenciYo

## 1. Objetivo de la guía

Esta guía está dirigida al desarrollador oficial que migrará o adaptará la analítica de producto de SenciYo al repositorio oficial, sin tratar este repo como una implementación final.

El objetivo no es copiar el frontend actual tal cual, sino reutilizar lo que ya está resuelto:

- contrato de eventos,
- wrapper central,
- política de payloads,
- estrategia de identidad,
- bootstrap de SDKs,
- y criterios de validación por proveedor.

Usa este repo como referencia técnica controlada. No lo uses como plantilla literal de estructura, rutas, stores ni providers. Este repo no es una implementación plug-and-play del repositorio oficial ni debe tratarse como base final de integración.

## 2. Qué se puede reutilizar del repo actual

Se puede reutilizar directamente, o con ajustes mínimos, lo siguiente:

- El contrato KPI compartido en `packages/analytics-events/index.ts`.
- La convención de nombres de eventos y payloads en snake_case.
- La política actual de Amplitude como proveedor principal y de PostHog/Mixpanel como proveedores compatibles y opcionales.
- La idea de un wrapper único de captura en `apps/senciyo/src/shared/analitica/analitica.ts`.
- La separación entre:
  - eventos KPI de negocio,
  - eventos técnicos,
  - identidad analítica,
  - bootstrap de proveedores.
- La normalización central de variables públicas en `apps/senciyo/src/shared/analitica/configuracionAnalitica.ts`.
- La política actual por proveedor:
  - Amplitude recibe KPI y eventos técnicos como proveedor principal.
  - PostHog recibe solo KPI del contrato principal como proveedor compatible/secundario.
  - Mixpanel recibe KPI y eventos técnicos como proveedor compatible/secundario.
- La estrategia de propiedades base por evento:
  - `ruta_actual`
  - `timestamp_cliente`
  - `company_id`
  - `company_configured`
  - `establecimiento_id`
  - `user_role`
  - `entorno`
- La estrategia de identidad por proveedor:
  - `posthog.identify(...)`
  - `posthog.group(...)`
  - `amplitude.setUserId(...)`
  - `amplitude.identify(...)`
  - `amplitude.setGroup(...)`
  - `mixpanel.identify(...)`
  - `mixpanel.register(...)`
- La documentación actual en `README.md` y `TRACKING_PLAN.md` como fuente de referencia.

## 3. Qué no debe copiarse literalmente

No copies literalmente estas partes al repo oficial:

- La forma actual de resolver `company_id` desde `tenantId` o `currentCompanyId` del frontend.
- El montaje actual dentro de `PrivateLayout`, `SessionInitializer`, `UserSessionContext` y `TenantProvider`.
- Los nombres actuales de stores, providers, hooks o rutas.
- Los atajos provisionales del prototipo cuando el repo oficial ya disponga de backend real.
- La persistencia funcional de retroalimentación en Supabase como si fuera parte del tracking KPI.
- La clave legacy `EMPRESA_ID` usada por `http-client.ts`.
- La configuración de Cloudflare Pages tal cual si el repo oficial no es un monorepo con workspaces.
- Los call sites de UI actuales como si sus pantallas fueran equivalentes 1:1 en el repo oficial.

Regla práctica:

- Copia patrones.
- Reescribe integraciones.
- Mapea entidades.
- No repliques acoplamientos del repo actual.

## 4. Archivos principales a revisar

| Archivo | Rol en la migración | Cómo tratarlo |
|---|---|---|
| `packages/analytics-events/index.ts` | Contrato oficial de nombres KPI | Copiar casi directo o recrear exactamente en el repo oficial |
| `apps/senciyo/src/shared/analitica/eventosAnalitica.ts` | Tipos locales de payloads y variantes permitidas | Copiar como base y adaptar si cambian entidades o nombres de dominio |
| `apps/senciyo/src/shared/analitica/analitica.ts` | Wrapper central de captura, propiedades base e identidad por proveedor | Reusar el patrón; no copiar tal cual sin adaptar fuentes de identidad |
| `apps/senciyo/src/shared/analitica/configuracionAnalitica.ts` | Normalización común de envs públicos y guards de entorno | Reusar para evitar habilitaciones accidentales por espacios o placeholders booleanos |
| `apps/senciyo/src/shared/analitica/identidadAnalitica.ts` | Traduce auth/sesión/tenant a contexto analítico | Reescribir contra el modelo real del repo oficial |
| `apps/senciyo/src/shared/analitica/AnalyticsIdentitySync.tsx` | Efecto reactivo que sincroniza identify/reset | Reusar el patrón y adaptar al app shell oficial |
| `apps/senciyo/src/main.tsx` | Bootstrap de PostHog, Amplitude y Session Replay | Reusar lógica de init, guards y filtros; adaptar al punto de arranque real |
| `apps/senciyo/.env.example` | Variables públicas necesarias y sample rate de replay | Usar como plantilla de nombres, no como archivo final |
| `apps/senciyo/src/shared/analitica/README.md` | Explica lo implementado hoy | Usar como referencia técnica |
| `apps/senciyo/src/shared/analitica/TRACKING_PLAN.md` | Define lo futuro y lo que no debe instrumentarse todavía | Usar como lineamiento de producto |
| `apps/senciyo/package.json` | Dependencias reales usadas hoy | Revisar para instalar solo lo que el repo oficial mantendrá |
| `CLOUDFLARE.md` | Configuración de build y variables de entorno del monorepo actual | Usar solo como referencia de despliegue |

## 5. Dependencias necesarias

Estas son las dependencias reales utilizadas hoy para analítica y replay:

| Dependencia | Uso | Obligatoria |
|---|---|---|
| `@amplitude/analytics-browser` | SDK browser de Amplitude | Si se mantiene Amplitude |
| `@amplitude/plugin-session-replay-browser` | Session Replay de Amplitude | Solo si se mantiene replay |
| `posthog-js` | SDK browser de PostHog | Si se mantiene PostHog |
| `@posthog/react` | Provider React de PostHog | Solo si el repo oficial mantiene este patrón React |
| `mixpanel-browser` | SDK browser de Mixpanel | Si se mantiene Mixpanel |
| `@facturafacil/analytics-events` | Contrato compartido de eventos KPI | Recomendado; si no existirá workspace package, recrear módulo equivalente |

Dependencia que no forma parte del core KPI, pero sí del flujo actual de retroalimentación:

| Dependencia | Uso | Obligatoria |
|---|---|---|
| `@supabase/supabase-js` | Persistencia funcional de retroalimentación | Solo si el repo oficial migrará también ese módulo |

## 6. Variables de entorno requeridas

Variables de entorno públicas actuales de analítica:

| Variable | Proveedor / frente | Obligatoria |
|---|---|---|
| `VITE_PUBLIC_POSTHOG_KEY` | PostHog | Si se mantiene PostHog |
| `VITE_PUBLIC_POSTHOG_HOST` | PostHog | Recomendable |
| `VITE_PUBLIC_AMPLITUDE_API_KEY` | Amplitude | Si se mantiene Amplitude |
| `VITE_PUBLIC_AMPLITUDE_SESSION_REPLAY_SAMPLE_RATE` | Session Replay de Amplitude | Solo si se mantiene replay |
| `VITE_PUBLIC_MIXPANEL_TOKEN` | Mixpanel | Si se mantiene Mixpanel |

Variables no core de analytics, pero presentes en el repo actual:

| Variable | Uso | Nota |
|---|---|---|
| `VITE_API_URL` | Backend general | No define tracking por sí misma |
| `VITE_DEV_MODE` | Modo mock / preview | No habilita analytics |
| `VITE_SUPABASE_URL` | Retroalimentación funcional | No es necesaria para el core KPI |
| `VITE_SUPABASE_ANON_KEY` | Retroalimentación funcional | No es necesaria para el core KPI |

Punto operativo importante:

- Las `VITE_*` son build-time.
- Si cambian, el repo oficial debe ejecutar un build nuevo.
- No basta con cambiar la variable sobre un artefacto ya compilado.
- Los placeholders vacíos, con espacios o booleanos (`0`, `1`, `true`, `false`) no deben habilitar proveedores por accidente.
- No actives variables `VITE_PUBLIC_*` productivas en Preview o Staging de Cloudflare Pages salvo decisión explícita, aislamiento claro de datos y verificación operativa del entorno.
- Si Preview o Staging comparten proyecto, llaves o destino de analítica con Producción, el riesgo es contaminar datos productivos aunque el código no haya cambiado.

## 7. Cómo adaptar `user_id`, `company_id` y `establecimiento_id` al modelo real del repo oficial

### `user_id`

Usa el ID canónico del usuario autenticado del backend oficial.

Debe alimentar la identidad del SDK y no depender solo de propiedades de evento:

- `posthog.identify(userId, ...)`
- `amplitude.setUserId(userId)`
- `amplitude.identify(...)`
- `mixpanel.identify(userId)`

Punto importante:

- `user_id` debe configurarse como identidad del SDK mediante `identify` / `setUserId`.
- No asumas que `user_id` deba viajar necesariamente como propiedad explícita en cada evento.
- La trazabilidad principal del usuario debe quedar resuelta por la identidad del proveedor y no por duplicación innecesaria dentro de cada payload.

Regla operativa:

- primero resuelve la identidad del SDK,
- luego decide, solo si aplica, qué propiedades explícitas deben viajar también en el payload.

No dependas de email, username, display name ni device id.

### `company_id`

Usa el ID canónico real de empresa del backend oficial.

Debe alimentar:

- `company_id` como propiedad de evento cuando exista contexto real,
- `posthog.group('company', companyId, ...)`,
- `amplitude.setGroup('company', companyId)`.

No uses un workspace local generado por frontend como identidad final de empresa.

### `establecimiento_id`

Usa el ID activo real de sucursal, establecimiento o unidad operativa equivalente del repo oficial.

Debe incluirse como propiedad de evento cuando ese contexto exista.

No lo conviertas en identidad de usuario ni de empresa.

### Implementación recomendada en el repo oficial

1. Crear un resolver de identidad analítica equivalente al patrón actual.
2. Leer desde la fuente oficial de auth/sesión/contexto activo.
3. Construir un contexto único con:
   - `userId`
   - `userRole`
   - `userStatus`
   - `companyId`
   - `companyConfigured`
   - `establecimientoId`
   - `entorno`
4. Sincronizar ese contexto en un solo lugar reactivo del app shell.
5. Hacer que el wrapper use ese contexto para enriquecer todos los eventos.

## 8. Advertencia obligatoria sobre `company_id`

**Advertencia crítica:**

El `company_id` actual del repo auditado depende del modelo tenant/frontend actual. En la implementación vigente, la resolución cae en `currentCompanyId` y, si eso no existe aún, puede usar el `tenantId` activo del frontend.

Eso sirve como referencia técnica en este repo, pero **no debe asumirse como ID canónico de empresa en el repo oficial**.

Acción obligatoria en migración:

- Reemplazar la fuente actual por el ID real de empresa del backend oficial.
- Validar que ese ID sea estable, persistente y compartido por todos los flujos donde se necesite group/account analytics.

Si esto no se corrige, el riesgo es:

- fragmentación de empresas,
- grupos equivocados en PostHog o Amplitude,
- y dashboards por company contaminados o irreconciliables.

## 9. Advertencia obligatoria sobre eventos de autenticación antes del shell privado

**Advertencia crítica:**

En el repo actual, algunos eventos de autenticación se disparan antes de montar el shell privado donde vive la sincronización reactiva de identidad.

Implicación para la migración:

- `inicio_sesion_exitoso` puede salir antes de que `identify` y `group` ya estén plenamente sincronizados.
- `registro_usuario_completado` también ocurre antes del shell privado, aunque hoy intenta rescatar empresa desde estado tenant disponible.

Acción obligatoria en migración:

- decidir si el repo oficial moverá `identify` más cerca del login exitoso,
- o si esos eventos de auth se enriquecerán explícitamente con el contexto disponible en el propio flujo de autenticación,
- o si se aceptará que esos eventos iniciales salgan con contexto parcial.

No copies estos call sites a ciegas.

## 10. Advertencia obligatoria sobre hardcodes de entorno

**Advertencia crítica:**

El repo actual ya corrige los hardcodes históricos y resuelve `demo | produccion` desde una derivación central con fallback controlado para flujos previos al shell privado.

Acción obligatoria en migración:

- conservar una derivación central de entorno,
- no reintroducir `entorno: 'demo'` ni `entorno: 'produccion'` en callsites concretos,
- y confirmar cuál es la fuente oficial del entorno en el producto real.

Riesgo si no se corrige:

- funnels de activación mal clasificados,
- dashboards mezclando pruebas con operación real,
- cohortes de empresa y usuario con entorno incorrecto.

### 10.1 Eventos provisionales del prototipo que deben reconectarse en el repo oficial

- `primera_venta_completada` hoy sigue activo, pero se deduplica por sesión del navegador en emisión y POS. En el repo oficial debe depender de una verdad persistente por empresa/establecimiento.
- `comprobante_estado_actualizado` con `estado = aceptado` hoy sigue activo, pero nace de la transición mock `Enviado -> Aceptado`. En el repo oficial debe salir de confirmación real de backend/OSE.
- `caja_abierta_exitoso`, `movimiento_caja_registrado` y `caja_cerrada_exitoso` hoy siguen activos para validar el prototipo, pero salen de un flujo simulado. En el repo oficial deben conectarse a persistencia real.
- `producto_creado_exitoso` e `importacion_completada` para `entidad = productos` hoy siguen activos, pero reflejan persistencia local/store del prototipo. En el repo oficial deben conectarse a persistencia real.

Advertencia adicional para Preview, Staging y Cloudflare:

- No asumas que Preview o Staging están protegidos por diseño.
- Si esos entornos compilan con variables productivas de analítica, pueden emitir datos reales al proyecto productivo.
- En Cloudflare Pages, revisa explícitamente qué variables quedan configuradas en Production y cuáles en Preview.
- No des por hecho que un despliegue de Preview o Staging queda aislado solo por su URL o por no ser Producción.
- Si necesitas medir Preview o Staging, usa proyectos separados o una política de aislamiento explícita.

## 11. Cómo validar Amplitude

Valida Amplitude con este orden:

### 11.1 Live Events

- Dispara al menos un evento KPI real.
- Si el repo oficial conserva eventos técnicos, dispara también uno técnico controlado.
- Verifica que los nombres lleguen exactamente como en el contrato.
- Si Live Events no muestra nada, valida primero la API key, el guard de entorno y que el build realmente incluya la variable.

### 11.2 User Profiles

- Verifica que el perfil se agrupe por el `user_id` canónico.
- Verifica que el perfil no quede solo con un device id anónimo.
- Verifica propiedades esperadas cuando existan:
  - `company_id`
  - `company_configured`
  - `establecimiento_id`
  - `user_role`
  - `user_status`
  - `entorno`

### 11.3 `setUserId`

- Verifica que corra inmediatamente cuando ya exista usuario autenticado.
- Verifica que un reload no cree perfiles anónimos paralelos si la sesión ya está restaurada.

### 11.4 `Identify`

- Verifica que `Identify` aplique propiedades de usuario consistentes.
- Verifica que al cambiar empresa o establecimiento no queden propiedades viejas pegadas al usuario.

### 11.5 `setGroup`

- Verifica que la empresa correcta quede asociada como grupo `company`.
- Verifica que el `company_id` usado sea el canónico real, no el tenant del frontend heredado de este repo.

### 11.6 Session Replay

- Si esperas replay, el sample rate debe ser `> 0`.
- Si el sample rate es `0`, no esperes sesiones grabadas.
- Verifica que existan requests de red del SDK de Amplitude y uploads asociados al replay.
- Verifica que una sesión real aparezca en la UI de Session Replay.
- Verifica que los selectores sensibles sigan enmascarados o bloqueados.

Señal de problema:

- Si ves eventos pero no user profile consolidado, falta sincronización de identidad.

## 12. Cómo validar PostHog

Valida PostHog con este orden:

### 12.1 Eventos KPI

- Verifica que entren solo los eventos KPI del contrato principal.
- Verifica que no entren eventos técnicos `retroalimentacion_*` si mantienes la política actual.

### 12.2 Person

- Verifica que `identify` resuelva la persona correcta.
- Verifica que el usuario no quede con perfiles anónimos fragmentados por cookie.

### 12.3 Group

- Verifica que el grupo `company` exista y use el `company_id` real.
- Verifica que los eventos de negocio de empresa queden ligados a ese grupo.

### 12.4 `before_send`

- Mantener `before_send` o un filtro equivalente es obligatorio si quieres conservar la política actual.
- Verifica que siga bloqueando:
  - autocapture no deseado,
  - pageviews automáticos,
  - pageleave automático,
  - eventos técnicos fuera del contrato KPI.

### 12.5 Ausencia de autocapture no deseado

- Verifica que no aparezcan eventos automáticos que el equipo no haya aprobado.
- Si aparecen, la migración no portó bien la configuración de PostHog.

## 13. Cómo validar Mixpanel

Valida Mixpanel con este orden:

### 13.1 `distinct_id`

- Verifica que cambie del anónimo inicial al usuario canónico después de `identify`.

### 13.2 `identify`

- Verifica que el usuario autenticado quede consolidado bajo el mismo `distinct_id` esperado.

### 13.3 Super properties

- Verifica que `register` deje disponibles, cuando existan:
  - `company_id`
  - `company_configured`
  - `establecimiento_id`
  - `user_role`
  - `user_status`
  - `entorno`

### 13.4 `reset`

- Verifica que al logout o cambio fuerte de contexto no queden propiedades viejas persistidas.
- Verifica también que no queden `company_id` o `establecimiento_id` residuales si ya no aplican.

### 13.5 Decisión de privacidad

- El repo actual usa `ignore_dnt: true`.
- Antes de migrar eso al repo oficial, revisa si esa decisión sigue siendo válida para el producto oficial.

## 14. Cómo validar Session Replay

Valida Session Replay con este orden:

### 14.1 Sample rate

- Confirma el valor efectivo de `VITE_PUBLIC_AMPLITUDE_SESSION_REPLAY_SAMPLE_RATE`.
- `0` significa apagado por diseño.
- `> 0` significa que puede grabar según muestreo.

### 14.2 Network requests

- Abre DevTools y filtra requests del SDK de Amplitude.
- Confirma que, además de los eventos normales, existan requests de upload o tráfico asociado al replay cuando el sample rate lo permita.
- Si solo ves track de eventos y nunca tráfico de replay, el replay sigue apagado, bloqueado o no muestreado.

### 14.3 Sesiones visibles

- Confirma que aparezcan sesiones reales en la UI de Session Replay.
- Si no aparecen, revisar en este orden:
  - sample rate,
  - guards de entorno,
  - API key correcta,
  - bloqueos por localhost,
  - políticas de privacidad o extensiones del navegador.

### 14.4 Privacidad visual

- Validar que elementos sensibles queden enmascarados o bloqueados.
- No subir el sample rate sin revisar esto primero.

## 15. Qué no tocar en este repo actual

Trata este repo como referencia técnica controlada.

No modifiques en este repo, salvo decisión explícita del equipo:

- `apps/senciyo/src/main.tsx`
- `apps/senciyo/src/shared/analitica/analitica.ts`
- `apps/senciyo/src/shared/analitica/identidadAnalitica.ts`
- `apps/senciyo/src/shared/analitica/AnalyticsIdentitySync.tsx`
- `packages/analytics-events/index.ts`
- `apps/senciyo/src/shared/analitica/README.md`
- `apps/senciyo/src/shared/analitica/TRACKING_PLAN.md`

No hagas en este repo lo siguiente como parte de la migración:

- cambiar nombres de eventos para ajustarlos al repo oficial,
- reusar este repo como sandbox de adaptación del producto oficial,
- reconectar llaves reales del repo oficial aquí,
- mezclar feedback persistido con analytics KPI,
- forzar el `company_id` del producto oficial dentro del modelo tenant actual.

La migración debe ocurrir en el repo oficial o en una rama separada dedicada, no reescribiendo esta base de referencia ni tratando este repo como una implementación final lista para conectar.

## 16. Checklist final de migración

- [ ] Confirmar que el repo oficial mantendrá Amplitude, PostHog, Mixpanel y/o Session Replay.
- [ ] Confirmar el `user_id` canónico real del backend oficial.
- [ ] Confirmar el `company_id` canónico real del backend oficial.
- [ ] Confirmar el `establecimiento_id` o equivalente real del backend oficial.
- [ ] Portar el contrato de eventos KPI sin cambiar nombres.
- [ ] Reimplementar el wrapper central de analítica en el repo oficial.
- [ ] Reescribir el resolver de identidad analítica contra el modelo real del repo oficial.
- [ ] Montar la sincronización de identidad en un punto estable del app shell oficial.
- [ ] Revisar y corregir eventos de autenticación que salgan antes del shell privado.
- [ ] Eliminar hardcodes de entorno al portar `registro_usuario_completado` y `registro_empresa_exitoso`.
- [ ] Configurar `VITE_PUBLIC_POSTHOG_KEY` y `VITE_PUBLIC_POSTHOG_HOST` si PostHog se mantiene.
- [ ] Configurar `VITE_PUBLIC_AMPLITUDE_API_KEY` si Amplitude se mantiene.
- [ ] Configurar `VITE_PUBLIC_AMPLITUDE_SESSION_REPLAY_SAMPLE_RATE` si replay se mantiene.
- [ ] Configurar `VITE_PUBLIC_MIXPANEL_TOKEN` si Mixpanel se mantiene.
- [ ] No dejar analytics de producción activos en Preview o Staging si no es intencional.
- [ ] Validar Live Events en Amplitude.
- [ ] Validar User Profiles en Amplitude.
- [ ] Validar `setUserId`, `Identify` y `setGroup` en Amplitude.
- [ ] Validar que Session Replay realmente suba sesiones cuando el sample rate sea `> 0`.
- [ ] Validar que PostHog reciba solo KPI y no autocapture no deseado.
- [ ] Validar Person y Group en PostHog.
- [ ] Validar `before_send` o filtro equivalente en PostHog.
- [ ] Validar `distinct_id`, `identify`, `register` y `reset` en Mixpanel.
- [ ] Revisar si `ignore_dnt: true` sigue siendo aceptable en el producto oficial.
- [ ] Mantener separada la persistencia funcional de retroalimentación del tracking KPI.
- [ ] No modificar este repo actual durante la adaptación salvo decisión explícita.

## 17. Validación mínima obligatoria antes de cerrar la migración

Antes de dar la migración por cerrada, como mínimo debe quedar validado lo siguiente:

- El contrato KPI fue portado sin cambiar nombres de eventos.
- El wrapper central funciona como único punto de captura.
- `user_id` quedó configurado como identidad del SDK mediante `identify` / `setUserId`, sin exigir que viaje como propiedad explícita en cada evento.
- `company_id` ya no depende del tenant frontend heredado de este repo.
- `establecimiento_id` sale de la fuente operativa real del repo oficial.
- Los eventos de autenticación tempranos no quedan sin revisión de contexto.
- Preview y Staging no contaminan el proyecto productivo de analítica y Cloudflare Pages no expone variables productivas fuera del entorno previsto.
- Amplitude recibe eventos, consolida perfiles y, si aplica, graba replay.
- PostHog mantiene el filtro de eventos permitidos y no reintroduce autocapture no deseado.
- Mixpanel resuelve `distinct_id`, `identify`, `register` y `reset` correctamente.

Si uno de estos puntos no está validado, la migración no debe considerarse cerrada.

## Cierre operativo

Si el desarrollador oficial necesita una regla única para migrar esta capa, es esta:

**copiar el contrato, reproducir el wrapper, reescribir la identidad, mantener las políticas por proveedor y validar cada SDK con datos reales antes de considerar la migración cerrada.**