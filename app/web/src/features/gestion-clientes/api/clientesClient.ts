import type {
  Cliente,
  CreateClienteDTO,
  UpdateClienteDTO,
  PaginatedResponse,
  ClienteFilters,
  ReniecResponse,
  SunatResponse,
} from '../models';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true' || !import.meta.env.VITE_API_URL;

interface ApiError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

class ClientesClient {
  /**
   * Simular delay de red
   */
  private async simulateNetworkDelay(ms = 800): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Request genérico con manejo de errores
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (DEV_MODE) {
      return this.handleDevModeRequest<T>(endpoint, options);
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({
          code: 'UNKNOWN_ERROR',
          message: 'Error en la solicitud',
        }));
        throw error;
      }

      return response.json();
    } catch (error: any) {
      throw {
        code: error.code || 'NETWORK_ERROR',
        message: error.message || 'Error de conexión',
        details: error.details,
      };
    }
  }

  /**
   * Manejador de requests en modo desarrollo
   */
  private async handleDevModeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    await this.simulateNetworkDelay(600);

    const body = options.body ? JSON.parse(options.body as string) : {};

    // GET /clientes
    if (endpoint.startsWith('/clientes') && options.method === 'GET') {
      const clientes = this.getDevClientes();

      const url = new URL(endpoint, 'http://localhost');
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '10');
      const search = url.searchParams.get('search') || '';

      let filtered = clientes;
      if (search) {
        filtered = clientes.filter(c =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.document.toLowerCase().includes(search.toLowerCase())
        );
      }

      const total = filtered.length;
      const totalPages = Math.ceil(total / limit);
      const start = (page - 1) * limit;
      const data = filtered.slice(start, start + limit);

      return {
        data,
        total,
        page,
        limit,
        totalPages
      } as T;
    }

    // GET /clientes/:id
    if (endpoint.match(/\/clientes\/\d+$/) && options.method === 'GET') {
      const id = endpoint.split('/').pop();
      const clientes = this.getDevClientes();
      const cliente = clientes.find(c => c.id.toString() === id);

      if (!cliente) {
        throw {
          code: 'NOT_FOUND',
          message: 'Cliente no encontrado',
        };
      }

      return cliente as T;
    }

    // POST /clientes
    if (endpoint === '/clientes' && options.method === 'POST') {
      const clientes = this.getDevClientes();

      const existingClient = clientes.find(c =>
        c.document.includes(body.documentNumber) && body.documentNumber.trim() !== ''
      );

      if (existingClient) {
        throw {
          code: 'DUPLICATE_DOCUMENT',
          message: 'Ya existe un cliente con este número de documento',
        };
      }

      const newCliente: Cliente = {
        id: Date.now(),
        name: body.name,
        document: body.documentType !== 'SIN_DOCUMENTO'
          ? `${body.documentType} ${body.documentNumber}`
          : 'Sin documento',
        type: body.type,
        address: body.address || 'Sin dirección',
        phone: body.phone || '',
        email: body.email || '',
        gender: body.gender || '',
        additionalData: body.additionalData || '',
        enabled: true,
        createdAt: new Date().toISOString(),
      };

      clientes.unshift(newCliente);
      this.saveDevClientes(clientes);

      return newCliente as T;
    }

    // PUT /clientes/:id
    if (endpoint.match(/\/clientes\/\d+$/) && options.method === 'PUT') {
      const id = endpoint.split('/').pop();
      const clientes = this.getDevClientes();
      const index = clientes.findIndex(c => c.id.toString() === id);

      if (index === -1) {
        throw {
          code: 'NOT_FOUND',
          message: 'Cliente no encontrado',
        };
      }

      const updatedCliente: Cliente = {
        ...clientes[index],
        ...body,
        document: body.documentType && body.documentType !== 'SIN_DOCUMENTO'
          ? `${body.documentType} ${body.documentNumber}`
          : body.documentType === 'SIN_DOCUMENTO'
            ? 'Sin documento'
            : clientes[index].document,
        updatedAt: new Date().toISOString(),
      };

      clientes[index] = updatedCliente;
      this.saveDevClientes(clientes);

      return updatedCliente as T;
    }

    // DELETE /clientes/:id
    if (endpoint.match(/\/clientes\/\d+$/) && options.method === 'DELETE') {
      const id = endpoint.split('/').pop();
      const clientes = this.getDevClientes();
      const filtered = clientes.filter(c => c.id.toString() !== id);

      if (filtered.length === clientes.length) {
        throw {
          code: 'NOT_FOUND',
          message: 'Cliente no encontrado',
        };
      }

      this.saveDevClientes(filtered);

      return { success: true } as T;
    }

    // GET /clientes/consultar-reniec/:dni
    if (endpoint.match(/\/clientes\/consultar-reniec\/\d+$/) && options.method === 'GET') {
      await this.simulateNetworkDelay(1800);

      const dni = endpoint.split('/').pop();

      if (!dni || dni.length !== 8) {
        throw {
          code: 'INVALID_DNI',
          message: 'DNI inválido. Debe tener 8 dígitos',
        };
      }

      return {
        success: true,
        data: {
          dni,
          nombres: 'JUAN CARLOS',
          apellidoPaterno: 'GARCIA',
          apellidoMaterno: 'RODRIGUEZ',
          nombreCompleto: 'GARCIA RODRIGUEZ JUAN CARLOS',
        }
      } as T;
    }

    // GET /clientes/consultar-sunat/:ruc
    if (endpoint.match(/\/clientes\/consultar-sunat\/\d+$/) && options.method === 'GET') {
      await this.simulateNetworkDelay(2200);

      const ruc = endpoint.split('/').pop();

      if (!ruc || ruc.length !== 11) {
        throw {
          code: 'INVALID_RUC',
          message: 'RUC inválido. Debe tener 11 dígitos',
        };
      }

      return {
        success: true,
        data: {
          ruc,
          razonSocial: 'COMERCIAL ANDINA S.A.C.',
          nombreComercial: 'COMERCIAL ANDINA',
          direccion: 'AV. PRINCIPAL 123 - LIMA LIMA MIRAFLORES',
          estado: 'ACTIVO',
          condicion: 'HABIDO',
        }
      } as T;
    }

    throw {
      code: 'NOT_IMPLEMENTED',
      message: 'Endpoint no implementado en modo desarrollo',
    };
  }

  /**
   * Obtener clientes de localStorage (DEV)
   */
  private getDevClientes(): Cliente[] {
    try {
      const stored = localStorage.getItem('dev_clientes');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Guardar clientes en localStorage (DEV)
   */
  private saveDevClientes(clientes: Cliente[]): void {
    localStorage.setItem('dev_clientes', JSON.stringify(clientes));
  }

  // ==================== CLIENTES ====================

  /**
   * Obtener lista de clientes con paginación
   */
  async getClientes(filters?: ClienteFilters): Promise<PaginatedResponse<Cliente>> {
    const params = new URLSearchParams();

    if (filters?.search) params.append('search', filters.search);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.enabled !== undefined) params.append('enabled', filters.enabled.toString());
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const endpoint = `/clientes${queryString ? `?${queryString}` : ''}`;

    return this.request<PaginatedResponse<Cliente>>(endpoint, {
      method: 'GET',
    });
  }

  /**
   * Obtener cliente por ID
   */
  async getClienteById(id: number | string): Promise<Cliente> {
    return this.request<Cliente>(`/clientes/${id}`, {
      method: 'GET',
    });
  }

  /**
   * Crear nuevo cliente
   */
  async createCliente(data: CreateClienteDTO): Promise<Cliente> {
    return this.request<Cliente>('/clientes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Actualizar cliente
   */
  async updateCliente(id: number | string, data: UpdateClienteDTO): Promise<Cliente> {
    return this.request<Cliente>(`/clientes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Eliminar cliente
   */
  async deleteCliente(id: number | string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/clientes/${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== CONSULTAS EXTERNAS ====================

  /**
   * Consultar RENIEC por DNI
   */
  async consultarReniec(dni: string): Promise<ReniecResponse> {
    return this.request<ReniecResponse>(`/clientes/consultar-reniec/${dni}`, {
      method: 'GET',
    });
  }

  /**
   * Consultar SUNAT por RUC
   */
  async consultarSunat(ruc: string): Promise<SunatResponse> {
    return this.request<SunatResponse>(`/clientes/consultar-sunat/${ruc}`, {
      method: 'GET',
    });
  }

  // ==================== UTILIDADES DEV ====================

  /**
   * Limpiar clientes de desarrollo
   */
  clearDevClientes(): void {
    if (DEV_MODE) {
      localStorage.removeItem('dev_clientes');
      console.log('[DEV MODE] Clientes de desarrollo eliminados');
    }
  }

  /**
   * Ver clientes de desarrollo
   */
  getDevClientesList(): Cliente[] {
    if (DEV_MODE) {
      return this.getDevClientes();
    }
    return [];
  }
}

export const clientesClient = new ClientesClient();

// Exponer utilidades de desarrollo (solo en modo dev)
if (DEV_MODE && typeof window !== 'undefined') {
  (window as any).__DEV_CLIENTES__ = {
    clear: () => clientesClient.clearDevClientes(),
    list: () => clientesClient.getDevClientesList(),
    info: () => {
      console.log('=== DEV MODE CLIENTES UTILS ===');
      console.log('Modo desarrollo activo. Clientes guardados en localStorage.');
      console.log('');
      console.log('Comandos disponibles:');
      console.log('  __DEV_CLIENTES__.list()  - Ver todos los clientes');
      console.log('  __DEV_CLIENTES__.clear() - Limpiar todos los clientes');
      console.log('');
      console.log('Clientes actuales:', clientesClient.getDevClientesList().length);
    },
  };
}
