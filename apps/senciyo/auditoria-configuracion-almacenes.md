# Auditoría Configuración de Almacenes

> **Fecha:** 2026-06-05
> **Rama:** `ImplementacionNotaIngreso`
> **Módulo:** `configuracion-sistema` / `gestion-inventario`
> **Propósito:** Documentar el estado actual del módulo de almacenes, identificar brechas y evaluar la viabilidad de migrar a una vista compacta tipo tabla con creación rápida con un clic.

---

## 1. Resumen ejecutivo

El módulo de Configuración de Almacenes es funcional pero tiene deuda técnica acumulada. El modelo de datos es correcto y expresivo (17 campos bien tipados). La lógica de negocio está consolidada pero mezclada dentro del componente de página. La vista actual es un toggle formulario/lista de página completa que no escala para tenants con muchos almacenes ni para flujos de alta frecuencia de creación.

**La arquitectura actual permite una migración limpia a vista compacta tipo tabla sin romper ninguna lógica de negocio.** Toda la lógica de escritura pasa por acciones del reducer de React (`SET_ALMACENES`) y toda la lectura consume `state.almacenes` del contexto global — ambas capas son independientes del componente visual.

**Respuestas directas a las preguntas clave:**

| Pregunta | Respuesta |
|---|---|
| ¿Creación con un clic? | **Sí** — código y nombre auto-generables, establecimiento pre-seleccionable |
| ¿Vista compacta sin romper lógica? | **Sí** — solo cambia el componente visual |
| ¿Prioridad de salida existe? | **No como entero** — existe como binario `esAlmacenPrincipal` |
| ¿Estado Activo/Inactivo existe? | **Sí** — `estaActivoAlmacen` bien implementado e integrado en 14 archivos |
| ¿Se puede inactivar sin afectar histórico? | **Sí** — inactivo desaparece de operaciones nuevas, datos históricos intactos |
| ¿Se puede eliminar sin riesgo? | **Solo si** `tieneMovimientosInventario === false` — pero el flag no se sincroniza automáticamente |
| ¿Impacto en Kardex? | **Ninguno** si no se toca el reducer ni `stockGateway.ts` |
| ¿Impacto en Nota de Ingreso? | La NI tiene un defecto de filtrado por establecimiento (documentado) |
| ¿Un solo establecimiento? | Creación automática total — sin selector requerido |
| ¿Múltiples establecimientos? | Requiere selector en cabecera de la vista; NI tiene brecha (ver sección 14) |

Los riesgos más críticos identificados son: (1) `tieneMovimientosInventario` es un flag estático no sincronizado, (2) la Nota de Ingreso no filtra almacenes por establecimiento activo, (3) `esAlmacenPrincipal` es binario sin graduación FIFO configurable por el usuario.

---

## 2. Estado actual del módulo de almacenes

| Dimensión | Estado |
|---|---|
| Modelo de datos | Completo — 17 campos tipados en `Almacen.ts` |
| Persistencia | `localStorage` vía `ContextoConfiguracion` (sin backend) |
| CRUD UI | Funcional — toggle formulario/lista en página completa |
| Validaciones de creación | Implementadas correctamente en el componente |
| Permisos | Soportados vía `config.almacenes.gestionar` |
| Tests automatizados | No existen |
| Separación lógica-UI | Deficiente — toda la lógica dentro del componente de página |
| Multi-establecimiento | Modelado correctamente, parcialmente expuesto en UI |
| Prioridad de salida FIFO | Implementada de forma binaria (`esAlmacenPrincipal`) |
| Estado Activo/Inactivo | Implementado y consumido por 14 archivos |
| Capacidad máxima | Modelada sin UI de edición |
| Integración inventario | Completa |
| Integración Nota de Ingreso | Con brecha — no filtra por `establecimientoId` |

---

## 3. Archivos y componentes revisados

### Núcleo del módulo

| Archivo | Rol |
|---|---|
| `src/pages/Private/features/configuracion-sistema/modelos/Almacen.ts` | Tipo canónico `Almacen` + `ConfiguracionInventarioAlmacen` |
| `src/pages/Private/features/configuracion-sistema/paginas/ConfiguracionAlmacenes.tsx` | Única página CRUD — contiene toda la lógica y toda la UI |
| `src/pages/Private/features/configuracion-sistema/paginas/PanelConfiguracion.tsx` | Dashboard de configuración — muestra resumen de almacenes |
| `src/pages/Private/features/configuracion-sistema/hooks/useAlmacenes.ts` | Hook local con datos mock — **código muerto**, no tiene consumidores activos |
| `src/pages/Private/features/configuracion-sistema/contexto/ContextoConfiguracion.tsx` | Reducer + persistencia + bootstrap inicial + `reviveAlmacen` |
| `src/pages/Private/features/configuracion-sistema/modelos/Establecimiento.ts` | Tipo del establecimiento padre |

### Consumidores del modelo `Almacen` en tiempo de ejecución

