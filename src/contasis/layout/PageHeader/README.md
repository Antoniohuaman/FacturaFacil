# PageHeader y Toolbar - Componentes de Layout

Componentes reutilizables para estructura de páginas en Contasis.

## 📋 Filosofía de Diseño

### ✅ Lo que ChatGPT sugiere (y estamos de acuerdo):

> **📍 En el archivo de la página o del módulo:**
> - Define QUÉ botones hay
> - Define QUÉ filtros hay  
> - Define QUÉ acciones existen
> 
> **Esa página usa la toolbar/pageheader base y le pasa el contenido dentro.**
> 
> **La toolbar/pageheader NO importa el contenido. El contenido se le pasa.**

### Esto es **Composition Pattern**:
- ✅ **Componente base = Estructura + Estilos**
- ✅ **Página/Módulo = Define el contenido específico**
- ✅ **Máxima flexibilidad y reusabilidad**

---

## 🎯 PageHeader

### Responsabilidad
Encabezado superior de cada página con:
- Título o breadcrumb
- Acciones que afectan el layout (fullscreen, settings)

### Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `title` | `ReactNode` | - | **Requerido.** Título principal (string o elemento React) |
| `breadcrumb` | `ReactNode` | - | Navegación contextual opcional |
| `actions` | `ReactNode` | - | Botones que afectan el layout |
| `className` | `string` | `''` | Clase CSS adicional |

### Medidas fijas
- **Padding horizontal:** `px-6` (24px)
- **Altura:** `h-14` (56px)
- **Gap:** `gap-2` (8px)

### Ejemplos

#### Título simple
```tsx
<PageHeader title="Comprobantes Electrónicos" />
```

#### Con acciones
```tsx
<PageHeader
  title="Clientes"
  actions={
    <>
      <Button iconOnly icon={<Maximize2 />} />
      <Button iconOnly icon={<Settings />} />
    </>
  }
/>
```

#### Con breadcrumb
```tsx
<PageHeader
  breadcrumb={
    <div className="flex items-center gap-2">
      <button onClick={handleBack}>Comprobantes</button>
      <span>/</span>
    </div>
  }
  title="Nueva Emisión - Boleta"
  actions={<Button iconOnly icon={<Maximize2 />} />}
/>
```

---

## 🛠️ Toolbar

### Responsabilidad
Barra de herramientas con:
- Lado izquierdo: Filtros, búsqueda, controles
- Lado derecho: Acciones primarias (crear, exportar)

### Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `leftContent` | `ReactNode` | - | Contenido izquierdo (filtros, search) |
| `rightContent` | `ReactNode` | - | Contenido derecho (acciones primarias) |
| `sticky` | `boolean` | `true` | Si se pega al top al hacer scroll |
| `className` | `string` | `''` | Clase CSS adicional |

### Medidas fijas
- **Padding horizontal:** `px-6` (24px)
- **Altura:** `h-16` (64px)
- **Gap entre lados:** `gap-4` (16px)
- **Gap entre elementos:** `gap-2` (8px)

### Ejemplos

#### Filtros + Acciones
```tsx
<Toolbar
  leftContent={
    <>
      <ToggleButton icon={<Filter />} label="Filtrar" iconOnly />
      <Button icon={<RefreshCw />} variant="secondary" iconOnly />
    </>
  }
  rightContent={
    <>
      <Button variant="secondary">Nueva factura</Button>
      <Button variant="primary">Nueva boleta</Button>
    </>
  }
/>
```

#### Búsqueda + Exportar
```tsx
<Toolbar
  leftContent={
    <input 
      type="text" 
      placeholder="Buscar clientes..." 
      className="px-3 py-2 border rounded-lg"
    />
  }
  rightContent={
    <>
      <Button variant="secondary" icon={<Download />}>Exportar</Button>
      <Button variant="primary">Nuevo cliente</Button>
    </>
  }
/>
```

---

## 📦 Estructura típica de página

```tsx
import { PageHeader, Toolbar, Button, ToggleButton } from '@contasis/ui';
import { Filter, Maximize2, Settings } from 'lucide-react';

const MiModuloPage = () => {
  return (
    <div className="flex flex-col h-full">
      {/* 1. PageHeader */}
      <PageHeader
        title="Mi Módulo"
        actions={
          <>
            <Button iconOnly icon={<Maximize2 />} variant="secondary" />
            <Button iconOnly icon={<Settings />} variant="secondary" />
          </>
        }
      />

      {/* 2. Toolbar (opcional) */}
      <Toolbar
        leftContent={
          <ToggleButton icon={<Filter />} label="Filtrar" iconOnly />
        }
        rightContent={
          <Button variant="primary">Nuevo registro</Button>
        }
      />

      {/* 3. Contenido */}
      <div className="flex-1 p-6">
        {/* Tu contenido aquí */}
      </div>
    </div>
  );
};
```

---

## 🎨 Variaciones por módulo

| Módulo | PageHeader | Toolbar Left | Toolbar Right |
|--------|------------|--------------|---------------|
| **Comprobantes** | Título + Layout actions | Filtros + Refresh + Columnas | Nueva Factura + Nueva Boleta |
| **Nueva Emisión** | Breadcrumb + Título | *No se muestra* | *No se muestra* |
| **Clientes** | Título + Layout actions | Filtros + Búsqueda | Exportar + Nuevo Cliente |
| **Punto de Venta** | Título + Layout actions | Filtros + Búsqueda amplia | Favoritos + Grid/List toggle |
| **Productos** | Título + Layout actions | Filtros + Refresh | Nuevo Producto |
| **Reportes** | Título + Layout actions | Filtros de fecha + Tipo | Exportar |

---

## ✅ Ventajas de este patrón

1. **Consistencia visual** - Todos los módulos usan la misma estructura base
2. **Mantenibilidad** - Cambios en el contenedor afectan a todos
3. **Flexibilidad** - Cada página define su contenido específico
4. **Separación de responsabilidades** - El layout no conoce el negocio
5. **Reutilización** - Mismo componente para múltiples casos de uso
6. **Testeable** - Fácil de testear componente base y contenido por separado

---

## 📚 Ver ejemplos completos

Revisa el archivo `USAGE_EXAMPLES.tsx` para ver:
- Comprobantes (filtros + múltiples acciones)
- Clientes (búsqueda + exportar)
- Punto de Venta (búsqueda amplia + favoritos + toggle vista)
- Nueva Emisión (con breadcrumb, sin toolbar)
- Reportes (solo consulta, sin acciones primarias)

---

## 🚀 Uso en producción (Proyecto Senciyo)

```bash
# 1. Importar desde @contasis/ui
import { PageHeader, Toolbar } from '@contasis/ui';

# 2. Usar en tus páginas
<PageHeader title="..." actions={...} />
<Toolbar leftContent={...} rightContent={...} />

# 3. El contenido lo defines en la página, no en el componente
```

**Recuerda:** El componente solo provee la estructura. TÚ defines qué va adentro.
