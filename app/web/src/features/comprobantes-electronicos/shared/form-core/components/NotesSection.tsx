// ===================================================================
// NOTES SECTION - VERSIÓN MODERNIZADA PREMIUM
// Preserva 100% la funcionalidad, mejora UX y apariencia
// ===================================================================

import React from 'react';
import { FileText, Eye, EyeOff } from 'lucide-react';
import { ConfigurationCard } from './ConfigurationCard';

interface NotesSectionProps {
  observaciones: string;
  setObservaciones: (value: string) => void;
  notaInterna: string;
  setNotaInterna: (value: string) => void;
}

const NotesSection: React.FC<NotesSectionProps> = ({
  observaciones,
  setObservaciones,
  notaInterna,
  setNotaInterna,
}) => {
  const MAX_CHARS = 500;
  const isObservacionesNearLimit = observaciones.length > 450;
  const isNotaInternaLimit = notaInterna.length > 450;

  return (
    <ConfigurationCard
      title="Notas y Observaciones"
      description="Información adicional para el comprobante e ingreso de comentario interno"
      icon={FileText}
      helpText="Las observaciones aparecen en el comprobante impreso. Las notas internas solo son visibles en el sistema para gestión interna."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Observaciones - Visible al cliente */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <Eye className="w-4 h-4 mr-2 text-blue-600" />
              Observaciones
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                <Eye className="w-3 h-3 mr-1" />
                Visible al cliente
              </span>
            </label>
            <span className={`text-xs font-medium ${
              isObservacionesNearLimit
                ? 'text-yellow-600 font-bold'
                : observaciones.length > 0
                  ? 'text-blue-600'
                  : 'text-gray-500'
            }`}>
              {observaciones.length}/{MAX_CHARS}
            </span>
          </div>
          <textarea
            rows={4}
            maxLength={MAX_CHARS}
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white transition-all duration-200 resize-none ${
              isObservacionesNearLimit
                ? 'border-yellow-300 bg-yellow-50/30'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            placeholder="Ej: Entrega coordinada para el día lunes, Producto con garantía de 1 año, etc."
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />
          <p className="mt-1.5 text-xs text-gray-500">
          </p>
        </div>

        {/* Nota Interna - Solo interno */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <EyeOff className="w-4 h-4 mr-2 text-gray-600" />
              Nota Interna
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                <EyeOff className="w-3 h-3 mr-1" />
                Solo en el sistema
              </span>
            </label>
            <span className={`text-xs font-medium ${
              isNotaInternaLimit
                ? 'text-yellow-600 font-bold'
                : notaInterna.length > 0
                  ? 'text-gray-600'
                  : 'text-gray-500'
            }`}>
              {notaInterna.length}/{MAX_CHARS}
            </span>
          </div>
          <textarea
            rows={4}
            maxLength={MAX_CHARS}
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm bg-white transition-all duration-200 resize-none ${
              isNotaInternaLimit
                ? 'border-yellow-300 bg-yellow-50/30'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            placeholder="Ej: Cliente prefiere pago los días 15, Contactar antes de entregar, etc."
            value={notaInterna}
            onChange={(e) => setNotaInterna(e.target.value)}
          />
          <p className="mt-1.5 text-xs text-gray-500">
          </p>
        </div>
      </div>
    </ConfigurationCard>
  );
};

export default NotesSection;