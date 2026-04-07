import { registrarCambioEntidadBestEffort } from '@/aplicacion/casos-uso/historialCambios'

interface RegistroOrdenableConId {
  id: string
  orden: number
}

interface RegistrarCambiosOrdenRoadmapParams<T extends RegistroOrdenableConId> {
  tabla: string
  entidad: 'objetivo' | 'iniciativa' | 'entrega'
  previas: T[]
  actuales: T[]
  metadata?: Record<string, unknown>
}

export async function registrarCambiosOrdenRoadmapBestEffort<T extends RegistroOrdenableConId>({
  tabla,
  entidad,
  previas,
  actuales,
  metadata
}: RegistrarCambiosOrdenRoadmapParams<T>) {
  const previasPorId = new Map(previas.map((registro) => [registro.id, registro]))
  const tareas = actuales
    .map((actual) => {
      const previa = previasPorId.get(actual.id)

      if (!previa || previa.orden === actual.orden) {
        return null
      }

      return registrarCambioEntidadBestEffort({
        tabla,
        moduloCodigo: 'roadmap',
        entidad,
        entidadId: actual.id,
        accion: 'editar',
        antes: previa,
        despues: actual,
        metadata: {
          reordenamiento_manual: true,
          ...(metadata ?? {})
        }
      })
    })
    .filter((tarea): tarea is Promise<void> => Boolean(tarea))

  await Promise.all(tareas)
}