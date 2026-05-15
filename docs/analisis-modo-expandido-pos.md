# Análisis técnico-funcional: modo expandido del Punto de Venta

**Fecha:** 2026-05-14  
**Autor:** Auditoría técnica — arquitectura frontend  
**Estado:** Borrador para revisión de PM  
**Versión:** 1.0

---

## 1. Objetivo

El módulo Punto de Venta de SenciYo opera correctamente dentro del shell de la aplicación, que incluye un header global (64px de alto) y un sidebar de navegación lateral (64–232px de ancho). En pantallas de uso operativo intensivo —monitores de caja, tablets POS, laptops de vendedor— ese espacio consumido por elementos administrativos reduce el área útil disponible para la grilla de productos y el panel de carrito.

El objetivo de este análisis es:

1. Evaluar cuál es la forma más conveniente de permitir que el POS ocupe el máximo espacio visual disponible.
2. Comparar cinco enfoques técnicos distintos con sus trade-offs reales.
3. Recomendar la implementación de menor riesgo, sin duplicar lógica de negocio, sin perder estado de carrito y sin romper el flujo de venta existente.
4. Documentar una Fase 1 ejecutable y una Fase 2 opcional para el futuro.

Este documento **no implementa nada**. Es insumo para la decisión del equipo antes de cualquier codificación.

---

## 2. Contexto actual del POS

### 2.1 Estructura del shell global (`PrivateLayout.tsx`)

Todas las rutas privadas de SenciYo comparten un único layout:

```
┌──────────────────────────────────────────────────────────────────────┐
│  HEADER GLOBAL   h-16 (64px) · position: fixed-like · z-50         │
│  Logo · Búsqueda global · Empresa/Establecimiento · Estado de caja  │
│  Notificaciones · Ayuda · Config · Perfil de usuario                │
└──────────────────────────────────────────────────────────────────────┘
┌──────────────┬───────────────────────────────────────────────────────┐
│  SIDEBAR     │  CONTENIDO PRINCIPAL (flex-1)                         │
│  z-40        │  overflow-y-auto · overflow-x-hidden                  │
│  64px (icon) │                                                        │
│  232px (open)│  <Outlet />  →  Ruta activa                          │
│  transition  │                                                        │
│  300ms       │                                                        │
└──────────────┴───────────────────────────────────────────────────────┘
```

**Propiedades relevantes del layout (código real):**

```jsx
// PrivateLayout.tsx — estructura abreviada
<div className="h-screen flex flex-col bg-slate-50 overflow-hidden print:block">
  <div className="flex-shrink-0 z-50 print:hidden">
    <Header />                          {/* 64px — oculto al imprimir */}
  </div>
  <div className="flex flex-1 overflow-hidden print:block">
    <div className="flex-shrink-0 h-full z-40 print:hidden">
      <SideNav collapsed={sidebarCollapsed} />   {/* 64–232px — oculto al imprimir */}
    </div>
    <div className="flex-1 flex flex-col transition-all duration-300 overflow-x-hidden print:block">
      <Outlet />                        {/* Espacio restante */}
    </div>
  </div>
</div>
```

**Estado del sidebar:** `useState(false)` local en `PrivateLayout` — no hay contexto global expuesto al exterior.

### 2.2 Ruta del POS

```
/punto-venta          → redirect automático a /punto-venta/nueva-venta
/punto-venta/nueva-venta → <PuntoVenta /> (con permisos ventas.pos.ver + ventas.pos.vender)
/punto-venta/dashboard → <PuntoVentaHome /> (landing de opciones)
```

No existe ninguna ruta con un layout diferente al `PrivateLayout` estándar.

### 2.3 Layout interno del POS (`PuntoVenta.tsx`)

El componente `PuntoVenta` tiene su **propio header interno** más el grid bicolumna:

```
┌──────────────────────────────────────────────────────┐
│  HEADER INTERNO DEL POS                              │
│  ShoppingCart · "Punto de Venta" POS · Dashboard ↗  │
└──────────────────────────────────────────────────────┘
┌─────────────────────────────┬────────────────────────┐
│  PRODUCTGRID                │  CARTCHECKOUTPANEL     │
│  (minmax(0, 1fr))           │  (520px fijo)          │
│  · Buscador + scanner       │  · Cliente             │
│  · Filtro por categoría     │  · Tipo comprobante    │
│  · Vista cards/lista        │  · Items carrito       │
│  · Grilla de productos      │  · Totales + IGV       │
│                             │  · Acción de cobro     │
└─────────────────────────────┴────────────────────────┘
```

