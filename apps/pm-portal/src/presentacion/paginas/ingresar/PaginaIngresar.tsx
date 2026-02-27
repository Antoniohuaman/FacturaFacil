import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Navigate, useNavigate } from 'react-router-dom'
import { ingresoSchema, type IngresoEntrada } from '@/compartido/validacion/esquemas'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'

export function PaginaIngresar() {
  const { usuario, iniciarSesionConCorreo, error } = useSesionPortalPM()
  const navegar = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<IngresoEntrada>({
    resolver: zodResolver(ingresoSchema),
    defaultValues: {
      correo: '',
      contrasena: ''
    }
  })

  useEffect(() => {
    if (usuario) {
      navegar('/', { replace: true })
    }
  }, [usuario, navegar])

  if (usuario) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold">Ingresar al Portal PM</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Usa tu correo corporativo y contraseña para continuar.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={handleSubmit(async (valores) => {
            const exito = await iniciarSesionConCorreo(valores.correo, valores.contrasena)
            if (exito) {
              navegar('/', { replace: true })
            }
          })}
        >
          <div className="space-y-1">
            <label className="text-sm font-medium">Correo</label>
            <input
              type="email"
              {...register('correo')}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800"
            />
            {errors.correo ? <p className="text-xs text-red-500">{errors.correo.message}</p> : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Contraseña</label>
            <input
              type="password"
              {...register('contrasena')}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800"
            />
            {errors.contrasena ? <p className="text-xs text-red-500">{errors.contrasena.message}</p> : null}
          </div>

          {error ? <p className="text-sm text-red-500">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-70 dark:bg-slate-200 dark:text-slate-900"
          >
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