| Archivo | Propiedades usadas |
|---|---|
| `src/shared/inventory/stockGateway.ts` | `id`, `establecimientoId`, `estaActivoAlmacen`, `esAlmacenPrincipal`, `codigoAlmacen`, `nombreAlmacen` |
| `src/shared/inventory/accionesStock.ts` | `id`, `codigoAlmacen`, `nombreAlmacen` |
| `src/pages/Private/features/gestion-inventario/hooks/useInventory.ts` | `id`, `estaActivoAlmacen`, `establecimientoId`, `nombreAlmacen`, `codigoAlmacen` |
| `src/pages/Private/features/gestion-inventario/hooks/useInventarioDisponibilidad.ts` | `id`, `estaActivoAlmacen`, `establecimientoId` |
| `src/pages/Private/features/gestion-inventario/api/inventory.facade.ts` | `id`, `estaActivoAlmacen` |
| `src/pages/Private/features/gestion-inventario/components/notas-ingreso/FormularioNotaIngreso.tsx` | `id`, `estaActivoAlmacen`, `nombreAlmacen`, `codigoAlmacen` |
| `src/pages/Private/features/documentos-comerciales/utils/servicioReservaStock.ts` | `id`, `nombreAlmacen`, `establecimientoId`, `estaActivoAlmacen`, `esAlmacenPrincipal` |
| `src/pages/Private/features/comprobantes-electronicos/hooks/useComprobanteActions.tsx` | Todos via `stockGateway` |
| `src/pages/Private/features/comprobantes-electronicos/punto-venta/hooks/useCart.tsx` | `id`, `estaActivoAlmacen`, `establecimientoId` |
| `src/shared/notifications/useHeaderNotifications.ts` | `estaActivoAlmacen` |

---

## 4. Modelo actual de almacén

Archivo: `src/pages/Private/features/configuracion-sistema/modelos/Almacen.ts`

### `ConfiguracionInventarioAlmacen` (objeto anidado)

```typescript
interface ConfiguracionInventarioAlmacen {
  permiteStockNegativoAlmacen: boolean;   // default false
  controlEstrictoStock: boolean;           // default false
  requiereAprobacionMovimientos: boolean;  // default false
  capacidadMaxima?: number;                // sin UI de edición
  unidadCapacidad?: 'units' | 'm3' | 'm2'; // sin UI de edición
}
```

### `Almacen` (tipo canónico)

```typescript
interface Almacen {
  id: string;
  codigoAlmacen: string;
  nombreAlmacen: string;
  establecimientoId: string;
  nombreEstablecimientoDesnormalizado?: string;
  codigoEstablecimientoDesnormalizado?: string;
  descripcionAlmacen?: string;
  ubicacionAlmacen?: string;
  estaActivoAlmacen: boolean;
  esAlmacenPrincipal: boolean;
  configuracionInventarioAlmacen: ConfiguracionInventarioAlmacen;
  creadoElAlmacen: Date;
  actualizadoElAlmacen: Date;
  creadoPor?: string;
  actualizadoPor?: string;
  tieneMovimientosInventario?: boolean;
}
```

### Tabla de campos

| Campo | Tipo | Requerido | Editable en UI | Notas |
|---|---|---|---|---|
| `id` | `string` | sí | no | `alm-${Date.now()}-${random}` |
| `codigoAlmacen` | `string` | sí | sí (max 4 chars) | Auto-generado correlativo por establecimiento |
| `nombreAlmacen` | `string` | sí | sí | Nombre visible en toda la app |
| `establecimientoId` | `string` | sí | sí | FK al establecimiento padre |
| `nombreEstablecimientoDesnormalizado` | `string?` | no | no (auto) | Copiado del establecimiento al guardar |
| `codigoEstablecimientoDesnormalizado` | `string?` | no | no (auto) | Copiado del establecimiento al guardar |
| `descripcionAlmacen` | `string?` | no | sí | Texto libre — campo avanzado |
| `ubicacionAlmacen` | `string?` | no | sí | Ubicación física — campo avanzado |
| `estaActivoAlmacen` | `boolean` | sí | sí (toggle) | Soft-enable/disable |
| `esAlmacenPrincipal` | `boolean` | sí | sí (checkbox) | Binario FIFO — NO es prioridad granular |
| `configuracionInventarioAlmacen` | objeto | sí | **NO** | Creado `false` para siempre — sin UI |
| `creadoElAlmacen` | `Date` | sí | no | Auto-asignado |
| `actualizadoElAlmacen` | `Date` | sí | no | Auto-actualizado |
| `creadoPor` | `string?` | no | no | No se asigna actualmente |
| `actualizadoPor` | `string?` | no | no | No se asigna actualmente |
| `tieneMovimientosInventario` | `boolean?` | no | no | Flag estático — no se sincroniza automáticamente |

### Campo crítico AUSENTE: `prioridadSalida`

El modelo **no tiene** un campo de prioridad de salida como entero. El orden FIFO lo implementa `esAlmacenPrincipal: boolean` de forma binaria. Agregar este campo requeriría:

```typescript
// Añadir al tipo Almacen:
prioridadSalida?: number; // entero, menor número = mayor prioridad, default 0
```

