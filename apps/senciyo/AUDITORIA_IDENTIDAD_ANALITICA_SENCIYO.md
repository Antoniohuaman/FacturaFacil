# Auditoría de identidad analítica y jerarquía operativa – SenciYo

> Documento histórico/desactualizado.
> No refleja el estado actual de la implementación después de la limpieza conservadora y el hardening de analítica; úsalo solo como referencia histórica.

---

## 1. Resumen ejecutivo

SenciYo cuenta con un sistema de autenticación, multi-empresa (tenant/workspace) y contexto de establecimiento/almacén funcional y suficientemente maduro para soportar la operación del producto. Sin embargo, la identidad analítica del sistema **no está definida ni implementada**. Ninguno de los tres SDKs de analítica (PostHog, Amplitude, Mixpanel) recibe hoy información sobre quién es el usuario, a qué empresa pertenece ni en qué establecimiento opera. Los eventos se envían de forma completamente anónima.

El sistema posee internamente todos los datos necesarios para construir una identidad analítica confiable — `User.id`, `tenantId` (equivale a empresa), `establecimientoId`, `Almacen.id`, rol y estado del entorno SUNAT — pero existe una brecha completa entre lo que el frontend conoce y lo que transmite a las plataformas de analítica.

Adicionalmente, se detectó un modelo de identidad de empresa **fragmentado en múltiples fuentes de verdad** con al menos seis puntos de persistencia paralelos para el ID de empresa activa. Esto, combinado con la generación client-side de `workspaceId` (usado como `tenantId`) sin respaldo en backend en el flujo actual, representa un riesgo estructural que debe resolverse antes de implementar la identificación analítica.

El concepto de "usuario demo" o "rol temporal" **no existe como estado formal del usuario** en el sistema. Lo que el negocio describe como "rol demo" se traduce técnicamente en un entorno SUNAT configurado como `'TESTING'` en la empresa; cuando el usuario actualiza su RUC real y cambia el entorno a `'PRODUCTION'`, se considera que pasó a "modo real". Este cambio se refleja en la propiedad `entornoSunat` del modelo `Company` y se usa como discriminador (`EntornoAnalitica: 'demo' | 'produccion'`) en todos los eventos existentes.

**Veredicto global**: el sistema tiene una base funcional suficiente para definir la identidad analítica, pero requiere: (a) consolidar la fuente de verdad del ID de empresa, (b) implementar las llamadas de `identify`/`group` en los SDKs, y (c) definir formalmente el momento en que la identidad analítica se considera "confiable".

---

## 2. Alcance de la revisión

La auditoría cubrió de forma exhaustiva las siguientes capas y archivos del sistema SenciYo (`apps/senciyo/`):

### Autenticación y sesión
| Archivo | Ubicación |
|---------|-----------|
| Tipos de auth | `src/pages/Private/features/autenticacion/types/auth.types.ts` |
| AuthClient (I/O) | `src/pages/Private/features/autenticacion/services/AuthClient.ts` |
| AuthRepository (orquestación) | `src/pages/Private/features/autenticacion/services/AuthRepository.ts` |
| TokenService (JWT) | `src/pages/Private/features/autenticacion/services/TokenService.ts` |
| ContextService (persistencia) | `src/pages/Private/features/autenticacion/services/ContextService.ts` |
| RateLimitService | `src/pages/Private/features/autenticacion/services/RateLimitService.ts` |
| AuthStore (Zustand) | `src/pages/Private/features/autenticacion/store/AuthStore.ts` |
| TenantStore (Zustand) | `src/pages/Private/features/autenticacion/store/TenantStore.ts` |
| RoleGuard | `src/pages/Private/features/autenticacion/guards/RoleGuard.tsx` |
| RegisterPage | `src/pages/Private/features/autenticacion/pages/RegisterPage.tsx` |

### Contexto de usuario y sesión
| Archivo | Ubicación |
|---------|-----------|
| UserSessionContext | `src/contexts/UserSessionContext.tsx` |
| SessionInitializer | `src/contexts/SessionInitializer.tsx` |

### Multi-empresa / Tenant
| Archivo | Ubicación |
|---------|-----------|
| TenantProvider | `src/shared/tenant/TenantProvider.tsx` |
| TenantContext | `src/shared/tenant/TenantContext.tsx` |
| Tenant helpers (index) | `src/shared/tenant/index.ts` |
| Tenant types | `src/shared/tenant/types.ts` |

### Modelos de configuración
| Archivo | Ubicación |
|---------|-----------|
| Company | `src/pages/Private/features/configuracion-sistema/modelos/Company.ts` |
| Establecimiento | `src/pages/Private/features/configuracion-sistema/modelos/Establecimiento.ts` |
| Almacen | `src/pages/Private/features/configuracion-sistema/modelos/Almacen.ts` |
| User (extendido) | `src/pages/Private/features/configuracion-sistema/modelos/User.ts` |
| Roles del sistema | `src/pages/Private/features/configuracion-sistema/roles/rolesDelSistema.ts` |

### Configuración empresa (formularios de transición)
| Archivo | Ubicación |
|---------|-----------|
| ConfiguracionEmpresa | `src/pages/Private/features/configuracion-sistema/paginas/ConfiguracionEmpresa.tsx` |
| AdministrarEmpresas | `src/pages/Private/features/configuracion-sistema/paginas/AdministrarEmpresas.tsx` |
| ContextoConfiguracion | `src/pages/Private/features/configuracion-sistema/contexto/ContextoConfiguracion.tsx` |

### Analítica
| Archivo | Ubicación |
|---------|-----------|
| Wrapper central | `src/shared/analitica/analitica.ts` |
| Definición de eventos | `src/shared/analitica/eventosAnalitica.ts` |
| Contrato compartido | `packages/analytics-events/index.ts` |
| README analítica | `src/shared/analitica/README.md` |

### API e infraestructura
| Archivo | Ubicación |
|---------|-----------|
| HttpClient | `src/services/api/http-client.ts` |
| API Config | `src/services/api/api.config.ts` |
| main.tsx (bootstrap) | `src/main.tsx` |
| App.tsx | `src/App.tsx` |
| PrivateLayout | `src/layouts/PrivateLayout.tsx` |

### Puntos de disparo de eventos
Se verificaron los 13+ puntos donde se invocan funciones analíticas, incluyendo `EmisionTradicional.tsx`, `PuntoVenta.tsx`, `ProductsPage.tsx`, `ProductGrid.tsx`, `ProductSelector.tsx`, `useClientes.ts`, `ImportPage.tsx`, `ImportPricesTab.tsx`, `ConfiguracionEmpresa.tsx` y `RegisterPage.tsx`.

