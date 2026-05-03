import { createRoot } from "react-dom/client";
import posthog from "posthog-js";
import { PostHogProvider } from "@posthog/react";
import * as amplitude from "@amplitude/analytics-browser";
import { sessionReplayPlugin } from "@amplitude/plugin-session-replay-browser";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "./contexts/ThemeContext";
import {
  esEntornoAnaliticaHabilitado,
  obtenerConfiguracionAnaliticaPublica,
} from "./shared/analitica/configuracionAnalitica";
import { EVENTOS_ANALITICA } from "./shared/analitica/eventosAnalitica";
import { FeedbackProvider } from "./shared/feedback/FeedbackProvider";
import { TenantProvider } from "./shared/tenant/TenantProvider";
import { ProveedorAyudaGuiada } from "./shared/tour";

const {
  amplitudeApiKey,
  amplitudeReplaySampleRate,
  posthogHost,
  posthogKey,
} = obtenerConfiguracionAnaliticaPublica();
const eventosAnaliticaPermitidos = new Set<string>(Object.values(EVENTOS_ANALITICA));
const eventosPosthogInternosPermitidos = new Set<string>(['$identify', '$groupidentify']);
const selectoresReplayBloqueados = ['.amp-block', 'iframe', '[contenteditable="true"]'];
const selectoresReplayEnmascarados = ['.amp-mask', '[data-private]', '[data-sensitive]'];
const selectoresReplayDesenmascarados = ['.amp-unmask'];

const entornoAnaliticaHabilitado = esEntornoAnaliticaHabilitado();
const posthogHabilitado = Boolean(posthogKey) && entornoAnaliticaHabilitado;
const amplitudeHabilitado = Boolean(amplitudeApiKey) && entornoAnaliticaHabilitado;

let posthogInicializado = false;
if (posthogHabilitado) {
  try {
    posthog.init(posthogKey!, {
      ...(posthogHost ? { api_host: posthogHost } : {}),
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
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
    posthogInicializado = true;
  } catch {
    posthogInicializado = false;
  }
}

let amplitudeInicializado = false;
if (amplitudeHabilitado) {
  try {
    amplitude.init(amplitudeApiKey!, {
      defaultTracking: {
        attribution: false,
        fileDownloads: false,
        formInteractions: false,
        pageViews: false,
        sessions: true,
      },
    });
    amplitudeInicializado = true;
  } catch {
    amplitudeInicializado = false;
  }

  if (amplitudeInicializado) {
    try {
      amplitude.add(
        sessionReplayPlugin({
          sampleRate: amplitudeReplaySampleRate,
          privacyConfig: {
            blockSelector: selectoresReplayBloqueados,
            defaultMaskLevel: 'conservative',
            maskSelector: selectoresReplayEnmascarados,
            unmaskSelector: selectoresReplayDesenmascarados,
          },
        }),
      );
    } catch {
      // Replay puede fallar sin desactivar Amplitude como proveedor principal.
    }
  }
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
  posthogInicializado ? (
    <PostHogProvider client={posthog}>{AppTree}</PostHogProvider>
  ) : (
    AppTree
  )
);
