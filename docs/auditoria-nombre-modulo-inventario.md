# Auditoría de Nombre — Módulo de Inventario

**Fecha:** 2026-06-16  
**Rama:** develop  
**Objetivo:** Unificar el nombre visible del módulo bajo la denominación única **"Inventario"**  
**Alcance:** Solo auditoría. Sin cambios funcionales ni de rutas.

---

## 1. Resumen ejecutivo

El módulo de inventario aparece con al menos **cuatro nombres distintos** en la interfaz y el código:

| Nombre encontrado | Lugares |
|---|---|
| `Control Stock` | Sidebar principal |
| `Gestión de Inventario` | Barra de búsqueda rápida (comando de navegación) |
| `Control de stock` | Sección de Configuración del sistema |
| `Inventario` | H1 de la página, tooltips correctos, botones, modal de configuración |

Internamente el módulo ya usa `inventario` de forma consistente en rutas, permisos e IDs.  
El problema es exclusivamente de **inconsistencia en etiquetas visibles**.

---

## 2. Tabla de hallazgos completa

| # | Archivo | Línea | Texto encontrado | Tipo | Visible al usuario | Recomendación | Riesgo |
|---|---|---|---|---|---|---|---|
| 1 | `layouts/components/SideNav.tsx` | 88 | `"Control Stock"` | Label visible | **Sí** — Sidebar principal | **Cambiar a `"Inventario"`** | Ninguno |
| 2 | `layouts/components/SearchBar.tsx` | 1275 | `nombre: 'Gestión de Inventario'` | Label visible | **Sí** — Comando búsqueda rápida | **Cambiar a `'Inventario'`** | Ninguno |
| 3 | `configuracion-sistema/…/SeccionPreferenciasVenta.tsx` | 67 | `title="Control de stock"` | Label visible | **Sí** — Título de tarjeta en Configuración | **Cambiar a `"Inventario"`** | Ninguno |
| 4 | `configuracion-sistema/…/SeccionPreferenciasVenta.tsx` | 73 | `"Control de stock: Activo"` | Label visible | **Sí** — Estado en tarjeta | **Cambiar a `"Inventario: Activo"`** | Ninguno |
| 5 | `configuracion-sistema/…/SeccionPreferenciasVenta.tsx` | 108 | `"Control de stock: Inactivo"` | Label visible | **Sí** — Estado en tarjeta | **Cambiar a `"Inventario: Inactivo"`** | Ninguno |
| 6 | `configuracion-sistema/…/ModalConfiguracionInventario.tsx` | 183 | `'Control de inventario desactivado.'` | Label visible | **Sí** — Toast/feedback | **Cambiar a `'Inventario desactivado.'`** | Ninguno |
| 7 | `configuracion-sistema/…/ModalConfiguracionInventario.tsx` | 224 | `"¿Desactivar el control de inventario?"` | Label visible | **Sí** — Confirmación en modal | **Cambiar a `"¿Desactivar el inventario?"`** | Ninguno |
| 8 | `gestion-inventario/pages/InventoryPage.tsx` | 208 | `title="Control de inventario activo"` | Tooltip | **Sí** (hover) | Cambiar a `"Inventario activo"` | Ninguno |
| 9 | `gestion-inventario/pages/InventoryPage.tsx` | 224 | `title="Control de inventario inactivo"` | Tooltip | **Sí** (hover) | Cambiar a `"Inventario inactivo"` | Ninguno |
| 10 | `autenticacion/layouts/AuthLayout.tsx` | 83 | `"Gestión de inventario y ventas en tiempo real"` | Label marketing | Sí — Login/landing | Mantener (contexto de descripción amplia) | Ninguno |
| — | `gestion-inventario/pages/InventoryPage.tsx` | 204 | `"Inventario"` | Título H1 | Sí | ✅ Ya correcto | — |
| — | `gestion-inventario/pages/InventoryPage.tsx` | 215 | `"Editar configuración de inventario"` | Tooltip | Sí | ✅ Ya correcto | — |
| — | `configuracion-sistema/…/ModalConfiguracionInventario.tsx` | 203 | `"Configurar inventario"` | H2 modal | Sí | ✅ Ya correcto | — |
| — | `gestion-inventario/components/CintilloControlStock.tsx` | 16 | `"Configura tu inventario"` | Banner | Sí | ✅ Ya correcto | — |
| — | `gestion-inventario/components/CintilloControlStock.tsx` | 28 | `"Configurar inventario"` | Botón | Sí | ✅ Ya correcto | — |
| — | `configuracion-sistema/…/SeccionPreferenciasVenta.tsx` | 120 | `"Configurar inventario"` | Botón | Sí | ✅ Ya correcto | — |

