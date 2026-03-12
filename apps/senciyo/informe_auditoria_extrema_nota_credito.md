# Informe de auditoría extrema — Nota de Crédito

> **Estado:** Solo lectura. Sin patches. Sin cambios de código.
> **Fecha de auditoría:** 2026-03-12
> **Auditor:** Claude Sonnet 4.6 — modo arquitecto/debugger extremo
> **Rama:** `feature/nota-credito`

---

## 1. Resumen ejecutivo

### Qué está fallando realmente

El flujo "Generar Nota de Crédito" desde la lista de comprobantes **abre el formulario de emisión con datos del comprobante anterior** en todos los intentos posteriores al primero. El cliente, los productos y los campos opcionales que el usuario ve corresponden a la NC anterior, no a la NC que el usuario acaba de solicitar.

En paralelo, en cualquier sesión donde los comprobantes del listado **no fueron emitidos en esa misma sesión de navegador**, los productos llegan vacíos porque la fila del contexto no los contiene.

### Severidad

| Defecto | Severidad | Frecuencia |
|---|---|---|
| Borrador contamina NC posterior | **Crítica** | 100% — ocurre en todo intento NC ≥ 2 |
| Ítems vacíos en comprobantes sin snapshot | **Alta** | 100% — todo comprobante que no se emitió en la sesión activa |
| `datosNotaCredito` desincronizado | **Media** | Varía según borrador guardado |
| `replaceState` no limpia React Router | **Media** | Latente — activo si ruta no remonta |
| `mixto` mapeado como `catalogo` en loader | **Baja** | Solo afecta ítems mixtos en otros flujos |

### Parte del flujo responsable principal

**`useBorradorEnProgreso`** es el responsable primario. No está desactivado durante el flujo NC y restaura el borrador de la NC anterior DESPUÉS de que `useDuplicateDataLoader` ya cargó los datos correctos de la NC actual.

### El defecto es estructural

No es un bug de una sola línea. Es una combinación de:
1. Un guard de exclusión incompleto (`isDuplicateFlow` no cubre `isNoteCreditFlow`)
2. Un orden de efectos en React que hace que la restauración del borrador sobrescriba la carga del loader
3. Un sistema de contexto en memoria sin TTL por sesión de NC individual

---

## 2. Flujo real de extremo a extremo

### Origen del comprobante

```
[Usuario emite Factura/Boleta desde EmisionTradicional]
     │
     ▼
useComprobanteActions.createComprobante()
     │
     ├─ Construye crearInstantaneaDocumentoComercial(...)    ← snapshot completo
     │
     └─ addComprobante({
           id, type, client, clientDoc, email, address,
           items, cartItems, productos,               ← arrays de CartItem
           instantaneaDocumentoComercial,             ← snapshot completo
           noteCreditData, creditTerms, totals, ...
        })
           │
           ▼
     ComprobantesListContext (useReducer en memoria)
```

**Desde POS:** el mismo `createComprobante` se llama con `source: 'pos'`. Los campos opcionales que POS no recolecta (orderCompra, guiaRemision, etc.) llegan `undefined` → se serializan como `null` en el snapshot.

### Lista consolidada

```
ComprobantesListContext.state.comprobantes[]
     │
     ├─ Inicia VACÍO: INITIAL_COMPROBANTES = []
     ├─ Solo recibe comprobantes emitidos EN ESTA SESIÓN via addComprobante()
     ├─ SET_COMPROBANTES solo se dispara al cambiar tenantId → resetea a vacío
     └─ NO HAY carga desde backend/localStorage en ninguna parte del código
```

### Snapshot canónico

```
ListaComprobantes.handleGenerateCreditNote(invoice: Comprobante)
     │
     ├─ convertirComprobanteListadoAInstantaneaDocumentoComercial(invoice)
     │       │
     │       ├─ seleccionarItemsDisponibles()  → busca items/cartItems/productos
     │       │       └─ Si todos vacíos: items = []
     │       │
     │       ├─ crearInstantaneaDocumentoComercial({...campos planos...})
     │       │
     │       └─ Si invoice.instantaneaDocumentoComercial existe:
     │              combinarInstantaneaDocumentoComercial(
     │                  invoice.instantaneaDocumentoComercial,   ← principal
     │                  instantaneaDesdeListado                  ← respaldo
     │              )
     │
     ├─ crearDatosNotaCreditoDesdeInstantanea(instantanea)
     │       └─ { codigo:'', motivo:'', documentoRelacionado: {serie, numero...} }
     │
     └─ navigate('/comprobantes/emision', {
           state: {
             noteCredit: {
               instantaneaDocumentoComercial,   ← snapshot construido arriba
               datosNotaCredito                 ← plantilla vacía con doc relacionado
             }
           }
        })
```

### Navegación

```
React Router navigate() → location.state.noteCredit = CargaReutilizacionDocumentoComercial
                         → location.key = nuevo UUID único por navegación
```

### Loader (useDuplicateDataLoader)

```
useEffect(deps: [location.key, location.state, ...handlers])
     │
     ├─ Lee location.state.noteCredit
     ├─ Guard: if (processedLocationKeyRef.current === location.key) return
     ├─ processedLocationKeyRef.current = location.key
     ├─ esCargaReutilizacionDocumentoComercial() → true
     ├─ extraerDatosRehidratacionDesdeInstantanea()
     │       └─ { cliente, items, modoDetalle, observaciones, formaPago, moneda, camposOpcionales }
     ├─ setClienteSeleccionadoGlobal(...)
     ├─ setCartItemsFromDraft(items) o addProductsFromSelector(items)
     ├─ setObservaciones / setNotaInterna / setFormaPago / changeCurrency
     ├─ setOptionalFields(camposOpcionales)
     └─ window.history.replaceState({}, document.title)   ← limpia solo browser history
```

### Restauración del borrador (PROBLEMA PRINCIPAL)

