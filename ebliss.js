import { createEBlissAPI } from './ebliss-api.js';

const SUPABASE_URL = 'https://zaabghrczrbqkxrhkinj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_QL6Bz9m30CV8HFIdkLQ42Q_N9AFIOkF';

function createSDK()
{
  if (!window.supabase)
  {
    throw new Error('Supabase client library is not loaded');
  }

  // Backend transport is intentionally private to the SDK.
  // Application code should only use the eBliss SDK surface below.
  const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

  const api = createEBlissAPI(supabase);

  return Object.freeze({
    auth: api.auth,
    model: api.model,
    holons: api.holons,
  });
}

export const eBliss = createSDK();
