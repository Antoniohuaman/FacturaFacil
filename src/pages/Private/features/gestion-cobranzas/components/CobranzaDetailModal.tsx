import { Printer, X } from 'lucide-react';
import type { CobranzaDocumento, CuentaPorCobrarSummary } from '../models/cobranzas.types';
import {
  getCobranzaEstadoDocumentoLabel,
  getCobranzaOperacionLabel,
  getCobranzaTipoCobroLabel,
} from '../utils/reporting';
import { resolveCobranzaPaymentMeans } from '../utils/paymentMeans';

interface CobranzaDetailModalProps {
  cobranza: (CobranzaDocumento & { relatedCuenta?: CuentaPorCobrarSummary }) | null;
  isOpen: boolean;
  onClose: () => void;
  formatMoney: (value: number, currency?: string) => string;
}

export const CobranzaDetailModal = ({ cobranza, isOpen, onClose, formatMoney }: CobranzaDetailModalProps) => {
  if (!isOpen || !cobranza) return null;

  const estadoLabel = getCobranzaEstadoDocumentoLabel(cobranza);
  const tipoCobroLabel = getCobranzaTipoCobroLabel(cobranza, cobranza.relatedCuenta);
  const paymentMeans = resolveCobranzaPaymentMeans(cobranza);
  const medioLabel = paymentMeans.summaryLabel;
  const medioLines = paymentMeans.detailLines;
  const operacionRefs = cobranza.referencia;
  const operacionLabel = getCobranzaOperacionLabel(cobranza);

  const handlePrintConstancia = () => {
    if (typeof window === 'undefined' || !cobranza) {
      return;
    }

    const printWindow = window.open('', '_blank', 'width=720,height=900');
    if (!printWindow) {
      return;
    }

    const formattedAmount = formatMoney(cobranza.monto, cobranza.moneda);
    const mediosDetalleTemplate = medioLines.length
      ? `<ul>${medioLines
          .map((line) => `<li>${line.label}: ${formatMoney(line.amount, cobranza.moneda)}</li>`)
          .join('')}</ul>`
      : '';
    const template = `<!DOCTYPE html>
<html>
  <head>
    <meta charSet="utf-8" />
    <title>Constancia ${cobranza.numero}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
      h1 { margin-bottom: 4px; }
      h2 { margin-top: 32px; margin-bottom: 8px; font-size: 16px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { text-align: left; padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
      .summary { margin-top: 20px; padding: 16px; border: 1px solid #cbd5f5; border-radius: 8px; background: #f8fafc; }
      .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #d1fae5; color: #065f46; font-size: 12px; font-weight: 600; }
    </style>
  </head>
  <body>
    <h1>Constancia de Cobranza</h1>
    <p>Número: <strong>${cobranza.numero}</strong></p>
    <p>Fecha: <strong>${cobranza.fechaCobranza}</strong></p>
    <div class="summary">
      <p>Comprobante relacionado: <strong>${cobranza.comprobanteSerie}-${cobranza.comprobanteNumero}</strong></p>
      <p>Cliente: <strong>${cobranza.clienteNombre}</strong></p>
      <p>Medio de pago: <strong>${medioLabel}</strong></p>
      ${mediosDetalleTemplate}
      <p>N° operación: <strong title="${operacionRefs ?? ''}">${operacionLabel}</strong></p>
      <p>Caja: <strong>${cobranza.cajaDestino ?? '-'}</strong></p>
      <p>Importe registrado: <strong>${formattedAmount}</strong></p>
      <p>Tipo de cobro: <strong>${tipoCobroLabel}</strong></p>
      <p>Estado: <span class="badge">${estadoLabel}</span></p>
    </div>
    ${cobranza.notas ? `<h2>Notas</h2><p>${cobranza.notas}</p>` : ''}
    <p style="margin-top:32px;font-size:12px;color:#475569;">Documento emitido automáticamente por FacturaFácil.</p>
  </body>
</html>`;

    printWindow.document.write(template);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-700">
        <header className="flex items-start justify-between px-5 py-4 border-b border-slate-100 dark:border-gray-800">
          <div>
            <p className="text-xs uppercase text-slate-500 dark:text-gray-400 font-semibold tracking-wide">Detalle de cobranza</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{cobranza.numero}</p>
            <p className="text-xs text-slate-500 dark:text-gray-400">Registrado el {cobranza.fechaCobranza}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="px-5 py-4 space-y-4 text-sm text-slate-700 dark:text-gray-100">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase text-slate-500 dark:text-gray-400">Comprobante</p>
              <p className="font-semibold">{cobranza.comprobanteSerie}-{cobranza.comprobanteNumero}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500 dark:text-gray-400">Cliente</p>
              <p className="font-semibold">{cobranza.clienteNombre}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500 dark:text-gray-400">Medio de pago</p>
              <p className="font-semibold capitalize">{medioLabel}</p>
              {medioLines.length > 0 ? (
                <ul className="mt-1 space-y-1 text-xs text-slate-500">
                  {medioLines.map((line) => (
                    <li key={`${line.code}-${line.label}-${line.amount}`}>
                      <span className="font-medium text-slate-700 dark:text-gray-100">{line.label}</span>
                      {' '}
                      · {formatMoney(line.amount, cobranza.moneda)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 dark:text-gray-400">Sin desglose disponible</p>
              )}
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500 dark:text-gray-400">Caja destino</p>
              <p className="font-semibold">{cobranza.cajaDestino}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500 dark:text-gray-400">Tipo de cobro</p>
              <p className="font-semibold capitalize">{tipoCobroLabel}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500 dark:text-gray-400">N° operación</p>
              <p className="font-semibold" title={operacionRefs || undefined}>{operacionLabel}</p>
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-800 rounded-xl p-4">
            <p className="text-xs uppercase text-slate-500 dark:text-gray-400 font-semibold">Importe cobrado</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{formatMoney(cobranza.monto)}</p>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">Estado: <span className="font-semibold capitalize">{estadoLabel}</span></p>
          </div>
          {cobranza.notas && (
            <div>
              <p className="text-xs uppercase text-slate-500 dark:text-gray-400">Notas</p>
              <p className="mt-1 text-sm leading-relaxed">{cobranza.notas}</p>
            </div>
          )}
        </div>
        <footer className="px-5 py-4 border-t border-slate-100 dark:border-gray-800 flex justify-between">
          <button
            type="button"
            onClick={handlePrintConstancia}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 hover:text-blue-800"
          >
            <Printer className="w-4 h-4" /> Imprimir constancia
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
};
