# Auditoría GRE — Impresión, PDF, XML y Representación Impresa

> Fecha: 2026-06-29 | Módulo: `guias-remision` | Responsable: Arquitectura Frontend SenciYo  
> Alcance: estado actual del módulo GRE en cuanto a impresión, PDF, XML, estados, modal de emisión, listado y configuración previa.  
> Restricciones: solo lectura de código fuente — no se modificó código productivo.

---

## 1. Resumen ejecutivo

| Área | Estado | Riesgo | Recomendación |
|------|--------|--------|---------------|
| Fuente de verdad de diseño | 🔴 No integrada | Alto — impresión GRE desconectada del sistema centralizado | Conectar `imprimirGuiaGRE` a `useVoucherDesignConfigReader` |
| Representación impresa A4 | 🟡 Parcial | Medio — campos SUNAT incompletos, no usa diseño configurado | Completar campos y migrar al servicio centralizado de impresión |
| Representación impresa Ticket | 🔴 No existe | Bajo-Medio — decisión de negocio pendiente | Evaluar necesidad; el sistema de ticket de comprobantes es reutilizable |
| Descarga PDF | 🔴 No existe | Alto — solo `window.print()`, sin librería PDF | Fase diferida: requiere decisión de librería o API servidor |
| Generación XML / UBL | 🔴 No existe | Crítico — sin XML no hay envío a SUNAT | Crear `generadorXMLGRE.ts` en fase 4C |
| Modal de emisión exitosa | 🟡 Funcional con brecha | Bajo — muestra estado raw sin label visual correcto | Usar `getEstadoGRELabel()` en lugar de `guia.estado` |
| Listado y drawer | 🟢 Mayormente listo | Bajo — faltan acciones PDF y XML | Agregar botones cuando PDF/XML estén implementados |
| Estados GRE | 🟡 Aceptable con duda semántica | Bajo — "Pendiente"→"Enviado" correcto, "Emitida" ambigua | Clarificar semántica de "Emitida" antes del envío real |
| Configuración previa | 🟢 Completa | Muy bajo — flujo correcto tras cambios recientes | Verificar banner en formulario también refleja estado actualizado |
| XML / Envío SUNAT | 🔴 No existe | Crítico — fase futura | No implementar todavía |

---

## 2. Archivos revisados

| Archivo | Propósito actual | Observación | Relevancia para GRE |
|---------|------------------|-------------|---------------------|
| `guias-remision/modelos/GuiaRemision.ts` | Modelo de datos GRE | Bien estructurado; incluye campos SUNAT en BienGRE | ⭐ Central |
| `guias-remision/impresion/imprimirGuiaGRE.ts` | Generación HTML + window.print | HTML hardcodeado; no usa VoucherDesign; sin logo/marca de agua/QR | ⭐ Crítico — debe refactorizarse |
| `guias-remision/logica/estadosGRE.ts` | Labels, badges, reglas de negocio | 7 estados, `getEstadoGRELabel()` correcto | ✅ Usar en todo el módulo |
| `guias-remision/logica/useEstadoConfiguracionGRE.ts` | Estado de configuración previa | Lee datasource SOL + transportista; correcto | ✅ Ya funcional |
| `guias-remision/logica/validacionGRE.ts` | Validación previa a emisión | Valida campos obligatorios por motivo/tipo; falta validación serie | 🟡 Revisar en fase 4D |
| `guias-remision/logica/reglasFlujoGRE.ts` | Reglas por tipo+motivo | Define actores, puntos obligatorios | ✅ Bien implementado |
| `guias-remision/components/modales/ModalEmisionExitosaGRE.tsx` | Modal post-emisión | Bug: muestra `guia.estado` raw sin `getEstadoGRELabel()` | 🟡 Corregir bug |
| `guias-remision/components/modales/ModalConfiguracionGRE.tsx` | Credenciales SUNAT + autorización emisor | Recién actualizado con toast + bloque C | ✅ Completo |
| `guias-remision/components/compartido/BannerConfiguracionGRE.tsx` | Banner de aviso credenciales | Solo aparece si faltan credenciales | ✅ Funcional |
| `guias-remision/components/detalle/DrawerDetalleGRE.tsx` | Drawer con 5 tabs | Tabs completos; sin Descargar PDF ni Ver XML | 🟡 Agregar acciones futuras |
| `guias-remision/components/lista/TablaGuias.tsx` | Tabla principal + acciones | Imprimir ✓, Anular ✓, Duplicar ✓; sin PDF/XML | 🟡 Agregar acciones futuras |
| `guias-remision/paginas/GuiasRemision.tsx` | Orquestador del listado | Conecta todos los handlers; `refrescar()` wired correctamente | ✅ Bien integrado |
| `guias-remision/paginas/FormularioGREPage.tsx` | Formulario de creación/edición | Contiene BannerConfiguracionGRE y bloqueo de emisión | ✅ Revisado en sesiones anteriores |
| `guias-remision/api/fuenteDatosGRE.ts` | Persistencia localStorage | Key: `facturafacil_guias_remision_v1` | ✅ Funcional |
| `configuracion-sistema/modelos/VoucherDesignUnified.ts` | Modelo unificado de diseño | Completo: A4 + Ticket, logo, watermark, footer, campos | ⭐ GRE debe consumir |
| `configuracion-sistema/servicios/AlmacenamientoDisenoComprobante.ts` | Persistencia diseño | Keys: `voucher_design_v2_A4`, `voucher_design_v2_TICKET` | ⭐ Fuente de verdad |
| `configuracion-sistema/hooks/useConfiguracionDisenoComprobante.ts` | Hook de lectura/escritura de diseño | `useVoucherDesignConfigReader(type)` para solo lectura | ⭐ GRE debe importar |
| `shared/impresion/ServicioImpresionComprobante.ts` | Servicio iframe + window.print | Renderiza componentes React en iframe, copia CSS; no es PDF real | 🟡 Arquitectura a reutilizar para GRE |
| `shared/impresion/ResolverDisenoImpresion.ts` | Resolver de diseño sin hooks React | Lee config desde localStorage sin contexto React | ⭐ Útil para impresión fuera de componentes |
| `comprobantes-electronicos/shared/ui/PreviewDocument.tsx` | Vista previa A4 comprobante | Lee `useVoucherDesignConfigReader('A4')` correctamente | 🟡 Patrón a seguir, no copiar |
| `comprobantes-electronicos/shared/ui/PreviewTicket.tsx` | Vista previa Ticket comprobante | Lee `useVoucherDesignConfigReader('TICKET')` | 🟡 Patrón a seguir para ticket GRE |
| `comprobantes-electronicos/shared/modales/PreviewModal.tsx` | Modal de vista previa | Botón `handleDownload` es stub vacío (sin implementar) | ⚠️ PDF tampoco implementado en comprobantes |

