// ===================================================================
// ACTION BUTTONS SECTION - VERSIÓN MODERNIZADA PREMIUM
// Preserva 100% la funcionalidad, mejora UX y apariencia
// ===================================================================

import React from 'react';
import { Eye, X, Save, CreditCard, ShoppingCart } from 'lucide-react';

interface ActionButtonsSectionProps {
  onVistaPrevia?: () => void;
  onCancelar: () => void;
  onGuardarBorrador?: () => void;
  onCrearComprobante?: () => void;
  isCartEmpty?: boolean;
  productsCount?: number;
}

const ActionButtonsSection: React.FC<ActionButtonsSectionProps> = ({
  onVistaPrevia,
  onCancelar,
  onGuardarBorrador,
  onCrearComprobante,
  isCartEmpty = false,
  productsCount = 0,
}) => {
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

          {/* Cart status small */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200 text-slate-600 text-[12px]">
            <ShoppingCart className="w-3.5 h-3.5 text-violet-600" />
            <span className="font-medium">{productsCount}</span>
            {isCartEmpty && <span className="ml-1 text-amber-600">Agregue productos</span>}
          </div>

          {/* Actions on the right */}
          <div className="ml-auto flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 px-3 py-2 h-9 text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 font-medium shadow-sm text-[13px]"
              onClick={onCancelar}
              title="Descartar cambios y volver (Esc)"
              aria-label="Cancelar"
            >
              <X className="h-4 w-4" />
              Cancelar
            </button>

            {onGuardarBorrador && (
              <button
                className="flex items-center gap-1.5 px-3 py-2 h-9 text-violet-700 bg-white border border-violet-300 rounded-xl hover:bg-violet-50 hover:border-violet-400 transition-all duration-200 font-medium shadow-sm text-[13px]"
                onClick={onGuardarBorrador}
                title="Guardar para continuar después (Ctrl+S)"
                aria-label="Guardar borrador"
              >
                <Save className="h-4 w-4" />
                Guardar borrador
              </button>
            )}

            {onCrearComprobante && (
              <button
                className="flex items-center gap-2 px-4 py-2 h-9 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-[13px]"
                onClick={onCrearComprobante}
                disabled={isCartEmpty}
                title={isCartEmpty ? 'Agregue productos primero' : 'Proceder al pago y crear comprobante (Ctrl+Enter)'}
                aria-label="Crear comprobante"
              >
                <CreditCard className="h-4 w-4" />
                Crear comprobante
              </button>
            )}
          </div>
        </div>
        <div className="mt-2 text-[12px] text-slate-600">
          Tip: Ctrl+P vista previa, Ctrl+S guardar, Ctrl+Enter crear.
        </div>
      </div>
    </div>
  );
};

export default ActionButtonsSection;