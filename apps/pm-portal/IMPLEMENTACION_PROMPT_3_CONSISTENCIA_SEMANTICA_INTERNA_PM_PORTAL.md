# IMPLEMENTACIÓN — CONSISTENCIA SEMÁNTICA INTERNA PM PORTAL
**Fecha:** 2026-03-15
**Alcance:** Componentes de navegación interna — `NavegacionEstrategia.tsx`, `NavegacionAnalitica.tsx`
**Basado en:** Fase 2 (mejora menú global) + auditoría exhaustiva previa

---

## 1. Problema detectado

### 1.1 Colisión semántica residual en tabs internos de KPIs

La Fase 2 renombró los ítems del sidebar global:
- `menuPortal.ts`: `'KPIs'` en Estrategia → `'KPIs estratégicos'`
- `menuPortal.ts`: `'KPIs'` en Analítica → `'KPIs ejecutivos'`

Sin embargo, los componentes de navegación interna (`NavegacionXxx`) mantenían el label ambiguo `'KPIs'` apuntando a rutas distintas:

| Componente | Label anterior | Ruta | Problema |
|---|---|---|---|
| `NavegacionEstrategia.tsx` | `'KPIs'` | `/estrategia/kpis` | Ambiguo: mismo label que en Analítica; contradice sidebar y `<h1>` de la página destino |
| `NavegacionAnalitica.tsx` | `'KPIs'` | `/analitica/kpis` | Ambiguo: mismo label que en Estrategia; contradice sidebar y `<h1>` de la página destino |

**Evidencia de contradicción con la página destino:**
- `PaginaKpisEstrategicos.tsx` tiene `<h1>` "KPIs estratégicos"
- `PaginaResumenAnalitico.tsx` lista sus KPIs bajo el encabezado "KPIs ejecutivos"

---

## 2. Análisis — Por qué NO se eliminaron los primeros tabs "Resumen de X"

La Fase 2 eliminó del sidebar los 7 primeros submenús con la etiqueta "Resumen de X" que apuntaban a la misma ruta que el módulo padre. En los `NavegacionXxx`, **estos tabs NO fueron tocados por razón técnica:**

### Diferencia estructural sidebar vs. tab-bar in-page

| Contexto | Sidebar | NavegacionXxx |
|---|---|---|
| Navegación al módulo raíz | El ítem padre (`Estrategia`) ya navega a `/estrategia` | Solo el tab "Resumen estratégico" navega a `/estrategia` |
| Double-highlight al estar en `/estrategia` | Padre activo + primer submódulo activo simultáneamente → visual rota | No existe este problema — el NavLink usa `end` para matching exacto |
| Si se elimina el "Resumen de X" | Sin regresión: el padre sigue activo | **Regresión**: ningún tab queda activo cuando el usuario está en `/estrategia` |

**Evidencia de uso en código:**

`NavegacionEstrategia` se renderiza en:
- `PaginaResumenEstrategico.tsx` (ruta `/estrategia`) — aquí "Resumen estratégico" es el tab activo
- `PaginaPeriodosEstrategicos.tsx` (ruta `/estrategia/periodos`)
- `PaginaOkrs.tsx` (ruta `/estrategia/okrs`)
- `PaginaKpisEstrategicos.tsx` (ruta `/estrategia/kpis`)
- `PaginaHipotesis.tsx` (ruta `/estrategia/hipotesis`)

Si se eliminara "Resumen estratégico" del array `enlaces`, cuando el usuario navega a `/estrategia`, el tab-bar renderiza 4 tabs y ninguno tiene `isActive = true`. La "Resumen de X" tab en NavegacionXxx es funcional, no redundante.

El mismo patrón aplica a todos los módulos con tab-bar: Discovery, Requerimientos, Lanzamientos, Operación, Gobierno, Analítica.

---

## 3. Alcance final implementado

**Archivos modificados: 2**

### Cambio A — `NavegacionEstrategia.tsx`
```
Antes: { etiqueta: 'KPIs', ruta: '/estrategia/kpis' }
Después: { etiqueta: 'KPIs estratégicos', ruta: '/estrategia/kpis' }
```

### Cambio B — `NavegacionAnalitica.tsx`
```
Antes: { etiqueta: 'KPIs', ruta: '/analitica/kpis' }
Después: { etiqueta: 'KPIs ejecutivos', ruta: '/analitica/kpis' }
```

---

## 4. Cambios descartados y justificación

### ❌ Eliminación de 7 primeros tabs "Resumen de X" en NavegacionXxx
**Por qué se descartó:** Causa regresión UX — al estar en la raíz del módulo, ningún tab quedaría activo. La lógica `end={enlace.ruta === '/modulo'}` en NavLink garantiza matching exacto, y ese tab es el único que satisface la condición `isActive = true` cuando se navega a la ruta base. Ver sección 2 para análisis completo.

La equivalencia "el sidebar los eliminó, los tabs también deben eliminarlos" es una analogía incorrecta: el mecanismo de redundancia es diferente en cada contexto.

---

## 5. Estado de consistencia después de las tres fases

### Naming de "KPIs" — alineado en todos los niveles

| Nivel | Estrategia | Analítica |
|---|---|---|
| Sidebar (`menuPortal.ts`) | "KPIs estratégicos" ✅ | "KPIs ejecutivos" ✅ |
| Tab interno (`NavegacionXxx`) | "KPIs estratégicos" ✅ | "KPIs ejecutivos" ✅ |
| Página destino (`<h1>`) | "KPIs estratégicos" ✅ | "KPIs ejecutivos" ✅ |

---

## 6. Riesgos residuales (heredados — no generados en esta fase)

| Riesgo | Nivel | Descripción |
|---|---|---|
| "Hipótesis estrategia" en tab vs "Hipótesis" en sidebar | Bajo | `NavegacionEstrategia` dice "Hipótesis estrategia"; el sidebar dice "Hipótesis". La versión más larga del tab es técnicamente más precisa (distingue de "Hipótesis discovery"). No es una regresión. |
| Ajustes/Trazabilidad sin indicación de rol | Bajo | Pre-existente desde la Fase 2. Mejora P3 pendiente. |

---

## 7. Validación técnica

| Check | Resultado |
|---|---|
| `npm run lint` | ✅ Sin errores ni advertencias |
| `npm run build` | ✅ Build exitoso en 2.99s |
| TypeScript (`tsc -b`) | ✅ Sin errores de tipos |
| SQL tocado | ❌ No |
| Supabase tocado | ❌ No |
| Dominio tocado | ❌ No |
| Rutas del router tocadas | ❌ No |
| Lógica de negocio tocada | ❌ No |
