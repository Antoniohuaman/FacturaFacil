import { ArrowRight, Download, Printer, X } from 'lucide-react';
import { useCurrency } from '../form-core/hooks/useCurrency';

interface PostIssueOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  comprobante: {
    tipo: string;
    serie: string;
    numero: string;
    total: number;
    cliente?: string;
  } | null;
  onContinue: () => void;
  onPrint: () => void;
  onDownload: () => void;
}

export const PostIssueOptionsModal = ({
  isOpen,
  onClose,
  comprobante,
  onContinue,
  onPrint,
  onDownload,
}: PostIssueOptionsModalProps) => {
  const { formatPrice, documentCurrency } = useCurrency();
  if (!isOpen || !comprobante) {
    return null;
  }

  const receiptCurrency = (comprobante as { currency?: string }).currency ?? documentCurrency.code;
  const formattedTotal = formatPrice(comprobante.total ?? 0, receiptCurrency);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-500 hover:bg-gray-100"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-4 p-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-500">Comprobante emitido</p>
            <h2 className="mt-1 text-2xl font-bold text-gray-900">¿Qué deseas hacer ahora?</h2>
            <p className="mt-2 text-sm text-gray-500">
              {comprobante.tipo} {comprobante.serie}-{comprobante.numero} por {formattedTotal}
            </p>
            {comprobante.cliente && (
              <p className="text-xs text-gray-400">Cliente: {comprobante.cliente}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onContinue}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-3 text-white shadow-lg transition hover:from-sky-600 hover:to-blue-700"
          >
            <span className="text-sm font-semibold uppercase tracking-wide">Seguir emitiendo</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={onPrint}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-blue-200 hover:text-blue-600"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
            <button
              type="button"
              onClick={onDownload}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-blue-200 hover:text-blue-600"
            >
              <Download className="h-4 w-4" />
              Descargar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
