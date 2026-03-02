# Roadmap SenciYo para Portal PM (versión única y ordenada)

## 0) Cómo usar este documento sin confundirte

- Este documento define una sola nomenclatura oficial para todo el Portal PM.
- Debes crear 3 objetivos por separado: MVP1, MVP2 y MVP3.
- Primero carga MVP1 completo. Luego MVP2 y MVP3.
- Si un valor de estado no existe en tu catálogo, usa el equivalente activo y marca NO CONFIRMADO en la descripción.

---

## 1) Nomenclatura oficial (usar exactamente estos nombres)

### 1.1 Objetivos (3)

1. MVP1 - Primera venta emitida y cierre de caja básico  
2. MVP2 - Operación diaria robusta  
3. MVP3 - Escalamiento y madurez

### 1.2 Iniciativas

#### MVP1 (máximo 6)
- MVP1.1 - Setup mínimo operativo
- MVP1.2 - Clientes mínimo para emisión
- MVP1.3 - Productos mínimo para emisión
- MVP1.4 - Comprobantes mínimos con IGV y estado
- MVP1.5 - Caja diaria apertura y cierre
- MVP1.6 - Cobranzas resumen operativo

#### MVP2
- MVP2.1 - Personalizaciones operativas
- MVP2.2 - Exportaciones y vistas mejoradas
- MVP2.3 - Flujos comerciales extendidos

#### MVP3
- MVP3.1 - Inventario y control avanzado
- MVP3.2 - Reportes avanzados y analítica
- MVP3.3 - Gobierno de datos y operación multi-equipo

### 1.3 Entregas

#### MVP1
- MVP1.1.1 - Setup inicial completo
- MVP1.1.2 - Verificación de estado de setup
- MVP1.2.1 - Registro y edición básica de clientes
- MVP1.3.1 - Catálogo básico utilizable en venta
- MVP1.4.1 - Emisión tradicional con IGV operativa
- MVP1.4.2 - Estado de comprobante visible y trazable
- MVP1.5.1 - Apertura de caja diaria
- MVP1.5.2 - Cierre de caja diario básico
- MVP1.6.1 - Resumen mínimo de cobranzas

#### MVP2
- MVP2.1.1 - Preferencias operativas base
- MVP2.2.1 - Exportaciones y columnas ampliadas
- MVP2.3.1 - Cobertura funcional comercial ampliada

#### MVP3
- MVP3.1.1 - Control integral de inventario
- MVP3.2.1 - Reportería avanzada gerencial
- MVP3.3.1 - Gobernanza y escalamiento operativo

---

## 2) Orden exacto de carga en el Portal PM

1. Objetivos (crear los 3).
2. Iniciativas MVP1 (las 6).
3. Entregas MVP1 (las 9).
4. Matriz de valor (primero iniciativas MVP1).
5. Decisiones (ADR) MVP1.
6. Validación: Plantillas → Planes → Ejecuciones.
7. Recién después cargar MVP2 y MVP3 (iniciativas + entregas).

---

## 3) Guía de llenado por entidad (campo por campo)

## 3.1 Objetivos

| Campo | Qué poner |
|---|---|
| Nombre | Usar exactamente los 3 nombres oficiales de la sección 1.1 |
| Descripción | Resultado + KPI + fecha objetivo + definición de éxito (en un texto corto) |
| Estado | Pendiente (recomendado para carga inicial) |
| Prioridad | MVP1: Alta / MVP2: Media / MVP3: Media |

Reglas clave:
- Nombre: 3 a 120 caracteres.
- Descripción: 5 a 500 caracteres.

### Objetivos listos para copiar/pegar

| Nombre | Descripción | Estado | Prioridad |
|---|---|---|---|
| MVP1 - Primera venta emitida y cierre de caja básico | Resultado: habilitar setup mínimo, clientes, productos, comprobantes con IGV y estado, caja apertura/cierre y cobranzas resumen. KPI: primera emisión <= 30 min; tasa de emisión exitosa >= 95%; cierre diario >= 90%. Fecha objetivo: 2026-04-30. Éxito: vender y cerrar jornada sin soporte técnico. | Pendiente | Alta |
| MVP2 - Operación diaria robusta | Resultado: robustecer operación con personalizaciones, exportaciones y más control operativo. KPI: reprocesos -40% vs MVP1; errores diarios <= 2%; adopción de funciones de productividad >= 60%. Fecha objetivo: 2026-07-31. Éxito: operación estable y con menor retrabajo. | Pendiente | Media |
| MVP3 - Escalamiento y madurez | Resultado: escalar con capacidades avanzadas de operación y gestión. KPI: disponibilidad percibida >= 99%; p95 <= 2.5s; retención mensual >= 85%. Fecha objetivo: 2026-10-31. Éxito: operación madura para crecimiento sostenido. | Pendiente | Media |

