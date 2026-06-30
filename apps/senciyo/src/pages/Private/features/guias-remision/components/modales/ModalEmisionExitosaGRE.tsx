import { CheckCircle2, FileText, Printer, List, Plus } from 'lucide-react';
import type { GuiaRemision, TipoGRE } from '../../modelos/GuiaRemision';
import { TIPO_GRE_LABELS } from '../../modelos/GuiaRemision';
import { getEstadoGRELabel, getEstadoGREBadgeClass } from '../../logica/estadosGRE';

interface Props {
  open: boolean;
  guia: GuiaRemision | null;
  onNuevaGRE: (tipo: TipoGRE) => void;
  onVerDetalle: (guia: GuiaRemision) => void;
  onImprimir: (guia: GuiaRemision) => void;
  onIrAlListado: () => void;
}

export default function ModalEmisionExitosaGRE({
  open,
  guia,
  onNuevaGRE,
  onVerDetalle,
  onImprimir,
  onIrAlListado,
}: Props) {
  if (!open || !guia) return null;

  const numero =
    guia.serie && guia.correlativo
      ? `${guia.serie}-${guia.correlativo}`
      : guia.serie
        ? `${guia.serie}-[pendiente]`
        : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Cabecera verde */}
        <div className="bg-emerald-50 dark:bg-emerald-900/20 px-6 pt-7 pb-6 text-center border-b border-emerald-100 dark:border-emerald-800">
          <div className="flex justify-center mb-3">
            <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 p-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">
            {TIPO_GRE_LABELS[guia.tipo]}
          </p>
          <p className="text-2xl font-bold font-mono text-gray-900 dark:text-white tabular-nums tracking-tight">
            {numero}
          </p>
          <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1 font-medium">
            Emitida correctamente
          </p>
        </div>

        {/* Datos resumen */}
        <div className="px-6 py-4 space-y-2 text-sm">
          <div className="flex justify-between text-gray-700 dark:text-gray-300">
            <span className="text-gray-500 dark:text-gray-400">Destinatario</span>
            <span className="font-medium text-right max-w-56 truncate">{guia.destinatarioNombre}</span>
          </div>
          <div className="flex justify-between text-gray-700 dark:text-gray-300">
            <span className="text-gray-500 dark:text-gray-400">Fecha de emisión</span>
            <span className="font-medium tabular-nums">{guia.fechaEmision}</span>
          </div>
          <div className="flex justify-between text-gray-700 dark:text-gray-300">
            <span className="text-gray-500 dark:text-gray-400">Estado</span>
            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${getEstadoGREBadgeClass(guia.estado)}`}>
              {getEstadoGRELabel(guia.estado)}
            </span>
          </div>
        </div>

        {/* Acciones */}
        <div className="px-6 pb-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onNuevaGRE(guia.tipo)}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 border border-violet-200 dark:border-violet-700 rounded-xl transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nueva GRE
          </button>
          <button
            type="button"
            onClick={() => onVerDetalle(guia)}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl transition-colors"
          >
            <FileText className="h-4 w-4" />
            Ver detalle
          </button>
          <button
            type="button"
            onClick={() => onImprimir(guia)}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl transition-colors"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </button>
          <button
            type="button"
            onClick={onIrAlListado}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl transition-colors"
          >
            <List className="h-4 w-4" />
            Ir al listado
          </button>
        </div>
      </div>
    </div>
  );
}
