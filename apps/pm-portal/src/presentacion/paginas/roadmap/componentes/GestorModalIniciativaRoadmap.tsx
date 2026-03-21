import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { crearIniciativa, editarIniciativa } from '@/aplicacion/casos-uso/iniciativas'
import { iniciativaSchema, type IniciativaEntrada } from '@/compartido/validacion/esquemas'
import { construirLimitesFechasJerarquicas, validarJerarquiaFechas } from '@/compartido/validacion/roadmapJerarquiaFechas'
import { calcularRice } from '@/compartido/utilidades/calcularRice'
import {
  formatearAlcancePeriodoRice,
  formatearEsfuerzoUnidadRice,
  type CatalogoEtapaPm,
  type CatalogoVentanaPm,
  type ConfiguracionRice,
  type Iniciativa,
  type Objetivo
} from '@/dominio/modelos'
import { ModalIniciativaRoadmap } from './ModalIniciativaRoadmap'
import {
  crearValoresInicialesIniciativaRoadmap,
  opcionesImpactoIniciativaRoadmap
} from './auxiliaresFormulariosRoadmap'
import type { ModoModalRoadmap } from './tiposModalRoadmap'

interface GestorModalIniciativaRoadmapProps {
  abierto: boolean
  modo: ModoModalRoadmap
  iniciativa: Iniciativa | null
  objetivos: Objetivo[]
  ventanas: CatalogoVentanaPm[]
  etapas: CatalogoEtapaPm[]
  configuracionRice: ConfiguracionRice | null
  alCerrar: () => void
  alGuardado: () => Promise<void> | void
  alError: (mensaje: string) => void
}

export function GestorModalIniciativaRoadmap({
  abierto,
  modo,
  iniciativa,
  objetivos,
  ventanas,
  etapas,
  configuracionRice,
  alCerrar,
  alGuardado,
  alError
}: GestorModalIniciativaRoadmapProps) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    trigger,
    formState: { errors, isSubmitting, isValid }
  } = useForm<IniciativaEntrada>({
    resolver: zodResolver(iniciativaSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: crearValoresInicialesIniciativaRoadmap(null)
  })

  useEffect(() => {
    if (!abierto) {
      return
    }

    reset(crearValoresInicialesIniciativaRoadmap(iniciativa))
  }, [abierto, iniciativa, reset])

  const alcance = watch('alcance')
  const impacto = watch('impacto')
  const confianza = watch('confianza')
  const esfuerzo = watch('esfuerzo')
  const objetivoSeleccionadoId = watch('objetivo_id')
  const fechaInicioSeleccionada = watch('fecha_inicio')
  const fechaFinSeleccionada = watch('fecha_fin')

  const camposRiceValidos = useMemo(() => {
    return (
      Number.isInteger(alcance) &&
      alcance >= 0 &&
      opcionesImpactoIniciativaRoadmap.includes(impacto) &&
      Number.isFinite(confianza) &&
      confianza >= 0 &&
      confianza <= 100 &&
      Number.isFinite(esfuerzo) &&
      esfuerzo >= 0.5
    )
  }, [alcance, impacto, confianza, esfuerzo])

  const riceCalculado = useMemo(() => {
    if (!camposRiceValidos) {
      return null
    }

    return calcularRice({ alcance, impacto, confianza, esfuerzo })
  }, [alcance, impacto, confianza, esfuerzo, camposRiceValidos])

  const objetivoEntidadPorId = useMemo(() => new Map(objetivos.map((objetivo) => [objetivo.id, objetivo])), [objetivos])
  const objetivoSeleccionado = objetivoSeleccionadoId ? objetivoEntidadPorId.get(objetivoSeleccionadoId) ?? null : null

  const limitesFechasObjetivo = useMemo(() => {
    return construirLimitesFechasJerarquicas(
      {
        fecha_inicio: objetivoSeleccionado?.fecha_inicio ?? null,
        fecha_fin: objetivoSeleccionado?.fecha_fin ?? null
      },
      fechaInicioSeleccionada
    )
  }, [fechaInicioSeleccionada, objetivoSeleccionado])

  useEffect(() => {
    if (!abierto || modo === 'ver') {
      return
    }

    void trigger(['fecha_inicio', 'fecha_fin'])
  }, [abierto, modo, objetivoSeleccionadoId, fechaInicioSeleccionada, fechaFinSeleccionada, trigger])

  const helperAlcance = configuracionRice
    ? `Impactados por ${formatearAlcancePeriodoRice(configuracionRice.alcance_periodo)}`
    : 'Impactados (periodo)'

  const helperEsfuerzo = configuracionRice
    ? formatearEsfuerzoUnidadRice(configuracionRice.esfuerzo_unidad)
    : 'Esfuerzo (unidad)'

  return (
    <ModalIniciativaRoadmap
      abierto={abierto}
      modo={modo}
      register={register}
      errors={errors}
      isSubmitting={isSubmitting}
      isValid={isValid}
      objetivos={objetivos}
      ventanas={ventanas}
      etapas={etapas}
      objetivoSeleccionado={objetivoSeleccionado}
      limitesFechasObjetivo={limitesFechasObjetivo}
      helperAlcance={helperAlcance}
      helperEsfuerzo={helperEsfuerzo}
      riceCalculado={riceCalculado}
      alCerrar={alCerrar}
      onSubmit={handleSubmit(async (valores) => {
        if (modo === 'ver') {
          return
        }

        try {
          const erroresJerarquicos = validarJerarquiaFechas(
            {
              fecha_inicio: valores.fecha_inicio,
              fecha_fin: valores.fecha_fin
            },
            {
              fecha_inicio: objetivoSeleccionado?.fecha_inicio ?? null,
              fecha_fin: objetivoSeleccionado?.fecha_fin ?? null
            },
            'objetivo'
          )

          if (erroresJerarquicos.length > 0) {
            for (const errorJerarquico of erroresJerarquicos) {
              setError(errorJerarquico.campo, { type: 'validate', message: errorJerarquico.mensaje })
            }

            return
          }

          const carga = {
            ...valores,
            objetivo_id: valores.objetivo_id || null,
            ventana_planificada_id: valores.ventana_planificada_id || null,
            etapa_id: valores.etapa_id || null,
            fecha_inicio: valores.fecha_inicio || null,
            fecha_fin: valores.fecha_fin || null
          }

          if (modo === 'crear') {
            await crearIniciativa(carga)
          }

          if (modo === 'editar' && iniciativa) {
            await editarIniciativa(iniciativa.id, carga)
          }

          alCerrar()
          await alGuardado()
        } catch (errorInterno) {
          alError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar la iniciativa')
        }
      })}
    />
  )
}