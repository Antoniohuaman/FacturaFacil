import { useState, useCallback, useRef } from 'react';
import { Search, Loader2, X, User, Hash, Calendar, ChevronDown } from 'lucide-react';
import { ConfigurationCard } from '../../../comprobantes-electronicos/shared/form-core/components/ConfigurationCard';
import { useClientes } from '../../../gestion-clientes/hooks/useClientes';
import { servicioConsultaDocumentos } from '@/shared/documentos/servicioConsultaDocumentos';
import type { Cliente, DocumentType } from '../../../gestion-clientes/models/cliente.types';
import { MOTIVOS_TRASLADO } from '../../../configuracion-sistema/datos/catalogosGRE';
import type {
  TipoGRE,
  CodigoMotivoTraslado,
  CodigoModalidadTransporte,
  DocumentoRelacionadoGRE,
} from '../../modelos/GuiaRemision';
import SeccionDocumentosRelacionados from './SeccionDocumentosRelacionados';

export type { TipoGRE, CodigoMotivoTraslado, CodigoModalidadTransporte };

interface DatosDestinatario {
  clienteId?: string | number;
  nombre: string;
  tipoDocumento: string;
  numeroDocumento: string;
  direccion?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  ubigeo?: string;
}

interface SeccionDatosGeneralesProps {
  tipo: TipoGRE;
  serie: string;
  seriesDisponibles: string[];
  onSerieChange: (serie: string) => void;
  fechaEmision: string;
  onFechaEmisionChange: (fecha: string) => void;
  motivoTraslado: string;
  onMotivoTrasladoChange: (codigo: string) => void;
  destinatario: DatosDestinatario | null;
  onDestinatarioChange: (datos: DatosDestinatario | null) => void;
  errorDestinatario?: string | null;
  documentosRelacionados: DocumentoRelacionadoGRE[];
  onDocumentosRelacionadosChange: (docs: DocumentoRelacionadoGRE[]) => void;
}

function etiquetaDestinatario(tipo: TipoGRE, motivo: string): string {
  if (motivo === '02') return 'Proveedor';
  if (tipo === 'transportista') return 'Destinatario';
  return 'Destinatario';
}

const INPUT_CLS =
  'w-full h-9 px-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none';

const LABEL_CLS = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

