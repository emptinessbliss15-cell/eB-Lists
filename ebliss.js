import { createSupabaseBackend } from './backends/supabase.js';

function createSDK(backend)
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

// Current backend selection. Swap this factory to replace Supabase without
// changing application code or the public eBliss SDK surface.
const backend = createSupabaseBackend();

export const eBliss = createSDK(backend);
