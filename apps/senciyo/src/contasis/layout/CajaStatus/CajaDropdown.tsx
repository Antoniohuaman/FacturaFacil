import React from 'react';
import { Button } from '../../components/Button';
import type { CajaData } from './types';

interface CajaDropdownProps {
  isOpen: boolean;
  data: CajaData;
  total: number;
  onVerMovimientos: () => void;
  onCerrarCaja: () => void;
}

export const CajaDropdown: React.FC<CajaDropdownProps> = ({
  isOpen,
  data,
  total,
  onVerMovimientos,
  onCerrarCaja
}) => {
  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  };

  return (
    <div 
      className="absolute top-full right-0 mt-2 w-[320px] bg-surface-0 border border-secondary rounded-xl z-50"
      style={{
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-muted bg-surface-0 rounded-t-xl">
        <div className="text-body font-semibold text-primary mb-1">
          Caja #{data.numero} - {data.abierta ? 'Abierta' : 'Cerrada'}
        </div>
        <div className="text-xs text-tertiary">
          Apertura: Hoy {data.apertura.hora} · {data.apertura.usuario}
        </div>
      </div>

      {/* Resumen de montos */}
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center justify-between py-1.5 border-b border-muted">
          <span className="text-xs text-secondary font-medium">Efectivo</span>
          <span className="text-sm font-semibold text-primary">{formatCurrency(data.montos.efectivo)}</span>
        </div>
        <div className="flex items-center justify-between py-1.5 border-b border-muted">
          <span className="text-xs text-secondary font-medium">Tarjetas</span>
          <span className="text-sm font-semibold text-primary">{formatCurrency(data.montos.tarjetas)}</span>
        </div>
        <div className="flex items-center justify-between py-1.5 border-b border-muted">
          <span className="text-xs text-secondary font-medium">Yape/Plin</span>
          <span className="text-sm font-semibold text-primary">{formatCurrency(data.montos.digital)}</span>
        </div>
        <div className="flex items-center justify-between pt-2 mt-1">
          <span className="text-sm text-primary font-semibold">Total</span>
          <span className="text-base font-bold text-success">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Footer con acciones */}
      <div className="px-3 py-3 border-t border-muted bg-surface-0 rounded-b-xl flex gap-2">
        <Button
          variant="secondary"
          size="md"
          onClick={onVerMovimientos}
          icon={
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
          }
          iconPosition="left"
          className="flex-1 text-sm"
        >
          Ver
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={onCerrarCaja}
          icon={
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          }
          iconPosition="left"
          className="flex-1 text-sm"
        >
          Cerrar
        </Button>
      </div>
    </div>
  );
};
