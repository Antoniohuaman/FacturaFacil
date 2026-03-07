export const INDICE_Z_TOOLTIP = 13000;

export const VALORES_PREDETERMINADOS_TOOLTIP = {
  retrasoMostrarMs: 400,
  retrasoOcultarMs: 100,
  desplazamientoPx: 8,
  anchoMaximoPx: 280,
  ubicacion: "arriba",
  alineacion: "centro",
} as const;

export const TOOLTIPS_IMPORTACION_CLIENTES = {
  archivo: [
    'No insertes ni reordenes columnas.',
    'Evita fórmulas y celdas combinadas.',
    'Teléfono: entre 6 y 15 dígitos.',
    'RUC usa Razón social; otros códigos usan Nombres y apellidos.',
  ].join('\n'),
  modoBasico: 'Importación rápida con campos esenciales.',
  modoCompleto: 'Incluye campos ampliados y datos SUNAT.',
  importar: 'Si existe el documento, actualiza. Si no existe, crea.',
} as const;
