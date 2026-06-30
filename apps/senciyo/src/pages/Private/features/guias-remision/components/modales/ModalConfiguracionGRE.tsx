import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, KeyRound, ShieldCheck, BadgeCheck, Loader2 } from 'lucide-react';
import { useTenant } from '@/shared/tenant/TenantContext';
import { useFeedback } from '@/shared/feedback';
import { conexionSunatDataSource } from '../../../configuracion-sistema/api/fuenteDatosConexionSunat';
import { datosTransportistaDataSource } from '../../../configuracion-sistema/api/fuenteDatosTransporte';
import { ENTIDADES_AUTORIZADORAS_D37 } from '../../../configuracion-sistema/datos/catalogosGRE';
import type { ConexionSunat } from '../../../configuracion-sistema/modelos/ConexionSunat';
import type { DatosTransportista } from '../../../configuracion-sistema/modelos/Transporte';

interface Props {
  open: boolean;
  onCerrar: () => void;
  onGuardado: () => void;
}

interface FormState {
  usuarioSOL: string;
  claveSOL: string;
  clientId: string;
  clientSecret: string;
  codigoEntidadAutorizadora: string;
  numeroAutorizacion: string;
}

const INPUT_CLS =
  'w-full h-9 px-2.5 text-sm border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none border-gray-200 dark:border-gray-600';
const LABEL_CLS = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

const ENTIDADES_VIGENTES = ENTIDADES_AUTORIZADORAS_D37.filter((e) => e.estado === 'Vigente');

