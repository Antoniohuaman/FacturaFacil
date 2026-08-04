// gastos/paginas/PaginaFormularioGasto.tsx
//
// Envoltorio de ruta para /gastos/nuevo y /gastos/:id/editar (§1/§9 de la
// corrección) — mismo patrón que `FormularioDocumentoComercialPage.tsx`:
// resuelve el modo/gasto desde `location.state` (navegación dentro de la
// app) y, si falta (recarga directa de la URL), busca el gasto por id en el
// contexto — nunca deja la página en blanco quedando disponible el id.

import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/contasis';
import { getTenantEmpresaId } from '@/shared/tenant';
import { currencyManager } from '@/shared/currency';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { cargarCategoriasGasto } from '../repositorios/repositorioCategoriasGasto';
import { useContextoGastos } from '../contexto/useContextoGastos';
import FormularioGasto from '../componentes/FormularioGasto';
import type { Gasto } from '../modelos/Gasto';
import type { DatosNuevoGasto } from '../servicios/servicioGasto';

export default function PaginaFormularioGasto() {
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useContextoGastos();
  const { state: config } = useConfigurationContext();
  const empresaId = getTenantEmpresaId();
  const monedaBase = currencyManager.getSnapshot().baseCurrency.code;

  const locationState = location.state as { gasto?: Gasto; valoresIniciales?: Omit<DatosNuevoGasto, 'fechaReconocimiento' | 'empresaId'> } | null;
  const modo = id ? 'editar' : 'crear';
  const gasto = modo === 'editar' ? (locationState?.gasto ?? state.gastos.find((g) => g.id === id)) : undefined;

  const categorias = cargarCategoriasGasto(empresaId);
  const establecimientos = config.Establecimientos
    .filter((e) => e.estaActivoEstablecimiento !== false)
    .map((e) => ({ value: e.id, label: `${e.codigoEstablecimiento ?? e.id} - ${e.nombreEstablecimiento}` }));
  const monedas = config.currencies.map((c) => ({ code: c.code, label: `${c.code} · ${c.symbol}` }));

  const volver = () => navigate('/gastos');

  if (modo === 'editar' && !gasto) {
    return (
      <div>
        <PageHeader title="Gastos" actions={null} />
        <div className="p-6">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            No se encontró el gasto solicitado. Es posible que ya no exista.
          </div>
          <button type="button" onClick={volver} className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Volver a Gastos
          </button>
        </div>
      </div>
    );
  }

  return (
    <FormularioGasto
      modo={modo}
      gasto={gasto}
      valoresIniciales={modo === 'crear' ? locationState?.valoresIniciales : undefined}
      categorias={categorias}
      establecimientos={establecimientos}
      monedas={monedas}
      monedaBase={monedaBase}
      empresaId={empresaId}
      onExito={volver}
      onCancelar={volver}
    />
  );
}
