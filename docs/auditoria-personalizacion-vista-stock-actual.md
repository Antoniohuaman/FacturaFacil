# Auditoría: Modal "Personalización de Vista" — Inventario → Stock Actual

**Fecha:** 2026-06-17  
**Rama auditada:** `inventarioMejoras2`  
**Alcance:** Solo lectura. Sin modificaciones de código.

---

## 1. Resumen ejecutivo

El modal "Personalización de Vista" está **mayoritariamente funcional**: densidad de tabla, columnas visibles, vistas guardadas (crear/activar/eliminar) y reseteo de preferencias operan sobre el estado real de la tabla y persisten correctamente en localStorage con scope por empresa.

Se detectan **tres brechas reales**:

1. Las columnas dinámicas por almacén (modo "Todos los almacenes") no respetan el sistema de columnas visibles: se renderizan incondicionalmente y el usuario no puede ocultarlas desde el modal.
2. Las vistas guardadas solo almacenan columnas y densidad; no capturan filtros, almacén, búsqueda ni ordenamiento, a pesar de que la metáfora de "vista" sugiere un estado completo.
3. Los diálogos de confirmación y alerta usan `alert()` y `confirm()` nativos, inconsistentes con el sistema de feedback (`useFeedback`) del resto de la aplicación.

En términos de MVP, el modal aporta valor real y está lo suficientemente implementado. La brecha de columnas dinámicas es la única que representa un riesgo de confusión para el usuario.

---

## 2. Archivos revisados

| Archivo | Ruta | Rol |
|---|---|---|
| `DisponibilidadSettings.tsx` | `gestion-inventario/components/disponibilidad/` | Componente del modal completo |
| `usePreferenciasDisponibilidad.ts` | `gestion-inventario/stores/` | Zustand store + persistencia localStorage |
| `disponibilidad.types.ts` | `gestion-inventario/models/` | Tipos: `DensidadTabla`, `ColumnaDisponibilidad`, `VistaGuardada`, `PreferenciasDisponibilidad` |
| `DisponibilidadTable.tsx` | `gestion-inventario/components/disponibilidad/` | Tabla que consume preferencias |
| `DisponibilidadToolbarEnhanced.tsx` | `gestion-inventario/components/disponibilidad/` | Botón "Configuración" que abre el modal |
| `InventarioSituacionPage.tsx` | `gestion-inventario/components/disponibilidad/` | Orquestador de la página, gestiona `mostrandoSettings` |

---

## 3. Componentes involucrados y flujo de apertura

```
InventoryPage.tsx
  └─ tab "Situación" activo
       └─ InventarioSituacionPage.tsx
            ├─ DisponibilidadToolbarEnhanced  ← botón ⚙ con tooltip "Configuración (Alt+C)"
            │   └─ onClick → onOpenSettings()
            ├─ [state] mostrandoSettings (local useState)
            ├─ DisponibilidadTable
            │   ├─ prop: densidad      ← de usePreferenciasDisponibilidad
            │   └─ prop: columnasVisibles ← de usePreferenciasDisponibilidad
            └─ DisponibilidadSettings (modal)
                 isOpen={mostrandoSettings}
                 └─ consume directamente usePreferenciasDisponibilidad()
```

**El ícono de configuración** aparece solo en el tab Stock Actual. Tiene tooltip correcto. No aparece en otros tabs (Transferencias, Notas de Ingreso, Notas de Salida, Kardex).

---

## 4. Estado funcional: densidad de tabla

**Veredicto: FUNCIONAL ✅**

### Cómo funciona

El store Zustand aplica tres clases CSS según la densidad seleccionada:

```typescript
// DisponibilidadTable.tsx líneas 254–265
const densidadClasses = {
  compacta:  'py-1.5 px-2.5 text-xs',
  comoda:    'py-2.5 px-3.5 text-sm',
  espaciosa: 'py-3.5 px-4.5 text-base'
};
const cellClass = densidadClasses[densidad];
```

- Aplicado a cada `<td>` y `<th>` de la tabla.
- Cambio visual inmediato al hacer clic (Zustand re-render reactivo).
- Persiste en localStorage tras cerrar modal.
- Carga correctamente en la siguiente sesión.
- Solo aplica a la tabla de Stock Actual (no comparte estado con otras tablas).

