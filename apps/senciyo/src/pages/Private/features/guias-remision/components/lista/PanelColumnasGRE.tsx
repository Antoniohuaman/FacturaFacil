import { useRef, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import type { ColumnaGREConfig } from '../../logica/columnasGRE';
import { COLUMNAS_GRE_DEFECTO } from '../../logica/columnasGRE';

interface Props {
  columnas: ColumnaGREConfig[];
  onChange: (columnas: ColumnaGREConfig[]) => void;
  onCerrar: () => void;
}

export default function PanelColumnasGRE({ columnas, onChange, onCerrar }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onCerrar();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onCerrar]);

  const toggle = (id: string) => {
    onChange(
      columnas.map((c) => (c.id === id && !c.obligatoria ? { ...c, visible: !c.visible } : c)),
    );
  };

  const restaurar = () => onChange(COLUMNAS_GRE_DEFECTO.map((c) => ({ ...c })));

  const configurables = columnas.filter((c) => !c.obligatoria && c.id !== 'acciones');

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 w-60 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-30 p-3"
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Columnas visibles</span>
        <button
          type="button"
          onClick={restaurar}
          className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          Restaurar
        </button>
      </div>

      <div className="space-y-1.5">
        {configurables.map((col) => (
          <label key={col.id} className="flex items-center gap-2.5 cursor-pointer group py-0.5">
            <input
              type="checkbox"
              checked={col.visible}
              onChange={() => toggle(col.id)}
              className="h-3.5 w-3.5 rounded border-gray-300 dark:border-gray-600 text-violet-600 focus:ring-violet-500 dark:bg-gray-700 dark:checked:bg-violet-600 cursor-pointer"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
              {col.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