### 2.4 Espacio consumido por elementos no operativos

En una pantalla de **1366 × 768px** (laptop estándar de vendedor):

| Elemento | Espacio consumido | Impacto |
|---|---|---|
| Header global | 64px de alto | Reduce altura útil en ~8% |
| Sidebar colapsado | 64px de ancho | Reduce ancho útil en ~5% |
| Sidebar expandido | 232px de ancho | Reduce ancho útil en ~17% |
| Header interno POS | ~72px de alto | Fijo, forma parte del POS |

Espacio neto disponible para la grilla de productos en sidebar expandido: ≈ `(1366 - 232 - 520) px = 614px` para el ProductGrid.
En modo expandido completo (sin sidebar ni header): ≈ `(1366 - 520) px = 846px` para el ProductGrid — **+38% de ancho adicional**.

### 2.5 Patrón de impresión ya implementado (referencia)

El layout **ya tiene** una solución de "ocultar todo menos el contenido" para el modo de impresión:

```jsx
// Sidebar y Header tienen print:hidden — desaparecen al imprimir
// El contenido pasa a print:block y ocupa el 100%
```

Este patrón es la prueba de concepto de que el enfoque de ocultamiento CSS es técnicamente viable dentro de la arquitectura actual.

---

## 3. Problema de espacio operativo

### 3.1 El caso de uso real

Un cajero que opera el POS durante horas no necesita:
- El buscador global del header.
- Las notificaciones.
- La configuración global.
- La navegación lateral a otros módulos.
- El indicador de empresa/establecimiento (ya sabe dónde trabaja).

Lo que sí necesita visible todo el tiempo:
- El estado de la caja activa (¿está abierta? ¿cuánto hay?).
- El carrito con totales.
- La grilla de productos lo más grande posible.
- Los botones de cobro.
- La impresión preliminar y la configuración del POS.

### 3.2 Consecuencia del espacio reducido

Con sidebar expandido en pantalla de 1366px:
- El ProductGrid tiene ~614px disponibles.
- En ese ancho caben 2–3 columnas de tarjetas de producto.
- El cajero necesita hacer scroll o buscar más para encontrar productos.

En modo expandido sin sidebar y sin header:
- El ProductGrid tendría ~846px.
- Caben 4–5 columnas de tarjetas.
- Menos scroll, más velocidad, menos errores en la selección.

---

## 4. Alternativas evaluadas

### 4.1 Enfoque A — Modo vista ampliada en la misma ruta

#### Descripción
El usuario permanece en `/punto-venta/nueva-venta`. Al presionar un ícono de "expandir", el POS oculta el header global y/o el sidebar sin recargar la página. Un botón visible (o tecla Esc) restaura la vista normal.

Implementación técnica: requiere exponer una función de control del layout (sidebar + header) desde `PrivateLayout` hacia rutas hijas, vía un nuevo contexto React (`ContextoAppShell` o similar).

#### Ventajas
- **Cero pérdida de estado:** carrito, borrador, caja, cliente — todo permanece intacto.
- **Sin rutas nuevas:** no duplica componentes ni lógica.
- **Patrón existente:** el `print:hidden` ya demuestra que el layout puede ocultarse selectivamente.
- **Reversible:** el usuario puede entrar y salir del modo libremente.
- **Sin riesgo de contextos:** todos los providers (Caja, Config, Sesión) siguen activos.

#### Desventajas
- Requiere crear un contexto React nuevo para exponer el control del layout a las rutas hijas.
- El `sidebarCollapsed` hoy es estado local de `PrivateLayout` — hay que sacarlo a un contexto.
- Hay que asegurarse de que los modales (CobranzaModal, SuccessModal, CreditScheduleModal) no queden con `z-index` conflictivo en modo ampliado.

