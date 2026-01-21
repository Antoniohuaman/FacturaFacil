export interface CajaData {
  numero: string;
  abierta: boolean;
  apertura: {
    fecha: Date;
    hora: string;
    usuario: string;
  };
  montos: {
    efectivo: number;
    tarjetas: number;
    digital: number;
  };
}

export interface CajaStatusProps {
  data: CajaData;
  onVerMovimientos?: () => void;
  onCerrarCaja?: () => void;
}
