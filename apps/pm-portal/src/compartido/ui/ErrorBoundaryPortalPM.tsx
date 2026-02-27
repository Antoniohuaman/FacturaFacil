import { Component, type ErrorInfo, type ReactNode } from 'react'
import { EstadoVista } from '@/compartido/ui/EstadoVista'

interface PropiedadesErrorBoundaryPortalPM {
  children: ReactNode
}

interface EstadoErrorBoundaryPortalPM {
  hayError: boolean
  detalle: string
}

export class ErrorBoundaryPortalPM extends Component<
  PropiedadesErrorBoundaryPortalPM,
  EstadoErrorBoundaryPortalPM
> {
  state: EstadoErrorBoundaryPortalPM = {
    hayError: false,
    detalle: ''
  }

  static getDerivedStateFromError(error: Error): EstadoErrorBoundaryPortalPM {
    return {
      hayError: true,
      detalle: error.message || 'Ocurrió un error inesperado.'
    }
  }

  componentDidCatch(error: Error, informacion: ErrorInfo) {
    console.error('ErrorBoundary Portal PM:', error, informacion)
  }

  render() {
    if (!this.state.hayError) {
      return this.props.children
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-2xl font-semibold">No se pudo cargar el Portal PM</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Ocurrió un error inesperado durante la carga. Intenta recargar y, si persiste, verifica la configuración.
          </p>

          <div className="mt-4">
            <EstadoVista
              cargando={false}
              error={this.state.detalle}
              vacio={false}
              mensajeVacio=""
            >
              <></>
            </EstadoVista>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900"
            >
              Recargar
            </button>
            <button
              type="button"
              onClick={() => window.location.assign('/ingresar')}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              Ir a Ingresar
            </button>
          </div>
        </div>
      </div>
    )
  }
}