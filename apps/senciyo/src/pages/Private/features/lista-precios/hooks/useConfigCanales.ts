import { useState, useCallback, useEffect } from 'react';
import type { ConfigCanalesVenta } from '../models/configuracionCanales';
import { CONFIG_CANALES_POR_DEFECTO } from '../models/configuracionCanales';
import { ensureTenantStorageMigration, readTenantJson, writeTenantJson } from '../utils/storage';

const CLAVE_CANAL = 'price_list_canal_config';
// Clave no-tenant usada por POS para su selección inicial de columna de precio
const CLAVE_POS_PRECIO = 'pos_price_column';

export const useConfigCanales = () => {
  const [configCanales, setConfigCanales] = useState<ConfigCanalesVenta>(() => {
    ensureTenantStorageMigration(CLAVE_CANAL);
    return readTenantJson<ConfigCanalesVenta>(CLAVE_CANAL, CONFIG_CANALES_POR_DEFECTO);
  });

  const actualizarConfig = useCallback((cambios: Partial<ConfigCanalesVenta>) => {
    setConfigCanales(prev => {
      const siguiente = { ...prev, ...cambios };
      writeTenantJson(CLAVE_CANAL, siguiente);
      return siguiente;
    });
  }, []);

  const setPredeterminadoPOS = useCallback((columnId: string) => {
    actualizarConfig({ predeterminadoPuntoVenta: columnId });
    // Sincronizar con la clave que POS lee al iniciar para su selección inicial
    try {
      localStorage.setItem(CLAVE_POS_PRECIO, columnId);
    } catch {
      // ignorar errores de storage
    }
  }, [actualizarConfig]);

  const setPredeterminadoComprobantes = useCallback((columnId: string) => {
    actualizarConfig({ predeterminadoComprobantes: columnId });
  }, [actualizarConfig]);

  // Al montar, sincronizar clave POS desde config almacenada si no está definida
  useEffect(() => {
    try {
      const storedPOS = localStorage.getItem(CLAVE_POS_PRECIO);
      if (!storedPOS && configCanales.predeterminadoPuntoVenta !== 'P1') {
        localStorage.setItem(CLAVE_POS_PRECIO, configCanales.predeterminadoPuntoVenta);
      }
    } catch {
      // ignorar
    }
  // intencional: ejecutar solo una vez al montar
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    configCanales,
    setPredeterminadoPOS,
    setPredeterminadoComprobantes,
  };
};
