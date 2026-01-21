import { DollarSign, Clock, User } from 'lucide-react';

export interface CajaData {
  cajero: string;
  horaApertura: string;
  montoInicial: number;
  montoActual: number;
  moneda: 'PEN' | 'USD';
  turno?: string;
}

export interface CajaStatusProps {
  data: CajaData;
  onVerMovimientos?: () => void;
  onCerrarCaja?: () => void;
}

export const CajaStatus = ({ data, onVerMovimientos, onCerrarCaja }: CajaStatusProps) => {
  const formatCurrency = (amount: number) => {
    const symbol = data.moneda === 'PEN' ? 'S/' : '$';
    return `${symbol} ${amount.toFixed(2)}`;
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-surface-0 border border-[color:var(--border-default)] rounded-lg">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
          <DollarSign className="w-4 h-4 text-green-600" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-secondary">Caja Abierta</span>
          <span className="text-sm font-medium text-primary">{formatCurrency(data.montoActual)}</span>
        </div>
      </div>
      
      <div className="hidden md:flex items-center gap-2 text-xs text-secondary">
        <User className="w-3 h-3" />
        <span>{data.cajero}</span>
        <Clock className="w-3 h-3 ml-2" />
        <span>{data.horaApertura}</span>
      </div>

      <div className="flex items-center gap-1">
        {onVerMovimientos && (
          <button
            onClick={onVerMovimientos}
            className="px-2 py-1 text-xs text-brand hover:bg-brand-light rounded transition-colors"
          >
            Ver
          </button>
        )}
        {onCerrarCaja && (
          <button
            onClick={onCerrarCaja}
            className="px-2 py-1 text-xs text-error hover:bg-error-light rounded transition-colors"
          >
            Cerrar
          </button>
        )}
      </div>
    </div>
  );
};