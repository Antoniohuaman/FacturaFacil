import React, { useState, useEffect } from 'react';

// Tipos genéricos
export interface FilterableColumn<T> {
  key: keyof T;
  label: string;
  placeholder: string;
  width: string;
  type: 'text' | 'select';
  options?: Array<{ value: string; label: string }>;
  searchIcon?: 'search' | 'filter' | 'menu';
}

export interface UnderlinedFiltersTableProps<T extends Record<string, any>> {
  data: T[];
  columns: FilterableColumn<T>[];
  onFiltersChange?: (hasActiveFilters: boolean, clearFilters: () => void) => void;
  renderActions?: (item: T, index: number) => React.ReactNode;
  className?: string;
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T) => string;
}

function UnderlinedFiltersTable<T extends Record<string, any>>({
  data,
  columns,
  onFiltersChange,
  renderActions,
  className = '',
  onRowClick,
  rowClassName
}: UnderlinedFiltersTableProps<T>) {
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [filteredData, setFilteredData] = useState<T[]>(data);
  
  // Estados para los filtros - dinámicos basados en las columnas
  const [filters, setFilters] = useState<Record<string, string>>(() => {
    const initialFilters: Record<string, string> = {};
    columns.forEach(col => {
      initialFilters[String(col.key)] = '';
    });
    return initialFilters;
  });

  // Estados para controlar qué filtros están visibles
  const [activeFilters, setActiveFilters] = useState<Record<string, boolean>>(() => {
    const initialActiveFilters: Record<string, boolean> = {};
    columns.forEach(col => {
      initialActiveFilters[String(col.key)] = false;
    });
    return initialActiveFilters;
  });

  // Función para activar/desactivar filtros - activa todos a la vez
  const toggleFilter = () => {
    const allFiltersActive = Object.values(activeFilters).every(active => active);
    
    const newActiveState = !allFiltersActive;
    const newActiveFilters: Record<string, boolean> = {};
    columns.forEach(col => {
      newActiveFilters[String(col.key)] = newActiveState;
    });
    
    setActiveFilters(newActiveFilters);
  };

  // Sincronizar el estado local con las props cuando cambien
  useEffect(() => {
    const filtered = data.filter(item => {
      return columns.every(column => {
        const filterValue = filters[String(column.key)];
        if (!filterValue) return true;

        const itemValue = String(item[column.key] || '').toLowerCase();
        
        if (column.type === 'select') {
          return itemValue === filterValue.toLowerCase();
        } else {
          return itemValue.includes(filterValue.toLowerCase());
        }
      });
    });
    
    setFilteredData(filtered);
  }, [data, filters, columns]);

  // Función para manejar cambios en los filtros
  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Función para limpiar todos los filtros
  const clearAllFilters = () => {
    const clearedFilters: Record<string, string> = {};
    const clearedActiveFilters: Record<string, boolean> = {};
    
    columns.forEach(col => {
      clearedFilters[String(col.key)] = '';
      clearedActiveFilters[String(col.key)] = false;
    });
    
    setFilters(clearedFilters);
    setActiveFilters(clearedActiveFilters);
  };

  // Verificar si hay algún filtro activo
  const hasInternalActiveFilters = Object.values(activeFilters).some(active => active === true) || 
    Object.values(filters).some(value => value.trim() !== '');

  // Notificar cambios de filtros al componente padre
  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange(hasInternalActiveFilters, clearAllFilters);
    }
  }, [hasInternalActiveFilters, onFiltersChange]);

  // Obtener opciones únicas para columnas select
  const getUniqueOptions = (column: FilterableColumn<T>) => {
    if (column.options) return column.options;
    
    const uniqueValues = Array.from(new Set(data.map(item => String(item[column.key]))));
    return uniqueValues.map(value => ({ value, label: value }));
  };

  // Renderizar ícono según el tipo
  const renderSearchIcon = (iconType?: string) => {
    switch (iconType) {
      case 'filter':
        return (
          <svg 
            className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth={2} 
            viewBox="0 0 24 24"
            onClick={() => toggleFilter()}
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        );
      case 'menu':
        return (
          <svg 
            className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth={2} 
            viewBox="0 0 24 24"
            onClick={() => toggleFilter()}
          >
            <path d="M3 12h18m-9-9v18" />
          </svg>
        );
      default: // 'search'
        return (
          <svg 
            className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth={2} 
            viewBox="0 0 24 24"
            onClick={() => toggleFilter()}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        );
    }
  };

  return (
    <>
      <style>{`
        .row-disabled { opacity: 0.5; }
        .menu-popup {
          opacity: 1 !important;
          filter: none !important;
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          min-width: 10rem;
          z-index: 100;
          pointer-events: auto;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
          background: #fff;
          transition: opacity 0.15s;
        }
        .menu-popup-arrow {
          position: absolute; top: -8px; right: 16px; width: 16px; height: 8px;
          overflow: hidden;
        }
        .menu-popup-arrow svg { display: block; }
        
        /* Estilos para filtros underlined */
        .filter-underlined {
          border: none;
          border-bottom: 1px solid #e5e7eb;
          background: transparent;
          padding: 8px 0;
          font-size: 14px;
          width: 100%;
          transition: all 0.2s ease;
          color: #374151;
        }
        .filter-underlined:focus {
          outline: none;
          border-bottom-color: #3b82f6;
          border-bottom-width: 2px;
        }
        .filter-underlined.has-value {
          border-bottom-color: #3b82f6;
          border-bottom-width: 2px;
        }
        .filter-underlined::placeholder {
          color: #9ca3af;
          font-size: 13px;
          font-style: italic;
        }
        
        /* Estilo especial para el select */
        .filter-underlined select {
          appearance: none;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 4px center;
          background-size: 16px;
          padding-right: 20px;
        }
      `}</style>
      <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden w-full mx-0 px-0 relative ${className}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed" style={{ minWidth: '1200px' }}>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {columns.map((column) => (
                  <th key={String(column.key)} className="text-left px-4 py-3 font-medium text-gray-700 text-sm" style={{ width: column.width }}>
                    {activeFilters[String(column.key)] ? (
                      column.type === 'select' ? (
                        <select
                          value={filters[String(column.key)]}
                          onChange={(e) => handleFilterChange(String(column.key), e.target.value)}
                          className={`filter-underlined ${filters[String(column.key)] ? 'has-value' : ''}`}
                          autoFocus
                        >
                          <option value="">Todos</option>
                          {getUniqueOptions(column).map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={filters[String(column.key)]}
                          onChange={(e) => handleFilterChange(String(column.key), e.target.value)}
                          className={`filter-underlined ${filters[String(column.key)] ? 'has-value' : ''}`}
                          placeholder={column.placeholder}
                          autoFocus
                        />
                      )
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{column.label}</span>
                        {renderSearchIcon(column.searchIcon)}
                      </div>
                    )}
                  </th>
                ))}
                {renderActions && (
                  <th className="text-right px-4 py-3 font-medium text-gray-700 text-sm" style={{ width: '10%' }}>
                    &nbsp;
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.map((item, index) => {
                const itemId = item.id || index;
                return (
                  <tr 
                    key={itemId} 
                    className={`hover:bg-gray-50 transition-colors ${rowClassName ? rowClassName(item) : ''} ${onRowClick ? 'cursor-pointer' : ''}`}
                    onClick={() => onRowClick && onRowClick(item)}
                  >
                    {columns.map((column) => (
                      <td key={String(column.key)} className="px-4 py-2 text-sm break-words whitespace-normal" style={{ width: column.width }}>
                        {String(item[column.key] || '')}
                      </td>
                    ))}
                    {renderActions && (
                      <td className="px-4 py-2 text-right" style={{ width: '10%' }}>
                        {renderActions(item, index)}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default UnderlinedFiltersTable;