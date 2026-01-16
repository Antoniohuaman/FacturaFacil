// Data source interface and implementation for Cajas (Cash Registers)
// Follows Dependency Inversion Principle (SOLID) - UI depends on interface, not implementation

import type { Caja, CreateCajaInput, UpdateCajaInput } from '../models/Caja';

/**
 * Interface defining all data operations for Cajas
 * Allows easy swapping between LocalStorage, REST API, or other implementations
 */
export interface ICajasDataSource {
  /**
   * List all cajas for a specific company and establishment
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
   * Validation: Only allows deletion if habilitada === false AND tieneHistorial === false
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
      const parsed = JSON.parse(data) as Caja[];
      // Convert date strings back to Date objects
      return parsed.map(caja => ({
        ...caja,
        createdAt: new Date(caja.createdAt),
        updatedAt: new Date(caja.updatedAt)
      }));
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
    
    // Use establecimientoId from input (user can select different establishment)
    const targetEstablishmentId = input.establecimientoId;
    const cajas = this.loadData(empresaId, targetEstablishmentId);
    
    const newCaja: Caja = {
      id: crypto.randomUUID(),
      empresaId,
      establecimientoId: targetEstablishmentId,
      nombre: input.nombre,
      monedaId: input.monedaId,
      mediosPagoPermitidos: input.mediosPagoPermitidos,
      limiteMaximo: input.limiteMaximo,
      margenDescuadre: input.margenDescuadre,
      habilitada: input.habilitada,
      usuariosAutorizados: input.usuariosAutorizados || [],
      dispositivos: input.dispositivos,
      observaciones: input.observaciones,
      tieneHistorial: false, // New cajas start with no history
      tieneSesionAbierta: false, // New cajas start with no active session
      createdAt: new Date(),
      updatedAt: new Date()
    };

    cajas.push(newCaja);
    this.saveData(empresaId, targetEstablishmentId, cajas);
    
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
      establecimientoId,
      updatedAt: new Date()
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
      habilitada: !cajas[index].habilitada,
      updatedAt: new Date()
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
    if (caja.habilitada) {
      throw new Error('La caja está habilitada.');
    }

    if (caja.tieneHistorial) {
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
