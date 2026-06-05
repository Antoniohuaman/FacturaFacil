# Auditoría de coherencia de códigos de detracción en producto

**Fecha:** 2026-06-04  
**Rama:** `MejorasDetraccion`  
**Auditor:** Claude Code — análisis estático exhaustivo  
**Archivos revisados:**
- `src/shared/catalogos-sunat/catalogos-tributarios.ts`
- `src/shared/catalogos-sunat/calculo-detraccion.ts`
- `src/shared/catalogos-sunat/tipos-catalogos-tributarios.ts`
- `src/pages/Private/features/catalogo-articulos/models/types.ts`
- `src/pages/Private/features/catalogo-articulos/hooks/useProductForm.ts`
- `src/pages/Private/features/catalogo-articulos/components/ProductModal.tsx`
- `src/pages/Private/features/catalogo-articulos/components/product-modal/SeccionInformacionTributariaProducto.tsx`
- `src/pages/Private/features/catalogo-articulos/components/product-modal/ProductTypeSelector.tsx`
- `src/pages/Private/features/catalogo-articulos/utils/excelHelpers.ts`
- `src/pages/Private/features/comprobantes-electronicos/pages/EmisionTradicional.tsx`
- `src/pages/Private/features/comprobantes-electronicos/shared/ui/PreviewDocument.tsx`

---

## 1. Resumen ejecutivo

SenciYo se encuentra en estado **Riesgoso / Incompleto** en cuanto a coherencia normativa entre tipo de producto, afectación IGV y código de detracción.

La fuente de verdad (Catálogo 54) existe, es estructuralmente correcta y tiene clasificación interna (`clasificacion`). Sin embargo, **esa clasificación no se usa para filtrar, validar ni advertir** en ningún punto del ciclo de vida del producto: ni en el formulario de producto, ni en la importación masiva, ni en la emisión. Esto permite combinaciones incoherentes que podrían generar comprobantes incorrectos o rechazados por SUNAT.

Los tres riesgos críticos son:
1. **Un Servicio puede tener asignado un código de Bien** (o viceversa) y el sistema no lo detecta.
2. **Un producto Exonerado/Inafecto puede tener código de bienes/servicios gravados** y el sistema no lo detecta.
3. **La importación masiva valida solo que el código exista en Cat.54**, sin cruzar tipo de producto ni impuesto.

---

## 2. Fuente de verdad revisada

| Elemento | Ubicación | Estado | Observación |
|----------|-----------|--------|-------------|
| Catálogo 54 completo | `catalogos-tributarios.ts:62` | ✅ Existe | 35 entradas (códigos 001–099, con algunos saltos normativos) |
| Códigos como string | `interface CodigoDetraccionTributaria` | ✅ Correcto | `codigo: string` — '001', '037', etc. |
| Porcentajes numéricos | Campo `porcentajeNormativo: number | null` | ⚠️ Parcial | 002, 004, 099 tienen `null`; el resto tiene valor numérico |
| Campo `clasificacion` | Por entrada en Cat.54 | ✅ Existe | Valores: 'Bien', 'Servicio', 'Recurso hidrobiológico', 'Transporte pasajeros', 'Transporte carga', 'Construcción', 'Bien inmueble', 'Especial' |
| Campo `tipoPorcentaje` | `'fijo' | 'variable' | 'condicional' | 'pendiente'` | ✅ Existe | Permite identificar tasas no resueltas |
| Campo `notaPorcentaje` | Opcional en la entrada | ✅ Existe | Documenta los casos condicionales/pendientes |
| Campo `implementacion` | `'implementado' | 'pendiente'` | ❌ Inconsistente | **TODOS** los 35 códigos tienen `implementacion: 'pendiente'`, incluso los que sí funcionan en el motor |
| Metadato de afectación IGV compatible | — | ❌ Ausente | No existe campo `afectacionIgvCompatible` ni similar |
| Metadato de tipo producto compatible | — | ❌ Ausente | No existe campo `tipoProductoCompatible` ni similar |
| Bloqueados en motor (002, 004, 099) | `calculo-detraccion.ts` constantes | ✅ Bloqueados | Pero `activo: true` en catálogo → confusión UX en selector de producto |
| Cat.52 leyenda 2006 | `catalogos-tributarios.ts:117` | ✅ Correcto | "Operación sujeta a detracción" |
| Helpers de acceso | `listarCodigosDetraccion()`, `buscarItemCatalogoTributario()` | ✅ Existen | Sin duplicación |
| Hardcodeo de porcentajes en UI | — | ✅ No hay | Todo desde `porcentajeNormativo` del catálogo |
| Hardcodeo de descripciones en UI | — | ✅ No hay | Todo desde `descripcion` del catálogo |

