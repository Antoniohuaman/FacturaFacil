import { z } from 'zod'
import {
  ambitosHealthScorePm,
  categoriasKpiEjecutivoPm,
  categoriasRiesgoPm,
  criticidadesGobiernoPm,
  estadosBloqueoPm,
  estadosBugPm,
  estadosDependenciaPm,
  estadosDeudaTecnicaPm,
  estadosEstabilizacionReleasePm,
  estadosRiesgoPm,
  estadosSaludAnaliticaPm,
  estadosStakeholderPm,
  estadosLeccionAprendidaPm,
  estadosMejoraPm,
  estadosReleasePm,
  estadosRegistro,
  frecuenciasEstrategicas,
  impactosRiesgoPm,
  influenciasStakeholderPm,
  interesesStakeholderPm,
  prioridadesRegistro,
  probabilidadesRiesgoPm,
  tendenciasAnaliticaPm,
  tiposChecklistSalidaPm,
  tiposDependenciaPm,
  tiposReleasePm,
  tiposRequerimientoNoFuncionalPm,
  tiposProblemaOportunidadDiscovery,
  tiposStakeholderPm,
  tendenciasKpiEstrategico
} from '@/dominio/modelos'

const estadoSchema = z.enum(estadosRegistro)
const prioridadSchema = z.enum(prioridadesRegistro)
const fechaCatalogoSchema = z.string().trim().nullable().optional()
const uuidOpcionalSchema = z.string().uuid().nullable().optional().or(z.literal(''))
const urlOpcionalSchema = z.string().url('Ingresa un enlace válido').nullable().optional().or(z.literal(''))
const moduloOpcionalSchema = z.string().trim().min(2).max(60).nullable().optional().or(z.literal(''))
const textoCortoOpcionalSchema = z.string().trim().max(120).nullable().optional().or(z.literal(''))
const textoLargoOpcionalSchema = z.string().trim().max(4000).nullable().optional().or(z.literal(''))

export const objetivoSchema = z
  .object({
    nombre: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres').max(120),
    descripcion: z.string().trim().min(5, 'La descripción debe tener al menos 5 caracteres').max(500),
    estado: estadoSchema,
    prioridad: prioridadSchema,
    fecha_inicio: fechaCatalogoSchema,
    fecha_fin: fechaCatalogoSchema
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

export const iniciativaSchema = z
  .object({
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
    prioridad: prioridadSchema,
    fecha_inicio: fechaCatalogoSchema,
    fecha_fin: fechaCatalogoSchema
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

export const entregaSchema = z
  .object({
    iniciativa_id: z.string().uuid().nullable().optional(),
    ventana_planificada_id: z.string().uuid().nullable().optional(),
    ventana_real_id: z.string().uuid().nullable().optional(),
    nombre: z.string().trim().min(3).max(120),
    descripcion: z.string().trim().min(5).max(500),
    fecha_inicio: fechaCatalogoSchema,
    fecha_fin: fechaCatalogoSchema,
    fecha_objetivo: z.string().nullable().optional(),
    fecha_completado: z.string().trim().nullable().optional(),
    estado: estadoSchema,
    prioridad: prioridadSchema
  })
  .superRefine((valores, contexto) => {
    if (valores.fecha_inicio && valores.fecha_fin && valores.fecha_inicio > valores.fecha_fin) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fecha_fin'],
        message: 'La fecha fin no puede ser menor que la fecha inicio'
      })
    }
    if (valores.fecha_inicio && valores.fecha_objetivo && valores.fecha_objetivo < valores.fecha_inicio) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fecha_objetivo'],
        message: 'La fecha objetivo no puede ser anterior a la fecha inicio'
      })
    }
    if (valores.fecha_fin && valores.fecha_objetivo && valores.fecha_objetivo > valores.fecha_fin) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fecha_objetivo'],
        message: 'La fecha objetivo no puede ser posterior a la fecha fin'
      })
    }
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

type CatalogoDinamicoCodigo = {
  codigo: string
  activo?: boolean
}

export function validarCodigoCatalogoDinamico(
  codigo: string | null | undefined,
  catalogo: CatalogoDinamicoCodigo[],
  etiqueta = 'estado'
) {
  const codigoNormalizado = codigo?.trim()

  if (!codigoNormalizado) {
    return null
  }

  const existeEnCatalogoActivo = catalogo.some(
    (opcion) => opcion.codigo === codigoNormalizado && opcion.activo !== false
  )

  return existeEnCatalogoActivo ? null : `Selecciona un ${etiqueta} válido del catálogo activo`
}

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

