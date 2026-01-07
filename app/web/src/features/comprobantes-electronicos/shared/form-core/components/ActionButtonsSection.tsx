// ===================================================================
// ACTION BUTTONS SECTION - VERSIÓN MODERNIZADA PREMIUM
// Preserva 100% la funcionalidad, mejora UX y apariencia
// ===================================================================

import React, { type ReactNode } from 'react';
import { Eye, X, Save, CreditCard } from 'lucide-react';

interface ActionButtonsSectionProps {
  onVistaPrevia?: () => void;
  onCancelar: () => void;
  onGuardarBorrador?: () => void;
  onCrearComprobante?: () => void;
  isCartEmpty?: boolean;
  
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
    disabled?: boolean;
    title?: string;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
    disabled?: boolean;
    title?: string;
  };
}

const ActionButtonsSection: React.FC<ActionButtonsSectionProps> = ({
  onVistaPrevia,
  onCancelar,
  onGuardarBorrador,
  onCrearComprobante,
  isCartEmpty = false,
  primaryAction,
  secondaryAction,
}) => {
  const effectivePrimary = primaryAction ?? (onCrearComprobante
    ? {
        label: 'Crear comprobante',
        onClick: onCrearComprobante,
        icon: <CreditCard className="h-4 w-4" />,
        disabled: isCartEmpty,
        title: isCartEmpty ? 'Agregue productos primero' : 'Proceder al pago y crear comprobante (Ctrl+Enter)',
      }
    : null);

  return (
    <div className="sticky bottom-0 z-40 bg-white/90 backdrop-blur p-3 shadow-[0_-1px_6px_rgba(0,0,0,0.06)] border-t border-slate-200">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          {/* Preview button on the left */}
          {onVistaPrevia && (
            <button
              className="group flex items-center gap-2 px-3 py-2 h-9 text-violet-600 bg-white/70 hover:bg-white border border-violet-200 hover:border-violet-300 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-[13px]"
              onClick={onVistaPrevia}
              disabled={isCartEmpty}
              title="Ver vista previa del comprobante (Ctrl+P)"
              aria-label="Vista previa"
            >
              <Eye className="h-4 w-4" />
              Vista previa
            </button>
          )}

          {/* Cart status removed for Emisión Tradicional (belongs to POS flow) */}

          {/* Actions on the right */}
          <div className="ml-auto flex items-center gap-2">
            <button
              className="flex items-center gap-1 px-2 py-1 h-8 text-[13px] text-slate-600 hover:text-slate-800 transition-colors"
              onClick={onCancelar}
              title="Descartar cambios y volver (Esc)"
              aria-label="Cancelar"
            >
              <X className="h-4 w-4" />
              <span className="ml-1">Cancelar</span>
            </button>

            {onGuardarBorrador && (
              <button
                className="flex items-center gap-1 px-2 py-1 h-8 text-[13px] text-violet-600 hover:underline transition-colors"
                onClick={onGuardarBorrador}
                title="Guardar para continuar después (Ctrl+S)"
                aria-label="Guardar borrador"
              >
                <Save className="h-4 w-4" />
                <span className="ml-1">Guardar borrador</span>
              </button>
            )}

            {secondaryAction && (
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-2 h-9 text-[13px] font-semibold text-violet-700 bg-transparent rounded-xl hover:bg-violet-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={secondaryAction.onClick}
                disabled={secondaryAction.disabled}
                title={secondaryAction.title}
              >
                {secondaryAction.icon}
                {secondaryAction.label}
              </button>
            )}

            {effectivePrimary && (
              <button
                className="flex items-center gap-2 px-4 py-2 h-9 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-[13px]"
                onClick={effectivePrimary.onClick}
                disabled={effectivePrimary.disabled}
                title={effectivePrimary.title}
                aria-label="Acción principal"
              >
                {effectivePrimary.icon ?? <CreditCard className="h-4 w-4" />}
                {effectivePrimary.label}
              </button>
            )}
          </div>
        </div>
        {/* Footer tip removed per design request */}
      </div>
    </div>
  );
};

export default ActionButtonsSection;