---

## 3.2 Iniciativas

| Campo | Qué poner |
|---|---|
| Objetivo | Seleccionar objetivo correcto (MVP1, MVP2 o MVP3) |
| Nombre | Usar exactamente los nombres oficiales de sección 1.2 |
| Descripción | 4 bloques: IN / OUT / Dependencias / Riesgo principal + Owner sugerido |
| Alcance | 1 a 100 |
| Impacto | 1 a 100 |
| Confianza | 1 a 100 |
| Esfuerzo | 1 a 100 |
| Estado | Pendiente |
| Prioridad | Alta o Media según tabla |

Reglas clave:
- Nombre: 3 a 120.
- Descripción: 5 a 500.
- RICE se calcula automático.

### Iniciativas MVP1 listas para copiar/pegar

| Objetivo | Nombre | Descripción | Alcance | Impacto | Confianza | Esfuerzo | Estado | Prioridad |
|---|---|---|---:|---:|---:|---:|---|---|
| MVP1 - Primera venta emitida y cierre de caja básico | MVP1.1 - Setup mínimo operativo | IN: datos mínimos para operar y habilitar primera venta. OUT: personalizaciones avanzadas. Dependencia: ninguna funcional. Riesgo principal: datos incompletos bloqueen emisión. Owner sugerido: Admin. | 85 | 95 | 80 | 35 | Pendiente | Alta |
| MVP1 - Primera venta emitida y cierre de caja básico | MVP1.2 - Clientes mínimo para emisión | IN: alta/edición básica y selección en comprobante. OUT: segmentación y campos avanzados. Dependencia: setup mínimo. Riesgo principal: fricción en alta rápida. Owner sugerido: Vendedor. | 80 | 85 | 80 | 30 | Pendiente | Alta |
| MVP1 - Primera venta emitida y cierre de caja básico | MVP1.3 - Productos mínimo para emisión | IN: catálogo básico y uso en comprobante. OUT: variantes/filtros avanzados. Dependencia: setup mínimo. Riesgo principal: inconsistencias de datos de producto. Owner sugerido: Admin. | 80 | 85 | 75 | 35 | Pendiente | Alta |
| MVP1 - Primera venta emitida y cierre de caja básico | MVP1.4 - Comprobantes mínimos con IGV y estado | IN: emisión tradicional con IGV y flujo emitir/obtener estado. OUT: personalizaciones avanzadas y casos extendidos. Dependencias: setup + clientes + productos. Riesgo principal: fallas de estado afecten operación. Owner sugerido: Admin + Contador. | 95 | 100 | 75 | 45 | Pendiente | Alta |
| MVP1 - Primera venta emitida y cierre de caja básico | MVP1.5 - Caja diaria apertura y cierre | IN: apertura y cierre diario con resumen básico. OUT: arqueo avanzado y conciliación compleja. Dependencia: operación de emisión activa. Riesgo principal: diferencias de jornada. Owner sugerido: Admin. | 75 | 90 | 75 | 35 | Pendiente | Alta |
| MVP1 - Primera venta emitida y cierre de caja básico | MVP1.6 - Cobranzas resumen operativo | IN: vista resumen de cobranzas. OUT: gestión detallada y conciliación avanzada. Dependencia: comprobantes mínimos. Riesgo principal: interpretación sin detalle. Owner sugerido: Contador. | 60 | 70 | 70 | 25 | Pendiente | Media |

---

## 3.3 Entregas

| Campo | Qué poner |
|---|---|
| Iniciativa | Seleccionar iniciativa correcta |
| Nombre | Usar exactamente los nombres oficiales de sección 1.3 |
| Descripción | Terminado + Aceptación en texto breve |
| Fecha objetivo | Fecha tentativa realista |
| Estado | Pendiente |
| Prioridad | Alta/Media según entrega |

### Entregas MVP1 listas para copiar/pegar