Y actualizar `resolvealmacenesForSaleFIFO` en `stockGateway.ts` para ordenar por `prioridadSalida ASC` antes del tiebreaker actual por código.

---

## 5. Relación almacén-establecimiento

La jerarquía es: `Empresa (RUC)` → `Establecimiento[]` → `Almacen[]`.

```
ConfigurationState {
  Establecimientos: Establecimiento[];   // array plano
  almacenes: Almacen[];                  // array plano
}
```

La relación es un FK unidireccional: `Almacen.establecimientoId → Establecimiento.id`. No existe un array embebido; el join se hace filtrando en tiempo de consulta.

### Campos de Establecimiento relevantes

| Campo | Uso en almacenes |
|---|---|
| `id` | FK primaria en `Almacen.establecimientoId` |
| `codigoEstablecimiento` | Se copia en `codigoEstablecimientoDesnormalizado` al guardar |
| `nombreEstablecimiento` | Se copia en `nombreEstablecimientoDesnormalizado` al guardar |
| `estaActivoEstablecimiento` | Solo activos aparecen en el selector de creación |
| `isMainEstablecimiento` | Determina el establecimiento activo por defecto en sesión |

### Patrón de join estándar en la app

```typescript
// Filtrar almacenes activos del establecimiento activo
const activos = almacenes.filter(a => a.estaActivoAlmacen);
const delEstablecimiento = activos.filter(
  a => a.establecimientoId === establecimientoActivoId
);
// Fallback inseguro presente en algunos módulos (ej. PanelImportacionStock):
const usados = delEstablecimiento.length > 0 ? delEstablecimiento : activos;
```

**Riesgo:** El fallback puede mezclar almacenes de establecimientos distintos si el establecimiento activo no tiene almacenes configurados.

---

## 6. Flujo actual de creación

Implementado en `ConfiguracionAlmacenes.tsx` — funciones `handleNew` + `manejarEnvio`.

### Campos que el usuario debe ingresar hoy

1. **Establecimiento** — select de establecimientos activos (preselecciona el primero).
2. **Código** — auto-generado pero editable, max 4 chars.
3. **Nombre del almacén** — obligatorio, sin valor por defecto.
4. **Descripción** — opcional, textarea.
5. **Ubicación física** — opcional, text input.
6. **Es almacén principal** — checkbox, default `false`.

### Auto-generación del código

```typescript
// Función en ConfiguracionAlmacenes.tsx
const generarSiguienteCodigo = (estId: string): string => {
  const numericos = almacenes
    .filter(a => a.establecimientoId === estId)
    .map(a => parseInt(a.codigoAlmacen, 10))
    .filter(n => !isNaN(n));
  const max = numericos.length > 0 ? Math.max(...numericos) : 0;
  return String(max + 1).padStart(4, '0');
};
// Sin almacenes previos → '0001'
```

### Dispatch de creación

```typescript
dispatch({ type: 'SET_ALMACENES', payload: [...almacenes, nuevoAlmacen] });
// Usa SET_ALMACENES (array completo) en lugar del action granular ADD_ALMACEN
// que existe definido en el reducer pero nunca se usa.
```

### Valores por defecto en creación

| Campo | Valor por defecto |
|---|---|
| `estaActivoAlmacen` | `true` |
| `esAlmacenPrincipal` | `false` |
| `tieneMovimientosInventario` | `false` |
| `permiteStockNegativoAlmacen` | `false` |
| `controlEstrictoStock` | `false` |
| `requiereAprobacionMovimientos` | `false` |
| `creadoPor` | `undefined` (no se asigna) |

---

## 7. Flujo actual de edición

Implementado en `ConfiguracionAlmacenes.tsx` — misma función `manejarEnvio` con `editandoId !== null`.

### Validación de código duplicado en edición

```typescript
const esDuplicado = almacenes.some(
  a => a.establecimientoId === formData.establecimientoId
    && a.codigoAlmacen === formData.codigoAlmacen
    && a.id !== editandoId  // excluye correctamente el propio registro
);
```

### Campos que NO se actualizan desde el formulario

- `configuracionInventarioAlmacen` — se preserva el objeto existente.
- `tieneMovimientosInventario` — se preserva del objeto original.
- `creadoElAlmacen` — se preserva.
- `id` — nunca se modifica.
- `creadoPor` — se preserva.

### Efecto secundario al cambiar establecimiento

Si el usuario cambia el `establecimientoId` de un almacén existente, los campos desnormalizados se actualizan. El historial de movimientos de Kardex que tenía los datos del almacén anterior permanece inmutable por diseño.

### Dispatch de edición

```typescript
dispatch({
  type: 'SET_ALMACENES',
  payload: almacenes.map(a => a.id === editandoId ? almacenActualizado : a),
});
// Idem — usa SET_ALMACENES en lugar del action UPDATE_ALMACEN definido pero no usado.
```

---

## 8. Flujo actual de eliminación/inactivación

### Eliminación (`handleDelete`)

**Bloqueos antes de eliminar:**
1. Permiso `config.almacenes.gestionar`.
2. Si `almacen.tieneMovimientosInventario === true`: abort con toast error.