```
useBorradorEnProgreso.useEffect(() => restaurar(), [restaurar])
     │
     ├─ Declarado DESPUÉS del useDuplicateDataLoader en EmisionTradicional (línea 708 vs 405)
     ├─ Por orden de efectos React: corre DESPUÉS del loader
     ├─ restaurar() → leerBorradorEnProgreso(clave, version)
     │       └─ clave incluye tipoComprobante = 'nota_credito'  ← COMPARTIDA entre todas las NCs
     ├─ Si existe borrador (NC anterior): aplicarDesdeStorage(borrador.datos)
     │       ├─ setClienteSeleccionadoGlobal(nc1.clienteSeleccionadoGlobal)  ← SOBRESCRIBE
     │       ├─ setCartItemsFromDraft(nc1.cartItems)                         ← SOBRESCRIBE
     │       ├─ setObservaciones(nc1.observaciones)                          ← SOBRESCRIBE
     │       ├─ setOptionalFields(nc1.optionalFields)                        ← SOBRESCRIBE
     │       └─ ... todos los demás campos                                   ← SOBRESCRIBE
     └─ Resultado: formulario muestra datos de NC anterior, no de la actual
```

### Render final

```
EmisionTradicional
     ├─ datosNotaCredito: correcto (viene de useState init + useEffect en línea 348/350)
     │       Pero cliente + items + opcionales = contaminados del borrador anterior
     ├─ cartItemsForDocument = isNoteCreditFlow ? cartItems : itemsActivos
     │       = cartItems del borrador anterior (INCORRECTO para NC ≥ 2)
     └─ CompactDocumentForm / ProductsSection reciben datos contaminados
```

---

## 3. Hallazgos por archivo

### 3.1 `hooks/useBorradorEnProgreso.ts`

**Ruta:** `src/shared/borradores/useBorradorEnProgreso.ts`

**Responsabilidad:** Persiste y restaura el estado del formulario entre sesiones/navegaciones.

**Qué hace:**
- En `useEffect(() => restaurar(), [restaurar])` (línea 114): restaura el borrador guardado en `sessionStorage`/`localStorage` al montar el componente.
- La función `restaurar()` (líneas 88-99) lee el borrador por clave, y si existe, llama `aplicarDesdeStorage(borrador.datos)` incondicionalmente.
- La clave incluye `tipoComprobante`, por lo tanto la clave para NC es `..._nota_credito_...` y es COMPARTIDA por todas las NCs de la misma empresa/establecimiento.
- Al desmontar (cleanup del tercer `useEffect`, líneas 220-261), guarda el estado actual como borrador, incluyendo los ítems del carrito.

**Qué no hace:**
- No verifica si el componente montó por una navegación nueva con `location.state` (no hay coordinación con `useDuplicateDataLoader`).
- No tiene conocimiento de que `isNoteCreditFlow = true` implica que los datos deben venir de `location.state`, no del borrador.
- No limpia el borrador bajo la clave `nota_credito` después de que el loader carga datos nuevos.

**Evidencia concreta:**
```typescript
// useBorradorEnProgreso.ts línea 88-99
const restaurar = useCallback(() => {
  if (!habilitado) return;
  if (restauradasPorClaveRef.current.has(clave)) return;  // guard por instancia
  const borrador = leerBorradorEnProgreso<TBorrador>(clave, version);
  if (!borrador) return;
  omitirGuardadoRef.current = true;
  aplicarDesdeStorage(borrador.datos);  // ← SOBRESCRIBE sin condiciones
  restauradasPorClaveRef.current.add(clave);
}, [aplicarDesdeStorage, clave, habilitado, onRestaurado, version]);

// línea 114-116
useEffect(() => {
  restaurar();
}, [restaurar]);  // ← corre en cada mount
```

**Impacto en el bug:** ES EL RESPONSABLE PRINCIPAL del síntoma "solo el primero funciona".

---

### 3.2 `pages/EmisionTradicional.tsx`

**Ruta:** `src/pages/Private/features/comprobantes-electronicos/pages/EmisionTradicional.tsx`

**Responsabilidad:** Formulario de emisión para Emisión Tradicional y Nota de Crédito.

**Hallazgo A — Guard de borrador incompleto (líneas 677-684):**
```typescript
const borradorHabilitado = Boolean(
  session?.currentCompanyId &&
  establecimientoIdBorrador &&
  tipoFromQueryResolved &&
  !isDuplicateFlow,    // ← solo excluye duplicación/conversión, NO isNoteCreditFlow
);
```
`isDuplicateFlow` se define como:
```typescript
const isDuplicateFlow = useMemo(() => {
  const state = location.state as any;
  return Boolean(state?.duplicate || (state?.fromConversion === true && state?.conversionData));
}, [location.state]);
```
El estado `noteCredit` NO activa `isDuplicateFlow`. Por lo tanto `borradorHabilitado = true` durante el flujo NC. Este es el vector de entrada del bug.

**Hallazgo B — Orden de declaración de hooks (líneas 405 vs 708):**
```
línea 405:  useDuplicateDataLoader({...})    ← carga datos NC nueva
...
línea 708:  useBorradorEnProgreso({...})     ← restaura borrador NC anterior
```
React ejecuta los efectos en orden de declaración. El borrador se restaura DESPUÉS de que el loader cargó, sobrescribiendo los datos correctos.

**Hallazgo C — `datosNotaCredito` gestionado por dos caminos paralelos (líneas 348 y 350-356):**
```typescript
// Inicialización de estado (línea 348)
const [datosNotaCredito, setDatosNotaCredito] = useState<DatosNotaCredito | null>(
  noteCreditState?.datosNotaCredito ?? null   // ← correcto en mount
);

// Effect reactivo (líneas 350-356)
useEffect(() => {
  if (!noteCreditState?.datosNotaCredito) return;
  setDatosNotaCredito(noteCreditState.datosNotaCredito);
}, [noteCreditState]);   // ← también correcto
```
Sin embargo, `useDuplicateDataLoader` NO recibe `setDatosNotaCredito` como handler (líneas 405-416). El loader gestiona cliente + ítems + campos opcionales, pero `datosNotaCredito` lo gestiona EmisionTradicional independientemente. Si el borrador sobreescribe cliente/ítems, `datosNotaCredito` queda desincronizado: el documento relacionado es correcto pero los datos del cuerpo corresponden al comprobante anterior.

