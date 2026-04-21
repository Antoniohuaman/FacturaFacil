# Retroalimentación entre SenciYo, Supabase y PM Portal

## Propósito

Este documento describe la implementación versionada en el repositorio para el flujo de retroalimentación entre SenciYo, Supabase y PM Portal.

El objetivo es dejar trazabilidad técnica de cómo quedó resuelto el flujo, qué piezas participan y qué límites tiene la solución actual.

Nota de alcance:

- Este archivo documenta lo que está trazado en código, SQL y archivos de configuración versionados, y además deja constancia del estado operativo validado en producción para este flujo.
- Los valores reales de entorno y las policies RLS de producción no están versionados en el repositorio.

## Contexto arquitectónico

SenciYo sí consume un backend HTTP general mediante `VITE_API_URL` para autenticación y otras áreas de negocio, pero el repositorio no incluye un backend propio ni endpoints dedicados de retroalimentación para este módulo.

Por esa razón, Supabase se incorporó de forma focalizada para retroalimentación y no como backend general de SenciYo.

En la implementación actual:

- SenciYo escribe retroalimentación directamente desde frontend a Supabase.
- PM Portal no escribe en esas tablas; las consulta y visualiza de forma consolidada.
- La lectura de PM Portal pasa por Cloudflare Pages Functions en `functions/api/retroalimentacion/*`.
- La escritura de SenciYo no pasa por un backend propio del módulo.

## Componentes de la solución

### Escritura desde SenciYo

- Cliente Supabase del frontend: `apps/senciyo/src/shared/supabase/clienteSupabase.ts`
- Servicio de persistencia: `apps/senciyo/src/shared/retroalimentacion/servicios/retroalimentacionSupabase.ts`
- Proveedor de UI y contexto de negocio: `apps/senciyo/src/shared/retroalimentacion/ProveedorRetroalimentacion.tsx`

### Persistencia en Supabase

- Tablas de escritura:
  - `public.retroalimentacion_estado_animo`
  - `public.retroalimentacion_calificaciones`
  - `public.retroalimentacion_ideas`
- Vista unificada de lectura:
  - `public.v_retroalimentacion_unificada`

### Consumo desde PM Portal

- Página de visualización: `apps/pm-portal/src/presentacion/paginas/analitica/retroalimentacion/PaginaRetroalimentacion.tsx`
- Caso de uso: `apps/pm-portal/src/aplicacion/casos-uso/retroalimentacion.ts`
- Cliente HTTP del frontend del portal: `apps/pm-portal/src/infraestructura/apis/clienteApiPortalPM.ts`
- Endpoints de lectura en Cloudflare Pages Functions:
  - `functions/api/retroalimentacion/index.ts`
  - `functions/api/retroalimentacion/panel.ts`
  - `functions/api/retroalimentacion/resumen.ts`
  - `functions/api/retroalimentacion/distribuciones.ts`
  - `functions/api/retroalimentacion/[tipo]/[id].ts`
- Infraestructura compartida para lectura: `functions/api/_retroalimentacion.ts`
- Infraestructura compartida de autorización del portal: `functions/api/_autorizacion.ts`

## Tablas y vista involucradas

Las estructuras versionadas en SQL para este flujo son:

- `public.retroalimentacion_estado_animo`
- `public.retroalimentacion_calificaciones`
- `public.retroalimentacion_ideas`
- `public.v_retroalimentacion_unificada`

La creación y evolución de estas estructuras se rastrea en:

- `apps/senciyo/supabase/sql/retroalimentacion_inicial.sql`
- `apps/senciyo/supabase/sql/retroalimentacion_trazabilidad_negocio.sql`
- `apps/senciyo/supabase/sql/retroalimentacion_lectura_api.sql`

Resumen de cada archivo SQL:

- `retroalimentacion_inicial.sql`: crea las tres tablas de escritura e índices iniciales.
- `retroalimentacion_trazabilidad_negocio.sql`: agrega `usuario_correo`, `empresa_ruc`, `empresa_razon_social` y recompone la vista unificada.
- `retroalimentacion_lectura_api.sql`: define la superficie de lectura uniforme para API y dashboards sobre `v_retroalimentacion_unificada`.

## Proyectos Supabase y configuración

El repositorio no versiona URLs reales ni project refs de Supabase, por lo que no es posible afirmar desde código qué proyecto exacto está conectado en cada despliegue.

Sí es posible afirmar cómo está diseñada la configuración:

- SenciYo usa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `apps/senciyo/.env.example` para la persistencia de retroalimentación desde frontend.
- PM Portal usa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `apps/pm-portal/.env.example` para su lado browser.
- PM Portal valida autorización server-side con prioridad sobre `PM_PORTAL_SUPABASE_URL` y `PM_PORTAL_SUPABASE_ANON_KEY` en `functions/api/_autorizacion.ts`.
- PM Portal lee retroalimentación desde el Supabase de SenciYo mediante `SENCIYO_SUPABASE_URL` y `SENCIYO_SUPABASE_SERVICE_ROLE_KEY` en `functions/api/_retroalimentacion.ts`.