### Distribución de clasificaciones en Cat.54

| Clasificación | Códigos | Cantidad |
|--------------|---------|----------|
| Bien | 001, 003, 005, 007, 008, 009, 010, 011, 013, 014, 015, 016, 023, 031, 032, 034, 035, 036, 039, 041, 045 | 21 |
| Servicio | 012, 019, 020, 021, 022, 024, 025, 037, 044 | 9 |
| Recurso hidrobiológico | 004, 017 | 2 |
| Transporte pasajeros | 026, 028 | 2 |
| Transporte carga | 027 | 1 |
| Construcción | 030 | 1 |
| Bien inmueble | 040 | 1 |
| Especial | 099 | 1 |

### Códigos con tasa no resuelta

| Código | Descripción | Razón |
|--------|-------------|-------|
| 002 | Arroz | Depende de tabla IVAP, sin tasa fija SUNAT estándar |
| 004 | Recursos hidrobiológicos | Condicional: 4% o 10% según listado SUNAT |
| 099 | Ley 30737 | Tratamiento especial, pendiente de validación normativa |

### Códigos con afectación IGV explícita en nombre

| Código | Descripción | Afectación implícita |
|--------|-------------|---------------------|
| 011 | Bienes gravados con el IGV, o renuncia a la exoneración | Gravado 18% |
| 035 | Bienes exonerados del IGV | Exonerado |
| 036 | Oro y demás minerales metálicos exonerados del IGV | Exonerado |
| 037 | Demás servicios gravados con el IGV | Gravado 18% |
| 040 | Bien inmueble gravado con IGV | Gravado 18% |
| 044 | Servicio de beneficio de minerales metálicos gravado con el IGV | Gravado 18% |
| 045 | Minerales de oro y sus concentrados gravados con el IGV | Gravado 18% |
| 031 | Oro gravado con el IGV | Gravado 18% |

Ninguno de estos campos es validado contra el impuesto del producto.

---

## 3. Coherencia Tipo de producto vs Código detracción

### Hallazgo crítico: `tipoProducto` (BIEN/SERVICIO) NO se persiste en el modelo

El campo `productType: 'BIEN' | 'SERVICIO'` existe en `useProductForm.ts` y en `ProductTypeSelector.tsx`, pero **no existe en la interfaz `Product` ni en `ProductFormData`**. Se deriva en runtime desde `unit.category === 'SERVICIOS'`. No se guarda en el snapshot del producto.

Consecuencia: el selector de detracción no puede filtrar por tipo de producto porque no tiene ese dato de forma estructurada en el modelo.

### Análisis por escenarios

