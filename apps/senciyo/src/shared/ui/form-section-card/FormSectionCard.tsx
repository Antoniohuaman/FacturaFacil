import type { ReactNode } from 'react';

interface FormSectionCardProps {
  titulo: string;
  acciones?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}

/** Card compacta de sección de formulario: título + slot de acciones en el header, contenido libre. */
export default function FormSectionCard({ titulo, acciones, children, contentClassName }: FormSectionCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-slate-700 leading-tight">{titulo}</h2>
        {acciones}
      </div>
      <div className={`p-4 ${contentClassName ?? ''}`}>{children}</div>
    </div>
  );
}
