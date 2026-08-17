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
    const path = [];
    let wanted = currentDepth;
    for (let i = index; i >= 0; i--) {
      const d = depth(list[i]);
      if (d === wanted) {
        path.unshift(label(list[i]));
        wanted--;
        if (wanted < 0) break;
      }
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

      if (!hasChildren) {
        if (toggle) toggle.remove();
        return;
      }

      if (!toggle) {
        toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'eb-tree-collapse';
        toggle.onclick = event => {
          event.stopPropagation();
          const key = keyFor(list, index);
          if (state.has(key)) state.delete(key); else state.add(key);
          save(state);
          apply();
        };
        entry.insertBefore(toggle, node);
      }

      const key = keyFor(list, index);
      const collapsed = state.has(key);
      toggle.textContent = collapsed ? '▸' : '▾';
      toggle.title = collapsed ? 'Expand sub-lists' : 'Collapse sub-lists';
      toggle.setAttribute('aria-label', toggle.title);
      toggle.setAttribute('aria-expanded', String(!collapsed));
    });

    let collapsedDepth = null;
    list.forEach((row, index) => {
      const d = depth(row);
      if (collapsedDepth !== null && d > collapsedDepth) {
        row.hidden = true;
        return;
      }
      collapsedDepth = state.has(keyFor(list, index)) ? d : null;
      row.hidden = false;
    });
  }

  const style = document.createElement('style');
  style.textContent = `
    .eb-tree-collapse {
      flex: 0 0 20px;
      width: 20px;
      min-width: 20px;
      padding: 2px 0 !important;
      margin: 0 !important;
      border: 0;
      background: transparent;
      color: inherit;
      cursor: pointer;
      border-radius: 3px;
      text-align: center;
    }
    .eb-tree-collapse:hover,
    .eb-tree-collapse:focus-visible { background: #8883; }
  `;
  document.head.appendChild(style);

  const observer = new MutationObserver(() => requestAnimationFrame(apply));
  observer.observe(tree, { childList: true, subtree: true });
  setTimeout(apply, 300);
})();
