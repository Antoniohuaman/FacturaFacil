# Fase 10 — Claridad semántica de KPIs en PM Portal

## Objetivo

Eliminar la ambigüedad visual entre los cuatro conceptos relacionados con KPI que coexisten en el portal:

| Concepto | Módulo | Ruta |
|---|---|---|
| KPI estratégico | Estrategia | `/estrategia/kpis` |
| KPI ejecutivo | Analítica | `/analitica/kpis` |
| Health score | Analítica | `/analitica/health-scores` |
| KPI config | Ajustes | Panel en `/ajustes` |

---

## Diagnóstico

### Ambigüedad detectada

Antes de esta fase, las páginas `/estrategia/kpis` y `/analitica/kpis` tenían exactamente el mismo `<h1>`: **"KPIs"**. Un usuario con ambas pestañas abiertas no podía distinguirlas por el título de página. Las descripciones y los modales ya usaban los nombres correctos; el `<h1>` era el único punto sin diferenciación.

Health score y KPI config no presentaban ambigüedad: sus títulos ya eran específicos.

### Qué NO era ambiguo (y no se tocó)

- `PaginaHealthScores.tsx`: título "Health scores" — claro.
- `PanelKpisAjustes.tsx`: título "Configuración de KPIs" — claro.
- Modales de todos los formularios: ya usaban "KPI estratégico", "KPI ejecutivo", "health score".
- Menú de navegación: cada sección agrupa sus ítems bajo su contexto (Estrategia / Analítica), sin ambigüedad.

---

## Qué diferencia a cada concepto

### KPI estratégico
- **Vive en**: Estrategia
- **Para qué**: Medir el avance de objetivos estratégicos multiperiodo con semáforo verde/amarillo/rojo.
- **Clave**: Vinculado a un periodo estratégico. Estado de ciclo de vida: pendiente / en progreso / completado.
- **No es**: Un indicador operativo ni ejecutivo. No tiene categoría de módulo.

### KPI ejecutivo
- **Vive en**: Analítica
- **Para qué**: Consolidar la lectura ejecutiva de valor actual vs. meta, con tendencia y estado de salud.
- **Clave**: Categorizado por área funcional (estrategia, delivery, validación, lanzamiento, operación, calidad). Estado de salud: saludable / atención / riesgo.
- **No es**: Un KPI ligado a un periodo estratégico. No tiene semáforo de umbrales manuales.

### Health score
- **Vive en**: Analítica
- **Para qué**: Ponderar la salud de un ámbito del portafolio con un peso explícito. Score visible = valor × peso / 100.
- **Clave**: Tiene ámbito (portafolio, roadmap, validación, lanzamiento, operación) y umbral saludable/atención. No es un KPI lineal sino un índice compuesto.
- **No es**: Un KPI. No tiene fórmula de negocio ni categoría ejecutiva.

### KPI config
- **Vive en**: Ajustes (solo para administradores)
- **Para qué**: Parametrizar los KPIs operativos del sistema: unidad (conteo/porcentaje), metas a 7/30/90 días, umbrales ok/atención.
- **Clave**: Es configuración de sistema, no un registro de seguimiento. Tiene clave técnica (`clave_kpi`) y flag `activo`.
- **No es**: Un KPI estratégico ni ejecutivo. No se registra como métrica observable directamente.

---

## Cambios implementados

### Archivos modificados

| Archivo | Línea | Cambio |
|---|---|---|
| `src/presentacion/paginas/estrategia/kpis/PaginaKpisEstrategicos.tsx` | 114 | `<h1>KPIs</h1>` → `<h1>KPIs estratégicos</h1>` |
| `src/presentacion/paginas/analitica/kpis/PaginaKpis.tsx` | 178 | `<h1>KPIs</h1>` → `<h1>KPIs ejecutivos</h1>` |

### Archivos creados

- `IMPLEMENTACION_FASE_10_PORTAL_PM.md` (este archivo)

---

## Restricciones respetadas

- Sin SQL nuevo
- Sin tablas nuevas
- Sin rutas nuevas
- Sin cambios en repositorios, casos de uso ni esquemas
- Sin fusión de conceptos
- Sin código muerto ni imports sin uso
- Sin cambios en comportamiento funcional
- Fases 1–9 intactas

---

## Resultado técnico

```
npm run lint   → sin errores nuevos
npm run build  → compilación exitosa
```

---

## Riesgos residuales

Ninguno. Los cambios son texto puro en `<h1>`. No afectan lógica, rutas, contratos ni persistencia.
