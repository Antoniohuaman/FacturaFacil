import { PlantillaPagina } from '@/compartido/ui/PlantillaPagina'

export function PaginaEjecucionesValidacion() {
  return (
    <PlantillaPagina
      titulo="Ejecuciones de validación"
      descripcion="Historial de ejecuciones, estado y evidencia de aprendizaje."
      tipoContenido="tabla"
    />
  )
}