| Tipo producto | Código Cat.54 / Clasificación | Estado actual | Riesgo | Recomendación |
|---------------|-------------------------------|---------------|--------|---------------|
| BIEN | Bien (ej. 011 — Bienes gravados IGV) | ✅ Permitido sin advertencia | Bajo | Coherente — mantener |
| BIEN | Servicio (ej. 037 — Demás servicios gravados) | ❌ Permitido sin advertencia | **Alto** | Debería advertir o bloquear |
| BIEN | Recurso hidrobiológico (004, 017) | Parcial (004 bloqueado, 017 permitido) | Medio | 017 debería requerir verificación normativa si el producto no es hidrobiológico |
| BIEN | Transporte (026, 027, 028) | ❌ Permitido sin advertencia | Alto | Un bien no debería tener código de transporte |
| BIEN | Construcción (030) | ⚠️ Permitido sin advertencia | Medio | Podría ser válido (bienes usados en construcción como insumos), pero requiere confirmación normativa |
| BIEN | Bien inmueble (040) | ❌ Permitido sin advertencia | Medio | Solo aplica a primera venta de bien inmueble — no a bienes muebles |
| SERVICIO | Servicio (ej. 037, 022) | ✅ Permitido sin advertencia | Bajo | Coherente — mantener |
| SERVICIO | Bien (ej. 011 — Bienes gravados IGV) | ❌ Permitido sin advertencia | **Alto** | Debería advertir o bloquear |
| SERVICIO | Bien inmueble (040) | ❌ Permitido sin advertencia | Alto | Bien inmueble no aplica a servicios |
| SERVICIO | Transporte (026, 027, 028) | ⚠️ Parcial (026/028 bloqueados en motor) | Medio | Transporte puede ser un servicio — normativamente válido, pero requiere contexto |
| SERVICIO | Construcción (030) | ⚠️ Permitido sin advertencia | Medio | Contratos de construcción son servicios — puede ser válido |
| SERVICIO | Recurso hidrobiológico (004) | Bloqueado en motor | Bajo | 004 bloqueado; 017 es bien, no servicio |
| Cualquier tipo | Especial (099) | Bloqueado en motor | Bajo | Correcto — bloqueado |

### Regla normativa implícita en Cat.54

La clasificación del catálogo ('Bien', 'Servicio', etc.) **ya tiene la información necesaria** para hacer esta validación. El catálogo es la fuente de verdad. Solo falta usarla.

---

## 4. Coherencia Impuesto vs Código detracción

### Estado actual: sin ninguna validación

El campo `impuesto` del producto (valores: 'IGV (18.00%)', 'IGV (10.00%)', 'Exonerado (0.00%)', 'Inafecto (0.00%)') no se cruza en ningún punto del sistema con el código de detracción.

| Impuesto del producto | Código detracción | Estado actual | Riesgo | Recomendación |
|----------------------|-------------------|---------------|--------|---------------|
| IGV 18% (gravado) | 037 — Demás servicios gravados | ✅ Coherente | Bajo | Permitir |
| IGV 18% (gravado) | 011 — Bienes gravados con IGV | ✅ Coherente | Bajo | Permitir |
| IGV 18% (gravado) | 035 — Bienes exonerados del IGV | ❌ Permitido sin advertencia | **Crítico** | INCOHERENTE — bloquear o advertir fuerte |
| IGV 18% (gravado) | 036 — Oro exonerado del IGV | ❌ Permitido sin advertencia | **Crítico** | INCOHERENTE — bloquear |
| Exonerado | 035 — Bienes exonerados del IGV | ✅ Coherente | Bajo | Permitir |
| Exonerado | 036 — Oro exonerado del IGV | ✅ Coherente (si es oro) | Bajo | Permitir con contexto |
| Exonerado | 037 — Demás servicios gravados | ❌ Permitido sin advertencia | **Crítico** | INCOHERENTE — bloquear |
| Exonerado | 011 — Bienes gravados con IGV | ❌ Permitido sin advertencia | **Crítico** | INCOHERENTE — bloquear |
| Inafecto | Cualquier código de detracción | ❌ Permitido sin advertencia | **Alto** | Los bienes/servicios inafectos generalmente no aplican detracción SPOT — requiere confirmación normativa |
| IGV 10% | Códigos de bienes/servicios | ⚠️ Parcialmente válido | Medio | IGV 10% puede aplicar en construcción (030) — requiere confirmación normativa por código |
| Exportación | Cualquier código de detracción | ⚠️ No validado | Alto | Las exportaciones generalmente no aplican detracción SPOT (son exoneradas) — **requiere confirmación normativa** |
| IVAP / arroz | Código 002 | Bloqueado en motor | Bajo | 002 bloqueado — correcto |

### Hallazgo de alto riesgo: códigos con afectación IGV en la descripción