#### Riesgos
- **Bajo** — si el contexto está bien encapsulado, solo afecta al POS mientras está activo.
- Los modales usan `fixed` positioning, que no depende del sidebar/header — riesgo mínimo.
- Si el usuario navega a otro módulo, el contexto se resetea automáticamente (sin efectos secundarios).

#### Archivos impactados
| Archivo | Tipo de cambio |
|---|---|
| `src/layouts/PrivateLayout.tsx` | Exponer control de sidebar/header a través de contexto |
| `src/pages/.../PuntoVenta.tsx` | Consumir contexto + botón expandir/contraer |
| `src/contexts/ContextoAppShell.tsx` | **Nuevo** — contexto mínimo de layout |
| `src/layouts/components/Header.tsx` | Leer estado del contexto para ocultarse |

#### Nivel de esfuerzo
**Bajo-Medio** — 1–2 jornadas de desarrollo.

#### Nivel de riesgo
**Bajo** — impacto quirúrgico en PrivateLayout y POS.

#### Cuándo conviene
Cuando se quiere la solución más rápida, sin duplicar lógica y sin cambiar la URL que el usuario ya conoce.

---

### 4.2 Enfoque B — Fullscreen API del navegador

#### Descripción
Llamar a `document.documentElement.requestFullscreen()` (o `element.requestFullscreen()` sobre el contenedor del POS) para que el navegador entre en modo pantalla completa real. El sistema operativo oculta la barra de tareas y el navegador elimina sus propios controles.

#### Ventajas
- **Sin cambios de layout:** la barra de navegación del navegador desaparece sola.
- **Muy fácil de implementar:** 3–5 líneas de código.
- **No requiere contexto nuevo.**
- **Compatible:** ~95% de navegadores modernos lo soportan.

#### Desventajas
- **El sidebar y el header siguen visibles** — la Fullscreen API no los oculta, solo maximiza el viewport del navegador. Para aprovecharla hay que combinarla con Enfoque A.
- El usuario necesita presionar F11 o Esc para salir (comportamiento del SO), o un botón propio.
- En algunos entornos corporativos o quioscos, la Fullscreen API puede estar bloqueada por política del sistema.
- La UI en pantalla completa real sin sidebar/header todavía requiere el trabajo del Enfoque A.

#### Riesgos
- **Medio** — por sí sola no resuelve el problema. Solo agranda el espacio del navegador, no del POS.
- Puede confundir al usuario que no espera que el navegador entre en "pantalla completa de sistema".
- El menú del navegador desaparece — algunos usuarios se desorientan.

#### Archivos impactados
| Archivo | Tipo de cambio |
|---|---|
| `src/pages/.../PuntoVenta.tsx` | Añadir llamada a `requestFullscreen()` en el botón |

#### Nivel de esfuerzo
**Muy bajo** — horas. Pero incompleto por sí solo.

#### Nivel de riesgo
**Medio** — no resuelve el problema real sin combinarse con Enfoque A.

#### Cuándo conviene
Como complemento opcional del Enfoque A para pantallas de monitores de caja dedicados, no como solución principal.

---

### 4.3 Enfoque C — Ruta dedicada tipo terminal POS

#### Descripción
Crear una ruta nueva (`/pos`, `/punto-venta/terminal` o similar) que renderice el POS con un layout propio, sin el header ni el sidebar del shell estándar. En React Router v6 esto implica registrar la ruta fuera del `PrivateLayout` o con un layout alternativo mínimo.

#### Ventajas
- **Máximo espacio:** layout verdaderamente limpio, optimizable para pantalla POS.
- **Independiente del shell:** puede tener su propio diseño sin afectar otras rutas.
- **Preparado para modo quiosco:** pensando en el futuro, esta ruta puede ser el punto de entrada para tablets POS dedicadas.

#### Desventajas
- **Alta complejidad de contextos:** todos los providers que necesita el POS actualmente vienen del shell (`CajaContext`, `ConfigurationContext`, `UserSessionContext`, `TenantProvider`, `ComprobanteContext`) — habría que reprovisionar todos ellos en la nueva ruta.
- **Riesgo de duplicar lógica:** si el POS tiene bugs o mejoras, hay que aplicarlos en ambas rutas.
- **Sin estado compartido con la ruta principal:** si el usuario tiene un carrito en `/punto-venta/nueva-venta`, navegar a `/pos` empieza desde cero a menos que se implemente sincronización.
- **Problema de borrador:** el sistema de borrador automático usa `companyId + establecimientoId + tipo` como clave de localStorage — el borrador sí se recuperaría, pero hay que validarlo.
- **Más archivos nuevos:** nuevo layout, posiblemente nueva configuración de router.

