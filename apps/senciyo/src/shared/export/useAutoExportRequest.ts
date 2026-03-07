import { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { decodeReturnTo, parseAutoExportRequest, REPORTS_HUB_PATH, stripAutoExportParams, type AutoExportRequest } from './autoExportParams';

interface UseAutoExportRequestResult {
  request: AutoExportRequest | null;
  finish: (fallbackPath?: string) => void;
}

export const useAutoExportRequest = (targetReportId: string): UseAutoExportRequestResult => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const request = useMemo(() => {
    const parsed = parseAutoExportRequest(searchParams);
    if (!parsed || parsed.reportId !== targetReportId) {
      return null;
    }
    return parsed;
  }, [searchParams, targetReportId]);

  const clearRequest = useCallback(() => {
    const next = stripAutoExportParams(searchParams);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const finish = useCallback((fallbackPath?: string) => {
    const currentRequest = request;
    clearRequest();
    if (!currentRequest) {
      return;
    }
    const destination = decodeReturnTo(currentRequest.returnTo) ?? fallbackPath ?? REPORTS_HUB_PATH;
    if (destination) {
      navigate(destination, { replace: true });
    }
  }, [clearRequest, navigate, request]);

  return { request, finish };
};
