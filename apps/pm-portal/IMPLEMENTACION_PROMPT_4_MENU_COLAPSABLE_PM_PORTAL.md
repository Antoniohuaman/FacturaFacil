# IMPLEMENTACIÓN — MENÚ LATERAL COLAPSABLE PM PORTAL
**Fecha:** 2026-03-15
**Alcance:** Sidebar global — `BarraLateral.tsx`
**Rama:** pm-construccion

---

## 1. Objetivo de la mejora

Reducir la sobrecarga visual del menú lateral haciendo que los módulos con submenús arranquen **colapsados por defecto**, abriéndose automáticamente solo cuando el usuario está dentro de ese módulo. El usuario puede expandir/colapsar manualmente cualquier módulo no activo.

---

## 2. Problema UX detectado

El sidebar inicializaba los 9 módulos con submenús todos abiertos simultáneamente:

```typescript
const [abiertos, setAbiertos] = useState<Record<string, boolean>>({
  Roadmap: true, Validación: true, Estrategia: true,
  Discovery: true, Requerimientos: true, Lanzamientos: true,
  Operación: true, Analítica: true, Gobierno: true
})
```

Resultado: **46 entradas navegables siempre visibles** desde el primer render. El sidebar se sentía interminable y abrumador, aunque la infraestructura para colapsar ya existía (toggle `−`/`+` ya estaba implementado).

---

## 3. Solución aplicada

**Único archivo modificado:** `src/presentacion/navegacion/BarraLateral.tsx`

**Cambio conceptual:** Derivar el estado "abierto" de **dos fuentes**:
1. `item.activo` — el módulo que contiene la ruta activa siempre muestra submenús
2. `estadoGuardado` — preferencia explícita del usuario (toggle manual)

```typescript
const estadoGuardado = abiertos[item.etiqueta] ?? false
const estaAbierto = item.activo || estadoGuardado
```

**Estado inicial:** `{}` (todos los módulos parten colapsados, sin hardcodear nada).

---

## 4. Archivos tocados

| Archivo | Tipo de cambio |
|---|---|
| `src/presentacion/navegacion/BarraLateral.tsx` | 4 cambios quirúrgicos |

**No se tocó:** `menuPortal.ts`, `enrutador.tsx`, dominio, casos de uso, repositorios, SQL, Supabase, componentes NavegacionXxx, layout general.

---

## 5. Comportamiento antes / después

### Antes
- Al entrar a cualquier ruta: los 9 módulos con submenús abiertos simultáneamente
- 46 entradas siempre visibles
- Toggle `−`/`+` existía pero era inútil (todo ya abierto, cerrar era antiintuitivo)

### Después
- Al entrar a `/estrategia/kpis`: solo **Estrategia** abierto con sus 4 subítems; los 8 módulos restantes colapsados
- Al navegar a `/roadmap/iniciativas`: Roadmap se abre automáticamente, Estrategia se colapsa automáticamente
- El usuario puede abrir módulos adicionales manualmente con `+`
- El módulo activo nunca puede quedar colapsado (garantía por diseño)
- Máximo visible en situación típica: ~8 ítems (módulo activo + 4 subítems + módulos sin submenu)

---

## 6. Decisiones de diseño

### Por qué derivar `estaAbierto = item.activo || estadoGuardado` y no usar `useEffect`

Una alternativa era usar `useEffect` para sincronizar `abiertos` cuando cambia `rutaActiva`. Se descartó porque:
- `useEffect` ejecuta **después** del render → habría un frame con el módulo colapsado antes de abrirse → flash visual
- La derivación reactiva es instantánea y sin efectos secundarios

### Por qué el módulo activo no puede cerrarse

Si `item.activo = true`, `estaAbierto` es siempre `true` independientemente de `estadoGuardado`. Esto garantiza que el usuario nunca pierde la referencia visual de dónde está. Si el usuario hace clic en `−` sobre el módulo activo:
- `estadoGuardado` se setea a `false` (se registra la preferencia)
- Visualmente nada cambia (el módulo sigue abierto por `item.activo`)
- Al navegar fuera de ese módulo, `item.activo` pasa a `false` y `estadoGuardado` ya es `false` → el módulo se colapsa automáticamente

