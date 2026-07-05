import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2, Building2, User, ChevronDown, HelpCircle } from 'lucide-react';
import { Tooltip } from '@/shared/ui';
import { useClientes } from '../../gestion-clientes/hooks/useClientes';
import { servicioConsultaDocumentos } from '@/shared/documentos/servicioConsultaDocumentos';
import type { Cliente } from '../../gestion-clientes/models/cliente.types';

export interface ProveedorSeleccionado {
  id: string | number;
  nombre: string;
  tipoDocumento: string; // '6' RUC | '1' DNI | 'CE' | etc.
  numeroDocumento: string;
  direccion?: string;
  /** true si viene de una consulta SUNAT/RENIEC y aún no existe en Gestión de Clientes/Proveedores. */
  esNuevoDesdeConsulta?: boolean;
}

interface BuscadorProveedorProps {
  proveedor: ProveedorSeleccionado | null;
  onSeleccionar: (p: ProveedorSeleccionado | null) => void;
  deshabilitado?: boolean;
  error?: string | null;
}

function extraerDocumento(c: Cliente): { tipo: string; numero: string } {
  const numExplicito = (c.numeroDocumento ?? '').trim();
  if (numExplicito) {
    const tipo = c.tipoDocumento === 'RUC' || numExplicito.length === 11 ? '6' : '1';
    return { tipo, numero: numExplicito };
  }
  const docStr = (c.document ?? '').trim();
  const partes = docStr.split(/\s+/);
  if (partes.length >= 2 && ['RUC', 'DNI', 'CE'].includes(partes[0].toUpperCase())) {
    const numero = partes.slice(1).join('').replace(/\D/g, '');
    const tipo = partes[0].toUpperCase() === 'RUC' ? '6' : '1';
    return { tipo, numero };
  }
  const soloDigitos = docStr.replace(/\D/g, '');
  return { tipo: soloDigitos.length === 11 ? '6' : '1', numero: soloDigitos };
}

