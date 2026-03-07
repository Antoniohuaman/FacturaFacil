import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Aquí podrías enviar el error a un servicio de monitoreo
    // reportError(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    window.location.href = '/comprobantes';
  };

  render() {
    if (this.state.hasError) {
      // Renderizar UI de fallback personalizada
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            {/* Error Card */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="bg-red-50 px-6 py-4 border-b border-red-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-red-900">
                      Algo salió mal
                    </h1>
                    <p className="text-sm text-red-700">
                      Ocurrió un error inesperado en la aplicación
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-4 space-y-4">
                <p className="text-sm text-gray-600">
                  No te preocupes, esto no afecta tus datos. Puedes intentar recargar la página o volver al inicio.
                </p>

                {/* Error details (development only) */}
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-500 hover:text-gray-700 flex items-center gap-2">
                      <Bug className="w-3 h-3" />
                      Detalles técnicos
                    </summary>
                    <div className="mt-2 p-3 bg-gray-100 rounded border border-gray-200">
                      <div className="font-medium text-red-700 mb-2">
                        {this.state.error.name}: {this.state.error.message}
                      </div>
                      <pre className="whitespace-pre-wrap text-gray-600 text-xs">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  </details>
                )}
              </div>

              {/* Actions */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex gap-3">
                  <button
                    onClick={this.handleRetry}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reintentar
                  </button>
                  <button
                    onClick={this.handleGoHome}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    <Home className="w-4 h-4" />
                    Inicio
                  </button>
                </div>
              </div>
            </div>

            {/* Help text */}
            <p className="text-center text-xs text-gray-500 mt-4">
              Si el problema persiste, contacta al soporte técnico
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook para usar el error boundary programáticamente
export const useErrorHandler = () => {
  return (error: Error, errorInfo?: string) => {
    console.error('Manual error report:', error, errorInfo);

    // En un entorno real, aquí enviarías el error a tu servicio de monitoreo
    // reportError(error, { extra: errorInfo });

    throw error; // Esto activará el ErrorBoundary más cercano
  };
};