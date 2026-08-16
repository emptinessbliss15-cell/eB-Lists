(() => {
  const tree = document.getElementById('tree');
  if (!tree) return;
  const key = 'eb-tree-collapsed';
  const load = () => { try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); } catch { return new Set(); } };
  const save = s => localStorage.setItem(key, JSON.stringify([...s]));
  const state = load();
  const apply = () => {
    tree.querySelectorAll('.eb-tree-entry').forEach(entry => {
      const id = entry.dataset.listId;
      if (!id) return;
      const row = entry.closest('.eb-tree-row');
      const collapsed = state.has(id);
      let toggle = entry.querySelector('.eb-tree-collapse');
      const hasChildren = [...tree.querySelectorAll('.eb-tree-entry')].some(e => e !== entry && e.dataset.parentListId === id);
      if (!hasChildren) { if (toggle) toggle.remove(); return; }
      if (!toggle) {
        toggle = document.createElement('button');
        toggle.type = 'button'; toggle.className = 'eb-tree-collapse';
        toggle.title = 'Expand/collapse'; toggle.setAttribute('aria-label', toggle.title);
        toggle.onclick = e => { e.stopPropagation(); if (state.has(id)) state.delete(id); else state.add(id); save(state); apply(); };
        entry.insertBefore(toggle, entry.firstChild);
      }
      toggle.textContent = collapsed ? '▸' : '▾';
      toggle.setAttribute('aria-expanded', String(!collapsed));
      if (row) {
        const depth = Number(entry.dataset.depth || 0);
        tree.querySelectorAll('.eb-tree-entry').forEach(child => {
          if (child === entry) return;
          let p = child.dataset.parentListId;
          while (p) {
            if (p === id) { const r = child.closest('.eb-tree-row'); if (r) r.hidden = collapsed; break; }
            const parent = tree.querySelector(`.eb-tree-entry[data-list-id="${CSS.escape(p)}"]`);
            p = parent?.dataset.parentListId || '';
          }
        });
      }
    });
  };
  const observer = new MutationObserver(() => requestAnimationFrame(apply));
  observer.observe(tree, { childList: true, subtree: true });
  const style = document.createElement('style');
  style.textContent = '.eb-tree-collapse{flex:0 0 20px;width:20px;padding:2px!important;margin:0!important;border:0;background:transparent;color:inherit;cursor:pointer;border-radius:3px}.eb-tree-collapse:hover,.eb-tree-collapse:focus-visible{background:#8883}';
  document.head.appendChild(style);
  setTimeout(apply, 300);
})();