**Hallazgo D — `baseTotals` usa `itemsActivos` en vez de `cartItemsForDocument` (línea 469-479):**
```typescript
const baseTotals = useMemo(
  () => calculateCurrencyAwareTotals({
    items: itemsActivos,    // ← usa el modo filtrado, no todos los cartItems
    ...
  }),
  [baseCurrency.code, itemsActivos, ...],
);
```
Pero `cartItemsForDocument` (línea 263-265) usa `cartItems` completos para NC. Esto significa que los totales que se muestran en el formulario están calculados sobre `itemsActivos` (filtrado por modo catálogo/libre), mientras que el formulario renderiza todos los `cartItems`. Para NC con ítems mixtos esto producirá una discrepancia entre lo mostrado en productos y los totales.

**Hallazgo E — `limpiarBorradorEnProgreso` no se llama tras emisión exitosa de NC:**
Tras la emisión exitosa de un comprobante, `limpiarBorradorEnProgreso()` es accesible desde el hook, pero no hay evidencia de que se invoque específicamente para la clave `nota_credito` después de una NC emitida con éxito. El borrador queda con el estado de la NC recién emitida y contamina la siguiente.

---

### 3.3 `hooks/useDuplicateDataLoader.tsx`

**Ruta:** `src/pages/Private/features/comprobantes-electronicos/hooks/useDuplicateDataLoader.tsx`

**Responsabilidad:** Detectar y aplicar datos de duplicación, conversión o NC desde `location.state`.

**Hallazgo A — Guard `processedLocationKeyRef` solo funciona por instancia (líneas 85-87):**
```typescript
if (processedLocationKeyRef.current === location.key) return;
processedLocationKeyRef.current = location.key;
```
Este guard previene que el MISMO `location.key` se procese dos veces dentro de la misma instancia montada. Es correcto para su propósito. Cuando `EmisionTradicional` remonta (nueva navegación), el ref se resetea a `null` y el nuevo `location.key` pasa el guard. El problema NO está aquí.

**Hallazgo B — `window.history.replaceState` no limpia React Router (línea 157):**
```typescript
window.history.replaceState({}, document.title);
```
React Router v6 mantiene `location.state` en su propio contexto interno (`LocationContext`). Llamar a `window.history.replaceState` modifica el estado de la entrada del browser history nativa, pero **no modifica el estado del router**. Tras esta llamada, `location.state` sigue teniendo los datos de NC en React Router. El guard `processedLocationKeyRef` es lo que realmente previene re-procesar. Si el componente remonta en la MISMA ruta con el mismo key (raro pero posible en ciertos setups de layout), el guard funcionaría por la lógica del ref, pero si el ref se pierde (remount limpio), `location.state` en React Router aún tendría los datos y el loader correría de nuevo, lo cual es el comportamiento DESEADO en ese caso.

**Hallazgo C — `modoDetalle = 'mixto'` mapeado como `'catalogo'` (línea 111):**
```typescript
setModoProductos(datosRehidratacion.modoDetalle === 'libre' ? 'libre' : 'catalogo');
// 'mixto' → 'catalogo'
```
Para NC, `cartItemsForDocument = cartItems` (todos), así que este mapping no provoca pérdida de ítems en NC. Pero en `ProductsSection`, el `modoProductosActual` controla qué tabla de edición se muestra. Con `modoProductos = 'catalogo'` pero ítems `tipoDetalle = 'libre'` presentes, la UI muestra solo la tabla de catálogo, ocultando visualmente los ítems libres (aunque estén en el carrito). Para el usuario parece que los ítems libres no se cargaron.

**Hallazgo D — `esCargaReutilizacionDocumentoComercial` solo verifica `'instantaneaDocumentoComercial' in valor` (línea 527):**
```typescript
export const esCargaReutilizacionDocumentoComercial = (valor: unknown): valor is CargaReutilizacionDocumentoComercial => {
  if (!valor || typeof valor !== 'object') return false;
  return 'instantaneaDocumentoComercial' in valor;
};
```
Esta validación es muy laxa. Cualquier objeto con esa clave pasa, aunque la instantánea esté incompleta o corrupta. No hay validación del contenido interno. Si `datosNotaCredito` es `null` en el payload (posible si `crearDatosNotaCreditoDesdeInstantanea` devuelve null y se pasa de todos modos), el loader continúa sin error pero el formulario abre sin metadatos NC.

---

### 3.4 `models/instantaneaDocumentoComercial.ts`

**Ruta:** `src/pages/Private/features/comprobantes-electronicos/models/instantaneaDocumentoComercial.ts`

**Responsabilidad:** Definir tipos del snapshot canónico y funciones de conversión/extracción.

**Hallazgo A — `seleccionarItemsDisponibles` devuelve `[]` si ningún array existe (líneas 285-296):**
```typescript
const seleccionarItemsDisponibles = (comprobante: FilaListadoCompatible): CartItem[] => {
  if (Array.isArray(comprobante.items) && comprobante.items.length > 0) return comprobante.items;
  if (Array.isArray(comprobante.cartItems) && comprobante.cartItems.length > 0) return comprobante.cartItems;
  if (Array.isArray(comprobante.productos) && comprobante.productos.length > 0) return comprobante.productos;
  return [];
};
```
Para comprobantes en el contexto cuya fila no tiene ninguno de esos arrays poblados (comprobantes no emitidos en la sesión activa o cargados de una fuente que no los incluye), devuelve `[]`. La NC se abrirá sin productos.

