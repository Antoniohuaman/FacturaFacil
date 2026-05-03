import posthog from 'posthog-js';
import * as amplitude from '@amplitude/analytics-browser';
import mixpanel from 'mixpanel-browser';
import { useTenantStore } from '../../pages/Private/features/autenticacion/store/TenantStore';

import {
  type AccionBorradorAnalitica,
  EVENTOS_ANALITICA,
  type EntidadImportacion,
  type EntornoAnalitica,
  type ErroresRangoImportacion,
  type EstadoComprobanteAnalitica,
  type FormaPagoAnalitica,
  type MotivoAbandonoVenta,
  type OrigenAyudaAnalitica,
  type OrigenCliente,
  type OrigenProducto,
  type OrigenVenta,
  type ResultadoImportacion,
  type TipoAyudaAnalitica,
  type TipoComprobanteAnalitica,
} from './eventosAnalitica';
import {
  resolverContextoEmpresaAnaliticaDesdeTenant,
  type ContextoIdentidadAnalitica,
} from './identidadAnalitica';
import {
  esEntornoAnaliticaHabilitado,
  obtenerConfiguracionAnaliticaPublica,
} from './configuracionAnalitica';

type PropiedadesAnalitica = Record<string, unknown>;
const { amplitudeApiKey, mixpanelToken, posthogKey } = obtenerConfiguracionAnaliticaPublica();

type PosthogConEstado = typeof posthog & {
  __loaded?: boolean;
  resetGroups?: () => void;
};

type MixpanelConSuperProps = typeof mixpanel & {
  register?: (properties: Record<string, unknown>) => void;
  unregister?: (propertyName: string) => void;
};

const esNavegador = (): boolean => typeof window !== 'undefined';

let contextoIdentidadActual: ContextoIdentidadAnalitica | null = null;
let firmaContextoIdentidadActual: string | null = null;

const posthogDisponible = (): boolean => {
  const cliente = posthog as PosthogConEstado;
  return cliente.__loaded === true;
};

const ejecutarOperacionAnaliticaSegura = (operacion: () => void): boolean => {
  try {
    operacion();
    return true;
  } catch {
    return false;
  }
};

const obtenerContextoEmpresaTentativo = () => {
  const { empresas, contextoActual } = useTenantStore.getState();
  return resolverContextoEmpresaAnaliticaDesdeTenant(empresas, contextoActual);
};

const resolverEntornoAnaliticaContextual = (entorno?: EntornoAnalitica): EntornoAnalitica => {
  return entorno ?? contextoIdentidadActual?.entorno ?? 'demo';
};

const puedeCapturarEventos = (): boolean => {
  if (!esNavegador()) {
    return false;
  }

  if (!esEntornoAnaliticaHabilitado()) {
    return false;
  }

  if (!posthogKey) {
    return false;
  }

  return posthogDisponible();
};

const amplitudeDisponible = (): boolean => {
  if (!esNavegador()) {
    return false;
  }

  if (!esEntornoAnaliticaHabilitado()) {
    return false;
  }

  return Boolean(amplitudeApiKey);
};

const mixpanelDisponible = (): boolean => {
  if (!esNavegador()) {
    return false;
  }

  if (!esEntornoAnaliticaHabilitado()) {
    return false;
  }

  return Boolean(mixpanelToken);
};

let mixpanelInicializado = false;
let mixpanelInicializacionBloqueada = false;
const asegurarMixpanelInicializado = (): boolean => {
  if (mixpanelInicializacionBloqueada) {
    return false;
  }

  if (!mixpanelDisponible() || mixpanelInicializado) {
    return mixpanelInicializado;
  }

  const inicializado = ejecutarOperacionAnaliticaSegura(() => {
    mixpanel.init(mixpanelToken as string, {
      track_pageview: false,
      persistence: 'localStorage',
      ignore_dnt: true,
    });
  });

  mixpanelInicializado = inicializado;
  mixpanelInicializacionBloqueada = !inicializado;

  return mixpanelInicializado;
};

