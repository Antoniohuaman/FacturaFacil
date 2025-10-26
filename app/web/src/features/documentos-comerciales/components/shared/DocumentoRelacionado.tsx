// app/web/src/features/documentos-comerciales/components/shared/DocumentoRelacionado.tsx

import { ArrowRight, FileText, Receipt, CheckCircle, Calendar } from 'lucide-react';
import type { TipoDocumento } from '../../models/types';

interface DocumentoRelacionadoInfo {
  tipo: TipoDocumento | 'COMPROBANTE';
  numero: string;
  fecha: string;
  id: string;
}

interface DocumentoRelacionadoProps {
  origen?: DocumentoRelacionadoInfo;
  destinos?: DocumentoRelacionadoInfo[];
  onClickDocumento?: (id: string, tipo: string) => void;
}

/**
 * Componente para mostrar documentos relacionados (conversiones)
 * Muestra el flujo: Cotización → Nota de Venta → Comprobante
 */
export function DocumentoRelacionado({
  origen,
  destinos = [],
  onClickDocumento
}: DocumentoRelacionadoProps) {
  if (!origen && destinos.length === 0) {
    return null;
  }

  const getIconoTipo = (tipo: string) => {
    switch (tipo) {
      case 'COTIZACION':
        return FileText;
      case 'NOTA_VENTA':
        return Receipt;
      case 'COMPROBANTE':
        return CheckCircle;
      default:
        return FileText;
    }
  };

  const getColorTipo = (tipo: string) => {
    switch (tipo) {
      case 'COTIZACION':
        return 'text-blue-600 bg-blue-50';
      case 'NOTA_VENTA':
        return 'text-purple-600 bg-purple-50';
      case 'COMPROBANTE':
        return 'text-emerald-600 bg-emerald-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getNombreTipo = (tipo: string) => {
    switch (tipo) {
      case 'COTIZACION':
        return 'Cotización';
      case 'NOTA_VENTA':
        return 'Nota de Venta';
      case 'COMPROBANTE':
        return 'Comprobante';
      default:
        return tipo;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <ArrowRight className="h-4 w-4 text-gray-400" />
        <h4 className="text-sm font-semibold text-gray-700">Documentos Correlacionados</h4>
      </div>

      <div className="flex flex-col gap-2">
        {/* Documento de origen */}
        {origen && (
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="text-xs text-gray-500 mb-1">Generado desde:</div>
            </div>
            <DocumentoCard
              documento={origen}
              getIconoTipo={getIconoTipo}
              getColorTipo={getColorTipo}
              getNombreTipo={getNombreTipo}
              formatDate={formatDate}
              onClick={onClickDocumento}
            />
          </div>
        )}

        {/* Documentos destino (conversiones realizadas) */}
        {destinos.length > 0 && (
          <div className="flex items-start gap-3 mt-2">
            <div className="flex-shrink-0 pt-2">
              <div className="text-xs text-gray-500">Convertido a:</div>
            </div>
            <div className="flex-1 flex flex-col gap-2">
              {destinos.map((destino, index) => (
                <DocumentoCard
                  key={index}
                  documento={destino}
                  getIconoTipo={getIconoTipo}
                  getColorTipo={getColorTipo}
                  getNombreTipo={getNombreTipo}
                  formatDate={formatDate}
                  onClick={onClickDocumento}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface DocumentoCardProps {
  documento: DocumentoRelacionadoInfo;
  getIconoTipo: (tipo: string) => any;
  getColorTipo: (tipo: string) => string;
  getNombreTipo: (tipo: string) => string;
  formatDate: (date: string) => string;
  onClick?: (id: string, tipo: string) => void;
}

function DocumentoCard({
  documento,
  getIconoTipo,
  getColorTipo,
  getNombreTipo,
  formatDate,
  onClick
}: DocumentoCardProps) {
  const Icon = getIconoTipo(documento.tipo);
  const colorClass = getColorTipo(documento.tipo);
  const isClickable = !!onClick;

  return (
    <div
      onClick={() => onClick?.(documento.id, documento.tipo)}
      className={`
        flex items-center gap-3 px-3 py-2 rounded-lg border
        transition-all duration-200
        ${isClickable
          ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98] bg-white border-gray-200 hover:border-gray-300'
          : 'bg-white border-gray-200'
        }
      `}
    >
      <div className={`p-2 rounded-lg ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">
            {getNombreTipo(documento.tipo)}
          </span>
        </div>
        <div className="font-semibold text-sm text-gray-900">
          {documento.numero}
        </div>
      </div>

      <div className="flex items-center gap-1 text-xs text-gray-500">
        <Calendar className="h-3 w-3" />
        {formatDate(documento.fecha)}
      </div>
    </div>
  );
}