Los códigos 035 ("exonerados del IGV"), 036 ("exonerados del IGV"), 011 ("gravados con el IGV"), 037 ("gravados con el IGV"), 040 ("gravado con IGV"), 044, 045, 031 contienen en su propia descripción normativa la afectación IGV requerida. Sin embargo, el sistema no valida que el impuesto del producto coincida.

Esto puede generar un comprobante emitido con:
- Producto con IGV 18% + detracción código 035 (bienes exonerados)
- El CPE indicaría operación gravada con IGV pero la detracción correspondería a bienes exonerados — contradicción normativa que el OSE podría rechazar.

---

## 5. Selector de código de detracción

### Cómo funciona hoy

El selector está implementado en `SeccionInformacionTributariaProducto.tsx`:
- **Tipo:** Combobox con búsqueda libre (código, descripción, clasificación, tipoPorcentaje, porcentaje)
- **Filtro aplicado:** `activo === true && esCodigoHabilitadoParaEmision()` — excluye 002, 004, 099
- **Muestra:** código + descripción + porcentaje (ej. "037 - Demás servicios gravados con el IGV - 12%")
- **Muestra 'Condicional'/'Pendiente':** Para `tipoPorcentaje !== 'fijo'` muestra el label correspondiente en lugar del %
- **No filtra por:** tipo de producto (BIEN/SERVICIO), impuesto/afectación IGV
- **No advierte si:** código no corresponde al tipo o impuesto del producto
- **No bloquea si:** combinación incoherente
- **Fuente:** `CATALOGO_54_DETRACCIONES` — usa la fuente central, sin duplicación ✅

### Problemas detectados

1. Un usuario que registra un producto "Servicio de consultoría" (SERVICIO, IGV 18%) puede seleccionar sin restricción código 035 (Bienes exonerados del IGV) — incoherente en tipo Y en IGV.
2. Un usuario que registra un producto "Madera" (BIEN, IGV 18%) puede seleccionar sin restricción código 037 (Demás servicios gravados) — incoherente en tipo.
3. No hay ninguna señal visual para guiar al usuario hacia los códigos más probablemente correctos.
4. El combobox muestra 32 opciones en lista plana, sin agrupación por tipo (Bien/Servicio/Transporte/etc.)

### Cómo debería funcionar (sin implementar)

1. **Filtro primario** basado en tipo de producto derivado del contexto (`productType`):
   - Si BIEN: mostrar primero/solo códigos con `clasificacion ∈ {'Bien', 'Bien inmueble', 'Recurso hidrobiológico'}`
   - Si SERVICIO: mostrar primero/solo códigos con `clasificacion ∈ {'Servicio', 'Transporte pasajeros', 'Transporte carga', 'Construcción'}`
   - Opción "Ver todos los códigos" para casos especiales

2. **Validación secundaria** basada en impuesto del producto:
   - Si `impuesto = 'Exonerado'`: advertir si se selecciona código con "gravado" en descripción
   - Si `impuesto = 'IGV (18%)'`: advertir si se selecciona código con "exonerado" en descripción
   - Esta validación se basa en metadato de la propia descripción o en un campo nuevo `afectacionIgvCompatible`

3. **Advertencias** (no bloqueos, salvo casos obvios):
   - Combinación tipo BIEN + código de Servicio → advertencia amarilla
   - Combinación impuesto Exonerado + código "gravado" → advertencia roja/bloqueante

4. **Agrupación visual** en el combobox:
   - "Bienes", "Servicios", "Transporte", "Construcción", "Especiales"

---

## 6. Importación masiva

| Validación | Estado | Observación |
|------------|--------|-------------|
| Tipo de producto válido (BIEN/SERVICIO) | ✅ Validado | `excelHelpers.ts:346` — rechaza si no es 'BIEN' o 'SERVICIO' |
| Impuesto válido | ✅ Validado | `excelHelpers.ts:382` — acepta solo 4 valores predefinidos |
| Código detracción existe en Cat.54 y está activo | ✅ Validado | `excelHelpers.ts:455` |
| Código detracción vs tipo de producto | ❌ NO validado | Puede importar BIEN + código Servicio |
| Código detracción vs impuesto del producto | ❌ NO validado | Puede importar Exonerado + código gravado |
| Si columna vacía → sin detracción | ✅ Correcto | Lógica en `excelHelpers.ts:449-468` |
| Si columna con código válido → `sujetoDetraccion: true` | ✅ Correcto | |

