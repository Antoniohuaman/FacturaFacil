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
      collapsible
      defaultExpanded={false}
      contentClassName="p-4"
    >
      <div className="grid grid-cols-12 gap-4 text-[13px]">
        <div className="col-span-12 lg:col-span-6">
          <div className="flex items-center justify-between mb-1.5">
            <label className="flex items-center text-[12px] font-medium text-slate-600">
              <Eye className="w-3.5 h-3.5 mr-1.5 text-violet-600" />
              Observaciones
              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 h-6 rounded-full text-[11px] font-medium bg-violet-100 text-violet-700">
                <Eye className="w-3 h-3 mr-0.5" />
                Visible
              </span>
            </label>
            <span className="text-[12px] font-medium text-gray-500">
              {observaciones.length}/{MAX_CHARS}
            </span>
          </div>
          <textarea
            rows={4}
            maxLength={MAX_CHARS}
            className="w-full min-h-24 px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 text-[13px] bg-white shadow-sm border-slate-300 resize-none"
            placeholder="Ej: Entrega coordinada, Producto con garantía"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${el.scrollHeight}px`;
            }}
          />
        </div>
        <div className="col-span-12 lg:col-span-6">
          <div className="flex items-center justify-between mb-1.5">
            <label className="flex items-center text-[12px] font-medium text-slate-600">
              <EyeOff className="w-3.5 h-3.5 mr-1.5 text-gray-600" />
              Nota Interna
              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 h-6 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700">
                <EyeOff className="w-3 h-3 mr-0.5" />
                Interna
              </span>
            </label>
            <span className="text-[12px] font-medium text-gray-500">
              {notaInterna.length}/{MAX_CHARS}
            </span>
          </div>
          <textarea
            rows={4}
            maxLength={MAX_CHARS}
            className="w-full min-h-24 px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 text-[13px] bg-white shadow-sm border-slate-300 resize-none"
            placeholder="Ej: Cliente prefiere pago los días 15"
            value={notaInterna}
            onChange={(e) => setNotaInterna(e.target.value)}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${el.scrollHeight}px`;
            }}
          />
        </div>
      </div>
    </ConfigurationCard>
  );
};

export default NotesSection;
