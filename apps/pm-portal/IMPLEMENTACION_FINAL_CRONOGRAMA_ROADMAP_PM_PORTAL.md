# IMPLEMENTACIÓN FINAL — MÓDULO CRONOGRAMA ROADMAP — PM PORTAL
**Fecha:** 2026-03-16
**Rama:** `develop`
**Archivos modificados:** 2
**Build final:** ✅ limpio · **Lint final:** ✅ limpio · **TypeScript:** ✅ 0 errores

---

## Archivos tocados

| Archivo | Motivo |
|---|---|
| `src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx` | Todos los hallazgos del módulo |
| `src/presentacion/paginas/roadmap/NavegacionRoadmap.tsx` | Consistencia de orden de tabs |

No se tocó SQL, base de datos, ni ningún otro módulo. No se añadieron librerías externas.

---

## 1. Problemas confirmados con evidencia y cómo quedaron resueltos

### H01 — Estado inicial colapsado
**Evidencia:** `useState<string[]>([])` para `objetivosExpandidos` → primera carga mostraba solo filas de objetivos colapsadas.

**Resolución:** Se añadió `ejecutivoInicializadoRef = useRef(false)` y una rama de inicialización al `useEffect` de densidad que se ejecuta una sola vez cuando `objetivosVisibles` se puebla por primera vez:

```typescript
if (!ejecutivoInicializadoRef.current && objetivosVisibles.length > 0) {
  const conHijos = objetivosVisibles
    .filter((obj) => iniciativasVisibles.some((ini) => (ini.objetivo_id ?? FILA_SIN_OBJETIVO) === obj.id))
    .map((obj) => obj.id)
  if (conHijos.length > 0) {
    setObjetivosExpandidos((prev) => (prev.length === 0 ? conHijos : prev))
  }
  ejecutivoInicializadoRef.current = true
}
```

El usuario ahora ve los objetivos con sus iniciativas visibles al cargar la página en cualquier modo. Si ya interactuó manualmente (expansión previa), el estado no se sobreescribe.

---

### H02 — Bug de resize con scroll horizontal
**Evidencia:** `evento.clientX - contenedorCronogramaRef.getBoundingClientRect().left` usaba el `div` interno cuyo `rect.left` se vuelve negativo al scrollear → ancho calculado incorrecto.

**Resolución:** Se añadió `contenedorScrollRef` apuntando al `div` con `overflow-x-auto` (el contenedor externo). El `div` externo no se mueve cuando su contenido scrollea, por lo que su `getBoundingClientRect().left` es siempre correcto:

```typescript
const manejarMouseMove = (evento: globalThis.MouseEvent) => {
  const contenedorScroll = contenedorScrollRef.current
  if (!contenedorScroll) return
  const rect = contenedorScroll.getBoundingClientRect()  // left siempre estable
  const nuevoAncho = limitarAnchoColumnaJerarquia(evento.clientX - rect.left)
  setAnchoColumnaJerarquia(nuevoAncho)
}
```

El ref se asigna en el JSX: `<div ref={contenedorScrollRef} className="overflow-x-auto">`.

---

### H03 — Tooltip de segmento con fechas recortadas al viewport
**Evidencia:** El tooltip usaba `inicioVisible`/`finVisible` (la intersección del segmento con el rango visible), no `segmento.inicio`/`segmento.fin`.

**Resolución:**
```typescript
// ANTES
<p>{formatearRangoFechas(inicioVisible, finVisible)}</p>
// DESPUÉS
<p>{formatearRangoFechas(segmento.inicio, segmento.fin)}</p>
```

El tooltip ahora muestra la fecha real completa de la ventana, sin importar qué parte sea visible en pantalla.

---

### H04 — Sin leyenda de colores
**Evidencia:** Ningún elemento en la UI explicaba qué significaba cada banda o marcador.

**Resolución:** Se añadió una barra de referencia visual compacta entre el header del lienzo y el canvas, con 8 ítems: banda objetivo, banda iniciativa plan, banda entrega plan, banda entrega real, marcador fecha objetivo, marcador completada, release plan, release real. Clases Tailwind idénticas a las del canvas para coherencia exacta.

