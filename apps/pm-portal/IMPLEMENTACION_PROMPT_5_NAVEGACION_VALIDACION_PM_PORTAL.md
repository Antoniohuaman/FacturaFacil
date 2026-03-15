# IMPLEMENTACIÓN — NAVEGACIÓN INTERNA DEL MÓDULO VALIDACIÓN
**Fecha:** 2026-03-15
**Alcance:** Módulo Validación — 3 páginas + 1 componente nuevo
**Rama:** pm-construccion

---

## 1. Objetivo de la mejora

Añadir una subnavegación interna al módulo Validación, coherente con el patrón ya existente en los módulos Estrategia, Discovery, Requerimientos, Lanzamientos, Operación, Analítica y Gobierno.

---

## 2. Problema UX detectado

Validación tenía tres rutas reales con páginas completas:
- `/validacion` — resumen con métricas y accesos rápidos
- `/validacion/por-modulo` — gestión de planes y plantillas
- `/validacion/ejecuciones` — registro de resultados

Sin embargo, ninguna de las tres páginas tenía una barra de subnavegación interna. El usuario que estaba en `/validacion/ejecuciones` no tenía una forma visual de saber en qué sub-sección del módulo estaba, ni un control rápido para moverse entre las tres secciones dentro de la misma pantalla. Los demás módulos multi-página sí tienen este componente.

---

## 3. Solución aplicada

**1 archivo creado + 3 archivos modificados.**

### Archivo creado

**`src/presentacion/paginas/validacion/NavegacionValidacion.tsx`**

Componente de navegación interna idéntico en estructura y estilos al patrón del sistema:

```typescript
const enlaces = [
  { etiqueta: 'Resumen de validación', ruta: '/validacion' },
  { etiqueta: 'Por módulo', ruta: '/validacion/por-modulo' },
  { etiqueta: 'Ejecuciones', ruta: '/validacion/ejecuciones' }
]
```

- Usa `NavLink` de React Router DOM con `end={enlace.ruta === '/validacion'}` para matching exacto en la raíz
- Estilos: `rounded-full px-3 py-1.5 text-sm` — idénticos a NavegacionGobierno, NavegacionEstrategia, etc.
- Active state: `bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900`
- Inactive state: `border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300`

### Archivos modificados

Los tres archivos de páginas recibieron la misma transformación en su `<header>`:

**Antes:**
```tsx
<header className="space-y-1">
  <h1 className="text-2xl font-semibold">{título}</h1>
  <p className="text-sm text-slate-600 dark:text-slate-400">{descripción}</p>
</header>
```

**Después:**
```tsx
<header className="space-y-2">
  <div className="space-y-1">
    <h1 className="text-2xl font-semibold">{título}</h1>
    <p className="text-sm text-slate-600 dark:text-slate-400">{descripción}</p>
  </div>
  <NavegacionValidacion />
</header>
```

---

## 4. Archivos tocados

| Archivo | Tipo |
|---|---|
| `src/presentacion/paginas/validacion/NavegacionValidacion.tsx` | Creado |
| `src/presentacion/paginas/validacion/PaginaValidacion.tsx` | Modificado — import + header |
| `src/presentacion/paginas/validacion/por-modulo/PaginaValidacionPorModulo.tsx` | Modificado — import + header |
| `src/presentacion/paginas/validacion/ejecuciones/PaginaEjecucionesValidacion.tsx` | Modificado — import + header |

**No se tocó:** `menuPortal.ts`, router, dominio, casos de uso, repositorios, SQL, Supabase, Zod, estilos globales, ningún otro módulo.

---

## 5. SQL

❌ No. Cero cambios en base de datos, consultas o esquemas.

---

## 6. Comportamiento resultante

| Ruta | Tab activo |
|---|---|
| `/validacion` | "Resumen de validación" (matching exacto por `end`) |
| `/validacion/por-modulo` | "Por módulo" |
| `/validacion/ejecuciones` | "Ejecuciones" |

El active state usa la misma lógica de `isActive` de React Router DOM que todos los demás módulos — sin lógica adicional.

---

## 7. Validación técnica

| Check | Resultado |
|---|---|
| `npm run lint` | ✅ Sin errores ni advertencias |
| `npm run build` | ✅ Build exitoso en 2.80s (285 módulos) |
| TypeScript (`tsc -b`) | ✅ Sin errores de tipos |
| Módulos transformados | 285 (+1 respecto al build anterior por `NavegacionValidacion.tsx`) |

> El único warning activo es el preexistente de chunk size (`1,328 kB`), no relacionado con este cambio.
