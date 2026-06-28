import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Save, X, Send, FileText } from 'lucide-react';
import { useGuiasRemision } from '../contexto/ContextoGuiasRemision';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useTenant } from '@/shared/tenant/TenantContext';
import { guiasRemisionDataSource } from '../api/fuenteDatosGRE';
import { ConfigurationCard } from '../../comprobantes-electronicos/shared/form-core/components/ConfigurationCard';
import type {
  GuiaRemision,
  TipoGRE,
  BienGRE,
  DocumentoRelacionadoGRE,
  PuntoTraslado,
  TransportePrivado,
  TransportePublico,
  UnidadPeso,
} from '../modelos/GuiaRemision';
import { GUIA_REMISION_BORRADOR, TIPO_GRE_LABELS } from '../modelos/GuiaRemision';
import { MOTIVOS_TRASLADO } from '../../configuracion-sistema/datos/catalogosGRE';
import SeccionDatosGenerales from '../components/forma/SeccionDatosGenerales';
import SeccionDocumentosRelacionados from '../components/forma/SeccionDocumentosRelacionados';
import SeccionBienes from '../components/forma/SeccionBienes';
import SeccionPuntosTraslado from '../components/forma/SeccionPuntosTraslado';
import SeccionTransporte from '../components/forma/SeccionTransporte';

const TIPOS_VALIDOS: TipoGRE[] = ['remitente', 'transportista'];

function esTipoValido(valor?: string): valor is TipoGRE {
  return TIPOS_VALIDOS.includes(valor as TipoGRE);
}

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

// ─── Vista previa en formato documento ─────────────────────