---

### H05 — Handle de resize casi invisible y no descubrible
**Evidencia:** El pill era `h-10 w-1.5` (1.5px de ancho), sin feedback visual claro.

**Resolución:** El pill ahora es `h-16 w-[3px]` (3px), centrado vertical con `top-1/2 -translate-y-1/2`, con transición de color en hover (slate-300 → slate-400) y estado activo en azul (`bg-sky-500`). Se añadió `title="Arrastrar para redimensionar"` y `aria-label` más descriptivo. El área de click subió de `w-4` a `w-5`.

---

### H06 — Grupo "Sin iniciativa asignada" con fila temporal vacía
**Evidencia:** `segmentos: []` en el grupo virtual de entregas huérfanas → fila derecha completamente vacía.

**Resolución:** Se calcula un segmento agregado (igual que el de objetivo) para ese grupo:
```typescript
const segsSinIni = entregasSinIniciativa
  .flatMap((entrega) => calcularSegmentosEntrega(entrega).segmentos)
  .sort(...)
const segAgregadoSinIni = segsSinIni.length > 0
  ? { id: `agregado-${clave}`, inicio: min, fin: max, variante: 'objetivo' }
  : null
```

Ahora el grupo tiene representación visual honesta en el canvas.

---

### H08 — Truncado silencioso de marcadores de objetivo
**Evidencia:** `.slice(0, 6)` al construir marcadores en `construirFilaObjetivo`.

**Resolución:** Se eliminó el `.slice(0, 6)`. Todos los marcadores de un objetivo aparecen ahora en el lienzo. No hay cap arbitrario.

---

### H09 — Fechas reales de ventana en tooltip de título de iniciativa
**Evidencia:** El tooltip de iniciativa solo mostraba la etiqueta de ventana ("Q1 2026"), no las fechas.

**Resolución:** Se añadió el campo `rangoFechas: string | null` a la interfaz `FilaCronograma`. Para cada tipo de fila:
- **Objetivo:** `formatearRangoFechas(segmentoObjetivo.inicio, segmentoObjetivo.fin)`
- **Iniciativa:** `formatearRangoFechas(rangoIni.inicio, rangoIni.fin)`
- **Entrega:** rango de ventana planificada (o real si no hay planificada)
- **Sin iniciativa:** rango del segmento agregado

El tooltip del título ahora incluye este rango antes del resumen/detalle.

---

### H11 — Densidad contada como filtro activo
**Evidencia:** `if (densidad === 'detalle') { total += 1 }` en `filtrosActivos`.

**Resolución:** Se eliminó ese bloque. La densidad es un modo de vista, no un filtro de datos. El badge numérico sobre "Filtros" ya no incrementa al cambiar densidad. `densidad` también fue eliminado del array de dependencias del `useMemo`.

---

### H12 — limpiarFiltros reseteaba al último año disponible
**Evidencia:** `aniosDisponibles[aniosDisponibles.length - 1] ?? new Date().getFullYear()` podría resetear a 2027 si hay datos futuros.

**Resolución:** Cambiado a `new Date().getFullYear()` — siempre resetea al año actual.

---

## 2. Cómo quedó la jerarquía

El cronograma soporta correctamente:

```
Objetivo (nivel 0)
  └── Iniciativa (nivel 1) — visible al expandir objetivo
        └── Entrega (nivel 2) — visible solo en modo Detalle, al expandir iniciativa
  └── Sin iniciativa asignada (nivel 1, virtual) — solo en modo Detalle
        └── Entregas huérfanas (nivel 2)
```

**Expansión inicial:** Al cargar datos, todos los objetivos con hijos se auto-expanden. Las iniciativas se auto-expanden al activar modo Detalle.

**Ejecutivo vs Detalle:** En Ejecutivo, iniciativas no tienen botón de expansión (por diseño). En Detalle, todo el árbol es navegable. Se añadió texto secundario bajo cada título de iniciativa/entrega mostrando la etiqueta de ventana, para que el usuario tenga contexto sin hover.

---

