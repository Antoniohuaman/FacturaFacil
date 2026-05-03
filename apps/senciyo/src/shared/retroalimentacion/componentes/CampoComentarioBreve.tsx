import { useId } from 'react';

interface CampoComentarioBreveProps {
  etiqueta: string;
  valor: string;
  onChange: (valor: string) => void;
  placeholder: string;
  maximoCaracteres: number;
  filas?: number;
  disabled?: boolean;
}

export function CampoComentarioBreve({
  etiqueta,
  valor,
  onChange,
  placeholder,
  maximoCaracteres,
  filas = 3,
  disabled = false,
}: CampoComentarioBreveProps) {
  const id = useId();

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
      <textarea
        id={id}
        rows={filas}
        value={valor}
        maxLength={maximoCaracteres}
        data-sensitive="true"
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:border-gray-700 dark:bg-gray-900 dark:text-slate-100 dark:focus:border-gray-500 dark:focus:ring-gray-800 dark:disabled:bg-gray-800 dark:disabled:text-slate-500"
      />
    </div>
  );
}