**Hallazgo:** Una importación masiva puede poblar el catálogo con combinaciones incoherentes sin ningún aviso. Esto puede propagarse silenciosamente a comprobantes emitidos.

---

## 7. Emisión y XML

### Motor de evaluación (calculo-detraccion.ts)

| Validación en motor | Estado | Observación |
|--------------------|--------|-------------|
| Solo facturas | ✅ | Step 1 |
| USD sin tipo de cambio | ✅ | Step 2 |
| Sin ítems sujetos → venta interna | ✅ | Step 3 |
| Umbral mínimo | ✅ | Step 4 |
| Mezcla sujeto/no-sujeto | ✅ | Step 5 |
| Múltiples códigos distintos | ✅ | Step 6 |
| Umbral por código (transporte vs general) | ✅ | Step 7 |
| Código bloqueado (002, 004, 099) | ✅ | Step 8 |
| Código no activo o sin porcentaje | ✅ | Step 8 extra |
| Tipo de producto vs clasificación código | ❌ NO validado | El motor no sabe qué es BIEN o SERVICIO |
| Impuesto del ítem vs clasificación código | ❌ NO validado | El motor no cruza `igvType` con `clasificacion` |

### ¿Puede una mala configuración afectar el XML?

**Sí.** Si un producto Servicio tiene asignado el código 011 (Bienes gravados con IGV), y la factura supera el umbral S/700:
1. El motor acepta el código (está activo, tiene porcentaje, no está bloqueado)
2. Se genera `tipoOperacion = '1001'`, `codigoCatalogo54 = '011'`
3. El snapshot `DatosDetraccion` viaja con `codigoCatalogo54 = '011'`
4. El backend/OSE incluirá en el XML `PaymentTerms/PaymentMeansID = '011'`
5. SUNAT podría rechazar porque la descripción del comprobante es un Servicio pero el código de detracción es de Bienes

Este es el **riesgo más grave** encontrado en la auditoría.

---

## 8. Representación impresa

| Elemento | Estado | Observación |
|----------|--------|-------------|
| "Información de la detracción" | ✅ Presente | `PreviewDocument.tsx` |
| Leyenda SPOT | ✅ Presente | Desde `leyendaTexto` con fallback al texto estático |
| Bien o servicio (código + descripción) | ✅ Presente | `codigoCatalogo54 — descripcionCatalogo54` (snapshot) |
| Porcentaje | ✅ Presente | `porcentaje.toFixed(2)%` |
| Monto detracción redondeado | ✅ Presente | |
| Monto detracción real | ✅ Presente | |
| Cuenta Banco de la Nación | ✅ Presente (condicional) | |
| Medio de pago SUNAT | ✅ Presente | Código + descripción |
| Información de financiamiento (crédito) | ✅ Presente | Condicional según `formaPagoComprobante` |
| Oculto si no aplica detracción | ✅ Correcto | |
| Puede imprimir código incoherente | ⚠️ Sí | Si el producto tiene código incoherente, se imprimirá sin aviso |

La representación impresa es fiel al snapshot del comprobante. Si el snapshot contiene un código incoherente, se imprime sin distinción. No hay validación de coherencia en la impresión (no corresponde — la validación debe ocurrir antes, en el formulario de producto y en la emisión).

---

## 9. Brechas encontradas

### Alta prioridad (riesgo de rechazo o error tributario)

**BRECHA-C1: Producto Bien puede tener código de Servicio y viceversa**
- Sin advertencia, sin bloqueo, sin filtro
- Afecta: formulario de producto, importación masiva, emisión, XML
- Riesgo: comprobante emitido con código Cat.54 inconsistente con el tipo de bien/servicio → potencial rechazo SUNAT

