import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useCompras } from '../contexto/ContextoCompras';
import { puedeRegistrarPago } from '../logica/reglasCompras';
import FormularioPagoCompra from '../componentes/formularios/FormularioPagoCompra';

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
          Volver a Cuentas por Pagar
        </button>
      </div>
    </div>
  );
}

export default function PaginaRegistrarPagoCompra() {
  const { state } = useCompras();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cuentaPorPagarId = searchParams.get('cuentaPorPagarId');

  const volverACuentasPorPagar = () => navigate('/compras', { state: { tab: 'cuentas_por_pagar' } });

  if (!cuentaPorPagarId) {
    return (
      <EstadoNoDisponible
        mensaje="No se indicó qué cuenta por pagar registrar. Vuelve a Cuentas por Pagar y elige un documento pendiente."
        onVolver={volverACuentasPorPagar}
      />
    );
  }

  const cxp = state.cuentasPorPagar.find((c) => c.id === cuentaPorPagarId);

  if (!cxp) {
    return (
      <EstadoNoDisponible
        mensaje="No se encontró la cuenta por pagar solicitada. Es posible que ya no exista."
        onVolver={volverACuentasPorPagar}
      />
    );
  }

  if (!puedeRegistrarPago(cxp)) {
    return (
      <EstadoNoDisponible
        mensaje={`La cuenta por pagar ${cxp.comprobanteCompraNumero} ya no admite un nuevo pago (estado actual: ${cxp.estadoPago}).`}
        onVolver={volverACuentasPorPagar}
      />
    );
  }

  return (
    <FormularioPagoCompra
      cxp={cxp}
      onExito={() => navigate('/compras', { state: { tab: 'pagos' } })}
      onCancelar={volverACuentasPorPagar}
    />
  );
}
