// NOTES SECTION - VERSIÓN COMPACTA
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

  return (
    <ConfigurationCard
      title="Notas y Observaciones"
      icon={FileText}
      helpText="Las observaciones aparecen en el comprobante impreso"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="flex items-center text-xs font-medium text-gray-700">
              <Eye className="w-3.5 h-3.5 mr-1.5 text-violet-600" />
              Observaciones
              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 h-6 rounded-full text-[11px] font-medium bg-violet-100 text-violet-700">
                <Eye className="w-3 h-3 mr-0.5" />
                Visible
              </span>
            </label>
            <span className="text-xs font-medium text-gray-500">
              {observaciones.length}/{MAX_CHARS}
            </span>
          </div>
          <textarea
            rows={6}
            maxLength={MAX_CHARS}
            className="w-full min-h-28 px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 text-sm bg-white shadow-sm border-gray-300"
            placeholder="Ej: Entrega coordinada, Producto con garantía"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="flex items-center text-xs font-medium text-gray-700">
              <EyeOff className="w-3.5 h-3.5 mr-1.5 text-gray-600" />
              Nota Interna
              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 h-6 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700">
                <EyeOff className="w-3 h-3 mr-0.5" />
                Interna
              </span>
            </label>
            <span className="text-xs font-medium text-gray-500">
              {notaInterna.length}/{MAX_CHARS}
            </span>
          </div>
          <textarea
            rows={6}
            maxLength={MAX_CHARS}
            className="w-full min-h-28 px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500/30 focus:border-gray-500 text-sm bg-white shadow-sm border-gray-300"
            placeholder="Ej: Cliente prefiere pago los días 15"
            value={notaInterna}
            onChange={(e) => setNotaInterna(e.target.value)}
          />
        </div>
      </div>
    </ConfigurationCard>
  );
};

export default NotesSection;
