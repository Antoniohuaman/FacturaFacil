import React, { useEffect, useMemo, useState } from 'react';
import { Search, User, X, Loader2 } from 'lucide-react';
import type { Cliente } from '../../../../../features/gestion-clientes/models';
import { clientesClient } from '../../../../../features/gestion-clientes/api';
import { useClientes } from '../../../../../features/gestion-clientes/hooks/useClientes';
import {
  clienteToSaleSnapshot,
  type SaleDocumentType,
} from '../../../../../features/gestion-clientes/utils/saleClienteMapping';
import { getDocLabelFromCode, onlyDigits } from '../../../../../features/gestion-clientes/utils/documents';
import { lookupEmpresaPorRuc, lookupPersonaPorDni } from '../../../shared/clienteLookup/clienteLookupService';
import { usePriceProfilesCatalog } from '../../../../lista-precios/hooks/usePriceProfilesCatalog';

interface ClientePOS {
  id?: number | string;
  nombre: string;
  tipoDocumento: SaleDocumentType;
  documento: string;
  direccion: string;
  email?: string;
  sunatCode?: string;
  priceProfileId?: string;
}

interface ClientSectionProps {
  clienteSeleccionado: ClientePOS | null;
  setClienteSeleccionado: (cliente: ClientePOS | null) => void;
  onLookupClientSelected?: (client: {
    data: { nombre: string; documento: string; tipoDocumento: string; direccion?: string; email?: string };
    origen: 'RENIEC' | 'SUNAT';
  } | null) => void;
}