export default function SeccionDatosGenerales({
  tipo,
  serie,
  seriesDisponibles,
  onSerieChange,
  fechaEmision,
  onFechaEmisionChange,
  motivoTraslado,
  onMotivoTrasladoChange,
  destinatario,
  onDestinatarioChange,
  errorDestinatario,
  documentosRelacionados,
  onDocumentosRelacionadosChange,
}: SeccionDatosGeneralesProps) {
  const { clientes, createCliente } = useClientes();
  const [busqueda, setBusqueda] = useState('');
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [consultando, setConsultando] = useState(false);
  const busquedaRef = useRef<HTMLInputElement>(null);

  const motivosFiltrados = MOTIVOS_TRASLADO.filter(
    (m) =>
      m.estado === 'Vigente' &&
      (tipo === 'remitente' ? m.aplicacion !== 'Transportista' : m.aplicacion !== 'Remitente'),
  );

  const etiqueta = etiquetaDestinatario(tipo, motivoTraslado);

  const clientesFiltrados = clientes
    .filter((c) => {
      const q = busqueda.toLowerCase();
      return (
        (c.name ?? '').toLowerCase().includes(q) ||
        (c.numeroDocumento ?? '').includes(q) ||
        (c.document ?? '').includes(q)
      );
    })
    .slice(0, 8);

  const construirDatosDesde = useCallback((c: Cliente): DatosDestinatario => {
    const num = (c.numeroDocumento ?? c.document?.replace(/\D/g, '') ?? '').trim();
    const tipoDoc = num.length === 11 ? 'RUC' : num.length === 8 ? 'DNI' : 'OTRO';
    return {
      clienteId: c.id,
      nombre: c.razonSocial ?? c.name ?? '',
      tipoDocumento: tipoDoc,
      numeroDocumento: num,
      direccion: c.direccion ?? c.address ?? '',
      departamento: c.departamento,
      provincia: c.provincia,
      distrito: c.distrito,
      ubigeo: c.ubigeo,
    };
  }, []);

  const seleccionarCliente = useCallback(
    (c: Cliente) => {
      onDestinatarioChange(construirDatosDesde(c));
      setBusqueda('');
      setMostrarResultados(false);
    },
    [construirDatosDesde, onDestinatarioChange],
  );

  const consultarDocumento = useCallback(async () => {
    const doc = busqueda.trim().replace(/\D/g, '');
    if (doc.length !== 11 && doc.length !== 8) return;
    setConsultando(true);
    try {
      let datos: DatosDestinatario | null = null;
      if (doc.length === 11) {
        const r = await servicioConsultaDocumentos.consultarRuc(doc);
        if (r?.data?.razonSocial) {
          datos = {
            nombre: r.data.razonSocial,
            tipoDocumento: 'RUC',
            numeroDocumento: doc,
            direccion: r.data.direccion ?? '',
            departamento: r.data.departamento,
            provincia: r.data.provincia,
            distrito: r.data.distrito,
            ubigeo: r.data.ubigeo,
          };
        }
      } else {
        const r = await servicioConsultaDocumentos.consultarDni(doc);
        if (r?.data?.nombres) {
          datos = {
            nombre: `${r.data.nombres} ${r.data.apellidoPaterno} ${r.data.apellidoMaterno}`.trim(),
            tipoDocumento: 'DNI',
            numeroDocumento: doc,
          };
        }
      }
      if (datos) {
        const existente = clientes.find(
          (c) => (c.numeroDocumento ?? c.document ?? '').replace(/\D/g, '') === doc,
        );
        if (!existente && createCliente) {
          const tipoCuenta = motivoTraslado === '02' ? 'Proveedor' : 'Cliente';
          const nuevo = await createCliente({
            documentType: datos.tipoDocumento as DocumentType,
            documentNumber: datos.numeroDocumento,
            name: datos.nombre,
            type: tipoCuenta as 'Cliente' | 'Proveedor',
            address: datos.direccion ?? '',
          });
          if (nuevo) datos.clienteId = nuevo.id;
        } else if (existente) {
          datos.clienteId = existente.id;
        }
        onDestinatarioChange(datos);
        setBusqueda('');
        setMostrarResultados(false);
      }
    } catch {
      // silently fail
    } finally {
      setConsultando(false);
    }
  }, [busqueda, clientes, createCliente, motivoTraslado, onDestinatarioChange]);

  const soloDigitos = busqueda.replace(/\D/g, '');
  const puedeConsultar = soloDigitos.length === 11 || soloDigitos.length === 8;
  const etiquetaConsulta = soloDigitos.length === 11 ? 'SUNAT' : soloDigitos.length === 8 ? 'RENIEC' : 'SUNAT';

  return (
    <ConfigurationCard title="Datos de la guía" icon={Hash}>
      {/* Grid de dos columnas — patrón Datos del comprobante */}
      <div className="grid grid-cols-12 gap-4">

        {/* ── Columna izquierda: Destinatario + Documentos relacionados ── */}
        <div className="col-span-12 xl:col-span-7 space-y-3">

          {/* Destinatario */}
          <div>
            <label className={LABEL_CLS}>
              <User className="inline h-3 w-3 mr-1" />
              {etiqueta}
            </label>

            {destinatario ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {destinatario.tipoDocumento} {destinatario.numeroDocumento} · {destinatario.nombre}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDestinatarioChange(null)}
                  className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                {/* Pill: input + botón SUNAT / RENIEC */}
                <div className={`flex h-9 w-full rounded-lg border overflow-hidden transition-colors ${
                  errorDestinatario
                    ? 'border-red-400 dark:border-red-500'
                    : 'border-gray-200 dark:border-gray-600 focus-within:border-violet-500 dark:focus-within:border-violet-500'
                }`}>
                  <div className="relative flex-1 bg-white dark:bg-gray-800">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      ref={busquedaRef}
                      type="text"
                      value={busqueda}
                      onChange={(e) => {
                        setBusqueda(e.target.value);
                        setMostrarResultados(e.target.value.length > 0);
                      }}
                      onFocus={() => setMostrarResultados(busqueda.length > 0)}
                      onBlur={() => setTimeout(() => setMostrarResultados(false), 200)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && puedeConsultar) void consultarDocumento();
                      }}
                      placeholder="Buscar por RUC, DNI o nombre"
                      className="h-full w-full pl-9 pr-2 text-sm bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void consultarDocumento()}
                    disabled={!puedeConsultar || consultando}
                    className={`h-full px-3 text-[11px] font-semibold shrink-0 flex items-center gap-1.5 border-l transition-colors disabled:opacity-40 disabled:cursor-default ${
                      puedeConsultar
                        ? 'border-gray-200 dark:border-gray-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                        : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-400'
                    }`}
                  >
                    {consultando
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Search className="h-3.5 w-3.5" />
                    }
                    <span>{etiquetaConsulta}</span>
                  </button>
                </div>

                {mostrarResultados && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {clientesFiltrados.length > 0 ? (
                      clientesFiltrados.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={() => seleccionarCliente(c)}
                          className="w-full flex flex-col text-left px-3 py-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 border-b border-gray-100 dark:border-gray-700 last:border-0"
                        >
                          <span className="text-sm text-gray-900 dark:text-white font-medium truncate">
                            {c.razonSocial ?? c.name}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {c.document}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                        Sin coincidencias
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {errorDestinatario && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errorDestinatario}</p>
            )}
          </div>

          {/* Documentos relacionados — subbloque dentro de columna izquierda */}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
            <SeccionDocumentosRelacionados
              documentos={documentosRelacionados}
              onChange={onDocumentosRelacionadosChange}
            />
          </div>
        </div>

        {/* ── Columna derecha: Serie · Fecha · Motivo ── */}
        <div className="col-span-12 xl:col-span-5 xl:border-l xl:border-slate-200/60 dark:xl:border-slate-700/60 xl:pl-4 space-y-3">

          {/* Fila: Serie + Fecha emisión */}
          <div className="grid grid-cols-2 gap-2">
            {/* Serie — selector obligatorio, nunca input libre */}
            <div>
              <label className={LABEL_CLS}>Serie</label>
              <div className="relative">
                {seriesDisponibles.length > 0 ? (
                  <>
                    <select
                      value={serie}
                      onChange={(e) => onSerieChange(e.target.value)}
                      className={`${INPUT_CLS} appearance-none pr-7`}
                    >
                      <option value="">— —</option>
                      {seriesDisponibles.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  </>
                ) : (
                  <div className="w-full h-9 px-2 flex items-center border border-amber-300 dark:border-amber-600 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-[11px] font-medium text-amber-700 dark:text-amber-400 leading-tight">
                    Sin series
                  </div>
                )}
              </div>
            </div>

            {/* Fecha de emisión */}
            <div>
              <label className={LABEL_CLS}>
                <Calendar className="inline h-3 w-3 mr-1" />
                Fecha de emisión
              </label>
              <input
                type="date"
                value={fechaEmision}
                onChange={(e) => onFechaEmisionChange(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
          </div>

          {/* Motivo de traslado — ancho completo de la columna derecha */}
          <div>
            <label className={LABEL_CLS}>Motivo de traslado</label>
            <select
              value={motivoTraslado}
              onChange={(e) => onMotivoTrasladoChange(e.target.value)}
              className={INPUT_CLS}
            >
              {motivosFiltrados.map((m) => (
                <option key={m.codigo} value={m.codigo}>
                  {m.codigo} – {m.descripcion}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </ConfigurationCard>
  );
}
