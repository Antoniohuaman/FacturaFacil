interface BadgeImpuestoProps {
  etiqueta: string;
  subtitulo?: string;
  tono?: 'neutral' | 'advertencia';
}

export default function BadgeImpuesto({ etiqueta, subtitulo, tono = 'neutral' }: BadgeImpuestoProps) {
  const clases = tono === 'advertencia' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700';

  return (
    <div className={`inline-flex flex-col items-center px-3 py-1 text-xs font-medium rounded-full min-w-[120px] leading-tight ${clases}`}>
      <span>{etiqueta}</span>
      {subtitulo && <span className="text-[10px] text-gray-500">{subtitulo}</span>}
    </div>
  );
}
