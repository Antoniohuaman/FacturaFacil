import React, { useState, useRef, useEffect } from 'react';
import type { EmpresaSelectorProps } from './types';

export const EmpresaSelector: React.FC<EmpresaSelectorProps> = ({
  actual,
  empresas = [],
  sedes = [],
  onChangeEmpresa,
  onChangeSede,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEmpresa, setExpandedEmpresa] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    setSearchQuery('');
  };

  const handleSelectEmpresa = (empresaId: string) => {
    onChangeEmpresa?.(empresaId);
    setIsOpen(false);
  };

  const handleSelectSede = (sedeId: string) => {
    onChangeSede?.(sedeId);
    setIsOpen(false);
  };

  // Filtrar empresas por búsqueda
  const filteredEmpresas = empresas.filter(empresa =>
    empresa.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    empresa.ruc?.includes(searchQuery)
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Botón Selector */}
      <button
        onClick={handleToggle}
        className="h-10 flex items-center gap-2.5 px-3 bg-surface-2/30 hover:bg-surface-hover rounded-lg cursor-pointer transition-all duration-200"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Logo */}
        <div 
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
          style={{ background: actual.empresa.gradient || 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}
        >
          <svg width="16" height="16" fill="white" viewBox="0 0 24 24" strokeWidth="0">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <path d="M9 22V12h6v10"/>
          </svg>
        </div>

        {/* Separador */}
        <div className="h-6 w-px bg-secondary/30"></div>

        {/* Textos */}
        <div className="flex flex-col items-start justify-center min-w-0 pr-1 gap-0.5">
          <div className="text-[13px] font-semibold text-primary leading-tight w-full text-left truncate">
            {actual.empresa.nombre}
          </div>
          <div className="text-[10px] text-secondary leading-tight w-full text-left truncate">
            {actual.sede.nombre}
          </div>
        </div>

        {/* Chevron */}
        <svg 
          width="14" 
          height="14" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          className={`text-secondary flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-2 w-[340px] max-h-[480px] bg-surface-0 border border-secondary rounded-xl shadow-lg z-[1000] overflow-auto"
          style={{
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}
        >
          {/* Búsqueda */}
          <div className="p-3 border-b border-secondary sticky top-0 bg-surface-0 z-10">
            <div className="relative">
              <svg 
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar empresa o sucursal..."
                className="w-full h-9 pl-9 pr-3 bg-surface-2 border border-secondary rounded-lg text-sm text-primary placeholder-tertiary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Contenido */}
          <div className="py-2">
            {/* Empresa Actual */}
            <div className="px-4 pt-2 pb-1">
              <div className="text-[10px] font-semibold text-tertiary uppercase tracking-wide">
                Actual
              </div>
            </div>
            
            <div className="px-3 pb-3">
              <div className="p-3 bg-primary-light dark:bg-surface-2 border-[1.5px] border-primary rounded-lg">
                <div className="flex items-center gap-2.5 mb-2">
                  <div 
                    className="w-8 h-8 rounded-md flex items-center justify-center"
                    style={{ background: actual.empresa.gradient || 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}
                  >
                    <svg width="16" height="16" fill="white" viewBox="0 0 24 24" strokeWidth="0">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                      <path d="M9 22V12h6v10"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-primary mb-0.5">
                      {actual.empresa.nombre}
                    </div>
                    {actual.empresa.ruc && (
                      <div className="text-[11px] text-secondary">
                        RUC: {actual.empresa.ruc}
                      </div>
                    )}
                  </div>
                </div>
                <div className="pl-[42px]">
                  <div className="text-[13px] font-medium text-primary mb-0.5 flex items-center gap-1">
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    </svg>
                    {actual.sede.nombre}
                  </div>
                  {actual.sede.direccion && (
                    <div className="text-[11px] text-secondary pl-4">
                      {actual.sede.direccion}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cambiar a */}
            {filteredEmpresas.length > 0 && (
              <>
                <div className="px-4 pt-1 pb-1">
                  <div className="text-[10px] font-semibold text-tertiary uppercase tracking-wide">
                    Cambiar a
                  </div>
                </div>
                
                <div className="px-4">
                  {filteredEmpresas
                    .filter(empresa => empresa.id !== actual.empresa.id)
                    .map((empresa) => {
                      const empresaSedes = sedes.filter(s => s.empresaId === empresa.id);
                      const isExpanded = expandedEmpresa === empresa.id;
                      
                      return (
                        <div key={empresa.id}>
                          <button
                            onClick={() => setExpandedEmpresa(isExpanded ? null : empresa.id)}
                            className="w-full flex items-center gap-2.5 py-2.5 cursor-pointer hover:bg-surface-hover rounded-lg px-2 -mx-2 transition-colors"
                          >
                            <div 
                              className="w-7 h-7 rounded-md flex items-center justify-center"
                              style={{ background: empresa.gradient || 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}
                            >
                              <svg width="14" height="14" fill="white" viewBox="0 0 24 24" strokeWidth="0">
                                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                                <path d="M9 22V12h6v10"/>
                              </svg>
                            </div>
                            <div className="flex-1 text-left">
                              <div className="text-[13px] font-semibold text-primary">
                                {empresa.nombre}
                                {empresaSedes.length > 0 && (
                                  <span className="inline-block ml-1.5 px-1.5 py-0.5 bg-success-bg text-success rounded text-[10px] font-semibold">
                                    {empresaSedes.length} {empresaSedes.length === 1 ? 'sede' : 'sedes'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <svg 
                              width="14" 
                              height="14" 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24" 
                              className={`text-tertiary transition-transform duration-200 ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                            </svg>
                          </button>

                          {/* Sedes - expandible */}
                          {isExpanded && empresaSedes.length > 0 && (
                            <div className="pl-[38px] mt-1 mb-2 space-y-1">
                              {empresaSedes.map(sede => (
                                <button
                                  key={sede.id}
                                  onClick={() => {
                                    handleSelectEmpresa(empresa.id);
                                    handleSelectSede(sede.id);
                                  }}
                                  className="w-full py-2 px-3 rounded-lg border-l-2 border-secondary hover:border-primary hover:bg-surface-hover cursor-pointer transition-all text-left"
                                >
                                  <div className="text-xs font-medium text-primary mb-0.5">
                                    {sede.nombre}
                                  </div>
                                  {sede.direccion && (
                                    <div className="text-[11px] text-secondary flex items-center gap-1">
                                      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                      </svg>
                                      {sede.direccion}
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </>
            )}

            {/* Sin resultados */}
            {searchQuery && filteredEmpresas.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-secondary">No se encontraron resultados</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