export const segmentoDiscoverySchema = z.object({
  nombre: z.string().trim().min(3).max(160),
  descripcion: textoLargoOpcionalSchema,
  necesidades: textoLargoOpcionalSchema,
  dolores: textoLargoOpcionalSchema,
  contexto: textoLargoOpcionalSchema,
  activo: z.boolean()
})

export const insightDiscoverySchema = z.object({
  titulo: z.string().trim().min(3).max(160),
  descripcion: z.string().trim().min(5).max(4000),
  fuente: z.string().trim().min(2).max(160),
  tipo: z.string().trim().min(2).max(80),
  relevancia: prioridadSchema,
  modulo_codigo: moduloOpcionalSchema,
  segmento_id: uuidOpcionalSchema,
  evidencia_url: urlOpcionalSchema,
  estado: estadoSchema,
  owner: textoCortoOpcionalSchema,
  fecha_hallazgo: z.string().trim().min(10).max(20),
  notas: textoLargoOpcionalSchema
})

export const problemaOportunidadDiscoverySchema = z.object({
  tipo: z.enum(tiposProblemaOportunidadDiscovery),
  titulo: z.string().trim().min(3).max(160),
  descripcion: z.string().trim().min(5).max(4000),
  impacto: z.string().trim().min(3).max(2000),
  prioridad: prioridadSchema,
  segmento_id: uuidOpcionalSchema,
  modulo_codigo: moduloOpcionalSchema,
  estado: estadoSchema,
  owner: textoCortoOpcionalSchema
})

export const investigacionDiscoverySchema = z.object({
  titulo: z.string().trim().min(3).max(160),
  tipo_investigacion: z.string().trim().min(2).max(80),
  fecha_investigacion: z.string().trim().min(10).max(20),
  segmento_id: uuidOpcionalSchema,
  participantes_resumen: z.string().trim().min(3).max(1000),
  resumen: z.string().trim().min(5).max(4000),
  hallazgos: z.string().trim().min(5).max(4000),
  conclusion: z.string().trim().min(3).max(4000),
  evidencia_url: urlOpcionalSchema,
  estado: estadoSchema,
  owner: textoCortoOpcionalSchema
})

export const hipotesisDiscoverySchema = z.object({
  titulo: z.string().trim().min(3).max(160),
  problema_id: uuidOpcionalSchema,
  hipotesis: z.string().trim().min(5).max(4000),
  cambio_propuesto: z.string().trim().min(5).max(4000),
  resultado_esperado: z.string().trim().min(3).max(4000),
  criterio_exito: z.string().trim().min(3).max(4000),
  prioridad: prioridadSchema,
  estado: estadoSchema,
  owner: textoCortoOpcionalSchema,
  evidencia_url: urlOpcionalSchema,
  notas: textoLargoOpcionalSchema
})

export const criterioAceptacionSchema = z.object({
  id: uuidOpcionalSchema,
  historia_usuario_id: uuidOpcionalSchema,
  descripcion: z.string().trim().min(3).max(2000),
  orden: z.number().int().min(1).max(9999),
  obligatorio: z.boolean(),
  estado_validacion: z.enum(estadosRegistro).nullable().optional().or(z.literal('')),
  notas: textoLargoOpcionalSchema
})

export const historiaUsuarioSchema = z.object({
  codigo: z.string().trim().min(2).max(40),
  titulo: z.string().trim().min(3).max(160),
  como_usuario: z.string().trim().min(3).max(400),
  quiero: z.string().trim().min(3).max(1000),
  para: z.string().trim().min(3).max(1000),
  descripcion: textoLargoOpcionalSchema,
  prioridad: prioridadSchema,
  estado: estadoSchema,
  owner: textoCortoOpcionalSchema,
  iniciativa_id: uuidOpcionalSchema,
  entrega_id: uuidOpcionalSchema,
  hipotesis_discovery_id: uuidOpcionalSchema,
  notas: textoLargoOpcionalSchema
})

