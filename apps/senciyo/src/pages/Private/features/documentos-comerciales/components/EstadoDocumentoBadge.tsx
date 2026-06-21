import type { EstadoDocumentoComercial, TipoDocumentoComercial } from '../models/documentoComercial.types';
import { obtenerColorEstado, normalizarEstadoParaDisplay } from '../utils/documentoComercial.helpers';

interface EstadoDocumentoBadgeProps {
  estado: EstadoDocumentoComercial;
  tipo?: TipoDocumentoComercial;
  tamano?: 'sm' | 'md';
}

const estilosPorColor: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
};

export function EstadoDocumentoBadge({
  estado,
  tipo,
  tamano = 'sm',
}: EstadoDocumentoBadgeProps) {
  const estadoDisplay = normalizarEstadoParaDisplay(estado, tipo);
  const color = obtenerColorEstado(estadoDisplay);
  const estiloColor = estilosPorColor[color] ?? estilosPorColor.gray;
  const estiloTamano =
    tamano === 'sm'
      ? 'px-2 py-0.5 text-xs'
      : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium whitespace-nowrap ${estiloColor} ${estiloTamano}`}
    >
      {estadoDisplay}
    </span>
  );
}
