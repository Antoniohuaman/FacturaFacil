/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
import { useState, useCallback } from 'react';
import { clientesClient } from '../api';
import type { ReniecResponse, SunatResponse } from '../models';
import { useCaja } from '../../control-caja/context/CajaContext';

const DNI_REGEX = /^\d{8}$/;
const RUC_REGEX = /^[12]\d{10}$/;

export const useConsultasExternas = () => {
  const { showToast } = useCaja();
  const [consultingReniec, setConsultingReniec] = useState(false);
  const [consultingSunat, setConsultingSunat] = useState(false);

  /**
   * Consultar DNI en RENIEC
   */
  const consultarReniec = useCallback(async (dni: string): Promise<ReniecResponse | null> => {
    if (!DNI_REGEX.test((dni || '').trim())) {
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
        return response;
      }

      showToast(
        'warning',
        'Consulta RENIEC sin resultados',
        response.message || 'No se pudo obtener información válida desde RENIEC.'
      );

      return null;
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
    if (!RUC_REGEX.test((ruc || '').trim())) {
      showToast('warning', 'RUC inválido', 'Ingrese un RUC válido de 11 dígitos y que comience con 1 o 2');
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
        return response;
      }

      showToast(
        'warning',
        'Consulta SUNAT sin resultados',
        response.message || 'No se pudo obtener información válida desde SUNAT.'
      );

      return null;
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
