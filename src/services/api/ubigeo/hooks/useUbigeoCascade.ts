import { useState, useEffect } from 'react';
import { ubigeoService } from '../service';
import type { Departamento, Provincia, Distrito, UbigeoSelection } from '../types';

export interface UseUbigeoCascadeReturn {
  selection: UbigeoSelection;
  departamentos: Departamento[];
  provincias: Provincia[];
  distritos: Distrito[];
  isLoading: boolean;
  loadingDepartamentos: boolean;
  loadingProvincias: boolean;
  loadingDistritos: boolean;
  setDepartamento: (departamento: Departamento | null) => void;
  setProvincia: (provincia: Provincia | null) => void;
  setDistrito: (distrito: Distrito | null) => void;
  reset: () => void;
  error: Error | null;
}

export function useUbigeoCascade(initialValue?: UbigeoSelection): UseUbigeoCascadeReturn {
  const [selection, setSelection] = useState<UbigeoSelection>(initialValue || {});
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [distritos, setDistritos] = useState<Distrito[]>([]);
  
  const [loadingDepartamentos, setLoadingDepartamentos] = useState(false);
  const [loadingProvincias, setLoadingProvincias] = useState(false);
  const [loadingDistritos, setLoadingDistritos] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchDepartamentos = async () => {
      setLoadingDepartamentos(true);
      setError(null);
      try {
        const data = await ubigeoService.getDepartamentos();
        if (isMounted) {
          setDepartamentos(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Error al cargar departamentos'));
          setDepartamentos([]);
        }
      } finally {
        if (isMounted) {
          setLoadingDepartamentos(false);
        }
      }
    };

    fetchDepartamentos();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selection.departamento?.codigo) {
      setProvincias([]);
      return;
    }

    let isMounted = true;
    
    const fetchProvincias = async () => {
      setLoadingProvincias(true);
      setError(null);
      try {
        const data = await ubigeoService.getProvincias(selection.departamento!.codigo);
        if (isMounted) {
          setProvincias(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Error al cargar provincias'));
          setProvincias([]);
        }
      } finally {
        if (isMounted) {
          setLoadingProvincias(false);
        }
      }
    };

    fetchProvincias();

    return () => {
      isMounted = false;
    };
  }, [selection.departamento?.codigo]);

  useEffect(() => {
    if (!selection.departamento?.codigo || !selection.provincia?.codigo) {
      setDistritos([]);
      return;
    }

    let isMounted = true;
    
    const fetchDistritos = async () => {
      setLoadingDistritos(true);
      setError(null);
      try {
        const data = await ubigeoService.getDistritos(
          selection.departamento!.codigo,
          selection.provincia!.codigo
        );
        if (isMounted) {
          setDistritos(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Error al cargar distritos'));
          setDistritos([]);
        }
      } finally {
        if (isMounted) {
          setLoadingDistritos(false);
        }
      }
    };

    fetchDistritos();

    return () => {
      isMounted = false;
    };
  }, [selection.departamento?.codigo, selection.provincia?.codigo]);

  useEffect(() => {
    if (initialValue) {
      setSelection(initialValue);
    }
  }, [initialValue]);

  const handleDepartamentoChange = (departamento: Departamento | null) => {
    setSelection({
      departamento: departamento || undefined,
      provincia: undefined,
      distrito: undefined
    });
  };

  const handleProvinciaChange = (provincia: Provincia | null) => {
    setSelection(prev => ({
      ...prev,
      provincia: provincia || undefined,
      distrito: undefined
    }));
  };

  const handleDistritoChange = (distrito: Distrito | null) => {
    setSelection(prev => ({
      ...prev,
      distrito: distrito || undefined
    }));
  };

  const reset = () => {
    setSelection({});
  };

  const isLoading = loadingDepartamentos || loadingProvincias || loadingDistritos;

  return {
    selection,
    departamentos,
    provincias,
    distritos,
    isLoading,
    loadingDepartamentos,
    loadingProvincias,
    loadingDistritos,
    setDepartamento: handleDepartamentoChange,
    setProvincia: handleProvinciaChange,
    setDistrito: handleDistritoChange,
    reset,
    error
  };
}
