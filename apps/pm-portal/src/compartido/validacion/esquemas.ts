import { z } from 'zod'
import {
  estadosRegistro,
  frecuenciasEstrategicas,
  prioridadesRegistro,
  tendenciasKpiEstrategico
} from '@/dominio/modelos'

const estadoSchema = z.enum(estadosRegistro)
const prioridadSchema = z.enum(prioridadesRegistro)
const fechaCatalogoSchema = z.string().trim().nullable().optional()

export const objetivoSchema = z.object({
  nombre: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres').max(120),
  descripcion: z.string().trim().min(5, 'La descripción debe tener al menos 5 caracteres').max(500),
  estado: estadoSchema,
  prioridad: prioridadSchema
})

export const iniciativaSchema = z.object({
  objetivo_id: z.string().uuid().nullable().optional(),
  ventana_planificada_id: z.string().uuid().nullable().optional(),
  etapa_id: z.string().uuid().nullable().optional(),
  nombre: z.string().trim().min(3).max(120),
  descripcion: z.string().trim().min(5).max(500),
  alcance: z.number().int().min(0),
  impacto: z.union([z.literal(0.25), z.literal(0.5), z.literal(1), z.literal(2), z.literal(3)]),
  confianza: z.number().min(0).max(100),
  esfuerzo: z.number().min(0.5),
  estado: estadoSchema,
  prioridad: prioridadSchema
})

export const entregaSchema = z.object({
  iniciativa_id: z.string().uuid().nullable().optional(),
  ventana_planificada_id: z.string().uuid().nullable().optional(),
  ventana_real_id: z.string().uuid().nullable().optional(),
  nombre: z.string().trim().min(3).max(120),
  descripcion: z.string().trim().min(5).max(500),
  fecha_objetivo: z.string().nullable().optional(),
  fecha_completado: z.string().trim().nullable().optional(),
  estado: estadoSchema,
  prioridad: prioridadSchema
})

export const matrizValorSchema = z.object({
  iniciativa_id: z.string().uuid('Selecciona una iniciativa válida'),
  titulo: z.string().trim().min(3).max(120),
  valor_negocio: z.number().min(1).max(100),
  esfuerzo: z.number().min(1).max(100),
  riesgo: z.number().min(1).max(100),
  estado: estadoSchema,
  prioridad: prioridadSchema
})

export const ingresoSchema = z.object({
  correo: z.string().email('Ingresa un correo válido'),
  contrasena: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
})

const fechaOpcionalSchema = z.string().trim().nullable().optional()

export const plantillaValidacionSchema = z.object({
  modulo_id: z.string().uuid('Selecciona un módulo válido'),
  nombre: z.string().trim().min(3).max(120),
  criterios: z.string().trim().min(5).max(4000),
  evidencias_esperadas: z.string().trim().min(3).max(4000),
  activo: z.boolean()
})

export const planValidacionSchema = z.object({
  modulo_id: z.string().uuid('Selecciona un módulo válido'),
  plantilla_id: z.string().uuid().nullable().optional(),
  nombre: z.string().trim().min(3).max(120),
  criterios: z.string().trim().min(5).max(4000),
  evidencias_esperadas: z.string().trim().min(3).max(4000),
  owner: z.string().trim().max(120).nullable().optional(),
  estado_codigo: z.string().trim().min(2).max(60),
  fecha_inicio: fechaOpcionalSchema,
  fecha_fin: fechaOpcionalSchema,
  notas: z.string().trim().max(4000).nullable().optional()
})

export const ejecucionValidacionSchema = z.object({
  plan_validacion_id: z.string().uuid('Selecciona un plan válido'),
  modulo_id: z.string().uuid('Selecciona un módulo válido'),
  fecha_ejecucion: z.string().trim().min(10).max(20),
  rango_desde: fechaOpcionalSchema,
  rango_hasta: fechaOpcionalSchema,
  resultado: z.string().trim().min(3).max(4000),
  hallazgos: z.string().trim().min(3).max(4000),
  evidencia_url: z.string().url('Ingresa un enlace válido').nullable().optional().or(z.literal('')),
  aprobador: z.string().trim().max(120).nullable().optional(),
  estado_codigo: z.string().trim().min(2).max(60)
})

