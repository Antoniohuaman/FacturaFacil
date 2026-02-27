import posthog from 'posthog-js'

let inicializado = false

function iniciarPosthogSiAplica() {
  if (inicializado) {
    return
  }

  const clave = import.meta.env.VITE_PUBLIC_POSTHOG_KEY as string | undefined
  const host = import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string | undefined

  if (!clave) {
    return
  }

  posthog.init(clave, {
    ...(host ? { api_host: host } : {}),
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false
  })

  inicializado = true
}

export function registrarEventoAnalitica(evento: string, propiedades?: Record<string, unknown>) {
  iniciarPosthogSiAplica()

  if (!inicializado) {
    return
  }

  posthog.capture(evento, propiedades)
}
