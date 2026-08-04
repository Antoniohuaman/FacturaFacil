// gastos/hooks/useCategoriasGasto.ts
//
// Hook de gestión de Categorías de gasto — consumido por la sección de
// Configuración de Negocio (crear/editar/desactivar/reactivar) y, de forma
// solo-lectura, por la página de Gastos. Nunca elimina físicamente una
// categoría (§8): solo activa/inactiva. El "uso" se calcula contra el mismo
// repositorio de Gastos (`repositorioGastos.ts`), nunca un contador
// desincronizable guardado en la propia categoría.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getTenantEmpresaId } from '@/shared/tenant';
import { useUserSession } from '@/contexts/UserSessionContext';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { obtenerUsuarioDesdeSesion, tienePermiso } from '../../configuracion-sistema/utilidades/permisos';
import { cargarGastos, EVENTO_GASTOS_CAMBIADOS } from '../repositorios/repositorioGastos';
import {
  cargarCategoriasGasto,
  guardarCategoriasGasto,
  EVENTO_CATEGORIAS_GASTO_CAMBIADAS,
} from '../repositorios/repositorioCategoriasGasto';
import {
  contarUsoCategoriaGasto,
  crearCategoriaGasto,
  editarCategoriaGasto,
  cambiarEstadoCategoriaGasto,
  type DatosCategoriaGasto,
} from '../servicios/servicioCategoriaGasto';
import type { CategoriaGasto } from '../modelos/CategoriaGasto';

export type { DatosCategoriaGasto };

interface UseCategoriasGastoReturn {
  categorias: CategoriaGasto[];
  contarUso: (categoriaId: string) => number;
  crearCategoria: (datos: DatosCategoriaGasto) => void;
  editarCategoria: (id: string, datos: DatosCategoriaGasto) => void;
  desactivarCategoria: (id: string) => void;
  reactivarCategoria: (id: string) => void;
}

function generarIdCategoria(): string {
  return `catgasto-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useCategoriasGasto(): UseCategoriasGastoReturn {
  const empresaId = getTenantEmpresaId();
  const { session } = useUserSession();
  const { state: config, rolesConfigurados } = useConfigurationContext();
  const [categorias, setCategorias] = useState<CategoriaGasto[]>(() => cargarCategoriasGasto(empresaId));

  const usuarioActual = useMemo(
    () => obtenerUsuarioDesdeSesion(config.users, session),
    [config.users, session],
  );

  // Igual que en `ContextoGastos.tsx`: la gestión de categorías se protege
  // en el propio comando, no solo ocultando los botones de
  // `SeccionCategoriasGasto.tsx` — un llamador directo del hook sin el
  // permiso `gastos.categorias.gestionar` es rechazado igual.
  const verificarPermisoCategorias = useCallback(() => {
    const autorizado = tienePermiso({
      usuario: usuarioActual,
      permisoId: 'gastos.categorias.gestionar',
      rolesDisponibles: rolesConfigurados,
      establecimientoId: session?.currentEstablecimientoId,
    });
    if (!autorizado) {
      throw new Error('No tienes permiso para gestionar categorías de gastos.');
    }
  }, [usuarioActual, rolesConfigurados, session?.currentEstablecimientoId]);
  // Fuerza un re-render cuando cambian los GASTOS (no solo las categorías) —
  // `contarUso` siempre lee `cargarGastos()` en vivo, pero sin esto la
  // columna "En uso" quedaría desactualizada mientras el componente no se
  // vuelva a renderizar por otra razón (§14 de la corrección).
  const [, forzarRecalculoUso] = useState(0);

  useEffect(() => {
    const recargar = () => setCategorias(cargarCategoriasGasto(empresaId));
    recargar();
    window.addEventListener(EVENTO_CATEGORIAS_GASTO_CAMBIADAS, recargar);
    return () => window.removeEventListener(EVENTO_CATEGORIAS_GASTO_CAMBIADAS, recargar);
  }, [empresaId]);

  useEffect(() => {
    const recalcular = () => forzarRecalculoUso((n) => n + 1);
    window.addEventListener(EVENTO_GASTOS_CAMBIADOS, recalcular);
    return () => window.removeEventListener(EVENTO_GASTOS_CAMBIADOS, recalcular);
  }, []);

  const contarUso = useCallback((categoriaId: string): number => contarUsoCategoriaGasto(cargarGastos(), categoriaId), []);

  const crearCategoria = useCallback((datos: DatosCategoriaGasto) => {
    verificarPermisoCategorias();
    const siguiente = crearCategoriaGasto(categorias, datos, empresaId, generarIdCategoria(), new Date().toISOString());
    guardarCategoriasGasto(siguiente);
    setCategorias(siguiente);
  }, [categorias, empresaId, verificarPermisoCategorias]);

  const editarCategoria = useCallback((id: string, datos: DatosCategoriaGasto) => {
    verificarPermisoCategorias();
    const siguiente = editarCategoriaGasto(categorias, id, datos);
    guardarCategoriasGasto(siguiente);
    setCategorias(siguiente);
  }, [categorias, verificarPermisoCategorias]);

  const desactivarCategoria = useCallback((id: string) => {
    verificarPermisoCategorias();
    const siguiente = cambiarEstadoCategoriaGasto(categorias, id, 'inactiva');
    guardarCategoriasGasto(siguiente);
    setCategorias(siguiente);
  }, [categorias, verificarPermisoCategorias]);

  const reactivarCategoria = useCallback((id: string) => {
    verificarPermisoCategorias();
    const siguiente = cambiarEstadoCategoriaGasto(categorias, id, 'activa');
    guardarCategoriasGasto(siguiente);
    setCategorias(siguiente);
  }, [categorias, verificarPermisoCategorias]);

  return { categorias, contarUso, crearCategoria, editarCategoria, desactivarCategoria, reactivarCategoria };
}
