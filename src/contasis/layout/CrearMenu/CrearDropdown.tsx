import React, { useState } from 'react';
import { FileText, Users, Package, Settings, ChevronRight } from 'lucide-react';
import { OtrasOpcionesSubmenu } from './OtrasOpcionesSubmenu';
import type { DocumentoTipo } from './types';

interface CrearDropdownProps {
  isOpen: boolean;
  onCrearDocumento: (tipo: DocumentoTipo) => void;
  onCrearCliente: () => void;
  onCrearProducto: () => void;
}

export const CrearDropdown: React.FC<CrearDropdownProps> = ({
  isOpen,
  onCrearDocumento,
  onCrearCliente,
  onCrearProducto
}) => {
  const [submenuOpen, setSubmenuOpen] = useState(false);

  if (!isOpen) return null;

  const handleToggleSubmenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSubmenuOpen(!submenuOpen);
  };

  return (
    <div 
      className="absolute top-full right-0 mt-2 w-[260px] bg-surface-0 border border-secondary rounded-xl shadow-lg z-[1000]"
      style={{
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}
    >
      {/* Sección Ventas */}
      <div className="px-4 pt-3 pb-1.5">
        <div className="text-[10px] font-semibold text-secondary uppercase tracking-wider">
          Ventas
        </div>
      </div>
      
      <button
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-primary hover:bg-surface-hover transition-colors"
        onClick={() => onCrearDocumento('boleta')}
      >
        <FileText size={18} className="shrink-0 text-secondary" />
        <span>Boleta de Venta</span>
      </button>

      <button
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-primary hover:bg-surface-hover transition-colors"
        onClick={() => onCrearDocumento('factura')}
      >
        <FileText size={18} className="shrink-0 text-secondary" />
        <span>Factura de Venta</span>
      </button>

      <button
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-primary hover:bg-surface-hover transition-colors"
        onClick={() => onCrearDocumento('nota-venta')}
      >
        <FileText size={18} className="shrink-0 text-secondary" />
        <span>Nota de Venta</span>
      </button>

      {/* Separador */}
      <div className="my-2 border-t border-muted"></div>

      {/* Sección Gestión */}
      <div className="px-4 pt-1.5 pb-1.5">
        <div className="text-[10px] font-semibold text-secondary uppercase tracking-wider">
          Gestión
        </div>
      </div>
      
      <button
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-primary hover:bg-surface-hover transition-colors"
        onClick={onCrearCliente}
      >
        <Users size={18} className="shrink-0 text-secondary" />
        <span>Cliente</span>
      </button>

      <button
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-primary hover:bg-surface-hover transition-colors"
        onClick={onCrearProducto}
      >
        <Package size={18} className="shrink-0 text-secondary" />
        <span>Producto</span>
      </button>

      {/* Separador */}
      <div className="my-2 border-t border-muted"></div>

      {/* Otras opciones con submenu */}
      <div className="relative pb-2">
      <button
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-primary hover:bg-surface-hover transition-colors"
        onClick={handleToggleSubmenu}
      >
        <Settings size={18} className="shrink-0 text-secondary" />
        <span className="flex-1 text-left">Otras opciones</span>
        <ChevronRight size={14} className="shrink-0 text-secondary" />

        <OtrasOpcionesSubmenu
          isOpen={submenuOpen}
          onCrearDocumento={onCrearDocumento}
        />
      </button>
      </div>
    </div>
  );
};