---

## 3. Fuente de verdad de diseño

### Dónde vive

El sistema centralizado de diseño de comprobantes reside en:

```
configuracion-sistema/
├── modelos/VoucherDesignUnified.ts          — Tipos e interfaces (VoucherDesignConfig, VoucherDesignA4Config, VoucherDesignTicketConfig)
├── servicios/AlmacenamientoDisenoComprobante.ts — Persistencia localStorage
├── hooks/useConfiguracionDisenoComprobante.ts   — Hook React (lectura/escritura + sincronización)
└── components/diseno-comprobante/               — UI de configuración (DisenoA4.tsx, DisenoTicket.tsx, VistaPreviaComprobante.tsx...)
```

**Claves de localStorage:**
- `voucher_design_v2_A4` — Configuración A4 (logo, marca de agua, pie de página, campos, columnas)
- `voucher_design_v2_TICKET` — Configuración Ticket (58mm/80mm, tipografía, QR, separadores)

**Campos del modelo A4 (`VoucherDesignA4Config`):**

| Sección | Campos configurables |
|---------|---------------------|
| Logo | `enabled`, `url`, `width`, `height`, `position`, `layout` (horizontal/vertical) |
| Marca de agua | `enabled`, `type` (texto/imagen), `text`, `imageUrl`, `opacity`, `rotation`, `size`, `color` |
| Pie de página | `enabled`, `customText`, `textAlignment`, `fontSize`, `fontWeight`, `padding` |
| Campos documento | 10 campos con `visible`/`label` (establecimiento, observaciones, dirección, ordenCompra...) |
| Columnas producto | 15 columnas con `visible`/`label`/`width` (número, cantidad, descripción, precio, total...) |

**Export/Import:** `AlmacenamientoDisenoComprobante.exportToBlob()` / `.importFromFile()` — funcional.  
**Event bus:** `CustomEvent('voucherDesignConfigChanged')` para sincronización en tiempo real.

### Cómo lo usa Comprobantes

```typescript
// PreviewDocument.tsx (línea 5-6)
import { useVoucherDesignConfigReader } from '../../../configuracion-sistema/hooks/useConfiguracionDisenoComprobante';

// PreviewDocument.tsx (línea 22-23)
const fallbackConfig = useVoucherDesignConfigReader('A4');
const config = disenoEfectivo?.config ?? fallbackConfig;
```

El servicio `ServicioImpresionComprobante.ts` renderiza un componente React en un iframe oculto, copia los estilos CSS del documento principal (con soporte para CSS externo en producción), y llama a `window.print()` dentro del iframe. **No es PDF real**, es impresión del navegador.

### ¿GRE ya la consume?

**No.** GRE tiene su propio `imprimirGuiaGRE.ts` que genera HTML hardcodeado con `window.open()` + `document.write()`. No importa `VoucherDesignUnified`, `AlmacenamientoDisenoComprobante`, ni `useVoucherDesignConfigReader` en ninguna parte del módulo GRE.

### Qué debe reutilizar GRE

| Qué | Cómo | Archivo |
|-----|------|---------|
| Configuración de logo/marca de agua/pie de página | `useVoucherDesignConfigReader('A4')` | En el futuro componente `RepresentacionImpresaGRE.tsx` |
| Servicio de impresión iframe | `imprimirComprobante()` de `ServicioImpresionComprobante` | Adaptando el render callback |
| Resolver sin hooks | `resolverDisenoImpresion()` de `ResolverDisenoImpresion.ts` | Para llamadas fuera de componentes React |

### Qué NO debe copiar GRE

- `PreviewDocument.tsx` ni `PreviewTicket.tsx` — están acoplados a `PreviewData` de comprobantes
- La lógica de campos de producto (precio, total, IGV) — no aplica a GRE
- `DocumentFieldsConfiguration` tal cual — GRE tiene campos propios (motivo, modalidad, puntos, bienes)

---

## 4. GRE A4 — Estado campo por campo

### Cabecera de empresa y guía

| Sección | Campo | Remitente | Transportista | Estado actual | Fuente de dato | Observación |
|---------|-------|-----------|---------------|---------------|----------------|-------------|
| Empresa | Razón social | ✅ | ✅ | Mostrado | `EmpresaGRE.razonSocial` | Viene de `activeWorkspace` |
| Empresa | RUC | ✅ | ✅ | Mostrado | `EmpresaGRE.ruc` | Viene de `activeWorkspace` |
| Empresa | Dirección | ✅ | ✅ | Mostrado | `EmpresaGRE.direccion` | Viene de `activeWorkspace` |
| Empresa | Logo | ❌ | ❌ | Falta | `VoucherDesignConfig.logo` | No integrado |
| Empresa | Marca de agua | ❌ | ❌ | Falta | `VoucherDesignConfig.watermark` | No integrado |
| Empresa | Pie de página | ❌ | ❌ | Falta | `VoucherDesignConfig.footer` | No integrado |
| Empresa | Autorización especial emisor | ✅ | ✅ | Mostrado | `DatosTransportista.codigoEntidadAutorizadora + numeroAutorizacion` | Correcto tras corrección reciente |
| Cabecera GRE | Tipo de guía | ✅ | ✅ | Mostrado | `TIPO_GRE_LABELS[guia.tipo]` | En `<h1>` |
| Cabecera GRE | Serie-Correlativo | ✅ | ✅ | Mostrado | `guia.serie + guia.correlativo` | Incluye `[pendiente]` si no tiene correlativo |
| Cabecera GRE | Fecha de emisión | ✅ | ✅ | Mostrado | `guia.fechaEmision` | En tabla meta |
| Cabecera GRE | Motivo de traslado | ✅ | ✅ | Mostrado | `guia.motivoTraslado + MOTIVOS_TRASLADO` | Código + descripción |
| Cabecera GRE | Estado | ✅ | ✅ | Mostrado | `getEstadoGRELabel(guia.estado)` | Correcto (usa label visual) |
| Cabecera GRE | QR de consulta SUNAT | ❌ | ❌ | Falta | URL SUNAT | No implementado en ningún módulo |