### Bug menor — tildes en el label

El botón renderiza la etiqueta con `d.charAt(0).toUpperCase() + d.slice(1)`, que produce `"Comoda"` en lugar de `"Cómoda"`. Es un defecto visual de bajo impacto.

---

## 5. Estado funcional: columnas visibles

**Veredicto: FUNCIONAL para columnas estáticas ✅ / BRECHA CRÍTICA para columnas dinámicas 🔴**

### Columnas estáticas (10 columnas configurables)

```
Código (SKU) | Producto | Unidad mínima | Stock Real | Stock Reservado |
Stock Disponible | Stock mínimo | Stock máximo | Estado | Acciones
```

Cada columna tiene un checkbox en el modal. El toggle llama a `toggleColumna(columna)` en el store, que filtra `columnasVisibles`.

La tabla respeta `columnasVisibles` con comprobación directa en cada celda:
```typescript
// DisponibilidadTable.tsx línea 312
if (!columnasVisibles.includes(campo)) return null;  // header
// línea 518
{columnasVisibles.includes('codigo') && (<td>...)}   // body
```

- Toggle individual funciona: ocultar y mostrar columna surte efecto inmediato.
- Protección mínima implementada: cuando queda una sola columna, el checkbox queda `disabled` y el store bloquea el toggle.
- Persiste en localStorage.

### Columnas dinámicas por almacén — BRECHA CRÍTICA 🔴

Cuando el usuario selecciona "Todos los almacenes", la tabla recibe la prop `almacenesParaColumnas` y renderiza una columna extra por cada almacén. **Estas columnas se renderizan sin verificar `columnasVisibles`:**

```typescript
// DisponibilidadTable.tsx línea 489 (header) y 547 (body)
{almacenesParaColumnas?.map(w => (
  <th key={`th-${w.id}`} ...>{w.nombreAlmacen}</th>
))}
// ...
{almacenesParaColumnas?.map(w => (
  <td key={`td-${w.id}`} ...>{item.stockPorAlmacen?.[w.id] ?? 0}</td>
))}
```

**Impacto:** El usuario no puede ocultar columnas individuales de almacén desde el modal. Si hay 5 almacenes, aparecen 5 columnas extra que el modal no controla. La sección "Columnas visibles" del modal no menciona ni lista estas columnas. Esto genera una expectativa falsa de control total sobre las columnas.

---

## 6. Estado funcional: Mostrar todas / Solo esenciales

**Veredicto: FUNCIONAL ✅ (para columnas estáticas)**

| Acción | Columnas resultantes | Funcional |
|---|---|---|
| **Mostrar todas** | `['codigo','producto','unidadMinima','real','reservado','disponible','stockMinimo','stockMaximo','situacion','acciones']` — 10 columnas | ✅ |
| **Solo esenciales** | `['codigo','producto','unidadMinima','disponible','acciones']` — 5 columnas | ✅ |

Ambas acciones persisten. El resultado de "Solo esenciales" es funcional y tiene sentido para un usuario básico (SKU, nombre, unidad, disponible, acciones).

**Limitación:** Ninguna de las dos acciones controla las columnas dinámicas de almacén.

---

## 7. Estado funcional: Vistas guardadas

**Veredicto: FUNCIONAL PARCIAL ⚠️**

### Qué guarda una vista

```typescript
// disponibilidad.types.ts — VistaGuardada
{
  id: string;                              // generado automáticamente
  nombre: string;                          // ingresado por el usuario
  columnasVisibles: ColumnaDisponibilidad[];  // estado actual
  densidad: DensidadTabla;               // estado actual
  fechaCreacion: Date;
}
```

### Qué NO guarda

| Campo | Guardado | Efecto al activar |
|---|---|---|
| Columnas visibles | ✅ | Se aplica |
| Densidad | ✅ | Se aplica |
| Filtro de búsqueda (`filtroSku`) | ❌ | No se restaura |
| Filtro "Solo con disponible" | ❌ | No se restaura |
| Almacén seleccionado | ❌ | No se restaura |
| Establecimiento seleccionado | ❌ | No se restaura |
| Ordenamiento | ❌ | No se restaura |
| Página actual | ❌ | No se restaura |
| Items por página | ❌ | No se restaura |
| Columnas dinámicas de almacén | ❌ | No aplica (no controladas) |

