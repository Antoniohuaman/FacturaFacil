import type { CSSProperties } from 'react';
import type {
  LogoConfiguration,
  WatermarkConfiguration,
  FooterConfiguration,
} from '../../configuracion-sistema/modelos/VoucherDesignUnified';
import type { GuiaRemision } from '../modelos/GuiaRemision';
import { TIPO_GRE_LABELS } from '../modelos/GuiaRemision';
import type { Vehiculo, Conductor } from '../../configuracion-sistema/modelos/Transporte';
import {
  MOTIVOS_TRASLADO,
  ENTIDADES_AUTORIZADORAS_D37,
  DOCUMENTOS_RELACIONADOS_GRE,
} from '../../configuracion-sistema/datos/catalogosGRE';
import {
  formatearPlaca,
  nombreCompletoConductor,
} from '../../configuracion-sistema/components/transporte/helpersTransporte';
import { getEstadoGRELabel } from '../logica/estadosGRE';
import { obtenerReglaFlujoGRE } from '../logica/reglasFlujoGRE';

// ─── Interfaz pública ────────────────────────────────────────

export interface EmpresaGRE {
  razonSocial?: string;
  ruc?: string;
  direccion?: string;
  autorizacionEspecialEmisor?: { entidadNombre: string; numeroAutorizacion: string };
}

interface Props {
  guia: GuiaRemision;
  empresa: EmpresaGRE;
  logo: LogoConfiguration;
  watermark: WatermarkConfiguration;
  footer: FooterConfiguration;
  vehiculos: Vehiculo[];
  conductores: Conductor[];
}

// ─── Utilidades ──────────────────────────────────────────────

function formatPeso(total: number | undefined, unidad: 'KGM' | 'TNE'): string {
  if (total === undefined) return '—';
  return unidad === 'KGM'
    ? `${total.toFixed(3)} KGM`
    : `${(total / 1000).toFixed(3)} TNE`;
}

function partes(...args: (string | undefined)[]): string {
  return args.filter((x): x is string => Boolean(x)).join(', ');
}

const WATERMARK_SIZE: Record<string, number> = { small: 70, medium: 110, large: 150 };

const TH: CSSProperties = {
  padding: '4px 8px',
  fontWeight: 'bold',
  color: '#4B5563',
  textAlign: 'center',
  border: '1px solid #E5E7EB',
  fontSize: '9px',
  textTransform: 'uppercase',
  background: '#F9FAFB',
};

const TD: CSSProperties = {
  padding: '5px 8px',
  border: '1px solid #E5E7EB',
  verticalAlign: 'top',
};

// ─── Micro-componentes ────────────────────────────────────────

function Separador({ titulo }: { titulo: string }) {
  return (
    <div style={{ marginTop: '14px', marginBottom: '5px' }}>
      <p
        style={{
          fontSize: '9px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#6B7280',
          borderBottom: '1px solid #E5E7EB',
          paddingBottom: '2px',
        }}
      >
        {titulo}
      </p>
    </div>
  );
}

function Campo({ label, value }: { label: string; value?: string | null }) {
  if (value == null || value === '') return null;
  return (
    <div>
      <span style={{ fontSize: '9px', color: '#9CA3AF', display: 'block' }}>{label}</span>
      <span style={{ fontSize: '11px', color: '#111827' }}>{value}</span>
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
      {children}
    </div>
  );
}

function IndicadorBadge({ label }: { label: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: '9px',
        padding: '1px 7px',
        background: '#EFF6FF',
        color: '#1D4ED8',
        border: '1px solid #BFDBFE',
        borderRadius: '4px',
        marginRight: '4px',
        marginBottom: '3px',
      }}
    >
      {label}
    </span>
  );
}

// ─── Marca de agua ────────────────────────────────────────────