function VistaPrevia({ guia, onCerrar }: { guia: GuiaRemision; onCerrar: () => void }) {
  const motivo = MOTIVOS_TRASLADO.find((m) => m.codigo === guia.motivoTraslado);
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-violet-200 dark:border-violet-700 shadow-sm overflow-hidden">
      {/* Encabezado del documento */}
      <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-violet-50/50 dark:bg-violet-900/10">
        <div>
          <p className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-0.5">
            {TIPO_GRE_LABELS[guia.tipo]}
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
            {guia.serie ? `${guia.serie}-${guia.correlativo ?? '--------'}` : '— sin serie —'}
          </p>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <EyeOff className="h-4 w-4" />
        </button>
      </div>

      <div className="px-6 py-4 space-y-4 text-sm">
        {/* Metadatos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Fecha de emisión</p>
            <p className="font-medium text-gray-900 dark:text-white">{guia.fechaEmision || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Motivo de traslado</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {guia.motivoTraslado} – {motivo?.descripcion ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Modalidad</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {guia.modalidadTransporte === '02' ? 'Transporte privado' : 'Transporte público'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Estado</p>
            <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {guia.estado}
            </span>
          </div>
        </div>

        {/* Destinatario */}
        {guia.destinatarioNombre && (
          <div className="border border-gray-100 dark:border-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Destinatario</p>
            <p className="font-semibold text-gray-900 dark:text-white">{guia.destinatarioNombre}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {guia.destinatarioTipoDocumento} {guia.destinatarioNumeroDocumento}
              {guia.destinatarioDireccion && ` · ${guia.destinatarioDireccion}`}
            </p>
          </div>
        )}

        {/* Puntos de traslado */}
        {(guia.puntoPartida.direccion || guia.puntoLlegada.direccion) && (
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-gray-100 dark:border-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Punto de partida</p>
              <p className="text-sm text-gray-900 dark:text-white">
                {guia.puntoPartida.direccion || '—'}
              </p>
              {guia.puntoPartida.distrito && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {guia.puntoPartida.distrito}
                  {guia.puntoPartida.provincia ? `, ${guia.puntoPartida.provincia}` : ''}
                </p>
              )}
            </div>
            <div className="border border-gray-100 dark:border-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Punto de llegada</p>
              <p className="text-sm text-gray-900 dark:text-white">
                {guia.puntoLlegada.direccion || '—'}
              </p>
              {guia.puntoLlegada.distrito && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {guia.puntoLlegada.distrito}
                  {guia.puntoLlegada.provincia ? `, ${guia.puntoLlegada.provincia}` : ''}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Bienes */}
        {guia.bienes.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Bienes a transportar
            </p>
            <div className="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="text-left px-3 py-2 text-gray-600 dark:text-gray-400 font-medium">
                      Descripción
                    </th>
                    <th className="text-right px-3 py-2 text-gray-600 dark:text-gray-400 font-medium w-20">
                      Unidad
                    </th>
                    <th className="text-right px-3 py-2 text-gray-600 dark:text-gray-400 font-medium w-20">
                      Cantidad
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {guia.bienes.map((b) => (
                    <tr
                      key={b.id}
                      className="border-t border-gray-100 dark:border-gray-700"
                    >
                      <td className="px-3 py-2 text-gray-900 dark:text-white">{b.descripcion}</td>
                      <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-300 tabular-nums">
                        {b.unidad}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900 dark:text-white tabular-nums">
                        {b.cantidad}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {guia.pesoTotal !== undefined && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                Peso bruto total:{' '}
                <span className="font-medium text-gray-700 dark:text-gray-300 tabular-nums">
                  {guia.pesoTotal} {guia.unidadPeso}
                </span>
              </p>
            )}
          </div>
        )}

        {/* Observaciones */}
        {guia.observaciones && (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Observaciones</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{guia.observaciones}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Formulario principal ───────────────────────────────────

export default function FormularioGREPage() {
  const { tipoParam, id } = useParams<{ tipoParam?: string; id?: string }>();
  const navigate = useNavigate();
  const { tenantId, activeEstablecimientoId } = useTenant();
  const { state: configState } = useConfigurationContext();
  const { agregarGuia, actualizarGuia } = useGuiasRemision();

  const tipo: TipoGRE = esTipoValido(tipoParam) ? tipoParam : 'remitente';
  const modoEdicion = Boolean(id);

  const [guia, setGuia] = useState<GuiaRemision>(() => GUIA_REMISION_BORRADOR(tipo));
  const [cargando, setCargando] = useState(modoEdicion);
  const [guardando, setGuardando] = useState(false);
  const [errorDestinatario, setErrorDestinatario] = useState<string | null>(null);
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);

  useEffect(() => {
    if (!modoEdicion || !id || !tenantId) return;
    setCargando(true);
    guiasRemisionDataSource
      .getById(tenantId, id)
      .then((g) => {
        if (g) setGuia(g);
      })
      .finally(() => setCargando(false));
  }, [modoEdicion, id, tenantId]);

  const codigoDocumento = tipo === 'remitente' ? '09' : '31';

  const seriesDisponibles = configState.series
    .filter(
      (s) =>
        s.isActive &&
        s.status === 'ACTIVE' &&
        s.documentType.code === codigoDocumento &&
        (activeEstablecimientoId ? s.EstablecimientoId === activeEstablecimientoId : true),
    )
    .map((s) => s.series);

  useEffect(() => {
    if (guia.serie || seriesDisponibles.length === 0) return;
    const porDefecto = configState.series.find(
      (s) =>
        s.isDefault &&
        s.documentType.code === codigoDocumento &&
        s.isActive &&
        s.status === 'ACTIVE',
    );
    if (porDefecto) {
      setGuia((prev) => ({ ...prev, serie: porDefecto.series }));
    } else if (seriesDisponibles[0]) {
      setGuia((prev) => ({ ...prev, serie: seriesDisponibles[0] }));
    }
  }, [seriesDisponibles.join(','), guia.serie]); // eslint-disable-line react-hooks/exhaustive-deps

  const setDestinatario = useCallback((datos: DatosDestinatario | null) => {
    setErrorDestinatario(null);
    setGuia((prev) => ({
      ...prev,
      destinatarioClienteId: datos?.clienteId,
      destinatarioNombre: datos?.nombre ?? '',
      destinatarioTipoDocumento: datos?.tipoDocumento ?? 'RUC',
      destinatarioNumeroDocumento: datos?.numeroDocumento ?? '',
      destinatarioDireccion: datos?.direccion,
      destinatarioDepartamento: datos?.departamento,
      destinatarioProvincia: datos?.provincia,
      destinatarioDistrito: datos?.distrito,
      destinatarioUbigeo: datos?.ubigeo,
    }));
  }, []);

  const destinatarioActual: DatosDestinatario | null = guia.destinatarioNombre
    ? {
        clienteId: guia.destinatarioClienteId,
        nombre: guia.destinatarioNombre,
        tipoDocumento: guia.destinatarioTipoDocumento,
        numeroDocumento: guia.destinatarioNumeroDocumento,
        direccion: guia.destinatarioDireccion,
        departamento: guia.destinatarioDepartamento,
        provincia: guia.destinatarioProvincia,
        distrito: guia.destinatarioDistrito,
        ubigeo: guia.destinatarioUbigeo,
      }
    : null;

  const guardarBorrador = useCallback(async () => {
    if (!guia.serie) return;
    setGuardando(true);
    try {
      const borrador: GuiaRemision = { ...guia, esBorrador: true, estado: 'Borrador' };
      if (modoEdicion) {
        await actualizarGuia(borrador);
      } else {
        await agregarGuia(borrador);
      }
      navigate('/guias-remision');
    } finally {
      setGuardando(false);
    }
  }, [guia, modoEdicion, actualizarGuia, agregarGuia, navigate]);

  const emitir = useCallback(async () => {
    if (!guia.destinatarioNombre) {
      setErrorDestinatario('El destinatario es obligatorio');
      return;
    }
    setGuardando(true);
    try {
      const emitida: GuiaRemision = {
        ...guia,
        esBorrador: false,
        estado: 'Pendiente',
        correlativo: String(Date.now()).slice(-8),
      };
      if (modoEdicion) {
        await actualizarGuia(emitida);
      } else {
        await agregarGuia(emitida);
      }
      navigate('/guias-remision');
    } finally {
      setGuardando(false);
    }
  }, [guia, modoEdicion, actualizarGuia, agregarGuia, navigate]);

  if (cargando) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-gray-900 items-center justify-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">Cargando guía…</p>
      </div>
    );
  }

  const totalDocBienes =
    guia.documentosRelacionados.length + guia.bienes.length || undefined;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-gray-900">
      {/* Cabecera — sticky para que siempre sea visible al desplazarse */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/guias-remision')}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            Guías de Remisión
          </button>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
            {modoEdicion ? 'Editar' : 'Nueva'} {TIPO_GRE_LABELS[tipo]}
          </h1>
        </div>
      </div>

      {/* Contenido del formulario */}
      <div className="flex-1 px-6 py-5 space-y-4">
        {/* Vista previa inline — dentro del área de contenido, sin invadir el sidebar */}
        {mostrarVistaPrevia && (
          <VistaPrevia guia={guia} onCerrar={() => setMostrarVistaPrevia(false)} />
        )}

        {/* 1. Datos de la guía */}
        <SeccionDatosGenerales
          tipo={tipo}
          serie={guia.serie}
          seriesDisponibles={seriesDisponibles}
          onSerieChange={(s) => setGuia((prev) => ({ ...prev, serie: s }))}
          fechaEmision={guia.fechaEmision}
          onFechaEmisionChange={(f) => setGuia((prev) => ({ ...prev, fechaEmision: f }))}
          motivoTraslado={guia.motivoTraslado}
          onMotivoTrasladoChange={(m) =>
            setGuia((prev) => ({ ...prev, motivoTraslado: m as GuiaRemision['motivoTraslado'] }))
          }
          destinatario={destinatarioActual}
          onDestinatarioChange={setDestinatario}
          errorDestinatario={errorDestinatario}
        />

        {/* 2 + 3. Documentos y bienes — tarjeta unificada */}
        <ConfigurationCard
          title="Documentos y bienes a transportar"
          icon={FileText}
          badge={totalDocBienes}
        >
          <div className="space-y-5">
            <SeccionDocumentosRelacionados
              documentos={guia.documentosRelacionados}
              onChange={(docs: DocumentoRelacionadoGRE[]) =>
                setGuia((prev) => ({ ...prev, documentosRelacionados: docs }))
              }
            />
            <div className="border-t border-gray-100 dark:border-gray-700" />
            <SeccionBienes
              bienes={guia.bienes}
              onChange={(bienes: BienGRE[]) => setGuia((prev) => ({ ...prev, bienes }))}
              pesoTotal={guia.pesoTotal}
              unidadPeso={guia.unidadPeso}
              onPesoTotalChange={(peso) => setGuia((prev) => ({ ...prev, pesoTotal: peso }))}
              onUnidadPesoChange={(unidad: UnidadPeso) =>
                setGuia((prev) => ({ ...prev, unidadPeso: unidad }))
              }
            />
          </div>
        </ConfigurationCard>

        {/* 4. Puntos de traslado */}
        <SeccionPuntosTraslado
          puntoPartida={guia.puntoPartida}
          onPuntoPartidaChange={(p: PuntoTraslado) =>
            setGuia((prev) => ({ ...prev, puntoPartida: p }))
          }
          puntoLlegada={guia.puntoLlegada}
          onPuntoLlegadaChange={(p: PuntoTraslado) =>
            setGuia((prev) => ({ ...prev, puntoLlegada: p }))
          }
          motivoTraslado={guia.motivoTraslado}
          destinatario={destinatarioActual}
        />

        {/* 5. Datos de transporte */}
        <SeccionTransporte
          modalidadTransporte={guia.modalidadTransporte}
          onModalidadChange={(m) =>
            setGuia((prev) => ({
              ...prev,
              modalidadTransporte: m as GuiaRemision['modalidadTransporte'],
            }))
          }
          transportePrivado={guia.transportePrivado}
          onTransportePrivadoChange={(t: TransportePrivado) =>
            setGuia((prev) => ({ ...prev, transportePrivado: t }))
          }
          transportePublico={guia.transportePublico}
          onTransportePublicoChange={(t: TransportePublico) =>
            setGuia((prev) => ({ ...prev, transportePublico: t }))
          }
        />

        {/* 6. Observaciones — compactas */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Observaciones
          </label>
          <textarea
            value={guia.observaciones ?? ''}
            onChange={(e) => setGuia((prev) => ({ ...prev, observaciones: e.target.value }))}
            rows={2}
            placeholder="Observaciones adicionales…"
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-violet-500 outline-none"
          />
        </div>
      </div>

      {/* Barra de acciones — sticky dentro del scroll container del layout */}
      <div className="sticky bottom-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-t border-slate-200 dark:border-gray-700 shadow-[0_-1px_6px_rgba(0,0,0,0.06)] px-6 py-3">
        <div className="flex items-center gap-3">
          {/* Vista previa — izquierda */}
          <button
            type="button"
            onClick={() => setMostrarVistaPrevia((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 h-9 border rounded-xl font-medium transition-all text-[13px] shadow-sm ${
              mostrarVistaPrevia
                ? 'bg-violet-50 border-violet-300 text-violet-700 dark:bg-violet-900/30 dark:border-violet-500 dark:text-violet-300'
                : 'text-violet-600 bg-white/70 hover:bg-white border-violet-200 hover:border-violet-300 dark:bg-transparent dark:border-violet-600 dark:text-violet-400'
            }`}
          >
            <Eye className="h-4 w-4" />
            Vista previa
          </button>

          <div className="flex-1" />

          {/* Cancelar */}
          <button
            type="button"
            onClick={() => navigate('/guias-remision')}
            className="flex items-center gap-2 px-3 py-2 h-9 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl font-medium transition-all text-[13px]"
          >
            <X className="h-4 w-4" />
            Cancelar
          </button>

          {/* Guardar borrador */}
          <button
            type="button"
            onClick={() => void guardarBorrador()}
            disabled={guardando || !guia.serie}
            className="flex items-center gap-2 px-3 py-2 h-9 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl font-medium transition-all text-[13px] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Save className="h-4 w-4" />
            Guardar borrador
          </button>

          {/* Emitir GRE */}
          <button
            type="button"
            onClick={() => void emitir()}
            disabled={guardando}
            className="flex items-center gap-2 px-4 py-2 h-9 text-white bg-violet-600 hover:bg-violet-700 rounded-xl font-medium transition-all text-[13px] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Send className="h-4 w-4" />
            {guardando ? 'Procesando…' : 'Emitir GRE'}
          </button>
        </div>
      </div>
    </div>
  );
}