Conclusión de configuración:

- La arquitectura está preparada para separar el Supabase del portal y el Supabase donde vive la retroalimentación de SenciYo.
- El repositorio no publica los valores reales, así que la separación efectiva depende de la configuración de entorno de cada despliegue.

## Cómo funciona la escritura desde SenciYo

La escritura actual quedó así:

- El módulo arma el contexto de negocio desde `UserSessionContext` y la ruta actual en `ProveedorRetroalimentacion.tsx`.
- El servicio `retroalimentacionSupabase.ts` inserta directo en las tablas de Supabase desde el frontend.
- El cliente se inicializa con `createClient(url, anonKey, ...)` en `clienteSupabase.ts`.
- La clave de arranque del cliente sigue siendo la `anon key` pública de Supabase.
- No existe un backend propio de SenciYo para este módulo en el repositorio.
- El login de SenciYo no usa `supabase.auth.signIn*`; sigue pasando por `/auth/*` a través de `AuthClient.ts` y `VITE_API_URL`.

Matiz importante del estado actual:

- Aunque el cliente se bootstrappea con la `anon key`, hoy el servicio de retroalimentación intenta sincronizar una sesión de Supabase en memoria antes del insert usando `tokenService.getAccessToken()`, `tokenService.getRefreshToken()` y `supabase.auth.setSession(...)`.
- Esa sincronización no convierte a Supabase en el sistema de login principal de SenciYo.
- Como el login principal del producto no está resuelto con Supabase Auth, esa sincronización no garantiza por sí sola que el insert termine ejecutándose como `authenticated`.

## Por qué fallaba inicialmente

La causa técnica del fallo inicial es consistente con la implementación del cliente de escritura:

- El cliente de SenciYo nace con `VITE_SUPABASE_ANON_KEY`.
- Sin una sesión real de Supabase cargada en ese cliente, el request queda evaluado por Supabase como `anon`.
- Si RLS exige un contexto más restrictivo que `anon`, el insert queda bloqueado.

Dicho de otra forma:

- El problema no estaba en la forma del payload del frontend.
- El problema estaba en que el cliente de escritura no podía asumir por sí solo una sesión `authenticated` de Supabase solo por existir una sesión de aplicación en `AuthClient`, `AuthRepository`, `AuthStore` o `UserSessionContext`.

## Solución aplicada y límites de trazabilidad

La solución final del flujo quedó compuesta por dos capas:

### Ajuste versionado en código

- Mantener el modelo actual de escritura directa desde SenciYo a Supabase.
- Mantener la lectura consolidada en PM Portal a través de Cloudflare Pages Functions.
- Sincronizar una sesión de Supabase en memoria antes del insert en `apps/senciyo/src/shared/retroalimentacion/servicios/retroalimentacionSupabase.ts`.
- Reutilizar el cliente singleton de `apps/senciyo/src/shared/supabase/clienteSupabase.ts` y evitar una reescritura arquitectónica mayor.
- Mantener la lectura fuera del frontend de SenciYo y no abrir una vía de lectura pública directa desde la app operativa.

### Resolución operativa efectiva en producción

- Mantener RLS activo.
- Permitir `INSERT` para el rol `anon` únicamente en las tablas de retroalimentación.
- Aplicar esa apertura solo sobre:
  - `public.retroalimentacion_estado_animo`
  - `public.retroalimentacion_calificaciones`
  - `public.retroalimentacion_ideas`
- No abrir lectura pública directa de esas tablas.

Motivo técnico de esta decisión:

- SenciYo no usa Supabase Auth como login principal del producto.
- Por esa razón, el flujo de escritura seguía pudiendo salir evaluado como `anon`.
- La sincronización de sesión en memoria existe en código, pero no fue suficiente por sí sola para garantizar inserts como `authenticated` de forma confiable en producción.
- La resolución efectiva final fue permitir `INSERT` para `anon` solo en las tres tablas de retroalimentación, manteniendo el resto del control de acceso bajo RLS.

Límite importante:

- El repositorio no contiene SQL versionado de las policies RLS para `anon` o `authenticated` en estas tablas.
- Por esa razón, la configuración exacta de esas policies no puede reconstruirse desde archivos SQL del repositorio.
- Sí queda documentado como estado operativo validado que en producción se aplicaron policies para permitir `INSERT` del rol `anon` en las tres tablas de retroalimentación, manteniendo RLS activo.
- Lo que sí queda versionado en el repositorio es el ajuste de código para sincronización de sesión en memoria, pero no la policy final que destrabó el flujo en producción.

## Cómo consume PM Portal la información

PM Portal consume la información en dos niveles:

- Listado paginado de registros mediante `/api/retroalimentacion`
- Panel consolidado mediante `/api/retroalimentacion/panel`
- Detalle puntual por registro mediante `/api/retroalimentacion/[tipo]/[id]`