#### Riesgos
- **Alto** — reprovisionar contextos es frágil. Si se olvida uno, el POS falla silenciosamente (ej: caja siempre cerrada, sin datos de empresa, etc.).
- El borrador funciona por localStorage pero la sincronización de carrito en tiempo real entre dos rutas es compleja.

#### Archivos impactados
| Archivo | Tipo de cambio |
|---|---|
| `src/routes/privateRoutes.tsx` | Registrar nueva ruta |
| `src/layouts/PosTerminalLayout.tsx` | **Nuevo** — layout mínimo |
| `src/pages/.../PuntoVenta.tsx` | Reutilizar sin cambios (ideal) |
| Múltiples providers de contexto | Reprovisionar en nuevo layout |

#### Nivel de esfuerzo
**Alto** — 3–5 jornadas mínimas, más pruebas extensas de contextos.

#### Nivel de riesgo
**Alto** — muchas dependencias de contexto que reprovisionar correctamente.

#### Cuándo conviene
Solo si se decide crear una experiencia POS verdaderamente dedicada para un dispositivo de caja. No como primera iteración.

---

### 4.4 Enfoque D — Nueva pestaña o ventana POS

#### Descripción
Desde el POS actual, un botón abre `window.open('/pos', '_blank')` con la experiencia POS en una nueva pestaña o ventana del navegador.

#### Ventajas
- El vendedor puede tener el POS en un monitor y el admin en otro (multi-monitor).
- La pestaña POS puede maximizarse manualmente en pantalla completa.

#### Desventajas
- **Sin estado compartido en tiempo real:** carrito, cliente, tipo de comprobante — no se sincronizan entre pestañas sin una capa adicional (localStorage events, BroadcastChannel, etc.).
- **Sesión duplicada:** si la sesión expira en una pestaña y no en la otra, se generan inconsistencias.
- **Caja activa:** el contexto de caja está en memoria — no se comparte entre ventanas automáticamente.
- **Impresión:** el servicio de impresión crea iframes en el documento actual — en una nueva pestaña funciona pero con contexto independiente.
- **Complejidad operativa:** el vendedor puede confundirse con dos instancias del sistema activas.
- Los bloqueadores de popups del navegador pueden bloquear `window.open`.

#### Riesgos
- **Muy alto** — la sincronización de estado entre ventanas es una deuda técnica significativa.
- Riesgo de doble emisión de comprobantes si el vendedor no cierra la pestaña vieja correctamente.

#### Archivos impactados
Múltiples — además de los del Enfoque C, requiere infraestructura de sincronización entre pestañas.

#### Nivel de esfuerzo
**Muy alto** — 2–3 semanas considerando la sincronización robusta.

#### Nivel de riesgo
**Muy alto** — no recomendado como solución a corto plazo.

#### Cuándo conviene
Escenario de terminal POS dedicado con hardware específico, en el que se define explícitamente que el POS tiene su propia sesión aislada. No aplica para el caso actual.

---

### 4.5 Enfoque E — Solo colapsar sidebar/header existente

#### Descripción
Aprovechar el control de colapso del sidebar que ya existe (`sidebarCollapsed` en `PrivateLayout`) para colapsarlo automáticamente al entrar al POS. Opcionalmente ocultar el header con una clase condicional.

#### Ventajas
- **Mínimo código:** si el sidebar ya tiene estado controlado, solo hay que exponerlo.
- **Sin nuevas rutas ni contextos complejos.**
- Sidebar colapsado a 64px ya es un ahorro visible.

#### Desventajas
- **El header sigue visible:** consume 64px de alto que siguen siendo innecesarios para el cajero.
- **Sin botón explícito de modo ampliado:** el usuario no sabe por qué el sidebar se colapsó al entrar.
- **El estado de colapso hoy es local en `PrivateLayout`:** hay que exponerlo de alguna manera (lo cual ya implica parte del trabajo del Enfoque A).
- Si el usuario abre el sidebar manualmente, vuelve a reducir el espacio — sin forma de recuperarlo automáticamente.