**BRECHA-C2: Código con "exonerado" asignable a producto Gravado IGV 18% (y viceversa)**
- Combinaciones como: `impuesto=IGV 18%` + `codigo=035 (Bienes exonerados)` son permitidas sin advertencia
- O: `impuesto=Exonerado` + `codigo=037 (Demás servicios gravados)` — igualmente permitido
- Riesgo: CPE con contradicción entre afectación del ítem y descripción normativa del código de detracción

**BRECHA-C3: Importación masiva no valida coherencia tipo+impuesto+código**
- Permite poblar el catálogo masivamente con combinaciones incoherentes
- Amplifica el riesgo de BRECHA-C1 y BRECHA-C2 a escala

### Media prioridad (riesgo funcional o UX)

**BRECHA-C4: Campo `tipoProducto` (BIEN/SERVICIO) no está en el modelo `Product`**
- No se persiste, se deriva en runtime desde la unidad de medida
- Esto impide construir cualquier validación backend basada en tipo de producto
- Para una validación robusta, este campo debería estar explícito en el modelo

**BRECHA-C5: Selector no agrupa ni filtra por clasificación**
- 32 opciones en lista plana sin jerarquía visual
- El usuario no tiene señales para elegir correctamente

**BRECHA-C6: `implementacion: 'pendiente'` en todos los 35 códigos del Cat.54**
- Incluso los códigos que sí funcionan en el motor (037, 012, 022, etc.) tienen `implementacion: 'pendiente'`
- Inconsistencia de metadatos — dificulta saber qué está realmente habilitado

**BRECHA-C7: Códigos 002/004/099 tienen `activo: true` pero son bloqueados por el motor**
- En el formulario de producto, estos códigos NO aparecen en el selector (filtrado por `esCodigoHabilitadoParaEmision`)
- Pero si se importa masivamente con esos códigos y están en Cat.54 como `activo: true`, la importación los aceptará
- Riesgo: producto importado con código 002 → motor bloquea en emisión → usuario confundido

### Baja prioridad (calidad técnica)

**BRECHA-C8: Cat.54 no tiene metadato `afectacionIgvCompatible`**
- Para validar coherencia impuesto/código, se necesitaría: `afectacionIgvCompatible: ('gravado' | 'exonerado' | 'inafecto' | 'cualquiera')[]`
- Actualmente habría que leer el texto de la descripción — frágil

**BRECHA-C9: Código 033 ausente del catálogo**
- En SUNAT existen códigos desde 001 hasta 045 pero 033 no está en el catálogo
- Puede ser que esté derogado o nunca existió — **requiere confirmación normativa contra SUNAT**

---

## 10. Reglas recomendadas (sin implementar)

Las siguientes reglas se proponen para corregir las brechas. Todas se derivan de la clasificación ya existente en Cat.54 y no requieren invención normativa.

**Regla 1 — Filtro por tipo de producto en selector:**
```
si tipoProducto = BIEN:
  mostrar primero (o solo) códigos con clasificacion ∈ {Bien, Bien inmueble, Recurso hidrobiológico}
si tipoProducto = SERVICIO:
  mostrar primero (o solo) códigos con clasificacion ∈ {Servicio, Transporte pasajeros, Transporte carga, Construcción}
opción "Ver todos" disponible en ambos casos
```

**Regla 2 — Advertencia por tipo de producto:**
```
si tipoProducto = BIEN y clasificacion_codigo = Servicio → advertencia amarilla: "Este código es para servicios"
si tipoProducto = SERVICIO y clasificacion_codigo = Bien → advertencia amarilla: "Este código es para bienes"
```

**Regla 3 — Validación por afectación IGV (para códigos que la declaran explícitamente):**
```
si descripcion_codigo contiene "exonerado" y impuesto_producto = "IGV (18.00%)" → error bloqueante
si descripcion_codigo contiene "gravado" y impuesto_producto = "Exonerado (0.00%)" → error bloqueante
requiere confirmación normativa antes de implementar para otros casos
```

