import { useParams, useLocation } from 'react-router-dom';
import FormularioDocumentoComercial from '../components/FormularioDocumentoComercial';
import type {
  TipoDocumentoComercial,
  DocumentoComercial,
  ModoFormularioDocumentoComercial,
} from '../models/documentoComercial.types';

const TIPOS_VALIDOS: TipoDocumentoComercial[] = ['cotizacion', 'nota_venta', 'orden_venta'];

function esTipoValido(valor: string | undefined): valor is TipoDocumentoComercial {
  return TIPOS_VALIDOS.includes(valor as TipoDocumentoComercial);
}

export default function FormularioDocumentoComercialPage() {
  const { tipo: tipoParam } = useParams<{ tipo?: string }>();
  const location = useLocation();

  const locationState = location.state as {
    documento?: DocumentoComercial;
    modo?: ModoFormularioDocumentoComercial;
    prefillFrom?: DocumentoComercial;
    cotizacionOrigenId?: string;
  } | null;

  const documentoExistente = locationState?.documento;
  const modoExplicito = locationState?.modo;
  const prefillFrom = locationState?.prefillFrom;
  const cotizacionOrigenId = locationState?.cotizacionOrigenId;

  const modo: ModoFormularioDocumentoComercial = modoExplicito ?? (documentoExistente ? 'editar' : 'nuevo');
  const tipoDesdeDoc = documentoExistente?.tipo;
  const tipoDesdeParam = esTipoValido(tipoParam) ? tipoParam : undefined;
  const tipoFinal: TipoDocumentoComercial =
    tipoDesdeDoc ?? tipoDesdeParam ?? 'cotizacion';

  return (
    <FormularioDocumentoComercial
      tipoInicial={tipoFinal}
      modo={modo}
      documentoExistente={documentoExistente}
      prefillFrom={prefillFrom}
      cotizacionOrigenId={cotizacionOrigenId}
    />
  );
}