### Destinatario y actores

| Sección | Campo | Remitente | Transportista | Estado actual | Fuente de dato | Observación |
|---------|-------|-----------|---------------|---------------|----------------|-------------|
| Destinatario | Nombre/Razón social | ✅ | ✅ | Mostrado | `guia.destinatarioNombre` | |
| Destinatario | Tipo documento | ✅ | ✅ | Mostrado | `guia.destinatarioTipoDocumento` | |
| Destinatario | Número documento | ✅ | ✅ | Mostrado | `guia.destinatarioNumeroDocumento` | |
| Destinatario | Dirección | ✅ | ✅ | Mostrado (si existe) | `guia.destinatarioDireccion` | |
| Destinatario | Ubigeo | ❌ | ❌ | Falta | `guia.destinatarioUbigeo` | Campo en modelo, no en print |
| Comprador (motivo 03) | Nombre | ❌ | ❌ | Falta | `guia.compradorNombre` | Campo en modelo, no mostrado en print |
| Especificación motivo 13 | Texto | ❌ | ❌ | Falta | `guia.especificacionMotivo` | Campo en modelo, no mostrado |

### Puntos de traslado

| Campo | Estado | Fuente | Observación |
|-------|--------|--------|-------------|
| Punto de partida — dirección | ✅ | `guia.puntoPartida.direccion` | |
| Punto de partida — distrito/provincia | ✅ (si existen) | `guia.puntoPartida.distrito/provincia` | |
| Punto de partida — ubigeo | ❌ | `guia.puntoPartida.ubigeo` | Campo en modelo, no impreso |
| Punto de llegada — dirección | ✅ | `guia.puntoLlegada.direccion` | |
| Punto de llegada — ubigeo | ❌ | `guia.puntoLlegada.ubigeo` | Campo en modelo, no impreso |
| Peso bruto total | ✅ | `guia.pesoTotal + guia.unidadPeso` | En encabezado de tabla bienes |

### Bienes a transportar

| Campo | Estado | Fuente | Observación |
|-------|--------|--------|-------------|
| Código bien | ✅ | `bien.codigoBien ?? bien.productoId` | |
| Descripción | ✅ | `bien.descripcion` | |
| Cantidad | ✅ | `bien.cantidad` | |
| Unidad de medida | ✅ | `bien.unidad` | |
| Peso por línea (kg) | ✅ | `bien.pesoLineaKg` | |
| Código producto SUNAT | ❌ | `bien.codigoProductoSunat` | Existe en modelo, no se imprime |
| Subpartida nacional/arancelaria | ❌ | `bien.codigoSubpartidaNacional` | Existe en modelo, no se imprime |
| GTIN | ❌ | `bien.codigoGTIN` | Existe en modelo, no se imprime |
| Indicador bien normalizado | 🟡 Parcial | `bien.normalizado` | Solo en drawer (badge "SUNAT"), no en print |

### Transporte

| Campo | Privado | Público | Estado | Fuente | Observación |
|-------|---------|---------|--------|--------|-------------|
| Modalidad | ✅ | ✅ | Mostrado | `guia.modalidadTransporte` | |
| Fecha inicio traslado | ✅ | — | Mostrado | `tp.fechaInicioTraslado` | |
| Fecha entrega bienes | — | ✅ | Mostrado | `tp.fechaEntregaBienes` | |
| Vehículo M1/L placa | ✅ | ✅ | Mostrado | `tp.placaVehiculoM1L` | |
| Vehículos — placa | ✅ | ✅ | Mostrado | Via `vehiculosDataSource.list()` + formatearPlaca | Llamada async en impresión |
| Vehículos — entidad autorizadora | ✅ (abreviatura) | — | Parcial | `ENTIDADES_AUTORIZADORAS_D37.find(...)` | Solo abreviatura, falta número de autorización del vehículo |
| Conductores — nombre | ✅ | ✅ | Mostrado | Via `conductoresDataSource.list()` + `nombreCompletoConductor()` | |
| Conductores — tipo doc + número | ✅ | ✅ | Mostrado | `conductor.tipoDocumento + numeroDocumento` | |
| Conductores — licencia | ✅ | ✅ | Mostrado | `conductor.numeroLicencia` | |
| Transportista — nombre | — | ✅ | Mostrado | `tp.transportistaNombre` | |
| Transportista — RUC | — | ✅ | Mostrado | `tp.transportistaNumeroDocumento` | |
| Transportista — tipo doc | — | ❌ | Falta | `tp.transportistaTipoDocumento` | Existe en modelo, no impreso |
| Transportista — registro MTC | — | ✅ | Mostrado | `tp.registroMTC` | |
| Indicador transbordo | ❌ | ❌ | Falta | `tp.transbordo` | Existe en modelo, no impreso |
| Indicador retorno vehículo vacío | ❌ | — | Falta | `tp.retornoVehiculoVacio` | Solo en privado, existe en modelo |
| Indicador retorno envases | ❌ | ❌ | Falta | `tp.retornoEnvases` | Existe en modelo, no impreso |

### Documentos relacionados