function MarcaDeAgua({ watermark }: { watermark: WatermarkConfiguration }) {
  const fontSize = WATERMARK_SIZE[watermark.size] ?? 110;
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) rotate(${watermark.rotation}deg)`,
        opacity: watermark.opacity,
        zIndex: 0,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      {watermark.type === 'text' && (
        <span
          style={{
            fontSize: `${fontSize}px`,
            fontWeight: 'bold',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            color: watermark.color ?? '#000000',
          }}
        >
          {watermark.text ?? ''}
        </span>
      )}
      {watermark.type === 'image' && watermark.imageUrl && (
        <img
          src={watermark.imageUrl}
          alt=""
          style={{ maxWidth: '380px', display: 'block' }}
        />
      )}
    </div>
  );
}

// ─── Cabecera de empresa + guía ────────────────────────────────

function CabeceraGRE({
  guia,
  empresa,
  logo,
  numero,
}: {
  guia: GuiaRemision;
  empresa: EmpresaGRE;
  logo: LogoConfiguration;
  numero: string;
}) {
  const logoAlign: CSSProperties['textAlign'] =
    logo.position === 'center' ? 'center' : logo.position === 'right' ? 'right' : 'left';

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px' }}>
      {/* Bloque empresa */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {logo.enabled && logo.url && (
          <div style={{ marginBottom: '8px', textAlign: logoAlign }}>
            <img
              src={logo.url}
              alt="Logo"
              style={{ width: logo.width, height: logo.height, objectFit: 'contain', display: 'inline-block' }}
            />
          </div>
        )}
        {empresa.razonSocial && (
          <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
            {empresa.razonSocial}
          </p>
        )}
        {empresa.ruc && (
          <p style={{ fontSize: '11px', color: '#4B5563', marginTop: '2px' }}>
            RUC {empresa.ruc}
          </p>
        )}
        {empresa.direccion && (
          <p style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px' }}>
            {empresa.direccion}
          </p>
        )}
        {empresa.autorizacionEspecialEmisor && (
          <p style={{ fontSize: '10px', color: '#5B21B6', marginTop: '5px', fontWeight: 500 }}>
            Autorización especial del emisor:{' '}
            {empresa.autorizacionEspecialEmisor.entidadNombre}
            {' — N.° '}
            {empresa.autorizacionEspecialEmisor.numeroAutorizacion}
          </p>
        )}
      </div>

      {/* Bloque documento */}
      <div
        style={{
          border: '2px solid #374151',
          borderRadius: '6px',
          padding: '10px 18px',
          textAlign: 'center',
          minWidth: '190px',
          flexShrink: 0,
        }}
      >
        <p
          style={{
            fontSize: '10px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            color: '#374151',
            margin: 0,
          }}
        >
          {TIPO_GRE_LABELS[guia.tipo]}
        </p>
        <p
          style={{
            fontSize: '19px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            marginTop: '2px',
            color: '#111827',
          }}
        >
          {numero}
        </p>
        <p style={{ fontSize: '10px', color: '#6B7280', marginTop: '3px' }}>
          Fecha de emisión: {guia.fechaEmision}
        </p>
        <span
          style={{
            display: 'inline-block',
            marginTop: '5px',
            fontSize: '10px',
            fontWeight: 600,
            padding: '1px 10px',
            background: '#F3F4F6',
            borderRadius: '4px',
            color: '#374151',
          }}
        >
          {getEstadoGRELabel(guia.estado)}
        </span>
      </div>
    </div>
  );
}

// ─── Transporte privado ───────────────────────────────────────

function SeccionTransportePrivado({
  tp,
  vehiculos,
  conductores,
}: {
  tp: NonNullable<GuiaRemision['transportePrivado']>;
  vehiculos: Vehiculo[];
  conductores: Conductor[];
}) {
  const indicadores = [
    tp.transbordo ? 'Transbordo programado' : null,
    tp.retornoVehiculoVacio ? 'Retorno de vehículo vacío' : null,
    tp.retornoEnvases ? 'Retorno con envases vacíos' : null,
    tp.esM1oL ? 'Vehículo categoría M1/L' : null,
  ].filter((x): x is string => x !== null);

  return (
    <>
      <Separador titulo="Transporte privado" />
      <Grid2>
        <Campo label="Modalidad" value="Privado (02)" />
        <Campo label="Fecha de inicio de traslado" value={tp.fechaInicioTraslado} />
        {tp.esM1oL && tp.placaVehiculoM1L && (
          <Campo label="Placa vehículo M1/L" value={tp.placaVehiculoM1L} />
        )}
      </Grid2>
      {indicadores.length > 0 && (
        <div style={{ marginTop: '5px' }}>
          {indicadores.map((ind) => <IndicadorBadge key={ind} label={ind} />)}
        </div>
      )}

      {!tp.esM1oL && tp.vehiculosIds.length > 0 && (
        <>
          <p style={{ fontSize: '9px', color: '#9CA3AF', marginTop: '10px', marginBottom: '4px', fontWeight: 'bold' }}>
            VEHÍCULOS
          </p>
          {tp.vehiculosIds.map((vid, idx) => {
            const v = vehiculos.find((x) => x.id === vid);
            if (!v) return null;
            const ent = ENTIDADES_AUTORIZADORAS_D37.find((e) => e.codigo === v.codigoEntidadAutorizadora);
            return (
              <div key={vid} style={{ fontSize: '10px', marginBottom: '3px', display: 'flex', gap: '10px' }}>
                <span style={{ color: '#9CA3AF', minWidth: '72px' }}>
                  {idx === 0 ? 'Principal' : `Secundario ${idx}`}
                </span>
                <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#111827' }}>
                  {formatearPlaca(v.placa)}
                </span>
                {ent && (
                  <span style={{ color: '#6B7280' }}>
                    · {ent.abreviatura}
                    {v.numeroAutorizacion ? ` — Aut. N.° ${v.numeroAutorizacion}` : ''}
                  </span>
                )}
              </div>
            );
          })}
        </>
      )}

      {!tp.esM1oL && tp.conductoresIds.length > 0 && (
        <>
          <p style={{ fontSize: '9px', color: '#9CA3AF', marginTop: '10px', marginBottom: '4px', fontWeight: 'bold' }}>
            CONDUCTORES
          </p>
          {tp.conductoresIds.map((cid, idx) => {
            const c = conductores.find((x) => x.id === cid);
            if (!c) return null;
            return (
              <div key={cid} style={{ fontSize: '10px', marginBottom: '3px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ color: '#9CA3AF', minWidth: '72px' }}>
                  {idx === 0 ? 'Principal' : `Secundario ${idx}`}
                </span>
                <span style={{ fontWeight: 'bold', color: '#111827' }}>
                  {nombreCompletoConductor(c)}
                </span>
                <span style={{ color: '#6B7280' }}>
                  · {c.tipoDocumento} {c.numeroDocumento} · Lic. {c.numeroLicencia}
                </span>
              </div>
            );
          })}
        </>
      )}
    </>
  );
}

// ─── Transporte público ───────────────────────────────────────

function SeccionTransportePublico({
  tp,
  vehiculos,
  conductores,
}: {
  tp: NonNullable<GuiaRemision['transportePublico']>;
  vehiculos: Vehiculo[];
  conductores: Conductor[];
}) {
  const indicadores = [
    tp.transbordo ? 'Transbordo programado' : null,
    tp.retornoEnvases ? 'Retorno con envases vacíos' : null,
    tp.esM1oL ? 'Vehículo categoría M1/L' : null,
  ].filter((x): x is string => x !== null);

  return (
    <>
      <Separador titulo="Transporte público" />
      <Grid2>
        <Campo label="Modalidad" value="Público (01)" />
        {tp.fechaEntregaBienes && (
          <Campo label="Fecha de entrega de bienes" value={tp.fechaEntregaBienes} />
        )}
        {tp.esM1oL && tp.placaVehiculoM1L && (
          <Campo label="Placa vehículo M1/L" value={tp.placaVehiculoM1L} />
        )}
      </Grid2>
      {indicadores.length > 0 && (
        <div style={{ marginTop: '5px' }}>
          {indicadores.map((ind) => <IndicadorBadge key={ind} label={ind} />)}
        </div>
      )}

      {(tp.transportistaNombre || tp.transportistaNumeroDocumento) && (
        <>
          <p style={{ fontSize: '9px', color: '#9CA3AF', marginTop: '10px', marginBottom: '4px', fontWeight: 'bold' }}>
            TRANSPORTISTA
          </p>
          <Grid2>
            {tp.transportistaNumeroDocumento && (
              <Campo
                label={tp.transportistaTipoDocumento || 'RUC'}
                value={tp.transportistaNumeroDocumento}
              />
            )}
            {tp.transportistaNombre && (
              <Campo label="Razón social / Nombre" value={tp.transportistaNombre} />
            )}
            {tp.registroMTC && (
              <Campo label="Registro MTC" value={tp.registroMTC} />
            )}
          </Grid2>
        </>
      )}

      {!tp.esM1oL && tp.registrarVehiculosConductores && tp.vehiculosIds.length > 0 && (
        <>
          <p style={{ fontSize: '9px', color: '#9CA3AF', marginTop: '10px', marginBottom: '4px', fontWeight: 'bold' }}>
            VEHÍCULOS
          </p>
          {tp.vehiculosIds.map((vid, idx) => {
            const v = vehiculos.find((x) => x.id === vid);
            if (!v) return null;
            return (
              <div key={vid} style={{ fontSize: '10px', marginBottom: '3px', display: 'flex', gap: '10px' }}>
                <span style={{ color: '#9CA3AF', minWidth: '72px' }}>
                  {idx === 0 ? 'Principal' : `Secundario ${idx}`}
                </span>
                <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#111827' }}>
                  {formatearPlaca(v.placa)}
                </span>
              </div>
            );
          })}
        </>
      )}

      {!tp.esM1oL && tp.registrarVehiculosConductores && tp.conductoresIds.length > 0 && (
        <>
          <p style={{ fontSize: '9px', color: '#9CA3AF', marginTop: '10px', marginBottom: '4px', fontWeight: 'bold' }}>
            CONDUCTORES
          </p>
          {tp.conductoresIds.map((cid, idx) => {
            const c = conductores.find((x) => x.id === cid);
            if (!c) return null;
            return (
              <div key={cid} style={{ fontSize: '10px', marginBottom: '3px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ color: '#9CA3AF', minWidth: '72px' }}>
                  {idx === 0 ? 'Principal' : `Secundario ${idx}`}
                </span>
                <span style={{ fontWeight: 'bold', color: '#111827' }}>
                  {nombreCompletoConductor(c)}
                </span>
                <span style={{ color: '#6B7280' }}>
                  · Lic. {c.numeroLicencia}
                </span>
              </div>
            );
          })}
        </>
      )}
    </>
  );
}

// ─── Componente principal ─────────────────────────────────────

export default function RepresentacionImpresaGRE({
  guia,
  empresa,
  logo,
  watermark,
  footer,
  vehiculos,
  conductores,
}: Props) {
  const numero =
    guia.serie && guia.correlativo
      ? `${guia.serie}-${guia.correlativo}`
      : guia.serie
        ? `${guia.serie}-[pendiente]`
        : '—';

  const motivo = MOTIVOS_TRASLADO.find((m) => m.codigo === guia.motivoTraslado);
  const regla = obtenerReglaFlujoGRE(guia.tipo, guia.motivoTraslado);
  const esPrivado = guia.modalidadTransporte === '02';

  const footerFontSize: Record<string, string> = { small: '9px', medium: '11px', large: '13px' };
  const footerAlign: Record<string, CSSProperties['textAlign']> = {
    left: 'left',
    center: 'center',
    right: 'right',
  };

  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        color: '#111827',
        padding: '28px 36px',
        background: 'white',
        position: 'relative',
      }}
    >
      {/* Marca de agua */}
      {watermark.enabled && <MarcaDeAgua watermark={watermark} />}

      {/* Contenido sobre la marca de agua */}
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Cabecera */}
        <CabeceraGRE guia={guia} empresa={empresa} logo={logo} numero={numero} />

        <hr style={{ border: 'none', borderTop: '2px solid #111827', margin: '12px 0' }} />

        {/* Datos generales */}
        <Separador titulo="Datos generales" />
        <Grid2>
          <Campo
            label="Motivo de traslado"
            value={`${guia.motivoTraslado} — ${motivo?.descripcion ?? '—'}`}
          />
          <Campo
            label="Modalidad de transporte"
            value={esPrivado ? 'Privado (02)' : 'Público (01)'}
          />
          {guia.pesoTotal !== undefined && (
            <Campo
              label="Peso bruto total"
              value={formatPeso(guia.pesoTotal, guia.unidadPeso)}
            />
          )}
        </Grid2>
        {regla.requiereEspecificacion && guia.especificacionMotivo && (
          <div style={{ marginTop: '4px' }}>
            <Campo label="Especificación del motivo" value={guia.especificacionMotivo} />
          </div>
        )}
        {guia.observaciones && (
          <div style={{ marginTop: '4px' }}>
            <Campo label="Observaciones" value={guia.observaciones} />
          </div>
        )}

        {/* Actor principal */}
        <Separador titulo={regla.actorPrincipal.label} />
        <Grid2>
          <Campo label="Nombre / Razón social" value={guia.destinatarioNombre || '—'} />
          <Campo
            label={guia.destinatarioTipoDocumento}
            value={guia.destinatarioNumeroDocumento || '—'}
          />
          {guia.destinatarioDireccion && (
            <Campo label="Dirección" value={guia.destinatarioDireccion} />
          )}
          {(guia.destinatarioDistrito ?? guia.destinatarioProvincia ?? guia.destinatarioDepartamento) && (
            <Campo
              label="Distrito / Provincia / Departamento"
              value={partes(guia.destinatarioDistrito, guia.destinatarioProvincia, guia.destinatarioDepartamento)}
            />
          )}
          {guia.destinatarioUbigeo && (
            <Campo label="Ubigeo" value={guia.destinatarioUbigeo} />
          )}
        </Grid2>

        {/* Actor secundario — comprador (motivo 03) */}
        {regla.actorSecundario !== null && guia.compradorNombre && (
          <>
            <Separador titulo={regla.actorSecundario.label} />
            <Grid2>
              <Campo label="Nombre / Razón social" value={guia.compradorNombre} />
              {guia.compradorTipoDocumento && guia.compradorNumeroDocumento && (
                <Campo
                  label={guia.compradorTipoDocumento}
                  value={guia.compradorNumeroDocumento}
                />
              )}
            </Grid2>
          </>
        )}

        {/* Puntos de traslado */}
        <Separador titulo="Puntos de traslado" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
          <div>
            <p style={{ fontSize: '9px', color: '#9CA3AF', marginBottom: '2px' }}>Punto de partida</p>
            <p style={{ fontSize: '11px', color: '#111827', fontWeight: 500, margin: 0 }}>
              {guia.puntoPartida.direccion || '—'}
            </p>
            {partes(guia.puntoPartida.distrito, guia.puntoPartida.provincia, guia.puntoPartida.departamento) && (
              <p style={{ fontSize: '10px', color: '#6B7280', marginTop: '1px' }}>
                {partes(guia.puntoPartida.distrito, guia.puntoPartida.provincia, guia.puntoPartida.departamento)}
              </p>
            )}
            {guia.puntoPartida.ubigeo && (
              <p style={{ fontSize: '9px', color: '#9CA3AF', marginTop: '1px' }}>
                Ubigeo: {guia.puntoPartida.ubigeo}
              </p>
            )}
          </div>
          <div>
            <p style={{ fontSize: '9px', color: '#9CA3AF', marginBottom: '2px' }}>Punto de llegada</p>
            <p style={{ fontSize: '11px', color: '#111827', fontWeight: 500, margin: 0 }}>
              {guia.puntoLlegada.direccion || '—'}
            </p>
            {partes(guia.puntoLlegada.distrito, guia.puntoLlegada.provincia, guia.puntoLlegada.departamento) && (
              <p style={{ fontSize: '10px', color: '#6B7280', marginTop: '1px' }}>
                {partes(guia.puntoLlegada.distrito, guia.puntoLlegada.provincia, guia.puntoLlegada.departamento)}
              </p>
            )}
            {guia.puntoLlegada.ubigeo && (
              <p style={{ fontSize: '9px', color: '#9CA3AF', marginTop: '1px' }}>
                Ubigeo: {guia.puntoLlegada.ubigeo}
              </p>
            )}
          </div>
        </div>

        {/* Bienes */}
        <Separador
          titulo={`Bienes a transportar — Peso bruto total: ${formatPeso(guia.pesoTotal, guia.unidadPeso)}`}
        />
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead>
            <tr>
              <th style={{ ...TH, textAlign: 'center', width: '28px' }}>N°</th>
              <th style={{ ...TH, textAlign: 'left', width: '80px' }}>Código</th>
              <th style={{ ...TH, textAlign: 'left' }}>Descripción</th>
              <th style={{ ...TH, width: '50px' }}>U.M.</th>
              <th style={{ ...TH, textAlign: 'right', width: '60px' }}>Cantidad</th>
              <th style={{ ...TH, textAlign: 'right', width: '70px' }}>Peso (kg)</th>
            </tr>
          </thead>
          <tbody>
            {guia.bienes.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...TD, textAlign: 'center', color: '#9CA3AF' }}>
                  Sin bienes registrados
                </td>
              </tr>
            )}
            {guia.bienes.map((b, idx) => (
              <tr key={b.id} style={{ borderTop: '1px solid #E5E7EB' }}>
                <td style={{ ...TD, textAlign: 'center', color: '#6B7280' }}>{idx + 1}</td>
                <td style={{ ...TD, fontFamily: 'monospace', color: '#6B7280', fontSize: '9px' }}>
                  {b.codigoBien ?? (b.productoId != null ? String(b.productoId) : '—')}
                </td>
                <td style={TD}>
                  <span style={{ color: '#111827' }}>{b.descripcion || '—'}</span>
                  {b.normalizado && (
                    <span
                      style={{
                        marginLeft: '5px',
                        fontSize: '8px',
                        padding: '0 4px',
                        background: '#EDE9FE',
                        color: '#5B21B6',
                        borderRadius: '3px',
                        fontWeight: 'bold',
                      }}
                    >
                      SUNAT
                    </span>
                  )}
                  {b.codigoProductoSunat && (
                    <p style={{ fontSize: '8px', color: '#9CA3AF', fontFamily: 'monospace', margin: '1px 0 0' }}>
                      Cód. SUNAT: {b.codigoProductoSunat}
                    </p>
                  )}
                  {b.codigoSubpartidaNacional && (
                    <p style={{ fontSize: '8px', color: '#9CA3AF', fontFamily: 'monospace', margin: '1px 0 0' }}>
                      Subpartida: {b.codigoSubpartidaNacional}
                    </p>
                  )}
                  {b.codigoGTIN && (
                    <p style={{ fontSize: '8px', color: '#9CA3AF', fontFamily: 'monospace', margin: '1px 0 0' }}>
                      GTIN: {b.codigoGTIN}
                    </p>
                  )}
                </td>
                <td style={{ ...TD, textAlign: 'center' }}>{b.unidad}</td>
                <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace' }}>{b.cantidad}</td>
                <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace' }}>
                  {b.pesoLineaKg !== undefined ? b.pesoLineaKg.toFixed(3) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Transporte */}
        {esPrivado && guia.transportePrivado ? (
          <SeccionTransportePrivado
            tp={guia.transportePrivado}
            vehiculos={vehiculos}
            conductores={conductores}
          />
        ) : !esPrivado && guia.transportePublico ? (
          <SeccionTransportePublico
            tp={guia.transportePublico}
            vehiculos={vehiculos}
            conductores={conductores}
          />
        ) : null}

        {/* Documentos relacionados */}
        {guia.documentosRelacionados.length > 0 && (
          <>
            <Separador titulo="Documentos relacionados" />
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr>
                  <th style={{ ...TH, textAlign: 'left' }}>Tipo de documento</th>
                  <th style={{ ...TH, textAlign: 'left' }}>Número</th>
                  <th style={{ ...TH, width: '90px' }}>Fecha emisión</th>
                  <th style={{ ...TH, width: '70px' }}>Origen</th>
                </tr>
              </thead>
              <tbody>
                {guia.documentosRelacionados.map((doc) => {
                  const tipoCat = DOCUMENTOS_RELACIONADOS_GRE.find(
                    (x) => x.codigo === doc.tipoDocumentoCodigo,
                  );
                  return (
                    <tr key={doc.id} style={{ borderTop: '1px solid #E5E7EB' }}>
                      <td style={TD}>{tipoCat?.documento ?? `Tipo ${doc.tipoDocumentoCodigo}`}</td>
                      <td style={{ ...TD, fontFamily: 'monospace' }}>
                        {doc.numeroDocumento}
                        {doc.rucEmisorExterno && (
                          <p style={{ fontSize: '8px', color: '#9CA3AF', margin: '1px 0 0' }}>
                            RUC emisor: {doc.rucEmisorExterno}
                          </p>
                        )}
                      </td>
                      <td style={{ ...TD, textAlign: 'center' }}>{doc.fechaEmision ?? '—'}</td>
                      <td style={{ ...TD, textAlign: 'center' }}>{doc.origen}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        {/* Pie de página */}
        {footer.enabled && footer.showCustomText && footer.customText && (
          <div
            style={{
              marginTop: '28px',
              paddingTop: '8px',
              paddingBottom: `${footer.padding}px`,
              borderTop: '1px solid #E5E7EB',
              textAlign: footerAlign[footer.textAlignment] ?? 'center',
              fontSize: footerFontSize[footer.fontSize] ?? '9px',
              fontWeight: footer.fontWeight === 'bold' ? 'bold' : 'normal',
              color: '#6B7280',
            }}
          >
            {footer.customText}
          </div>
        )}
      </div>
    </div>
  );
}
