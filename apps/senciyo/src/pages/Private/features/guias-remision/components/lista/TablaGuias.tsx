import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Edit3,
  Ban,
  Printer,
  Copy,
  Trash2,
} from 'lucide-react';
import type { GuiaRemision } from '../../modelos/GuiaRemision';
import { TIPO_GRE_LABELS } from '../../modelos/GuiaRemision';
import { MOTIVOS_TRASLADO, MODALIDADES_TRANSPORTE } from '../../../configuracion-sistema/datos/catalogosGRE';
import type { ColumnaGREConfig } from '../../logica/columnasGRE';
import {
  getEstadoGRELabel,
  getEstadoGREBadgeClass,
  puedeAnularGRE,
  puedeEditarGRE,
  puedeEliminarBorradorGRE,
} from '../../logica/estadosGRE';

const REGISTROS_POR_PAGINA = 15;

interface Props {
  guias: GuiaRemision[];        // pre-filtered by parent
  columnas: ColumnaGREConfig[]; // column config (visibility + order)
  onVerDetalle: (guia: GuiaRemision) => void;
  onAnular: (guia: GuiaRemision) => void;
  onEliminarBorrador: (guia: GuiaRemision) => void;
  onDuplicar: (guia: GuiaRemision) => void;
  onImprimir: (guia: GuiaRemision) => void;
}

function descripcionMotivo(codigo: string): string {
  return MOTIVOS_TRASLADO.find((m) => m.codigo === codigo)?.descripcion ?? codigo;
}

function descripcionModalidad(codigo: string): string {
  return MODALIDADES_TRANSPORTE.find((m) => m.codigo === codigo)?.descripcion ?? codigo;
}

