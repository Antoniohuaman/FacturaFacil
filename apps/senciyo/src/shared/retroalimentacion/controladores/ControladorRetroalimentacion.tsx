import { useEffect, useRef } from 'react';
import { DIAS_MINIMOS_ENTRE_ENCUESTAS_NPS, HABILITAR_NPS_AUTOMATICO } from '../constantes';
import { useRetroalimentacion } from '../hooks/useRetroalimentacion';
import { puedeMostrarEncuestaNps } from '../reglasFrecuencia';

export function ControladorRetroalimentacion() {
  const { panelAbierto, solicitarEncuestaNps, ultimaRespuestaNpsEn } = useRetroalimentacion();
  const evaluadoRef = useRef(false);

  useEffect(() => {
    if (evaluadoRef.current || panelAbierto) {
      return;
    }

    evaluadoRef.current = true;

    if (!puedeMostrarEncuestaNps({
      habilitado: HABILITAR_NPS_AUTOMATICO,
      ahora: new Date(),
      ultimaRespuestaNpsEn,
      diasMinimosEntreEncuestas: DIAS_MINIMOS_ENTRE_ENCUESTAS_NPS,
    })) {
      return;
    }

    solicitarEncuestaNps();
  }, [panelAbierto, solicitarEncuestaNps, ultimaRespuestaNpsEn]);

  return null;
}