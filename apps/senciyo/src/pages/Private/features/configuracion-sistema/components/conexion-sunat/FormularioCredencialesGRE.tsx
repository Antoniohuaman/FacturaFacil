import { useState, useEffect } from 'react';
import { Eye, EyeOff, Save } from 'lucide-react';
import { Button } from '@/contasis';
import { useNotifications } from '../compartido/SistemaNotificaciones.contexto';
import type { IConexionSunatDataSource } from '../../api/fuenteDatosConexionSunat';
import type { CredencialesGRE } from '../../modelos/ConexionSunat';

interface FormularioCredencialesGREProps {
  empresaId: string;
  datasource: IConexionSunatDataSource;
}

interface FormState {
  clientId: string;
  clientSecret: string;
}

interface FormErrors {
  clientId?: string;
  clientSecret?: string;
}

function validar(form: FormState): FormErrors {
  const e: FormErrors = {};
  if (!form.clientId.trim()) e.clientId = 'El Client ID es obligatorio.';
  if (!form.clientSecret.trim()) e.clientSecret = 'El Client Secret es obligatorio.';
  return e;
}

export function FormularioCredencialesGRE({ empresaId, datasource }: FormularioCredencialesGREProps) {
  const { showSuccess, showError } = useNotifications();
  const [form, setForm] = useState<FormState>({ clientId: '', clientSecret: '' });
  const [errores, setErrores] = useState<FormErrors>({});
  const [mostrarSecret, setMostrarSecret] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [configurado, setConfigurado] = useState(false);
  const [actualizadoEl, setActualizadoEl] = useState<Date | null>(null);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    datasource.get(empresaId).then((conexion) => {
      if (cancelado) return;
      if (conexion?.credencialesGRE) {
        setForm({
          clientId: conexion.credencialesGRE.clientId,
          clientSecret: conexion.credencialesGRE.clientSecret,
        });
        setConfigurado(true);
        setActualizadoEl(conexion.actualizadoEl);
      }
    }).catch(() => {
      /* no exponer error de lectura de credenciales */
    }).finally(() => {
      if (!cancelado) setCargando(false);
    });
    return () => { cancelado = true; };
  }, [datasource, empresaId]);

  const set = (campo: keyof FormState, valor: string) => {
    const next = { ...form, [campo]: valor };
    setForm(next);
    const err = validar(next);
    setErrores((prev) => ({ ...prev, [campo]: err[campo] }));
  };

  const manejarGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validar(form);
    if (Object.keys(err).length > 0) {
      setErrores(err);
      return;
    }
    setGuardando(true);
    try {
      const input: CredencialesGRE = {
        clientId: form.clientId.trim(),
        clientSecret: form.clientSecret.trim(),
      };
      const resultado = await datasource.saveCredencialesGRE(empresaId, input);
      setConfigurado(true);
      setActualizadoEl(resultado.actualizadoEl);
      showSuccess('Credenciales guardadas', 'Las credenciales GRE se guardaron correctamente.');
    } catch {
      showError('Error al guardar', 'No se pudieron guardar las credenciales GRE.');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return <div className="py-8 text-center text-sm text-gray-400">Cargando configuración…</div>;
  }

  return (
    <form onSubmit={manejarGuardar} className="space-y-5 max-w-md">
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        <p className="text-xs text-amber-700">
          Las credenciales se almacenan localmente en este dispositivo y no se transmiten a ningún servidor externo en esta versión.
          Estas credenciales son requeridas para la comunicación OAuth 2.0 con el API de SUNAT para la emisión de GRE.
        </p>
      </div>

      {/* Client ID */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Client ID *
        </label>
        <input
          type="text"
          value={form.clientId}
          onChange={(e) => set('clientId', e.target.value)}
          disabled={guardando}
          autoComplete="off"
          spellCheck={false}
          placeholder="Identificador de cliente OAuth 2.0"
          className={`w-full text-sm border rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 disabled:opacity-50 ${
            errores.clientId ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
          }`}
        />
        {errores.clientId && (
          <p className="text-xs text-red-600 mt-1">{errores.clientId}</p>
        )}
      </div>

      {/* Client Secret */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Client Secret *
        </label>
        <div className="relative">
          <input
            type={mostrarSecret ? 'text' : 'password'}
            value={form.clientSecret}
            onChange={(e) => set('clientSecret', e.target.value)}
            disabled={guardando}
            autoComplete="new-password"
            placeholder="Clave secreta OAuth 2.0"
            className={`w-full text-sm border rounded-lg px-3 py-2 pr-10 font-mono focus:outline-none focus:ring-2 disabled:opacity-50 ${
              errores.clientSecret ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          <button
            type="button"
            onClick={() => setMostrarSecret((v) => !v)}
            disabled={guardando}
            className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600 disabled:opacity-50"
            tabIndex={-1}
          >
            {mostrarSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errores.clientSecret && (
          <p className="text-xs text-red-600 mt-1">{errores.clientSecret}</p>
        )}
      </div>

      {actualizadoEl && (
        <p className="text-xs text-gray-400">
          Última actualización: {actualizadoEl.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      )}

      <div className="flex justify-end">
        <Button variant="primary" type="submit" disabled={guardando} icon={<Save className="w-4 h-4" />}>
          {guardando ? 'Guardando…' : configurado ? 'Actualizar credenciales GRE' : 'Guardar credenciales GRE'}
        </Button>
      </div>
    </form>
  );
}