## 3. Cómo quedó el resize

- **Cálculo:** usa `contenedorScrollRef.getBoundingClientRect().left` (outer div, no se mueve con scroll). Bug corregido.
- **Handle:** pill 3px de ancho, centrado vertical, con color activo en azul, hover transición. Área de interacción 5px.
- **Persistencia:** localStorage bajo `pm-portal-roadmap-cronograma-ancho-jerarquia`. Sin cambios.
- **Riesgo residual menor:** El handle sigue siendo absoluto (no sticky). Si el usuario scrollea el timeline más allá del ancho de la columna izquierda y necesita redimensionar, debe scrollear de vuelta al inicio. No es un bug, es una limitación de layout. No se introdujo este cambio para no reescribir la estructura del canvas.

---

## 4. Cómo quedaron los tooltips

| Elemento | Estado |
|---|---|
| Título de objetivo | ✅ Muestra nombre, estado, rangoFechas agregado, resumen, detalle |
| Título de iniciativa | ✅ Muestra nombre, estado, rangoFechas de ventana, resumen, detalle |
| Título de entrega | ✅ Muestra nombre, estado, rangoFechas de ventana, resumen, detalle |
| Segmento/banda | ✅ Muestra nombre, tipo, fechas REALES del segmento, estado |
| Marcadores (todos los tipos) | ✅ Sin cambios — ya correctos |
| Badge "Desvío" | ✅ Ahora tiene tooltip: "Tiene entregas con fecha objetivo vencida aún sin completar" |
| Texto secundario bajo título | ✅ Muestra etiqueta de ventana como referencia rápida sin hover |

---

## 5. Leyenda visual añadida

Añadida entre el header del lienzo y el canvas. Muestra 8 referencias con ícono visual idéntico al canvas:

Objetivo · Iniciativa plan · Entrega plan · Entrega real · Fecha objetivo · Completada · Release plan · Release real

Compacta, minimalista, en texto xs, sin ocupar espacio visual del canvas.

---

## 6. SQL

**Ninguno.** Sin cambios en base de datos, tablas, consultas ni modelos de dominio.

---

## 7. Resultados de validación final

```
npm run lint  → ✅ Sin errores, sin warnings
npm run build → ✅ Sin errores TypeScript, build exitoso
              → ⚠️  Bundle 1373 kB (warning existente del proyecto, no nuevo, no relacionado con el módulo)
```

---

## 8. Riesgo residual

| Riesgo | Nivel | Descripción |
|---|---|---|
| Handle no sticky | Bajo | Para redimensionar con el timeline scrolleado, hay que scrollear primero al inicio. Limitación de layout, no bug. |
| Sin soporte touch para resize | Bajo | El resize sigue siendo solo mouse. Tablets no pueden redimensionar. No se introdujo touchstart para no añadir complejidad sin demanda confirmada. |
| Sin deep-link desde marcadores | Bajo | Los marcadores de release/entrega no navegan al registro específico. Se evaluó y se decidió no implementar: sin IDs de ruta confirmados, una navegación a lista genérica no aporta valor neto. |
| Estado de expansión no persiste en URL | Bajo | Al refrescar, objetivos vuelven a auto-expandirse (H01 resuelto). El estado específico (cuáles están abiertos vs cerrados) no persiste en URL — esto es aceptable dado que la auto-expansión inicial resuelve el caso de uso principal. |

---

## 9. Estado del módulo tras la implementación

**LISTO para uso funcional, presentación gerencial y navegación PM.**

El módulo permite:
- Entrar y ver inmediatamente la jerarquía con objetivos e iniciativas visibles
- Expandir y colapsar para navegar entre niveles
- Activar modo Detalle para ver el tercer nivel (entregas)
- Leer fechas reales en todos los tooltips
- Identificar visualmente cada tipo de elemento con la leyenda
- Redimensionar la columna izquierda de forma correcta incluso con scroll
- Filtrar por objetivo, estado, ventana, vista temporal y densidad
- Entender inmediatamente qué significan los badges "Desvío"
- Presentar el roadmap de forma limpia y corporativa
