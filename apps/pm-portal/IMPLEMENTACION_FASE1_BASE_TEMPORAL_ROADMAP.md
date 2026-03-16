# IMPLEMENTACIÓN FASE 1 — BASE TEMPORAL SEGURA Y COMPATIBLE

> **Sistema:** PM Portal
> **Rama:** `feature/creacion-cronograma`
> **Fecha:** 2026-03-16
> **Alcance:** Solo Fase 1. Sin tocar cronograma. Sin romper compatibilidad.

---

## 1. Resumen ejecutivo

### Qué se hizo

Se agregó soporte temporal explícito y opcional a las entidades `Objetivo` e `Iniciativa` del módulo Roadmap. Los campos `fecha_inicio` y `fecha_fin` fueron incorporados en las cinco capas del sistema: dominio, validación, repositorio (automático), formularios de captura y exportación CSV.

Se mejoró la consistencia mínima de la validación de fechas en `Entrega` alineando `fecha_objetivo` y `fecha_completado` al esquema estándar ya usado por el resto del sistema.

### Qué no se tocó

- `PaginaCronogramaRoadmap.tsx`: ningún cambio. La lógica de visualización, barras, agregación de hijos y fallback visual quedan intactos.
- Repositorios de objetivos e iniciativas: no fue necesario modificarlos. Los repositorios usan `insert(entrada)` y `update(entrada)` donde `entrada` se infiere del tipo `ObjetivoEntrada` / `IniciativaEntrada`. Al extender los schemas Zod, los tipos se actualizaron automáticamente.
- Casos de uso de objetivos e iniciativas: sin cambios. Pasan los datos tal cual llegan del schema.
- Módulo Releases, Lanzamientos, Seguimiento: sin cambios.
- Módulo Cronograma, visualización temporal: sin cambios.

### Retrocompatibilidad

**Total.** Los nuevos campos son opcionales (`?`) en TypeScript y nullables en base de datos. Los registros existentes quedan con `NULL`. Los formularios pueden guardarse sin completar fechas. Ningún registro existente se invalida.

### Riesgos detectados

Ningún riesgo de ruptura. El único punto de atención menor: la migración SQL debe ejecutarse en Supabase **antes** del deploy del frontend. Si el frontend se despliega antes de la migración, los repositorios intentarán escribir `fecha_inicio`/`fecha_fin` en columnas que no existen aún. Ver sección 10.

---

## 2. Archivos modificados

| Archivo | Motivo | Tipo de cambio |
|---|---|---|
| `src/dominio/modelos.ts` | Agregar campos `fecha_inicio?` y `fecha_fin?` a `Objetivo` e `Iniciativa` | Extensión de interfaces (retrocompatible) |
| `src/compartido/validacion/esquemas.ts` | Agregar campos a `objetivoSchema` e `iniciativaSchema` con validación cruzada; alinear `entregaSchema` | Extensión de schemas Zod |
| `src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx` | Agregar captura de fechas en formulario, tabla y CSV | Extensión de formulario y visualización |
| `src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx` | Agregar captura de fechas en formulario, tabla y CSV | Extensión de formulario y visualización |
| `scripts/migracion_fase1_temporalidad_roadmap.sql` | Migración DDL para Supabase | Nuevo archivo de migración |

---

## 3. Cambios en base de datos

### Migración creada

**Archivo:** `scripts/migracion_fase1_temporalidad_roadmap.sql`

```sql
ALTER TABLE objetivos
  ADD COLUMN IF NOT EXISTS fecha_inicio DATE NULL,
  ADD COLUMN IF NOT EXISTS fecha_fin DATE NULL;

ALTER TABLE iniciativas
  ADD COLUMN IF NOT EXISTS fecha_inicio DATE NULL,
  ADD COLUMN IF NOT EXISTS fecha_fin DATE NULL;
```

### Columnas agregadas

| Tabla | Columna | Tipo | Nullable | Default |
|---|---|---|---|---|
| `objetivos` | `fecha_inicio` | `DATE` | Sí | NULL |
| `objetivos` | `fecha_fin` | `DATE` | Sí | NULL |
| `iniciativas` | `fecha_inicio` | `DATE` | Sí | NULL |
| `iniciativas` | `fecha_fin` | `DATE` | Sí | NULL |