| Campo | Estado | Fuente | Observación |
|-------|--------|--------|-------------|
| Tipo de documento | ✅ | `DOCUMENTOS_RELACIONADOS_GRE.find(...)` | Código → descripción |
| Número de documento | ✅ | `doc.numeroDocumento` | |
| Fecha de emisión | ✅ | `doc.fechaEmision` | |
| Origen (INTERNO/EXTERNO) | ✅ | `doc.origen` | |
| RUC emisor externo | ❌ | `doc.rucEmisorExterno` | Existe en modelo, no en print |

### Observaciones e historial

| Campo | Estado | Observación |
|-------|--------|-------------|
| Observaciones | ✅ | Mostrado si existe |
| Historial/trazabilidad | ❌ | No se imprime — solo visible en drawer |

### Diferencias Remitente vs Transportista en impresión actual

Actualmente **no hay diferenciación** visual ni estructural entre GRE Remitente y GRE Transportista en `imprimirGuiaGRE.ts`. Ambos usan exactamente el mismo template HTML. Las diferencias necesarias:

| Diferencia | Remitente | Transportista |
|-----------|-----------|---------------|
| Encabezado normativo | "GUÍA DE REMISIÓN REMITENTE" | "GUÍA DE REMISIÓN TRANSPORTISTA" |
| Código de documento SUNAT | 09 | 31 |
| Serie válida | T001 | V001 |
| Actor principal | Variable por motivo (destinatario/proveedor/etc.) | Remitente (quien contrata el transporte) |
| Sección transportista | No siempre aplica | Siempre aplica (datos del propio transportista) |
| Autorización especial emisor | Puede aplica | Aplica (del transportista) |

---

## 5. GRE Ticket

### Estado actual

**NO EXISTE** representación en formato ticket para GRE. Ningún archivo en el módulo `guias-remision` implementa ni referencia un formato de impresión térmica (58mm/80mm).

### Sistema de ticket disponible en comprobantes

El módulo de comprobantes tiene:
- `PreviewTicket.tsx` — Componente React para ticket 58mm/80mm
- `useVoucherDesignConfigReader('TICKET')` — Configuración de ticket
- `VoucherDesignTicketConfig` — Con `general.anchoMm`, `typography`, `qrCode`, `separators`
- `ServicioImpresionComprobante` — Soporta formato TICKET

### ¿Corresponde ticket para GRE?

**Decisión de negocio pendiente.** La GRE es un documento legal con muchos campos (bienes, transporte, vehículos, conductores). Un ticket de 58mm/80mm difícilmente puede representar todo el contenido de forma legible. Opciones:

1. **Ticket de resumen** — Solo número, tipo, destinatario, fecha. Útil para identificación rápida.
2. **Ticket completo** — Fuente muy pequeña, poco práctico.
3. **Sin ticket** — Solo formato A4 para GRE.

### Brechas y riesgos

| Brecha | Riesgo | Recomendación |
|--------|--------|---------------|
| No existe `RepresentacionTicketGRE.tsx` | Bajo — no hay demanda clara aún | Evaluar en fase 4A |
| Sistema de ticket de comprobantes no es directamente reutilizable | Medio — acoplado a `PreviewData` de comprobantes | Crear componente propio si se decide implementar |

---

## 6. PDF

### Estado actual

**No existe generación real de PDF en ningún módulo de SenciYo.**

| Aspecto | GRE | Comprobantes |
|---------|-----|--------------|
| Librería PDF instalada | ❌ No | ❌ No |
| Botón "Descargar PDF" | ❌ No existe | 🟡 Stub vacío (`console.log` en `PreviewModal.tsx` línea 72-75) |
| Botón "Imprimir" | ✅ Conectado a `imprimirGuiaGRE()` | ✅ Conectado a `imprimirComprobante()` |
| Técnica de impresión | `window.open()` + `document.write()` + `window.print()` | iframe + render React + CSS copy + `window.print()` |
| Integración diseño | ❌ HTML hardcodeado | ✅ Lee `VoucherDesignConfig` |
| QR en print | ❌ No | ✅ Sí (en comprobantes) |

### Diferenciación de conceptos

| Concepto | GRE | Descripción |
|----------|-----|-------------|
| Vista previa | ❌ No existe | Renderizado en pantalla antes de imprimir |
| Imprimir | ✅ `imprimirGuiaGRE()` | Abre nueva ventana, llama `window.print()` |
| Descargar PDF | ❌ No existe | Genera archivo .pdf descargable |
| Representación impresa | 🟡 Parcial | El HTML de `imprimirGuiaGRE.ts` es la RI actual |
| Ticket | ❌ No existe | Formato 58/80mm para impresoras térmicas |

### Brechas y recomendación

Para implementar "Descargar PDF" real hay dos opciones:

**Opción A — Client-side (librería JS):**
- `@react-pdf/renderer` — Genera PDF desde JSX. Buena DX, limitaciones CSS.
- `jsPDF` + `html2canvas` — Captura DOM como imagen. Calidad variable.
- `pdf-lib` — Bajo nivel, control total, más trabajo.

**Opción B — Server-side:**
- Endpoint que recibe HTML/datos y genera PDF con Puppeteer/Chromium.
- Mejor calidad, sin dependencias en el cliente.
- Requiere infraestructura backend.

**Recomendación:** Fase 4B diferida. Decidir opción antes de implementar. Mientras tanto, `window.print()` es aceptable para prototipo funcional.

---

## 7. XML

### Estado actual

**No existe ningún generador XML para GRE.** Tampoco existe para comprobantes — el flujo de comprobantes envía datos al API SUNAT que retorna el XML firmado.

### Datos disponibles en el modelo para construir XML UBL

