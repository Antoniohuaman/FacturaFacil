import type { GuiaRemision } from '../modelos/GuiaRemision';
import { STORAGE_KEY_GRE } from '../modelos/GuiaRemision';

export interface IGuiasRemisionDataSource {
  list(empresaId: string): Promise<GuiaRemision[]>;
  getById(empresaId: string, id: string): Promise<GuiaRemision | null>;
  save(empresaId: string, guia: GuiaRemision): Promise<GuiaRemision>;
  delete(empresaId: string, id: string): Promise<void>;
}

const coerceDateGRE = (value: unknown): Date => {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
};

class LocalStorageGuiasRemisionDataSource implements IGuiasRemisionDataSource {
  private getKey(empresaId: string): string {
    return `${STORAGE_KEY_GRE}_${empresaId}`;
  }

  private load(empresaId: string): GuiaRemision[] {
    try {
      const raw = localStorage.getItem(this.getKey(empresaId));
      if (!raw) return [];
      const parsed = JSON.parse(raw) as GuiaRemision[];
      return parsed.map((g) => ({
        ...g,
        creadoEl: coerceDateGRE(g.creadoEl),
        actualizadoEl: coerceDateGRE(g.actualizadoEl),
      }));
    } catch {
      return [];
    }
  }

  private persist(empresaId: string, data: GuiaRemision[]): void {
    localStorage.setItem(this.getKey(empresaId), JSON.stringify(data));
  }

  async list(empresaId: string): Promise<GuiaRemision[]> {
    return this.load(empresaId);
  }

  async getById(empresaId: string, id: string): Promise<GuiaRemision | null> {
    return this.load(empresaId).find((g) => g.id === id) ?? null;
  }

  async save(empresaId: string, guia: GuiaRemision): Promise<GuiaRemision> {
    const list = this.load(empresaId);
    const idx = list.findIndex((g) => g.id === guia.id);
    const actualizado: GuiaRemision = { ...guia, actualizadoEl: new Date() };
    if (idx === -1) {
      this.persist(empresaId, [actualizado, ...list]);
    } else {
      this.persist(empresaId, list.map((g) => (g.id === guia.id ? actualizado : g)));
    }
    return actualizado;
  }

  async delete(empresaId: string, id: string): Promise<void> {
    this.persist(empresaId, this.load(empresaId).filter((g) => g.id !== id));
  }
}

export const guiasRemisionDataSource: IGuiasRemisionDataSource =
  new LocalStorageGuiasRemisionDataSource();