---

## 3. Hallazgos principales

### 3.1 Hallazgos críticos

1. **No existe identificación analítica del usuario.** Ningún SDK de analítica recibe `userId`, `email`, `role` ni ningún dato que permita asociar eventos a un usuario concreto. No se encontraron llamadas a `posthog.identify()`, `amplitude.setUserId()`, `amplitude.identify()` ni `mixpanel.identify()` en ningún archivo del proyecto.

2. **No existe agrupación analítica por empresa.** No se encontraron llamadas a `posthog.group()`, `amplitude.setGroup()` ni `mixpanel.people.set()`. Los eventos no contienen `empresaId`, `tenantId`, `ruc` ni ningún identificador de empresa.

3. **El ID de empresa activa tiene seis fuentes de verdad paralelas** con riesgo de divergencia:
   - `TenantProvider` → `tenantId` (state + `ff_active_workspace_id` en localStorage + `globalThis.__FF_ACTIVE_WORKSPACE_ID`)
   - `TenantStore` (Zustand) → `contextoActual.empresaId` (+ persistido en `senciyo-tenant-store`)
   - `ContextService` → `senciyo_workspace_context`, `senciyo_last_empresa_id`
   - `UserSessionContext` → `session.currentCompanyId` (+ `facturafacil_user_session`)
   - `HttpClient` → `localStorage.getItem('EMPRESA_ID')` — **clave legacy nunca escrita por el código actual**
   - `globalThis.__USER_SESSION__` → `currentCompanyId`

4. **El `workspaceId` (= `tenantId` = ID que funciona como `empresaId` en el frontend) se genera localmente** mediante `crypto.randomUUID()` o `ws_${Date.now()}` en `TenantProvider`. En modo desarrollo, el id de empresa también se genera localmente como `empresa_${user.id}`. No se verificó evidencia de que el backend genere y devuelva un UUID estable para la empresa que luego se use como `workspaceId`.

5. **El campo `STORAGE_KEYS.EMPRESA_ID` (`'EMPRESA_ID'`) leído por `HttpClient` es código muerto.** Se lee en cada request API (`http-client.ts:14`) pero ningún archivo del sistema escribe en esa clave de localStorage. Esto indica que las llamadas API actuales probablemente no incluyen `empresa_id` como parámetro a menos que se inyecte por otra vía.

6. **El concepto de "rol demo" no existe como parte del modelo de usuario.** El enum `UserRole` define seis roles (`super_admin`, `admin`, `contador`, `vendedor`, `almacenero`, `viewer`), ninguno de los cuales es "demo" ni "temporal". El `UserStatus.PENDIENTE` existe definido pero no se encontró lógica de transición que lo use.

### 3.2 Hallazgos relevantes

7. **La distinción "demo vs. producción" se basa exclusivamente en `Company.configuracionSunatEmpresa.entornoSunat`** (`'TESTING'` | `'PRODUCTION'`). Todos los eventos analíticos derivan `entornoAnalitica` de este campo.

8. **La autenticación pasa inmediatamente a estado `authenticated`** en `AuthRepository.completeAuthentication()`, independientemente de si el usuario realmente tiene un workspace configurado con datos de empresa válidos. No existe validación real.

9. **Al arrancar la aplicación sin datos, `TenantProvider` crea un workspace bootstrap** con RUC vacío y razón social vacía. Este workspace recibe un UUID local y se activa automáticamente. Desde la perspectiva analítica, los eventos emitidos en este estado no son distinguibles de eventos de usuarios con empresa real (excepto por la propiedad `entorno: 'demo'`).

10. **En modo desarrollo (`DEV_MODE`), todos los usuarios nuevos reciben `role: 'admin'`** automáticamente en `AuthClient.ts:191`. No existe simulación de otros roles en el flujo de desarrollo.

---

## 4. Estado actual de identidad de usuario

### 4.1 Identificador real del usuario

El identificador principal del usuario es el campo **`User.id`**, definido como `string` en la interfaz `User` (`auth.types.ts:97`).

**Origen del valor:**
- **Modo producción:** generado por el backend al registrar al usuario. Se devuelve en `AuthResponse.user.id` y en `authClient.getProfile()`. Se presume que es un UUID, pero no se pudo confirmar el formato exacto al no tener acceso al código backend.
- **Modo desarrollo:** generado localmente como `user_${Date.now()}` (`AuthClient.ts:132`). Este formato **no es estable** ya que depende del timestamp de creación en el navegador.

**Persistencia y trayectoria:**

| Punto | Mecanismo | Clave |
|-------|-----------|-------|
| Login/2FA response | `AuthResponse.user.id` | En memoria |
| AuthStore (Zustand) | Persistido | `senciyo-auth-store` → `user.id` |
| Session init | `authClient.getProfile()` → `user.id` | Respuesta API |
| UserSessionContext | `SessionInitializer` copia `authUser.id` → `session.userId` | `facturafacil_user_session` → `userId` |
| JWT | Se presume incluido en el payload (campo no verificable sin token real) | `senciyo_auth_tokens` → `accessToken` |

### 4.2 Otros campos del usuario

| Campo | Tipo | Uso como identidad | Clasificación |
|-------|------|-------------------|---------------|
| `User.id` | `string` | **Sí — identificador técnico principal.** | ID técnico |
| `User.email` | `string` | **No debería ser ID.** Se usa para login, se normaliza a lowercase. Podría cambiar en el futuro. | Atributo funcional / PII |
| `User.nombre` | `string` | **No.** Solo atributo display. | Atributo / PII |
| `User.apellido` | `string` | **No.** Solo atributo display. | Atributo / PII |
| `User.rol` | `UserRole` | **No es ID, pero sí contexto analítico crítico.** Define qué puede hacer el usuario. | Atributo operativo |
| `User.estado` | `UserStatus` | **No es ID.** Valores: `activo`, `inactivo`, `pendiente`. | Atributo de estado |
| `User.require2FA` | `boolean` | **No.** Flag de seguridad. | Atributo de configuración |
| `User.emailVerificado` | `boolean` | **No.** Flag de verificación. | Atributo de estado |
| `User.avatar` | `string?` | **No.** URL de imagen. | Atributo de perfil |
| `User.fechaCreacion` | `string` | **No.** Atributo temporal inmutable. Útil como propiedad analítica. | Atributo temporal |
| `User.ultimoAcceso` | `string?` | **No.** Atributo temporal mutable. | Atributo temporal |
| Celular | Presente en formulario de registro y en modelo extendido de User (config) | **No.** Solo dato de contacto. | Dato de contacto / PII |

