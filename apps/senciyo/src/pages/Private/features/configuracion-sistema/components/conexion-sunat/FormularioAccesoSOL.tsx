import { useState, useEffect } from 'react';
import { Eye, EyeOff, Save } from 'lucide-react';
import { Button } from '@/contasis';
import { useNotifications } from '../compartido/SistemaNotificaciones.contexto';
import type { IConexionSunatDataSource } from '../../api/fuenteDatosConexionSunat';
import type { AccesoSOL } from '../../modelos/ConexionSunat';

interface FormularioAccesoSOLProps {
  empresaId: string;
  datasource: IConexionSunatDataSource;
}

interface FormState {
  usuarioSOL: string;
  claveSOL: string;
}

interface FormErrors {
  usuarioSOL?: string;
  claveSOL?: string;
}

function validar(form: FormState): FormErrors {
  const e: FormErrors = {};
  if (!form.usuarioSOL.trim()) e.usuarioSOL = 'El usuario SOL es obligatorio.';
  if (!form.claveSOL.trim()) e.claveSOL = 'La clave SOL es obligatoria.';
  return e;
}

export function FormularioAccesoSOL({ empresaId, datasource }: FormularioAccesoSOLProps) {
  const { showSuccess, showError } = useNotifications();
  const [form, setForm] = useState<FormState>({ usuarioSOL: '', claveSOL: '' });
  const [errores, setErrores] = useState<FormErrors>({});
  const [mostrarClave, setMostrarClave] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [configurado, setConfigurado] = useState(false);
  const [actualizadoEl, setActualizadoEl] = useState<Date | null>(null);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    datasource.get(empresaId).then((conexion) => {
      if (cancelado) return;
      if (conexion?.accesoSOL) {
        setForm({
          usuarioSOL: conexion.accesoSOL.usuarioSOL,
          claveSOL: conexion.accesoSOL.claveSOL,
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
      const input: AccesoSOL = {
        usuarioSOL: form.usuarioSOL.trim(),
        claveSOL: form.claveSOL.trim(),
      };
      const resultado = await datasource.saveAccesoSOL(empresaId, input);
      setConfigurado(true);
      setActualizadoEl(resultado.actualizadoEl);
      showSuccess('Credenciales guardadas', 'El acceso SOL se guardó correctamente.');
    } catch {
      showError('Error al guardar', 'No se pudieron guardar las credenciales SOL.');
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
          Nunca compartas estas credenciales.
        </p>
      </div>

      {/* Usuario SOL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Usuario SOL *
        </label>
        <input
          type="text"
          value={form.usuarioSOL}
          onChange={(e) => set('usuarioSOL', e.target.value)}
          disabled={guardando}
          autoComplete="off"
          spellCheck={false}
          placeholder="Usuario de acceso SUNAT"
          className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 disabled:opacity-50 ${
            errores.usuarioSOL ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
          }`}
        />
        {errores.usuarioSOL && (
          <p className="text-xs text-red-600 mt-1">{errores.usuarioSOL}</p>
        )}
      </div>

      {/* Clave SOL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Clave SOL *
        </label>
        <div className="relative">
          <input
            type={mostrarClave ? 'text' : 'password'}
            value={form.claveSOL}
            onChange={(e) => set('claveSOL', e.target.value)}
            disabled={guardando}
            autoComplete="new-password"
            placeholder="Clave de acceso SUNAT"
            className={`w-full text-sm border rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 disabled:opacity-50 ${
              errores.claveSOL ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          <button
            type="button"
            onClick={() => setMostrarClave((v) => !v)}
            disabled={guardando}
            className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600 disabled:opacity-50"
            tabIndex={-1}
          >
            {mostrarClave ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errores.claveSOL && (
          <p className="text-xs text-red-600 mt-1">{errores.claveSOL}</p>
        )}
      </div>

      {actualizadoEl && (
        <p className="text-xs text-gray-400">
          Última actualización: {actualizadoEl.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      )}

      <div className="flex justify-end">
        <Button variant="primary" type="submit" disabled={guardando} icon={<Save className="w-4 h-4" />}>
          {guardando ? 'Guardando…' : configurado ? 'Actualizar acceso SOL' : 'Guardar acceso SOL'}
        </Button>
      </div>
    </form>
  );
}
