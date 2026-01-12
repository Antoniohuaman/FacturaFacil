export type ClientesChangedDetail = {
  reason: 'update' | 'create' | 'delete';
  sourceId?: string;
};

export const CLIENTES_CHANGED_EVENT = 'clientes:changed';

export const emitClientesChanged = (detail?: ClientesChangedDetail) => {
  try {
    const event = new CustomEvent<ClientesChangedDetail>(CLIENTES_CHANGED_EVENT, { detail });
    window.dispatchEvent(event);
  } catch {
    // no-op: CustomEvent not available (very old envs)
  }
};

export const onClientesChanged = (
  handler: (detail: ClientesChangedDetail) => void
): (() => void) => {
  const listener = (evt: Event) => {
    const custom = evt as CustomEvent<ClientesChangedDetail>;
    handler(custom.detail);
  };
  window.addEventListener(CLIENTES_CHANGED_EVENT, listener as EventListener);
  return () => window.removeEventListener(CLIENTES_CHANGED_EVENT, listener as EventListener);
};
