# IMPLEMENTACIÓN — Toggle de módulo activo en menú lateral
**Fecha:** 2026-03-15
**Alcance:** 1 archivo — corrección quirúrgica del sidebar
**Rama:** pm-construccion

---

## 1. Qué se investigó

Se leyó `src/presentacion/navegacion/BarraLateral.tsx` (111 líneas) y se identificaron las tres líneas que causaban el problema:

| Línea (original) | Código | Problema |
|---|---|---|
| L48 | `const estadoGuardado = abiertos[item.etiqueta] ?? false` | Estado del usuario — correcto en sí mismo |
| L49 | `const estaAbierto = item.activo \|\| estadoGuardado` | `item.activo` fuerza siempre `true` — el usuario no puede colapsarlo |
| L66 | `{!colapsada && tieneSubmenu && !item.activo && (` | Botón oculto cuando el módulo está activo |

**Causa raíz:** las dos condiciones combinadas hacen que el módulo activo quede secuestrado:
- aunque el usuario hiciera `abiertos[etiqueta] = false`, `item.activo || estadoGuardado` devuelve `true`
- el botón `+`/`−` no se renderiza cuando el módulo está activo, por la condición `!item.activo`

---

## 2. Qué se corrigió exactamente

### Separación de "activo por ruta" y "expandido por el usuario"

**Antes:**
```typescript
const estadoGuardado = abiertos[item.etiqueta] ?? false
const estaAbierto = item.activo || estadoGuardado
// ...
{!colapsada && tieneSubmenu && !item.activo && (
  <button onClick={() => setAbiertos(prev => ({ ...prev, [item.etiqueta]: !estadoGuardado }))} ...>
```

**Después:**
```typescript
const estaAbierto = abiertos[item.etiqueta] ?? false
// ...
{!colapsada && tieneSubmenu && (
  <button onClick={() => setAbiertos(prev => ({ ...prev, [item.etiqueta]: !estaAbierto }))} ...>
```

### Auto-apertura por ruta con `useEffect`

Se añadió un `useEffect` que escucha cambios en `rutaActiva` y auto-abre el módulo correspondiente. Esto preserva el comportamiento de apertura automática al navegar, pero sin forzarlo de forma permanente:

```typescript
useEffect(() => {
  const itemActivo = menuPortal.find(
    (item) => rutaActiva === item.ruta || rutaActiva.startsWith(`${item.ruta}/`)
  )
  if (itemActivo) {
    setAbiertos((prev) => ({ ...prev, [itemActivo.etiqueta]: true }))
  }
}, [rutaActiva])
```

### Resultado del comportamiento nuevo

| Caso | Comportamiento |
|---|---|
| Navegas a un módulo por primera vez | `useEffect` lo abre automáticamente |
| Módulo activo y abierto — haces clic en `−` | Se colapsa (aunque sigue activo por ruta) |
| Módulo activo y colapsado — navegas a otro submódulo desde otro lugar | Se re-abre por el `useEffect` |
| Módulo no activo — haces clic en `+` | Se abre como antes |
| Módulo no activo — haces clic en `−` | Se cierra como antes |
| Carga inicial | El módulo activo se abre via `useEffect` |

---

## 3. Archivos tocados

| Archivo | Tipo de cambio |
|---|---|
| `src/presentacion/navegacion/BarraLateral.tsx` | Corrección quirúrgica — 4 líneas modificadas, 10 líneas añadidas |

**No se tocó:** `menuPortal.ts`, router, layout, estilos globales, dominio, casos de uso, repositorios, SQL, base de datos.

---

## 4. Diff resumido

```diff
- import { useMemo, useState } from 'react'
+ import { useEffect, useMemo, useState } from 'react'

+ // Auto-abre el módulo activo cuando cambia la ruta, sin forzarlo permanentemente
+ useEffect(() => {
+   const itemActivo = menuPortal.find(
+     (item) => rutaActiva === item.ruta || rutaActiva.startsWith(`${item.ruta}/`)
+   )
+   if (itemActivo) {
+     setAbiertos((prev) => ({ ...prev, [itemActivo.etiqueta]: true }))
+   }
+ }, [rutaActiva])

- const estadoGuardado = abiertos[item.etiqueta] ?? false
- const estaAbierto = item.activo || estadoGuardado
+ const estaAbierto = abiertos[item.etiqueta] ?? false

- {!colapsada && tieneSubmenu && !item.activo && (
-   <button onClick={() => setAbiertos(prev => ({ ...prev, [item.etiqueta]: !estadoGuardado }))} ...>
+ {!colapsada && tieneSubmenu && (
+   <button onClick={() => setAbiertos(prev => ({ ...prev, [item.etiqueta]: !estaAbierto }))} ...>
```

---

## 5. SQL

❌ No. Cero cambios en base de datos.

---

## 6. Validación técnica

| Check | Resultado |
|---|---|
| `npm run lint` | ✅ Sin errores ni advertencias |
| `npm run build` | ✅ Build exitoso (285 módulos) |
| TypeScript (`tsc -b`) | ✅ Sin errores de tipos |

> Warning de chunk size (`1,337 kB`) es preexistente e irrelevante.

---

## 7. Riesgo residual

| Caso | Estado |
|---|---|
| Usuario colapsa módulo activo manualmente y luego navega dentro del mismo módulo (ej. desde un link externo a otra sub-ruta del mismo módulo) | ✅ El `useEffect` se dispara con el nuevo `rutaActiva` y re-abre el módulo automáticamente |
| Usuario colapsa módulo activo y la ruta no cambia | ✅ Módulo queda colapsado — comportamiento deseado |
| Sidebar colapsado globalmente (`colapsada = true`) | ✅ El botón `+`/`−` no se renderiza (`!colapsada && tieneSubmenu`) — sin cambios |
| Dark mode | ✅ Sin cambios en clases de Tailwind del sidebar |
| Highlight activo del módulo padre | ✅ `item.activo` sigue controlando el estilo del `Link`, no el estado `estaAbierto` |
| Highlight activo del submódulo | ✅ `activoSubmenu` no fue tocado |