**Brechas detectadas:**
- No verifica si es el único almacén del establecimiento.
- No verifica si es `esAlmacenPrincipal` — se puede eliminar el almacén principal sin advertencia.
- `tieneMovimientosInventario` es un flag estático no recalculado — si quedó en `false` por error, la eliminación procede aunque haya movimientos reales.

### Inactivación (`handleToggleStatus`)

- Invierte `estaActivoAlmacen`.
- Sin restricciones: se puede inactivar el almacén principal o el único almacén activo del establecimiento.
- No hay advertencia al inactivar el último almacén activo de un establecimiento.
- El impacto es inmediato en toda la app — todos los filtros `estaActivoAlmacen` operan en tiempo de ejecución.
- Los datos históricos (stock, Kardex, NI, comprobantes) permanecen intactos — la inactivación es solo operativa.

---

## 9. Uso actual de almacén principal

`esAlmacenPrincipal: boolean` es el único mecanismo de prioridad existente. Divide los almacenes en dos grupos para el orden FIFO de descuento de stock.

### Dónde se usa

| Archivo | Uso |
|---|---|
| `stockGateway.ts` → `resolvealmacenesForSaleFIFO` | Grupo 1 = principales, Grupo 2 = resto |
| `stockGateway.ts` → `resolvealmacenForSale` | Devuelve un único almacén principal para reservas de OV |
| `servicioReservaStock.ts` | Llama a `resolvealmacenForSale` para reservar stock de OV en el almacén principal |
| `ConfiguracionAlmacenes.tsx` | Checkbox en formulario; badge visual en lista |

### Comportamiento FIFO actual

```
Orden de descuento:
  Grupo 1 (primero): esAlmacenPrincipal === true
    → orden interno: codigoAlmacen ASC, nombreAlmacen ASC, id ASC
  Grupo 2 (después): resto de almacenes activos
    → mismo orden estable
```

Si hay dos almacenes marcados como principales, el orden relativo entre ellos no es configurable por el usuario — lo determina el código correlativo.

### ¿Cambiar por `prioridadSalida`?

No se debe eliminar `esAlmacenPrincipal` hasta no tener `prioridadSalida` implementado y migrado, porque `resolvealmacenForSale` (reservas OV) lo usa para resolver **un único** almacén. Ambos conceptos deben coexistir en la transición:

- `esAlmacenPrincipal` → mantener como indicador de almacén por defecto de sesión.
- `prioridadSalida` → nuevo campo que reemplaza la lógica FIFO binaria.

---

## 10. Impacto en inventario, stock y Kardex

### Propiedades de `Almacen` que usa cada capa

| Capa | Propiedades leídas | Operación |
|---|---|---|
| `stockGateway.ts` | `id`, `establecimientoId`, `estaActivoAlmacen`, `esAlmacenPrincipal`, `codigoAlmacen`, `nombreAlmacen` | Resolución FIFO, sumarización de stock |
| `InventoryService.registerAdjustment` | `id`, `codigoAlmacen`, `nombreAlmacen` | Crear movimiento Kardex |
| `InventoryService.registerTransfer*` | `id`, `codigoAlmacen`, `nombreAlmacen` | Crear movimientos de transferencia |
| `generarNIEnInventario` | `id` (de línea) | Entrada por línea de NI |
| `anularNIEnInventario` | `id` (de línea) | Reversión por línea de NI |
| `useInventarioDisponibilidad` | `id`, `estaActivoAlmacen`, `establecimientoId` | Cálculo de stock por columna en Stock Actual |

### Qué pasa al inactivar un almacén

- El almacén desaparece de todos los selectores en tiempo real.
- El stock registrado en `Product.stockPorAlmacen[almacenId]` **permanece intacto**.
- Los movimientos de Kardex **permanecen intactos**.
- `summarizeProductStock` **excluye** el almacén inactivo del `totalAvailable`.
- Las Notas de Ingreso existentes con ese almacén **no se alteran** (ya ejecutadas).
- Las ventas futuras **no pueden consumir** ese stock — queda "congelado".

### Qué pasa al eliminar un almacén

- El almacén desaparece de `state.almacenes`.
- `Product.stockPorAlmacen[almacenId]` permanece en el objeto del producto como un registro huérfano (nadie lo limpia).
- `summarizeProductStock` ya no incluye ese `almacenId` en la iteración → el stock queda invisible y no contabilizado.
- Los movimientos de Kardex persisten con `almacenId` e `almacenNombre` del momento de creación — el Kardex histórico permanece legible.

### Agregar `prioridadSalida` al modelo: impacto esperado

| Capa | Cambio requerido |
|---|---|
| `Almacen.ts` | Agregar `prioridadSalida?: number` |
| `ContextoConfiguracion.tsx` | Bootstrap y `reviveAlmacen` deben poblar el campo |
| `stockGateway.ts` | Actualizar `resolvealmacenesForSaleFIFO` para ordenar por `prioridadSalida` |
| `ConfiguracionAlmacenes.tsx` | Agregar campo en formulario y en la tabla propuesta |
| Kardex, NI, comprobantes, POS | Sin cambios — no leen `prioridadSalida` |

