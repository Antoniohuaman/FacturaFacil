// gastos/hooks/useCategoriasGasto.ts
//
// Hook de gestión de Categorías de gasto — consumido por la sección de
// Configuración de Negocio (crear/editar/desactivar/reactivar) y, de forma
// solo-lectura, por la página de Gastos. Nunca elimina físicamente una
// categoría (§8): solo activa/inactiva. El "uso" se calcula contra el mismo
// repositorio de Gastos (`repositorioGastos.ts`), nunca un contador
// desincronizable guardado en la propia categoría.

import { useCallback, useEffect, useState } from 'react';
import { getTenantEmpresaId } from '@/shared/tenant';
import { cargarGastos } from '../repositorios/repositorioGastos';
import {
  cargarCategoriasGasto,
  guardarCategoriasGasto,
  EVENTO_CATEGORIAS_GASTO_CAMBIADAS,
} from '../repositorios/repositorioCategoriasGasto';
import type { CategoriaGasto } from '../modelos/CategoriaGasto';

export interface DatosCategoriaGasto {
  nombre: string;
  descripcion?: string;
}

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
  const [categorias, setCategorias] = useState<CategoriaGasto[]>(() => cargarCategoriasGasto(empresaId));

  useEffect(() => {
    const recargar = () => setCategorias(cargarCategoriasGasto(empresaId));
    recargar();
    window.addEventListener(EVENTO_CATEGORIAS_GASTO_CAMBIADAS, recargar);
    return () => window.removeEventListener(EVENTO_CATEGORIAS_GASTO_CAMBIADAS, recargar);
  }, [empresaId]);

  const contarUso = useCallback((categoriaId: string): number => {
    let conteo = 0;
    for (const gasto of cargarGastos()) {
      if (gasto.estadoDocumento === 'anulado') continue;
      if (gasto.categoriaId === categoriaId) conteo += 1;
    }
    return conteo;
  }, []);

  const crearCategoria = useCallback((datos: DatosCategoriaGasto) => {
    const nueva: CategoriaGasto = {
      id: generarIdCategoria(),
      empresaId,
      nombre: datos.nombre.trim(),
      descripcion: datos.descripcion?.trim() || undefined,
      estado: 'activa',
      orden: categorias.length,
      fechaCreacion: new Date().toISOString(),
    };
    const siguiente = [...categorias, nueva];
    guardarCategoriasGasto(siguiente);
    setCategorias(siguiente);
  }, [categorias, empresaId]);

  const editarCategoria = useCallback((id: string, datos: DatosCategoriaGasto) => {
    const siguiente = categorias.map((c) =>
      c.id === id ? { ...c, nombre: datos.nombre.trim(), descripcion: datos.descripcion?.trim() || undefined } : c,
    );
    guardarCategoriasGasto(siguiente);
    setCategorias(siguiente);
  }, [categorias]);

  const desactivarCategoria = useCallback((id: string) => {
    const siguiente = categorias.map((c) => (c.id === id ? { ...c, estado: 'inactiva' as const } : c));
    guardarCategoriasGasto(siguiente);
    setCategorias(siguiente);
  }, [categorias]);

  const reactivarCategoria = useCallback((id: string) => {
    const siguiente = categorias.map((c) => (c.id === id ? { ...c, estado: 'activa' as const } : c));
    guardarCategoriasGasto(siguiente);
    setCategorias(siguiente);
  }, [categorias]);

  return { categorias, contarUso, crearCategoria, editarCategoria, desactivarCategoria, reactivarCategoria };
}