### 4.3 Diferenciación entre tipos de usuario

| Concepto | ¿Existe en el código? | Evidencia |
|----------|----------------------|-----------|
| **super_admin** | Sí, como valor en `UserRole` | `auth.types.ts:12` |
| **admin** | Sí | `auth.types.ts:13`. Asignado por defecto en dev mode. |
| **usuario demo/temporal** | **No existe explícitamente.** | No hay rol "demo" en `UserRole`. No hay `UserStatus` "demo". El concepto se resuelve indirectamente vía `entornoSunat === 'TESTING'`. |
| **usuario pendiente** | Definido como `UserStatus.PENDIENTE` pero **no se encontró lógica que lo use**. | `auth.types.ts:24`. Sin transición implementada. |

### 4.4 Estabilidad del userId

- En producción, se presume estable si el backend genera UUIDs permanentes. **No verificable con la evidencia del frontend.**
- En desarrollo, **no es estable**: `user_${Date.now()}` genera un ID diferente cada vez que se ejecuta el registro.

---

## 5. Estado actual de identidad de empresa

### 5.1 Identificadores presentes en el sistema

El sistema maneja **múltiples conceptos** que se refieren al mismo nivel lógico (empresa):

| Concepto | Interfaz | Campo | Dónde se define |
|----------|----------|-------|----------------|
| `Empresa.id` | `Empresa` (auth types) | `id: string` | `auth.types.ts:106` |
| `Workspace.id` | `Workspace` (tenant types) | `id: string` | `shared/tenant/types.ts` |
| `Company.id` | `Company` (config models) | `id: string` | `configuracion-sistema/modelos/Company.ts` |
| `tenantId` | `TenantContext` | `tenantId: string \| null` | `shared/tenant/TenantContext.tsx` |
| `currentCompanyId` | `UserSession` | `currentCompanyId: string` | `contexts/UserSessionContext.tsx` |
| `empresaId` | `WorkspaceContext` | `empresaId: string` | `auth.types.ts:142` |

### 5.2 Relación entre los conceptos

Basado en la evidencia del código:

1. **`Workspace.id` = `tenantId`** — El TenantProvider mantiene un array de `Workspace[]` y el `tenantId` es el `id` del workspace activo.

2. **`tenantId` → `Company.id`** — En `SessionInitializer.tsx:56`, se asigna explícitamente: `{ ...state.company, id: tenantId }`. Esto confirma que el `Company.id` se sobrescribe con el `tenantId`.

3. **`tenantId` → `currentCompanyId`** — En `SessionInitializer.tsx:62`: `currentCompanyId: tenantId`.

4. **`Empresa.id` ↔ `Workspace.id`** — La relación no es directa ni automática. `Empresa` proviene del backend (`AuthResponse.empresas[]`), mientras que `Workspace` se crea/gestiona localmente. En modo dev, `Empresa.id` se genera como `empresa_${user.id}` (distinto de `Workspace.id` que es un UUID). **No se encontró código que sincronice `Empresa.id` con `Workspace.id` de forma explícita tras el login.**

5. **`empresaId` (de `WorkspaceContext`)** — Solo se persiste si el backend devuelve un `contextoActual` al hacer login. En el flujo dev, `contextoActual.empresaId = empresa_${user.id}`.

### 5.3 ¿Quién genera el ID de empresa "real"?

| Escenario | Generador | Formato |
|-----------|-----------|---------|
| Primera visita sin login | `TenantProvider.resolveBootstrapState()` genera un workspace bootstrap | `crypto.randomUUID()` o `ws_${timestamp}` |
| Login exitoso (dev) | `AuthClient.handleDevModeRequest` | `empresa_${user.id}` donde `user.id = user_${timestamp}` |
| Login exitoso (prod) | Backend devuelve `AuthResponse.empresas[].id` | Presumiblemente UUID del backend |
| Crear empresa manualmente | `generateWorkspaceId()` en TenantProvider | `crypto.randomUUID()` o `ws_${timestamp}` |

**Hallazgo crítico:** El workspace bootstrap se crea antes de cualquier autenticación. Si luego el usuario hace login y el backend devuelve empresas con IDs propios, la relación entre el workspace bootstrap y la empresa real no está establecida de forma automática. Se necesita confirmar si `createOrUpdateWorkspace` se invoca con el ID del backend.

### 5.4 El RUC como identidad

El **RUC** (Registro Único de Contribuyente peruano, 11 dígitos) **no se usa como identificador técnico** en ninguna parte del sistema. Se trata como **atributo de negocio** de la empresa:

- Está definido como `ruc: string` en `Empresa`, `Workspace`, `Company` y `RegisterData`.
- Se **valida contra SUNAT** en formularios (`ConfiguracionEmpresa.tsx`).
- El alta de una empresa real se registra desde el flujo de creación con `registrarRegistroEmpresaExitoso`.
- Un cambio de RUC no genera un nuevo ID de empresa.

**Veredicto:** El RUC debe ser **propiedad analítica (user/group property)** de la empresa, nunca su identificador técnico.

### 5.5 Fragmentación de la fuente de verdad

