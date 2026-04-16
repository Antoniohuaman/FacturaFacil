import { useId } from 'react';

interface CampoComentarioBreveProps {
  etiqueta: string;
  valor: string;
  onChange: (valor: string) => void;
  placeholder: string;
  maximoCaracteres: number;
  filas?: number;
  descripcion?: string;
  disabled?: boolean;
}

export function CampoComentarioBreve({
  etiqueta,
  valor,
  onChange,
  placeholder,
  maximoCaracteres,
  filas = 3,
  descripcion,
  disabled = false,
}: CampoComentarioBreveProps) {
  const id = useId();
  const descripcionId = `${id}-descripcion`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {etiqueta}
        </label>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {valor.length}/{maximoCaracteres}
        </span>
      </div>
      {descripcion && (
        <p id={descripcionId} className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          {descripcion}
        </p>
      )}
      <textarea
        id={id}
        rows={filas}
        value={valor}
        maxLength={maximoCaracteres}
        placeholder={placeholder}
        disabled={disabled}
        aria-describedby={descripcion ? descripcionId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:border-gray-700 dark:bg-gray-900 dark:text-slate-100 dark:focus:border-gray-500 dark:focus:ring-gray-800 dark:disabled:bg-gray-800 dark:disabled:text-slate-500"
      />
    </div>
  );
}