| Iniciativa | Nombre | Descripción | Fecha objetivo | Estado | Prioridad |
|---|---|---|---|---|---|
| MVP1.1 - Setup mínimo operativo | MVP1.1.1 - Setup inicial completo | Terminado: datos mínimos completos y listos para operar. Aceptación: se habilita emisión sin bloqueo por configuración faltante. | 2026-03-28 | Pendiente | Alta |
| MVP1.1 - Setup mínimo operativo | MVP1.1.2 - Verificación de estado de setup | Terminado: estado de completitud claro. Aceptación: Admin identifica en <= 2 minutos qué falta para operar. | 2026-04-02 | Pendiente | Alta |
| MVP1.2 - Clientes mínimo para emisión | MVP1.2.1 - Registro y edición básica de clientes | Terminado: alta y edición básica disponibles. Aceptación: cliente nuevo se selecciona y usa en emisión. | 2026-04-05 | Pendiente | Alta |
| MVP1.3 - Productos mínimo para emisión | MVP1.3.1 - Catálogo básico utilizable en venta | Terminado: alta/edición básica disponible. Aceptación: producto nuevo se usa en emisión exitosa. | 2026-04-08 | Pendiente | Alta |
| MVP1.4 - Comprobantes mínimos con IGV y estado | MVP1.4.1 - Emisión tradicional con IGV operativa | Terminado: emisión de punta a punta con IGV. Aceptación: comprobante emitido y registrado sin soporte técnico. | 2026-04-18 | Pendiente | Alta |
| MVP1.4 - Comprobantes mínimos con IGV y estado | MVP1.4.2 - Estado de comprobante visible y trazable | Terminado: estado mínimo posterior a emisión visible. Aceptación: usuario identifica resultado y acción requerida. | 2026-04-20 | Pendiente | Alta |
| MVP1.5 - Caja diaria apertura y cierre | MVP1.5.1 - Apertura de caja diaria | Terminado: inicio de jornada con caja activa. Aceptación: se puede operar el día con apertura registrada. | 2026-04-12 | Pendiente | Alta |
| MVP1.5 - Caja diaria apertura y cierre | MVP1.5.2 - Cierre de caja diario básico | Terminado: cierre con resumen básico de jornada. Aceptación: cierre registrado sin bloqueos críticos. | 2026-04-25 | Pendiente | Alta |
| MVP1.6 - Cobranzas resumen operativo | MVP1.6.1 - Resumen mínimo de cobranzas | Terminado: vista resumen disponible. Aceptación: Contador/Admin revisa el estado general diario en una sola vista. | 2026-04-26 | Pendiente | Media |

---

## 4) Matriz de valor (lista para cargar)

| Iniciativa | Título | Valor negocio | Esfuerzo | Riesgo | Estado | Prioridad |
|---|---|---:|---:|---:|---|---|
| MVP1.1 - Setup mínimo operativo | MVP1 - Prioridad salida producción: setup | 95 | 35 | 30 | Pendiente | Alta |
| MVP1.4 - Comprobantes mínimos con IGV y estado | MVP1 - Prioridad crítica: emisión y estado | 100 | 45 | 40 | Pendiente | Alta |
| MVP1.5 - Caja diaria apertura y cierre | MVP1 - Prioridad cierre diario | 92 | 35 | 35 | Pendiente | Alta |
| MVP1.2 - Clientes mínimo para emisión | MVP1 - Habilitador de venta: clientes | 88 | 30 | 28 | Pendiente | Alta |
| MVP1.3 - Productos mínimo para emisión | MVP1 - Habilitador de venta: productos | 86 | 35 | 30 | Pendiente | Alta |
| MVP1.6 - Cobranzas resumen operativo | MVP1 - Visibilidad mínima de cobranza | 72 | 25 | 25 | Pendiente | Media |

---

## 5) Decisiones (ADR) lista para cargar

Estado sugerido inicial: Propuesta (si no existe en catálogo, usar equivalente activo y dejar nota NO CONFIRMADO).

