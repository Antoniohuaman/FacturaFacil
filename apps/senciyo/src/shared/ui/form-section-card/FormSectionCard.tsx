import type { ReactNode } from 'react';

interface FormSectionCardProps {
  titulo: string;
  /** Referencia discreta bajo el título (ej. "Datos comerciales heredados de la OC01-00000002"). Nunca un banner de ancho completo. */
  subtitulo?: ReactNode;
  acciones?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}

/** Card compacta de sección de formulario: título (+ subtítulo discreto opcional) + slot de acciones en el header, contenido libre. */
export default function FormSectionCard({ titulo, subtitulo, acciones, children, contentClassName }: FormSectionCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-slate-700 leading-tight">{titulo}</h2>
          {subtitulo && <div className="mt-0.5 text-xs text-gray-500 truncate">{subtitulo}</div>}
        </div>
        {acciones}
      </div>
      <div className={`p-4 ${contentClassName ?? ''}`}>{children}</div>
    </div>
  );
}
