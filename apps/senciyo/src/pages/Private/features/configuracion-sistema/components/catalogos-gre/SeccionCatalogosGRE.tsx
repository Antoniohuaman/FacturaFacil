import { useState } from 'react';
import { Package, FileText, Building2 } from 'lucide-react';
import { TablaBienesNormalizados } from './TablaBienesNormalizados';
import { TablaDocumentosRelacionados } from './TablaDocumentosRelacionados';
import { TablaEntidadesAutorizadoras } from './TablaEntidadesAutorizadoras';

type TabCatalogo = 'bienes' | 'documentos' | 'entidades';

const TABS: Array<{ id: TabCatalogo; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'bienes', label: 'Bienes normalizados', icon: Package },
  { id: 'documentos', label: 'Documentos relacionados', icon: FileText },
  { id: 'entidades', label: 'Entidades autorizadoras', icon: Building2 },
];

export function SeccionCatalogosGRE() {
  const [tabActivo, setTabActivo] = useState<TabCatalogo>('bienes');

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-700">Catálogos SUNAT</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Datos oficiales de solo lectura requeridos para la emisión de Guías de Remisión Electrónica.
        </p>
      </div>

      {/* Tabs internos */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-x-1">
          {TABS.map(({ id, label, icon: Icon }) => {
            const activo = tabActivo === id;
            return (
              <button
                key={id}
                onClick={() => setTabActivo(id)}
                className={`flex items-center gap-1.5 py-2.5 px-2 border-b-2 text-xs font-medium whitespace-nowrap transition-colors ${
                  activo
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${activo ? 'text-blue-600' : 'text-gray-400'}`} />
                {label}
              </button>
            );
          })}
        </nav>
      </div>

      <div>
        {tabActivo === 'bienes' && <TablaBienesNormalizados />}
        {tabActivo === 'documentos' && <TablaDocumentosRelacionados />}
        {tabActivo === 'entidades' && <TablaEntidadesAutorizadoras />}
      </div>
    </div>
  );
}
