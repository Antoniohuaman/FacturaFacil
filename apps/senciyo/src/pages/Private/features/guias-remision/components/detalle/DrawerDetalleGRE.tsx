import { useState, useEffect } from 'react';
import { X, Ban, Printer, Copy, Edit3, Trash2 } from 'lucide-react';
import type { GuiaRemision } from '../../modelos/GuiaRemision';
import { TIPO_GRE_LABELS } from '../../modelos/GuiaRemision';
import {
  MOTIVOS_TRASLADO,
  ENTIDADES_AUTORIZADORAS_D37,
  DOCUMENTOS_RELACIONADOS_GRE,
} from '../../../configuracion-sistema/datos/catalogosGRE';
import {
  vehiculosDataSource,
  conductoresDataSource,
} from '../../../configuracion-sistema/api/fuenteDatosTransporte';
import type { Vehiculo, Conductor } from '../../../configuracion-sistema/modelos/Transporte';
import {
  formatearPlaca,
  nombreCompletoConductor,
} from '../../../configuracion-sistema/components/transporte/helpersTransporte';
import {
  getEstadoGRELabel,
  getEstadoGREBadgeClass,
  puedeAnularGRE,
  puedeEditarGRE,
  puedeEliminarBorradorGRE,
} from '../../logica/estadosGRE';
import { obtenerReglaFlujoGRE } from '../../logica/reglasFlujoGRE';

type TabDrawer = 'general' | 'bienes' | 'transporte' | 'documentos' | 'historial';

interface Props {
  guia: GuiaRemision | null;
  tenantId: string;
  onCerrar: () => void;
  onAnular: (guia: GuiaRemision) => void;
  onImprimir: (guia: GuiaRemision) => void;
  onDuplicar: (guia: GuiaRemision) => void;
  onEditar: (guia: GuiaRemision) => void;
  onEliminarBorrador: (guia: GuiaRemision) => void;
}

