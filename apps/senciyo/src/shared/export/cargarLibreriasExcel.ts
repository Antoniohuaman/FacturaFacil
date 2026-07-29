// Carga bajo demanda de xlsx y exceljs: ninguna de las dos entra en el chunk inicial.
// La Promise se cachea para que llamadas concurrentes reutilicen la misma descarga.
// Si la descarga falla, el cache se limpia para que un siguiente intento reintente desde cero
// en vez de quedar atado para siempre a la misma Promise rechazada.

let promesaXlsx: Promise<typeof import('xlsx')> | null = null;
let promesaExcelJS: Promise<typeof import('exceljs')> | null = null;

export function cargarXlsx(): Promise<typeof import('xlsx')> {
  if (!promesaXlsx) {
    promesaXlsx = import('xlsx').catch((error) => {
      promesaXlsx = null;
      throw error;
    });
  }
  return promesaXlsx;
}

export function cargarExcelJS(): Promise<typeof import('exceljs')> {
  if (!promesaExcelJS) {
    promesaExcelJS = import('exceljs').catch((error) => {
      promesaExcelJS = null;
      throw error;
    });
  }
  return promesaExcelJS;
}
