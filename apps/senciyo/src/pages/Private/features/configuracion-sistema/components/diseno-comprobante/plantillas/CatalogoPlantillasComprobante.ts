import type { PlantillaComprobante } from './TiposPlantillasComprobante';

export const CATALOGO_PLANTILLAS_COMPROBANTE: PlantillaComprobante[] = [
  {
    id: 'predeterminada',
    nombre: 'Modelo 1',
    formato: 'A4',
    descripcionCorta: 'Diseno base y equilibrado para la mayoria de comprobantes.',
    rutaMiniatura: '/plantillas/plantillasComprobantes/modelo1.png',
  },
  {
    id: 'modelo-2',
    nombre: 'Modelo 2',
    formato: 'A4',
    descripcionCorta: 'Encabezado compacto con jerarquia clara.',
    rutaMiniatura: '/plantillas/plantillasComprobantes/modelo2.png',
  },
  {
    id: 'modelo-3',
    nombre: 'Modelo 3',
    formato: 'A4',
    descripcionCorta: 'Distribucion amplia para datos de cliente y totales.',
    rutaMiniatura: '/plantillas/plantillasComprobantes/modelo3.png',
  },
  {
    id: 'modelo-4',
    nombre: 'Modelo 4',
    formato: 'A4',
    descripcionCorta: 'Estilo minimalista con tabla de items destacada.',
    rutaMiniatura: '/plantillas/plantillasComprobantes/modelo4.png',
  },
  {
    id: 'modelo-5',
    nombre: 'Modelo 5',
    formato: 'A4',
    descripcionCorta: 'Bloques de informacion en columnas balanceadas.',
    rutaMiniatura: '/plantillas/plantillasComprobantes/modelo5.png',
  },
  {
    id: 'modelo-6',
    nombre: 'Modelo 6',
    formato: 'A4',
    descripcionCorta: 'Presentacion sobria con foco en totales.',
    rutaMiniatura: '/plantillas/plantillasComprobantes/modelo6.png',
  },
  {
    id: 'modelo-7',
    nombre: 'Modelo 7',
    formato: 'A4',
    descripcionCorta: 'Encabezado destacado y separadores sutiles.',
    rutaMiniatura: '/plantillas/plantillasComprobantes/modelo7.png',
  },
  {
    id: 'modelo-8',
    nombre: 'Modelo 8',
    formato: 'A4',
    descripcionCorta: 'Composicion limpia para lectura rapida.',
    rutaMiniatura: '/plantillas/plantillasComprobantes/modelo8.png',
  },
];