La UI informa correctamente al usuario: `"Se guardarán las columnas visibles y la densidad actual"`. No es una brecha de comunicación, pero sí una limitación funcional importante para quien espera una "vista completa".

### Operaciones disponibles

| Operación | Implementada | Funciona |
|---|---|---|
| Crear vista | ✅ | ✅ — nombre + guardar |
| Activar vista | ✅ | ✅ — aplica columnas y densidad |
| Desactivar vista | ✅ | ✅ — solo limpia `vistaActivaId`, no restaura estado previo |
| Eliminar vista | ✅ | ✅ — con `confirm()` nativo |
| Renombrar vista | ❌ | No existe |
| Actualizar vista con estado actual | ❌ | No existe |
| Duplicar vista | ❌ | No existe |

---

## 8. Estado funcional: Nueva vista

**Veredicto: FUNCIONAL PARCIAL ⚠️**

`+ Nueva vista` despliega un formulario inline con input de nombre y botón Guardar. Al guardar llama a `guardarVista({ nombre, columnasVisibles, densidad })`. El ID se genera con `vista-${Date.now()}-${random}`.

La vista se crea correctamente y persiste. Puede ser activada y eliminada.

**Problemas:**
- Al guardar, muestra `alert('✅ Vista guardada exitosamente')` — nativo, inconsistente con el sistema de feedback.
- Al ingresar nombre vacío, muestra `alert('Por favor ingresa un nombre para la vista')` — mismo problema.
- No hay validación de nombre duplicado.
- No hay límite de vistas guardadas.

---

## 9. Estado funcional: Resetear preferencias

**Veredicto: FUNCIONAL PARCIAL ⚠️**

```typescript
// usePreferenciasDisponibilidad.ts línea 220
resetearPreferencias: () => {
  set({
    ...PREFERENCIAS_INICIALES,          // densidad, columnasVisibles, itemsPorPagina
    vistasGuardadas: get().vistasGuardadas, // MANTIENE las vistas guardadas
    vistaActivaId: undefined
  });
}
```

| Campo | ¿Resetea? |
|---|---|
| Densidad → `'compacta'` | ✅ |
| Columnas visibles → COLUMNAS_VISIBLES_POR_DEFECTO (8 columnas) | ✅ |
| Items por página → 25 | ✅ |
| Vista activa → `undefined` | ✅ |
| Vistas guardadas | ❌ — se preservan intencionalmente |
| Filtros de búsqueda | ❌ — no son parte del store |
| Ordenamiento | ❌ — no son parte del store |

**Problema de expectativa:** El botón dice "Resetear preferencias" sin aclarar que las vistas guardadas se conservan. Un usuario puede esperar que "resetear todo" borre sus vistas.

**Confirmación:** Usa `confirm()` nativo, inconsistente.

---

## 10. Persistencia detectada

| Aspecto | Valor |
|---|---|
| Mecanismo | Zustand `persist` middleware + `createJSONStorage` |
| Clave base | `inventario-disponibilidad-preferencias` |
| Clave real | `<tenant-scope>:inventario-disponibilidad-preferencias` (vía `lsKey()`) |
| Scope | Por empresa/tenant |
| Por usuario | ❌ — compartido entre usuarios del mismo tenant |
| Por establecimiento | ❌ — una sola clave por tenant |
| Migración legacy | ✅ — migra automáticamente claves sin scope a claves scopadas |
| Datos sensibles | ❌ — solo preferencias UI |
| Riesgo de mezcla entre empresas | ❌ — el scope por tenant lo previene |

**Riesgo de preferencias compartidas entre usuarios del mismo tenant:** Si dos usuarios en el mismo tenant usan la tabla, comparten la misma clave de preferencias. El usuario A puede cambiar densidad y el usuario B lo verá al recargar. Es un riesgo medio, aceptable para MVP pero a tener en cuenta para multi-usuario.

---

## 11. Impacto real sobre la tabla Stock Actual

