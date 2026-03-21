import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { crearObjetivo, editarObjetivo } from '@/aplicacion/casos-uso/objetivos'
import { objetivoSchema, type ObjetivoEntrada } from '@/compartido/validacion/esquemas'
import type { Objetivo } from '@/dominio/modelos'
import { ModalObjetivoRoadmap } from './ModalObjetivoRoadmap'
import { crearValoresInicialesObjetivoRoadmap } from './auxiliaresFormulariosRoadmap'
import type { ModoModalRoadmap } from './tiposModalRoadmap'

interface GestorModalObjetivoRoadmapProps {
  abierto: boolean
  modo: ModoModalRoadmap
  objetivo: Objetivo | null
  alCerrar: () => void
  alGuardado: () => Promise<void> | void
  alError: (mensaje: string) => void
}

export function GestorModalObjetivoRoadmap({
  abierto,
  modo,
  objetivo,
  alCerrar,
  alGuardado,
  alError
}: GestorModalObjetivoRoadmapProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<ObjetivoEntrada>({
    resolver: zodResolver(objetivoSchema),
    defaultValues: crearValoresInicialesObjetivoRoadmap(null)
  })

  useEffect(() => {
    if (!abierto) {
      return
    }

    reset(crearValoresInicialesObjetivoRoadmap(objetivo))
  }, [abierto, objetivo, reset])

  return (
    <ModalObjetivoRoadmap
      abierto={abierto}
      modo={modo}
      register={register}
      errors={errors}
      isSubmitting={isSubmitting}
      alCerrar={alCerrar}
      onSubmit={handleSubmit(async (valores) => {
        if (modo === 'ver') {
          return
        }

        try {
          const carga = {
            ...valores,
            fecha_inicio: valores.fecha_inicio || null,
            fecha_fin: valores.fecha_fin || null
          }

          if (modo === 'crear') {
            await crearObjetivo(carga)
          }

          if (modo === 'editar' && objetivo) {
            await editarObjetivo(objetivo.id, carga)
          }

          alCerrar()
          await alGuardado()
        } catch (errorInterno) {
          alError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar el objetivo')
        }
      })}
    />
  )
}