### Tipo de dato elegido: `DATE`

Se eligió `DATE` (sin hora) porque:
- La convención del sistema usa strings `YYYY-MM-DD` en el frontend para fechas de planificación
- El tipo `DATE` en PostgreSQL se transporta como `YYYY-MM-DD` por Supabase — consistente con el formato ya usado en `fecha_objetivo` de Entrega y `fecha_programada` de Release
- No se requiere manejo de zona horaria para fechas de planificación estratégica

### Registros existentes

Ningún registro existente se modifica. Todos quedan con `fecha_inicio = NULL` y `fecha_fin = NULL`. Sin backfill. Sin migración de datos.

---

## 4. Cambios en dominio y tipos

**Archivo:** `src/dominio/modelos.ts`

### `Objetivo` — antes y después

```typescript
// ANTES
export interface Objetivo {
  id: string
  nombre: string
  descripcion: string
  estado: EstadoRegistro
  prioridad: PrioridadRegistro
  created_at: string
  updated_at: string
}

// DESPUÉS
export interface Objetivo {
  id: string
  nombre: string
  descripcion: string
  estado: EstadoRegistro
  prioridad: PrioridadRegistro
  fecha_inicio?: string | null   // nuevo — opcional
  fecha_fin?: string | null      // nuevo — opcional
  created_at: string
  updated_at: string
}
```

### `Iniciativa` — después

```typescript
export interface Iniciativa {
  // ... campos existentes sin cambio ...
  fecha_inicio?: string | null   // nuevo — opcional
  fecha_fin?: string | null      // nuevo — opcional
  created_at: string
  updated_at: string
}
```

### Nulabilidad / opcionalidad

Los campos usan `?` (opcional) y `string | null` deliberadamente:
- `?` garantiza que el objeto literal sintético `FILA_SIN_OBJETIVO` en el cronograma (que crea un `Objetivo` manualmente sin fechas) sigue compilando sin modificar ese componente
- `string | null` refleja que Supabase devuelve `null` para columnas nullable, no `undefined`
- Los tipos inferenciales `ObjetivoEntrada` e `IniciativaEntrada` se actualizaron automáticamente al modificar los schemas Zod

---

## 5. Cambios en validaciones

**Archivo:** `src/compartido/validacion/esquemas.ts`

### `objetivoSchema` — extensión con superRefine

```typescript
export const objetivoSchema = z
  .object({
    nombre: ...,
    descripcion: ...,
    estado: estadoSchema,
    prioridad: prioridadSchema,
    fecha_inicio: fechaCatalogoSchema,   // nuevo: z.string().trim().nullable().optional()
    fecha_fin: fechaCatalogoSchema       // nuevo: z.string().trim().nullable().optional()
  })
  .superRefine((valores, contexto) => {
    if (valores.fecha_inicio && valores.fecha_fin && valores.fecha_inicio > valores.fecha_fin) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fecha_fin'],
        message: 'La fecha fin no puede ser menor que la fecha inicio'
      })
    }
  })
```

### `iniciativaSchema` — misma extensión

Mismo patrón que `objetivoSchema`.

### `entregaSchema` — alineación mínima

```typescript
// ANTES
fecha_objetivo: z.string().nullable().optional(),
fecha_completado: z.string().trim().nullable().optional(),

// DESPUÉS
fecha_objetivo: fechaOpcionalSchema,     // z.string().trim().nullable().optional()
fecha_completado: fechaOpcionalSchema,   // z.string().trim().nullable().optional()
```

Solo diferencia: se agrega `.trim()` a `fecha_objetivo` para consistencia con el resto del sistema. No cambia comportamiento funcional.

### Reglas agregadas

| Schema | Regla nueva | Tipo |
|---|---|---|
| `objetivoSchema` | `fecha_inicio <= fecha_fin` (si ambas presentes) | Zod `superRefine` — error bloqueante |
| `iniciativaSchema` | `fecha_inicio <= fecha_fin` (si ambas presentes) | Zod `superRefine` — error bloqueante |

### Validaciones pospuestas para Fase 2

