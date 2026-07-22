import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Breadcrumb, PageHeader } from '@/contasis';
import { useCompras } from '../contexto/ContextoCompras';
import { puedeRegistrarPago } from '../logica/reglasCompras';
import { ESTADO_PAGO_CXP_LABELS } from '../modelos/CuentaPorPagar';
import type { CuentaPorPagar } from '../modelos/CuentaPorPagar';
import FormularioPagoCompra from '../componentes/formularios/FormularioPagoCompra';
import BuscadorDocumentoOrigenPago from '../componentes/pagos/BuscadorDocumentoOrigenPago';

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
  const [seleccion, setSeleccion] = useState<{ cxps: CuentaPorPagar[]; importesIniciales: Record<string, number> } | null>(null);

  const volverACuentasPorPagar = () => navigate('/compras', { state: { tab: 'cuentas_por_pagar' } });
  const volverAPagos = () => navigate('/compras', { state: { tab: 'pagos' } });

  // Acceso directo desde "Pagar" en una CxP puntual: proveedor, moneda y
  // documento ya están determinados por esa CxP, así que el formulario de
  // pago se muestra de inmediato — nunca pasa por el selector de
  // proveedor/documentos, que es exclusivo del acceso "+ Registrar pago"
  // (sin cuentaPorPagarId en la URL).
  const cxpPreseleccionada = cuentaPorPagarId
    ? state.cuentasPorPagar.find((c) => c.id === cuentaPorPagarId)
    : undefined;

  if (cuentaPorPagarId && !cxpPreseleccionada) {
    return (
      <EstadoNoDisponible
        mensaje="No se encontró la cuenta por pagar solicitada. Es posible que ya no exista."
        onVolver={volverACuentasPorPagar}
      />
    );
  }

  if (cxpPreseleccionada && !puedeRegistrarPago(cxpPreseleccionada)) {
    return (
      <EstadoNoDisponible
        mensaje={`La cuenta por pagar ${cxpPreseleccionada.comprobanteCompraNumero} ya no admite un nuevo pago (estado actual: ${ESTADO_PAGO_CXP_LABELS[cxpPreseleccionada.estadoPago]}).`}
        onVolver={volverACuentasPorPagar}
      />
    );
  }

  if (cxpPreseleccionada) {
    return (
      <FormularioPagoCompra
        cxps={[cxpPreseleccionada]}
        importesIniciales={{ [cxpPreseleccionada.id]: cxpPreseleccionada.saldoPendiente }}
        onExito={volverAPagos}
        onCancelar={volverACuentasPorPagar}
      />
    );
  }

  if (!seleccion) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <PageHeader
          breadcrumb={
            <Breadcrumb items={[{ label: 'Compras', onClick: volverAPagos }, { label: 'Registrar pago' }]} />
          }
          title={
            <div>
              <h1 className="text-lg font-semibold text-gray-900 leading-tight">Registrar pago</h1>
              <p className="text-xs text-gray-500">Selecciona el proveedor, la moneda y los documentos pendientes que vas a pagar</p>
            </div>
          }
        />
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <BuscadorDocumentoOrigenPago
            cuentasPorPagar={state.cuentasPorPagar}
            onContinuar={setSeleccion}
          />
        </div>
      </div>
    );
  }

  return (
    <FormularioPagoCompra
      cxps={seleccion.cxps}
      importesIniciales={seleccion.importesIniciales}
      onExito={volverAPagos}
      onCancelar={volverAPagos}
    />
  );
}