export default function ModalConfiguracionGRE({ open, onCerrar, onGuardado }: Props) {
  const { tenantId } = useTenant();
  const feedback = useFeedback();
  const [form, setForm] = useState<FormState>({
    usuarioSOL: '',
    claveSOL: '',
    clientId: '',
    clientSecret: '',
    codigoEntidadAutorizadora: '',
    numeroAutorizacion: '',
  });
  const [guardando, setGuardando] = useState(false);
  const [mostrarClave, setMostrarClave] = useState(false);
  const [mostrarSecret, setMostrarSecret] = useState(false);
  const [credencialesExistentes, setCredencialesExistentes] = useState(false);
  const [errorNumAut, setErrorNumAut] = useState<string | undefined>();
  const [datosTransportistaBase, setDatosTransportistaBase] = useState<DatosTransportista | null>(null);

  useEffect(() => {
    if (!open || !tenantId) return;
    setMostrarClave(false);
    setMostrarSecret(false);
    setErrorNumAut(undefined);
    void Promise.all([
      conexionSunatDataSource.get(tenantId) as Promise<ConexionSunat | null>,
      datosTransportistaDataSource.get(tenantId) as Promise<DatosTransportista | null>,
    ]).then(([conexion, transportista]) => {
      const sol = conexion?.accesoSOL?.usuarioSOL ?? '';
      const clave = conexion?.accesoSOL?.claveSOL ?? '';
      const id = conexion?.credencialesGRE?.clientId ?? '';
      const secret = conexion?.credencialesGRE?.clientSecret ?? '';
      const codigo = transportista?.codigoEntidadAutorizadora ?? '';
      const numAut = transportista?.numeroAutorizacion ?? '';
      setForm({ usuarioSOL: sol, claveSOL: clave, clientId: id, clientSecret: secret, codigoEntidadAutorizadora: codigo, numeroAutorizacion: numAut });
      setCredencialesExistentes(Boolean(sol.trim() && clave.trim() && id.trim() && secret.trim()));
      setDatosTransportistaBase(transportista);
    });
  }, [open, tenantId]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'codigoEntidadAutorizadora' && !value) {
        next.numeroAutorizacion = '';
      }
      return next;
    });
    if (key === 'codigoEntidadAutorizadora' || key === 'numeroAutorizacion') {
      setErrorNumAut(undefined);
    }
  };

  const handleGuardar = async () => {
    if (!tenantId) return;
    if (form.codigoEntidadAutorizadora.trim() && !form.numeroAutorizacion.trim()) {
      setErrorNumAut('Indica el número de autorización de la entidad seleccionada.');
      return;
    }
    setGuardando(true);
    try {
      await conexionSunatDataSource.saveAccesoSOL(tenantId, {
        usuarioSOL: form.usuarioSOL.trim(),
        claveSOL: form.claveSOL.trim(),
      });
      await conexionSunatDataSource.saveCredencialesGRE(tenantId, {
        clientId: form.clientId.trim(),
        clientSecret: form.clientSecret.trim(),
      });
      await datosTransportistaDataSource.save(tenantId, {
        numeroRegistroMTC: datosTransportistaBase?.numeroRegistroMTC ?? '',
        estado: datosTransportistaBase?.estado ?? 'HABILITADO',
        codigoEntidadAutorizadora: form.codigoEntidadAutorizadora.trim() || undefined,
        numeroAutorizacion: form.codigoEntidadAutorizadora.trim()
          ? form.numeroAutorizacion.trim() || undefined
          : undefined,
      });
      feedback.success(
        credencialesExistentes
          ? 'Credenciales SUNAT actualizadas correctamente.'
          : 'Credenciales SUNAT registradas correctamente.',
      );
      onGuardado();
      onCerrar();
    } catch {
      feedback.error('No se pudieron guardar las credenciales. Inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  if (!open) return null;

  const textoBoton = credencialesExistentes ? 'Actualizar credenciales' : 'Registrar credenciales';

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60" onClick={onCerrar} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg pointer-events-auto flex flex-col max-h-[90vh]">

          {/* Cabecera */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Credenciales SUNAT para GRE
            </h2>
            <button
              type="button"
              onClick={onCerrar}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-6 overflow-y-auto flex-1">

            {/* Bloque A — Acceso SOL */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <KeyRound className="h-4 w-4 text-violet-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Acceso SOL</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className={LABEL_CLS}>Usuario SOL</label>
                  <input
                    type="text"
                    value={form.usuarioSOL}
                    onChange={(e) => setField('usuarioSOL', e.target.value)}
                    placeholder="XXXXXXXX"
                    autoComplete="off"
                    className={INPUT_CLS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Clave SOL</label>
                  <div className="relative">
                    <input
                      type={mostrarClave ? 'text' : 'password'}
                      value={form.claveSOL}
                      onChange={(e) => setField('claveSOL', e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className={`${INPUT_CLS} pr-9`}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarClave((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      {mostrarClave ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700" />

            {/* Bloque B — Credenciales GRE */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-4 w-4 text-violet-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Credenciales GRE</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className={LABEL_CLS}>Client ID</label>
                  <input
                    type="text"
                    value={form.clientId}
                    onChange={(e) => setField('clientId', e.target.value)}
                    placeholder="xxxxxxxxxxxxxxxxxxxx"
                    autoComplete="off"
                    className={INPUT_CLS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Client Secret</label>
                  <div className="relative">
                    <input
                      type={mostrarSecret ? 'text' : 'password'}
                      value={form.clientSecret}
                      onChange={(e) => setField('clientSecret', e.target.value)}
                      placeholder="••••••••••••••••••••"
                      autoComplete="current-password"
                      className={`${INPUT_CLS} pr-9`}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSecret((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      {mostrarSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700" />

            {/* Bloque C — Autorización especial del emisor */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BadgeCheck className="h-4 w-4 text-violet-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Autorización especial del emisor
                </h3>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                Opcional. Se mostrará en la representación impresa de la guía.
              </p>
              <div className="space-y-3">
                <div>
                  <label className={LABEL_CLS}>Entidad autorizadora</label>
                  <select
                    value={form.codigoEntidadAutorizadora}
                    onChange={(e) => setField('codigoEntidadAutorizadora', e.target.value)}
                    className={INPUT_CLS}
                  >
                    <option value="">— Sin autorización especial —</option>
                    {ENTIDADES_VIGENTES.map((ent) => (
                      <option key={ent.codigo} value={ent.codigo}>
                        {ent.abreviatura} — {ent.entidad}
                      </option>
                    ))}
                  </select>
                </div>
                {form.codigoEntidadAutorizadora && (
                  <div>
                    <label className={LABEL_CLS}>Número de autorización</label>
                    <input
                      type="text"
                      value={form.numeroAutorizacion}
                      onChange={(e) => setField('numeroAutorizacion', e.target.value)}
                      placeholder="N.° de autorización emitida"
                      autoComplete="off"
                      className={`${INPUT_CLS}${errorNumAut ? ' border-red-400 dark:border-red-500 focus:ring-red-400' : ''}`}
                    />
                    {errorNumAut && (
                      <p className="text-xs text-red-500 mt-1">{errorNumAut}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Pie */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
            <button
              type="button"
              onClick={onCerrar}
              className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleGuardar()}
              disabled={guardando}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {guardando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {guardando ? 'Guardando…' : textoBoton}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
