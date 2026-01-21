import React from 'react';
import type { SearchSection } from '../types/search.types';
import { ResultItem } from './ResultItem';

export interface SearchResultsDropdownProps {
  isOpen: boolean;
  sections: Record<string, SearchSection>;
  searchQuery: string;
  hasResults: boolean;
  shouldSearch: boolean;
  onSelectResult: (type: string, item: any) => void;
  onSeeAll?: (sectionKey: string) => void;
  renderHighlight?: (value?: string, query?: string) => React.ReactNode;
  className?: string;
}

export const SearchResultsDropdown: React.FC<SearchResultsDropdownProps> = ({
  isOpen,
  sections,
  searchQuery,
  hasResults,
  shouldSearch,
  onSelectResult,
  onSeeAll,
  renderHighlight,
  className = "",
}) => {
  if (!isOpen) return null;

  const visibleSections = Object.entries(sections).filter(([, section]) => section.items.length > 0);

  return (
    <div className={`absolute top-full left-0 mt-2 w-full max-w-[520px] bg-surface-0 border border-[color:var(--border-default)] rounded-lg shadow-lg z-50 max-h-[440px] overflow-y-auto ${className}`}>
      {hasResults && visibleSections.map(([key, section], index) => (
        <div
          key={key}
          className={`p-2 ${index > 0 ? 'border-t border-[color:var(--border-subtle)]' : ''}`}
        >
          <div className="flex items-center justify-between px-2 py-1.5 text-[11px] font-semibold text-tertiary uppercase">
            <span>{section.title}</span>
            {section.hasMore && section.routeBase && onSeeAll && (
              <button
                type="button"
                className="text-[10px] font-medium text-brand hover:text-brand-hover transition-colors"
                onClick={() => onSeeAll(key)}
              >
                Ver todos
              </button>
            )}
          </div>
          {section.items.map((result) => (
            <ResultItem
              key={`${key}-${result.id}`}
              result={result}
              query={searchQuery}
              onClick={() => onSelectResult(result.type, result.entity)}
              renderHighlight={renderHighlight}
            />
          ))}
        </div>
      ))}

      {/* Sin resultados */}
      {shouldSearch && !hasResults && (
        <div className="p-6 text-center">
          <p className="text-sm text-secondary">No se encontraron resultados</p>
        </div>
      )}

      {/* Término muy corto o inválido */}
      {!shouldSearch && searchQuery.length > 0 && searchQuery.trim().length > 0 && (
        <div className="p-6 text-center">
          <p className="text-sm text-secondary">Continúa escribiendo para buscar...</p>
        </div>
      )}
    </div>
  );
};