#### Riesgos
- **Bajo** — pero la experiencia resultante es incompleta. El header sigue visible.

#### Archivos impactados
| Archivo | Tipo de cambio |
|---|---|
| `src/layouts/PrivateLayout.tsx` | Exponer `setSidebarCollapsed` |
| `src/pages/.../PuntoVenta.tsx` | Llamar collapse al montar |

#### Nivel de esfuerzo
**Bajo** — horas.

#### Nivel de riesgo
**Bajo** — pero resulta en una solución incompleta.

#### Cuándo conviene
Como **medida temporal** mientras se implementa el Enfoque A completo. Puede ser el primer commit de la Fase 1.

---

## 5. Comparativa de alternativas

| Alternativa | Experiencia de usuario | Riesgo técnico | Impacto en arquitectura | Riesgo de duplicar lógica | Riesgo de perder carrito | Mantenibilidad | Recomendación |
|---|---|---|---|---|---|---|---|
| **A — Vista ampliada (misma ruta)** | ★★★★★ | Bajo | Mínimo (1 contexto nuevo) | Nulo | Nulo | Alta | ✅ **Recomendado** |
| **B — Fullscreen API** | ★★★☆☆ | Medio | Ninguno | Nulo | Nulo | Alta | ⚠️ Complemento de A |
| **C — Ruta terminal POS** | ★★★★★ | Alto | Alto (layout + providers) | Alto | Medio | Media | 🔜 Fase 2 |
| **D — Nueva pestaña** | ★★☆☆☆ | Muy alto | Muy alto | Alto | Alto | Baja | ❌ No recomendado |
| **E — Solo colapsar sidebar** | ★★★☆☆ | Bajo | Mínimo | Nulo | Nulo | Alta | ⚠️ Medida temporal |

---

## 6. Recomendación final

### Alternativa recomendada: **A — Modo vista ampliada en la misma ruta**

**Razón:** Es la única alternativa que maximiza el espacio del POS (ocultando header y sidebar) sin duplicar lógica, sin perder estado de carrito, sin reprovisionar contextos y sin crear rutas nuevas que generen deuda técnica.

El patrón técnico ya está probado por el modo de impresión (`print:hidden` en Header y SideNav). Solo falta exponer el control programático a través de un contexto React mínimo.

**Nombre funcional recomendado para el usuario:** **"Vista ampliada"**

Razón: "Pantalla completa" puede confundirse con la acción del navegador (F11). "Modo terminal" o "modo quiosco" son términos técnicos. "Vista ampliada" es claro, breve y en español natural. Como ícono se puede usar `Maximize2` de Lucide (consistente con el resto del sistema).

**Sobre el Fullscreen API (Enfoque B):** puede implementarse como complemento opcional en la misma Fase 1, como un checkbox en la configuración del POS o como acción secundaria. No debe ser la solución principal.

---

## 7. Propuesta de Fase 1

### Objetivo
Implementar el modo vista ampliada del POS sin duplicar código, sin riesgo de perder carrito y con impacto mínimo en la arquitectura.

### Qué hacer

1. **Crear `ContextoAppShell`** (`src/contexts/ContextoAppShell.tsx`):
   - Expondrá: `modoAmpliado: boolean` + `setModoAmpliado: (v: boolean) => void`
   - Provider envuelve el contenido de `PrivateLayout`
   - Las rutas hijas pueden consumirlo via `useModoAmpliado()`

2. **Modificar `PrivateLayout.tsx`**:
   - Envolver contenido con `<AppShellProvider>`
   - El header y el sidebar leen `modoAmpliado` del contexto
   - Cuando `modoAmpliado === true`: Header y SideNav se ocultan (`hidden` o `display: none`)
   - Transición suave (usar `transition-all` ya presente) o animación simple

3. **Modificar `PuntoVenta.tsx`**:
   - Consumir `useModoAmpliado()`
   - Agregar botón de expandir/contraer en el header interno del POS
   - Al desmontar el componente (`useEffect` cleanup): `setModoAmpliado(false)` — restaura el layout

