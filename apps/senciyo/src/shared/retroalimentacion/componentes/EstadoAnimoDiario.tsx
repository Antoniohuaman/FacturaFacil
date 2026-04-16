import { CheckCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { MAXIMO_COMENTARIO_BREVE_RETROALIMENTACION, OPCIONES_ESTADO_ANIMO } from '../constantes';
import { useFeedback } from '../../feedback/useFeedback';
import { CampoComentarioBreve } from './CampoComentarioBreve';
import { useEstadoEnvioLocal } from '../hooks/useEstadoEnvioLocal';
import { useRetroalimentacion } from '../hooks/useRetroalimentacion';
import { registrarSeleccionEstadoAnimo } from '../integracionAnalitica';
import { normalizarTextoBreve } from '../reglasFrecuencia';
import type { EstadoAnimoId } from '../tipos';

export function EstadoAnimoDiario() {
  const { enviarEstadoAnimo, cerrarPanel } = useRetroalimentacion();
  const feedback = useFeedback();
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<EstadoAnimoId | null>(null);
  const [comentario, setComentario] = useState('');
  const { enviado, enviando, ejecutarEnvioLocal, reiniciarEstadoEnvio } = useEstadoEnvioLocal();

  const opcionSeleccionada = useMemo(
    () => OPCIONES_ESTADO_ANIMO.find((opcion) => opcion.id === estadoSeleccionado) ?? null,
    [estadoSeleccionado],
  );

  const comentarioNormalizado = normalizarTextoBreve(comentario);
  const puedeEnviar = estadoSeleccionado !== null && !enviando;

  const seleccionarEstado = (estado: EstadoAnimoId) => {
    setEstadoSeleccionado((actual) => {
      if (actual !== estado) {
        registrarSeleccionEstadoAnimo(estado);
      }

      return estado;
    });

    if (enviado) {
      reiniciarEstadoEnvio();
    }
  };

  const actualizarComentario = (valor: string) => {
    setComentario(valor);

    if (enviado) {
      reiniciarEstadoEnvio();
    }
  };

  const enviar = async () => {
    if (!estadoSeleccionado) {
      feedback.warning('Selecciona una opción antes de continuar.', 'Retroalimentación');
      return;
    }

    const ok = await ejecutarEnvioLocal(() => enviarEstadoAnimo({
      estado: estadoSeleccionado,
      comentario: comentarioNormalizado || undefined,
    }));

    if (ok === 'omitido') {
      return;
    }

    if (ok === 'fallido') {
      feedback.error('No pudimos guardar tu respuesta. Inténtalo de nuevo.', 'Retroalimentación');
      return;
    }

    setEstadoSeleccionado(null);
    setComentario('');
  };

  if (enviado) {
    return (
      <div className="space-y-5 px-4 py-5">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Gracias por compartir tu estado de ánimo</h3>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={reiniciarEstadoEnvio}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-900 dark:text-slate-200 dark:hover:border-gray-600 dark:hover:bg-gray-800"
          >
            Registrar otro estado
          </button>
          <button
            type="button"
            onClick={cerrarPanel}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 py-4">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">¿Cómo va tu día?</h3>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {OPCIONES_ESTADO_ANIMO.map((opcion) => {
          const activa = opcion.id === estadoSeleccionado;

          return (
            <button
              key={opcion.id}
              type="button"
              onClick={() => seleccionarEstado(opcion.id)}
              disabled={enviando}
              className={`rounded-2xl border px-3 py-3 text-left transition ${activa
                ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-900 dark:text-slate-200 dark:hover:border-gray-600 dark:hover:bg-gray-800'
                }`}
              aria-pressed={activa}
            >
              <div className="text-2xl">{opcion.emoji}</div>
              <div className="mt-2 text-sm font-medium">{opcion.etiqueta}</div>
              <div className={`mt-1 text-xs ${activa ? 'text-white/80 dark:text-slate-700' : 'text-slate-500 dark:text-slate-400'}`}>
                {opcion.descripcion}
              </div>
            </button>
          );
        })}
      </div>

      <CampoComentarioBreve
        etiqueta="Comentario opcional"
        valor={comentario}
        onChange={actualizarComentario}
        placeholder={opcionSeleccionada ? `Si quieres, cuéntanos por qué elegiste “${opcionSeleccionada.etiqueta}”.` : 'Si quieres, agrega un comentario breve.'}
        maximoCaracteres={MAXIMO_COMENTARIO_BREVE_RETROALIMENTACION}
        disabled={enviando}
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={enviar}
          disabled={!puedeEnviar}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
        >
          {enviando ? 'Enviando...' : 'Enviar estado de ánimo'}
        </button>
      </div>
    </div>
  );
}