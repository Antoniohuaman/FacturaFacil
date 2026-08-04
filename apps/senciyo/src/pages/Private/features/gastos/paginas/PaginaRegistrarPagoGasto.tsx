// gastos/paginas/PaginaRegistrarPagoGasto.tsx
//
// "Registrar pago" de un Gasto abre el MISMO formulario central de página
// completa que ya usa Compras (`FormularioPagoCompra.tsx` +
// `useFormularioPagoCompra.ts`, generalizado en §11 de la corrección) — nunca
// un `FormularioPagoGasto` copiado. Un gasto siempre tiene una única CxP
// (nunca el selector múltiple de documentos de Compras), así que esta página
// espeja el camino de acceso directo de `PaginaRegistrarPagoCompra.tsx`
// cuando ya se conoce la CxP puntual.

import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { currencyManager } from '@/shared/currency';
import FormularioPagoCompra from '../../compras/componentes/formularios/FormularioPagoCompra';
import { useContextoGastos } from '../contexto/useContextoGastos';
import { presentarReferenciaGasto, motivoBloqueoEfectivoMonedaExtranjera } from '../servicios/servicioGasto';

function EstadoNoDisponible({ mensaje, onVolver }: { mensaje: string; onVolver: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-xl px-6 py-8 max-w-md text-center space-y-4">
        <AlertTriangle className="mx-auto text-amber-500" size={32} />
        <p className="text-sm text-gray-700">{mensaje}</p>
        <button
          onClick={onVolver}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Volver a Gastos
        </button>
      </div>
    </div>
  );
}

export default function PaginaRegistrarPagoGasto() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, registrarPagoGastoCentral, obtenerCuentaPorPagarDeGasto } = useContextoGastos();

  const volver = () => navigate('/gastos');

  const gasto = state.gastos.find((g) => g.id === id);
  if (!gasto) {
    return <EstadoNoDisponible mensaje="No se encontró el gasto solicitado. Es posible que ya no exista." onVolver={volver} />;
  }

  const cxp = obtenerCuentaPorPagarDeGasto(gasto);
  if (!cxp) {
    return <EstadoNoDisponible mensaje="Este gasto todavía no tiene una Cuenta por Pagar asociada." onVolver={volver} />;
  }
  if (cxp.saldoPendiente <= 0) {
    return <EstadoNoDisponible mensaje="Este gasto ya no tiene saldo pendiente por pagar." onVolver={volver} />;
  }

  const monedaBase = currencyManager.getSnapshot().baseCurrency.code;

  return (
    <FormularioPagoCompra
      cxps={[cxp]}
      importesIniciales={{ [cxp.id]: cxp.saldoPendiente }}
      dependencias={{
        registrarPago: registrarPagoGastoCentral,
        // GAS-P1-004: bloquea en la UI, con feedback inmediato, el mismo
        // caso que el dominio (`registrarPagoGastoCentral`) ya rechaza —
        // Caja no es multimoneda, así que un gasto en moneda extranjera no
        // puede pagarse con un medio que la impacte.
        validarRestriccionesOrigen: ({ moneda, mediosPago }) =>
          motivoBloqueoEfectivoMonedaExtranjera(moneda, monedaBase, mediosPago),
      }}
      metadatosOrigen={{
        tipoOrigen: 'gasto',
        etiquetaModulo: 'Gastos',
        etiquetaDocumentoOrigen: presentarReferenciaGasto(gasto),
        tituloFormulario: 'Registrar pago',
      }}
      onExito={volver}
      onCancelar={volver}
    />
  );
}
