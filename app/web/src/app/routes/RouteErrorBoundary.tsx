/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
import { useRouteError, isRouteErrorResponse } from "react-router-dom";

export default function RouteErrorBoundary() {
  const error = useRouteError();

  let title = "Algo salió mal";
  let message = "Ocurrió un error inesperado. Intenta recargar la página.";
  let details: string | undefined;

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    message = (error.data as any)?.message || message;
  } else if (error instanceof Error) {
    message = error.message;
    details = error.stack;
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center">!</div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{message}</p>
            {details && (
              <pre className="mt-3 max-h-60 overflow-auto text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-3 rounded" role="alert">
                {details}
              </pre>
            )}
            <div className="mt-4 flex gap-2">
              <button onClick={() => window.location.reload()} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Recargar</button>
              <button onClick={() => history.back()} className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">Volver</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
