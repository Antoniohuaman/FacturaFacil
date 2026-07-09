import { useState, useEffect, useRef } from 'react';
import {
  MoreHorizontal,
  Eye,
  CheckCircle,
  FileText,
  Search,
  Plus,
  XCircle,
  Pencil,
  Trash2,
  Send,
  Printer,
  Download,
  Link2,
} from 'lucide-react';
import ColumnsManager, { type ColumnsManagerColumn } from '@/shared/columns/ColumnsManager';
import { formatMoney } from '@/shared/currency';
import type { OrdenCompra } from '../../modelos/OrdenCompra';
import type { EstadoPrincipalOC } from '../../modelos/OrdenCompra';
import type { ComprobanteCompra } from '../../modelos/ComprobanteCompra';
import { BADGE_ESTADO_PRINCIPAL_OC } from '../../constantes/estadosCompras';
import { filtrarOrdenesCompra, type FiltrosOC } from '../../logica/filtrosCompras';
import { formatearFechaCompra, formatearNumeroCompra } from '../../utilidades/formatearCompras';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import {
  puedeAnularOC,
  puedeGenerarCCDesdeOC,
  puedeEditarOC,
  puedeEliminarBorradorOC,
  calcularEstadoPrincipalOC,
  resolverNombreFormaPagoOC,
  ESTADOS_PRINCIPALES_OC,
} from '../../logica/reglasCompras';

interface TablaOrdenesCompraProps {
  ordenes: OrdenCompra[];
  comprobantes: ComprobanteCompra[];
  onVer: (oc: OrdenCompra) => void;
  onEditar: (oc: OrdenCompra) => void;
  onEliminarBorrador: (oc: OrdenCompra) => void;
  onRegistrarBorrador: (oc: OrdenCompra) => void;
  onAprobarRechazar: (oc: OrdenCompra) => void;
  onAnular: (oc: OrdenCompra) => void;
  onGenerarCC: (oc: OrdenCompra) => void;
  onImprimir: (oc: OrdenCompra) => void;
  onEnviar: (oc: OrdenCompra) => void;
  onNueva: () => void;
}

type ColumnaConfigurableOC =
  | 'fechaEmision'
  | 'fechaRegistro'
  | 'fechaVencimiento'
  | 'comprador'
  | 'documentoRelacionado'
  | 'moneda'
  | 'formaPago'
  | 'centroCosto'
  | 'presupuesto'
  | 'metodoEnvio'
  | 'contacto';

const COLUMNAS_CONFIGURABLES_OC: Array<{ id: ColumnaConfigurableOC; label: string; labelCorto?: string }> = [
  { id: 'fechaEmision', label: 'Fecha de emisión', labelCorto: 'F. Emisión' },
  { id: 'fechaRegistro', label: 'Fecha de registro', labelCorto: 'F. Registro' },
  { id: 'fechaVencimiento', label: 'Fecha de vencimiento', labelCorto: 'F. Vencimiento' },
  { id: 'comprador', label: 'Comprador' },
  { id: 'documentoRelacionado', label: 'Documento relacionado', labelCorto: 'Doc. Relacionado' },
  { id: 'moneda', label: 'Moneda' },
  { id: 'formaPago', label: 'Forma de pago' },
  { id: 'centroCosto', label: 'Centro de costo' },
  { id: 'presupuesto', label: 'Presupuesto' },
  { id: 'metodoEnvio', label: 'Método de envío' },
  { id: 'contacto', label: 'Contacto' },
];

const COLUMNAS_VISIBLES_DEFAULT_OC: ColumnaConfigurableOC[] = [
  'fechaEmision',
  'fechaVencimiento',
  'comprador',
  'documentoRelacionado',
  'formaPago',
];

const STORAGE_KEY_COLUMNAS_OC = 'compras_oc_tabla_columnas';

interface ConfigColumnasOC {
  visibles: ColumnaConfigurableOC[];
  orden: ColumnaConfigurableOC[];
}

function esColumnaValida(id: string): id is ColumnaConfigurableOC {
  return COLUMNAS_CONFIGURABLES_OC.some((c) => c.id === id);
}

