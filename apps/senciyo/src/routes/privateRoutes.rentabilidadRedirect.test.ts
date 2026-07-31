import { describe, it, expect } from 'vitest';
import type { RouteObject } from 'react-router-dom';
import { privateRoutes } from './privateRoutes';

function encontrarRuta(rutas: RouteObject[], path: string): RouteObject | undefined {
  for (const ruta of rutas) {
    if (ruta.path === path) return ruta;
    if (ruta.children) {
      const encontrada = encontrarRuta(ruta.children, path);
      if (encontrada) return encontrada;
    }
  }
  return undefined;
}

describe('privateRoutes — alias de la ruta antigua de Rentabilidad de ventas', () => {
  const ruta = encontrarRuta(privateRoutes, '/indicadores/reportes/rentabilidad-ventas');

  it('sigue existiendo como loader-redirect, nunca como una segunda página productiva', () => {
    expect(ruta).toBeDefined();
    expect(typeof ruta?.loader).toBe('function');
    expect(ruta?.element).toBeUndefined();
  });

  it('redirige a la vista canónica preservando autoExport/from/to/EstablecimientoId/returnTo', async () => {
    const request = new Request(
      'https://app.test/indicadores/reportes/rentabilidad-ventas?autoExport=1&reportId=rentabilidad-ventas&from=2026-06-01&to=2026-06-30&EstablecimientoId=est-1&returnTo=%2Findicadores'
    );
    const loader = ruta?.loader as (args: { request: Request }) => Response;
    const respuesta = loader({ request });
    expect(respuesta).toBeInstanceOf(Response);
    const location = respuesta.headers.get('Location') ?? '';
    const url = new URL(location, 'https://app.test');
    expect(url.pathname).toBe('/indicadores');
    expect(url.searchParams.get('view')).toBe('rentabilidad');
    expect(url.searchParams.get('autoExport')).toBe('1');
    expect(url.searchParams.get('reportId')).toBe('rentabilidad-ventas');
    expect(url.searchParams.get('from')).toBe('2026-06-01');
    expect(url.searchParams.get('to')).toBe('2026-06-30');
    expect(url.searchParams.get('EstablecimientoId')).toBe('est-1');
    expect(url.searchParams.get('returnTo')).toBe('/indicadores');
  });

  it('usa un estatus de redirección HTTP (302) — el mismo mecanismo replace-like ya usado por otras redirecciones del archivo', async () => {
    const request = new Request('https://app.test/indicadores/reportes/rentabilidad-ventas');
    const loader = ruta?.loader as (args: { request: Request }) => Response;
    const respuesta = loader({ request });
    expect(respuesta.status).toBe(302);
  });
});
