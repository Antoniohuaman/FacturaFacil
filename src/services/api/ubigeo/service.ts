import { httpClient } from '../http-client';
import type { Departamento, Provincia, Distrito } from './types';

export const ubigeoService = {
  async getDepartamentos(): Promise<Departamento[]> {
    try {
      const response = await httpClient.get<{ data: Departamento[]; message: string }>('/ubigeo/departamentos');
      return Array.isArray(response.data?.data) ? response.data.data : [];
    } catch (error) {
      console.error('Error en getDepartamentos:', error);
      return [];
    }
  },

  async getProvincias(codigoDepartamento: string): Promise<Provincia[]> {
    try {
      const response = await httpClient.get<{ data: Provincia[]; message: string }>(
        '/ubigeo/provincias',
        { codigoDepartamento }
      );
      return Array.isArray(response.data?.data) ? response.data.data : [];
    } catch (error) {
      console.error('Error en getProvincias:', error);
      return [];
    }
  },

  async getDistritos(
    codigoDepartamento: string,
    codigoProvincia: string
  ): Promise<Distrito[]> {
    try {
      const response = await httpClient.get<{ data: Distrito[]; message: string }>(
        '/ubigeo/distritos',
        { codigoDepartamento, codigoProvincia }
      );
      return Array.isArray(response.data?.data) ? response.data.data : [];
    } catch (error) {
      console.error('Error en getDistritos:', error);
      return [];
    }
  }
};