const construirPropiedadesBase = (propiedades?: PropiedadesAnalitica): PropiedadesAnalitica => {
  const propiedadesBase: PropiedadesAnalitica = {
    ruta_actual: esNavegador() ? window.location.pathname : '',
    timestamp_cliente: new Date().toISOString(),
  };

  if (contextoIdentidadActual?.companyId) {
    propiedadesBase.company_id = contextoIdentidadActual.companyId;
  }

  if (typeof contextoIdentidadActual?.companyConfigured === 'boolean') {
    propiedadesBase.company_configured = contextoIdentidadActual.companyConfigured;
  }

  if (contextoIdentidadActual?.establecimientoId) {
    propiedadesBase.establecimiento_id = contextoIdentidadActual.establecimientoId;
  }

  if (contextoIdentidadActual?.userRole) {
    propiedadesBase.user_role = contextoIdentidadActual.userRole;
  }

  if (contextoIdentidadActual?.entorno) {
    propiedadesBase.entorno = contextoIdentidadActual.entorno;
  }

  if (!propiedades) {
    return propiedadesBase;
  }

  return {
    ...propiedadesBase,
    ...propiedades,
  };
};

const construirFirmaContexto = (contexto: ContextoIdentidadAnalitica | null): string | null => {
  if (!contexto) {
    return null;
  }

  return JSON.stringify(contexto);
};

const construirPropiedadesUsuario = (contexto: ContextoIdentidadAnalitica): Record<string, unknown> => ({
  user_role: contexto.userRole,
  user_status: contexto.userStatus,
  entorno: contexto.entorno,
  company_configured: contexto.companyConfigured,
  company_id: contexto.companyId,
  establecimiento_id: contexto.establecimientoId,
});

const limpiarValoresIndefinidos = (propiedades: Record<string, unknown>): Record<string, unknown> => {
  return Object.fromEntries(
    Object.entries(propiedades).filter(([, valor]) => valor !== undefined),
  );
};

function establecerContextoAnalitico(contexto: ContextoIdentidadAnalitica | null): void {
  contextoIdentidadActual = contexto;
}

export function obtenerContextoAnaliticoActual(): ContextoIdentidadAnalitica | null {
  return contextoIdentidadActual;
}

export function resetearIdentidadAnalitica(): void {
  establecerContextoAnalitico(null);

  const clientePosthog = posthog as PosthogConEstado;
  if (posthogDisponible()) {
    ejecutarOperacionAnaliticaSegura(() => {
      clientePosthog.resetGroups?.();
      posthog.reset();
    });
  }

  if (amplitudeDisponible()) {
    ejecutarOperacionAnaliticaSegura(() => {
      amplitude.reset();
    });
  }

  if (mixpanelDisponible() && asegurarMixpanelInicializado()) {
    ejecutarOperacionAnaliticaSegura(() => {
      mixpanel.reset();
    });
  }

  firmaContextoIdentidadActual = null;
}

export function sincronizarIdentidadAnalitica(contexto: ContextoIdentidadAnalitica | null): void {
  const nuevaFirma = construirFirmaContexto(contexto);
  if (nuevaFirma === firmaContextoIdentidadActual) {
    return;
  }

  firmaContextoIdentidadActual = nuevaFirma;
  establecerContextoAnalitico(contexto);

  if (!contexto) {
    resetearIdentidadAnalitica();
    return;
  }

  const propiedadesUsuario = limpiarValoresIndefinidos(construirPropiedadesUsuario(contexto));
  const posthogIdentidadHabilitada = puedeCapturarEventos();

  if (posthogIdentidadHabilitada) {
    ejecutarOperacionAnaliticaSegura(() => {
      posthog.identify(contexto.userId, propiedadesUsuario);
    });

    const companyId = contexto.companyId;
    if (companyId) {
      ejecutarOperacionAnaliticaSegura(() => {
        posthog.group('company', companyId, limpiarValoresIndefinidos({
          company_id: companyId,
          entorno: contexto.entorno,
          company_configured: contexto.companyConfigured,
        }));
      });
    } else {
      ejecutarOperacionAnaliticaSegura(() => {
        (posthog as PosthogConEstado).resetGroups?.();
      });
    }
  }

  if (amplitudeDisponible()) {
    ejecutarOperacionAnaliticaSegura(() => {
      amplitude.setUserId(contexto.userId);

      const identify = new amplitude.Identify();
      identify.unset('company_name');
      identify.unset('entorno_emision');
      identify.unset('entorno_sunat');
      Object.entries(propiedadesUsuario).forEach(([key, value]) => {
        if (value !== undefined) {
          identify.set(key, value as string | number | boolean);
        }
      });
      amplitude.identify(identify);

      if (contexto.companyId) {
        amplitude.setGroup('company', contexto.companyId);
      }
    });
  }

  if (mixpanelDisponible() && asegurarMixpanelInicializado()) {
    ejecutarOperacionAnaliticaSegura(() => {
      mixpanel.identify(contexto.userId);

      const mixpanelClient = mixpanel as MixpanelConSuperProps;
      mixpanelClient.unregister?.('company_name');
      mixpanelClient.unregister?.('entorno_emision');
      mixpanelClient.unregister?.('entorno_sunat');
      mixpanelClient.register?.(propiedadesUsuario);

      if (!contexto.companyId) {
        mixpanelClient.unregister?.('company_id');
      }

      if (!contexto.establecimientoId) {
        mixpanelClient.unregister?.('establecimiento_id');
      }
    });
  }
}