**Hallazgo B — `combinarInstantaneaDocumentoComercial` prioriza `principal` sobre `respaldo` (líneas 326-406):**
```typescript
const instantaneaDesdeListado = crearInstantaneaDocumentoComercial({...campos planos...});

if (comprobante.instantaneaDocumentoComercial) {
  return combinarInstantaneaDocumentoComercial(
    comprobante.instantaneaDocumentoComercial,   // principal
    instantaneaDesdeListado,                     // respaldo
  );
}
```
Si `comprobante.instantaneaDocumentoComercial` tiene ítems pero `instantaneaDesdeListado` no (por fila plana sin items), `combinarItems` prioriza el principal. Esto es correcto. Pero si el principal también tiene `items = []` (snapshot guardado de comprobante emitido con items vacíos, error histórico), ambos tienen `[]` y el resultado es `[]`.

**Hallazgo C — `crearDatosNotaCreditoDesdeInstantanea` regresa `null` si no puede determinar el tipo (líneas 530-558):**
```typescript
const tipoComprobanteOrigen = normalizarTipoComprobanteBase(
  instantanea.identidad.tipoComprobante ?? instantanea.identidad.tipoDocumento,
);
if (!tipoComprobanteOrigen) {
  return null;   // ← y en handleGenerateCreditNote se hace return temprano
}
```
Si el comprobante origen tiene `type` que no puede normalizarse a 'boleta' o 'factura' (por ejemplo, si `type = 'Factura Electrónica'` en texto largo no normalizado), `normalizarTipoComprobanteBase` falla porque solo busca `includes('boleta')` o `includes('factura')` en minúsculas. `'Factura Electrónica'.toLowerCase()` sí incluye 'factura', así que este caso puntual funciona, pero valores como `'01'`, `'03'`, o variantes no normalizadas fallan.

**Hallazgo D — `extraerDatosRehidratacionDesdeInstantanea` asigna `formaPago` desde `formaPagoId` con fallback a `formaPagoDescripcion` (línea 595):**
```typescript
formaPago: instantanea.camposComerciales.formaPagoId
         ?? instantanea.camposComerciales.formaPagoDescripcion ?? '',
```
El loader en `useDuplicateDataLoader` llama `setFormaPago(datosRehidratacion.formaPago)`. El `setFormaPago` acepta el ID del método de pago. Si la instantánea guardó la descripción ('CONTADO', 'YAPE') pero el hook espera el ID ('pm-efectivo', 'pm-yape'), el seteo puede fallar silenciosamente o usar un valor no reconocido. Para NC esto es menor (no afecta la validez de la NC), pero para duplicación sí.

---

### 3.5 `lista-comprobantes/contexts/ComprobantesListContext.tsx`

**Ruta:** `src/pages/Private/features/comprobantes-electronicos/lista-comprobantes/contexts/ComprobantesListContext.tsx`

**Responsabilidad:** Almacén en memoria de todos los comprobantes emitidos.

**Hallazgo A — No hay persistencia entre sesiones (líneas 66-68):**
```typescript
const INITIAL_COMPROBANTES: Comprobante[] = [];
// ...
const [state, dispatch] = useReducer(comprobanteReducer, {
  comprobantes: INITIAL_COMPROBANTES
});
```
El contexto vive solo mientras el componente padre está montado (probablemente el layout de la app). Al recargar la página, todos los comprobantes desaparecen. No hay llamada a API, no hay localStorage, no hay `SET_COMPROBANTES` desde ningún fetcher.

**Hallazgo B — `tenantId` change resetea a vacío (líneas 137-139):**
```typescript
useEffect(() => {
  dispatch({ type: 'SET_COMPROBANTES', payload: INITIAL_COMPROBANTES });
}, [tenantId]);
```
Al cambiar de empresa, la lista se vacía (correcto), pero confirma que no hay recarga de backend.

**Hallazgo C — `Comprobante` interface tiene `items`, `cartItems`, `productos` como opcionales (líneas 43-45):**
```typescript
items?: CartItem[];
cartItems?: CartItem[];
productos?: CartItem[];
```
Los tres son opcionales. Solo `useComprobanteActions` los puebla con certeza al crear un comprobante. Ninguna otra ruta los garantiza.

**Hallazgo D — `instantaneaDocumentoComercial` también opcional (línea 49):**
```typescript
instantaneaDocumentoComercial?: InstantaneaDocumentoComercial;
```
Solo se puebla en `useComprobanteActions.createComprobante` (línea 758 de ese archivo). Comprobantes de otras fuentes no tienen snapshot.

---

### 3.6 `hooks/useComprobanteActions.tsx`

**Ruta:** `src/pages/Private/features/comprobantes-electronicos/hooks/useComprobanteActions.tsx`

**Responsabilidad:** Crear y registrar un comprobante nuevo, incluyendo el snapshot canónico.

**Hallazgo A — El snapshot se construye con todos los campos (líneas 637-719):** El comprobante que se agrega al contexto incluye `instantaneaDocumentoComercial` completamente construida, con items, cliente, camposComerciales, etc. Para comprobantes recién emitidos en esta sesión, la información es completa. Este es el camino "feliz".

**Hallazgo B — `clientePriceProfileId` guardado pero `codigoSunatDocumento` calculado, no almacenado explícitamente (líneas 667-675):**
```typescript
cliente: {
  idCliente: data.clientId ?? null,
  nombre: data.client || 'Cliente General',
  tipoDocumento: data.clientDocType ?? null,
  numeroDocumento: data.clientDoc || null,
  email: data.email ?? null,
  direccion: data.address ?? null,
  priceProfileId: data.clientPriceProfileId ?? null,
  // ← codigoSunatDocumento no está en ComprobanteData
}
```
`codigoSunatDocumento` no se pasa a `crearInstantaneaDocumentoComercial`. La función lo deduce de `clientDocType` vía `inferirCodigoSunatDocumentoCliente`. Si luego se rehidrata este cliente, el `codigoSunatDocumento` puede recalcularse diferente si la lógica de inferencia diverge del valor original.

---

### 3.7 `punto-venta/hooks/useCart.tsx`

**Ruta:** `src/pages/Private/features/comprobantes-electronicos/punto-venta/hooks/useCart.tsx`

**Responsabilidad:** Gestionar el estado del carrito de compras.

