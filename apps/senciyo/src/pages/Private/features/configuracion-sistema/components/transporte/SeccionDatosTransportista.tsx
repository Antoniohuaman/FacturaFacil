import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/contasis';
import { useNotifications } from '../compartido/SistemaNotificaciones.contexto';
import type { Company } from '../../modelos/Company';
import type { DatosTransportista, EstadoTransportista } from '../../modelos/Transporte';
import type { IDatosTransportistaDataSource } from '../../api/fuenteDatosTransporte';

interface SeccionDatosTransportistaProps {
  empresa: Company;
  datasource: IDatosTransportistaDataSource;
}

interface FormState {
  numeroRegistroMTC: string;
  estado: EstadoTransportista;
}

export function SeccionDatosTransportista({ empresa, datasource }: SeccionDatosTransportistaProps) {
  const { showSuccess, showError } = useNotifications();
  const [datos, setDatos] = useState<DatosTransportista | null>(null);
  const [form, setForm] = useState<FormState>({ numeroRegistroMTC: '', estado: 'HABILITADO' });
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    datasource.get(empresa.id).then((res) => {
      if (cancelado) return;
      setDatos(res);
      if (res) {
        setForm({ numeroRegistroMTC: res.numeroRegistroMTC, estado: res.estado });
      }
    }).catch(() => {
      if (!cancelado) setError('No se pudieron cargar los datos del transportista.');
    }).finally(() => {
      if (!cancelado) setCargando(false);
    });
    return () => { cancelado = true; };
  }, [datasource, empresa.id]);

  const manejarGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.numeroRegistroMTC.trim()) {
      setError('El número de registro MTC es obligatorio.');
      return;
    }
    setError('');
    setGuardando(true);
    try {
      const resultado = await datasource.save(empresa.id, {
        numeroRegistroMTC: form.numeroRegistroMTC.trim(),
        estado: form.estado,
      });
      setDatos(resultado);
      showSuccess('Datos guardados', 'Los datos del transportista se actualizaron correctamente.');
    } catch {
      showError('Error al guardar', 'No se pudieron guardar los datos del transportista.');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="py-8 text-center text-sm text-gray-400">Cargando datos del transportista…</div>
    );
  }

  return (
    <form onSubmit={manejarGuardar} className="space-y-6 max-w-lg">
      {/* Datos de empresa (solo lectura) */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Datos de empresa</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">RUC</p>
            <p className="text-sm font-mono font-medium text-gray-800">{empresa.ruc}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Razón social</p>
            <p className="text-sm font-medium text-gray-800 truncate" title={empresa.razonSocial}>
              {empresa.razonSocial}
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Estos datos provienen de Datos de Empresa y no se editan desde aquí.
        </p>
      </div>

      {/* Número de registro MTC */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Número de Registro MTC *
        </label>
        <input
          type="text"
          value={form.numeroRegistroMTC}
          onChange={(e) => { setForm((p) => ({ ...p, numeroRegistroMTC: e.target.value })); setError(''); }}
          disabled={guardando}
          placeholder="Número asignado por el MTC"
          className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 disabled:opacity-50 ${
            error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
          }`}
        />
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>

      {/* Estado operativo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Estado operativo</label>
        <select
          value={form.estado}
          onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value as EstadoTransportista }))}
          disabled={guardando}
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50"
        >
          <option value="HABILITADO">Habilitado</option>
          <option value="INACTIVO">Inactivo</option>
        </select>
        <p className="text-xs text-gray-400 mt-1">
          El estado refleja la disponibilidad operativa dentro del sistema. No representa una certificación oficial del MTC ni de SUNAT.
        </p>
      </div>

      {/* Última actualización */}
      {datos?.actualizadoEl && (
        <p className="text-xs text-gray-400">
          Última actualización: {datos.actualizadoEl.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      )}

      <div className="flex justify-end">
        <Button variant="primary" type="submit" disabled={guardando} icon={<Save className="w-4 h-4" />}>
          {guardando ? 'Guardando…' : datos ? 'Actualizar datos' : 'Guardar datos'}
        </Button>
      </div>
    </form>
  );
}