---

## 11. Viabilidad de tabla compacta editable

**Veredicto: VIABLE sin cambios en el modelo, reducer ni persistencia.**

| Requisito | ¿Soportado actualmente? | Trabajo requerido |
|---|---|---|
| Leer lista de almacenes por establecimiento | Sí | Solo filtro en el componente |
| Crear almacén con dispatch | Sí (`SET_ALMACENES`) | Extraer lógica a hook |
| Editar almacén con dispatch | Sí (`SET_ALMACENES`) | Extraer lógica a hook |
| Inactivar almacén | Sí (`handleToggleStatus`) | Extraer lógica a hook |
| Eliminar almacén | Sí (`handleDelete`) | Extraer lógica a hook |
| Auto-generar código | Sí (`generarSiguienteCodigo`) | Mover al hook |
| Auto-generar nombre | No implementado | Añadir 1 función nueva |
| Validar nombre no duplicado | Sí | Mover al hook |
| Edición inline en celda | No existe | Componente de input de celda nuevo |
| Fila temporal pendiente | No existe | State local del componente |
| Permiso `gestionar` | Sí | Ya disponible en contexto |

La migración es **100% de componente UI** — la lógica de negocio existente en `ConfiguracionAlmacenes.tsx` se extrae al hook `useAlmacenes.ts` (que hoy es código muerto con mocks) y se reutiliza sin modificar el reducer ni el contexto.

---

## 12. Viabilidad de creación con un clic

**Veredicto: VIABLE. Todos los campos necesarios pueden auto-generarse.**

### Campos auto-generables

| Campo | Mecanismo | Disponible hoy |
|---|---|---|
| `id` | `alm-${Date.now()}-${random}` | Sí |
| `codigoAlmacen` | `generarSiguienteCodigo(establecimientoId)` | Sí |
| `nombreAlmacen` | `Almacén ${codigoAlmacen}` | No — 1 línea nueva |
| `establecimientoId` | Único existente, o el activo en cabecera | Sí (lógica existente) |
| `estaActivoAlmacen` | `true` por defecto | Sí |
| `esAlmacenPrincipal` | `false` por defecto | Sí |
| `tieneMovimientosInventario` | `false` por defecto | Sí |
| `configuracionInventarioAlmacen` | Defaults `false` | Sí |
| `creadoElAlmacen` | `new Date()` | Sí |
| `actualizadoElAlmacen` | `new Date()` | Sí |

### Campo obligatorio mínimo para guardar

Solo `nombreAlmacen` requiere confirmación del usuario (el único campo visible que no puede generarse sin contexto semántico). El nombre auto-generado `Almacén 0002` se puede editar inline antes o después de guardar.

### Validaciones mínimas para creación rápida

1. `nombreAlmacen` no vacío.
2. `codigoAlmacen` único en el establecimiento.
3. Permiso `config.almacenes.gestionar`.

---

## 13. Comportamiento con un solo establecimiento

**Veredicto: Completamente transparente — sin cambios necesarios.**

Cuando solo existe un establecimiento:
- El filtro por `establecimientoId` retorna el 100% de los almacenes (todos le pertenecen).
- El botón `+ Agregar almacén` puede directamente asignar el único establecimiento sin mostrar selector.
- El código se genera correlativo respecto a los almacenes de ese establecimiento.
- El nombre se genera como `Almacén {código}`.
- No hay ninguna lógica que falle ni ningún campo que quede pendiente.

**Flujo propuesto (un establecimiento):**

```
Clic en "+ Agregar almacén"
  → crea fila con: código=auto, nombre=auto, estab=auto, activo=true, principal=false
  → fila entra en modo edición con foco en campo nombre
  → Enter / clic fuera → guardar con SET_ALMACENES
  → si nombre vacío → error inline en la celda (sin cerrar la tabla)
```

---

## 14. Comportamiento con múltiples establecimientos

**Veredicto: Soportado en el modelo. La UI necesita un selector de establecimiento en cabecera de la vista.**

### Propuesta de flujo (múltiples establecimientos)

```
1. La cabecera de la vista tiene un select "Establecimiento activo" 
   que filtra la tabla a los almacenes de ese establecimiento.

2. Clic en "+ Agregar almacén":
   → Si hay establecimiento seleccionado en cabecera: asigna automáticamente.
   → Fila entra en modo edición con foco en nombre.
   → La celda Establecimiento muestra el nombre del establecimiento (solo lectura).

3. Si el usuario quiere crear un almacén en OTRO establecimiento:
   → Primero cambia el selector de cabecera.
   → Luego hace clic en "+ Agregar almacén".
```

### Brecha crítica detectada: Nota de Ingreso

`FormularioNotaIngreso.tsx` muestra **todos los almacenes activos del tenant** sin filtrar por `establecimientoId` del establecimiento activo de la sesión. Con múltiples establecimientos, el usuario puede seleccionar almacenes de otro establecimiento en una NI, creando inconsistencias de datos.