**Hallazgo A — `setCartItemsFromDraft` reemplaza todo el carrito (líneas 455-501):**
```typescript
const setCartItemsFromDraft = useCallback((items: CartItem[]) => {
  if (!Array.isArray(items) || items.length === 0) {
    setCartItems([]);   // ← si items vacíos, limpia el carrito
    return;
  }
  // normaliza y setea
  setCartItems(normalized);
}, [...]);
```
Cuando el loader llama `setCartItemsFromDraft([])` con items vacíos (porque la fila no los tiene), el carrito queda vacío. Luego el borrador lo sobreescribe con NC 1's ítems (el carrito del borrador). El usuario ve los productos de la NC anterior.

**Hallazgo B — `addProductsFromSelector` ACUMULA en vez de reemplazar (líneas 534-560):**
```typescript
const addProductsFromSelector = useCallback((products) => {
  setCartItems(prev => {
    const updated = [...prev];
    products.forEach(({ product, quantity }) => {
      const idx = updated.findIndex(item => item.id === product.id);
      if (idx !== -1) {
        updated[idx] = { ...updated[idx], quantity: nextQuantity };
      } else {
        updated.push(createCartItem(product, quantity));
      }
    });
    return updated;
  });
}, [...]);
```
Si el carrito tiene ítems previos (del borrador restaurado) y el loader llama `addProductsFromSelector`, los ítems del borrador permanecen y se suman los nuevos. La NC puede terminar mostrando ítems duplicados (del borrador + los nuevos).

El loader usa `setCartItemsFromDraft` cuando está disponible (línea 107), lo que reemplaza correctamente. Pero si por alguna razón `setCartItemsFromDraft` no se pasa, usa `addProductsFromSelector` (línea 113-120), acumulando sobre el borrador.

---

### 3.8 `hooks/useComprobanteState.tsx`

**Ruta:** `src/pages/Private/features/comprobantes-electronicos/hooks/useComprobanteState.tsx`

**Responsabilidad:** Estado compartido del formulario (observaciones, notaInterna, formaPago).

**Hallazgo A — `resetForm` no limpia el carrito ni los campos opcionales:**
```typescript
const resetForm = useCallback(() => {
  setObservaciones('');
  setNotaInterna('');
  setFormaPago(defaultPaymentMethod);
  setShowOptionalFields(false);
  // ← NO limpia cartItems
  // ← NO limpia clienteSeleccionadoGlobal
  // ← NO limpia optionalFields
}, [defaultPaymentMethod]);
```
`cartItems` es estado de `useCart`, no de `useComprobanteState`. `clienteSeleccionadoGlobal` y `optionalFields` son `useState` en `EmisionTradicional`. Si `resetForm` se llama al abrir NC, no limpia estos campos. Sin embargo, cuando el componente remonta, todos los estados se inicializan de nuevo correctamente desde su `useState` inicial, así que esto solo impacta si el componente NO remonta entre NCs (p.ej., si se navega en la misma instancia).

---

## 4. Comparación de shapes reales

### Shape desde Emisión Tradicional (emitido en sesión activa)

```typescript
// En ComprobantesListContext después de emitir
{
  id: "F001-00000042",
  type: "Factura",
  client: "Empresa ABC SAC",
  clientDoc: "20123456789",
  clientDocType: "RUC",
  clientId: "cliente-uuid",
  clientPriceProfileId: "profile-uuid",
  email: "empresa@abc.com",
  address: "Av. Principal 123",
  shippingAddress: "Calle Entrega 456",
  purchaseOrder: "OC-2024-001",
  costCenter: "CC-VENTAS",
  waybill: "GR-001",
  observations: "Observación del cliente",
  internalNote: "Nota interna",
  paymentMethod: "CONTADO",
  paymentMethodId: "pm-efectivo",
  currency: "PEN",
  dueDate: "2026-03-30",
  items: [CartItem...],          // ← POBLADO
  cartItems: [CartItem...],      // ← POBLADO (misma referencia)
  productos: [CartItem...],      // ← POBLADO (misma referencia)
  totals: { subtotal, igv, total, currency },
  creditTerms: {...} | undefined,
  noteCreditData: null,
  instantaneaDocumentoComercial: {  // ← COMPLETO
    version: 1,
    identidad: {...},
    cliente: { idCliente, nombre, tipoDocumento, numeroDocumento,
               email, telefono, direccion, priceProfileId },
    camposComerciales: { todas las propiedades },
    detalle: { items: [...], modoDetalle: 'catalogo'|'libre'|'mixto' },
    relaciones: {...}
  }
}
```

### Shape desde POS (emitido en sesión activa)

```typescript
// Igual que ET pero:
{
  // ...
  shippingAddress: undefined,   // POS no lo recolecta normalmente
  purchaseOrder: undefined,
  costCenter: undefined,
  waybill: undefined,
  // items, cartItems, productos: POBLADOS (misma garantía)
  // instantaneaDocumentoComercial: COMPLETO pero con camposComerciales principalmente null
  instantaneaDocumentoComercial: {
    camposComerciales: {
      direccionEnvio: null,
      ordenCompra: null,
      guiaRemision: null,
      centroCosto: null,
      observaciones: null,    // a menos que POS lo capture
      // ...
    }
  }
}
```

### Shape en lista (comprobante de OTRA sesión o no emitido por esta sesión)

```typescript
// Si el comprobante fue cargado por SET_COMPROBANTES desde un source externo
// o si el contexto se perdió al recargar:
{
  id: "F001-00000001",
  type: "Factura",
  client: "Empresa XYZ",
  clientDoc: "20987654321",
  // CAMPOS OPCIONALES: pueden estar presentes o no según la fuente
  items: undefined,             // ← AUSENTE
  cartItems: undefined,         // ← AUSENTE
  productos: undefined,         // ← AUSENTE
  totals: { subtotal, igv, total },
  instantaneaDocumentoComercial: undefined   // ← AUSENTE
}
```

