export type FormatoPlantillaComprobante = 'A4' | 'TICKET' | 'AMBOS';

export interface PlantillaComprobante {
  id: string;
  nombre: string;
  formato: FormatoPlantillaComprobante;
  descripcionCorta?: string;
  rutaMiniatura?: string;
}
