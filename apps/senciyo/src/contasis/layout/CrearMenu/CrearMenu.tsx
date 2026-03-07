import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../../components/Button';
import { CrearDropdown } from './CrearDropdown';
import type { CrearMenuProps, DocumentoTipo } from './types';

export const CrearMenu: React.FC<CrearMenuProps> = ({
  onCrearDocumento,
  onCrearCliente,
  onCrearProducto
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

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleCrearDocumento = (tipo: DocumentoTipo) => {
    onCrearDocumento?.(tipo);
    setIsOpen(false);
  };

  const handleCrearCliente = () => {
    onCrearCliente?.();
    setIsOpen(false);
  };

  const handleCrearProducto = () => {
    onCrearProducto?.();
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="secondary"
        size="sm"
        iconOnly
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-label="Crear"
        title="Crear"
        icon={
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
          </svg>
        }
      />

      <CrearDropdown
        isOpen={isOpen}
        onCrearDocumento={handleCrearDocumento}
        onCrearCliente={handleCrearCliente}
        onCrearProducto={handleCrearProducto}
      />
    </div>
  );
};
