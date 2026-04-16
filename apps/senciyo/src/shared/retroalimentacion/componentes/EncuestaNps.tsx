import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import {
  MAXIMO_COMENTARIO_BREVE_RETROALIMENTACION,
  PUNTUACION_NPS_MAXIMA,
  PUNTUACION_NPS_MINIMA,
} from '../constantes';
import { useFeedback } from '../../feedback/useFeedback';
import { CampoComentarioBreve } from './CampoComentarioBreve';
import { useEstadoEnvioLocal } from '../hooks/useEstadoEnvioLocal';
import { useRetroalimentacion } from '../hooks/useRetroalimentacion';
import { registrarSeleccionPuntuacionNps } from '../integracionAnalitica';
import { normalizarTextoBreve } from '../reglasFrecuencia';

function describirPuntuacionNps(puntuacion: number | null): string {
  if (puntuacion === null) {
    return 'Selecciona un puntaje para continuar.';
  }

  if (puntuacion <= 6) {
    return `Marcaste ${puntuacion}/10. Señala una experiencia que hoy necesita mejorar.`;
  }

  if (puntuacion <= 8) {
    return `Marcaste ${puntuacion}/10. Si quieres, agrega qué falta para subir ese puntaje.`;
  }

  return `Marcaste ${puntuacion}/10. Si quieres, cuéntanos qué está funcionando bien.`;
}

export function EncuestaNps() {
  const { enviarRespuestaNps, cerrarPanel } = useRetroalimentacion();
  const feedback = useFeedback();
  const [puntuacion, setPuntuacion] = useState<number | null>(null);
  const [comentario, setComentario] = useState('');
  const { enviado, enviando, ejecutarEnvioLocal, reiniciarEstadoEnvio } = useEstadoEnvioLocal();

  const comentarioNormalizado = normalizarTextoBreve(comentario);
  const puedeEnviar = puntuacion !== null && !enviando;

  const seleccionarPuntuacion = (valor: number) => {
    setPuntuacion((actual) => {
      if (actual !== valor) {
        registrarSeleccionPuntuacionNps(valor);
      }

      return valor;
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
    if (puntuacion === null) {
      feedback.warning('Selecciona una puntuación antes de continuar.', 'Encuesta NPS');
      return;
    }

    const ok = await ejecutarEnvioLocal(() => enviarRespuestaNps({
      puntuacion,
      comentario: comentarioNormalizado || undefined,
    }));

    if (!ok) {
      feedback.warning('Revisa tu comentario breve antes de enviarlo.', 'Encuesta NPS');
      return;
    }

    setPuntuacion(null);
    setComentario('');
  };

  if (enviado) {
    return (
      <div className="space-y-5 px-4 py-5">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Gracias por calificar tu experiencia</h3>
              <p className="text-sm text-emerald-800/90 dark:text-emerald-300/90">
                Puedes cerrar el panel o volver a responder si solo estabas explorando esta experiencia.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={reiniciarEstadoEnvio}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-900 dark:text-slate-200 dark:hover:border-gray-600 dark:hover:bg-gray-800"
          >
            Responder otra vez
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
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Encuesta NPS</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Del {PUNTUACION_NPS_MINIMA} al {PUNTUACION_NPS_MAXIMA}, ¿qué tan probable es que recomiendes SenciYo a otra empresa similar a la tuya?
        </p>
      </div>

      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {Array.from({ length: PUNTUACION_NPS_MAXIMA }, (_, index) => index + PUNTUACION_NPS_MINIMA).map((valor) => {
          const activa = puntuacion === valor;

          return (
            <button
              key={valor}
              type="button"
              onClick={() => seleccionarPuntuacion(valor)}
              disabled={enviando}
              className={`rounded-xl border px-0 py-2 text-sm font-semibold transition ${activa
                ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-900 dark:text-slate-200 dark:hover:border-gray-600 dark:hover:bg-gray-800'
                }`}
              aria-pressed={activa}
            >
              {valor}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
        <span>Poco probable</span>
        <span>Muy probable</span>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">{describirPuntuacionNps(puntuacion)}</p>

      {puntuacion !== null && (
        <CampoComentarioBreve
          etiqueta="Comentario opcional"
          valor={comentario}
          onChange={actualizarComentario}
          placeholder="Si quieres, agrega un contexto breve para tu puntuación."
          maximoCaracteres={MAXIMO_COMENTARIO_BREVE_RETROALIMENTACION}
          descripcion="Este comentario es opcional y solo busca contexto breve."
          disabled={enviando}
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {puntuacion === null ? 'Selecciona una puntuación para habilitar el envío.' : 'Listo para enviar.'}
        </p>
        <button
          type="button"
          onClick={enviar}
          disabled={!puedeEnviar}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
        >
          {enviando ? 'Enviando...' : 'Enviar respuesta'}
        </button>
      </div>
    </div>
  );
}