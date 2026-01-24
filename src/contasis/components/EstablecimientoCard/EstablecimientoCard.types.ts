export interface Establecimiento {
  id: string;
  codigo: string;
  nombre: string;
  esActivo: boolean;
  direccion: string;
  distrito: string;
  provincia: string;
  departamento?: string;
}

export interface EstablecimientoCardProps {
  establecimiento: Establecimiento;
  onToggleActivo: (id: string) => void;
  onEditar: (id: string) => void;
  onEliminar: (id: string) => void;
  dataFocus?: string;
}