function capturarEvento(nombreEvento: string, propiedades?: PropiedadesAnalitica): void {
  const posthogHabilitado = puedeCapturarEventos();
  const amplitudeHabilitado = amplitudeDisponible();
  const mixpanelHabilitado = mixpanelDisponible();

  if (!posthogHabilitado && !amplitudeHabilitado && !mixpanelHabilitado) {
    return;
  }

  const propiedadesEvento = construirPropiedadesBase(propiedades);

  if (posthogHabilitado) {
    ejecutarOperacionAnaliticaSegura(() => {
      posthog.capture(nombreEvento, propiedadesEvento);
    });
  }

  if (amplitudeHabilitado) {
    ejecutarOperacionAnaliticaSegura(() => {
      amplitude.track(nombreEvento, propiedadesEvento);
    });
  }

  if (mixpanelHabilitado && asegurarMixpanelInicializado()) {
    ejecutarOperacionAnaliticaSegura(() => {
      mixpanel.track(nombreEvento, propiedadesEvento);
    });
  }
}

function construirPropiedadesRegistroUsuarioCompletado(
  entrada?: { entorno?: EntornoAnalitica },
): PropiedadesAnalitica {
  const entorno = resolverEntornoAnaliticaContextual(entrada?.entorno);

  if (contextoIdentidadActual?.companyId) {
    return { entorno };
  }

  const contextoEmpresa = obtenerContextoEmpresaTentativo();

  if (!contextoEmpresa?.companyId) {
    return { entorno };
  }

  return limpiarValoresIndefinidos({
    ...contextoEmpresa,
    entorno,
  });
}

export function registrarRegistroUsuarioCompletado(entrada?: { entorno?: EntornoAnalitica }): void {
  capturarEvento(
    EVENTOS_ANALITICA.REGISTRO_USUARIO_COMPLETADO,
    construirPropiedadesRegistroUsuarioCompletado(entrada),
  );
}

export function registrarRegistroEmpresaExitoso(): void {
  capturarEvento(EVENTOS_ANALITICA.REGISTRO_EMPRESA_EXITOSO, {
    entorno: resolverEntornoAnaliticaContextual(),
    origen: 'formulario_empresa',
  });
}

export function registrarInicioSesionExitoso(): void {
  capturarEvento(EVENTOS_ANALITICA.INICIO_SESION_EXITOSO, {
    origen: 'formulario_login',
  });
}

export function registrarCajaAbiertaExitoso(): void {
  capturarEvento(EVENTOS_ANALITICA.CAJA_ABIERTA_EXITOSO, {
    origen: 'caja',
  });
}

export function registrarMovimientoCajaRegistrado(entrada?: {
  tipoMovimiento?: 'ingreso' | 'egreso' | 'otro';
}): void {
  capturarEvento(EVENTOS_ANALITICA.MOVIMIENTO_CAJA_REGISTRADO, {
    origen: 'caja',
    ...(entrada?.tipoMovimiento ? { tipo_movimiento: entrada.tipoMovimiento } : {}),
  });
}

export function registrarCajaCerradaExitoso(): void {
  capturarEvento(EVENTOS_ANALITICA.CAJA_CERRADA_EXITOSO, {
    origen: 'caja',
  });
}