---

## 3. Nombres técnicos internos (NO cambiar)

Estos identificadores están enlazados con routing, permisos, localStorage y lógica de autorización.  
Cambiarlos implicaría refactor amplio y riesgo de regresión.

| Archivo | Identificador | Tipo | Motivo para no cambiar |
|---|---|---|---|
| `routes/privateRoutes.tsx:86` | `path: "/inventario"` | Ruta | Cambiarla rompería toda la navegación y los permisos ligados a `/inventario` |
| `routes/privateRoutes.tsx:31` | `import { InventoryPage }` | Import/componente | Renombrar el componente es refactor, no cosmético |
| `layouts/components/SideNav.tsx:87` | `id: "inventario"` | ID módulo | Usado en lógica de `activeModule` y mapeo de rutas |
| `layouts/components/SideNav.tsx:146–150` | `'inventario': ['inventario.ver', …]` | Mapeo permisos | Enlazado con el sistema de autorización |
| `layouts/components/SideNav.tsx:197` | `'inventario': '/inventario'` | Mapeo ruta | Enlazado con navegación |
| `roles/catalogoPermisos.ts:158–180` | `id: 'inventario.*'`, `modulo: 'inventario'` | Claves de permiso | Usados en `conPermisos()`, cambiarlos rompería RBAC |
| `contexto/ContextoConfiguracion.tsx:75,810,855` | `controlStockActivo` | Propiedad de configuración | Clave de persistencia en localStorage; cambiarla perdería config de usuarios |
| `layouts/components/SearchBar.tsx:183` | `inventario: { title: 'Inventario', routeBase: '/inventario' }` | Config interna | `title` ya es correcto; `routeBase` no cambiar |
| Carpeta | `features/gestion-inventario/` | Nombre de carpeta | Renombrarla requiere actualizar todos los imports del proyecto |
| Componente | `CintilloControlStock` | Nombre de componente | Interno, no visible; renombrarlo es refactor opcional con riesgo bajo-medio |
| Servicio | `controlStockActivo` en hooks de comprobantes/carrito | Propiedad booleana | Enlazado con lógica de descuento de stock en POS y comprobantes |
| Comentario | `servicioReservaStock.ts:92` — `// lógica de Control Stock` | Comentario en código | No visible al usuario; no relevante para la auditoría |

---

## 4. Respuestas a las preguntas de la auditoría

**1. ¿Dónde aparece "Control Stock" o variantes?**  
- `SideNav.tsx:88` → `"Control Stock"` (sidebar)  
- `SearchBar.tsx:1275` → `"Gestión de Inventario"` (búsqueda rápida)  
- `SeccionPreferenciasVenta.tsx:67,73,108` → `"Control de stock"` (configuración)  
- `ModalConfiguracionInventario.tsx:183,224` → `"Control de inventario"` (modal/toast)  
- `InventoryPage.tsx:208,224` → `"Control de inventario"` (tooltips)

**2. ¿Qué apariciones son visibles para el usuario?**  
Todas las listadas en la tabla del punto 2 con "Sí" en la columna Visible. Las más prominentes:  
- Sidebar (todo el tiempo visible)  
- Búsqueda rápida (al abrir el buscador)  
- Configuración del sistema (al acceder a preferencias)

**3. ¿Qué apariciones son técnicas/internas?**  
Las de la sección 3: rutas, IDs de módulo, claves de permiso, propiedades de config, nombre de carpeta.

**4. ¿Qué se debe cambiar sí o sí a "Inventario"?**  
Los hallazgos #1 al #9 de la tabla: `SideNav.tsx`, `SearchBar.tsx`, `SeccionPreferenciasVenta.tsx` (×3) y `ModalConfiguracionInventario.tsx` (×2) más los dos tooltips de `InventoryPage.tsx`.

