import React from 'react';
import { CreditCard, DollarSign } from 'lucide-react';
import type { DocumentoTipo } from './types';

interface OtrasOpcionesSubmenuProps {
  isOpen: boolean;
  onCrearDocumento: (tipo: DocumentoTipo) => void;
}

export const OtrasOpcionesSubmenu: React.FC<OtrasOpcionesSubmenuProps> = ({
  isOpen,
  onCrearDocumento
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="absolute left-full top-0 ml-1 w-[200px] bg-surface-0 border border-secondary rounded-lg shadow-lg z-[1001] py-2"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-primary hover:bg-surface-hover transition-colors"
        onClick={() => onCrearDocumento('nota-credito')}
      >
        <CreditCard size={18} className="shrink-0 text-secondary" />
        <span>Nota de Crédito</span>
      </button>

      <button
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-primary hover:bg-surface-hover transition-colors"
        onClick={() => onCrearDocumento('nota-debito')}
      >
        <DollarSign size={18} className="shrink-0 text-secondary" />
        <span>Nota de Débito</span>
      </button>
    </div>
  );
};
