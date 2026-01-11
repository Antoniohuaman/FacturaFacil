import React from 'react';
import type { Currency } from '../../models/comprobante.types';
import type { TaxBreakdownRow } from '../../models/comprobante.types';
import { formatMoney } from '@/shared/currency';

export interface TaxBreakdownSummaryProps {
  taxBreakdown?: TaxBreakdownRow[];
  currency: Currency;
  variant?: 'compact' | 'default';
  /**
   * Descuento global ya calculado (en moneda del documento).
   * Se mostrará sólo si es > 0.
   */
  discountAmount?: number;
  /**
   * Cuando se proporciona, se usará como fallback compacto
   * si no hay taxBreakdown disponible.
   */
  subtotalFallback?: number;
  igvFallback?: number;
  totalFallback?: number;
}

export const TaxBreakdownSummary: React.FC<TaxBreakdownSummaryProps> = ({
  taxBreakdown,
  currency,
  variant = 'default',
  discountAmount,
  subtotalFallback,
  igvFallback,
}) => {
  const rows = taxBreakdown ?? [];
  const hasRows = rows.length > 0;

  const formatValue = (value: number | undefined) => formatMoney(value ?? 0, currency);

  const containerClasses =
    variant === 'compact'
      ? 'space-y-1 text-xs'
      : 'space-y-2 text-xs';

  const hasDiscount = typeof discountAmount === 'number' && discountAmount > 0;

  if (!hasRows && subtotalFallback === undefined && igvFallback === undefined) {
    return null;
  }

  const gravadoRows = rows.filter((row) => row.kind === 'gravado' && row.taxableBase > 0);
  const exoneradoRows = rows.filter((row) => row.kind === 'exonerado' && row.taxableBase > 0);
  const inafectoRows = rows.filter((row) => row.kind === 'inafecto' && row.taxableBase > 0);

  return (
    <div className={containerClasses}>
      {subtotalFallback !== undefined && (
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatValue(subtotalFallback)}</span>
        </div>
      )}
      {hasDiscount && (
        <div className="flex justify-between">
          <span>Descuento:</span>
          <span>-{formatValue(discountAmount)}</span>
        </div>
      )}
      {!hasRows && igvFallback !== undefined && (
        <div className="flex justify-between">
          <span>Impuestos:</span>
          <span>{formatValue(igvFallback)}</span>
        </div>
      )}
      {gravadoRows.map((row) => {
        const percent = Math.round(row.igvRate * 100);
        const bucketLabel = percent > 0 ? `IGV ${percent}%` : 'IGV';
        return (
          <div key={row.key} className="flex justify-between">
            <span>{bucketLabel}:</span>
            <span>{formatValue(row.taxAmount)}</span>
          </div>
        );
      })}
      {exoneradoRows.map((row) => (
        <div key={row.key} className="flex justify-between">
          <span>Exonerado:</span>
          <span>{formatValue(row.taxAmount)}</span>
        </div>
      ))}
      {inafectoRows.map((row) => (
        <div key={row.key} className="flex justify-between">
          <span>Inafecto:</span>
          <span>{formatValue(row.taxAmount)}</span>
        </div>
      ))}
    </div>
  );
};
