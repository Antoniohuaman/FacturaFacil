export interface CampoConfigurableDocumento {
  id: string;
  label: string;
  visible: boolean;
  obligatorio?: boolean;
  configurableComoObligatorio?: boolean;
  grupo?: string;
}
