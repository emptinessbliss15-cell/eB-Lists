// eBliss application API.
//
// UI/domain code calls this module instead of speaking Supabase directly.
// Today the transport is direct Supabase. Later we can replace the method
// implementations with Edge Function calls without changing the callers.

export function createEBlissAPI(supabase)
{
  if (!supabase)
  {
    throw new Error('Supabase client is required');
  }

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