### Shape en snapshot construido por `convertirComprobanteListadoAInstantaneaDocumentoComercial`

**Caso A — comprobante con `instantaneaDocumentoComercial` y con ítems:**
```typescript
// combinarInstantaneaDocumentoComercial(original, desdeListado)
// → resultado completo con todos los campos
// items = original.detalle.items (si non-empty)
// cliente = original.cliente (completo)
// camposComerciales = combinar(original, desdeListado)
```

**Caso B — comprobante sin `instantaneaDocumentoComercial` y sin ítems:**
```typescript
// Solo crearInstantaneaDocumentoComercial desde campos planos
{
  identidad: { tipoDocumento, tipoComprobante, serie, correlativo, ... },
  cliente: { nombre, numeroDocumento, email, direccion, priceProfileId },
  camposComerciales: { todos los campos disponibles del row plano },
  detalle: {
    items: [],       // ← VACÍO
    modoDetalle: 'sin_items'
  }
}
```

### Shape que consume el loader (`extraerDatosRehidratacionDesdeInstantanea`)

```typescript
{
  cliente: { clienteId, nombre, dni, direccion, email, tipoDocumento, priceProfileId } | null,
  items: CartItem[],          // ← puede ser [] si snapshot sin ítems
  modoDetalle: 'sin_items' | 'catalogo' | 'libre' | 'mixto',
  observaciones: string,
  notaInterna: string,
  formaPago: string,          // formaPagoId ?? formaPagoDescripcion ?? ''
  moneda: Currency | null,
  tipoComprobante: TipoComprobante | null,
  camposOpcionales: {
    fechaVencimiento?, direccionEnvio?, ordenCompra?,
    guiaRemision?, centroCosto?, direccion?, correo?
  }
}
```

### Shape final que recibe el formulario (lo que ve el usuario)

**NC 1 (primer intento, sin borrador previo) — CORRECTO:**
```
cliente = de la instantánea (desde loader)
cartItems = de la instantánea (desde loader)
optionalFields = de la instantánea (desde loader)
datosNotaCredito = de location.state.noteCredit (correcto)
```

**NC 2+ (con borrador de NC 1) — INCORRECTO:**
```
cliente = del borrador de NC 1 (loader cargó NC 2, borrador sobrescribió)
cartItems = del borrador de NC 1 (loader cargó NC 2, borrador sobrescribió)
optionalFields = del borrador de NC 1 (loader cargó NC 2, borrador sobrescribió)
datosNotaCredito = de location.state.noteCredit (CORRECTO — gestionado separado)
```

Resultado visible: el usuario ve datos del comprobante anterior con los metadatos NC del comprobante actual. El documento relacionado es correcto, pero el cuerpo (cliente, productos, campos opcionales) es del NC anterior.

---

## 5. Causa raíz exacta

### Causa raíz primaria — `useBorradorEnProgreso` activo durante flujo NC

**Evidencia directa:**

**Archivo 1** — `EmisionTradicional.tsx`, línea 677-684:
```typescript
const borradorHabilitado = Boolean(
  session?.currentCompanyId &&
  establecimientoIdBorrador &&
  tipoFromQueryResolved &&
  !isDuplicateFlow,    // ← isNoteCreditFlow NO está excluido
);
```

**Archivo 2** — `EmisionTradicional.tsx`, líneas 183-187:
```typescript
const isDuplicateFlow = useMemo(() => {
  const state = location.state as any;
  return Boolean(state?.duplicate || (state?.fromConversion === true && state?.conversionData));
  // ← state?.noteCredit no activa isDuplicateFlow
}, [location.state]);
```

**Archivo 3** — `useBorradorEnProgreso.ts`, líneas 88-99 y 114-116:
```typescript
// El hook restaura el borrador en el efecto de mount
useEffect(() => {
  restaurar();   // llamado incondicionalmente si habilitado = true
}, [restaurar]);
```

**Archivo 4** — Orden en `EmisionTradicional.tsx`:
```
línea 405:  useDuplicateDataLoader(...)    → useEffect corre PRIMERO
línea 708:  useBorradorEnProgreso(...)     → useEffect.restaurar() corre DESPUÉS
```

**Archivo 5** — `useBorradorEnProgreso.ts`, línea 96:
```typescript
aplicarDesdeStorage(borrador.datos);   // sobrescribe sin condiciones
```

**Archivo 6** — `EmisionTradicional.tsx`, línea 697-703 (clave del borrador):
```typescript
const claveBorradorEnProgreso = useMemo(() => crearClaveBorradorEnProgreso({
  app: 'facturafacil',
  tenantId: session?.currentCompanyId ?? null,
  establecimientoId: establecimientoIdBorrador,
  tipoDocumento: 'comprobante_emision_tradicional',
  modo: tipoComprobante,   // ← 'nota_credito' para todas las NCs
}), [...]);
```
Todas las NCs de la misma empresa/establecimiento usan la MISMA clave. La NC 1 guarda su estado ahí. La NC 2 la restaura.

**Archivo 7** — `useBorradorEnProgreso.ts`, líneas 220-261 (cleanup en unmount):
```typescript
// Al desmontar EmisionTradicional (usuario navega de vuelta al listado)
// el borrador se guarda con el estado actual del formulario NC 1
guardarBorradorEnProgreso(claveActual, borrador);
```

**Conclusión:** La secuencia causal completa es:

```
NC 1: No hay borrador → loader carga NC 1 → borrador se GUARDA al cerrar
NC 2: loader carga NC 2 → borrador RESTAURA NC 1 (posterior al loader) → usuario ve NC 1
NC 3: loader carga NC 3 → borrador RESTAURA NC 2 (guardado al cerrar NC 2) → usuario ve NC 2
...
```

### Causa raíz secundaria — Ítems vacíos en comprobantes sin datos de sesión