| Validación | Razón del diferimiento |
|---|---|
| `fecha_completado >= fecha_objetivo` en Entrega | El campo `fecha_completado` es read-only en el form y viene del reset inicial. Registros con inconsistencia existente quedarían bloqueados al editar sin poder corregirlo desde la UI. |
| Contención iniciativa dentro de objetivo | Requiere cargar fechas del objetivo padre en el form de iniciativa y mostrar warning. Es funcional pero añade complejidad al form más cargado del sistema. Diferido a Fase 2. |
| Formato ISO estricto en fechas de entrega | `type="date"` en HTML ya garantiza `YYYY-MM-DD` para nuevos valores. Forzar formato para valores históricos rompería edición de registros viejos con datos inconsistentes. |

---

## 6. Cambios en formularios

### Objetivos — `PaginaObjetivosRoadmap.tsx`

**Campos agregados al formulario modal:**

```tsx
<div className="grid gap-3 md:grid-cols-2">
  <div>
    <label className="text-sm font-medium">Fecha inicio</label>
    <input
      type="date"
      {...register('fecha_inicio')}
      readOnly={modoModal === 'ver'}
      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
    />
    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Opcional</p>
  </div>
  <div>
    <label className="text-sm font-medium">Fecha fin</label>
    <input
      type="date"
      {...register('fecha_fin')}
      readOnly={modoModal === 'ver'}
      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
    />
    {errors.fecha_fin ? (
      <p className="mt-1 text-xs text-red-500">{errors.fecha_fin.message}</p>
    ) : null}
  </div>
</div>
```

**Posición:** Después del grid Estado/Prioridad y antes del botón Guardar. Consistente con el patrón visual del sistema.

**Normalización en submit:** El handler convierte strings vacíos a null antes de persistir:
```typescript
const carga = {
  ...valores,
  fecha_inicio: valores.fecha_inicio || null,
  fecha_fin: valores.fecha_fin || null
}
```

### Iniciativas — `PaginaIniciativasRoadmap.tsx`

Mismo patrón que Objetivos. Los campos se agregan al final del formulario, después del grid Estado/Prioridad y antes del botón Guardar. La normalización se integra en el `carga` ya existente:

```typescript
const carga = {
  ...valores,
  objetivo_id: valores.objetivo_id || null,
  ventana_planificada_id: valores.ventana_planificada_id || null,
  etapa_id: valores.etapa_id || null,
  fecha_inicio: valores.fecha_inicio || null,  // nuevo
  fecha_fin: valores.fecha_fin || null          // nuevo
}
```

### Decisiones UX relevantes

- Los campos son `Opcional` — se indica con texto helper debajo del campo Fecha inicio
- El error de validación (fecha_fin < fecha_inicio) solo aparece bajo el campo `Fecha fin`, que es el campo que falla según la regla
- El modo `ver` hace los inputs `readOnly` — consistente con todos los demás campos del sistema
- Se usó `type="date"` nativo — el mismo patrón que usa Entregas (no se inventó un componente nuevo)
- La grilla de 2 columnas (`md:grid-cols-2`) es el patrón estándar del proyecto para pares de campos relacionados

---

## 7. Cambios en persistencia / repositorios

**No se modificaron los repositorios.** Los repositorios de Objetivo e Iniciativa usan el patrón:

```typescript
async crear(entrada: ObjetivoEntrada) {
  const { data, error } = await clienteSupabase
    .from('objetivos')
    .insert(entrada)    // ← spread completo del entrada
    .select('*')
    .single()
  return data as Objetivo
}
```

Como `ObjetivoEntrada = z.infer<typeof objetivoSchema>`, al extender el schema, el tipo `ObjetivoEntrada` incluye automáticamente `fecha_inicio` y `fecha_fin`. El `insert(entrada)` propagará los nuevos campos a Supabase sin cambio adicional.

Lo mismo aplica para el `update(entrada)` de edición.

**Cómo se garantizó compatibilidad:**
- Campos nullables en DB: Supabase acepta `null` sin restricción
- Normalización `|| null` en el form submit: garantiza que el string vacío `""` de un `input[type=date]` limpiado nunca llega a Supabase
- Registros existentes sin fechas: al listarlos, Supabase devuelve `null` para las nuevas columnas → el tipo `string | null | undefined` los acepta correctamente

