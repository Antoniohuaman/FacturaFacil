/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/Private/features/autenticacion/services/AutoConfigService.ts
import { useTenantStore } from '../store/TenantStore';
import type { AuthResponse, WorkspaceContext, ContextoSugerido } from '../types/auth.types';

/**
 * ============================================
 * AUTO-CONFIG SERVICE
 * ============================================
 * Orquesta la configuración automática del usuario al login
 * Sincroniza todos los stores y establece el contexto sugerido
 */

class AutoConfigService {
  /**
   * Ejecutar configuración automática completa
   */
  async ejecutarAutoConfiguracion(response: AuthResponse): Promise<void> {
    console.log('[AutoConfig] Iniciando auto-configuración...');
    
    try {
      // 1. Validar respuesta del backend
      this.validarRespuestaBackend(response);
      
      // 2. Establecer contexto sugerido
      const contexto = this.establecerContextoSugerido(response);
      
      if (!contexto) {
        console.warn('[AutoConfig] No se pudo determinar contexto sugerido');
        return;
      }
      
      // 3. Sincronizar TenantStore
      await this.sincronizarTenantStore(response, contexto);
      
      // 4. Validar integridad de datos
      await this.validarIntegridadDatos();
      
      console.log('[AutoConfig] ✅ Auto-configuración completada');
    } catch (error) {
      console.error('[AutoConfig] ❌ Error en auto-configuración:', error);
      throw error;
    }
  }
  
  /**
   * Validar respuesta del backend
   */
  private validarRespuestaBackend(response: AuthResponse): void {
    if (!response.empresas || response.empresas.length === 0) {
      throw new Error('Usuario no tiene empresas asignadas');
    }
    
    if (!response.contextoSugerido) {
      console.warn('[AutoConfig] Backend no retorna contexto sugerido');
    }
  }
  
  /**
   * Establecer contexto sugerido
   */
  private establecerContextoSugerido(response: AuthResponse): WorkspaceContext | null {
    // Si el backend retorna contexto sugerido, usarlo
    if (response.contextoSugerido) {
      return this.mapContextoSugeridoToWorkspace(response.contextoSugerido);
    }
    
    // Si retorna contextoActual (legacy), usarlo
    if (response.contextoActual) {
      return response.contextoActual;
    }
    
    // Fallback: usar primera empresa y primer establecimiento
    const primeraEmpresa = response.empresas[0];
    const primerEstablecimiento = primeraEmpresa.establecimientos?.[0];
    
    if (!primerEstablecimiento) {
      console.error('[AutoConfig] Empresa no tiene establecimientos configurados');
      return null;
    }
    
    return {
      empresaId: primeraEmpresa.id,
      establecimientoId: primerEstablecimiento.id,
      empresa: primeraEmpresa,
      establecimiento: primerEstablecimiento,
      permisos: ['*'],
      configuracion: {}
    };
  }
  
  /**
   * Mapear ContextoSugerido del backend a WorkspaceContext
   */
  private mapContextoSugeridoToWorkspace(contexto: ContextoSugerido): WorkspaceContext {
    return {
      empresaId: contexto.empresaId,
      establecimientoId: contexto.establecimientoId,
      empresa: {
        id: contexto.empresa.id,
        ruc: contexto.empresa.ruc,
        razonSocial: contexto.empresa.razonSocial,
        nombreComercial: contexto.empresa.nombreComercial,
        direccion: contexto.empresa.direccionFiscal || '',
        telefono: contexto.empresa.telefonos?.[0],
        email: contexto.empresa.correosElectronicos?.[0],
        actividadEconomica: contexto.empresa.actividadEconomica,
        regimen: (contexto.empresa.regimenTributario as any) || 'general',
        estado: contexto.empresa.esActivo ? 'activa' : 'suspendida',
        establecimientos: [{
          id: contexto.establecimiento.id,
          codigo: contexto.establecimiento.codigo,
          nombre: contexto.establecimiento.nombre,
          direccion: contexto.establecimiento.direccion || '',
          esPrincipal: contexto.establecimiento.esPrincipal,
          activo: contexto.establecimiento.esActivo
        }],
        configuracion: {
          emisionElectronica: true
        }
      },
      establecimiento: {
        id: contexto.establecimiento.id,
        codigo: contexto.establecimiento.codigo,
        nombre: contexto.establecimiento.nombre,
        direccion: contexto.establecimiento.direccion || '',
        esPrincipal: contexto.establecimiento.esPrincipal,
        activo: contexto.establecimiento.esActivo
      },
      permisos: ['*'],
      configuracion: {
        monedaBase: contexto.empresa.monedaBase || 'PEN',
        ambienteSunat: contexto.empresa.ambienteSunat || 'TESTING'
      }
    };
  }
  
  /**
   * Sincronizar TenantStore
   */
  private async sincronizarTenantStore(
    response: AuthResponse,
    contexto: WorkspaceContext
  ): Promise<void> {
    const { setEmpresas, setContextoActual } = useTenantStore.getState();
    
    // 1. Actualizar empresas
    setEmpresas(response.empresas);
    
    // 2. Establecer contexto actual
    setContextoActual(contexto);
    
    console.log('[AutoConfig] ✅ TenantStore sincronizado', {
      empresaId: contexto.empresaId,
      establecimientoId: contexto.establecimientoId
    });
  }
  
  /**
   * Validar integridad de datos entre stores
   */
  private async validarIntegridadDatos(): Promise<void> {
    const tenantStore = useTenantStore.getState();
    
    // Validar que hay contexto establecido
    if (!tenantStore.contextoActual) {
      throw new Error('No se pudo establecer contexto actual');
    }
    
    // Validar que la empresa existe en la lista
    const empresaExiste = tenantStore.empresas.some(
      e => e.id === tenantStore.contextoActual?.empresaId
    );
    
    if (!empresaExiste) {
      console.error('[AutoConfig] ⚠️ La empresa del contexto no existe en la lista de empresas');
    }
    
    console.log('[AutoConfig] ✅ Integridad de datos validada');
  }
}

export const autoConfigService = new AutoConfigService();
