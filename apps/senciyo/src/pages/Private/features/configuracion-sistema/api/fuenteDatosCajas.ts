// Data source interface and implementation for Cajas (Cash Registers)
// Follows Dependency Inversion Principle (SOLID) - UI depends on interface, not implementation

import type { Caja, CreateCajaInput, UpdateCajaInput } from '../modelos/Caja';

const coerceDateValue = (value: unknown): Date | undefined => {
  if (value instanceof Date) {
    return new Date(value);
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const candidate = new Date(value);
    return Number.isNaN(candidate.getTime()) ? undefined : candidate;
  }
  return undefined;
};

/**
 * Interface defining all data operations for Cajas
 * Allows easy swapping between LocalStorage, REST API, or other implementations
 */
export interface ICajasDataSource {
  /**
   * List all cajas for a specific company and Establecimiento
   */
  list(empresaId: string, establecimientoId: string): Promise<Caja[]>;

  /**
   * Get a specific caja by ID
   */
  getById(empresaId: string, establecimientoId: string, id: string): Promise<Caja | null>;

  /**
   * Create a new caja
   */
  create(empresaId: string, establecimientoId: string, input: CreateCajaInput): Promise<Caja>;

  /**
   * Update an existing caja
   */
  update(empresaId: string, establecimientoId: string, id: string, input: UpdateCajaInput): Promise<Caja>;

  /**
   * Toggle enabled/disabled state of a caja
   */
  toggleEnabled(empresaId: string, establecimientoId: string, id: string): Promise<Caja>;

  /**
   * Delete a caja
   * Validation: Only allows deletion if habilitadaCaja === false AND tieneHistorialMovimientos === false
   * @throws Error if caja is enabled or has history
   */
  delete(empresaId: string, establecimientoId: string, id: string): Promise<void>;
}

/**
 * LocalStorage implementation of ICajasDataSource
 * Data is namespaced by empresaId and establecimientoId
 * No hardcoded data - app starts empty
 */
export class LocalStorageCajasDataSource implements ICajasDataSource {
  private readonly storageKey = 'facturafacil_cajas';

  private getStorageKey(empresaId: string, establecimientoId: string): string {
    return `${this.storageKey}_${empresaId}_${establecimientoId}`;
  }

  private loadData(empresaId: string, establecimientoId: string): Caja[] {
    const key = this.getStorageKey(empresaId, establecimientoId);
    const data = localStorage.getItem(key);
    if (!data) return [];
    
    try {
      type LegacyCajaRecord = Partial<Caja> & Record<string, unknown>;
      const parsed = JSON.parse(data) as LegacyCajaRecord[];
      return parsed.map((caja) => {
        const createdAt = coerceDateValue(caja.creadoElCaja) ?? coerceDateValue(caja.createdAt) ?? new Date();
        const updatedAt = coerceDateValue(caja.actualizadoElCaja) ?? coerceDateValue(caja.updatedAt) ?? new Date();

        return {
          ...caja,
          establecimientoIdCaja: caja.establecimientoIdCaja ?? caja.establecimientoId ?? '',
          nombreCaja: caja.nombreCaja ?? caja.nombre ?? '',
          monedaIdCaja: caja.monedaIdCaja ?? caja.monedaId ?? '',
          limiteMaximoCaja: caja.limiteMaximoCaja ?? caja.limiteMaximo ?? 0,
          margenDescuadreCaja: caja.margenDescuadreCaja ?? caja.margenDescuadre ?? 0,
          habilitadaCaja: caja.habilitadaCaja ?? caja.habilitada ?? false,
          usuariosAutorizadosCaja: caja.usuariosAutorizadosCaja ?? caja.usuariosAutorizados ?? [],
          dispositivosCaja: caja.dispositivosCaja ?? caja.dispositivos,
          observacionesCaja: caja.observacionesCaja ?? caja.observaciones,
          tieneHistorialMovimientos: caja.tieneHistorialMovimientos ?? caja.tieneHistorial ?? false,
          tieneSesionAbierta: caja.tieneSesionAbierta ?? false,
          creadoElCaja: createdAt,
          actualizadoElCaja: updatedAt
        } as Caja;
      });
    } catch {
      return [];
    }
  }

  private saveData(empresaId: string, establecimientoId: string, cajas: Caja[]): void {
    const key = this.getStorageKey(empresaId, establecimientoId);
    localStorage.setItem(key, JSON.stringify(cajas));
  }