export const decisionPmSchema = z.object({
  titulo: z.string().trim().min(3).max(160),
  contexto: z.string().trim().min(5).max(5000),
  decision: z.string().trim().min(5).max(5000),
  alternativas: z.string().trim().min(3).max(5000),
  impacto: z.string().trim().min(3).max(5000),
  estado_codigo: z.string().trim().min(2).max(60),
  owner: z.string().trim().max(120).nullable().optional(),
  fecha_decision: z.string().trim().min(10).max(20),
  links: z.array(z.string().url('Todos los links deben ser válidos')).default([]),
  tags: z.array(z.string().trim().min(1).max(50)).default([]),
  iniciativa_id: z.string().uuid().nullable().optional(),
  entrega_id: z.string().uuid().nullable().optional(),
  ejecucion_validacion_id: z.string().uuid().nullable().optional()
})

export const auditoriaPmSchema = z.object({
  tipo_auditoria_codigo: z.string().trim().min(2).max(60),
  alcance: z.string().trim().min(5).max(5000),
  checklist: z.string().trim().min(5).max(5000),
  evidencias: z.string().trim().min(3).max(5000),
  responsable: z.string().trim().max(120).nullable().optional(),
  estado_codigo: z.string().trim().min(2).max(60),
  fecha_auditoria: z.string().trim().min(10).max(20)
})

export const hallazgoAuditoriaSchema = z.object({
  auditoria_id: z.string().uuid('Selecciona una auditoría válida'),
  titulo: z.string().trim().min(3).max(160),
  descripcion: z.string().trim().min(3).max(5000),
  severidad_codigo: z.string().trim().min(2).max(60),
  estado_codigo: z.string().trim().min(2).max(60),
  modulo_id: z.string().uuid().nullable().optional(),
  decision_id: z.string().uuid().nullable().optional(),
  ejecucion_validacion_id: z.string().uuid().nullable().optional(),
  evidencia_url: z.string().url('Ingresa un enlace válido').nullable().optional().or(z.literal(''))
})

export const catalogoModuloPmSchema = z.object({
  codigo: z.string().trim().min(2).max(60),
  nombre: z.string().trim().min(3).max(120),
  descripcion: z.string().trim().max(500).nullable().optional(),
  orden: z.number().int().min(1).max(9999),
  activo: z.boolean()
})

export const catalogoSeveridadPmSchema = z.object({
  codigo: z.string().trim().min(2).max(60),
  nombre: z.string().trim().min(2).max(120),
  nivel: z.number().int().min(0).max(999),
  descripcion: z.string().trim().max(500).nullable().optional(),
  activo: z.boolean()
})

export const catalogoVentanaPmSchema = z
  .object({
    etiqueta_visible: z.string().trim().min(2).max(120),
    tipo: z.string().trim().min(2).max(80),
    anio: z.number().int().min(1900).max(2500).nullable().optional(),
    orden: z.number().int().min(1).max(9999),
    fecha_inicio: fechaCatalogoSchema,
    fecha_fin: fechaCatalogoSchema,
    activo: z.boolean()
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

export const catalogoEtapaPmSchema = z.object({
  etiqueta_visible: z.string().trim().min(2).max(120),
  orden: z.number().int().min(1).max(9999),
  activo: z.boolean()
})

export const integracionPmSchema = z.object({
  clave: z.string().trim().min(2).max(80),
  nombre: z.string().trim().min(2).max(120),
  descripcion: z.string().trim().max(500).nullable().optional(),
  habilitado: z.boolean(),
  configuracion_publica: z.record(z.string(), z.unknown()).nullable().optional()
})

export const kpiConfigPmSchema = z.object({
  clave_kpi: z.string().trim().min(2).max(120),
  nombre: z.string().trim().min(2).max(120),
  unidad: z.union([z.literal('conteo'), z.literal('porcentaje')]),
  meta_7: z.number().finite().nullable().optional(),
  meta_30: z.number().finite().nullable().optional(),
  meta_90: z.number().finite().nullable().optional(),
  umbral_ok: z.number().finite().nullable().optional(),
  umbral_atencion: z.number().finite().nullable().optional(),
  activo: z.boolean()
})

export const configuracionRiceSchema = z.object({
  alcance_periodo: z.union([z.literal('semana'), z.literal('mes'), z.literal('trimestre')]),
  esfuerzo_unidad: z.union([z.literal('persona_dia'), z.literal('persona_semana')])
})

export const periodoEstrategicoSchema = z
  .object({
    nombre: z.string().trim().min(3).max(120),
    descripcion: z.string().trim().max(1000).nullable().optional(),
    fecha_inicio: z.string().trim().min(10).max(20),
    fecha_fin: z.string().trim().min(10).max(20),
    activo: z.boolean()
  })
  .superRefine((valores, contexto) => {
    if (valores.fecha_inicio > valores.fecha_fin) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fecha_fin'],
        message: 'La fecha fin no puede ser menor que la fecha inicio'
      })
    }
  })