| Título | Contexto | Decisión | Alternativas | Impacto | Estado | Owner | Fecha | Iniciativa | Entrega | Ejecución validación | Tags | Links |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ADR-01 Cliente genérico en boleta | MVP1 necesita reducir fricción en primera venta. | Habilitar cliente genérico para boleta en MVP1. | Cliente completo siempre; genérico total; modelo híbrido. | Acelera venta inicial; riesgo de calidad de datos se mitiga en MVP2. | Propuesta | Product Owner | 2026-03-05 | MVP1.4 - Comprobantes mínimos con IGV y estado | MVP1.4.1 - Emisión tradicional con IGV operativa |  | mvp1, boleta, clientes |  |
| ADR-02 Línea libre en emisión | Hay ventas rápidas sin catálogo completo. | NO CONFIRMADO: habilitar línea libre solo con control mínimo. | Solo catálogo; línea libre total; línea libre controlada. | Más flexibilidad con riesgo de inconsistencia si no se controla. | Propuesta | Product Owner | 2026-03-05 | MVP1.4 - Comprobantes mínimos con IGV y estado | MVP1.4.1 - Emisión tradicional con IGV operativa |  | mvp1, emision, productos |  |
| ADR-03 Tipos IGV MVP1 | Se requiere cumplimiento mínimo sin complejidad avanzada. | Soportar set mínimo de IGV para emisión tradicional MVP1. | Cobertura amplia desde inicio; cobertura mínima. | Reduce alcance y riesgo en salida a producción. | Propuesta | Contador | 2026-03-06 | MVP1.4 - Comprobantes mínimos con IGV y estado | MVP1.4.1 - Emisión tradicional con IGV operativa |  | mvp1, igv, comprobantes |  |
| ADR-04 Correlativo y concurrencia | Se necesita numeración trazable para emitir. | Correlativo secuencial por tipo en MVP1; concurrencia avanzada pasa a MVP2. | Reglas avanzadas desde MVP1; secuencial mínimo. | Permite operar rápido con trazabilidad suficiente. | Propuesta | Admin Funcional | 2026-03-06 | MVP1.4 - Comprobantes mínimos con IGV y estado | MVP1.4.2 - Estado de comprobante visible y trazable |  | mvp1, correlativo, numeracion |  |
| ADR-05 Caja obligatoria para emitir | No se debe bloquear ventas por formalidad. | Caja no obligatoria para emitir en MVP1; sí para cierre diario. | Obligatoria siempre; opcional total; enfoque híbrido. | Balancea continuidad comercial y control operativo. | Propuesta | Operaciones | 2026-03-07 | MVP1.5 - Caja diaria apertura y cierre | MVP1.5.2 - Cierre de caja diario básico |  | mvp1, caja, reglas-negocio |  |
| ADR-06 Estados mínimos de comprobante | Se requiere lectura simple post emisión. | Estados mínimos: pendiente, firma_ok, firma_error, anulado si aplica. | Estado único; estado extendido; estado mínimo. | Trazabilidad simple y operativa para MVP1. | Propuesta | Contador | 2026-03-07 | MVP1.4 - Comprobantes mínimos con IGV y estado | MVP1.4.2 - Estado de comprobante visible y trazable |  | mvp1, estados, comprobantes |  |
| ADR-07 Cobranzas solo resumen en MVP1 | MVP1 debe enfocarse en emitir y cerrar jornada. | Limitar cobranzas a sección resumen en MVP1. | Gestión completa; resumen mínimo. | Evita sobrealcance y acelera salida a producción. | Propuesta | Product Owner | 2026-03-08 | MVP1.6 - Cobranzas resumen operativo | MVP1.6.1 - Resumen mínimo de cobranzas |  | mvp1, cobranzas, alcance |  |
| ADR-08 Regla de paso a producción | Se necesita criterio objetivo de go-live. | Pasar a producción solo con validaciones críticas aprobadas y sin bloqueantes. | Fecha fija; checklist simple; umbral validado. | Reduce riesgo operativo en arranque real. | Propuesta | Product Owner | 2026-03-08 | MVP1.1 - Setup mínimo operativo | MVP1.1.1 - Setup inicial completo | Ejecución 02 - Validación integral | mvp1, go-live, validacion |  |

---

## 6) Validación lista para cargar

## 6.1 Plantillas

| Módulo | Nombre | Criterios | Evidencias esperadas | Activa |
|---|---|---|---|---|
| Validación (NO CONFIRMADO: depende de catálogo activo) | Plantilla - MVP1 Setup mínimo operativo | Verificar datos mínimos completos y capacidad de iniciar primera emisión sin bloqueos. | Checklist completo, evidencia de setup finalizado y primer intento de emisión. | Sí |
| Validación (NO CONFIRMADO: depende de catálogo activo) | Plantilla - MVP1 Emisión y estado | Verificar emisión con IGV y trazabilidad del estado post emisión. | Matriz de casos, resultados por caso, evidencia de estados finales. | Sí |
| Validación (NO CONFIRMADO: depende de catálogo activo) | Plantilla - MVP1 Caja apertura/cierre | Verificar apertura y cierre de jornada con consistencia operativa básica. | Registro de apertura/cierre, resumen de jornada y diferencias observadas. | Sí |

