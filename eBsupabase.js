// eBliss Supabase backend adapter.
//
// This is the only layer that knows how the current eBliss backend is
// implemented with Supabase. The rest of the application talks to the
// eBliss backend contract instead of calling Supabase directly.

const SUPABASE_URL = 'https://zaabghrczrbqkxrhkinj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_QL6Bz9m30CV8HFIdkLQ42Q_N9AFIOkF';

export function createEBSupabase()
{
  if (!window.supabase)
  {
    throw new Error('Supabase client library is not loaded');
  }

  const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

  return {
    auth: {
      getSession()
      {
        return supabase.auth.getSession();
      },

      onAuthStateChange(callback)
      {
        return supabase.auth.onAuthStateChange(callback);
      },

      signIn(email, password)
      {
        return supabase.auth.signInWithPassword({ email, password });
      },

      signUp(email, password)
      {
        return supabase.auth.signUp({ email, password });
      },

      signOut()
      {
        return supabase.auth.signOut({ scope: 'local' });
      },
    },

    model: {
      async load()
      {
        const [holonResult, relationshipResult, typeResult] = await Promise.all([
          supabase.from('holons_view').select('*').order('created_at'),
          supabase.from('relationships_view').select('*').order('position').order('created_at'),
          supabase.from('relationship_types').select('*').order('name'),
        ]);

        if (holonResult.error)
        {
          throw new Error(`Holons: ${holonResult.error.message}`);
        }

        if (relationshipResult.error)
        {
          throw new Error(`Relationships: ${relationshipResult.error.message}`);
        }

        if (typeResult.error)
        {
          throw new Error(`Relationship types: ${typeResult.error.message}`);
        }

        return {
          holons: holonResult.data || [],
          relationships: relationshipResult.data || [],
          relationshipTypes: typeResult.data || [],
        };
      },
    },

    holons: {
      async delete(holonId)
      {
        const relationshipResult = await supabase
          .from('relationships')
          .delete()
          .or(`source_holon_id.eq.${holonId},target_holon_id.eq.${holonId}`);

        if (relationshipResult.error)
        {
          throw new Error(`Relationships: ${relationshipResult.error.message}`);
        }

        const holonResult = await supabase
          .from('holons')
          .delete()
          .eq('id', holonId);

        if (holonResult.error)
        {
          throw new Error(`Holon: ${holonResult.error.message}`);
        }
      },
    },
  };
}
