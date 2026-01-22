import React, { useState, useRef, useEffect } from 'react';
import type { SearchBarProps } from './types/search.types';
import { SearchInput } from './components/SearchInput';
import { SearchResultsDropdown } from './components/SearchResultsDropdown';
import { useSearchEngine } from './hooks/useSearchEngine';
import { useHighlight } from './hooks/useHighlight';

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Buscar...",
  value = '',
  onChange,
  onSelect,
  datasets = [],
  className = '',
  showCommandPalette = true,
  onOpenCommandPalette,
  commandPaletteShortcut = "Ctrl+K",
}) => {
  const [showResults, setShowResults] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const {
    searchQuery,
    setSearchQuery,
    searchSections,
    hasResults,
    hasSearchText,
    shouldSearch,
    clearSearch,
  } = useSearchEngine(datasets);

  const { renderHighlight } = useHighlight();

  // Sincronizar con props externas
  useEffect(() => {
    if (value !== undefined && value !== searchQuery) {
      setSearchQuery(value);
    }
  }, [value, searchQuery, setSearchQuery]);

  const handleSearchChange = (newValue: string) => {
    setSearchQuery(newValue);
    
    // Limpiar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    const hasValidText = newValue.trim().length > 0;
    if (hasValidText) {
      // Delay más corto para mejor UX
      timeoutRef.current = setTimeout(() => {
        setShowResults(true);
      }, 100);
    } else {
      setShowResults(false);
    }
    
    onChange?.(newValue);
  };

  const handleFocus = () => {
    if (searchQuery.length > 0) {
      setShowResults(true);
    }
  };

  const handleSelectResult = (type: string, item: unknown) => {
    onSelect?.(type, item);
    setShowResults(false);
  };

  const handleClear = () => {
    clearSearch();
    setShowResults(false);
    onChange?.('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Manejar Ctrl+K con mayor prioridad
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      e.stopPropagation();
      onOpenCommandPalette?.();
      setShowResults(false);
      return;
    }
    
    if (e.key === 'Escape') {
      setShowResults(false);
    }
  };

  // Manejar Ctrl+K globalmente como backup
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k' && showCommandPalette) {
        e.preventDefault();
        e.stopPropagation();
        onOpenCommandPalette?.();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
    };
  }, [showCommandPalette, onOpenCommandPalette]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: PointerEvent) => {
      if (!searchContainerRef.current || !showResults) {
        return;
      }

      const targetNode = event.target;
      if (!(targetNode instanceof Node)) {
        return;
      }

      if (!searchContainerRef.current.contains(targetNode)) {
        setShowResults(false);
      }
    };

    document.addEventListener('pointerdown', handleClickOutside, true);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside, true);
      // Limpiar timeout al desmontar
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [showResults]);

  return (
    <div ref={searchContainerRef} className={`relative ${className}`}>
      <SearchInput
        value={searchQuery}
        onChange={handleSearchChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        onClear={handleClear}
        placeholder={placeholder}
        showClearButton={hasSearchText}
        showCommandPalette={showCommandPalette}
        onOpenCommandPalette={onOpenCommandPalette}
        commandPaletteShortcut={commandPaletteShortcut}
      />
      
      <SearchResultsDropdown
        isOpen={showResults}
        sections={searchSections}
        searchQuery={searchQuery}
        hasResults={hasResults}
        shouldSearch={shouldSearch}
        onSelectResult={handleSelectResult}
        renderHighlight={renderHighlight}
      />
    </div>
  );
};