export const ClientSection: React.FC<ClientSectionProps> = ({
  clienteSeleccionado,
  setClienteSeleccionado,
  onLookupClientSelected,
}) => {
  const { resolveProfileId } = usePriceProfilesCatalog();
  const { clientes, fetchClientes } = useClientes();
  const [documentQuery, setDocumentQuery] = useState('');
  const [nameSearchQuery, setNameSearchQuery] = useState('');
  const [clientDocError, setClientDocError] = useState<string | null>(null);
  const [isLookupLoading, setIsLookupLoading] = useState(false);

  useEffect(() => {
    if (!clienteSeleccionado) {
      return;
    }
    setDocumentQuery(clienteSeleccionado.documento);
    setNameSearchQuery(clienteSeleccionado.nombre);
  }, [clienteSeleccionado]);

  useEffect(() => {
    if (!documentQuery.trim() && !nameSearchQuery.trim()) {
      return;
    }

    const query = documentQuery.trim() ? documentQuery.trim() : nameSearchQuery.trim();

    const handle = window.setTimeout(() => {
      void fetchClientes({ search: query, limit: 25, page: 1 });
    }, 250);

    return () => window.clearTimeout(handle);
  }, [documentQuery, fetchClientes, nameSearchQuery]);

  const selectCliente = (cliente: ClientePOS) => {
    setClienteSeleccionado(cliente);
    setDocumentQuery(cliente.documento);
    setNameSearchQuery(cliente.nombre);
    setClientDocError(null);
  };

  const normalizedDocQuery = useMemo(() => onlyDigits(documentQuery), [documentQuery]);
  const normalizedNameQuery = useMemo(() => nameSearchQuery.trim().toLowerCase(), [nameSearchQuery]);

  const clientesFiltrados = useMemo(() => {
    if (!normalizedDocQuery && !normalizedNameQuery) {
      return [] as Cliente[];
    }
    return clientes;
  }, [clientes, normalizedDocQuery, normalizedNameQuery]);

  const shouldShowResults = useMemo(
    () => !clienteSeleccionado && (Boolean(documentQuery.trim()) || Boolean(nameSearchQuery.trim())),
    [clienteSeleccionado, documentQuery, nameSearchQuery],
  );

  const handleDocumentInputChange = (value: string) => {
    if (clienteSeleccionado) {
      setClienteSeleccionado(null);
      setNameSearchQuery('');
    }
    setDocumentQuery(value);
    if (!value || clientDocError) {
      setClientDocError(null);
    }
  };

  const handleNameInputChange = (value: string) => {
    if (clienteSeleccionado) {
      setClienteSeleccionado(null);
    }
    setNameSearchQuery(value);
    if (value && documentQuery) {
      setDocumentQuery('');
    }
    if (clientDocError) {
      setClientDocError(null);
    }
  };

  const handleQuickSearch = async () => {
    const digits = onlyDigits(documentQuery);
    if (!digits) {
      setClientDocError('Ingresa un número de documento');
      return;
    }

    if (digits !== documentQuery) {
      setDocumentQuery(digits);
    }

    const isRucDoc = digits.length === 11 && (digits.startsWith('10') || digits.startsWith('20'));
    const isDniDoc = digits.length === 8;
    if (!isRucDoc && !isDniDoc) {
      setClientDocError('Ingresa un DNI (8) o RUC (11) válido');
      return;
    }

    const response = await clientesClient.getClientes({ search: digits, limit: 25, page: 1 });
    const exactMatches = response.data.filter((item) => {
      const snap = clienteToSaleSnapshot(item);
      return (snap.tipoDocumento === 'RUC' || snap.tipoDocumento === 'DNI') && snap.dni === digits;
    });

    if (exactMatches.length === 1) {
      const snap = clienteToSaleSnapshot(exactMatches[0]);
      selectCliente({
        id: snap.clienteId,
        nombre: snap.nombre,
        tipoDocumento: snap.tipoDocumento,
        documento: snap.dni,
        direccion: snap.direccion,
        email: snap.email,
        sunatCode: snap.sunatCode,
        priceProfileId: resolveProfileId(snap.priceProfileId),
      });
      return;
    }

    if (exactMatches.length > 1) {
      setClientDocError('Selecciona un cliente de la lista');
      return;
    }

    setIsLookupLoading(true);
    try {
      const lookup = isRucDoc ? await lookupEmpresaPorRuc(digits) : await lookupPersonaPorDni(digits);
      if (!lookup) {
        setClientDocError('No se encontraron datos para este documento');
        return;
      }
      const normalizedType: SaleDocumentType = isRucDoc ? 'RUC' : 'DNI';
      const numeroDocumento = onlyDigits(lookup.documento);
      selectCliente({
        id: undefined,
        nombre: lookup.nombre,
        tipoDocumento: normalizedType,
        documento: numeroDocumento,
        direccion: lookup.direccion || 'Dirección no definida',
        email: lookup.email,
        sunatCode: normalizedType === 'RUC' ? '6' : '1',
        priceProfileId: undefined,
      });
      onLookupClientSelected?.({
        data: {
          nombre: lookup.nombre,
          documento: numeroDocumento,
          tipoDocumento: normalizedType,
          direccion: lookup.direccion,
          email: lookup.email,
        },
        origen: lookup.origen,
      });
      setClientDocError(null);
    } catch (error) {
      console.error('Error durante el lookup de cliente', error);
      setClientDocError('No se pudo buscar el documento. Intenta nuevamente.');
    } finally {
      setIsLookupLoading(false);
    }
  };

  return (
    <div className="p-2.5 bg-white border-b border-gray-200">
      <div className="space-y-1.5">
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-1 text-[9px] font-bold text-gray-500 uppercase tracking-wide">
            <User className="h-2.5 w-2.5" />
            Número de documento
          </label>
          <label className="flex items-center gap-1 text-[9px] font-bold text-gray-500 uppercase tracking-wide">
            <User className="h-2.5 w-2.5" />
            Nombre
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="flex rounded-full border border-slate-200 bg-white shadow-sm overflow-hidden">
              <input
                type="text"
                value={documentQuery}
                onChange={(e) => handleDocumentInputChange(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleQuickSearch();
                  }
                }}
                placeholder="08661874"
                className="flex-1 px-3 py-1.5 text-[12px] font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void handleQuickSearch()}
                className="w-10 flex items-center justify-center bg-slate-200/40 text-slate-600 hover:text-slate-900 transition disabled:opacity-60"
                title="Buscar cliente"
                disabled={isLookupLoading}
              >
                {isLookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </button>
            </div>
            {clientDocError && (
              <p className="mt-1 text-[10px] text-red-600">{clientDocError}</p>
            )}
          </div>

          <div className="flex rounded-full border border-slate-200 bg-white shadow-sm overflow-hidden">
            <input
              type="text"
              value={nameSearchQuery}
              onChange={(e) => handleNameInputChange(e.target.value)}
              placeholder="Nombre del cliente"
              className="flex-1 px-3 py-1.5 text-[12px] font-semibold text-slate-800 placeholder:normal-case placeholder:text-slate-400 bg-transparent"
            />
            {/* Botón de editar/crear cliente eliminado: edición solo desde /clientes */}
          </div>
        </div>
      </div>

      {shouldShowResults && (
        <div className="mt-2 border border-slate-200 rounded-xl max-h-28 overflow-y-auto bg-white shadow-sm">
          {clientesFiltrados.length > 0 ? (
            clientesFiltrados.map((cliente) => {
              const snap = clienteToSaleSnapshot(cliente);
              const docCode = snap.sunatCode || (snap.tipoDocumento === 'RUC' ? '6' : snap.tipoDocumento === 'DNI' ? '1' : snap.tipoDocumento === 'SIN_DOCUMENTO' ? '0' : undefined);
              const trimmedNumber = snap.dni.trim();
              const label = getDocLabelFromCode(docCode);
              const docLabel = !trimmedNumber || docCode === '0' || !docCode
                ? 'Sin documento'
                : `${label} ${trimmedNumber}`;
              return (
              <button
                key={String(cliente.id)}
                onClick={() => selectCliente({
                  id: snap.clienteId,
                  nombre: snap.nombre,
                  tipoDocumento: snap.tipoDocumento,
                  documento: snap.dni,
                  direccion: snap.direccion,
                  email: snap.email,
                  sunatCode: snap.sunatCode,
                  priceProfileId: resolveProfileId(snap.priceProfileId),
                })}
                className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 transition-colors border-b border-slate-100 last:border-b-0"
              >
                <div className="font-semibold text-[11px] text-slate-900 truncate">{snap.nombre}</div>
                <div className="text-[10px] text-slate-600">{docLabel}</div>
              </button>
              );
            })
          ) : (
            <div className="p-2 text-center text-[10px] text-slate-500">Sin resultados</div>
          )}
        </div>
      )}

      {clienteSeleccionado && (
        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
          <span className="font-semibold text-slate-600">
            {(() => {
              const code = (clienteSeleccionado.sunatCode || '').trim() || (clienteSeleccionado.tipoDocumento === 'RUC'
                ? '6'
                : clienteSeleccionado.tipoDocumento === 'DNI'
                  ? '1'
                  : clienteSeleccionado.tipoDocumento === 'SIN_DOCUMENTO'
                    ? '0'
                    : undefined);
              const trimmedNumber = clienteSeleccionado.documento.trim();
              const label = getDocLabelFromCode(code);
              if (!trimmedNumber || code === '0' || !code) return 'Sin documento';
              return `${label} ${trimmedNumber}`;
            })()}
          </span>
          <button
            type="button"
            onClick={() => {
              setClienteSeleccionado(null);
              setDocumentQuery('');
              setNameSearchQuery('');
              setClientDocError(null);
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-slate-200 text-[10px] font-semibold text-slate-600 hover:text-red-600 hover:border-red-200 transition"
          >
            <X className="h-3 w-3" />
            Limpiar
          </button>
        </div>
      )}
    </div>
  );
};
