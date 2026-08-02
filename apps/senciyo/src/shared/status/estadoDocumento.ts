// shared/status/estadoDocumento.ts
//
// Estado documental transversal a los documentos "registrable/anulable"
// (Gasto, Pago; el CC de Compras extiende esto con su propio 'borrador' —
// ver `compras/constantes/estadosCompras.ts`). Fuente única de color/label
// para las dos categorías compartidas, nunca un segundo mapa paralelo.

export type EstadoDocumentoRegistrable = 'registrado' | 'anulado';

export const ESTADO_DOCUMENTO_REGISTRABLE_LABELS: Record<EstadoDocumentoRegistrable, string> = {
  registrado: 'Registrado',
  anulado: 'Anulado',
};

export const BADGE_ESTADO_DOCUMENTO_REGISTRABLE: Record<EstadoDocumentoRegistrable, string> = {
  registrado: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  anulado: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
};
