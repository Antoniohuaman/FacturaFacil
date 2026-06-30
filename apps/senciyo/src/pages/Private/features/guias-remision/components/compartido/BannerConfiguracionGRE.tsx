import { ShieldAlert, Settings } from 'lucide-react';

interface Props {
  onConfigurar: () => void;
}

export default function BannerConfiguracionGRE({ onConfigurar }: Props) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl">
      <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <p className="flex-1 text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
        Para emitir Guías de Remisión Electrónica debes registrar tus credenciales SUNAT.
        Estas credenciales permiten que SenciYo se conecte con SUNAT para enviar y validar la guía.
      </p>
      <button
        type="button"
        onClick={onConfigurar}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-700 rounded-lg transition-colors"
      >
        <Settings className="h-3.5 w-3.5" />
        Configurar credenciales
      </button>
    </div>
  );
}