| Campo XML GRE (UBL) | Existe en modelo | Fuente de verdad | Observación |
|--------------------|-----------------|------------------|-------------|
| Tipo de documento (09/31) | ✅ | `TIPO_GRE_CODIGO_DOCUMENTO[guia.tipo]` | Calculado |
| Serie | ✅ | `guia.serie` | |
| Correlativo | ✅ | `guia.correlativo` | Puede ser undefined en borrador |
| Fecha de emisión | ✅ | `guia.fechaEmision` | |
| RUC emisor | ❌ Falta en guia | `activeWorkspace.ruc` | Debe venir de establecimiento/empresa |
| Razón social emisor | ❌ Falta en guia | `activeWorkspace.razonSocial` | Debe venir de establecimiento/empresa |
| Motivo de traslado | ✅ | `guia.motivoTraslado` | Catálogo `MOTIVOS_TRASLADO` |
| Modalidad transporte | ✅ | `guia.modalidadTransporte` | '01' público, '02' privado |
| Destinatario — RUC/DNI | ✅ | `guia.destinatarioNumeroDocumento` | |
| Destinatario — tipo doc | ✅ | `guia.destinatarioTipoDocumento` | |
| Destinatario — nombre | ✅ | `guia.destinatarioNombre` | |
| Punto partida — dirección | ✅ | `guia.puntoPartida.direccion` | |
| Punto partida — ubigeo | ✅ | `guia.puntoPartida.ubigeo` | Opcional en modelo, obligatorio en XML |
| Punto llegada — dirección | ✅ | `guia.puntoLlegada.direccion` | |
| Punto llegada — ubigeo | ✅ | `guia.puntoLlegada.ubigeo` | Opcional en modelo, obligatorio en XML |
| Peso bruto total | ✅ | `guia.pesoTotal` | |
| Unidad de peso (KGM/TNE) | ✅ | `guia.unidadPeso` | |
| Bienes — descripción | ✅ | `bien.descripcion` | |
| Bienes — cantidad | ✅ | `bien.cantidad` | |
| Bienes — unidad medida | ✅ | `bien.unidad` | Código SUNAT (NIU, KGM...) |
| Bienes — código bien | ✅ | `bien.codigoBien` | |
| Bienes — codigoProductoSunat | ✅ | `bien.codigoProductoSunat` | Para bienes normalizados |
| Bienes — subpartida nacional | ✅ | `bien.codigoSubpartidaNacional` | Opcional |
| Bienes — GTIN | ✅ | `bien.codigoGTIN` | Opcional |
| Bienes — peso por línea | ✅ | `bien.pesoLineaKg` | |
| Bienes — descripción detallada | ❌ Falta campo | — | Modelo solo tiene `descripcion`; XML puede requerir `descripcionDetallada` adicional |
| Transporte privado — vehículo principal placa | ✅ | Via `vehiculosDataSource.getById()` | |
| Transporte privado — conductor doc/licencia | ✅ | Via `conductoresDataSource.getById()` | |
| Transporte privado — indicador transbordo | ✅ | `tp.transbordo` | |
| Transporte privado — retorno vacío | ✅ | `tp.retornoVehiculoVacio` | |
| Transporte privado — retorno envases | ✅ | `tp.retornoEnvases` | |
| Transporte privado — M1/L | ✅ | `tp.esM1oL` | |
| Transporte público — transportista RUC | ✅ | `tp.transportistaNumeroDocumento` | |
| Transporte público — transportista tipo doc | ✅ | `tp.transportistaTipoDocumento` | |
| Transporte público — registro MTC | ✅ | `tp.registroMTC` | |
| Documentos relacionados — tipo | ✅ | `doc.tipoDocumentoCodigo` | |
| Documentos relacionados — número | ✅ | `doc.numeroDocumento` | |
| Documentos relacionados — fecha | ✅ | `doc.fechaEmision` | |
| Comprador (motivo 03) | ✅ | `guia.compradorNombre/NumeroDoc/TipoDoc` | |
| Especificación motivo (motivo 13) | ✅ | `guia.especificacionMotivo` | |
| Autorización especial vehículo | ✅ | `vehiculo.codigoEntidadAutorizadora + numeroAutorizacion` | |
| Autorización especial emisor | ✅ | `datosTransportistaDataSource` | Leído por `useEstadoConfiguracionGRE` |
| Firma digital | ❌ No existe | Certificado digital | Requiere integración PKI |

### Archivos que deberían crearse en fase 4C

```
guias-remision/xml/
├── generadorXMLGRE.ts          — Transforma GuiaRemision → string XML UBL
├── mapperGREaUBL.ts            — Mapea campos del modelo a estructura XML
├── validadorXMLGRE.ts          — Valida contra XSD antes de enviar
└── tiposXMLGRE.ts              — Interfaces TypeScript para estructura UBL
```

---

## 8. Modal de emisión exitosa y acciones

### Estado actual

**Archivo:** `guias-remision/components/modales/ModalEmisionExitosaGRE.tsx`

| Elemento | Estado | Observación |
|----------|--------|-------------|
| Tipo GRE mostrado | ✅ | `TIPO_GRE_LABELS[guia.tipo]` |
| Número de guía | ✅ | `serie-correlativo` o `serie-[pendiente]` |
| Ícono de éxito | ✅ | `CheckCircle2` verde |
| Destinatario | ✅ | `guia.destinatarioNombre` |
| Fecha de emisión | ✅ | `guia.fechaEmision` |
| Estado (badge) | 🔴 Bug | Muestra `{guia.estado}` raw — debe usar `getEstadoGRELabel(guia.estado)` |
| Botón Nueva GRE | ✅ | `onNuevaGRE(guia.tipo)` |
| Botón Ver detalle | ✅ | `onVerDetalle(guia)` |
| Botón Imprimir | ✅ | `onImprimir(guia)` — conectado a `imprimirGuiaGRE` |
| Botón Ir al listado | ✅ | `onIrAlListado()` |
| Botón Descargar PDF | ❌ Falta | No existe prop ni botón |
| Botón Copiar número | ❌ Falta | No existe |
| Botón Ver XML | ❌ Falta | No corresponde aún (XML no implementado) |

**Bug identificado (línea 65):**
```tsx
// ACTUAL (incorrecto):
<span className="... bg-yellow-100 text-yellow-700 ...">
  {guia.estado}   {/* → muestra "Pendiente" crudo */}
</span>

// CORRECTO (debe usar):
import { getEstadoGRELabel } from '../../logica/estadosGRE';
{getEstadoGRELabel(guia.estado)}  {/* → muestra "Enviado" */}
```

### ¿Debe mostrarse "Pendiente" o "Enviado"?

