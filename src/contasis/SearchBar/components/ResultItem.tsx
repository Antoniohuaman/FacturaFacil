import React from 'react';
import type { SearchDisplayItem } from '../types/search.types';

export interface ResultItemProps {
  result: SearchDisplayItem;
  query?: string;
  onClick: () => void;
  renderHighlight?: (value?: string, query?: string) => React.ReactNode;
}

export const ResultItem: React.FC<ResultItemProps> = ({
  result,
  query = '',
  onClick,
  renderHighlight,
}) => {
  const formatCurrency = (value?: number, currency?: string) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return `${currency ?? 'S/'} 0.00`;
    }
    return `${currency ?? 'S/'} ${value.toFixed(2)}`;
  };

  const amountText = typeof result.amountValue === 'number'
    ? formatCurrency(result.amountValue, result.amountCurrency)
    : undefined;

  return (
    <button
      className="w-full text-left px-2 py-2 rounded hover:bg-surface-hover transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-primary truncate">
            {renderHighlight ? renderHighlight(result.title, query) : result.title}
          </div>
          {result.subtitle && (
            <div className="text-xs text-secondary truncate">
              {renderHighlight ? renderHighlight(result.subtitle, query) : result.subtitle}
            </div>
          )}
          {result.meta && (
            <div className="text-[11px] text-tertiary truncate">
              {renderHighlight ? renderHighlight(result.meta, query) : result.meta}
            </div>
          )}
        </div>
        {amountText && (
          <div className="text-right whitespace-nowrap">
            {result.amountLabel && (
              <div className="text-[10px] uppercase text-tertiary tracking-wide">
                {result.amountLabel}
              </div>
            )}
            <div className="text-sm font-semibold text-primary">
              {renderHighlight ? renderHighlight(amountText, query) : amountText}
            </div>
          </div>
        )}
      </div>
    </button>
  );
};