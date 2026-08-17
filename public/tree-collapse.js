(() => {
  const tree = document.getElementById('tree');
  if (!tree) return;

  const key = 'eb-tree-collapsed';
  const load = () => { try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); } catch { return new Set(); } };
  const save = state => localStorage.setItem(key, JSON.stringify([...state]));
  const state = load();

  const rows = () => [...tree.querySelectorAll('.eb-tree-row')].filter(row => row.querySelector('.eb-tree-entry'));
  const depth = row => {
    const entry = row.querySelector('.eb-tree-entry');
    const match = entry?.style.paddingLeft?.match(/([0-9.]+)px/);
    return match ? Math.round(Number(match[1]) / 14) : 0;
  };
  const label = row => row.querySelector('.eb-tree-node')?.textContent?.trim() || '';

  function keyFor(list, index) {
    const currentDepth = depth(list[index]);
    if (currentDepth === 0) return label(list[index]);
    const path = [label(list[index])];
    let wanted = currentDepth - 1;
    for (let i = index - 1; i >= 0 && wanted >= 0; i--) {
      if (depth(list[i]) === wanted) { path.unshift(label(list[i])); wanted--; }
    }
    return path.join(' / ');
  }

  function apply() {
    const list = rows();
    if (!list.length) return;
    list.forEach((row, index) => {
      const entry = row.querySelector('.eb-tree-entry');
      const node = row.querySelector('.eb-tree-node');
      if (!entry || !node) return;
      const d = depth(row);
      const hasChildren = index + 1 < list.length && depth(list[index + 1]) > d;
      let toggle = entry.querySelector('.eb-tree-collapse');
      if (!hasChildren) { if (toggle) toggle.remove(); return; }
      if (!toggle) {
        toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'eb-tree-collapse';
        toggle.onclick = event => {
          event.stopPropagation();
          const k = keyFor(list, index);
          if (state.has(k)) state.delete(k); else state.add(k);
          save(state); apply();
        };
        entry.insertBefore(toggle, node);
      }
      const k = keyFor(list, index), collapsed = state.has(k);
      toggle.textContent = collapsed ? '▸' : '▾';
      toggle.title = collapsed ? 'Expand sub-lists' : 'Collapse sub-lists';
      toggle.setAttribute('aria-label', toggle.title);
      toggle.setAttribute('aria-expanded', String(!collapsed));
    });
    let collapsedDepth = null;
    list.forEach((row, index) => {
      const d = depth(row);
      if (collapsedDepth !== null && d > collapsedDepth) { row.hidden = true; return; }
      collapsedDepth = state.has(keyFor(list, index)) ? d : null;
      row.hidden = false;
    });
  }

  function ensureToolbar() {
    if (tree.querySelector('.eb-tree-collapse-toolbar')) return;
    const toolbar = document.createElement('div');
    toolbar.className = 'eb-tree-collapse-toolbar';
    const expand = document.createElement('button');
    expand.type = 'button'; expand.textContent = '⊞'; expand.title = 'Expand all sub-lists'; expand.setAttribute('aria-label', expand.title);
    const collapse = document.createElement('button');
    collapse.type = 'button'; collapse.textContent = '⊟'; collapse.title = 'Collapse all sub-lists'; collapse.setAttribute('aria-label', collapse.title);
    expand.onclick = e => { e.stopPropagation(); state.clear(); save(state); apply(); };
    collapse.onclick = e => {
      e.stopPropagation();
      const list = rows();
      list.forEach((row, index) => { if (index + 1 < list.length && depth(list[index + 1]) > depth(row)) state.add(keyFor(list, index)); });
      save(state); apply();
    };
    toolbar.append(expand, collapse);
    tree.prepend(toolbar);
  }

  const style = document.createElement('style');
  style.textContent = `
    .eb-tree-row[hidden]{display:none!important}
    .eb-tree-collapse-toolbar{display:flex;gap:2px;padding:2px 4px;position:sticky;top:0;z-index:3;background:Canvas}
    .eb-tree-collapse-toolbar button{border:0;background:transparent;color:inherit;padding:2px 5px;margin:0;border-radius:3px;cursor:pointer;font-size:14px}
    .eb-tree-collapse-toolbar button:hover,.eb-tree-collapse-toolbar button:focus-visible{background:#8883}
    .eb-tree-collapse{flex:0 0 20px;width:20px;min-width:20px;padding:2px 0!important;margin:0!important;border:0;background:transparent;color:inherit;cursor:pointer;border-radius:3px;text-align:center}
    .eb-tree-collapse:hover,.eb-tree-collapse:focus-visible{background:#8883}
  `;
  document.head.appendChild(style);

  const observer = new MutationObserver(() => requestAnimationFrame(() => { ensureToolbar(); apply(); }));
  observer.observe(tree, { childList: true, subtree: true });
  ensureToolbar();
  setTimeout(apply, 300);
})();
