import { useState, useEffect, useRef } from 'react';
import {
  MoreHorizontal,
  Eye,
  CheckCircle,
  FileText,
  Search,
  Plus,
  XCircle,
} from 'lucide-react';
import type { OrdenCompra } from '../../modelos/OrdenCompra';
import {
  ESTADO_DOCUMENTO_OC_LABELS,
  ESTADO_APROBACION_OC_LABELS,
} from '../../modelos/OrdenCompra';
import {
  BADGE_ESTADO_DOCUMENTO_OC,
  BADGE_ESTADO_APROBACION_OC,
} from '../../constantes/estadosCompras';
import { filtrarOrdenesCompra, type FiltrosOC } from '../../logica/filtrosCompras';
import {
  puedeAprobarOC,
  puedeRechazarOC,
  puedeAnularOC,
  puedeGenerarCCDesdeOC,
} from '../../logica/reglasCompras';

interface TablaOrdenesCompraProps {
  ordenes: OrdenCompra[];
  onVer: (oc: OrdenCompra) => void;
  onAprobarRechazar: (oc: OrdenCompra) => void;
  onAnular: (oc: OrdenCompra) => void;
  onGenerarCC: (oc: OrdenCompra) => void;
  onNueva: () => void;
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

export default function TablaOrdenesCompra({
  ordenes,
  onVer,
  onAprobarRechazar,
  onAnular,
  onGenerarCC,
  onNueva,
}: TablaOrdenesCompraProps) {
  const [filtros, setFiltros] = useState<FiltrosOC>({ busqueda: '' });
  const [menu, setMenu] = useState<PosMenu | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const filtradas = filtrarOrdenesCompra(ordenes, filtros);

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

  const ocActiva = menu ? ordenes.find((o) => o.id === menu.id) ?? null : null;

  return (
    <div className="space-y-4">
      {/* Barra de acciones */}
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
          value={filtros.estadoDocumento ?? ''}
          onChange={(e) =>
            setFiltros((f) => ({
              ...f,
              estadoDocumento: e.target.value as FiltrosOC['estadoDocumento'],
            }))
          }
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="registrado">Registrado</option>
          <option value="cerrado">Cerrado</option>
          <option value="anulado">Anulado</option>
        </select>
        <button
          onClick={onNueva}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Nueva OC
        </button>
      </div>

      {/* Tabla */}
      {filtradas.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">
            {ordenes.length === 0 ? 'No hay órdenes de compra' : 'Sin resultados para la búsqueda'}
          </p>
          {ordenes.length === 0 && (
            <p className="text-sm mt-1">Crea la primera orden de compra para empezar.</p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Número</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Proveedor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Aprobación</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtradas.map((oc) => (
                <tr
                  key={oc.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onVer(oc)}
                >
                  <td className="px-4 py-3 font-mono font-medium text-gray-900">{oc.numero}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 truncate max-w-[180px]">
                      {oc.proveedorNombre}
                    </div>
                    <div className="text-xs text-gray-500">{oc.proveedorNumeroDocumento}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{oc.fechaEmision}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {oc.totales.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}{' '}
                    <span className="text-gray-500 text-xs">{oc.moneda}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      estado={oc.estadoDocumento}
                      labels={ESTADO_DOCUMENTO_OC_LABELS}
                      clases={BADGE_ESTADO_DOCUMENTO_OC}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {oc.requiereAprobacion ? (
                      <Badge
                        estado={oc.estadoAprobacion}
                        labels={ESTADO_APROBACION_OC_LABELS}
                        clases={BADGE_ESTADO_APROBACION_OC}
                      />
                    ) : (
                      <span className="text-xs text-gray-400">Sin requerimiento</span>
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => abrirMenu(e, oc.id)}
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

      {/* Menú contextual con posición fija */}
      {menu && ocActiva && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white rounded-xl shadow-lg border border-gray-200 py-1 w-52 overflow-hidden"
          style={{
            top: Math.min(menu.y + 4, window.innerHeight - 220),
            left: Math.min(menu.x, window.innerWidth - 216),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <MenuItem
            icon={Eye}
            label="Ver detalle"
            onClick={() => { onVer(ocActiva); setMenu(null); }}
          />
          {(puedeAprobarOC(ocActiva) || puedeRechazarOC(ocActiva)) && (
            <MenuItem
              icon={CheckCircle}
              label="Aprobar / Rechazar"
              onClick={() => { onAprobarRechazar(ocActiva); setMenu(null); }}
            />
          )}
          {puedeGenerarCCDesdeOC(ocActiva) && (
            <MenuItem
              icon={FileText}
              label="Generar comprobante"
              onClick={() => { onGenerarCC(ocActiva); setMenu(null); }}
            />
          )}
          {puedeAnularOC(ocActiva) && (
            <>
              <div className="my-1 border-t border-gray-100" />
              <MenuItem
                icon={XCircle}
                label="Anular OC"
                onClick={() => { onAnular(ocActiva); setMenu(null); }}
                danger
              />
            </>
          )}
          {!puedeAprobarOC(ocActiva) && !puedeRechazarOC(ocActiva) &&
            !puedeGenerarCCDesdeOC(ocActiva) && !puedeAnularOC(ocActiva) && (
            <p className="px-4 py-2 text-xs text-gray-400">Sin acciones disponibles</p>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Mostrando {filtradas.length} de {ordenes.length} órdenes
      </p>
    </div>
  );
}
