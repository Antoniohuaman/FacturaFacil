// ===================================================================
// ACTION BUTTONS SECTION - VERSIÓN MODERNIZADA PREMIUM
// Preserva 100% la funcionalidad, mejora UX y apariencia
// ===================================================================

import React from 'react';
import { Eye, X, Save, CreditCard } from 'lucide-react';

interface ActionButtonsSectionProps {
  onVistaPrevia?: () => void;
  onCancelar: () => void;
  onGuardarBorrador?: () => void;
  onCrearComprobante?: () => void;
  isCartEmpty?: boolean;
}

const ActionButtonsSection: React.FC<ActionButtonsSectionProps> = ({
  onVistaPrevia,
  onCancelar,
  onGuardarBorrador,
  onCrearComprobante,
  isCartEmpty = false,
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      {/* Header section */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Acciones del Comprobante</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Revisa, guarda o procede a crear el comprobante electrónico
          </p>
        </div>

        {/* Estado visual */}
        {isCartEmpty && (
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span className="text-xs font-medium text-yellow-700">
              Agregue productos para continuar
            </span>
          </div>
        )}
      </div>

      {/* Buttons container */}
      <div className="flex items-center justify-between">

        {/* Left side - Vista previa */}
        {onVistaPrevia && (
          <button
            className="group flex items-center gap-2 px-5 py-2.5 text-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-2 border-blue-200 hover:border-blue-300 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-50 disabled:hover:to-indigo-50 shadow-sm hover:shadow-md"
            onClick={onVistaPrevia}
            disabled={isCartEmpty}
            title="Ver cómo quedará el comprobante antes de crearlo (Ctrl+P)"
          >
            <Eye className="h-4 w-4 transition-transform group-hover:scale-110" />
            Vista previa
            <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-mono opacity-70">
              Ctrl+P
            </span>
          </button>
        )}

        {/* Right side - Action buttons */}
        <div className="flex items-center space-x-3 ml-auto">

          {/* Cancelar */}
          <button
            className="group flex items-center gap-2 px-5 py-2.5 text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            onClick={onCancelar}
            title="Descartar cambios y volver (Esc)"
          >
            <X className="h-4 w-4 transition-transform group-hover:scale-110" />
            Cancelar
            <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-mono opacity-70">
              Esc
            </span>
          </button>

          {/* Guardar borrador */}
          {onGuardarBorrador && (
            <button
              className="group flex items-center gap-2 px-5 py-2.5 text-indigo-600 bg-white border-2 border-indigo-300 rounded-lg hover:bg-indigo-50 hover:border-indigo-400 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
              onClick={onGuardarBorrador}
              title="Guardar para continuar después (Ctrl+S)"
            >
              <Save className="h-4 w-4 transition-transform group-hover:scale-110" />
              Guardar borrador
              <span className="ml-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded font-mono opacity-70">
                Ctrl+S
              </span>
            </button>
          )}

          {/* Crear comprobante - Principal */}
          {onCrearComprobante && (
            <button
              className="group relative flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-indigo-600 transform hover:scale-105 disabled:hover:scale-100"
              onClick={onCrearComprobante}
              disabled={isCartEmpty}
              title={isCartEmpty ? "Agregue productos primero" : "Proceder al pago y crear comprobante (Ctrl+Enter)"}
            >
              <CreditCard className="h-5 w-5 transition-transform group-hover:rotate-6" />
              Crear comprobante
              {!isCartEmpty && (
                <span className="ml-1 px-1.5 py-0.5 bg-white/20 text-white text-xs rounded font-mono">
                  Ctrl+↵
                </span>
              )}

              {/* Glow effect on hover */}
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-400 to-indigo-400 opacity-0 group-hover:opacity-20 blur transition-opacity duration-200 -z-10"></div>
            </button>
          )}
        </div>
      </div>

      {/* Helper text */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-start space-x-2 text-xs text-gray-600">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5"></div>
          <p>
            <strong>Tip:</strong> Puedes usar atajos de teclado para trabajar más rápido.
            Presiona <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">Ctrl+P</kbd> para vista previa,
            <kbd className="ml-1 px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">Ctrl+S</kbd> para guardar borrador, o
            <kbd className="ml-1 px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">Ctrl+Enter</kbd> para crear el comprobante.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ActionButtonsSection;