**5. ¿Qué no conviene cambiar todavía?**  
Todo lo de la sección 3. En particular `controlStockActivo` (clave de localStorage), `path: "/inventario"`, `id: 'inventario.*'` permisos y la carpeta `gestion-inventario/`.

**6. ¿Hay riesgo de que el módulo aparezca con dos nombres distintos?**  
**Sí, actualmente ya ocurre.** El sidebar dice "Control Stock" pero la página dice "Inventario". La búsqueda rápida dice "Gestión de Inventario". Un usuario que busca "Inventario" en el buscador encuentra el resultado correcto; uno que no sabe el nombre verá "Control Stock" en el menú y "Inventario" al entrar.

**7. ¿La ruta debe cambiar o solo el label visible?**  
Solo el label visible. La ruta `/inventario` ya es correcta y no debe cambiar.

**8. ¿Qué archivos habría que modificar en una siguiente tarea?**  
Ver sección 5.

---

## 5. Archivos a modificar en la siguiente tarea (solo labels)

| Archivo | Cambio específico |
|---|---|
| `layouts/components/SideNav.tsx` | Línea 88: `"Control Stock"` → `"Inventario"` |
| `layouts/components/SearchBar.tsx` | Línea 1275: `nombre: 'Gestión de Inventario'` → `nombre: 'Inventario'` |
| `configuracion-sistema/…/SeccionPreferenciasVenta.tsx` | Línea 67: `title="Control de stock"` → `title="Inventario"` |
| `configuracion-sistema/…/SeccionPreferenciasVenta.tsx` | Línea 73: `"Control de stock: Activo"` → `"Inventario: Activo"` |
| `configuracion-sistema/…/SeccionPreferenciasVenta.tsx` | Línea 108: `"Control de stock: Inactivo"` → `"Inventario: Inactivo"` |
| `configuracion-sistema/…/ModalConfiguracionInventario.tsx` | Línea 183: `'Control de inventario desactivado.'` → `'Inventario desactivado.'` |
| `configuracion-sistema/…/ModalConfiguracionInventario.tsx` | Línea 224: `"¿Desactivar el control de inventario?"` → `"¿Desactivar el inventario?"` |
| `gestion-inventario/pages/InventoryPage.tsx` | Línea 208: `title="Control de inventario activo"` → `title="Inventario activo"` |
| `gestion-inventario/pages/InventoryPage.tsx` | Línea 224: `title="Control de inventario inactivo"` → `title="Inventario inactivo"` |

**Total: 9 cambios de string en 5 archivos. Sin cambios lógicos, sin cambios de ruta, sin cambios de permiso.**

---

## 6. Veredicto

> **Cambiar solo labels visibles a "Inventario"**

Los nombres técnicos internos (`gestion-inventario`, `controlStockActivo`, `inventario.ver`, `path: "/inventario"`) están coherentes entre sí y no deben cambiarse. Solo los textos de UI presentan inconsistencia y todos son cadenas de texto simples sin dependencias técnicas.

El riesgo de los 9 cambios propuestos es **nulo**: son string literals en JSX/JS, sin uso en lógica, routing ni permisos.

---

## 7. Estado actual vs. objetivo

| Ubicación | Hoy | Objetivo |
|---|---|---|
| Sidebar | "Control Stock" | "Inventario" |
| Búsqueda rápida | "Gestión de Inventario" | "Inventario" |
| Tarjeta Configuración (título) | "Control de stock" | "Inventario" |
| Tarjeta Configuración (estado activo) | "Control de stock: Activo" | "Inventario: Activo" |
| Tarjeta Configuración (estado inactivo) | "Control de stock: Inactivo" | "Inventario: Inactivo" |
| Toast desactivar | "Control de inventario desactivado." | "Inventario desactivado." |
| Confirmación desactivar | "¿Desactivar el control de inventario?" | "¿Desactivar el inventario?" |
| Tooltip badge activo | "Control de inventario activo" | "Inventario activo" |
| Tooltip badge inactivo | "Control de inventario inactivo" | "Inventario inactivo" |
| H1 página | "Inventario" | ✅ Correcto |
| Modal configurar (H2) | "Configurar inventario" | ✅ Correcto |
| Banner CintilloControlStock | "Configura tu inventario" | ✅ Correcto |
| Botones de configurar | "Configurar inventario" | ✅ Correcto |
