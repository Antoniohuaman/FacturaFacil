import type { ConexionSunat, UpdateAccesoSOLInput, UpdateCredencialesGREInput } from '../modelos/ConexionSunat';

const STORAGE_PREFIX = 'facturafacil_conexion_sunat';

export interface IConexionSunatDataSource {
  get(empresaId: string): Promise<ConexionSunat | null>;
  saveAccesoSOL(empresaId: string, input: UpdateAccesoSOLInput): Promise<ConexionSunat>;
  saveCredencialesGRE(empresaId: string, input: UpdateCredencialesGREInput): Promise<ConexionSunat>;
}

export class LocalStorageConexionSunatDataSource implements IConexionSunatDataSource {
  private getKey(empresaId: string): string {
    return `${STORAGE_PREFIX}_${empresaId}`;
  }

  private load(empresaId: string): ConexionSunat | null {
    try {
      const raw = localStorage.getItem(this.getKey(empresaId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as ConexionSunat;
      return {
        ...parsed,
        actualizadoEl: new Date(parsed.actualizadoEl),
      };
    } catch {
      return null;
    }
  }

  private save(data: ConexionSunat): void {
    try {
      localStorage.setItem(this.getKey(data.empresaId), JSON.stringify(data));
    } catch {
      // silencioso: no exponer ni relanzar con datos de credenciales
    }
  }

  async get(empresaId: string): Promise<ConexionSunat | null> {
    return this.load(empresaId);
  }

  async saveAccesoSOL(empresaId: string, input: UpdateAccesoSOLInput): Promise<ConexionSunat> {
    const existing = this.load(empresaId);
    const updated: ConexionSunat = {
      id: existing?.id ?? `conexion-${empresaId}`,
      empresaId,
      accesoSOL: { usuarioSOL: input.usuarioSOL, claveSOL: input.claveSOL },
      credencialesGRE: existing?.credencialesGRE,
      actualizadoEl: new Date(),
    };
    this.save(updated);
    return updated;
  }

  async saveCredencialesGRE(empresaId: string, input: UpdateCredencialesGREInput): Promise<ConexionSunat> {
    const existing = this.load(empresaId);
    const updated: ConexionSunat = {
      id: existing?.id ?? `conexion-${empresaId}`,
      empresaId,
      accesoSOL: existing?.accesoSOL,
      credencialesGRE: { clientId: input.clientId, clientSecret: input.clientSecret },
      actualizadoEl: new Date(),
    };
    this.save(updated);
    return updated;
  }
}

export const conexionSunatDataSource: IConexionSunatDataSource = new LocalStorageConexionSunatDataSource();
