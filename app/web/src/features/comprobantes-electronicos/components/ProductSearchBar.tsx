import React, { useState, useRef } from 'react';
import { Search, Plus, Scan, X, Loader2 } from 'lucide-react';
import type { ProductSearchBarProps } from '../models/comprobante.types';
import { UI_MESSAGES } from '../models/constants';

export const ProductSearchBar: React.FC<ProductSearchBarProps> = ({
  onSearch,
  onScanBarcode,
  onCreateProduct,
  placeholder = UI_MESSAGES.SEARCH_PLACEHOLDER,
  isLoading = false
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    onSearch(value);
  };

  const handleClearSearch = () => {
    setSearchValue('');
    onSearch('');
    inputRef.current?.focus();
  };

  const handleScanClick = () => {
    if (onScanBarcode) {
      // Simular escaneo por ahora - en producción abriría cámara o conectaría con escáner
      const mockBarcode = '00168822'; // Código del Sketch ARTESCO
      onScanBarcode(mockBarcode);
    }
  };

  const handleCreateClick = () => {
    if (onCreateProduct) {
      onCreateProduct();
    }
  };

  return (
    <div className="w-full">
      {/* Barra de búsqueda principal */}
      <div className={`relative flex items-center bg-white rounded-xl border-2 transition-all duration-200 ${
        isFocused ? 'border-blue-500 shadow-lg' : 'border-gray-200 shadow-sm'
      }`}>
        
        {/* Icono de búsqueda o loading */}
        <div className="absolute left-4 flex items-center">
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          ) : (
            <Search className="h-5 w-5 text-gray-400" />
          )}
        </div>

        {/* Input de búsqueda */}
        <input
          ref={inputRef}
          type="text"
          value={searchValue}
          onChange={handleSearchChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="flex-1 pl-12 pr-4 py-4 text-gray-900 bg-transparent border-0 focus:outline-none focus:ring-0 placeholder-gray-500"
          disabled={isLoading}
        />

        {/* Botón limpiar búsqueda */}
        {searchValue && (
          <button
            onClick={handleClearSearch}
            className="absolute right-20 p-1 hover:bg-gray-100 rounded-full transition-colors"
            disabled={isLoading}
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}

        {/* Botones de acción */}
        <div className="flex items-center gap-2 pr-4">
          {/* Botón escanear */}
          {onScanBarcode && (
            <button
              onClick={handleScanClick}
              className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
              disabled={isLoading}
              title="Escanear código de barras"
            >
              <Scan className="h-4 w-4" />
              <span className="hidden sm:inline">Escanear</span>
            </button>
          )}

          {/* Botón crear producto */}
          {onCreateProduct && (
            <button
              onClick={handleCreateClick}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium shadow-sm"
              disabled={isLoading}
              title="Crear nuevo producto"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nuevo</span>
            </button>
          )}
        </div>
      </div>

      {/* Indicadores de estado */}
      {isLoading && (
        <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>{UI_MESSAGES.SEARCH_LOADING}</span>
        </div>
      )}

      {searchValue && !isLoading && (
        <div className="mt-2 text-sm text-gray-500">
          Buscando: "<span className="font-medium">{searchValue}</span>"
        </div>
      )}
    </div>
  );
};