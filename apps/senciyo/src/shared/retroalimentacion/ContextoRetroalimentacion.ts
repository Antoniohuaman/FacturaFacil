import { createContext } from 'react';
import type { RetroalimentacionApi } from './tipos';

export const ContextoRetroalimentacion = createContext<RetroalimentacionApi | null>(null);