`getEstadoGRELabel()` ya mapea correctamente: `Pendiente → "Enviado"`. El estado interno `Pendiente` es correcto para el prototipo (estado local antes de confirmación SUNAT). El label visual debe ser "Enviado", no "Pendiente". El bug es que el modal no usa `getEstadoGRELabel()`.

---

## 9. Listado, drawer y estados

### Listado (TablaGuias.tsx + GuiasRemision.tsx)

| Acción | Disponible | Conectada a print real | Condición |
|--------|-----------|----------------------|-----------|
| Imprimir | ✅ | ✅ `imprimirGuiaGRE()` | `!esBorrador` |
| Anular | ✅ | N/A | `!esBorrador && puedeAnularGRE` |
| Editar | ✅ | N/A | `esBorrador` |
| Eliminar borrador | ✅ | N/A | `esBorrador` |
| Ver detalle | ✅ | N/A | Siempre |
| Duplicar | ✅ | N/A | `!esBorrador` |
| Descargar PDF | ❌ Falta | — | — |
| Ver XML | ❌ Falta | — | — |
| Reenviar a SUNAT | ❌ Falta | — | Fase futura |

### Drawer de detalle (DrawerDetalleGRE.tsx)

| Componente | Estado | Observación |
|-----------|--------|-------------|
| Tab General | ✅ | Destinatario, actor secundario, datos generales, puntos traslado, peso, observaciones |
| Tab Bienes | ✅ | Tabla con código, descripción, cantidad, unidad, peso. Falta: codigoProductoSunat, subpartida, GTIN |
| Tab Transporte | ✅ | Privado y público, vehículos con autorizaciones, conductores |
| Tab Documentos | ✅ | Lista documentos relacionados con tipo, número, fecha |
| Tab Historial | ✅ | Timeline de eventos (creación, emisión, anulación...) |
| Acción Imprimir | ✅ | `onImprimir(guia)` — visible para no-borradores |
| Acción Duplicar | ✅ | `onDuplicar(guia)` |
| Acción Anular | ✅ | `onAnular(guia)` — visible si `puedeAnularGRE` |
| Acción Editar | ✅ | `onEditar(guia)` — solo borradores |
| Acción Eliminar borrador | ✅ | `onEliminarBorrador(guia)` — solo borradores |
| Acción Descargar PDF | ❌ Falta | — |
| Acción Ver XML | ❌ Falta | — |

**Brecha menor en Tab Bienes:** `codigoSubpartidaNacional`, `codigoGTIN` no se muestran aunque existen en el modelo.  
**Brecha menor en Tab Transporte (privado):** Para vehículos, se muestra la abreviatura de la entidad autorizadora pero no el número de autorización del vehículo.

### Estados GRE

| Estado interno | Label visual | Badge color | Semántica | Correcto para prototipo |
|----------------|-------------|-------------|-----------|------------------------|
| `Borrador` | "Borrador" | Gris | Aún no emitido localmente | ✅ |
| `Pendiente` | "Enviado" | Azul | Emitido localmente, pendiente confirmación SUNAT | ✅ (correcto para prototipo) |
| `Emitida` | "Emitida" | Azul | ⚠️ Ambiguo — igual color que Pendiente | 🟡 Ver nota |
| `Aceptada` | "Aceptada" | Verde | SUNAT aceptó | ✅ |
| `Observada` | "Observada" | Naranja | SUNAT aceptó con observaciones | 🟡 Ver nota |
| `Rechazada` | "Rechazada" | Rojo | SUNAT rechazó | ✅ |
| `Anulada` | "Anulada" | Gris oscuro | Anulada | ✅ |

**Nota sobre `Emitida`:** Tiene el mismo color de badge que `Pendiente`. Si se usa `Emitida` como "emitida y confirmada por SUNAT" equivale a `Aceptada`. Riesgo de confusión semántica. No cambiar todavía — evaluar antes de integración SUNAT real.

**Nota sobre `Observada`:** SUNAT en GRE puede responder "aceptada con observaciones". El estado `Observada` es una adaptación razonable. Sin embargo, el flujo exacto debe validarse contra la documentación del API SUNAT/OSE.

---

## 10. Configuración previa obligatoria

### Estado actual

| Componente | Estado | Archivo | Observación |
|-----------|--------|---------|-------------|
| Banner de credenciales | ✅ Funcional | `BannerConfiguracionGRE.tsx` | Aparece si `!credencialesCompletas` |
| Modal de configuración | ✅ Completo | `ModalConfiguracionGRE.tsx` | SOL + GRE + autorización especial emisor |
| Toast al guardar | ✅ Implementado | `useFeedback()` desde `@/shared/feedback` | Texto: "Credenciales SUNAT registradas/actualizadas" |
| Refresco automático | ✅ Wired | `GuiasRemision.tsx` línea 379 | `onGuardado={() => { refrescar(); }}` |
| Bloqueo de emisión | ✅ | `FormularioGREPage.tsx` | `puedeEmitirPorConfiguracion` bloquea botón |
| Credenciales SOL | ✅ Opcional guardar vacío | `FormularioAccesoSOL.tsx` | Validación required eliminada en corrección reciente |
| Credenciales GRE | ✅ Opcional guardar vacío | `FormularioCredencialesGRE.tsx` | Validación required eliminada en corrección reciente |
| Series preconfiguradas | ✅ No bloquean | `validacionGRE.ts` + `FormularioGREPage.tsx` | Solo verifican que serie no esté vacía |
| Autorización especial emisor | ✅ Opcional | `ModalConfiguracionGRE.tsx` bloque C | Viene de `datosTransportistaDataSource` |
| Borrar credenciales | ✅ Posible | Datasource acepta campos vacíos | Usuario puede limpiar y guardar |
| Banner en formulario GRE | 🟡 Verificar | `FormularioGREPage.tsx` | Debe estar; confirmar que refleja el refrescar() del modal |

### Flujo conceptual verificado