---

## 8. Visualización en tablas y CSV

### Tabla Objetivos

Se agregó columna **"Período"** entre "Prioridad" y "Vínculo estratégico":

```tsx
<td className="px-3 py-2">
  {objetivo.fecha_inicio ? (
    <p className="text-xs">
      {formatearFechaCorta(objetivo.fecha_inicio)}
      {objetivo.fecha_fin ? ` — ${formatearFechaCorta(objetivo.fecha_fin)}` : ''}
    </p>
  ) : (
    <p className="text-xs text-slate-400 dark:text-slate-600">Sin período</p>
  )}
</td>
```

Muestra: `15 ene 2025 — 30 jun 2025` si ambas fechas existen, `15 ene 2025` si solo hay inicio, o `Sin período` si ninguna está cargada.

### Tabla Iniciativas

Se enriquece la celda "Planificación" (que ya mostraba ventana y etapa) con las fechas directas si existen:

```tsx
{iniciativa.fecha_inicio ? (
  <p className="text-xs text-slate-500 dark:text-slate-400">
    {formatearFechaCorta(iniciativa.fecha_inicio)}
    {iniciativa.fecha_fin ? ` — ${formatearFechaCorta(iniciativa.fecha_fin)}` : ''}
  </p>
) : null}
```

Se eligió este enfoque (sin columna nueva) porque la tabla de iniciativas ya es la más densa del módulo (6 columnas). Agregar una séptima columna la haría demasiado ancha en pantallas medianas.

### CSV — Objetivos

Se agregaron columnas **"Fecha inicio"** y **"Fecha fin"** antes de "Vínculos KR". Usan `formatearFechaCorta` — mismo formateador del sistema.

### CSV — Iniciativas

Se agregaron columnas **"Fecha inicio"** y **"Fecha fin"** después de "Etapa" y antes de "RICE".

---

## 9. Warnings suaves y reglas diferidas

### Aplicadas en Fase 1

| Regla | Implementación |
|---|---|
| `fecha_fin >= fecha_inicio` en Objetivo | Error Zod en campo `fecha_fin` cuando ambas presentes e invertidas |
| `fecha_fin >= fecha_inicio` en Iniciativa | Error Zod en campo `fecha_fin` cuando ambas presentes e invertidas |

Estas son reglas **bloqueantes en el formulario** pero **solo aplican cuando ambas fechas están presentes**. Una fecha sola (solo inicio, sin fin) es perfectamente válida.

### No aplicadas — diferidas a Fase 2

| Regla | Razón del diferimiento |
|---|---|
| Contención: iniciativa dentro de objetivo | Requiere cargar y comparar fechas del objetivo padre en tiempo real en el formulario. El formulario de iniciativas ya es el más complejo (RICE + 4 FKs + 9 campos). Añadir esta lógica sin rediseñar el modal sería disruptivo. |
| Contención: entrega dentro de iniciativa | Mismo caso. El formulario de entregas tampoco tiene la información del rango de su iniciativa cargada. |
| `fecha_completado >= fecha_objetivo` en Entrega | El campo `fecha_completado` no es editable directamente en el formulario. Agregar la regla bloquearía la edición de registros con inconsistencia histórica sin que el usuario pueda resolverla. |
| Warning visual no bloqueante en formulario | Podría implementarse con `watch()` + lógica de alerta inline. Es técnicamente posible pero satura visualmente el form. Diferido a Fase 2 cuando se defina el diseño de warnings del sistema. |

---

## 10. Verificaciones de seguridad

### TypeScript typecheck

```
npx tsc --noEmit
→ Sin salida = cero errores
```

### ESLint

```
npx eslint [archivos modificados]
→ Sin salida = cero warnings ni errores
```

### Build de producción

```
npx vite build
→ ✓ 287 modules transformed
→ ✓ built in 5.43s
→ Sin errores de compilación
```

El warning de chunk size (`1,379 kB`) es **preexistente** y no relacionado con este cambio.

### Revisión de imports

