// app/web/src/features/documentos-comerciales/components/shared/ConversionButton.tsx

import { ArrowRight, FileText, Receipt, Sparkles } from 'lucide-react';

interface ConversionButtonProps {
  tipo: 'nota-venta' | 'comprobante';
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

/**
 * Botón especializado para conversiones de documentos
 * Diseño atractivo y claro para mejorar la UX
 */
export function ConversionButton({
  tipo,
  onClick,
  disabled = false,
  loading = false,
  className = ''
}: ConversionButtonProps) {
  const config = {
    'nota-venta': {
      label: 'Convertir a Nota de Venta',
      icon: Receipt,
      color: 'purple',
      gradient: 'from-purple-500 to-purple-600',
      hoverGradient: 'hover:from-purple-600 hover:to-purple-700',
      description: 'Generar nota de venta con los mismos datos'
    },
    'comprobante': {
      label: 'Convertir a Comprobante',
      icon: FileText,
      color: 'emerald',
      gradient: 'from-emerald-500 to-emerald-600',
      hoverGradient: 'hover:from-emerald-600 hover:to-emerald-700',
      description: 'Generar factura o boleta electrónica'
    }
  };

  const { label, icon: Icon, gradient, hoverGradient, description } = config[tipo];

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        group relative
        w-full px-4 py-3
        bg-gradient-to-r ${gradient} ${hoverGradient}
        text-white font-medium text-sm
        rounded-lg shadow-sm
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        hover:shadow-md hover:scale-[1.02]
        active:scale-[0.98]
        ${className}
      `}
    >
      <div className="flex items-center justify-center gap-3">
        {loading ? (
          <>
            <Sparkles className="h-4 w-4 animate-spin" />
            <span>Convirtiendo...</span>
          </>
        ) : (
          <>
            <Icon className="h-4 w-4" />
            <span>{label}</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </div>

      {/* Tooltip */}
      {!disabled && !loading && (
        <div className="
          absolute bottom-full left-1/2 -translate-x-1/2 mb-2
          px-3 py-2 bg-gray-900 text-white text-xs rounded-lg
          opacity-0 group-hover:opacity-100
          transition-opacity duration-200
          pointer-events-none
          whitespace-nowrap
          z-10
        ">
          {description}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </button>
  );
}
