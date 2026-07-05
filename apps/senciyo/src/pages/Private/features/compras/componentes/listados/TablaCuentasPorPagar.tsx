import { useState, useEffect, useRef } from 'react';
import { MoreHorizontal, Eye, CreditCard, Search, Banknote } from 'lucide-react';
import type { CuentaPorPagar } from '../../modelos/CuentaPorPagar';
import {
  ESTADO_PAGO_CXP_LABELS,
  ESTADO_VENCIMIENTO_CXP_LABELS,
} from '../../modelos/CuentaPorPagar';
import {
  BADGE_ESTADO_PAGO_CXP,
  BADGE_ESTADO_VENCIMIENTO_CXP,
} from '../../constantes/estadosCompras';
import { filtrarCuentasPorPagar, type FiltrosCxP } from '../../logica/filtrosCompras';
import { puedeRegistrarPago } from '../../logica/reglasCompras';

interface TablaCuentasPorPagarProps {
  cuentas: CuentaPorPagar[];
  onVer: (cxp: CuentaPorPagar) => void;
  onRegistrarPago: (cxp: CuentaPorPagar) => void;
}

interface PosMenu {
  id: string;
  x: number;
  y: number;
}

function Badge({
  estado,
  labels,
  clases,
}: {
  estado: string;
  labels: Record<string, string>;
  clases: Record<string, string>;
}) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${clases[estado] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {labels[estado] ?? estado}
    </span>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Eye;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
        danger
          ? 'text-red-600 hover:bg-red-50'
          : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

export default function TablaCuentasPorPagar({
  cuentas,
  onVer,
  onRegistrarPago,
}: TablaCuentasPorPagarProps) {
  const [filtros, setFiltros] = useState<FiltrosCxP>({ busqueda: '' });
  const [menu, setMenu] = useState<PosMenu | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const filtradas = filtrarCuentasPorPagar(cuentas, filtros);

  const totalPendiente = filtradas
    .filter((c) => c.estadoPago !== 'pagada' && c.estadoPago !== 'anulada')
    .reduce((s, c) => s + c.saldoPendiente, 0);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null);
      }
    }
    if (menu) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [menu]);

  function abrirMenu(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenu({ id, x: rect.left, y: rect.bottom });
  }

  const cxpActiva = menu ? cuentas.find((c) => c.id === menu.id) ?? null : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filtros.busqueda ?? ''}
            onChange={(e) => setFiltros((f) => ({ ...f, busqueda: e.target.value }))}
            placeholder="Buscar por proveedor, comprobante..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <select
          value={filtros.estadoPago ?? ''}
          onChange={(e) =>
            setFiltros((f) => ({
              ...f,
              estadoPago: e.target.value as FiltrosCxP['estadoPago'],
            }))
          }
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="parcial">Pago parcial</option>
          <option value="pagada">Pagada</option>
          <option value="anulada">Anulada</option>
        </select>
        <select
          value={filtros.estadoVencimiento ?? ''}
          onChange={(e) =>
            setFiltros((f) => ({
              ...f,
              estadoVencimiento: e.target.value as FiltrosCxP['estadoVencimiento'],
            }))
          }
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">Todos los vencimientos</option>
          <option value="vigente">Vigente</option>
          <option value="por_vencer">Por vencer</option>
          <option value="vencida">Vencida</option>
        </select>
      </div>

      {/* Resumen */}
      {totalPendiente > 0 && (
        <div className="flex items-center gap-2 text-sm bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
          <Banknote size={16} className="text-amber-600" />
          <span className="text-amber-700">
            Total pendiente de pago:{' '}
            <strong>S/ {totalPendiente.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong>
          </span>
        </div>
      )}

      {filtradas.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <CreditCard size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">
            {cuentas.length === 0
              ? 'No hay cuentas por pagar'
              : 'Sin resultados para la búsqueda'}
          </p>
          {cuentas.length === 0 && (
            <p className="text-sm mt-1">
              Las cuentas por pagar se generan al registrar comprobantes a crédito.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Proveedor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Comprobante</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Vencimiento</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Saldo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Vencimiento</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtradas.map((cxp) => (
                <tr
                  key={cxp.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onVer(cxp)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 truncate max-w-[160px]">
                      {cxp.proveedorNombre}
                    </div>
                    <div className="text-xs text-gray-500">{cxp.proveedorNumeroDocumento}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-700">
                    {cxp.comprobanteCompraNumero}
                    <div className="text-xs text-gray-400 font-sans">{cxp.tipoComprobanteOrigen}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {cxp.fechaVencimiento ?? <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {cxp.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}{' '}
                    <span className="text-xs text-gray-500">{cxp.moneda}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium">
                    {cxp.saldoPendiente.toLocaleString('es-PE', { minimumFractionDigits: 2 })}{' '}
                    <span className="text-xs text-gray-500">{cxp.moneda}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      estado={cxp.estadoPago}
                      labels={ESTADO_PAGO_CXP_LABELS}
                      clases={BADGE_ESTADO_PAGO_CXP}
                    />
                    <div className="text-xs text-gray-400 mt-0.5">
                      {cxp.formaPago === 'contado' ? 'Contado' : 'Crédito'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {cxp.fechaVencimiento ? (
                      <Badge
                        estado={cxp.estadoVencimiento}
                        labels={ESTADO_VENCIMIENTO_CXP_LABELS}
                        clases={BADGE_ESTADO_VENCIMIENTO_CXP}
                      />
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => abrirMenu(e, cxp.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Menú contextual */}
      {menu && cxpActiva && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white rounded-xl shadow-lg border border-gray-200 py-1 w-48 overflow-hidden"
          style={{
            top: Math.min(menu.y + 4, window.innerHeight - 120),
            left: Math.min(menu.x, window.innerWidth - 200),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <MenuItem
            icon={Eye}
            label="Ver detalle"
            onClick={() => { onVer(cxpActiva); setMenu(null); }}
          />
          {puedeRegistrarPago(cxpActiva) && (
            <MenuItem
              icon={CreditCard}
              label="Registrar pago"
              onClick={() => { onRegistrarPago(cxpActiva); setMenu(null); }}
            />
          )}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Mostrando {filtradas.length} de {cuentas.length} cuentas por pagar
      </p>
    </div>
  );
}