export const casoUsoSchema = z.object({
  codigo: z.string().trim().min(2).max(40),
  titulo: z.string().trim().min(3).max(160),
  actor_principal: z.string().trim().min(2).max(160),
  actores_secundarios: textoLargoOpcionalSchema,
  precondiciones: z.string().trim().min(3).max(4000),
  flujo_principal: z.string().trim().min(5).max(5000),
  flujos_alternos: textoLargoOpcionalSchema,
  postcondiciones: z.string().trim().min(3).max(4000),
  prioridad: prioridadSchema,
  estado: estadoSchema,
  iniciativa_id: uuidOpcionalSchema,
  entrega_id: uuidOpcionalSchema,
  historia_usuario_id: uuidOpcionalSchema,
  owner: textoCortoOpcionalSchema,
  notas: textoLargoOpcionalSchema
})

export const reglaNegocioSchema = z.object({
  codigo: z.string().trim().min(2).max(40),
  nombre: z.string().trim().min(3).max(160),
  descripcion: z.string().trim().min(5).max(4000),
  categoria: z.string().trim().min(2).max(120),
  criticidad: prioridadSchema,
  modulo_codigo: moduloOpcionalSchema,
  estado: estadoSchema,
  iniciativa_id: uuidOpcionalSchema,
  historia_usuario_id: uuidOpcionalSchema,
  decision_id: uuidOpcionalSchema,
  owner: textoCortoOpcionalSchema,
  notas: textoLargoOpcionalSchema
})

export const requerimientoNoFuncionalSchema = z.object({
  codigo: z.string().trim().min(2).max(40),
  nombre: z.string().trim().min(3).max(160),
  tipo: z.enum(tiposRequerimientoNoFuncionalPm),
  descripcion: z.string().trim().min(5).max(4000),
  criterio_medicion: z.string().trim().min(3).max(4000),
  prioridad: prioridadSchema,
  estado: estadoSchema,
  iniciativa_id: uuidOpcionalSchema,
  entrega_id: uuidOpcionalSchema,
  owner: textoCortoOpcionalSchema,
  notas: textoLargoOpcionalSchema
})

export const releaseSchema = z
  .object({
    codigo: z.string().trim().min(2).max(40),
    nombre: z.string().trim().min(3).max(160),
    descripcion: z.string().trim().min(5).max(4000),
    tipo_release: z.enum(tiposReleasePm),
    estado: z.enum(estadosReleasePm),
    fecha_programada: z.string().trim().min(10).max(20),
    fecha_lanzamiento_real: fechaOpcionalSchema,
    iniciativa_id: uuidOpcionalSchema,
    entrega_id: uuidOpcionalSchema,
    owner: textoCortoOpcionalSchema,
    responsable_aprobacion: textoCortoOpcionalSchema,
    decision_id: uuidOpcionalSchema,
    rollback_preparado: z.boolean(),
    rollback_descripcion: textoLargoOpcionalSchema,
    rollback_responsable: textoCortoOpcionalSchema,
    comunicacion_requerida: z.boolean(),
    comunicacion_descripcion: textoLargoOpcionalSchema,
    audiencia_objetivo: textoLargoOpcionalSchema,
    notas: textoLargoOpcionalSchema
  })
  .superRefine((valores, contexto) => {
    if (valores.fecha_lanzamiento_real && valores.fecha_lanzamiento_real < valores.fecha_programada) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fecha_lanzamiento_real'],
        message: 'La fecha de lanzamiento real no puede ser menor que la fecha programada'
      })
    }
  })

export const checklistSalidaSchema = z.object({
  id: uuidOpcionalSchema,
  release_id: uuidOpcionalSchema,
  tipo_item: z.enum(tiposChecklistSalidaPm),
  descripcion: z.string().trim().min(3).max(2000),
  obligatorio: z.boolean(),
  completado: z.boolean(),
  evidencia: textoLargoOpcionalSchema,
  orden: z.coerce.number().int().min(1).max(9999)
})

export const seguimientoReleaseSchema = z.object({
  release_id: z.string().uuid('Selecciona un release válido'),
  fecha_registro: z.string().trim().min(10).max(20),
  estado_estabilizacion: z.enum(estadosEstabilizacionReleasePm),
  observaciones: z.string().trim().min(5).max(4000),
  incidencias_detectadas: z.string().trim().min(3).max(4000),
  metrica_clave: textoCortoOpcionalSchema,
  decision_requerida: z.boolean(),
  owner: textoCortoOpcionalSchema
})

