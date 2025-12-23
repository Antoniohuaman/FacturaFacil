const AUTO_EXPORT_PARAM = 'autoExport';
const REPORT_ID_PARAM = 'reportId';
const RETURN_TO_PARAM = 'returnTo';
const FROM_PARAM = 'from';
const TO_PARAM = 'to';
const ESTABLISHMENT_PARAM = 'establishmentId';

export const REPORTS_HUB_PATH = '/indicadores?view=reportes';

export interface AutoExportRequest {
  reportId: string;
  from?: string;
  to?: string;
  establishmentId?: string;
  returnTo?: string;
}

export const parseAutoExportRequest = (searchParams: URLSearchParams): AutoExportRequest | null => {
  if (searchParams.get(AUTO_EXPORT_PARAM) !== '1') {
    return null;
  }

  const reportId = searchParams.get(REPORT_ID_PARAM);
  if (!reportId) {
    return null;
  }

  return {
    reportId,
    from: searchParams.get(FROM_PARAM) ?? undefined,
    to: searchParams.get(TO_PARAM) ?? undefined,
    establishmentId: searchParams.get(ESTABLISHMENT_PARAM) ?? undefined,
    returnTo: searchParams.get(RETURN_TO_PARAM) ?? undefined
  };
};

export const stripAutoExportParams = (searchParams: URLSearchParams): URLSearchParams => {
  const next = new URLSearchParams(searchParams);
  next.delete(AUTO_EXPORT_PARAM);
  next.delete(REPORT_ID_PARAM);
  next.delete(RETURN_TO_PARAM);
  next.delete(FROM_PARAM);
  next.delete(TO_PARAM);
  next.delete(ESTABLISHMENT_PARAM);
  return next;
};

export const decodeReturnTo = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value);
  } catch (error) {
    console.warn('[AutoExport] No se pudo decodificar returnTo', error);
    return value;
  }
};
