(() => {
  const url = 'https://zaabghrczrbqkxrhkinj.supabase.co';
  const key = 'sb_publishable_QL6Bz9m30CV8HFIdkLQ42Q_N9AFIOkF';

  window.eB = window.eB || {};
  if (!window.eB.supabase) {
    window.eB.supabase = window.supabase.createClient(url, key);
  }

  const supabase = window.eB.supabase;

  function publishSession(session) {
    window.dispatchEvent(new CustomEvent('eb-auth-session', { detail: { session } }));
  }

  async function publishCurrentSession() {
    const { data } = await supabase.auth.getSession();
    publishSession(data?.session || null);
  }

  document.getElementById('signIn')?.addEventListener('click', async () => {
    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value || '';
    const status = document.getElementById('status');
    if (!email || !password) return;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (status) status.textContent = error.message;
      return;
    }
    publishSession(data?.session || null);
  });

  document.getElementById('signUp')?.addEventListener('click', async () => {
    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value || '';
    const status = document.getElementById('status');
    if (!email || !password) return;
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      if (status) status.textContent = error.message;
      return;
    }
    if (data?.session) publishSession(data.session);
    else if (status) status.textContent = 'Account created. Check your email if confirmation is required.';
  });

  document.getElementById('signOut')?.addEventListener('click', async () => {
    await supabase.auth.signOut({ scope: 'local' });
    publishSession(null);
  });

  supabase.auth.onAuthStateChange((_event, session) => publishSession(session));
  setTimeout(publishCurrentSession, 0);
})();
