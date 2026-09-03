// eBliss Supabase backend adapter.
//
// This is the only layer that knows how the current eBliss backend is
// implemented with Supabase. The rest of the application talks to the
// eBliss backend contract instead of calling Supabase directly.

const SUPABASE_URL = 'https://zaabghrczrbqkxrhkinj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_QL6Bz9m30CV8HFIdkLQ42Q_N9AFIOkF';

export function createEBSupabase()
{
  if (!window.supabase) throw new Error('Supabase client library is not loaded');

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

  const result = (label, response) =>
  {
    if (response.error) throw new Error(`${label}: ${response.error.message}`);
    return response.data;
  };

  return {
    auth: {
      getSession() { return supabase.auth.getSession(); },
      onAuthStateChange(callback) { return supabase.auth.onAuthStateChange(callback); },
      signIn(email, password) { return supabase.auth.signInWithPassword({ email, password }); },
      signUp(email, password) { return supabase.auth.signUp({ email, password }); },
      signOut() { return supabase.auth.signOut({ scope: 'local' }); },
    },

    model: {
      async load()
      {
        const [holons, relationships, relationshipTypes] = await Promise.all([
          supabase.from('holons_view').select('*').order('created_at'),
          supabase.from('relationships_view').select('*').order('position').order('created_at'),
          supabase.from('relationship_types').select('*').order('name'),
        ]);

        return {
          holons: result('Holons', holons) || [],
          relationships: result('Relationships', relationships) || [],
          relationshipTypes: result('Relationship types', relationshipTypes) || [],
        };
      },
    },

    holons: {
      async create(values)
      {
        const response = await supabase.from('holons').insert(values).select().single();
        return result('Holon', response);
      },

      async get(holonId)
      {
        const response = await supabase.from('holons_view').select('*').eq('id', holonId).single();
        return result('Holon', response);
      },

      async update(holonId, values)
      {
        const response = await supabase.from('holons').update(values).eq('id', holonId).select().single();
        return result('Holon', response);
      },

      async delete(holonId)
      {
        const relationshipResult = await supabase.from('relationships').delete()
          .or(`source_holon_id.eq.${holonId},target_holon_id.eq.${holonId}`);
        result('Relationships', relationshipResult);

        const holonResult = await supabase.from('holons').delete().eq('id', holonId);
        result('Holon', holonResult);
      },
    },

    relationships: {
      async create(values)
      {
        const response = await supabase.from('relationships').insert(values).select().single();
        return result('Relationship', response);
      },

      async get(relationshipId)
      {
        const response = await supabase.from('relationships_view').select('*').eq('id', relationshipId).single();
        return result('Relationship', response);
      },

      async update(relationshipId, values)
      {
        const response = await supabase.from('relationships').update(values).eq('id', relationshipId).select().single();
        return result('Relationship', response);
      },

      async delete(relationshipId)
      {
        const response = await supabase.from('relationships').delete().eq('id', relationshipId);
        result('Relationship', response);
      },
    },
  };
}
