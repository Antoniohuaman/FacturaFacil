import type { ReactNode } from 'react';

export interface CajaCardProps {
  caja: {
    id: string;
    nombreCaja: string;
    habilitadaCaja: boolean;
    monedaIdCaja: string;
    limiteMaximoCaja: number;
    margenDescuadreCaja: number;
    mediosPagoPermitidos: string[];
    actualizadoElCaja: Date;
    usuariosAutorizadosCaja: string[];
    observacionesCaja?: string;
    establecimientoIdCaja: string;
  };
  currency?: {
    id: string;
    code: string;
    symbol: string;
    name?: string;
  };
  onEdit: (id: string) => void;
  onToggleEnabled: (id: string) => void;
  onDelete: (id: string) => void;
  onVerTurnos?: (id: string) => void;
  className?: string;
}
