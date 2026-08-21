(() => {
  const supabase = window.eB?.supabase;
  if (!supabase) throw new Error('Shared Supabase client is not available');
  let session = null;
  const header = document.getElementById('header');
  const account = document.getElementById('account');
  const userEl = document.getElementById('user');
  const auth = document.getElementById('auth');
  const app = document.getElementById('app');
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const signIn = document.getElementById('signIn');
  const signUp = document.getElementById('signUp');
  const signOut = document.getElementById('signOut');
  function render(nextSession) {
    session = nextSession || null;
    const user = session?.user || null;
    if (header) { header.hidden = false; header.style.display = 'block'; }
    if (account) {
      account.hidden = false;
      let headerSignIn = document.getElementById('headerSignIn');
      if (user) headerSignIn?.remove();
      else if (!headerSignIn) {
        headerSignIn = document.createElement('button');
        headerSignIn.id = 'headerSignIn';
        headerSignIn.type = 'button';
        headerSignIn.textContent = 'Sign in';
        headerSignIn.onclick = () => email?.focus();
        account.appendChild(headerSignIn);
      }
    }
    if (auth) auth.hidden = !!user;
    if (app) app.hidden = !user;
    if (userEl) userEl.textContent = user?.email || '';
    if (signOut) signOut.hidden = !user;
    window.dispatchEvent(new CustomEvent('eb-auth-session', { detail: { session, user } }));
  }
  signIn?.addEventListener('click', async () => { const { error } = await supabase.auth.signInWithPassword({ email: email?.value.trim() || '', password: password?.value || '' }); if (error) alert(error.message); });
  signUp?.addEventListener('click', async () => { const { error } = await supabase.auth.signUp({ email: email?.value.trim() || '', password: password?.value || '' }); if (error) alert(error.message); });
  signOut?.addEventListener('click', async () => { const { error } = await supabase.auth.signOut({ scope: 'local' }); if (error) alert(error.message); });
  window.eBAuth = { supabase, getSession: () => session, getUser: () => session?.user || null };
  supabase.auth.onAuthStateChange((_event, nextSession) => { setTimeout(() => render(nextSession), 0); });
  supabase.auth.getSession().then(({ data }) => {
    setTimeout(() => render(data.session), 0);
    setTimeout(() => render(data.session), 50);
  });
})();