export const bugSchema = z
  .object({
    codigo: z.string().trim().min(2).max(40),
    titulo: z.string().trim().min(3).max(160),
    descripcion: z.string().trim().min(5).max(4000),
    estado: z.enum(estadosBugPm),
    prioridad: prioridadSchema,
    owner: textoCortoOpcionalSchema,
    fecha_reporte: z.string().trim().min(10).max(20),
    fecha_resolucion: fechaOpcionalSchema,
    modulo_codigo: moduloOpcionalSchema,
    iniciativa_id: uuidOpcionalSchema,
    entrega_id: uuidOpcionalSchema,
    release_id: uuidOpcionalSchema,
    auditoria_id: uuidOpcionalSchema,
    hallazgo_id: uuidOpcionalSchema,
    impacto_operativo: textoLargoOpcionalSchema,
    causa_raiz: textoLargoOpcionalSchema,
    notas: textoLargoOpcionalSchema
  })
  .superRefine((valores, contexto) => {
    if (valores.fecha_resolucion && valores.fecha_resolucion < valores.fecha_reporte) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fecha_resolucion'],
        message: 'La fecha de resolución no puede ser menor que la fecha de reporte'
      })
    }
  })

export const mejoraSchema = z
  .object({
    codigo: z.string().trim().min(2).max(40),
    titulo: z.string().trim().min(3).max(160),
    descripcion: z.string().trim().min(5).max(4000),
    estado: z.enum(estadosMejoraPm),
    prioridad: prioridadSchema,
    owner: textoCortoOpcionalSchema,
    fecha_solicitud: z.string().trim().min(10).max(20),
    fecha_cierre: fechaOpcionalSchema,
    modulo_codigo: moduloOpcionalSchema,
    iniciativa_id: uuidOpcionalSchema,
    entrega_id: uuidOpcionalSchema,
    insight_id: uuidOpcionalSchema,
    hipotesis_discovery_id: uuidOpcionalSchema,
    beneficio_esperado: z.string().trim().min(5).max(4000),
    criterio_exito: textoLargoOpcionalSchema,
    notas: textoLargoOpcionalSchema
  })
  .superRefine((valores, contexto) => {
    if (valores.fecha_cierre && valores.fecha_cierre < valores.fecha_solicitud) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fecha_cierre'],
        message: 'La fecha de cierre no puede ser menor que la fecha de solicitud'
      })
    }
  })

export const deudaTecnicaSchema = z
  .object({
    codigo: z.string().trim().min(2).max(40),
    titulo: z.string().trim().min(3).max(160),
    descripcion: z.string().trim().min(5).max(4000),
    estado: z.enum(estadosDeudaTecnicaPm),
    prioridad: prioridadSchema,
    owner: textoCortoOpcionalSchema,
    fecha_identificacion: z.string().trim().min(10).max(20),
    fecha_objetivo: fechaOpcionalSchema,
    modulo_codigo: moduloOpcionalSchema,
    iniciativa_id: uuidOpcionalSchema,
    entrega_id: uuidOpcionalSchema,
    release_id: uuidOpcionalSchema,
    impacto_tecnico: z.string().trim().min(5).max(4000),
    plan_remediacion: textoLargoOpcionalSchema,
    notas: textoLargoOpcionalSchema
  })
  .superRefine((valores, contexto) => {
    if (valores.fecha_objetivo && valores.fecha_objetivo < valores.fecha_identificacion) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fecha_objetivo'],
        message: 'La fecha objetivo no puede ser menor que la fecha de identificación'
      })
    }
  })

export const bloqueoSchema = z
  .object({
    codigo: z.string().trim().min(2).max(40),
    titulo: z.string().trim().min(3).max(160),
    descripcion: z.string().trim().min(5).max(4000),
    estado: z.enum(estadosBloqueoPm),
    prioridad: prioridadSchema,
    owner: textoCortoOpcionalSchema,
    responsable_desbloqueo: textoCortoOpcionalSchema,
    fecha_reporte: z.string().trim().min(10).max(20),
    fecha_resolucion: fechaOpcionalSchema,
    modulo_codigo: moduloOpcionalSchema,
    iniciativa_id: uuidOpcionalSchema,
    entrega_id: uuidOpcionalSchema,
    release_id: uuidOpcionalSchema,
    decision_id: uuidOpcionalSchema,
    impacto_operativo: z.string().trim().min(5).max(4000),
    proximo_paso: textoLargoOpcionalSchema,
    notas: textoLargoOpcionalSchema
  })
  .superRefine((valores, contexto) => {
    if (valores.fecha_resolucion && valores.fecha_resolucion < valores.fecha_reporte) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fecha_resolucion'],
        message: 'La fecha de resolución no puede ser menor que la fecha de reporte'
      })
    }
  })

