import { createEBSupabase } from './eBsupabase.js';

export function createEBlissSDK(backend)
{
  if (!backend)
  {
    throw new Error('eBliss backend is required');
  }

  return Object.freeze({
    auth: backend.auth,
    model: backend.model,
    holons: backend.holons,
  });
}

// Current backend selection. Replace this one line when another backend
// implements the eBliss backend contract.
const backend = createEBSupabase();

export const eBliss = createEBlissSDK(backend);
