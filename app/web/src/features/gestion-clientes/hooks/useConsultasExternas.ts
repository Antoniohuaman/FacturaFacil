/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
import { useState, useCallback } from 'react';
import { clientesClient } from '../api';
import type { ReniecResponse, SunatResponse } from '../models';
import { useCaja } from '../../control-caja/context/CajaContext';

export const useConsultasExternas = () => {
  const { showToast } = useCaja();
  const [consultingReniec, setConsultingReniec] = useState(false);
  const [consultingSunat, setConsultingSunat] = useState(false);

  /**
   * Consultar DNI en RENIEC
   */
  const consultarReniec = useCallback(async (dni: string): Promise<ReniecResponse | null> => {
    if (!dni || dni.length !== 8) {
      showToast('warning', 'DNI inválido', 'Ingrese un DNI válido de 8 dígitos');
      return null;
    }

    setConsultingReniec(true);

    try {
      const response = await clientesClient.consultarReniec(dni);

      if (response.success && response.data) {
        showToast(
          'success',
          '¡Datos obtenidos!',
          `Consulta RENIEC exitosa para ${response.data.nombreCompleto}`
        );
      }

      return response;
    } catch (err: any) {
      const errorMessage = err.message || 'Error al consultar RENIEC';
      showToast('error', 'Error en consulta RENIEC', errorMessage);
      return null;
    } finally {
      setConsultingReniec(false);
    }
  }, [showToast]);

  /**
   * Consultar RUC en SUNAT
   */
  const consultarSunat = useCallback(async (ruc: string): Promise<SunatResponse | null> => {
    if (!ruc || ruc.length !== 11) {
      showToast('warning', 'RUC inválido', 'Ingrese un RUC válido de 11 dígitos');
      return null;
    }

    setConsultingSunat(true);

    try {
      const response = await clientesClient.consultarSunat(ruc);

      if (response.success && response.data) {
        showToast(
          'success',
          '¡Datos obtenidos!',
          `Consulta SUNAT exitosa para ${response.data.razonSocial}`
        );
      }

      return response;
    } catch (err: any) {
      const errorMessage = err.message || 'Error al consultar SUNAT';
      showToast('error', 'Error en consulta SUNAT', errorMessage);
      return null;
    } finally {
      setConsultingSunat(false);
    }
  }, [showToast]);

  return {
    consultingReniec,
    consultingSunat,
    consultarReniec,
    consultarSunat,
  };
};
