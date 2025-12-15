import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Coins, NotebookPen, Filter } from 'lucide-react';
import type {
  Currency,
  CartItem,
  ClientData,
  PaymentCollectionPayload,
  PaymentTotals,
  TipoComprobante,
} from '../../comprobantes-electronicos/models/comprobante.types';
import { CobranzaModal } from '../../comprobantes-electronicos/shared/modales/CobranzaModal';
import { ToastContainer } from '../../comprobantes-electronicos/shared/ui/Toast/ToastContainer';
import { useToast } from '../../comprobantes-electronicos/shared/ui/Toast/useToast';
import { useCurrency } from '../../comprobantes-electronicos/shared/form-core/hooks/useCurrency';
import { CobranzasTabs } from '../components/CobranzasTabs';
import { CobranzasFiltersBar } from '../components/CobranzasFiltersBar';
import { ResumenCards } from '../components/ResumenCards';
import { CuentasPorCobrarTable } from '../components/CuentasPorCobrarTable';
import { CobranzasTable } from '../components/CobranzasTable';
import { CobranzaDetailModal } from '../components/CobranzaDetailModal';
import { HistorialCobranzaModal } from '../components/HistorialCobranzaModal';
import { SeleccionarCuentaModal } from '../components/SeleccionarCuentaModal';
import { useCobranzasDashboard } from '../hooks/useCobranzasDashboard';
import type { CobranzaDocumento, CuentaPorCobrarSummary, CobranzaTabKey } from '../models/cobranzas.types';

const resolveTipoComprobante = (label?: string): TipoComprobante => {
  if (!label) {
    return 'factura';
  }
  return label.toLowerCase().includes('boleta') ? 'boleta' : 'factura';
};