| Funcionalidad | Impacta en tabla | Efecto visible |
|---|---|---|
| Cambiar densidad | ✅ Sí | Cambia alto de fila y tamaño de texto |
| Toggle columna estática | ✅ Sí | Columna aparece/desaparece |
| Mostrar todas | ✅ Sí | Activa 10 columnas estáticas |
| Solo esenciales | ✅ Sí | Deja 5 columnas estáticas |
| Activar vista guardada | ✅ Parcial | Aplica columnas y densidad, no filtros |
| Ocultar columnas dinámicas de almacén | ❌ No | No hay control sobre ellas |
| Resetear preferencias | ✅ Sí | Vuelve al layout y densidad por defecto |
| Crear vista | ✅ Persistencia | No cambia tabla hasta activar |

---

## 12. Hallazgos clasificados

### Crítico

| ID | Hallazgo |
|---|---|
| C-01 | Las columnas dinámicas por almacén (`almacenesParaColumnas`) se renderizan sin verificar `columnasVisibles`. El usuario no puede controlarlas desde el modal. En modo "Todos los almacenes" el modal da una ilusión de control completo que no es real. |

### Alto

| ID | Hallazgo |
|---|---|
| A-01 | Las vistas guardadas no capturan filtros, búsqueda, almacén ni ordenamiento. La metáfora "vista guardada" implica estado completo; solo almacena columnas + densidad. |
| A-02 | No existe forma de actualizar una vista guardada con el estado actual. El usuario debe eliminarla y recrearla. |

### Medio

| ID | Hallazgo |
|---|---|
| M-01 | Preferencias compartidas entre todos los usuarios del mismo tenant (clave única por empresa, no por usuario). |
| M-02 | Resetear preferencias no aclara que las vistas guardadas se conservan. El botón no tiene subtítulo ni tooltip aclaratorio. |
| M-03 | No hay validación de nombre duplicado en vistas guardadas. |

### Bajo

| ID | Hallazgo |
|---|---|
| B-01 | "Comoda" se muestra sin tilde en el selector de densidad. |
| B-02 | No hay límite de vistas guardadas. El usuario podría crear decenas sin impacto técnico real, pero satura la UI. |
| B-03 | Desactivar una vista solo limpia el badge "Activa" pero no revierte a ningún estado previo. Es ambiguo para el usuario. |

### UX

| ID | Hallazgo |
|---|---|
| U-01 | `alert()` y `confirm()` nativos en 4 lugares del modal (guardar vista, eliminar vista, resetear). Inconsistente con `useFeedback()` del resto de la app. |
| U-02 | El checkbox de columna única deshabilitada no muestra mensaje explicativo. Solo deja el input en gris. |
| U-03 | No hay indicador visual de cuántas columnas están activas fuera del modal (solo visible al abrirlo). |
| U-04 | Las columnas dinámicas de almacén no aparecen en la lista de "Columnas visibles" del modal, lo que puede confundir al usuario que espera verlas ahí. |

---

## 13. Qué está bien

- Zustand + persist bien implementado: reactividad inmediata + persistencia automática.
- Scope por tenant: no mezcla preferencias entre empresas.
- Migración de clave legacy automática.
- Protección mínima de "al menos una columna visible" implementada tanto en store como en UI (checkbox disabled).
- La UI de vistas guardadas comunica correctamente qué se guarda ("columnas visibles y densidad actual").
- La densidad aplica consistentemente a headers y body vía `cellClass`.
- `resetearPreferencias` preserva vistas guardadas deliberadamente (diseño defendible).
- El ícono de configuración tiene tooltip y atajo de teclado documentado (Alt+C).

---

## 14. Qué está incompleto

- Columnas dinámicas de almacén no integradas al sistema de visibilidad.
- Vistas guardadas no capturan el estado completo de la vista.
- No existe actualizar/renombrar vistas guardadas.
- El feedback usa `alert()`/`confirm()` en lugar del sistema de la app.

---

## 15. Qué es innecesario o sobredimensionado

- **Vistas guardadas** como concepto es correcto, pero sin capturar filtros y búsqueda su utilidad práctica es baja para el usuario promedio. Para MVP con pocos almacenes y productos, el usuario difícilmente necesitará guardar más de 1-2 vistas.
- El modal es en general apropiado para MVP; no está sobredimensionado en términos de lógica, pero la sección "Vistas guardadas" podría ocultarse o simplificarse hasta que capture estado completo.