**Este es el único punto del sistema donde la multi-establecimiento no está correctamente segregada.**

---

## 15. Campos necesarios para la tabla propuesta

```
Código | Nombre (editable) | Establecimiento | Principal | Estado | Con mov. | Acciones
```

| Columna | Campo fuente | Edición inline | Visible por defecto |
|---|---|---|---|
| Código | `codigoAlmacen` | Solo lectura | Sí |
| Nombre | `nombreAlmacen` | Input texto | Sí |
| Establecimiento | `nombreEstablecimientoDesnormalizado` | Select (solo si multi-estab.) | Sí |
| Principal | `esAlmacenPrincipal` | Checkbox o toggle | Sí |
| Estado | `estaActivoAlmacen` | Toggle | Sí |
| Con movimientos | `tieneMovimientosInventario` | Solo lectura (badge) | Sí |
| Acciones | — | Editar (panel), Inactivar, Eliminar | Sí |
| Descripción | `descripcionAlmacen` | No inline — panel/modal lateral | No (columna oculta) |
| Ubicación | `ubicacionAlmacen` | No inline — panel/modal lateral | No |
| Config. inventario | `configuracionInventarioAlmacen` | No inline — panel/modal lateral | No |

**Nota sobre prioridad de salida:** Si se agrega el campo `prioridadSalida` al modelo en una fase posterior, debe aparecer como columna editable (input numérico) y ordenar la tabla por ese valor dentro del establecimiento activo.

---

## 16. Riesgos técnicos detectados

| # | Riesgo | Severidad | Archivos afectados |
|---|---|---|---|
| R1 | `tieneMovimientosInventario` flag estático — nunca se sincroniza con movimientos reales | Alto | `ContextoConfiguracion.tsx`, `notaIngreso.service.ts`, `inventory.service.ts` |
| R2 | `FormularioNotaIngreso.tsx` no filtra almacenes por `establecimientoId` activo | Alto | `FormularioNotaIngreso.tsx` |
| R3 | `generarNIEnInventario` tiene `continue` silencioso — NI puede confirmarse visualmente sin haber registrado stock en algunas líneas | Alto | `notaIngreso.service.ts` |
| R4 | `useAlmacenes.ts` es código muerto con mocks — confunde al equipo | Medio | `hooks/useAlmacenes.ts` |
| R5 | `ADD_ALMACEN`, `UPDATE_ALMACEN`, `DELETE_ALMACEN` definidos en reducer pero nunca usados | Medio | `ContextoConfiguracion.tsx` |
| R6 | Sin `prioridadSalida` granular — FIFO binario no configurable | Medio | `Almacen.ts`, `stockGateway.ts` |
| R7 | Filtro `estaActivoAlmacen !== false` (permisivo) en `stockGateway.ts` vs `=== true` (estricto) en UI — inconsistencia que deja pasar almacenes sin el campo definido | Medio | `stockGateway.ts` |
| R8 | Se puede inactivar el último almacén activo de un establecimiento sin advertencia | Medio | `ConfiguracionAlmacenes.tsx` |
| R9 | Se puede eliminar el almacén principal sin advertencia específica | Bajo | `ConfiguracionAlmacenes.tsx` |
| R10 | Fallback "usar todos los almacenes activos" si ninguno pertenece al establecimiento puede cruzar datos entre establecimientos | Alto | `PanelImportacionStock.tsx` y similares |
| R11 | `generarSiguienteCodigo` duplicado en componente y en hook muerto | Bajo | `ConfiguracionAlmacenes.tsx`, `useAlmacenes.ts` |
| R12 | `configuracionInventarioAlmacen` sin UI — hardcodeado `false` permanente | Bajo-Medio | `ConfiguracionAlmacenes.tsx` |
| R13 | `Establecimiento.inventoryConfiguration.isalmacen` typo (lowercase `a`) — campo sin uso | Bajo | `Establecimiento.ts` |

---

## 17. Riesgos funcionales detectados

| # | Riesgo | Impacto en el usuario |
|---|---|---|
| F1 | Almacén con stock real > 0 puede eliminarse si `tieneMovimientosInventario === false` — stock queda huérfano | Stock visible en Stock Actual, invisible en ventas |
| F2 | Inactivar el único almacén de un establecimiento deja el establecimiento sin almacén operativo — ventas fallan silenciosamente | El POS muestra stock 0, comprobantes no descuentan |
| F3 | NI con almacenes de múltiples establecimientos crea inconsistencias en multi-establecimiento | Stock cruzado entre establecimientos |
| F4 | Dos almacenes principales en un establecimiento — el usuario no puede controlar cuál se vacía primero | FIFO no predecible desde la UI |
| F5 | `configuracionInventarioAlmacen.permiteStockNegativoAlmacen` siempre `false` — si algún módulo lo lee, siempre bloquea | Posible bloqueo inesperado en operaciones legítimas |
| F6 | Al cambiar establecimiento de un almacén existente, el stock `stockPorAlmacen[almacenId]` queda en el mapa del producto sin cambio — los módulos de ventas del establecimiento original dejarían de contabilizarlo correctamente | Descuadre de stock entre lo visible y lo real |