export const CobranzasDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as { defaultTab?: CobranzaTabKey; highlightCuentaId?: string } | null) ?? null;
  const { toasts, removeToast, success, error } = useToast();
  const { formatPrice } = useCurrency();
  const {
    activeTab,
    setActiveTab,
    filters,
    handleFilterChange,
    handleDateChange,
    resetFilters,
    filteredCuentas,
    filteredCobranzas,
    resumen,
    registerCobranza,
    cuentas,
    cobranzas,
  } = useCobranzasDashboard();
  const [highlightCuentaId, setHighlightCuentaId] = useState<string | null>(null);

  useEffect(() => {
    if (!locationState) {
      return;
    }
    if (locationState.defaultTab) {
      setActiveTab(locationState.defaultTab);
    }
    if (locationState.highlightCuentaId) {
      setHighlightCuentaId(locationState.highlightCuentaId);
    }
    navigate(location.pathname, { replace: true, state: null });
  }, [locationState, navigate, location.pathname, setActiveTab]);

  useEffect(() => {
    if (highlightCuentaId || locationState?.highlightCuentaId) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    const storedId = window.sessionStorage.getItem('lastCreatedReceivableId');
    if (storedId) {
      setHighlightCuentaId(storedId);
      window.sessionStorage.removeItem('lastCreatedReceivableId');
      setActiveTab('cuentas');
    }
  }, [highlightCuentaId, locationState, setActiveTab]);

  useEffect(() => {
    if (!highlightCuentaId) {
      return;
    }
    const timeoutId = window.setTimeout(() => setHighlightCuentaId(null), 6000);
    return () => window.clearTimeout(timeoutId);
  }, [highlightCuentaId]);

  useEffect(() => {
    if (!highlightCuentaId) {
      return;
    }
    const exists = filteredCuentas.some((cuenta) => cuenta.id === highlightCuentaId);
    if (!exists) {
      setHighlightCuentaId(null);
    }
  }, [filteredCuentas, highlightCuentaId]);

  const [selectedCuenta, setSelectedCuenta] = useState<CuentaPorCobrarSummary | null>(null);
  const [showCobranzaModal, setShowCobranzaModal] = useState(false);
  const [showCuentaPicker, setShowCuentaPicker] = useState(false);
  const [detalleCobranza, setDetalleCobranza] = useState<CobranzaDocumento | null>(null);
  const [historialCuenta, setHistorialCuenta] = useState<CuentaPorCobrarSummary | null>(null);
  const [filtersVisible, setFiltersVisible] = useState(false);

  const formatMoney = (value: number, currency?: string) => {
    const resolved = (currency || 'PEN') as Currency;
    return formatPrice(Number(value ?? 0), resolved);
  };

  const cartItemsForModal = useMemo<CartItem[]>(() => {
    if (!selectedCuenta) return [];
    return [
      {
        id: selectedCuenta.comprobanteId,
        code: `${selectedCuenta.comprobanteSerie}`,
        name: `Saldo pendiente ${selectedCuenta.comprobanteSerie}-${selectedCuenta.comprobanteNumero}`,
        price: selectedCuenta.saldo,
        quantity: 1,
        subtotal: selectedCuenta.saldo,
        total: selectedCuenta.saldo,
        stock: 1,
        requiresStockControl: false,
      },
    ];
  }, [selectedCuenta]);

  const totalsForModal = useMemo<PaymentTotals>(() => ({
    subtotal: selectedCuenta?.saldo ?? 0,
    igv: 0,
    total: selectedCuenta?.saldo ?? 0,
    currency: (selectedCuenta?.moneda as Currency) ?? 'PEN',
  }), [selectedCuenta]);

  const clienteForModal = useMemo<ClientData | undefined>(() => {
    if (!selectedCuenta) return undefined;
    return {
      nombre: selectedCuenta.clienteNombre,
      tipoDocumento: selectedCuenta.clienteDocumento.length === 11 ? 'RUC' : 'DNI',
      documento: selectedCuenta.clienteDocumento,
    };
  }, [selectedCuenta]);

  const handleRegistrarCobranza = (cuenta: CuentaPorCobrarSummary) => {
    setSelectedCuenta(cuenta);
    setShowCobranzaModal(true);
  };

  const handleCobranzaComplete = async (payload: PaymentCollectionPayload) => {
    if (!selectedCuenta) return false;
    try {
      const documento = await registerCobranza({ cuenta: selectedCuenta, payload });
      setShowCobranzaModal(false);
      success('Cobranza registrada', `${documento.numero} por ${formatMoney(documento.monto, documento.moneda)}`);
      return true;
    } catch (registerError) {
      console.error('No se pudo registrar la cobranza desde el dashboard:', registerError);
      error(
        'Error al registrar cobranza',
        registerError instanceof Error ? registerError.message : 'Intenta nuevamente.'
      );
      return false;
    }
  };

  const handleVerComprobante = (id: string) => {
    navigate('/comprobantes', { state: { focusId: id } });
  };

  const handleOpenCuentaPicker = () => {
    setShowCuentaPicker(true);
  };

  const tipoComprobante = selectedCuenta ? resolveTipoComprobante(selectedCuenta.tipoComprobante) : 'factura';

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3 text-slate-900 dark:text-white">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-300">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Gestión de Cobranzas</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFiltersVisible((prev) => !prev)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 text-blue-600 text-sm font-semibold hover:bg-blue-50 dark:border-blue-500/40 dark:text-blue-200 dark:hover:bg-blue-900/40"
              aria-pressed={filtersVisible}
              aria-expanded={filtersVisible}
              aria-controls="cobranzas-filters"
            >
              <Filter className="w-4 h-4" />
              {filtersVisible ? 'Ocultar filtros' : 'Filtros'}
            </button>
            <button
              type="button"
              onClick={handleOpenCuentaPicker}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow-sm hover:bg-blue-700"
            >
              <NotebookPen className="w-4 h-4" />
              Registrar Cobranza
            </button>
          </div>
        </div>
      </header>

      <CobranzasTabs activeTab={activeTab} onChange={setActiveTab} />
      {filtersVisible && (
        <div id="cobranzas-filters">
          <CobranzasFiltersBar
            filters={filters}
            onFilterChange={handleFilterChange}
            onDateChange={handleDateChange}
            onReset={resetFilters}
          />
        </div>
      )}
      <ResumenCards resumen={resumen} formatMoney={formatMoney} />

      {activeTab === 'cuentas' ? (
        <CuentasPorCobrarTable
          data={filteredCuentas}
          formatMoney={formatMoney}
          onRegistrarCobranza={handleRegistrarCobranza}
          onVerComprobante={(cuenta) => handleVerComprobante(cuenta.comprobanteId)}
          onVerHistorial={(cuenta) => setHistorialCuenta(cuenta)}
          highlightId={highlightCuentaId}
        />
      ) : (
        <CobranzasTable
          data={filteredCobranzas}
          formatMoney={formatMoney}
          onVerDetalle={(cobranza) => setDetalleCobranza(cobranza)}
          onVerComprobante={(cobranza) => handleVerComprobante(cobranza.comprobanteId)}
        />
      )}

      <CobranzaModal
        isOpen={showCobranzaModal && Boolean(selectedCuenta)}
        onClose={() => setShowCobranzaModal(false)}
        cartItems={cartItemsForModal}
        totals={totalsForModal}
        cliente={clienteForModal}
        tipoComprobante={tipoComprobante}
        serie={selectedCuenta?.comprobanteSerie || ''}
        numeroTemporal={selectedCuenta?.comprobanteNumero}
        fechaEmision={selectedCuenta?.fechaEmision || ''}
        moneda={selectedCuenta?.moneda || 'PEN'}
        formaPago={selectedCuenta?.formaPago}
        onComplete={handleCobranzaComplete}
        creditTerms={selectedCuenta?.creditTerms}
        creditPaymentMethodLabel={selectedCuenta?.formaPago === 'credito' ? 'Crédito del comprobante' : selectedCuenta?.formaPago}
        installmentsState={selectedCuenta?.installments}
        context="cobranzas"
      />

      <CobranzaDetailModal
        cobranza={detalleCobranza}
        isOpen={Boolean(detalleCobranza)}
        onClose={() => setDetalleCobranza(null)}
        formatMoney={formatMoney}
      />

      <HistorialCobranzaModal
        cuenta={historialCuenta}
        cobranzas={cobranzas}
        isOpen={Boolean(historialCuenta)}
        onClose={() => setHistorialCuenta(null)}
        formatMoney={formatMoney}
        onVerConstancia={(doc) => setDetalleCobranza(doc)}
      />

      <SeleccionarCuentaModal
        cuentas={cuentas}
        isOpen={showCuentaPicker}
        onClose={() => setShowCuentaPicker(false)}
        onSelect={(cuenta) => {
          setSelectedCuenta(cuenta);
          setShowCobranzaModal(true);
        }}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default CobranzasDashboard;