También existen endpoints heredados de compatibilidad:

- `/api/retroalimentacion/resumen`
- `/api/retroalimentacion/distribuciones`

La lógica de lectura funciona así:

- El frontend del portal envía su bearer token al backend del portal.
- `functions/api/_autorizacion.ts` valida ese token contra la configuración Supabase del PM Portal.
- `functions/api/_retroalimentacion.ts` abre una conexión server-side al Supabase de SenciYo con service role.
- Las Functions consultan `public.v_retroalimentacion_unificada` y devuelven una superficie consolidada para el portal.

Resultado funcional del portal:

- La visualización de retroalimentación no depende de lecturas públicas desde SenciYo.
- El portal opera como superficie consolidada de analítica y consulta.

## Advertencias importantes

- Esta solución es coherente con la arquitectura actual del monorepo porque SenciYo no tiene un backend propio versionado para retroalimentación y PM Portal ya dispone de Functions para lectura segura.
- La `anon key` sigue siendo pública por diseño y solo sirve para bootstrap del cliente; no reemplaza las policies de Supabase.
- Los valores reales de entorno no están en el repositorio; el comportamiento final de producción depende de la configuración efectiva en Cloudflare y Supabase.
- Si en el futuro SenciYo incorpora un backend propio para este módulo, o si migra su login real a Supabase Auth de forma nativa en frontend o backend, esta decisión debe reevaluarse.
- Si se versionan las policies RLS en el futuro, este documento debe actualizarse para reflejar esas reglas de forma explícita.

## Estado actual

### Estado versionado en repositorio

- SenciYo tiene implementada la escritura directa de retroalimentación hacia Supabase con contexto de usuario, empresa, establecimiento, módulo y ruta.
- PM Portal tiene implementada la lectura consolidada de panel, listado y detalle sobre `public.v_retroalimentacion_unificada`.
- El repositorio no versiona secretos reales, URLs finales de despliegue ni las policies RLS efectivas aplicadas en producción.

### Estado operativo validado

- SenciYo guarda correctamente estado de ánimo.
- SenciYo guarda correctamente calificaciones.
- SenciYo guarda correctamente ideas.
- PM Portal visualiza correctamente panel y registros.
- El flujo quedó operativo en producción.

## Archivos clave

### SenciYo

- `apps/senciyo/src/shared/retroalimentacion/ProveedorRetroalimentacion.tsx`: arma el contexto del envío desde sesión, empresa, establecimiento y ruta.
- `apps/senciyo/src/shared/retroalimentacion/servicios/retroalimentacionSupabase.ts`: persiste en las tres tablas y sincroniza sesión Supabase antes del insert.
- `apps/senciyo/src/shared/supabase/clienteSupabase.ts`: crea el cliente Supabase del frontend y encapsula la sincronización de sesión en memoria.
- `apps/senciyo/src/pages/Private/features/autenticacion/services/AuthClient.ts`: muestra que el login principal de SenciYo no se hace con `supabase.auth.signIn*`, sino contra `/auth/*` mediante `VITE_API_URL`.
- `apps/senciyo/.env.example`: declara `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` para este flujo.

### SQL de Supabase

- `apps/senciyo/supabase/sql/retroalimentacion_inicial.sql`
- `apps/senciyo/supabase/sql/retroalimentacion_trazabilidad_negocio.sql`
- `apps/senciyo/supabase/sql/retroalimentacion_lectura_api.sql`

### PM Portal y Functions

- `apps/pm-portal/src/presentacion/paginas/analitica/retroalimentacion/PaginaRetroalimentacion.tsx`: pantalla operativa del módulo en el portal.
- `apps/pm-portal/src/aplicacion/casos-uso/retroalimentacion.ts`: orquesta listado, panel, detalle y exportación.
- `apps/pm-portal/src/infraestructura/apis/clienteApiPortalPM.ts`: cliente HTTP hacia las Functions del portal.
- `apps/pm-portal/.env.example`: declara la configuración browser-side del portal.
- `functions/api/_autorizacion.ts`: valida el bearer token del portal contra la configuración Supabase del PM Portal.
- `functions/api/_retroalimentacion.ts`: centraliza filtros, acceso server-side al Supabase de SenciYo y respuestas API.
- `functions/api/retroalimentacion/index.ts`: listado paginado.
- `functions/api/retroalimentacion/panel.ts`: resumen y distribuciones en una sola carga agregada.
- `functions/api/retroalimentacion/resumen.ts`: resumen heredado.
- `functions/api/retroalimentacion/distribuciones.ts`: distribuciones heredadas.
- `functions/api/retroalimentacion/[tipo]/[id].ts`: detalle puntual.

## Referencias de configuración general

- `README.md`: estructura del monorepo y reglas generales de variables de entorno.
- `CLOUDFLARE.md`: separación recomendada de variables entre SenciYo, PM Portal y lectura de retroalimentación.