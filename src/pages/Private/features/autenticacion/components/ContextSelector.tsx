// src/features/autenticacion/components/ContextSelector.tsx
import { useState } from 'react';
import type { Empresa } from '../types/auth.types';

/**
 * ============================================
 * CONTEXT SELECTOR - Selector de Empresa/Establecimiento
 * ============================================
 */

interface ContextSelectorProps {
  empresas: Empresa[];
  selectedEmpresaId?: string;
  selectedEstablecimientoId?: string;
  onSelect: (empresaId: string, establecimientoId: string) => void;
  isLoading?: boolean;
}

export function ContextSelector({
  empresas,
  selectedEmpresaId,
  selectedEstablecimientoId,
  onSelect,
  isLoading = false,
}: ContextSelectorProps) {
  const [localEmpresaId, setLocalEmpresaId] = useState(selectedEmpresaId || '');
  const [localEstablecimientoId, setLocalEstablecimientoId] = useState(selectedEstablecimientoId || '');

  const selectedEmpresa = empresas.find((e) => e.id === localEmpresaId);

  const handleEmpresaChange = (empresaId: string) => {
    setLocalEmpresaId(empresaId);
    
    // Auto-seleccionar establecimiento principal o el primero
    const empresa = empresas.find((e) => e.id === empresaId);
    if (empresa) {
      const principal = empresa.establecimientos.find((e) => e.esPrincipal);
      const establecimientoId = principal?.id || empresa.establecimientos[0]?.id || '';
      setLocalEstablecimientoId(establecimientoId);
      
      if (establecimientoId) {
        onSelect(empresaId, establecimientoId);
      }
    }
  };

  const handleEstablecimientoChange = (establecimientoId: string) => {
    setLocalEstablecimientoId(establecimientoId);
    if (localEmpresaId) {
      onSelect(localEmpresaId, establecimientoId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Selector de Empresa */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Empresa
        </label>
        <div className="grid grid-cols-1 gap-2">
          {empresas.map((empresa) => (
            <button
              key={empresa.id}
              type="button"
              onClick={() => handleEmpresaChange(empresa.id)}
              disabled={isLoading}
              className={`
                w-full p-4 rounded-lg border-2 text-left transition-all
                ${
                  localEmpresaId === empresa.id
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <div className="flex items-start gap-3">
                {/* Logo */}
                <div className="flex-shrink-0">
                  {empresa.logo ? (
                    <img
                      src={empresa.logo}
                      alt={empresa.razonSocial}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xl font-bold">
                        {empresa.razonSocial.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {empresa.nombreComercial || empresa.razonSocial}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    RUC: {empresa.ruc}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`
                        inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                        ${
                          empresa.estado === 'activa'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                        }
                      `}
                    >
                      {empresa.estado}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {empresa.establecimientos.length} establecimiento
                      {empresa.establecimientos.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Checkmark */}
                {localEmpresaId === empresa.id && (
                  <div className="flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-blue-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Selector de Establecimiento */}
      {selectedEmpresa && selectedEmpresa.establecimientos.length > 0 && (
        <div className="animate-fadeIn">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Establecimiento
          </label>
          <div className="grid grid-cols-1 gap-2">
            {selectedEmpresa.establecimientos
              .filter((e) => e.esActivo)
              .map((establecimiento) => (
                <button
                  key={establecimiento.id}
                  type="button"
                  onClick={() => handleEstablecimientoChange(establecimiento.id)}
                  disabled={isLoading}
                  className={`
                    w-full p-3 rounded-lg border-2 text-left transition-all
                    ${
                      localEstablecimientoId === establecimiento.id
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <div className="flex items-start gap-3">
                    {/* Icono */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-gray-600 dark:text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z"
                          />
                        </svg>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {establecimiento.nombre}
                        </h3>
                        {establecimiento.esPrincipal && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            Principal
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        Código: {establecimiento.codigo}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                        {establecimiento.direccion}
                      </p>
                    </div>

                    {/* Checkmark */}
                    {localEstablecimientoId === establecimiento.id && (
                      <div className="flex-shrink-0">
                        <svg
                          className="w-6 h-6 text-blue-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}