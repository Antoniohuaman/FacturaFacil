# Guía de Rediseño del Modal Nuevo Producto / Servicio

## Estado Actual
Se han implementado los cambios base en el archivo `ProductModal.tsx`:
- ✅ Imports de lucide-react actualizados con todos los íconos necesarios
- ✅ Tipo `ProductType` agregado
- ✅ Estados para `productType`, `lastValidUnit`, `isDescriptionExpanded`
- ✅ Función `getDefaultUnitForType` implementada
- ✅ Header actualizado con ícono Sliders (sin marco)
- ✅ Selector de tipo de producto (Pills Bien/Servicio) agregado
- ✅ useEffect para cambio automático de unidad según tipo

## Cambios Pendientes Requeridos

### 1. Estructura HTML del Formulario

El form actual es de una sola columna. Necesita reorganizarse a **dos columnas (6/6)** usando grid de 12 columnas.

**Estructura objetivo:**

```tsx
<form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5" style={{ maxHeight: 'calc(80vh - 140px)' }}>
  
  {/* Tipo de producto (Pills) - Ya implementado */}
  <div className="mb-5">...</div>

  {/* Grid 12 - Dos columnas */}
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
    
    {/* COLUMNA IZQUIERDA (lg:col-span-6) */}
    <div className="lg:col-span-6 space-y-5">
      {/* 1. Nombre */}
      {/* 2. Alias del producto */}
      {/* 3. Código */}
      {/* 4. Código de barras */}
      {/* 5. Categoría */}
      {/* 6. Marca */}
      {/* 7. Modelo */}
      {/* 8. Precio de venta */}
      {/* 9. Impuesto */}
      {/* 10. Unidad */}
      {/* 11. Establecimientos */}
      {/* 12. Descripción (con expandir/contraer) */}
      {/* 13. Peso (KGM) */}
    </div>

    {/* COLUMNA DERECHA (lg:col-span-6) */}
    <div className="lg:col-span-6 space-y-5">
      {/* 1. Imagen (dropzone 96×96) */}
      {/* 2. Precio inicial de compra */}
      {/* 3. Porcentaje de ganancia */}
      {/* 4. Descuento del producto */}
      {/* 5. Código de fábrica */}
      {/* 6. Código SUNAT */}
      {/* 7. Tipo de existencia */}
    </div>

  </div>
</form>
```

### 2. Iconografía por Campo (Leading Icons)

Cada input/select debe tener un ícono a la izquierda (14px / 3.5rem):

```tsx
// Ejemplo para Nombre:
<div className="relative">
  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
  <input
    className="w-full h-10 pl-10 pr-3 rounded-md border ..."
    ...
  />
</div>
```

**Mapeo de íconos:**
- Nombre: `<Tag />`
- Alias: `<Quote />`
- Código: `<Barcode />`
- Código de barras: `<ScanLine />`
- Categoría: `<FolderClosed />`
- Marca: `<Badge />`
- Modelo: `<Box />`
- Precio de venta: `<Banknote />` + prefix "S/"
- Impuesto: `<Percent />`
- Unidad: `<Ruler />`
- Establecimientos: `<Building2 />`
- Descripción: `<FileText />`
- Peso: `<Weight />` + suffix "KG"
- Imagen: `<ImageUp />`
- Precio compra: `<Wallet />` + prefix "S/"
- % ganancia: `<TrendingUp />` + suffix "%"
- Descuento: `<BadgePercent />` + suffix "%"
- Código fábrica: `<Wrench />`
- Código SUNAT: `<FileCode2 />`
- Tipo existencia: `<Boxes />`

### 3. Estilos y Densidad Compacta

**Tokens a aplicar:**
- **Inputs height:** `h-10` (40px)
- **Gap entre campos:** `gap-5` (20px)
- **Modal width:** `max-w-[1120px]`
- **Modal max-height:** `style={{ maxHeight: '80vh' }}`
- **Form scroll:** `style={{ maxHeight: 'calc(80vh - 140px)' }}`
- **Labels:** `text-xs font-semibold text-gray-700 mb-1.5`
- **Focus ring:** `focus:ring-2 focus:ring-blue-500`
- **Placeholders:** `placeholder-gray-400`

### 4. Campo Tipo de Existencia

Agregar en la columna derecha (después de Código SUNAT):

```tsx
<div>
  <label htmlFor="tipoExistencia" className="block text-xs font-semibold text-gray-700 mb-1.5">
    Tipo de existencia
  </label>
  <div className="relative">
    <Boxes className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
    <select
      id="tipoExistencia"
      value={formData.tipoExistencia}
      onChange={(e) => setFormData(prev => ({ ...prev, tipoExistencia: e.target.value as ProductFormData['tipoExistencia'] }))}
      className="w-full h-10 pl-10 pr-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="MERCADERIAS">Mercaderias</option>
      <option value="PRODUCTOS_TERMINADOS">ProductosTerminados</option>
      <option value="MATERIAS_PRIMAS">MateriasPrimas</option>
      <option value="ENVASES">Envases</option>
      <option value="MATERIALES_AUXILIARES">MaterialesAuxiliares</option>
      <option value="SUMINISTROS">Suministros</option>
      <option value="REPUESTOS">Repuestos</option>
      <option value="EMBALAJES">Embalajes</option>
      <option value="OTROS">Otros</option>
    </select>
  </div>
</div>
```

