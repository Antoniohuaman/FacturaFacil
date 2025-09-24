import React from 'react';

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
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observaciones (Visible en la impresión del comprobante)
          </label>
          <textarea
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="Observaciones (Visible en la impresión del comprobante."
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nota interna (No visible en la impresión del comprobante)
          </label>
          <textarea
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="Nota interna (No visible en la impresión del comprobante."
            value={notaInterna}
            onChange={(e) => setNotaInterna(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default NotesSection;