---

## 18. Archivos que podrían requerir cambios

| Archivo | Cambio propuesto | Riesgo | Fase |
|---|---|---|---|
| `configuracion-sistema/modelos/Almacen.ts` | Agregar `prioridadSalida?: number` | Bajo — campo opcional | Fase 2 |
| `configuracion-sistema/paginas/ConfiguracionAlmacenes.tsx` | Reemplazar vista form/lista por tabla editable inline | Medio — UI pura | Fase 1 |
| `configuracion-sistema/hooks/useAlmacenes.ts` | Convertirlo en hook real con lógica extraída del componente | Bajo — no tiene consumidores activos | Fase 1 |
| `configuracion-sistema/contexto/ContextoConfiguracion.tsx` | Agregar `prioridadSalida` en bootstrap/revive; activar `UPDATE_ALMACEN` | Medio — afecta persistencia | Fase 2 |
| `shared/inventory/stockGateway.ts` | Unificar filtro `!== false` → `=== true`; agregar ordenación por `prioridadSalida` | Medio — afecta FIFO ventas | Fase 2 |
| `gestion-inventario/components/notas-ingreso/FormularioNotaIngreso.tsx` | Agregar filtro por `establecimientoId` activo (R2) | Alto — necesario ya | Fase 0 |
| `gestion-inventario/services/notaIngreso.service.ts` | Cambiar `continue` silencioso por error descriptivo (R3) | Alto — necesario ya | Fase 0 |
| `gestion-inventario/services/inventory.service.ts` | Actualizar `tieneMovimientosInventario` al confirmar movimientos (R1) | Alto — necesario ya | Fase 0 |

---

## 19. Archivos que no deberían tocarse

| Archivo | Razón |
|---|---|
| `shared/inventory/accionesStock.ts` | Lógica de movimientos estable; cambios afectan todo el Kardex |
| `shared/inventory/stockGateway.ts` (funciones de resolución FIFO) | Correcto conceptualmente; solo unificar el filtro de activos (puntual) |
| `configuracion-sistema/contexto/ContextoConfiguracion.tsx` (acciones del reducer) | El reducer es correcto; lo que debe cambiar es quién lo llama |
| `configuracion-sistema/modelos/Establecimiento.ts` | Tipo correcto salvo typo menor `isalmacen`; no urgente |
| `configuracion-sistema/utilidades/catalogoSeries.ts` | Ya incluye `STOCK_ENTRY` correctamente; estable |
| `configuracion-sistema/utilidades/seriesPredeterminadas.ts` | Incluye seed NI; estable en la rama actual |
| `catalogo-articulos/hooks/useProductStore.tsx` | Store central de productos; usado por más de 15 archivos |
| `gestion-inventario/repositories/stock.repository.ts` | Migración de clave legacy frágil; tocarla puede corromper kardex existente |

---

## 20. Recomendación técnica

### Prioridad inmediata — Fase 0 (sin rediseño de UI)

Estas tres correcciones deben hacerse independientemente del rediseño de la tabla:

1. **Corregir filtro por establecimiento en `FormularioNotaIngreso.tsx`** (R2):
   ```typescript
   // Cambiar:
   almacenes.filter(a => a.estaActivoAlmacen)
   // Por:
   almacenes.filter(a => a.estaActivoAlmacen && a.establecimientoId === establecimientoActivoId)
   ```

2. **Corregir `continue` silencioso en `notaIngreso.service.ts`** (R3): lanzar error descriptivo con el nombre del almacén faltante.

3. **Conectar `tieneMovimientosInventario` con confirmación real de NI** (R1): al confirmar exitosamente en `useNotasIngreso.ts`, actualizar el almacén destino con `tieneMovimientosInventario: true`.

### Prioridad media — Fase 1 (tabla compacta)

4. **Extraer lógica de `ConfiguracionAlmacenes.tsx` a `useAlmacenes.ts`**: el hook debe exponer `crearAlmacen(opts)`, `editarAlmacen(id, data)`, `toggleEstado(id)`, `eliminarAlmacen(id)`, y los helpers de generación.

5. **Implementar `ConfiguracionAlmacenesCompacto.tsx`**: tabla editable con fila de creación rápida. El componente solo presenta datos del hook — zero lógica de negocio en el componente.

6. **Agregar guardia "último almacén activo"** (R8): antes de inactivar, verificar si quedaría el establecimiento sin almacenes activos.

7. **Unificar filtro `estaActivoAlmacen`** (R7): `!== false` → `=== true` en `stockGateway.ts`.

### Prioridad baja — Fase 2 (prioridad granular)

8. **Agregar `prioridadSalida?: number`** al modelo, al bootstrap y a `resolvealmacenesForSaleFIFO`.

9. **Exponer `prioridadSalida` en la tabla compacta** como columna editable (input numérico con reordenamiento drag-and-drop opcional).

---

## 21. Plan sugerido de implementación por fases

### Fase 0: Correcciones críticas (sin UI nueva)

