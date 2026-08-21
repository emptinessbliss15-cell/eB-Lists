(() => {
  const badge = document.querySelector('.cf-build-status');
  const tree = document.getElementById('tree');
  if (!badge || !tree) return;

  const style = document.createElement('style');
  style.textContent = `.eb-tree-actions{opacity:1!important;visibility:visible!important}.eb-tree-action{border:1px solid transparent!important}.eb-tree-action:hover,.eb-tree-action:focus-visible{border-color:#8886!important;background:#8882!important;opacity:1!important}.eb-db-refresh{border:0;background:transparent;color:inherit;padding:3px 6px;margin:0 0 4px 0;border-radius:4px;cursor:pointer;font:inherit;font-size:12px;text-align:left}.eb-db-refresh:hover{background:#8882}.eb-tree-refresh{display:flex;align-items:center;gap:4px;font-weight:600}.eb-list-refresh-row{display:flex;align-items:center;gap:6px;margin:0 0 4px 0}.eb-list-refresh-row button{border:0;background:transparent;color:inherit;padding:3px 6px;margin:0;border-radius:4px;cursor:pointer;font:inherit}.eb-list-refresh-row button:hover{background:#8882}`;
  document.head.appendChild(style);

  document.addEventListener('click', event => {
    const button = event.target.closest?.('#refreshData');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.reload();
  }, true);

  function getListsApi() {
    return { renderListTree: window.renderListTree, refreshItems: window.refreshItems };
  }

  function installTreeRefresh() {
    if (!tree.isConnected || tree.querySelector('#treeDbRefresh')) return;
    const button = document.createElement('button');
    button.id = 'treeDbRefresh';
    button.className = 'eb-db-refresh eb-tree-refresh';
    button.type = 'button';
    button.title = 'Refresh Lists tree from database';
    button.textContent = '↻ Lists';
    button.onclick = async event => {
      event.stopPropagation();
      const api = getListsApi();
      if (typeof api.renderListTree !== 'function') return;
      button.disabled = true;
      try { await api.renderListTree(); } finally { button.disabled = false; }
    };
    tree.prepend(button);
  }

  function installListRefresh() {
    const view = document.getElementById('listView');
    if (!view || view.querySelector('#listDbRefreshRow')) return;
    const row = document.createElement('div');
    row.id = 'listDbRefreshRow';
    row.className = 'eb-list-refresh-row';
    const button = document.createElement('button');
    button.id = 'listDbRefresh';
    button.type = 'button';
    button.title = 'Refresh current list from database';
    button.textContent = '↻';
    button.setAttribute('aria-label', 'Refresh current list from database');
    button.onclick = async event => {
      event.stopPropagation();
      const api = getListsApi();
      if (typeof api.refreshItems !== 'function') return;
      button.disabled = true;
      try { await api.refreshItems(); } finally { button.disabled = false; }
    };
    row.append(button);
    view.prepend(row);
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

  const observer = new MutationObserver(() => { installTreeRefresh(); installListRefresh(); });
  observer.observe(document.body, { childList: true, subtree: true });
  installTreeRefresh();
  installListRefresh();
  refreshBuildStatus();
  window.setInterval(refreshBuildStatus, 5000);
})();