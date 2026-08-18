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
    header.hidden = false;
    header.style.display = 'block';
    account.hidden = false;
    auth.hidden = !!user;
    app.hidden = !user;
    userEl.textContent = user?.email || '';
    signOut.hidden = !user;
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
    window.dispatchEvent(new CustomEvent('eb-auth-session', { detail: { session, user } }));
  }

  signIn.onclick = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.value.trim(), password: password.value });
    if (error) alert(error.message);
  };

  signUp.onclick = async () => {
    const { error } = await supabase.auth.signUp({ email: email.value.trim(), password: password.value });
    if (error) alert(error.message);
  };

  signOut.onclick = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) alert(error.message);
  };

  window.eBAuth = { supabase, getSession: () => session, getUser: () => session?.user || null };

  // Never do UI/database work synchronously inside Supabase's auth callback.
  supabase.auth.onAuthStateChange((_event, nextSession) => {
    setTimeout(() => render(nextSession), 0);
  });

  // app.js is loaded before auth.js so its session listener is already installed.
  supabase.auth.getSession().then(({ data }) => {
    setTimeout(() => render(data.session), 0);
  });
})();