export function registrarFlujoVentaAbandonado(entrada: {
  origenVenta: OrigenVenta;
  motivoAbandono?: MotivoAbandonoVenta;
}): void {
  capturarEvento(EVENTOS_ANALITICA.FLUJO_VENTA_ABANDONADO, {
    origen_venta: entrada.origenVenta,
    ...(entrada.motivoAbandono ? { motivo_abandono: entrada.motivoAbandono } : {}),
  });
}

export function registrarComprobanteEstadoActualizado(entrada: {
  estado: EstadoComprobanteAnalitica;
  tipoComprobante?: TipoComprobanteAnalitica;
  formaPago?: FormaPagoAnalitica;
  origenVenta?: OrigenVenta;
}): void {
  capturarEvento(EVENTOS_ANALITICA.COMPROBANTE_ESTADO_ACTUALIZADO, {
    estado: entrada.estado,
    ...(entrada.tipoComprobante ? { tipo_comprobante: entrada.tipoComprobante } : {}),
    ...(entrada.formaPago ? { forma_pago: entrada.formaPago } : {}),
    ...(entrada.origenVenta ? { origen_venta: entrada.origenVenta } : {}),
  });
}

export function registrarAyudaConsultada(entrada: {
  tipoAyuda: TipoAyudaAnalitica;
  origen: OrigenAyudaAnalitica;
}): void {
  capturarEvento(EVENTOS_ANALITICA.AYUDA_CONSULTADA, {
    tipo_ayuda: entrada.tipoAyuda,
    origen: entrada.origen,
  });
}

export function registrarBorradorAccionRealizada(entrada: {
  accion: AccionBorradorAnalitica;
  origenVenta?: OrigenVenta;
}): void {
  capturarEvento(EVENTOS_ANALITICA.BORRADOR_ACCION_REALIZADA, {
    accion: entrada.accion,
    ...(entrada.origenVenta ? { origen_venta: entrada.origenVenta } : {}),
  });
}

export function registrarVentaCompletada(entrada: {
  entorno: EntornoAnalitica;
  origenVenta: OrigenVenta;
  formaPago?: FormaPagoAnalitica;
}): void {
  capturarEvento(EVENTOS_ANALITICA.VENTA_COMPLETADA, {
    entorno: entrada.entorno,
    origen_venta: entrada.origenVenta,
    ...(entrada.formaPago ? { forma_pago: entrada.formaPago } : {}),
  });
}

export function registrarPrimeraVentaCompletada(entrada: {
  entorno: EntornoAnalitica;
  origenVenta: OrigenVenta;
  formaPago?: FormaPagoAnalitica;
}): void {
  capturarEvento(EVENTOS_ANALITICA.PRIMERA_VENTA_COMPLETADA, {
    entorno: entrada.entorno,
    origen_venta: entrada.origenVenta,
    ...(entrada.formaPago ? { forma_pago: entrada.formaPago } : {}),
  });
}

export function registrarProductoCreadoExitoso(entrada: {
  entorno: EntornoAnalitica;
  origen: OrigenProducto;
}): void {
  capturarEvento(EVENTOS_ANALITICA.PRODUCTO_CREADO_EXITOSO, entrada);
}

export function registrarClienteCreadoExitoso(entrada: {
  entorno: EntornoAnalitica;
  origen: OrigenCliente;
}): void {
  capturarEvento(EVENTOS_ANALITICA.CLIENTE_CREADO_EXITOSO, entrada);
}

export function registrarImportacionCompletada(entrada: {
  entorno: EntornoAnalitica;
  entidad: EntidadImportacion;
  resultado: ResultadoImportacion;
  erroresRango: ErroresRangoImportacion;
}): void {
  capturarEvento(EVENTOS_ANALITICA.IMPORTACION_COMPLETADA, {
    entorno: entrada.entorno,
    entidad: entrada.entidad,
    resultado: entrada.resultado,
    errores_rango: entrada.erroresRango,
  });
}

export function registrarEventoTecnico(nombreEvento: string, propiedades?: PropiedadesAnalitica): void {
  // Los eventos técnicos no forman parte del contrato KPI compartido.
  // La política de proveedores se define en main.tsx mediante before_send de PostHog.
  capturarEvento(nombreEvento, propiedades);
}