4. **Manejar salida del modo ampliado**:
   - Tecla `Escape` (event listener en `useEffect`)
   - El mismo ícono (toggle) — `Maximize2` activo → `Minimize2` inactivo
   - Al navegar fuera del POS (el cleanup del `useEffect` ya lo maneja)

### Qué no hacer

- No crear rutas nuevas.
- No tocar `CartCheckoutPanel`, `ProductGrid`, ni ningún componente de negocio.
- No tocar lógica de cobranza, caja, comprobantes, descuentos, stock ni impresión.
- No duplicar el componente `PuntoVenta`.
- No persistir el estado (ver sección 7.5).
- No implementar el modo quiosco ni kiosco todavía.

### Dónde ubicar el ícono

**Recomendación: en el header interno del POS, extremo derecho, junto al botón de dashboard.**

```
┌──────────────────────────────────────────────────────────┐
│  [🛒] Punto de Venta  POS        [⬜ Dashboard] [⛶]    │
└──────────────────────────────────────────────────────────┘
```

- No va en el header global — el usuario no debería modificar el layout desde un control global.
- No va en el `CartCheckoutPanel` — ese panel ya tiene sus íconos (impresora, configuración, descuento).
- No va en una esquina flotante — los flotantes son intrusivos y difíciles de encontrar.
- La ubicación en el header del POS es consistente con el botón de dashboard que ya está ahí.

### Qué ocultar en modo ampliado

| Elemento | Acción | Justificación |
|---|---|---|
| Header global (64px alto) | **Ocultar** | No aporta al flujo de venta |
| Sidebar navegación (64–232px) | **Ocultar** | El cajero no navega a otros módulos |
| Buscador global del header | **Ocultar** (parte del header) | El POS tiene su propio buscador |
| Notificaciones globales | **Ocultar** (parte del header) | No crítico en operación de caja |
| Menú de perfil global | **Ocultar** (parte del header) | No crítico en operación de caja |

### Qué mantener visible en modo ampliado

| Elemento | Justificación |
|---|---|
| Header interno del POS | Tiene el título y el botón de salir del modo |
| Estado de caja activa | El cajero debe saber si la caja está abierta — pero está en el header global. Ver decisión pendiente §10 |
| Carrito completo (CartCheckoutPanel) | Operativo de venta |
| ProductGrid | Operativo de venta |
| Botones de cobro | Operativos de venta |
| Íconos de impresora/config del POS | Operativos de venta |
| Indicador "Auto: efectivo" | Operativo de venta |
| Modales (Cobranza, Éxito, Crédito) | Operativos — se renderizan en `fixed` por encima de todo |

### Cómo salir del modo ampliado

- **Tecla Esc** (event listener en el `useEffect` del POS — consistente con otros modales del sistema).
- **Clic en el ícono de contraer** (`Minimize2` de Lucide) — mismo lugar que el ícono de expandir.
- **Navegar a otra ruta** — el cleanup del `useEffect` restaura el layout automáticamente.
- El botón de "Ir al dashboard" en el header interno del POS ya navega fuera — al salir, el cleanup restaura todo.

### Persistencia del modo ampliado

**No persistir.** El modo ampliado se activa solo durante la sesión de navegación actual y se resetea al:
- Salir del POS (navegar a otro módulo).
- Recargar la página.
- Cerrar la pestaña.

**Razón:** Persistir el estado (localStorage) implicaría que al abrir SenciYo la próxima vez, el usuario vería el sistema sin sidebar ni header, lo cual es confuso y puede parecer un error. La decisión de expandir debe ser explícita en cada sesión de venta.

### Archivos a tocar en Fase 1

| Archivo | Tipo de cambio | Riesgo |
|---|---|---|
| `src/contexts/ContextoAppShell.tsx` | **Nuevo** — contexto mínimo (≈20 líneas) | Muy bajo |
| `src/layouts/PrivateLayout.tsx` | Envolver con provider + leer estado | Bajo |
| `src/layouts/components/Header.tsx` | Leer `modoAmpliado` para ocultarse | Bajo |
| `src/layouts/components/SideNav.tsx` | Leer `modoAmpliado` para ocultarse | Bajo |
| `src/pages/.../PuntoVenta.tsx` | Consumir contexto + ícono + cleanup | Bajo |