export default function DrawerDetalleGRE({
  guia,
  tenantId,
  onCerrar,
  onAnular,
  onImprimir,
  onDuplicar,
  onEditar,
  onEliminarBorrador,
}: Props) {
  const [tabActivo, setTabActivo] = useState<TabDrawer>('general');
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [conductores, setConductores] = useState<Conductor[]>([]);

  useEffect(() => {
    if (!guia || !tenantId) return;
    void vehiculosDataSource.list(tenantId).then(setVehiculos);
    void conductoresDataSource.list(tenantId).then(setConductores);
  }, [guia, tenantId]);

  useEffect(() => {
    setTabActivo('general');
  }, [guia?.id]);

  if (!guia) return null;

  const numero =
    guia.serie && guia.correlativo
      ? `${guia.serie}-${guia.correlativo}`
      : guia.serie
        ? `${guia.serie}-[pendiente]`
        : '—';

  const motivo = MOTIVOS_TRASLADO.find((m) => m.codigo === guia.motivoTraslado);
  const esPrivado = guia.modalidadTransporte === '02';

  const tabs: { id: TabDrawer; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'bienes', label: 'Bienes' },
    { id: 'transporte', label: 'Transporte' },
    { id: 'documentos', label: 'Documentos' },
    { id: 'historial', label: 'Historial' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40"
        onClick={onCerrar}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
        {/* Cabecera */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-0.5">
              {TIPO_GRE_LABELS[guia.tipo]}
            </p>
            <p className="text-lg font-bold font-mono text-gray-900 dark:text-white tabular-nums">
              {numero}
            </p>
            <span
              className={`inline-flex items-center mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${getEstadoGREBadgeClass(guia.estado)}`}
            >
              {getEstadoGRELabel(guia.estado)}
            </span>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Acciones rápidas */}
        <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-gray-100 dark:border-gray-700 shrink-0 flex-wrap">
          {puedeEditarGRE(guia) && (
            <button
              type="button"
              onClick={() => onEditar(guia)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Editar
            </button>
          )}
          {puedeEliminarBorradorGRE(guia) && (
            <button
              type="button"
              onClick={() => onEliminarBorrador(guia)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar borrador
            </button>
          )}
          {!guia.esBorrador && (
            <>
              <button
                type="button"
                onClick={() => onImprimir(guia)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg transition-colors"
              >
                <Printer className="h-3.5 w-3.5" />
                Imprimir
              </button>
              <button
                type="button"
                onClick={() => onDuplicar(guia)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
                Duplicar
              </button>
              {puedeAnularGRE(guia) && (
                <button
                  type="button"
                  onClick={() => onAnular(guia)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg transition-colors"
                >
                  <Ban className="h-3.5 w-3.5" />
                  Anular
                </button>
              )}
            </>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700 shrink-0 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTabActivo(t.id)}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                tabActivo === t.id
                  ? 'border-violet-600 text-violet-700 dark:text-violet-400 dark:border-violet-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-sm">
          {tabActivo === 'general' && (
            <TabGeneral guia={guia} motivo={motivo?.descripcion} />
          )}
          {tabActivo === 'bienes' && (
            <TabBienes guia={guia} />
          )}
          {tabActivo === 'transporte' && (
            <TabTransporte
              guia={guia}
              esPrivado={esPrivado}
              vehiculos={vehiculos}
              conductores={conductores}
            />
          )}
          {tabActivo === 'documentos' && (
            <TabDocumentos guia={guia} />
          )}
          {tabActivo === 'historial' && (
            <TabHistorial guia={guia} />
          )}
        </div>
      </div>
    </>
  );
}

// ─── Tabs ────────────────────────────────────────────────────

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
      <div className="text-sm text-gray-900 dark:text-white font-medium">{children}</div>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {titulo}
      </p>
      {children}
    </div>
  );
}

function TabGeneral({ guia, motivo }: { guia: GuiaRemision; motivo?: string }) {
  const regla = obtenerReglaFlujoGRE(guia.tipo, guia.motivoTraslado);
  return (
    <>
      <Seccion titulo={regla.actorPrincipal.label}>
        <Campo label="Nombre / Razón social">{guia.destinatarioNombre || '—'}</Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Tipo documento">{guia.destinatarioTipoDocumento}</Campo>
          <Campo label="Número">{guia.destinatarioNumeroDocumento || '—'}</Campo>
        </div>
        {guia.destinatarioDireccion && (
          <Campo label="Dirección">{guia.destinatarioDireccion}</Campo>
        )}
        {guia.destinatarioDistrito && (
          <Campo label="Distrito / Provincia">
            {[guia.destinatarioDistrito, guia.destinatarioProvincia, guia.destinatarioDepartamento]
              .filter(Boolean)
              .join(', ')}
          </Campo>
        )}
      </Seccion>

      {regla.actorSecundario !== null && guia.compradorNombre && (
        <Seccion titulo={regla.actorSecundario.label}>
          <Campo label="Nombre / Razón social">{guia.compradorNombre}</Campo>
          {(guia.compradorTipoDocumento || guia.compradorNumeroDocumento) && (
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Tipo documento">{guia.compradorTipoDocumento || '—'}</Campo>
              <Campo label="Número">{guia.compradorNumeroDocumento || '—'}</Campo>
            </div>
          )}
        </Seccion>
      )}

      {regla.requiereEspecificacion && guia.especificacionMotivo && (
        <Seccion titulo="Especificación del motivo">
          <p className="text-sm text-gray-700 dark:text-gray-300">{guia.especificacionMotivo}</p>
        </Seccion>
      )}

      <Seccion titulo="Datos generales">
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Fecha de emisión">{guia.fechaEmision}</Campo>
          <Campo label="Número">
            <span className="font-mono">
              {guia.serie && guia.correlativo
                ? `${guia.serie}-${guia.correlativo}`
                : guia.serie || '—'}
            </span>
          </Campo>
          <Campo label="Motivo de traslado">
            {guia.motivoTraslado} — {motivo ?? '—'}
          </Campo>
          <Campo label="Modalidad">
            {guia.modalidadTransporte === '02' ? 'Privado' : 'Público'}
          </Campo>
        </div>
      </Seccion>

      <Seccion titulo="Puntos de traslado">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Punto de partida</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {guia.puntoPartida.direccion || '—'}
            </p>
            {guia.puntoPartida.distrito && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {[guia.puntoPartida.distrito, guia.puntoPartida.provincia]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Punto de llegada</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {guia.puntoLlegada.direccion || '—'}
            </p>
            {guia.puntoLlegada.distrito && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {[guia.puntoLlegada.distrito, guia.puntoLlegada.provincia]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            )}
          </div>
        </div>
      </Seccion>

      {guia.pesoTotal !== undefined && (
        <Seccion titulo="Peso">
          <Campo label="Peso bruto total">
            {guia.unidadPeso === 'KGM'
              ? `${guia.pesoTotal.toFixed(3)} KGM`
              : `${(guia.pesoTotal / 1000).toFixed(3)} TNE`}
          </Campo>
        </Seccion>
      )}

      {guia.observaciones && (
        <Seccion titulo="Observaciones">
          <p className="text-sm text-gray-700 dark:text-gray-300">{guia.observaciones}</p>
        </Seccion>
      )}
    </>
  );
}

function TabBienes({ guia }: { guia: GuiaRemision }) {
  if (guia.bienes.length === 0) {
    return (
      <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
        Sin bienes registrados
      </p>
    );
  }

  return (
    <div className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="text-left px-3 py-2.5 text-gray-600 dark:text-gray-400 font-semibold">Bien</th>
              <th className="text-right px-3 py-2.5 text-gray-600 dark:text-gray-400 font-semibold w-16">Cant.</th>
              <th className="text-center px-3 py-2.5 text-gray-600 dark:text-gray-400 font-semibold w-16">Unidad</th>
              <th className="text-right px-3 py-2.5 text-gray-600 dark:text-gray-400 font-semibold w-20">Peso (kg)</th>
            </tr>
          </thead>
          <tbody>
            {guia.bienes.map((b) => (
              <tr
                key={b.id}
                className="border-t border-gray-100 dark:border-gray-700"
              >
                <td className="px-3 py-2.5">
                  {b.codigoBien && (
                    <span className="text-gray-400 dark:text-gray-500 font-mono mr-1.5">{b.codigoBien}</span>
                  )}
                  <span className="text-gray-900 dark:text-white">{b.descripcion || '—'}</span>
                  {b.normalizado && (
                    <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 font-medium">
                      SUNAT
                    </span>
                  )}
                  {b.codigoProductoSunat && (
                    <p className="text-gray-400 dark:text-gray-500 font-mono text-[10px] mt-0.5">{b.codigoProductoSunat}</p>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-900 dark:text-white">
                  {b.cantidad}
                </td>
                <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-300">
                  {b.unidad}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-600 dark:text-gray-300">
                  {b.pesoLineaKg !== undefined ? b.pesoLineaKg.toFixed(3) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabTransporte({
  guia,
  esPrivado,
  vehiculos,
  conductores,
}: {
  guia: GuiaRemision;
  esPrivado: boolean;
  vehiculos: Vehiculo[];
  conductores: Conductor[];
}) {
  return (
    <>
      {esPrivado && guia.transportePrivado ? (
        <TransportePrivadoDetalle
          tp={guia.transportePrivado}
          vehiculos={vehiculos}
          conductores={conductores}
        />
      ) : !esPrivado && guia.transportePublico ? (
        <TransportePublicoDetalle
          tp={guia.transportePublico}
          vehiculos={vehiculos}
          conductores={conductores}
        />
      ) : (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
          Sin datos de transporte
        </p>
      )}
    </>
  );
}

function IndicadorBoolean({ label, valor }: { label: string; valor?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span
        className={`text-xs font-medium ${valor ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}
      >
        {valor ? 'Sí' : 'No'}
      </span>
    </div>
  );
}

function TransportePrivadoDetalle({
  tp,
  vehiculos,
  conductores,
}: {
  tp: GuiaRemision['transportePrivado'] & object;
  vehiculos: Vehiculo[];
  conductores: Conductor[];
}) {
  return (
    <>
      <Seccion titulo="Transporte privado">
        <div className="space-y-1.5">
          <IndicadorBoolean label="Vehículo M1/L" valor={tp.esM1oL} />
          <IndicadorBoolean label="Transbordo programado" valor={tp.transbordo} />
          {!tp.esM1oL && (
            <>
              <IndicadorBoolean label="Retorno de vehículo vacío" valor={tp.retornoVehiculoVacio} />
              <IndicadorBoolean label="Retorno con envases vacíos" valor={tp.retornoEnvases} />
            </>
          )}
        </div>
        {tp.esM1oL && tp.placaVehiculoM1L && (
          <Campo label="Placa M1/L">
            <span className="font-mono">{tp.placaVehiculoM1L}</span>
          </Campo>
        )}
        <Campo label="Fecha de inicio de traslado">{tp.fechaInicioTraslado || '—'}</Campo>
      </Seccion>

      {!tp.esM1oL && tp.vehiculosIds.length > 0 && (
        <Seccion titulo="Vehículos">
          <ul className="space-y-2">
            {tp.vehiculosIds.map((vid, idx) => {
              const v = vehiculos.find((x) => x.id === vid);
              if (!v) return <li key={vid} className="text-xs text-gray-400">ID: {vid} (no encontrado)</li>;
              const ent = ENTIDADES_AUTORIZADORAS_D37.find(
                (e) => e.codigo === v.codigoEntidadAutorizadora,
              );
              return (
                <li key={vid} className="flex items-start gap-2 text-xs">
                  <span className="shrink-0 text-[10px] font-medium text-gray-400 w-20 pt-px">
                    {idx === 0 ? 'Principal' : `Secundario ${idx}`}
                  </span>
                  <div>
                    <span className="font-mono font-semibold text-gray-900 dark:text-white">
                      {formatearPlaca(v.placa)}
                    </span>
                    {ent && (
                      <span className="text-gray-500 dark:text-gray-400 ml-1.5">
                        · {ent.abreviatura}
                        {v.numeroAutorizacion ? ` — Aut. ${v.numeroAutorizacion}` : ''}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Seccion>
      )}

      {!tp.esM1oL && tp.conductoresIds.length > 0 && (
        <Seccion titulo="Conductores">
          <ul className="space-y-2">
            {tp.conductoresIds.map((cid, idx) => {
              const c = conductores.find((x) => x.id === cid);
              if (!c) return <li key={cid} className="text-xs text-gray-400">ID: {cid} (no encontrado)</li>;
              return (
                <li key={cid} className="flex items-start gap-2 text-xs">
                  <span className="shrink-0 text-[10px] font-medium text-gray-400 w-20 pt-px">
                    {idx === 0 ? 'Principal' : `Secundario ${idx}`}
                  </span>
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {nombreCompletoConductor(c)}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 ml-1.5">
                      · {c.tipoDocumento} {c.numeroDocumento} · Lic. {c.numeroLicencia}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </Seccion>
      )}
    </>
  );
}

function TransportePublicoDetalle({
  tp,
  vehiculos,
  conductores,
}: {
  tp: GuiaRemision['transportePublico'] & object;
  vehiculos: Vehiculo[];
  conductores: Conductor[];
}) {
  return (
    <>
      <Seccion titulo="Transporte público">
        <div className="space-y-1.5">
          <IndicadorBoolean label="Vehículo M1/L" valor={tp.esM1oL} />
          <IndicadorBoolean label="Transbordo programado" valor={tp.transbordo} />
          {!tp.esM1oL && (
            <>
              <IndicadorBoolean label="Registrar vehículos/conductores" valor={tp.registrarVehiculosConductores} />
              <IndicadorBoolean label="Retorno con envases vacíos" valor={tp.retornoEnvases} />
            </>
          )}
        </div>
        {tp.esM1oL && tp.placaVehiculoM1L && (
          <Campo label="Placa M1/L">
            <span className="font-mono">{tp.placaVehiculoM1L}</span>
          </Campo>
        )}
        <Campo label="Fecha de entrega de bienes">{tp.fechaEntregaBienes ?? '—'}</Campo>
      </Seccion>

      {(tp.transportistaNombre || tp.transportistaNumeroDocumento) && (
        <Seccion titulo="Transportista">
          {tp.transportistaNumeroDocumento && (
            <Campo label="RUC">{tp.transportistaNumeroDocumento}</Campo>
          )}
          {tp.transportistaNombre && (
            <Campo label="Razón social">{tp.transportistaNombre}</Campo>
          )}
          {tp.registroMTC && (
            <Campo label="Registro MTC">{tp.registroMTC}</Campo>
          )}
        </Seccion>
      )}

      {!tp.esM1oL && tp.registrarVehiculosConductores && tp.vehiculosIds.length > 0 && (
        <Seccion titulo="Vehículos">
          <ul className="space-y-2">
            {tp.vehiculosIds.map((vid, idx) => {
              const v = vehiculos.find((x) => x.id === vid);
              if (!v) return <li key={vid} className="text-xs text-gray-400">ID: {vid} (no encontrado)</li>;
              return (
                <li key={vid} className="flex items-start gap-2 text-xs">
                  <span className="shrink-0 text-[10px] font-medium text-gray-400 w-20 pt-px">
                    {idx === 0 ? 'Principal' : `Secundario ${idx}`}
                  </span>
                  <span className="font-mono font-semibold text-gray-900 dark:text-white">
                    {formatearPlaca(v.placa)}
                  </span>
                </li>
              );
            })}
          </ul>
        </Seccion>
      )}

      {!tp.esM1oL && tp.registrarVehiculosConductores && tp.conductoresIds.length > 0 && (
        <Seccion titulo="Conductores">
          <ul className="space-y-2">
            {tp.conductoresIds.map((cid, idx) => {
              const c = conductores.find((x) => x.id === cid);
              if (!c) return <li key={cid} className="text-xs text-gray-400">ID: {cid} (no encontrado)</li>;
              return (
                <li key={cid} className="flex items-start gap-2 text-xs">
                  <span className="shrink-0 text-[10px] font-medium text-gray-400 w-20 pt-px">
                    {idx === 0 ? 'Principal' : `Secundario ${idx}`}
                  </span>
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {nombreCompletoConductor(c)}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 ml-1.5">
                      · Lic. {c.numeroLicencia}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </Seccion>
      )}
    </>
  );
}

function TabDocumentos({ guia }: { guia: GuiaRemision }) {
  if (guia.documentosRelacionados.length === 0) {
    return (
      <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
        Sin documentos relacionados
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {guia.documentosRelacionados.map((doc) => {
        const tipoCat = DOCUMENTOS_RELACIONADOS_GRE.find(
          (x) => x.codigo === doc.tipoDocumentoCodigo,
        );
        return (
          <div
            key={doc.id}
            className="border border-gray-100 dark:border-gray-700 rounded-xl p-3 space-y-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {tipoCat?.documento ?? `Tipo ${doc.tipoDocumentoCodigo}`}
              </p>
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  doc.origen === 'INTERNO'
                    ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {doc.origen}
              </span>
            </div>
            <p className="text-sm font-mono text-gray-900 dark:text-white">{doc.numeroDocumento}</p>
            {doc.fechaEmision && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{doc.fechaEmision}</p>
            )}
            {doc.rucEmisorExterno && (
              <p className="text-xs text-gray-500 dark:text-gray-400">RUC emisor: {doc.rucEmisorExterno}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

const EVENTO_LABELS: Record<NonNullable<GuiaRemision['historial']>[number]['tipo'], string> = {
  creacion: 'Borrador creado',
  edicion: 'Borrador editado',
  emision: 'Emitida',
  anulacion: 'Anulada',
  impresion: 'Impresa',
  eliminacion_borrador: 'Borrador eliminado',
};

function TabHistorial({ guia }: { guia: GuiaRemision }) {
  const eventos = guia.historial ?? [];

  if (eventos.length === 0) {
    return (
      <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
        Sin eventos registrados
      </p>
    );
  }

  return (
    <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-2 space-y-4">
      {[...eventos].reverse().map((ev) => (
        <li key={ev.id} className="ml-4">
          <div className="absolute w-2.5 h-2.5 bg-violet-400 dark:bg-violet-500 rounded-full mt-1 -left-1.5 border border-white dark:border-gray-900" />
          <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
            {new Date(ev.fecha).toLocaleString('es-PE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {EVENTO_LABELS[ev.tipo] ?? ev.tipo}
          </p>
          {ev.descripcion && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ev.descripcion}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