- `formatearFechaCorta` importado desde `@/compartido/utilidades/formatoPortal` en ambas páginas de formulario — import necesario, sin duplicados
- No se crearon nuevas dependencias
- No se dejaron imports sin usar

### Cronograma — confirmación de no ruptura

`PaginaCronogramaRoadmap.tsx` no fue modificado. El único punto de contacto potencial era la creación del objeto literal sintético `FILA_SIN_OBJETIVO`:

```typescript
base.push({
  id: FILA_SIN_OBJETIVO,
  nombre: 'Sin objetivo asignado',
  descripcion: '',
  estado: 'pendiente',
  prioridad: 'media',
  created_at: '',
  updated_at: ''
})
```

Al definir los nuevos campos como `fecha_inicio?: string | null` (opcionales con `?`), este objeto literal sigue siendo válido TypeScript. El typecheck confirmó cero errores.

---

## 11. Riesgos residuales

### Riesgo de despliegue — orden de operaciones

**Descripción:** Si el frontend se despliega antes de ejecutar la migración SQL en Supabase, los repositorios intentarán hacer `INSERT/UPDATE` con campos `fecha_inicio` y `fecha_fin` que no existen en la base de datos. Supabase devolvería un error de columna desconocida.

**Mitigación:** Ejecutar la migración SQL (`scripts/migracion_fase1_temporalidad_roadmap.sql`) en Supabase **antes** del deploy del frontend. El orden correcto es: 1) Migración DB → 2) Deploy frontend.

**Severidad si se ignora:** Media. Solo afecta la creación y edición de objetivos e iniciativas. El listado y el cronograma seguirían funcionando.

### Riesgo de adopción gradual — cronograma temporalmente más vacío

**Descripción:** En la próxima Fase 2, cuando se actualice el cronograma para usar `fecha_inicio`/`fecha_fin` propias de Objetivo e Iniciativa, los registros que aún no tengan fechas cargadas perderán sus barras visuales (ya no se calculará el agregado de hijos como fallback para ellos, según la lógica que se implemente).

**Mitigación:** Este riesgo es **de Fase 2, no de Fase 1**. En Fase 1 el cronograma es intocable y su comportamiento es idéntico al actual. Antes de Fase 2, se recomienda un período de al menos 2-4 semanas para que los usuarios completen fechas en sus registros.

### Riesgo menor — `fecha_fin` sin `fecha_inicio`

**Descripción:** El schema actual permite `fecha_fin` sin `fecha_inicio`. No hay regla que obligue a tener inicio si hay fin.

**Evaluación:** Aceptable para Fase 1. Es un escenario poco probable y no rompe nada. Si se quiere endurecer, se puede añadir en Fase 4 junto con el resto de validaciones.

---

## 12. Recomendación para siguiente paso

### Fase 2 — Cuando conviene iniciarla

Después de al menos **2-4 semanas** de uso productivo de Fase 1, cuando los usuarios existentes hayan tenido oportunidad de completar fechas en sus objetivos e iniciativas.

### Qué incluirá Fase 2

1. **Actualizar `PaginaCronogramaRoadmap.tsx`** para que:
   - La barra del Objetivo use `fecha_inicio`/`fecha_fin` propias si existen
   - La barra de la Iniciativa use `fecha_inicio`/`fecha_fin` directas con fallback a ventana
   - El selector de años incluya años de fechas de Objetivo e Iniciativa

2. **Advertencias suaves en formularios** (no bloqueantes):
   - Iniciativa: avisar si sus fechas superan las del objetivo padre
   - Entrega: avisar si sus fechas superan las de la iniciativa padre

3. **Validación cruzada de Entrega** (fecha_completado >= fecha_objetivo):
   - Solo en modo `crear`
   - En modo `editar`: tolerar si los valores vienen del reset inicial (no editados por el usuario)

### Qué no conviene hacer aún en Fase 2

- Hacer obligatorios los campos de fecha en Objetivo o Iniciativa
- Aplicar reglas de contención como errores bloqueantes en la API/backend
- Forzar backfill de datos históricos

---

*Implementación completada el 2026-03-16. Typecheck: ✓ | Lint: ✓ | Build: ✓ | Cronograma: sin cambios | Retrocompatibilidad: total.*
