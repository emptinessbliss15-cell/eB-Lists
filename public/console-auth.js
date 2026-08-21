(() => {
  const CONSOLE_ORIGIN = 'https://dev-console.emptinessbliss15.workers.dev';
  let attached = false;
  async function getSupabase() {
    for (let i = 0; i < 100; i++) {
      const client = window.eB?.supabase || window.__ebSupabaseClient;
      if (client?.auth) return client;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return null;
  }
  async function attach() {
    if (attached) return;
    const supabase = await getSupabase();
    if (!supabase) return;
    attached = true;
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
        const status = document.getElementById('status');
        if (status) status.textContent = error.message;
      }
    });
  }
  attach();
})();