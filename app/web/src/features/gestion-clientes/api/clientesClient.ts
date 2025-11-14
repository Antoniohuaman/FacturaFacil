/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
import type {
  Cliente,
  CreateClienteDTO,
  UpdateClienteDTO,
  PaginatedResponse,
  ClienteFilters,
  ReniecResponse,
  SunatResponse,
  BulkImportRequest,
  BulkImportResponse,
  BulkImportSummary,
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

  private generateUniqueId(): number {
    return Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`);
  }

  private extractDocumentParts(document?: string): { tipo?: string; numero?: string } {
    if (!document || document === 'Sin documento') {
      return {};
    }

    const parts = document.trim().split(' ');
    if (parts.length > 1) {
      return { tipo: parts[0], numero: parts.slice(1).join(' ').trim() };
    }

    return { numero: parts[0] };
  }

  private buildClienteFromPayload(
    input: CreateClienteDTO | UpdateClienteDTO,
    base?: Cliente
  ): Cliente {
    const now = new Date().toISOString();

    const legacyParts = this.extractDocumentParts(base?.document);
    const legacyType = input.documentType || legacyParts.tipo || 'SIN_DOCUMENTO';
    const numeroDocumento = (input.numeroDocumento || input.documentNumber || base?.numeroDocumento || legacyParts.numero || '').toString().trim();

    const document = legacyType === 'SIN_DOCUMENTO' || numeroDocumento === ''
      ? 'Sin documento'
      : `${legacyType} ${numeroDocumento}`.trim();

    const emails = (input.emails ?? base?.emails ?? [])
      .filter((email): email is string => Boolean(email && email.trim()))
      .map((email) => email.trim());

    const telefonos = (input.telefonos ?? base?.telefonos ?? [])
      .filter((telefono) => telefono && telefono.numero && telefono.numero.trim() !== '')
      .map((telefono) => ({
        numero: telefono.numero.trim(),
        tipo: telefono.tipo || 'Móvil',
      }));

    const estadoCliente = input.estadoCliente ?? base?.estadoCliente;
    const enabledFromPayload = 'enabled' in input && typeof input.enabled === 'boolean'
      ? input.enabled
      : undefined;
    const enabled = enabledFromPayload !== undefined
      ? enabledFromPayload
      : estadoCliente
        ? estadoCliente === 'Habilitado'
        : base?.enabled ?? true;

    const nombreDesdePayload = input.name || input.razonSocial || input.nombreCompleto;
    const nombreNormalizado = nombreDesdePayload && nombreDesdePayload.trim() !== ''
      ? nombreDesdePayload.trim()
      : base?.name || 'Cliente sin nombre';

    const direccionNormalizada = input.direccion?.trim() || input.address?.trim() || base?.direccion || base?.address || 'Sin dirección';

    const fechaRegistro = base?.fechaRegistro || base?.createdAt || now;

    const cliente: Cliente = {
      id: base?.id ?? this.generateUniqueId(),
      name: nombreNormalizado,
      document,
      type: (input.type ?? base?.type ?? 'Cliente'),
      address: direccionNormalizada,
      phone: input.phone ?? telefonos[0]?.numero ?? base?.phone ?? '',
      email: input.email ?? emails[0] ?? base?.email,
      gender: input.gender ?? base?.gender,
      additionalData: input.additionalData ?? input.observaciones ?? base?.additionalData,
      enabled,
      createdAt: base?.createdAt ?? fechaRegistro,
      updatedAt: now,
      transient: base?.transient,

      tipoDocumento: input.tipoDocumento ?? base?.tipoDocumento,
      numeroDocumento: numeroDocumento || undefined,
      tipoPersona: input.tipoPersona ?? base?.tipoPersona,
      tipoCuenta: input.tipoCuenta ?? base?.tipoCuenta ?? (base?.type as any),
      razonSocial: input.razonSocial ?? base?.razonSocial,
      nombreComercial: input.nombreComercial ?? base?.nombreComercial,
      primerNombre: input.primerNombre ?? base?.primerNombre,
      segundoNombre: input.segundoNombre ?? base?.segundoNombre,
      apellidoPaterno: input.apellidoPaterno ?? base?.apellidoPaterno,
      apellidoMaterno: input.apellidoMaterno ?? base?.apellidoMaterno,
      nombreCompleto: input.nombreCompleto ?? base?.nombreCompleto ?? nombreNormalizado,
      emails,
      telefonos,
      paginaWeb: input.paginaWeb ?? base?.paginaWeb,
      pais: input.pais ?? base?.pais,
      departamento: input.departamento ?? base?.departamento,
      provincia: input.provincia ?? base?.provincia,
      distrito: input.distrito ?? base?.distrito,
      ubigeo: input.ubigeo ?? base?.ubigeo,
      direccion: input.direccion ?? base?.direccion,
      referenciaDireccion: input.referenciaDireccion ?? base?.referenciaDireccion,
      tipoCliente: input.tipoCliente ?? base?.tipoCliente,
      estadoCliente: estadoCliente ?? (enabled ? 'Habilitado' : 'Deshabilitado'),
      motivoDeshabilitacion: input.motivoDeshabilitacion ?? base?.motivoDeshabilitacion,
      tipoContribuyente: input.tipoContribuyente ?? base?.tipoContribuyente,
      estadoContribuyente: input.estadoContribuyente ?? base?.estadoContribuyente,
      condicionDomicilio: input.condicionDomicilio ?? base?.condicionDomicilio,
      fechaInscripcion: input.fechaInscripcion ?? base?.fechaInscripcion,
      actividadesEconomicas: input.actividadesEconomicas ?? base?.actividadesEconomicas,
      sistemaEmision: input.sistemaEmision ?? base?.sistemaEmision,
      esEmisorElectronico: input.esEmisorElectronico ?? base?.esEmisorElectronico,
      cpeHabilitado: input.cpeHabilitado ?? base?.cpeHabilitado,
      esAgenteRetencion: input.esAgenteRetencion ?? base?.esAgenteRetencion,
      esAgentePercepcion: input.esAgentePercepcion ?? base?.esAgentePercepcion,
      esBuenContribuyente: input.esBuenContribuyente ?? base?.esBuenContribuyente,
      formaPago: input.formaPago ?? base?.formaPago,
      monedaPreferida: input.monedaPreferida ?? base?.monedaPreferida,
      listaPrecio: input.listaPrecio ?? base?.listaPrecio,
      usuarioAsignado: input.usuarioAsignado ?? base?.usuarioAsignado,
      clientePorDefecto: input.clientePorDefecto ?? base?.clientePorDefecto,
      exceptuadaPercepcion: input.exceptuadaPercepcion ?? base?.exceptuadaPercepcion,
      observaciones: input.observaciones ?? base?.observaciones ?? input.additionalData ?? base?.additionalData,
      adjuntos: input.adjuntos ?? base?.adjuntos,
      imagenes: input.imagenes ?? base?.imagenes,
      fechaRegistro,
      fechaUltimaModificacion: now,
    };

    return cliente;
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

      const payload = body as CreateClienteDTO;
      const docNumber = (payload.numeroDocumento || payload.documentNumber || '').trim();
      const docType = payload.documentType || 'SIN_DOCUMENTO';

      const existingClient = docNumber
        ? clientes.find((clienteActual) => {
            const parts = this.extractDocumentParts(clienteActual.document);
            const storedNumber = clienteActual.numeroDocumento || parts.numero || '';
            const storedType = parts.tipo || (clienteActual.document === 'Sin documento' ? 'SIN_DOCUMENTO' : parts.tipo) || 'SIN_DOCUMENTO';
            return storedNumber === docNumber && storedType === docType;
          })
        : undefined;

      if (existingClient) {
        throw {
          code: 'DUPLICATE_DOCUMENT',
          message: 'Ya existe un cliente con este número de documento',
        };
      }

      const newCliente = this.buildClienteFromPayload(payload);

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

      const payload = body as UpdateClienteDTO;
      const updatedCliente = this.buildClienteFromPayload(payload, clientes[index]);

      clientes[index] = updatedCliente;
      this.saveDevClientes(clientes);

      return updatedCliente as T;
    }

    // POST /clientes/import
    if (endpoint === '/clientes/import' && options.method === 'POST') {
      const request = body as BulkImportRequest;

      if (!request || !Array.isArray(request.registros)) {
        throw {
          code: 'INVALID_PAYLOAD',
          message: 'El formato de importación es inválido',
        };
      }

      const clientes = this.getDevClientes();
      const updatedClientes = [...clientes];

      const summary: BulkImportSummary = {
        processed: request.registros.length,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [],
      };

      request.registros.forEach((registro, index) => {
        const docNumber = (registro.numeroDocumento || registro.documentNumber || '').trim();
        const docType = registro.documentType || 'SIN_DOCUMENTO';
        const reference = docType === 'SIN_DOCUMENTO'
          ? 'SIN_DOCUMENTO'
          : `${docType} ${docNumber || '-'}`;

        if (!registro.name || registro.name.trim() === '') {
          summary.skipped += 1;
          summary.errors.push({
            rowNumber: index + 2,
            documentReference: reference,
            reason: 'Nombre o razón social es requerido',
          });
          return;
        }

        if (!docNumber && docType !== 'SIN_DOCUMENTO') {
          summary.skipped += 1;
          summary.errors.push({
            rowNumber: index + 2,
            documentReference: reference,
            reason: 'El número de documento es requerido',
          });
          return;
        }

        const matchIndex = docNumber
          ? updatedClientes.findIndex((clienteActual) => {
              const parts = this.extractDocumentParts(clienteActual.document);
              const storedNumber = clienteActual.numeroDocumento || parts.numero || '';
              const storedType = parts.tipo || (clienteActual.document === 'Sin documento' ? 'SIN_DOCUMENTO' : parts.tipo) || 'SIN_DOCUMENTO';
              return storedNumber === docNumber && storedType === docType;
            })
          : -1;

        if (matchIndex >= 0) {
          const actualizado = this.buildClienteFromPayload(registro, updatedClientes[matchIndex]);
          updatedClientes[matchIndex] = actualizado;
          summary.updated += 1;
        } else {
          const nuevo = this.buildClienteFromPayload(registro);
          updatedClientes.push(nuevo);
          summary.created += 1;
        }
      });

      this.saveDevClientes(updatedClientes);

      return {
        summary,
        clientes: updatedClientes,
      } as T;
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
  async getClientes(
    filters?: ClienteFilters,
    options: { signal?: AbortSignal; empresaId?: string; establecimientoId?: string } = {}
  ): Promise<PaginatedResponse<Cliente>> {
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
      signal: options.signal,
    });
  }

  /**
   * Obtener cliente por ID
   */
  async getClienteById(id: number | string, options: { signal?: AbortSignal } = {}): Promise<Cliente> {
    return this.request<Cliente>(`/clientes/${id}`, {
      method: 'GET',
      signal: options.signal,
    });
  }

  /**
   * Crear nuevo cliente
   */
  async createCliente(data: CreateClienteDTO, options: { signal?: AbortSignal } = {}): Promise<Cliente> {
    return this.request<Cliente>('/clientes', {
      method: 'POST',
      body: JSON.stringify(data),
      signal: options.signal,
    });
  }

  /**
   * Actualizar cliente
   */
  async updateCliente(id: number | string, data: UpdateClienteDTO, options: { signal?: AbortSignal } = {}): Promise<Cliente> {
    return this.request<Cliente>(`/clientes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      signal: options.signal,
    });
  }

  /**
   * Eliminar cliente
   */
  async deleteCliente(id: number | string, options: { signal?: AbortSignal } = {}): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/clientes/${id}`, {
      method: 'DELETE',
      signal: options.signal,
    });
  }

  async bulkImportClientes(
    payload: BulkImportRequest,
    options: { signal?: AbortSignal } = {}
  ): Promise<BulkImportResponse> {
    return this.request<BulkImportResponse>('/clientes/import', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal: options.signal,
    });
  }

  // ==================== CONSULTAS EXTERNAS ====================

  /**
   * Consultar RENIEC por DNI
   */
  async consultarReniec(dni: string, options: { signal?: AbortSignal } = {}): Promise<ReniecResponse> {
    return this.request<ReniecResponse>(`/clientes/consultar-reniec/${dni}`, {
      method: 'GET',
      signal: options.signal,
    });
  }

  /**
   * Consultar SUNAT por RUC
   */
  async consultarSunat(ruc: string, options: { signal?: AbortSignal } = {}): Promise<SunatResponse> {
    return this.request<SunatResponse>(`/clientes/consultar-sunat/${ruc}`, {
      method: 'GET',
      signal: options.signal,
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
