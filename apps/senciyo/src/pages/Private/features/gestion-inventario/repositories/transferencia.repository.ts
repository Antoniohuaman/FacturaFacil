// src/features/gestion-inventario/repositories/transferencia.repository.ts

import type { Transferencia } from '../models/transferencia.types';
import { lsKey } from '../../../../../shared/tenant';

const STORAGE_KEY = 'facturafacil_transferencias';

/**
 * Clave base de la colección, expuesta para el motor de Etapa 1E
 * (`utils/transferenciaCuantitativaInventario.ts` / `utils/reversoCuantitativoInventario.ts`),
 * que necesita leer/escribir esta MISMA colección como parte de un `PlanUnidadTrabajoInventario`
 * atómico (vía `lsKey(CLAVE_COLECCION_TRANSFERENCIAS, empresaId)`, con `empresaId` explícito —
 * a diferencia de este repositorio legacy, que todavía resuelve el tenant activo implícitamente).
 */
export const CLAVE_COLECCION_TRANSFERENCIAS = STORAGE_KEY;

export class TransferenciaRepository {
  static getAll(): Transferencia[] {
    try {
      const key = lsKey(STORAGE_KEY);
      const data = localStorage.getItem(key);
      if (!data) return [];
      const parsed = JSON.parse(data) as Transferencia[];
      return parsed.map(t => ({
        ...t,
        fecha: new Date(t.fecha),
        fechaDespacho: t.fechaDespacho ? new Date(t.fechaDespacho) : undefined,
        fechaRecepcion: t.fechaRecepcion ? new Date(t.fechaRecepcion) : undefined,
        fechaAnulacion: t.fechaAnulacion ? new Date(t.fechaAnulacion) : undefined,
      }));
    } catch {
      return [];
    }
  }

  private static saveAll(items: Transferencia[]): void {
    localStorage.setItem(lsKey(STORAGE_KEY), JSON.stringify(items));
  }

  static upsert(transferencia: Transferencia): void {
    const all = this.getAll();
    const idx = all.findIndex(t => t.id === transferencia.id);
    if (idx >= 0) {
      all[idx] = transferencia;
    } else {
      all.push(transferencia);
    }
    this.saveAll(all);
  }

  static getById(id: string): Transferencia | undefined {
    return this.getAll().find(t => t.id === id);
  }
}
