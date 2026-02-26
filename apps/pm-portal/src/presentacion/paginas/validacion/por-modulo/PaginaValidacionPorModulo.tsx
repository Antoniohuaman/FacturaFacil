import { PlantillaPagina } from '@/compartido/ui/PlantillaPagina'

export function PaginaValidacionPorModulo() {
  return (
    <PlantillaPagina
      titulo="Validación por módulo"
      descripcion="Resultados de validación agrupados por módulo funcional."
      tipoContenido="tabla"
    />
  )
}
