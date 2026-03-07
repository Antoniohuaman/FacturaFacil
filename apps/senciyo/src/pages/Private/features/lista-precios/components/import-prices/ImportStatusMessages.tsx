import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { BulkPriceImportResult } from '../../models/PriceImportTypes';
import { formatBusinessDateTimeForTicket } from '@/shared/time/businessTime';

interface ImportStatusMessagesProps {
  parseError: string | null;
  isParsing: boolean;
  lastResult: { summary: BulkPriceImportResult; completedAt: string } | null;
}

export const ImportStatusMessages: React.FC<ImportStatusMessagesProps> = ({
  parseError,
  isParsing,
  lastResult
}) => (
  <div className="space-y-4">
    {(parseError || isParsing) && (
      <div className={`rounded-lg border px-4 py-3 text-sm ${parseError
        ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300'
        : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200'}`}>
        {isParsing ? 'Procesando archivo...' : parseError}
      </div>
    )}

    {lastResult && (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-sm text-green-800 dark:text-green-300 space-y-1">
        <div className="font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" aria-hidden />
          Importación aplicada el {formatBusinessDateTimeForTicket(lastResult.completedAt)}.
        </div>
        <div>
          {lastResult.summary.appliedPrices} precios actualizados en {lastResult.summary.appliedProducts} productos. Filas omitidas: {lastResult.summary.skippedRows}.
        </div>
      </div>
    )}

    {!parseError && !isParsing && !lastResult && (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <AlertTriangle className="w-4 h-4" aria-hidden />
        Recuerda validar la plantilla antes de aplicar los cambios.
      </div>
    )}
  </div>
);
