(() => {
  const badge = document.querySelector('.cf-build-status');
  if (!badge) return;

  // Tree actions are primary controls, not hover-only decoration.
  const style = document.createElement('style');
  style.textContent = `.eb-tree-actions{opacity:1!important;visibility:visible!important}.eb-tree-action{border:1px solid transparent!important}.eb-tree-action:hover,.eb-tree-action:focus-visible{border-color:#8886!important;background:#8882!important;opacity:1!important}`;
  document.head.appendChild(style);

  // Keep the header account controls directly synchronized with Supabase auth.
  // The header should not depend on observing another element's text content.
  const signInHeader = document.getElementById('signInHeader');
  const signOut = document.getElementById('signOut');
  const userLabel = document.getElementById('user');
  const authClient = window.__ebSupabaseClient;
  const syncAccount = (user) => {
    const loggedIn = !!user;
    if (userLabel) userLabel.textContent = user?.email || '';
    if (signInHeader) signInHeader.hidden = loggedIn;
    if (signOut) signOut.hidden = !loggedIn;
  };
  if (authClient?.auth) {
    authClient.auth.getUser().then(({ data }) => syncAccount(data?.user || null));
    authClient.auth.onAuthStateChange((_event, session) => syncAccount(session?.user || null));
  }

  let currentVersion = null;
  let currentCommit = null;

  async function refreshBuildStatus() {
    try {
      const response = await fetch('/__build', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const build = await response.json();
      const version = build.version || build.tag || null;
      const commit = build.gitCommit || build.tag || null;
      const branch = build.gitBranch || (location.hostname.includes('dev') ? 'dev' : 'main');
      if (currentVersion && version && version !== currentVersion) {
        badge.textContent = '● UPDATED';
        badge.title = `New Cloudflare deployment: ${version}`;
        window.setTimeout(() => window.location.reload(), 700);
        return;
      }
      currentVersion = version;
      currentCommit = commit;
      const shortCommit = commit ? commit.slice(0, 8) : 'unknown';
      const shortVersion = version ? version.slice(0, 8) : 'unknown';
      badge.textContent = `● CF LIVE · ${branch} · ${shortCommit}`;
      badge.title = `Cloudflare build ${shortVersion}\nGit commit ${commit || 'not exposed by environment'}\nBranch ${branch}${build.timestamp ? `\nDeployed ${new Date(build.timestamp).toLocaleString()}` : ''}`;
      badge.classList.remove('is-error');
    } catch (error) {
      badge.textContent = '○ CF';
      badge.title = `Cloudflare status unavailable: ${error.message}`;
      badge.classList.add('is-error');
    }
  }

  refreshBuildStatus();
  window.setInterval(refreshBuildStatus, 5000);
})();