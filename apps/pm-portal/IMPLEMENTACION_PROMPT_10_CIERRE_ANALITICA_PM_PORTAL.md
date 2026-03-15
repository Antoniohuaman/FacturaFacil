# IMPLEMENTACIÓN — Fase 11: Cierre del módulo Analítica
**Fecha:** 2026-03-15
**Alcance:** 3 archivos — módulo `/analitica`
**Rama:** pm-construccion

---

## 1. Objetivo

Alinear las tres páginas del módulo Analítica con el estándar del resto del portal:
- `PaginaKpis.tsx` — añadir paginación y URL persistence (ya tenía todos los demás filtros)
- `PaginaHealthScores.tsx` — añadir búsqueda de texto libre, paginación y URL persistence
- `PaginaPortafolio.tsx` — añadir URL persistence y reemplazar `filtroEstado` de `<input>` libre a `<select>` semántico

---

## 2. Cambios por archivo

### `PaginaKpis.tsx`

**Antes:** 7 filtros con `useState`, sin URL persistence, sin paginación — renderizaba todos los `kpisFiltrados` en tabla.

**Después:**
- `useSearchParams` — inicializa `busqueda`, `filtroCategoria`, `filtroEstado`, `filtroModulo`, `filtroOwner`, `fechaDesde`, `fechaHasta` desde URL params `q`, `categoria`, `estado`, `modulo`, `owner`, `desde`, `hasta`
- `usePaginacion({ items: kpisFiltrados, paginaInicial, tamanoInicial })` — paginación estándar con tamaños 10/25/50
- `useEffect` que sincroniza todos los filtros + `pagina`/`tamano` a la URL con `{ replace: true }`
- La tabla itera `paginacion.itemsPaginados` (no `kpisFiltrados`)
- `<PaginacionTabla>` debajo del `EstadoVista`
- CSV sigue exportando `kpisFiltrados` (lista filtrada completa, no solo la página)

**Params URL:** `q`, `categoria`, `estado`, `modulo`, `owner`, `desde`, `hasta`, `pagina`, `tamano`

---

### `PaginaHealthScores.tsx`

**Antes:** 4 filtros con `useState` (sin búsqueda de texto), sin URL persistence, sin paginación — renderizaba todas las `scoresFiltrados` en grid de tarjetas.

**Después:**
- `useSearchParams` — inicializa `busqueda`, `filtroAmbito`, `filtroEstado`, `filtroModulo`, `filtroOwner` desde URL
- `busqueda` — campo `<input>` añadido como primer elemento del panel de filtros, filtra por `codigo`, `nombre` y `descripcion`
- `usePaginacion({ items: scoresFiltrados, paginaInicial, tamanoInicial })` — paginación estándar
- `useEffect` de sincronización URL
- El grid itera `paginacion.itemsPaginados`
- `<PaginacionTabla>` debajo del `EstadoVista`
- CSV sigue exportando `scoresFiltrados`

**Params URL:** `q`, `ambito`, `estado`, `modulo`, `owner`, `pagina`, `tamano`

---

### `PaginaPortafolio.tsx`

**Antes:** 7 filtros con `useState`, sin URL persistence. `filtroEstado` era un `<input type="text">` libre que filtraba con `fila.estados.includes(filtroEstado)` — array mezclado de estados de todas las entidades de todos los módulos, inútil como selector.

**Después:**
- `useSearchParams` — inicializa los 7 filtros desde URL
- `useEffect` de sincronización URL
- `filtroEstado` reemplazado por `<select>` con opciones semánticas: `todos`, `Saludable`, `Atención`, `Riesgo`, `Sin dato`
- Lógica de filtro cambiada de `fila.estados.includes(filtroEstado)` a `fila.healthEstado === filtroEstado` — los valores `healthEstado` son exactamente estas 4 cadenas derivadas en el `useMemo` de `filas`
- Sin paginación — el portafolio es siempre 5 filas fijas (no es un CRUD list)

**Params URL:** `modulo`, `estado`, `owner`, `ventana`, `etapa`, `desde`, `hasta`

---

## 3. Patrón aplicado (consistente con el resto del portal)

```typescript
// 1. Leer params iniciales
const [searchParams, setSearchParams] = useSearchParams()
const paginaInicial = Number(searchParams.get('pagina') ?? '1')
const tamanoInicial = Number(searchParams.get('tamano') ?? '10')

// 2. Inicializar filtros desde URL
const [busqueda, setBusqueda] = useState(searchParams.get('q') ?? '')

// 3. Derivar lista filtrada
const itemsFiltrados = useMemo(() => { ... }, [...filtros, items])

// 4. Paginar
const paginacion = usePaginacion({
  items: itemsFiltrados,
  paginaInicial: ...,
  tamanoInicial: ...
})

// 5. Sincronizar URL
useEffect(() => {
  const parametros = new URLSearchParams()
  if (busqueda) parametros.set('q', busqueda)
  // ... resto de filtros
  setSearchParams(parametros, { replace: true })
}, [...filtros, paginacion.paginaActual, paginacion.tamanoPagina, setSearchParams])

// 6. Renderizar paginado
{paginacion.itemsPaginados.map(...)}

// 7. Componente de paginación
<PaginacionTabla ... />

// 8. CSV desde lista completa filtrada
exportarCsv(..., itemsFiltrados)
```

---

## 4. Archivos tocados

| Archivo | Tipo de cambio |
|---|---|
| `src/presentacion/paginas/analitica/kpis/PaginaKpis.tsx` | Añadidos: `useSearchParams`, `usePaginacion`, `PaginacionTabla`, URL sync |
| `src/presentacion/paginas/analitica/health-scores/PaginaHealthScores.tsx` | Añadidos: `busqueda` field, `useSearchParams`, `usePaginacion`, `PaginacionTabla`, URL sync |
| `src/presentacion/paginas/analitica/portafolio/PaginaPortafolio.tsx` | Añadidos: `useSearchParams`, URL sync; reemplazado `<input>` libre por `<select>` semántico; corregida lógica de filtro de estado |

**No se tocó:** ningún otro módulo, ningún caso de uso, ningún repositorio, ningún esquema Zod, ningún SQL.

---

## 5. SQL

❌ No. Cero cambios en base de datos.

---

## 6. Validación técnica

| Check | Resultado |
|---|---|
| `npm run lint` | ✅ Sin errores ni advertencias |
| `npm run build` | ✅ Build exitoso (285 módulos) |
| TypeScript (`tsc -b`) | ✅ Sin errores de tipos |

> Warning de chunk size (`1,339 kB`) es preexistente e irrelevante.

---

## 7. Por qué no se añadió paginación a Portafolio

El portafolio es una vista de lectura consolidada con exactamente 5 filas fijas (Portafolio consolidado, Roadmap, Lanzamientos, Operación, Auditorías). No es un CRUD list — no hay registros que paginar. Añadir `usePaginacion` sería over-engineering sin valor funcional.