function celdaGuia(col: ColumnaGREConfig, guia: GuiaRemision): React.ReactNode {
  switch (col.id) {
    case 'numero':
      return (
        <span className="font-mono text-xs text-gray-800 dark:text-gray-200">
          {guia.serie && guia.correlativo
            ? `${guia.serie}-${guia.correlativo}`
            : guia.serie
              ? `${guia.serie}-[pendiente]`
              : '—'}
        </span>
      );
    case 'tipo':
      return <span className="text-xs text-gray-700 dark:text-gray-300">{TIPO_GRE_LABELS[guia.tipo]}</span>;
    case 'destinatario':
      return (
        <div>
          <p className="text-sm text-gray-900 dark:text-white font-medium truncate max-w-48" title={guia.destinatarioNombre}>
            {guia.destinatarioNombre || '—'}
          </p>
          {guia.destinatarioNumeroDocumento && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {guia.destinatarioTipoDocumento} {guia.destinatarioNumeroDocumento}
            </p>
          )}
        </div>
      );
    case 'motivo':
      return (
        <span className="text-xs text-gray-700 dark:text-gray-300 line-clamp-1">
          {descripcionMotivo(guia.motivoTraslado)}
        </span>
      );
    case 'fechaEmision':
      return <span className="text-xs text-gray-700 dark:text-gray-300">{guia.fechaEmision}</span>;
    case 'estado':
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${getEstadoGREBadgeClass(guia.estado)}`}
        >
          {getEstadoGRELabel(guia.estado)}
        </span>
      );
    case 'modalidad':
      return <span className="text-xs text-gray-700 dark:text-gray-300">{descripcionModalidad(guia.modalidadTransporte)}</span>;
    case 'fechaTraslado': {
      const fecha = guia.transportePrivado?.fechaInicioTraslado ?? guia.transportePublico?.fechaEntregaBienes ?? null;
      return <span className="text-xs text-gray-700 dark:text-gray-300">{fecha ?? '—'}</span>;
    }
    case 'rucDestinatario':
      return (
        <span className="text-xs font-mono text-gray-700 dark:text-gray-300">
          {guia.destinatarioNumeroDocumento || '—'}
        </span>
      );
    case 'pesoTotal':
      return (
        <span className="text-xs text-gray-700 dark:text-gray-300 tabular-nums">
          {guia.pesoTotal != null ? `${guia.pesoTotal} ${guia.unidadPeso}` : '—'}
        </span>
      );
    case 'cantidadBienes':
      return (
        <span className="text-xs text-gray-700 dark:text-gray-300 tabular-nums">
          {guia.bienes.length}
        </span>
      );
    case 'puntoPartida':
      return (
        <span className="text-xs text-gray-700 dark:text-gray-300 truncate block max-w-40" title={guia.puntoPartida.direccion}>
          {guia.puntoPartida.direccion || '—'}
        </span>
      );
    case 'puntoLlegada':
      return (
        <span className="text-xs text-gray-700 dark:text-gray-300 truncate block max-w-40" title={guia.puntoLlegada.direccion}>
          {guia.puntoLlegada.direccion || '—'}
        </span>
      );
    case 'transportista': {
      const nombre = guia.transportePublico?.transportistaNombre ?? '—';
      return <span className="text-xs text-gray-700 dark:text-gray-300 truncate block max-w-36" title={nombre}>{nombre}</span>;
    }
    default:
      return null;
  }
}

export default function TablaGuias({ guias, columnas, onVerDetalle, onAnular, onEliminarBorrador, onDuplicar, onImprimir }: Props) {
  const navigate = useNavigate();
  const [pagina, setPagina] = useState(1);
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);

  const totalPaginas = Math.max(1, Math.ceil(guias.length / REGISTROS_POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const guiasPagina = guias.slice(
    (paginaActual - 1) * REGISTROS_POR_PAGINA,
    paginaActual * REGISTROS_POR_PAGINA,
  );

  const columnasVisibles = columnas.filter((c) => c.visible && c.id !== 'acciones');

  const alineacion = (col: ColumnaGREConfig) => {
    if (col.alineacion === 'derecha') return 'text-right';
    if (col.alineacion === 'centro') return 'text-center';
    return 'text-left';
  };

  return (
    <div className="space-y-3">
      {/* Backdrop para cerrar menú contextual */}
      {menuAbierto && (
        <div className="fixed inset-0 z-30" onClick={() => setMenuAbierto(null)} />
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              {columnasVisibles.map((col) => (
                <th
                  key={col.id}
                  style={col.ancho ? { width: col.ancho, minWidth: col.ancho } : undefined}
                  className={`px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide ${alineacion(col)}`}
                >
                  {col.label}
                </th>
              ))}
              {/* Acciones siempre al final */}
              <th className="px-4 py-3 text-right w-28" />
            </tr>
          </thead>
          <tbody>
            {guiasPagina.length === 0 ? (
              <tr>
                <td
                  colSpan={columnasVisibles.length + 1}
                  className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  Sin resultados para los filtros aplicados
                </td>
              </tr>
            ) : (
              guiasPagina.map((guia) => (
                <tr
                  key={guia.id}
                  className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                  onClick={() => onVerDetalle(guia)}
                >
                  {/* Celdas de datos */}
                  {columnasVisibles.map((col) => (
                    <td
                      key={col.id}
                      className={`px-4 py-3 ${alineacion(col)}`}
                      style={col.ancho ? { maxWidth: col.ancho } : undefined}
                    >
                      {celdaGuia(col, guia)}
                    </td>
                  ))}

                  {/* Columna de acciones — detiene propagación de click */}
                  <td
                    className="px-4 py-3 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {/* Iconos visibles según estado */}
                      {!guia.esBorrador && (
                        <button
                          type="button"
                          title="Imprimir"
                          onClick={() => onImprimir(guia)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      )}
                      {!guia.esBorrador && puedeAnularGRE(guia) && (
                        <button
                          type="button"
                          title="Anular"
                          onClick={() => onAnular(guia)}
                          className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                      {guia.esBorrador && puedeEditarGRE(guia) && (
                        <button
                          type="button"
                          title="Editar"
                          onClick={() => navigate(`/guias-remision/editar/${guia.id}`)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      )}
                      {guia.esBorrador && puedeEliminarBorradorGRE(guia) && (
                        <button
                          type="button"
                          title="Eliminar borrador"
                          onClick={() => onEliminarBorrador(guia)}
                          className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}

                      {/* Menú de opciones adicionales */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setMenuAbierto(menuAbierto === guia.id ? null : guia.id)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {menuAbierto === guia.id && (
                          <div className="absolute right-0 top-full mt-1 z-40 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1">
                            <button
                              type="button"
                              onClick={() => {
                                setMenuAbierto(null);
                                onVerDetalle(guia);
                              }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              <Eye className="h-4 w-4" />
                              Ver detalle
                            </button>
                            {!guia.esBorrador && (
                              <button
                                type="button"
                                onClick={() => {
                                  setMenuAbierto(null);
                                  onDuplicar(guia);
                                }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                              >
                                <Copy className="h-4 w-4" />
                                Duplicar
                              </button>
                            )}
                            {guia.esBorrador && (
                              <button
                                type="button"
                                onClick={() => {
                                  setMenuAbierto(null);
                                  onVerDetalle(guia);
                                }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                              >
                                <Eye className="h-4 w-4" />
                                Ver detalle
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>
            {guias.length} registros · Página {paginaActual} de {totalPaginas}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={paginaActual === 1}
              onClick={() => setPagina((p) => p - 1)}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={paginaActual === totalPaginas}
              onClick={() => setPagina((p) => p + 1)}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
