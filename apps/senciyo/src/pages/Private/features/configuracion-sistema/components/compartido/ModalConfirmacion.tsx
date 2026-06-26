import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/contasis';

interface ModalConfirmacionProps {
  isOpen: boolean;
  titulo: string;
  descripcion: ReactNode;
  textoConfirmar?: string;
  textoCancelar?: string;
  variante?: 'danger' | 'info';
  cargando?: boolean;
  onConfirmar?: () => void;
  onCancelar: () => void;
}

export function ModalConfirmacion({
  isOpen,
  titulo,
  descripcion,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  variante = 'danger',
  cargando = false,
  onConfirmar,
  onCancelar,
}: ModalConfirmacionProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="p-6">
          <div
            className={`flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4 ${
              variante === 'danger' ? 'bg-red-100' : 'bg-amber-100'
            }`}
          >
            <AlertTriangle
              className={`w-6 h-6 ${variante === 'danger' ? 'text-red-600' : 'text-amber-600'}`}
            />
          </div>
          <h3 className="text-base font-semibold text-gray-900 text-center">{titulo}</h3>
          <div className="mt-3 text-sm text-gray-600 text-center">{descripcion}</div>
        </div>
        <div className="px-6 pb-6 flex justify-center gap-3">
          <Button variant="secondary" onClick={onCancelar} disabled={cargando} type="button">
            {textoCancelar}
          </Button>
          {onConfirmar && (
            <button
              onClick={onConfirmar}
              disabled={cargando}
              type="button"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {cargando ? 'Eliminando…' : textoConfirmar}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