El contexto `ComprobantesListContext` es 100% in-memory y no persiste entre recargas. Para comprobantes que no fueron emitidos en la sesión actual, `items/cartItems/productos` y `instantaneaDocumentoComercial` son `undefined`. Cuando `seleccionarItemsDisponibles()` devuelve `[]` y no hay `instantaneaDocumentoComercial` para combinar, el snapshot de NC tiene `detalle.items = []`. El loader llama `setCartItemsFromDraft([])` → carrito vacío → NC abre sin productos.

---

## 6. Por qué el primer comprobante sí parece funcionar y los demás no

**Primer NC en la sesión (borrador inexistente para la clave `nota_credito`):**

```
Mount EmisionTradicional
  ↓
useDuplicateDataLoader.useEffect fires
  → esCargaReutilizacionDocumentoComercial(state.noteCredit) = true
  → extraerDatosRehidratacionDesdeInstantanea() extrae cliente + items
  → setClienteSeleccionadoGlobal(nc1.cliente)     ✓
  → setCartItemsFromDraft(nc1.items)              ✓
  → setOptionalFields(nc1.camposOpcionales)       ✓
  → processedLocationKeyRef.current = "key-abc"
  ↓
useBorradorEnProgreso.useEffect fires (restaurar())
  → leerBorradorEnProgreso(clave_nota_credito, version)
  → BORRADOR = null (no existe aún)
  → return (sin sobreescritura)                   ✓
  ↓
Formulario renderiza con datos correctos de NC 1  ✓
```

**Segundo NC (borrador de NC 1 ya guardado):**

```
Usuario navega a /comprobantes (EmisionTradicional se DESMONTA)
  ↓
useBorradorEnProgreso cleanup effect:
  → guardarBorradorEnProgreso(clave_nota_credito, { cliente: nc1, items: nc1.items, ... })
     BORRADOR GUARDADO CON DATOS DE NC 1

Usuario hace clic en NC para comprobante 2
  → navigate('/comprobantes/emision', { state: { noteCredit: nc2_payload } })
  ↓
Mount EmisionTradicional (NUEVO, estado limpio)
  ↓
useDuplicateDataLoader.useEffect fires
  → location.state.noteCredit = nc2_payload
  → processedLocationKeyRef.current = null  (ref reseteado en nuevo mount)
  → location.key = "key-def" ≠ null → PASA GUARD ✓
  → setClienteSeleccionadoGlobal(nc2.cliente)     ✓ (temporal)
  → setCartItemsFromDraft(nc2.items)              ✓ (temporal)
  → setOptionalFields(nc2.camposOpcionales)       ✓ (temporal)
  ↓
useBorradorEnProgreso.useEffect fires (restaurar())  ← CORRE DESPUÉS
  → leerBorradorEnProgreso(clave_nota_credito, version)
  → BORRADOR = { cliente: nc1, cartItems: nc1.items, optionalFields: nc1.fields }
  → aplicarDesdeStorage(borrador.datos):
     setClienteSeleccionadoGlobal(nc1.cliente)    ← SOBRESCRIBE NC2
     setCartItemsFromDraft(nc1.cartItems)         ← SOBRESCRIBE NC2
     setObservaciones(nc1.observaciones)          ← SOBRESCRIBE NC2
     setOptionalFields(nc1.optionalFields)        ← SOBRESCRIBE NC2
  ↓
Formulario renderiza con datos de NC 1 (INCORRECTO para NC 2)  ✗
```

**El patrón se repite para NC 3, NC 4, etc.**

