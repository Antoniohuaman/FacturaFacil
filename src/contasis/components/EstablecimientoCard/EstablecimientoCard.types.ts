/**
 * Tipos para EstablecimientoCard
 * Interfaz para la entidad Establecimiento
 */

export interface Establecimiento {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
  direccion: string;
  distrito: string;
  provincia: string;
  departamento?: string;
}

export interface EstablecimientoCardProps {
  establecimiento: Establecimiento;
  onToggleActivo: (id: number) => void;
  onEditar: (id: number) => void;
  onEliminar: (id: number) => void;
}
