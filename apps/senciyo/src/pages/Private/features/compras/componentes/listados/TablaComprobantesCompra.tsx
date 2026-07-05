import { useState, useEffect, useRef } from 'react';
import { MoreHorizontal, Eye, XCircle, Search, Plus, Receipt } from 'lucide-react';
import type { ComprobanteCompra } from '../../modelos/ComprobanteCompra';
import {
  ESTADO_DOCUMENTO_CC_LABELS,
  ESTADO_PAGO_CC_LABELS,
} from '../../modelos/ComprobanteCompra';
import {
  BADGE_ESTADO_DOCUMENTO_CC,
  BADGE_ESTADO_PAGO_CC,
} from '../../constantes/estadosCompras';
import { filtrarComprobantesCompra, type FiltrosCC } from '../../logica/filtrosCompras';
import { puedeAnularCC } from '../../logica/reglasCompras';

interface TablaComprobantesCompraProps {
  comprobantes: ComprobanteCompra[];
  onVer: (cc: ComprobanteCompra) => void;
  onAnular: (cc: ComprobanteCompra) => void;
  onNuevo: () => void;
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

export default function TablaComprobantesCompra({
  comprobantes,
  onVer,
  onAnular,
  onNuevo,
}: TablaComprobantesCompraProps) {
  const [filtros, setFiltros] = useState<FiltrosCC>({ busqueda: '' });
  const [menu, setMenu] = useState<PosMenu | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const filtrados = filtrarComprobantesCompra(comprobantes, filtros);

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

  const ccActivo = menu ? comprobantes.find((c) => c.id === menu.id) ?? null : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filtros.busqueda ?? ''}
            onChange={(e) => setFiltros((f) => ({ ...f, busqueda: e.target.value }))}
            placeholder="Buscar por número, proveedor o RUC..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <select
          value={filtros.estadoPago ?? ''}
          onChange={(e) => setFiltros((f) => ({ ...f, estadoPago: e.target.value }))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="parcial">Pago parcial</option>
          <option value="pagado">Pagado</option>
        </select>
        <button
          onClick={onNuevo}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Registrar CC
        </button>
      </div>

      {filtrados.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Receipt size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">
            {comprobantes.length === 0
              ? 'No hay comprobantes de compra'
              : 'Sin resultados para la búsqueda'}
          </p>
          {comprobantes.length === 0 && (
            <p className="text-sm mt-1">Registra el primer comprobante de compra.</p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Comprobante</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Proveedor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">F. Emisión</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">F. Registro</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Pago</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.map((cc) => (
                <tr
                  key={cc.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onVer(cc)}
                >
                  <td className="px-4 py-3 font-mono font-medium text-gray-900">
                    {cc.serieProveedor}-{cc.numeroProveedor}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 truncate max-w-[180px]">
                      {cc.proveedorNombre}
                    </div>
                    <div className="text-xs text-gray-500">{cc.proveedorNumeroDocumento}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{cc.fechaEmisionProveedor}</td>
                  <td className="px-4 py-3 text-gray-600">{cc.fechaRegistro.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {cc.totales.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}{' '}
                    <span className="text-gray-500 text-xs">{cc.moneda}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      estado={cc.estadoPago}
                      labels={ESTADO_PAGO_CC_LABELS}
                      clases={BADGE_ESTADO_PAGO_CC}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      estado={cc.estadoDocumento}
                      labels={ESTADO_DOCUMENTO_CC_LABELS}
                      clases={BADGE_ESTADO_DOCUMENTO_CC}
                    />
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => abrirMenu(e, cc.id)}
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
      {menu && ccActivo && (
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
            onClick={() => { onVer(ccActivo); setMenu(null); }}
          />
          {puedeAnularCC(ccActivo) && (
            <>
              <div className="my-1 border-t border-gray-100" />
              <MenuItem
                icon={XCircle}
                label="Anular comprobante"
                onClick={() => { onAnular(ccActivo); setMenu(null); }}
                danger
              />
            </>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Mostrando {filtrados.length} de {comprobantes.length} comprobantes
      </p>
    </div>
  );
}