**Total: 1 archivo nuevo + 4 modificaciones puntuales.**

---

## 8. Propuesta de Fase 2 futura

Una vez que el modo vista ampliada esté en producción y validado con cajeros reales, se puede evaluar:

### 8.1 Ruta terminal POS dedicada (`/punto-venta/terminal`)

- Layout propio sin shell global.
- Ideal para tablets POS o pantallas táctiles de caja.
- Requiere reprovisionar todos los contextos necesarios (Caja, Configuración, Sesión, Tenant).
- La UI puede simplificarse más: menos íconos, botones más grandes para táctil.
- El carrito puede ocupar más espacio o mostrarse en layout diferente (horizontal/vertical).

### 8.2 Persistencia de preferencia por usuario

- Guardar si el usuario prefiere siempre iniciar en modo ampliado.
- Usar `localStorage` con clave `{companyId}:{userId}:pos_modo_ampliado`.
- Leer la preferencia al montar el POS y activar automáticamente.

### 8.3 Soporte para tablets y pantallas táctiles

- Botones más grandes en el ProductGrid para operación táctil.
- Carrito colapsable/expandible en pantallas de 768px o menos.
- Swipe para mostrar/ocultar el carrito.

### 8.4 Atajos de teclado para cajeros avanzados

- `F11` → modo ampliado (complementando Fullscreen API).
- `Esc` → salir del modo ampliado.
- `F2` → foco en búsqueda de producto.
- `F3` → foco en búsqueda de cliente.
- Sistema de atajos documentado en un panel de ayuda contextual del POS.

### 8.5 Modo quiosco (kiosco) para autoservicio

- Terminal dedicada sin posibilidad de navegar fuera del POS.
- Controles mínimos: solo cobro.
- Requiere hardware específico y política de pantalla completa del SO.

---

## 9. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Contexto no disponible en algunos módulos | Media | Alto | Hacer el contexto opcional con valor por defecto `{ modoAmpliado: false }` |
| Modales con z-index conflictivo en modo ampliado | Baja | Medio | Los modales usan `fixed inset-0 z-50` — mayor que el layout — no hay conflicto |
| Usuario queda "atrapado" sin poder salir | Baja | Alto | Esc siempre funciona + botón visible de contraer + salida automática al navegar |
| El cleanup del `useEffect` no se ejecuta en todos los casos | Baja | Medio | Resetear el estado también en el evento `beforeunload` como segunda capa |
| Header o Sidebar tienen animaciones que interfieren al ocultarse | Baja | Bajo | Usar `transition-none` durante el modo ampliado o `duration-0` |
| El estado de caja activa desaparece con el header | Media | Medio | Ver §10 — decisión pendiente del PM: ¿añadir indicador de caja al header interno del POS? |
| Fullscreen API bloqueada por políticas corporativas | Media | Bajo | Solo afecta al complemento opcional, no a la solución principal |
| El sidebar sigue visible por problemas de z-index | Muy baja | Medio | El sidebar es `z-40`, el contenido del POS es `overflow-hidden` — al ocultar el sidebar, el contenido expande sin superposición |
| El borrador automático falla al salir/entrar del modo | Muy baja | Bajo | El borrador usa `useEffect` con dependencias de datos del carrito — no depende del layout |

---

## 10. Preguntas pendientes para el PM

Las siguientes decisiones afectan directamente la implementación de Fase 1 y deben confirmarse antes de codificar:

1. **¿El indicador de caja activa debe permanecer visible en modo ampliado?**  
   Hoy está en el header global que se ocultaría. Opciones: (a) mover un badge de estado de caja al header interno del POS, (b) ocultar el estado de caja en modo ampliado (el cajero ya sabe si está abierta), (c) mantener solo el header global visible en modo ampliado.

2. **¿El modo ampliado debe activarse automáticamente al entrar al POS, o solo cuando el usuario lo solicita?**  
   Si se activa automáticamente, puede sorprender al usuario. Si es manual, el usuario debe descubrirlo. Recomendación técnica: manual, con tooltip explicativo.

