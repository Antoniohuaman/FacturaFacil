import { useState } from 'react';
import type { CampoConfigurableDocumento } from './tiposCamposConfigurables';

function cargarConfiguracion(
  definicion: CampoConfigurableDocumento[],
  storageKey: string,
): CampoConfigurableDocumento[] {
  try {
    const guardado = localStorage.getItem(storageKey);
    if (!guardado) return definicion;
    const parseado = JSON.parse(guardado) as Array<{ id: string; visible: boolean }>;
    return definicion.map((campo) => {
      if (campo.obligatorio && !campo.configurableComoObligatorio) return campo;
      const guardadoCampo = parseado.find((p) => p.id === campo.id);
      return guardadoCampo ? { ...campo, visible: guardadoCampo.visible } : campo;
    });
  } catch {
    return definicion;
  }
}

/**
 * Estado + persistencia (localStorage) de la visibilidad individual de
 * campos configurables de un formulario de documento. La definición
 * (`valoresPorDefecto`) es la fuente de verdad de labels/grupos/obligatoriedad;
 * solo la visibilidad de cada campo se guarda entre sesiones.
 */
export function useConfiguracionCampos(valoresPorDefecto: CampoConfigurableDocumento[], storageKey: string) {
  const [campos, setCampos] = useState<CampoConfigurableDocumento[]>(() =>
    cargarConfiguracion(valoresPorDefecto, storageKey),
  );

  function esVisible(id: string): boolean {
    return campos.find((c) => c.id === id)?.visible ?? false;
  }

  function guardar(nuevosCampos: CampoConfigurableDocumento[]) {
    setCampos(nuevosCampos);
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify(nuevosCampos.map((c) => ({ id: c.id, visible: c.visible }))),
      );
    } catch {
      // Sin acción: si falla localStorage, la preferencia solo dura la sesión.
    }
  }

  return { campos, esVisible, guardar };
}
