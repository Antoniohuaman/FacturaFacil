import React, { useState, useRef, useEffect } from 'react';
import { CajaDropdown } from './CajaDropdown';
import type { CajaStatusProps } from './types';

export const CajaStatus: React.FC<CajaStatusProps> = ({
  data,
  onVerMovimientos,
  onCerrarCaja
}) => {
  const [isOpen, setIsOpen] = useState(false);
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

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const total = data.montos.efectivo + data.montos.tarjetas + data.montos.digital;

  return (
    <div ref={containerRef} className="relative">
      <button
        className={`
          flex items-center gap-1.5 px-3 h-9 rounded-lg border transition-all duration-200 cursor-pointer
          ${data.abierta 
            ? 'border-success bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:hover:bg-green-900/40 dark:border-green-700' 
            : 'border-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 dark:border-red-700'
          }
        `}
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-label="Estado de caja"
      >
        <span 
          className={`
            w-2 h-2 rounded-full
            ${data.abierta ? 'bg-success animate-pulse' : 'bg-red-500'}
          `}
          style={data.abierta ? {
            boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.2)'
          } : undefined}
        />
        <span className={`text-sm font-medium whitespace-nowrap ${data.abierta ? 'text-success dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
          Caja
        </span>
        <svg 
          width="14" 
          height="14" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${data.abierta ? 'text-success dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <CajaDropdown
        isOpen={isOpen}
        data={data}
        total={total}
        onVerMovimientos={() => {
          onVerMovimientos?.();
          setIsOpen(false);
        }}
        onCerrarCaja={() => {
          onCerrarCaja?.();
          setIsOpen(false);
        }}
      />
    </div>
  );
};
