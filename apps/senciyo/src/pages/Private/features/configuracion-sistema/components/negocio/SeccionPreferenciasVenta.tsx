import { useState } from 'react';
import { Package, CheckCircle2, CircleDashed, FileText, ShoppingCart, ClipboardList, BookOpen, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { TarjetaConfiguracion } from '../comunes/TarjetaConfiguracion';
import ModalConfiguracionInventario from './ModalConfiguracionInventario';
import type { SalesPreferences } from '../../contexto/ContextoConfiguracion';

export type { SalesPreferences };

interface SalesPreferencesSectionProps {
  preferences: SalesPreferences;
  isLoading?: boolean;
}

const LABEL_DESCUENTO: Record<string, string> = {
  automatico: 'Automático',
  nota_salida: 'Mediante Nota de Salida',
};

type FilaResumen = {
  label: string;
  valor: string;
  icon: React.ComponentType<{ className?: string }>;
};

function buildFilasResumen(preferences: SalesPreferences): FilaResumen[] {
  return [
    {
      label: 'Factura / Boleta',
      valor: LABEL_DESCUENTO[preferences.stockDescuentoFacturaYBoleta ?? 'automatico'],
      icon: FileText,
    },
    {
      label: 'Nota de Venta',
      valor: LABEL_DESCUENTO[preferences.stockDescuentoNotaVenta ?? 'automatico'],
      icon: ShoppingCart,
    },
    {
      label: 'Guía de Remisión',
      valor: LABEL_DESCUENTO[preferences.stockDescuentoGuiaRemision ?? 'automatico'],
      icon: FileText,
    },
    { label: 'Orden de Venta', valor: 'Reserva stock', icon: ClipboardList },
    { label: 'Cotización', valor: 'No afecta stock', icon: BookOpen },
    { label: 'Nota de Ingreso', valor: 'Aumenta stock', icon: ArrowUpCircle },
    { label: 'Nota de Salida', valor: 'Descuenta stock', icon: ArrowDownCircle },
  ];
}

export function SalesPreferencesSection({
  preferences,
  isLoading = false,
}: SalesPreferencesSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const controlActivo = preferences.controlStockActivo ?? false;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-5 w-48 rounded bg-gray-200 animate-pulse" />
        <div className="h-24 rounded-lg bg-gray-100 animate-pulse" />
      </div>
    );
  }

  return (
    <>
      <TarjetaConfiguracion title="Inventario" icon={Package}>
        {controlActivo ? (
          <div className="space-y-4">
            {/* Estado activo */}
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-sm font-medium text-green-700">Inventario: Activo</span>
            </div>

            {/* Resumen por documento */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <tbody className="divide-y divide-gray-100">
                  {buildFilasResumen(preferences).map(({ label, valor, icon: Icon }) => (
                    <tr key={label} className="bg-white">
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-2 text-gray-700">
                          <Icon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          {label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">{valor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              Editar configuración →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Estado inactivo */}
            <div className="flex items-center gap-2">
              <CircleDashed className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-500">Inventario: Inactivo</span>
            </div>

            <p className="text-sm text-gray-500 leading-relaxed">
              El inventario aún no está configurado. Tus ventas no descontarán stock hasta que actives el control de inventario.
            </p>

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Configurar inventario
            </button>
          </div>
        )}
      </TarjetaConfiguracion>

      <ModalConfiguracionInventario
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
