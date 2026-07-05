import { useState, useEffect, useRef } from 'react';
import { MoreHorizontal, Eye, XCircle, Search, Wallet } from 'lucide-react';
import type { PagoCompra } from '../../modelos/PagoCompra';
import { ESTADO_DOCUMENTO_PAGO_LABELS } from '../../modelos/PagoCompra';
import type { CuentaPorPagar } from '../../modelos/CuentaPorPagar';
import { ESTADO_PAGO_CXP_LABELS } from '../../modelos/CuentaPorPagar';
import { BADGE_ESTADO_DOCUMENTO_PAGO, BADGE_ESTADO_PAGO_CXP } from '../../constantes/estadosCompras';
import { filtrarPagosCompra, type FiltrosPagos } from '../../logica/filtrosCompras';
import { puedeAnularPago } from '../../logica/reglasCompras';

interface TablaPagosCompraProps {
  pagos: PagoCompra[];
  cuentasPorPagar: CuentaPorPagar[];
  onVer: (pago: PagoCompra) => void;
  onAnular: (pago: PagoCompra) => void;
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

export default function TablaPagosCompra({ pagos, cuentasPorPagar, onVer, onAnular }: TablaPagosCompraProps) {
  const [filtros, setFiltros] = useState<FiltrosPagos>({ busqueda: '' });
  const [menu, setMenu] = useState<PosMenu | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const filtrados = filtrarPagosCompra(pagos, filtros);

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

  const pagoActivo = menu ? pagos.find((p) => p.id === menu.id) ?? null : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filtros.busqueda ?? ''}
            onChange={(e) => setFiltros((f) => ({ ...f, busqueda: e.target.value }))}
            placeholder="Buscar por número de pago o proveedor..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <select
          value={filtros.estadoDocumento ?? ''}
          onChange={(e) => setFiltros((f) => ({ ...f, estadoDocumento: e.target.value }))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">Todos los estados</option>
          <option value="registrado">Registrado</option>
          <option value="anulado">Anulado</option>
        </select>
      </div>

      {filtrados.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Wallet size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">
            {pagos.length === 0 ? 'No hay pagos registrados' : 'Sin resultados para la búsqueda'}
          </p>
          {pagos.length === 0 && (
            <p className="text-sm mt-1">Los pagos se registran desde las cuentas por pagar.</p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Número</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Proveedor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Doc. origen</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Medios</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado pago</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado CxP</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.map((pago) => {
                const cxp = cuentasPorPagar.find((c) => pago.cuentasPorPagarAplicadas.includes(c.id));
                return (
                <tr
                  key={pago.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onVer(pago)}
                >
                  <td className="px-4 py-3 font-mono font-medium text-gray-900">
                    {pago.numeroPago}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 truncate max-w-[180px]">
                      {pago.proveedorNombre}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-600">
                    {cxp?.comprobanteCompraNumero ?? <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{pago.fechaPago}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {pago.mediosPago.map((mp) => (
                        <span
                          key={mp.id}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full"
                        >
                          {mp.medioPagoNombre}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium">
                    {pago.montoTotalPagado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}{' '}
                    <span className="text-xs text-gray-500">{pago.moneda}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      estado={pago.estadoDocumento}
                      labels={ESTADO_DOCUMENTO_PAGO_LABELS}
                      clases={BADGE_ESTADO_DOCUMENTO_PAGO}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {cxp ? (
                      <Badge estado={cxp.estadoPago} labels={ESTADO_PAGO_CXP_LABELS} clases={BADGE_ESTADO_PAGO_CXP} />
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => abrirMenu(e, pago.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Menú contextual */}
      {menu && pagoActivo && (
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
            onClick={() => { onVer(pagoActivo); setMenu(null); }}
          />
          {puedeAnularPago(pagoActivo) && (
            <>
              <div className="my-1 border-t border-gray-100" />
              <MenuItem
                icon={XCircle}
                label="Anular pago"
                onClick={() => { onAnular(pagoActivo); setMenu(null); }}
                danger
              />
            </>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Mostrando {filtrados.length} de {pagos.length} pagos
      </p>
    </div>
  );
}
