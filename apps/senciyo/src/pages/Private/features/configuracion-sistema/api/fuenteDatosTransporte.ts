import type {
  Conductor,
  CreateConductorInput,
  UpdateConductorInput,
  Vehiculo,
  CreateVehiculoInput,
  UpdateVehiculoInput,
  DatosTransportista,
  UpdateDatosTransportistaInput,
} from '../modelos/Transporte';

// ─────────────────────────────────────────────────────────────
// Conductores
// ─────────────────────────────────────────────────────────────

const CONDUCTORES_PREFIX = 'facturafacil_conductores';
const VEHICULOS_PREFIX = 'facturafacil_vehiculos';
const TRANSPORTISTA_PREFIX = 'facturafacil_transportista';

export interface IConductoresDataSource {
  list(empresaId: string): Promise<Conductor[]>;
  getById(empresaId: string, id: string): Promise<Conductor | null>;
  create(empresaId: string, input: CreateConductorInput): Promise<Conductor>;
  update(empresaId: string, id: string, input: UpdateConductorInput): Promise<Conductor>;
  toggleEstado(empresaId: string, id: string): Promise<Conductor>;
}

export interface IVehiculosDataSource {
  list(empresaId: string): Promise<Vehiculo[]>;
  getById(empresaId: string, id: string): Promise<Vehiculo | null>;
  create(empresaId: string, input: CreateVehiculoInput): Promise<Vehiculo>;
  update(empresaId: string, id: string, input: UpdateVehiculoInput): Promise<Vehiculo>;
  toggleEstado(empresaId: string, id: string): Promise<Vehiculo>;
}

export interface IDatosTransportistaDataSource {
  get(empresaId: string): Promise<DatosTransportista | null>;
  save(empresaId: string, input: UpdateDatosTransportistaInput): Promise<DatosTransportista>;
}

// ─── LocalStorage: Conductores ──────────────────────────────

const coerceDateTransporte = (value: unknown): Date => {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
};

export class LocalStorageConductoresDataSource implements IConductoresDataSource {
  private getKey(empresaId: string): string {
    return `${CONDUCTORES_PREFIX}_${empresaId}`;
  }

  private load(empresaId: string): Conductor[] {
    try {
      const raw = localStorage.getItem(this.getKey(empresaId));
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Conductor[];
      return parsed.map((c) => ({
        ...c,
        creadoEl: coerceDateTransporte(c.creadoEl),
        actualizadoEl: coerceDateTransporte(c.actualizadoEl),
      }));
    } catch {
      return [];
    }
  }

  private persist(empresaId: string, data: Conductor[]): void {
    localStorage.setItem(this.getKey(empresaId), JSON.stringify(data));
  }

  async list(empresaId: string): Promise<Conductor[]> {
    return this.load(empresaId);
  }

  async getById(empresaId: string, id: string): Promise<Conductor | null> {
    return this.load(empresaId).find((c) => c.id === id) ?? null;
  }

  async create(empresaId: string, input: CreateConductorInput): Promise<Conductor> {
    const list = this.load(empresaId);
    const ahora = new Date();
    const nuevo: Conductor = {
      id: crypto.randomUUID(),
      empresaId,
      ...input,
      creadoEl: ahora,
      actualizadoEl: ahora,
    };
    this.persist(empresaId, [...list, nuevo]);
    return nuevo;
  }

  async update(empresaId: string, id: string, input: UpdateConductorInput): Promise<Conductor> {
    const list = this.load(empresaId);
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Conductor no encontrado');
    const actualizado: Conductor = { ...list[idx], ...input, actualizadoEl: new Date() };
    const updated = list.map((c) => (c.id === id ? actualizado : c));
    this.persist(empresaId, updated);
    return actualizado;
  }

  async toggleEstado(empresaId: string, id: string): Promise<Conductor> {
    const list = this.load(empresaId);
    const item = list.find((c) => c.id === id);
    if (!item) throw new Error('Conductor no encontrado');
    return this.update(empresaId, id, {
      estado: item.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO',
    });
  }
}

// ─── LocalStorage: Vehículos ────────────────────────────────

export class LocalStorageVehiculosDataSource implements IVehiculosDataSource {
  private getKey(empresaId: string): string {
    return `${VEHICULOS_PREFIX}_${empresaId}`;
  }

  private load(empresaId: string): Vehiculo[] {
    try {
      const raw = localStorage.getItem(this.getKey(empresaId));
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Vehiculo[];
      return parsed.map((v) => ({
        ...v,
        creadoEl: coerceDateTransporte(v.creadoEl),
        actualizadoEl: coerceDateTransporte(v.actualizadoEl),
      }));
    } catch {
      return [];
    }
  }

  private persist(empresaId: string, data: Vehiculo[]): void {
    localStorage.setItem(this.getKey(empresaId), JSON.stringify(data));
  }

  async list(empresaId: string): Promise<Vehiculo[]> {
    return this.load(empresaId);
  }

  async getById(empresaId: string, id: string): Promise<Vehiculo | null> {
    return this.load(empresaId).find((v) => v.id === id) ?? null;
  }

  async create(empresaId: string, input: CreateVehiculoInput): Promise<Vehiculo> {
    const list = this.load(empresaId);
    const ahora = new Date();
    const nuevo: Vehiculo = {
      id: crypto.randomUUID(),
      empresaId,
      ...input,
      creadoEl: ahora,
      actualizadoEl: ahora,
    };
    this.persist(empresaId, [...list, nuevo]);
    return nuevo;
  }

  async update(empresaId: string, id: string, input: UpdateVehiculoInput): Promise<Vehiculo> {
    const list = this.load(empresaId);
    const idx = list.findIndex((v) => v.id === id);
    if (idx === -1) throw new Error('Vehículo no encontrado');
    const actualizado: Vehiculo = { ...list[idx], ...input, actualizadoEl: new Date() };
    const updated = list.map((v) => (v.id === id ? actualizado : v));
    this.persist(empresaId, updated);
    return actualizado;
  }

  async toggleEstado(empresaId: string, id: string): Promise<Vehiculo> {
    const list = this.load(empresaId);
    const item = list.find((v) => v.id === id);
    if (!item) throw new Error('Vehículo no encontrado');
    return this.update(empresaId, id, {
      estado: item.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO',
    });
  }
}

// ─── LocalStorage: Datos transportista ─────────────────────

export class LocalStorageDatosTransportistaDataSource implements IDatosTransportistaDataSource {
  private getKey(empresaId: string): string {
    return `${TRANSPORTISTA_PREFIX}_${empresaId}`;
  }

  async get(empresaId: string): Promise<DatosTransportista | null> {
    try {
      const raw = localStorage.getItem(this.getKey(empresaId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as DatosTransportista;
      return { ...parsed, actualizadoEl: coerceDateTransporte(parsed.actualizadoEl) };
    } catch {
      return null;
    }
  }

  async save(empresaId: string, input: UpdateDatosTransportistaInput): Promise<DatosTransportista> {
    const existing = await this.get(empresaId);
    const datos: DatosTransportista = {
      id: existing?.id ?? `transportista-${empresaId}`,
      empresaId,
      ...input,
      actualizadoEl: new Date(),
    };
    localStorage.setItem(this.getKey(empresaId), JSON.stringify(datos));
    return datos;
  }
}

export const conductoresDataSource: IConductoresDataSource = new LocalStorageConductoresDataSource();
export const vehiculosDataSource: IVehiculosDataSource = new LocalStorageVehiculosDataSource();
export const datosTransportistaDataSource: IDatosTransportistaDataSource = new LocalStorageDatosTransportistaDataSource();