```
Usuario sin credenciales
  └── Banner visible en listado        ✅
  └── Banner visible en formulario     🟡 verificar
  └── Botón "Emitir GRE" deshabilitado ✅

Usuario abre ModalConfiguracionGRE
  └── Carga datos existentes           ✅ (SOL + GRE + autorizacion)
  └── Puede guardar vacío              ✅
  └── Toast en éxito                   ✅
  └── Modal se cierra automáticamente  ✅
  └── refrescar() se llama             ✅
  └── Banner desaparece                ✅
  └── Botón "Emitir GRE" se habilita  ✅

Usuario borra credenciales desde ConfiguracionConexionSunat
  └── Puede guardar vacío              ✅ (validación required eliminada)
  └── Hook useEstadoConfiguracionGRE recalcula en próximo render ✅
  └── Banner vuelve a aparecer         ✅
```

---

## 11. Hallazgos críticos

### P0 — Bloqueante para envío real a SUNAT

| # | Hallazgo | Archivo | Impacto |
|---|----------|---------|---------|
| P0-01 | **Sin generador XML UBL para GRE** | Ninguno — no existe | Sin XML no se puede enviar a SUNAT |
| P0-02 | **Sin firma digital** | Ninguno — no existe | XML sin firma es inválido en SUNAT |
| P0-03 | **Sin API client SUNAT/OSE** | Ninguno — no existe | Sin cliente no hay envío real |
| P0-04 | **Ubigeo de puntos de traslado es opcional en modelo** pero obligatorio en XML | `GuiaRemision.ts` línea 46-50 | XML puede ser rechazado si ubigeo falta |

### P1 — Importante para prototipo funcional completo

| # | Hallazgo | Archivo | Impacto |
|---|----------|---------|---------|
| P1-01 | **`imprimirGuiaGRE.ts` no usa sistema de diseño** | `imprimirGuiaGRE.ts` | Impresión GRE desconectada de logo/watermark/footer configurado |
| P1-02 | **Modal emisión exitosa muestra `guia.estado` raw** | `ModalEmisionExitosaGRE.tsx` línea 65 | Muestra "Pendiente" en vez de "Enviado" |
| P1-03 | **Campos SUNAT de bienes no aparecen en impresión** | `imprimirGuiaGRE.ts` | codigoProductoSunat, subpartida, GTIN ignorados |
| P1-04 | **Sin "Descargar PDF" en ningún punto de la UI** | `ModalEmisionExitosaGRE.tsx`, `DrawerDetalleGRE.tsx`, `TablaGuias.tsx` | Usuario no puede obtener PDF descargable |
| P1-05 | **Indicadores de transporte no aparecen en impresión** | `imprimirGuiaGRE.ts` | transbordo, retorno vacío, retorno envases ignorados |
| P1-06 | **Comprador (motivo 03) no aparece en impresión** | `imprimirGuiaGRE.ts` | `guia.compradorNombre` ignorado |
| P1-07 | **Ubigeo no aparece en impresión** | `imprimirGuiaGRE.ts` | Puntos de traslado sin ubigeo |
| P1-08 | **Sin QR de consulta SUNAT en impresión** | `imprimirGuiaGRE.ts` | Comprobantes lo tienen; GRE no |
| P1-09 | **Tab Bienes en drawer no muestra codigoSubpartidaNacional, GTIN** | `DrawerDetalleGRE.tsx` líneas 351-406 | Información disponible en modelo pero no visible |

### P2 — Mejora

| # | Hallazgo | Archivo | Impacto |
|---|----------|---------|---------|
| P2-01 | **`Emitida` y `Pendiente` tienen el mismo badge color** | `estadosGRE.ts` líneas 27-28 | Puede confundir en el listado |
| P2-02 | **`transportistaTipoDocumento` no aparece en impresión** | `imprimirGuiaGRE.ts` | Existe en modelo, falta en print |
| P2-03 | **Número de autorización del vehículo no se muestra en impresión** | `imprimirGuiaGRE.ts` línea 71 | Solo abreviatura de entidad |
| P2-04 | **`rucEmisorExterno` de documentos relacionados no se imprime** | `imprimirGuiaGRE.ts` | Dato disponible en modelo |
| P2-05 | **Impresión usa `window.open()`+`document.write()`** en vez del servicio iframe de comprobantes | `imprimirGuiaGRE.ts` líneas 196-201 | Técnica inferior; no hereda estilos Tailwind |
| P2-06 | **Sin ticket GRE** | — | No existe; decisión de negocio pendiente |
| P2-07 | **Banner en formulario GRE no verificado** | `FormularioGREPage.tsx` | Puede necesitar refrescar manual |

---

## 12. Plan recomendado por fases

### Fase 4A — Normalizar representación impresa A4

**Objetivo:** Que la impresión GRE use el sistema centralizado de diseño (logo, marca de agua, pie de página) y complete todos los campos que existen en el modelo.

**Archivos candidatos:**
- Nuevo: `guias-remision/impresion/RepresentacionImpresaGRE.tsx` — Componente React que renderiza la GRE usando `useVoucherDesignConfigReader('A4')`
- Modificar: `guias-remision/impresion/imprimirGuiaGRE.ts` — Usar `ServicioImpresionComprobante` con el nuevo componente
- Nuevo: `guias-remision/impresion/RepresentacionTicketGRE.tsx` — Opcional, si se decide soportar ticket

**Qué reutilizar:**
- `useVoucherDesignConfigReader('A4')` para logo, watermark, footer
- `ServicioImpresionComprobante.imprimirComprobante()` para el iframe
- `formatearPlaca`, `nombreCompletoConductor` ya importados

**Qué NO tocar:**
- `VoucherDesignUnified.ts` — No agregar campos GRE al modelo de comprobantes
- `PreviewDocument.tsx` / `PreviewTicket.tsx` — No mezclar modelos

**Riesgos:**
- Llamadas async a `vehiculosDataSource.list()` y `conductoresDataSource.list()` dentro del componente — usar `useEffect` o resolver antes de pasar datos al componente
- El sistema de diseño no tiene campos GRE (motivo, bienes de traslado, puntos) — GRE maneja su propio template de contenido; solo comparte logo/watermark/footer

