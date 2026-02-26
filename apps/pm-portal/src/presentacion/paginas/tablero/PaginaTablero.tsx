import { PlantillaPagina } from '@/compartido/ui/PlantillaPagina'

export function PaginaTablero() {
  return (
    <PlantillaPagina
      titulo="Tablero"
      descripcion="Vista general del estado de producto, métricas clave y seguimiento operativo."
      tipoContenido="tarjetas"
    />
  )
}
