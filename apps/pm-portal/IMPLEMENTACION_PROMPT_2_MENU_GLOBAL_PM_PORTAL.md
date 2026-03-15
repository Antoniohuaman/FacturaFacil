# IMPLEMENTACIÓN — MEJORA DEL MENÚ GLOBAL PM PORTAL
**Fecha:** 2026-03-15
**Alcance:** Menú global del sidebar — `menuPortal.ts`
**Basado en:** Auditoría exhaustiva previa del sistema

---

## 1. Problema detectado

El menú lateral del PM Portal tenía cuatro problemas estructurales identificados con evidencia en código:

### 1.1 Submenús redundantes (mismo destino que el padre)
Siete módulos con submenús tenían como primer ítem un "Resumen de X" que apuntaba exactamente a la misma ruta que el módulo padre. Cuando el usuario hacía clic en el padre ya llegaba a esa pantalla, haciendo el submódulo completamente redundante y generando doble highlight visual (padre activo + primer submódulo activo simultáneamente al estar en `/estrategia`).

| Módulo padre | Submódulo redundante eliminado | Ruta duplicada |
|---|---|---|
| Estrategia (`/estrategia`) | "Resumen estratégico" | `/estrategia` |
| Discovery (`/discovery`) | "Resumen discovery" | `/discovery` |
| Requerimientos (`/requerimientos`) | "Resumen de requerimientos" | `/requerimientos` |
| Lanzamientos (`/lanzamientos`) | "Resumen de lanzamientos" | `/lanzamientos` |
| Operación (`/operacion`) | "Resumen operativo" | `/operacion` |
| Analítica (`/analitica`) | "Resumen analítico" | `/analitica` |
| Gobierno (`/gobierno`) | "Resumen de gobierno" | `/gobierno` |

### 1.2 Colisión semántica en el label "KPIs"
La etiqueta "KPIs" aparecía en dos submenús de módulos distintos sin diferenciación:
- Estrategia → "KPIs" → `/estrategia/kpis`
- Analítica → "KPIs" → `/analitica/kpis`

Un usuario que busca "KPIs" en el menú no sabe a cuál de los dos ir. Agravante: las páginas de destino **ya tenían títulos diferenciados** ("KPIs estratégicos" y "KPIs ejecutivos" respectivamente en sus `<h1>`), lo que hacía la colisión del menú aún más evidente.

### 1.3 Orden del menú no refleja el flujo PM
El orden original era: `Tablero → Roadmap → Matriz de valor → Validación → Estrategia → Discovery → Requerimientos → ...`

Problemas:
- Validación aparecía antes de Estrategia, Discovery y Requerimientos — los tres módulos que son prerequisitos lógicos de la validación.
- Estrategia (punto de partida estratégico de todo PM) estaba en el quinto lugar.

### 1.4 "Matriz de valor" como ítem huérfano
Standalone en el tercer puesto, sin contexto claro de a qué módulo pertenece conceptualmente.

---

## 2. Alcance final implementado

**Único archivo modificado:** `src/presentacion/navegacion/menuPortal.ts`

### Cambio A — Eliminación de 7 submenús redundantes
Todos los primeros ítems de submenú con ruta idéntica al padre fueron eliminados. Resultado: de 53 entradas navegables → **46 entradas**.

### Cambio B — Desambiguación de "KPIs"
- Estrategia: "KPIs" → **"KPIs estratégicos"** (alineado con el `<h1>` de la página destino)
- Analítica: "KPIs" → **"KPIs ejecutivos"** (alineado con el `<h1>` de la página destino)

### Cambio C — Reordenamiento del menú al flujo PM
**Orden anterior:**
```
Tablero → Roadmap → Matriz de valor → Validación → Estrategia → Discovery →
Requerimientos → Lanzamientos → Operación → Analítica → Gobierno →
Decisiones → Auditorías → Ajustes → Trazabilidad
```

**Orden nuevo:**
```
Tablero → Estrategia → Discovery → Requerimientos → Roadmap → Matriz de valor →
Validación → Lanzamientos → Operación → Analítica → Gobierno →
Decisiones → Auditorías → Ajustes → Trazabilidad
```

