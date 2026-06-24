import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FileText, ClipboardList, ShoppingCart } from 'lucide-react';
import ListadoDocumentosComerciales from '../components/ListadoDocumentosComerciales';
import { useDocumentosComercialesContext } from '../contexts/DocumentosComercialesContext';
import type { TipoDocumentoComercial } from '../models/documentoComercial.types';
import { TIPO_DOCUMENTO_COMERCIAL_PLURAL } from '../models/documentoComercial.constants';

const TABS: { tipo: TipoDocumentoComercial; icono: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { tipo: 'cotizacion', icono: FileText },
  { tipo: 'orden_venta', icono: ShoppingCart },
  { tipo: 'nota_venta', icono: ClipboardList },
];

export default function DocumentosComerciales() {
  const location = useLocation();
  const { state: ctxState } = useDocumentosComercialesContext();

  type LocationState = { tipo?: TipoDocumentoComercial; abrirDetalleId?: string } | null;

  const locationState = location.state as LocationState;
  const tipoInicial = locationState?.tipo ?? 'cotizacion';
  const abrirDetalleId = locationState?.abrirDetalleId;

  const [tabActivo, setTabActivo] = useState<TipoDocumentoComercial>(tipoInicial);

  useEffect(() => {
    const tipo = (location.state as LocationState)?.tipo;
    if (tipo && tipo !== tabActivo) {
      setTabActivo(tipo);
    }
  }, [location.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const contarPorTipo = (tipo: TipoDocumentoComercial): number =>
    ctxState.documentos.filter((d) => d.tipo === tipo).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      {/* Cabecera del módulo */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-5">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Documentos Comerciales
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Gestione cotizaciones, notas de venta y órdenes de venta
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6">
        <nav className="flex gap-0 -mb-px overflow-x-auto">
          {TABS.map(({ tipo, icono: Icono }) => {
            const conteo = contarPorTipo(tipo);
            const activo = tabActivo === tipo;
            return (
              <button
                key={tipo}
                type="button"
                onClick={() => setTabActivo(tipo)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activo
                    ? 'border-violet-600 text-violet-700 dark:text-violet-400 dark:border-violet-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <Icono size={15} />
                {TIPO_DOCUMENTO_COMERCIAL_PLURAL[tipo]}
                {conteo > 0 && (
                  <span
                    className={`text-xs rounded-full px-1.5 py-0.5 font-semibold leading-none ${
                      activo
                        ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {conteo}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Contenido del tab activo */}
      <div className="px-6 py-6">
        <ListadoDocumentosComerciales tipo={tabActivo} abrirDetalleId={abrirDetalleId} />
      </div>
    </div>
  );
}