```
┌─────────────── Fuentes de verdad para empresa activa ───────────────┐
│                                                                      │
│  1. TenantProvider state         → tenantId (state React)            │
│  2. globalThis                   → __FF_ACTIVE_WORKSPACE_ID          │
│  3. localStorage                 → ff_active_workspace_id            │
│  4. TenantStore (Zustand)        → contextoActual.empresaId          │
│  5. localStorage (Zustand)       → senciyo-tenant-store              │
│  6. ContextService               → senciyo_workspace_context         │
│  7. ContextService               → senciyo_last_empresa_id           │
│  8. UserSessionContext state     → session.currentCompanyId           │
│  9. localStorage                 → facturafacil_user_session          │
│ 10. globalThis                   → __USER_SESSION__.currentCompanyId  │
│ 11. HttpClient (legacy)          → EMPRESA_ID ← ¡NUNCA ESCRITO!      │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**El contrato declarado** en `shared/tenant/index.ts` establece que `getTenantEmpresaId()` (lectura de `TenantProvider` vía `globalThis.__FF_ACTIVE_WORKSPACE_ID`) es la fuente canónica. Sin embargo, la existencia de tantos puntos de persistencia paralelos introduce riesgo de inconsistencia, especialmente durante cambios de empresa, refrescos de sesión o condiciones de carrera entre providers.

---

## 6. Estado actual de identidad de establecimiento

### 6.1 Identificador real

El campo `Establecimiento.id` (tipo `string`) es el identificador técnico del establecimiento, presente en ambas interfaces:
- **Auth types** (`auth.types.ts:115`): `{ id: string; codigo: string; nombre: string; ... }`
- **Modelo de configuración** (`Establecimiento.ts`): `{ id: string; codigoEstablecimiento: string; nombreEstablecimiento: string; ... }`

### 6.2 Origen y persistencia

| Punto | Mecanismo |
|-------|-----------|
| Login response | `AuthResponse.empresas[].establecimientos[].id` |
| ConfigurationContext | Cargado del backend via `ContextoConfiguracion` |
| TenantProvider | Persiste `establecimientoId` por `tenantId` en `ff_active_establecimiento_by_tenant` |
| globalThis | `__FF_ACTIVE_ESTABLECIMIENTO_ID` |
| UserSessionContext | `session.currentEstablecimientoId` |
| ContextService | `senciyo_last_establecimiento_id` |

### 6.3 Selección del establecimiento activo

La lógica reside en `SessionInitializer.tsx`:

1. Se busca `isMainEstablecimiento === true` entre los establecimientos activos.
2. Si no existe, se toma el primero activo.
3. Si hay un `activeEstablecimientoId` persistido en TenantProvider para el tenant actual, se prefiere.
4. El resultado se escribe en `UserSession.currentEstablecimientoId` y en `TenantProvider.setActiveEstablecimientoId`.

### 6.4 ¿Cuándo cambia?

El establecimiento activo cambia cuando:
- El usuario cambia de empresa (se resuelve el default del nuevo tenant).
- El usuario selecciona otro establecimiento explícitamente (vía `setActiveEstablecimientoId`).
- Un establecimiento deja de estar activo y el sistema reasigna.

### 6.5 El código de establecimiento SUNAT

El `codigoEstablecimiento` (formato "0001", "0002", etc.) es un código de negocio otorgado por SUNAT. **No debe usarse como identificador técnico** — es un atributo de negocio que puede repetirse entre empresas.

### 6.6 Evaluación para analítica

El `establecimientoId` está disponible en el momento de disparo de cualquier evento de negocio (venta, producto, cliente, importación), pero **actualmente no se incluye en ningún evento**. Debería incorporarse como propiedad del evento o como parte del grupo analítico.

---

## 7. Estado actual de identidad de almacén

### 7.1 Identificador real

El campo `Almacen.id` (tipo `string`) es el identificador técnico. Definido en `configuracion-sistema/modelos/Almacen.ts`.

### 7.2 Jerarquía

```
Company (RUC) → Establecimiento → Almacén
```

El modelo lo confirma: `Almacen.establecimientoId: string` es la clave foránea explícita.

### 7.3 Dónde vive

| Punto | Mecanismo |
|-------|-----------|
| ConfigurationContext | `state.almacenes: Almacen[]` — cargados por `useAlmacenes` |
| Hook dedicado | `useAlmacenes.ts` — filtra por `establecimientoId` |
| No en sesión | **No está presente en `UserSession` ni en `TenantContext`** |

### 7.4 En qué flujos participa

- **Inventario:** movimientos de stock entre almacenes.
- **Punto de venta:** resolución de stock disponible.
- **Importación de stock:** asignación de cantidades por almacén.

### 7.5 Evaluación para analítica

El `almacenId` **no necesita ser parte de la identidad analítica base** en esta etapa. Los eventos actuales (venta, producto, cliente, importación) no operan a nivel de almacén individual. Cuando se agreguen eventos de inventario o de caja a nivel almacén, podría incorporarse como propiedad opcional del evento.

**Recomendación:** No incluir `almacenId` en el `identify`/`group` inicial. Incluirlo como propiedad del evento solo en flujos donde sea operativamente relevante (stock, transferencias entre almacenes).

---

## 8. Flujo de identidad desde rol demo hasta rol real

### 8.1 Lo que el negocio describe vs. lo que el sistema implementa

El negocio describe que "un usuario entra con rol demo y después pasa a rol real". Sin embargo, el código implementa algo diferente:

| Concepto del negocio | Implementación técnica real |
|---------------------|---------------------------|
| "Rol demo" | No existe como valor en `UserRole`. El usuario recibe `role: 'admin'` desde el registro. |
| "Entorno demo" | La empresa se crea con `configuracionSunatEmpresa.entornoSunat = 'TESTING'` |
| "Paso a rol real" | El usuario completa el formulario de empresa y cambia `entornoSunat` de `'TESTING'` a `'PRODUCTION'` |
| "Empresa real identificada" | El usuario configura un RUC válido y una razón social real en `ConfiguracionEmpresa.tsx` |

### 8.2 Flujo detallado paso a paso

**Paso 1 — Registro del usuario** (`RegisterPage.tsx` + `AuthRepository.register()`)
- Se crean: `nombre`, `apellido`, `celular`, `email`, `password`.
- El registro puede incluir datos de empresa (`ruc`, `razonSocial`) tomados del TenantStore actual.
- Si no hay empresa previa, el registro envía `regimen: 'general'` y `actividadEconomica: 'Pendiente'`.
- El backend crea el usuario con su `User.id`.
- Evento analítico: `registrarRegistroUsuarioCompletado({ entorno: 'demo' })` — **siempre** marca como "demo".
- **En este punto:** existe `userId`, existe `email`, rol = `admin`, no hay empresa configurada con RUC real.

**Paso 2 — Login automático post-registro** (`RegisterPage.tsx:56-60`)
- Se invoca `authRepository.login()` con las credenciales recién registradas.
- El backend devuelve `AuthResponse` con `user`, `tokens`, `empresas[]` y posiblemente `contextoActual`.
- `completeAuthentication()` establece `status: 'authenticated'` **sin verificar si los datos de empresa son válidos**.

**Paso 3 — Workspace bootstrap** (`TenantProvider.resolveBootstrapState()`)
- Si ya existía un workspace en localStorage (del paso anterior o de una visita previa), se usa.
- Si no, se crea un workspace bootstrap con RUC y razón social vacíos.
- **En este punto:** el `tenantId` existe pero puede apuntar a un workspace sin datos de empresa reales.

**Paso 4 — El usuario configura su empresa** (`ConfiguracionEmpresa.tsx`)
- El usuario navega a la configuración de empresa.
- Completa: RUC (validado contra SUNAT), razón social, dirección fiscal, régimen tributario, representante legal.
- `createOrUpdateWorkspace()` actualiza el workspace con RUC y razón social.
- Se crean automáticamente: establecimiento principal, almacén por defecto, series de facturación.
- **`configuracionSunatEmpresa.entornoSunat`** queda como `'TESTING'` o `'PRODUCTION'` según lo que elija el usuario.
- **En este punto:** la empresa tiene datos reales pero el entorno puede seguir en TESTING.

**Paso 5 — Registro exitoso de empresa real**
- El usuario completa el flujo `create_workspace` con formulario vacío.
- La empresa nueva queda persistida con su workspace y establecimiento inicial.
- Evento analítico: `registrarRegistroEmpresaExitoso()`.
- Payload específico: `{ entorno: 'produccion', origen: 'formulario_empresa' }`.
- **En este punto:** la empresa real ya existe para fines analíticos y los eventos subsiguientes heredan el contexto global de empresa.

### 8.3 Derivación de `entornoAnalitica`

Se encontró que **todos los puntos de disparo de eventos** derivan el entorno de la misma fuente:

```typescript
const entornoAnalitica =
  session?.currentCompany?.configuracionSunatEmpresa?.entornoSunat === 'PRODUCTION'
    ? 'produccion'
    : 'demo';