export default function BuscadorProveedor({
  proveedor,
  onSeleccionar,
  deshabilitado = false,
  error,
}: BuscadorProveedorProps) {
  const { clientes, fetchClientes, loading } = useClientes();
  const [busqueda, setBusqueda] = useState('');
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [cargandoLookup, setCargandoLookup] = useState(false);
  const [errorLookup, setErrorLookup] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);

  const proveedoresFiltrados = clientes.filter(
    (c) => c.type === 'Proveedor' || c.type === 'Cliente-Proveedor',
  );

  useEffect(() => {
    if (!busqueda || busqueda.trim().length < 2) {
      setMostrarDropdown(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchClientes({ search: busqueda.trim(), limit: 30 } as Parameters<typeof fetchClientes>[0]);
      setMostrarDropdown(true);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [busqueda, fetchClientes]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setMostrarDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, []);

  const seleccionar = useCallback(
    (c: Cliente) => {
      const { tipo, numero } = extraerDocumento(c);
      const dir = c.direccion || (c.address && c.address !== 'Sin dirección' ? c.address : undefined);
      onSeleccionar({
        id: c.id,
        nombre: c.name,
        tipoDocumento: tipo,
        numeroDocumento: numero,
        direccion: dir,
      });
      setBusqueda('');
      setMostrarDropdown(false);
      setErrorLookup(null);
    },
    [onSeleccionar],
  );

  const limpiar = useCallback(() => {
    onSeleccionar(null);
    setBusqueda('');
    setErrorLookup(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [onSeleccionar]);

  const handleLookup = useCallback(async () => {
    const query = busqueda.replace(/\D/g, '');
    if (!query) return;
    setCargandoLookup(true);
    setErrorLookup(null);
    try {
      if (query.length === 11) {
        const res = await servicioConsultaDocumentos.consultarRuc(query);
        if (res.success && res.data) {
          const data = res.data as { razonSocial?: string; direccion?: string };
          onSeleccionar({
            id: query,
            nombre: data.razonSocial ?? query,
            tipoDocumento: '6',
            numeroDocumento: query,
            direccion: data.direccion,
            esNuevoDesdeConsulta: true,
          });
          setBusqueda('');
          setMostrarDropdown(false);
        } else {
          setErrorLookup('RUC no encontrado en SUNAT.');
        }
      } else if (query.length === 8) {
        const res = await servicioConsultaDocumentos.consultarDni(query);
        if (res.success && res.data) {
          const data = res.data as { nombreCompleto?: string; nombres?: string; apellidoPaterno?: string; apellidoMaterno?: string };
          const nombre = data.nombreCompleto ?? [data.nombres, data.apellidoPaterno, data.apellidoMaterno].filter(Boolean).join(' ');
          onSeleccionar({
            id: query,
            nombre,
            tipoDocumento: '1',
            numeroDocumento: query,
            esNuevoDesdeConsulta: true,
          });
          setBusqueda('');
          setMostrarDropdown(false);
        } else {
          setErrorLookup('DNI no encontrado en RENIEC.');
        }
      } else {
        setErrorLookup('Ingresa 8 dígitos (DNI) o 11 dígitos (RUC) para consultar.');
      }
    } catch {
      setErrorLookup('Error al consultar. Intenta nuevamente.');
    } finally {
      setCargandoLookup(false);
    }
  }, [busqueda, onSeleccionar]);

  // Si ya hay proveedor seleccionado, mostrar control compacto de una línea
  if (proveedor) {
    return (
      <div className="space-y-1">
        <div
          className={`flex items-center gap-2 border rounded-lg pl-3 pr-2 h-[42px] bg-white ${
            error ? 'border-red-300' : 'border-gray-300'
          }`}
        >
          {proveedor.tipoDocumento === '6' ? (
            <Building2 size={15} className="text-gray-400 shrink-0" />
          ) : (
            <User size={15} className="text-gray-400 shrink-0" />
          )}
          <span className="text-sm text-gray-800 truncate">
            {proveedor.tipoDocumento === '6' ? 'RUC' : 'DOC'} {proveedor.numeroDocumento}
            <span className="text-gray-400"> · </span>
            {proveedor.nombre}
          </span>
          {!deshabilitado && (
            <button
              onClick={limpiar}
              className="ml-auto text-gray-400 hover:text-gray-600 p-1 rounded shrink-0"
              aria-label="Cambiar proveedor"
            >
              <X size={16} />
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div ref={contenedorRef} className="relative space-y-1">
      <div className={`flex items-center border rounded-lg overflow-hidden h-[42px] ${error ? 'border-red-300' : 'border-gray-300'} bg-white focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-blue-400`}>
        <Search size={16} className="ml-3 text-gray-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void handleLookup();
            }
          }}
          placeholder="Buscar por nombre, RUC o DNI..."
          disabled={deshabilitado}
          className="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent placeholder-gray-400 disabled:text-gray-400"
        />
        {(loading || cargandoLookup) && (
          <Loader2 size={16} className="mr-3 text-gray-400 animate-spin" />
        )}
        {busqueda && !loading && !cargandoLookup && (
          <button
            onClick={() => {
              void handleLookup();
            }}
            className="mr-2 px-2 py-1 text-xs bg-blue-600 text-white rounded font-medium hover:bg-blue-700 shrink-0"
            title="Consultar en SUNAT/RENIEC"
          >
            Buscar
          </button>
        )}
        <Tooltip contenido='Busca por nombre, RUC o DNI. Si es nuevo, ingresa el RUC o DNI y presiona "Buscar" para consultarlo en SUNAT/RENIEC.'>
          <HelpCircle size={14} className="mr-3 text-gray-400 shrink-0" />
        </Tooltip>
        <ChevronDown size={14} className="mr-3 text-gray-400 shrink-0" />
      </div>

      {errorLookup && (
        <p className="text-xs text-red-600">{errorLookup}</p>
      )}
      {error && !errorLookup && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {mostrarDropdown && proveedoresFiltrados.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
            {proveedoresFiltrados.map((c) => {
              const { numero } = extraerDocumento(c);
              return (
                <button
                  key={c.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => seleccionar(c)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    {c.type === 'Proveedor' ? (
                      <Building2 size={14} className="text-gray-500" />
                    ) : (
                      <User size={14} className="text-gray-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-500">{numero}</p>
                  </div>
                  <span className="ml-auto text-[10px] uppercase font-medium text-gray-400 shrink-0">
                    {c.type === 'Cliente-Proveedor' ? 'C/P' : 'Prov.'}
                  </span>
                </button>
              );
            })}
          </div>
          {proveedoresFiltrados.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              No hay proveedores que coincidan. Ingresa el RUC y presiona Buscar para consultar SUNAT.
            </div>
          )}
        </div>
      )}

      {mostrarDropdown && !loading && proveedoresFiltrados.length === 0 && busqueda.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3">
          <p className="text-sm text-gray-500 text-center">
            Sin resultados. Si tienes el RUC o DNI, presiona &quot;Buscar&quot; para consultar en SUNAT/RENIEC.
          </p>
        </div>
      )}
    </div>
  );
}