## 6.2 Planes

| Módulo | Plantilla | Nombre | Criterios | Evidencias esperadas | Owner | Estado | Fecha inicio | Fecha fin | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Validación (NO CONFIRMADO: depende de catálogo activo) | Plantilla - MVP1 Setup mínimo operativo | Plan MVP1 - Setup listo para operar | Umbral: >=80% sesiones completas en <=30 min; bloqueantes = 0. | Bitácora por sesión, tiempos y evidencia de primera emisión. | QA Funcional | Pendiente | 2026-03-10 | 2026-03-16 | Muestra mínima: 5 cuentas de prueba. |
| Validación (NO CONFIRMADO: depende de catálogo activo) | Plantilla - MVP1 Emisión y estado | Plan MVP1 - Emitir y obtener estado | Umbral: éxito >=95%; p95 <=10s; errores no recuperables <=2%. | Matriz de 50 casos, resultados e incidencias con capturas. | QA Funcional | Pendiente | 2026-03-15 | 2026-03-25 | Cobertura de casos de emisión más frecuentes. |
| Validación (NO CONFIRMADO: depende de catálogo activo) | Plantilla - MVP1 Caja apertura/cierre | Plan MVP1 - Jornada completa de caja | Umbral: >=90% cierres sin bloqueo; diferencias no explicadas <=1/10 jornadas. | Registro de 10 jornadas y análisis de diferencias. | Operaciones | Pendiente | 2026-03-20 | 2026-03-29 | Ejecutar en paralelo con operación de emisión. |

## 6.3 Ejecuciones sugeridas

| Plan | Módulo | Fecha | Desde | Hasta | Resultado | Hallazgos | Evidencia URL | Aprobador | Estado |
|---|---|---|---|---|---|---|---|---|---|
| Plan MVP1 - Setup listo para operar | Validación (NO CONFIRMADO: depende de catálogo activo) | 2026-03-15 | 2026-03-14 | 2026-03-15 | Ejecución 01: validar activación inicial y bloqueos de configuración. | Registrar fallos de datos obligatorios y fricción de carga. | https://evidencias/ejecucion-01 | Líder Producto | Pendiente |
| Plan MVP1 - Emitir y obtener estado | Validación (NO CONFIRMADO: depende de catálogo activo) | 2026-03-22 | 2026-03-20 | 2026-03-22 | Ejecución 02: validar flujo integral de emisión y estado con umbrales. | Registrar rechazos, inconsistencias de estado y causas recurrentes. | https://evidencias/ejecucion-02 | Líder QA | Pendiente |
| Plan MVP1 - Jornada completa de caja | Validación (NO CONFIRMADO: depende de catálogo activo) | 2026-03-29 | 2026-03-24 | 2026-03-29 | Ejecución 03: validar operación diaria completa con cierre de caja. | Registrar diferencias de jornada y causas de cierre incompleto. | https://evidencias/ejecucion-03 | Líder Operaciones | Pendiente |

---

## 7) Checklist final de carga (rápido)

- [ ] Crear 3 Objetivos con los nombres oficiales.
- [ ] Crear 6 Iniciativas MVP1 con prefijo MVP1.x.
- [ ] Crear 9 Entregas MVP1 con prefijo MVP1.x.x.
- [ ] Cargar Matriz de valor para las 6 iniciativas MVP1.
- [ ] Cargar 8 ADR con vínculo a iniciativa/entrega cuando aplique.
- [ ] Cargar 3 Plantillas de validación.
- [ ] Cargar 3 Planes de validación.
- [ ] Cargar 3 Ejecuciones sugeridas.
- [ ] Verificar consistencia de nombres exactamente como en este documento.

---

## 8) Resumen de volumen

- Objetivos: 3
- Iniciativas: 12
- Entregas: 15
- Matriz de valor: 6 (base MVP1)
- ADR: 8
- Plantillas de validación: 3
- Planes de validación: 3
- Ejecuciones sugeridas: 3