Adicionalmente, `omitirGuardadoRef.current = true` (línea 95 de useBorradorEnProgreso) es establecido durante la restauración, pero se resetea a `false` en la siguiente ejecución del segundo `useEffect` (línea 176). Esto significa que luego de restaurar, el estado contaminado (NC 1's data) se serializa y comienza el ciclo de guardado, perpetuando la contaminación en el borrador.

---

## 7. Solución prolija recomendada

**Sin código. Solo la arquitectura de la solución.**

### 7.1 Exclusión del borrador para el flujo NC (solución principal)

El guard de exclusión del borrador debe incluir `isNoteCreditFlow` de la misma manera que incluye `isDuplicateFlow`. El borrador no debe estar habilitado cuando el componente se monta como destino de una navegación NC. Esta condición debe evaluarse al inicio del componente, antes de que los hooks dependientes se inicialicen.

La condición correcta sería algo similar a:
```
borradorHabilitado = !isDuplicateFlow && !isNoteCreditFlow
```

Esto evita que el borrador se restaure cuando hay datos frescos en `location.state.noteCredit`.

### 7.2 Limpieza del borrador NC tras emisión exitosa

Después de que una NC es emitida exitosamente, el borrador bajo la clave `nota_credito` debe limpiarse explícitamente antes de que el componente navegue o muestre el modal de éxito. La función `limpiar` (alias de `limpiarBorradorEnProgreso`) ya existe y está disponible; solo falta invocarla en el callback de éxito.

### 7.3 Limpieza del borrador NC al abandonar (navegar sin emitir)

Si el usuario abre una NC y navega de vuelta sin emitir, el borrador no debería guardarse con datos NC parciales que contaminen la próxima NC. La función `debePersistir` debe devolver `false` cuando el flujo activo es NC (de la misma forma que podría verificar si hay `datosNotaCredito` en el estado extraído). Alternativamente, la función cleanup (en el unmount del useEffect de useBorradorEnProgreso) debe verificar si el estado actual corresponde a una NC en progreso y, en ese caso, limpiar en vez de guardar.

### 7.4 Resolver el problema de ítems vacíos (causa secundaria)

La lista de comprobantes necesita acceso a los ítems de cada comprobante para construir el snapshot de NC. Hay tres caminos posibles (sin implementar aquí):
- Persistir los ítems en `localStorage`/`sessionStorage` al emitir
- Llamar a la API del backend para obtener el detalle del comprobante antes de construir el snapshot
- Guardar el snapshot `instantaneaDocumentoComercial` completo en `localStorage` al emitir, referenciado por el ID del comprobante, para que siempre esté disponible aunque el contexto in-memory haya sido descartado

### 7.5 Resolver `modoDetalle = 'mixto'` en el loader

El loader debe mapear `'mixto'` a un estado que haga visible tanto los ítems catálogo como los libres. Actualmente solo acepta `'catalogo'` o `'libre'`. Se necesita que `ProductsSection` pueda operar en modo mixto, o que el loader cargue ambos grupos independientemente.

### 7.6 Unificar la gestión de `datosNotaCredito`

El estado `datosNotaCredito` en `EmisionTradicional` tiene dos vías de inicialización (`useState` init y `useEffect`). Para simplificar y evitar divergencias, debería existir una sola fuente de verdad: bien se pasa `setDatosNotaCredito` a `useDuplicateDataLoader` como cualquier otro handler, o bien se gestiona completamente fuera del loader (como ahora), pero con la condición de que el borrador no lo interfiera.

---

## 8. Archivos exactos que habría que tocar después

| Archivo | Motivo |
|---|---|
| `pages/EmisionTradicional.tsx` | Agregar `!isNoteCreditFlow` a la condición `borradorHabilitado` (línea 683). Llamar `limpiarBorradorEnProgreso()` tras NC exitosa. Posiblemente pasar `setDatosNotaCredito` al loader. |
| `hooks/useDuplicateDataLoader.tsx` | Actualizar la interfaz `DuplicateDataHandlers` para incluir opcionalmente `setDatosNotaCredito`. Confirmar que el mapeo de `modoDetalle = 'mixto'` queda resuelto. |
| `shared/borradores/useBorradorEnProgreso.ts` | Potencialmente agregar soporte para una opción `deshabilitarSiNavegacionConDatos` o similar, para hacer el hook más autocontenido respecto a estos casos. Actualmente la lógica de exclusión está en el consumidor. |
| `lista-comprobantes/contexts/ComprobantesListContext.tsx` | A largo plazo, agregar persistencia de comprobantes en `localStorage` o llamada a API para cargar el historial. El contexto in-memory es la causa de que ítems de sesiones anteriores no estén disponibles. |
| `models/instantaneaDocumentoComercial.ts` | `crearDatosNotaCreditoDesdeInstantanea` debería manejar códigos SUNAT directos (`'01'`, `'03'`) además de etiquetas normalizadas. `normalizarTipoComprobanteBase` tiene un alcance limitado. |

---

## 9. Riesgos y regresiones a cuidar

### Factura y Boleta (flujo de emisión normal)

- El borrador está **intencionalmente habilitado** para emisión normal (guarda el trabajo en progreso del usuario entre navigaciones). Cualquier cambio a `borradorHabilitado` debe preservar el comportamiento actual para los flujos `boleta` y `factura`.
- La verificación de exclusión debe ser quirúrgicamente específica a NC, no deshabilitar el borrador globalmente.

### POS (Punto de Venta)

- POS tiene su propio componente (`PuntoVenta.tsx`) y no usa `EmisionTradicional`. Los cambios en EmisionTradicional no impactan POS directamente.
- Sin embargo, `useComprobanteActions` es compartido. Cualquier cambio allí afecta ambos.

### Duplicación y Conversión

- `isDuplicateFlow = true` ya desactiva el borrador. Los cambios para NC no deben interferir con esta lógica.
- Verificar que la condición compuesta `!isDuplicateFlow && !isNoteCreditFlow` no rompa el comportamiento de las conversiones (actualmente `isFromConversion` se detecta dentro del loader, no en `isDuplicateFlow` directamente para todas las variantes).

### Preview e Impresión

- Preview e impresión leen directamente del objeto `Comprobante` del contexto (o del payload de la fila seleccionada). No dependen del estado del formulario.
- El problema de ítems vacíos en la fila sí afecta preview e impresión: si el comprobante no tiene `cartItems`/`productos` en la fila, el preview mostraría la lista de productos vacía. Esto es un bug independiente pero con la misma causa raíz (contexto in-memory sin persistencia).

### NC emitida y luego consultada

- Si una NC se emite y el usuario intenta generar otra NC desde esa NC (aunque no es el flujo normal), el snapshot de la NC emitida ya tiene `instantaneaDocumentoComercial` completa con los ítems correctos. El flujo funcionaría siempre que el borrador haya sido limpiado.

### `useBorradorEnProgreso` en otros formularios

- Si hay otros formularios que usen `useBorradorEnProgreso`, los cambios al hook en sí deben ser retrocompatibles. La solución recomendada (modificar la condición de `borradorHabilitado` en el consumidor) es la más segura y no toca el hook compartido.

### Orden de efectos React

- Al corregir la exclusión del borrador (`borradorHabilitado = false` durante NC), el `useEffect(() => restaurar())` simplemente hace `return` al inicio. Esto es seguro y sin efectos secundarios.
- Si en el futuro se mueve `useBorradorEnProgreso` a una posición anterior a `useDuplicateDataLoader` en el componente (por refactor de orden), el problema volvería a aparecer aunque la condición de habilitación esté correcta. La condición de habilitación es la barrera principal y debe mantenerse.

### Limpieza del borrador en éxito

- Llamar `limpiarBorradorEnProgreso()` después de una NC exitosa debe ocurrir ANTES de cualquier navegación (o en el callback de éxito), para que el cleanup del unmount no sobreescriba la limpieza.
- Si se limpia en el unmount en vez de en el éxito, hay una race condition: el cleanup y el `limpiarBorradorEnProgreso()` explícito pueden competir.

### `debePersistir` para NC

- Si se opta por que `debePersistir` devuelva `false` durante NC (alternativa a `borradorHabilitado = false`), se debe tener cuidado con el flag `limpiarSiNoDebePersistir = false` en la configuración del hook (línea 714 de EmisionTradicional). Actualmente está en `false`, lo que significa que si `debePersistir` devuelve `false`, el borrador existente NO se limpia automáticamente. Habría que cambiar este flag O llamar `limpiar()` explícitamente.

---

*Fin del informe. Todos los hallazgos están respaldados por líneas de código específicas identificadas durante la auditoría. No se modificó ningún archivo durante este proceso.*