```

Evidencia en: `EmisionTradicional.tsx:247-249`, `PuntoVenta.tsx:204-206`, `ProductSelector.tsx:172-174`, `ImportPricesTab.tsx:207-209`.

### 8.4 Qué identidad existe antes de configurar la empresa

| Campo | Valor |
|-------|-------|
| `User.id` | ✅ Disponible (generado por backend en registro) |
| `User.email` | ✅ Disponible (ingresado en registro) |
| `User.rol` | ✅ `'admin'` (asignado por defecto) |
| `User.estado` | No verificable — presuntamente `'activo'` |
| `tenantId` | ✅ Disponible (workspace bootstrap UUID, generado localmente) |
| `Workspace.ruc` | ❌ Vacío (`''`) |
| `Workspace.razonSocial` | ❌ Vacío (`''`) |
| `establecimientoId` | ❌ No existe aún (se crea al configurar empresa) |
| `almacenId` | ❌ No existe aún |

### 8.5 Qué identidad existe después de configurar la empresa

| Campo | Valor |
|-------|-------|
| `User.id` | ✅ Sin cambios |
| `User.email` | ✅ Sin cambios |
| `User.rol` | ✅ Sin cambios (`'admin'`) |
| `tenantId` | ✅ Sin cambios (mismo UUID) — pero ahora con RUC y razón social |
| `Workspace.ruc` | ✅ RUC real validado |
| `Workspace.razonSocial` | ✅ Razón social real |
| `entornoSunat` | Puede ser `'TESTING'` o `'PRODUCTION'` |
| `establecimientoId` | ✅ Creado (establecimiento principal autogenerado) |
| `almacenId` | ✅ Creado (almacén principal autogenerado) |

### 8.6 Implicancias para analytics

1. **Antes de configurar la empresa**, el `tenantId` ya existe pero no representa una empresa real. Si se usa como `group_id` analítico, los eventos quedarán agrupados bajo un workspace vacío.

2. **El momento correcto para considerar la identidad como "confiable"** es cuando:
   - `User.id` existe (inmediato tras registro/login).
   - El workspace activo tiene `ruc !== ''` y `razonSocial !== ''`.
   - Opcionalmente, cuando `entornoSunat === 'PRODUCTION'` (si se quiere distinguir producción de sandbox).

3. **No existe un flag explícito** que indique "esta empresa ya fue configurada". La única señal es que `Workspace.ruc !== ''`.

---

## 9. Fuentes de verdad y fragmentaciones encontradas

### 9.1 Usuario

| Fuente | Mecanismo | Escriben | Leen |
|--------|-----------|----------|------|
| **Backend (API)** | `AuthResponse.user`, `/auth/me` | Backend | AuthRepository |
| **AuthStore (Zustand)** | `senciyo-auth-store` en localStorage | AuthRepository | Toda la app vía `useAuthStore` |
| **UserSessionContext** | `facturafacil_user_session` en localStorage | SessionInitializer | Toda la app vía `useUserSession` |
| **globalThis.__USER_SESSION__** | Asignación directa en memoria | UserSessionContext | Posible lectura global |

**Fragmentación:** Moderada. El flujo es unidireccional: Backend → AuthStore → SessionInitializer → UserSessionContext. Pero la duplicación de datos entre `AuthStore.user` y `UserSession.userId/userName/userEmail` puede generar desincronización si alguno se actualiza sin el otro.

### 9.2 Rol

| Fuente | Campo |
|--------|-------|
| **Backend** | `User.rol` en `AuthResponse` |
| **AuthStore** | `user.rol` |
| **UserSession** | `role` |
| **Roles del sistema** | `rolesDelSistema.ts` — define permisos por rol |

**Fragmentación:** Baja. El rol se propaga de forma consistente desde el backend, pero no existe un mecanismo de transición de rol demo → rol real porque no hay rol demo.

### 9.3 Empresa

**Fragmentación:** **Alta.** Documentada en detalle en sección 5.5. Resumen:

- `Empresa` (auth types) proviene del backend con un `id` propio.
- `Workspace` (tenant) se crea/gestiona localmente con un `id` generado por UUID del navegador.
- `Company` (config) recibe su `id` del `tenantId` (ver `SessionInitializer.tsx:56`).
- No se encontró evidencia clara de que `Empresa.id` (del backend) y `Workspace.id` (del TenantProvider) sean el mismo valor en producción.
- El `EMPRESA_ID` del HttpClient nunca se escribe.

### 9.4 Establecimiento

| Fuente | Mecanismo |
|--------|-----------|
| **Backend** | `Empresa.establecimientos[]` en AuthResponse; carga completa vía ContextoConfiguracion |
| **TenantProvider** | `ff_active_establecimiento_by_tenant[tenantId]` — solo el ID activo |
| **globalThis** | `__FF_ACTIVE_ESTABLECIMIENTO_ID` |
| **UserSession** | `currentEstablecimientoId`, `currentEstablecimiento` |
| **ContextService** | `senciyo_last_establecimiento_id` |

**Fragmentación:** Moderada. La resolución del establecimiento activo es consistente (SessionInitializer centraliza), pero hay cinco puntos de lectura posibles.

### 9.5 Almacén

| Fuente | Mecanismo |
|--------|-----------|
| **ConfigurationContext** | `state.almacenes[]` — cargado por establecimiento |
| **useAlmacenes hook** | Filtra por `establecimientoId` |

**Fragmentación:** Baja. Solo vive en el ConfigurationContext con un hook de lectura.

---

## 10. Campos técnicos vs campos de negocio

### 10.1 Clasificación completa

| Campo | Existe en el sistema | Tipo | Clasificación | ¿Cambia en el tiempo? | ¿Apto como ID analítico? |
|-------|---------------------|------|---------------|----------------------|--------------------------|
| `User.id` | ✅ | `string` | **Identidad técnica** | No (inmutable tras creación) | **Sí — debe ser `user_id` en analytics** |
| `User.email` | ✅ | `string` | PII / Dato funcional | Posiblemente (cambio de correo futuro) | **No como ID.** Usar como atributo. |
| `User.nombre` | ✅ | `string` | PII / Atributo display | Sí (el usuario puede editarlo) | No |
| `User.apellido` | ✅ | `string` | PII / Atributo display | Sí | No |
| Celular | ✅ (en registro y modelo User extendido) | `string` | PII / Dato de contacto | Sí | No |
| `User.rol` | ✅ | `UserRole` | **Atributo operativo** | Sí (puede cambiar si se implementan roles dinámicos) | **No como ID.** Sí como propiedad analítica. |
| `User.estado` | ✅ | `UserStatus` | Atributo de estado | Sí | No como ID. Sí como propiedad. |
| `tenantId` / `Workspace.id` | ✅ | `string` (UUID) | **Identidad técnica (empresa)** | No (inmutable por workspace) | **Sí — candidato a `company_id` si se estabiliza la fuente** |
| `Empresa.id` | ✅ (auth types) | `string` | **Identidad técnica (backend)** | No | **Sí — candidato a `company_id` si llega estable del backend** |
| `ruc` | ✅ | `string` | **Atributo de negocio** | Sí (transición de RUC demo a RUC real) | **No como ID.** Sí como propiedad analítica. |
| `razonSocial` | ✅ | `string` | Atributo de negocio | Sí (editable) | No como ID. Propiedad analítica. |
| `nombreComercial` | ✅ | `string?` | Atributo de negocio | Sí | No |
| `entornoSunat` | ✅ | `'TESTING'` \| `'PRODUCTION'` | **Atributo operativo crítico** | Sí (transición demo → prod) | **No como ID.** Sí como propiedad analítica clave. |
| `Establecimiento.id` | ✅ | `string` | **Identidad técnica** | No (inmutable por establecimiento) | **Sí — debe ser `establecimiento_id` en analytics** |
| `codigoEstablecimiento` | ✅ | `string` ("0001") | Atributo de negocio (SUNAT) | Raro | No como ID. Propiedad analítica. |
| `Almacen.id` | ✅ | `string` | **Identidad técnica** | No | Sí, pero no requerido en la identidad base. |
| `codigoAlmacen` | ✅ | `string` | Atributo de negocio | Raro | No |

### 10.2 Datos sensibles (PII) que NO deben viajar como propiedades analíticas sin control

- `email` — Solo si la política de privacidad lo permite; actualmente el README de analítica lo prohíbe.
- `nombre`, `apellido` — El README prohíbe explícitamente enviar nombres.
- Celular, teléfonos, correos electrónicos de empresa, direcciones — Prohibidos.
- `ruc` — Es dato público (registro SUNAT), pero depende de la política de privacidad del producto.
- Datos de representante legal (DNI, nombre) — PII sensible.

---

## 11. Capacidad actual para analítica identificada

### 11.1 Evaluación por pregunta

| Pregunta | Respuesta | Justificación |
|----------|-----------|---------------|
| ¿Se puede saber qué usuario hizo un evento? | **No se puede todavía** | Ningún evento incluye `userId`. Los SDKs no tienen `identify()` implementado. PostHog asigna un `distinct_id` anónimo basado en cookie. |
| ¿Se puede saber a qué empresa pertenecía el usuario al hacer el evento? | **No se puede todavía** | Ningún evento incluye `empresaId`, `tenantId`, `ruc` ni `companyId`. No hay `group()` configurado en ningún SDK. |
| ¿Se puede saber en qué establecimiento se operó? | **No se puede todavía** | Ningún evento incluye `establecimientoId`. |
| ¿Se puede saber qué rol tenía el usuario? | **No se puede todavía** | El rol no se incluye en eventos ni en propiedades de usuario de los SDKs. |
| ¿Se puede distinguir si el usuario estaba en modo demo o real? | **Se puede parcialmente** | La propiedad `entorno: 'demo' \| 'produccion'` sí se incluye en todos los eventos. Esto permite filtrar por entorno a nivel de evento, pero no identificar qué usuario o empresa lo generó. |

### 11.2 ¿Qué se puede medir hoy?

- Volumen total de eventos por tipo (anónimos).
- Distribución de eventos entre `entorno: 'demo'` y `entorno: 'produccion'`.
- Distribución de origen de ventas (`emision` vs `pos`).
- Distribución de origen de productos (`catalogo` vs `emision_inline`).
- Resultados de importaciones (éxito vs errores, rangos de error).

### 11.3 ¿Qué NO se puede medir hoy?

- Retención de usuarios.
- Tasa de activación (registro → primera acción de negocio).
- Tasa de conversión de demo a producción por usuario.
- Revenue per company.
- Feature adoption per user o per company.
- Funnels de usuario (registro → config empresa → primera venta).
- Churn por empresa o por usuario.
- Uso por establecimiento.

---

## 12. Riesgos encontrados si se implementa sin redefinir identidad

### 12.1 Usar `email` como `user_id`

**Riesgo: Alto.** El email es PII, puede cambiar en el futuro (si se implementa cambio de correo), y viola la política de privacidad definida en el README de analítica. Además, en analytics, usar datos mutables como ID genera fragmentación de perfiles (un mismo usuario aparecería como dos personas si cambia su email).

### 12.2 Usar `ruc` como `company_id`

**Riesgo: Alto.** El RUC es un dato de negocio que puede estar vacío (empresa bootstrap), puede actualizarse (transición demo → producción), y no es único como identificador técnico en el frontend (podrían existir dos workspaces con el mismo RUC temporalmente). Usar RUC como ID analítico causaría merges incorrectos si dos empresas comparten temporalmente el mismo RUC o si el RUC cambia.

### 12.3 Mezclar workspace local con empresa real del backend

**Riesgo: Medio-alto.** Si se usa el `workspaceId` (generado localmente) como `company_id` analítico sin verificar que coincida con el `Empresa.id` del backend, se podrían crear "empresas fantasma" en analytics que no existen realmente en el sistema de producción. Además, si el usuario borra localStorage, se generaría un nuevo workspace con un nuevo UUID para la misma empresa real.

### 12.4 No distinguir rol demo de rol real

**Riesgo: Medio.** Dado que el "rol demo" no existe como tal, el riesgo real es no distinguir el `entorno` de la empresa. Si la identidad analítica se establece sin considerar que `entornoSunat = 'TESTING'` equivale a "fase demo", los funnels mezclarían usuarios de prueba con usuarios en producción. Se debe incluir `entornoSunat` como propiedad del grupo empresa.

### 12.5 No separar identidad técnica de atributo de negocio

**Riesgo: Alto.** Si se usa un campo como `razonSocial` o `nombreComercial` como identificador de empresa en analytics, la empresa cambiaría de "identidad" cada vez que el usuario edite su razón social. Los segmentos y cohortes se romperían.

### 12.6 No definir bien el nivel de establecimiento

**Riesgo: Medio.** Si no se incluye `establecimientoId` al menos como propiedad del evento, se pierde la capacidad de segmentar ventas, productos y clientes por punto de venta. Para negocios multi-sucursal, esta información es crítica para análisis operativo.

### 12.7 Identificar antes de que la empresa esté configurada

**Riesgo: Medio.** Si se ejecuta `posthog.identify(userId)` y `posthog.group('company', tenantId)` inmediatamente tras el login, pero el workspace tiene RUC vacío y razón social vacía, la empresa aparecerá en analytics como un grupo sin datos útiles. Eventos posteriores se atribuirán a una "empresa en blanco" que luego cambiará de atributos.

---

## 13. Qué está habilitado, parcialmente habilitado o no habilitado

| Frente | Estado | Evidencia |
|--------|--------|-----------|
| **Identidad técnica de usuario** | **Parcialmente habilitado** | `User.id` existe y es accesible vía `AuthStore.user.id` y `UserSession.userId`. No se ha verificado que sea UUID estable del backend en producción. En dev es timestamp-based. |
| **Identidad técnica de empresa** | **Parcialmente habilitado** | Existe `tenantId` / `Workspace.id` como concepto funcional, pero la fuente está fragmentada y es generada localmente. No se confirmó la estabilidad del ID en producción ni su equivalencia con `Empresa.id` del backend. |
| **Identidad técnica de establecimiento** | **Parcialmente habilitado** | `Establecimiento.id` existe y se gestiona correctamente dentro del contexto de la app. No se ha verificado si es generado por backend o por front en flujos de creación. |
| **Identidad técnica de almacén** | **Parcialmente habilitado** | `Almacen.id` existe y se gestiona en `ConfigurationContext`. No participa actualmente en sesión ni en analítica. |
| **Rol demo/temporal** | **No habilitado** | No existe como concepto formal en el modelo de datos. Lo más cercano es incluir `entornoSunat` como propiedad o usar `Workspace.ruc === ''` como señal de "no configurado". |
| **Rol real persistido** | **Habilitado** | `User.rol` se persiste en AuthStore y se propaga a UserSession.role. Los roles disponibles (`super_admin`, `admin`, `contador`, `vendedor`, `almacenero`, `viewer`) son estables y bien definidos. |
| **Asociación usuario-empresa** | **Parcialmente habilitado** | `AuthResponse.empresas[]` vincula al usuario con sus empresas. `UserSession` vincula `userId` con `currentCompanyId`. Pero esta asociación no llega a analytics. |
| **Asociación empresa-establecimiento** | **Habilitado** | `Empresa.establecimientos[]` y `ConfigurationContext.Establecimientos[]` mantienen la relación. `SessionInitializer` resuelve el establecimiento activo correctamente. |
| **Asociación establecimiento-almacén** | **Habilitado** | `Almacen.establecimientoId` es clave foránea explícita. `useAlmacenes` filtra correctamente por establecimiento. |
| **Base para `identify` en analytics** | **No habilitado** | Cero llamadas a `identify()` / `setUserId()`. Los datos existen pero el puente no se ha construido. |
| **Base para `group`/account analytics** | **No habilitado** | Cero llamadas a `group()` / `setGroup()`. El concepto de empresa existe pero no llega a ningún SDK. |
| **Base para trazabilidad operativa real** | **No habilitado** | Los eventos se envían sin ningún dato de identidad. Solo incluyen `entorno`, `origen` y propiedades operativas básicas. No es posible trazar un evento hasta un usuario, empresa o establecimiento concreto. |

---

## 14. Modelo mínimo recomendado de identidad analítica para SenciYo

### 14.1 Definición de identificadores

| Nivel | ID analítico recomendado | Fuente | Momento de disponibilidad |
|-------|--------------------------|--------|--------------------------|
| **Usuario** | `User.id` (del backend) | `AuthStore.user.id` / `UserSession.userId` | Inmediato tras login exitoso |
| **Empresa** | `Empresa.id` del backend (si es estable y UUID) o `tenantId` (si backend ya lo usa como ID) | `UserSession.currentCompanyId` + verificación de origen backend | Tras login exitoso con empresa asignada |
| **Establecimiento** | `Establecimiento.id` | `UserSession.currentEstablecimientoId` | Tras resolución en SessionInitializer |
| **Almacén** | `Almacen.id` | `ConfigurationContext.state.almacenes[]` | Solo cuando sea operativamente relevante |

### 14.2 Propiedades del usuario (user properties)

| Propiedad | Fuente | Notas |
|-----------|--------|-------|
| `user_role` | `User.rol` | Distingue admin, vendedor, contador, etc. |
| `user_status` | `User.estado` | Activo, inactivo, pendiente |
| `email_verified` | `User.emailVerificado` | Booleano |
| `has_2fa` | `User.require2FA` | Booleano |
| `created_at` | `User.fechaCreacion` | Timestamp de registro |

**No incluir como propiedades analíticas (PII restringida según política):** email, nombre, apellido, celular.

### 14.3 Propiedades del grupo empresa (group properties)

| Propiedad | Fuente | Notas |
|-----------|--------|-------|
| `ruc` | `Workspace.ruc` / `Company.ruc` | Dato público SUNAT. Incluir solo si la política lo permite. |
| `razon_social` | `Workspace.razonSocial` / `Company.razonSocial` | Opcional según política PII. |
| `entorno_sunat` | `Company.configuracionSunatEmpresa.entornoSunat` | **Crítico**: discrimina 'TESTING' (demo) de 'PRODUCTION' (real). |
| `regimen_tributario` | `Company.regimenTributario` | GENERAL, MYPE, ESPECIAL |
| `moneda_base` | `Company.monedaBase` | PEN o USD |
| `empresa_activa` | `Company.estaActiva` | Booleano |
| `empresa_created_at` | `Workspace.createdAt` | Fecha de creación del workspace |
| `total_establecimientos` | `ConfigurationContext.Establecimientos.length` | Cantidad activos |

### 14.4 Propiedades del evento (event properties)

Cada evento debería enriquecerse con las siguientes propiedades contextuales adicionales a las que ya tiene:

| Propiedad | Fuente | Notas |
|-----------|--------|-------|
| `establecimiento_id` | `UserSession.currentEstablecimientoId` | Contexto de dónde ocurrió la acción |
| `establecimiento_codigo` | `Establecimiento.codigoEstablecimiento` | Código SUNAT para contexto de negocio |

Las propiedades existentes (`entorno`, `origen`, `origenVenta`, etc.) deben mantenerse.

### 14.5 Cuándo ejecutar la identificación analítica

| Momento | Acción | Condición |
|---------|--------|-----------|
| **Login exitoso / restauración de sesión** | `posthog.identify(userId, userProperties)` y `amplitude.setUserId(userId)` | `AuthStore.isAuthenticated === true` Y `AuthStore.user.id` disponible |
| **Sesión inicializada con empresa** | `posthog.group('company', companyId, groupProperties)` | `UserSession.currentCompanyId` disponible Y `Workspace.ruc !== ''` |
| **Cambio de empresa** | Actualizar `posthog.group('company', newCompanyId, newGroupProperties)` | Cuando `tenantId` cambia |
| **Cambio de establecimiento** | No requiere `identify` adicional; incluir `establecimiento_id` como propiedad en cada evento | Automático vía `SessionInitializer` |
| **Logout** | `posthog.reset()`, `amplitude.reset()`, `mixpanel.reset()` | Al invocar `AuthRepository.logout()` |

### 14.6 Cuándo NO considerar la identidad como confiable

| Situación | Acción recomendada |
|-----------|-------------------|
| Workspace con `ruc === ''` y `razonSocial === ''` | Ejecutar `identify` del usuario pero **no** `group` de empresa. Marcar como `empresa_configurada: false`. |
| `entornoSunat === 'TESTING'` | Ejecutar `identify` y `group` normalmente, pero con la propiedad `entorno_sunat: 'TESTING'`. Filtrar en dashboards. |
| Modo desarrollo (localhost/dev) | No enviar eventos (ya está implementado en `analitica.ts`). |

### 14.7 Cómo reflejar el registro de empresa real en analytics

1. **Antes de configurar empresa:** El usuario está identificado (`user_id`), pero no tiene grupo empresa (`group` no se ejecuta si `ruc === ''`).
2. **Al registrar una empresa real nueva:** Se ejecuta el flujo de creación de workspace y se dispara `registro_empresa_exitoso`.
3. **Después de sincronizar identidad y contexto:** Los eventos posteriores ya llevan `company_id`, `company_name` y `entorno` desde la capa global.

Este modelo permite construir funnels como:
- Registro → Registro de empresa real → Primera venta.
- Separar métricas de empresas TESTING vs PRODUCTION.
- Identificar usuarios que nunca completan la configuración de empresa.

### 14.8 Qué debe persistirse vs. recalcularse

| Dato | Persistir | Recalcular | Justificación |
|------|-----------|------------|---------------|
| `userId` | No (ya persistido en AuthStore) | Leer de AuthStore en cada sesión | Fuente de verdad es el backend |
| `companyId` | No (ya persistido en TenantProvider) | Leer de TenantProvider/UserSession | Fuente de verdad es el workspace activo |
| `establecimientoId` | No (ya persistido en TenantProvider) | Leer de UserSession en cada evento | Se resuelve automáticamente |
| `userProperties` | No | Recalcular en cada `identify` | Pueden cambiar (rol, estado, 2FA) |
| `groupProperties` | No | Recalcular en cada `group` | Pueden cambiar (RUC, régimen, entorno SUNAT) |
| `entornoAnalitica` | No | Derivar en cada evento de `configuracionSunatEmpresa.entornoSunat` | Puede cambiar en el tiempo |

---

## 15. Conclusión final

SenciYo tiene una base operativa funcional para la autenticación, multi-empresa y gestión de contexto. Los datos necesarios para construir una identidad analítica robusta **ya existen dentro del sistema**, pero no fluyen hacia las plataformas de analítica.

**El problema no es la ausencia de datos, sino la ausencia del puente entre los datos internos y los SDKs de analytics.**

Antes de implementar dicho puente, se recomienda:

1. **Confirmar la estabilidad del ID de empresa**: Verificar con el equipo de backend si `Empresa.id` (devuelto en `AuthResponse.empresas[].id`) es un UUID permanente y si coincide o puede coincidir con el `Workspace.id` del TenantProvider. Si no coinciden, se debe definir cuál será la fuente canónica y ajustar el flujo para unificarlos.

2. **Resolver la clave legacy `EMPRESA_ID` del HttpClient**: Decidir si se elimina o se alimenta correctamente. Actualmente es código muerto.

3. **Definir formalmente el estado "empresa no configurada"**: Agregar un campo explícito o una función helper que indique si el workspace tiene datos de empresa válidos (`ruc !== '' && razonSocial !== ''`), para usar como condición en la identificación analítica (`group` solo cuando la empresa es real).

4. **Implementar `identify`/`group`/`reset`** en un único punto centralizado — idealmente como un efecto en `SessionInitializer` o como un componente hermano — que observe los cambios de sesión y ejecute las llamadas a los tres SDKs de forma coordinada.

5. **Enriquecer `capturarEvento`** para incluir `establecimientoId` como propiedad base de todos los eventos operativos, sin requerir que cada caller lo pase manualmente.

Con estos cinco pasos, el sistema quedaría preparado para una analítica de producto identificada, accionable y coherente con la jerarquía de negocio de SenciYo.