| Tarea | Archivo | Estimación |
|---|---|---|
| Filtrar almacenes por establecimiento en NI | `FormularioNotaIngreso.tsx` | 0.5h |
| Error descriptivo en `generarNIEnInventario` | `notaIngreso.service.ts` | 0.5h |
| Actualizar `tieneMovimientosInventario` al generar NI | `useNotasIngreso.ts` + `notaIngreso.service.ts` | 1h |
| **Total Fase 0** | | **2h** |

### Fase 1: Vista compacta sin cambios de modelo

| Tarea | Archivo | Estimación |
|---|---|---|
| Extraer lógica a `useAlmacenes.ts` | `useAlmacenes.ts` | 2h |
| Implementar tabla compacta editable | `ConfiguracionAlmacenes.tsx` (refactor UI) | 4h |
| Fila de creación rápida con auto-generación de nombre | Dentro del componente | 1h |
| Guardia "último almacén activo" | `useAlmacenes.ts` | 0.5h |
| Unificar filtro `estaActivoAlmacen` en gateway | `stockGateway.ts` | 0.5h |
| **Total Fase 1** | | **8h** |

### Fase 2: Prioridad de salida granular

| Tarea | Archivo | Estimación |
|---|---|---|
| Agregar `prioridadSalida` al tipo | `Almacen.ts` | 0.5h |
| Bootstrap y revive del campo | `ContextoConfiguracion.tsx` | 1h |
| Ordenación FIFO por `prioridadSalida` | `stockGateway.ts` | 1h |
| Columna editable en tabla compacta | `ConfiguracionAlmacenes.tsx` | 1h |
| **Total Fase 2** | | **3.5h** |

---

## 22. Pruebas manuales recomendadas

1. **Creación rápida — un establecimiento:** Hacer clic en "+ Agregar almacén" → verificar que código, nombre y establecimiento quedan pre-rellenados → editar el nombre → guardar → confirmar en Stock Actual que aparece disponible.

2. **Código duplicado:** Crear dos almacenes con mismo código en el mismo establecimiento → debe mostrar error de validación y no guardar.

3. **Código duplicado entre establecimientos:** Mismo código (`0001`) en dos establecimientos distintos → debe permitirse.

4. **Inactivar el único almacén de un establecimiento:** Verificar que el POS y la emisión de comprobantes reflejan correctamente la ausencia de almacén (sin crash).

5. **Eliminar almacén con movimientos reales:** Crear NI confirmada → intentar eliminar el almacén destino → debe bloquearse. **NOTA:** verificar si `tieneMovimientosInventario` se actualizó (actualmente no se hace — prueba del R1).

6. **Cambiar establecimiento de almacén existente:** Editar un almacén y asignarle otro establecimiento → verificar que desaparece del listado del establecimiento original y aparece en el nuevo.

7. **Filtro multi-establecimiento en NI:** Con dos establecimientos y almacenes distintos → abrir NI → verificar si aparecen almacenes del establecimiento incorrecto (actualmente sí — defecto R2).

8. **FIFO con dos almacenes principales:** Marcar dos almacenes como `esAlmacenPrincipal: true` → emitir comprobante que consuma stock de ambos → verificar que el descuento sigue el orden por `codigoAlmacen` ASC.

9. **Toggle activo/inactivo y reemisión:** Inactivar un almacén → emitir comprobante con producto que tiene stock solo en ese almacén → verificar que el stock no se toca y el sistema usa el siguiente almacén válido.

10. **Bootstrap empresa nueva:** Crear nueva empresa → verificar que almacén `0001` se crea con `esAlmacenPrincipal: true` y `estaActivoAlmacen: true`.

11. **Inactivar → reactivar:** Inactivar almacén con stock → verificar que el stock sigue en `Product.stockPorAlmacen` → reactivar → verificar que el stock vuelve a ser contabilizado en `summarizeProductStock`.

---

## 23. Conclusión

El módulo de Configuración de Almacenes tiene una base sólida: el modelo de datos es correcto y expresivo, la persistencia es coherente con el resto del sistema, y la integración con los 14 consumidores del array `state.almacenes` es limpia y predecible.

**La migración a una vista compacta tipo tabla es viable sin cambios en el modelo ni en la capa de datos.** Toda la lógica está lista para ser extraída a un hook. El único componente que cambia es la presentación visual de `ConfiguracionAlmacenes.tsx`.

**La creación con un clic es técnicamente posible hoy** — requiere agregar únicamente la generación automática del nombre (`Almacén {código}`) y ajustar el componente para insertar una fila en lugar de abrir un formulario completo.

Las tres correcciones de Fase 0 (filtro NI por establecimiento, error silencioso en `notaIngreso.service.ts`, y sincronización de `tieneMovimientosInventario`) deben priorizarse antes de cualquier rediseño de UI, ya que son defectos funcionales independientes del rediseño.

La ausencia de `prioridadSalida` como entero es la brecha de modelo más importante. Su implementación es de riesgo medio-bajo y desbloquea una experiencia de usuario significativamente mejor para operaciones multi-almacén.
