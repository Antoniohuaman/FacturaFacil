// app/web/src/features/documentos-comerciales/components/shared/EstadoBadge.tsx

import { 
  FileText, 
  Send, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  Ban,
  Clock
} from 'lucide-react';
import type { EstadoDocumento, TipoDocumento } from '../../models/types';

interface EstadoBadgeProps {
  estado: EstadoDocumento;
  tipo?: TipoDocumento;
  className?: string;
}

export function EstadoBadge({ estado, className = '' }: EstadoBadgeProps) {
  const getEstadoConfig = () => {
    switch (estado) {
      case 'BORRADOR':
        return {
          icon: FileText,
          color: 'bg-gray-100 text-gray-700 border-gray-200',
          label: 'Borrador'
        };
      case 'EMITIDO':
        return {
          icon: Send,
          color: 'bg-blue-100 text-blue-700 border-blue-200',
          label: 'Emitido'
        };
      case 'APROBADO':
        return {
          icon: CheckCircle,
          color: 'bg-green-100 text-green-700 border-green-200',
          label: 'Aprobado'
        };
      case 'RECHAZADO':
        return {
          icon: XCircle,
          color: 'bg-red-100 text-red-700 border-red-200',
          label: 'Rechazado'
        };
      case 'ANULADO':
        return {
          icon: Ban,
          color: 'bg-gray-100 text-gray-500 border-gray-200',
          label: 'Anulado'
        };
      case 'CONVERTIDO':
        return {
          icon: ArrowRight,
          color: 'bg-purple-100 text-purple-700 border-purple-200',
          label: 'Convertido'
        };
      default:
        return {
          icon: Clock,
          color: 'bg-gray-100 text-gray-700 border-gray-200',
          label: estado
        };
    }
  };

  const config = getEstadoConfig();
  const Icon = config.icon;

  return (
    <span className={`
      inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
      ${config.color} ${className}
    `}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}

// ============================================================