Esta semántica es limpia: hacer clic en `−` sobre el módulo activo equivale a "ciérralo cuando salga de aquí."

### Por qué no se tocan `menuPortal.ts` ni el layout

El mecanismo de toggle ya existía completo en `BarraLateral.tsx`. Solo faltaba el estado inicial correcto y la derivación del flag de apertura. No había razón para tocar nada más.

---

## 7. Riesgos evitados

| Riesgo potencial | Cómo se evitó |
|---|---|
| Flash visual al cargar | Derivación sincrónica, sin `useEffect` |
| Módulo activo colapsado (usuario desorientado) | `estaAbierto = item.activo || estadoGuardado` garantiza apertura |
| Subitem activo invisible | Solo se renderiza si `estaAbierto`, que es `true` cuando `item.activo` es `true` |
| Regresión de colapso global | La condición `!colapsada && tieneSubmenu && estaAbierto` se mantiene intacta |
| Regresión de active states | Lógica de `item.activo` y `activoSubmenu` sin cambios |
| Dark mode roto | Sin cambios de clases CSS |
| Accesibilidad | `aria-label` del toggle sin cambios |

---

## 8. Validación técnica

| Check | Resultado |
|---|---|
| `npm run lint` | ✅ Sin errores ni advertencias |
| `npm run build` | ✅ Build exitoso en 2.48s |
| TypeScript (`tsc -b`) | ✅ Sin errores de tipos |
| Imports sin uso | ❌ Ninguno — sin cambios de imports |
| SQL tocado | ❌ No |
| Supabase tocado | ❌ No |
| Dominio tocado | ❌ No |

> El único warning activo es el preexistente de chunk size (`1,327 kB`), no relacionado con este cambio.

---

## 9. Validación funcional (por lectura de código)

| Caso | Resultado |
|---|---|
| Entrar a `/estrategia` | Estrategia abierto, resto colapsado ✅ |
| Entrar a `/estrategia/kpis` | Estrategia abierto, "KPIs estratégicos" con highlight, resto colapsado ✅ |
| Entrar a `/roadmap/iniciativas` | Roadmap abierto, "Iniciativas" con highlight ✅ |
| Entrar a `/analitica/kpis` | Analítica abierta, "KPIs ejecutivos" con highlight ✅ |
| Entrar a `/gobierno/riesgos` | Gobierno abierto, "Riesgos" con highlight ✅ |
| Sidebar expandido globalmente | Comportamiento normal; toggle visible en módulos con submenús ✅ |
| Sidebar colapsado globalmente | Ningún submenú visible; solo primera letra de módulo con tooltip ✅ |
| Expandir sidebar → volver al estado previo | `abiertos` no se modifica durante colapso; módulo activo sigue visible ✅ |
| Navegar entre módulos | Nuevo módulo se abre automáticamente; módulo anterior se colapsa ✅ |
| Módulo activo siempre visible | `item.activo` fuerza `estaAbierto = true` por diseño ✅ |
| Subitem activo siempre visible | Solo se renderiza si `estaAbierto`, garantizado cuando activo ✅ |
| Toggle manual de módulo no activo | `setAbiertos` cambia `estadoGuardado`; render reactivo ✅ |

---

## 10. Riesgos residuales

| Riesgo | Nivel | Descripción |
|---|---|---|
| Usuario abre varios módulos manualmente y el sidebar vuelve a verse largo | Bajo | Comportamiento voluntario del usuario; no es un bug. Podría mitigarse con un límite de módulos abiertos simultáneamente, pero eso agregaría complejidad innecesaria en esta fase. |
| Módulos abiertos manualmente no se cierran al navegar a otro módulo | Bajo | Respeta la preferencia explícita del usuario. El scroll del sidebar resuelve el espacio. Mejora P3 pendiente si se considera necesario. |
| Chunk size warning | Informativo | Preexistente. No relacionado con este cambio. |
