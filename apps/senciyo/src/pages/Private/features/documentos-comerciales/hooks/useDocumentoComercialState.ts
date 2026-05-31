import { useState, useCallback } from 'react';
import type {
  TipoDocumentoComercial,
  ClienteDocumentoComercial,
  CamposOpcionalesDocumentoComercial,
  Currency,
} from '../models/documentoComercial.types';
import { obtenerFechaHoyISO } from '../utils/documentoComercial.helpers';

export interface EstadoFormularioDocumentoComercial {
  tipoDocumento: TipoDocumentoComercial;
  serieSeleccionada: string;
  fechaEmision: string;
  cliente: ClienteDocumentoComercial | null;
  moneda: Currency;
  formaPago: string;
  camposOpcionales: CamposOpcionalesDocumentoComercial;
  observaciones: string;
  notaInterna: string;
  modoProductos: 'catalogo' | 'libre';
  showFieldsConfigModal: boolean;
}

export interface UseDocumentoComercialStateReturn extends EstadoFormularioDocumentoComercial {
  setTipoDocumento: (tipo: TipoDocumentoComercial) => void;
  setSerieSeleccionada: (serie: string) => void;
  setFechaEmision: (fecha: string) => void;
  setCliente: (cliente: ClienteDocumentoComercial | null) => void;
  setMoneda: (moneda: Currency) => void;
  setFormaPago: (formaPago: string) => void;
  setCamposOpcionales: (campos: CamposOpcionalesDocumentoComercial) => void;
  setCampoOpcional: (campo: keyof CamposOpcionalesDocumentoComercial, valor: string | boolean | undefined) => void;
  setObservaciones: (obs: string) => void;
  setNotaInterna: (nota: string) => void;
  setModoProductos: (modo: 'catalogo' | 'libre') => void;
  abrirConfigCampos: () => void;
  cerrarConfigCampos: () => void;
  resetEstado: (tipoInicial?: TipoDocumentoComercial) => void;
  aplicarValoresIniciales: (valores: Partial<EstadoFormularioDocumentoComercial>) => void;
}

export function useDocumentoComercialState(
  tipoInicial: TipoDocumentoComercial = 'cotizacion',
): UseDocumentoComercialStateReturn {
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoComercial>(tipoInicial);
  const [serieSeleccionada, setSerieSeleccionada] = useState<string>('');
  const [fechaEmision, setFechaEmision] = useState<string>(obtenerFechaHoyISO());
  const [cliente, setCliente] = useState<ClienteDocumentoComercial | null>(null);
  const [moneda, setMoneda] = useState<Currency>('PEN');
  const [formaPago, setFormaPago] = useState<string>('contado');
  const [camposOpcionales, setCamposOpcionales] = useState<CamposOpcionalesDocumentoComercial>({});
  const [observaciones, setObservaciones] = useState<string>('');
  const [notaInterna, setNotaInterna] = useState<string>('');
  const [modoProductos, setModoProductos] = useState<'catalogo' | 'libre'>('catalogo');
  const [showFieldsConfigModal, setShowFieldsConfigModal] = useState<boolean>(false);

  const setCampoOpcional = useCallback(
    (campo: keyof CamposOpcionalesDocumentoComercial, valor: string | boolean | undefined) => {
      setCamposOpcionales((prev) => ({ ...prev, [campo]: valor }));
    },
    [],
  );

  const abrirConfigCampos = useCallback(() => setShowFieldsConfigModal(true), []);
  const cerrarConfigCampos = useCallback(() => setShowFieldsConfigModal(false), []);

  const resetEstado = useCallback(
    (tipoReset: TipoDocumentoComercial = tipoInicial) => {
      setTipoDocumento(tipoReset);
      setSerieSeleccionada('');
      setFechaEmision(obtenerFechaHoyISO());
      setCliente(null);
      setMoneda('PEN');
      setFormaPago('contado');
      setCamposOpcionales({});
      setObservaciones('');
      setNotaInterna('');
      setModoProductos('catalogo');
      setShowFieldsConfigModal(false);
    },
    [tipoInicial],
  );

  const aplicarValoresIniciales = useCallback(
    (valores: Partial<EstadoFormularioDocumentoComercial>) => {
      if (valores.tipoDocumento !== undefined) setTipoDocumento(valores.tipoDocumento);
      if (valores.serieSeleccionada !== undefined) setSerieSeleccionada(valores.serieSeleccionada);
      if (valores.fechaEmision !== undefined) setFechaEmision(valores.fechaEmision);
      if (valores.cliente !== undefined) setCliente(valores.cliente);
      if (valores.moneda !== undefined) setMoneda(valores.moneda);
      if (valores.formaPago !== undefined) setFormaPago(valores.formaPago);
      if (valores.camposOpcionales !== undefined) setCamposOpcionales(valores.camposOpcionales);
      if (valores.observaciones !== undefined) setObservaciones(valores.observaciones);
      if (valores.notaInterna !== undefined) setNotaInterna(valores.notaInterna);
      if (valores.modoProductos !== undefined) setModoProductos(valores.modoProductos);
    },
    [],
  );

  return {
    tipoDocumento,
    serieSeleccionada,
    fechaEmision,
    cliente,
    moneda,
    formaPago,
    camposOpcionales,
    observaciones,
    notaInterna,
    modoProductos,
    showFieldsConfigModal,
    setTipoDocumento,
    setSerieSeleccionada,
    setFechaEmision,
    setCliente,
    setMoneda,
    setFormaPago,
    setCamposOpcionales,
    setCampoOpcional,
    setObservaciones,
    setNotaInterna,
    setModoProductos,
    abrirConfigCampos,
    cerrarConfigCampos,
    resetEstado,
    aplicarValoresIniciales,
  };
}
