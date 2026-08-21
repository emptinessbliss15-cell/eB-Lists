(() => {
  const supabase = window.eB?.supabase;
  if (!supabase) return;

  const CONSOLE_ORIGIN = 'https://dev-eb-console.emptinessbliss15.workers.dev';

  window.addEventListener('message', async (event) => {
    if (event.origin !== CONSOLE_ORIGIN) return;
    const message = event.data;
    if (!message || message.type !== 'eb-auth-session' || message.source !== 'eBliss-Console') return;

    if (!message.session) {
      await supabase.auth.signOut({ scope: 'local' });
      return;
    }

    const { access_token, refresh_token } = message.session;
    if (!access_token || !refresh_token) return;
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) {
      document.getElementById('status').textContent = error.message;
    }
  });
})();
