# IMPLEMENTACIÓN — Fase 12: Cierre de Objetivos Roadmap
**Fecha:** 2026-03-15
**Alcance:** 1 archivo — `PaginaObjetivosRoadmap.tsx`
**Rama:** pm-construccion

---

## 1. Qué se investigó

### Archivo objetivo

`src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx` — 387 líneas.

**Estado antes de la intervención:**

| Aspecto | Estado |
|---|---|
| Filtros | 3 — `busqueda`, `filtroEstado`, `filtroPrioridad` (todos `useState` puro) |
| URL persistence | ❌ Ninguna |
| Paginación | ❌ Ninguna — renderizaba todos los `objetivosFiltrados` directo |
| CSV | ✅ Exporta `objetivosFiltrados` (lista filtrada completa) |
| Modales crear/editar/ver | ✅ Funcionando |
| Dark mode | ✅ Sin problemas |

### Patrón de referencia verificado

Se leyó `PaginaEntregasRoadmap.tsx` (mismo módulo, ya resuelto). Patrón confirmado:
- `useSearchParams` inicializa los filtros con `searchParams.get('param') ?? 'default'`
- `paginaInicial` / `tamanoInicial` desde URL, validados antes de pasarlos a `usePaginacion`
- `usePaginacion({ items: listaFiltrada, paginaInicial, tamanoInicial })`
- `useEffect` sincroniza todos los filtros activos a URL con `{ replace: true }` (omite valores default para mantener URL limpia)
- Tabla itera `paginacion.itemsPaginados`
- `<PaginacionTabla>` inmediatamente después del `</EstadoVista>`
- CSV sigue exportando `listaFiltrada` completa (no solo la página visible)

### Corte mínimo

**1 archivo.** No hay dependencias que requieran tocar casos de uso, repositorios, dominio ni nada más.

---

## 2. Qué se corrigió exactamente

### Imports añadidos

```typescript
import { useSearchParams } from 'react-router-dom'
import { PaginacionTabla } from '@/compartido/ui/PaginacionTabla'
import { usePaginacion } from '@/compartido/utilidades/usePaginacion'
```

### Inicialización desde URL

```typescript
// Antes:
const [busqueda, setBusqueda] = useState('')
const [filtroEstado, setFiltroEstado] = useState<'todos' | ...>('todos')
const [filtroPrioridad, setFiltroPrioridad] = useState<'todas' | ...>('todas')

// Después:
const [searchParams, setSearchParams] = useSearchParams()
const paginaInicial = Number(searchParams.get('pagina') ?? '1')
const tamanoInicial = Number(searchParams.get('tamano') ?? '10')
// ...
const [busqueda, setBusqueda] = useState(searchParams.get('q') ?? '')
const [filtroEstado, setFiltroEstado] = useState<'todos' | ...>(
  (searchParams.get('estado') as ...) ?? 'todos'
)
const [filtroPrioridad, setFiltroPrioridad] = useState<'todas' | ...>(
  (searchParams.get('prioridad') as ...) ?? 'todas'
)
```

### Paginación

```typescript
const paginacion = usePaginacion({
  items: objetivosFiltrados,
  paginaInicial: Number.isFinite(paginaInicial) && paginaInicial > 0 ? paginaInicial : 1,
  tamanoInicial: [10, 25, 50].includes(tamanoInicial) ? tamanoInicial : 10
})
```

### Sincronización URL

```typescript
useEffect(() => {
  const parametros = new URLSearchParams()
  if (busqueda) parametros.set('q', busqueda)
  if (filtroEstado !== 'todos') parametros.set('estado', filtroEstado)
  if (filtroPrioridad !== 'todas') parametros.set('prioridad', filtroPrioridad)
  if (paginacion.paginaActual > 1) parametros.set('pagina', String(paginacion.paginaActual))
  if (paginacion.tamanoPagina !== 10) parametros.set('tamano', String(paginacion.tamanoPagina))
  setSearchParams(parametros, { replace: true })
}, [busqueda, filtroEstado, filtroPrioridad, paginacion.paginaActual, paginacion.tamanoPagina, setSearchParams])
```

### Tabla paginada

```typescript
// Antes:
{objetivosFiltrados.map((objetivo) => (

// Después:
{paginacion.itemsPaginados.map((objetivo) => (
```

### Componente de paginación

```tsx
<PaginacionTabla
  paginaActual={paginacion.paginaActual}
  totalPaginas={paginacion.totalPaginas}
  totalItems={paginacion.totalItems}
  desde={paginacion.desde}
  hasta={paginacion.hasta}
  tamanoPagina={paginacion.tamanoPagina}
  alCambiarTamanoPagina={paginacion.setTamanoPagina}
  alCambiarPagina={paginacion.setPaginaActual}
/>
```

---

## 3. Archivos tocados

| Archivo | Tipo de cambio |
|---|---|
| `src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx` | Añadidos: `useSearchParams`, `usePaginacion`, `PaginacionTabla`, URL sync |

**No se tocó:** ningún otro archivo del módulo Roadmap, ningún caso de uso, ningún repositorio, ningún esquema Zod, ningún modelo de dominio.

---

## 4. SQL

❌ No. Cero cambios en base de datos.

---

## 5. Validación técnica

| Check | Resultado |
|---|---|
| `npm run lint` | ✅ Sin errores ni advertencias |
| `npm run build` | ✅ Build exitoso (285 módulos) |
| TypeScript (`tsc -b`) | ✅ Sin errores de tipos |

> Warning de chunk size (`1,340 kB`) es preexistente e irrelevante.

---

## 6. Riesgo residual

| Caso | Estado |
|---|---|
| Filtros pill (Estado / Prioridad) cambian → URL se actualiza | ✅ El `useEffect` los persiste |
| Usuario carga URL con `?estado=activo&prioridad=alta` | ✅ `useState` se inicializa desde `searchParams.get(...)` |
| Paginación reacciona al cambio de filtros | ✅ `usePaginacion` auto-corrige página cuando el total de ítems filtrados disminuye |
| CSV exporta la lista completa filtrada, no solo la página visible | ✅ `exportarCsv(..., objetivosFiltrados)` — sin cambios |
| Modales crear/editar/ver | ✅ Sin tocar — comportamiento idéntico |
| Dark mode | ✅ Sin cambios en clases Tailwind |
| Filtros pill con botones inline (patrón distinto al select) | ✅ Preservados íntegros — la URL persistence funciona independientemente del widget de filtro usado |

**Riesgo residual: ninguno.**
