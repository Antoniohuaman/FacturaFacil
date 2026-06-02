import { useState, useEffect } from 'react';
import { X, Building2 } from 'lucide-react';
import { Button, Input, Switch } from '@/contasis';
import { PAYMENT_MEANS_CATALOG } from '@/shared/payments/paymentMeans';
import {
  cargarConfiguracionDetraccion,
  guardarConfiguracionDetraccion,
} from '@/shared/catalogos-sunat';
import type { ConfiguracionDetraccionEmpresa } from '@/shared/catalogos-sunat';

const CONFIG_DETRACCION_DEFECTO: ConfiguracionDetraccionEmpresa = {
  cuentaBancoNacion: '',
  redondearMonto: false,
  medioPagoSunatPorDefecto: '001',
};

// Medios de pago más comunes para detracción (Catálogo 59)
const CODIGOS_DETRACCION_COMUNES = new Set(['001', '002', '003']);

interface ModalConfiguracionDetraccionProps {
  abierto: boolean;
  onCerrar: () => void;
  onGuardado?: (config: ConfiguracionDetraccionEmpresa) => void;
}

export function ModalConfiguracionDetraccion({
  abierto,
  onCerrar,
  onGuardado,
}: ModalConfiguracionDetraccionProps) {
  const [config, setConfig] = useState<ConfiguracionDetraccionEmpresa>(CONFIG_DETRACCION_DEFECTO);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierto) {
      setConfig(cargarConfiguracionDetraccion());
    }
  }, [abierto]);

  if (!abierto) return null;

  const handleGuardar = () => {
    setGuardando(true);
    guardarConfiguracionDetraccion(config);
    setGuardando(false);
    onGuardado?.(config);
    onCerrar();
  };

  const mediosPagoOrdenados = [
    ...PAYMENT_MEANS_CATALOG.filter((m) => CODIGOS_DETRACCION_COMUNES.has(m.code)),
    ...PAYMENT_MEANS_CATALOG.filter((m) => !CODIGOS_DETRACCION_COMUNES.has(m.code)),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onCerrar}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 z-10">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-semibold text-gray-900">
              Configurar cuenta de detracción
            </h3>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="px-6 py-5 space-y-5">
          <div>
            <Input
              label="Cuenta corriente Banco de la Nación"
              placeholder="Ej. 00-000-123456"
              value={config.cuentaBancoNacion}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, cuentaBancoNacion: e.target.value }))
              }
              helperText="Número de cuenta donde el cliente depositará la detracción."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Medio de pago SUNAT por defecto
            </label>
            <select
              value={config.medioPagoSunatPorDefecto}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, medioPagoSunatPorDefecto: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {mediosPagoOrdenados.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.code} - {m.sunatName}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">
              Catálogo 59 SUNAT. Se prellenará al activar detracción en un comprobante.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-800">Redondear monto de detracción</p>
              <p className="text-xs text-gray-400 mt-0.5">Redondea al sol entero más cercano.</p>
            </div>
            <Switch
              checked={config.redondearMonto}
              onChange={(checked) =>
                setConfig((prev) => ({ ...prev, redondearMonto: checked }))
              }
            />
          </div>
        </div>

        {/* Pie */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <Button variant="secondary" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleGuardar} disabled={guardando}>
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}