export const leccionAprendidaSchema = z.object({
  codigo: z.string().trim().min(2).max(40),
  titulo: z.string().trim().min(3).max(160),
  contexto: z.string().trim().min(5).max(4000),
  aprendizaje: z.string().trim().min(5).max(4000),
  accion_recomendada: z.string().trim().min(5).max(4000),
  estado: z.enum(estadosLeccionAprendidaPm),
  owner: textoCortoOpcionalSchema,
  fecha_leccion: z.string().trim().min(10).max(20),
  modulo_codigo: moduloOpcionalSchema,
  iniciativa_id: uuidOpcionalSchema,
  entrega_id: uuidOpcionalSchema,
  release_id: uuidOpcionalSchema,
  auditoria_id: uuidOpcionalSchema,
  notas: textoLargoOpcionalSchema
})

export const stakeholderSchema = z.object({
  codigo: z.string().trim().min(2).max(40),
  nombre: z.string().trim().min(3).max(160),
  tipo: z.enum(tiposStakeholderPm),
  area: z.string().trim().min(2).max(120),
  organizacion: textoCortoOpcionalSchema,
  cargo: textoCortoOpcionalSchema,
  influencia: z.enum(influenciasStakeholderPm),
  interes: z.enum(interesesStakeholderPm),
  estado: z.enum(estadosStakeholderPm),
  owner: textoCortoOpcionalSchema,
  correo: z.string().email('Ingresa un correo válido').nullable().optional().or(z.literal('')),
  contacto_referencia: textoCortoOpcionalSchema,
  modulo_codigo: moduloOpcionalSchema,
  iniciativa_id: uuidOpcionalSchema,
  entrega_id: uuidOpcionalSchema,
  decision_id: uuidOpcionalSchema,
  notas: textoLargoOpcionalSchema
})

export const riesgoSchema = z
  .object({
    codigo: z.string().trim().min(2).max(40),
    titulo: z.string().trim().min(3).max(160),
    descripcion: z.string().trim().min(5).max(4000),
    categoria: z.enum(categoriasRiesgoPm),
    probabilidad: z.enum(probabilidadesRiesgoPm),
    impacto: z.enum(impactosRiesgoPm),
    criticidad: z.enum(criticidadesGobiernoPm),
    estado: z.enum(estadosRiesgoPm),
    owner: textoCortoOpcionalSchema,
    fecha_identificacion: z.string().trim().min(10).max(20),
    fecha_objetivo: fechaOpcionalSchema,
    trigger_riesgo: textoLargoOpcionalSchema,
    plan_mitigacion: textoLargoOpcionalSchema,
    modulo_codigo: moduloOpcionalSchema,
    iniciativa_id: uuidOpcionalSchema,
    entrega_id: uuidOpcionalSchema,
    release_id: uuidOpcionalSchema,
    decision_id: uuidOpcionalSchema,
    auditoria_id: uuidOpcionalSchema,
    notas: textoLargoOpcionalSchema
  })
  .superRefine((valores, contexto) => {
    if (valores.fecha_objetivo && valores.fecha_objetivo < valores.fecha_identificacion) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fecha_objetivo'],
        message: 'La fecha objetivo no puede ser menor que la fecha de identificación'
      })
    }
  })

export const dependenciaSchema = z
  .object({
    codigo: z.string().trim().min(2).max(40),
    titulo: z.string().trim().min(3).max(160),
    descripcion: z.string().trim().min(5).max(4000),
    tipo_dependencia: z.enum(tiposDependenciaPm),
    estado: z.enum(estadosDependenciaPm),
    criticidad: z.enum(criticidadesGobiernoPm),
    owner: textoCortoOpcionalSchema,
    responsable_externo: textoCortoOpcionalSchema,
    fecha_identificacion: z.string().trim().min(10).max(20),
    fecha_objetivo: fechaOpcionalSchema,
    impacto_si_falla: z.string().trim().min(5).max(4000),
    proximo_paso: textoLargoOpcionalSchema,
    modulo_codigo: moduloOpcionalSchema,
    iniciativa_id: uuidOpcionalSchema,
    entrega_id: uuidOpcionalSchema,
    release_id: uuidOpcionalSchema,
    decision_id: uuidOpcionalSchema,
    notas: textoLargoOpcionalSchema
  })
  .superRefine((valores, contexto) => {
    if (valores.fecha_objetivo && valores.fecha_objetivo < valores.fecha_identificacion) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fecha_objetivo'],
        message: 'La fecha objetivo no puede ser menor que la fecha de identificación'
      })
    }
  })