Lógica del nuevo orden:
1. **Tablero** — punto de entrada siempre primero
2. **Estrategia** — define el "por qué" y los OKRs; es el punto de partida real de un PM
3. **Discovery** — explora problemas e insights que alimentan la estrategia y el roadmap
4. **Requerimientos** — formaliza lo que hay que construir
5. **Roadmap** — planifica cómo y cuándo construirlo
6. **Matriz de valor** — evalúa las iniciativas del roadmap (posicionada inmediatamente después)
7. **Validación** — valida lo que se está construyendo
8. **Lanzamientos** — gestiona el go-to-market
9. **Operación** — monitorea lo que vive en producción
10. **Analítica** — visión ejecutiva transversal
11. **Gobierno** — stakeholders, riesgos, dependencias
12. **Decisiones** — hub de decisiones de producto
13. **Auditorías** — auditorías internas
14. **Ajustes** — configuración del sistema
15. **Trazabilidad** — log de cambios (admin)

---

## 3. Cambios exactos en menuPortal.ts

### Antes → Después (estructura comparada)

| Módulo | Antes | Después |
|---|---|---|
| Posición en menú | Roadmap era 2º | Estrategia pasa a 2º |
| Estrategia | Primer submódulo: "Resumen estratégico" → `/estrategia` (REDUNDANTE) | Eliminado; primer submódulo: "Períodos" |
| Estrategia | "KPIs" → `/estrategia/kpis` | "KPIs estratégicos" → `/estrategia/kpis` |
| Discovery | Primer submódulo: "Resumen discovery" → `/discovery` (REDUNDANTE) | Eliminado; primer submódulo: "Insights" |
| Requerimientos | Primer submódulo: "Resumen de requerimientos" → `/requerimientos` (REDUNDANTE) | Eliminado; primer submódulo: "Historias de usuario" |
| Lanzamientos | Primer submódulo: "Resumen de lanzamientos" → `/lanzamientos` (REDUNDANTE) | Eliminado; primer submódulo: "Releases" |
| Operación | Primer submódulo: "Resumen operativo" → `/operacion` (REDUNDANTE) | Eliminado; primer submódulo: "Bugs" |
| Analítica | Primer submódulo: "Resumen analítico" → `/analitica` (REDUNDANTE) | Eliminado; primer submódulo: "KPIs ejecutivos" |
| Analítica | "KPIs" → `/analitica/kpis` | "KPIs ejecutivos" → `/analitica/kpis` |
| Gobierno | Primer submódulo: "Resumen de gobierno" → `/gobierno` (REDUNDANTE) | Eliminado; primer submódulo: "Stakeholders" |

---

## 4. Cambios descartados y justificación

### ❌ Mover "Matriz de valor" como submódulo de Roadmap
**Por qué se descartó:** La ruta de Matriz de valor es `/matriz-valor`, no `/roadmap/...`. El sistema de highlighting activo de `BarraLateral.tsx` usa `rutaActiva.startsWith(`${item.ruta}/`)`. Si "Matriz de valor" viviera en los submenús de Roadmap, el padre "Roadmap" **no se destacaría como activo** cuando el usuario esté en `/matriz-valor`, porque `/matriz-valor` no empieza con `/roadmap/`. Esto crearía una inconsistencia visual de navegación. Solución adoptada: reposicionarlo inmediatamente después de Roadmap como ítem standalone, dando el contexto visual de proximidad sin romper el highlighting.

### ❌ Añadir badge "Admin" a Ajustes y Trazabilidad en BarraLateral
**Por qué se descartó:** Requería modificar `BarraLateral.tsx` — componente de layout fundamental — para añadir `useSesionPortalPM()` y lógica condicional de render. El beneficio es cosmético. El riesgo de regresión en el sidebar (que afecta a toda la navegación del portal) es desproporcionado al valor. Documentado como mejora P3 para una fase posterior.

