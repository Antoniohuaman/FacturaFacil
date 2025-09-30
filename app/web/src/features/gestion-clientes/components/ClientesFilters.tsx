
import React, { useState, useEffect } from 'react';

export type ClientesFiltersProps = {
  tableRef: React.RefObject<{ hasActiveFilters: () => boolean } | null>;
  onClearFilters: () => void;
};

const ClientesFilters: React.FC<ClientesFiltersProps> = ({ tableRef, onClearFilters }) => {
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  // Verificar filtros activos cada 100ms
  useEffect(() => {
    const checkFilters = () => {
      if (tableRef.current) {
        setHasActiveFilters(tableRef.current.hasActiveFilters());
      }
    };

    checkFilters();
    const interval = setInterval(checkFilters, 100);

    return () => clearInterval(interval);
  }, [tableRef]);

  if (!hasActiveFilters) {
    return null;
  }

  return (
    <div className="mb-4">
      <button
        onClick={onClearFilters}
        className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-all duration-200 hover:shadow-sm"
        title="Cerrar filtros"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
        Cerrar filtros
      </button>
    </div>
  );
};

export default ClientesFilters;