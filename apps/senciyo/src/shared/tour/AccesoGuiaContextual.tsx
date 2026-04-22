import { HelpCircle } from "lucide-react";
import { solicitarInicioTour } from "./motorTour";
import type { IdTour } from "./tiposTour";
import { usarAyudaGuiada } from "./usarAyudaGuiada";

interface AccesoGuiaContextualProps {
  tourId?: IdTour;
  onClick?: () => void;
  label?: string;
  className?: string;
}

export function AccesoGuiaContextual({
  tourId,
  onClick,
  label = "Ver guía",
  className = "",
}: AccesoGuiaContextualProps) {
  const { ayudaActivada } = usarAyudaGuiada();

  if (!ayudaActivada || (!tourId && !onClick)) {
    return null;
  }

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }

    if (tourId) {
      solicitarInicioTour(tourId);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-200 dark:hover:bg-gray-700 ${className}`}
      aria-label={label}
      title={label}
    >
      <HelpCircle className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );
}