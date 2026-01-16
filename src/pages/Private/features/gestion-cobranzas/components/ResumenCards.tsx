import { AlertTriangle, CreditCard, FileCheck2, Wallet } from 'lucide-react';
import type { CobranzasSummary } from '../models/cobranzas.types';

interface ResumenCardsProps {
  resumen: CobranzasSummary;
  formatMoney: (value: number, currency?: string) => string;
}

export const ResumenCards = ({ resumen, formatMoney }: ResumenCardsProps) => (
  <section className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
    <article className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-4 flex items-center gap-4 shadow-sm">
      <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-300">
        <FileCheck2 className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs uppercase text-slate-500 dark:text-gray-400 font-semibold tracking-wide">Documentos pendientes</p>
        <p className="text-2xl font-semibold text-slate-900 dark:text-white">{resumen.totalDocumentosPendientes}</p>
      </div>
    </article>
    <article className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-4 flex items-center gap-4 shadow-sm">
      <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-300">
        <Wallet className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs uppercase text-slate-500 dark:text-gray-400 font-semibold tracking-wide">Saldo pendiente</p>
        <p className="text-2xl font-semibold text-slate-900 dark:text-white">{formatMoney(resumen.totalSaldoPendiente)}</p>
      </div>
    </article>
    <article className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-4 flex items-center gap-4 shadow-sm">
      <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-300">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs uppercase text-slate-500 dark:text-gray-400 font-semibold tracking-wide">Saldo vencido</p>
        <p className="text-2xl font-semibold text-slate-900 dark:text-white">{formatMoney(resumen.totalVencido)}</p>
      </div>
    </article>
    <article className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-4 flex items-center gap-4 shadow-sm">
      <div className="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-300">
        <CreditCard className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs uppercase text-slate-500 dark:text-gray-400 font-semibold tracking-wide">Cobrado en período</p>
        <p className="text-2xl font-semibold text-slate-900 dark:text-white">{formatMoney(resumen.totalCobrado)}</p>
        <p className="text-[11px] text-slate-500 dark:text-gray-400">{resumen.totalCobranzas} cobranzas</p>
      </div>
    </article>
  </section>
);
