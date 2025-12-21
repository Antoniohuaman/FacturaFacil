import type { ClienteFormData } from '../models';

export type ClienteFieldSection =
  | 'identificacion'
  | 'contacto'
  | 'ubicacion'
  | 'estado'
  | 'sunat'
  | 'comercial'
  | 'adicional'
  | 'archivos';

export const CLIENTE_FIELD_SECTION_LABELS: Record<ClienteFieldSection, string> = {
  identificacion: 'Identificación y cuenta',
  contacto: 'Contacto',
  ubicacion: 'Ubicación',
  estado: 'Estado',
  sunat: 'Datos SUNAT',
  comercial: 'Configuración comercial',
  adicional: 'Información adicional',
  archivos: 'Archivos e imágenes',
};

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
  | 'clientePorDefecto'
  | 'observaciones'
  | 'archivos';

export interface ClienteFieldConfig {
  id: ClienteFieldId;
  label: string;
  section: ClienteFieldSection;
  defaultVisible: boolean;
  defaultRequired: boolean;
  alwaysVisible?: boolean;
  alwaysRequired?: boolean;
  allowRequiredToggle?: boolean;
  shouldRender?: (formData: ClienteFormData) => boolean;
}

export const CLIENTE_FIELD_CONFIGS: ClienteFieldConfig[] = [
  {
    id: 'tipoDocumento',
    label: 'Tipo de documento',
    section: 'identificacion',
    defaultVisible: true,
    defaultRequired: true,
    alwaysVisible: true,
    alwaysRequired: true,
    allowRequiredToggle: false,
  },
  {
    id: 'numeroDocumento',
    label: 'Número de documento',
    section: 'identificacion',
    defaultVisible: true,
    defaultRequired: true,
    alwaysVisible: true,
    alwaysRequired: true,
    allowRequiredToggle: false,
  },
  {
    id: 'tipoCuenta',
    label: 'Tipo de cuenta',
    section: 'identificacion',
    defaultVisible: true,
    defaultRequired: true,
    alwaysVisible: true,
    alwaysRequired: true,
    allowRequiredToggle: false,
  },
  {
    id: 'tipoPersona',
    label: 'Tipo de persona',
    section: 'identificacion',
    defaultVisible: true,
    defaultRequired: false,
    allowRequiredToggle: false,
  },
  {
    id: 'avatar',
    label: 'Avatar del cliente',
    section: 'identificacion',
    defaultVisible: true,
    defaultRequired: false,
    allowRequiredToggle: false,
  },
  {
    id: 'razonSocial',
    label: 'Razón social',
    section: 'identificacion',
    defaultVisible: true,
    defaultRequired: true,
    alwaysVisible: true,
    alwaysRequired: true,
    allowRequiredToggle: false,
  },
  {
    id: 'nombreComercial',
    label: 'Nombre comercial',
    section: 'identificacion',
    defaultVisible: true,
    defaultRequired: false,
  },
  {
    id: 'primerNombre',
    label: 'Primer nombre',
    section: 'identificacion',
    defaultVisible: true,
    defaultRequired: true,
    alwaysVisible: true,
    alwaysRequired: true,
    allowRequiredToggle: false,
  },
  {
    id: 'segundoNombre',
    label: 'Segundo nombre',
    section: 'identificacion',
    defaultVisible: true,
    defaultRequired: false,
  },
  {
    id: 'apellidoPaterno',
    label: 'Apellido paterno',
    section: 'identificacion',
    defaultVisible: true,
    defaultRequired: true,
    alwaysVisible: true,
    alwaysRequired: true,
    allowRequiredToggle: false,
  },
  {
    id: 'apellidoMaterno',
    label: 'Apellido materno',
    section: 'identificacion',
    defaultVisible: true,
    defaultRequired: true,
    alwaysVisible: true,
    alwaysRequired: true,
    allowRequiredToggle: false,
  },
  {
    id: 'nombreCompleto',
    label: 'Nombre completo (auto)',
    section: 'identificacion',
    defaultVisible: true,
    defaultRequired: false,
    allowRequiredToggle: false,
  },
  {
    id: 'emails',
    label: 'Correos electrónicos',
    section: 'contacto',
    defaultVisible: true,
    defaultRequired: false,
  },
  {
    id: 'telefonos',
    label: 'Teléfonos',
    section: 'contacto',
    defaultVisible: true,
    defaultRequired: false,
  },
  {
    id: 'paginaWeb',
    label: 'Página web',
    section: 'contacto',
    defaultVisible: true,
    defaultRequired: false,
  },
  {
    id: 'pais',
    label: 'País',
    section: 'ubicacion',
    defaultVisible: true,
    defaultRequired: false,
  },
  {
    id: 'departamento',
    label: 'Departamento',
    section: 'ubicacion',
    defaultVisible: true,
    defaultRequired: false,
  },
  {
    id: 'provincia',
    label: 'Provincia',
    section: 'ubicacion',
    defaultVisible: true,
    defaultRequired: false,
  },
  {
    id: 'distrito',
    label: 'Distrito',
    section: 'ubicacion',
    defaultVisible: true,
    defaultRequired: false,
  },
  {
    id: 'ubigeo',
    label: 'Ubigeo',
    section: 'ubicacion',
    defaultVisible: true,
    defaultRequired: false,
  },
  {
    id: 'direccion',
    label: 'Dirección',
    section: 'ubicacion',
    defaultVisible: true,
    defaultRequired: false,
  },
  {
    id: 'referenciaDireccion',
    label: 'Referencia',
    section: 'ubicacion',
    defaultVisible: true,
    defaultRequired: false,
  },
  {
    id: 'estadoCliente',
    label: 'Estado de la cuenta',
    section: 'estado',
    defaultVisible: true,
    defaultRequired: false,
    alwaysVisible: true,
    allowRequiredToggle: false,
  },
  {
    id: 'motivoDeshabilitacion',
    label: 'Motivo de deshabilitación',
    section: 'estado',
    defaultVisible: true,
    defaultRequired: false,
    alwaysVisible: true,
    allowRequiredToggle: false,
  },
  {
    id: 'tipoContribuyente',
    label: 'Tipo de contribuyente',
    section: 'sunat',
    defaultVisible: true,
    defaultRequired: false,
    allowRequiredToggle: false,
  },
  {
    id: 'estadoContribuyente',
    label: 'Estado del contribuyente',
    section: 'sunat',
    defaultVisible: true,
    defaultRequired: false,
    allowRequiredToggle: false,
  },
  {
    id: 'condicionDomicilio',
    label: 'Condición de domicilio',
    section: 'sunat',
    defaultVisible: true,
    defaultRequired: false,
    allowRequiredToggle: false,
  },
  {
    id: 'fechaInscripcion',
    label: 'Fecha de inscripción',
    section: 'sunat',
    defaultVisible: true,
    defaultRequired: false,
    allowRequiredToggle: false,
  },
  {
    id: 'actividadesEconomicas',
    label: 'Actividades económicas',
    section: 'sunat',
    defaultVisible: true,
    defaultRequired: false,
    allowRequiredToggle: false,
  },
  {
    id: 'sistemaEmision',
    label: 'Sistema de emisión',
    section: 'sunat',
    defaultVisible: true,
    defaultRequired: false,
    allowRequiredToggle: false,
  },
  {
    id: 'esEmisorElectronico',
    label: 'Es emisor electrónico',
    section: 'sunat',
    defaultVisible: true,
    defaultRequired: false,
    allowRequiredToggle: false,
  },
  {
    id: 'cpeHabilitado',
    label: 'CPE habilitados',
    section: 'sunat',
    defaultVisible: true,
    defaultRequired: false,
    allowRequiredToggle: false,
  },
  {
    id: 'esAgenteRetencion',
    label: 'Agente de retención',
    section: 'sunat',
    defaultVisible: true,
    defaultRequired: false,
    allowRequiredToggle: false,
  },
  {
    id: 'esAgentePercepcion',
    label: 'Agente de percepción',
    section: 'sunat',
    defaultVisible: true,
    defaultRequired: false,
    allowRequiredToggle: false,
  },
  {
    id: 'esBuenContribuyente',
    label: 'Buen contribuyente',
    section: 'sunat',
    defaultVisible: true,
    defaultRequired: false,
    allowRequiredToggle: false,
  },
  {
    id: 'exceptuadaPercepcion',
    label: 'Exceptuada de percepción',
    section: 'sunat',
    defaultVisible: true,
    defaultRequired: false,
    allowRequiredToggle: false,
  },
  {
    id: 'formaPago',
    label: 'Forma de pago',
    section: 'comercial',
    defaultVisible: true,
    defaultRequired: false,
  },
  {
    id: 'monedaPreferida',
    label: 'Moneda preferida',
    section: 'comercial',
    defaultVisible: true,
    defaultRequired: false,
  },
  {
    id: 'listaPrecio',
    label: 'Lista de precios',
    section: 'comercial',
    defaultVisible: true,
    defaultRequired: false,
  },
  {
    id: 'usuarioAsignado',
    label: 'Usuario asignado',
    section: 'comercial',
    defaultVisible: true,
    defaultRequired: false,
  },
  {
    id: 'clientePorDefecto',
    label: 'Cliente por defecto',
    section: 'comercial',
    defaultVisible: true,
    defaultRequired: false,
    allowRequiredToggle: false,
  },
  {
    id: 'observaciones',
    label: 'Observaciones',
    section: 'adicional',
    defaultVisible: true,
    defaultRequired: false,
  },
  {
    id: 'archivos',
    label: 'Archivos del cliente',
    section: 'archivos',
    defaultVisible: true,
    defaultRequired: false,
    allowRequiredToggle: false,
  },
];

export const ALWAYS_VISIBLE_FIELD_IDS = CLIENTE_FIELD_CONFIGS.filter((field) => field.alwaysVisible).map(
  (field) => field.id
);

export const ALWAYS_REQUIRED_FIELD_IDS = CLIENTE_FIELD_CONFIGS.filter((field) => field.alwaysRequired).map(
  (field) => field.id
);

const FORCE_DEFAULT_VISIBLE_FIELD_IDS: ClienteFieldId[] = ['direccion', 'segundoNombre'];

const BASE_DEFAULT_VISIBLE_FIELD_IDS = CLIENTE_FIELD_CONFIGS.filter(
  (field) => field.defaultRequired || field.alwaysRequired || field.alwaysVisible
).map((field) => field.id);

export const DEFAULT_VISIBLE_FIELD_IDS = Array.from(
  new Set<ClienteFieldId>([...BASE_DEFAULT_VISIBLE_FIELD_IDS, ...FORCE_DEFAULT_VISIBLE_FIELD_IDS])
);

export const DEFAULT_REQUIRED_FIELD_IDS = CLIENTE_FIELD_CONFIGS.filter(
  (field) => field.defaultRequired || field.alwaysRequired
).map((field) => field.id);
