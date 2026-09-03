import { createEBSupabase } from './eBsupabase.js';

export function createEBlissSDK(backend)
{
  if (!backend) throw new Error('eBliss backend is required');

  return Object.freeze({
    auth: backend.auth,
    model: backend.model,
    holons: backend.holons,
    relationships: backend.relationships,
  });
}

const backend = createEBSupabase();
export const eBliss = createEBlissSDK(backend);