function cargarConfigColumnasOC(): ConfigColumnasOC {
  const ordenCompleto = COLUMNAS_CONFIGURABLES_OC.map((c) => c.id);
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COLUMNAS_OC);
    if (!raw) return { visibles: COLUMNAS_VISIBLES_DEFAULT_OC, orden: ordenCompleto };
    const parsed = JSON.parse(raw) as { visibles?: string[]; orden?: string[] };
    const visibles = Array.isArray(parsed.visibles)
      ? parsed.visibles.filter(esColumnaValida)
      : COLUMNAS_VISIBLES_DEFAULT_OC;
    const ordenGuardado = Array.isArray(parsed.orden) ? parsed.orden.filter(esColumnaValida) : [];
    const orden = [...ordenGuardado, ...ordenCompleto.filter((id) => !ordenGuardado.includes(id))];
    return { visibles, orden };
  } catch {
    return { visibles: COLUMNAS_VISIBLES_DEFAULT_OC, orden: ordenCompleto };
  }
}

function guardarConfigColumnasOC(config: ConfigColumnasOC): void {
  try {
    localStorage.setItem(STORAGE_KEY_COLUMNAS_OC, JSON.stringify(config));
  } catch {
    // ignorar cuota de almacenamiento
  }
}

/** Fecha real en que la OC quedó registrada (distinta de fechaEmision, que es declarada). Sin registrar aún → null. */
function obtenerFechaRegistroOC(oc: OrdenCompra): string | null {
  if (oc.estadoDocumento === 'borrador') return null;
  const evento = oc.historial.find((e) => e.accion === 'Orden de compra registrada');
  return evento?.fecha ?? oc.fechaCreacion;
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

function BotonAccionDirecta({
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
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={label}
      aria-label={label}
      className={`p-1.5 rounded-lg transition-colors ${
        danger ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
      }`}
    >
      <Icon size={15} />
    </button>
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
  comprobantes,
  onVer,
  onEditar,
  onEliminarBorrador,
  onRegistrarBorrador,
  onAprobarRechazar,
  onAnular,
  onGenerarCC,
  onImprimir,
  onEnviar,
  onNueva,
}: TablaOrdenesCompraProps) {
  const { state: config } = useConfigurationContext();
  const [filtros, setFiltros] = useState<FiltrosOC>({ busqueda: '' });
  const [menu, setMenu] = useState<PosMenu | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const filtradas = filtrarOrdenesCompra(ordenes, filtros);

  const [colConfig, setColConfig] = useState<ConfigColumnasOC>(() => cargarConfigColumnasOC());
  useEffect(() => {
    guardarConfigColumnasOC(colConfig);
  }, [colConfig]);

  function alternarColumna(id: string) {
    if (!esColumnaValida(id)) return;
    setColConfig((prev) => ({
      ...prev,
      visibles: prev.visibles.includes(id)
        ? prev.visibles.filter((v) => v !== id)
        : [...prev.visibles, id],
    }));
  }
  function restablecerColumnas() {
    setColConfig({
      visibles: COLUMNAS_VISIBLES_DEFAULT_OC,
      orden: COLUMNAS_CONFIGURABLES_OC.map((c) => c.id),
    });
  }
  function seleccionarTodasColumnas() {
    setColConfig((prev) => ({ ...prev, visibles: COLUMNAS_CONFIGURABLES_OC.map((c) => c.id) }));
  }
  function reordenarColumnas(sourceId: string, targetId: string) {
    if (!esColumnaValida(sourceId) || !esColumnaValida(targetId)) return;
    setColConfig((prev) => {
      const orden = [...prev.orden];
      const from = orden.indexOf(sourceId);
      const to = orden.indexOf(targetId);
      if (from === -1 || to === -1) return prev;
      orden.splice(from, 1);
      orden.splice(to, 0, sourceId);
      return { ...prev, orden };
    });
  }

  const columnasVisiblesOrdenadas = colConfig.orden.filter((id) => colConfig.visibles.includes(id));

  const columnasManager: ColumnsManagerColumn[] = [
    { id: 'numero', label: 'Número', visible: true, fixed: true },
    { id: 'proveedor', label: 'Proveedor', visible: true, fixed: true },
    ...colConfig.orden.map((id) => ({
      id,
      label: COLUMNAS_CONFIGURABLES_OC.find((c) => c.id === id)?.label ?? id,
      visible: colConfig.visibles.includes(id),
    })),
    { id: 'total', label: 'Total', visible: true, fixed: true },
    { id: 'estado', label: 'Estado', visible: true, fixed: true },
    { id: 'acciones', label: 'Acciones', visible: true, fixed: true },
  ];

  function renderCeldaColumna(oc: OrdenCompra, id: ColumnaConfigurableOC): React.ReactNode {
    switch (id) {
      case 'fechaEmision':
        return formatearFechaCompra(oc.fechaEmision);
      case 'fechaRegistro': {
        const fecha = obtenerFechaRegistroOC(oc);
        return fecha ? formatearFechaCompra(fecha) : '—';
      }
      case 'fechaVencimiento':
        return oc.fechaVencimiento ? formatearFechaCompra(oc.fechaVencimiento) : '—';
      case 'comprador':
        return oc.compradorNombre ?? '—';
      case 'documentoRelacionado': {
        const relacionados = comprobantes.filter((c) => c.ordenCompraOrigenId === oc.id);
        if (relacionados.length === 0) return '—';
        if (relacionados.length === 1) {
          return `CC ${relacionados[0].serieProveedor}-${relacionados[0].numeroProveedor}`;
        }
        return (
          <span title={relacionados.map((c) => `${c.serieProveedor}-${c.numeroProveedor}`).join(', ')}>
            {relacionados.length} comprobantes
          </span>
        );
      }
      case 'moneda':
        return oc.moneda;
      case 'formaPago':
        return resolverNombreFormaPagoOC(oc, config.paymentMethods);
      case 'centroCosto':
        return oc.centroCosto ?? '—';
      case 'presupuesto':
        return oc.presupuesto ?? '—';
      case 'metodoEnvio':
        return oc.metodoEnvio ?? '—';
      case 'contacto':
        return oc.proveedorContactoNombre ?? '—';
      default:
        return '—';
    }
  }

  function renderAccionesDirectas(oc: OrdenCompra, estado: EstadoPrincipalOC) {
    if (estado === 'Borrador') {
      return (
        <>
          <BotonAccionDirecta icon={Pencil} label="Editar" onClick={() => onEditar(oc)} />
          {puedeEliminarBorradorOC(oc) && (
            <BotonAccionDirecta icon={Trash2} label="Eliminar borrador" onClick={() => onEliminarBorrador(oc)} danger />
          )}
        </>
      );
    }
    if (estado === 'Registrada') {
      return (
        <>
          {puedeEditarOC(oc) && <BotonAccionDirecta icon={Pencil} label="Editar" onClick={() => onEditar(oc)} />}
          {puedeGenerarCCDesdeOC(oc) && (
            <BotonAccionDirecta icon={FileText} label="Generar comprobante" onClick={() => onGenerarCC(oc)} />
          )}
        </>
      );
    }
    if (estado === 'Pendiente de aprobación') {
      return <BotonAccionDirecta icon={CheckCircle} label="Aprobar / No aprobar" onClick={() => onAprobarRechazar(oc)} />;
    }
    if (estado === 'Aprobada') {
      return (
        <>
          {puedeGenerarCCDesdeOC(oc) && (
            <BotonAccionDirecta icon={FileText} label="Generar comprobante" onClick={() => onGenerarCC(oc)} />
          )}
          {puedeAnularOC(oc) && <BotonAccionDirecta icon={XCircle} label="Anular" onClick={() => onAnular(oc)} danger />}
        </>
      );
    }
    if (estado === 'No Aprobada') {
      return (
        <>
          <BotonAccionDirecta icon={Pencil} label="Editar" onClick={() => onEditar(oc)} />
          {puedeAnularOC(oc) && <BotonAccionDirecta icon={XCircle} label="Anular" onClick={() => onAnular(oc)} danger />}
        </>
      );
    }
    if (estado === 'Convertida') {
      return <BotonAccionDirecta icon={Link2} label="Abrir documento relacionado" onClick={() => onVer(oc)} />;
    }
    return null;
  }

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
  const estadoPrincipalActivo = ocActiva ? calcularEstadoPrincipalOC(ocActiva) : null;

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
          value={filtros.estadoPrincipal ?? ''}
          onChange={(e) =>
            setFiltros((f) => ({
              ...f,
              estadoPrincipal: e.target.value as EstadoPrincipalOC | '',
            }))
          }
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">Todos los estados</option>
          {ESTADOS_PRINCIPALES_OC.map((estado) => (
            <option key={estado} value={estado}>{estado}</option>
          ))}
        </select>
        <ColumnsManager
          columns={columnasManager}
          onToggleColumn={alternarColumna}
          onResetColumns={restablecerColumnas}
          onSelectAllColumns={seleccionarTodasColumnas}
          onReorderColumns={reordenarColumnas}
          buttonLabel="Columnas"
        />
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
                {columnasVisiblesOrdenadas.map((id) => {
                  const columna = COLUMNAS_CONFIGURABLES_OC.find((c) => c.id === id);
                  return (
                    <th
                      key={id}
                      className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap"
                      title={columna?.label}
                    >
                      {columna?.labelCorto ?? columna?.label}
                    </th>
                  );
                })}
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtradas.map((oc) => {
                const estadoPrincipal = calcularEstadoPrincipalOC(oc);
                return (
                  <tr
                    key={oc.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => onVer(oc)}
                  >
                    <td className="px-4 py-3 font-mono font-medium text-gray-900">
                      {formatearNumeroCompra(oc.serie, oc.correlativo || undefined)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 truncate max-w-[180px]">
                        {oc.proveedorNombre}
                      </div>
                      <div className="text-xs text-gray-500">{oc.proveedorNumeroDocumento}</div>
                    </td>
                    {columnasVisiblesOrdenadas.map((id) => (
                      <td key={id} className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {renderCeldaColumna(oc, id)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right font-mono">
                      {formatMoney(oc.totales.total, oc.moneda)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge estado={estadoPrincipal} labels={{}} clases={BADGE_ESTADO_PRINCIPAL_OC} />
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5">
                        {renderAccionesDirectas(oc, estadoPrincipal)}
                        <button
                          onClick={(e) => abrirMenu(e, oc.id)}
                          aria-label="Más acciones"
                          title="Más acciones"
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
          {estadoPrincipalActivo === 'Borrador' && (
            <MenuItem
              icon={CheckCircle}
              label="Registrar"
              onClick={() => { onRegistrarBorrador(ocActiva); setMenu(null); }}
            />
          )}
          {(estadoPrincipalActivo === 'Registrada' || estadoPrincipalActivo === 'Pendiente de aprobación') &&
            puedeAnularOC(ocActiva) && (
            <MenuItem
              icon={XCircle}
              label="Anular OC"
              onClick={() => { onAnular(ocActiva); setMenu(null); }}
              danger
            />
          )}
          {estadoPrincipalActivo !== 'Borrador' && (
            <>
              <div className="my-1 border-t border-gray-100" />
              <MenuItem
                icon={Printer}
                label="Imprimir"
                onClick={() => { onImprimir(ocActiva); setMenu(null); }}
              />
              <MenuItem
                icon={Download}
                label="Descargar PDF"
                onClick={() => { onImprimir(ocActiva); setMenu(null); }}
              />
              {(estadoPrincipalActivo === 'Aprobada' || estadoPrincipalActivo === 'Convertida') && (
                <MenuItem
                  icon={Send}
                  label="Compartir"
                  onClick={() => { onEnviar(ocActiva); setMenu(null); }}
                />
              )}
            </>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Mostrando {filtradas.length} de {ordenes.length} órdenes
      </p>
    </div>
  );
}