---

## 16. Matriz de estado funcional

| Funcionalidad | Estado | Impacta en tabla | Persiste | Riesgo | Recomendación |
|---|---|---|---|---|---|
| Densidad de tabla | ✅ Funcional | Sí | Sí | Bajo | Mantener. Corregir tilde "Cómoda". |
| Columnas estáticas | ✅ Funcional | Sí | Sí | Bajo | Mantener. |
| Columnas dinámicas por almacén | 🔴 No controladas | — | — | Alto | Corregir: incluir en `columnasVisibles` o aclarar en UI que no son configurables. |
| Mostrar todas | ✅ Funcional | Sí | Sí | Bajo | Mantener. |
| Solo esenciales | ✅ Funcional | Sí | Sí | Bajo | Mantener. |
| Nueva vista (crear) | ⚠️ Parcial | Indirecto | Sí | Medio | Reemplazar `alert()` por `useFeedback`. Agregar validación de nombre único. |
| Vistas guardadas (activar) | ⚠️ Parcial | Solo columnas+densidad | Sí | Medio | Ocultar o añadir nota de que no restaura filtros. |
| Vistas guardadas (eliminar) | ✅ Funcional | No | Sí | Bajo | Reemplazar `confirm()` por diálogo del sistema. |
| Vistas guardadas (renombrar) | ❌ No existe | — | — | Bajo | No implementado. Agregar si se prioriza. |
| Resetear preferencias | ⚠️ Parcial | Sí (no vistas) | Sí | Medio | Aclarar en botón/tooltip que preserva vistas guardadas. |

---

## 17. Recomendación final

El modal es funcional y aporta valor real para MVP. No debe ser eliminado ni ocultado completamente.

**Acciones recomendadas en orden de prioridad:**

### Prioridad alta (antes de producción)
1. **C-01** — Resolver la brecha de columnas dinámicas. Opciones: (a) integrar los almacenes como columnas con ID propio en `ColumnaDisponibilidad`; (b) agregar nota en el modal aclarando que las columnas de almacén individual no son configurables; (c) añadir toggle global "Mostrar columnas por almacén" independiente.
2. **U-01** — Reemplazar todos los `alert()` y `confirm()` por el sistema de feedback (`useFeedback`) y diálogos de confirmación del proyecto.

### Prioridad media (mejora post-MVP)
3. **A-01** — Expandir `VistaGuardada` para capturar almacén, filtros y búsqueda al guardar.
4. **A-02** — Agregar acción "Actualizar vista" (sobrescribir con estado actual).
5. **M-02** — Agregar subtítulo al botón "Resetear preferencias": `"(mantiene las vistas guardadas)"`.
6. **B-01** — Corregir `"Comoda"` → `"Cómoda"`.

### Prioridad baja (refinamiento)
7. **M-03** — Validar nombre duplicado en vistas guardadas.
8. **B-02** — Limitar vistas guardadas (sugerido: máximo 10).
9. **B-03** — Mejorar comportamiento de "Desactivar": revertir a estado anterior o al default.

---

## 18. Checklist de decisión

| Decisión | Estado recomendado | Condición |
|---|---|---|
| **Mantener densidad** | ✅ Mantener | Funciona bien |
| **Mantener columnas visibles** | ✅ Mantener | Funciona bien para columnas estáticas |
| **Corregir columnas dinámicas** | 🔴 Corregir o aclarar | Brecha de expectativa vs realidad |
| **Mantener Mostrar todas / Solo esenciales** | ✅ Mantener | Funciona bien |
| **Corregir alertas nativas** | ⚠️ Corregir | Inconsistencia con sistema de feedback |
| **Mantener Vistas guardadas** | ⚠️ Simplificar o aclarar | Funciona parcialmente; expectativa mayor que entrega |
| **Ocultar Vistas guardadas temporalmente** | Opcional | Si se prefiere MVP sin la sección hasta completarla |
| **Mantener Resetear preferencias** | ✅ Mantener con aclaración | Funciona, falta comunicar qué no resetea |

---

*Auditoría realizada el 2026-06-17 sobre rama `inventarioMejoras2`. Sin modificaciones de código.*
