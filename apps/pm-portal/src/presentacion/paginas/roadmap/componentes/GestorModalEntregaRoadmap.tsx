import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { crearEntrega, editarEntrega } from '@/aplicacion/casos-uso/entregas'
import { entregaSchema, type EntregaEntrada } from '@/compartido/validacion/esquemas'
import { construirLimitesFechasJerarquicas, validarJerarquiaFechas } from '@/compartido/validacion/roadmapJerarquiaFechas'
import type { CatalogoVentanaPm, Entrega, Iniciativa } from '@/dominio/modelos'
import { ModalEntregaRoadmap } from './ModalEntregaRoadmap'
import { crearValoresInicialesEntregaRoadmap } from './auxiliaresFormulariosRoadmap'
import type { ModoModalRoadmap } from './tiposModalRoadmap'

interface GestorModalEntregaRoadmapProps {
  abierto: boolean
  modo: ModoModalRoadmap
  entrega: Entrega | null
  iniciativas: Iniciativa[]
  ventanas: CatalogoVentanaPm[]
  alCerrar: () => void
  alGuardado: () => Promise<void> | void
  alError: (mensaje: string) => void
}

export function GestorModalEntregaRoadmap({
  abierto,
  modo,
  entrega,
  iniciativas,
  ventanas,
  alCerrar,
  alGuardado,
  alError
}: GestorModalEntregaRoadmapProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    trigger,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<EntregaEntrada>({
    resolver: zodResolver(entregaSchema),
    defaultValues: crearValoresInicialesEntregaRoadmap(null)
  })

  useEffect(() => {
    if (!abierto) {
      return
    }

    reset(crearValoresInicialesEntregaRoadmap(entrega))
  }, [abierto, entrega, reset])

  const iniciativaSeleccionadaId = watch('iniciativa_id')
  const fechaInicioSeleccionada = watch('fecha_inicio')
  const fechaFinSeleccionada = watch('fecha_fin')

  const iniciativaEntidadPorId = useMemo(() => new Map(iniciativas.map((iniciativa) => [iniciativa.id, iniciativa])), [iniciativas])
  const iniciativaSeleccionada = iniciativaSeleccionadaId ? iniciativaEntidadPorId.get(iniciativaSeleccionadaId) ?? null : null

  const limitesFechasIniciativa = useMemo(() => {
    return construirLimitesFechasJerarquicas(
      {
        fecha_inicio: iniciativaSeleccionada?.fecha_inicio ?? null,
        fecha_fin: iniciativaSeleccionada?.fecha_fin ?? null
      },
      fechaInicioSeleccionada
    )
  }, [fechaInicioSeleccionada, iniciativaSeleccionada])

  useEffect(() => {
    if (!abierto || modo === 'ver') {
      return
    }

    void trigger(['fecha_inicio', 'fecha_fin'])
  }, [abierto, modo, iniciativaSeleccionadaId, fechaInicioSeleccionada, fechaFinSeleccionada, trigger])

  return (
    <ModalEntregaRoadmap
      abierto={abierto}
      modo={modo}
      register={register}
      errors={errors}
      isSubmitting={isSubmitting}
      iniciativas={iniciativas}
      ventanas={ventanas}
      iniciativaSeleccionada={iniciativaSeleccionada}
      limitesFechasIniciativa={limitesFechasIniciativa}
      fechaCompletadoVisible={entrega?.fecha_completado ?? null}
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
              fecha_inicio: iniciativaSeleccionada?.fecha_inicio ?? null,
              fecha_fin: iniciativaSeleccionada?.fecha_fin ?? null
            },
            'iniciativa'
          )

          if (erroresJerarquicos.length > 0) {
            for (const errorJerarquico of erroresJerarquicos) {
              setError(errorJerarquico.campo, { type: 'validate', message: errorJerarquico.mensaje })
            }

            return
          }

          const carga = {
            ...valores,
            iniciativa_id: valores.iniciativa_id || null,
            ventana_planificada_id: valores.ventana_planificada_id || null,
            ventana_real_id: valores.ventana_real_id || null,
            fecha_inicio: valores.fecha_inicio || null,
            fecha_fin: valores.fecha_fin || null,
            fecha_objetivo: valores.fecha_objetivo || null
          }

          if (modo === 'crear') {
            await crearEntrega(carga)
          }

          if (modo === 'editar' && entrega) {
            await editarEntrega(entrega.id, carga)
          }

          alCerrar()
          await alGuardado()
        } catch (errorInterno) {
          alError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar la entrega')
        }
      })}
    />
  )
}