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
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      {/* Header section compacto */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Acciones del Comprobante</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Revisa, guarda o procede a crear el comprobante electrónico
            </p>
          </div>
          
          {/* Contador de productos */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-violet-50 border border-violet-200 rounded-md">
            <ShoppingCart className="w-3.5 h-3.5 text-violet-600" />
            <span className="text-xs font-semibold text-violet-700">
              {productsCount}
            </span>
          </div>
        </div>

        {/* Estado visual */}
        {isCartEmpty && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
            <span className="text-xs font-medium text-yellow-700">
              Agregue productos
            </span>
          </div>
        )}
      </div>

      {/* Buttons container */}
      <div className="flex items-center justify-between">

        {/* Left side - Vista previa */}
        {onVistaPrevia && (
          <button
            className="group flex items-center gap-2 px-4 py-2 h-9 text-violet-600 bg-gradient-to-r from-violet-50 to-purple-50 hover:from-violet-100 hover:to-purple-100 border border-violet-200 hover:border-violet-300 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow text-sm"
            onClick={onVistaPrevia}
            disabled={isCartEmpty}
            title="Ver vista previa del comprobante (Ctrl+P)"
            aria-label="Vista previa"
          >
            <Eye className="h-4 w-4 transition-transform group-hover:scale-110" />
            Vista previa
            <span className="ml-1 px-1.5 py-0.5 bg-violet-100 text-violet-700 text-[10px] rounded font-mono opacity-70">
              Ctrl+P
            </span>
          </button>
        )}

        {/* Right side - Action buttons */}
        <div className="flex items-center gap-2 ml-auto">

          {/* Cancelar - Ghost h-9 */}
          <button
            className="group flex items-center gap-1.5 px-3 py-2 h-9 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium shadow-sm hover:shadow text-sm"
            onClick={onCancelar}
            title="Descartar cambios y volver (Esc)"
            aria-label="Cancelar"
          >
            <X className="h-4 w-4" />
            Cancelar
          </button>

          {/* Guardar borrador - Secundario h-9 */}
          {onGuardarBorrador && (
            <button
              className="group flex items-center gap-1.5 px-3 py-2 h-9 text-purple-600 bg-white border border-purple-300 rounded-lg hover:bg-purple-50 hover:border-purple-400 transition-all duration-200 font-medium shadow-sm hover:shadow text-sm"
              onClick={onGuardarBorrador}
              title="Guardar para continuar después (Ctrl+S)"
              aria-label="Guardar borrador"
            >
              <Save className="h-4 w-4" />
              Guardar borrador
            </button>
          )}

          {/* Crear comprobante - Principal h-10 */}
          {onCrearComprobante && (
            <button
              className="group relative flex items-center gap-2 px-5 py-2.5 h-10 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              onClick={onCrearComprobante}
              disabled={isCartEmpty}
              title={isCartEmpty ? "Agregue productos primero" : "Proceder al pago y crear comprobante (Ctrl+Enter)"}
              aria-label="Crear comprobante"
            >
              <CreditCard className="h-4 w-4" />
              Crear comprobante
              {!isCartEmpty && (
                <span className="ml-1 px-1.5 py-0.5 bg-white/20 text-white text-[10px] rounded font-mono">
                  Ctrl+↵
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Helper text compacto */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-start gap-2 text-[11px] text-gray-600">
          <div className="w-1.5 h-1.5 bg-violet-500 rounded-full mt-1"></div>
          <p>
            <strong>Tip:</strong> Atajos de teclado:
            <kbd className="ml-1 px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-mono">Ctrl+P</kbd> vista previa,
            <kbd className="ml-1 px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-mono">Ctrl+S</kbd> guardar,
            <kbd className="ml-1 px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-mono">Ctrl+Enter</kbd> crear.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ActionButtonsSection;