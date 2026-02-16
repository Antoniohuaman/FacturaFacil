export type ClienteFieldId =
  | 'tipoDocumento'
  | 'numeroDocumento'
  | 'tipoCuenta'
  | 'tipoPersona'
  | 'avatar'
  | 'razonSocial'
  | 'nombreComercial'
  | 'primerNombre'
  | 'segundoNombre'
  | 'apellidoPaterno'
  | 'apellidoMaterno'
  | 'nombreCompleto'
  | 'emails'
  | 'telefonos'
  | 'paginaWeb'
  | 'pais'
  | 'departamento'
  | 'provincia'
  | 'distrito'
  | 'ubigeo'
  | 'direccion'
  | 'referenciaDireccion'
  | 'estadoCliente'
  | 'motivoDeshabilitacion'
  | 'tipoContribuyente'
  | 'estadoContribuyente'
  | 'condicionDomicilio'
  | 'fechaInscripcion'
  | 'actividadesEconomicas'
  | 'sistemaEmision'
  | 'esEmisorElectronico'
  | 'cpeHabilitado'
  | 'esAgenteRetencion'
  | 'esAgentePercepcion'
  | 'esBuenContribuyente'
  | 'exceptuadaPercepcion'
  | 'formaPago'
  | 'monedaPreferida'
  | 'listaPrecio'
  | 'usuarioAsignado'
  | 'observaciones'
  | 'archivos';

export interface ClienteFieldConfig {
  id: ClienteFieldId;
  label: string;
  defaultRequired?: boolean;
}

export const CLIENTE_FIELD_CONFIGS: ClienteFieldConfig[] = [
  { id: 'tipoDocumento', label: 'Tipo de documento', defaultRequired: true },
  { id: 'numeroDocumento', label: 'Número de documento', defaultRequired: true },
  { id: 'tipoCuenta', label: 'Tipo de cuenta', defaultRequired: true },
  { id: 'tipoPersona', label: 'Tipo de persona' },
  { id: 'avatar', label: 'Avatar del cliente' },
  { id: 'razonSocial', label: 'Razón social', defaultRequired: true },
  { id: 'nombreComercial', label: 'Nombre comercial' },
  { id: 'primerNombre', label: 'Primer nombre', defaultRequired: true },
  { id: 'segundoNombre', label: 'Segundo nombre' },
  { id: 'apellidoPaterno', label: 'Apellido paterno', defaultRequired: true },
  { id: 'apellidoMaterno', label: 'Apellido materno', defaultRequired: true },
  { id: 'nombreCompleto', label: 'Nombre completo (auto)' },
  { id: 'emails', label: 'Correos electrónicos' },
  { id: 'telefonos', label: 'Teléfonos' },
  { id: 'paginaWeb', label: 'Página web' },
  { id: 'pais', label: 'País' },
  { id: 'departamento', label: 'Departamento' },
  { id: 'provincia', label: 'Provincia' },
  { id: 'distrito', label: 'Distrito' },
  { id: 'ubigeo', label: 'Ubigeo' },
  { id: 'direccion', label: 'Dirección' },
  { id: 'referenciaDireccion', label: 'Referencia' },
  { id: 'estadoCliente', label: 'Estado de la cuenta' },
  { id: 'motivoDeshabilitacion', label: 'Motivo de deshabilitación' },
  { id: 'tipoContribuyente', label: 'Tipo de contribuyente' },
  { id: 'estadoContribuyente', label: 'Estado del contribuyente' },
  { id: 'condicionDomicilio', label: 'Condición de domicilio' },
  { id: 'fechaInscripcion', label: 'Fecha de inscripción' },
  { id: 'actividadesEconomicas', label: 'Actividades económicas' },
  { id: 'sistemaEmision', label: 'Sistema de emisión' },
  { id: 'esEmisorElectronico', label: 'Es emisor electrónico' },
  { id: 'cpeHabilitado', label: 'CPE habilitados' },
  { id: 'esAgenteRetencion', label: 'Agente de retención' },
  { id: 'esAgentePercepcion', label: 'Agente de percepción' },
  { id: 'esBuenContribuyente', label: 'Buen contribuyente' },
  { id: 'exceptuadaPercepcion', label: 'Exceptuada de percepción' },
  { id: 'formaPago', label: 'Forma de pago' },
  { id: 'monedaPreferida', label: 'Moneda preferida' },
  { id: 'listaPrecio', label: 'Perfil de precio' },
  { id: 'usuarioAsignado', label: 'Usuario asignado' },
  { id: 'observaciones', label: 'Observaciones' },
  { id: 'archivos', label: 'Archivos del cliente' },
];

export const CAMPOS_REQUERIDOS_FORMULARIO: ClienteFieldId[] = CLIENTE_FIELD_CONFIGS.filter(
  (field) => field.defaultRequired
).map((field) => field.id);
