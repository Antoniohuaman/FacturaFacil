import React from 'react';
import { Search as SearchIcon, X } from 'lucide-react';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  className?: string;
  showClearButton?: boolean;
  onClear?: () => void;
  autoFocus?: boolean;
  showCommandPalette?: boolean;
  onOpenCommandPalette?: () => void;
  commandPaletteShortcut?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onFocus,
  onKeyDown,
  placeholder = "Buscar...",
  className = "",
  showClearButton = true,
  onClear,
  autoFocus = false,
  showCommandPalette = false,
  onOpenCommandPalette,
  commandPaletteShortcut = "Ctrl+K",
}) => {
  const hasText = value.trim().length > 0;

  return (
    <div className={`relative w-full ${className}`}>
      <SearchIcon 
        size={16} 
        className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" 
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`w-full pl-9 ${hasText && showClearButton ? 'pr-20' : showCommandPalette ? 'pr-16' : 'pr-4'} py-2 rounded-lg border border-[color:var(--border-default)]
                   focus:border-[color:var(--border-focus)] focus:outline-none
                   bg-surface-0 text-sm transition-colors text-primary placeholder-secondary`}
      />
      {hasText && showClearButton && (
        <button
          type="button"
          aria-label="Limpiar búsqueda"
          onClick={() => {
            onChange('');
            onClear?.();
          }}
          className="absolute right-12 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-secondary hover:text-primary hover:bg-surface-hover transition-colors"
        >
          <X size={12} />
        </button>
      )}
      {showCommandPalette && (
        <button
          onClick={() => onOpenCommandPalette?.()}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 
                   px-1.5 py-0.5 hover:bg-surface-hover rounded transition-colors"
        >
          <kbd className="text-[10px] font-medium text-tertiary">{commandPaletteShortcut}</kbd>
        </button>
      )}
    </div>
  );
};