export const kpiEjecutivoSchema = z.object({
  codigo: z.string().trim().min(2).max(40),
  nombre: z.string().trim().min(3).max(160),
  descripcion: z.string().trim().min(5).max(4000),
  categoria: z.enum(categoriasKpiEjecutivoPm),
  modulo_codigo: moduloOpcionalSchema,
  formula_texto: z.string().trim().min(2).max(4000),
  unidad: z.string().trim().min(1).max(60),
  meta_valor: z.number().finite().nullable().optional(),
  valor_actual: z.number().finite().nullable().optional(),
  valor_anterior: z.number().finite().nullable().optional(),
  tendencia: z.enum(tendenciasAnaliticaPm),
  estado: z.enum(estadosSaludAnaliticaPm),
  owner: textoCortoOpcionalSchema,
  fecha_corte: z.string().trim().min(10).max(20),
  notas: textoLargoOpcionalSchema
})

export const healthScoreSchema = z
  .object({
    codigo: z.string().trim().min(2).max(40),
    nombre: z.string().trim().min(3).max(160),
    ambito: z.enum(ambitosHealthScorePm),
    modulo_codigo: moduloOpcionalSchema,
    descripcion: z.string().trim().min(5).max(4000),
    peso: z.number().finite().min(0).max(1000),
    valor_actual: z.number().finite().nullable().optional(),
    umbral_saludable: z.number().finite().nullable().optional(),
    umbral_atencion: z.number().finite().nullable().optional(),
    estado: z.enum(estadosSaludAnaliticaPm),
    owner: textoCortoOpcionalSchema,
    fecha_corte: z.string().trim().min(10).max(20),
    notas: textoLargoOpcionalSchema
  })
  .superRefine((valores, contexto) => {
    if (
      valores.umbral_saludable !== null &&
      valores.umbral_saludable !== undefined &&
      valores.umbral_atencion !== null &&
      valores.umbral_atencion !== undefined &&
      valores.umbral_saludable <= valores.umbral_atencion
    ) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['umbral_saludable'],
        message: 'El umbral saludable debe ser mayor que el umbral de atención'
      })
    }
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
export type SegmentoDiscoveryEntrada = z.infer<typeof segmentoDiscoverySchema>
export type InsightDiscoveryEntrada = z.infer<typeof insightDiscoverySchema>
export type ProblemaOportunidadDiscoveryEntrada = z.infer<typeof problemaOportunidadDiscoverySchema>
export type InvestigacionDiscoveryEntrada = z.infer<typeof investigacionDiscoverySchema>
export type HipotesisDiscoveryEntrada = z.infer<typeof hipotesisDiscoverySchema>
export type CriterioAceptacionEntrada = z.infer<typeof criterioAceptacionSchema>
export type HistoriaUsuarioEntrada = z.infer<typeof historiaUsuarioSchema>
export type CasoUsoEntrada = z.infer<typeof casoUsoSchema>
export type ReglaNegocioEntrada = z.infer<typeof reglaNegocioSchema>
export type RequerimientoNoFuncionalEntrada = z.infer<typeof requerimientoNoFuncionalSchema>
export type ReleaseEntrada = z.infer<typeof releaseSchema>
export type ChecklistSalidaEntrada = z.infer<typeof checklistSalidaSchema>
export type SeguimientoReleaseEntrada = z.infer<typeof seguimientoReleaseSchema>
export type BugEntrada = z.infer<typeof bugSchema>
export type MejoraEntrada = z.infer<typeof mejoraSchema>
export type DeudaTecnicaEntrada = z.infer<typeof deudaTecnicaSchema>
export type BloqueoEntrada = z.infer<typeof bloqueoSchema>
export type LeccionAprendidaEntrada = z.infer<typeof leccionAprendidaSchema>
export type StakeholderEntrada = z.infer<typeof stakeholderSchema>
export type RiesgoEntrada = z.infer<typeof riesgoSchema>
export type DependenciaEntrada = z.infer<typeof dependenciaSchema>
export type KpiEjecutivoEntrada = z.infer<typeof kpiEjecutivoSchema>
export type HealthScoreEntrada = z.infer<typeof healthScoreSchema>
