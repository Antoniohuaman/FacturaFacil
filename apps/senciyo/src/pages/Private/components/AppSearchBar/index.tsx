import React from 'react';
import { SearchBar } from '../../../../contasis/SearchBar';
import { useContasisDatasets } from './useContasisDatasets';

export interface AppSearchBarProps {
  placeholder?: string;
  className?: string;
}

export const AppSearchBar: React.FC<AppSearchBarProps> = ({ 
  placeholder = "Buscar productos, clientes...",
  className = ""
}) => {
  const { datasets, handleSearchSelect } = useContasisDatasets();

  return (
    <SearchBar
      placeholder={placeholder}
      datasets={datasets}
      onSelect={handleSearchSelect}
      className={className}
    />
  );
};