3. **¿El Fullscreen API del navegador debe incluirse en Fase 1 o solo en Fase 2?**  
   Combinar vista ampliada + fullscreen del navegador es la experiencia máxima. Pero añade complejidad de UX (el navegador tiene su propio comportamiento de salida).

4. **¿Debe haber algún indicador visual persistente de que el usuario está en modo ampliado?**  
   Por ejemplo, un borde de acento de color o un badge "MODO AMPLIADO" visible. Esto ayuda a evitar confusión en entornos multi-usuario.

5. **¿El modo ampliado debe respetarse en pantallas pequeñas (< 768px)?**  
   En móvil ya no hay sidebar visible. ¿Tiene sentido el modo ampliado en tablets? ¿O solo aplica a desktop?

6. **¿El nombre "Vista ampliada" es el correcto para el usuario final?**  
   Alternativas: "Pantalla completa", "Modo enfoque", "Modo cajero". Confirmar con el equipo de UX.

7. **¿Se debe mostrar el nombre del establecimiento en algún lugar del POS al estar en modo ampliado?**  
   Si el header desaparece, el nombre de empresa/establecimiento también. En entornos multi-establecimiento, esto podría ser relevante.

---

## 11. Prompt sugerido para implementación futura

> **NOTA:** Este prompt es solo para referencia futura. No ejecutarlo hasta que el PM haya confirmado las decisiones en §10.

```
Actúa como desarrollador frontend senior experto en React, TypeScript, 
contextos React y layouts responsivos.

Necesito implementar el "Modo Vista Ampliada" del Punto de Venta de SenciYo.

CONTEXTO PREVIO: Se realizó un análisis técnico completo documentado en 
docs/analisis-modo-expandido-pos.md. La alternativa elegida fue el 
Enfoque A: modo vista ampliada en la misma ruta, mediante un contexto 
React que expone el control de visibilidad del header y sidebar.

ARCHIVOS A MODIFICAR:
1. Crear src/contexts/ContextoAppShell.tsx
   - Exportar interfaz ContextoAppShellValor { modoAmpliado: boolean; setModoAmpliado: (v: boolean) => void }
   - Exportar contexto ContextoAppShell con valor por defecto { modoAmpliado: false, setModoAmpliado: () => {} }
   - Exportar hook useModoAmpliado() que consume el contexto
   - Exportar provider AppShellProvider

2. Modificar src/layouts/PrivateLayout.tsx
   - Envolver el contenido con <AppShellProvider>
   - El header y sidebar leen modoAmpliado del contexto
   - Cuando modoAmpliado === true: ocultar Header y SideNav con className condicional

3. Modificar src/layouts/components/Header.tsx
   - Recibir prop visible?: boolean o leer del contexto directamente
   - Aplicar className condicional para ocultarse en modo ampliado

4. Modificar src/layouts/components/SideNav.tsx
   - Mismo patrón que Header

5. Modificar src/pages/Private/features/comprobantes-electronicos/
   punto-venta/pages/PuntoVenta.tsx
   - Consumir useModoAmpliado()
   - Agregar botón con ícono Maximize2/Minimize2 de Lucide en el header interno
   - useEffect cleanup: setModoAmpliado(false) al desmontar
   - Event listener Escape: setModoAmpliado(false)

RESTRICCIONES:
- No modificar CartCheckoutPanel, ProductGrid ni ningún componente de negocio.
- No tocar lógica de cobranza, caja, comprobantes, descuentos, stock ni impresión.
- No crear rutas nuevas.
- No duplicar componentes.
- No persistir el estado (solo sesión de navegación actual).
- El estado de caja activa: [DECISIÓN PENDIENTE DEL PM — ver docs/analisis-modo-expandido-pos.md §10]

VALIDACIONES:
- TypeScript sin errores.
- ESLint sin warnings.
- npm run build exitoso.
- Verificar que el carrito no se pierde al entrar/salir del modo.
- Verificar que los modales (CobranzaModal, SuccessModal, CreditScheduleModal) 
  funcionan correctamente en modo ampliado.
- Verificar que Esc sale del modo ampliado.
- Verificar que navegar a otro módulo restaura el layout.
```

---

*Documento generado como insumo técnico previo a la implementación. No ejecutar código hasta confirmar las decisiones en §10.*
