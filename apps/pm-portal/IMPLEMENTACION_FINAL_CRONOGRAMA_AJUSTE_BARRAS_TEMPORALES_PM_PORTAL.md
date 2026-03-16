# Ajuste Final — Barras Temporales del Cronograma (PM Portal)

**Fecha:** 2026-03-16
**Archivo:** `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx`
**Rama:** `feature/creacion-cronograma`

---

## 1. Qué estaba fallando exactamente

### Bug raíz: containing block incorrecto para posicionamiento porcentual

El componente `TooltipCronograma` es un `<span>` al que se le asignaba `className="absolute z-[12]"`. Este span tenía **dimensiones 0×0** (cero ancho, cero alto), porque su único contenido era un `<div position:absolute>` que está fuera del flujo normal.

En CSS, cuando un elemento hijo usa `position: absolute` con `left: X%` o `width: X%`, esos porcentajes se calculan contra el **containing block más cercano posicionado**, no contra el elemento padre visual. En este caso:

- El `<span className="absolute">` era el containing block del bar `<div>`.
- El span tenía width = 0 (contenido absolutamente posicionado, fuera de flujo).
- `left: 35% of 0px = 0` → todos los elementos al borde izquierdo.
- `width: 15% of 0px = 0` → todas las barras con ancho cero → **invisibles**.

**Para barras:** `width: 0` → invisibles.

**Para marcadores:** los dots tenían `width: 9px` y `height: 9px` en píxeles fijos (no porcentuales), entonces SÍ aparecían visualmente (9×9px de color), pero todos apilados en el borde izquierdo del row (`left: 0`). Por eso el usuario veía "hitos/puntos" pero en la posición incorrecta.

### Elementos afectados

| Elemento | Síntoma | Causa |
|---|---|---|
| Barra objetivo (gris, 4px) | Invisible | `width: X% of 0 = 0` |
| Barra iniciativa (cyan, 10px) | Invisible | `width: X% of 0 = 0` |
| Barra entrega plan (ámbar, 6px) | Invisible | `width: X% of 0 = 0` |
| Barra entrega real (verde, 6px) | Invisible | `width: X% of 0 = 0` |
| Marcador fecha objetivo (punto ámbar) | Visible pero en left=0 | `left: X% of 0 = 0` |
| Marcador fecha completada (punto verde) | Visible pero en left=0 | `left: X% of 0 = 0` |
| Marcador release (punto slate) | Visible pero en left=0 | `left: X% of 0 = 0` |
| Marcador release real (punto verde) | Visible pero en left=0 | `left: X% of 0 = 0` |

---

## 2. Qué se corrigió

### Solución: trasladar posición y tamaño al `<span>` del tooltip

En lugar de que el `<span>` tooltip sea un contenedor 0×0 con un `<div>` absolutamente posicionado dentro, **el `<span>` ahora ES el elemento visual** (barra o marcador), con su posición, tamaño y estilos propios.

#### Cambios al componente `TooltipCronograma`:

Se agregó `style?: CSSProperties` a la interfaz y función del componente, aplicado directamente al `<span>`:

```tsx
// ANTES
<span className={className} onMouseEnter={...}>
  {children}  // un <div absolute> que no posiciona bien
</span>

// DESPUÉS
<span className={className} style={style} onMouseEnter={...}>
  {children}  // vacío ('') — el SPAN mismo es la barra
</span>
```

#### Para segmentos (barras):

```tsx
// ANTES: containing block incorrecto
<TooltipCronograma className="absolute z-[12]">
  <div className="absolute" style={{ left: '35%', width: '15%', top: 20, height: 10 }} />
</TooltipCronograma>

// DESPUÉS: el span recibe las dimensiones reales
<TooltipCronograma
  className="bg-cyan-500/80 absolute z-[12] cursor-default"
  style={{ left: '35%', width: '15%', top: 20, height: 10, borderRadius: 9999 }}
>
  {''}
</TooltipCronograma>
```

Ahora `left: 35%` se calcula contra el `<div className="relative h-[58px]">` del row (el containing block correcto), porque el `<span>` es hijo directo suyo. ✓

#### Para marcadores (hitos):

```tsx
// ANTES: dot aparecía en left=0
<TooltipCronograma className="absolute z-[14]">
  <div className="absolute" style={{ left: '35%', top: 18, transform: 'translateX(-50%)' }}>
    <div className="rounded-full bg-amber-500" style={{ width: 9, height: 9 }} />
  </div>
</TooltipCronograma>

// DESPUÉS: el span es el contenedor posicionado y el dot
<TooltipCronograma
  className="absolute z-[14] cursor-default rounded-full bg-amber-500 ring-2 ring-white"
  style={{ left: '35%', top: 18, width: 9, height: 9, transform: 'translateX(-50%)' }}
>
  {''}
</TooltipCronograma>
```

---

## 3. En qué casos ahora SÍ se dibujan barras

| Elemento | Condición para dibujar barra | Fuente de datos |
|---|---|---|
| **Objetivo** | Tiene al menos una iniciativa o entrega con ventana/fecha | Min(inicio hijos) → Max(fin hijos) |
| **Iniciativa** | Tiene `ventana_planificada_id` con fechas válidas | `CatalogoVentanaPm.fecha_inicio/fin` |
| **Entrega — plan** | Tiene `ventana_planificada_id` con fechas válidas | `CatalogoVentanaPm.fecha_inicio/fin` |
| **Entrega — real** | Tiene `ventana_real_id` con fechas válidas | `CatalogoVentanaPm.fecha_inicio/fin` |

---

## 4. En qué casos correctamente solo queda marcador (sin barra)

| Situación | Resultado |
|---|---|
| Entrega sin ninguna ventana, pero con `fecha_objetivo` | Solo punto ámbar en la fecha objetivo |
| Entrega sin ninguna ventana, pero con `fecha_completado` | Solo punto verde en la fecha de completado |
| Iniciativa sin `ventana_planificada_id` pero con releases | Solo puntos de release (sin barra cyan) |
| Release con `fecha_programada` o `fecha_lanzamiento_real` | Solo punto en la fecha del release |

No se inventan barras. Si el modelo no soporta un rango, el elemento solo tiene marcadores o no aparece en el timeline.

---

## 5. Qué NO se tocó

- Jerarquía objetivo → iniciativa → entregable
- Colapsado / expandido
- Persistencia en localStorage
- Filtros y URL params
- Línea de hoy
- Leyenda de referencia
- Dark mode
- Resize de columna jerárquica
- Navegación Roadmap
- Modelos de dominio
- SQL / base de datos
- Otros módulos

---

## 6. Validación

| Validación | Resultado |
|---|---|
| `npm run lint` | ✅ Sin errores ni warnings |
| `npm run build` | ✅ Build exitoso en 3.25s |
| TypeScript strict (`tsc -b`) | ✅ Sin errores |
| Warning de chunk size | ⚠️ Preexistente, no relacionado |
| Código muerto | ✅ Ninguno — solo se agregó `style` prop y se reordenó render |

---

## 7. Riesgo residual

Ninguno nuevo. La corrección es CSS puro: el posicionamiento de barras y marcadores ahora usa el containing block correcto (el row `div.relative`). No hay cambios de lógica de datos.
