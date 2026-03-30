import { createRoot } from "react-dom/client";
import posthog from "posthog-js";
import { PostHogProvider } from "@posthog/react";
import * as amplitude from "@amplitude/analytics-browser";
import { sessionReplayPlugin } from "@amplitude/plugin-session-replay-browser";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "./contexts/ThemeContext";
import { EVENTOS_ANALITICA } from "./shared/analitica/eventosAnalitica";
import { FeedbackProvider } from "./shared/feedback/FeedbackProvider";
import { TenantProvider } from "./shared/tenant/TenantProvider";
import { ProveedorAyudaGuiada } from "./shared/tour";

const posthogKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY as string | undefined;
const posthogHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string | undefined;

// ✅ NUEVO (Amplitude)
const amplitudeApiKey = import.meta.env.VITE_PUBLIC_AMPLITUDE_API_KEY as string | undefined;
const amplitudeReplaySampleRate = import.meta.env.VITE_PUBLIC_AMPLITUDE_SESSION_REPLAY_SAMPLE_RATE as string | undefined;
const eventosAnaliticaPermitidos = new Set<string>(Object.values(EVENTOS_ANALITICA));
const eventosPosthogInternosPermitidos = new Set<string>(['$identify', '$groupidentify']);
const selectoresReplayBloqueados = ['.amp-block', 'iframe', '[contenteditable="true"]'];
const selectoresReplayEnmascarados = ['.amp-mask', '[data-private]', '[data-sensitive]'];
const selectoresReplayDesenmascarados = ['.amp-unmask'];

const esHostLocal = (): boolean =>
  typeof window !== "undefined" && ['localhost', '127.0.0.1'].includes(window.location.hostname);

const normalizarSampleRateReplay = (valor: string | undefined): number => {
  const sampleRate = Number(valor ?? '1');

  if (!Number.isFinite(sampleRate)) {
    return 1;
  }

  return Math.min(1, Math.max(0, sampleRate));
};

if (posthogKey) {
  posthog.init(posthogKey, {
    ...(posthogHost ? { api_host: posthogHost } : {}),
    autocapture: false, // Desactivar autocapture para evitar capturar eventos no deseados
    capture_pageview: false, // Desactivar captura automática de pageviews
    capture_pageleave: false, // Desactivar captura automática de pageleave
    before_send: (event) => {
      if (!event) {
        return null;
      }

      const nombreEvento = event.event;
      if (typeof nombreEvento !== "string") {
        return null;
      }

      if (nombreEvento.startsWith("$")) {
        return eventosPosthogInternosPermitidos.has(nombreEvento) ? event : null;
      }

      return eventosAnaliticaPermitidos.has(nombreEvento) ? event : null;
    },
  });
}

// ✅ NUEVO (Amplitude): init seguro, sin tracking automático
if (amplitudeApiKey && import.meta.env.PROD && !esHostLocal()) {
  amplitude.init(amplitudeApiKey, {
    // Session Replay exige sesiones automáticas, pero se mantiene apagado el resto.
    defaultTracking: {
      attribution: false,
      fileDownloads: false,
      formInteractions: false,
      pageViews: false,
      sessions: true,
    },
  });

  amplitude.add(
    sessionReplayPlugin({
      sampleRate: normalizarSampleRateReplay(amplitudeReplaySampleRate),
      privacyConfig: {
        blockSelector: selectoresReplayBloqueados,
        defaultMaskLevel: 'conservative',
        maskSelector: selectoresReplayEnmascarados,
        unmaskSelector: selectoresReplayDesenmascarados,
      },
    }),
  );
}
const AppTree = (
  <ThemeProvider>
    <FeedbackProvider>
      <ProveedorAyudaGuiada>
        <TenantProvider>
          <App />
        </TenantProvider>
      </ProveedorAyudaGuiada>
    </FeedbackProvider>
  </ThemeProvider>
);

createRoot(document.getElementById("root")!).render(
  posthogKey ? (
    <PostHogProvider client={posthog}>{AppTree}</PostHogProvider>
  ) : (
    AppTree
  )
);