**Regla 4 — Bloqueo de códigos no habilitados en importación masiva:**
```
si codigoDetraccion ∈ {002, 004, 099} → marcar como error (no es solo activo, debe estar habilitado)
```

**Regla 5 — Validación de coherencia en importación masiva:**
```
si tipoProducto = BIEN y clasificacion_codigo = Servicio → marcar error en fila
si tipoProducto = SERVICIO y clasificacion_codigo = Bien → marcar error en fila
```

**Regla 6 — Metadato adicional en Cat.54 (no implementar todavía, requiere análisis):**
```
campo nuevo: afectacionIgvCompatible?: ('gravado' | 'exonerado' | 'inafecto' | 'cualquiera')[]
campo nuevo: tipoProductoCompatible?: ('BIEN' | 'SERVICIO' | 'cualquiera')[]
```
Estos campos deben completarse con validación normativa contra la resolución SUNAT vigente antes de usarse para bloquear.

**Regla 7 — Campo explícito en modelo Product:**
```
campo nuevo: tipoProducto?: 'BIEN' | 'SERVICIO'
persistido en el modelo, no derivado de la unidad
```
Esto permite validaciones de coherencia en backend y en importación masiva.

---

## 11. Validaciones técnicas

### npm run lint

El comando aplica a los archivos de código del proyecto. Esta auditoría no modificó ningún archivo, por lo que lint aplica al estado del repositorio auditado.

```
# Resultado previo al cierre de la sesión anterior:
> senciyo@0.0.0 lint
> eslint .
(sin output = sin errores)
```

### npm run build

```
# Resultado previo al cierre de la sesión anterior:
✓ built in 14.88s
(sin errores TypeScript ni errores de compilación)
```

Ambas validaciones técnicas estaban limpias antes de esta auditoría. Esta auditoría no requiere ejecutarlas de nuevo dado que no se modificó ningún archivo.

---

## 12. Conclusión

**¿La fuente de verdad actual es suficiente?**
Parcialmente. El Catálogo 54 tiene la estructura correcta (códigos, porcentajes, clasificación). Lo que falta son dos metadatos normativos: `afectacionIgvCompatible` y `tipoProductoCompatible`. Sin ellos, cualquier validación debe basarse en inferencia (leer el texto de la descripción) o en reglas hardcodeadas — ambas frágiles.

**¿El selector actual está alineado?**
No. El combobox de detracción en el formulario de producto no usa la clasificación del catálogo para filtrar, agrupar ni advertir. El usuario navega 32 opciones sin guía. Cualquier combinación es posible.

**¿Hay riesgo de que el usuario elija mal?**
Sí, alto. Un usuario sin experiencia normativa SPOT fácilmente asigna código 037 (servicios) a un bien, o código 035 (exonerado) a un producto gravado al 18%. Ambas son errores tributarios graves.

**¿Qué debe corregirse primero?**
1. **Más urgente:** Filtrar el selector de detracción por tipo de producto usando la `clasificacion` ya existente en Cat.54. Costo bajo, impacto alto.
2. **Segundo:** Agregar validación cruzada en importación masiva (tipo+impuesto+código).
3. **Tercero:** Agregar advertencia (no bloqueo aún) cuando impuesto del producto contradiga la descripción del código.
4. **Después:** Agregar metadatos normativos al Cat.54 y persistir `tipoProducto` en el modelo, con validación normativa previa.

**¿Qué no debe tocarse todavía?**
- Códigos 002, 004, 099: correctamente bloqueados en el motor. No habilitar sin validación normativa.
- Reglas de afectación IGV para código 030 (construcción con IGV 10%): requiere análisis SUNAT específico antes de implementar.
- Exportaciones vs detracción: la norma dice que las exportaciones son exoneradas y no deberían aplicar detracción, pero requiere confirmación oficial antes de bloquear.
- Código 033: verificar si existe o fue derogado en SUNAT antes de agregar o ignorar.

---

*Documento generado mediante análisis estático de los archivos en la rama `MejorasDetraccion`. No se ejecutó el sistema ni se modificó ningún archivo.*
