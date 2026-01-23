/**
 * Tipos para EstablecimientoCard
 * Interfaz para la entidad Establecimiento
 */

export interface Establecimiento {
  id: string; // Cambiar de number a string para evitar conversiones
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
  onToggleActivo: (id: string) => void; // Cambiar de number a string
  onEditar: (id: string) => void; // Cambiar de number a string  
  onEliminar: (id: string) => void; // Cambiar de number a string
  dataFocus?: string; // Para navegación programática
}
