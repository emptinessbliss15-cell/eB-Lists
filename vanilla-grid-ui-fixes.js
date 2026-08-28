// UI behavior hooks kept outside the data layer while we evaluate VanillaGrid.
(() => {
  const treeHost = document.getElementById('treeGrid');
  const itemsHost = document.getElementById('itemsGrid');
  const menu = document.getElementById('contextMenu');
  if (!treeHost || !itemsHost || !menu) return;

  // The app owns context menus. Capture the event before VanillaGrid or the
  // browser can consume it, while still using VanillaGrid's row map.
  document.addEventListener('contextmenu', (event) => {
    const host = event.target.closest('#treeGrid, #itemsGrid');
    if (!host) return;
    const grid = host.id === 'treeGrid' ? window.treeGrid : window.itemsGrid;
    const rowEl = event.target.closest('tr[data-rowid]');
    if (!rowEl || !grid?.rowById) return;
    const row = grid.rowById.get(Number(rowEl.dataset.rowid));
    if (!row) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (host.id === 'treeGrid') {
      const list = row.list || window.cachedLists?.find?.(x => x.id === row.id);
      const actions = row.id === 'lists-root'
        ? [['New list', () => document.getElementById('listName')?.focus()], ['Refresh lists', () => window.refreshLists?.()]]
        : list ? [['Open list', () => window.openList?.(list)], ['Rename list', () => window.renameList?.(list)], ['Delete list', () => window.deleteList?.(list)]] : [];
      if (actions.length) show(actions, event);
    } else {
      const actions = [['Edit item', () => grid.startEdit?.(row.id, 'text')], [row.completed ? 'Mark incomplete' : 'Mark complete', () => window.setItemCompleted?.(row, !row.completed)], ['Delete item', () => window.deleteItem?.(row)]];
      show(actions, event);
    }
  }, true);

  function show(actions, event) {
    menu.innerHTML = '';
    actions.forEach(([label, action]) => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = label;
      button.onclick = async () => { menu.style.display = 'none'; await action(); };
      menu.appendChild(button);
    });
    menu.style.left = `${Math.min(event.clientX, innerWidth - 200)}px`;
    menu.style.top = `${Math.min(event.clientY, innerHeight - actions.length * 40 - 12)}px`;
    menu.style.display = 'block';
  }

  // VanillaGrid instances are module-local in app.js. Expose them for this
  // bridge after construction without changing the application data model.
  const expose = () => {
    try {
      if (typeof treeGrid !== 'undefined') window.treeGrid = treeGrid;
      if (typeof itemsGrid !== 'undefined') window.itemsGrid = itemsGrid;
      if (typeof cachedLists !== 'undefined') window.cachedLists = cachedLists;
      if (typeof openList !== 'undefined') window.openList = openList;
      if (typeof renameList !== 'undefined') window.renameList = renameList;
      if (typeof deleteList !== 'undefined') window.deleteList = deleteList;
      if (typeof refreshLists !== 'undefined') window.refreshLists = refreshLists;
      if (typeof setItemCompleted !== 'undefined') window.setItemCompleted = setItemCompleted;
      if (typeof deleteItem !== 'undefined') window.deleteItem = deleteItem;
    } catch (_) {}
  };
  setInterval(expose, 250);
  expose();
})();
