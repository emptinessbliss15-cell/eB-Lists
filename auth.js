export function initAuth({ supabase, elements, onSession })
{
  elements.signIn.onclick = async () =>
  {
    const result = await supabase.auth.signInWithPassword({
      email: elements.email.value.trim(),
      password: elements.password.value,
    });

    if (result.error)
    {
      elements.setStatus(result.error.message);
      return;
    }

    await onSession(result.data.session);
  };

  elements.signUp.onclick = async () =>
  {
    const result = await supabase.auth.signUp({
      email: elements.email.value.trim(),
      password: elements.password.value,
    });

    if (result.error)
    {
      elements.setStatus(result.error.message);
      return;
    }

    if (result.data.session)
    {
      await onSession(result.data.session);
    }
    else
    {
      elements.setStatus('Account created. Check your email as confirmation is required.');
    }
  };

  elements.signOut.onclick = async () =>
  {
    const result = await supabase.auth.signOut({ scope: 'local' });

    if (result.error)
    {
      elements.setStatus(result.error.message);
      return;
    }

    await onSession(null);
  };

  supabase.auth.onAuthStateChange((_event, session) => onSession(session));

  return supabase.auth.getSession();
}