### ❌ Actualizar NavegacionXxx (NavegacionEstrategia, NavegacionAnalitica, etc.)
**Por qué se descartó:** Están fuera del alcance del menú global. Estos componentes tienen su propia lista de enlaces independiente del sidebar. Renombrar "KPIs" en el sidebar no impone una obligación de renombrar en los tabs internos de las páginas. El contexto dentro de la página ya es suficientemente claro.

---

## 5. Análisis de consistencia post-cambio

### BarraLateral.tsx — sin cambios necesarios
La lógica de `abiertos` usa etiquetas de módulos padre como keys:
```typescript
const [abiertos, setAbiertos] = useState<Record<string, boolean>>({
  Roadmap: true, Validación: true, Estrategia: true,
  Discovery: true, Requerimientos: true, Lanzamientos: true,
  Operación: true, Analítica: true, Gobierno: true
})
```
Ninguna de estas etiquetas de padre cambia → el componente funciona sin modificaciones.

### Active highlighting — sin regresiones
- El padre se marca activo con: `rutaActiva === item.ruta || rutaActiva.startsWith(item.ruta + '/')`
- Los submenús se marcan con: `rutaActiva === submenu.ruta`
- Ninguna ruta fue modificada → el highlighting funciona igual que antes.

### Rutas — sin cambios
El enrutador (`enrutador.tsx`) no fue tocado. Las 47 rutas registradas permanecen exactamente igual.

---

## 6. Validación técnica

| Check | Resultado |
|---|---|
| `npm run lint` | ✅ Sin errores ni advertencias |
| `npm run build` | ✅ Build exitoso en 2.80s |
| TypeScript (`tsc -b`) | ✅ Sin errores de tipos |
| SQL tocado | ❌ No — cero SQL |
| Supabase tocado | ❌ No |
| Dominio tocado | ❌ No |
| Casos de uso tocados | ❌ No |
| Repositorios tocados | ❌ No |
| Rutas del router tocadas | ❌ No |

---

## 7. Riesgos residuales

| Riesgo | Nivel | Descripción |
|---|---|---|
| Inconsistencia NavegacionXxx vs sidebar | Bajo | Las NavegacionXxx internas siguen mostrando "KPIs" (sin adjetivo) como tab. El sidebar ahora dice "KPIs estratégicos" / "KPIs ejecutivos". La inconsistencia es menor: el contexto de módulo ya la resuelve. Recomendado alinear en una fase posterior. |
| "Hipótesis" en sidebar vs "Hipótesis estrategia" en NavegacionEstrategia | Bajo | Pre-existente, no generado por este cambio. El sidebar dice "Hipótesis", la NavegacionEstrategia dice "Hipótesis estrategia". Recomendado alinear en fase posterior. |
| Ajustes/Trazabilidad sin indicación de rol | Bajo | No implementado. Usuarios lector/editor pueden navegar y ver contenido con botones deshabilitados sin entender por qué. Mejora P3 pendiente. |

---

## 8. Estado del menú resultante

```
Tablero                         (1)
Estrategia                      (2)  [Períodos, OKRs, KPIs estratégicos, Hipótesis]
Discovery                       (3)  [Insights, Problemas y oportunidades, Investigaciones, Segmentos, Hipótesis discovery]
Requerimientos                  (4)  [Historias de usuario, Casos de uso, Reglas de negocio, Requerimientos no funcionales]
Roadmap                         (5)  [Objetivos, Iniciativas, Entregas]
Matriz de valor                 (6)
Validación                      (7)  [Por módulo, Ejecuciones]
Lanzamientos                    (8)  [Releases, Seguimiento post-lanzamiento]
Operación                       (9)  [Bugs, Mejoras, Deuda técnica, Bloqueos, Lecciones aprendidas]
Analítica                      (10)  [KPIs ejecutivos, Portafolio, Tendencias, Health scores]
Gobierno                       (11)  [Stakeholders, Riesgos, Dependencias]
Decisiones                     (12)
Auditorías                     (13)
Ajustes                        (14)
Trazabilidad                   (15)
```
**Total entradas navegables: 46** (antes: 53 — reducción de 7 submenús redundantes)
