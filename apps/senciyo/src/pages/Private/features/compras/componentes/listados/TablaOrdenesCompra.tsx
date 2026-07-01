import { useState } from 'react';
import { Eye, CheckCircle, Ban, FileText, Search, Plus } from 'lucide-react';
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

export default function TablaOrdenesCompra({
  ordenes,
  onVer,
  onAprobarRechazar,
  onAnular,
  onGenerarCC,
  onNueva,
}: TablaOrdenesCompraProps) {
  const [filtros, setFiltros] = useState<FiltrosOC>({ busqueda: '' });

  const filtradas = filtrarOrdenesCompra(ordenes, filtros);

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
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtradas.map((oc) => (
                <tr key={oc.id} className="hover:bg-gray-50 transition-colors">
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
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => onVer(oc)}
                        title="Ver detalle"
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                      {(puedeAprobarOC(oc) || puedeRechazarOC(oc)) && (
                        <button
                          onClick={() => onAprobarRechazar(oc)}
                          title="Aprobar / Rechazar"
                          className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                      {puedeGenerarCCDesdeOC(oc) && (
                        <button
                          onClick={() => onGenerarCC(oc)}
                          title="Generar comprobante de compra"
                          className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <FileText size={16} />
                        </button>
                      )}
                      {puedeAnularOC(oc) && (
                        <button
                          onClick={() => onAnular(oc)}
                          title="Anular"
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Ban size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400">
        Mostrando {filtradas.length} de {ordenes.length} órdenes
      </p>
    </div>
  );
}