export const objetivoEstrategicoSchema = z.object({
  periodo_id: z.string().uuid('Selecciona un periodo válido'),
  codigo: z.string().trim().min(2).max(40),
  titulo: z.string().trim().min(3).max(160),
  descripcion: z.string().trim().min(5).max(4000),
  prioridad: prioridadSchema,
  estado: estadoSchema,
  owner: z.string().trim().max(120).nullable().optional(),
  notas: z.string().trim().max(4000).nullable().optional()
})

export const keyResultSchema = z.object({
  objetivo_estrategico_id: z.string().uuid('Selecciona un objetivo estratégico válido'),
  nombre: z.string().trim().min(3).max(160),
  metrica: z.string().trim().min(2).max(160),
  unidad: z.string().trim().min(1).max(60),
  baseline: z.number().finite().nullable().optional(),
  meta: z.number().finite().nullable().optional(),
  valor_actual: z.number().finite().nullable().optional(),
  frecuencia: z.enum(frecuenciasEstrategicas),
  estado: estadoSchema,
  owner: z.string().trim().max(120).nullable().optional()
})

export const kpiEstrategicoSchema = z.object({
  periodo_id: z.string().uuid('Selecciona un periodo válido'),
  nombre: z.string().trim().min(3).max(160),
  definicion: z.string().trim().min(5).max(4000),
  formula: z.string().trim().min(2).max(4000),
  fuente: z.string().trim().min(2).max(200),
  unidad: z.string().trim().min(1).max(60),
  meta: z.number().finite().nullable().optional(),
  umbral_bajo: z.number().finite().nullable().optional(),
  umbral_alto: z.number().finite().nullable().optional(),
  valor_actual: z.number().finite().nullable().optional(),
  tendencia: z.enum(tendenciasKpiEstrategico),
  estado: estadoSchema,
  owner: z.string().trim().max(120).nullable().optional()
})

export const hipotesisSchema = z.object({
  periodo_id: z.string().uuid('Selecciona un periodo válido'),
  titulo: z.string().trim().min(3).max(160),
  problema: z.string().trim().min(5).max(4000),
  hipotesis: z.string().trim().min(5).max(4000),
  impacto_esperado: z.string().trim().min(3).max(4000),
  criterio_exito: z.string().trim().min(3).max(4000),
  estado: estadoSchema,
  prioridad: prioridadSchema,
  owner: z.string().trim().max(120).nullable().optional(),
  evidencia_url: z.string().url('Ingresa un enlace válido').nullable().optional().or(z.literal('')),
  notas: z.string().trim().max(4000).nullable().optional()
})

export type ObjetivoEntrada = z.infer<typeof objetivoSchema>
export type IniciativaEntrada = z.infer<typeof iniciativaSchema>
export type EntregaEntrada = z.infer<typeof entregaSchema>
export type MatrizValorEntrada = z.infer<typeof matrizValorSchema>
export type IngresoEntrada = z.infer<typeof ingresoSchema>
export type PlantillaValidacionEntrada = z.infer<typeof plantillaValidacionSchema>
export type PlanValidacionEntrada = z.infer<typeof planValidacionSchema>
export type EjecucionValidacionEntrada = z.infer<typeof ejecucionValidacionSchema>
export type DecisionPmEntrada = z.infer<typeof decisionPmSchema>
export type AuditoriaPmEntrada = z.infer<typeof auditoriaPmSchema>
export type HallazgoAuditoriaEntrada = z.infer<typeof hallazgoAuditoriaSchema>
export type CatalogoModuloPmEntrada = z.infer<typeof catalogoModuloPmSchema>
export type CatalogoSeveridadPmEntrada = z.infer<typeof catalogoSeveridadPmSchema>
export type CatalogoVentanaPmEntrada = z.infer<typeof catalogoVentanaPmSchema>
export type CatalogoEtapaPmEntrada = z.infer<typeof catalogoEtapaPmSchema>
export type IntegracionPmEntrada = z.infer<typeof integracionPmSchema>
export type KpiConfigPmEntrada = z.infer<typeof kpiConfigPmSchema>
export type ConfiguracionRiceEntrada = z.infer<typeof configuracionRiceSchema>
export type PeriodoEstrategicoEntrada = z.infer<typeof periodoEstrategicoSchema>
export type ObjetivoEstrategicoEntrada = z.infer<typeof objetivoEstrategicoSchema>
export type KeyResultEntrada = z.infer<typeof keyResultSchema>
export type KpiEstrategicoEntrada = z.infer<typeof kpiEstrategicoSchema>
export type HipotesisEntrada = z.infer<typeof hipotesisSchema>