### 5. Descripción con Expandir/Contraer

```tsx
{isFieldVisible('descripcion') && (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <label htmlFor="descripcion" className="text-xs font-semibold text-gray-700">
        Descripción
        {isFieldRequired('descripcion') && <span className="text-red-500 ml-1">*</span>}
      </label>
      <button
        type="button"
        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
      >
        {isDescriptionExpanded ? 'Contraer' : 'Expandir'}
      </button>
    </div>
    <div className="relative">
      <FileText className="absolute left-3 top-3 w-3.5 h-3.5 text-gray-400" />
      <textarea
        id="descripcion"
        rows={isDescriptionExpanded ? 6 : 3}
        value={formData.descripcion}
        onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
        className="w-full pl-10 pr-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        placeholder="Descripción detallada del producto..."
      />
    </div>
    {errors.descripcion && <p className="text-red-600 text-xs mt-1">{errors.descripcion}</p>}
  </div>
)}
```

### 6. Footer Sticky

```tsx
<div className="sticky bottom-0 flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
  <button
    type="button"
    onClick={onClose}
    className="px-4 h-10 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
  >
    Cancelar
  </button>
  <button
    onClick={handleSubmit}
    disabled={loading}
    className="px-4 h-10 text-sm font-medium text-white border border-transparent rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    style={{ backgroundColor: '#1478D4' }}
  >
    {loading ? (
      <div className="flex items-center gap-2">
        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Guardando...
      </div>
    ) : (
      'Guardar'
    )}
  </button>
</div>
```

### 7. Responsive (≤1024px)

El grid ya tiene `grid-cols-1 lg:grid-cols-12`, lo que significa que en pantallas menores a 1024px automáticamente colapsa a 1 columna.

### 8. Fix de Tipo de Unidad

En `models/types.ts`, actualizar el tipo de `unidad` para incluir cualquier código SUNAT:

```typescript
unidad: string; // En lugar de: 'DOCENA' | 'UNIDAD' | 'KILOGRAMO' | 'LITRO' | 'METRO'
```

Esto permitirá usar 'NIU', 'ZZ', 'KGM', y cualquier otro código SUNAT dinámicamente.

## Orden de Implementación Recomendado

1. ✅ **Actualizar imports** (YA HECHO)
2. ✅ **Agregar tipos y estados** (YA HECHO)
3. ✅ **Actualizar header** (YA HECHO)
4. ✅ **Agregar selector de tipo** (YA HECHO)
5. **Reorganizar form a dos columnas** - PENDIENTE
6. **Agregar iconos a cada campo** - PENDIENTE
7. **Agregar campo Tipo de existencia** - PENDIENTE
8. **Implementar descripción expandible** - PENDIENTE
9. **Actualizar sticky footer** - PENDIENTE
10. **Fix tipo unidad en types.ts** - PENDIENTE
11. **Testing y QA** - PENDIENTE

## Testing Checklist

- [ ] Modal se abre centrado en viewport
- [ ] Width entre 1040-1120px
- [ ] Max-height 80vh con scroll interno
- [ ] Header y footer sticky funcionan correctamente
- [ ] Selector Bien/Servicio cambia unidad automáticamente
- [ ] Iconos visibles en todos los campos
- [ ] Altura de inputs es 40px consistente
- [ ] Gap entre campos es 20px (gap-5)
- [ ] Descripción expandir/contraer funciona sin cambiar alto del modal
- [ ] Tipo de existencia muestra las 9 opciones
- [ ] Responsive funciona en ≤1024px (1 columna)
- [ ] Crear y editar producto funciona sin regresiones
- [ ] Compilación sin errores (npm run build)
- [ ] No hay errores de tipos en TypeScript
- [ ] Establecimientos muestra solo asignados al editar
- [ ] Categoría "Crear categoría" funciona
- [ ] Imagen sube correctamente

## Notas Técnicas

- El archivo ProductModal.tsx tiene 1000+ líneas, por lo que es recomendable hacer cambios incrementales
- Mantener tests de regresión en cada cambio
- Verificar que el payload a `onSave` no cambie
- Los cambios son solo UI/UX, sin afectar lógica de negocio
- El backend debe soportar `tipoExistencia` en el DTO, si no, mantener solo en state sin romper

## Commit Message Sugerido

```
feat(catalogo): rediseño modal Nuevo producto/servicio (2 columnas, compact, icons, tipo existencia)

- Estructura de dos columnas (6/6) con grid-12
- Iconografía leading en todos los campos (lucide-react)
- Selector de tipo de producto (Bien/Servicio) con auto-selección de unidad
- Campo "Tipo de existencia" con 9 opciones
- Descripción expandible sin cambiar alto del modal
- Densidad compacta: inputs 40px, gap-5, width 1040-1120px
- Header con ícono Personalizar (sin marco)
- Footer sticky
- Responsive ≤1024px (colapsa a 1 columna)
- Modal centrado con max-h 80vh y scroll interno
```

---

**Autor:** GitHub Copilot
**Fecha:** 2025-01-09
**Versión:** 1.0