**Validación esperada:** `npm run lint` y `npm run build` sin errores. Print visual completo con logo (si configurado), todos los campos del modelo, indicadores de transporte.

---

### Fase 4B — Descargar PDF / Imprimir desde todos los puntos

**Objetivo:** Agregar botón "Descargar PDF" en ModalEmisionExitosaGRE, DrawerDetalleGRE y TablaGuias.

**Decisión previa requerida:** Elegir entre librería client-side o servicio backend para PDF real. Si se opta por `window.print()` → PDF del navegador, el trabajo es solo agregar el botón con el mismo handler de impresión.

**Archivos candidatos:**
- Modificar: `ModalEmisionExitosaGRE.tsx` — Agregar prop `onDescargarPDF`, botón, y corregir bug de estado
- Modificar: `DrawerDetalleGRE.tsx` — Agregar botón "Descargar PDF"
- Modificar: `TablaGuias.tsx` — Agregar acción en menú

**Qué NO tocar:** `ServicioImpresionComprobante.ts`, `PreviewDocument.tsx`

**Fix incluido en esta fase:**
```tsx
// ModalEmisionExitosaGRE.tsx línea 65 — cambiar:
{guia.estado}
// por:
{getEstadoGRELabel(guia.estado)}
```

**Validación esperada:** PDF descargable funcional desde los 3 puntos de entrada.

---

### Fase 4C — Generador XML GRE desacoplado

**Objetivo:** Crear la infraestructura para transformar `GuiaRemision` → XML UBL, sin enviar a SUNAT.

**Archivos candidatos a crear:**
```
guias-remision/xml/
├── generadorXMLGRE.ts          — Función principal: GuiaRemision + EmpresaGRE → string XML
├── mapperGREaUBL.ts            — Mapeo campo a campo según especificación SUNAT
├── tiposXMLGRE.ts              — Interfaces TypeScript para la estructura UBL (sin usar librerías XML)
└── __tests__/generadorXMLGRE.test.ts  — Tests unitarios contra XML de referencia
```

**Fuentes de datos necesarias para el XML (que no están en GuiaRemision directamente):**
- RUC y razón social del emisor → `activeWorkspace`
- Ubigeo de puntos de traslado → asegurar que siempre se captura en el formulario
- Placa y datos de vehículo → `vehiculosDataSource.getById()`
- Datos de conductor → `conductoresDataSource.getById()`
- Autorización especial emisor → `datosTransportistaDataSource.get()`

**Qué reutilizar:** Solo los catálogos (`catalogosGRE.ts`) para resolver códigos.

**Qué NO hacer:** No llamar a SUNAT, no firmar digitalmente, no enviar.

**Riesgos:**
- Ubigeo opcional en el modelo puede generar XML inválido — considerar validar `ubigeo` como requerido antes de llamar al generador
- Especificación UBL de GRE Remitente y Transportista tienen diferencias — el generador debe bifurcar por `guia.tipo`

**Validación esperada:** `generadorXMLGRE(guia, empresa)` devuelve string XML válido contra XSD SUNAT. Sin `npm run build` errors.

---

### Fase 4D — Validación previa XML y representación impresa

**Objetivo:** Validar que el XML es correcto antes de presentarlo al usuario o al API SUNAT.

**Archivos candidatos:**
```
guias-remision/xml/validadorXMLGRE.ts   — Valida estructura mínima sin XSD externo
guias-remision/logica/validacionGRE.ts  — Agregar validación de ubigeo y campos XML obligatorios
```

**Qué reutilizar:** `validacionGRE.ts` existente — ampliar, no reemplazar.

**Qué NO tocar:** Lógica de formulario de emisión actual.

**Validación esperada:** Si `validarGREParaEmitir()` pasa, el XML generado debe ser structuralmente correcto.

---

### Fase futura — Envío real a SUNAT

**No implementar en esta fase.** Prerequisitos:
- XML generado y validado (Fase 4C + 4D)
- Firma digital implementada (certificado X.509)
- API client SUNAT/OSE configurado
- Credenciales reales (no en localStorage, sino en servidor seguro)

---

## 13. Conclusión

### Qué tan listo está el módulo

El módulo GRE está **funcional como prototipo local** con:
- ✅ Formulario completo (6 secciones, adaptativo por motivo/tipo)
- ✅ Listado con filtros, columnas, borradores
- ✅ Drawer con 5 tabs informativos
- ✅ Estados correctamente implementados
- ✅ Duplicar, anular, eliminar borrador
- ✅ Impresión básica funcional (aunque mejorable)
- ✅ Configuración previa SUNAT + autorización especial emisor
- ✅ Series T001/V001 preconfiguradas

### Qué falta antes de considerarlo prototipo funcional completo

1. **Representación impresa A4 completa** — Fase 4A (P1): campos SUNAT de bienes, indicadores de transporte, logo, watermark, footer
2. **Bug en modal emisión exitosa** — Estado "Pendiente" debe mostrarse como "Enviado" (P1, cambio trivial)
3. **Campos GTIN, subpartida en Tab Bienes del drawer** — Mejora visual (P2)
4. **Sin PDF descargable** — Fase 4B, depende de decisión de librería

### Qué NO se debe hacer todavía

- ❌ No conectar con API SUNAT real — falta XML, firma digital y credenciales seguras
- ❌ No copiar `PreviewDocument.tsx` para GRE — modelos incompatibles
- ❌ No agregar campos de comprobante (precio, IGV) al modelo GuiaRemision — la GRE no tiene importes
- ❌ No implementar ticket GRE sin decisión de negocio previa
- ❌ No modificar `VoucherDesignUnified.ts` para campos GRE — el sistema de diseño es genérico (logo/watermark/footer aplica a todos los documentos)
- ❌ No generar XML con datos hardcodeados de empresa — siempre desde `activeWorkspace`

---

## Verificación

- **Archivos modificados:** Solo `AUDITORIA_GRE_IMPRESION_XML_PDF.md` (este archivo)
- **Código productivo modificado:** No
- **`npm run lint`:** No requerido — solo se creó un archivo `.md`
- **`npm run build`:** No requerido — solo se creó un archivo `.md`
