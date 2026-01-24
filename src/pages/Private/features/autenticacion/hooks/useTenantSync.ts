/**
 * ============================================
 * TENANT SYNC HOOK
 * ============================================
 * Sincroniza el TenantStore con cambios en configuración
 * Recarga la empresa actualizada desde API cuando hay cambios en establecimientos
 * SIN modificar la lógica de creación de establecimientos
 */

import { useCallback } from 'react';
import { useTenantStore } from '../store/TenantStore';
import { empresasApi } from '../../configuracion-sistema/api/empresasApi';
import type { Empresa, Establecimiento, EmpresaStatus, RegimenTributario, EmpresaConfig } from '../types/auth.types';

/**
 * Adapta un establecimiento del backend al formato del frontend
 */
function adaptEstablecimiento(backendEst: any): Establecimiento {
  return {
    id: backendEst.id,
    codigo: backendEst.codigo,
    nombre: backendEst.nombre,
    direccion: backendEst.direccion || '',
    esPrincipal: backendEst.esPrincipal ?? (backendEst.codigo === '0001'),
    activo: backendEst.esActivo ?? true,
  };
}

/**
 * Convierte EmpresaBackendDto a Empresa
 */
function convertBackendToEmpresa(backendData: any): Empresa {
  return {
    id: backendData.id,
    ruc: backendData.ruc,
    razonSocial: backendData.razonSocial,
    nombreComercial: backendData.nombreComercial || backendData.razonSocial,
    logo: undefined,
    direccion: backendData.direccionFiscal || '',
    telefono: backendData.telefonos?.[0],
    email: backendData.correosElectronicos?.[0],
    actividadEconomica: backendData.actividadEconomica,
    regimen: (backendData.regimenTributario as RegimenTributario) || 'general',
    estado: backendData.esActivo ? 'activa' : 'suspendida' as EmpresaStatus,
    establecimientos: (backendData.establecimientos || []).map(adaptEstablecimiento),
    configuracion: {
      emisionElectronica: !!backendData.ambienteSunat,
      certificadoDigital: undefined,
      seriesPorDefecto: undefined,
    } as EmpresaConfig,
  };
}

/**
 * Hook para sincronizar TenantStore con cambios en establecimientos
 * Recarga la empresa actualizada desde la API
 */
export function useTenantSync() {
  const { setEmpresas, setContextoActual, contextoActual, empresas } = useTenantStore();

  /**
   * Recarga la empresa actualizada desde la API y actualiza TenantStore
   * Se dispara cuando hay cambios en establecimientos en Configuración
   */
  const recargarEmpresasEnTenantStore = useCallback(async () => {
    try {
      // Validar que hay contexto actual y datos
      if (!contextoActual || !contextoActual.empresaId) {
        console.warn('[TenantSync] No hay contexto actual disponible');
        return;
      }

      if (!empresas || empresas.length === 0) {
        console.warn('[TenantSync] No hay empresas disponibles en el store');
        return;
      }

      console.log('[TenantSync] 🔄 Iniciando sincronización de empresa:', contextoActual.empresaId);

      // ========================================
      // CARGAR EMPRESA ACTUALIZADA DESDE API
      // ========================================
      const response = await empresasApi.getById(contextoActual.empresaId);
      
      if (!response.exito || !response.data) {
        console.warn('[TenantSync] No se pudo cargar la empresa desde API');
        return;
      }

      // Convertir respuesta del backend al formato Empresa del TenantStore
      const empresaActualizada = convertBackendToEmpresa(response.data);

      // ========================================
      // ACTUALIZAR TENANTSTORE CON DATOS FRESCOS
      // ========================================
      const updatedEmpresas = empresas.map((e: Empresa) =>
        e.id === empresaActualizada.id ? empresaActualizada : e
      );
      setEmpresas(updatedEmpresas);

      // ========================================
      // VALIDAR Y ACTUALIZAR CONTEXTO ACTUAL
      // ========================================
      const establecimientoActual = empresaActualizada.establecimientos?.find(
        e => e.id === contextoActual.establecimientoId
      );

      if (!establecimientoActual && empresaActualizada.establecimientos?.length) {
        // El establecimiento fue eliminado, usar el primero disponible
        console.warn('[TenantSync] Establecimiento actual fue eliminado, usando el primero');
        const primerEstablecimiento = empresaActualizada.establecimientos[0];
        
        setContextoActual({
          empresaId: empresaActualizada.id,
          establecimientoId: primerEstablecimiento.id,
          empresa: empresaActualizada,
          establecimiento: primerEstablecimiento,
          permisos: contextoActual.permisos || [],
          configuracion: contextoActual.configuracion || {}
        });
      } else if (establecimientoActual) {
        // El establecimiento sigue siendo válido, actualizar con datos frescos
        setContextoActual({
          ...contextoActual,
          empresa: empresaActualizada,
          establecimiento: establecimientoActual
        });
      }

      console.log('[TenantSync] ✅ Sincronización completada. Establecimientos cargados:', 
        empresaActualizada.establecimientos?.length || 0
      );
    } catch (error) {
      console.error('[TenantSync] Error sincronizando empresa:', error);
    }
  }, [setContextoActual, setEmpresas, contextoActual, empresas]);

  return {
    recargarEmpresasEnTenantStore
  };
}