  async list(empresaId: string, establecimientoId: string): Promise<Caja[]> {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 50));
    return this.loadData(empresaId, establecimientoId);
  }

  async getById(empresaId: string, establecimientoId: string, id: string): Promise<Caja | null> {
    await new Promise(resolve => setTimeout(resolve, 50));
    const cajas = this.loadData(empresaId, establecimientoId);
    return cajas.find(c => c.id === id) || null;
  }

  async create(empresaId: string, _establecimientoId: string, input: CreateCajaInput): Promise<Caja> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Use establecimientoId from input (user can select different Establecimiento)
    const targetEstablecimientoId = input.establecimientoIdCaja;
    const cajas = this.loadData(empresaId, targetEstablecimientoId);
    
    const newCaja: Caja = {
      id: crypto.randomUUID(),
      empresaId,
      establecimientoIdCaja: targetEstablecimientoId,
      nombreCaja: input.nombreCaja,
      monedaIdCaja: input.monedaIdCaja,
      mediosPagoPermitidos: input.mediosPagoPermitidos,
      limiteMaximoCaja: input.limiteMaximoCaja,
      margenDescuadreCaja: input.margenDescuadreCaja,
      habilitadaCaja: input.habilitadaCaja,
      usuariosAutorizadosCaja: input.usuariosAutorizadosCaja || [],
      dispositivosCaja: input.dispositivosCaja,
      observacionesCaja: input.observacionesCaja,
      tieneHistorialMovimientos: false, // New cajas start with no history
      tieneSesionAbierta: false, // New cajas start with no active session
      creadoElCaja: new Date(),
      actualizadoElCaja: new Date()
    };

    cajas.push(newCaja);
    this.saveData(empresaId, targetEstablecimientoId, cajas);
    
    return newCaja;
  }

  async update(empresaId: string, establecimientoId: string, id: string, input: UpdateCajaInput): Promise<Caja> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const cajas = this.loadData(empresaId, establecimientoId);
    const index = cajas.findIndex(c => c.id === id);
    
    if (index === -1) {
      throw new Error(`Caja with id ${id} not found`);
    }

    const updatedCaja: Caja = {
      ...cajas[index],
      ...input,
      id, // Ensure ID doesn't change
      empresaId, // Ensure scope doesn't change
      establecimientoIdCaja: establecimientoId,
      actualizadoElCaja: new Date()
    };

    cajas[index] = updatedCaja;
    this.saveData(empresaId, establecimientoId, cajas);
    
    return updatedCaja;
  }

  async toggleEnabled(empresaId: string, establecimientoId: string, id: string): Promise<Caja> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const cajas = this.loadData(empresaId, establecimientoId);
    const index = cajas.findIndex(c => c.id === id);
    
    if (index === -1) {
      throw new Error(`Caja with id ${id} not found`);
    }

    cajas[index] = {
      ...cajas[index],
      habilitadaCaja: !cajas[index].habilitadaCaja,
      actualizadoElCaja: new Date()
    };

    this.saveData(empresaId, establecimientoId, cajas);
    
    return cajas[index];
  }

  async delete(empresaId: string, establecimientoId: string, id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const cajas = this.loadData(empresaId, establecimientoId);
    const caja = cajas.find(c => c.id === id);
    
    if (!caja) {
      throw new Error(`Caja with id ${id} not found`);
    }

    // Validation rule: can only delete if disabled AND has no history
    if (caja.habilitadaCaja) {
      throw new Error('La caja está habilitada.');
    }

    if (caja.tieneHistorialMovimientos) {
      throw new Error('La caja ya tiene historial de uso.');
    }

    if (caja.tieneSesionAbierta) {
      throw new Error('La caja tiene una sesión abierta. Cierra la sesión antes de eliminar.');
    }
    
    const filtered = cajas.filter(c => c.id !== id);
    this.saveData(empresaId, establecimientoId, filtered);
  }
}

/**
 * Default data source instance
 * Can be replaced with REST implementation by creating a new class implementing ICajasDataSource
 */
export const cajasDataSource: ICajasDataSource = new LocalStorageCajasDataSource();

/* 
 * ============================================================================
 * FUTURE REST API IMPLEMENTATION (COMMENTED - NOT USED YET)
 * ============================================================================
 * 
 * When backend is ready, create RestCajasDataSource implementing ICajasDataSource:
 * 
 * GET    /api/config/cajas?empresaId={id}&establecimientoId={id}
 *        → Returns: Caja[]
 * 
 * GET    /api/config/cajas/{id}?empresaId={id}&establecimientoId={id}
 *        → Returns: Caja
 * 
 * POST   /api/config/cajas
 *        Body: { empresaId, establecimientoId, ...CreateCajaInput }
 *        → Returns: Caja
 * 
 * PUT    /api/config/cajas/{id}
 *        Body: { empresaId, establecimientoId, ...UpdateCajaInput }
 *        → Returns: Caja
 * 
 * PATCH  /api/config/cajas/{id}/toggle-enabled
 *        Body: { empresaId, establecimientoId }
 *        → Returns: Caja
 * 
 * DELETE /api/config/cajas/{id}?empresaId={id}&establecimientoId={id}
 *        → Returns: 204 No Content
 * 
 * Example implementation:
 * 
 * export class RestCajasDataSource implements ICajasDataSource {
 *   private baseUrl = '/api/config/cajas';
 * 
 *   async list(empresaId: string, establecimientoId: string): Promise<Caja[]> {
 *     const response = await fetch(
 *       `${this.baseUrl}?empresaId=${empresaId}&establecimientoId=${establecimientoId}`
 *     );
 *     return response.json();
 *   }
 * 
 *   // ... implement other methods
 * }
 * 
 * Then simply replace:
 *   export const cajasDataSource: ICajasDataSource = new RestCajasDataSource();
 * 
 * No UI changes needed!
 */
