import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Plus } from 'lucide-react';
import TablaGuias from '../components/lista/TablaGuias';

type Tab = 'listado' | 'borradores';

export default function GuiasRemision() {
  const navigate = useNavigate();
  const [tabActivo, setTabActivo] = useState<Tab>('listado');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      {/* Cabecera */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Guías de Remisión
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Gestione guías de remisión electrónica remitente y transportista
            </p>
          </div>

          {/* Botones de nueva GRE */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/guias-remision/nuevo/remitente')}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Nueva GRE Remitente
            </button>
            <button
              type="button"
              onClick={() => navigate('/guias-remision/nuevo/transportista')}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 border border-violet-200 dark:border-violet-700 rounded-lg transition-colors"
            >
              <Truck className="h-4 w-4" />
              Nueva GRE Transportista
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6">
        <nav className="flex gap-0 -mb-px">
          {(
            [
              { id: 'listado' as Tab, label: 'Listado' },
              { id: 'borradores' as Tab, label: 'Borradores' },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTabActivo(id)}
              className={`px-5 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tabActivo === id
                  ? 'border-violet-600 text-violet-700 dark:text-violet-400 dark:border-violet-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido */}
      <div className="px-6 py-6">
        {tabActivo === 'listado' ? (
          <TablaGuias soloBorradores={false} />
        ) : (
          <TablaGuias soloBorradores={true} />
        )}
      </div>
    </div>
  );
}
